import type {
  Metadata,
} from "next";

import Image from "next/image";
import Link from "next/link";

import {
  ArrowLeft,
  ArrowUpRight,
  Clock3,
} from "lucide-react";

import {
  notFound,
} from "next/navigation";

import {
  blogReadingMinutes,
  sanitizeBlogContent,
} from "@/lib/blog";

import {
  db,
} from "@/lib/db";

import styles from "./blog-post.module.css";

export const dynamic =
  "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params:
    Promise<{
      slug:
        string;
    }>;
}): Promise<Metadata> {
  const {
    slug,
  } =
    await params;

  const post =
    await db.blogPost.findFirst({
      where: {
        slug,

        status:
          "PUBLISHED",

        publishedAt: {
          lte:
            new Date(),
        },
      },
    });

  if (
    !post
  ) {
    return {
      title:
        "Blog | GameOn Garb",
    };
  }

  const title =
    post.seoTitle ||
    post.title;

  const description =
    post.seoDescription ||
    post.excerpt ||
    undefined;

  return {
    title,

    description,

    alternates: {
      canonical:
        `/blog/${post.slug}`,
    },

    openGraph: {
      title,

      description,

      type:
        "article",

      url:
        `/blog/${post.slug}`,

      publishedTime:
        post.publishedAt?.toISOString(),

      modifiedTime:
        post.updatedAt.toISOString(),

      images:
        post.featuredImage
          ? [
              {
                url:
                  post.featuredImage,

                alt:
                  post.featuredImageAlt ||
                  post.title,
              },
            ]
          : undefined,
    },

    twitter: {
      card:
        "summary_large_image",

      title,

      description,

      images:
        post.featuredImage
          ? [
              post.featuredImage,
            ]
          : undefined,
    },
  };
}

function formatDate(
  date:
    Date |
    null,
) {
  if (
    !date
  ) {
    return "";
  }

  return new Intl.DateTimeFormat(
    "en-BD",
    {
      day:
        "numeric",

      month:
        "long",

      year:
        "numeric",
    },
  ).format(
    date,
  );
}

export default async function BlogPostPage({
  params,
}: {
  params:
    Promise<{
      slug:
        string;
    }>;
}) {
  const {
    slug,
  } =
    await params;

  const post =
    await db.blogPost.findFirst({
      where: {
        slug,

        status:
          "PUBLISHED",

        publishedAt: {
          lte:
            new Date(),
        },
      },
    });

  if (
    !post
  ) {
    notFound();
  }

  const related =
    await db.blogPost.findMany({
      where: {
        id: {
          not:
            post.id,
        },

        status:
          "PUBLISHED",

        publishedAt: {
          lte:
            new Date(),
        },

        ...(post.category
          ? {
              category:
                post.category,
            }
          : {}),
      },

      orderBy: {
        publishedAt:
          "desc",
      },

      take:
        3,
    });

  const cleanContent =
    sanitizeBlogContent(
      post.content,
    );

  const base =
    process.env.APP_URL ??
    "https://www.gameongarb.com";

  const articleSchema = {
    "@context":
      "https://schema.org",

    "@type":
      "BlogPosting",

    headline:
      post.title,

    description:
      post.seoDescription ||
      post.excerpt ||
      undefined,

    image:
      post.featuredImage
        ? [
            post.featuredImage,
          ]
        : undefined,

    datePublished:
      post.publishedAt?.toISOString(),

    dateModified:
      post.updatedAt.toISOString(),

    mainEntityOfPage: {
      "@type":
        "WebPage",

      "@id":
        `${base}/blog/${post.slug}`,
    },

    publisher: {
      "@type":
        "Organization",

      name:
        "GameOn Garb",

      url:
        base,

      logo: {
        "@type":
          "ImageObject",

        url:
          `${base}/images/brand/gameongarb-email-logo.png`,
      },
    },
  };

  return (
    <main
      className={
        styles.page
      }
    >
      <article>
        <header
          className={
            styles.header
          }
        >
          <div
            className={`container ${styles.headerInner}`}
          >
            <Link
              href="/blog"
              className={
                styles.back
              }
            >
              <ArrowLeft
                size={
                  15
                }
              />
              Back to Blog
            </Link>

            <div
              className={
                styles.meta
              }
            >
              <span>
                {post.category ||
                  "GameOn Garb Journal"}
              </span>

              <span>
                {formatDate(
                  post.publishedAt,
                )}
              </span>

              <span>
                <Clock3
                  size={
                    13
                  }
                />

                {blogReadingMinutes(
                  post.content,
                )} min read
              </span>
            </div>

            <h1>
              {post.title}
            </h1>

            {post.excerpt ? (
              <p
                className={
                  styles.excerpt
                }
              >
                {post.excerpt}
              </p>
            ) : null}
          </div>
        </header>

        {post.featuredImage ? (
          <div
            className={`container ${styles.heroImageWrap}`}
          >
            <div
              className={
                styles.heroImage
              }
            >
              <Image
                src={
                  post.featuredImage
                }
                alt={
                  post.featuredImageAlt ||
                  post.title
                }
                fill
                priority
                sizes="(max-width: 1000px) 100vw, 1100px"
              />
            </div>
          </div>
        ) : null}

        <div
          className={`container ${styles.articleGrid}`}
        >
          <aside
            className={
              styles.aside
            }
          >
            <span>
              GameOn Garb
            </span>

            <strong>
              Experience the
              thrill.
            </strong>

            <Link
              href="/shop"
            >
              Shop Collection
              <ArrowUpRight
                size={
                  14
                }
              />
            </Link>
          </aside>

          <div
            className={
              styles.body
            }
            dangerouslySetInnerHTML={{
              __html:
                cleanContent,
            }}
          />
        </div>
      </article>

      {related.length ? (
        <section
          className={
            styles.related
          }
        >
          <div
            className="container"
          >
            <div
              className={
                styles.relatedHeading
              }
            >
              <span>
                Keep reading
              </span>

              <h2>
                Related stories
              </h2>
            </div>

            <div
              className={
                styles.relatedGrid
              }
            >
              {related.map(
                (
                  item,
                ) => (
                  <Link
                    key={
                      item.id
                    }
                    href={`/blog/${item.slug}`}
                    className={
                      styles.relatedCard
                    }
                  >
                    <div
                      className={
                        styles.relatedImage
                      }
                    >
                      {item.featuredImage ? (
                        <Image
                          src={
                            item.featuredImage
                          }
                          alt={
                            item.featuredImageAlt ||
                            item.title
                          }
                          fill
                          sizes="(max-width: 700px) 100vw, 33vw"
                        />
                      ) : null}
                    </div>

                    <span>
                      {item.category ||
                        "Journal"}
                    </span>

                    <h3>
                      {item.title}
                    </h3>
                  </Link>
                ),
              )}
            </div>
          </div>
        </section>
      ) : null}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html:
            JSON.stringify(
              articleSchema,
            ),
        }}
      />
    </main>
  );
}
