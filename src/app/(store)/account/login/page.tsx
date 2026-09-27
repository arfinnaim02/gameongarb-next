import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
export default function Login() {
  return (
    <div className="container auth-page" style={{ padding: "40px 0" }}>
      <div
        className="card"
        style={{ maxWidth: 430, margin: "auto", padding: 28 }}
      >
        <span className="eyebrow">Welcome back</span>
        <h1>Customer Login</h1>
        <p className="muted">
          Sign in to view orders, addresses, coupons and your wishlist.
        </p>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}

