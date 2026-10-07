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

      if (
        window.sessionStorage
          .getItem(
            SESSION_KEY,
          )
      ) {
        return;
      }

      const timer =
        window.setTimeout(
          () => {
            setVisible(
              true,
            );

            document.body
              .classList
              .add(
                "promotion-popup-open",
              );
          },
          delayMs,
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

      return () =>
        window.removeEventListener(
          "keydown",
          handleKeyDown,
        );
    },
    [
      visible,
    ],
  );

  function closePopup() {
    setVisible(
      false,
    );

    window.sessionStorage
      .setItem(
        SESSION_KEY,
        "1",
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
    redirectLink?.trim() ||
    "/shop";

  return (
    <div
      className={
        styles.overlay
      }
      role="dialog"
      aria-modal="true"
      aria-label="Game On Garb promotion"
      onMouseDown={
        (
          event,
        ) => {
          if (
            event.target ===
            event.currentTarget
          ) {
            closePopup();
          }
        }
      }
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
            window.sessionStorage
              .setItem(
                SESSION_KEY,
                "1",
              );

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