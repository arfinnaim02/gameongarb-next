import {
  NextResponse,
} from "next/server";

export async function POST(
  request:
    Request,
) {
  const requestUrl =
    new URL(
      request.url,
    );

  const requestedNext =
    requestUrl.searchParams.get(
      "next",
    );

  const safeNext =
    requestedNext &&
    requestedNext.startsWith(
      "/",
    ) &&
    !requestedNext.startsWith(
      "//",
    )
      ? requestedNext
      : "/";

  const response =
    NextResponse.redirect(
      new URL(
        safeNext,
        request.url,
      ),
      303,
    );

  response.cookies.set(
    "gog_session",
    "",
    {
      httpOnly:
        true,

      secure:
        process.env
          .NODE_ENV ===
        "production",

      sameSite:
        "lax",

      path:
        "/",

      expires:
        new Date(0),

      maxAge:
        0,
    },
  );

  return response;
}