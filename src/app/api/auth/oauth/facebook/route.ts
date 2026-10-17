import {
  NextRequest,
} from "next/server";

import {
  startOAuth,
} from "@/lib/oauth";

export async function GET(
  request:
    NextRequest,
) {
  return startOAuth(
    "FACEBOOK",
    request,
  );
}