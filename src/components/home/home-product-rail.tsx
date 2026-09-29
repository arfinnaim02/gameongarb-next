"use client";

import {
  useCallback,
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
 * Continuous rail speed.
 *
 * 24 = slow premium movement.
 * 18 = even slower.
 * 30 = slightly faster.
 */
const RAIL_SPEED = 24;

/*
 * Avoid giant animation jumps
 * after tab switching or lag.
 */
const MAX_FRAME_DELTA = 50;

/* =========================================================
   HELPERS
   ========================================================= */

function prefersReducedMotion() {
  return window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
}

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

function getStep(
  track: HTMLDivElement,
) {
  const item =
    track.querySelector<HTMLElement>(
      ".home-rail-item",
    );

  if (!item) {
    return 0;
  }

  const styles =
    window.getComputedStyle(
      track,
    );

  const gap =
    Number.parseFloat(
      styles.columnGap ||
        styles.gap ||
        "0",
    ) || 0;

  return (
    item.getBoundingClientRect()
      .width + gap
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

  const animationFrameRef =
    useRef<number | null>(
      null,
    );

  const lastFrameRef =
    useRef<number | null>(
      null,
    );

  const offsetRef =
    useRef(0);

  const stepRef =
    useRef(0);

  const setWidthRef =
    useRef(0);

  const initializedRef =
    useRef(false);

  const activeIndexRef =
    useRef(0);

  const [
    ready,
    setReady,
  ] = useState(false);

  const [
    visible,
    setVisible,
  ] = useState(false);

  const [
    activeIndex,
    setActiveIndex,
  ] = useState(0);

  /*
   * Four copies make the rail safe
   * even when only 2–3 real products
   * exist while 4 cards are visible.
   */
  const loopProducts =
    useMemo(() => {
      if (
        products.length <= 1
      ) {
        return products.map(
          (product) => ({
            product,

            loopKey:
              `single-${product.id}`,
          }),
        );
      }

      return [
        0,
        1,
        2,
        3,
      ].flatMap(
        (copy) =>
          products.map(
            (
              product,
              index,
            ) => ({
              product,

              loopKey:
                `${copy}-${index}-${product.id}`,
            }),
          ),
      );
    }, [
      products,
    ]);

  const productKey =
    products
      .map(
        (product) =>
          product.id,
      )
      .join("|");

  /* =======================================================
     APPLY TRANSFORM
     ======================================================= */

  const applyTransform =
    useCallback(() => {
      const track =
        trackRef.current;

      if (!track) {
        return;
      }

      track.style.transform =
        `translate3d(${-offsetRef.current}px, 0, 0)`;
    }, []);

  /* =======================================================
     ACTIVE DOT
     ======================================================= */

  const updateActiveIndex =
    useCallback(() => {
      const step =
        stepRef.current;

      if (
        !step ||
        products.length <= 1
      ) {
        return;
      }

      const position =
        Math.round(
          offsetRef.current /
            step,
        );

      const nextIndex =
        positiveModulo(
          position,
          products.length,
        );

      if (
        nextIndex ===
        activeIndexRef.current
      ) {
        return;
      }

      activeIndexRef.current =
        nextIndex;

      setActiveIndex(
        nextIndex,
      );
    }, [
      products.length,
    ]);

  /* =======================================================
     SEAMLESS NORMALIZATION
     ======================================================= */

  const normalizeOffset =
    useCallback(() => {
      const setWidth =
        setWidthRef.current;

      if (
        !setWidth ||
        products.length <= 1
      ) {
        return;
      }

      /*
       * Keep the animation between
       * identical copies 1 and 2.
       *
       * The jump by exactly one full
       * product set is invisible
       * because every set is identical.
       */

      while (
        offsetRef.current >=
        setWidth * 2
      ) {
        offsetRef.current -=
          setWidth;
      }

      while (
        offsetRef.current <
        setWidth
      ) {
        offsetRef.current +=
          setWidth;
      }
    }, [
      products.length,
    ]);

  /* =======================================================
     MEASURE AND INITIALIZE
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

    initializedRef.current =
      false;

    setReady(false);

    const measure =
      () => {
        const step =
          getStep(
            track,
          );

        if (!step) {
          return;
        }

        stepRef.current =
          step;

        if (
          products.length <= 1
        ) {
          setWidthRef.current =
            step;

          offsetRef.current =
            0;

          applyTransform();

          activeIndexRef.current =
            0;

          setActiveIndex(0);

          setReady(true);

          return;
        }

        const newSetWidth =
          step *
          products.length;

        if (
          !initializedRef.current
        ) {
          setWidthRef.current =
            newSetWidth;

          /*
           * Start at copy #2.
           */
          offsetRef.current =
            newSetWidth;

          initializedRef.current =
            true;

          activeIndexRef.current =
            0;

          setActiveIndex(0);

          applyTransform();

          setReady(true);

          return;
        }

        /*
         * Preserve animation progress
         * when responsive layout changes
         * from 4 → 3 → 2 cards.
         */
        const oldSetWidth =
          setWidthRef.current;

        const progress =
          oldSetWidth > 0
            ? positiveModulo(
                offsetRef.current,
                oldSetWidth,
              ) /
              oldSetWidth
            : 0;

        setWidthRef.current =
          newSetWidth;

        offsetRef.current =
          newSetWidth +
          progress *
            newSetWidth;

        normalizeOffset();

        applyTransform();

        updateActiveIndex();

        setReady(true);
      };

    const resizeObserver =
      new ResizeObserver(
        measure,
      );

    resizeObserver.observe(
      viewport,
    );

    const frame =
      window.requestAnimationFrame(
        measure,
      );

    return () => {
      resizeObserver.disconnect();

      window.cancelAnimationFrame(
        frame,
      );
    };
  }, [
    applyTransform,
    normalizeOffset,
    productKey,
    products.length,
    updateActiveIndex,
  ]);

  /* =======================================================
     SECTION VISIBILITY
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
          setVisible(
            entry.isIntersecting,
          );
        },
        {
          rootMargin:
            "100px 0px 100px 0px",

          threshold: 0,
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
     CONTINUOUS PREMIUM MOVEMENT
     ======================================================= */

  useEffect(() => {
    if (
      !ready ||
      !visible ||
      products.length <= 1
    ) {
      return;
    }

    if (
      prefersReducedMotion()
    ) {
      return;
    }

    const movementDirection =
      direction ===
      "right-to-left"
        ? 1
        : -1;

    lastFrameRef.current =
      null;

    const animate =
      (
        timestamp: number,
      ) => {
        if (
          document.hidden
        ) {
          lastFrameRef.current =
            timestamp;

          animationFrameRef.current =
            window.requestAnimationFrame(
              animate,
            );

          return;
        }

        const lastFrame =
          lastFrameRef.current;

        lastFrameRef.current =
          timestamp;

        if (
          lastFrame !== null
        ) {
          const delta =
            Math.min(
              timestamp -
                lastFrame,
              MAX_FRAME_DELTA,
            );

          const distance =
            RAIL_SPEED *
            (delta / 1000);

          offsetRef.current +=
            movementDirection *
            distance;

          normalizeOffset();

          applyTransform();

          updateActiveIndex();
        }

        animationFrameRef.current =
          window.requestAnimationFrame(
            animate,
          );
      };

    animationFrameRef.current =
      window.requestAnimationFrame(
        animate,
      );

    return () => {
      if (
        animationFrameRef.current !==
        null
      ) {
        window.cancelAnimationFrame(
          animationFrameRef.current,
        );

        animationFrameRef.current =
          null;
      }

      lastFrameRef.current =
        null;
    };
  }, [
    applyTransform,
    direction,
    normalizeOffset,
    products.length,
    ready,
    updateActiveIndex,
    visible,
  ]);

  /* =======================================================
     CLEANUP
     ======================================================= */

  useEffect(() => {
    return () => {
      if (
        animationFrameRef.current !==
        null
      ) {
        window.cancelAnimationFrame(
          animationFrameRef.current,
        );
      }
    };
  }, []);

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
      >
        <div
          ref={trackRef}
          className="home-rail-track"
        >
          {loopProducts.map(
            ({
              product,
              loopKey,
            }) => (
              <div
                className="home-rail-item"
                key={loopKey}
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
          aria-label={`${label} carousel position`}
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
                aria-hidden="true"
              />
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}