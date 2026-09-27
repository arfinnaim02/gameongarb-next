import { NextRequest, NextResponse } from "next/server";
import { readSessionToken } from "@/lib/auth";
export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (
    [
      "/account/login",
      "/account/register",
      "/account/forgot-password",
      "/account/reset-password",
      "/admin/login",
    ].includes(path)
  )
    return NextResponse.next();
  const token = req.cookies.get("gog_session")?.value;
  if (!token) {
    const login = path.startsWith("/admin") ? "/admin/login" : "/account/login";
    return NextResponse.redirect(
      new URL(`${login}?next=${encodeURIComponent(path)}`, req.url),
    );
  }
  try {
    const session = await readSessionToken(token);
    if (path.startsWith("/admin") && session.role === "CUSTOMER")
      return NextResponse.redirect(new URL("/account", req.url));
    return NextResponse.next();
  } catch {
    const res = NextResponse.redirect(
      new URL(
        path.startsWith("/admin") ? "/admin/login" : "/account/login",
        req.url,
      ),
    );
    res.cookies.delete("gog_session");
    return res;
  }
}
export const config = { matcher: ["/admin/:path*", "/account/:path*"] };
