import {
  notFound,
} from "next/navigation";

import {
  ReviewManager,
} from "@/components/admin/review-manager";

import {
  hasPermission,
} from "@/lib/business";

import {
  db,
} from "@/lib/db";

import {
  requireAdmin,
} from "@/lib/session";

export const dynamic =
  "force-dynamic";

export default async function ReviewsAdminPage() {
  const admin =
    await requireAdmin();

  if (
    !hasPermission(
      admin.role,
      "reviews",
    )
  ) {
    notFound();
  }

  const [
    reviews,
    products,
  ] =
    await Promise.all([
      db.review.findMany({
        orderBy: {
          createdAt:
            "desc",
        },

        include: {
          product: {
            select: {
              name:
                true,
            },
          },

          order: {
            select: {
              number:
                true,
            },
          },

          images: {
            orderBy: {
              sortOrder:
                "asc",
            },
          },
        },
      }),

      db.product.findMany({
        where: {
          status:
            "ACTIVE",
        },

        orderBy: {
          name:
            "asc",
        },

        select: {
          id:
            true,

          name:
            true,
        },
      }),
    ]);

  return (
    <ReviewManager
      initialReviews={
        reviews.map(
          (
            review,
          ) => ({
            id:
              review.id,

            customerName:
              review.customerName,

            customerEmail:
              review.customerEmail ??
              "",

            customerPhone:
              review.customerPhone ??
              "",

            rating:
              review.rating,

            title:
              review.title ??
              "",

            body:
              review.body ??
              "",

            productId:
              review.productId ??
              "",

            productName:
              review.product
                ?.name ??
              "",

            orderId:
              review.orderId ??
              "",

            orderNumber:
              review.order
                ?.number ??
              "",

            status:
              review.status,

            source:
              review.source,

            featured:
              review.featured,

            verifiedPurchase:
              review.verifiedPurchase,

            sortOrder:
              review.sortOrder,

            images:
              review.images.map(
                (
                  image,
                ) => ({
                  id:
                    image.id,

                  url:
                    image.url,

                  publicId:
                    image.publicId,
                }),
              ),

            createdAt:
              review.createdAt.toISOString(),

            updatedAt:
              review.updatedAt.toISOString(),
          }),
        )
      }

      products={
        products
      }
    />
  );
}
