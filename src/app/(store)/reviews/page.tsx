import type {
  Metadata,
} from "next";

import {
  ReviewCard,
} from "@/components/reviews/review-card";

import {
  ReviewSubmitForm,
} from "@/components/reviews/review-submit-form";

import {
  db,
} from "@/lib/db";

import {
  ratingSummary,
  serializePublicReview,
} from "@/lib/reviews";

export const metadata:
  Metadata = {
  title:
    "Customer Reviews",

  description:
    "Read verified customer experiences and share your own GameOn Garb review.",
};

export const dynamic =
  "force-dynamic";

export default async function ReviewsPage() {
  const [
    reviews,
    products,
  ] =
    await Promise.all([
      db.review.findMany({
        where: {
          status:
            "APPROVED",

          approved:
            true,
        },

        orderBy: [
          {
            featured:
              "desc",
          },

          {
            sortOrder:
              "asc",
          },

          {
            createdAt:
              "desc",
          },
        ],

        include: {
          product: {
            select: {
              name:
                true,

              slug:
                true,
            },
          },

          images: {
            orderBy: {
              sortOrder:
                "asc",
            },

            select: {
              id:
                true,

              url:
                true,
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

  const summary =
    ratingSummary(
      reviews,
    );

  return (
    <div className="reviews-page">
      <section className="reviews-hero">
        <div className="container">
          <span className="eyebrow">
            Real Customers
          </span>

          <h1>
            Customer Reviews
          </h1>

          <p>
            Real experiences from the GameOn Garb community.
          </p>

          <div className="reviews-hero-rating">
            <strong>
              {
                summary.count
                  ? summary.average.toFixed(
                      1,
                    )
                  : "0.0"
              }
            </strong>

            <span>
              ★★★★★
            </span>

            <small>
              Based on{" "}
              {
                summary.count
              }{" "}
              approved review
              {summary.count ===
              1
                ? ""
                : "s"}
            </small>
          </div>
        </div>
      </section>

      <section className="container reviews-layout">
        <div className="reviews-list">
          {reviews.length >
          0 ? (
            reviews.map(
              (
                review,
              ) => (
                <ReviewCard
                  key={
                    review.id
                  }
                  review={
                    serializePublicReview(
                      review,
                    )
                  }
                />
              ),
            )
          ) : (
            <div className="reviews-empty">
              <h2>
                Be the first to review GameOn Garb.
              </h2>

              <p>
                Approved customer reviews will appear here.
              </p>
            </div>
          )}
        </div>

        <aside className="reviews-form-panel">
          <ReviewSubmitForm
            products={
              products
            }
          />
        </aside>
      </section>
    </div>
  );
}
