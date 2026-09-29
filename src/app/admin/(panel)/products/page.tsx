import {
  notFound,
} from "next/navigation";

import {
  ProductManager,
} from "@/components/admin/product-manager";

import {
  adminProductInclude,
  serializeAdminProduct,
} from "@/lib/admin-products";

import {
  db,
} from "@/lib/db";

import {
  hasPermission,
} from "@/lib/business";

import {
  requireAdmin,
} from "@/lib/session";

export const dynamic =
  "force-dynamic";

export default async function ProductsAdminPage() {
  const admin =
    await requireAdmin();

  if (
    !hasPermission(
      admin.role,
      "products",
    )
  ) {
    notFound();
  }

  const [
    products,
    categories,
  ] =
    await Promise.all([
      db.product.findMany({
        include:
          adminProductInclude,

        orderBy: {
          updatedAt:
            "desc",
        },
      }),

      db.category.findMany({
        where: {
          active:
            true,
        },

        orderBy: [
          {
            parentId:
              "asc",
          },
          {
            sortOrder:
              "asc",
          },
          {
            name:
              "asc",
          },
        ],

        select: {
          id:
            true,

          name:
            true,

          parentId:
            true,
        },
      }),
    ]);

  return (
    <ProductManager
      initialProducts={products.map(
        serializeAdminProduct,
      )}
      categories={
        categories
      }
    />
  );
}