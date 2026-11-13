"use client";

import Image from "next/image";

import {
  ChangeEvent,
  FormEvent,
  useMemo,
  useState,
} from "react";

type ReviewImage = {
  id?: string;
  url: string;
  publicId:
    string | null;
};

type ReviewRecord = {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  rating: number;
  title: string;
  body: string;
  productId: string;
  productName: string;
  orderId: string;
  orderNumber: string;
  status: string;
  source: string;
  featured: boolean;
  verifiedPurchase: boolean;
  sortOrder: number;
  images: ReviewImage[];
  createdAt: string;
  updatedAt: string;
};

type ProductOption = {
  id: string;
  name: string;
};

type FormState = {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  rating: string;
  title: string;
  body: string;
  productId: string;
  orderId: string;
  status:
    | "PENDING"
    | "APPROVED"
    | "REJECTED";
  featured: boolean;
  verifiedPurchase: boolean;
  sortOrder: string;
  images: ReviewImage[];
};

function emptyForm(): FormState {
  return {
    id: "",
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    rating: "5",
    title: "",
    body: "",
    productId: "",
    orderId: "",
    status: "APPROVED",
    featured: false,
    verifiedPurchase: false,
    sortOrder: "0",
    images: [],
  };
}

function toForm(
  review:
    ReviewRecord,
): FormState {
  return {
    id:
      review.id,

    customerName:
      review.customerName,

    customerEmail:
      review.customerEmail,

    customerPhone:
      review.customerPhone,

    rating:
      String(
        review.rating,
      ),

    title:
      review.title,

    body:
      review.body,

    productId:
      review.productId,

    orderId:
      review.orderId,

    status:
      review.status as
        FormState["status"],

    featured:
      review.featured,

    verifiedPurchase:
      review.verifiedPurchase,

    sortOrder:
      String(
        review.sortOrder,
      ),

    images:
      review.images,
  };
}

