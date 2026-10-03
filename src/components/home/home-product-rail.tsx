"use client";

import type {
  CSSProperties,
} from "react";

import {
  ProductCard,
} from "@/components/product/product-card";

import type {
  Product,
} from "@/lib/data";

/* =========================================================
   TYPES
   ========================================================= */

type Direction =
  | "right-to-left"
  | "left-to-right";

type HomeProductRailProps = {
  products:
    Product[];

  direction:
    Direction;

  label:
    string;
};

type RailStyle =
  CSSProperties & {
    "--rail-duration":
      string;
  };

/* =========================================================
   SETTINGS
   ========================================================= */

/*
 * Approximate time for one product
 * position to pass the viewport.
 *
 * With 7 products:
 *
 * 7 × 4.8s = 33.6 seconds
 * for one complete seamless cycle.
 */
const SECONDS_PER_PRODUCT =
  4.8;

const MIN_DURATION =
  24;

/* =========================================================
   PRODUCT RAIL
   ========================================================= */

export function HomeProductRail({
  products,
  direction,
  label,
}: HomeProductRailProps) {
  /* =======================================================
     EMPTY
     ======================================================= */

  if (
    products.length ===
    0
  ) {
    return (
      <p className="home-rail-empty">
        New pieces are on the
        way. Explore the shop
        for more.
      </p>
    );
  }

  /* =======================================================
     ONE PRODUCT
     ======================================================= */

  const staticRail =
    products.length ===
    1;

  /* =======================================================
     SPEED
     ======================================================= */

  const duration =
    Math.max(
      MIN_DURATION,

      products.length *
        SECONDS_PER_PRODUCT,
    );

  const railStyle:
    RailStyle = {
      "--rail-duration":
        `${duration}s`,
    };

  /* =======================================================
     DIRECTION
     ======================================================= */

  const directionClass =
    direction ===
    "right-to-left"
      ? "is-right-to-left"
      : "is-left-to-right";

  const className = [
    "home-product-rail",

    directionClass,

    staticRail
      ? "is-static"
      : "",
  ]
    .filter(
      Boolean,
    )
    .join(
      " ",
    );

  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <div
      className={
        className
      }
      style={
        railStyle
      }
    >
      <div
        className="home-rail-viewport"
        role="region"
        aria-label={`${label} product carousel`}
        aria-live="off"
      >
        <div className="home-rail-track">
          {/* ===============================================
              ORIGINAL PRODUCT GROUP
              =============================================== */}

          <div className="home-rail-group">
            {products.map(
              (
                product,
                index,
              ) => (
                <div
                  key={`primary-${index}-${product.id}`}
                  className="home-rail-item"
                >
                  <ProductCard
                    product={
                      product
                    }
                  />
                </div>
              ),
            )}
          </div>

          {/* ===============================================
              DUPLICATE GROUP

              An exact copy makes the end of the first
              sequence identical to the beginning of
              the next sequence.

              That is what creates the seamless loop.
              =============================================== */}

          {!staticRail ? (
            <div className="home-rail-group">
              {products.map(
                (
                  product,
                  index,
                ) => (
                  <div
                    key={`duplicate-${index}-${product.id}`}
                    className="home-rail-item"
                  >
                    <ProductCard
                      product={
                        product
                      }
                    />
                  </div>
                ),
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}