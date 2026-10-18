"use client";

import {
  ArrowDown,
  ArrowUp,
  Check,
  ExternalLink,
  Loader2,
  Megaphone,
  Plus,
  Trash2,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import styles from "./announcement-bar-manager.module.css";

type AnnouncementItem = {
  id:
    string;

  badge:
    string;

  text:
    string;

  ctaLabel:
    string;

  href:
    string;

  enabled:
    boolean;
};

type AnnouncementSettings = {
  enabled:
    boolean;

  speedSeconds:
    number;

  items:
    AnnouncementItem[];
};

const DEFAULT_VALUE:
  AnnouncementSettings = {
  enabled:
    false,

  speedSeconds:
    28,

  items: [],
};

function createItem():
  AnnouncementItem {
  return {
    id:
      `announcement-${Date.now()}`,

    badge:
      "Offer",

    text:
      "Add your announcement text",

    ctaLabel:
      "Shop Now",

    href:
      "/shop",

    enabled:
      true,
  };
}

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

  return JSON.parse(
    text,
  ) as Record<
    string,
    unknown
  >;
}

export function AnnouncementBarManager() {
  const [
    form,
    setForm,
  ] =
    useState<
      AnnouncementSettings
    >(
      DEFAULT_VALUE,
    );

  const [
    loading,
    setLoading,
  ] =
    useState(
      true,
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

  const load =
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
              "/api/admin/homepage/announcement-bar",
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
                  "Unable to load announcement bar.",
              ),
            );
          }

          setForm({
            ...DEFAULT_VALUE,
            ...(result
              .announcement as
              AnnouncementSettings),
          });
        } catch (
          caught
        ) {
          setError(
            caught instanceof
              Error
              ? caught.message
              : "Unable to load announcement bar.",
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
      void load();
    },
    [
      load,
    ],
  );

  function updateItem(
    index:
      number,

    patch:
      Partial<
        AnnouncementItem
      >,
  ) {
    setForm(
      (
        current,
      ) => ({
        ...current,

        items:
          current.items.map(
            (
              item,
              itemIndex,
            ) =>
              itemIndex ===
              index
                ? {
                    ...item,
                    ...patch,
                  }
                : item,
          ),
      }),
    );
  }

  function removeItem(
    index:
      number,
  ) {
    setForm(
      (
        current,
      ) => ({
        ...current,

        items:
          current.items.filter(
            (
              _,
              itemIndex,
            ) =>
              itemIndex !==
              index,
          ),
      }),
    );
  }

  function moveItem(
    from:
      number,

    to:
      number,
  ) {
    setForm(
      (
        current,
      ) => {
        if (
          to <
            0 ||
          to >=
            current.items.length
        ) {
          return current;
        }

        const items =
          [
            ...current.items,
          ];

        const [
          moved,
        ] =
          items.splice(
            from,
            1,
          );

        if (
          !moved
        ) {
          return current;
        }

        items.splice(
          to,
          0,
          moved,
        );

        return {
          ...current,
          items,
        };
      },
    );
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
          "/api/admin/homepage/announcement-bar",
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
              "Unable to save announcement bar.",
          ),
        );
      }

      setSuccess(
        "Announcement bar updated successfully.",
      );

      await load();
    } catch (
      caught
    ) {
      setError(
        caught instanceof
          Error
          ? caught.message
          : "Unable to save announcement bar.",
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
            20
          }
          className={
            styles.spinner
          }
        />

        Loading announcement bar…
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
            Global Storefront
          </span>

          <h1>
            Announcement Bar
          </h1>

          <p>
            Manage the moving
            promotional strip
            displayed above the
            header on every
            storefront page.
          </p>
        </div>

        <button
          type="button"
          onClick={
            save
          }
          disabled={
            saving
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
          styles.settings
        }
      >
        <div
          className={
            styles.settingCopy
          }
        >
          <Megaphone
            size={
              19
            }
          />

          <div>
            <strong>
              Global announcement bar
            </strong>

            <span>
              Show the ticker across
              all storefront pages.
            </span>
          </div>
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

      <div
        className={
          styles.speed
        }
      >
        <label>
          <span>
            Movement speed
          </span>

          <select
            value={
              form.speedSeconds
            }
            onChange={(
              event,
            ) =>
              setForm(
                (
                  current,
                ) => ({
                  ...current,

                  speedSeconds:
                    Number(
                      event.target
                        .value,
                    ),
                }),
              )
            }
          >
            <option value={18}>
              Fast
            </option>

            <option value={24}>
              Medium Fast
            </option>

            <option value={28}>
              Standard
            </option>

            <option value={36}>
              Relaxed
            </option>

            <option value={48}>
              Slow
            </option>
          </select>
        </label>

        <button
          type="button"
          className={
            styles.add
          }
          onClick={() =>
            setForm(
              (
                current,
              ) => ({
                ...current,

                items: [
                  ...current.items,
                  createItem(),
                ],
              }),
            )
          }
        >
          <Plus
            size={
              15
            }
          />

          Add Announcement
        </button>
      </div>

      <div
        className={
          styles.items
        }
      >
        {form.items.map(
          (
            item,
            index,
          ) => (
            <section
              key={
                item.id
              }
              className={
                styles.item
              }
            >
              <div
                className={
                  styles.itemTop
                }
              >
                <div>
                  <strong>
                    Announcement{" "}
                    {index + 1}
                  </strong>

                  <span>
                    Each announcement
                    can open a different
                    destination.
                  </span>
                </div>

                <div
                  className={
                    styles.itemActions
                  }
                >
                  <button
                    type="button"
                    aria-label="Move up"
                    onClick={() =>
                      moveItem(
                        index,
                        index - 1,
                      )
                    }
                    disabled={
                      index ===
                      0
                    }
                  >
                    <ArrowUp
                      size={
                        14
                      }
                    />
                  </button>

                  <button
                    type="button"
                    aria-label="Move down"
                    onClick={() =>
                      moveItem(
                        index,
                        index + 1,
                      )
                    }
                    disabled={
                      index ===
                      form.items
                        .length -
                        1
                    }
                  >
                    <ArrowDown
                      size={
                        14
                      }
                    />
                  </button>

                  <button
                    type="button"
                    aria-label="Remove announcement"
                    onClick={() =>
                      removeItem(
                        index,
                      )
                    }
                    className={
                      styles.delete
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

              <div
                className={
                  styles.fields
                }
              >
                <label>
                  <span>
                    Badge
                  </span>

                  <input
                    value={
                      item.badge
                    }
                    placeholder="Offers"
                    onChange={(
                      event,
                    ) =>
                      updateItem(
                        index,
                        {
                          badge:
                            event
                              .target
                              .value,
                        },
                      )
                    }
                  />
                </label>

                <label
                  className={
                    styles.mainField
                  }
                >
                  <span>
                    Message
                  </span>

                  <input
                    value={
                      item.text
                    }
                    placeholder="Up to 30% discount on selected products"
                    onChange={(
                      event,
                    ) =>
                      updateItem(
                        index,
                        {
                          text:
                            event
                              .target
                              .value,
                        },
                      )
                    }
                  />
                </label>

                <label>
                  <span>
                    CTA label
                  </span>

                  <input
                    value={
                      item.ctaLabel
                    }
                    placeholder="Shop Now"
                    onChange={(
                      event,
                    ) =>
                      updateItem(
                        index,
                        {
                          ctaLabel:
                            event
                              .target
                              .value,
                        },
                      )
                    }
                  />
                </label>

                <label
                  className={
                    styles.linkField
                  }
                >
                  <span>
                    Click destination
                  </span>

                  <div>
                    <ExternalLink
                      size={
                        14
                      }
                    />

                    <input
                      value={
                        item.href
                      }
                      placeholder="/shop?offers=1"
                      onChange={(
                        event,
                      ) =>
                        updateItem(
                          index,
                          {
                            href:
                              event
                                .target
                                .value,
                          },
                        )
                      }
                    />
                  </div>
                </label>
              </div>

              <div
                className={
                  styles.itemFooter
                }
              >
                <span>
                  Visible
                </span>

                <button
                  type="button"
                  role="switch"
                  aria-checked={
                    item.enabled
                  }
                  className={`${styles.switch} ${
                    item.enabled
                      ? styles.switchOn
                      : ""
                  }`}
                  onClick={() =>
                    updateItem(
                      index,
                      {
                        enabled:
                          !item.enabled,
                      },
                    )
                  }
                >
                  <span />
                </button>
              </div>
            </section>
          ),
        )}
      </div>

      <section
        className={
          styles.preview
        }
      >
        <div
          className={
            styles.previewTitle
          }
        >
          Storefront Preview
        </div>

        <div
          className={
            styles.previewBar
          }
        >
          {form.items
            .filter(
              (
                item,
              ) =>
                item.enabled &&
                item.text,
            )
            .map(
              (
                item,
              ) => (
                <div
                  key={
                    item.id
                  }
                  className={
                    styles.previewItem
                  }
                >
                  {item.badge ? (
                    <b>
                      {
                        item.badge
                      }
                    </b>
                  ) : null}

                  <span>
                    {
                      item.text
                    }
                  </span>

                  {item.ctaLabel ? (
                    <em>
                      {
                        item.ctaLabel
                      }
                    </em>
                  ) : null}
                </div>
              ),
            )}
        </div>
      </section>
    </div>
  );
}