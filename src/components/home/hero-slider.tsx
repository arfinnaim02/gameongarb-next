"use client";

import Link from "next/link";

import {
  ChevronRight,
} from "lucide-react";

import type {
  CSSProperties,
  TouchEvent,
} from "react";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

/* =========================================================
   TYPES
   ========================================================= */

export type HeroSlide = {
  id: string;

  title: string;

  subtitle?:
    | string
    | null;

  image: string;

  mobileImage?:
    | string
    | null;

  ctaLabel?:
    | string
    | null;

  ctaLink?:
    | string
    | null;
};

type HeroFallback = {
  title: string;

  subtitle?:
    | string
    | null;

  image: string;

  mobileImage?:
    | string
    | null;

  ctaLabel?:
    | string
    | null;

  ctaLink?:
    | string
    | null;
};

type HeroSliderProps = {
  slides:
    HeroSlide[];

  fallback:
    HeroFallback;
};

type HeroStyle =
  CSSProperties & {
    "--hero-autoplay-duration":
      string;

    "--hero-transition-duration":
      string;
  };

/* =========================================================
   SLIDER SETTINGS
   ========================================================= */

const AUTOPLAY_DELAY =
  5000;

const TRANSITION_DURATION =
  1000;

const SWIPE_THRESHOLD =
  45;

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
   HERO SLIDER
   ========================================================= */

