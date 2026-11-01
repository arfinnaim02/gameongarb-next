"use client";

import {
  ChangeEvent,
  FormEvent,
  useMemo,
  useState,
} from "react";

import {
  Eye,
  FileText,
  ImagePlus,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

import {
  RichTextEditor,
} from "@/components/admin/rich-text-editor";

import type {
  AdminBlogPost,
  BlogPostStatus,
  BlogUploadResponse,
} from "@/lib/admin-blog-types";

import styles from "./blog-manager.module.css";

type BlogManagerProps = {
  initialPosts:
    AdminBlogPost[];
};

type BlogForm = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featuredImage: string;
  featuredImageId: string;
  featuredImageAlt: string;
  category: string;
  status: BlogPostStatus;
  featured: boolean;
  seoTitle: string;
  seoDescription: string;
};

function slugify(
  value:
    string,
) {
  return value
    .toLowerCase()
    .trim()
    .replace(
      /[^a-z0-9]+/g,
      "-",
    )
    .replace(
      /^-+|-+$/g,
      "",
    );
}

function emptyForm():
  BlogForm {
  return {
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    featuredImage: "",
    featuredImageId: "",
    featuredImageAlt: "",
    category: "",
    status:
      "DRAFT",
    featured:
      false,
    seoTitle: "",
    seoDescription: "",
  };
}

function postToForm(
  post:
    AdminBlogPost,
):
  BlogForm {
  return {
    title:
      post.title,
    slug:
      post.slug,
    excerpt:
      post.excerpt,
    content:
      post.content,
    featuredImage:
      post.featuredImage,
    featuredImageId:
      post.featuredImageId,
    featuredImageAlt:
      post.featuredImageAlt,
    category:
      post.category,
    status:
      post.status,
    featured:
      post.featured,
    seoTitle:
      post.seoTitle,
    seoDescription:
      post.seoDescription,
  };
}

