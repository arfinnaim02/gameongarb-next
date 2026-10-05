/* eslint-disable react-hooks/set-state-in-effect */
"use client";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Product } from "@/lib/data";

export type CartLine = {
  product: Product;
  size: string;
  color: string;
  quantity: number;
};
type StoreContextValue = {
  cart: CartLine[];
  wishlist: string[];

  ready: boolean;
  add: (p: Product, size?: string, color?: string) => void;
  remove: (key: string) => void;
  setQuantity: (key: string, q: number) => void;
  toggleWishlist: (id: string) => void;
  clear: () => void;
  cartCount: number;
};
const StoreContext = createContext<StoreContextValue | null>(null);
export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      setCart(JSON.parse(localStorage.getItem("gog-cart") || "[]"));
      setWishlist(JSON.parse(localStorage.getItem("gog-wishlist") || "[]"));
      fetch("/api/account/wishlist")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.productIds) setWishlist(data.productIds);
        })
        .catch(() => undefined);
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) localStorage.setItem("gog-cart", JSON.stringify(cart));
  }, [cart, ready]);
  useEffect(() => {
    if (ready) localStorage.setItem("gog-wishlist", JSON.stringify(wishlist));
  }, [wishlist, ready]);
  const value = useMemo<StoreContextValue>(
    () => ({
      cart,
      wishlist,
      ready,
      add: (
        product: Product,
        size = product.sizes[0],
        color = product.colors[0],
      ) =>
        setCart((v) => {
          const key = cartKey(product.id, size, color);
          const variantStock =
            product.variants?.find(
              (variant) => variant.size === size && variant.color === color,
            )?.stock ?? product.stock;
          if (variantStock < 1) return v;
          const i = v.findIndex(
            (x) => cartKey(x.product.id, x.size, x.color) === key,
          );
          return i < 0
            ? [...v, { product, size, color, quantity: 1 }]
            : v.map((x, n) =>
                n === i
                  ? { ...x, quantity: Math.min(x.quantity + 1, variantStock) }
                  : x,
              );
        }),
      remove: (key: string) =>
        setCart((v) =>
          v.filter((x) => cartKey(x.product.id, x.size, x.color) !== key),
        ),
      setQuantity: (key: string, q: number) =>
        setCart((v) =>
          v.map((x) => {
            if (cartKey(x.product.id, x.size, x.color) !== key) return x;
            const stock =
              x.product.variants?.find(
                (
                  variant,
                ) =>
                  variant.size ===
                    x.size &&
                  variant.color ===
                    x.color,
              )?.stock ??
              x.product.stock;

            if (
              stock <
              1
            ) {
              return x;
            }

            return {
              ...x,

              quantity:
                Math.max(
                  1,
                  Math.min(
                    q,
                    stock,
                  ),
                ),
            };
          }),
        ),
      toggleWishlist: (id: string) => {
        setWishlist((v) =>
          v.includes(id) ? v.filter((x) => x !== id) : [...v, id],
        );
        fetch("/api/account/wishlist", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ productId: id }),
        }).catch(() => undefined);
      },
      clear: () => setCart([]),
      cartCount: cart.reduce((n, x) => n + x.quantity, 0),
    }),
    [
      cart,
      wishlist,
      ready,
    ],
  );
  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}
export function cartKey(productId: string, size: string, color: string) {
  return `${productId}::${size}::${color}`;
}
export function useStore() {
  const v = useContext(StoreContext);
  if (!v) throw new Error("StoreProvider missing");
  return v;
}
