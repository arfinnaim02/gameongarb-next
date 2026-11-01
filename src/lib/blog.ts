import sanitizeHtml from "sanitize-html";
import { z } from "zod";

import type {
  AdminBlogPost,
} from "@/lib/admin-blog-types";

export const blogPostSchema =
  z.object({
    id:
      z.string().optional(),

    title:
      z.string().trim().min(
        3,
        "Blog title is required.",
      ).max(180),

    slug:
      z.string().trim().min(
        3,
        "Slug is required.",
      ).max(190).regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Use lowercase letters, numbers and hyphens only.",
      ),

    excerpt:
      z.string().trim().max(500).default(
        "",
      ),

    content:
      z.string().trim().min(
        20,
        "Write the blog content before saving.",
      ),

    featuredImage:
      z.string().trim().max(2000).default(
        "",
      ),

    featuredImageId:
      z.string().trim().max(500).default(
        "",
      ),

    featuredImageAlt:
      z.string().trim().max(180).default(
        "",
      ),

    category:
      z.string().trim().max(80).default(
        "",
      ),

    status:
      z.enum([
        "DRAFT",
        "PUBLISHED",
        "ARCHIVED",
      ]),

    featured:
      z.boolean().default(
        false,
      ),

    seoTitle:
      z.string().trim().max(70).default(
        "",
      ),

    seoDescription:
      z.string().trim().max(180).default(
        "",
      ),
  });

export function serializeBlogPost(
  post: {
    id: string;
    title: string;
    slug: string;
    excerpt: string | null;
    content: string;
    featuredImage: string | null;
    featuredImageId: string | null;
    featuredImageAlt: string | null;
    category: string | null;
    status:
      "DRAFT" |
      "PUBLISHED" |
      "ARCHIVED";
    featured: boolean;
    seoTitle: string | null;
    seoDescription: string | null;
    publishedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  },
): AdminBlogPost {
  return {
    id:
      post.id,
    title:
      post.title,
    slug:
      post.slug,
    excerpt:
      post.excerpt ?? "",
    content:
      post.content,
    featuredImage:
      post.featuredImage ?? "",
    featuredImageId:
      post.featuredImageId ?? "",
    featuredImageAlt:
      post.featuredImageAlt ?? "",
    category:
      post.category ?? "",
    status:
      post.status,
    featured:
      post.featured,
    seoTitle:
      post.seoTitle ?? "",
    seoDescription:
      post.seoDescription ?? "",
    publishedAt:
      post.publishedAt?.toISOString() ??
      null,
    createdAt:
      post.createdAt.toISOString(),
    updatedAt:
      post.updatedAt.toISOString(),
  };
}

export function sanitizeBlogContent(
  html:
    string,
) {
  return sanitizeHtml(
    html,
    {
      allowedTags: [
        "p",
        "br",
        "strong",
        "b",
        "em",
        "i",
        "u",
        "s",
        "h2",
        "h3",
        "ul",
        "ol",
        "li",
        "blockquote",
        "a",
        "hr",
        "span",
      ],

      allowedAttributes: {
        a: [
          "href",
          "target",
          "rel",
        ],

        span: [
          "style",
        ],
      },

      allowedStyles: {
        "*": {
          color: [
            /^#[0-9a-fA-F]{6}$/,
            /^rgb\(/,
          ],
        },
      },

      allowedSchemes: [
        "http",
        "https",
        "mailto",
      ],

      transformTags: {
        a:
          sanitizeHtml.simpleTransform(
            "a",
            {
              rel:
                "noopener noreferrer",
            },
          ),
      },
    },
  );
}

export function blogReadingMinutes(
  html:
    string,
) {
  const text =
    html.replace(
      /<[^>]*>/g,
      " ",
    );

  const words =
    text
      .trim()
      .split(
        /\s+/,
      )
      .filter(
        Boolean,
      ).length;

  return Math.max(
    1,
    Math.ceil(
      words /
        220,
    ),
  );
}