export function ReviewManager({
  initialReviews,
  products,
}: {
  initialReviews:
    ReviewRecord[];

  products:
    ProductOption[];
}) {
  const [
    reviews,
    setReviews,
  ] =
    useState(
      initialReviews,
    );

  const [
    form,
    setForm,
  ] =
    useState<FormState>(
      emptyForm(),
    );

  const [
    filter,
    setFilter,
  ] =
    useState<
      "ALL" |
      "PENDING" |
      "APPROVED" |
      "REJECTED"
    >(
      "ALL",
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
    useState(
      "",
    );

  const visible =
    useMemo(
      () =>
        filter ===
        "ALL"
          ? reviews
          : reviews.filter(
              (
                review,
              ) =>
                review.status ===
                filter,
            ),
      [
        filter,
        reviews,
      ],
    );

  const counts =
    useMemo(
      () => ({
        all:
          reviews.length,

        pending:
          reviews.filter(
            (
              review,
            ) =>
              review.status ===
              "PENDING",
          ).length,

        approved:
          reviews.filter(
            (
              review,
            ) =>
              review.status ===
              "APPROVED",
          ).length,

        rejected:
          reviews.filter(
            (
              review,
            ) =>
              review.status ===
              "REJECTED",
          ).length,
      }),
      [
        reviews,
      ],
    );

  async function uploadFiles(
    event:
      ChangeEvent<HTMLInputElement>,
  ) {
    const files =
      Array.from(
        event.target.files ??
          [],
      ).slice(
        0,
        Math.max(
          0,
          3 -
            form.images.length,
        ),
      );

    event.target.value =
      "";

    if (
      files.length ===
      0
    ) {
      return;
    }

    setUploading(
      true,
    );

    setMessage(
      "",
    );

    try {
      const uploaded:
        ReviewImage[] = [];

      for (
        const file
        of files
      ) {
        const data =
          new FormData();

        data.append(
          "file",
          file,
        );

        const response =
          await fetch(
            "/api/admin/reviews/upload",
            {
              method:
                "POST",

              body:
                data,
            },
          );

        const result =
          await response.json();

        if (
          !response.ok
        ) {
          throw new Error(
            result.error ??
              "Unable to upload image.",
          );
        }

        uploaded.push({
          url:
            result.image.url,

          publicId:
            result.image.publicId,
        });
      }

      setForm(
        (
          current,
        ) => ({
          ...current,

          images: [
            ...current.images,
            ...uploaded,
          ].slice(
            0,
            3,
          ),
        }),
      );
    } catch (
      error
    ) {
      setMessage(
        error instanceof
          Error
          ? error.message
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

    try {
      const response =
        await fetch(
          "/api/admin/reviews",
          {
            method:
              form.id
                ? "PATCH"
                : "POST",

            headers: {
              "content-type":
                "application/json",
            },

            body:
              JSON.stringify({
                ...form,

                rating:
                  Number(
                    form.rating,
                  ),

                sortOrder:
                  Number(
                    form.sortOrder ||
                      0,
                  ),
              }),
          },
        );

      const result =
        await response.json();

      if (
        !response.ok
      ) {
        throw new Error(
          result.error ??
            "Unable to save review.",
        );
      }

      const next =
        result.review as
          ReviewRecord;

      setReviews(
        (
          current,
        ) =>
          form.id
            ? current.map(
                (
                  review,
                ) =>
                  review.id ===
                  next.id
                    ? next
                    : review,
              )
            : [
                next,
                ...current,
              ],
      );

      setForm(
        emptyForm(),
      );

      setMessage(
        form.id
          ? "Review updated."
          : "Review added.",
      );
    } catch (
      error
    ) {
      setMessage(
        error instanceof
          Error
          ? error.message
          : "Unable to save review.",
      );
    } finally {
      setSaving(
        false,
      );
    }
  }

  async function remove(
    id:
      string,
  ) {
    if (
      !window.confirm(
        "Delete this review?",
      )
    ) {
      return;
    }

    const response =
      await fetch(
        "/api/admin/reviews",
        {
          method:
            "DELETE",

          headers: {
            "content-type":
              "application/json",
          },

          body:
            JSON.stringify({
              id,
            }),
        },
      );

    const result =
      await response.json();

    if (
      !response.ok
    ) {
      setMessage(
        result.error ??
          "Unable to delete review.",
      );

      return;
    }

    setReviews(
      (
        current,
      ) =>
        current.filter(
          (
            review,
          ) =>
            review.id !==
            id,
        ),
    );

    if (
      form.id ===
      id
    ) {
      setForm(
        emptyForm(),
      );
    }

    setMessage(
      "Review deleted.",
    );
  }

  return (
    <div className="review-admin">
      <div className="review-admin-heading">
        <div>
          <span className="eyebrow">
            Customer Trust
          </span>

          <h1>
            Customer Reviews
          </h1>

          <p>
            Add customer stories manually, moderate website submissions and choose featured reviews for the storefront.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-dark"
          onClick={() =>
            setForm(
              emptyForm(),
            )
          }
        >
          Add Review
        </button>
      </div>

      <div className="review-admin-stats">
        {([
          [
            "ALL",
            "All",
            counts.all,
          ],
          [
            "PENDING",
            "Pending",
            counts.pending,
          ],
          [
            "APPROVED",
            "Approved",
            counts.approved,
          ],
          [
            "REJECTED",
            "Rejected",
            counts.rejected,
          ],
        ] as const).map(
          (
            [
              value,
              label,
              count,
            ],
          ) => (
            <button
              key={
                value
              }
              type="button"
              onClick={() =>
                setFilter(
                  value,
                )
              }
              className={
                filter ===
                value
                  ? "is-active"
                  : ""
              }
            >
              {
                label
              }

              <strong>
                {
                  count
                }
              </strong>
            </button>
          ),
        )}
      </div>

      {message ? (
        <div className="review-admin-message">
          {
            message
          }
        </div>
      ) : null}

      <div className="review-admin-layout">
        <form
          className="review-admin-form"
          onSubmit={
            save
          }
        >
          <h2>
            {form.id
              ? "Edit Review"
              : "Add Review"}
          </h2>

          <div className="review-admin-form-grid">
            <label>
              <span>
                Customer Name
              </span>

              <input
                required
                value={
                  form.customerName
                }
                onChange={(
                  event,
                ) =>
                  setForm(
                    (
                      current,
                    ) => ({
                      ...current,

                      customerName:
                        event.target.value,
                    }),
                  )
                }
              />
            </label>

            <label>
              <span>
                Rating
              </span>

              <select
                value={
                  form.rating
                }
                onChange={(
                  event,
                ) =>
                  setForm(
                    (
                      current,
                    ) => ({
                      ...current,

                      rating:
                        event.target.value,
                    }),
                  )
                }
              >
                {[5,4,3,2,1].map(
                  (
                    value,
                  ) => (
                    <option
                      key={
                        value
                      }
                      value={
                        value
                      }
                    >
                      {value} Star
                      {value ===
                      1
                        ? ""
                        : "s"}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label>
              <span>
                Product
              </span>

              <select
                value={
                  form.productId
                }
                onChange={(
                  event,
                ) =>
                  setForm(
                    (
                      current,
                    ) => ({
                      ...current,

                      productId:
                        event.target.value,
                    }),
                  )
                }
              >
                <option value="">
                  General Store Review
                </option>

                {products.map(
                  (
                    product,
                  ) => (
                    <option
                      key={
                        product.id
                      }
                      value={
                        product.id
                      }
                    >
                      {
                        product.name
                      }
                    </option>
                  ),
                )}
              </select>
            </label>

            <label>
              <span>
                Status
              </span>

              <select
                value={
                  form.status
                }
                onChange={(
                  event,
                ) =>
                  setForm(
                    (
                      current,
                    ) => ({
                      ...current,

                      status:
                        event.target.value as
                          FormState["status"],
                    }),
                  )
                }
              >
                <option value="PENDING">
                  Pending
                </option>

                <option value="APPROVED">
                  Approved
                </option>

                <option value="REJECTED">
                  Rejected
                </option>
              </select>
            </label>

            <label>
              <span>
                Email
              </span>

              <input
                type="email"
                value={
                  form.customerEmail
                }
                onChange={(
                  event,
                ) =>
                  setForm(
                    (
                      current,
                    ) => ({
                      ...current,

                      customerEmail:
                        event.target.value,
                    }),
                  )
                }
              />
            </label>

            <label>
              <span>
                Phone
              </span>

              <input
                value={
                  form.customerPhone
                }
                onChange={(
                  event,
                ) =>
                  setForm(
                    (
                      current,
                    ) => ({
                      ...current,

                      customerPhone:
                        event.target.value,
                    }),
                  )
                }
              />
            </label>

            <label className="review-admin-wide">
              <span>
                Review Title
              </span>

              <input
                value={
                  form.title
                }
                onChange={(
                  event,
                ) =>
                  setForm(
                    (
                      current,
                    ) => ({
                      ...current,

                      title:
                        event.target.value,
                    }),
                  )
                }
              />
            </label>

            <label className="review-admin-wide">
              <span>
                Review
              </span>

              <textarea
                required
                rows={
                  5
                }
                value={
                  form.body
                }
                onChange={(
                  event,
                ) =>
                  setForm(
                    (
                      current,
                    ) => ({
                      ...current,

                      body:
                        event.target.value,
                    }),
                  )
                }
              />
            </label>
          </div>

          <div className="review-admin-checks">
            <label>
              <input
                type="checkbox"
                checked={
                  form.featured
                }
                onChange={(
                  event,
                ) =>
                  setForm(
                    (
                      current,
                    ) => ({
                      ...current,

                      featured:
                        event.target.checked,
                    }),
                  )
                }
              />

              Featured on Homepage
            </label>

            <label>
              <input
                type="checkbox"
                checked={
                  form.verifiedPurchase
                }
                onChange={(
                  event,
                ) =>
                  setForm(
                    (
                      current,
                    ) => ({
                      ...current,

                      verifiedPurchase:
                        event.target.checked,
                    }),
                  )
                }
              />

              Verified Purchase
            </label>
          </div>

          <div className="review-admin-upload">
            <div>
              <strong>
                Customer Images
              </strong>

              <small>
                Up to 3 images
              </small>
            </div>

            <label className="btn btn-outline">
              {uploading
                ? "Uploading..."
                : "Upload Images"}

              <input
                hidden
                multiple
                disabled={
                  uploading ||
                  form.images.length >=
                    3
                }
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                onChange={
                  uploadFiles
                }
              />
            </label>
          </div>

          {form.images.length >
          0 ? (
            <div className="review-admin-images">
              {form.images.map(
                (
                  image,
                  index,
                ) => (
                  <div
                    key={
                      image.url +
                      "-" +
                      index
                    }
                  >
                    <Image
                      src={
                        image.url
                      }
                      alt=""
                      fill
                      sizes="100px"
                    />

                    <button
                      type="button"
                      aria-label="Remove image"
                      onClick={() =>
                        setForm(
                          (
                            current,
                          ) => ({
                            ...current,

                            images:
                              current.images.filter(
                                (
                                  _,
                                  imageIndex,
                                ) =>
                                  imageIndex !==
                                  index,
                              ),
                          }),
                        )
                      }
                    >
                      ×
                    </button>
                  </div>
                ),
              )}
            </div>
          ) : null}

          <div className="review-admin-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={
                saving ||
                uploading
              }
            >
              {saving
                ? "Saving..."
                : form.id
                  ? "Update Review"
                  : "Save Review"}
            </button>

            {form.id ? (
              <button
                type="button"
                className="btn btn-outline"
                onClick={() =>
                  setForm(
                    emptyForm(),
                  )
                }
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>

        <div className="review-admin-list">
          {visible.length ===
          0 ? (
            <div className="review-admin-empty">
              No reviews in this section.
            </div>
          ) : (
            visible.map(
              (
                review,
              ) => (
                <article
                  key={
                    review.id
                  }
                  className="review-admin-card"
                >
                  <div className="review-admin-card-top">
                    <div>
                      <span className="review-admin-stars">
                        {"★".repeat(
                          review.rating,
                        )}
                        {"☆".repeat(
                          5 -
                            review.rating,
                        )}
                      </span>

                      <h3>
                        {
                          review.customerName
                        }
                      </h3>

                      <small>
                        {
                          review.productName ||
                          "General Store Review"
                        }
                        {" · "}
                        {
                          review.source
                        }
                      </small>
                    </div>

                    <span
                      className={
                        "review-admin-status is-" +
                        review.status.toLowerCase()
                      }
                    >
                      {
                        review.status
                      }
                    </span>
                  </div>

                  {review.title ? (
                    <strong className="review-admin-card-title">
                      {
                        review.title
                      }
                    </strong>
                  ) : null}

                  <p>
                    {
                      review.body
                    }
                  </p>

                  {review.images.length >
                  0 ? (
                    <div className="review-admin-card-images">
                      {review.images.map(
                        (
                          image,
                        ) => (
                          <span
                            key={
                              image.url
                            }
                          >
                            <Image
                              src={
                                image.url
                              }
                              alt=""
                              fill
                              sizes="70px"
                            />
                          </span>
                        ),
                      )}
                    </div>
                  ) : null}

                  <div className="review-admin-card-meta">
                    {review.verifiedPurchase ? (
                      <span>
                        Verified Purchase
                      </span>
                    ) : null}

                    {review.featured ? (
                      <span>
                        Featured
                      </span>
                    ) : null}
                  </div>

                  <div className="review-admin-card-actions">
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() =>
                        setForm(
                          toForm(
                            review,
                          ),
                        )
                      }
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() =>
                        remove(
                          review.id,
                        )
                      }
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ),
            )
          )}
        </div>
      </div>
    </div>
  );
}
