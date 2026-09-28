"use client";

import Image from "next/image";
import Link from "next/link";

import {
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  X,
} from "lucide-react";

import {
  useEffect,
} from "react";

import {
  cartKey,
  useStore,
} from "@/components/shared/store-provider";

import {
  formatBDT,
} from "@/lib/money";

type CartDrawerProps = {
  open: boolean;
  onClose: () => void;
};

export function CartDrawer({
  open,
  onClose,
}: CartDrawerProps) {
  const {
    cart,
    cartCount,
    remove,
    setQuantity,
  } = useStore();

  const subtotal =
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

  /*
   * Shipping and coupon discounts
   * are finalized on the actual
   * checkout page.
   */
  const estimatedTotal =
    subtotal;

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    function handleKeyDown(
      event: KeyboardEvent,
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
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [
    open,
    onClose,
  ]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="cart-drawer-overlay"
      role="presentation"
      onMouseDown={
        onClose
      }
    >
        <aside
        id="gog-cart-drawer"
        className="cart-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-title"
        onMouseDown={(
          event,
        ) =>
          event.stopPropagation()
        }
      >
        {/* =========================
            HEADER
        ========================= */}

        <header className="cart-drawer-header">
          <div className="cart-drawer-header-copy">
            <span className="cart-drawer-eyebrow">
              Game On Garb
            </span>

            <div className="cart-drawer-title-row">
              <h2 id="cart-drawer-title">
                Your Cart
              </h2>

              {cartCount >
              0 ? (
                <span className="cart-drawer-title-count">
                  {
                    cartCount
                  }
                </span>
              ) : null}
            </div>
          </div>

          <button
            type="button"
            className="cart-drawer-close"
            aria-label="Close cart"
            onClick={
              onClose
            }
          >
            <X
              size={20}
              strokeWidth={
                1.7
              }
            />
          </button>
        </header>

        {/* =========================
            BODY
        ========================= */}

        {cart.length >
        0 ? (
          <>
            <div className="cart-drawer-body">
              <div className="cart-drawer-section-heading">
                <span>
                  Products
                </span>

                <strong>
                  {cartCount}{" "}
                  {cartCount ===
                  1
                    ? "item"
                    : "items"}
                </strong>
              </div>

              <div className="cart-drawer-items">
                {cart.map(
                  (
                    line,
                  ) => {
                    const key =
                      cartKey(
                        line
                          .product
                          .id,
                        line.size,
                        line.color,
                      );

                    const lineTotal =
                      line.product
                        .price *
                      line.quantity;

                    return (
                      <article
                        key={
                          key
                        }
                        className="cart-drawer-item"
                      >
                        <Link
                          href={`/product/${line.product.slug}`}
                          className="cart-drawer-image"
                          onClick={
                            onClose
                          }
                        >
                          <Image
                            src={
                              line
                                .product
                                .image
                            }
                            alt={
                              line
                                .product
                                .alt
                            }
                            fill
                            sizes="(max-width: 700px) 92px, 105px"
                          />
                        </Link>

                        <div className="cart-drawer-item-content">
                          <div className="cart-drawer-item-header">
                            <div className="cart-drawer-product-copy">
                              <Link
                                href={`/product/${line.product.slug}`}
                                className="cart-drawer-item-name"
                                onClick={
                                  onClose
                                }
                              >
                                {
                                  line
                                    .product
                                    .name
                                }
                              </Link>

                              <span className="cart-drawer-variant">
                                {line.color ? (
                                  <>
                                    Color:{" "}
                                    <b>
                                      {
                                        line.color
                                      }
                                    </b>
                                  </>
                                ) : null}

                                {line.color &&
                                line.size
                                  ? " · "
                                  : ""}

                                {line.size ? (
                                  <>
                                    Size:{" "}
                                    <b>
                                      {
                                        line.size
                                      }
                                    </b>
                                  </>
                                ) : null}
                              </span>

                              <span className="cart-drawer-unit-price">
                                {formatBDT(
                                  line
                                    .product
                                    .price,
                                )}{" "}
                                each
                              </span>
                            </div>

                            <button
                              type="button"
                              className="cart-drawer-remove"
                              aria-label={`Remove ${line.product.name}`}
                              onClick={() =>
                                remove(
                                  key,
                                )
                              }
                            >
                              <Trash2
                                size={
                                  15
                                }
                                strokeWidth={
                                  1.6
                                }
                              />
                            </button>
                          </div>

                          <div className="cart-drawer-item-footer">
                            <div className="cart-drawer-quantity">
                              <button
                                type="button"
                                aria-label="Decrease quantity"
                                onClick={() =>
                                  setQuantity(
                                    key,
                                    line.quantity -
                                      1,
                                  )
                                }
                              >
                                <Minus
                                  size={
                                    13
                                  }
                                  strokeWidth={
                                    1.7
                                  }
                                />
                              </button>

                              <span>
                                {
                                  line.quantity
                                }
                              </span>

                              <button
                                type="button"
                                aria-label="Increase quantity"
                                onClick={() =>
                                  setQuantity(
                                    key,
                                    line.quantity +
                                      1,
                                  )
                                }
                              >
                                <Plus
                                  size={
                                    13
                                  }
                                  strokeWidth={
                                    1.7
                                  }
                                />
                              </button>
                            </div>

                            <strong className="cart-drawer-line-total">
                              {formatBDT(
                                lineTotal,
                              )}
                            </strong>
                          </div>
                        </div>
                      </article>
                    );
                  },
                )}
              </div>
            </div>

            {/* =========================
                CHECKOUT SUMMARY
            ========================= */}

            <footer className="cart-drawer-footer">
              <div className="cart-drawer-summary-heading">
                Order Summary
              </div>

              <div className="cart-drawer-summary-row">
                <span>
                  Subtotal
                </span>

                <strong>
                  {formatBDT(
                    subtotal,
                  )}
                </strong>
              </div>

              <div className="cart-drawer-summary-row">
                <span>
                  Delivery
                </span>

                <small>
                  Calculated at
                  checkout
                </small>
              </div>

              <div className="cart-drawer-summary-divider" />

              <div className="cart-drawer-total">
                <div>
                  <span>
                    Estimated Total
                  </span>

                  <small>
                    Before delivery
                  </small>
                </div>

                <strong>
                  {formatBDT(
                    estimatedTotal,
                  )}
                </strong>
              </div>

              <Link
                href="/checkout"
                className="cart-drawer-checkout"
                onClick={
                  onClose
                }
              >
                <span>
                  Checkout
                </span>

                <span className="cart-drawer-checkout-price">
                  {formatBDT(
                    estimatedTotal,
                  )}

                  <b
                    aria-hidden="true"
                  >
                    →
                  </b>
                </span>
              </Link>

              <Link
                href="/cart"
                className="cart-drawer-view-cart"
                onClick={
                  onClose
                }
              >
                View Full Cart
              </Link>

              <p className="cart-drawer-footer-note">
                Coupons and final
                delivery charges
                are applied during
                checkout.
              </p>
            </footer>
          </>
        ) : (
          <div className="cart-drawer-empty">
            <span className="cart-drawer-empty-icon">
              <ShoppingBag
                size={29}
                strokeWidth={
                  1.35
                }
              />
            </span>

            <span className="cart-drawer-empty-eyebrow">
              Your Bag
            </span>

            <h3>
              Your cart is empty
            </h3>

            <p>
              Discover Game On
              Garb and add your
              favourite pieces.
            </p>

            <Link
              href="/shop"
              className="cart-drawer-checkout"
              onClick={
                onClose
              }
            >
              <span>
                Continue Shopping
              </span>

              <b
                aria-hidden="true"
              >
                →
              </b>
            </Link>
          </div>
        )}
      </aside>
    </div>
  );
}