import {
  NextRequest,
} from "next/server";

import {
  finishOAuth,
} from "@/lib/oauth";

export async function GET(
  request:
    NextRequest,
) {
  return finishOAuth(
    "GOOGLE",
    request,
  );
}