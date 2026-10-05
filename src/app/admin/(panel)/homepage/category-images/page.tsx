import type {
  Metadata,
} from "next";

import {
  CategoryImageManager,
} from "@/components/admin/category-image-manager";

export const metadata: Metadata = {
  title:
    "Category Images | Game On Garb Admin",
};

export const dynamic =
  "force-dynamic";

export default function CategoryImagesPage() {
  return (
    <CategoryImageManager />
  );
}