"use client";

import {
  ChangeEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  Check,
  ImageIcon,
  Loader2,
  Upload,
} from "lucide-react";

import styles from "./brand-story-manager.module.css";

type BrandStorySection = {
  id: string;

  heading:
    | string
    | null;

  subtitle:
    | string
    | null;

  image:
    | string
    | null;

  imagePublicId:
    | string
    | null;

  ctaLabel:
    | string
    | null;

  ctaLink:
    | string
    | null;

  enabled: boolean;
};

type FormState = {
  heading: string;
  subtitle: string;
  image: string;
  imagePublicId: string;
  ctaLabel: string;
  ctaLink: string;
  enabled: boolean;
};

const EMPTY_FORM: FormState = {
  heading:
    "Experience the thrill.",

  subtitle:
    "More than what you wear. It’s a movement. It’s a mindset.",

  image: "",

  imagePublicId: "",

  ctaLabel:
    "Our Story",

  ctaLink:
    "/shop",

  enabled: true,
};

export function BrandStoryManager() {
  const [
    form,
    setForm,
  ] =
    useState<FormState>(
      EMPTY_FORM,
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

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
    message,
    setMessage,
  ] =
    useState("");

  const [
    error,
    setError,
  ] =
    useState("");

  /* =======================================================
     LOAD
     ======================================================= */

  const loadSection =
    useCallback(
      async () => {
        setLoading(true);
        setError("");

        try {
          const response =
            await fetch(
              "/api/admin/homepage/brand-story",
              {
                cache:
                  "no-store",
              },
            );

          const result =
            await response.json();

          if (!response.ok) {
            throw new Error(
              result.error ??
                "Unable to load section.",
            );
          }

          const section =
            result.section as BrandStorySection;

          setForm({
            heading:
              section.heading ??
              "",

            subtitle:
              section.subtitle ??
              "",

            image:
              section.image ??
              "",

            imagePublicId:
              section.imagePublicId ??
              "",

            ctaLabel:
              section.ctaLabel ??
              "",

            ctaLink:
              section.ctaLink ??
              "",

            enabled:
              section.enabled,
          });
        } catch (
          caught
        ) {
          setError(
            getErrorMessage(
              caught,
            ),
          );
        } finally {
          setLoading(false);
        }
      },
      [],
    );

  useEffect(() => {
    void loadSection();
  }, [loadSection]);

  /* =======================================================
     UPDATE FIELD
     ======================================================= */

  function updateForm<
    K extends keyof FormState,
  >(
    key: K,
    value: FormState[K],
  ) {
    setForm(
      (current) => ({
        ...current,
        [key]: value,
      }),
    );
  }

  /* =======================================================
     UPLOAD
     ======================================================= */

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

    setUploading(true);
    setError("");
    setMessage("");

    try {
      const data =
        new FormData();

      data.append(
        "file",
        file,
      );

      const response =
        await fetch(
          "/api/admin/homepage/brand-story/upload",
          {
            method:
              "POST",

            body: data,
          },
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ??
            "Image upload failed.",
        );
      }

      setForm(
        (current) => ({
          ...current,

          image:
            String(
              result.image.url,
            ),

          imagePublicId:
            String(
              result.image.publicId,
            ),
        }),
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
      setUploading(false);
    }
  }

  /* =======================================================
     SAVE
     ======================================================= */

  async function save() {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response =
        await fetch(
          "/api/admin/homepage/brand-story",
          {
            method:
              "PATCH",

            headers: {
              "content-type":
                "application/json",
            },

            body:
              JSON.stringify({
                heading:
                  form.heading ||
                  null,

                subtitle:
                  form.subtitle ||
                  null,

                image:
                  form.image ||
                  null,

                imagePublicId:
                  form.imagePublicId ||
                  null,

                ctaLabel:
                  form.ctaLabel ||
                  null,

                ctaLink:
                  form.ctaLink ||
                  null,

                enabled:
                  form.enabled,
              }),
          },
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ??
            "Unable to save section.",
        );
      }

      setMessage(
        "Experience the Thrill section updated successfully.",
      );

      await loadSection();
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

  /* =======================================================
     LOADING
     ======================================================= */

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

        Loading Brand Story…
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
            Experience the Thrill
          </h1>

          <p>
            Manage the final
            cinematic campaign
            shown above the
            storefront footer.
          </p>
        </div>

        <button
          type="button"
          className={
            styles.saveButton
          }
          disabled={
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
          <h2>
            Content
          </h2>

          <label
            className={
              styles.field
            }
          >
            <span>
              Heading
            </span>

            <input
              value={
                form.heading
              }
              maxLength={
                120
              }
              onChange={(
                event,
              ) =>
                updateForm(
                  "heading",
                  event.target
                    .value,
                )
              }
            />
          </label>

          <label
            className={
              styles.field
            }
          >
            <span>
              Subtitle
            </span>

            <textarea
              value={
                form.subtitle
              }
              maxLength={
                500
              }
              rows={4}
              onChange={(
                event,
              ) =>
                updateForm(
                  "subtitle",
                  event.target
                    .value,
                )
              }
            />
          </label>

          <div
            className={
              styles.twoColumns
            }
          >
            <label
              className={
                styles.field
              }
            >
              <span>
                CTA label
              </span>

              <input
                value={
                  form.ctaLabel
                }
                maxLength={
                  80
                }
                onChange={(
                  event,
                ) =>
                  updateForm(
                    "ctaLabel",
                    event.target
                      .value,
                  )
                }
              />
            </label>

            <label
              className={
                styles.field
              }
            >
              <span>
                CTA link
              </span>

              <input
                value={
                  form.ctaLink
                }
                placeholder="/shop"
                onChange={(
                  event,
                ) =>
                  updateForm(
                    "ctaLink",
                    event.target
                      .value,
                  )
                }
              />
            </label>
          </div>

          <div
            className={
              styles.toggleRow
            }
          >
            <div>
              <strong>
                Section visible
              </strong>

              <p>
                Show or hide this
                campaign on the
                storefront.
              </p>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={
                form.enabled
              }
              className={`${styles.switch} ${
                form.enabled
                  ? styles.switchOn
                  : ""
              }`}
              onClick={() =>
                updateForm(
                  "enabled",
                  !form.enabled,
                )
              }
            >
              <span />
            </button>
          </div>
        </section>

        <section
          className={
            styles.panel
          }
        >
          <h2>
            Campaign Image
          </h2>

          <p
            className={
              styles.hint
            }
          >
            Recommended:
            1920 × 760px or
            1920 × 800px.
          </p>

          {form.image ? (
            <div
              className={
                styles.imagePreview
              }
            >
              <img
                src={
                  form.image
                }
                alt="Brand Story preview"
              />

              <label
                className={
                  styles.replace
                }
              >
                <Upload
                  size={16}
                />

                Replace Image

                <input
                  type="file"
                  hidden
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  disabled={
                    uploading
                  }
                  onChange={
                    handleFile
                  }
                />
              </label>
            </div>
          ) : (
            <label
              className={
                styles.upload
              }
            >
              {uploading ? (
                <Loader2
                  size={28}
                  className={
                    styles.spinner
                  }
                />
              ) : (
                <ImageIcon
                  size={28}
                />
              )}

              <strong>
                {uploading
                  ? "Uploading…"
                  : "Upload campaign image"}
              </strong>

              <span>
                JPG, PNG, WebP or
                AVIF · max 8MB
              </span>

              <input
                type="file"
                hidden
                accept="image/jpeg,image/png,image/webp,image/avif"
                disabled={
                  uploading
                }
                onChange={
                  handleFile
                }
              />
            </label>
          )}
        </section>
      </div>

      {form.image ? (
        <section
          className={
            styles.previewPanel
          }
        >
          <div
            className={
              styles.preview
            }
            style={{
              backgroundImage:
                `linear-gradient(90deg, rgba(3,5,4,.9), rgba(3,5,4,.1)), url("${form.image}")`,
            }}
          >
            <div>
              <span>
                Game On Garb
              </span>

              <h2>
                {form.heading ||
                  "Experience the thrill."}
              </h2>

              {form.subtitle ? (
                <p>
                  {
                    form.subtitle
                  }
                </p>
              ) : null}

              {form.ctaLabel ? (
                <b>
                  {
                    form.ctaLabel
                  }{" "}
                  →
                </b>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function getErrorMessage(
  error: unknown,
) {
  return error instanceof Error
    ? error.message
    : "Something went wrong.";
}