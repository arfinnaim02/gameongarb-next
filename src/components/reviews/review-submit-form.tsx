"use client";

import {
  ChangeEvent,
  FormEvent,
  useState,
} from "react";

type ProductOption = {
  id: string;
  name: string;
};

export function ReviewSubmitForm({
  products,
  defaultProductId = "",
}: {
  products:
    ProductOption[];

  defaultProductId?:
    string;
}) {
  const [
    rating,
    setRating,
  ] =
    useState(
      5,
    );

  const [
    productId,
    setProductId,
  ] =
    useState(
      defaultProductId,
    );

  const [
    images,
    setImages,
  ] =
    useState<File[]>(
      [],
    );

  const [
    saving,
    setSaving,
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

  const [
    error,
    setError,
  ] =
    useState(
      "",
    );

  function selectImages(
    event:
      ChangeEvent<HTMLInputElement>,
  ) {
    const files =
      Array.from(
        event.target.files ??
          [],
      ).slice(
        0,
        3,
      );

    setImages(
      files,
    );
  }

  async function submit(
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
      const form =
        event.currentTarget;

      const data =
        new FormData(
          form,
        );

      data.set(
        "rating",
        String(
          rating,
        ),
      );

      data.set(
        "productId",
        productId,
      );

      data.delete(
        "images",
      );

      images.forEach(
        (
          file,
        ) => {
          data.append(
            "images",
            file,
          );
        },
      );

      const response =
        await fetch(
          "/api/reviews",
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
            "Unable to submit review.",
        );
      }

      form.reset();

      setRating(
        5,
      );

      setProductId(
        defaultProductId,
      );

      setImages(
        [],
      );

      setMessage(
        result.message ??
          "Thank you. Your review is awaiting approval.",
      );
    } catch (
      submitError
    ) {
      setError(
        submitError instanceof
          Error
          ? submitError.message
          : "Unable to submit review.",
      );
    } finally {
      setSaving(
        false,
      );
    }
  }

  return (
    <form
      className="review-submit-form"
      onSubmit={
        submit
      }
    >
      <div className="review-submit-heading">
        <span className="eyebrow">
          Share Your Experience
        </span>

        <h2>
          Write a Review
        </h2>

        <p>
          Your review is checked by our team before it appears publicly.
        </p>
      </div>

      <div className="review-rating-picker">
        <span>
          Your Rating
        </span>

        <div>
          {[1,2,3,4,5].map(
            (
              value,
            ) => (
              <button
                key={
                  value
                }
                type="button"
                aria-label={
                  value +
                  " star rating"
                }
                className={
                  value <=
                  rating
                    ? "is-active"
                    : ""
                }
                onClick={() =>
                  setRating(
                    value,
                  )
                }
              >
                ★
              </button>
            ),
          )}
        </div>
      </div>

      <div className="review-submit-grid">
        <label>
          <span>
            Your Name *
          </span>

          <input
            name="customerName"
            required
            maxLength={
              100
            }
          />
        </label>

        <label>
          <span>
            Product
          </span>

          <select
            name="productId"
            value={
              productId
            }
            onChange={(
              event,
            ) =>
              setProductId(
                event.target.value,
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
            Phone
          </span>

          <input
            name="customerPhone"
            inputMode="tel"
            placeholder="Used for order verification"
          />
        </label>

        <label>
          <span>
            Order Number
          </span>

          <input
            name="orderNumber"
            placeholder="e.g. GOG-20260001"
          />
        </label>

        <label className="review-submit-wide">
          <span>
            Review Title
          </span>

          <input
            name="title"
            maxLength={
              120
            }
            placeholder="A short summary"
          />
        </label>

        <label className="review-submit-wide">
          <span>
            Your Review *
          </span>

          <textarea
            name="body"
            required
            rows={
              6
            }
            maxLength={
              1500
            }
            placeholder="Tell us about the product, quality, fit, delivery or your overall experience."
          />
        </label>

        <label className="review-submit-wide">
          <span>
            Customer Photos
          </span>

          <input
            type="file"
            name="images"
            accept="image/jpeg,image/png,image/webp,image/avif"
            multiple
            onChange={
              selectImages
            }
          />

          <small>
            Up to 3 images, maximum 6MB each.
          </small>
        </label>
      </div>

      {images.length >
      0 ? (
        <div className="review-submit-selected">
          {images.map(
            (
              file,
            ) => (
              <span
                key={
                  file.name +
                  file.size
                }
              >
                {
                  file.name
                }
              </span>
            ),
          )}
        </div>
      ) : null}

      {message ? (
        <div className="review-submit-success">
          {
            message
          }
        </div>
      ) : null}

      {error ? (
        <div className="review-submit-error">
          {
            error
          }
        </div>
      ) : null}

      <button
        type="submit"
        className="btn btn-primary"
        disabled={
          saving
        }
      >
        {saving
          ? "Submitting..."
          : "Submit Review"}
      </button>
    </form>
  );
}
