"use client";

import {
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  ReactNode,
} from "react";

import {
  Check,
  ChevronDown,
  Grid2X2,
  List,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";

import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";

import {
  ProductCard,
} from "@/components/product/product-card";

import type {
  Product,
} from "@/lib/data";

/* =========================================================
   TYPES
   ========================================================= */

type ShopCategory = {
  id: string;

  name: string;

  slug: string;

  parentId:
    | string
    | null;

  sortOrder: number;
};

type ShopClientProps = {
  products:
    Product[];

  categories:
    ShopCategory[];

  productCategoryMap:
    Record<
      string,
      string[]
    >;

  itemsPerPage:
    number;
};

/* =========================================================
   SHOP
   ========================================================= */

export function ShopClient({
  products,
  categories,
  productCategoryMap,
  itemsPerPage,
}: ShopClientProps) {
  const router =
    useRouter();

  const pathname =
    usePathname();

  const searchParams =
    useSearchParams();

  const urlStateKey =
    searchParams.toString();

  /* =======================================================
     URL-BACKED STATE
     ======================================================= */

  const [
    search,
    setSearch,
  ] =
    useState(
      searchParams.get(
        "q",
      ) ??
        "",
    );

  const [
    category,
    setCategory,
  ] =
    useState(
      searchParams.get(
        "category",
      ) ??
        "all",
    );

  const [
    sort,
    setSort,
  ] =
    useState(
      searchParams.get(
        "sort",
      ) ??
        "featured",
    );

  const [
    size,
    setSize,
  ] =
    useState(
      searchParams.get(
        "size",
      ) ??
        "all",
    );

  const [
    color,
    setColor,
  ] =
    useState(
      searchParams.get(
        "color",
      ) ??
        "all",
    );

  const [
    maxPrice,
    setMaxPrice,
  ] =
    useState(
      searchParams.get(
        "max",
      ) ??
        "",
    );

  const [
    onlyStock,
    setOnlyStock,
  ] =
    useState(
      searchParams.get(
        "stock",
      ) ===
        "1",
    );

  const [
    offersOnly,
    setOffersOnly,
  ] =
    useState(
      searchParams.get(
        "offers",
      ) ===
        "1",
    );

  const [
    filtersOpen,
    setFiltersOpen,
  ] =
    useState(false);

  const [
    visibleCount,
    setVisibleCount,
  ] =
    useState(
      itemsPerPage,
    );

  const [
    gridMode,
    setGridMode,
  ] =
    useState<
      "grid" | "compact"
    >(
      "grid",
    );

  const deferredSearch =
    useDeferredValue(
      search,
    );

  /* =======================================================
     BACK/FORWARD URL SYNC
     ======================================================= */

  useEffect(() => {
    setSearch(
      searchParams.get(
        "q",
      ) ??
        "",
    );

    setCategory(
      searchParams.get(
        "category",
      ) ??
        "all",
    );

    setSort(
      searchParams.get(
        "sort",
      ) ??
        "featured",
    );

    setSize(
      searchParams.get(
        "size",
      ) ??
        "all",
    );

    setColor(
      searchParams.get(
        "color",
      ) ??
        "all",
    );

    setMaxPrice(
      searchParams.get(
        "max",
      ) ??
        "",
    );

    setOnlyStock(
      searchParams.get(
        "stock",
      ) ===
        "1",
    );

    setOffersOnly(
      searchParams.get(
        "offers",
      ) ===
        "1",
    );
  }, [
    searchParams,
    urlStateKey,
  ]);

  /* =======================================================
     WRITE SHOP STATE TO URL
     ======================================================= */

  useEffect(() => {
    const timer =
      window.setTimeout(
        () => {
          const params =
            new URLSearchParams(
              searchParams.toString(),
            );

          const cleanSearch =
            search.trim();

          if (
            cleanSearch
          ) {
            params.set(
              "q",
              cleanSearch,
            );
          } else {
            params.delete(
              "q",
            );
          }

          if (
            category !==
            "all"
          ) {
            params.set(
              "category",
              category,
            );
          } else {
            params.delete(
              "category",
            );
          }

          if (
            sort !==
            "featured"
          ) {
            params.set(
              "sort",
              sort,
            );
          } else {
            params.delete(
              "sort",
            );
          }

          if (
            size !==
            "all"
          ) {
            params.set(
              "size",
              size,
            );
          } else {
            params.delete(
              "size",
            );
          }

          if (
            color !==
            "all"
          ) {
            params.set(
              "color",
              color,
            );
          } else {
            params.delete(
              "color",
            );
          }

          if (
            maxPrice
          ) {
            params.set(
              "max",
              maxPrice,
            );
          } else {
            params.delete(
              "max",
            );
          }

          if (
            onlyStock
          ) {
            params.set(
              "stock",
              "1",
            );
          } else {
            params.delete(
              "stock",
            );
          }

          if (
            offersOnly
          ) {
            params.set(
              "offers",
              "1",
            );
          } else {
            params.delete(
              "offers",
            );
          }

          const nextQuery =
            params.toString();

          const currentQuery =
            searchParams.toString();

          if (
            nextQuery ===
            currentQuery
          ) {
            return;
          }

          router.replace(
            nextQuery
              ? `${pathname}?${nextQuery}`
              : pathname,

            {
              scroll:
                false,
            },
          );
        },

        120,
      );

    return () => {
      window.clearTimeout(
        timer,
      );
    };
  }, [
    category,
    color,
    maxPrice,
    offersOnly,
    onlyStock,
    pathname,
    router,
    search,
    searchParams,
    size,
    sort,
  ]);

  /* =======================================================
     RESET PAGINATION
     ======================================================= */

  useEffect(() => {
    setVisibleCount(
      itemsPerPage,
    );
  }, [
    category,
    color,
    itemsPerPage,
    maxPrice,
    offersOnly,
    onlyStock,
    search,
    size,
    sort,
  ]);

  /* =======================================================
     FILTER DRAWER LOCK
     ======================================================= */

  useEffect(() => {
    if (
      !filtersOpen
    ) {
      return;
    }

    const previousOverflow =
      document.body.style
        .overflow;

    document.body.style.overflow =
      "hidden";

    function handleEscape(
      event:
        KeyboardEvent,
    ) {
      if (
        event.key ===
        "Escape"
      ) {
        setFiltersOpen(
          false,
        );
      }
    }

    window.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, [
    filtersOpen,
  ]);

  /* =======================================================
     CATEGORY LOOKUPS
     ======================================================= */

  const categoryById =
    useMemo(
      () =>
        new Map(
          categories.map(
            (
              item,
            ) => [
              item.id,
              item,
            ],
          ),
        ),

      [
        categories,
      ],
    );

  const categoryBySlug =
    useMemo(
      () =>
        new Map(
          categories.map(
            (
              item,
            ) => [
              item.slug,
              item,
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
            string | null,
            ShopCategory[]
          >();

        for (
          const item
          of categories
        ) {
          const current =
            map.get(
              item.parentId,
            ) ??
            [];

          current.push(
            item,
          );

          map.set(
            item.parentId,
            current,
          );
        }

        for (
          const children
          of map.values()
        ) {
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
        }

        return map;
      },

      [
        categories,
      ],
    );

  const rootCategories =
    useMemo(
      () => {
        const roots =
          childrenByParent.get(
            null,
          ) ??
          [];

        return roots.length
          ? roots
          : categories;
      },

      [
        categories,
        childrenByParent,
      ],
    );

  const selectedCategory =
    category ===
    "all"
      ? null
      : categoryBySlug.get(
          category,
        ) ??
        null;

  /* =======================================================
     ROOT CATEGORY
     ======================================================= */

  const activeRootCategory =
    useMemo(
      () => {
        if (
          !selectedCategory
        ) {
          return null;
        }

        let current =
          selectedCategory;

        const visited =
          new Set<string>();

        while (
          current.parentId &&
          !visited.has(
            current.id,
          )
        ) {
          visited.add(
            current.id,
          );

          const parent =
            categoryById.get(
              current.parentId,
            );

          if (!parent) {
            break;
          }

          current =
            parent;
        }

        return current;
      },

      [
        categoryById,
        selectedCategory,
      ],
    );

  /* =======================================================
     ROOT DESCENDANTS
     ======================================================= */

  const activeRootDescendants =
    useMemo(
      () => {
        if (
          !activeRootCategory
        ) {
          return [];
        }

        const result:
          ShopCategory[] =
          [];

        function walk(
          parentId:
            string,
        ) {
          const children =
            childrenByParent.get(
              parentId,
            ) ??
            [];

          for (
            const child
            of children
          ) {
            result.push(
              child,
            );

            walk(
              child.id,
            );
          }
        }

        walk(
          activeRootCategory.id,
        );

        return result;
      },

      [
        activeRootCategory,
        childrenByParent,
      ],
    );

  /* =======================================================
     CATEGORY FILTER IDS
     ======================================================= */

  const allowedCategoryIds =
    useMemo(
      () => {
        if (
          category ===
          "all"
        ) {
          return null;
        }

        if (
          !selectedCategory
        ) {
          return new Set<
            string
          >();
        }

        const ids =
          new Set<string>();

        function walk(
          categoryId:
            string,
        ) {
          if (
            ids.has(
              categoryId,
            )
          ) {
            return;
          }

          ids.add(
            categoryId,
          );

          const children =
            childrenByParent.get(
              categoryId,
            ) ??
            [];

          for (
            const child
            of children
          ) {
            walk(
              child.id,
            );
          }
        }

        walk(
          selectedCategory.id,
        );

        return ids;
      },

      [
        category,
        childrenByParent,
        selectedCategory,
      ],
    );

  /* =======================================================
     AVAILABLE SIZES
     ======================================================= */

  const sizes =
    useMemo(
      () =>
        [
          ...new Set(
            products.flatMap(
              (
                product,
              ) =>
                product.sizes,
            ),
          ),
        ]
          .filter(
            Boolean,
          )
          .sort(
            (
              first,
              second,
            ) =>
              first.localeCompare(
                second,
                undefined,
                {
                  numeric:
                    true,

                  sensitivity:
                    "base",
                },
              ),
          ),

      [
        products,
      ],
    );

  /* =======================================================
     AVAILABLE COLORS
     ======================================================= */

  const colors =
    useMemo(
      () =>
        [
          ...new Set(
            products.flatMap(
              (
                product,
              ) =>
                product.colors,
            ),
          ),
        ]
          .filter(
            Boolean,
          )
          .sort(
            (
              first,
              second,
            ) =>
              first.localeCompare(
                second,
              ),
          ),

      [
        products,
      ],
    );

  const colorSwatches =
    useMemo(
      () => {
        const swatches =
          new Map<
            string,
            string
          >();

        for (
          const product
          of products
        ) {
          for (
            const variant
            of product.variants ??
              []
          ) {
            if (
              variant.color &&
              variant.colorHex &&
              !swatches.has(
                variant.color,
              )
            ) {
              swatches.set(
                variant.color,
                variant.colorHex,
              );
            }
          }
        }

        return swatches;
      },

      [
        products,
      ],
    );

  /* =======================================================
     HIGHEST PRICE
     ======================================================= */

  const highestPrice =
    useMemo(
      () =>
        Math.ceil(
          Math.max(
            ...products.map(
              (
                product,
              ) =>
                product.price,
            ),

            0,
          ),
        ),

      [
        products,
      ],
    );

  /* =======================================================
     ORIGINAL DATABASE ORDER
     ======================================================= */

  const originalOrder =
    useMemo(
      () =>
        new Map(
          products.map(
            (
              product,
              productIndex,
            ) => [
              product.id,
              productIndex,
            ],
          ),
        ),

      [
        products,
      ],
    );

  /* =======================================================
     FILTER PRODUCTS
     ======================================================= */

  const filteredProducts =
    useMemo(
      () => {
        const keyword =
          deferredSearch
            .trim()
            .toLowerCase();

        const result =
          products.filter(
            (
              product,
            ) => {
              /* ===========================================
                 SEARCH
                 =========================================== */

              const searchable =
                [
                  product.name,

                  product.category,

                  ...product.sizes,

                  ...product.colors,

                  ...(
                    product.variants ??
                    []
                  ).flatMap(
                    (
                      variant,
                    ) => [
                      variant.sku,
                      variant.size,
                      variant.color,
                    ],
                  ),
                ]
                  .join(
                    " ",
                  )
                  .toLowerCase();

              const matchesSearch =
                !keyword ||
                searchable.includes(
                  keyword,
                );

              /* ===========================================
                 CATEGORY
                 =========================================== */

              const productCategories =
                productCategoryMap[
                  product.id
                ] ??
                [];

              const matchesCategory =
                allowedCategoryIds ===
                null
                  ? true
                  : productCategories.some(
                      (
                        categoryId,
                      ) =>
                        allowedCategoryIds.has(
                          categoryId,
                        ),
                    );

              /* ===========================================
                 STOCK
                 =========================================== */

              const matchesStock =
                !onlyStock ||
                product.stock >
                  0;

              /* ===========================================
                 SIZE + COLOR COMBINATION

                 Only show a product when an actual
                 in-stock variant satisfies the
                 selected size/color combination.
                 =========================================== */

              const needsVariantFilter =
                size !==
                  "all" ||
                color !==
                  "all";

              const variants =
                product.variants ??
                [];

              const matchesVariant =
                !needsVariantFilter
                  ? true
                  : variants.some(
                      (
                        variant,
                      ) =>
                        variant.stock >
                          0 &&
                        (
                          size ===
                            "all" ||
                          variant.size ===
                            size
                        ) &&
                        (
                          color ===
                            "all" ||
                          variant.color ===
                            color
                        ),
                    );

              /* ===========================================
                 PRICE
                 =========================================== */

              const numericMaxPrice =
                Number(
                  maxPrice,
                );

              const matchesPrice =
                !maxPrice ||
                !Number.isFinite(
                  numericMaxPrice,
                ) ||
                product.price <=
                  numericMaxPrice;

              /* ===========================================
                 OFFERS
                 =========================================== */

              const matchesOffers =
                !offersOnly ||
                Boolean(
                  product.oldPrice &&
                    product.oldPrice >
                      product.price,
                );

              return (
                matchesSearch &&
                matchesCategory &&
                matchesStock &&
                matchesVariant &&
                matchesPrice &&
                matchesOffers
              );
            },
          );

        /* ===============================================
           SORTING
           =============================================== */

        result.sort(
          (
            first,
            second,
          ) => {
            if (
              sort ===
              "low"
            ) {
              return (
                first.price -
                second.price
              );
            }

            if (
              sort ===
              "high"
            ) {
              return (
                second.price -
                first.price
              );
            }

            if (
              sort ===
              "newest"
            ) {
              return (
                (
                  originalOrder.get(
                    first.id,
                  ) ??
                  0
                ) -
                (
                  originalOrder.get(
                    second.id,
                  ) ??
                  0
                )
              );
            }

            const featuredFirst =
              first.badge ===
              "FEATURED"
                ? 1
                : 0;

            const featuredSecond =
              second.badge ===
              "FEATURED"
                ? 1
                : 0;

            if (
              featuredFirst !==
              featuredSecond
            ) {
              return (
                featuredSecond -
                featuredFirst
              );
            }

            return (
              (
                originalOrder.get(
                  first.id,
                ) ??
                0
              ) -
              (
                originalOrder.get(
                  second.id,
                ) ??
                0
              )
            );
          },
        );

        return result;
      },

      [
        allowedCategoryIds,
        color,
        deferredSearch,
        maxPrice,
        offersOnly,
        onlyStock,
        originalOrder,
        productCategoryMap,
        products,
        size,
        sort,
      ],
    );

  /* =======================================================
     FILTER COUNTS
     ======================================================= */

  const activeFiltersCount =
    [
      category !==
        "all",

      size !==
        "all",

      color !==
        "all",

      Boolean(
        maxPrice,
      ),

      onlyStock,

      offersOnly,
    ].filter(
      Boolean,
    ).length;

  const hasRefinements =
    Boolean(
      search.trim(),
    ) ||
    activeFiltersCount >
      0;

  const visibleProducts =
    filteredProducts.slice(
      0,
      visibleCount,
    );

  /* =======================================================
     ACTIONS
     ======================================================= */

  function selectCategory(
    slug:
      string,
  ) {
    setCategory(
      slug,
    );
  }

  function resetFilters() {
    setCategory(
      "all",
    );

    setSize(
      "all",
    );

    setColor(
      "all",
    );

    setMaxPrice(
      "",
    );

    setOnlyStock(
      false,
    );

    setOffersOnly(
      false,
    );
  }

  function clearEverything() {
    setSearch(
      "",
    );

    setSort(
      "featured",
    );

    resetFilters();
  }

  const collectionTitle =
    selectedCategory
      ?.name ??
    (
      offersOnly
        ? "Offers"
        : "All Products"
    );

  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <>
      {/* ===================================================
          DISCOVERY + FILTER CONTROLS
          =================================================== */}

      <section className="premium-shop-controls">
        <div className="container premium-shop-controls-inner">
          {/* ===============================================
              CATEGORY HEADING
              =============================================== */}

          <div className="premium-shop-control-heading">
            <span>
              Shop by Category
            </span>

            <small>
              {
                products.length
              }{" "}
              styles available
            </small>
          </div>

          {/* ===============================================
              ROOT CATEGORIES
              =============================================== */}

          <div
            className="premium-shop-categories"
            aria-label="Product categories"
          >
            <CategoryButton
              active={
                category ===
                "all"
              }
              onClick={() =>
                selectCategory(
                  "all",
                )
              }
            >
              All
            </CategoryButton>

            {rootCategories.map(
              (
                item,
              ) => (
                <CategoryButton
                  key={
                    item.id
                  }
                  active={
                    activeRootCategory
                      ?.id ===
                      item.id
                  }
                  onClick={() =>
                    selectCategory(
                      item.slug,
                    )
                  }
                >
                  {
                    item.name
                  }
                </CategoryButton>
              ),
            )}
          </div>

          {/* ===============================================
              SUBCATEGORIES
              =============================================== */}

          {activeRootCategory &&
          activeRootDescendants.length >
            0 ? (
            <div className="premium-shop-subcategory-wrap">
              <span>
                {
                  activeRootCategory.name
                }
              </span>

              <div className="premium-shop-subcategories">
                <CategoryButton
                  active={
                    category ===
                    activeRootCategory
                      .slug
                  }
                  onClick={() =>
                    selectCategory(
                      activeRootCategory.slug,
                    )
                  }
                >
                  All{" "}
                  {
                    activeRootCategory.name
                  }
                </CategoryButton>

                {activeRootDescendants.map(
                  (
                    item,
                  ) => (
                    <CategoryButton
                      key={
                        item.id
                      }
                      active={
                        category ===
                        item.slug
                      }
                      onClick={() =>
                        selectCategory(
                          item.slug,
                        )
                      }
                    >
                      {
                        item.name
                      }
                    </CategoryButton>
                  ),
                )}
              </div>
            </div>
          ) : null}

          {/* ===============================================
              SEARCH + SHOP ACTIONS
              =============================================== */}

          <div className="premium-shop-discovery-row">
            <label className="premium-shop-search">
              <Search
                size={18}
                strokeWidth={
                  1.7
                }
              />

              <input
                type="search"
                value={
                  search
                }
                aria-label="Search products"
                placeholder="Search product, category, SKU, size..."
                onChange={(
                  event,
                ) =>
                  setSearch(
                    event
                      .target
                      .value,
                  )
                }
              />

              {search ? (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() =>
                    setSearch(
                      "",
                    )
                  }
                >
                  <X
                    size={16}
                  />
                </button>
              ) : null}
            </label>

            <div className="premium-shop-discovery-actions">
              {/* ===========================================
                  SORT
                  =========================================== */}

              <div className="premium-shop-select-wrap">
                <select
                  value={
                    sort
                  }
                  aria-label="Sort products"
                  className="premium-shop-sort-select"
                  onChange={(
                    event,
                  ) =>
                    setSort(
                      event
                        .target
                        .value,
                    )
                  }
                >
                  <option value="featured">
                    Featured
                  </option>

                  <option value="newest">
                    Newest
                  </option>

                  <option value="low">
                    Price: Low to High
                  </option>

                  <option value="high">
                    Price: High to Low
                  </option>
                </select>

                <ChevronDown
                  size={15}
                />
              </div>

              {/* ===========================================
                  FILTER DRAWER
                  =========================================== */}

              <button
                type="button"
                className={`premium-shop-filter-button ${
                  activeFiltersCount >
                  0
                    ? "has-filters"
                    : ""
                }`}
                onClick={() =>
                  setFiltersOpen(
                    true,
                  )
                }
              >
                <SlidersHorizontal
                  size={17}
                />

                <span>
                  Filter
                </span>

                {activeFiltersCount >
                0 ? (
                  <b>
                    {
                      activeFiltersCount
                    }
                  </b>
                ) : null}
              </button>

              {/* ===========================================
                  GRID VIEW
                  =========================================== */}

              <div className="premium-shop-view-switch">
                <button
                  type="button"
                  aria-label="Standard grid"
                  className={
                    gridMode ===
                    "grid"
                      ? "is-active"
                      : ""
                  }
                  onClick={() =>
                    setGridMode(
                      "grid",
                    )
                  }
                >
                  <Grid2X2
                    size={16}
                  />
                </button>

                <button
                  type="button"
                  aria-label="Compact grid"
                  className={
                    gridMode ===
                    "compact"
                      ? "is-active"
                      : ""
                  }
                  onClick={() =>
                    setGridMode(
                      "compact",
                    )
                  }
                >
                  <List
                    size={17}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* ===============================================
              ACTIVE FILTERS
              =============================================== */}

          {hasRefinements ? (
            <div className="premium-shop-active-filters">
              <span className="premium-shop-active-label">
                Active
              </span>

              {search ? (
                <ActiveFilter
                  label={`Search: ${search}`}
                  onRemove={() =>
                    setSearch(
                      "",
                    )
                  }
                />
              ) : null}

              {selectedCategory ? (
                <ActiveFilter
                  label={
                    selectedCategory.name
                  }
                  onRemove={() =>
                    setCategory(
                      "all",
                    )
                  }
                />
              ) : null}

              {size !==
              "all" ? (
                <ActiveFilter
                  label={`Size: ${size}`}
                  onRemove={() =>
                    setSize(
                      "all",
                    )
                  }
                />
              ) : null}

              {color !==
              "all" ? (
                <ActiveFilter
                  label={`Color: ${color}`}
                  onRemove={() =>
                    setColor(
                      "all",
                    )
                  }
                />
              ) : null}

              {maxPrice ? (
                <ActiveFilter
                  label={`Up to ৳${Number(
                    maxPrice,
                  ).toLocaleString()}`}
                  onRemove={() =>
                    setMaxPrice(
                      "",
                    )
                  }
                />
              ) : null}

              {onlyStock ? (
                <ActiveFilter
                  label="In stock"
                  onRemove={() =>
                    setOnlyStock(
                      false,
                    )
                  }
                />
              ) : null}

              {offersOnly ? (
                <ActiveFilter
                  label="Offers"
                  onRemove={() =>
                    setOffersOnly(
                      false,
                    )
                  }
                />
              ) : null}

              <button
                type="button"
                className="premium-shop-clear-all"
                onClick={
                  clearEverything
                }
              >
                Clear all
              </button>
            </div>
          ) : null}
        </div>
      </section>

      {/* ===================================================
          PRODUCT COLLECTION
          =================================================== */}

      <section className="container premium-shop-main">
        <div className="premium-shop-results-heading">
          <div>
            <span>
              Shop Collection
            </span>

            <h2>
              {
                collectionTitle
              }
            </h2>
          </div>

          <p>
            Showing{" "}
            <strong>
              {
                visibleProducts.length
              }
            </strong>{" "}
            of{" "}
            <strong>
              {
                filteredProducts.length
              }
            </strong>{" "}
            products
          </p>
        </div>

        {filteredProducts.length >
        0 ? (
          <>
            <div
              className={`premium-shop-grid ${
                gridMode ===
                "compact"
                  ? "is-compact"
                  : ""
              }`}
            >
              {visibleProducts.map(
                (
                  product,
                ) => (
                  <ProductCard
                    key={
                      product.id
                    }
                    product={
                      product
                    }
                  />
                ),
              )}
            </div>

            {filteredProducts.length >
            visibleCount ? (
              <div className="premium-shop-pagination">
                <button
                  type="button"
                  className="premium-shop-load-more"
                  onClick={() =>
                    setVisibleCount(
                      (
                        current,
                      ) =>
                        current +
                        itemsPerPage,
                    )
                  }
                >
                  Load More Products

                  <span>
                    +
                  </span>
                </button>
              </div>
            ) : null}
          </>
        ) : (
          <div className="premium-shop-empty">
            <div className="premium-shop-empty-icon">
              <Search
                size={27}
              />
            </div>

            <span>
              No Match
            </span>

            <h2>
              No products found
            </h2>

            <p>
              Try another search,
              category or filter.
            </p>

            <button
              type="button"
              className="premium-shop-empty-reset"
              onClick={
                clearEverything
              }
            >
              View All Products
            </button>
          </div>
        )}
      </section>

      {/* ===================================================
          FILTER DRAWER
          =================================================== */}

      {filtersOpen ? (
        <div
          className="premium-filter-overlay"
          role="presentation"
          onMouseDown={() =>
            setFiltersOpen(
              false,
            )
          }
        >
          <aside
            className="premium-filter-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="shop-filter-title"
            onMouseDown={(
              event,
            ) =>
              event.stopPropagation()
            }
          >
            <div className="premium-filter-header">
              <div>
                <span>
                  Refine
                </span>

                <h2
                  id="shop-filter-title"
                >
                  Shop Filters
                </h2>
              </div>

              <button
                type="button"
                aria-label="Close filters"
                onClick={() =>
                  setFiltersOpen(
                    false,
                  )
                }
              >
                <X
                  size={19}
                />
              </button>
            </div>

            <div className="premium-filter-body">
              {/* ===========================================
                  CATEGORY
                  =========================================== */}

              <FilterSection title="Category">
                <div className="premium-filter-size-grid">
                  <FilterChip
                    active={
                      category ===
                      "all"
                    }
                    onClick={() =>
                      setCategory(
                        "all",
                      )
                    }
                  >
                    All
                  </FilterChip>

                  {rootCategories.map(
                    (
                      item,
                    ) => (
                      <FilterChip
                        key={
                          item.id
                        }
                        active={
                          activeRootCategory
                            ?.id ===
                          item.id
                        }
                        onClick={() =>
                          setCategory(
                            item.slug,
                          )
                        }
                      >
                        {
                          item.name
                        }
                      </FilterChip>
                    ),
                  )}
                </div>
              </FilterSection>

              {/* ===========================================
                  SIZE
                  =========================================== */}

              <FilterSection title="Size">
                <div className="premium-filter-size-grid">
                  <FilterChip
                    active={
                      size ===
                      "all"
                    }
                    onClick={() =>
                      setSize(
                        "all",
                      )
                    }
                  >
                    All
                  </FilterChip>

                  {sizes.map(
                    (
                      value,
                    ) => (
                      <FilterChip
                        key={
                          value
                        }
                        active={
                          size ===
                          value
                        }
                        onClick={() =>
                          setSize(
                            value,
                          )
                        }
                      >
                        {
                          value
                        }
                      </FilterChip>
                    ),
                  )}
                </div>
              </FilterSection>

              {/* ===========================================
                  COLOR
                  =========================================== */}

              <FilterSection title="Color">
                <div className="premium-filter-color-list">
                  <button
                    type="button"
                    className={`premium-filter-color-option ${
                      color ===
                      "all"
                        ? "is-active"
                        : ""
                    }`}
                    onClick={() =>
                      setColor(
                        "all",
                      )
                    }
                  >
                    <span className="premium-filter-color-all" />

                    <span>
                      All Colors
                    </span>

                    {color ===
                    "all" ? (
                      <Check
                        size={14}
                      />
                    ) : null}
                  </button>

                  {colors.map(
                    (
                      value,
                    ) => (
                      <button
                        type="button"
                        key={
                          value
                        }
                        className={`premium-filter-color-option ${
                          color ===
                          value
                            ? "is-active"
                            : ""
                        }`}
                        onClick={() =>
                          setColor(
                            value,
                          )
                        }
                      >
                        <span
                          className="premium-filter-color-dot"
                          style={{
                            background:
                              colorSwatches.get(
                                value,
                              ) ??
                              value,
                          }}
                        />

                        <span>
                          {
                            value
                          }
                        </span>

                        {color ===
                        value ? (
                          <Check
                            size={14}
                          />
                        ) : null}
                      </button>
                    ),
                  )}
                </div>
              </FilterSection>

              {/* ===========================================
                  PRICE
                  =========================================== */}

              <FilterSection title="Price">
                <label className="premium-filter-price">
                  <span>
                    Maximum price
                  </span>

                  <div>
                    <b>
                      ৳
                    </b>

                    <input
                      type="number"
                      min="0"
                      max={
                        highestPrice
                      }
                      value={
                        maxPrice
                      }
                      placeholder={
                        highestPrice
                          ? String(
                              highestPrice,
                            )
                          : "Any"
                      }
                      onChange={(
                        event,
                      ) =>
                        setMaxPrice(
                          event
                            .target
                            .value,
                        )
                      }
                    />
                  </div>
                </label>
              </FilterSection>

              {/* ===========================================
                  AVAILABILITY
                  =========================================== */}

              <FilterSection title="Availability">
                <div className="premium-filter-checkbox-list">
                  <label className="premium-filter-checkbox">
                    <input
                      type="checkbox"
                      checked={
                        onlyStock
                      }
                      onChange={(
                        event,
                      ) =>
                        setOnlyStock(
                          event
                            .target
                            .checked,
                        )
                      }
                    />

                    <span className="premium-filter-checkmark">
                      <Check
                        size={11}
                      />
                    </span>

                    <span>
                      In stock only
                    </span>
                  </label>

                  <label className="premium-filter-checkbox">
                    <input
                      type="checkbox"
                      checked={
                        offersOnly
                      }
                      onChange={(
                        event,
                      ) =>
                        setOffersOnly(
                          event
                            .target
                            .checked,
                        )
                      }
                    />

                    <span className="premium-filter-checkmark">
                      <Check
                        size={11}
                      />
                    </span>

                    <span>
                      Offers only
                    </span>
                  </label>
                </div>
              </FilterSection>
            </div>

            <div className="premium-filter-footer">
              <button
                type="button"
                className="premium-filter-reset"
                onClick={
                  resetFilters
                }
              >
                Reset
              </button>

              <button
                type="button"
                className="premium-filter-apply"
                onClick={() =>
                  setFiltersOpen(
                    false,
                  )
                }
              >
                View{" "}
                {
                  filteredProducts.length
                }{" "}
                Products
              </button>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}

/* =========================================================
   CATEGORY BUTTON
   ========================================================= */

function CategoryButton({
  active,
  onClick,
  children,
}: {
  active:
    boolean;

  onClick:
    () => void;

  children:
    ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={
        active
      }
      className={`premium-shop-category-chip ${
        active
          ? "is-active"
          : ""
      }`}
      onClick={
        onClick
      }
    >
      {
        children
      }
    </button>
  );
}

/* =========================================================
   ACTIVE FILTER
   ========================================================= */

function ActiveFilter({
  label,
  onRemove,
}: {
  label:
    string;

  onRemove:
    () => void;
}) {
  return (
    <button
      type="button"
      className="premium-shop-active-chip"
      onClick={
        onRemove
      }
    >
      <span>
        {
          label
        }
      </span>

      <X
        size={12}
      />
    </button>
  );
}

/* =========================================================
   FILTER SECTION
   ========================================================= */

function FilterSection({
  title,
  children,
}: {
  title:
    string;

  children:
    ReactNode;
}) {
  return (
    <section className="premium-filter-section">
      <div className="premium-filter-section-title">
        {
          title
        }
      </div>

      {
        children
      }
    </section>
  );
}

/* =========================================================
   FILTER CHIP
   ========================================================= */

function FilterChip({
  active,
  onClick,
  children,
}: {
  active:
    boolean;

  onClick:
    () => void;

  children:
    ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={
        active
      }
      className={`premium-filter-chip ${
        active
          ? "is-active"
          : ""
      }`}
      onClick={
        onClick
      }
    >
      {
        children
      }
    </button>
  );
}