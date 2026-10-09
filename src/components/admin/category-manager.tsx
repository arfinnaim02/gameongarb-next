"use client";

import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  FolderTree,
  Home,
  ImageIcon,
  Layers3,
  Loader2,
  Navigation,
  Package,
  Pencil,
  Plus,
  Power,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import styles from "./category-manager.module.css";

/* =========================================================
   TYPES
   ========================================================= */

type CategoryParent = {
  id: string;
  name: string;

  parentId:
    | string
    | null;
};

export type CategoryManagerItem = {
  id: string;
  name: string;
  slug: string;

  description:
    | string
    | null;

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

  sortOrder: number;

  showInNavigation:
    boolean;

  showOnHomepage:
    boolean;

  featured:
    boolean;

  productCount:
    number;

  childCount:
    number;
};

type StatusFilter =
  | "ALL"
  | "ACTIVE"
  | "INACTIVE";

type VisibilityFilter =
  | "ALL"
  | "YES"
  | "NO";

type DrawerMode =
  | {
      type:
        "CREATE";

      parentId:
        string |
        null;
    }
  | {
      type:
        "EDIT";

      category:
        CategoryManagerItem;
    };

/* =========================================================
   COMPONENT
   ========================================================= */

export function CategoryManager({
  initialCategories,
}: {
  initialCategories:
    CategoryManagerItem[];
}) {
  const router =
    useRouter();

  const [
    categories,
    setCategories,
  ] =
    useState<
      CategoryManagerItem[]
    >(
      initialCategories,
    );

  const [
    query,
    setQuery,
  ] =
    useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState<StatusFilter>(
      "ALL",
    );

  const [
    homepageFilter,
    setHomepageFilter,
  ] =
    useState<VisibilityFilter>(
      "ALL",
    );

  const [
    navigationFilter,
    setNavigationFilter,
  ] =
    useState<VisibilityFilter>(
      "ALL",
    );

  const [
    drawer,
    setDrawer,
  ] =
    useState<
      DrawerMode |
      null
    >(
      null,
    );

  const [
    busy,
    setBusy,
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

  const [
    expanded,
    setExpanded,
  ] =
    useState<
      Set<string>
    >(
      () =>
        new Set(
          initialCategories
            .filter(
              (
                category,
              ) =>
                category.parentId ===
                null,
            )
            .map(
              (
                category,
              ) =>
                category.id,
            ),
        ),
    );

  /* =======================================================
     SYNC SERVER DATA
     ======================================================= */

  useEffect(() => {
    setCategories(
      initialCategories,
    );
  }, [
    initialCategories,
  ]);

  /* =======================================================
     MAPS
     ======================================================= */

  const categoryById =
    useMemo(
      () =>
        new Map(
          categories.map(
            (
              category,
            ) => [
              category.id,
              category,
            ],
          ),
        ),

      [
        categories,
      ],
    );

  const childrenByParent =
    useMemo(
      () => {
        const map =
          new Map<
            string,
            CategoryManagerItem[]
          >();

        categories.forEach(
          (
            category,
          ) => {
            if (
              !category.parentId
            ) {
              return;
            }

            const current =
              map.get(
                category.parentId,
              ) ??
              [];

            current.push(
              category,
            );

            map.set(
              category.parentId,
              current,
            );
          },
        );

        map.forEach(
          (
            children,
          ) => {
            children.sort(
              (
                first,
                second,
              ) =>
                first.sortOrder -
                  second.sortOrder ||
                first.name.localeCompare(
                  second.name,
                ),
            );
          },
        );

        return map;
      },

      [
        categories,
      ],
    );

  const roots =
    useMemo(
      () =>
        categories
          .filter(
            (
              category,
            ) =>
              category.parentId ===
              null,
          )
          .sort(
            (
              first,
              second,
            ) =>
              first.sortOrder -
                second.sortOrder ||
              first.name.localeCompare(
                second.name,
              ),
          ),

      [
        categories,
      ],
    );

  /* =======================================================
     STATS
     ======================================================= */

  const stats =
    useMemo(
      () => ({
        total:
          categories.length,

        active:
          categories.filter(
            (
              category,
            ) =>
              category.active,
          ).length,

        homepage:
          categories.filter(
            (
              category,
            ) =>
              category.showOnHomepage,
          ).length,

        navigation:
          categories.filter(
            (
              category,
            ) =>
              category.showInNavigation,
          ).length,
      }),

      [
        categories,
      ],
    );

  /* =======================================================
     FILTERING
     ======================================================= */

  const cleanQuery =
    query
      .trim()
      .toLowerCase();

  function categoryMatchesFilters(
    category:
      CategoryManagerItem,
  ) {
    const matchesSearch =
      !cleanQuery ||
      [
        category.name,
        category.slug,
        category.description ??
          "",
        category.parent?.name ??
          "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(
          cleanQuery,
        );

    const matchesStatus =
      statusFilter ===
        "ALL" ||
      (
        statusFilter ===
          "ACTIVE" &&
        category.active
      ) ||
      (
        statusFilter ===
          "INACTIVE" &&
        !category.active
      );

    const matchesHomepage =
      homepageFilter ===
        "ALL" ||
      (
        homepageFilter ===
          "YES" &&
        category.showOnHomepage
      ) ||
      (
        homepageFilter ===
          "NO" &&
        !category.showOnHomepage
      );

    const matchesNavigation =
      navigationFilter ===
        "ALL" ||
      (
        navigationFilter ===
          "YES" &&
        category.showInNavigation
      ) ||
      (
        navigationFilter ===
          "NO" &&
        !category.showInNavigation
      );

    return (
      matchesSearch &&
      matchesStatus &&
      matchesHomepage &&
      matchesNavigation
    );
  }

  function branchMatches(
    category:
      CategoryManagerItem,
  ): boolean {
    if (
      categoryMatchesFilters(
        category,
      )
    ) {
      return true;
    }

    const children =
      childrenByParent.get(
        category.id,
      ) ??
      [];

    return children.some(
      (
        child,
      ) =>
        branchMatches(
          child,
        ),
    );
  }

  const visibleRoots =
    useMemo(
      () =>
        roots.filter(
          (
            root,
          ) =>
            branchMatches(
              root,
            ),
        ),

      // eslint-disable-next-line react-hooks/exhaustive-deps
      [
        roots,
        childrenByParent,
        query,
        statusFilter,
        homepageFilter,
        navigationFilter,
      ],
    );

  /* =======================================================
     HELPERS
     ======================================================= */

  function getDepth(
    categoryId:
      string,
  ) {
    let depth =
      0;

    let current =
      categoryById.get(
        categoryId,
      );

    while (
      current?.parentId
    ) {
      depth +=
        1;

      current =
        categoryById.get(
          current.parentId,
        );

      if (
        depth >
        10
      ) {
        break;
      }
    }

    return depth;
  }

  function isDescendant(
    candidateId:
      string,

    categoryId:
      string,
  ) {
    let current =
      categoryById.get(
        candidateId,
      );

    while (
      current?.parentId
    ) {
      if (
        current.parentId ===
        categoryId
      ) {
        return true;
      }

      current =
        categoryById.get(
          current.parentId,
        );
    }

    return false;
  }

  function validParentsFor(
    editingId?:
      string,
  ) {
    return categories
      .filter(
        (
          category,
        ) => {
          if (
            editingId &&
            category.id ===
              editingId
          ) {
            return false;
          }

          if (
            getDepth(
              category.id,
            ) >=
            2
          ) {
            return false;
          }

          if (
            editingId &&
            isDescendant(
              category.id,
              editingId,
            )
          ) {
            return false;
          }

          return true;
        },
      )
      .sort(
        (
          first,
          second,
        ) =>
          getDepth(
            first.id,
          ) -
            getDepth(
              second.id,
            ) ||
          first.sortOrder -
            second.sortOrder ||
          first.name.localeCompare(
            second.name,
          ),
      );
  }

  function openCreate(
    parentId:
      string |
      null =
        null,
  ) {
    setError("");
    setMessage("");

    setDrawer({
      type:
        "CREATE",

      parentId,
    });
  }

  function openEdit(
    category:
      CategoryManagerItem,
  ) {
    setError("");
    setMessage("");

    setDrawer({
      type:
        "EDIT",

      category,
    });
  }

  async function mutateCategory(
    method:
      "POST" |
      "PATCH" |
      "DELETE",

    body:
      Record<
        string,
        unknown
      >,
  ) {
    setBusy(
      true,
    );

    setError("");
    setMessage("");

    try {
      const response =
        await fetch(
          "/api/admin/categories",
          {
            method,

            headers: {
              "content-type":
                "application/json",
            },

            body:
              JSON.stringify(
                body,
              ),
          },
        );

      const result =
        await response
          .json()
          .catch(
            () => ({
              error:
                "Request failed.",
            }),
          );

      if (
        !response.ok
      ) {
        throw new Error(
          result.error ??
            "Unable to update category.",
        );
      }

      setMessage(
        result.message ??
          "Category updated successfully.",
      );

      setDrawer(
        null,
      );

      router.refresh();

      return true;
    } catch (
      caught
    ) {
      setError(
        caught instanceof
          Error
          ? caught.message
          : "Something went wrong.",
      );

      return false;
    } finally {
      setBusy(
        false,
      );
    }
  }

  async function toggleCategoryStatus(
    category:
      CategoryManagerItem,
  ) {
    await mutateCategory(
      "PATCH",
      {
        id:
          category.id,

        active:
          !category.active,
      },
    );
  }

  async function deleteCategory(
    category:
      CategoryManagerItem,
  ) {
    if (
      category.childCount >
      0
    ) {
      window.alert(
        `${category.name} has child categories. Move or remove them first.`,
      );

      return;
    }

    if (
      category.productCount >
      0
    ) {
      window.alert(
        `${category.name} still has assigned products. Reassign them first.`,
      );

      return;
    }

    const confirmed =
      window.confirm(
        `Delete "${category.name}" permanently?`,
      );

    if (
      !confirmed
    ) {
      return;
    }

    await mutateCategory(
      "DELETE",
      {
        id:
          category.id,
      },
    );
  }

  function toggleExpanded(
    categoryId:
      string,
  ) {
    setExpanded(
      (
        current,
      ) => {
        const next =
          new Set(
            current,
          );

        if (
          next.has(
            categoryId,
          )
        ) {
          next.delete(
            categoryId,
          );
        } else {
          next.add(
            categoryId,
          );
        }

        return next;
      },
    );
  }

  function resetFilters() {
    setQuery("");

    setStatusFilter(
      "ALL",
    );

    setHomepageFilter(
      "ALL",
    );

    setNavigationFilter(
      "ALL",
    );
  }

  const filtersActive =
    Boolean(
      cleanQuery,
    ) ||
    statusFilter !==
      "ALL" ||
    homepageFilter !==
      "ALL" ||
    navigationFilter !==
      "ALL";

  /* =======================================================
     TREE RENDERER
     ======================================================= */

  function renderCategory(
    category:
      CategoryManagerItem,

    level:
      number,
  ) {
    const children =
      childrenByParent.get(
        category.id,
      ) ??
      [];

    const hasChildren =
      children.length >
      0;

    const isExpanded =
      expanded.has(
        category.id,
      );

    const parent =
      category.parentId
        ? categoryById.get(
            category.parentId,
          ) ??
          null
        : null;

    const inactiveParent =
      Boolean(
        parent &&
          !parent.active &&
          category.active,
      );

    const showBranch =
      categoryMatchesFilters(
        category,
      ) ||
      children.some(
        (
          child,
        ) =>
          branchMatches(
            child,
          ),
      );

    if (!showBranch) {
      return null;
    }

    const forceOpen =
      Boolean(
        cleanQuery,
      ) ||
      filtersActive;

    return (
      <div
        key={
          category.id
        }
        className={
          styles.treeGroup
        }
      >
        <article
          className={`${styles.categoryRow} ${
            level ===
            0
              ? styles.rootRow
              : ""
          }`}
          style={
            {
              "--category-level":
                level,
            } as React.CSSProperties
          }
        >
          {/* =========================
              TREE / IMAGE
              ========================= */}

          <div
            className={
              styles.categoryIdentity
            }
          >
            <div
              className={
                styles.treeIndent
              }
            />

            {hasChildren ? (
              <button
                type="button"
                className={
                  styles.expandButton
                }
                aria-label={
                  isExpanded
                    ? `Collapse ${category.name}`
                    : `Expand ${category.name}`
                }
                onClick={() =>
                  toggleExpanded(
                    category.id,
                  )
                }
              >
                {isExpanded ||
                forceOpen ? (
                  <ChevronDown
                    size={
                      16
                    }
                  />
                ) : (
                  <ChevronRight
                    size={
                      16
                    }
                  />
                )}
              </button>
            ) : (
              <span
                className={
                  styles.expandSpacer
                }
              />
            )}

            <div
              className={
                styles.categoryImage
              }
              style={
                category.image
                  ? {
                      backgroundImage:
                        `url("${category.image}")`,
                    }
                  : undefined
              }
            >
              {!category.image ? (
                <ImageIcon
                  size={
                    17
                  }
                />
              ) : null}
            </div>

            <div
              className={
                styles.categoryName
              }
            >
              <div
                className={
                  styles.nameLine
                }
              >
                <strong>
                  {
                    category.name
                  }
                </strong>

                <span
                  className={
                    `${styles.levelBadge} ${
                      level ===
                      0
                        ? styles.levelRoot
                        : level ===
                            1
                          ? styles.levelSub
                          : styles.levelChild
                    }`
                  }
                >
                  {level ===
                  0
                    ? "Category"
                    : level ===
                        1
                      ? "Subcategory"
                      : "Child"}
                </span>
              </div>

              <span
                className={
                  styles.slug
                }
              >
                /
                {
                  category.slug
                }
              </span>

              {inactiveParent ? (
                <span
                  className={
                    styles.parentWarning
                  }
                >
                  Parent category
                  is inactive
                </span>
              ) : null}
            </div>
          </div>

          {/* =========================
              PRODUCTS
              ========================= */}

          <div
            className={
              styles.statCell
            }
          >
            <strong>
              {
                category.productCount
              }
            </strong>

            <span>
              {category.productCount ===
              1
                ? "product"
                : "products"}
            </span>
          </div>

          {/* =========================
              CHILDREN
              ========================= */}

          <div
            className={
              styles.statCell
            }
          >
            <strong>
              {
                category.childCount
              }
            </strong>

            <span>
              {category.childCount ===
              1
                ? "child"
                : "children"}
            </span>
          </div>

          {/* =========================
              ORDER
              ========================= */}

          <div
            className={
              styles.orderCell
            }
          >
            <span>
              {
                category.sortOrder
              }
            </span>
          </div>

          {/* =========================
              VISIBILITY
              ========================= */}

          <div
            className={
              styles.visibilityCell
            }
          >
            <span
              className={`${styles.visibilityBadge} ${
                category.showOnHomepage
                  ? styles.visibilityOn
                  : styles.visibilityOff
              }`}
            >
              <Home
                size={
                  12
                }
              />

              {category.showOnHomepage
                ? "Homepage"
                : "Homepage off"}
            </span>

            <span
              className={`${styles.visibilityBadge} ${
                category.showInNavigation
                  ? styles.visibilityOn
                  : styles.visibilityOff
              }`}
            >
              <Navigation
                size={
                  12
                }
              />

              {category.showInNavigation
                ? "Navigation"
                : "Navigation off"}
            </span>
          </div>

          {/* =========================
              STATUS
              ========================= */}

          <div
            className={
              styles.statusCell
            }
          >
            <span
              className={`${styles.statusBadge} ${
                category.active
                  ? styles.statusActive
                  : styles.statusInactive
              }`}
            >
              {category.active
                ? "Active"
                : "Inactive"}
            </span>
          </div>

          <div
            className={
              styles.actionsCell
            }
          >
            <button
              type="button"
              className={
                styles.actionButton
              }
              onClick={() =>
                openEdit(
                  category,
                )
              }
            >
              <Pencil
                size={
                  14
                }
              />

              <span>
                Edit
              </span>
            </button>

            {level <
            2 ? (
              <button
                type="button"
                className={
                  styles.actionButton
                }
                onClick={() =>
                  openCreate(
                    category.id,
                  )
                }
              >
                <Plus
                  size={
                    14
                  }
                />

                <span>
                  Subcategory
                </span>
              </button>
            ) : null}

            <button
              type="button"
              className={
                styles.actionIcon
              }
              aria-label={
                category.active
                  ? `Deactivate ${category.name}`
                  : `Activate ${category.name}`
              }
              title={
                category.active
                  ? "Deactivate"
                  : "Activate"
              }
              disabled={
                busy
              }
              onClick={() =>
                void toggleCategoryStatus(
                  category,
                )
              }
            >
              <Power
                size={
                  14
                }
              />
            </button>

            <button
              type="button"
              className={`${styles.actionIcon} ${styles.deleteAction}`}
              aria-label={`Delete ${category.name}`}
              title="Delete"
              disabled={
                busy
              }
              onClick={() =>
                void deleteCategory(
                  category,
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
        </article>

        {hasChildren &&
        (
          isExpanded ||
          forceOpen
        ) ? (
          <div
            className={
              styles.children
            }
          >
            {children.map(
              (
                child,
              ) =>
                renderCategory(
                  child,
                  level + 1,
                ),
            )}
          </div>
        ) : null}
      </div>
    );
  }

  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <div
      className={
        styles.page
      }
    >
      {/* ===================================================
          HEADER
          =================================================== */}

      <header
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
            Commerce
          </span>

          <h1>
            Categories
          </h1>

          <p>
            Organize the
            storefront with a
            clear category,
            subcategory and
            child-category
            hierarchy.
          </p>
        </div>

        <div
          className={
            styles.headerActions
          }
        >
          <div
            className={
              styles.headerSummary
            }
          >
            <FolderTree
              size={
                19
              }
            />

            <span>
              {
                stats.total
              }{" "}
              total categories
            </span>
          </div>

          <button
            type="button"
            className={
              styles.addButton
            }
            onClick={() =>
              openCreate(
                null,
              )
            }
          >
            <Plus
              size={
                16
              }
            />

            Add Category
          </button>
        </div>
      </header>

      {message ? (
        <div
          className={
            styles.successMessage
          }
        >
          {
            message
          }
        </div>
      ) : null}

      {error ? (
        <div
          className={
            styles.errorMessage
          }
        >
          <AlertTriangle
            size={
              16
            }
          />

          {
            error
          }
        </div>
      ) : null}

      {/* ===================================================
          KPI CARDS
          =================================================== */}

      <section
        className={
          styles.statsGrid
        }
      >
        <div
          className={
            styles.statCard
          }
        >
          <span
            className={
              styles.statIcon
            }
          >
            <Layers3
              size={
                18
              }
            />
          </span>

          <div>
            <small>
              Total Categories
            </small>

            <strong>
              {
                stats.total
              }
            </strong>
          </div>
        </div>

        <div
          className={
            styles.statCard
          }
        >
          <span
            className={
              styles.statIcon
            }
          >
            <Package
              size={
                18
              }
            />
          </span>

          <div>
            <small>
              Active
            </small>

            <strong>
              {
                stats.active
              }
            </strong>
          </div>
        </div>

        <div
          className={
            styles.statCard
          }
        >
          <span
            className={
              styles.statIcon
            }
          >
            <Home
              size={
                18
              }
            />
          </span>

          <div>
            <small>
              Homepage
            </small>

            <strong>
              {
                stats.homepage
              }
            </strong>
          </div>
        </div>

        <div
          className={
            styles.statCard
          }
        >
          <span
            className={
              styles.statIcon
            }
          >
            <Navigation
              size={
                18
              }
            />
          </span>

          <div>
            <small>
              Navigation
            </small>

            <strong>
              {
                stats.navigation
              }
            </strong>
          </div>
        </div>
      </section>

      {/* ===================================================
          FILTER BAR
          =================================================== */}

      <section
        className={
          styles.toolbar
        }
      >
        <label
          className={
            styles.search
          }
        >
          <Search
            size={
              17
            }
          />

          <input
            type="search"
            value={
              query
            }
            placeholder="Search categories, slug or parent..."
            onChange={(
              event,
            ) =>
              setQuery(
                event.target
                  .value,
              )
            }
          />
        </label>

        <div
          className={
            styles.filters
          }
        >
          <div
            className={
              styles.filterIcon
            }
          >
            <SlidersHorizontal
              size={
                16
              }
            />
          </div>

          <label>
            <span>
              Status
            </span>

            <select
              value={
                statusFilter
              }
              onChange={(
                event,
              ) =>
                setStatusFilter(
                  event.target
                    .value as
                    StatusFilter,
                )
              }
            >
              <option value="ALL">
                All
              </option>

              <option value="ACTIVE">
                Active
              </option>

              <option value="INACTIVE">
                Inactive
              </option>
            </select>
          </label>

          <label>
            <span>
              Homepage
            </span>

            <select
              value={
                homepageFilter
              }
              onChange={(
                event,
              ) =>
                setHomepageFilter(
                  event.target
                    .value as
                    VisibilityFilter,
                )
              }
            >
              <option value="ALL">
                All
              </option>

              <option value="YES">
                Shown
              </option>

              <option value="NO">
                Hidden
              </option>
            </select>
          </label>

          <label>
            <span>
              Navigation
            </span>

            <select
              value={
                navigationFilter
              }
              onChange={(
                event,
              ) =>
                setNavigationFilter(
                  event.target
                    .value as
                    VisibilityFilter,
                )
              }
            >
              <option value="ALL">
                All
              </option>

              <option value="YES">
                Shown
              </option>

              <option value="NO">
                Hidden
              </option>
            </select>
          </label>

          {filtersActive ? (
            <button
              type="button"
              className={
                styles.clearFilters
              }
              onClick={
                resetFilters
              }
            >
              Clear
            </button>
          ) : null}
        </div>
      </section>

      {/* ===================================================
          CATEGORY TREE
          =================================================== */}

      <section
        className={
          styles.categoryPanel
        }
      >
        <div
          className={
            styles.tableHeader
          }
        >
          <span>
            Category
          </span>

          <span>
            Products
          </span>

          <span>
            Children
          </span>

          <span>
            Order
          </span>

          <span>
            Visibility
          </span>

          <span>
            Status
          </span>

          <span>
            Actions
          </span>
        </div>

        {visibleRoots.length >
        0 ? (
          <div
            className={
              styles.tree
            }
          >
            {visibleRoots.map(
              (
                root,
              ) =>
                renderCategory(
                  root,
                  0,
                ),
            )}
          </div>
        ) : (
          <div
            className={
              styles.empty
            }
          >
            <FolderTree
              size={
                30
              }
            />

            <strong>
              No categories
              found
            </strong>

            <p>
              Try changing the
              search or filter
              options.
            </p>

            {filtersActive ? (
              <button
                type="button"
                onClick={
                  resetFilters
                }
              >
                Clear filters
              </button>
            ) : null}
          </div>
        )}
      </section>

      {drawer ? (
        <CategoryDrawer
          mode={
            drawer
          }
          categories={
            categories
          }
          validParents={
            validParentsFor(
              drawer.type ===
                "EDIT"
                ? drawer.category
                    .id
                : undefined,
            )
          }
          busy={
            busy
          }
          close={() =>
            setDrawer(
              null,
            )
          }
          save={
            mutateCategory
          }
        />
      ) : null}
    </div>
  );
}

function CategoryDrawer({
  mode,
  categories,
  validParents,
  busy,
  close,
  save,
}: {
  mode:
    DrawerMode;

  categories:
    CategoryManagerItem[];

  validParents:
    CategoryManagerItem[];

  busy:
    boolean;

  close:
    () => void;

  save:
    (
      method:
        "POST" |
        "PATCH" |
        "DELETE",

      body:
        Record<
          string,
          unknown
        >,
    ) =>
      Promise<boolean>;
}) {
  const editing =
    mode.type ===
    "EDIT"
      ? mode.category
      : null;

  const defaultParentId =
    mode.type ===
    "CREATE"
      ? mode.parentId ??
        ""
      : editing?.parentId ??
        "";

  const [
    name,
    setName,
  ] =
    useState(
      editing?.name ??
        "",
    );

  const [
    slug,
    setSlug,
  ] =
    useState(
      editing?.slug ??
        "",
    );

  const [
    slugTouched,
    setSlugTouched,
  ] =
    useState(
      Boolean(
        editing,
      ),
    );

  const [
    parentId,
    setParentId,
  ] =
    useState(
      defaultParentId,
    );

  const [
    description,
    setDescription,
  ] =
    useState(
      editing?.description ??
        "",
    );

  const [
    sortOrder,
    setSortOrder,
  ] =
    useState(
      editing?.sortOrder ??
        0,
    );

  const [
    active,
    setActive,
  ] =
    useState(
      editing?.active ??
        true,
    );

  const [
    showInNavigation,
    setShowInNavigation,
  ] =
    useState(
      editing?.showInNavigation ??
        false,
    );

  const [
    showOnHomepage,
    setShowOnHomepage,
  ] =
    useState(
      editing?.showOnHomepage ??
        false,
    );

  const parent =
    parentId
      ? categories.find(
          (
            category,
          ) =>
            category.id ===
            parentId,
        ) ??
        null
      : null;

  function makeSlug(
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

  function handleNameChange(
    value:
      string,
  ) {
    setName(
      value,
    );

    if (
      !slugTouched
    ) {
      setSlug(
        makeSlug(
          value,
        ),
      );
    }
  }

  async function submit(
    event:
      React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const payload = {
      name:
        name.trim(),

      slug:
        slug.trim(),

      description:
        description.trim(),

      parentId,

      sortOrder:
        Number(
          sortOrder,
        ),

      active,

      showInNavigation,

      showOnHomepage,
    };

    if (
      mode.type ===
      "EDIT"
    ) {
      await save(
        "PATCH",
        {
          id:
            mode.category.id,

          ...payload,
        },
      );

      return;
    }

    await save(
      "POST",
      payload,
    );
  }

  return (
    <div
      className={
        styles.drawerBackdrop
      }
      onMouseDown={(
        event,
      ) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          close();
        }
      }}
    >
      <aside
        className={
          styles.drawer
        }
      >
        <div
          className={
            styles.drawerHeader
          }
        >
          <div>
            <span
              className={
                styles.eyebrow
              }
            >
              {mode.type ===
              "EDIT"
                ? "Edit category"
                : parent
                  ? "New subcategory"
                  : "New category"}
            </span>

            <h2>
              {mode.type ===
              "EDIT"
                ? editing?.name
                : parent
                  ? `Under ${parent.name}`
                  : "Add Category"}
            </h2>
          </div>

          <button
            type="button"
            className={
              styles.drawerClose
            }
            aria-label="Close"
            disabled={
              busy
            }
            onClick={
              close
            }
          >
            <X
              size={
                19
              }
            />
          </button>
        </div>

        <form
          className={
            styles.drawerForm
          }
          onSubmit={
            submit
          }
        >
          <div
            className={
              styles.formSection
            }
          >
            <div
              className={
                styles.formSectionTitle
              }
            >
              <strong>
                Basic Information
              </strong>

              <span>
                Category name and
                storefront URL.
              </span>
            </div>

            <label
              className={
                styles.field
              }
            >
              <span>
                Category Name
              </span>

              <input
                value={
                  name
                }
                required
                minLength={
                  2
                }
                placeholder="Example: Football"
                onChange={(
                  event,
                ) =>
                  handleNameChange(
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
                Slug
              </span>

              <div
                className={
                  styles.slugField
                }
              >
                <b>
                  /
                </b>

                <input
                  value={
                    slug
                  }
                  required
                  pattern="[a-z0-9-]+"
                  placeholder="football"
                  onChange={(
                    event,
                  ) => {
                    setSlugTouched(
                      true,
                    );

                    setSlug(
                      makeSlug(
                        event.target
                          .value,
                      ),
                    );
                  }}
                />
              </div>

              <small>
                Lowercase letters,
                numbers and hyphens.
              </small>
            </label>

            <label
              className={
                styles.field
              }
            >
              <span>
                Description
              </span>

              <textarea
                rows={
                  4
                }
                value={
                  description
                }
                placeholder="Optional description..."
                onChange={(
                  event,
                ) =>
                  setDescription(
                    event.target
                      .value,
                  )
                }
              />
            </label>
          </div>

          <div
            className={
              styles.formSection
            }
          >
            <div
              className={
                styles.formSectionTitle
              }
            >
              <strong>
                Hierarchy
              </strong>

              <span>
                Maximum three
                levels.
              </span>
            </div>

            <label
              className={
                styles.field
              }
            >
              <span>
                Parent Category
              </span>

              <select
                value={
                  parentId
                }
                onChange={(
                  event,
                ) =>
                  setParentId(
                    event.target
                      .value,
                  )
                }
              >
                <option value="">
                  Root category
                </option>

                {validParents.map(
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
                      {category.parentId
                        ? `↳ ${category.name}`
                        : category.name}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label
              className={
                styles.field
              }
            >
              <span>
                Shop Display Order
              </span>

              <input
                type="number"
                min={
                  0
                }
                value={
                  sortOrder
                }
                onChange={(
                  event,
                ) =>
                  setSortOrder(
                    Number(
                      event.target
                        .value,
                    ),
                  )
                }
              />
            </label>
          </div>

          <div
            className={
              styles.formSection
            }
          >
            <div
              className={
                styles.formSectionTitle
              }
            >
              <strong>
                Visibility
              </strong>

              <span>
                Control where this
                category appears.
              </span>
            </div>

            <label
              className={
                styles.switchRow
              }
            >
              <div>
                <strong>
                  Active
                </strong>

                <span>
                  Allow this category
                  on the storefront.
                </span>
              </div>

              <input
                type="checkbox"
                checked={
                  active
                }
                onChange={(
                  event,
                ) =>
                  setActive(
                    event.target
                      .checked,
                  )
                }
              />
            </label>

            <label
              className={
                styles.switchRow
              }
            >
              <div>
                <strong>
                  Show in Navigation
                </strong>

                <span>
                  Display in store
                  navigation.
                </span>
              </div>

              <input
                type="checkbox"
                checked={
                  showInNavigation
                }
                onChange={(
                  event,
                ) =>
                  setShowInNavigation(
                    event.target
                      .checked,
                  )
                }
              />
            </label>

            <label
              className={
                styles.switchRow
              }
            >
              <div>
                <strong>
                  Show on Homepage
                </strong>

                <span>
                  Display in homepage
                  category cards.
                </span>
              </div>

              <input
                type="checkbox"
                checked={
                  showOnHomepage
                }
                onChange={(
                  event,
                ) =>
                  setShowOnHomepage(
                    event.target
                      .checked,
                  )
                }
              />
            </label>
          </div>

          <div
            className={
              styles.drawerFooter
            }
          >
            <button
              type="button"
              className={
                styles.cancelButton
              }
              disabled={
                busy
              }
              onClick={
                close
              }
            >
              Cancel
            </button>

            <button
              type="submit"
              className={
                styles.saveButton
              }
              disabled={
                busy ||
                name.trim().length <
                  2 ||
                slug.trim().length <
                  2
              }
            >
              {busy ? (
                <Loader2
                  size={
                    16
                  }
                  className={
                    styles.spinner
                  }
                />
              ) : mode.type ===
                "EDIT" ? (
                <Pencil
                  size={
                    15
                  }
                />
              ) : (
                <Plus
                  size={
                    15
                  }
                />
              )}

              {busy
                ? "Saving..."
                : mode.type ===
                    "EDIT"
                  ? "Save Changes"
                  : "Create Category"}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}