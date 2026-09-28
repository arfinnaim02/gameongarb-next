import Link from "next/link";

export function Logo({
  admin = false,
}: {
  admin?: boolean;
}) {
  return (
    <Link
      href={admin ? "/admin" : "/"}
      className="brand-logo"
      aria-label={
        admin
          ? "Game On Garb Admin"
          : "Game On Garb Home"
      }
    >
      <img
        src="/brand/game-on-garb-logo.svg"
        alt="Game On Garb - Experience The Thrill"
        className="brand-logo-image"
      />
    </Link>
  );
}