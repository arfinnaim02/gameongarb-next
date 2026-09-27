import Link from "next/link";
export default function NotFound() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        textAlign: "center",
        padding: 30,
      }}
    >
      <div>
        <div
          style={{
            fontSize: "clamp(7rem,25vw,15rem)",
            fontWeight: 950,
            lineHeight: 0.8,
            letterSpacing: "-.1em",
          }}
        >
          4<span style={{ color: "var(--orange)" }}>0</span>4
        </div>
        <h1>Page Not Found</h1>
        <p className="muted">
          Oops! This page got lost. Nothing to worry about—our gear is still
          here.
        </p>
        <Link href="/" className="btn btn-primary">
          Go to Homepage
        </Link>
      </div>
    </main>
  );
}
