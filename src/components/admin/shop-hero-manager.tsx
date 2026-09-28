"use client";

import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import {
  CSS,
} from "@dnd-kit/utilities";

import {
  Check,
  ExternalLink,
  GripVertical,
  ImageIcon,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Smartphone,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import Link from "next/link";

import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import styles from "./hero-manager.module.css";

type ShopHeroSlide = {
  id: string;

  title: string;
  subtitle: string | null;

  image: string;
  imagePublicId: string | null;

  mobileImage: string | null;
  mobileImagePublicId: string | null;

  ctaLabel: string | null;
  ctaLink: string | null;

  enabled: boolean;
  sortOrder: number;

  createdAt: string;
  updatedAt: string;
};

type ShopHeroResponse = {
  slides: ShopHeroSlide[];
};

type UploadResult = {
  image: {
    url: string;
    publicId: string;
    width: number;
    height: number;
    format: string;
    bytes: number;
  };
};

type SlideFormState = {
  title: string;
  subtitle: string;

  image: string;
  imagePublicId: string;

  mobileImage: string;
  mobileImagePublicId: string;

  ctaLabel: string;
  ctaLink: string;

  enabled: boolean;
};

const EMPTY_FORM: SlideFormState = {
  title: "",
  subtitle: "",

  image: "",
  imagePublicId: "",

  mobileImage: "",
  mobileImagePublicId: "",

  ctaLabel: "",
  ctaLink: "",

  enabled: true,
};

export function ShopHeroManager() {
  const [slides, setSlides] =
    useState<
      ShopHeroSlide[]
    >([]);

  const [loading, setLoading] =
    useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    editorOpen,
    setEditorOpen,
  ] = useState(false);

  const [
    editingSlide,
    setEditingSlide,
  ] =
    useState<ShopHeroSlide | null>(
      null,
    );

  const [form, setForm] =
    useState<SlideFormState>(
      EMPTY_FORM,
    );

  const [saving, setSaving] =
    useState(false);

  const [
    uploadingDesktop,
    setUploadingDesktop,
  ] = useState(false);

  const [
    uploadingMobile,
    setUploadingMobile,
  ] = useState(false);

  const [
    deletingId,
    setDeletingId,
  ] = useState<
    string | null
  >(null);

  const [
    reordering,
    setReordering,
  ] = useState(false);

  const [error, setError] =
    useState<
      string | null
    >(null);

  const [success, setSuccess] =
    useState<
      string | null
    >(null);

  const sensors =
    useSensors(
      useSensor(
        PointerSensor,
        {
          activationConstraint: {
            distance: 6,
          },
        },
      ),
    );

  const enabledCount =
    useMemo(
      () =>
        slides.filter(
          (slide) =>
            slide.enabled,
        ).length,
      [slides],
    );

  const loadSlides =
    useCallback(
      async (
        silent = false,
      ) => {
        if (silent) {
          setRefreshing(
            true,
          );
        } else {
          setLoading(true);
        }

        setError(null);

        try {
          const response =
            await fetch(
              "/api/admin/shop/hero",
              {
                method:
                  "GET",
                cache:
                  "no-store",
              },
            );

          const data =
            (await response.json()) as
              | ShopHeroResponse
              | {
                  error?: string;
                };

          if (
            !response.ok
          ) {
            throw new Error(
              "error" in
                data &&
              data.error
                ? data.error
                : "Unable to load Shop hero slides.",
            );
          }

          const result =
            data as ShopHeroResponse;

          setSlides(
            [
              ...result.slides,
            ].sort(
              (a, b) =>
                a.sortOrder -
                b.sortOrder,
            ),
          );
        } catch (err) {
          setError(
            getErrorMessage(
              err,
            ),
          );
        } finally {
          setLoading(false);

          setRefreshing(
            false,
          );
        }
      },
      [],
    );

  useEffect(() => {
    void loadSlides();
  }, [loadSlides]);

  function showSuccess(
    message: string,
  ) {
    setSuccess(message);

    window.setTimeout(
      () => {
        setSuccess(null);
      },
      3000,
    );
  }

  function openCreateEditor() {
    setEditingSlide(
      null,
    );

    setForm(
      EMPTY_FORM,
    );

    setError(null);

    setEditorOpen(
      true,
    );
  }

  function openEditEditor(
    slide: ShopHeroSlide,
  ) {
    setEditingSlide(
      slide,
    );

    setForm({
      title:
        slide.title,

      subtitle:
        slide.subtitle ??
        "",

      image:
        slide.image,

      imagePublicId:
        slide.imagePublicId ??
        "",

      mobileImage:
        slide.mobileImage ??
        "",

      mobileImagePublicId:
        slide.mobileImagePublicId ??
        "",

      ctaLabel:
        slide.ctaLabel ??
        "",

      ctaLink:
        slide.ctaLink ??
        "",

      enabled:
        slide.enabled,
    });

    setError(null);

    setEditorOpen(
      true,
    );
  }

  function closeEditor() {
    if (
      saving ||
      uploadingDesktop ||
      uploadingMobile
    ) {
      return;
    }

    setEditorOpen(
      false,
    );

    setEditingSlide(
      null,
    );

    setForm(
      EMPTY_FORM,
    );
  }

  function updateForm<
    K extends keyof SlideFormState,
  >(
    key: K,
    value:
      SlideFormState[K],
  ) {
    setForm(
      (current) => ({
        ...current,
        [key]: value,
      }),
    );
  }

  async function uploadImage(
    file: File,
    variant:
      | "desktop"
      | "mobile",
  ) {
    const isDesktop =
      variant ===
      "desktop";

    if (isDesktop) {
      setUploadingDesktop(
        true,
      );
    } else {
      setUploadingMobile(
        true,
      );
    }

    setError(null);

    try {
      const formData =
        new FormData();

      formData.append(
        "file",
        file,
      );

      formData.append(
        "variant",
        variant,
      );

      const response =
        await fetch(
          "/api/admin/shop/hero/upload",
          {
            method:
              "POST",
            body: formData,
          },
        );

      const result =
        (await response.json()) as
          | UploadResult
          | {
              error?: string;
            };

      if (
        !response.ok
      ) {
        throw new Error(
          "error" in
            result &&
          result.error
            ? result.error
            : "Image upload failed.",
        );
      }

      const uploaded =
        (
          result as UploadResult
        ).image;

      if (isDesktop) {
        setForm(
          (current) => ({
            ...current,

            image:
              uploaded.url,

            imagePublicId:
              uploaded.publicId,
          }),
        );
      } else {
        setForm(
          (current) => ({
            ...current,

            mobileImage:
              uploaded.url,

            mobileImagePublicId:
              uploaded.publicId,
          }),
        );
      }
    } catch (err) {
      setError(
        getErrorMessage(
          err,
        ),
      );
    } finally {
      if (isDesktop) {
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
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file =
      event.target
        .files?.[0];

    event.target.value =
      "";

    if (!file) {
      return;
    }

    await uploadImage(
      file,
      "desktop",
    );
  }

  async function handleMobileFile(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file =
      event.target
        .files?.[0];

    event.target.value =
      "";

    if (!file) {
      return;
    }

    await uploadImage(
      file,
      "mobile",
    );
  }

  async function saveSlide(
    event: FormEvent,
  ) {
    event.preventDefault();

    if (
      !form.title.trim()
    ) {
      setError(
        "Shop hero title is required.",
      );

      return;
    }

    if (
      !form.image.trim()
    ) {
      setError(
        "Upload a desktop Shop hero image first.",
      );

      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        title:
          form.title.trim(),

        subtitle:
          form.subtitle.trim() ||
          null,

        image:
          form.image,

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
      };

      const editing =
        Boolean(
          editingSlide,
        );

      const response =
        await fetch(
          editing
            ? `/api/admin/shop/hero/${editingSlide!.id}`
            : "/api/admin/shop/hero",
          {
            method:
              editing
                ? "PATCH"
                : "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                payload,
              ),
          },
        );

      const data =
        (await response.json()) as {
          slide?: ShopHeroSlide;
          error?: string;
        };

      if (
        !response.ok
      ) {
        throw new Error(
          data.error ||
            "Unable to save Shop hero slide.",
        );
      }

      if (!data.slide) {
        throw new Error(
          "Invalid server response.",
        );
      }

      if (editing) {
        setSlides(
          (current) =>
            current.map(
              (slide) =>
                slide.id ===
                data.slide!.id
                  ? data.slide!
                  : slide,
            ),
        );
      } else {
        setSlides(
          (current) => [
            ...current,
            data.slide!,
          ],
        );
      }

      setEditorOpen(
        false,
      );

      setEditingSlide(
        null,
      );

      setForm(
        EMPTY_FORM,
      );

      showSuccess(
        editing
          ? "Shop hero slide updated."
          : "Shop hero slide created.",
      );

      await loadSlides(
        true,
      );
    } catch (err) {
      setError(
        getErrorMessage(
          err,
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleSlide(
    slide: ShopHeroSlide,
  ) {
    const previous =
      slide.enabled;

    setError(null);

    setSlides(
      (current) =>
        current.map(
          (item) =>
            item.id ===
            slide.id
              ? {
                  ...item,
                  enabled:
                    !previous,
                }
              : item,
        ),
    );

    try {
      const response =
        await fetch(
          `/api/admin/shop/hero/${slide.id}`,
          {
            method:
              "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                enabled:
                  !previous,
              }),
          },
        );

      const data =
        (await response.json()) as {
          slide?: ShopHeroSlide;
          error?: string;
        };

      if (
        !response.ok
      ) {
        throw new Error(
          data.error ||
            "Unable to update slide.",
        );
      }

      if (data.slide) {
        setSlides(
          (current) =>
            current.map(
              (item) =>
                item.id ===
                data.slide!.id
                  ? data.slide!
                  : item,
            ),
        );
      }

      showSuccess(
        !previous
          ? "Slide enabled."
          : "Slide disabled.",
      );
    } catch (err) {
      setSlides(
        (current) =>
          current.map(
            (item) =>
              item.id ===
              slide.id
                ? {
                    ...item,
                    enabled:
                      previous,
                  }
                : item,
          ),
      );

      setError(
        getErrorMessage(
          err,
        ),
      );
    }
  }

  async function deleteSlide(
    slide: ShopHeroSlide,
  ) {
    const confirmed =
      window.confirm(
        `Delete "${slide.title}"?\n\nThis will permanently remove the Shop hero slide and its managed Cloudinary images.`,
      );

    if (!confirmed) {
      return;
    }

    setDeletingId(
      slide.id,
    );

    setError(null);

    try {
      const response =
        await fetch(
          `/api/admin/shop/hero/${slide.id}`,
          {
            method:
              "DELETE",
          },
        );

      const data =
        (await response.json()) as {
          success?: boolean;
          error?: string;
        };

      if (
        !response.ok
      ) {
        throw new Error(
          data.error ||
            "Unable to delete slide.",
        );
      }

      const remaining =
        slides.filter(
          (item) =>
            item.id !==
            slide.id,
        );

      setSlides(
        remaining,
      );

      showSuccess(
        "Shop hero slide deleted.",
      );

      if (
        remaining.length
      ) {
        try {
          await persistOrder(
            remaining,
            false,
          );
        } catch {
          await loadSlides(
            true,
          );
        }
      }
    } catch (err) {
      setError(
        getErrorMessage(
          err,
        ),
      );
    } finally {
      setDeletingId(
        null,
      );
    }
  }

  async function persistOrder(
    orderedSlides:
      ShopHeroSlide[],
    notify = true,
  ) {
    if (
      !orderedSlides.length
    ) {
      return;
    }

    setReordering(
      true,
    );

    try {
      const response =
        await fetch(
          "/api/admin/shop/hero/reorder",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                items:
                  orderedSlides.map(
                    (
                      slide,
                      index,
                    ) => ({
                      id:
                        slide.id,

                      sortOrder:
                        index,
                    }),
                  ),
              }),
          },
        );

      const data =
        (await response.json()) as {
          success?: boolean;
          error?: string;
        };

      if (
        !response.ok
      ) {
        throw new Error(
          data.error ||
            "Unable to save slide order.",
        );
      }

      setSlides(
        orderedSlides.map(
          (
            slide,
            index,
          ) => ({
            ...slide,
            sortOrder:
              index,
          }),
        ),
      );

      if (notify) {
        showSuccess(
          "Shop hero order updated.",
        );
      }
    } finally {
      setReordering(
        false,
      );
    }
  }

  async function handleDragEnd(
    event: DragEndEvent,
  ) {
    const {
      active,
      over,
    } = event;

    if (
      !over ||
      active.id ===
        over.id
    ) {
      return;
    }

    const oldIndex =
      slides.findIndex(
        (slide) =>
          slide.id ===
          active.id,
      );

    const newIndex =
      slides.findIndex(
        (slide) =>
          slide.id ===
          over.id,
      );

    if (
      oldIndex < 0 ||
      newIndex < 0
    ) {
      return;
    }

    const previous =
      slides;

    const reordered =
      arrayMove(
        slides,
        oldIndex,
        newIndex,
      );

    setSlides(
      reordered,
    );

    try {
      await persistOrder(
        reordered,
      );
    } catch (err) {
      setSlides(
        previous,
      );

      setError(
        getErrorMessage(
          err,
        ),
      );
    }
  }

  function removeMobileImage() {
    setForm(
      (current) => ({
        ...current,

        mobileImage: "",

        mobileImagePublicId:
          "",
      }),
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
          size={28}
          className={
            styles.spinner
          }
        />

        <span>
          Loading Shop Hero
          Manager…
        </span>
      </div>
    );
  }

  return (
    <div
      className={
        styles.manager
      }
    >
      <div
        className={
          styles.header
        }
      >
        <div>
          <p
            className={
              styles.eyebrow
            }
          >
            Shop Page
          </p>

          <h1>
            Shop Hero
          </h1>

          <p
            className={
              styles.description
            }
          >
            Manage Shop page
            banners, responsive
            images, campaign
            text and CTA links.
          </p>
        </div>

        <div
          className={
            styles.headerActions
          }
        >
          <Link
            href="/shop"
            target="_blank"
            className={
              styles.secondaryButton
            }
          >
            <ExternalLink
              size={16}
            />

            View Shop
          </Link>

          <button
            type="button"
            className={
              styles.secondaryButton
            }
            disabled={
              refreshing
            }
            onClick={() =>
              void loadSlides(
                true,
              )
            }
          >
            <RefreshCw
              size={16}
              className={
                refreshing
                  ? styles.spinner
                  : undefined
              }
            />

            Refresh
          </button>

          <button
            type="button"
            className={
              styles.primaryButton
            }
            onClick={
              openCreateEditor
            }
          >
            <Plus
              size={17}
            />

            Add Shop Banner
          </button>
        </div>
      </div>

      {error ? (
        <div
          className={
            styles.errorBanner
          }
        >
          <span>
            {error}
          </span>

          <button
            type="button"
            onClick={() =>
              setError(null)
            }
          >
            <X
              size={17}
            />
          </button>
        </div>
      ) : null}

      {success ? (
        <div
          className={
            styles.successBanner
          }
        >
          <Check
            size={17}
          />

          {success}
        </div>
      ) : null}

      <div
        className={
          styles.metrics
        }
      >
        <Metric
          label="Total banners"
          value={
            slides.length
          }
        />

        <Metric
          label="Active"
          value={
            enabledCount
          }
        />

        <Metric
          label="Disabled"
          value={
            slides.length -
            enabledCount
          }
        />

        <Metric
          label="Status"
          value={
            enabledCount > 0
              ? "Live"
              : "Fallback"
          }
        />
      </div>

      <div
        className={
          styles.infoBar
        }
      >
        <ImageIcon
          size={17}
        />

        <div>
          <strong>
            Recommended sizes
          </strong>

          <span>
            Desktop:
            1920 × 650px ·
            Mobile:
            900 × 1100px ·
            JPG/PNG/WebP/AVIF ·
            max 8MB
          </span>
        </div>
      </div>

      <div
        className={
          styles.panel
        }
      >
        <div
          className={
            styles.panelHeader
          }
        >
          <div>
            <h2>
              Shop Banners
            </h2>

            <p>
              Drag banners to
              control their
              storefront order.
            </p>
          </div>

          {reordering ? (
            <span
              className={
                styles.savingStatus
              }
            >
              <Loader2
                size={14}
                className={
                  styles.spinner
                }
              />

              Saving order…
            </span>
          ) : null}
        </div>

        {slides.length ? (
          <DndContext
            sensors={
              sensors
            }
            collisionDetection={
              closestCenter
            }
            onDragEnd={
              handleDragEnd
            }
          >
            <SortableContext
              items={slides.map(
                (slide) =>
                  slide.id,
              )}
              strategy={
                verticalListSortingStrategy
              }
            >
              <div
                className={
                  styles.slideList
                }
              >
                {slides.map(
                  (
                    slide,
                    index,
                  ) => (
                    <SortableSlide
                      key={
                        slide.id
                      }
                      slide={
                        slide
                      }
                      index={
                        index
                      }
                      deleting={
                        deletingId ===
                        slide.id
                      }
                      onEdit={
                        openEditEditor
                      }
                      onDelete={
                        deleteSlide
                      }
                      onToggle={
                        toggleSlide
                      }
                    />
                  ),
                )}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <div
            className={
              styles.empty
            }
          >
            <div
              className={
                styles.emptyIcon
              }
            >
              <ImageIcon
                size={25}
              />
            </div>

            <h3>
              No Shop banners yet
            </h3>

            <p>
              Add your first
              Shop hero banner
              to replace the
              default fallback.
            </p>

            <button
              type="button"
              className={
                styles.primaryButton
              }
              onClick={
                openCreateEditor
              }
            >
              <Plus
                size={16}
              />

              Add Shop Banner
            </button>
          </div>
        )}
      </div>

      {editorOpen ? (
        <div
          className={
            styles.editorBackdrop
          }
          onMouseDown={
            closeEditor
          }
        >
          <form
            className={
              styles.editor
            }
            onSubmit={
              saveSlide
            }
            onMouseDown={(
              event,
            ) =>
              event.stopPropagation()
            }
          >
            <div
              className={
                styles.editorHeader
              }
            >
              <div>
                <span>
                  Shop Page
                </span>

                <h2>
                  {editingSlide
                    ? "Edit Shop Banner"
                    : "Add Shop Banner"}
                </h2>
              </div>

              <button
                type="button"
                className={
                  styles.iconButton
                }
                aria-label="Close editor"
                onClick={
                  closeEditor
                }
              >
                <X
                  size={18}
                />
              </button>
            </div>

            <div
              className={
                styles.editorBody
              }
            >
              <div
                className={
                  styles.editorGrid
                }
              >
                <div
                  className={
                    styles.formColumn
                  }
                >
                  <label
                    className={
                      styles.field
                    }
                  >
                    <span>
                      Banner title{" "}
                      <b>
                        *
                      </b>
                    </span>

                    <input
                      className={
                        styles.input
                      }
                      value={
                        form.title
                      }
                      onChange={(
                        event,
                      ) =>
                        updateForm(
                          "title",
                          event
                            .target
                            .value,
                        )
                      }
                      placeholder="Shop the latest drop"
                      maxLength={
                        120
                      }
                      required
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
                      className={
                        styles.textarea
                      }
                      value={
                        form.subtitle
                      }
                      onChange={(
                        event,
                      ) =>
                        updateForm(
                          "subtitle",
                          event
                            .target
                            .value,
                        )
                      }
                      placeholder="Premium styles for your everyday game."
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
                        className={
                          styles.input
                        }
                        value={
                          form.ctaLabel
                        }
                        onChange={(
                          event,
                        ) =>
                          updateForm(
                            "ctaLabel",
                            event
                              .target
                              .value,
                          )
                        }
                        placeholder="Shop Now"
                        maxLength={
                          80
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
                        className={
                          styles.input
                        }
                        value={
                          form.ctaLink
                        }
                        onChange={(
                          event,
                        ) =>
                          updateForm(
                            "ctaLink",
                            event
                              .target
                              .value,
                          )
                        }
                        placeholder="/shop?category=polo"
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
                        Banner visibility
                      </strong>

                      <p>
                        Disabled banners
                        stay saved but
                        will not appear
                        on the Shop page.
                      </p>
                    </div>

                    <button
                      type="button"
                      aria-label="Toggle banner visibility"
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
                </div>

                <div
                  className={
                    styles.mediaColumn
                  }
                >
                  <div
                    className={
                      styles.uploadBlock
                    }
                  >
                    <div
                      className={
                        styles.uploadHeading
                      }
                    >
                      <div>
                        <strong>
                          Desktop image
                        </strong>

                        <span>
                          Required ·
                          recommended
                          1920 × 650px
                        </span>
                      </div>
                    </div>

                    {form.image ? (
                      <div
                        className={
                          styles.uploadPreview
                        }
                      >
                        <img
                          src={
                            form.image
                          }
                          alt="Desktop banner preview"
                        />

                        <label
                          className={
                            styles.replaceOverlay
                          }
                        >
                          {uploadingDesktop ? (
                            <Loader2
                              size={
                                14
                              }
                              className={
                                styles.spinner
                              }
                            />
                          ) : (
                            <Upload
                              size={
                                14
                              }
                            />
                          )}

                          Replace

                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/avif"
                            hidden
                            disabled={
                              uploadingDesktop
                            }
                            onChange={
                              handleDesktopFile
                            }
                          />
                        </label>
                      </div>
                    ) : (
                      <label
                        className={
                          styles.uploadDrop
                        }
                      >
                        {uploadingDesktop ? (
                          <Loader2
                            size={
                              24
                            }
                            className={
                              styles.spinner
                            }
                          />
                        ) : (
                          <Upload
                            size={
                              24
                            }
                          />
                        )}

                        <strong>
                          Upload desktop
                          image
                        </strong>

                        <span>
                          JPG, PNG,
                          WebP or AVIF
                          · max 8MB
                        </span>

                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/avif"
                          hidden
                          disabled={
                            uploadingDesktop
                          }
                          onChange={
                            handleDesktopFile
                          }
                        />
                      </label>
                    )}
                  </div>

                  <div
                    className={
                      styles.uploadBlock
                    }
                  >
                    <div
                      className={
                        styles.uploadHeading
                      }
                    >
                      <div>
                        <strong>
                          Mobile image
                        </strong>

                        <span>
                          Optional ·
                          recommended
                          900 × 1100px
                        </span>
                      </div>

                      {form.mobileImage ? (
                        <button
                          type="button"
                          className={
                            styles.removeMedia
                          }
                          onClick={
                            removeMobileImage
                          }
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>

                    {form.mobileImage ? (
                      <div
                        className={
                          styles.uploadPreview
                        }
                      >
                        <img
                          src={
                            form.mobileImage
                          }
                          alt="Mobile banner preview"
                        />

                        <label
                          className={
                            styles.replaceOverlay
                          }
                        >
                          {uploadingMobile ? (
                            <Loader2
                              size={
                                14
                              }
                              className={
                                styles.spinner
                              }
                            />
                          ) : (
                            <Upload
                              size={
                                14
                              }
                            />
                          )}

                          Replace

                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/avif"
                            hidden
                            disabled={
                              uploadingMobile
                            }
                            onChange={
                              handleMobileFile
                            }
                          />
                        </label>
                      </div>
                    ) : (
                      <label
                        className={
                          styles.uploadDrop
                        }
                      >
                        {uploadingMobile ? (
                          <Loader2
                            size={
                              24
                            }
                            className={
                              styles.spinner
                            }
                          />
                        ) : (
                          <Smartphone
                            size={
                              24
                            }
                          />
                        )}

                        <strong>
                          Upload mobile
                          image
                        </strong>

                        <span>
                          Falls back to
                          desktop image
                          if empty
                        </span>

                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/avif"
                          hidden
                          disabled={
                            uploadingMobile
                          }
                          onChange={
                            handleMobileFile
                          }
                        />
                      </label>
                    )}

                    {!form.mobileImage ? (
                      <p
                        className={
                          styles.mobileFallback
                        }
                      >
                        The desktop
                        banner will be
                        used automatically
                        on mobile until a
                        dedicated mobile
                        image is uploaded.
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>

              <div
                className={
                  styles.previewSection
                }
              >
                <div
                  className={
                    styles.previewHeading
                  }
                >
                  <strong>
                    Live preview
                  </strong>

                  <span>
                    Approximate Shop
                    hero appearance.
                  </span>
                </div>

                <div
                  className={
                    styles.heroPreview
                  }
                  style={{
                    backgroundImage:
                      form.image
                        ? `linear-gradient(90deg, rgba(0,0,0,.64), rgba(0,0,0,.08)), url("${form.image}")`
                        : undefined,
                  }}
                >
                  <div
                    className={
                      styles.heroPreviewContent
                    }
                  >
                    <span>
                      Game On Garb
                    </span>

                    <h3>
                      {form.title ||
                        "Shop"}
                    </h3>

                    {form.subtitle ? (
                      <p>
                        {
                          form.subtitle
                        }
                      </p>
                    ) : null}

                    {form.ctaLabel ? (
                      <button
                        type="button"
                      >
                        {
                          form.ctaLabel
                        }

                        <span>
                          →
                        </span>
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <div
              className={
                styles.editorFooter
              }
            >
              <button
                type="button"
                className={
                  styles.secondaryButton
                }
                disabled={
                  saving
                }
                onClick={
                  closeEditor
                }
              >
                Cancel
              </button>

              <button
                type="submit"
                className={
                  styles.primaryButton
                }
                disabled={
                  saving ||
                  uploadingDesktop ||
                  uploadingMobile
                }
              >
                {saving ? (
                  <>
                    <Loader2
                      size={15}
                      className={
                        styles.spinner
                      }
                    />

                    Saving…
                  </>
                ) : (
                  <>
                    <Check
                      size={15}
                    />

                    {editingSlide
                      ? "Save Changes"
                      : "Create Banner"}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function SortableSlide({
  slide,
  index,
  deleting,
  onEdit,
  onDelete,
  onToggle,
}: {
  slide: ShopHeroSlide;
  index: number;
  deleting: boolean;

  onEdit: (
    slide: ShopHeroSlide,
  ) => void;

  onDelete: (
    slide: ShopHeroSlide,
  ) => void;

  onToggle: (
    slide: ShopHeroSlide,
  ) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: slide.id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`${styles.slideCard} ${
        isDragging
          ? styles.dragging
          : ""
      }`}
      style={{
        transform:
          CSS.Transform.toString(
            transform,
          ),

        transition,
      }}
    >
      <button
        type="button"
        className={
          styles.dragHandle
        }
        aria-label="Drag banner"
        {...attributes}
        {...listeners}
      >
        <GripVertical
          size={18}
        />
      </button>

      <span
        className={
          styles.slideNumber
        }
      >
        {String(
          index + 1,
        ).padStart(
          2,
          "0",
        )}
      </span>

      <div
        className={
          styles.thumbnail
        }
      >
        <img
          src={
            slide.image
          }
          alt={
            slide.title
          }
        />

        {!slide.enabled ? (
          <span
            className={
              styles.hiddenBadge
            }
          >
            Hidden
          </span>
        ) : null}
      </div>

      <div
        className={
          styles.slideContent
        }
      >
        <div
          className={
            styles.slideTitleRow
          }
        >
          <div>
            <h3>
              {
                slide.title
              }
            </h3>

            <p>
              {slide.subtitle ||
                "No subtitle"}
            </p>
          </div>

          <span
            className={`${styles.statusBadge} ${
              slide.enabled
                ? styles.statusLive
                : styles.statusDisabled
            }`}
          >
            {slide.enabled
              ? "Live"
              : "Hidden"}
          </span>
        </div>

        <div
          className={
            styles.slideMeta
          }
        >
          <span>
            Desktop image
          </span>

          <span>
            {slide.mobileImage
              ? "Mobile image"
              : "Desktop fallback"}
          </span>

          <span>
            {slide.ctaLabel
              ? `CTA: ${slide.ctaLabel}`
              : "No CTA"}
          </span>
        </div>
      </div>

      <div
        className={
          styles.slideActions
        }
      >
        <label
          className={
            styles.switchLabel
          }
        >
          <span>
            Visible
          </span>

          <button
            type="button"
            aria-label="Toggle banner"
            className={`${styles.switch} ${
              slide.enabled
                ? styles.switchOn
                : ""
            }`}
            onClick={() =>
              void onToggle(
                slide,
              )
            }
          >
            <span />
          </button>
        </label>

        <button
          type="button"
          className={
            styles.smallButton
          }
          onClick={() =>
            onEdit(
              slide,
            )
          }
        >
          <Pencil
            size={14}
          />

          Edit
        </button>

        <button
          type="button"
          aria-label="Delete banner"
          className={
            styles.deleteButton
          }
          disabled={
            deleting
          }
          onClick={() =>
            void onDelete(
              slide,
            )
          }
        >
          {deleting ? (
            <Loader2
              size={15}
              className={
                styles.spinner
              }
            />
          ) : (
            <Trash2
              size={15}
            />
          )}
        </button>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value:
    | string
    | number;
}) {
  return (
    <div
      className={
        styles.metric
      }
    >
      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>
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