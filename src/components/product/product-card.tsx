"use client";

import Image from "next/image";
import Link from "next/link";

import {
  Heart,
  Plus,
} from "lucide-react";

import {
  useMemo,
  useState,
} from "react";

import type {
  Product,
} from "@/lib/data";

import {
  formatBDT,
} from "@/lib/money";

import {
  getColorSwatch,
  uniqueVariantColors,
} from "@/lib/product-variants";

import {
  ProductQuickAdd,
} from "@/components/product/product-quick-add";

import {
  useStore,
} from "@/components/shared/store-provider";

export function ProductCard({
  product,
}: {
  product:
    Product;
}) {
  const {
    add,
    toggleWishlist,
    wishlist,
  } =
    useStore();

  const [
    hovered,
    setHovered,
  ] = useState(false);

  const [
    added,
    setAdded,
  ] = useState(false);

  const [
    quickAddOpen,
    setQuickAddOpen,
  ] = useState(false);

  const liked =
    wishlist.includes(
      product.id,
    );

  const variants =
    useMemo(
      () =>
        product.variants ??
        [],

      [
        product.variants,
      ],
    );
  const availableVariants =
    useMemo(
      () =>
        variants.filter(
          (
            variant,
          ) =>
            variant.stock >
            0,
        ),
      [
        variants,
      ],
    );

  const colorVariants =
    useMemo(
      () =>
        uniqueVariantColors(
          variants,
        ),
      [
        variants,
      ],
    );

  const disabled =
    product.stock <
      1 ||
    (
      variants.length >
        0 &&
      availableVariants.length ===
        0
    );

  function showAdded() {
    setAdded(
      true,
    );

    window.setTimeout(
      () => {
        setAdded(
          false,
        );
      },
      1400,
    );
  }

  function quickAdd() {
    if (
      disabled
    ) {
      return;
    }

    /*
     * Exactly one purchasable
     * combination:
     * add it immediately.
     */
    if (
      availableVariants.length ===
      1
    ) {
      const variant =
        availableVariants[0];

      add(
        {
          ...product,

          price:
            variant.price,
        },

        variant.size,

        variant.color,
      );

      showAdded();

      return;
    }

    /*
     * Legacy/simple products with
     * no explicit variants can still
     * use the existing cart behavior.
     */
    if (
      variants.length ===
      0
    ) {
      add(
        product,
      );

      showAdded();

      return;
    }

    /*
     * More than one valid
     * combination requires an
     * intentional selection.
     */
    setQuickAddOpen(
      true,
    );
  }

  return (
    <>
      <article
        className="product-card"
        onMouseEnter={() =>
          setHovered(
            true,
          )
        }
        onMouseLeave={() =>
          setHovered(
            false,
          )
        }
      >
        {/* ===============================================
            WISHLIST
            =============================================== */}

        <button
          type="button"
          onClick={() =>
            toggleWishlist(
              product.id,
            )
          }
          aria-label={
            liked
              ? "Remove from wishlist"
              : "Add to wishlist"
          }
          className={`product-card-wishlist${
            liked
              ? " is-liked"
              : ""
          }`}
        >
          <Heart
            size={17}
            strokeWidth={
              1.65
            }
            fill={
              liked
                ? "currentColor"
                : "none"
            }
          />
        </button>

        {/* ===============================================
            PRODUCT LINK
            =============================================== */}

        <Link
          href={`/product/${product.slug}`}
          className="product-card-link"
        >
          <div className="product-card-media">
            <Image
              src={
                hovered &&
                product.images[1]
                  ? product.images[1]
                      .url
                  : product.image
              }
              alt={
                product.alt
              }
              fill
              sizes="(max-width: 700px) 50vw, (max-width: 1100px) 33vw, 25vw"
              className="product-card-image"
            />
          </div>

          <div className="product-card-content">
            <span className="product-card-category">
              {
                product.category
              }
            </span>

            <h3 className="product-card-title">
              {
                product.name
              }
            </h3>

            <div className="product-card-price-row">
              {product.priceVaries ? (
                <small className="product-card-from">
                  From
                </small>
              ) : null}

              <span className="price">
                {formatBDT(
                  product.price,
                )}
              </span>

              {product.oldPrice ? (
                <s className="product-card-old-price">
                  {formatBDT(
                    product.oldPrice,
                  )}
                </s>
              ) : null}
            </div>

            {colorVariants.length >
            0 ? (
              <div
                className="product-card-colors"
                aria-label="Available colors"
              >
                {colorVariants
                  .slice(
                    0,
                    4,
                  )
                  .map(
                    (
                      variant,
                    ) => (
                      <span
                        key={
                          variant.color
                        }
                        aria-label={`Color ${variant.color}`}
                        title={
                          variant.color
                        }
                        className="product-card-color"
                        style={{
                          background:
                            getColorSwatch(
                              variant.color,
                              variant.colorHex,
                            ),
                        }}
                      />
                    ),
                  )}

                {colorVariants.length >
                4 ? (
                  <span className="product-card-color-more">
                    +
                    {colorVariants.length -
                      4}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        </Link>

        {/* ===============================================
            QUICK ADD
            =============================================== */}

        <button
          type="button"
          className="product-card-quick-add"
          disabled={
            disabled
          }
          onClick={
            quickAdd
          }
        >
          <Plus
            size={13}
            aria-hidden="true"
          />

          <span>
            {disabled
              ? "Out of Stock"
              : added
                ? "Added to Cart"
                : "Quick Add"}
          </span>
        </button>
      </article>

      {quickAddOpen ? (
        <ProductQuickAdd
          product={
            product
          }
          onClose={() =>
            setQuickAddOpen(
              false,
            )
          }
          onAdded={
            showAdded
          }
        />
      ) : null}
    </>
  );
}