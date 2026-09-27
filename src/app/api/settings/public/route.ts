import { NextResponse } from "next/server";
import { db } from "@/lib/db";
export async function GET() {
  try {
    const rows = await db.storeSetting.findMany({
      where: { key: { in: ["shipping", "payments"] } },
    });
    const shipping = rows.find((x) => x.key === "shipping")?.value as
      { insideDhaka?: number; outsideDhaka?: number } | undefined;
    const payments = rows.find((x) => x.key === "payments")?.value as
      { codEnabled?: boolean; bkashEnabled?: boolean } | undefined;
    return NextResponse.json({
      insideDhaka: shipping?.insideDhaka ?? 80,
      outsideDhaka: shipping?.outsideDhaka ?? 150,
      codEnabled: payments?.codEnabled ?? true,
      bkashEnabled: payments?.bkashEnabled ?? true,
    });
  } catch {
    return NextResponse.json({
      insideDhaka: 80,
      outsideDhaka: 150,
      codEnabled: true,
      bkashEnabled: true,
    });
  }
}
