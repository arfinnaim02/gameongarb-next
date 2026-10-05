import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { getApiUser } from "@/lib/session";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ resource: string }> },
) {
  const user = await getApiUser(request);
  if (!user?.customer)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const resource = (await params).resource;
  try {
    const body = await request.json();
    if (resource === "wishlist") {
      const { productId } = z.object({ productId: z.string() }).parse(body);
      const wishlist = await db.wishlist.upsert({
        where: { customerId: user.customer.id },
        update: {},
        create: { customerId: user.customer.id },
      });
      const existing = await db.wishlistItem.findUnique({
        where: { wishlistId_productId: { wishlistId: wishlist.id, productId } },
      });
      if (existing) {
        await db.wishlistItem.delete({
          where: {
            wishlistId_productId: { wishlistId: wishlist.id, productId },
          },
        });
        return NextResponse.json({ saved: false });
      }
      await db.wishlistItem.create({
        data: { wishlistId: wishlist.id, productId },
      });
      return NextResponse.json({ saved: true });
    }
    if (resource === "addresses") {
      const input = z
        .object({
          label: z.string().min(2),
          fullName: z.string().min(2),
          phone: z.string().regex(/^01\d{9}$/),
          division: z.string().min(2),
          district: z.string().min(2),
          thana: z.string().min(2),
          address: z.string().min(5),
        })
        .parse(body);
      const existingCount = await db.address.count({
        where: { customerId: user.customer.id },
      });
      const address = await db.address.create({
        data: {
          ...input,
          customerId: user.customer.id,
          isDefault: existingCount === 0,
        },
      });
      return NextResponse.json({ address });
    }
    if (resource === "settings") {
      const input =
        z
          .object({
            name:
              z
                .string()
                .trim()
                .min(2)
                .max(100),

            phone:
              z
                .string()
                .trim()
                .regex(
                  /^01\d{9}$/,
                ),

            password:
              z
                .string()
                .min(8)
                .max(100)
                .optional(),

            currentPassword:
              z
                .string()
                .optional(),
          })
          .parse(
            body,
          );

                const phoneOwner =
        await db.user.findFirst({
          where: {
            phone:
              input.phone,

            id: {
              not:
                user.id,
            },
          },

          select: {
            id:
              true,
          },
        });

      if (
        phoneOwner
      ) {
        return NextResponse.json(
          {
            error:
              "This phone number is already connected to another account.",
          },
          {
            status:
              409,
          },
        );
      }
      if (
        input.password &&
        (!input.currentPassword ||
          !(await bcrypt.compare(input.currentPassword, user.passwordHash)))
      )
        return NextResponse.json(
          { error: "Current password is incorrect." },
          { status: 400 },
        );
      const passwordHash = input.password
        ? await bcrypt.hash(input.password, 12)
        : undefined;
      await db.$transaction([
        db.user.update({
          where: { id: user.id },
          data: {
            name: input.name,
            phone: input.phone,
            ...(passwordHash ? { passwordHash } : {}),
          },
        }),
        db.customer.update({
          where: { id: user.customer.id },
          data: { name: input.name, phone: input.phone },
        }),
      ]);
      return NextResponse.json({ message: "Account updated" });
    }
    return NextResponse.json(
      { error: "Unsupported resource" },
      { status: 404 },
    );
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json(
        { error: "Please check the submitted fields." },
        { status: 400 },
      );
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Request failed" },
      { status: 400 },
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ resource: string }> },
) {
  const user = await getApiUser(request);
  if (!user?.customer)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((await params).resource !== "wishlist")
    return NextResponse.json(
      { error: "Unsupported resource" },
      { status: 404 },
    );
  const wishlist = await db.wishlist.findUnique({
    where: { customerId: user.customer.id },
    include: { items: { select: { productId: true } } },
  });
  return NextResponse.json({
    productIds: wishlist?.items.map((x) => x.productId) ?? [],
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ resource: string }> },
) {
  const user = await getApiUser(request);
  if (!user?.customer)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((await params).resource !== "addresses")
    return NextResponse.json(
      { error: "Unsupported resource" },
      { status: 404 },
    );
  const { id } = z.object({ id: z.string() }).parse(await request.json());
  const owned = await db.address.count({
    where: { id, customerId: user.customer.id },
  });
  if (!owned)
    return NextResponse.json({ error: "Address not found" }, { status: 404 });
  await db.$transaction([
    db.address.updateMany({
      where: { customerId: user.customer.id },
      data: { isDefault: false },
    }),
    db.address.update({ where: { id }, data: { isDefault: true } }),
  ]);
  return NextResponse.json({ message: "Default address updated" });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ resource: string }> },
) {
  const user = await getApiUser(request);
  if (!user?.customer)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((await params).resource !== "addresses")
    return NextResponse.json(
      { error: "Unsupported resource" },
      { status: 404 },
    );
  const {
    id,
  } =
    z
      .object({
        id:
          z.string(),
      })
      .parse(
        await request.json(),
      );

  const address =
    await db.address.findFirst({
      where: {
        id,

        customerId:
          user.customer.id,
      },

      select: {
        id:
          true,

        isDefault:
          true,
      },
    });

  if (!address) {
    return NextResponse.json(
      {
        error:
          "Address not found",
      },
      {
        status:
          404,
      },
    );
  }

  await db.address.delete({
    where: {
      id:
        address.id,
    },
  });

  /*
   * If the deleted address was
   * the default address, promote
   * the newest remaining address.
   */
  if (
    address.isDefault
  ) {
    const replacement =
      await db.address.findFirst({
        where: {
          customerId:
            user.customer.id,
        },

        orderBy: {
          createdAt:
            "desc",
        },

        select: {
          id:
            true,
        },
      });

    if (
      replacement
    ) {
      await db.address.update({
        where: {
          id:
            replacement.id,
        },

        data: {
          isDefault:
            true,
        },
      });
    }
  }

  return NextResponse.json({
    message:
      "Address removed",
  });
}
