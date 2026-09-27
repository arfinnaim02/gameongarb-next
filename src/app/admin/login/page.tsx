import { Suspense } from "react";
import { Logo } from "@/components/shared/logo";
import { LoginForm } from "@/components/auth/login-form";
export default function AdminLogin() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#101313",
        padding: 20,
      }}
    >
      <div className="card" style={{ width: "min(430px,100%)", padding: 30 }}>
        <Logo admin />
        <h1 style={{ marginTop: 30 }}>Admin Sign In</h1>
        <p className="muted">Protected access for store operations.</p>
        <Suspense>
          <LoginForm admin />
        </Suspense>
      </div>
    </main>
  );
}

