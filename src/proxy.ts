import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  readSessionToken,
} from "@/lib/auth";

export async function proxy(
  req: NextRequest,
) {
  const path =
    req.nextUrl.pathname;

  const publicAuthPaths = [
    "/account/login",
    "/account/register",
    "/account/forgot-password",
    "/account/reset-password",
    "/admin/login",
  ];

  if (
    publicAuthPaths.includes(
      path,
    )
  ) {
    return NextResponse.next();
  }

  const token =
    req.cookies.get(
      "gog_session",
    )?.value;

  if (!token) {
    const loginPath =
      path.startsWith(
        "/admin",
      )
        ? "/admin/login"
        : "/account/login";

    const loginUrl =
      new URL(
        loginPath,
        req.url,
      );

    loginUrl.searchParams.set(
      "next",
      path,
    );

    return NextResponse.redirect(
      loginUrl,
    );
  }

  try {
    const session =
      await readSessionToken(
        token,
      );

    if (
      path.startsWith(
        "/admin",
      ) &&
      session.role ===
        "CUSTOMER"
    ) {
      const loginUrl =
        new URL(
          "/admin/login",
          req.url,
        );

      loginUrl.searchParams.set(
        "next",
        path,
      );

      return NextResponse.redirect(
        loginUrl,
      );
    }

    return NextResponse.next();
  } catch {
    const loginPath =
      path.startsWith(
        "/admin",
      )
        ? "/admin/login"
        : "/account/login";

    const response =
      NextResponse.redirect(
        new URL(
          loginPath,
          req.url,
        ),
      );

    response.cookies.delete(
      "gog_session",
    );

    return response;
  }
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/account/:path*",
  ],
};