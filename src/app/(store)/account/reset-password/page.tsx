import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/auth/auth-forms";

export default function ResetPasswordPage() {
  return (
    <div className="container auth-page" style={{ padding: "40px 0" }}>
      <div
        className="card"
        style={{ maxWidth: 440, margin: "auto", padding: 28 }}
      >
        <span className="eyebrow">Secure reset</span>
        <h1>Choose a New Password</h1>
        <Suspense>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}

