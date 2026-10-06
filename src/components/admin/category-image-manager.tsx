"use client";

import Image from "next/image";
import Link from "next/link";

import {
  ChangeEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Check,
  ExternalLink,
  ImageIcon,
  Loader2,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";

import styles from "./category-image-manager.module.css";

type CategoryParent = {
  id: string;
  name: string;
  slug: string;
};

type CategoryItem = {
  id: string;
  name: string;
  slug: string;

  image:
    | string
    | null;

  parentId:
    | string
    | null;

  parent:
    | CategoryParent
    | null;

  active: boolean;
  showOnHomepage: boolean;
};

type CategoryResponse = {
  categories: CategoryItem[];
};

type UploadResponse = {
  image: {
    url: string;
    publicId: string;
    width: number;
    height: number;
    format: string;
    bytes: number;
  };
};

export function CategoryImageManager() {
  const [
    categories,
    setCategories,
  ] =
    useState<CategoryItem[]>(
      [],
    );

  const [
    selectedId,
    setSelectedId,
  ] =
    useState("");

  const [
    image,
    setImage,
  ] =
    useState("");

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    refreshing,
    setRefreshing,
  ] =
    useState(false);

  const [
    uploading,
    setUploading,
  ] =
    useState(false);

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    message,
    setMessage,
  ] =
    useState("");

  const selectedCategory =
    useMemo(
      () =>
        categories.find(
          (
            category,
          ) =>
            category.id ===
            selectedId,
        ) ?? null,
      [
        categories,
        selectedId,
      ],
    );
async function fetchCategories() {
  const response =
    await fetch(
      "/api/admin/homepage/category-images",
      {
        method:
          "GET",

        cache:
          "no-store",
      },
    );

  const result =
    (await response.json()) as
      | CategoryResponse
      | {
          error?: string;
        };

  if (!response.ok) {
    throw new Error(
      "error" in result &&
        result.error
        ? result.error
        : "Unable to load categories.",
    );
  }

  return (
    result as CategoryResponse
  ).categories;
}

function applyCategories(
  next: CategoryItem[],
) {
  setCategories(
    next,
  );

  if (
    next.length >
    0
  ) {
    const first =
      next[0];

    setSelectedId(
      first.id,
    );

    setImage(
      first.image ??
        "",
    );
  } else {
    setSelectedId(
      "",
    );

    setImage(
      "",
    );
  }
}

useEffect(() => {
  let cancelled =
    false;

  void fetchCategories()
    .then(
      (
        next,
      ) => {
        if (
          cancelled
        ) {
          return;
        }

        applyCategories(
          next,
        );
      },
    )
    .catch(
      (
        caught,
      ) => {
        if (
          cancelled
        ) {
          return;
        }

        setError(
          getErrorMessage(
            caught,
          ),
        );
      },
    )
    .finally(
      () => {
        if (
          cancelled
        ) {
          return;
        }

        setLoading(
          false,
        );
      },
    );

  return () => {
    cancelled =
      true;
  };
}, []);

