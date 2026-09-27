"use client";
import { CloudAlert } from "lucide-react";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main
      style={{
        minHeight: "70vh",
        display: "grid",
        placeItems: "center",
        textAlign: "center",
      }}
    >
      <div>
        <CloudAlert
          size={70}
          color="var(--orange)"
          style={{ margin: "auto" }}
        />
        <h1>Something Went Wrong</h1>
        <p className="muted">
          We’re having trouble right now. Please try again.
        </p>
        <button className="btn btn-primary" onClick={reset}>
          Reload Page
        </button>
      </div>
    </main>
  );
}
