"use client";

import Link from "next/link";

import {
  usePathname,
} from "next/navigation";

import {
  Heart,
  Menu,
  Search,
  ShoppingBag,
  UserRound,
  X,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

import {
  Logo,
} from "@/components/shared/logo";

import {
  useStore,
} from "@/components/shared/store-provider";

/* =========================================================
   TYPES
   ========================================================= */

type NavCategory = {
  name: string;
  slug: string;
};

type StoreHeaderProps = {
  navCategories:
    NavCategory[];

  onCartOpen:
    () => void;
};

/* =========================================================
   STORE HEADER
   ========================================================= */

export function StoreHeader({
  navCategories,
  onCartOpen,
}: StoreHeaderProps) {
  const pathname =
    usePathname();

  const {
    cartCount,
    wishlist,
  } =
    useStore();

  const [
    menuOpen,
    setMenuOpen,
  ] =
    useState(false);

  /* =======================================================
     CLOSE MOBILE MENU AFTER NAVIGATION
     ======================================================= */

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  /* =======================================================
     MOBILE MENU SCROLL LOCK
     ======================================================= */

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    function handleEscape(
      event:
        KeyboardEvent,
    ) {
      if (
        event.key ===
        "Escape"
      ) {
        setMenuOpen(
          false,
        );
      }
    }

    window.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, [menuOpen]);

  return (
    <>
      {/* ===================================================
          MAIN HEADER
          =================================================== */}

      <header className="store-header">
        <div className="container store-header-inner">
          {/* ===============================================
              MOBILE MENU BUTTON
              =============================================== */}

          <button
            type="button"
            className="store-icon-button mobile-only"
            aria-label="Open menu"
            aria-expanded={
              menuOpen
            }
            aria-controls="store-mobile-menu"
            onClick={() =>
              setMenuOpen(
                true,
              )
            }
          >
            <Menu
              size={22}
              strokeWidth={1.8}
              aria-hidden="true"
            />
          </button>

          {/* ===============================================
              LOGO
              =============================================== */}

          <div className="store-logo-wrap">
            <Logo />
          </div>

          {/* ===============================================
              DESKTOP NAVIGATION
              =============================================== */}

          <nav
            className="store-main-nav desktop-only"
            aria-label="Main navigation"
          >
            <Link href="/shop?sort=newest">
              New In
            </Link>

            {navCategories.map(
              (
                category,
              ) => (
                <Link
                  key={
                    category.slug
                  }
                  href={`/shop?category=${category.slug}`}
                >
                  {
                    category.name
                  }
                </Link>
              ),
            )}

            <Link
              href="/shop?offers=1"
              className="store-offers-link"
            >
              Offers
            </Link>
          </nav>

          {/* ===============================================
              HEADER ACTIONS
              =============================================== */}

          <div className="store-header-actions">
            {/* Search */}

            <Link
              href="/shop"
              className="store-header-action desktop-only"
              aria-label="Search products"
            >
              <Search
                size={19}
                strokeWidth={1.7}
                aria-hidden="true"
              />
            </Link>

            {/* Account */}

            <Link
              href="/account"
              className="store-header-action"
              aria-label="My account"
            >
              <UserRound
                size={19}
                strokeWidth={1.7}
                aria-hidden="true"
              />
            </Link>

            {/* Wishlist */}

            <Link
              href="/account/wishlist"
              className="store-header-action desktop-only"
              aria-label={`Wishlist with ${wishlist.length} ${
                wishlist.length ===
                1
                  ? "item"
                  : "items"
              }`}
            >
              <Heart
                size={19}
                strokeWidth={1.7}
                aria-hidden="true"
              />

              {wishlist.length >
              0 ? (
                <span
                  className="store-action-indicator"
                  aria-hidden="true"
                />
              ) : null}
            </Link>

            {/* =============================================
                CART / CHECKOUT TRIGGER

                Opens the global cart drawer.
                The checkout CTA is available inside
                the cart drawer.
                ============================================= */}

            <button
              type="button"
              className="store-header-action store-cart-link store-cart-trigger"
              aria-label={`Open cart with ${cartCount} ${
                cartCount ===
                1
                  ? "item"
                  : "items"
              }`}
              aria-controls="gog-cart-drawer"
              onClick={
                onCartOpen
              }
            >
              <ShoppingBag
                size={20}
                strokeWidth={1.8}
                aria-hidden="true"
              />

              {cartCount >
              0 ? (
                <b
                  className="store-cart-count"
                  aria-hidden="true"
                >
                  {
                    cartCount
                  }
                </b>
              ) : null}
            </button>
          </div>
        </div>
      </header>

      {/* ===================================================
          MOBILE NAVIGATION DRAWER
          =================================================== */}

      {menuOpen ? (
        <div
          className="mobile-menu-overlay mobile-only"
          role="presentation"
          onMouseDown={() =>
            setMenuOpen(
              false,
            )
          }
        >
          <aside
            id="store-mobile-menu"
            className="mobile-menu-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Store navigation"
            onMouseDown={(
              event,
            ) =>
              event.stopPropagation()
            }
          >
            {/* =============================================
                DRAWER HEADER
                ============================================= */}

            <div className="mobile-menu-header">
              <Logo />

              <button
                type="button"
                className="mobile-menu-close"
                aria-label="Close menu"
                onClick={() =>
                  setMenuOpen(
                    false,
                  )
                }
              >
                <X
                  size={21}
                  strokeWidth={1.8}
                  aria-hidden="true"
                />
              </button>
            </div>

            {/* =============================================
                PRIMARY NAVIGATION
                ============================================= */}

            <nav
              className="mobile-menu-nav"
              aria-label="Mobile navigation"
            >
              <MobileMenuLink
                href="/shop?sort=newest"
                label="New In"
                close={() =>
                  setMenuOpen(
                    false,
                  )
                }
              />

              {navCategories.map(
                (
                  category,
                ) => (
                  <MobileMenuLink
                    key={
                      category.slug
                    }
                    href={`/shop?category=${category.slug}`}
                    label={
                      category.name
                    }
                    close={() =>
                      setMenuOpen(
                        false,
                      )
                    }
                  />
                ),
              )}

              <MobileMenuLink
                href="/shop?offers=1"
                label="Offers"
                highlight
                close={() =>
                  setMenuOpen(
                    false,
                  )
                }
              />
            </nav>

            {/* =============================================
                CUSTOMER LINKS
                ============================================= */}

            <nav
              className="mobile-menu-secondary"
              aria-label="Customer links"
            >
              <MobileMenuLink
                href="/account"
                label="My Account"
                close={() =>
                  setMenuOpen(
                    false,
                  )
                }
              />

              <MobileMenuLink
                href="/account/wishlist"
                label={`Wishlist${
                  wishlist.length >
                  0
                    ? ` (${wishlist.length})`
                    : ""
                }`}
                close={() =>
                  setMenuOpen(
                    false,
                  )
                }
              />

              <MobileMenuLink
                href="/track-order"
                label="Track Order"
                close={() =>
                  setMenuOpen(
                    false,
                  )
                }
              />
            </nav>

            {/* =============================================
                DRAWER FOOTER
                ============================================= */}

            <div className="mobile-menu-footer">
              <p>
                Game On Garb
              </p>

              <span>
                Experience The Thrill
              </span>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}

/* =========================================================
   MOBILE MENU LINK
   ========================================================= */

function MobileMenuLink({
  href,
  label,
  close,
  highlight = false,
}: {
  href:
    string;

  label:
    string;

  close:
    () => void;

  highlight?:
    boolean;
}) {
  return (
    <Link
      href={
        href
      }
      onClick={
        close
      }
      className={`mobile-menu-link${
        highlight
          ? " is-highlight"
          : ""
      }`}
    >
      <span>
        {
          label
        }
      </span>

      <span aria-hidden="true">
        →
      </span>
    </Link>
  );
}