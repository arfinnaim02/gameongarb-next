import { ForgotPasswordForm } from "@/components/auth/auth-forms";

export default function ForgotPasswordPage() {
  return (
    <div className="container auth-page" style={{ padding: "40px 0" }}>
      <div
        className="card"
        style={{ maxWidth: 440, margin: "auto", padding: 28 }}
      >
        <span className="eyebrow">Account recovery</span>
        <h1>Reset Password</h1>
        <p className="muted">Weâ€™ll create a secure, single-use reset link.</p>
        <ForgotPasswordForm />
      </div>
    </div>
  );
}

