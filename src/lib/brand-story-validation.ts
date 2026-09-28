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

export const brandStoryUpdateSchema =
  z
    .object({
      heading:
        nullableText(120),

      subtitle:
        nullableText(500),

      image:
        z
          .union([
            z
              .string()
              .url(),
            z.null(),
          ])
          .optional(),

      imagePublicId:
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

export type BrandStoryUpdateInput =
  z.infer<
    typeof brandStoryUpdateSchema
  >;