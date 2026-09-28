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
 * One product changes every 4 seconds.
 */
const AUTO_DELAY = 4000;

/*
 * Allow the smooth animation to finish
 * before correcting the infinite-loop position.
 */
const NORMALIZE_DELAY = 650;

/* =========================================================
   HELPERS
   ========================================================= */

function prefersReducedMotion() {
  return window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
}

function getStep(
  viewport: HTMLDivElement,
) {
  const item =
    viewport.querySelector<HTMLElement>(
      ".home-rail-item",
    );

  if (!item) {
    return 0;
  }

  const styles =
    window.getComputedStyle(
      viewport,
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

const normalizeTimerRef =
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
  ] = useState(false);

  const [
    activeIndex,
    setActiveIndex,
  ] = useState(0);

  /*
   * Three copies allow the carousel
   * to continue forever even when
   * there are only four real products.
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

      return [0, 1, 2].flatMap(
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
    }, [products]);

  const productKey =
    products
      .map(
        (product) =>
          product.id,
      )
      .join("|");

  /* =======================================================
     WIDTH OF ONE REAL PRODUCT SET
     ======================================================= */

  const getSingleSetWidth =
    useCallback(() => {
      const viewport =
        viewportRef.current;

      if (
        !viewport ||
        products.length <= 1
      ) {
        return 0;
      }

      const step =
        getStep(viewport);

      if (!step) {
        return 0;
      }

      return (
        step *
        products.length
      );
    }, [
      products.length,
    ]);

  /* =======================================================
     KEEP CAROUSEL INSIDE MIDDLE COPY
     ======================================================= */

  const normalizePosition =
    useCallback(() => {
      const viewport =
        viewportRef.current;

      if (
        !viewport ||
        products.length <= 1
      ) {
        return;
      }

      const setWidth =
        getSingleSetWidth();

      if (!setWidth) {
        return;
      }

      if (
        viewport.scrollLeft <
        setWidth * 0.5
      ) {
        viewport.scrollLeft +=
          setWidth;

        return;
      }

      if (
        viewport.scrollLeft >
        setWidth * 2.5
      ) {
        viewport.scrollLeft -=
          setWidth;
      }
    }, [
      getSingleSetWidth,
      products.length,
    ]);

  /* =======================================================
     MOVE EXACTLY ONE PRODUCT
     ======================================================= */

  const moveOne =
    useCallback(() => {
      const viewport =
        viewportRef.current;

      if (
        !viewport ||
        products.length <= 1
      ) {
        return;
      }

      const step =
        getStep(
          viewport,
        );

      if (!step) {
        return;
      }

      /*
       * left-to-right:
       * cards visually move toward the RIGHT.
       *
       * right-to-left:
       * cards visually move toward the LEFT.
       */

      const visualRight =
        direction ===
        "left-to-right";

      viewport.scrollBy({
        left:
          visualRight
            ? -step
            : step,

        behavior:
          prefersReducedMotion()
            ? "auto"
            : "smooth",
      });

      setActiveIndex(
        (current) => {
          if (
            visualRight
          ) {
            return (
              current -
              1 +
              products.length
            ) %
              products.length;
          }

          return (
            current + 1
          ) %
            products.length;
        },
      );

if (
  normalizeTimerRef.current !==
  null
) {
  window.clearTimeout(
    normalizeTimerRef.current,
  );

  normalizeTimerRef.current =
    null;
}

      normalizeTimerRef.current =
        window.setTimeout(
          normalizePosition,
          NORMALIZE_DELAY,
        );
    }, [
      direction,
      normalizePosition,
      products.length,
    ]);

  /* =======================================================
     INITIAL POSITION
     ======================================================= */

  useEffect(() => {
    const viewport =
      viewportRef.current;

    if (!viewport) {
      return;
    }

    let initialized =
      false;

    const initialize =
      () => {
        if (
          products.length <= 1
        ) {
          viewport.scrollLeft =
            0;

          setActiveIndex(0);

          setReady(true);

          return;
        }

        const setWidth =
          getSingleSetWidth();

        if (!setWidth) {
          return;
        }

        /*
         * Start at the middle copy.
         */

        if (!initialized) {
          viewport.scrollLeft =
            setWidth;

          initialized =
            true;

          setActiveIndex(0);
        }

        setReady(true);
      };

    const resizeObserver =
      new ResizeObserver(
        initialize,
      );

    resizeObserver.observe(
      viewport,
    );

    const frame =
      window.requestAnimationFrame(
        initialize,
      );

    return () => {
      resizeObserver.disconnect();

      window.cancelAnimationFrame(
        frame,
      );
    };
  }, [
    getSingleSetWidth,
    productKey,
    products.length,
  ]);

  /* =======================================================
     ONLY AUTOPLAY WHILE SECTION IS VISIBLE
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
            entry.isIntersecting &&
              entry.intersectionRatio >=
                0.1,
          );
        },
        {
          threshold: [
            0,
            0.1,
            0.5,
          ],
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
     AUTOMATIC MOVEMENT
     ======================================================= */

  useEffect(() => {
    if (
      !ready ||
      !visible ||
      products.length <= 1
    ) {
      return;
    }

    const timer =
      window.setInterval(
        () => {
          if (
            document.hidden
          ) {
            return;
          }

          moveOne();
        },
        AUTO_DELAY,
      );

    return () => {
      window.clearInterval(
        timer,
      );
    };
  }, [
    moveOne,
    products.length,
    ready,
    visible,
  ]);

  /* =======================================================
     CLEANUP
     ======================================================= */

  useEffect(() => {
    return () => {
      if (
        normalizeTimerRef.current
      ) {
        window.clearTimeout(
          normalizeTimerRef.current,
        );
      }
    };
  }, []);

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