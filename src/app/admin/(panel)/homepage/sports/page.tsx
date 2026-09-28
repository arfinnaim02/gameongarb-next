import type {
  Metadata,
} from "next";

import {
  HomepageCampaignManager,
} from "@/components/admin/homepage-campaign-manager";

export const metadata: Metadata = {
  title:
    "Sports Campaign | Game On Garb Admin",
};

export const dynamic =
  "force-dynamic";

export default function SportsCampaignPage() {
  return (
    <HomepageCampaignManager
      kind="sports"
      title="Sports Campaign"
      eyebrow="Sports"
      defaultHeading="Built to move."
      defaultSubtitle="Performance for every day."
      defaultCtaLabel="Explore Sports"
      defaultCtaLink="/shop?category=sports"
    />
  );
}