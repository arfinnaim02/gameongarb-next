"use client";

import Link from "next/link";
import {
  Heart,
  Menu,
  Search,
  ShoppingCart,
  UserRound,
} from "lucide-react";
import { useState } from "react";
import { Logo } from "@/components/shared/logo";
import { useStore } from "@/components/shared/store-provider";

type NavCategory = {
  name: string;
  slug: string;
};

export function StoreHeader({
  navCategories,
}: {
  navCategories: NavCategory[];
}) {
  const { cartCount, wishlist } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <div className="store-utility-bar desktop-only">
        <div className="container store-utility-inner">
          <span>Free Delivery Across Bangladesh</span>
          <span>Easy Exchange &amp; Returns</span>
          <span>100% Original Products</span>
        </div>
      </div>

      <header className="store-header">
        <div className="container store-header-inner">
          <button
            type="button"
            className="store-icon-button mobile-only"
            aria-label="Open menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <Menu size={21} />
          </button>

          <div className="store-logo-wrap">
            <Logo />
          </div>

          <nav className="store-main-nav desktop-only" aria-label="Main navigation">
            <Link href="/shop?sort=newest">New In</Link>

            {navCategories.map((category) => (
              <Link
                key={category.slug}
                href={`/shop?category=${category.slug}`}
              >
                {category.name}
              </Link>
            ))}

            <Link href="/shop?offers=1" className="store-offers-link">
              Offers
            </Link>
          </nav>

          <div className="store-header-actions">
            <Link
              className="store-header-action desktop-only"
              href="/shop"
              aria-label="Search"
            >
              <Search size={18} />
            </Link>

            <Link
              className="store-header-action"
              href="/account"
              aria-label="Account"
            >
              <UserRound size={18} />
            </Link>

            <Link
              className="store-header-action desktop-only"
              href="/account/wishlist"
              aria-label={`Wishlist ${wishlist.length}`}
            >
              <Heart size={18} />
            </Link>

            <Link
              className="store-header-action store-cart-link"
              href="/cart"
              aria-label={`Cart ${cartCount}`}
            >
              <ShoppingCart size={19} />

              {cartCount > 0 ? (
                <b className="store-cart-count">{cartCount}</b>
              ) : null}
            </Link>
          </div>
        </div>
      </header>

      {menuOpen ? (
        <div
          className="mobile-menu-overlay mobile-only"
          onClick={() => setMenuOpen(false)}
        >
          <aside
            className="mobile-menu-panel"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mobile-menu-header">
              <Logo />

              <button
                type="button"
                className="mobile-menu-close"
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
              >
                ×
              </button>
            </div>

            <nav className="mobile-menu-nav" aria-label="Mobile navigation">
              <MobileMenuLink
                href="/shop?sort=newest"
                label="New In"
                close={() => setMenuOpen(false)}
              />

              {navCategories.map((category) => (
                <MobileMenuLink
                  key={category.slug}
                  href={`/shop?category=${category.slug}`}
                  label={category.name}
                  close={() => setMenuOpen(false)}
                />
              ))}

              <MobileMenuLink
                href="/shop?offers=1"
                label="Offers"
                close={() => setMenuOpen(false)}
              />

              <MobileMenuLink
                href="/track-order"
                label="Track Order"
                close={() => setMenuOpen(false)}
              />

              <MobileMenuLink
                href="/account/wishlist"
                label="Wishlist"
                close={() => setMenuOpen(false)}
              />
            </nav>
          </aside>
        </div>
      ) : null}
    </>
  );
}

function MobileMenuLink({
  href,
  label,
  close,
}: {
  href: string;
  label: string;
  close: () => void;
}) {
  return (
    <Link href={href} onClick={close} className="mobile-menu-link">
      {label}
    </Link>
  );
}
