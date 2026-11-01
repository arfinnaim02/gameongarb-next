import type {
  Metadata,
} from "next";

import Image from "next/image";
import Link from "next/link";

import {
  ArrowUpRight,
  Clock3,
} from "lucide-react";

import {
  blogReadingMinutes,
} from "@/lib/blog";

import {
  db,
} from "@/lib/db";

import styles from "./blog.module.css";

export const dynamic =
  "force-dynamic";

export const metadata:
  Metadata = {
  title:
    "Blog",

  description:
    "Style guides, jersey care, sportswear tips and stories from GameOn Garb.",

  alternates: {
    canonical:
      "/blog",
  },

  openGraph: {
    title:
      "GameOn Garb Blog",

    description:
      "Style guides, jersey care, sportswear tips and stories from GameOn Garb.",

    url:
      "/blog",

    type:
      "website",
  },
};

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
        "short",

      year:
        "numeric",
    },
  ).format(
    date,
  );
}

export default async function BlogPage() {
  const posts =
    await db.blogPost.findMany({
      where: {
        status:
          "PUBLISHED",

        publishedAt: {
          lte:
            new Date(),
        },
      },

      orderBy: [
        {
          featured:
            "desc",
        },

        {
          publishedAt:
            "desc",
        },
      ],
    });

  const featured =
    posts[0];

  const rest =
    posts.slice(
      1,
    );

  return (
    <main
      className={
        styles.page
      }
    >
      <section
        className={
          styles.hero
        }
      >
        <div
          className="container"
        >
          <span
            className={
              styles.eyebrow
            }
          >
            GameOn Garb Journal
          </span>

          <h1>
            Style, sport &
            everything in
            between.
          </h1>

          <p>
            Practical guides,
            inspiration and
            stories for people
            who live with
            energy.
          </p>
        </div>
      </section>

      <div
        className={`container ${styles.content}`}
      >
        {featured ? (
          <Link
            href={`/blog/${featured.slug}`}
            className={
              styles.featured
            }
          >
            <div
              className={
                styles.featuredMedia
              }
            >
              {featured.featuredImage ? (
                <Image
                  src={
                    featured.featuredImage
                  }
                  alt={
                    featured.featuredImageAlt ??
                    featured.title
                  }
                  fill
                  priority
                  sizes="(max-width: 900px) 100vw, 58vw"
                />
              ) : (
                <div
                  className={
                    styles.imageFallback
                  }
                />
              )}
            </div>

            <div
              className={
                styles.featuredCopy
              }
            >
              <div
                className={
                  styles.meta
                }
              >
                <span>
                  {featured.category ||
                    "Journal"}
                </span>

                <span>
                  {formatDate(
                    featured.publishedAt,
                  )}
                </span>
              </div>

              <h2>
                {featured.title}
              </h2>

              <p>
                {featured.excerpt ||
                  "Read the latest from GameOn Garb."}
              </p>

              <div
                className={
                  styles.readLink
                }
              >
                Read article
                <ArrowUpRight
                  size={
                    16
                  }
                />
              </div>
            </div>
          </Link>
        ) : (
          <div
            className={
              styles.empty
            }
          >
            <h2>
              Stories are on the
              way.
            </h2>

            <p>
              Check back soon for
              guides and updates
              from GameOn Garb.
            </p>
          </div>
        )}

        {rest.length ? (
          <section
            className={
              styles.latest
            }
          >
            <div
              className={
                styles.sectionHeading
              }
            >
              <span>
                Latest stories
              </span>

              <h2>
                From the journal
              </h2>
            </div>

            <div
              className={
                styles.grid
              }
            >
              {rest.map(
                (
                  post,
                ) => (
                  <article
                    key={
                      post.id
                    }
                    className={
                      styles.card
                    }
                  >
                    <Link
                      href={`/blog/${post.slug}`}
                      className={
                        styles.cardImage
                      }
                    >
                      {post.featuredImage ? (
                        <Image
                          src={
                            post.featuredImage
                          }
                          alt={
                            post.featuredImageAlt ??
                            post.title
                          }
                          fill
                          sizes="(max-width: 720px) 100vw, (max-width: 1100px) 50vw, 33vw"
                        />
                      ) : (
                        <div
                          className={
                            styles.imageFallback
                          }
                        />
                      )}
                    </Link>

                    <div
                      className={
                        styles.cardBody
                      }
                    >
                      <div
                        className={
                          styles.meta
                        }
                      >
                        <span>
                          {post.category ||
                            "Journal"}
                        </span>

                        <span>
                          <Clock3
                            size={
                              12
                            }
                          />

                          {blogReadingMinutes(
                            post.content,
                          )} min read
                        </span>
                      </div>

                      <h3>
                        <Link
                          href={`/blog/${post.slug}`}
                        >
                          {post.title}
                        </Link>
                      </h3>

                      {post.excerpt ? (
                        <p>
                          {
                            post.excerpt
                          }
                        </p>
                      ) : null}

                      <Link
                        href={`/blog/${post.slug}`}
                        className={
                          styles.readLink
                        }
                      >
                        Read article
                        <ArrowUpRight
                          size={
                            15
                          }
                        />
                      </Link>
                    </div>
                  </article>
                ),
              )}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
