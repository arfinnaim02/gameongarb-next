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
  Smartphone,
  Upload,
} from "lucide-react";

import styles from "./homepage-campaign-manager.module.css";

type CampaignKind =
  | "sports"
  | "polo";

type CampaignSection = {
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

  mobileImage:
    | string
    | null;

  mobileImagePublicId:
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

  mobileImage: string;
  mobileImagePublicId: string;

  ctaLabel: string;
  ctaLink: string;

  enabled: boolean;
};

type Props = {
  kind: CampaignKind;
  title: string;
  eyebrow: string;
  defaultHeading: string;
  defaultSubtitle: string;
  defaultCtaLabel: string;
  defaultCtaLink: string;
};

async function readResponse(
  response: Response,
) {
  const text =
    await response.text();

  if (!text) {
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
      text.slice(
        0,
        500,
      ) ||
        `Request failed with status ${response.status}.`,
    );
  }
}

export function HomepageCampaignManager({
  kind,
  title,
  eyebrow,
  defaultHeading,
  defaultSubtitle,
  defaultCtaLabel,
  defaultCtaLink,
}: Props) {
  const endpoint =
    `/api/admin/homepage/campaign/${kind}`;

  const [
    form,
    setForm,
  ] =
    useState<FormState>({
      heading:
        defaultHeading,

      subtitle:
        defaultSubtitle,

      image: "",
      imagePublicId: "",

      mobileImage: "",
      mobileImagePublicId: "",

      ctaLabel:
        defaultCtaLabel,

      ctaLink:
        defaultCtaLink,

      enabled: true,
    });

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    uploadingDesktop,
    setUploadingDesktop,
  ] =
    useState(false);

  const [
    uploadingMobile,
    setUploadingMobile,
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
    success,
    setSuccess,
  ] =
    useState("");

  const loadCampaign =
    useCallback(
      async () => {
        setLoading(true);
        setError("");

        try {
          const response =
            await fetch(
              endpoint,
              {
                cache:
                  "no-store",
              },
            );

          const result =
            await readResponse(
              response,
            );

          if (!response.ok) {
            throw new Error(
              String(
                result.error ??
                  "Unable to load campaign.",
              ),
            );
          }

          const section =
            result.section as
              CampaignSection;

          setForm({
            heading:
              section.heading ??
              defaultHeading,

            subtitle:
              section.subtitle ??
              defaultSubtitle,

            image:
              section.image ??
              "",

            imagePublicId:
              section.imagePublicId ??
              "",

            mobileImage:
              section.mobileImage ??
              "",

            mobileImagePublicId:
              section.mobileImagePublicId ??
              "",

            ctaLabel:
              section.ctaLabel ??
              defaultCtaLabel,

            ctaLink:
              section.ctaLink ??
              defaultCtaLink,

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
      [
        defaultCtaLabel,
        defaultCtaLink,
        defaultHeading,
        defaultSubtitle,
        endpoint,
      ],
    );

  useEffect(() => {
    void loadCampaign();
  }, [loadCampaign]);

  function updateForm<
    K extends keyof FormState,
  >(
    key: K,
    value: FormState[K],
  ) {
    setForm(
      (current) => ({
        ...current,
        [key]:
          value,
      }),
    );
  }

  async function uploadImage(
    file: File,
    variant:
      | "desktop"
      | "mobile",
  ) {
    const desktop =
      variant ===
      "desktop";

    if (desktop) {
      setUploadingDesktop(
        true,
      );
    } else {
      setUploadingMobile(
        true,
      );
    }

    setError("");
    setSuccess("");

    try {
      const data =
        new FormData();

      data.append(
        "file",
        file,
      );

      data.append(
        "variant",
        variant,
      );

      const response =
        await fetch(
          `${endpoint}/upload`,
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

      if (!response.ok) {
        throw new Error(
          String(
            result.error ??
              "Image upload failed.",
          ),
        );
      }

      const image =
        result.image as {
          url: string;
          publicId: string;
        };

      if (desktop) {
        setForm(
          (current) => ({
            ...current,

            image:
              image.url,

            imagePublicId:
              image.publicId,
          }),
        );
      } else {
        setForm(
          (current) => ({
            ...current,

            mobileImage:
              image.url,

            mobileImagePublicId:
              image.publicId,
          }),
        );
      }

      setSuccess(
        `${desktop ? "Desktop" : "Mobile"} image uploaded. Save changes to publish.`,
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
      if (desktop) {
        setUploadingDesktop(
          false,
        );
      } else {
        setUploadingMobile(
          false,
        );
      }
    }
  }

  async function handleDesktopFile(
    event:
      ChangeEvent<HTMLInputElement>,
  ) {
    const file =
      event.target.files?.[0];

    event.target.value =
      "";

    if (file) {
      await uploadImage(
        file,
        "desktop",
      );
    }
  }

  async function handleMobileFile(
    event:
      ChangeEvent<HTMLInputElement>,
  ) {
    const file =
      event.target.files?.[0];

    event.target.value =
      "";

    if (file) {
      await uploadImage(
        file,
        "mobile",
      );
    }
  }

  async function saveCampaign() {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response =
        await fetch(
          endpoint,
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
                  form.heading.trim() ||
                  null,

                subtitle:
                  form.subtitle.trim() ||
                  null,

                image:
                  form.image ||
                  null,

                imagePublicId:
                  form.imagePublicId ||
                  null,

                mobileImage:
                  form.mobileImage ||
                  null,

                mobileImagePublicId:
                  form.mobileImagePublicId ||
                  null,

                ctaLabel:
                  form.ctaLabel.trim() ||
                  null,

                ctaLink:
                  form.ctaLink.trim() ||
                  null,

                enabled:
                  form.enabled,
              }),
          },
        );

      const result =
        await readResponse(
          response,
        );

      if (!response.ok) {
        throw new Error(
          String(
            result.error ??
              "Unable to save campaign.",
          ),
        );
      }

      setSuccess(
        `${title} updated successfully.`,
      );

      await loadCampaign();
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

        Loading {title}…
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
          <span
            className={
              styles.eyebrow
            }
          >
            Homepage Campaign
          </span>

          <h1>
            {title}
          </h1>

          <p>
            Manage desktop and
            mobile campaign
            imagery, copy, CTA
            and visibility.
          </p>
        </div>

        <button
          type="button"
          className={
            styles.saveButton
          }
          disabled={
            saving ||
            uploadingDesktop ||
            uploadingMobile
          }
          onClick={
            saveCampaign
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
          <h2>
            Campaign Content
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
              Supporting text
            </span>

            <textarea
              rows={4}
              value={
                form.subtitle
              }
              maxLength={
                500
              }
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
            Campaign Images
          </h2>

          <CampaignUploader
            title="Desktop Image"
            hint="Recommended 1400 × 760px or larger"
            image={
              form.image
            }
            uploading={
              uploadingDesktop
            }
            icon={
              <ImageIcon
                size={25}
              />
            }
            onChange={
              handleDesktopFile
            }
          />

          <CampaignUploader
            title="Mobile Image"
            hint="Recommended 900 × 1100px"
            image={
              form.mobileImage
            }
            uploading={
              uploadingMobile
            }
            icon={
              <Smartphone
                size={25}
              />
            }
            onChange={
              handleMobileFile
            }
          />

          <p
            className={
              styles.hint
            }
          >
            If no mobile image is
            uploaded, the desktop
            image is used
            automatically.
          </p>
        </section>
      </div>

      <section
        className={
          styles.previewPanel
        }
      >
        <div
          className={
            styles.previewLabel
          }
        >
          Storefront Preview
        </div>

        <div
          className={
            styles.preview
          }
          style={{
            backgroundImage:
              form.image
                ? `linear-gradient(90deg, rgba(4,6,5,.88), rgba(4,6,5,.18)), url("${form.image}")`
                : undefined,
          }}
        >
          <div
            className={
              styles.previewCopy
            }
          >
            <span>
              {eyebrow}
            </span>

            <h2>
              {form.heading ||
                defaultHeading}
            </h2>

            {form.ctaLabel ? (
              <b>
                {form.ctaLabel}

                <i>
                  →
                </i>
              </b>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}

function CampaignUploader({
  title,
  hint,
  image,
  uploading,
  icon,
  onChange,
}: {
  title: string;
  hint: string;
  image: string;
  uploading: boolean;
  icon: React.ReactNode;
  onChange: (
    event:
      ChangeEvent<HTMLInputElement>,
  ) => void;
}) {
  return (
    <div
      className={
        styles.mediaBlock
      }
    >
      <div
        className={
          styles.mediaHeading
        }
      >
        <strong>
          {title}
        </strong>

        <span>
          {hint}
        </span>
      </div>

      {image ? (
        <div
          className={
            styles.imagePreview
          }
        >
          <img
            src={image}
            alt={`${title} preview`}
          />

          <label
            className={
              styles.replace
            }
          >
            <Upload
              size={15}
            />

            Replace

            <input
              type="file"
              hidden
              disabled={
                uploading
              }
              accept="image/jpeg,image/png,image/webp,image/avif"
              onChange={
                onChange
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
              size={25}
              className={
                styles.spinner
              }
            />
          ) : (
            icon
          )}

          <strong>
            {uploading
              ? "Uploading…"
              : `Upload ${title}`}
          </strong>

          <span>
            JPG, PNG, WebP or
            AVIF · max 8MB
          </span>

          <input
            type="file"
            hidden
            disabled={
              uploading
            }
            accept="image/jpeg,image/png,image/webp,image/avif"
            onChange={
              onChange
            }
          />
        </label>
      )}
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