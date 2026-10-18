"use client";

import type {
  CSSProperties,
} from "react";

type AnnouncementItem = {
  id:
    string;

  badge:
    string;

  text:
    string;

  ctaLabel:
    string;

  href:
    string;

  enabled:
    boolean;
};

type AnnouncementSettings = {
  enabled:
    boolean;

  speedSeconds:
    number;

  items:
    AnnouncementItem[];
};

const DEFAULT_SETTINGS:
  AnnouncementSettings = {
  enabled:
    false,

  speedSeconds:
    28,

  items: [],
};

function normalizeSettings(
  value:
    unknown,
):
  AnnouncementSettings {
  if (
    !value ||
    typeof value !==
      "object"
  ) {
    return DEFAULT_SETTINGS;
  }

  const input =
    value as {
      enabled?:
        unknown;

      speedSeconds?:
        unknown;

      items?:
        unknown;
    };

  const items =
    Array.isArray(
      input.items,
    )
      ? input.items
          .map(
            (
              item,
              index,
            ) => {
              if (
                !item ||
                typeof item !==
                  "object"
              ) {
                return null;
              }

              const entry =
                item as Record<
                  string,
                  unknown
                >;

              return {
                id:
                  typeof entry.id ===
                  "string"
                    ? entry.id
                    : `announcement-${index}`,

                badge:
                  typeof entry.badge ===
                  "string"
                    ? entry.badge
                    : "",

                text:
                  typeof entry.text ===
                  "string"
                    ? entry.text
                    : "",

                ctaLabel:
                  typeof entry.ctaLabel ===
                  "string"
                    ? entry.ctaLabel
                    : "",

                href:
                  typeof entry.href ===
                  "string"
                    ? entry.href
                    : "/shop",

                enabled:
                  typeof entry.enabled ===
                  "boolean"
                    ? entry.enabled
                    : true,
              };
            },
          )
          .filter(
            (
              item,
            ):
              item is
                AnnouncementItem =>
              Boolean(
                item &&
                item.text
                  .trim(),
              ),
          )
      : [];

  return {
    enabled:
      input.enabled ===
      true,

    speedSeconds:
      typeof input.speedSeconds ===
        "number" &&
      Number.isFinite(
        input.speedSeconds,
      )
        ? Math.min(
            90,
            Math.max(
              8,
              input.speedSeconds,
            ),
          )
        : 28,

    items,
  };
}

export function AnnouncementBar({
  value,
}: {
  value:
    unknown;
}) {
  const settings =
    normalizeSettings(
      value,
    );

  const activeItems =
    settings.items.filter(
      (
        item,
      ) =>
        item.enabled &&
        item.text.trim(),
    );

  if (
    !settings.enabled ||
    activeItems.length ===
      0
  ) {
    return null;
  }

  const repeatedItems =
    [
      ...activeItems,
      ...activeItems,
    ];

  const style = {
    "--announcement-duration":
      `${settings.speedSeconds}s`,
  } as CSSProperties;

  return (
    <aside
      className="announcement-bar"
      aria-label="Store announcements"
    >
      <div
        className="announcement-bar-viewport"
        style={
          style
        }
      >
        <div className="announcement-bar-track">
          {repeatedItems.map(
            (
              item,
              index,
            ) => (
              <a
                key={`${item.id}-${index}`}
                href={
                  item.href ||
                  "/shop"
                }
                className="announcement-bar-item"
              >
                {item.badge ? (
                  <span className="announcement-bar-badge">
                    {
                      item.badge
                    }
                  </span>
                ) : null}

                <span className="announcement-bar-text">
                  {
                    item.text
                  }
                </span>

                {item.ctaLabel ? (
                  <span className="announcement-bar-cta">
                    {
                      item.ctaLabel
                    }
                  </span>
                ) : null}
              </a>
            ),
          )}
        </div>
      </div>
    </aside>
  );
}