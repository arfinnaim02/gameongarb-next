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
  slides: HeroSlide[];
  fallback: HeroFallback;
};

type HeroStyle =
  CSSProperties & {
    "--hero-autoplay-duration":
      string;
  };

const AUTOPLAY_DELAY =
  4000;

const SWIPE_THRESHOLD =
  45;

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

export function HeroSlider({
  slides,
  fallback,
}: HeroSliderProps) {
  const preparedSlides =
    useMemo<HeroSlide[]>(
      () => {
        const validSlides =
          slides.filter(
            (slide) =>
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

  const [
    currentIndex,
    setCurrentIndex,
  ] = useState(0);

  const touchStartXRef =
    useRef<number | null>(
      null,
    );

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
    slideCount > 1;

  /* =======================================================
     PRELOAD NEXT IMAGE
     ======================================================= */

  useEffect(() => {
    if (
      slideCount <= 1
    ) {
      return;
    }

    const nextIndex =
      positiveModulo(
        activeIndex + 1,
        slideCount,
      );

    const nextSlide =
      preparedSlides[
        nextIndex
      ];

    if (!nextSlide) {
      return;
    }

    const desktopImage =
      new window.Image();

    desktopImage.src =
      nextSlide.image;

    if (
      nextSlide.mobileImage &&
      nextSlide.mobileImage !==
        nextSlide.image
    ) {
      const mobileImage =
        new window.Image();

      mobileImage.src =
        nextSlide.mobileImage;
    }
  }, [
    activeIndex,
    preparedSlides,
    slideCount,
  ]);

  /* =======================================================
     AUTOMATIC SLIDE — EVERY 4 SECONDS
     ======================================================= */

  useEffect(() => {
    if (
      slideCount <= 1
    ) {
      return;
    }

    const media =
      window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      );

    if (
      media.matches
    ) {
      return;
    }

    /*
     * setTimeout instead of setInterval:
     *
     * Every newly selected slide gets
     * a complete fresh 4-second display
     * period, including after clicking
     * a dot or swiping manually.
     */
    const timer =
      window.setTimeout(
        () => {
          if (
            document.hidden
          ) {
            setCurrentIndex(
              (current) =>
                positiveModulo(
                  current,
                  slideCount,
                ),
            );

            return;
          }

          setCurrentIndex(
            (current) =>
              positiveModulo(
                current + 1,
                slideCount,
              ),
          );
        },

        AUTOPLAY_DELAY,
      );

    return () => {
      window.clearTimeout(
        timer,
      );
    };
  }, [
    activeIndex,
    slideCount,
  ]);

  /* =======================================================
     MANUAL DOT
     ======================================================= */

  function goToSlide(
    index: number,
  ) {
    setCurrentIndex(
      positiveModulo(
        index,
        slideCount,
      ),
    );
  }

  /* =======================================================
     MOBILE SWIPE
     ======================================================= */

  function handleTouchStart(
    event:
      TouchEvent<HTMLElement>,
  ) {
    touchStartXRef.current =
      event.changedTouches[
        0
      ]?.clientX ??
      null;
  }

  function handleTouchEnd(
    event:
      TouchEvent<HTMLElement>,
  ) {
    const startX =
      touchStartXRef.current;

    touchStartXRef.current =
      null;

    if (
      startX === null
    ) {
      return;
    }

    const endX =
      event.changedTouches[
        0
      ]?.clientX;

    if (
      typeof endX !==
      "number"
    ) {
      return;
    }

    const movement =
      endX -
      startX;

    if (
      Math.abs(
        movement,
      ) <
      SWIPE_THRESHOLD
    ) {
      return;
    }

    setCurrentIndex(
      (current) =>
        positiveModulo(
          current +
            (
              movement < 0
                ? 1
                : -1
            ),

          slideCount,
        ),
    );
  }

  if (
    !activeSlide
  ) {
    return null;
  }

  const heroStyle:
    HeroStyle = {
      "--hero-autoplay-duration":
        `${AUTOPLAY_DELAY}ms`,
    };

  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <section
      className="premium-hero"
      aria-roledescription="carousel"
      aria-label="Game On Garb featured promotions"
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
          IMAGE CROSSFADE STACK
          =================================================== */}

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
              aria-hidden="true"
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
                    index <= 1
                      ? "eager"
                      : "lazy"
                  }
                  decoding="async"
                />
              </picture>
            </div>
          );
        },
      )}

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
          COPY
          =================================================== */}

      <div className="container premium-hero-inner">
        <div
          key={`hero-copy-${activeSlide.id}-${activeIndex}`}
          className="premium-hero-copy"
          aria-live="polite"
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
                size={15}
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
          DOTS + COUNTER
          =================================================== */}

      {hasMultipleSlides ? (
        <>
          <div
            className="premium-hero-dots"
            role="tablist"
            aria-label="Hero slides"
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
                    role="tab"
                    aria-selected={
                      active
                    }
                    aria-label={`Show slide ${
                      index + 1
                    }`}
                    className={`premium-hero-dot${
                      active
                        ? " is-active"
                        : ""
                    }`}
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