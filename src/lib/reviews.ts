import {
  z,
} from "zod";

export const reviewStatusValues = [
  "PENDING",
  "APPROVED",
  "REJECTED",
] as const;

export const reviewSourceValues = [
  "WEBSITE",
  "ADMIN",
] as const;

export const reviewInputSchema =
  z.object({
    customerName:
      z
        .string()
        .trim()
        .min(
          2,
          "Customer name is required.",
        )
        .max(
          100,
        ),

    customerEmail:
      z
        .string()
        .trim()
        .email(
          "Enter a valid email address.",
        )
        .optional()
        .or(
          z.literal(""),
        ),

    customerPhone:
      z
        .string()
        .trim()
        .max(
          30,
        )
        .optional()
        .or(
          z.literal(""),
        ),

    rating:
      z.coerce
        .number()
        .int()
        .min(
          1,
        )
        .max(
          5,
        ),

    title:
      z
        .string()
        .trim()
        .max(
          120,
        )
        .optional()
        .or(
          z.literal(""),
        ),

    body:
      z
        .string()
        .trim()
        .min(
          5,
          "Please write a short review.",
        )
        .max(
          1500,
        ),

    productId:
      z
        .string()
        .trim()
        .optional()
        .or(
          z.literal(""),
        ),

    orderNumber:
      z
        .string()
        .trim()
        .max(
          40,
        )
        .optional()
        .or(
          z.literal(""),
        ),

    featured:
      z.coerce
        .boolean()
        .optional()
        .default(
          false,
        ),

    status:
      z
        .enum(
          reviewStatusValues,
        )
        .optional()
        .default(
          "PENDING",
        ),

    sortOrder:
      z.coerce
        .number()
        .int()
        .min(
          0,
        )
        .max(
          100000,
        )
        .optional()
        .default(
          0,
        ),
  });

export type PublicReview = {
  id: string;
  customerName: string;
  rating: number;
  title:
    string | null;
  body:
    string | null;
  verifiedPurchase:
    boolean;
  product:
    | {
        name:
          string;
        slug:
          string;
      }
    | null;
  images: {
    id: string;
    url: string;
  }[];
  createdAt:
    string;
};

export function serializePublicReview(
  review: {
    id: string;
    customerName:
      string;
    rating:
      number;
    title:
      string | null;
    body:
      string | null;
    verifiedPurchase:
      boolean;
    product?:
      | {
          name:
            string;
          slug:
            string;
        }
      | null;
    images?:
      {
        id:
          string;
        url:
          string;
      }[];
    createdAt:
      Date;
  },
): PublicReview {
  return {
    id:
      review.id,

    customerName:
      review.customerName,

    rating:
      review.rating,

    title:
      review.title,

    body:
      review.body,

    verifiedPurchase:
      review.verifiedPurchase,

    product:
      review.product ??
      null,

    images:
      review.images ??
      [],

    createdAt:
      review.createdAt.toISOString(),
  };
}

export function ratingSummary(
  rows:
    {
      rating:
        number;
    }[],
) {
  const count =
    rows.length;

  if (
    count ===
    0
  ) {
    return {
      count:
        0,
      average:
        0,
    };
  }

  const average =
    rows.reduce(
      (
        total,
        review,
      ) =>
        total +
        review.rating,
      0,
    ) /
    count;

  return {
    count,
    average:
      Math.round(
        average *
          10,
      ) /
      10,
  };
}
