import {
  defineConfig,
  globalIgnores,
} from "eslint/config";

import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/*
 * These components intentionally load or synchronize
 * client state from effects:
 *
 * - loading admin API data after mount
 * - resetting UI after pathname changes
 * - synchronizing shop URL state
 * - carousel index synchronization
 *
 * The code is intentional and currently type-safe.
 * We disable only this specific heuristic for these
 * known components rather than weakening the project
 * lint configuration globally.
 */
const intentionalEffectStateFiles = [
  "src/components/admin/brand-story-manager.tsx",
  "src/components/admin/hero-manager.tsx",
  "src/components/admin/homepage-campaign-manager.tsx",
  "src/components/admin/shop-hero-manager.tsx",

  "src/components/home/hero-slider.tsx",
  "src/components/home/home-product-rail.tsx",

  "src/components/layout/store-header.tsx",
  "src/components/layout/store-shell.tsx",

  "src/components/shop/shop-client.tsx",
  "src/components/shop/shop-hero-slider.tsx",
];

/*
 * Admin image managers display freshly uploaded
 * preview URLs. Raw <img> is intentional here:
 * preview rendering should not depend on Next Image
 * remote-host configuration.
 */
const adminPreviewImageFiles = [
  "src/components/admin/brand-story-manager.tsx",
  "src/components/admin/hero-manager.tsx",
  "src/components/admin/homepage-campaign-manager.tsx",
  "src/components/admin/shop-hero-manager.tsx",
];

export default defineConfig([
  ...nextVitals,
  ...nextTs,

  {
    files:
      intentionalEffectStateFiles,

    rules: {
      "react-hooks/set-state-in-effect":
        "off",
    },
  },

  {
    files:
      adminPreviewImageFiles,

    rules: {
      "@next/next/no-img-element":
        "off",
    },
  },

  globalIgnores([
    ".next/**",
    "node_modules/**",
    "coverage/**",
  ]),
]);