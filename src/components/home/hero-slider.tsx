"use client";

import Link from "next/link";

import {
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
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

const AUTOPLAY_DELAY =
  6500;

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
          validSlides.length
        ) {
          return validSlides;
        }

        return [
          {
            id: "fallback",

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
        slides,
        fallback,
      ],
    );

  const [
    currentIndex,
    setCurrentIndex,
  ] = useState(0);

  const [
    paused,
    setPaused,
  ] = useState(false);

  useEffect(() => {
    if (
      currentIndex >=
      preparedSlides.length
    ) {
      setCurrentIndex(0);
    }
  }, [
    currentIndex,
    preparedSlides.length,
  ]);

  const nextSlide =
    useCallback(() => {
      setCurrentIndex(
        (current) =>
          (current + 1) %
          preparedSlides.length,
      );
    }, [
      preparedSlides.length,
    ]);

  const previousSlide =
    useCallback(() => {
      setCurrentIndex(
        (current) =>
          current === 0
            ? preparedSlides.length -
              1
            : current - 1,
      );
    }, [
      preparedSlides.length,
    ]);

  useEffect(() => {
    if (
      paused ||
      preparedSlides.length <=
        1
    ) {
      return;
    }

    const timer =
      window.setInterval(
        nextSlide,
        AUTOPLAY_DELAY,
      );

    return () =>
      window.clearInterval(
        timer,
      );
  }, [
    nextSlide,
    paused,
    preparedSlides.length,
  ]);

  const activeSlide =
    preparedSlides[
      currentIndex
    ];

  if (!activeSlide) {
    return null;
  }

  const mobileImage =
    activeSlide.mobileImage ||
    activeSlide.image;

  const hasMultipleSlides =
    preparedSlides.length > 1;

  return (
    <section
      className="premium-hero"
      aria-roledescription="carousel"
      aria-label="Game On Garb featured promotions"
      onMouseEnter={() =>
        setPaused(true)
      }
      onMouseLeave={() =>
        setPaused(false)
      }
      onFocusCapture={() =>
        setPaused(true)
      }
      onBlurCapture={() =>
        setPaused(false)
      }
    >
      <div
        key={`media-${activeSlide.id}-${currentIndex}`}
        className="premium-hero-media"
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
              activeSlide.image
            }
            alt=""
          />
        </picture>
      </div>

      <div
        className="premium-hero-shade"
        aria-hidden="true"
      />

      <div
        className="premium-hero-glow"
        aria-hidden="true"
      />

      <div className="container premium-hero-inner">
        <div
          key={`copy-${activeSlide.id}-${currentIndex}`}
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

      {hasMultipleSlides ? (
        <>
          <div className="premium-hero-navigation desktop-only">
            <button
              type="button"
              className="premium-hero-arrow"
              aria-label="Previous hero slide"
              onClick={
                previousSlide
              }
            >
              <ChevronLeft
                size={18}
                strokeWidth={
                  1.6
                }
              />
            </button>

            <button
              type="button"
              className="premium-hero-arrow"
              aria-label="Next hero slide"
              onClick={
                nextSlide
              }
            >
              <ChevronRight
                size={18}
                strokeWidth={
                  1.6
                }
              />
            </button>
          </div>

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
                  currentIndex;

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
                      setCurrentIndex(
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
                currentIndex +
                  1,
              ).padStart(
                2,
                "0",
              )}
            </strong>

            <span />

            <small>
              {String(
                preparedSlides.length,
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