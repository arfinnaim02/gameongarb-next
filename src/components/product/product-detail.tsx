"use client";

import Image from "next/image";
import Link from "next/link";

import {
  Heart,
  Maximize2,
  Minus,
  Plus,
  RefreshCw,
  ShieldCheck,
  ShoppingCart,
  Truck,
  X,
} from "lucide-react";

import {
  useEffect,
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
  sortProductSizes,
  uniqueVariantColors,
} from "@/lib/product-variants";

import {
  useStore,
} from "@/components/shared/store-provider";

import {
  ProductSizeGuide,
} from "@/components/product/product-size-guide";

import type {
  PublicSizeChart,
} from "@/lib/size-chart-types";

/* =========================================================
   CONSTANTS
   ========================================================= */

const GALLERY_INTERVAL =
  4000;

/* =========================================================
   TYPES
   ========================================================= */

type ProductDetailProps = {
  product: Product;

  shortDescription?:
    string;

  description?:
    string;

  sizeChart?:
    PublicSizeChart | null;
};
/* =========================================================
   PRODUCT DETAIL
   ========================================================= */

export function ProductDetail({
  product,
  shortDescription,
  description,
  sizeChart,
}: ProductDetailProps) {
  const {
    add,
    toggleWishlist,
    wishlist,
  } =
    useStore();

  /* =======================================================
     PRODUCT VARIANTS
     ======================================================= */

  const variants =
    useMemo(
      () =>
        product.variants ??
        [],

      [
        product.variants,
      ],
    );

  const defaultVariant =
    variants.find(
      (
        variant,
      ) =>
        variant.stock >
        0,
    ) ??
    variants[0];

  const [
    color,
    setColor,
  ] = useState(
    defaultVariant?.color ??
      product.colors[0] ??
      "Default",
  );

  const [
    size,
    setSize,
  ] = useState(
    defaultVariant?.size ??
      product.sizes[0] ??
      "One Size",
  );

  const [
    quantity,
    setQuantity,
  ] = useState(1);

  /* =======================================================
     GALLERY
     ======================================================= */

  const gallery =
    useMemo(
      () => {
        const images =
          product.images.length >
          0
            ? product.images
            : [
                {
                  url:
                    product.image,

                  alt:
                    product.alt,

                  color:
                    undefined,
                },
              ];

        /*
         * Legacy products may not have any
         * images assigned to colors yet.
         */
        const hasColorAssignments =
          images.some(
            (
              image,
            ) =>
              Boolean(
                image.color?.trim(),
              ),
          );

        if (
          !hasColorAssignments
        ) {
          return images;
        }

        const selectedColor =
          color
            .trim()
            .toLowerCase();

        const matched =
          images.filter(
            (
              image,
            ) =>
              image.color
                ?.trim()
                .toLowerCase() ===
              selectedColor,
          );

        /*
         * Exact selected-color images always win.
         */
        if (
          matched.length >
          0
        ) {
          return matched;
        }

        /*
         * Generic detail images can be used when
         * a color has no dedicated photography.
         */
        const generic =
          images.filter(
            (
              image,
            ) =>
              !image.color?.trim(),
          );

        return generic.length >
          0
          ? generic
          : images;
      },

      [
        color,
        product.alt,
        product.image,
        product.images,
      ],
    );

  const [
    activeImageIndex,
    setActiveImageIndex,
  ] = useState(0);

  const [
    fullscreen,
    setFullscreen,
  ] = useState(false);



  const activeImage =
    gallery[
      activeImageIndex
    ] ??
    gallery[0];

  /* =======================================================
     AUTOMATIC GALLERY
     ======================================================= */

  useEffect(() => {
    if (
      gallery.length <= 1
    ) {
      return;
    }

    const reducedMotion =
      window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      );

    if (
      reducedMotion.matches
    ) {
      return;
    }

    const timer =
      window.setTimeout(
        () => {
          setActiveImageIndex(
            (
              current,
            ) =>
              (
                current +
                1
              ) %
              gallery.length,
          );
        },

        GALLERY_INTERVAL,
      );

    return () => {
      window.clearTimeout(
        timer,
      );
    };
  }, [
    activeImageIndex,
    gallery.length,
  ]);

  /* =======================================================
     PRELOAD NEXT IMAGE
     ======================================================= */

  useEffect(() => {
    if (
      gallery.length <= 1
    ) {
      return;
    }

    const nextIndex =
      (
        activeImageIndex +
        1
      ) %
      gallery.length;

    const nextImage =
      gallery[nextIndex];

    if (!nextImage) {
      return;
    }

    const image =
      new window.Image();

    image.src =
      nextImage.url;
  }, [
    activeImageIndex,
    gallery,
  ]);

  /* =======================================================
     FULLSCREEN
     ======================================================= */

  useEffect(() => {
    if (
      !fullscreen
    ) {
      return;
    }

    const previousOverflow =
      document.body.style
        .overflow;

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
        setFullscreen(
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
  }, [
    fullscreen,
  ]);

  /* =======================================================
     COLOR OPTIONS
     ======================================================= */

  const colorOptions =
    useMemo(
      () => {
        if (
          variants.length >
          0
        ) {
          return uniqueVariantColors(
            variants,
          );
        }

        return product.colors.map(
          (
            item,
          ) => ({
            id:
              item,

            sku:
              "",

            size:
              "",

            color:
              item,

            colorHex:
              undefined,

            stock:
              product.stock,

            price:
              product.price,
          }),
        );
      },

      [
        product.colors,
        product.price,
        product.stock,
        variants,
      ],
    );

  /* =======================================================
     SIZE OPTIONS
     ======================================================= */

  const sizes =
    useMemo(
      () => {
        const values =
          product.sizes.length >
          0
            ? product.sizes
            : [
                ...new Set(
                  variants.map(
                    (
                      variant,
                    ) =>
                      variant.size,
                  ),
                ),
              ];

        return sortProductSizes(
          values.length >
            0
            ? values
            : [
                "One Size",
              ],
        );
      },

      [
        product.sizes,
        variants,
      ],
    );

  /* =======================================================
     SELECTED VARIANT
     ======================================================= */

  const selectedVariant =
    variants.find(
      (
        variant,
      ) =>
        variant.size ===
          size &&
        variant.color ===
          color,
    );

  const selectedPrice =
    selectedVariant?.price ??
    product.price;

  const selectedStock =
    variants.length >
    0
      ? selectedVariant?.stock ??
        0
      : product.stock;



  const inStock =
    selectedStock >
    0;

  const liked =
    wishlist.includes(
      product.id,
    );


  function selectColor(
    nextColor:
      string,
  ) {
    setColor(
      nextColor,
    );

    /*
     * Start the newly selected
     * color gallery from image 1.
     *
     * This belongs in the user
     * interaction handler rather
     * than a React effect.
     */
    setActiveImageIndex(
      0,
    );

    if (
      variants.length ===
      0
    ) {
      setQuantity(
        1,
      );

      return;
    }

    const currentCombination =
      variants.find(
        (
          variant,
        ) =>
          variant.color ===
            nextColor &&
          variant.size ===
            size &&
          variant.stock >
            0,
      );

    if (
      currentCombination
    ) {
      setQuantity(
        1,
      );

      return;
    }

    const firstAvailable =
      variants.find(
        (
          variant,
        ) =>
          variant.color ===
            nextColor &&
          variant.stock >
            0,
      );

    const firstCombination =
      variants.find(
        (
          variant,
        ) =>
          variant.color ===
          nextColor,
      );

    setSize(
      firstAvailable?.size ??
        firstCombination?.size ??
        size,
    );

    setQuantity(
      1,
    );
  }

  function selectSize(
    nextSize:
      string,
  ) {
    setSize(
      nextSize,
    );

    setQuantity(
      1,
    );
  }

  function sizeAvailable(
    targetSize:
      string,
  ) {
    if (
      variants.length ===
      0
    ) {
      return (
        product.stock >
        0
      );
    }

    return variants.some(
      (
        variant,
      ) =>
        variant.color ===
          color &&
        variant.size ===
          targetSize &&
        variant.stock >
          0,
    );
  }

  function colorAvailable(
    targetColor:
      string,
  ) {
    if (
      variants.length ===
      0
    ) {
      return (
        product.stock >
        0
      );
    }

    return variants.some(
      (
        variant,
      ) =>
        variant.color ===
          targetColor &&
        variant.stock >
          0,
    );
  }

  /* =======================================================
     ADD TO CART
     ======================================================= */

  function addSelectedToCart() {
    if (
      !inStock
    ) {
      return;
    }

    for (
      let index = 0;
      index < quantity;
      index += 1
    ) {
      add(
        {
          ...product,

          price:
            selectedPrice,
        },

        size,

        color,
      );
    }
  }

  /* =======================================================
     DESCRIPTION
     ======================================================= */

  const productIntro =
    shortDescription?.trim() ||
    description?.trim() ||
    "Product information is being updated.";

  const fullProductDetails =
    description?.trim() ||
    shortDescription?.trim() ||
    "Detailed product information is being updated.";

  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <main className="product-detail-page">
      <div className="container product-detail-container">
        {/* =================================================
            BREADCRUMB
            ================================================= */}

        <nav
          className="product-detail-breadcrumb"
          aria-label="Breadcrumb"
        >
          <Link href="/">
            Home
          </Link>

          <span>
            /
          </span>

          <Link href="/shop">
            Shop
          </Link>

          <span>
            /
          </span>

          <strong>
            {
              product.name
            }
          </strong>
        </nav>

        {/* =================================================
            LAYOUT
            ================================================= */}

        <div className="product-detail-layout">
          {/* ===============================================
              GALLERY
              =============================================== */}

          <section
            className="product-detail-gallery"
            aria-label={`${product.name} gallery`}
          >
            <div className="product-gallery-stage">
              {gallery.map(
                (
                  image,
                  index,
                ) => (
                  <div
                    key={
                      image.url
                    }
                    className={`product-gallery-layer${
                      index ===
                      activeImageIndex
                        ? " is-active"
                        : ""
                    }`}
                    aria-hidden={
                      index !==
                      activeImageIndex
                    }
                  >
                    <Image
                      src={
                        image.url
                      }
                      alt={
                        image.alt ||
                        product.name
                      }
                      fill
                      priority={
                        index ===
                        0
                      }
                      sizes="(max-width: 900px) 100vw, 55vw"
                      className="product-gallery-image"
                    />
                  </div>
                ),
              )}

              <div
                key={`shade-${activeImageIndex}`}
                className="product-gallery-shade"
                aria-hidden="true"
              />

              {product.badge ? (
                <span className="product-gallery-badge">
                  {
                    product.badge
                  }
                </span>
              ) : null}

              {gallery.length >
              1 ? (
                <span className="product-gallery-counter">
                  {activeImageIndex +
                    1}
                  /
                  {
                    gallery.length
                  }
                </span>
              ) : null}

              <button
                type="button"
                className="product-gallery-zoom"
                aria-label="View product image fullscreen"
                onClick={() =>
                  setFullscreen(
                    true,
                  )
                }
              >
                <Maximize2
                  size={17}
                  strokeWidth={
                    1.65
                  }
                />
              </button>
            </div>

            {/* =============================================
                THUMBNAILS
                ============================================= */}

            {gallery.length >
            1 ? (
              <div className="product-gallery-thumbnails">
                {gallery.map(
                  (
                    image,
                    index,
                  ) => (
                    <button
                      key={
                        `${image.url}-${index}`
                      }
                      type="button"
                      aria-label={`Show image ${
                        index + 1
                      }`}
                      aria-pressed={
                        index ===
                        activeImageIndex
                      }
                      className={`product-gallery-thumbnail${
                        index ===
                        activeImageIndex
                          ? " is-active"
                          : ""
                      }`}
                      onClick={() =>
                        setActiveImageIndex(
                          index,
                        )
                      }
                    >
                      <Image
                        src={
                          image.url
                        }
                        alt=""
                        fill
                        sizes="82px"
                      />
                    </button>
                  ),
                )}
              </div>
            ) : null}

            {/* =============================================
                MOBILE PROGRESS
                ============================================= */}

            {gallery.length >
            1 ? (
              <div
                className="product-gallery-dots"
                aria-hidden="true"
              >
                {gallery.map(
                  (
                    image,
                    index,
                  ) => (
                    <span
                      key={
                        `${image.url}-dot`
                      }
                      className={
                        index ===
                        activeImageIndex
                          ? "is-active"
                          : ""
                      }
                    />
                  ),
                )}
              </div>
            ) : null}
          </section>

          {/* ===============================================
              PRODUCT INFORMATION
              =============================================== */}

          <section className="product-detail-info">
            {product.badge ? (
              <span className="product-detail-eyebrow">
                {
                  product.badge
                }
              </span>
            ) : null}

            <h1 className="product-detail-title">
              {
                product.name
              }
            </h1>


            {/* =============================================
                PRICE
                ============================================= */}

            <div className="product-detail-price-row">
              <strong className="product-detail-price">
                {formatBDT(
                  selectedPrice,
                )}
              </strong>

              {product.oldPrice &&
              selectedPrice <
                product.oldPrice ? (
                <s>
                  {formatBDT(
                    product.oldPrice,
                  )}
                </s>
              ) : null}
            </div>

            {/* =============================================
                REVIEW
                ============================================= */}

            {product.reviewCount &&
            product.reviewCount >
              0 ? (
              <div className="product-detail-rating">
                <span>
                  {"★".repeat(
                    Math.round(
                      product.rating ??
                        0,
                    ),
                  )}

                  {"☆".repeat(
                    5 -
                      Math.round(
                        product.rating ??
                          0,
                      ),
                  )}
                </span>

                <small>
                  {product.rating?.toFixed(
                    1,
                  )}{" "}
                  (
                  {
                    product.reviewCount
                  }{" "}
                  reviews)
                </small>
              </div>
            ) : null}

            <p className="product-detail-intro">
              {
                productIntro
              }
            </p>

            <div className="product-detail-divider" />

            {/* =============================================
                COLOR
                ============================================= */}

            {colorOptions.length >
            0 ? (
              <div className="product-option-block">
                <div className="product-option-heading">
                  <strong>
                    Color
                  </strong>

                  <span>
                    {
                      color
                    }
                  </span>
                </div>

                <div className="product-color-options">
                  {colorOptions.map(
                    (
                      option,
                    ) => {
                      const available =
                        colorAvailable(
                          option.color,
                        );

                      const selected =
                        option.color ===
                        color;

                      return (
                        <button
                          key={
                            option.color
                          }
                          type="button"
                          disabled={
                            !available
                          }
                          className={`product-color-option${
                            selected
                              ? " is-selected"
                              : ""
                          }`}
                          aria-label={`Select color ${option.color}`}
                          aria-pressed={
                            selected
                          }
                          onClick={() =>
                            selectColor(
                              option.color,
                            )
                          }
                        >
                          <span
                            style={{
                              background:
                                getColorSwatch(
                                  option.color,
                                  option.colorHex,
                                ),
                            }}
                          />

                          <b>
                            {
                              option.color
                            }
                          </b>
                        </button>
                      );
                    },
                  )}
                </div>
              </div>
            ) : null}

            {/* =============================================
                SIZE
                ============================================= */}

            <div className="product-option-block">
              <div className="product-option-heading">
                <strong>
                  Size
                </strong>

                <span>
                  {
                    size
                  }
                </span>
              </div>

              <div className="product-size-options">
                {sizes.map(
                  (
                    option,
                  ) => {
                    const available =
                      sizeAvailable(
                        option,
                      );

                    const selected =
                      option ===
                      size;

                    return (
                      <button
                        key={
                          option
                        }
                        type="button"
                        disabled={
                          !available
                        }
                        className={`product-size-option${
                          selected
                            ? " is-selected"
                            : ""
                        }`}
                        aria-pressed={
                          selected
                        }
                        onClick={() =>
                          selectSize(
                            option,
                          )
                        }
                      >
                        {
                          option
                        }
                      </button>
                    );
                  },
                )}
              </div>
            </div>

                        {/* =============================================
                ASSIGNED SIZE GUIDE
                ============================================= */}

            {sizeChart ? (
              <ProductSizeGuide
                chart={
                  sizeChart
                }
                selectedColor={
                  color
                }
                variants={
                  variants
                }
              />
            ) : null}
            {/* =============================================
                QUANTITY + STOCK
                ============================================= */}

            <div className="product-purchase-row">
              <div className="product-quantity">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  disabled={
                    quantity <=
                    1
                  }
                  onClick={() =>
                    setQuantity(
                      (
                        current,
                      ) =>
                        Math.max(
                          1,
                          current -
                            1,
                        ),
                    )
                  }
                >
                  <Minus
                    size={14}
                  />
                </button>

                <span>
                  {
                    quantity
                  }
                </span>

                <button
                  type="button"
                  aria-label="Increase quantity"
                  disabled={
                    !inStock ||
                    quantity >=
                      selectedStock
                  }
                  onClick={() =>
                    setQuantity(
                      (
                        current,
                      ) =>
                        Math.min(
                          selectedStock,
                          current +
                            1,
                        ),
                    )
                  }
                >
                  <Plus
                    size={14}
                  />
                </button>
              </div>

              <div
                className={`product-stock${
                  inStock
                    ? " is-in-stock"
                    : " is-out-of-stock"
                }`}
              >
                <span />

                {inStock
                  ? "In Stock"
                  : "Out of Stock"}
              </div>
            </div>

            {/* =============================================
                ACTIONS
                ============================================= */}

            <button
              type="button"
              className="product-add-cart"
              disabled={
                !inStock
              }
              onClick={
                addSelectedToCart
              }
            >
              <ShoppingCart
                size={17}
                strokeWidth={
                  1.7
                }
              />

              Add to Cart

              <strong>
                {formatBDT(
                  selectedPrice *
                    quantity,
                )}
              </strong>
            </button>

            <Link
              href="/checkout"
              className={`product-buy-now${
                !inStock
                  ? " is-disabled"
                  : ""
              }`}
              aria-disabled={
                !inStock
              }
              onClick={(
                event,
              ) => {
                if (
                  !inStock
                ) {
                  event.preventDefault();

                  return;
                }

                addSelectedToCart();
              }}
            >
              Buy Now
            </Link>

            <button
              type="button"
              className={`product-wishlist-button${
                liked
                  ? " is-liked"
                  : ""
              }`}
              onClick={() =>
                toggleWishlist(
                  product.id,
                )
              }
            >
              <Heart
                size={16}
                strokeWidth={
                  1.65
                }
                fill={
                  liked
                    ? "currentColor"
                    : "none"
                }
              />

              {liked
                ? "Saved to Wishlist"
                : "Add to Wishlist"}
            </button>

            {/* =============================================
                TRUST — NO FREE DELIVERY CLAIM
                ============================================= */}

            <div className="product-trust-grid">
              <TrustItem
                icon={
                  Truck
                }
                title="Delivery"
                text="Calculated at checkout"
              />

              <TrustItem
                icon={
                  RefreshCw
                }
                title="Exchange"
                text="Store policy applies"
              />

              <TrustItem
                icon={
                  ShieldCheck
                }
                title="Original"
                text="Quality checked"
              />
            </div>

            {/* =============================================
                PRODUCT DETAILS
                ============================================= */}

                       <section className="product-description-panel">
              <span className="product-description-eyebrow">
                Product Description
              </span>

              <h2>
                About This Product
              </h2>

              <div className="product-detail-copy">
                {
                  fullProductDetails
                }
              </div>
            </section>
          </section>
        </div>
      </div>

      {/* ===================================================
          FULLSCREEN
          =================================================== */}

      {fullscreen ? (
        <div
          className="product-fullscreen"
          role="dialog"
          aria-modal="true"
          aria-label={`${product.name} image preview`}
          onMouseDown={() =>
            setFullscreen(
              false,
            )
          }
        >
          <button
            type="button"
            className="product-fullscreen-close"
            aria-label="Close fullscreen image"
            onClick={() =>
              setFullscreen(
                false,
              )
            }
          >
            <X
              size={23}
            />
          </button>

          <div
            className="product-fullscreen-image"
            onMouseDown={(
              event,
            ) =>
              event.stopPropagation()
            }
          >
            <Image
              src={
                activeImage.url
              }
              alt={
                activeImage.alt ||
                product.name
              }
              fill
              priority
              sizes="95vw"
            />
          </div>
        </div>
      ) : null}
    </main>
  );
}


/* =========================================================
   TRUST
   ========================================================= */

function TrustItem({
  icon:
    Icon,
  title,
  text,
}: {
  icon:
    typeof Truck;

  title:
    string;

  text:
    string;
}) {
  return (
    <div className="product-trust-item">
      <Icon
        size={19}
        strokeWidth={
          1.45
        }
      />

      <div>
        <strong>
          {
            title
          }
        </strong>

        <span>
          {
            text
          }
        </span>
      </div>
    </div>
  );
}