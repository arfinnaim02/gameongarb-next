"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Pause, Play } from "lucide-react";
import { ProductCard } from "@/components/product/product-card";
import type { Product } from "@/lib/data";

type Direction = "right-to-left" | "left-to-right";

type HomeProductRailProps = {
  products: Product[];
  direction: Direction;
  label: string;
};

type ScrollEdges = {
  previous: boolean;
  next: boolean;
};

function getStep(element: HTMLDivElement) {
  const card = element.firstElementChild;
  if (!(card instanceof HTMLElement)) return 0;

  const gap = Number.parseFloat(getComputedStyle(element).columnGap) || 0;
  return card.getBoundingClientRect().width + gap;
}

function moveRail(element: HTMLDivElement, direction: -1 | 1) {
  const distance = getStep(element);
  if (!distance) return;

  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  element.scrollBy({
    left: distance * direction,
    behavior: reducedMotion ? "auto" : "smooth",
  });
}

export function HomeProductRail({
  products,
  direction,
  label,
}: HomeProductRailProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const hoveredRef = useRef(false);
  const [paused, setPaused] = useState(false);
  const [edges, setEdges] = useState<ScrollEdges>({
    previous: false,
    next: false,
  });

  const productKey = products.map((product) => product.id).join("|");
  const hasOverflow = edges.previous || edges.next;

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    let initialized = false;

    const updateEdges = () => {
      const maximum = Math.max(0, viewport.scrollWidth - viewport.clientWidth);

      setEdges({
        previous: viewport.scrollLeft > 2,
        next: viewport.scrollLeft < maximum - 2,
      });
    };

    const initialize = () => {
      const maximum = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
      viewport.scrollLeft = direction === "left-to-right" ? maximum : 0;
      initialized = true;
      updateEdges();
    };

    const observer = new ResizeObserver(() => {
      if (!initialized) initialize();
      else updateEdges();
    });

    observer.observe(viewport);
    viewport.addEventListener("scroll", updateEdges, { passive: true });

    requestAnimationFrame(initialize);

    return () => {
      observer.disconnect();
      viewport.removeEventListener("scroll", updateEdges);
    };
  }, [direction, productKey]);

  useEffect(() => {
    if (paused) return;

    const timer = window.setInterval(() => {
      const viewport = viewportRef.current;

      if (
        !viewport ||
        hoveredRef.current ||
        document.hidden ||
        viewport.contains(document.activeElement) ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        return;
      }

      const bounds = viewport.getBoundingClientRect();
      if (bounds.bottom <= 0 || bounds.top >= window.innerHeight) return;

      const maximum = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
      if (maximum <= 2) return;

      if (direction === "right-to-left") {
        if (viewport.scrollLeft >= maximum - 2) {
          viewport.scrollTo({ left: 0, behavior: "auto" });
        } else {
          moveRail(viewport, 1);
        }
      } else if (viewport.scrollLeft <= 2) {
        viewport.scrollTo({ left: maximum, behavior: "auto" });
      } else {
        moveRail(viewport, -1);
      }
    }, 3800);

    return () => window.clearInterval(timer);
  }, [direction, paused]);

  function navigate(directionToMove: -1 | 1) {
    setPaused(true);

    if (viewportRef.current) {
      moveRail(viewportRef.current, directionToMove);
    }
  }

  if (products.length === 0) {
    return (
      <p className="home-rail-empty">
        New pieces are on the way. Explore the shop for more.
      </p>
    );
  }

  return (
    <div
      className="home-product-rail"
      onMouseEnter={() => {
        hoveredRef.current = true;
      }}
      onMouseLeave={() => {
        hoveredRef.current = false;
      }}
      onFocusCapture={() => setPaused(true)}
      onPointerDownCapture={(event) => {
        if (event.pointerType !== "mouse") setPaused(true);
      }}
    >
      {hasOverflow && (
        <div className="home-rail-controls">
          <button
            type="button"
            className="home-rail-control"
            aria-label={`Scroll ${label} left`}
            disabled={!edges.previous}
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={16} aria-hidden="true" />
          </button>

          <button
            type="button"
            className="home-rail-control home-rail-play"
            aria-label={`${paused ? "Play" : "Pause"} ${label} automatic scrolling`}
            onClick={() => setPaused((current) => !current)}
          >
            {paused ? (
              <Play size={14} aria-hidden="true" />
            ) : (
              <Pause size={14} aria-hidden="true" />
            )}
          </button>

          <button
            type="button"
            className="home-rail-control"
            aria-label={`Scroll ${label} right`}
            disabled={!edges.next}
            onClick={() => navigate(1)}
          >
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>
      )}

      <div
        ref={viewportRef}
        className="home-rail-viewport"
        role="region"
        aria-label={label}
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;

          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            navigate(event.key === "ArrowLeft" ? -1 : 1);
          }
        }}
      >
        {products.map((product) => (
          <div className="home-rail-item" key={product.id}>
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </div>
  );
}
