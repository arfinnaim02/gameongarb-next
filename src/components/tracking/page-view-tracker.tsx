"use client";

import {
  useEffect,
} from "react";

import {
  usePathname,
} from "next/navigation";

import {
  trackPageView,
} from "@/lib/tracking";

export function PageViewTracker() {
  const pathname =
    usePathname();

  useEffect(
    () => {
      trackPageView();
    },

    [
      pathname,
    ],
  );

  return null;
}