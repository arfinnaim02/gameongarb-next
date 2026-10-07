import type {
  Metadata,
} from "next";

import {
  PromotionPopupManager,
} from "@/components/admin/promotion-popup-manager";

export const metadata: Metadata = {
  title:
    "Promotion Popup | Game On Garb Admin",
};

export const dynamic =
  "force-dynamic";

export default function PromotionPopupPage() {
  return (
    <PromotionPopupManager />
  );
}