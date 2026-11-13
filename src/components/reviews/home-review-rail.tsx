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
  ReviewCard,
} from "@/components/reviews/review-card";

import type {
  PublicReview,
} from "@/lib/reviews";

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

type RailStyle =
  CSSProperties & {
    "--review-rail-duration":
      string;
  };

const SECONDS_PER_REVIEW =
  4.6;

const MIN_DURATION =
  26;

const DRAG_THRESHOLD =
  6;

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

export function HomeReviewRail({
  reviews,
}: {
  reviews:
    PublicReview[];
}) {
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

  const suppressClickRef =
    useRef(
      false,
    );

  const [
    dragging,
    setDragging,
  ] =
    useState(
      false,
    );

  if (
    reviews.length ===
    0
  ) {
    return null;
  }

  const staticRail =
    reviews.length <=
    4;

  const duration =
    Math.max(
      MIN_DURATION,

      reviews.length *
        SECONDS_PER_REVIEW,
    );

  const durationMs =
    duration *
    1000;

  const style:
    RailStyle = {
      "--review-rail-duration":
        duration +
        "s",
    };

  function getAnimation() {
    const track =
      trackRef.current;

    if (!track) {
      return null;
    }

    return (
      track
        .getAnimations()
        .find(
          (
            animation,
          ) =>
            Boolean(
              animation.effect,
            ),
        ) ??
      null
    );
  }

  function handlePointerDown(
    event:
      ReactPointerEvent<HTMLDivElement>,
  ) {
    if (
      staticRail
    ) {
      return;
    }

    if (
      event.pointerType ===
        "mouse" &&
      event.button !==
        0
    ) {
      return;
    }

    const track =
      trackRef.current;

    if (!track) {
      return;
    }

    const firstGroup =
      track.querySelector<HTMLElement>(
        ".home-review-rail-group",
      );

    const animation =
      getAnimation();

    if (
      !firstGroup ||
      !animation
    ) {
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

    animation.pause();

    dragRef.current = {
      pointerId:
        event.pointerId,

      startX:
        event.clientX,

      startAnimationTime:
        typeof rawCurrentTime ===
        "number"
          ? rawCurrentTime
          : 0,

      animation,

      groupWidth,

      moved:
        false,
    };

    suppressClickRef.current =
      false;
  }

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

      const viewport =
        viewportRef.current;

      if (
        viewport &&
        !viewport.hasPointerCapture(
          event.pointerId,
        )
      ) {
        viewport.setPointerCapture(
          event.pointerId,
        );
      }

      setDragging(
        true,
      );
    }

    if (
      !state.moved
    ) {
      return;
    }

    const millisecondsPerPixel =
      durationMs /
      state.groupWidth;

    const nextTime =
      positiveModulo(
        state.startAnimationTime -
          movement *
            millisecondsPerPixel,

        durationMs,
      );

    state.animation.currentTime =
      nextTime;

    event.preventDefault();
  }

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
      window.setTimeout(
        () => {
          suppressClickRef.current =
            false;
        },
        0,
      );
    }
  }

  function handlePointerCancel(
    event:
      ReactPointerEvent<HTMLDivElement>,
  ) {
    const state =
      dragRef.current;

    if (!state) {
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

  const rootClassName = [
    "home-review-rail",

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

  return (
    <div
      className={
        rootClassName
      }
      style={
        style
      }
    >
      <div
        ref={
          viewportRef
        }
        className="home-review-rail-viewport"
        role="region"
        aria-label="Customer review carousel"
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
        ) =>
          event.preventDefault()
        }
      >
        <div
          ref={
            trackRef
          }
          className="home-review-rail-track"
        >
          <div className="home-review-rail-group">
            {reviews.map(
              (
                review,
              ) => (
                <div
                  key={
                    "primary-" +
                    review.id
                  }
                  className="home-review-rail-item"
                >
                  <ReviewCard
                    review={
                      review
                    }
                    compact
                  />
                </div>
              ),
            )}
          </div>

          {!staticRail ? (
            <div
              className="home-review-rail-group"
              aria-hidden="true"
            >
              {reviews.map(
                (
                  review,
                ) => (
                  <div
                    key={
                      "duplicate-" +
                      review.id
                    }
                    className="home-review-rail-item"
                  >
                    <ReviewCard
                      review={
                        review
                      }
                      compact
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
