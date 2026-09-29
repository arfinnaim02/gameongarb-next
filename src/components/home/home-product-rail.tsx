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

/*
 * Pixels travelled per second.
 *
 * 22 gives a slow premium motion.
 * This is intentionally much slower
 * than a normal carousel.
 */
const RAIL_SPEED =
  22;

/*
 * Never make a very short rail
 * race across the screen.
 */
const MIN_DURATION_SECONDS =
  36;

/*
 * Three copies are enough to keep
 * the viewport filled even when
 * only 2–3 real products exist.
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
    ready,
    setReady,
  ] = useState(false);

  const [
    visible,
    setVisible,
  ] = useState(true);

  const [
    interactionPaused,
    setInteractionPaused,
  ] = useState(false);

  const [
    activeIndex,
    setActiveIndex,
  ] = useState(0);

  const [
    productStepMs,
    setProductStepMs,
  ] = useState(
    MIN_DURATION_SECONDS *
      1000,
  );

  const productKey =
    products
      .map(
        (product) =>
          product.id,
      )
      .join("|");

  /* =======================================================
     LOOP CONTENT
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
     MEASURE EXACT LOOP DISTANCE
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

    setReady(false);

    const measure =
      () => {
        if (
          products.length <= 1
        ) {
          track.style.removeProperty(
            "--rail-distance",
          );

          track.style.removeProperty(
            "--rail-distance-negative",
          );

          track.style.removeProperty(
            "--rail-duration",
          );

          setActiveIndex(0);

          setReady(true);

          return;
        }

        const firstItem =
          track.querySelector<HTMLElement>(
            '[data-rail-copy="0"][data-rail-index="0"]',
          );

        const secondSetFirstItem =
          track.querySelector<HTMLElement>(
            '[data-rail-copy="1"][data-rail-index="0"]',
          );

        if (
          !firstItem ||
          !secondSetFirstItem
        ) {
          return;
        }

        /*
         * offsetLeft is layout based,
         * therefore it is unaffected by
         * the animation transform.
         */
        const distance =
          secondSetFirstItem.offsetLeft -
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

        /*
         * Store both positive and
         * negative values so CSS does
         * not need experimental
         * multiplication inside calc().
         */
        track.style.setProperty(
          "--rail-distance",
          `${distance}px`,
        );

        track.style.setProperty(
          "--rail-distance-negative",
          `${-distance}px`,
        );

        track.style.setProperty(
          "--rail-duration",
          `${duration}s`,
        );

        /*
         * Approximate one-dot update
         * per product passing.
         */
        const oneProductMs =
          Math.max(
            2500,
            (duration /
              products.length) *
              1000,
          );

        setProductStepMs(
          oneProductMs,
        );

        setReady(true);
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
    productKey,
    products.length,
  ]);

  /* =======================================================
     PERFORMANCE — PAUSE OFFSCREEN
     ======================================================= */

  useEffect(() => {
    const viewport =
      viewportRef.current;

    if (!viewport) {
      return;
    }

    const observer =
      new IntersectionObserver(
        ([entry]) => {
          /*
           * Initial state is true.
           * Therefore an unavailable
           * observer can never leave
           * the rail permanently frozen.
           */
          setVisible(
            entry.isIntersecting,
          );
        },
        {
          threshold: 0,

          rootMargin:
            "120px 0px 120px 0px",
        },
      );

    observer.observe(
      viewport,
    );

    return () => {
      observer.disconnect();
    };
  }, []);

  /* =======================================================
     DOT POSITION
     ======================================================= */

  useEffect(() => {
    setActiveIndex(0);

    if (
      !ready ||
      !visible ||
      interactionPaused ||
      products.length <= 1
    ) {
      return;
    }

    const media =
      window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      );

    if (media.matches) {
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
        productStepMs,
      );

    return () => {
      window.clearInterval(
        timer,
      );
    };
  }, [
    direction,
    interactionPaused,
    productKey,
    productStepMs,
    products.length,
    ready,
    visible,
  ]);

  /* =======================================================
     EMPTY STATE
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

  const paused =
    !visible ||
    interactionPaused;

  const directionClass =
    direction ===
    "right-to-left"
      ? "is-right-to-left"
      : "is-left-to-right";

  const trackClassName = [
    "home-rail-track",

    directionClass,

    ready &&
    products.length > 1
      ? "is-ready"
      : "",

    paused
      ? "is-paused"
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <div
      className="home-product-rail"
      onMouseEnter={() =>
        setInteractionPaused(
          true,
        )
      }
      onMouseLeave={() =>
        setInteractionPaused(
          false,
        )
      }
      onFocusCapture={() =>
        setInteractionPaused(
          true,
        )
      }
      onBlurCapture={() =>
        setInteractionPaused(
          false,
        )
      }
    >
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
            {
              "--rail-distance":
                "0px",

              "--rail-distance-negative":
                "0px",

              "--rail-duration":
                `${MIN_DURATION_SECONDS}s`,
            } as CSSProperties
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
                  activeIndex
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