export function BlogManager({
  initialPosts,
}: BlogManagerProps) {
  const [
    posts,
    setPosts,
  ] =
    useState(
      initialPosts,
    );

  const [
    selectedId,
    setSelectedId,
  ] =
    useState<
      string |
      null
    >(
      null,
    );

  const [
    form,
    setForm,
  ] =
    useState<
      BlogForm
    >(
      emptyForm(),
    );

  const [
    search,
    setSearch,
  ] =
    useState("");

  const [
    slugEdited,
    setSlugEdited,
  ] =
    useState(
      false,
    );

  const [
    saving,
    setSaving,
  ] =
    useState(
      false,
    );

  const [
    uploading,
    setUploading,
  ] =
    useState(
      false,
    );

  const [
    message,
    setMessage,
  ] =
    useState("");

  const [
    error,
    setError,
  ] =
    useState("");

  const filtered =
    useMemo(
      () => {
        const query =
          search
            .trim()
            .toLowerCase();

        if (
          !query
        ) {
          return posts;
        }

        return posts.filter(
          (
            post,
          ) =>
            post.title
              .toLowerCase()
              .includes(
                query,
              ) ||
            post.slug
              .toLowerCase()
              .includes(
                query,
              ) ||
            post.category
              .toLowerCase()
              .includes(
                query,
              ),
        );
      },
      [
        posts,
        search,
      ],
    );

  function update<
    K extends
      keyof BlogForm,
  >(
    key:
      K,
    value:
      BlogForm[K],
  ) {
    setForm(
      (
        current,
      ) => ({
        ...current,
        [key]:
          value,
      }),
    );
  }

  function newPost() {
    setSelectedId(
      null,
    );

    setForm(
      emptyForm(),
    );

    setSlugEdited(
      false,
    );

    setMessage(
      "",
    );

    setError(
      "",
    );
  }

  function editPost(
    post:
      AdminBlogPost,
  ) {
    setSelectedId(
      post.id,
    );

    setForm(
      postToForm(
        post,
      ),
    );

    setSlugEdited(
      true,
    );

    setMessage(
      "",
    );

    setError(
      "",
    );

    window.scrollTo({
      top: 0,
      behavior:
        "smooth",
    });
  }

  async function uploadImage(
    event:
      ChangeEvent<HTMLInputElement>,
  ) {
    const file =
      event.target
        .files?.[0];

    event.target.value =
      "";

    if (
      !file
    ) {
      return;
    }

    setUploading(
      true,
    );

    setError(
      "",
    );

    try {
      const data =
        new FormData();

      data.set(
        "file",
        file,
      );

      const response =
        await fetch(
          "/api/admin/blogs/upload",
          {
            method:
              "POST",

            body:
              data,
          },
        );

      const result =
        await response.json() as
          Partial<
            BlogUploadResponse
          > & {
            error?:
              string;
          };

      if (
        !response.ok ||
        !result.image
      ) {
        throw new Error(
          result.error ??
            "Unable to upload image.",
        );
      }

      setForm(
        (
          current,
        ) => ({
          ...current,
          featuredImage:
            result.image!
              .url,

          featuredImageId:
            result.image!
              .publicId,

          featuredImageAlt:
            current
              .featuredImageAlt ||
            current.title,
        }),
      );
    } catch (
      caught
    ) {
      setError(
        caught instanceof
          Error
          ? caught.message
          : "Unable to upload image.",
      );
    } finally {
      setUploading(
        false,
      );
    }
  }

  async function save(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setSaving(
      true,
    );

    setMessage(
      "",
    );

    setError(
      "",
    );

    try {
      const response =
        await fetch(
          "/api/admin/blogs",
          {
            method:
              selectedId
                ? "PATCH"
                : "POST",

            headers: {
              "content-type":
                "application/json",
            },

            body:
              JSON.stringify({
                ...(selectedId
                  ? {
                      id:
                        selectedId,
                    }
                  : {}),

                ...form,

                slug:
                  form.slug ||
                  slugify(
                    form.title,
                  ),
              }),
          },
        );

      const result =
        await response.json() as {
          post?:
            AdminBlogPost;

          message?:
            string;

          error?:
            string;
        };

      if (
        !response.ok ||
        !result.post
      ) {
        throw new Error(
          result.error ??
            "Unable to save blog post.",
        );
      }

      const saved =
        result.post;

      setPosts(
        (
          current,
        ) => {
          const exists =
            current.some(
              (
                post,
              ) =>
                post.id ===
                saved.id,
            );

          return exists
            ? current.map(
                (
                  post,
                ) =>
                  post.id ===
                  saved.id
                    ? saved
                    : post,
              )
            : [
                saved,
                ...current,
              ];
        },
      );

      setSelectedId(
        saved.id,
      );

      setForm(
        postToForm(
          saved,
        ),
      );

      setMessage(
        result.message ??
          "Blog saved.",
      );
    } catch (
      caught
    ) {
      setError(
        caught instanceof
          Error
          ? caught.message
          : "Unable to save blog post.",
      );
    } finally {
      setSaving(
        false,
      );
    }
  }

  async function removePost(
    post:
      AdminBlogPost,
  ) {
    if (
      !window.confirm(
        `Delete “${post.title}”? This cannot be undone.`,
      )
    ) {
      return;
    }

    setError(
      "",
    );

    const response =
      await fetch(
        "/api/admin/blogs",
        {
          method:
            "DELETE",

          headers: {
            "content-type":
              "application/json",
          },

          body:
            JSON.stringify({
              id:
                post.id,
            }),
        },
      );

    const result =
      await response.json() as {
        error?:
          string;
      };

    if (
      !response.ok
    ) {
      setError(
        result.error ??
          "Unable to delete blog.",
      );

      return;
    }

    setPosts(
      (
        current,
      ) =>
        current.filter(
          (
            item,
          ) =>
            item.id !==
            post.id,
        ),
    );

    if (
      selectedId ===
      post.id
    ) {
      newPost();
    }
  }

  return (
    <div
      className={
        styles.page
      }
    >
      <header
        className={
          styles.hero
        }
      >
        <div>
          <span
            className={
              styles.eyebrow
            }
          >
            Content
          </span>

          <h1>
            Blog Manager
          </h1>

          <p>
            Publish search-friendly
            editorial content for
            Game On Garb.
          </p>
        </div>

        <button
          type="button"
          className={
            styles.primaryButton
          }
          onClick={
            newPost
          }
        >
          <Plus
            size={
              16
            }
          />

          New Blog
        </button>
      </header>

      {message ? (
        <div
          className={
            styles.success
          }
        >
          {message}
        </div>
      ) : null}

      {error ? (
        <div
          className={
            styles.error
          }
        >
          {error}
        </div>
      ) : null}

      <div
        className={
          styles.layout
        }
      >
        <aside
          className={
            styles.library
          }
        >
          <div
            className={
              styles.libraryHeader
            }
          >
            <div>
              <strong>
                Articles
              </strong>

              <span>
                {posts.length} total
              </span>
            </div>

            <label
              className={
                styles.search
              }
            >
              <Search
                size={
                  15
                }
              />

              <input
                value={
                  search
                }
                placeholder="Search blogs"
                onChange={(
                  event,
                ) =>
                  setSearch(
                    event.target
                      .value,
                  )
                }
              />
            </label>
          </div>

          <div
            className={
              styles.postList
            }
          >
            {filtered.length ? (
              filtered.map(
                (
                  post,
                ) => (
                  <article
                    key={
                      post.id
                    }
                    className={`${styles.postCard} ${
                      selectedId ===
                      post.id
                        ? styles.postCardActive
                        : ""
                    }`}
                  >
                    {post.featuredImage ? (
                      <img
                        src={
                          post.featuredImage
                        }
                        alt=""
                      />
                    ) : (
                      <div
                        className={
                          styles.postPlaceholder
                        }
                      >
                        <FileText
                          size={
                            22
                          }
                        />
                      </div>
                    )}

                    <div
                      className={
                        styles.postCardBody
                      }
                    >
                      <div
                        className={
                          styles.postMeta
                        }
                      >
                        <span>
                          {
                            post.status
                          }
                        </span>

                        {post.category ? (
                          <small>
                            {
                              post.category
                            }
                          </small>
                        ) : null}
                      </div>

                      <strong>
                        {post.title}
                      </strong>

                      <small>
                        /blog/{post.slug}
                      </small>

                      <div
                        className={
                          styles.cardActions
                        }
                      >
                        {post.status ===
                        "PUBLISHED" ? (
                          <a
                            href={`/blog/${post.slug}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Eye
                              size={
                                14
                              }
                            />
                            View
                          </a>
                        ) : null}

                        <button
                          type="button"
                          onClick={() =>
                            editPost(
                              post,
                            )
                          }
                        >
                          <Pencil
                            size={
                              14
                            }
                          />
                          Edit
                        </button>

                        <button
                          type="button"
                          className={
                            styles.deleteButton
                          }
                          onClick={() =>
                            void removePost(
                              post,
                            )
                          }
                        >
                          <Trash2
                            size={
                              14
                            }
                          />
                        </button>
                      </div>
                    </div>
                  </article>
                ),
              )
            ) : (
              <div
                className={
                  styles.empty
                }
              >
                No blogs found.
              </div>
            )}
          </div>
        </aside>

        <form
          className={
            styles.editor
          }
          onSubmit={
            save
          }
        >
          <section
            className={
              styles.section
            }
          >
            <div
              className={
                styles.sectionTitle
              }
            >
              <div>
                <span>
                  Article
                </span>

                <h2>
                  {
                    selectedId
                      ? "Edit blog"
                      : "Create blog"
                  }
                </h2>
              </div>
            </div>

            <label>
              <span>
                Title
              </span>

              <input
                required
                value={
                  form.title
                }
                placeholder="e.g. How to Choose the Right Football Jersey Size"
                onChange={(
                  event,
                ) => {
                  const title =
                    event.target
                      .value;

                  setForm(
                    (
                      current,
                    ) => ({
                      ...current,
                      title,

                      slug:
                        selectedId ||
                        slugEdited
                          ? current.slug
                          : slugify(
                              title,
                            ),
                    }),
                  );
                }}
              />
            </label>

            <div
              className={
                styles.twoColumns
              }
            >
              <label>
                <span>
                  Slug
                </span>

                <input
                  required
                  value={
                    form.slug
                  }
                  placeholder="football-jersey-size-guide"
                  onChange={(
                    event,
                  ) => {
                    setSlugEdited(
                      true,
                    );

                    update(
                      "slug",
                      slugify(
                        event.target
                          .value,
                      ),
                    );
                  }}
                />
              </label>

              <label>
                <span>
                  Category
                </span>

                <input
                  value={
                    form.category
                  }
                  placeholder="Style Guide"
                  onChange={(
                    event,
                  ) =>
                    update(
                      "category",
                      event.target
                        .value,
                    )
                  }
                />
              </label>
            </div>

            <label>
              <span>
                Short excerpt
              </span>

              <textarea
                value={
                  form.excerpt
                }
                maxLength={
                  500
                }
                placeholder="A concise summary shown on blog cards and search previews."
                onChange={(
                  event,
                ) =>
                  update(
                    "excerpt",
                    event.target
                      .value,
                  )
                }
              />
            </label>

            <div>
              <span
                className={
                  styles.fieldLabel
                }
              >
                Article content
              </span>

              <RichTextEditor
                value={
                  form.content
                }
                onChange={(
                  value,
                ) =>
                  update(
                    "content",
                    value,
                  )
                }
                placeholder="Write the full article using headings, lists, links and formatted text…"
                footerLabel="Rich blog content"
              />
            </div>
          </section>

          <section
            className={
              styles.section
            }
          >
            <div
              className={
                styles.sectionTitle
              }
            >
              <div>
                <span>
                  Media
                </span>

                <h2>
                  Featured image
                </h2>
              </div>
            </div>

            {form.featuredImage ? (
              <div
                className={
                  styles.imagePreview
                }
              >
                <img
                  src={
                    form.featuredImage
                  }
                  alt={
                    form.featuredImageAlt ||
                    form.title
                  }
                />
              </div>
            ) : (
              <div
                className={
                  styles.imageEmpty
                }
              >
                <ImagePlus
                  size={
                    24
                  }
                />

                <span>
                  Add a wide editorial
                  image for this article.
                </span>
              </div>
            )}

            <div
              className={
                styles.imageActions
              }
            >
              <label
                className={
                  styles.secondaryButton
                }
              >
                {uploading ? (
                  <Loader2
                    size={
                      15
                    }
                    className={
                      styles.spin
                    }
                  />
                ) : (
                  <ImagePlus
                    size={
                      15
                    }
                  />
                )}

                {uploading
                  ? "Uploading..."
                  : "Upload Image"}

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  hidden
                  disabled={
                    uploading
                  }
                  onChange={
                    uploadImage
                  }
                />
              </label>

              {form.featuredImage ? (
                <button
                  type="button"
                  className={
                    styles.textButton
                  }
                  onClick={() =>
                    setForm(
                      (
                        current,
                      ) => ({
                        ...current,
                        featuredImage:
                          "",
                        featuredImageId:
                          "",
                      }),
                    )
                  }
                >
                  Remove
                </button>
              ) : null}
            </div>

            <label>
              <span>
                Image alt text
              </span>

              <input
                value={
                  form.featuredImageAlt
                }
                maxLength={
                  180
                }
                placeholder="Describe the image for accessibility and SEO"
                onChange={(
                  event,
                ) =>
                  update(
                    "featuredImageAlt",
                    event.target
                      .value,
                  )
                }
              />
            </label>
          </section>

          <section
            className={
              styles.section
            }
          >
            <div
              className={
                styles.sectionTitle
              }
            >
              <div>
                <span>
                  Search
                </span>

                <h2>
                  SEO settings
                </h2>
              </div>
            </div>

            <label>
              <span>
                SEO title
                <small>
                  {form.seoTitle.length}/70
                </small>
              </span>

              <input
                value={
                  form.seoTitle
                }
                maxLength={
                  70
                }
                placeholder="Leave blank to use article title"
                onChange={(
                  event,
                ) =>
                  update(
                    "seoTitle",
                    event.target
                      .value,
                  )
                }
              />
            </label>

            <label>
              <span>
                Meta description
                <small>
                  {form.seoDescription.length}/180
                </small>
              </span>

              <textarea
                value={
                  form.seoDescription
                }
                maxLength={
                  180
                }
                placeholder="Search-friendly description of this article"
                onChange={(
                  event,
                ) =>
                  update(
                    "seoDescription",
                    event.target
                      .value,
                  )
                }
              />
            </label>
          </section>

          <section
            className={
              styles.publishBar
            }
          >
            <label
              className={
                styles.featureToggle
              }
            >
              <input
                type="checkbox"
                checked={
                  form.featured
                }
                onChange={(
                  event,
                ) =>
                  update(
                    "featured",
                    event.target
                      .checked,
                  )
                }
              />

              Featured article
            </label>

            <div
              className={
                styles.publishActions
              }
            >
              <select
                value={
                  form.status
                }
                onChange={(
                  event,
                ) =>
                  update(
                    "status",
                    event.target
                      .value as
                      BlogPostStatus,
                  )
                }
              >
                <option value="DRAFT">
                  Draft
                </option>

                <option value="PUBLISHED">
                  Published
                </option>

                <option value="ARCHIVED">
                  Archived
                </option>
              </select>

              <button
                type="submit"
                className={
                  styles.primaryButton
                }
                disabled={
                  saving
                }
              >
                {saving ? (
                  <Loader2
                    size={
                      15
                    }
                    className={
                      styles.spin
                    }
                  />
                ) : null}

                {saving
                  ? "Saving..."
                  : form.status ===
                      "PUBLISHED"
                    ? "Publish Blog"
                    : "Save Blog"}
              </button>
            </div>
          </section>
        </form>
      </div>
    </div>
  );
}
