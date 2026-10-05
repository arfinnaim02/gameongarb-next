"use client";

import Image from "next/image";
import Link from "next/link";

import {
  ArrowRight,
  Check,
  Heart,
  Loader2,
  Minus,
  PackageCheck,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  Truck,
  X,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  HomeProductRail,
} from "@/components/home/home-product-rail";

import {
  cartKey,
  useStore,
} from "@/components/shared/store-provider";

import type {
  Product,
} from "@/lib/data";

import {
  formatBDT,
} from "@/lib/money";

import styles from "./cart-client.module.css";

/* =========================================================
   TYPES
   ========================================================= */

type CartClientProps = {
  recommended:
    Product[];
};

type PublicSettings = {
  insideDhaka:
    number;

  outsideDhaka:
    number;

  codEnabled:
    boolean;

  bkashEnabled:
    boolean;
};

/* =========================================================
   HELPERS
   ========================================================= */

function selectedImage(
  product:
    Product,

  color:
    string,
) {
  if (
    product.images.length ===
    0
  ) {
    return {
      url:
        product.image,

      alt:
        product.alt,
    };
  }

  const cleanColor =
    color
      .trim()
      .toLowerCase();

  const exact =
    product.images.find(
      (
        image,
      ) =>
        image.color
          ?.trim()
          .toLowerCase() ===
        cleanColor,
    );

  if (
    exact
  ) {
    return exact;
  }

  const generic =
    product.images.find(
      (
        image,
      ) =>
        !image.color?.trim(),
    );

  return (
    generic ??
    product.images[0] ?? {
      url:
        product.image,

      alt:
        product.alt,
    }
  );
}

function variantStock(
  product:
    Product,

  size:
    string,

  color:
    string,
) {
  const variants =
    product.variants ??
    [];

  if (
    variants.length ===
    0
  ) {
    return product.stock;
  }

  return (
    variants.find(
      (
        variant,
      ) =>
        variant.size ===
          size &&
        variant.color ===
          color,
    )?.stock ??
    0
  );
}

/* =========================================================
   CART
   ========================================================= */

