import { NextResponse } from "next/server";
export async function POST(req: Request) {
  const res = NextResponse.redirect(new URL("/", req.url));
  res.cookies.delete("gog_session");
  return res;
}
