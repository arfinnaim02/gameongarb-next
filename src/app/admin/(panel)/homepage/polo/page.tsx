import type {
  Metadata,
} from "next";

import {
  HomepageCampaignManager,
} from "@/components/admin/homepage-campaign-manager";

export const metadata: Metadata = {
  title:
    "Polo Campaign | Game On Garb Admin",
};

export const dynamic =
  "force-dynamic";

export default function PoloCampaignPage() {
  return (
    <HomepageCampaignManager
      kind="polo"
      title="Polo Campaign"
      eyebrow="Polo"
      defaultHeading="Made for every day."
      defaultSubtitle="Polished, relaxed and ready."
      defaultCtaLabel="Explore Polo"
      defaultCtaLink="/shop?category=polo"
    />
  );
}