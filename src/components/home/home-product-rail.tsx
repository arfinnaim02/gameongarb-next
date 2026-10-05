"use client";

import type {
  CSSProperties,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from "react";

import {
  useRef,
  useState,
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

type DragState = {
  pointerId:
    number;

  startX:
    number;

  startAnimationTime:
    number;

  animation:
    Animation;

  groupWidth:
    number;

  moved:
    boolean;
};

/* =========================================================
   SETTINGS
   ========================================================= */

const SECONDS_PER_PRODUCT =
  4.2;

const MIN_DURATION =
  24;

/*
 * Movement smaller than this is
 * treated as a normal click.
 */
const DRAG_THRESHOLD =
  6;

/* =========================================================
   HELPERS
   ========================================================= */

function positiveModulo(
  value:
    number,

  modulo:
    number,
) {
  if (
    modulo <=
    0
  ) {
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

  const dragRef =
    useRef<DragState | null>(
      null,
    );

  /*
   * Prevent product links/buttons from
   * firing immediately after dragging.
   */
  const suppressClickRef =
    useRef(false);

  const [
    dragging,
    setDragging,
  ] =
    useState(false);

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
     STATIC / SPEED
     ======================================================= */

  const staticRail =
    products.length ===
    1;

  const duration =
    Math.max(
      MIN_DURATION,

      products.length *
        SECONDS_PER_PRODUCT,
    );

  const durationMs =
    duration *
    1000;

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

  const rootClassName = [
    "home-product-rail",

    directionClass,

    staticRail
      ? "is-static"
      : "",

    dragging
      ? "is-dragging"
      : "",
  ]
    .filter(
      Boolean,
    )
    .join(
      " ",
    );

  /* =======================================================
     FIND ACTIVE CSS ANIMATION
     ======================================================= */

  function getRailAnimation() {
    const track =
      trackRef.current;

    if (!track) {
      return null;
    }

    const animations =
      track.getAnimations();

    return (
      animations.find(
        (
          animation,
        ) => {
          const effect =
            animation.effect;

          return Boolean(
            effect,
          );
        },
      ) ??
      null
    );
  }

  /* =======================================================
     POINTER DOWN
     ======================================================= */

  function handlePointerDown(
    event:
      ReactPointerEvent<HTMLDivElement>,
  ) {
    if (
      staticRail
    ) {
      return;
    }

    /*
     * Ignore right-click / middle-click.
     */
    if (
      event.pointerType ===
        "mouse" &&
      event.button !==
        0
    ) {
      return;
    }

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

    const firstGroup =
      track.querySelector<HTMLElement>(
        ".home-rail-group",
      );

    if (!firstGroup) {
      return;
    }

    const animation =
      getRailAnimation();

    if (!animation) {
      return;
    }

    const groupWidth =
      firstGroup.getBoundingClientRect()
        .width;

    if (
      !Number.isFinite(
        groupWidth,
      ) ||
      groupWidth <=
        0
    ) {
      return;
    }

    const rawCurrentTime =
      animation.currentTime;

    const currentTime =
      typeof rawCurrentTime ===
      "number"
        ? rawCurrentTime
        : 0;

    /*
     * Pause automatic animation exactly
     * where it currently is.
     *
     * IMPORTANT:
     * Do not capture the pointer yet.
     * A simple mouse click must remain
     * available to ProductCard links,
     * wishlist and Quick Add buttons.
     */
    animation.pause();

    dragRef.current = {
      pointerId:
        event.pointerId,

      startX:
        event.clientX,

      startAnimationTime:
        currentTime,

      animation,

      groupWidth,

      moved:
        false,
    };

    suppressClickRef.current =
      false;
  }

  /* =======================================================
     POINTER MOVE
     ======================================================= */

  function handlePointerMove(
    event:
      ReactPointerEvent<HTMLDivElement>,
  ) {
    const state =
      dragRef.current;

    if (
      !state ||
      state.pointerId !==
        event.pointerId
    ) {
      return;
    }

    const movement =
      event.clientX -
      state.startX;

    if (
      !state.moved &&
      Math.abs(
        movement,
      ) >=
        DRAG_THRESHOLD
    ) {
      state.moved =
        true;

      suppressClickRef.current =
        true;
    }

    if (
      !state.moved
    ) {
      return;
    }

    /*
     * Convert mouse movement in pixels
     * into animation timeline movement.
     *
     * Example:
     *
     * full loop width = 1800px
     * full animation = 29.4 seconds
     *
     * Dragging 100px therefore moves
     * through the matching amount of
     * the animation timeline.
     */
    const millisecondsPerPixel =
      durationMs /
      state.groupWidth;

    /*
     * Right-to-left animation:
     * dragging LEFT advances time.
     *
     * Left-to-right animation:
     * dragging RIGHT advances time.
     */
    const directionMultiplier =
      direction ===
      "right-to-left"
        ? -1
        : 1;

    const timeDelta =
      movement *
      millisecondsPerPixel *
      directionMultiplier;

    const nextTime =
      positiveModulo(
        state.startAnimationTime +
          timeDelta,

        durationMs,
      );

    state.animation.currentTime =
      nextTime;

    event.preventDefault();
  }

  /* =======================================================
     END DRAG
     ======================================================= */

  function finishDrag(
    event:
      ReactPointerEvent<HTMLDivElement>,
  ) {
    const state =
      dragRef.current;

    if (
      !state ||
      state.pointerId !==
        event.pointerId
    ) {
      return;
    }

    const viewport =
      viewportRef.current;

    if (
      viewport?.hasPointerCapture(
        event.pointerId,
      )
    ) {
      viewport.releasePointerCapture(
        event.pointerId,
      );
    }

    /*
     * Resume automatic carousel exactly
     * from the manually selected point.
     */
    state.animation.play();

    const wasDragged =
      state.moved;

    dragRef.current =
      null;

    setDragging(
      false,
    );

    if (
      wasDragged
    ) {
      /*
       * Keep this true long enough for
       * the click event generated after
       * pointerup to be intercepted.
       */
      window.setTimeout(
        () => {
          suppressClickRef.current =
            false;
        },
        0,
      );
    }
  }

  /* =======================================================
     POINTER CANCEL
     ======================================================= */

  function handlePointerCancel(
    event:
      ReactPointerEvent<HTMLDivElement>,
  ) {
    const state =
      dragRef.current;

    if (
      !state
    ) {
      return;
    }

    state.animation.play();

    const viewport =
      viewportRef.current;

    if (
      viewport?.hasPointerCapture(
        event.pointerId,
      )
    ) {
      viewport.releasePointerCapture(
        event.pointerId,
      );
    }

    dragRef.current =
      null;

    suppressClickRef.current =
      false;

    setDragging(
      false,
    );
  }

  /* =======================================================
     BLOCK CLICK AFTER DRAG
     ======================================================= */

  function handleClickCapture(
    event:
      ReactMouseEvent<HTMLDivElement>,
  ) {
    if (
      !suppressClickRef.current
    ) {
      return;
    }

    event.preventDefault();

    event.stopPropagation();

    suppressClickRef.current =
      false;
  }

  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <div
      className={
        rootClassName
      }
      style={
        railStyle
      }
    >
      <div
        ref={
          viewportRef
        }
        className="home-rail-viewport"
        role="region"
        aria-label={`${label} product carousel`}
        aria-live="off"
        onPointerDown={
          handlePointerDown
        }
        onPointerMove={
          handlePointerMove
        }
        onPointerUp={
          finishDrag
        }
        onPointerCancel={
          handlePointerCancel
        }
        onClickCapture={
          handleClickCapture
        }
        onDragStart={(
          event,
        ) => {
          /*
           * Prevent browser-native image
           * dragging from fighting with
           * carousel dragging.
           */
          event.preventDefault();
        }}
      >
        <div
          ref={
            trackRef
          }
          className="home-rail-track"
        >
          {/* ===============================================
              ORIGINAL GROUP
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
              =============================================== */}

          {!staticRail ? (
            <div
              className="home-rail-group"
              aria-hidden="true"
            >
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