import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .max(500)
  .optional()
  .nullable();

const optionalUrl = z
  .string()
  .trim()
  .max(2000)
  .optional()
  .nullable();

export const shopHeroSlideCreateSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required.")
    .max(120),

  subtitle: optionalText,

  image: z
    .string()
    .trim()
    .min(1, "Desktop image is required."),

  imagePublicId: z
    .string()
    .trim()
    .max(500)
    .optional()
    .nullable(),

  mobileImage: optionalUrl,

  mobileImagePublicId: z
    .string()
    .trim()
    .max(500)
    .optional()
    .nullable(),

  ctaLabel: z
    .string()
    .trim()
    .max(80)
    .optional()
    .nullable(),

  ctaLink: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .nullable(),

  enabled: z
    .boolean()
    .default(true),
});

export const shopHeroSlideUpdateSchema =
  shopHeroSlideCreateSchema.partial();

export const shopHeroReorderSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().min(1),

        sortOrder: z
          .number()
          .int()
          .min(0),
      }),
    )
    .min(1)
    .max(100),
});