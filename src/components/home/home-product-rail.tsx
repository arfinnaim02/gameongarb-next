"use client";

import type {
  CSSProperties,
} from "react";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ProductCard,
} from "@/components/product/product-card";

import type {
  Product,
} from "@/lib/data";

type Direction =
  | "right-to-left"
  | "left-to-right";

type HomeProductRailProps = {
  products: Product[];
  direction: Direction;
  label: string;
};

type RailMetrics = {
  key: string;
  distance: number;
  duration: number;
  productStepMs: number;
};

type RailStyle =
  CSSProperties & {
    "--rail-distance-negative":
      string;

    "--rail-duration":
      string;
  };

/*
 * Slow continuous premium motion.
 *
 * 22px/sec gives visible movement
 * without feeling like a ticker.
 */
const RAIL_SPEED =
  22;

const MIN_DURATION_SECONDS =
  32;

/*
 * Three identical copies guarantee
 * seamless movement even if only a
 * few real products are available.
 */
const LOOP_COPIES =
  3;

/* =========================================================
   HELPERS
   ========================================================= */

function positiveModulo(
  value: number,
  modulo: number,
) {
  if (!modulo) {
    return 0;
  }

  return (
    ((value % modulo) +
      modulo) %
    modulo
  );
}

/* =========================================================
   PRODUCT RAIL
   ========================================================= */

