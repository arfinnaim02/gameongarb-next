import type {
  Metadata,
} from "next";

import {
  CategoryImageManager,
} from "@/components/admin/category-image-manager";

export const metadata: Metadata = {
  title:
    "Category Images | GameOn Garb Admin",
};

export const dynamic =
  "force-dynamic";

export default function CategoryImagesPage() {
  return (
    <CategoryImageManager />
  );
}