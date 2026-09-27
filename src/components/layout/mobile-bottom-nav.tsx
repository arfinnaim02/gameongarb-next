"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  LayoutGrid,
  Store,
  UserRound,
} from "lucide-react";

export function MobileBottomNav() {
  const pathname = usePathname();

  const items = [
    { href: "/", label: "Home", icon: Home },
    { href: "/shop", label: "Shop", icon: Store },
    { href: "/categories", label: "Categories", icon: LayoutGrid },
    { href: "/account", label: "Account", icon: UserRound },
  ];

  return (
    <nav className="mobile-only mobile-bottom-nav" aria-label="Mobile navigation">
      {items.map(({ href, label, icon: Icon }) => {
        const active =
          href === "/" ? pathname === "/" : pathname.startsWith(href);

        return (
          <Link
            key={href}
            href={href}
            className={`mobile-bottom-link${active ? " is-active" : ""}`}
          >
            <Icon size={19} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
