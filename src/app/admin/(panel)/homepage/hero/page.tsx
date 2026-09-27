import type {
  Metadata,
} from "next";

import {
  HeroManager,
} from "@/components/admin/hero-manager";

export const metadata: Metadata = {
  title:
    "Hero Manager | Game On Garb Admin",
};

export const dynamic =
  "force-dynamic";

export default function HeroManagerPage() {
  return <HeroManager />;
}