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
      />

      {/* =====================================================
          GLOBAL MOBILE BOTTOM NAVIGATION
          ===================================================== */}

      <MobileBottomNav />
    </>
  );
}