async function refreshCategories() {
  setRefreshing(
    true,
  );

  setError(
    "",
  );

  setMessage(
    "",
  );

  try {
    const next =
      await fetchCategories();

    applyCategories(
      next,
    );
  } catch (
    caught
  ) {
    setError(
      getErrorMessage(
        caught,
      ),
    );
  } finally {
    setRefreshing(
      false,
    );
  }
}

  function handleCategoryChange(
    categoryId: string,
  ) {
    const category =
      categories.find(
        (
          item,
        ) =>
          item.id ===
          categoryId,
      );

    setSelectedId(
      categoryId,
    );

    setImage(
      category?.image ??
        "",
    );

    setError("");
    setMessage("");
  }

  async function handleFile(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file =
      event.target.files?.[0];

    event.target.value =
      "";

    if (!file) {
      return;
    }

    setUploading(
      true,
    );

    setError("");
    setMessage("");

    try {
      const formData =
        new FormData();

      formData.append(
        "file",
        file,
      );

      const response =
        await fetch(
          "/api/admin/homepage/category-images/upload",
          {
            method:
              "POST",

            body:
              formData,
          },
        );

      const result =
        (await response.json()) as
          | UploadResponse
          | {
              error?: string;
            };

      if (
        !response.ok ||
        !(
          "image" in
          result
        )
      ) {
        throw new Error(
          "error" in
            result &&
            result.error
            ? result.error
            : "Unable to upload category image.",
        );
      }

      setImage(
        result.image.url,
      );

      setMessage(
        "Image uploaded. Save changes to publish it.",
      );
    } catch (
      caught
    ) {
      setError(
        getErrorMessage(
          caught,
        ),
      );
    } finally {
      setUploading(
        false,
      );
    }
  }

  async function save() {
    if (
      !selectedCategory
    ) {
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response =
        await fetch(
          "/api/admin/homepage/category-images",
          {
            method:
              "PATCH",

            headers: {
              "content-type":
                "application/json",
            },

            body:
              JSON.stringify({
                categoryId:
                  selectedCategory.id,

                image:
                  image ||
                  null,
              }),
          },
        );

      const result =
        (await response.json()) as {
          category?: CategoryItem;
          error?: string;
          message?: string;
        };

      if (
        !response.ok ||
        !result.category
      ) {
        throw new Error(
          result.error ??
            "Unable to save category image.",
        );
      }

      const updated =
        result.category;

      setCategories(
        (
          current,
        ) =>
          current.map(
            (
              category,
            ) =>
              category.id ===
              updated.id
                ? updated
                : category,
          ),
      );

      setImage(
        updated.image ??
          "",
      );

      setMessage(
        result.message ??
          "Category image updated successfully.",
      );
    } catch (
      caught
    ) {
      setError(
        getErrorMessage(
          caught,
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  function removeImage() {
    setImage("");

    setError("");

    setMessage(
      "Image removed from the preview. Save changes to publish this removal.",
    );
  }

  if (loading) {
    return (
      <div
        className={
          styles.loading
        }
      >
        <Loader2
          size={22}
          className={
            styles.spinner
          }
        />

        Loading category
        images…
      </div>
    );
  }

  return (
    <div
      className={
        styles.page
      }
    >
      <div
        className={
          styles.heading
        }
      >
        <div>
          <span
            className={
              styles.eyebrow
            }
          >
            Homepage
          </span>

          <h1>
            Category Images
          </h1>

          <p>
            Manage the image
            attached to each
            category. The same
            image is used by the
            homepage and
            Categories page.
          </p>
        </div>

        <div
          className={
            styles.headingActions
          }
        >
          <button
            type="button"
            className={
              styles.refreshButton
            }
            disabled={
              refreshing ||
              uploading ||
              saving
            }
            onClick={() =>
              void refreshCategories()
            }
          >
            {refreshing ? (
              <Loader2
                size={16}
                className={
                  styles.spinner
                }
              />
            ) : (
              <RefreshCw
                size={16}
              />
            )}

            Refresh
          </button>

          <Link
            href="/categories"
            target="_blank"
            className={
              styles.previewButton
            }
          >
            <ExternalLink
              size={16}
            />

            Preview
          </Link>

          <button
            type="button"
            className={
              styles.saveButton
            }
            disabled={
              !selectedCategory ||
              saving ||
              uploading
            }
            onClick={
              save
            }
          >
            {saving ? (
              <Loader2
                size={16}
                className={
                  styles.spinner
                }
              />
            ) : (
              <Check
                size={16}
              />
            )}

            {saving
              ? "Saving…"
              : "Save Changes"}
          </button>
        </div>
      </div>

      {error ? (
        <div
          className={
            styles.error
          }
        >
          {error}
        </div>
      ) : null}

      {message ? (
        <div
          className={
            styles.success
          }
        >
          {message}
        </div>
      ) : null}

      {categories.length ===
      0 ? (
        <div
          className={
            styles.empty
          }
        >
          No categories were
          found.
        </div>
      ) : (
        <div
          className={
            styles.grid
          }
        >
          <section
            className={
              styles.panel
            }
          >
            <div
              className={
                styles.panelHeading
              }
            >
              <div>
                <span>
                  Category
                </span>

                <h2>
                  Select category
                </h2>
              </div>

              <ImageIcon
                size={20}
              />
            </div>

            <label
              className={
                styles.field
              }
            >
              <span>
                Category
              </span>

              <select
                value={
                  selectedId
                }
                onChange={(
                  event,
                ) =>
                  handleCategoryChange(
                    event.target
                      .value,
                  )
                }
              >
                {categories.map(
                  (
                    category,
                  ) => (
                    <option
                      key={
                        category.id
                      }
                      value={
                        category.id
                      }
                    >
                      {category.parent
                        ? `${category.parent.name} → ${category.name}`
                        : category.name}

                      {!category.active
                        ? " (Inactive)"
                        : ""}
                    </option>
                  ),
                )}
              </select>
            </label>

            {selectedCategory ? (
              <div
                className={
                  styles.categoryInfo
                }
              >
                <div
                  className={
                    styles.categoryInfoRow
                  }
                >
                  <span>
                    Name
                  </span>

                  <strong>
                    {
                      selectedCategory.name
                    }
                  </strong>
                </div>

                <div
                  className={
                    styles.categoryInfoRow
                  }
                >
                  <span>
                    Slug
                  </span>

                  <strong>
                    {
                      selectedCategory.slug
                    }
                  </strong>
                </div>

                <div
                  className={
                    styles.categoryInfoRow
                  }
                >
                  <span>
                    Level
                  </span>

                  <strong>
                    {selectedCategory.parent
                      ? `Child of ${selectedCategory.parent.name}`
                      : "Root category"}
                  </strong>
                </div>

                <div
                  className={
                    styles.categoryInfoRow
                  }
                >
                  <span>
                    Homepage
                  </span>

                  <strong>
                    {selectedCategory.showOnHomepage
                      ? "Visible"
                      : "Not selected"}
                  </strong>
                </div>
              </div>
            ) : null}

            <div
              className={
                styles.note
              }
            >
              <strong>
                One image,
                everywhere.
              </strong>

              <p>
                Updating this
                image changes the
                category artwork
                wherever the
                storefront reads
                this category.
              </p>
            </div>
          </section>

          <section
            className={
              styles.panel
            }
          >
            <div
              className={
                styles.panelHeading
              }
            >
              <div>
                <span>
                  Artwork
                </span>

                <h2>
                  Category image
                </h2>
              </div>

              <Upload
                size={20}
              />
            </div>

            {image ? (
              <div
                className={
                  styles.imagePreview
                }
              >
                <Image
                  src={
                    image
                  }
                  alt={
                    selectedCategory?.name ??
                    "Category image"
                  }
                  fill
                  sizes="(max-width: 900px) 100vw, 50vw"
                />

                <div
                  className={
                    styles.imageOverlay
                  }
                >
                  <label
                    className={
                      styles.replaceButton
                    }
                  >
                    {uploading ? (
                      <Loader2
                        size={16}
                        className={
                          styles.spinner
                        }
                      />
                    ) : (
                      <Upload
                        size={16}
                      />
                    )}

                    {uploading
                      ? "Uploading…"
                      : "Replace Image"}

                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/avif"
                      disabled={
                        uploading ||
                        saving
                      }
                      onChange={
                        handleFile
                      }
                    />
                  </label>

                  <button
                    type="button"
                    className={
                      styles.removeButton
                    }
                    disabled={
                      uploading ||
                      saving
                    }
                    onClick={
                      removeImage
                    }
                  >
                    <Trash2
                      size={16}
                    />

                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <label
                className={
                  styles.upload
                }
              >
                {uploading ? (
                  <Loader2
                    size={30}
                    className={
                      styles.spinner
                    }
                  />
                ) : (
                  <Upload
                    size={30}
                  />
                )}

                <strong>
                  {uploading
                    ? "Uploading image…"
                    : "Upload category image"}
                </strong>

                <span>
                  JPG, PNG, WebP
                  or AVIF. Maximum
                  8 MB.
                </span>

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  disabled={
                    uploading ||
                    saving
                  }
                  onChange={
                    handleFile
                  }
                />
              </label>
            )}

            <div
              className={
                styles.imageHelp
              }
            >
              <strong>
                Recommended
              </strong>

              <span>
                Use a clean,
                high-resolution
                portrait or
                lifestyle image.
                The storefront
                automatically
                crops it to fit
                each category
                card.
              </span>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function getErrorMessage(
  error: unknown,
) {
  if (
    error instanceof Error
  ) {
    return error.message;
  }

  return "Something went wrong.";
}