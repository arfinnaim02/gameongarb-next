import type {
  Metadata,
} from "next";

import {
  CategoryManager,
} from "@/components/admin/category-manager";

import {
  db,
} from "@/lib/db";

export const metadata: Metadata = {
  title:
    "Categories | Game On Garb Admin",
};

export const dynamic =
  "force-dynamic";

export default async function CategoriesAdminPage() {
  const categories =
    await db.category.findMany({
      orderBy: [
        {
          sortOrder:
            "asc",
        },

        {
          name:
            "asc",
        },
      ],

      include: {
        parent: {
          select: {
            id:
              true,

            name:
              true,

            parentId:
              true,
          },
        },

        _count: {
          select: {
            products:
              true,

            children:
              true,
          },
        },
      },
    });

  const rows =
    categories.map(
      (
        category,
      ) => ({
        id:
          category.id,

        name:
          category.name,

        slug:
          category.slug,

        description:
          category.description,

        image:
          category.image,

        parentId:
          category.parentId,

        parent:
          category.parent,

        active:
          category.active,

        sortOrder:
          category.sortOrder,

        showInNavigation:
          category.showInNavigation,

        showOnHomepage:
          category.showOnHomepage,

        featured:
          category.featured,

        productCount:
          category._count
            .products,

        childCount:
          category._count
            .children,
      }),
    );

  return (
    <CategoryManager
      initialCategories={
        rows
      }
    />
  );
}