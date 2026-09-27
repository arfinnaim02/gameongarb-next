"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, Plus } from "lucide-react";
import { useState } from "react";
import type { Product } from "@/lib/data";
import { formatBDT } from "@/lib/money";
import { useStore } from "@/components/shared/store-provider";

export function ProductCard({ product }: { product: Product }) {
  const { add, toggleWishlist, wishlist } = useStore();
  const liked = wishlist.includes(product.id);
  const [added, setAdded] = useState(false);
  const [hovered, setHovered] = useState(false);

  const availableVariant = product.variants?.find(
    (variant) => variant.stock > 0,
  );

  const disabled =
    product.stock < 1 || (!!product.variants?.length && !availableVariant);

  return (
    <article
      className="product-card"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        onClick={() => toggleWishlist(product.id)}
        aria-label={liked ? "Remove from wishlist" : "Add to wishlist"}
        className={`product-card-wishlist ${liked ? "is-liked" : ""}`}
      >
        <Heart size={17} fill={liked ? "currentColor" : "none"} />
      </button>

      <Link href={`/product/${product.slug}`} className="product-card-link">
        <div className="product-card-media">
          <Image
            src={
              hovered && product.images[1]
                ? product.images[1].url
                : product.image
            }
            alt={product.alt}
            fill
            sizes="(max-width: 700px) 50vw, (max-width: 1100px) 33vw, 25vw"
            className="product-card-image"
          />
        </div>

        <div className="product-card-content">
          {product.badge && (
            <span className="product-card-badge">{product.badge}</span>
          )}

          <h3 className="product-card-title">{product.name}</h3>

          <div className="product-card-price-row">
            <span className="price">{formatBDT(product.price)}</span>
            {product.oldPrice && (
              <s className="product-card-old-price">
                {formatBDT(product.oldPrice)}
              </s>
            )}
          </div>

          {product.colors.length > 0 && (
            <div className="product-card-colors" aria-label="Available colors">
              {product.colors.slice(0, 4).map((color) => (
                <span
                  key={color}
                  aria-label={`Color ${color}`}
                  title={color}
                  className="product-card-color"
                  style={{ background: color }}
                />
              ))}
            </div>
          )}
        </div>
      </Link>

      <button
        type="button"
        className="btn btn-dark product-card-quick-add"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;

          add(product, availableVariant?.size, availableVariant?.color);
          setAdded(true);
          window.setTimeout(() => setAdded(false), 1400);
        }}
      >
        <Plus size={14} aria-hidden="true" />
        {product.stock < 1 ? "Out of Stock" : added ? "Added" : "Quick Add"}
      </button>
    </article>
  );
}
