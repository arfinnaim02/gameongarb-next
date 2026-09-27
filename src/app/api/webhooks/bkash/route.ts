import { NextResponse } from "next/server";
import { verifyWebhook } from "@/lib/security/webhook";
import { db } from "@/lib/db";
export async function POST(req: Request) {
  const raw = await req.text();
  const sig = req.headers.get("x-signature") ?? "";
  const secret = process.env.BKASH_WEBHOOK_SECRET ?? "";
  if (!secret || !verifyWebhook(raw, sig, secret))
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  const payload = JSON.parse(raw) as {
    event: string;
    paymentID: string;
    status: string;
  };
  const key = `bkash:${payload.event}:${payload.paymentID}`;
  const exists = await db.integrationLog.findUnique({
    where: { idempotencyKey: key },
  });
  if (exists) return NextResponse.json({ ok: true, duplicate: true });
  await db.integrationLog.create({
    data: {
      service: "BKASH",
      event: payload.event,
      requestReference: payload.paymentID,
      status: "SUCCESS",
      summary: `Payment status ${payload.status}`,
      idempotencyKey: key,
    },
  });
  return NextResponse.json({ ok: true });
}
