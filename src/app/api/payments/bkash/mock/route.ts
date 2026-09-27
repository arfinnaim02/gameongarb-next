import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { canAccessOrder } from "@/lib/session";
export async function POST(request: Request) {
  try {
    if ((process.env.BKASH_MODE ?? "sandbox") === "production")
      return NextResponse.json(
        { error: "Mock execution is disabled in production mode." },
        { status: 403 },
      );
    const { orderNumber } = z
      .object({ orderNumber: z.string() })
      .parse(await request.json());
    if (!(await canAccessOrder(request, orderNumber)))
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await db.$transaction(async (tx) => {
      const order = await tx.order.findUniqueOrThrow({
        where: { number: orderNumber },
        include: { payments: true },
      });
      if (order.paymentMethod !== "BKASH")
        throw new Error("This order is not a bKash order.");
      if (order.paymentStatus === "PAID") return;
      await tx.order.update({
        where: { id: order.id },
        data: { paymentStatus: "PAID" },
      });
      const payment = order.payments[0];
      if (payment) {
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: "PAID", providerReference: `MOCK-${order.number}` },
        });
        await tx.paymentTransaction.create({
          data: {
            paymentId: payment.id,
            type: "EXECUTE",
            externalId: `MOCK-${order.number}`,
            amount: order.total,
            status: "PAID",
            safePayload: { mode: "sandbox" },
          },
        });
      }
      await tx.integrationLog.create({
        data: {
          service: "BKASH",
          event: "MOCK_PAYMENT_COMPLETED",
          requestReference: order.number,
          status: "SUCCESS",
          summary: "Sandbox payment completed",
          idempotencyKey: `mock-bkash:${order.number}`,
        },
      });
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json(
        { error: "Invalid payment request." },
        { status: 400 },
      );
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Payment failed." },
      { status: 400 },
    );
  }
}
