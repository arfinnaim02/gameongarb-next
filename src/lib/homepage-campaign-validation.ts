import {
  z,
} from "zod";

const nullableText = (
  max: number,
) =>
  z
    .union([
      z
        .string()
        .trim()
        .max(max),
      z.null(),
    ])
    .optional();

const nullableImage =
  z
    .union([
      z
        .string()
        .url(),
      z.null(),
    ])
    .optional();

export const homepageCampaignUpdateSchema =
  z
    .object({
      heading:
        nullableText(120),

      subtitle:
        nullableText(500),

      image:
        nullableImage,

      imagePublicId:
        nullableText(300),

      mobileImage:
        nullableImage,

      mobileImagePublicId:
        nullableText(300),

      ctaLabel:
        nullableText(80),

      ctaLink:
        nullableText(500),

      enabled:
        z
          .boolean()
          .optional(),
    })
    .strict();