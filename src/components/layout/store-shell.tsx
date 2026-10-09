"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  usePathname,
} from "next/navigation";

import {
  CartDrawer,
} from "@/components/cart/cart-drawer";

import {
  MobileBottomNav,
} from "@/components/layout/mobile-bottom-nav";

import {
  StoreFooter,
} from "@/components/layout/store-footer";

import {
  StoreHeader,
} from "@/components/layout/store-header";

import {
  ShoppingBag,
} from "lucide-react";

import {
  useStore,
} from "@/components/shared/store-provider";

import {
  formatBDT,
} from "@/lib/money";
/* =========================================================
   TYPES
   ========================================================= */

type NavCategory = {
  name: string;
  slug: string;
};

type StoreShellProps = {
  children: React.ReactNode;

  navCategories: NavCategory[];

  settings: Record<
    string,
    unknown
  >;
};

/* =========================================================
   STORE SHELL
   ========================================================= */

export function StoreShell({
  children,
  navCategories,
  settings,
}: StoreShellProps) {
  const pathname =
    usePathname();

      const {
    cart,
    cartCount,
  } =
    useStore();

  const cartSubtotal =
    cart.reduce(
      (
        total,
        line,
      ) =>
        total +
        line.product.price *
          line.quantity,
      0,
    );

  const [
    cartOpen,
    setCartOpen,
  ] = useState(false);

  /* ---------------------------------------------------------
     Stable cart drawer controls.
     --------------------------------------------------------- */

  const handleCartOpen =
    useCallback(() => {
      setCartOpen(true);
    }, []);

  const handleCartClose =
    useCallback(() => {
      setCartOpen(false);
    }, []);

  /* ---------------------------------------------------------
     Close drawer automatically when navigation occurs.

     Example:
     Drawer → Checkout
     Drawer → View Cart
     Product → another page
     --------------------------------------------------------- */

  useEffect(() => {
    setCartOpen(false);
  }, [pathname]);

  return (
    <>
      {/* =====================================================
          GLOBAL STORE HEADER
          ===================================================== */}

      <StoreHeader
        navCategories={
          navCategories
        }
        onCartOpen={
          handleCartOpen
        }
      />

      {/* =====================================================
          GLOBAL CART / CHECKOUT DRAWER

          This belongs to StoreShell,
          not to any individual page.

          Therefore it works from:
          Home
          Shop
          Product
          Cart
          Checkout
          Account
          Track Order
          etc.
          ===================================================== */}

      <CartDrawer
        open={cartOpen}
        onClose={
          handleCartClose
        }
      />

            {/* =====================================================
          FLOATING CART TRIGGER
          ===================================================== */}

      {!cartOpen ? (
        <button
          type="button"
          className="floating-cart-trigger"
          onClick={
            handleCartOpen
          }
          aria-label={`Open cart with ${cartCount} ${
            cartCount ===
            1
              ? "item"
              : "items"
          }`}
          aria-controls="gog-cart-drawer"
        >
          <span className="floating-cart-icon">
            <ShoppingBag
              size={
                25
              }
              strokeWidth={
                1.8
              }
            />
          </span>

          <span className="floating-cart-count">
            {
              cartCount
            }{" "}
            {cartCount ===
            1
              ? "ITEM"
              : "ITEMS"}
          </span>

          <span className="floating-cart-divider" />

          <strong className="floating-cart-total">
            {formatBDT(
              cartSubtotal,
            )}
          </strong>
        </button>
      ) : null}

      {/* =====================================================
          CURRENT STORE PAGE
          ===================================================== */}

      <main className="store-main">
        {children}
      </main>

      {/* =====================================================
          GLOBAL STORE FOOTER
          ===================================================== */}

      <StoreFooter
        settings={settings}
        navCategories={
          navCategories
        }
      />

      {/* =====================================================
          GLOBAL MOBILE BOTTOM NAVIGATION
          ===================================================== */}

      <MobileBottomNav />
    </>
  );
}