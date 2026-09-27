import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { couponDiscount, deliveryFee, orderTotal } from "@/lib/business";
import { fromPaisa, toPaisa } from "@/lib/money";
import { getApiUser } from "@/lib/session";
import { createOrderAccessToken } from "@/lib/auth";

const schema = z.object({
  fullName: z.string().min(2).max(100),
  phone: z.string().regex(/^01\d{9}$/),
  email: z.string().email().optional(),
  division: z.string().min(2),
  district: z.string().min(2),
  thana: z.string().min(2),
  address: z.string().min(5).max(500),
  paymentMethod: z.enum(["COD", "BKASH"]),
  couponCode: z.string().max(40).optional(),
  automaticCouponId: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string(),
        size: z.string(),
        color: z.string(),
        quantity: z.number().int().min(1).max(10),
      }),
    )
    .min(1)
    .max(30),
});

export async function POST(req: Request) {
  try {
    const input = schema.parse(await req.json());
    const sessionUser = await getApiUser(req);
    const settings = await db.storeSetting.findMany({
      where: { key: { in: ["shipping", "payments", "general"] } },
    });
    const general = (settings.find((x) => x.key === "general")?.value ??
      {}) as {
      storeLive?: boolean;
      maintenanceMode?: boolean;
    };
    if (general.storeLive === false || general.maintenanceMode === true)
      return NextResponse.json(
        { error: "The store is temporarily unavailable." },
        { status: 503 },
      );
    const shipping = (settings.find((x) => x.key === "shipping")?.value ?? {
      insideDhaka: 80,
      outsideDhaka: 150,
    }) as { insideDhaka: number; outsideDhaka: number };
    const pay = (settings.find((x) => x.key === "payments")?.value ?? {
      codEnabled: true,
      bkashEnabled: true,
    }) as { codEnabled: boolean; bkashEnabled: boolean };
    if (
      (input.paymentMethod === "COD" && !pay.codEnabled) ||
      (input.paymentMethod === "BKASH" && !pay.bkashEnabled)
    )
      return NextResponse.json(
        { error: "Selected payment method is unavailable." },
        { status: 400 },
      );
    const variants = await db.productVariant.findMany({
      where: {
        OR: input.items.map((i) => ({
          productId: i.productId,
          size: i.size,
          color: i.color,
          active: true,
        })),
      },
      include: {
        product: {
          include: {
            images: { orderBy: { sortOrder: "asc" }, take: 1 },
            categories: { select: { categoryId: true } },
          },
        },
      },
    });
    const verified = input.items.map((item) => {
      const variant = variants.find(
        (x) =>
          x.productId === item.productId &&
          x.size === item.size &&
          x.color === item.color,
      );
      if (
        !variant ||
        variant.stock < item.quantity ||
        variant.product.status !== "ACTIVE"
      )
        throw new Error("Insufficient stock for a selected item.");
      return {
        item,
        variant,
        pricePaisa: toPaisa(
          Number(
            variant.priceOverride ??
              variant.product.salePrice ??
              variant.product.regularPrice,
          ),
        ),
      };
    });
    const subtotalPaisa = verified.reduce(
      (sum, x) => sum + x.pricePaisa * x.item.quantity,
      0,
    );
    const shippingPaisa = toPaisa(deliveryFee(input.district, shipping));
    let coupon = null;
    let discountPaisa = 0;
    if (input.couponCode || input.automaticCouponId) {
      coupon = await db.coupon.findFirst({
        where: {
          ...(input.couponCode
            ? { code: input.couponCode, kind: "CODE" as const }
            : { id: input.automaticCouponId, kind: "AUTOMATIC" as const }),
          active: true,
          validFrom: { lte: new Date() },
          OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
        },
        include: {
          _count: { select: { usage: true } },
          products: { select: { productId: true } },
          categories: { select: { categoryId: true } },
        },
      });
      if (!coupon)
        return NextResponse.json(
          { error: "Coupon is invalid or expired." },
          { status: 400 },
        );
      if (coupon.usageLimit && coupon._count.usage >= coupon.usageLimit)
        return NextResponse.json(
          { error: "Coupon usage limit has been reached." },
          { status: 400 },
        );
      if (
        coupon.minimumOrder &&
        fromPaisa(subtotalPaisa) < Number(coupon.minimumOrder)
      )
        return NextResponse.json(
          { error: "This order does not meet the coupon minimum." },
          { status: 400 },
        );
      const scoped = coupon.products.length > 0 || coupon.categories.length > 0;
      const eligiblePaisa = verified
        .filter(
          ({ variant }) =>
            !scoped ||
            coupon!.products.some(
              (scope: { productId: string }) => scope.productId === variant.productId,
            ) ||
            variant.product.categories.some((category) =>
              coupon!.categories.some(
                (scope: { categoryId: string }) =>
                  scope.categoryId === category.categoryId,
              ),
            ),
        )
        .reduce((sum, item) => sum + item.pricePaisa * item.item.quantity, 0);
      if (scoped && eligiblePaisa === 0)
        return NextResponse.json(
          { error: "This coupon does not apply to the selected products." },
          { status: 400 },
        );
      discountPaisa = toPaisa(
        couponDiscount(fromPaisa(eligiblePaisa), fromPaisa(shippingPaisa), {
          type:
            coupon.type === "FIXED"
              ? "FIXED"
              : coupon.type === "FREE_SHIPPING"
                ? "FREE_SHIPPING"
                : "PERCENTAGE",
          value: Number(coupon.value),
          maximum: coupon.maximumDiscount
            ? Number(coupon.maximumDiscount)
            : undefined,
        }),
      );
    }
    const totalPaisa = toPaisa(
      orderTotal(
        fromPaisa(subtotalPaisa),
        fromPaisa(shippingPaisa),
        fromPaisa(discountPaisa),
      ),
    );
    const order = await db.$transaction(
      async (tx) => {
        const day = new Date().toISOString().slice(0, 10).replaceAll("-", "");
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const count = await tx.order.count({
          where: { createdAt: { gte: today } },
        });
        const number = `GOG-${day}-${String(count + 1).padStart(3, "0")}`;
        const customer = sessionUser?.customer
          ? sessionUser.customer
          : await tx.customer.upsert({
              where: { phone: input.phone },
              update: {
                name: input.fullName,
                ...(input.email ? { email: input.email } : {}),
              },
              create: {
                name: input.fullName,
                phone: input.phone,
                email: input.email,
              },
            });
        if (coupon?.perCustomerLimit) {
          const customerUsage = await tx.couponUsage.count({
            where: { couponId: coupon.id, customerId: customer.id },
          });
          if (customerUsage >= coupon.perCustomerLimit)
            throw new Error(
              "You have already used this coupon the maximum number of times.",
            );
        }
        for (const x of verified) {
          const updated = await tx.productVariant.updateMany({
            where: { id: x.variant.id, stock: { gte: x.item.quantity } },
            data: { stock: { decrement: x.item.quantity } },
          });
          if (updated.count !== 1)
            throw new Error(
              "Stock changed while checking out. Please review your cart.",
            );
          await tx.inventoryTransaction.create({
            data: {
              variantId: x.variant.id,
              quantityChange: -x.item.quantity,
              beforeQuantity: x.variant.stock,
              afterQuantity: x.variant.stock - x.item.quantity,
              type: "SALE",
              reference: number,
              reason: "Order placed",
            },
          });
        }
        return tx.order.create({
          data: {
            number,
            customerId: customer.id,
            customerName: input.fullName,
            phone: input.phone,
            email: input.email,
            division: input.division,
            district: input.district,
            thana: input.thana,
            shippingAddress: input.address,
            subtotal: fromPaisa(subtotalPaisa),
            discount: fromPaisa(discountPaisa),
            deliveryCharge: fromPaisa(shippingPaisa),
            total: fromPaisa(totalPaisa),
            paymentMethod: input.paymentMethod,
            paymentStatus:
              input.paymentMethod === "COD" ? "PENDING" : "PROCESSING",
            couponCode: coupon?.code,
            items: {
              create: verified.map((x) => ({
                productId: x.variant.productId,
                variantId: x.variant.id,
                name: x.variant.product.name,
                sku: x.variant.sku,
                size: x.variant.size,
                color: x.variant.color,
                image:
                  x.variant.product.images[0]?.url ??
                  "/images/products/tshirt.svg",
                unitPrice: fromPaisa(x.pricePaisa),
                quantity: x.item.quantity,
                lineTotal: fromPaisa(x.pricePaisa * x.item.quantity),
              })),
            },
            history: {
              create: {
                newStatus: "NEW",
                note: "Order placed",
                source: "STOREFRONT",
              },
            },
            payments: {
              create: {
                method: input.paymentMethod,
                status:
                  input.paymentMethod === "COD" ? "PENDING" : "PROCESSING",
                amount: fromPaisa(totalPaisa),
              },
            },
            ...(coupon
              ? {
                  couponUsage: {
                    create: {
                      couponId: coupon.id,
                      customerId: customer.id,
                      amount: fromPaisa(discountPaisa),
                    },
                  },
                }
              : {}),
          },
        });
      },
      { isolationLevel: "Serializable" },
    );
    const response = NextResponse.json(
      {
        orderNumber: order.number,
        paymentMode:
          input.paymentMethod === "BKASH"
            ? (process.env.BKASH_MODE ?? "sandbox")
            : "cod",
      },
      { status: 201 },
    );
    response.cookies.set(
      "gog_order_access",
      await createOrderAccessToken(order.number, input.phone),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 2,
      },
    );
    return response;
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json(
        {
          error: "Please check the checkout fields.",
          fields: error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Order could not be placed.",
      },
      { status: 400 },
    );
  }
}
