"use client";

import {
  ChevronDown,
  ChevronRight,
  FolderTree,
  Home,
  ImageIcon,
  Layers3,
  Navigation,
  Package,
  Search,
  SlidersHorizontal,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

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

/* =========================================================
   COMPONENT
   ========================================================= */

export function CategoryManager({
  initialCategories,
}: {
  initialCategories:
    CategoryManagerItem[];
}) {
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
      </header>

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
    </div>
  );
}