import Image from "next/image";
import Link from "next/link";

export function Logo({
  admin = false,
}: {
  admin?: boolean;
}) {
  return (
    <Link
      href={
        admin
          ? "/admin"
          : "/"
      }
      className="brand-logo"
      aria-label={
        admin
          ? "GameOn Garb Admin"
          : "GameOn Garb Home"
      }
    >
      <Image
        src="/brand/game-on-garb-logo.svg"
        alt="GameOn Garb - Experience The Thrill"
        width={587}
        height={375}
        className="brand-logo-image"
                priority={!admin}
        loading={
          admin
            ? "lazy"
            : "eager"
        }
      />
    </Link>
  );
}