export function HeroSlider({
  slides,
  fallback,
}: HeroSliderProps) {
  /* =======================================================
     VALID SLIDES
     ======================================================= */

  const preparedSlides =
    useMemo<HeroSlide[]>(
      () => {
        const validSlides =
          slides.filter(
            (
              slide,
            ) =>
              Boolean(
                slide.image?.trim(),
              ),
          );

        if (
          validSlides.length >
          0
        ) {
          return validSlides;
        }

        return [
          {
            id:
              "fallback",

            title:
              fallback.title,

            subtitle:
              fallback.subtitle,

            image:
              fallback.image,

            mobileImage:
              fallback.mobileImage,

            ctaLabel:
              fallback.ctaLabel,

            ctaLink:
              fallback.ctaLink,
          },
        ];
      },

      [
        fallback,
        slides,
      ],
    );

  /* =======================================================
     STATE
     ======================================================= */

  const [
    currentIndex,
    setCurrentIndex,
  ] =
    useState(0);

  /*
   * Incrementing this after a manual
   * interaction restarts the automatic
   * 5-second interval.
   */
  const [
    timerVersion,
    setTimerVersion,
  ] =
    useState(0);

  const touchStartX =
    useRef<
      number | null
    >(null);

  const slideCount =
    preparedSlides.length;

  const activeIndex =
    positiveModulo(
      currentIndex,
      slideCount,
    );

  const activeSlide =
    preparedSlides[
      activeIndex
    ];

  const hasMultipleSlides =
    slideCount >
    1;

  /* =======================================================
     KEEP INDEX VALID
     ======================================================= */

  useEffect(() => {
    setCurrentIndex(
      (
        current,
      ) =>
        positiveModulo(
          current,
          slideCount,
        ),
    );
  }, [
    slideCount,
  ]);

  /* =======================================================
     PRELOAD NEXT + PREVIOUS SLIDES
     ======================================================= */

  useEffect(() => {
    if (
      slideCount <=
      1
    ) {
      return;
    }

    const preloadIndexes = [
      positiveModulo(
        activeIndex +
          1,
        slideCount,
      ),

      positiveModulo(
        activeIndex -
          1,
        slideCount,
      ),
    ];

    const urls =
      new Set<string>();

    preloadIndexes.forEach(
      (
        index,
      ) => {
        const slide =
          preparedSlides[
            index
          ];

        if (!slide) {
          return;
        }

        if (
          slide.image
        ) {
          urls.add(
            slide.image,
          );
        }

        if (
          slide.mobileImage
        ) {
          urls.add(
            slide.mobileImage,
          );
        }
      },
    );

    urls.forEach(
      (
        url,
      ) => {
        const image =
          new window.Image();

        image.decoding =
          "async";

        image.src =
          url;
      },
    );
  }, [
    activeIndex,
    preparedSlides,
    slideCount,
  ]);

  /* =======================================================
     AUTOMATIC ROTATION — EVERY 5 SECONDS
     ======================================================= */

  useEffect(() => {
    if (
      !hasMultipleSlides
    ) {
      return;
    }

    /*
     * setInterval is intentional here.
     *
     * If the browser tab becomes hidden,
     * we simply skip that interval tick.
     *
     * The interval itself remains alive,
     * so the carousel cannot permanently
     * stop when the tab becomes visible
     * again.
     */
    const interval =
      window.setInterval(
        () => {
          if (
            document.hidden
          ) {
            return;
          }

          setCurrentIndex(
            (
              current,
            ) =>
              positiveModulo(
                current +
                  1,

                slideCount,
              ),
          );
        },

        AUTOPLAY_DELAY,
      );

    return () => {
      window.clearInterval(
        interval,
      );
    };
  }, [
    hasMultipleSlides,
    slideCount,
    timerVersion,
  ]);

  /* =======================================================
     MANUAL NAVIGATION
     ======================================================= */

  function goToSlide(
    index:
      number,
  ) {
    if (
      !hasMultipleSlides
    ) {
      return;
    }

    const nextIndex =
      positiveModulo(
        index,
        slideCount,
      );

    if (
      nextIndex ===
      activeIndex
    ) {
      return;
    }

    setCurrentIndex(
      nextIndex,
    );

    /*
     * Give the manually selected slide
     * a fresh complete 5-second period.
     */
    setTimerVersion(
      (
        current,
      ) =>
        current +
        1,
    );
  }

  /* =======================================================
     SWIPE
     ======================================================= */

  function handleTouchStart(
    event:
      TouchEvent<HTMLElement>,
  ) {
    touchStartX.current =
      event.changedTouches[
        0
      ]?.clientX ??
      null;
  }

  function handleTouchEnd(
    event:
      TouchEvent<HTMLElement>,
  ) {
    const start =
      touchStartX.current;

    touchStartX.current =
      null;

    if (
      start ===
      null
    ) {
      return;
    }

    const end =
      event.changedTouches[
        0
      ]?.clientX;

    if (
      typeof end !==
      "number"
    ) {
      return;
    }

    const distance =
      end -
      start;

    if (
      Math.abs(
        distance,
      ) <
      SWIPE_THRESHOLD
    ) {
      return;
    }

    const direction =
      distance <
      0
        ? 1
        : -1;

    setCurrentIndex(
      (
        current,
      ) =>
        positiveModulo(
          current +
            direction,

          slideCount,
        ),
    );

    setTimerVersion(
      (
        current,
      ) =>
        current +
        1,
    );
  }

  /* =======================================================
     NOTHING TO DISPLAY
     ======================================================= */

  if (
    !activeSlide
  ) {
    return null;
  }

  /* =======================================================
     CSS VARIABLES
     ======================================================= */

  const heroStyle:
    HeroStyle = {
      "--hero-autoplay-duration":
        `${AUTOPLAY_DELAY}ms`,

      "--hero-transition-duration":
        `${TRANSITION_DURATION}ms`,
    };

  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <section
      className="premium-hero"
      aria-roledescription="carousel"
      aria-label="Game On Garb featured banners"
      style={
        heroStyle
      }
      onTouchStart={
        handleTouchStart
      }
      onTouchEnd={
        handleTouchEnd
      }
    >
      {/* ===================================================
          MEDIA STACK
          =================================================== */}

      <div
        className="premium-hero-media-stack"
        aria-hidden="true"
      >
        {preparedSlides.map(
          (
            slide,
            index,
          ) => {
            const active =
              index ===
              activeIndex;

            const mobileImage =
              slide.mobileImage ||
              slide.image;

            return (
              <div
                key={
                  slide.id
                }
                className={`premium-hero-media${
                  active
                    ? " is-active"
                    : ""
                }`}
              >
                <picture>
                  <source
                    media="(max-width: 700px)"
                    srcSet={
                      mobileImage
                    }
                  />

                  <img
                    src={
                      slide.image
                    }
                    alt=""
                    loading={
                      index <=
                      1
                        ? "eager"
                        : "lazy"
                    }
                    decoding="async"
                    draggable={
                      false
                    }
                  />
                </picture>
              </div>
            );
          },
        )}
      </div>

      {/* ===================================================
          OVERLAYS
          =================================================== */}

      <div
        className="premium-hero-shade"
        aria-hidden="true"
      />

      <div
        className="premium-hero-glow"
        aria-hidden="true"
      />

      {/* ===================================================
          CONTENT
          =================================================== */}

      <div className="container premium-hero-inner">
        <div
          key={
            `hero-copy-${activeSlide.id}-${activeIndex}`
          }
          className="premium-hero-copy"
        >
          <div className="premium-hero-eyebrow">
            <span />

            Game On Garb
          </div>

          <h1 className="premium-hero-title">
            {
              activeSlide.title
            }
          </h1>

          {activeSlide.subtitle ? (
            <p className="premium-hero-subtitle">
              {
                activeSlide.subtitle
              }
            </p>
          ) : null}

          {activeSlide.ctaLabel &&
          activeSlide.ctaLink ? (
            <Link
              href={
                activeSlide.ctaLink
              }
              className="premium-hero-cta"
            >
              <span>
                {
                  activeSlide.ctaLabel
                }
              </span>

              <ChevronRight
                size={16}
                strokeWidth={
                  1.8
                }
                aria-hidden="true"
              />
            </Link>
          ) : null}
        </div>
      </div>

      {/* ===================================================
          SLIDE PROGRESS
          =================================================== */}

      {hasMultipleSlides ? (
        <>
          <div
            className="premium-hero-dots"
            aria-label="Hero banners"
          >
            {preparedSlides.map(
              (
                slide,
                index,
              ) => {
                const active =
                  index ===
                  activeIndex;

                return (
                  <button
                    key={
                      slide.id
                    }
                    type="button"
                    className={`premium-hero-dot${
                      active
                        ? " is-active"
                        : ""
                    }`}
                    aria-label={`Show banner ${
                      index +
                      1
                    }`}
                    aria-current={
                      active
                        ? "true"
                        : undefined
                    }
                    onClick={() =>
                      goToSlide(
                        index,
                      )
                    }
                  />
                );
              },
            )}
          </div>

          <div
            className="premium-hero-counter desktop-only"
            aria-hidden="true"
          >
            <strong>
              {String(
                activeIndex +
                  1,
              ).padStart(
                2,
                "0",
              )}
            </strong>

            <span />

            <small>
              {String(
                slideCount,
              ).padStart(
                2,
                "0",
              )}
            </small>
          </div>
        </>
      ) : null}
    </section>
  );
}