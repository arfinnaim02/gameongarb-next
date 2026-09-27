"use client";

import Link from "next/link";

import {
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

type ShopHeroSlide = {
  id: string;
  title: string;
  subtitle: string | null;

  image: string;
  mobileImage: string | null;

  ctaLabel: string | null;
  ctaLink: string | null;

  enabled: boolean;
  sortOrder: number;
};

type ShopHeroSliderProps = {
  slides: ShopHeroSlide[];
};

export function ShopHeroSlider({
  slides,
}: ShopHeroSliderProps) {
  const availableSlides =
    useMemo(
      () =>
        slides.filter(
          (slide) =>
            slide.enabled &&
            slide.image,
        ),
      [slides],
    );

  const [index, setIndex] =
    useState(0);

  const [paused, setPaused] =
    useState(false);

  useEffect(() => {
    if (
      availableSlides.length <=
        1 ||
      paused
    ) {
      return;
    }

    const timer =
      window.setInterval(
        () => {
          setIndex(
            (current) =>
              (current + 1) %
              availableSlides.length,
          );
        },
        6500,
      );

    return () =>
      window.clearInterval(
        timer,
      );
  }, [
    availableSlides.length,
    paused,
  ]);

  useEffect(() => {
    if (
      index >=
      availableSlides.length
    ) {
      setIndex(0);
    }
  }, [
    index,
    availableSlides.length,
  ]);

  if (
    !availableSlides.length
  ) {
    return (
      <section className="shop-hero shop-hero-fallback">
        <div className="container shop-hero-inner">
          <div className="shop-hero-copy">
            <span className="shop-hero-eyebrow">
              Game On Garb
            </span>

            <h1>
              Shop
            </h1>

            <p>
              Premium styles
              for your
              everyday game.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const active =
    availableSlides[index];

  function previous() {
    setIndex(
      (current) =>
        (current -
          1 +
          availableSlides.length) %
        availableSlides.length,
    );
  }

  function next() {
    setIndex(
      (current) =>
        (current + 1) %
        availableSlides.length,
    );
  }

  const style = {
    "--shop-hero-image":
      `url("${active.image}")`,

    "--shop-hero-mobile-image":
      `url("${
        active.mobileImage ||
        active.image
      }")`,
  } as React.CSSProperties;

  return (
    <section
      key={active.id}
      className="shop-hero"
      style={style}
      onMouseEnter={() =>
        setPaused(true)
      }
      onMouseLeave={() =>
        setPaused(false)
      }
    >
      <div className="shop-hero-overlay" />

      <div className="container shop-hero-inner">
        <div className="shop-hero-copy">
          <span className="shop-hero-eyebrow">
            Game On Garb
          </span>

          <h1>
            {active.title}
          </h1>

          {active.subtitle ? (
            <p>
              {
                active.subtitle
              }
            </p>
          ) : null}

          {active.ctaLabel &&
          active.ctaLink ? (
            <Link
              href={
                active.ctaLink
              }
              className="shop-hero-cta"
            >
              {
                active.ctaLabel
              }

              <span>
                →
              </span>
            </Link>
          ) : null}
        </div>
      </div>

      {availableSlides.length >
      1 ? (
        <>
          <button
            type="button"
            aria-label="Previous banner"
            className="shop-hero-arrow shop-hero-arrow-left"
            onClick={
              previous
            }
          >
            <ChevronLeft
              size={20}
            />
          </button>

          <button
            type="button"
            aria-label="Next banner"
            className="shop-hero-arrow shop-hero-arrow-right"
            onClick={
              next
            }
          >
            <ChevronRight
              size={20}
            />
          </button>

          <div className="shop-hero-dots">
            {availableSlides.map(
              (
                slide,
                slideIndex,
              ) => (
                <button
                  key={
                    slide.id
                  }
                  type="button"
                  aria-label={`Show banner ${
                    slideIndex +
                    1
                  }`}
                  className={`shop-hero-dot ${
                    slideIndex ===
                    index
                      ? "is-active"
                      : ""
                  }`}
                  onClick={() =>
                    setIndex(
                      slideIndex,
                    )
                  }
                />
              ),
            )}
          </div>
        </>
      ) : null}
    </section>
  );
}