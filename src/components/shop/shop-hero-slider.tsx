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

type ShopHeroSlide = {
  id: string;

  title: string;

  subtitle:
    | string
    | null;

  image: string;

  mobileImage:
    | string
    | null;

  ctaLabel:
    | string
    | null;

  ctaLink:
    | string
    | null;

  enabled: boolean;

  sortOrder: number;
};

type ShopHeroSliderProps = {
  slides:
    ShopHeroSlide[];
};

type ShopHeroStyle =
  CSSProperties & {
    "--shop-hero-duration":
      string;

    "--shop-hero-transition":
      string;
  };

/* =========================================================
   SETTINGS
   ========================================================= */

const AUTOPLAY_DELAY =
  5000;

const TRANSITION_DURATION =
  1000;

const SWIPE_THRESHOLD =
  45;

/* =========================================================
   HELPER
   ========================================================= */

function positiveModulo(
  value: number,
  modulo: number,
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
   SHOP HERO
   ========================================================= */

export function ShopHeroSlider({
  slides,
}: ShopHeroSliderProps) {
  const preparedSlides =
    useMemo(
      () => {
        const valid =
          slides.filter(
            (
              slide,
            ) =>
              slide.enabled &&
              Boolean(
                slide.image?.trim(),
              ),
          );

        if (
          valid.length >
          0
        ) {
          return valid;
        }

        return [
          {
            id:
              "shop-fallback",

            title:
              "Shop The Latest",

            subtitle:
              "Performance, lifestyle and everyday essentials made for your game.",

            image:
              "/images/campaigns/hero.svg",

            mobileImage:
              null,

            ctaLabel:
              "Shop All",

            ctaLink:
              "/shop",

            enabled:
              true,

            sortOrder:
              0,
          },
        ];
      },

      [
        slides,
      ],
    );

  const [
    index,
    setIndex,
  ] =
    useState(0);

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
      index,
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
    setIndex(
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
     PRELOAD NEIGHBOURS
     ======================================================= */

  useEffect(() => {
    if (
      slideCount <=
      1
    ) {
      return;
    }

    const indexes = [
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

    indexes.forEach(
      (
        slideIndex,
      ) => {
        const slide =
          preparedSlides[
            slideIndex
          ];

        if (!slide) {
          return;
        }

        urls.add(
          slide.image,
        );

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
     AUTOPLAY — 5 SECONDS
     ======================================================= */

  useEffect(() => {
    if (
      !hasMultipleSlides
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

          setIndex(
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
        timer,
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
    nextIndex:
      number,
  ) {
    const next =
      positiveModulo(
        nextIndex,
        slideCount,
      );

    if (
      next ===
      activeIndex
    ) {
      return;
    }

    setIndex(
      next,
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
     TOUCH SWIPE
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

    const movement =
      end -
      start;

    if (
      Math.abs(
        movement,
      ) <
      SWIPE_THRESHOLD
    ) {
      return;
    }

    goToSlide(
      activeIndex +
        (
          movement <
          0
            ? 1
            : -1
        ),
    );
  }

  /* =======================================================
     STYLE VARIABLES
     ======================================================= */

  const style:
    ShopHeroStyle = {
      "--shop-hero-duration":
        `${AUTOPLAY_DELAY}ms`,

      "--shop-hero-transition":
        `${TRANSITION_DURATION}ms`,
    };

  return (
    <section
      className="shop-hero"
      style={
        style
      }
      aria-label="Shop featured campaigns"
      aria-roledescription="carousel"
      onTouchStart={
        handleTouchStart
      }
      onTouchEnd={
        handleTouchEnd
      }
    >
      {/* ===================================================
          MEDIA
          =================================================== */}

      <div
        className="shop-hero-media-stack"
        aria-hidden="true"
      >
        {preparedSlides.map(
          (
            slide,
            slideIndex,
          ) => {
            const active =
              slideIndex ===
              activeIndex;

            return (
              <div
                key={
                  slide.id
                }
                className={`shop-hero-media ${
                  active
                    ? "is-active"
                    : ""
                }`}
              >
                <picture>
                  <source
                    media="(max-width: 700px)"
                    srcSet={
                      slide.mobileImage ||
                      slide.image
                    }
                  />

                  <img
                    src={
                      slide.image
                    }
                    alt=""
                    draggable={
                      false
                    }
                    loading={
                      slideIndex <=
                      1
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
      </div>

      {/* ===================================================
          OVERLAYS
          =================================================== */}

      <div
        className="shop-hero-overlay"
        aria-hidden="true"
      />

      <div
        className="shop-hero-glow"
        aria-hidden="true"
      />

      {/* ===================================================
          COPY — MATCHES HOMEPAGE POSITIONING
          =================================================== */}

      <div className="container shop-hero-inner">
        <div
          key={
            activeSlide.id
          }
          className="shop-hero-copy"
        >
          <div className="shop-hero-eyebrow">
            <span />

            Game On Garb
          </div>

          <h1>
            {
              activeSlide.title
            }
          </h1>

          {activeSlide.subtitle ? (
            <p>
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
              className="shop-hero-cta"
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
              />
            </Link>
          ) : null}
        </div>
      </div>

      {/* ===================================================
          PROGRESS
          =================================================== */}

      {hasMultipleSlides ? (
        <>
          <div className="shop-hero-dots">
            {preparedSlides.map(
              (
                slide,
                slideIndex,
              ) => (
                <button
                  key={
                    slide.id
                  }
                  type="button"
                  aria-label={`Show Shop banner ${
                    slideIndex +
                    1
                  }`}
                  aria-current={
                    slideIndex ===
                    activeIndex
                      ? "true"
                      : undefined
                  }
                  className={`shop-hero-dot ${
                    slideIndex ===
                    activeIndex
                      ? "is-active"
                      : ""
                  }`}
                  onClick={() =>
                    goToSlide(
                      slideIndex,
                    )
                  }
                />
              ),
            )}
          </div>

          <div
            className="shop-hero-counter desktop-only"
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