"use client";
import Image from "next/image";
import Link from "next/link";
import {
  ChevronDown,
  Heart,
  Maximize2,
  Minus,
  Plus,
  RefreshCw,
  ShieldCheck,
  ShoppingCart,
  Truck,
} from "lucide-react";
import { useState } from "react";
import type { Product } from "@/lib/data";
import { formatBDT } from "@/lib/money";
import { useStore } from "@/components/shared/store-provider";
export function ProductDetail({
  product,
  description,
}: {
  product: Product;
  description?: string;
}) {
  const defaultVariant =
    product.variants?.find((variant) => variant.stock > 0) ??
    product.variants?.[0];
  const [size, setSize] = useState(
    defaultVariant?.size ?? product.sizes[0] ?? "One Size",
  );
  const [color, setColor] = useState(
    defaultVariant?.color ?? product.colors[0] ?? "Default",
  );
  const [qty, setQty] = useState(1);
  const gallery = product.images.length
    ? product.images
    : [{ url: product.image, alt: product.alt }];
  const [activeImage, setActiveImage] = useState(gallery[0].url);
  const [fullscreen, setFullscreen] = useState(false);
  const { add, toggleWishlist, wishlist } = useStore();
  const selectedVariant = product.variants?.find(
    (v) => v.size === size && v.color === color,
  );
  const selectedPrice = selectedVariant?.price ?? product.price;
  const selectedStock = product.variants?.length
    ? (selectedVariant?.stock ?? 0)
    : product.stock;
  const inStock = selectedStock > 0;
  return (
    <div className="container" style={{ padding: "22px 0 40px" }}>
      <div className="muted" style={{ fontSize: 11, marginBottom: 18 }}>
        Home / {product.category} / {product.name}
      </div>
      <div
        className="product-layout"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1.05fr) minmax(320px,.95fr)",
          gap: "clamp(24px,5vw,64px)",
        }}
      >
        <div>
          <div
            style={{
              position: "relative",
              aspectRatio: "1/1.02",
              background: "#f3f4f1",
            }}
          >
            <Image
              src={activeImage}
              alt={product.alt}
              fill
              priority
              sizes="(max-width:800px) 100vw, 55vw"
              style={{ objectFit: "contain", padding: "7%" }}
            />
            <button
              onClick={() => setFullscreen(true)}
              aria-label="View fullscreen"
              style={{
                position: "absolute",
                right: 14,
                bottom: 14,
                border: 0,
                background: "white",
                borderRadius: 30,
                width: 40,
                height: 40,
                display: "grid",
                placeItems: "center",
              }}
            >
              <Maximize2 size={17} />
            </button>
          </div>
          <div style={{ display: "flex", gap: 9, marginTop: 10 }}>
            {gallery.map((image) => (
              <button
                key={image.url}
                onClick={() => setActiveImage(image.url)}
                aria-label={`View ${image.alt}`}
                style={{
                  position: "relative",
                  width: 74,
                  height: 84,
                  border:
                    image.url === activeImage
                      ? "1px solid var(--orange)"
                      : "1px solid var(--line)",
                  background: "#f5f5f2",
                }}
              >
                <Image
                  src={image.url}
                  alt={image.alt}
                  fill
                  style={{ objectFit: "contain", padding: 8 }}
                />
              </button>
            ))}
          </div>
        </div>
        <div style={{ paddingTop: 8 }}>
          {product.badge && <span className="eyebrow">{product.badge}</span>}
          <h1
            style={{
              fontSize: "clamp(1.8rem,4vw,3rem)",
              letterSpacing: "-.04em",
              margin: "8px 0",
            }}
          >
            {product.name}
          </h1>
          <div className="price" style={{ fontSize: 27 }}>
            {formatBDT(selectedPrice)}
          </div>
          {!!product.reviewCount && (
            <div style={{ color: "#ef9a34", margin: "8px 0 14px" }}>
              {"★".repeat(Math.round(product.rating ?? 0))}
              {"☆".repeat(5 - Math.round(product.rating ?? 0))}{" "}
              <span className="muted" style={{ fontSize: 11 }}>
                {product.rating?.toFixed(1)} ({product.reviewCount} reviews)
              </span>
            </div>
          )}
          <p className="muted" style={{ lineHeight: 1.65 }}>
            {description ??
              "Premium performance and everyday style, designed for those who live with passion."}
          </p>
          <hr
            style={{
              border: 0,
              borderTop: "1px solid var(--line)",
              margin: "20px 0",
            }}
          />
          <b style={{ fontSize: 13 }}>
            Color: <span className="muted">{color}</span>
          </b>
          <div style={{ display: "flex", gap: 8, margin: "10px 0 18px" }}>
            {product.colors.map((c) => (
              <button
                key={c}
                disabled={
                  !!product.variants?.length &&
                  !product.variants.some(
                    (variant) => variant.color === c && variant.stock > 0,
                  )
                }
                onClick={() => {
                  setColor(c);
                  const available = product.variants?.find(
                    (variant) => variant.color === c && variant.stock > 0,
                  );
                  if (
                    available &&
                    !product.variants?.some(
                      (variant) =>
                        variant.color === c &&
                        variant.size === size &&
                        variant.stock > 0,
                    )
                  )
                    setSize(available.size);
                  setQty(1);
                }}
                aria-label={`Select color ${c}`}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 30,
                  background: c,
                  border: color === c ? "3px solid white" : "2px solid white",
                  outline:
                    color === c ? "2px solid var(--orange)" : "1px solid #bbb",
                }}
              />
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <b style={{ fontSize: 13 }}>Size: {size}</b>
            <Link
              href="/size-guide"
              style={{ fontSize: 12, textDecoration: "underline" }}
            >
              Size Guide
            </Link>
          </div>
          <div
            style={{
              display: "flex",
              gap: 8,
              margin: "10px 0 20px",
              flexWrap: "wrap",
            }}
          >
            {product.sizes.map((s) => (
              <button
                key={s}
                disabled={
                  !!product.variants?.length &&
                  !product.variants.some(
                    (variant) =>
                      variant.size === s &&
                      variant.color === color &&
                      variant.stock > 0,
                  )
                }
                onClick={() => {
                  setSize(s);
                  setQty(1);
                }}
                style={{
                  width: 46,
                  height: 42,
                  border:
                    size === s ? "1px solid #111" : "1px solid var(--line)",
                  background: size === s ? "#111" : "white",
                  color: size === s ? "white" : "#111",
                  opacity:
                    product.variants?.length &&
                    !product.variants.some(
                      (variant) =>
                        variant.size === s &&
                        variant.color === color &&
                        variant.stock > 0,
                    )
                      ? 0.35
                      : 1,
                  fontWeight: 750,
                }}
              >
                {s}
              </button>
            ))}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 13,
            }}
          >
            <div style={{ display: "flex", border: "1px solid var(--line)" }}>
              <button
                onClick={() => setQty(Math.max(1, qty - 1))}
                aria-label="Decrease"
                style={{ width: 40, border: 0, background: "white" }}
              >
                <Minus size={15} />
              </button>
              <span style={{ width: 38, textAlign: "center", padding: 10 }}>
                {qty}
              </span>
              <button
                onClick={() => setQty(Math.min(selectedStock, qty + 1))}
                aria-label="Increase"
                style={{ width: 40, border: 0, background: "white" }}
              >
                <Plus size={15} />
              </button>
            </div>
            <span className={inStock ? "badge green" : "badge red"}>
              {inStock ? `In Stock (${selectedStock})` : "Out of Stock"}
            </span>
          </div>
          <button
            disabled={!inStock}
            className="btn btn-primary"
            style={{ width: "100%", fontSize: 15 }}
            onClick={() => {
              for (let i = 0; i < qty; i++)
                add({ ...product, price: selectedPrice }, size, color);
            }}
          >
            <ShoppingCart size={18} />
            Add to Cart
          </button>
          <Link
            href="/checkout"
            aria-disabled={!inStock}
            onClick={(event) => {
              if (!inStock) {
                event.preventDefault();
                return;
              }
              add({ ...product, price: selectedPrice }, size, color);
            }}
            className="btn btn-outline"
            style={{ width: "100%", marginTop: 8, opacity: inStock ? 1 : 0.45 }}
          >
            Buy Now
          </Link>
          <button
            onClick={() => toggleWishlist(product.id)}
            className="btn"
            style={{ width: "100%", background: "transparent" }}
          >
            <Heart
              size={17}
              fill={wishlist.includes(product.id) ? "var(--orange)" : "none"}
            />{" "}
            {wishlist.includes(product.id)
              ? "Saved to Wishlist"
              : "Add to Wishlist"}
          </button>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3,1fr)",
              gap: 6,
              borderBlock: "1px solid var(--line)",
              padding: "16px 0",
              marginTop: 8,
            }}
          >
            {[
              [Truck, "Free Delivery", "Across Bangladesh"],
              [RefreshCw, "Easy Returns", "Within 7 days"],
              [ShieldCheck, "100% Original", "Products"],
            ].map(([I, a, b]) => {
              const Icon = I as typeof Truck;
              return (
                <div key={a as string} style={{ textAlign: "center" }}>
                  <Icon size={19} />
                  <b style={{ display: "block", fontSize: 9 }}>{a as string}</b>
                  <small className="muted" style={{ fontSize: 8 }}>
                    {b as string}
                  </small>
                </div>
              );
            })}
          </div>
          {[
            "Product Details",
            "Size & Fit",
            "Delivery & Returns",
            "Care Instructions",
          ].map((x, i) => (
            <details
              key={x}
              open={i === 0}
              style={{
                borderBottom: "1px solid var(--line)",
                padding: "15px 0",
              }}
            >
              <summary
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontWeight: 750,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                {x}
                <ChevronDown size={16} />
              </summary>
              <p className="muted" style={{ fontSize: 12, lineHeight: 1.6 }}>
                Premium breathable fabric, modern athletic fit and carefully
                finished details. See the size guide and care label before
                washing.
              </p>
            </details>
          ))}
        </div>
      </div>
      {fullscreen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Product image preview"
          onClick={() => setFullscreen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "#000d",
            display: "grid",
            placeItems: "center",
            padding: 30,
          }}
        >
          <button
            onClick={() => setFullscreen(false)}
            aria-label="Close preview"
            style={{
              position: "absolute",
              right: 24,
              top: 20,
              color: "white",
              border: 0,
              background: "none",
              fontSize: 30,
            }}
          >
            ×
          </button>
          <div
            style={{
              position: "relative",
              width: "min(90vw,850px)",
              height: "85vh",
            }}
          >
            <Image
              src={activeImage}
              alt={product.alt}
              fill
              sizes="90vw"
              style={{ objectFit: "contain" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
