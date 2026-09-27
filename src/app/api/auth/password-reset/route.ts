import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { rateLimit, requestIp } from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  const limit = rateLimit(`reset:${requestIp(request)}`, 5, 60 * 60_000);
  if (!limit.allowed)
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429 },
    );
  try {
    const { email } = z
      .object({ email: z.string().email() })
      .parse(await request.json());
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    let resetUrl: string | undefined;
    if (user) {
      const token = randomBytes(32).toString("hex");
      const tokenHash = createHash("sha256").update(token).digest("hex");
      await db.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt: new Date(Date.now() + 30 * 60_000),
        },
      });
      resetUrl = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/account/reset-password?token=${token}`;
      // A production email/SMS adapter should deliver this URL. It is returned
      // only in development so the complete flow can be tested locally.
    }
    return NextResponse.json({
      message: "If that account exists, reset instructions have been created.",
      ...(process.env.NODE_ENV !== "production" && resetUrl
        ? { resetUrl }
        : {}),
    });
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json(
        { error: "Enter a valid email address." },
        { status: 400 },
      );
    return NextResponse.json(
      { error: "Reset request failed." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const input = z
      .object({
        token: z.string().length(64),
        password: z.string().min(8).max(100),
      })
      .parse(await request.json());
    const tokenHash = createHash("sha256").update(input.token).digest("hex");
    const reset = await db.passwordResetToken.findUnique({
      where: { tokenHash },
    });
    if (!reset || reset.usedAt || reset.expiresAt < new Date())
      return NextResponse.json(
        { error: "This reset link is invalid or expired." },
        { status: 400 },
      );
    const passwordHash = await bcrypt.hash(input.password, 12);
    await db.$transaction([
      db.user.update({ where: { id: reset.userId }, data: { passwordHash } }),
      db.passwordResetToken.update({
        where: { id: reset.id },
        data: { usedAt: new Date() },
      }),
    ]);
    return NextResponse.json({
      message: "Password updated. You can now sign in.",
    });
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json(
        { error: "Use a password with at least 8 characters." },
        { status: 400 },
      );
    return NextResponse.json(
      { error: "Password could not be updated." },
      { status: 500 },
    );
  }
}
