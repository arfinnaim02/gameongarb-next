"use client";

import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  Check,
  ExternalLink,
  ImageIcon,
  Loader2,
  Megaphone,
  Upload,
} from "lucide-react";

import styles from "./promotion-popup-manager.module.css";

type PopupSettings = {
  enabled:
    boolean;

  image:
    string |
    null;

  imagePublicId:
    string |
    null;

  redirectLink:
    string |
    null;

  delayMs:
    number;
};

const DEFAULT_POPUP:
  PopupSettings = {
  enabled:
    false,

  image:
    null,

  imagePublicId:
    null,

  redirectLink:
    "/shop",

  delayMs:
    1400,
};

async function readResponse(
  response:
    Response,
) {
  const text =
    await response.text();

  if (
    !text
  ) {
    return {};
  }

  try {
    return JSON.parse(
      text,
    ) as Record<
      string,
      unknown
    >;
  } catch {
    throw new Error(
      `Request failed with HTTP ${response.status}.`,
    );
  }
}

function errorMessage(
  value:
    unknown,
) {
  return value instanceof
    Error
    ? value.message
    : "Something went wrong.";
}

export function PromotionPopupManager() {
  const [
    form,
    setForm,
  ] =
    useState<
      PopupSettings
    >(
      DEFAULT_POPUP,
    );

  const [
    loading,
    setLoading,
  ] =
    useState(
      true,
    );

  const [
    uploading,
    setUploading,
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
    error,
    setError,
  ] =
    useState(
      "",
    );

  const [
    success,
    setSuccess,
  ] =
    useState(
      "",
    );

  const loadSettings =
    useCallback(
      async () => {
        setLoading(
          true,
        );

        setError(
          "",
        );

        try {
          const response =
            await fetch(
              "/api/admin/homepage/promotion-popup",
              {
                cache:
                  "no-store",
              },
            );

          const result =
            await readResponse(
              response,
            );

          if (
            !response.ok
          ) {
            throw new Error(
              String(
                result.error ??
                  "Unable to load popup settings.",
              ),
            );
          }

          const popup =
            result.popup as
              PopupSettings;

          setForm({
            ...DEFAULT_POPUP,
            ...popup,
          });
        } catch (
          caught
        ) {
          setError(
            errorMessage(
              caught,
            ),
          );
        } finally {
          setLoading(
            false,
          );
        }
      },
      [],
    );

  useEffect(
    () => {
      void loadSettings();
    },
    [
      loadSettings,
    ],
  );

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

    setSuccess(
      "",
    );

    try {
      const data =
        new FormData();

      data.append(
        "file",
        file,
      );

      const response =
        await fetch(
          "/api/admin/homepage/promotion-popup/upload",
          {
            method:
              "POST",

            body:
              data,
          },
        );

      const result =
        await readResponse(
          response,
        );

      if (
        !response.ok
      ) {
        throw new Error(
          String(
            result.error ??
              "Image upload failed.",
          ),
        );
      }

      const image =
        result.image as {
          url:
            string;

          publicId:
            string;
        };

      setForm(
        (
          current,
        ) => ({
          ...current,

          image:
            image.url,

          imagePublicId:
            image.publicId,
        }),
      );

      setSuccess(
        "Image uploaded. Save changes to publish.",
      );
    } catch (
      caught
    ) {
      setError(
        errorMessage(
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
    setSaving(
      true,
    );

    setError(
      "",
    );

    setSuccess(
      "",
    );

    try {
      const response =
        await fetch(
          "/api/admin/homepage/promotion-popup",
          {
            method:
              "PATCH",

            headers: {
              "content-type":
                "application/json",
            },

            body:
              JSON.stringify(
                form,
              ),
          },
        );

      const result =
        await readResponse(
          response,
        );

      if (
        !response.ok
      ) {
        throw new Error(
          String(
            result.error ??
              "Unable to save popup.",
          ),
        );
      }

      setSuccess(
        "Promotion popup updated successfully.",
      );

      await loadSettings();
    } catch (
      caught
    ) {
      setError(
        errorMessage(
          caught,
        ),
      );
    } finally {
      setSaving(
        false,
      );
    }
  }

  if (
    loading
  ) {
    return (
      <div
        className={
          styles.loading
        }
      >
        <Loader2
          size={
            22
          }
          className={
            styles.spinner
          }
        />

        Loading promotion popup…
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
          styles.header
        }
      >
        <div>
          <span>
            Homepage Promotion
          </span>

          <h1>
            Promotion Popup
          </h1>

          <p>
            Manage the square popup banner shown when customers visit the homepage.
          </p>
        </div>

        <button
          type="button"
          onClick={
            save
          }
          disabled={
            saving ||
            uploading
          }
          className={
            styles.save
          }
        >
          {saving ? (
            <Loader2
              size={
                16
              }
              className={
                styles.spinner
              }
            />
          ) : (
            <Check
              size={
                16
              }
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

      {success ? (
        <div
          className={
            styles.success
          }
        >
          {success}
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
          <div
            className={
              styles.panelTitle
            }
          >
            <Megaphone
              size={
                20
              }
            />

            <div>
              <h2>
                Popup Settings
              </h2>

              <p>
                Configure visibility and customer destination.
              </p>
            </div>
          </div>

          <label
            className={
              styles.field
            }
          >
            <span>
              Redirect link
            </span>

            <input
              value={
                form.redirectLink ??
                ""
              }
              placeholder="/shop or https://..."
              onChange={(
                event,
              ) =>
                setForm(
                  (
                    current,
                  ) => ({
                    ...current,

                    redirectLink:
                      event.target
                        .value,
                  }),
                )
              }
            />

            <small>
              Clicking anywhere on the promotion image will open this link.
            </small>
          </label>

          <label
            className={
              styles.field
            }
          >
            <span>
              Opening delay
            </span>

            <select
              value={
                form.delayMs
              }
              onChange={(
                event,
              ) =>
                setForm(
                  (
                    current,
                  ) => ({
                    ...current,

                    delayMs:
                      Number(
                        event.target
                          .value,
                      ),
                  }),
                )
              }
            >
              <option
                value={
                  500
                }
              >
                0.5 seconds
              </option>

              <option
                value={
                  1000
                }
              >
                1 second
              </option>

              <option
                value={
                  1400
                }
              >
                1.4 seconds
              </option>

              <option
                value={
                  2000
                }
              >
                2 seconds
              </option>

              <option
                value={
                  3000
                }
              >
                3 seconds
              </option>
            </select>
          </label>

          <div
            className={
              styles.toggleRow
            }
          >
            <div>
              <strong>
                Popup enabled
              </strong>

              <p>
                Show this promotion to homepage visitors.
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
                setForm(
                  (
                    current,
                  ) => ({
                    ...current,

                    enabled:
                      !current.enabled,
                  }),
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
          <div
            className={
              styles.panelTitle
            }
          >
            <ImageIcon
              size={
                20
              }
            />

            <div>
              <h2>
                Square Banner
              </h2>

              <p>
                Recommended 1200 × 1200px.
              </p>
            </div>
          </div>

          <label
            className={
              styles.uploader
            }
          >
            {form.image ? (
              <img
                src={
                  form.image
                }
                alt="Promotion preview"
              />
            ) : (
              <div
                className={
                  styles.emptyUpload
                }
              >
                <ImageIcon
                  size={
                    30
                  }
                />

                <strong>
                  Upload promotion image
                </strong>

                <span>
                  JPG, PNG, WebP or AVIF
                </span>
              </div>
            )}

            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              onChange={
                uploadImage
              }
              disabled={
                uploading
              }
            />

            <span
              className={
                styles.uploadButton
              }
            >
              {uploading ? (
                <Loader2
                  size={
                    15
                  }
                  className={
                    styles.spinner
                  }
                />
              ) : (
                <Upload
                  size={
                    15
                  }
                />
              )}

              {uploading
                ? "Uploading…"
                : "Choose Image"}
            </span>
          </label>
        </section>
      </div>

      <section
        className={
          styles.previewPanel
        }
      >
        <div
          className={
            styles.previewHeading
          }
        >
          <div>
            <strong>
              Storefront Preview
            </strong>

            <span>
              Premium square popup preview
            </span>
          </div>

          {form.redirectLink ? (
            <span
              className={
                styles.linkPreview
              }
            >
              <ExternalLink
                size={
                  13
                }
              />

              {
                form.redirectLink
              }
            </span>
          ) : null}
        </div>

        <div
          className={
            styles.previewStage
          }
        >
          <div
            className={
              styles.previewPopup
            }
          >
            {form.image ? (
              <img
                src={
                  form.image
                }
                alt=""
              />
            ) : (
              <div
                className={
                  styles.previewEmpty
                }
              >
                Promotion image
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}