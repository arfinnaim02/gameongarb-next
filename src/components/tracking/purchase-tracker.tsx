"use client";

import {
  useEffect,
} from "react";

import {
  trackPurchase,
} from "@/lib/tracking";

import type {
  TrackingItem,
} from "@/lib/tracking";

type PurchaseTrackerProps = {
  orderNumber:
    string;

  total:
    number;

  eligible:
    boolean;

  items:
    TrackingItem[];
};

export function PurchaseTracker({
  orderNumber,
  total,
  eligible,
  items,
}: PurchaseTrackerProps) {
  useEffect(
    () => {
      if (
        !eligible
      ) {
        return;
      }

      const storageKey =
        `gog-purchase-tracked:${orderNumber}`;

      try {
        if (
          window.localStorage
            .getItem(
              storageKey,
            )
        ) {
          return;
        }
      } catch {
        /*
         * Tracking should still work
         * when browser storage is
         * unavailable.
         */
      }

      const sent =
        trackPurchase({
          transactionId:
            orderNumber,

          value:
            total,

          items,
        });

      if (
        !sent
      ) {
        return;
      }

      try {
        window.localStorage
          .setItem(
            storageKey,
            new Date()
              .toISOString(),
          );
      } catch {
        /*
         * Storage failure must not
         * affect the success page.
         */
      }
    },

    [
      eligible,
      items,
      orderNumber,
      total,
    ],
  );

  return null;
}