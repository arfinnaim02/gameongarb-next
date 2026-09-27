import { RegisterForm } from "@/components/auth/auth-forms";

export default function RegisterPage() {
  return (
    <div className="container auth-page" style={{ padding: "40px 0" }}>
      <div
        className="card"
        style={{ maxWidth: 460, margin: "auto", padding: 28 }}
      >
        <span className="eyebrow">Join the movement</span>
        <h1>Create Account</h1>
        <p className="muted">
          Save addresses, track orders and keep your wishlist in sync.
        </p>
        <RegisterForm />
      </div>
    </div>
  );
}