export function CartClient({
  recommended,
}: CartClientProps) {
  const {
    cart,
    wishlist,
    ready,
    remove,
    setQuantity,
    toggleWishlist,
    clear,
  } =
    useStore();

  const [
    settings,
    setSettings,
  ] =
    useState<
      PublicSettings | null
    >(
      null,
    );

  /* =======================================================
     SHIPPING SETTINGS
     ======================================================= */

  useEffect(() => {
    let cancelled =
      false;

    fetch(
      "/api/settings/public",
      {
        cache:
          "no-store",
      },
    )
      .then(
        async (
          response,
        ) => {
          if (
            !response.ok
          ) {
            throw new Error();
          }

          return response.json();
        },
      )
      .then(
        (
          result:
            PublicSettings,
        ) => {
          if (
            !cancelled
          ) {
            setSettings(
              result,
            );
          }
        },
      )
      .catch(
        () => {
          if (
            !cancelled
          ) {
            setSettings({
              insideDhaka:
                80,

              outsideDhaka:
                150,

              codEnabled:
                true,

              bkashEnabled:
                true,
            });
          }
        },
      );

    return () => {
      cancelled =
        true;
    };
  }, []);

  /* =======================================================
     TOTALS
     ======================================================= */

  const subtotal =
    useMemo(
      () =>
        cart.reduce(
          (
            total,
            line,
          ) =>
            total +
            line.product
              .price *
              line.quantity,

          0,
        ),

      [
        cart,
      ],
    );

  const totalQuantity =
    useMemo(
      () =>
        cart.reduce(
          (
            total,
            line,
          ) =>
            total +
            line.quantity,

          0,
        ),

      [
        cart,
      ],
    );

  const hasUnavailableItem =
    useMemo(
      () =>
        cart.some(
          (
            line,
          ) =>
            variantStock(
              line.product,
              line.size,
              line.color,
            ) <
            1,
        ),

      [
        cart,
      ],
    );

  /* =======================================================
     ACTIONS
     ======================================================= */

  function clearCart() {
    if (
      !window.confirm(
        "Remove all products from your cart?",
      )
    ) {
      return;
    }

    clear();
  }

  function saveForLater(
    product:
      Product,

    key:
      string,
  ) {
    if (
      !wishlist.includes(
        product.id,
      )
    ) {
      toggleWishlist(
        product.id,
      );
    }

    remove(
      key,
    );
  }

  /* =======================================================
     LOADING
     ======================================================= */

  if (
    !ready
  ) {
    return (
      <main className={styles.page}>
        <div className={`container ${styles.container}`}>
          <div className={styles.loadingHeader}>
            <div />

            <div />
          </div>

          <div className={styles.loadingLayout}>
            <div className={styles.loadingProducts}>
              {Array.from({
                length:
                  3,
              }).map(
                (
                  _,
                  index,
                ) => (
                  <div
                    key={
                      index
                    }
                    className={styles.loadingItem}
                  />
                ),
              )}
            </div>

            <div className={styles.loadingSummary}>
              <Loader2
                size={22}
                className={styles.spin}
              />

              Loading your cart...
            </div>
          </div>
        </div>
      </main>
    );
  }

  /* =======================================================
     EMPTY CART
     ======================================================= */

  if (
    cart.length ===
    0
  ) {
    return (
      <main className={styles.page}>
        <div className={`container ${styles.emptyContainer}`}>
          <section className={styles.empty}>
            <span className={styles.emptyIcon}>
              <ShoppingBag
                size={31}
                strokeWidth={
                  1.35
                }
              />
            </span>

            <span className={styles.eyebrow}>
              Your Bag
            </span>

            <h1>
              Your Cart Is Empty
            </h1>

            <p>
              Add something you
              love and come back
              here when you are
              ready to order.
            </p>

            <Link
              href="/shop"
              className={styles.emptyAction}
            >
              Explore Products

              <ArrowRight
                size={15}
              />
            </Link>
          </section>

          {recommended.length >
          0 ? (
            <section className={styles.recommended}>
              <div className={styles.sectionHeading}>
                <div>
                  <span>
                    You May Like
                  </span>

                  <h2>
                    Trending Now
                  </h2>
                </div>

                <Link href="/shop">
                  View All
                  {" "}
                  ↗
                </Link>
              </div>

              <HomeProductRail
                products={
                  recommended
                }
                direction="right-to-left"
                label="Recommended products"
              />
            </section>
          ) : null}
        </div>
      </main>
    );
  }

  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <main className={styles.page}>
      <div className={`container ${styles.container}`}>
        {/* =================================================
            PAGE HEADER
            ================================================= */}

        <header className={styles.header}>
          <div>
            <span className={styles.eyebrow}>
              Shopping Bag
            </span>

            <h1>
              Your Cart
            </h1>

            <p>
              {totalQuantity}
              {" "}
              {totalQuantity ===
              1
                ? "item"
                : "items"}
              {" "}
              ready for checkout.
            </p>
          </div>

          <button
            type="button"
            className={styles.clearCart}
            onClick={
              clearCart
            }
          >
            <Trash2
              size={13}
            />

            Clear Cart
          </button>
        </header>

        {/* =================================================
            CART LAYOUT
            ================================================= */}

        <div className={styles.layout}>
          {/* ===============================================
              ITEMS
              =============================================== */}

          <section className={styles.itemsSection}>
            <div className={styles.itemsHeading}>
              <span>
                Products
              </span>

              <strong>
                {cart.length}
                {" "}
                {cart.length ===
                1
                  ? "line"
                  : "lines"}
              </strong>
            </div>

            <div className={styles.items}>
              {cart.map(
                (
                  line,
                ) => {
                  const key =
                    cartKey(
                      line.product
                        .id,
                      line.size,
                      line.color,
                    );

                  const stock =
                    variantStock(
                      line.product,
                      line.size,
                      line.color,
                    );

                  const inStock =
                    stock >
                    0;

                  const image =
                    selectedImage(
                      line.product,
                      line.color,
                    );

                  const lineTotal =
                    line.product
                      .price *
                    line.quantity;

                  const saved =
                    wishlist.includes(
                      line.product
                        .id,
                    );

                  return (
                    <article
                      key={
                        key
                      }
                      className={`${styles.item} ${
                        !inStock
                          ? styles.itemUnavailable
                          : ""
                      }`}
                    >
                      {/* ===================================
                          IMAGE
                          =================================== */}

                      <Link
                        href={`/product/${line.product.slug}`}
                        className={styles.image}
                      >
                        <Image
                          src={
                            image.url
                          }
                          alt={
                            image.alt ||
                            line.product
                              .name
                          }
                          fill
                          sizes="(max-width: 700px) 90px, 120px"
                        />
                      </Link>

                      {/* ===================================
                          PRODUCT INFORMATION
                          =================================== */}

                      <div className={styles.itemContent}>
                        <div className={styles.productTop}>
                          <div>
                            <span className={styles.category}>
                              {
                                line.product
                                  .category
                              }
                            </span>

                            <Link
                              href={`/product/${line.product.slug}`}
                              className={styles.productName}
                            >
                              {
                                line.product
                                  .name
                              }
                            </Link>
                          </div>

                          <button
                            type="button"
                            className={styles.removeIcon}
                            aria-label={`Remove ${line.product.name}`}
                            title="Remove product"
                            onClick={() =>
                              remove(
                                key,
                              )
                            }
                          >
                            <X
                              size={15}
                            />
                          </button>
                        </div>

                        {/* =================================
                            VARIANT
                            ================================= */}

                        <div className={styles.variantRow}>
                          {line.color ? (
                            <span>
                              Colour

                              <strong>
                                {
                                  line.color
                                }
                              </strong>
                            </span>
                          ) : null}

                          {line.size ? (
                            <span>
                              Size

                              <strong>
                                {
                                  line.size
                                }
                              </strong>
                            </span>
                          ) : null}
                        </div>

                        {/* =================================
                            STOCK
                            ================================= */}

                        <div
                          className={`${styles.stock} ${
                            inStock
                              ? styles.stockIn
                              : styles.stockOut
                          }`}
                        >
                          <span />

                          {inStock
                            ? "In Stock"
                            : "Out of Stock"}
                        </div>

                        {/* =================================
                            FOOTER
                            ================================= */}

                        <div className={styles.itemFooter}>
                          <div className={styles.itemActions}>
                            <button
                              type="button"
                              className={styles.saveButton}
                              onClick={() =>
                                saveForLater(
                                  line.product,
                                  key,
                                )
                              }
                            >
                              <Heart
                                size={13}
                                fill={
                                  saved
                                    ? "currentColor"
                                    : "none"
                                }
                              />

                              {saved
                                ? "Move to Wishlist"
                                : "Save for Later"}
                            </button>

                            <button
                              type="button"
                              className={styles.removeText}
                              onClick={() =>
                                remove(
                                  key,
                                )
                              }
                            >
                              <Trash2
                                size={12}
                              />

                              Remove
                            </button>
                          </div>

                          <div className={styles.mobilePrice}>
                            {formatBDT(
                              lineTotal,
                            )}
                          </div>
                        </div>
                      </div>

                      {/* ===================================
                          PRICE / QUANTITY
                          =================================== */}

                      <div className={styles.itemRight}>
                        <div className={styles.unitPrice}>
                          {formatBDT(
                            line.product
                              .price,
                          )}

                          <small>
                            each
                          </small>
                        </div>

                        <div className={styles.quantity}>
                          <button
                            type="button"
                            aria-label={`Decrease quantity for ${line.product.name}`}
                            disabled={
                              line.quantity <=
                              1 ||
                              !inStock
                            }
                            onClick={() =>
                              setQuantity(
                                key,
                                line.quantity -
                                  1,
                              )
                            }
                          >
                            <Minus
                              size={13}
                            />
                          </button>

                          <span>
                            {
                              line.quantity
                            }
                          </span>

                          <button
                            type="button"
                            aria-label={`Increase quantity for ${line.product.name}`}
                            disabled={
                              !inStock ||
                              line.quantity >=
                                stock
                            }
                            onClick={() =>
                              setQuantity(
                                key,
                                line.quantity +
                                  1,
                              )
                            }
                          >
                            <Plus
                              size={13}
                            />
                          </button>
                        </div>

                        <strong className={styles.lineTotal}>
                          {formatBDT(
                            lineTotal,
                          )}
                        </strong>
                      </div>
                    </article>
                  );
                },
              )}
            </div>
          </section>

          {/* ===============================================
              ORDER SUMMARY
              =============================================== */}

          <aside className={styles.summary}>
            <div className={styles.summaryHeader}>
              <div>
                <span>
                  Checkout
                </span>

                <h2>
                  Order Summary
                </h2>
              </div>

              <ShoppingBag
                size={18}
              />
            </div>

            <div className={styles.summaryBody}>
              <div className={styles.summaryRow}>
                <span>
                  Subtotal
                </span>

                <strong>
                  {formatBDT(
                    subtotal,
                  )}
                </strong>
              </div>

              <div className={styles.summaryRow}>
                <span>
                  Items
                </span>

                <strong>
                  {
                    totalQuantity
                  }
                </strong>
              </div>

              <div className={styles.deliveryCard}>
                <div className={styles.deliveryIcon}>
                  <Truck
                    size={17}
                  />
                </div>

                <div>
                  <strong>
                    Delivery Charge
                  </strong>

                  {settings ? (
                    <span>
                      Inside Dhaka{" "}
                      <b>
                        {formatBDT(
                          settings.insideDhaka,
                        )}
                      </b>
                      {" · "}
                      Outside Dhaka{" "}
                      <b>
                        {formatBDT(
                          settings.outsideDhaka,
                        )}
                      </b>
                    </span>
                  ) : (
                    <span>
                      Loading delivery
                      rates...
                    </span>
                  )}
                </div>
              </div>

              <div className={styles.summaryDivider} />

              <div className={styles.total}>
                <div>
                  <span>
                    Estimated Total
                  </span>

                  <small>
                    Delivery added
                    at checkout
                  </small>
                </div>

                <strong>
                  {formatBDT(
                    subtotal,
                  )}
                </strong>
              </div>

              {hasUnavailableItem ? (
                <div className={styles.stockWarning}>
                  One or more
                  selected variants
                  are unavailable.
                  Remove them before
                  checkout.
                </div>
              ) : null}

              {hasUnavailableItem ? (
                <button
                  type="button"
                  className={styles.checkoutDisabled}
                  disabled
                >
                  Checkout Unavailable
                </button>
              ) : (
                <Link
                  href="/checkout"
                  className={styles.checkout}
                >
                  <span>
                    Proceed to Checkout
                  </span>

                  <ArrowRight
                    size={16}
                  />
                </Link>
              )}

              <Link
                href="/shop"
                className={styles.continueShopping}
              >
                Continue Shopping
              </Link>

              <div className={styles.trust}>
                <div>
                  <ShieldCheck
                    size={14}
                  />

                  Secure checkout
                </div>

                <div>
                  <PackageCheck
                    size={14}
                  />

                  Stock verified
                  before order
                </div>

                <div>
                  <Check
                    size={14}
                  />

                  COD / bKash
                  according to store
                  settings
                </div>
              </div>
            </div>
          </aside>
        </div>

        {/* =================================================
            RECOMMENDED
            ================================================= */}

        {recommended.length >
        0 ? (
          <section className={styles.recommended}>
            <div className={styles.sectionHeading}>
              <div>
                <span>
                  Complete Your Look
                </span>

                <h2>
                  You May Also Like
                </h2>
              </div>

              <Link href="/shop">
                View All
                {" "}
                ↗
              </Link>
            </div>

            <HomeProductRail
              products={
                recommended
              }
              direction="right-to-left"
              label="Recommended products"
            />
          </section>
        ) : null}
      </div>

      {/* ===================================================
          MOBILE CHECKOUT BAR
          =================================================== */}

      {!hasUnavailableItem ? (
        <div className={styles.mobileCheckout}>
          <div>
            <span>
              Subtotal
            </span>

            <strong>
              {formatBDT(
                subtotal,
              )}
            </strong>
          </div>

          <Link href="/checkout">
            Checkout

            <ArrowRight
              size={14}
            />
          </Link>
        </div>
      ) : null}
    </main>
  );
}