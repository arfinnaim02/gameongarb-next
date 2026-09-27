"use client";
import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { cartKey, useStore } from "@/components/shared/store-provider";
import { formatBDT } from "@/lib/money";
import type { Product } from "@/lib/data";
import { ProductCard } from "@/components/product/product-card";
export function CartClient({ recommended }: { recommended: Product[] }) {
  const { cart, remove, setQuantity } = useStore();
  const subtotal = cart.reduce((n, x) => n + x.product.price * x.quantity, 0);
  if (!cart.length)
    return (
      <>
        <div
          className="container"
          style={{ textAlign: "center", padding: "90px 0" }}
        >
          <ShoppingCart
            size={70}
            strokeWidth={1.3}
            style={{ margin: "auto", color: "#8b908d" }}
          />
          <h1>Your cart is empty</h1>
          <p className="muted">
            Looks like you haven’t added anything to your cart yet.
          </p>
          <Link href="/shop" className="btn btn-primary">
            Continue Shopping
          </Link>
        </div>
      </>
    );
  return (
    <div className="container" style={{ padding: "36px 0 55px" }}>
      <h1 style={{ fontSize: 32, margin: "0 0 6px" }}>Your Cart</h1>
      <p className="muted">{cart.length} items in your cart</p>
      <div
        className="cart-layout"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr) 330px",
          gap: 30,
          alignItems: "start",
        }}
      >
        <div>
          {cart.map((x) => (
            <article
              key={cartKey(x.product.id, x.size, x.color)}
              style={{
                display: "grid",
                gridTemplateColumns: "90px 1fr auto",
                gap: 14,
                padding: "17px 0",
                borderBottom: "1px solid var(--line)",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  position: "relative",
                  height: 95,
                  background: "#f4f4f1",
                }}
              >
                <Image
                  src={x.product.image}
                  alt={x.product.alt}
                  fill
                  style={{ objectFit: "contain", padding: 6 }}
                />
              </div>
              <div>
                <b>{x.product.name}</b>
                <small
                  className="muted"
                  style={{ display: "block", margin: "6px 0" }}
                >
                  Color: {x.color} · Size: {x.size}
                </small>
                <span className="price">{formatBDT(x.product.price)}</span>
                <button
                  onClick={() => remove(cartKey(x.product.id, x.size, x.color))}
                  style={{
                    display: "block",
                    border: 0,
                    background: "none",
                    padding: "8px 0",
                    fontSize: 11,
                    color: "#a73333",
                  }}
                >
                  <Trash2 size={13} style={{ display: "inline" }} /> Remove
                </button>
              </div>
              <div>
                <div
                  style={{ display: "flex", border: "1px solid var(--line)" }}
                >
                  <button
                    onClick={() =>
                      setQuantity(
                        cartKey(x.product.id, x.size, x.color),
                        x.quantity - 1,
                      )
                    }
                    style={{ border: 0, background: "white", padding: 8 }}
                  >
                    <Minus size={13} />
                  </button>
                  <span style={{ padding: 8 }}>{x.quantity}</span>
                  <button
                    onClick={() =>
                      setQuantity(
                        cartKey(x.product.id, x.size, x.color),
                        x.quantity + 1,
                      )
                    }
                    style={{ border: 0, background: "white", padding: 8 }}
                  >
                    <Plus size={13} />
                  </button>
                </div>
                <b
                  style={{
                    display: "block",
                    textAlign: "right",
                    marginTop: 12,
                  }}
                >
                  {formatBDT(x.product.price * x.quantity)}
                </b>
              </div>
            </article>
          ))}
        </div>
        <aside
          className="card"
          style={{ padding: 20, position: "sticky", top: 86 }}
        >
          <h2 style={{ marginTop: 0 }}>Order Summary</h2>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "10px 0",
            }}
          >
            <span className="muted">Subtotal</span>
            <b>{formatBDT(subtotal)}</b>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "10px 0",
            }}
          >
            <span className="muted">Shipping</span>
            <span>Calculated at checkout</span>
          </div>
          <hr style={{ border: 0, borderTop: "1px solid var(--line)" }} />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "12px 0",
              fontSize: 18,
            }}
          >
            <b>Estimated Total</b>
            <b>{formatBDT(subtotal)}</b>
          </div>
          <Link
            href="/checkout"
            className="btn btn-primary"
            style={{ width: "100%" }}
          >
            Proceed to Checkout →
          </Link>
          <Link
            href="/shop"
            className="btn btn-outline"
            style={{ width: "100%", marginTop: 8 }}
          >
            Continue Shopping
          </Link>
        </aside>
      </div>
      <section style={{ paddingTop: 42 }}>
        <h2>You May Also Like</h2>
        <div className="grid-products">
          {recommended.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    </div>
  );
}
