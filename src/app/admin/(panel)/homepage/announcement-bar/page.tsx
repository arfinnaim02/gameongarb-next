import type {
  Metadata,
} from "next";

import {
  AnnouncementBarManager,
} from "@/components/admin/announcement-bar-manager";

export const metadata: Metadata = {
  title:
    "Announcement Bar | GameOn Garb Admin",
};

export const dynamic =
  "force-dynamic";

export default function AnnouncementBarPage() {
  return (
    <AnnouncementBarManager />
  );
}