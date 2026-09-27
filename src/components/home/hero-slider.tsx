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
  subtitle?: string | null;

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

const AUTOPLAY_DELAY = 6500;

export function HeroSlider({
  slides,
  fallback,
}: HeroSliderProps) {
  const preparedSlides =
    useMemo<HeroSlide[]>(() => {
      const validSlides =
        slides.filter(
          (slide) =>
            Boolean(
              slide.image?.trim(),
            ),
        );

      if (validSlides.length) {
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
          ctaLabel:
            fallback.ctaLabel,
          ctaLink:
            fallback.ctaLink,
        },
      ];
    }, [slides, fallback]);

  const [currentIndex, setCurrentIndex] =
    useState(0);

  const [paused, setPaused] =
    useState(false);

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
    }, [preparedSlides.length]);

  const previousSlide =
    useCallback(() => {
      setCurrentIndex(
        (current) =>
          current === 0
            ? preparedSlides.length -
              1
            : current - 1,
      );
    }, [preparedSlides.length]);

  useEffect(() => {
    if (
      paused ||
      preparedSlides.length <= 1
    ) {
      return;
    }

    const timer =
      window.setInterval(
        nextSlide,
        AUTOPLAY_DELAY,
      );

    return () => {
      window.clearInterval(
        timer,
      );
    };
  }, [
    nextSlide,
    paused,
    preparedSlides.length,
  ]);

  const activeSlide =
    preparedSlides[currentIndex];

  if (!activeSlide) {
    return null;
  }

const backgroundStyle =
  {
    "--hero-image": `url("${activeSlide.image}")`,

    "--hero-mobile-image": `url("${
      activeSlide.mobileImage ||
      activeSlide.image
    }")`,
  } as React.CSSProperties;

  return (
    <section
      className="premium-hero"
      style={backgroundStyle}
      aria-roledescription="carousel"
      aria-label="Game On Garb featured promotions"
      onMouseEnter={() =>
        setPaused(true)
      }
      onMouseLeave={() =>
        setPaused(false)
      }
    >
      {/* Image transition layer */}

      <div
        key={`${activeSlide.id}-${currentIndex}`}
        className="premium-hero-image-reveal"
        aria-hidden="true"
      />

      {/* Main content */}

      <div className="container premium-hero-inner">
        <div
          key={`copy-${activeSlide.id}-${currentIndex}`}
          className="premium-hero-copy"
        >
          <div className="premium-hero-eyebrow">
            Game On Garb
          </div>

          <h1 className="display premium-hero-title">
            {activeSlide.title}
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

              <span
                aria-hidden="true"
                className="premium-hero-cta-arrow"
              >
                →
              </span>
            </Link>
          ) : null}
        </div>
      </div>

      {/* Desktop arrows */}

      {preparedSlides.length >
      1 ? (
        <>
          <button
            type="button"
            className="premium-hero-arrow premium-hero-arrow-left desktop-only"
            aria-label="Previous hero slide"
            onClick={
              previousSlide
            }
          >
            <ChevronLeft
              size={21}
              strokeWidth={1.6}
            />
          </button>

          <button
            type="button"
            className="premium-hero-arrow premium-hero-arrow-right desktop-only"
            aria-label="Next hero slide"
            onClick={nextSlide}
          >
            <ChevronRight
              size={21}
              strokeWidth={1.6}
            />
          </button>
        </>
      ) : null}

      {/* Slider dots */}

      {preparedSlides.length >
      1 ? (
        <div
          className="premium-hero-dots"
          role="tablist"
          aria-label="Hero slides"
        >
          {preparedSlides.map(
            (slide, index) => {
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
      ) : null}
    </section>
  );
}