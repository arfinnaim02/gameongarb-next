"use client";

import Link from "next/link";

import {
  X,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

import styles from "./promotion-popup.module.css";

const SESSION_KEY =
  "gog_home_promotion_popup_seen";

/*
 * Module state survives normal Next.js
 * client navigation, but resets after a
 * real browser refresh.
 *
 * This lets us distinguish:
 *
 * client navigation → keep popup hidden
 * hard refresh      → allow popup again
 */
let reloadHandled =
  false;

type PromotionPopupProps = {
  enabled:
    boolean;

  image:
    string |
    null;

  redirectLink:
    string |
    null;

  delayMs:
    number;
};

export function PromotionPopup({
  enabled,
  image,
  redirectLink,
  delayMs,
}: PromotionPopupProps) {
  const [
    visible,
    setVisible,
  ] =
    useState(
      false,
    );

  useEffect(
    () => {
      if (
        !enabled ||
        !image
      ) {
        return;
      }

      /*
       * A real browser reload should
       * make the popup eligible again.
       *
       * This only runs once per loaded
       * document. Normal Next.js route
       * navigation will not clear it.
       */
      if (
        !reloadHandled
      ) {
        reloadHandled =
          true;

        const navigationEntry =
          window.performance
            .getEntriesByType(
              "navigation",
            )[0] as
              PerformanceNavigationTiming |
              undefined;

        if (
          navigationEntry
            ?.type ===
          "reload"
        ) {
          window.sessionStorage
            .removeItem(
              SESSION_KEY,
            );
        }
      }

      const alreadySeen =
        window.sessionStorage
          .getItem(
            SESSION_KEY,
          );

      if (
        alreadySeen
      ) {
        return;
      }

      const safeDelay =
        Number.isFinite(
          delayMs,
        )
          ? Math.max(
              0,
              delayMs,
            )
          : 1400;

      const timer =
        window.setTimeout(
          () => {
            /*
             * Mark as seen when it is
             * actually shown.
             *
             * This prevents it from
             * showing again during
             * normal SPA navigation.
             */
            window.sessionStorage
              .setItem(
                SESSION_KEY,
                "1",
              );

            setVisible(
              true,
            );

            document.body
              .classList
              .add(
                "promotion-popup-open",
              );
          },

          safeDelay,
        );

      return () => {
        window.clearTimeout(
          timer,
        );

        document.body
          .classList
          .remove(
            "promotion-popup-open",
          );
      };
    },
    [
      delayMs,
      enabled,
      image,
    ],
  );

  useEffect(
    () => {
      if (
        !visible
      ) {
        return;
      }

      function handleKeyDown(
        event:
          KeyboardEvent,
      ) {
        if (
          event.key ===
          "Escape"
        ) {
          closePopup();
        }
      }

      window.addEventListener(
        "keydown",
        handleKeyDown,
      );

      return () => {
        window.removeEventListener(
          "keydown",
          handleKeyDown,
        );
      };
    },
    [
      visible,
    ],
  );

  function closePopup() {
    setVisible(
      false,
    );

    document.body
      .classList
      .remove(
        "promotion-popup-open",
      );
  }

  if (
    !visible ||
    !enabled ||
    !image
  ) {
    return null;
  }

  const destination =
    redirectLink
      ?.trim() ||
    "/shop";

  return (
    <div
      className={
        styles.overlay
      }
      role="dialog"
      aria-modal="true"
      aria-label="Game On Garb promotion"
      onMouseDown={(
        event,
      ) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          closePopup();
        }
      }}
    >
      <div
        className={
          styles.modal
        }
      >
        <button
          type="button"
          aria-label="Close promotion"
          className={
            styles.close
          }
          onClick={
            closePopup
          }
        >
          <X
            size={
              19
            }
          />
        </button>

        <Link
          href={
            destination
          }
          className={
            styles.banner
          }
          onClick={() => {
            document.body
              .classList
              .remove(
                "promotion-popup-open",
              );
          }}
        >
          <img
            src={
              image
            }
            alt="Game On Garb promotion"
            draggable={
              false
            }
          />
        </Link>
      </div>
    </div>
  );
}