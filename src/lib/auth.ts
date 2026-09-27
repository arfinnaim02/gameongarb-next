import { SignJWT, jwtVerify } from "jose";
const secret = new TextEncoder().encode(
  process.env.SESSION_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "development-only-change-this-secret",
);
export async function createSessionToken(payload: {
  sub: string;
  role: string;
  name: string;
}) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}
export async function readSessionToken(token: string) {
  return (await jwtVerify(token, secret)).payload;
}

export async function createOrderAccessToken(
  orderNumber: string,
  phone: string,
) {
  return new SignJWT({ orderNumber, phone, purpose: "order-access" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("2h")
    .sign(secret);
}

export async function readOrderAccessToken(token: string) {
  const payload = (await jwtVerify(token, secret)).payload;
  if (payload.purpose !== "order-access")
    throw new Error("Invalid token purpose");
  return payload;
}
