import {
  Suspense,
} from "react";

import {
  redirect,
} from "next/navigation";

import {
  LoginForm,
} from "@/components/auth/login-form";

import {
  Logo,
} from "@/components/shared/logo";

import {
  getCurrentUser,
} from "@/lib/session";

import {
  isAdminRole,
} from "@/lib/roles";

export const dynamic =
  "force-dynamic";

export default async function AdminLoginPage() {
  const currentUser =
    await getCurrentUser();

  /*
   * Already authenticated
   * as an administrator.
   */
  if (
    currentUser &&
    isAdminRole(
      currentUser.role,
    )
  ) {
    redirect("/admin");
  }

  /*
   * Important:
   *
   * If currentUser is CUSTOMER,
   * DO NOT redirect to /account.
   *
   * Show this page and allow an
   * admin account to replace the
   * existing customer session.
   */

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems:
          "center",
        background:
          "#101313",
        padding: 20,
      }}
    >
      <div
        className="card"
        style={{
          width:
            "min(430px, 100%)",

          padding: 30,
        }}
      >
        <Logo admin />

        <div
          style={{
            marginTop: 30,
          }}
        >
          <span
            style={{
              color:
                "#f15a24",

              fontSize: 9,

              fontWeight: 900,

              letterSpacing:
                ".12em",

              textTransform:
                "uppercase",
            }}
          >
            Secure Administration
          </span>

          <h1
            style={{
              margin:
                "8px 0 0",
            }}
          >
            Admin Sign In
          </h1>

          <p
            className="muted"
            style={{
              marginBottom:
                22,
            }}
          >
            Protected access
            for Game On Garb
            store operations.
          </p>
        </div>

        {currentUser &&
        !isAdminRole(
          currentUser.role,
        ) ? (
          <div
            style={{
              marginBottom:
                18,

              padding: 12,

              background:
                "#fff7f2",

              border:
                "1px solid #f0ddd2",

              color:
                "#743a20",

              fontSize: 11,

              lineHeight: 1.5,
            }}
          >
            You are currently
            signed in as a
            customer. Enter your
            admin credentials
            below to switch to
            the admin session.
          </div>
        ) : null}

        <Suspense>
          <LoginForm admin />
        </Suspense>
      </div>
    </main>
  );
}