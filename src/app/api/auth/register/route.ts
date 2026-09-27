import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSessionToken } from "@/lib/auth";
import { rateLimit, requestIp } from "@/lib/security/rate-limit";

const schema = z
  .object({
    name: z.string().trim().min(2).max(100),
    email: z.string().email().max(180),
    phone: z.string().regex(/^01\d{9}$/),
    password: z.string().min(8).max(100),
    confirmPassword: z.string(),
  })
  .refine((input) => input.password === input.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export async function POST(request: Request) {
  const limit = rateLimit(`register:${requestIp(request)}`, 5, 60 * 60_000);
  if (!limit.allowed)
    return NextResponse.json(
      { error: "Too many registration attempts. Please try again later." },
      { status: 429 },
    );
  try {
    const input = schema.parse(await request.json());
    const exists = await db.user.findFirst({
      where: {
        OR: [{ email: input.email.toLowerCase() }, { phone: input.phone }],
      },
      select: { id: true },
    });
    if (exists)
      return NextResponse.json(
        { error: "An account already exists with that email or phone." },
        { status: 409 },
      );
    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await db.user.create({
      data: {
        name: input.name,
        email: input.email.toLowerCase(),
        phone: input.phone,
        passwordHash,
        role: "CUSTOMER",
        customer: {
          create: {
            name: input.name,
            email: input.email.toLowerCase(),
            phone: input.phone,
          },
        },
      },
    });
    const token = await createSessionToken({
      sub: user.id,
      role: user.role,
      name: user.name,
    });
    const response = NextResponse.json({ ok: true }, { status: 201 });
    response.cookies.set("gog_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Check your details." },
        { status: 400 },
      );
    return NextResponse.json(
      { error: "Account could not be created." },
      { status: 500 },
    );
  }
}
