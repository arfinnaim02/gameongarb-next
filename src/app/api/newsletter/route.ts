import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const { email } = z
      .object({ email: z.string().email().max(180) })
      .parse(await request.json());
    const existing = await db.activityLog.findFirst({
      where: {
        action: "NEWSLETTER_SUBSCRIBED",
        metadata: { path: ["email"], equals: email.toLowerCase() },
      },
      select: { id: true },
    });
    if (!existing)
      await db.activityLog.create({
        data: {
          action: "NEWSLETTER_SUBSCRIBED",
          entityType: "Newsletter",
          metadata: { email: email.toLowerCase() },
        },
      });
    return NextResponse.json({ message: "You’re on the list." });
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json(
        { error: "Enter a valid email address." },
        { status: 400 },
      );
    return NextResponse.json(
      { error: "Subscription is unavailable right now." },
      { status: 500 },
    );
  }
}
