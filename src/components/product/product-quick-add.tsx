"use client";

import Image from "next/image";

import {
  Check,
  ShoppingBag,
  X,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  createPortal,
} from "react-dom";

import type {
  Product,
} from "@/lib/data";

import {
  formatBDT,
} from "@/lib/money";

import {
  getColorSwatch,
  sortProductSizes,
  uniqueVariantColors,
} from "@/lib/product-variants";

import {
  useStore,
} from "@/components/shared/store-provider";

type ProductQuickAddProps = {
  product: Product;

  onClose:
    () => void;

  onAdded:
    () => void;
};

export function ProductQuickAdd({
  product,
  onClose,
  onAdded,
}: ProductQuickAddProps) {
  const {
    add,
  } =
    useStore();

  const variants =
    useMemo(
      () =>
        product.variants ??
        [],
      [
        product.variants,
      ],
    );

  const initialVariant =
    variants.find(
      (
        variant,
      ) =>
        variant.stock >
        0,
    ) ??
    variants[0];

  const [
    selectedColor,
    setSelectedColor,
  ] = useState(
    initialVariant?.color ??
      product.colors[0] ??
      "Default",
  );

  const [
    selectedSize,
    setSelectedSize,
  ] = useState(
    initialVariant?.size ??
      product.sizes[0] ??
      "One Size",
  );

  /* =======================================================
     PAGE LOCK + ESCAPE
     ======================================================= */

  useEffect(() => {
    const oldOverflow =
      document.body.style
        .overflow;

    document.body.style.overflow =
      "hidden";

    function handleKeyDown(
      event:
        KeyboardEvent,
    ) {
      if (
        event.key ===
        "Escape"
      ) {
        onClose();
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.body.style.overflow =
        oldOverflow;

      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [
    onClose,
  ]);

  /* =======================================================
     OPTIONS
     ======================================================= */

  const colorVariants =
    uniqueVariantColors(
      variants,
    );

  const sizesForColor =
    sortProductSizes([
      ...new Set(
        variants
          .filter(
            (
              variant,
            ) =>
              variant.color ===
              selectedColor,
          )
          .map(
            (
              variant,
            ) =>
              variant.size,
          ),
      ),
    ]);

  const selectedVariant =
    variants.find(
      (
        variant,
      ) =>
        variant.color ===
          selectedColor &&
        variant.size ===
          selectedSize,
    );

  const canAdd =
    Boolean(
      selectedVariant &&
      selectedVariant.stock >
        0,
    );

  function chooseColor(
    color: string,
  ) {
    setSelectedColor(
      color,
    );

    const sameSize =
      variants.find(
        (
          variant,
        ) =>
          variant.color ===
            color &&
          variant.size ===
            selectedSize &&
          variant.stock >
            0,
      );

    if (
      sameSize
    ) {
      return;
    }

    const firstAvailable =
      variants.find(
        (
          variant,
        ) =>
          variant.color ===
            color &&
          variant.stock >
            0,
      );

    const firstVariant =
      variants.find(
        (
          variant,
        ) =>
          variant.color ===
          color,
      );

    setSelectedSize(
      firstAvailable?.size ??
        firstVariant?.size ??
        "",
    );
  }

  function confirmAdd() {
    if (
      !selectedVariant ||
      selectedVariant.stock <
        1
    ) {
      return;
    }

    /*
     * Preserve the exact selected
     * variant selling price in the
     * current cart architecture.
     */
    add(
      {
        ...product,

        price:
          selectedVariant.price,
      },

      selectedVariant.size,

      selectedVariant.color,
    );

    onAdded();
    onClose();
  }

  if (
    typeof document ===
    "undefined"
  ) {
    return null;
  }

  return createPortal(
    <div
      className="quick-add-overlay"
      role="presentation"
      onMouseDown={
        onClose
      }
    >
      <section
        className="quick-add-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`quick-add-${product.id}`}
        onMouseDown={(
          event,
        ) =>
          event.stopPropagation()
        }
      >
        {/* ===============================================
            HEADER
            =============================================== */}

        <header className="quick-add-header">
          <div>
            <span>
              Quick Add
            </span>

            <h2
              id={`quick-add-${product.id}`}
            >
              Select Your
              Variant
            </h2>
          </div>

          <button
            type="button"
            className="quick-add-close"
            onClick={
              onClose
            }
            aria-label="Close quick add"
          >
            <X
              size={18}
              strokeWidth={
                1.7
              }
            />
          </button>
        </header>

        {/* ===============================================
            PRODUCT
            =============================================== */}

        <div className="quick-add-product">
          <div className="quick-add-image">
            <Image
              src={
                product.image
              }
              alt={
                product.alt
              }
              fill
              sizes="92px"
            />
          </div>

          <div className="quick-add-product-copy">
            <span className="quick-add-category">
              {
                product.category
              }
            </span>

            <h3>
              {
                product.name
              }
            </h3>

            <div className="quick-add-price">
              {selectedVariant ? (
                formatBDT(
                  selectedVariant.price,
                )
              ) : product.priceVaries ? (
                <>
                  <small>
                    From
                  </small>{" "}
                  {formatBDT(
                    product.price,
                  )}
                </>
              ) : (
                formatBDT(
                  product.price,
                )
              )}
            </div>
          </div>
        </div>

        {/* ===============================================
            COLOR
            =============================================== */}

        {colorVariants.length >
        0 ? (
          <div className="quick-add-option-group">
            <div className="quick-add-option-heading">
              <span>
                Color
              </span>

              <strong>
                {
                  selectedColor
                }
              </strong>
            </div>

            <div className="quick-add-colors">
              {colorVariants.map(
                (
                  variant,
                ) => {
                  const available =
                    variants.some(
                      (
                        item,
                      ) =>
                        item.color ===
                          variant.color &&
                        item.stock >
                          0,
                    );

                  const selected =
                    variant.color ===
                    selectedColor;

                  return (
                    <button
                      key={
                        variant.color
                      }
                      type="button"
                      disabled={
                        !available
                      }
                      className={`quick-add-color${
                        selected
                          ? " is-selected"
                          : ""
                      }`}
                      onClick={() =>
                        chooseColor(
                          variant.color,
                        )
                      }
                      aria-label={`Select ${variant.color}`}
                      aria-pressed={
                        selected
                      }
                    >
                      <span
                        style={{
                          background:
                            getColorSwatch(
                              variant.color,
                              variant.colorHex,
                            ),
                        }}
                      />

                      <b>
                        {
                          variant.color
                        }
                      </b>
                    </button>
                  );
                },
              )}
            </div>
          </div>
        ) : null}

        {/* ===============================================
            SIZE
            =============================================== */}

        {sizesForColor.length >
        0 ? (
          <div className="quick-add-option-group">
            <div className="quick-add-option-heading">
              <span>
                Size
              </span>

              <strong>
                {
                  selectedSize
                }
              </strong>
            </div>

            <div className="quick-add-sizes">
              {sizesForColor.map(
                (
                  size,
                ) => {
                  const variant =
                    variants.find(
                      (
                        item,
                      ) =>
                        item.color ===
                          selectedColor &&
                        item.size ===
                          size,
                    );

                  const available =
                    Boolean(
                      variant &&
                      variant.stock >
                        0,
                    );

                  const selected =
                    size ===
                    selectedSize;

                  return (
                    <button
                      key={
                        size
                      }
                      type="button"
                      disabled={
                        !available
                      }
                      className={`quick-add-size${
                        selected
                          ? " is-selected"
                          : ""
                      }`}
                      onClick={() =>
                        setSelectedSize(
                          size,
                        )
                      }
                      aria-pressed={
                        selected
                      }
                    >
                      {size}
                    </button>
                  );
                },
              )}
            </div>
          </div>
        ) : null}

        {/* ===============================================
            STOCK
            =============================================== */}

        <div className="quick-add-stock">
          {selectedVariant ? (
            selectedVariant.stock >
            0 ? (
              <>
                <span className="quick-add-stock-dot" />

                <strong>
                  In Stock
                </strong>

                <span>
                  {
                    selectedVariant.stock
                  }{" "}
                  available
                </span>
              </>
            ) : (
              <strong className="is-out">
                Selected option
                is out of stock
              </strong>
            )
          ) : (
            <strong className="is-out">
              Select an available
              combination
            </strong>
          )}
        </div>

        {/* ===============================================
            ADD
            =============================================== */}

        <button
          type="button"
          className="quick-add-submit"
          disabled={
            !canAdd
          }
          onClick={
            confirmAdd
          }
        >
          {canAdd ? (
            <>
              <ShoppingBag
                size={16}
                strokeWidth={
                  1.7
                }
              />

              Add to Cart

              <span>
                {formatBDT(
                  selectedVariant!
                    .price,
                )}
              </span>
            </>
          ) : (
            "Unavailable"
          )}
        </button>

        {canAdd ? (
          <div className="quick-add-confirmation">
            <Check
              size={13}
            />

            SKU:{" "}
            {
              selectedVariant
                ?.sku
            }
          </div>
        ) : null}
      </section>
    </div>,

    document.body,
  );
}