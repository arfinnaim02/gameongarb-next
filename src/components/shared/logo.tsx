import Link from "next/link";
export function Logo({ admin = false }: { admin?: boolean }) {
  return (
    <Link
      href={admin ? "/admin" : "/"}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 9,
        fontWeight: 950,
        letterSpacing: "-.04em",
      }}
    >
      <span
        style={{
          display: "grid",
          placeItems: "center",
          width: 34,
          height: 22,
          background: "var(--orange)",
          clipPath: "polygon(0 42%,35% 0,100% 20%,84% 100%,28% 78%)",
          color: "white",
          fontSize: 11,
        }}
      >
        G
      </span>
      <span>
        GAME ON GARB
        <small
          style={{
            display: "block",
            fontSize: 7,
            color: "var(--orange)",
            letterSpacing: 1.2,
          }}
        >
          EXPERIENCE THE THRILL
        </small>
      </span>
    </Link>
  );
}
