import Image from "next/image";
import Link from "next/link";

import type {
  PublicReview,
} from "@/lib/reviews";

export function ReviewCard({
  review,
  compact = false,
}: {
  review:
    PublicReview;

  compact?:
    boolean;
}) {
  const primaryImage =
    review.images[0];

  return (
    <article
      className={
        compact
          ? "customer-review-card is-compact"
          : "customer-review-card"
      }
    >
      {primaryImage ? (
        <div className="customer-review-media">
          <Image
            src={
              primaryImage.url
            }
            alt={
              review.customerName +
              " customer review"
            }
            fill
            sizes={
              compact
                ? "(max-width: 700px) 86vw, 260px"
                : "(max-width: 700px) 86vw, 360px"
            }
          />
        </div>
      ) : null}

      <div className="customer-review-content">
        <div className="customer-review-stars">
          <span>
            {"★".repeat(
              review.rating,
            )}
          </span>

          <span
            aria-hidden="true"
            className="customer-review-stars-muted"
          >
            {"★".repeat(
              5 -
                review.rating,
            )}
          </span>
        </div>

        {review.title ? (
          <h3>
            {
              review.title
            }
          </h3>
        ) : null}

        {review.body ? (
          <p>
            {
              review.body
            }
          </p>
        ) : null}

        <div className="customer-review-footer">
          <div>
            <strong>
              {
                review.customerName
              }
            </strong>

            {review.verifiedPurchase ? (
              <span>
                Verified Purchase
              </span>
            ) : null}
          </div>

          {review.product ? (
            <Link
              href={
                "/product/" +
                review.product.slug
              }
            >
              {
                review.product.name
              }
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}