export function HomeProductRail({
  products,
  direction,
  label,
}: HomeProductRailProps) {
  const viewportRef =
    useRef<HTMLDivElement>(
      null,
    );

  const trackRef =
    useRef<HTMLDivElement>(
      null,
    );

  const resizeFrameRef =
    useRef<number | null>(
      null,
    );

  const [
    metrics,
    setMetrics,
  ] =
    useState<RailMetrics | null>(
      null,
    );

  const [
    activeIndex,
    setActiveIndex,
  ] = useState(0);

  const productKey =
    products
      .map(
        (product) =>
          product.id,
      )
      .join("|");

  const measurementKey =
    `${productKey}:${products.length}`;

  /* =======================================================
     DUPLICATED LOOP CONTENT
     ======================================================= */

  const loopProducts =
    useMemo(() => {
      if (
        products.length <= 1
      ) {
        return products.map(
          (
            product,
            index,
          ) => ({
            product,
            copy: 0,
            index,

            key:
              `0-${index}-${product.id}`,
          }),
        );
      }

      return Array.from(
        {
          length:
            LOOP_COPIES,
        },
        (
          _,
          copy,
        ) =>
          products.map(
            (
              product,
              index,
            ) => ({
              product,
              copy,
              index,

              key:
                `${copy}-${index}-${product.id}`,
            }),
          ),
      ).flat();
    }, [
      products,
    ]);

  /* =======================================================
     EXACT LOOP MEASUREMENT
     ======================================================= */

  useEffect(() => {
    const viewport =
      viewportRef.current;

    const track =
      trackRef.current;

    if (
      !viewport ||
      !track
    ) {
      return;
    }

    const measure =
      () => {
        if (
          products.length <= 1
        ) {
          setMetrics({
            key:
              measurementKey,

            distance:
              0,

            duration:
              MIN_DURATION_SECONDS,

            productStepMs:
              MIN_DURATION_SECONDS *
              1000,
          });

          return;
        }

        const firstItem =
          track.querySelector<HTMLElement>(
            '[data-rail-copy="0"][data-rail-index="0"]',
          );

        const secondCopy =
          track.querySelector<HTMLElement>(
            '[data-rail-copy="1"][data-rail-index="0"]',
          );

        if (
          !firstItem ||
          !secondCopy
        ) {
          return;
        }

        /*
         * Exact distance between the
         * first item in copy 1 and the
         * first item in copy 2.
         *
         * offsetLeft is not affected by
         * transform animations.
         */
        const distance =
          secondCopy.offsetLeft -
          firstItem.offsetLeft;

        if (
          !Number.isFinite(
            distance,
          ) ||
          distance <= 0
        ) {
          return;
        }

        const duration =
          Math.max(
            MIN_DURATION_SECONDS,

            distance /
              RAIL_SPEED,
          );

        const productStepMs =
          Math.max(
            2500,

            (duration /
              products.length) *
              1000,
          );

        setMetrics(
          (current) => {
            /*
             * Avoid unnecessary React
             * rerenders when ResizeObserver
             * reports the same dimensions.
             */
            if (
              current?.key ===
                measurementKey &&
              Math.abs(
                current.distance -
                  distance,
              ) < 0.5 &&
              Math.abs(
                current.duration -
                  duration,
              ) < 0.05
            ) {
              return current;
            }

            return {
              key:
                measurementKey,

              distance,

              duration,

              productStepMs,
            };
          },
        );
      };

    const scheduleMeasure =
      () => {
        if (
          resizeFrameRef.current !==
          null
        ) {
          window.cancelAnimationFrame(
            resizeFrameRef.current,
          );
        }

        resizeFrameRef.current =
          window.requestAnimationFrame(
            () => {
              resizeFrameRef.current =
                null;

              measure();
            },
          );
      };

    const resizeObserver =
      new ResizeObserver(
        scheduleMeasure,
      );

    resizeObserver.observe(
      viewport,
    );

    scheduleMeasure();

    return () => {
      resizeObserver.disconnect();

      if (
        resizeFrameRef.current !==
        null
      ) {
        window.cancelAnimationFrame(
          resizeFrameRef.current,
        );

        resizeFrameRef.current =
          null;
      }
    };
  }, [
    measurementKey,
    products.length,
  ]);

  /* =======================================================
     READY
     ======================================================= */

  const ready =
    products.length > 1 &&
    metrics?.key ===
      measurementKey &&
    metrics.distance > 0;

  /* =======================================================
     POSITION DOT
     ======================================================= */

  useEffect(() => {
    if (
      !ready ||
      !metrics ||
      products.length <= 1
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

    const change =
      direction ===
      "right-to-left"
        ? 1
        : -1;

    const timer =
      window.setInterval(
        () => {
          if (
            document.hidden
          ) {
            return;
          }

          setActiveIndex(
            (current) =>
              positiveModulo(
                current +
                  change,

                products.length,
              ),
          );
        },

        metrics.productStepMs,
      );

    return () => {
      window.clearInterval(
        timer,
      );
    };
  }, [
    direction,
    metrics,
    products.length,
    ready,
  ]);

  /* =======================================================
     EMPTY
     ======================================================= */

  if (
    products.length === 0
  ) {
    return (
      <p className="home-rail-empty">
        New pieces are on the
        way. Explore the shop
        for more.
      </p>
    );
  }

  const directionClass =
    direction ===
    "right-to-left"
      ? "is-right-to-left"
      : "is-left-to-right";

  const trackClassName = [
    "home-rail-track",

    directionClass,

    ready
      ? "is-ready"
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  /*
   * IMPORTANT:
   *
   * Unlike the current implementation,
   * these values come directly from
   * React state.
   *
   * React therefore cannot overwrite
   * the measured distance back to 0px.
   */
  const trackStyle:
    RailStyle = {
      "--rail-distance-negative":
        ready && metrics
          ? `${-metrics.distance}px`
          : "0px",

      "--rail-duration":
        ready && metrics
          ? `${metrics.duration}s`
          : `${MIN_DURATION_SECONDS}s`,
    };

  const displayedIndex =
    positiveModulo(
      activeIndex,
      products.length,
    );

  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <div className="home-product-rail">
      <div
        ref={viewportRef}
        className="home-rail-viewport"
        role="region"
        aria-label={`${label} products`}
        aria-live="off"
      >
        <div
          ref={trackRef}
          className={
            trackClassName
          }
          style={
            trackStyle
          }
        >
          {loopProducts.map(
            ({
              product,
              copy,
              index,
              key,
            }) => (
              <div
                key={key}
                className="home-rail-item"
                data-rail-copy={
                  copy
                }
                data-rail-index={
                  index
                }
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
      </div>

      {products.length >
      1 ? (
        <div
          className="home-rail-dots"
          aria-hidden="true"
        >
          {products.map(
            (
              product,
              index,
            ) => (
              <span
                key={
                  product.id
                }
                className={`home-rail-dot${
                  index ===
                  displayedIndex
                    ? " is-active"
                    : ""
                }`}
              />
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}