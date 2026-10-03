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
  verticalListSortingStrategy,
  useSortable,
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

type HeroSection = {
  id: string;
  type: "HERO";
  name: string;
  heading: string | null;
  subtitle: string | null;
  image: string | null;
  ctaLabel: string | null;
  ctaLink: string | null;
  config: unknown;
  enabled: boolean;
  sortOrder: number;
};

type HeroSlide = {
  id: string;
  sectionId: string;
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

type HeroResponse = {
  section: HeroSection;
  slides: HeroSlide[];
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

export function HeroManager() {
  const [section, setSection] =
    useState<HeroSection | null>(null);

  const [slides, setSlides] =
    useState<HeroSlide[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [editorOpen, setEditorOpen] =
    useState(false);

  const [editingSlide, setEditingSlide] =
    useState<HeroSlide | null>(null);

  const [form, setForm] =
    useState<SlideFormState>(EMPTY_FORM);

  const [saving, setSaving] =
    useState(false);

  const [uploadingDesktop, setUploadingDesktop] =
    useState(false);

  const [uploadingMobile, setUploadingMobile] =
    useState(false);

  const [deletingId, setDeletingId] =
    useState<string | null>(null);

  const [reordering, setReordering] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
  );

  const enabledCount =
    useMemo(
      () =>
        slides.filter(
          (slide) => slide.enabled,
        ).length,
      [slides],
    );

  const loadHero = useCallback(
    async (silent = false) => {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      try {
        const response = await fetch(
          "/api/admin/homepage/hero",
          {
            method: "GET",
            cache: "no-store",
          },
        );

        const data =
          (await response.json()) as
            | HeroResponse
            | { error?: string };

        if (!response.ok) {
          throw new Error(
            "error" in data &&
              data.error
              ? data.error
              : "Unable to load hero slides.",
          );
        }

        const hero =
          data as HeroResponse;

        setSection(hero.section);

        setSlides(
          [...hero.slides].sort(
            (a, b) =>
              a.sortOrder -
              b.sortOrder,
          ),
        );
      } catch (err) {
        setError(
          getErrorMessage(err),
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadHero();
  }, [loadHero]);

  function showSuccess(
    message: string,
  ) {
    setSuccess(message);

    window.setTimeout(() => {
      setSuccess(null);
    }, 3000);
  }

  function openCreateEditor() {
    setEditingSlide(null);
    setForm(EMPTY_FORM);
    setError(null);
    setEditorOpen(true);
  }

  function openEditEditor(
    slide: HeroSlide,
  ) {
    setEditingSlide(slide);

    setForm({
      title: slide.title,
      subtitle:
        slide.subtitle ?? "",

      image: slide.image,
      imagePublicId:
        slide.imagePublicId ?? "",

      mobileImage:
        slide.mobileImage ?? "",

      mobileImagePublicId:
        slide.mobileImagePublicId ??
        "",

      ctaLabel:
        slide.ctaLabel ?? "",

      ctaLink:
        slide.ctaLink ?? "",

      enabled: slide.enabled,
    });

    setError(null);
    setEditorOpen(true);
  }

  function closeEditor() {
    if (
      saving ||
      uploadingDesktop ||
      uploadingMobile
    ) {
      return;
    }

    setEditorOpen(false);
    setEditingSlide(null);
    setForm(EMPTY_FORM);
  }

  function updateForm<
    K extends keyof SlideFormState,
  >(
    key: K,
    value: SlideFormState[K],
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
      variant === "desktop";

    if (isDesktop) {
      setUploadingDesktop(true);
    } else {
      setUploadingMobile(true);
    }

    setError(null);

    try {
      const data = new FormData();

      data.append("file", file);

      data.append(
        "variant",
        variant,
      );

      const response = await fetch(
        "/api/admin/homepage/hero/upload",
        {
          method: "POST",
          body: data,
        },
      );

      const result =
        (await response.json()) as
          | UploadResult
          | { error?: string };

      if (!response.ok) {
        throw new Error(
          "error" in result &&
            result.error
            ? result.error
            : "Image upload failed.",
        );
      }

      const uploaded =
        (result as UploadResult)
          .image;

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
        getErrorMessage(err),
      );
    } finally {
      if (isDesktop) {
        setUploadingDesktop(false);
      } else {
        setUploadingMobile(false);
      }
    }
  }

  async function handleDesktopFile(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file =
      event.target.files?.[0];

    event.target.value = "";

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
      event.target.files?.[0];

    event.target.value = "";

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

    if (!form.title.trim()) {
      setError(
        "Hero title is required.",
      );

      return;
    }

    if (!form.image.trim()) {
      setError(
        "Upload a desktop hero image first.",
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
        Boolean(editingSlide);

      const response = await fetch(
        editing
          ? `/api/admin/homepage/hero/${editingSlide!.id}`
          : "/api/admin/homepage/hero",

        {
          method:
            editing
              ? "PATCH"
              : "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify(
            payload,
          ),
        },
      );

      const data =
        (await response.json()) as {
          slide?: HeroSlide;
          error?: string;
        };

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to save hero slide.",
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

      setEditorOpen(false);
setEditingSlide(null);
setForm(EMPTY_FORM);

      showSuccess(
        editing
          ? "Hero slide updated."
          : "Hero slide created.",
      );

      await loadHero(true);
    } catch (err) {
      setError(
        getErrorMessage(err),
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleSlide(
    slide: HeroSlide,
  ) {
    setError(null);

    const previous =
      slide.enabled;

    setSlides(
      (current) =>
        current.map(
          (item) =>
            item.id === slide.id
              ? {
                  ...item,
                  enabled:
                    !previous,
                }
              : item,
        ),
    );

    try {
      const response = await fetch(
        `/api/admin/homepage/hero/${slide.id}`,
        {
          method: "PATCH",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            enabled: !previous,
          }),
        },
      );

      const data =
        (await response.json()) as {
          slide?: HeroSlide;
          error?: string;
        };

      if (!response.ok) {
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
              item.id === slide.id
                ? {
                    ...item,
                    enabled:
                      previous,
                  }
                : item,
          ),
      );

      setError(
        getErrorMessage(err),
      );
    }
  }

  async function deleteSlide(
    slide: HeroSlide,
  ) {
    const confirmed =
      window.confirm(
        `Delete "${slide.title}"?\n\nThis will permanently remove the slide and its managed Cloudinary images.`,
      );

    if (!confirmed) {
      return;
    }

    setDeletingId(slide.id);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/homepage/hero/${slide.id}`,
        {
          method: "DELETE",
        },
      );

      const data =
        (await response.json()) as {
          success?: boolean;
          error?: string;
        };

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to delete slide.",
        );
      }

      setSlides(
        (current) =>
          current.filter(
            (item) =>
              item.id !== slide.id,
          ),
      );

      showSuccess(
        "Hero slide deleted.",
      );

      await normalizeOrderAfterDelete(
        slide.id,
      );
    } catch (err) {
      setError(
        getErrorMessage(err),
      );
    } finally {
      setDeletingId(null);
    }
  }

  async function normalizeOrderAfterDelete(
    deletedId: string,
  ) {
    const remaining =
      slides.filter(
        (slide) =>
          slide.id !== deletedId,
      );

    if (!remaining.length) {
      return;
    }

    try {
      await persistOrder(
        remaining,
        false,
      );
    } catch {
      // The slide is already deleted.
      // A refresh will recover canonical ordering.
      await loadHero(true);
    }
  }

  async function persistOrder(
    orderedSlides: HeroSlide[],
    notify = true,
  ) {
    setReordering(true);

    try {
      const response = await fetch(
        "/api/admin/homepage/hero/reorder",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            items:
              orderedSlides.map(
                (slide, index) => ({
                  id: slide.id,
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

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to save slide order.",
        );
      }

      setSlides(
        orderedSlides.map(
          (slide, index) => ({
            ...slide,
            sortOrder:
              index,
          }),
        ),
      );

      if (notify) {
        showSuccess(
          "Hero order updated.",
        );
      }
    } finally {
      setReordering(false);
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
      active.id === over.id
    ) {
      return;
    }

    const oldIndex =
      slides.findIndex(
        (slide) =>
          slide.id === active.id,
      );

    const newIndex =
      slides.findIndex(
        (slide) =>
          slide.id === over.id,
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

    setSlides(reordered);

    try {
      await persistOrder(
        reordered,
      );
    } catch (err) {
      setSlides(previous);

      setError(
        getErrorMessage(err),
      );
    }
  }

  async function removeMobileImage() {
    setForm(
      (current) => ({
        ...current,
        mobileImage: "",
        mobileImagePublicId: "",
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
          className={
            styles.spinner
          }
          size={28}
        />

        <span>
          Loading Hero Manager…
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
            Homepage Builder
          </p>

          <h1>
            Hero Slides
          </h1>

          <p
            className={
              styles.description
            }
          >
            Manage homepage
            banners, responsive
            images and campaign
            links.
          </p>
        </div>

        <div
          className={
            styles.headerActions
          }
        >
          <Link
            href="/"
            target="_blank"
            className={
              styles.secondaryButton
            }
          >
            <ExternalLink
              size={16}
            />

            View Store
          </Link>

          <button
            type="button"
            className={
              styles.secondaryButton
            }
            disabled={refreshing}
            onClick={() =>
              void loadHero(
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
            <Plus size={17} />

            Add Hero Slide
          </button>
        </div>
      </div>

      {error ? (
        <div
          className={
            styles.errorBanner
          }
        >
          <span>{error}</span>

          <button
            type="button"
            onClick={() =>
              setError(null)
            }
          >
            <X size={17} />
          </button>
        </div>
      ) : null}

      {success ? (
        <div
          className={
            styles.successBanner
          }
        >
          <Check size={17} />
          {success}
        </div>
      ) : null}

      <div
        className={
          styles.metrics
        }
      >
        <Metric
          label="Total slides"
          value={
            slides.length
          }
        />

        <Metric
          label="Active slides"
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
          label="Hero section"
          value={
            section?.enabled
              ? "Live"
              : "Hidden"
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
          Desktop frame:
          1920 × 850px ·
          Mobile frame:
          900 × 1200px ·
          Different image sizes are
          automatically cropped to fit ·
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
              Homepage Hero
            </h2>

            <p>
              Drag slides to
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

        {!slides.length ? (
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
                size={26}
              />
            </div>

            <h3>
              No hero slides yet
            </h3>

            <p>
              Add your first
              homepage banner.
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
                size={17}
              />

              Add Hero Slide
            </button>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
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
                      onEdit={() =>
                        openEditEditor(
                          slide,
                        )
                      }
                      onDelete={() =>
                        void deleteSlide(
                          slide,
                        )
                      }
                      onToggle={() =>
                        void toggleSlide(
                          slide,
                        )
                      }
                    />
                  ),
                )}
              </div>
            </SortableContext>
          </DndContext>
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
          <div
            className={
              styles.editor
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
                  {editingSlide
                    ? "Edit slide"
                    : "New slide"}
                </span>

                <h2>
                  {editingSlide
                    ? editingSlide.title
                    : "Create Hero Slide"}
                </h2>
              </div>

              <button
                type="button"
                className={
                  styles.iconButton
                }
                aria-label="Close"
                onClick={
                  closeEditor
                }
              >
                <X
                  size={20}
                />
              </button>
            </div>

            <form
              onSubmit={
                saveSlide
              }
            >
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
                    <Field
                      label="Hero title"
                      required
                    >
                      <input
                        className={
                          styles.input
                        }
                        value={
                          form.title
                        }
                        maxLength={
                          120
                        }
                        placeholder="Game on. Every day."
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
                      />
                    </Field>

                    <Field
                      label="Subtitle"
                    >
                      <textarea
                        className={
                          styles.textarea
                        }
                        value={
                          form.subtitle
                        }
                        maxLength={
                          500
                        }
                        rows={4}
                        placeholder="Sports. Style. Everything between."
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
                      />
                    </Field>

                    <div
                      className={
                        styles.twoColumns
                      }
                    >
                      <Field
                        label="CTA label"
                      >
                        <input
                          className={
                            styles.input
                          }
                          value={
                            form.ctaLabel
                          }
                          placeholder="Shop New Arrivals"
                          maxLength={
                            80
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
                        />
                      </Field>

                      <Field
                        label="CTA link"
                      >
                        <input
                          className={
                            styles.input
                          }
                          value={
                            form.ctaLink
                          }
                          placeholder="/shop?sort=newest"
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
                        />
                      </Field>
                    </div>

                    <div
                      className={
                        styles.toggleRow
                      }
                    >
                      <div>
                        <strong>
                          Slide active
                        </strong>

                        <p>
                          Only active
                          slides appear
                          on the
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
                  </div>

                  <div
                    className={
                      styles.mediaColumn
                    }
                  >
                    <ImageUploader
                      label="Desktop Hero"
                      hint="Best: 1920 × 850px · other sizes are automatically cropped"
                      icon={
                        <ImageIcon
                          size={18}
                        />
                      }
                      image={
                        form.image
                      }
                      uploading={
                        uploadingDesktop
                      }
                      required
                      onFile={
                        handleDesktopFile
                      }
                    />

                    <ImageUploader
                      label="Mobile Hero"
                      hint="Best: 900 × 1200px · other sizes are automatically cropped"
                      icon={
                        <Smartphone
                          size={18}
                        />
                      }
                      image={
                        form.mobileImage
                      }
                      uploading={
                        uploadingMobile
                      }
                      onFile={
                        handleMobileFile
                      }
                      onRemove={
                        form.mobileImage
                          ? removeMobileImage
                          : undefined
                      }
                    />

                    <div
                      className={
                        styles.mobileFallback
                      }
                    >
                      If no mobile
                      image is
                      uploaded, the
                      desktop image
                      will be used
                      automatically.
                    </div>
                  </div>
                </div>

                {form.image ? (
                  <LivePreview
                    form={form}
                  />
                ) : null}
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
                        size={16}
                        className={
                          styles.spinner
                        }
                      />

                      Saving…
                    </>
                  ) : (
                    <>
                      <Check
                        size={16}
                      />

                      {editingSlide
                        ? "Save Changes"
                        : "Create Slide"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
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
  slide: HeroSlide;
  index: number;
  deleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
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

  const style = {
    transform:
      CSS.Transform.toString(
        transform,
      ),

    transition,
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`${styles.slideCard} ${
        isDragging
          ? styles.dragging
          : ""
      }`}
    >
      <button
        type="button"
        className={
          styles.dragHandle
        }
        aria-label={`Reorder ${slide.title}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical
          size={20}
        />
      </button>

      <div
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
      </div>

      <div
        className={
          styles.thumbnail
        }
      >
        <img
          src={slide.image}
          alt=""
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
              {slide.title}
            </h3>

            {slide.subtitle ? (
              <p>
                {slide.subtitle}
              </p>
            ) : null}
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
              : "Disabled"}
          </span>
        </div>

        <div
          className={
            styles.slideMeta
          }
        >
          <span>
            CTA:{" "}
            {slide.ctaLabel ||
              "None"}
          </span>

          <span>
            Mobile image:{" "}
            {slide.mobileImage
              ? "Custom"
              : "Desktop fallback"}
          </span>
        </div>
      </div>

      <div
        className={
          styles.slideActions
        }
      >
        <button
          type="button"
          className={
            styles.switchLabel
          }
          onClick={
            onToggle
          }
        >
          <span>
            {slide.enabled
              ? "Enabled"
              : "Disabled"}
          </span>

          <span
            role="switch"
            aria-checked={
              slide.enabled
            }
            className={`${styles.switch} ${
              slide.enabled
                ? styles.switchOn
                : ""
            }`}
          >
            <span />
          </span>
        </button>

        <button
          type="button"
          className={
            styles.smallButton
          }
          onClick={
            onEdit
          }
        >
          <Pencil
            size={15}
          />

          Edit
        </button>

        <button
          type="button"
          className={
            styles.deleteButton
          }
          disabled={
            deleting
          }
          onClick={
            onDelete
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
    </article>
  );
}

function ImageUploader({
  label,
  hint,
  image,
  icon,
  uploading,
  required = false,
  onFile,
  onRemove,
}: {
  label: string;
  hint: string;
  image: string;
  icon: React.ReactNode;
  uploading: boolean;
  required?: boolean;
  onFile: (
    event: ChangeEvent<HTMLInputElement>,
  ) => void;
  onRemove?: () => void;
}) {
  return (
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
            {label}
            {required
              ? " *"
              : ""}
          </strong>

          <span>
            {hint}
          </span>
        </div>

        {image &&
        onRemove ? (
          <button
            type="button"
            className={
              styles.removeMedia
            }
            onClick={
              onRemove
            }
          >
            Remove
          </button>
        ) : null}
      </div>

      {image ? (
        <div
          className={
            styles.uploadPreview
          }
        >
          <img
            src={image}
            alt={`${label} preview`}
          />

          <label
            className={
              styles.replaceOverlay
            }
          >
            <Upload
              size={17}
            />

            Replace

            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              hidden
              disabled={
                uploading
              }
              onChange={
                onFile
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
          {uploading ? (
            <Loader2
              size={24}
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
              : "Upload image"}
          </strong>

          <span>
            JPG, PNG, WebP
            or AVIF · max
            8MB
          </span>

          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            hidden
            disabled={
              uploading
            }
            onChange={
              onFile
            }
          />
        </label>
      )}
    </div>
  );
}

function LivePreview({
  form,
}: {
  form: SlideFormState;
}) {
  return (
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
        <div>
          <strong>
            Live Preview
          </strong>

          <span>
            Approximate
            storefront
            composition
          </span>
        </div>
      </div>

      <div
        className={
          styles.heroPreview
        }
        style={{
          backgroundImage: `linear-gradient(90deg, rgba(0,0,0,.88), rgba(0,0,0,.18)), url("${form.image}")`,
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
              "Hero title"}
          </h3>

          {form.subtitle ? (
            <p>
              {form.subtitle}
            </p>
          ) : null}

          {form.ctaLabel ? (
            <button
              type="button"
            >
              {
                form.ctaLabel
              }
              <span>→</span>
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string | number;
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

function Field({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label
      className={
        styles.field
      }
    >
      <span>
        {label}

        {required ? (
          <b> *</b>
        ) : null}
      </span>

      {children}
    </label>
  );
}

function getErrorMessage(
  error: unknown,
) {
  return error instanceof Error
    ? error.message
    : "Something went wrong.";
}