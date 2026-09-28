"use client";

import {
  useEffect,
  useMemo,
  useState,
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

import type { Product } from "@/lib/data";

import { ProductCard } from "@/components/product/product-card";

type ShopCategory = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  sortOrder: number;
};

type ShopClientProps = {
  products: Product[];

  categories: ShopCategory[];

  productCategoryMap: Record<
    string,
    string[]
  >;

  itemsPerPage: number;
};

export function ShopClient({
  products,
  categories,
  productCategoryMap,
  itemsPerPage,
}: ShopClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams =
    useSearchParams();

  const urlStateKey =
    searchParams.toString();

  const [search, setSearch] =
    useState(
      searchParams.get("q") ??
        "",
    );

  const [
    category,
    setCategory,
  ] = useState(
    searchParams.get(
      "category",
    ) ?? "all",
  );

  const [sort, setSort] =
    useState(
      searchParams.get(
        "sort",
      ) ?? "featured",
    );

  const [
    onlyStock,
    setOnlyStock,
  ] = useState(false);

  const [
    filtersOpen,
    setFiltersOpen,
  ] = useState(false);

  const [size, setSize] =
    useState("all");

  const [color, setColor] =
    useState("all");

  const [
    maxPrice,
    setMaxPrice,
  ] = useState("");

  const [
    visibleCount,
    setVisibleCount,
  ] = useState(itemsPerPage);

  const [
    gridMode,
    setGridMode,
  ] = useState<
    "grid" | "compact"
  >("grid");

  /*
   * Keep React state synchronized
   * when browser back / forward
   * changes the URL.
   */
  useEffect(() => {
    setSearch(
      searchParams.get("q") ??
        "",
    );

    setCategory(
      searchParams.get(
        "category",
      ) ?? "all",
    );

    setSort(
      searchParams.get(
        "sort",
      ) ?? "featured",
    );
  }, [
    searchParams,
    urlStateKey,
  ]);

  /*
   * Keep Shop URL synchronized
   * with search/category/sort.
   */
  useEffect(() => {
    const params =
      new URLSearchParams(
        searchParams.toString(),
      );

    const cleanSearch =
      search.trim();

    if (cleanSearch) {
      params.set(
        "q",
        cleanSearch,
      );
    } else {
      params.delete("q");
    }

    if (
      category !== "all"
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
      sort !== "featured"
    ) {
      params.set("sort", sort);
    } else {
      params.delete("sort");
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
        scroll: false,
      },
    );
  }, [
    search,
    category,
    sort,
    pathname,
    router,
    searchParams,
  ]);

  /*
   * Reset pagination whenever
   * filtering changes.
   */
  useEffect(() => {
    setVisibleCount(
      itemsPerPage,
    );
  }, [
    search,
    category,
    sort,
    onlyStock,
    size,
    color,
    maxPrice,
    itemsPerPage,
  ]);

  /*
   * Category lookup structures.
   */
  const categoryById =
    useMemo(() => {
      return new Map(
        categories.map(
          (item) => [
            item.id,
            item,
          ],
        ),
      );
    }, [categories]);

  const categoryBySlug =
    useMemo(() => {
      return new Map(
        categories.map(
          (item) => [
            item.slug,
            item,
          ],
        ),
      );
    }, [categories]);

  const childrenByParent =
    useMemo(() => {
      const map = new Map<
        string | null,
        ShopCategory[]
      >();

      for (
        const item of categories
      ) {
        const existing =
          map.get(
            item.parentId,
          ) ?? [];

        existing.push(item);

        map.set(
          item.parentId,
          existing,
        );
      }

      for (
        const entries of map.values()
      ) {
        entries.sort(
          (a, b) =>
            a.sortOrder -
              b.sortOrder ||
            a.name.localeCompare(
              b.name,
            ),
        );
      }

      return map;
    }, [categories]);

  /*
   * Main/root categories.
   */
  const rootCategories =
    useMemo(() => {
      const roots =
        childrenByParent.get(
          null,
        ) ?? [];

      /*
       * Fallback for legacy data
       * without parent relationships.
       */
      return roots.length
        ? roots
        : categories;
    }, [
      childrenByParent,
      categories,
    ]);

  const selectedCategory =
    category === "all"
      ? null
      : categoryBySlug.get(
          category,
        ) ?? null;

  /*
   * Find the root parent for
   * whatever category is selected.
   */
  const activeRootCategory =
    useMemo(() => {
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

        current = parent;
      }

      return current;
    }, [
      selectedCategory,
      categoryById,
    ]);

  /*
   * Flatten descendants of the
   * selected root so second and
   * third-level categories can
   * also be selected.
   */
  const activeRootDescendants =
    useMemo(() => {
      if (
        !activeRootCategory
      ) {
        return [];
      }

      const result:
        ShopCategory[] = [];

      const walk = (
        parentId: string,
      ) => {
        const children =
          childrenByParent.get(
            parentId,
          ) ?? [];

        for (
          const child of children
        ) {
          result.push(child);

          walk(child.id);
        }
      };

      walk(
        activeRootCategory.id,
      );

      return result;
    }, [
      activeRootCategory,
      childrenByParent,
    ]);

  /*
   * When a parent category is
   * selected, products inside any
   * child/grandchild categories
   * must also be included.
   */
  const allowedCategoryIds =
    useMemo(() => {
      if (
        category === "all"
      ) {
        return null;
      }

      if (
        !selectedCategory
      ) {
        return new Set<string>();
      }

      const ids =
        new Set<string>();

      const walk = (
        categoryId: string,
      ) => {
        if (
          ids.has(categoryId)
        ) {
          return;
        }

        ids.add(categoryId);

        const children =
          childrenByParent.get(
            categoryId,
          ) ?? [];

        for (
          const child of children
        ) {
          walk(child.id);
        }
      };

      walk(
        selectedCategory.id,
      );

      return ids;
    }, [
      category,
      selectedCategory,
      childrenByParent,
    ]);

  const sizes = useMemo(
    () =>
      [
        ...new Set(
          products.flatMap(
            (product) =>
              product.sizes,
          ),
        ),
      ].filter(Boolean),
    [products],
  );

  const colors = useMemo(
    () =>
      [
        ...new Set(
          products.flatMap(
            (product) =>
              product.colors,
          ),
        ),
      ].filter(Boolean),
    [products],
  );

  const highestPrice =
    useMemo(() => {
      return Math.ceil(
        Math.max(
          ...products.map(
            (product) =>
              product.price,
          ),
          0,
        ),
      );
    }, [products]);

  const filteredProducts =
    useMemo(() => {
      const keyword =
        search
          .trim()
          .toLowerCase();

      const result =
        products.filter(
          (product) => {
            const searchable =
              [
                product.name,
                product.category,

                ...(
                  product.variants ??
                  []
                ).map(
                  (variant) =>
                    variant.sku,
                ),
              ]
                .join(" ")
                .toLowerCase();

            const matchesSearch =
              !keyword ||
              searchable.includes(
                keyword,
              );

            const productCategories =
              productCategoryMap[
                product.id
              ] ?? [];

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

            const matchesStock =
              !onlyStock ||
              product.stock > 0;

            const matchesSize =
              size === "all" ||
              product.sizes.includes(
                size,
              );

            const matchesColor =
              color === "all" ||
              product.colors.includes(
                color,
              );

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

            return (
              matchesSearch &&
              matchesCategory &&
              matchesStock &&
              matchesSize &&
              matchesColor &&
              matchesPrice
            );
          },
        );

      return result.sort(
        (a, b) => {
          if (
            sort === "low"
          ) {
            return (
              a.price -
              b.price
            );
          }

          if (
            sort === "high"
          ) {
            return (
              b.price -
              a.price
            );
          }

          if (
            sort ===
            "newest"
          ) {
            return b.id.localeCompare(
              a.id,
            );
          }

          const featuredA =
            a.badge ===
            "FEATURED"
              ? 1
              : 0;

          const featuredB =
            b.badge ===
            "FEATURED"
              ? 1
              : 0;

          if (
            featuredA !==
            featuredB
          ) {
            return (
              featuredB -
              featuredA
            );
          }

          return b.id.localeCompare(
            a.id,
          );
        },
      );
    }, [
      products,
      productCategoryMap,
      search,
      sort,
      allowedCategoryIds,
      onlyStock,
      size,
      color,
      maxPrice,
    ]);

  const activeFiltersCount =
    [
      size !== "all",
      color !== "all",
      Boolean(maxPrice),
      onlyStock,
    ].filter(Boolean).length;

  const visibleProducts =
    filteredProducts.slice(
      0,
      visibleCount,
    );

  function selectCategory(
    slug: string,
  ) {
    setCategory(slug);
  }

  function resetFilters() {
    setSize("all");
    setColor("all");
    setMaxPrice("");
    setOnlyStock(false);
  }

  function resetEverything() {
    setSearch("");
    setCategory("all");
    setSort("featured");

    resetFilters();
  }

  return (
    <>
      <section className="premium-shop-controls">
        <div className="container">
          <div className="premium-shop-category-row">
            <div className="premium-shop-categories">
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
                (item) => (
                  <CategoryButton
                    key={
                      item.id
                    }
                    active={
                      activeRootCategory?.id ===
                        item.id ||
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

            <div className="premium-shop-sort-area">
              <span className="premium-shop-sort-label">
                Sort by
              </span>

              <div className="premium-shop-select-wrap">
                <select
                  value={sort}
                  onChange={(
                    event,
                  ) =>
                    setSort(
                      event
                        .target
                        .value,
                    )
                  }
                  className="premium-shop-sort-select"
                >
                  <option value="featured">
                    Featured
                  </option>

                  <option value="newest">
                    Newest
                  </option>

                  <option value="low">
                    Price: Low
                    to High
                  </option>

                  <option value="high">
                    Price: High
                    to Low
                  </option>
                </select>

                <ChevronDown
                  size={14}
                />
              </div>

              <button
                type="button"
                className={`premium-shop-filter-button ${
                  activeFiltersCount
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
                  size={15}
                />

                Filter

                {activeFiltersCount >
                0 ? (
                  <span>
                    {
                      activeFiltersCount
                    }
                  </span>
                ) : null}
              </button>
            </div>
          </div>

          {activeRootCategory &&
          activeRootDescendants.length >
            0 ? (
            <div
              className="premium-shop-categories premium-shop-subcategories"
              style={{
                paddingTop: 10,
              }}
            >
              <CategoryButton
                active={
                  category ===
                  activeRootCategory.slug
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
                (item) => (
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
          ) : null}

          <div className="premium-shop-mobile-actions">
            <button
              type="button"
              onClick={() =>
                setFiltersOpen(
                  true,
                )
              }
            >
              <SlidersHorizontal
                size={15}
              />

              Filter

              {activeFiltersCount >
              0 ? (
                <span className="premium-shop-mobile-filter-count">
                  {
                    activeFiltersCount
                  }
                </span>
              ) : null}
            </button>

            <label>
              <span>
                Sort
              </span>

              <select
                value={sort}
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
                  Price Low
                </option>

                <option value="high">
                  Price High
                </option>
              </select>
            </label>
          </div>
        </div>
      </section>

      <section className="container premium-shop-main">
        <div className="premium-shop-toolbar">
          <div className="premium-shop-count">
            Showing{" "}
            {
              visibleProducts.length
            }{" "}
            of{" "}
            {
              filteredProducts.length
            }{" "}
            products
          </div>

          <div className="premium-shop-toolbar-right">
            <label className="premium-shop-search">
              <Search
                size={15}
              />

              <input
                value={search}
                onChange={(
                  event,
                ) =>
                  setSearch(
                    event
                      .target
                      .value,
                  )
                }
                placeholder="Search products..."
              />

              {search ? (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() =>
                    setSearch("")
                  }
                >
                  <X
                    size={14}
                  />
                </button>
              ) : null}
            </label>

            <div className="premium-shop-view-switch">
              <button
                type="button"
                className={
                  gridMode ===
                  "grid"
                    ? "is-active"
                    : ""
                }
                aria-label="Grid view"
                onClick={() =>
                  setGridMode(
                    "grid",
                  )
                }
              >
                <Grid2X2
                  size={14}
                />
              </button>

              <button
                type="button"
                className={
                  gridMode ===
                  "compact"
                    ? "is-active"
                    : ""
                }
                aria-label="Compact view"
                onClick={() =>
                  setGridMode(
                    "compact",
                  )
                }
              >
                <List
                  size={15}
                />
              </button>
            </div>
          </div>
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
                  Load More
                </button>
              </div>
            ) : null}
          </>
        ) : (
          <div className="premium-shop-empty">
            <div className="premium-shop-empty-icon">
              <Search
                size={26}
              />
            </div>

            <h2>
              No products found
            </h2>

            <p>
              Try changing
              your search,
              category or
              filters.
            </p>

            <button
              type="button"
              className="btn btn-dark"
              onClick={
                resetEverything
              }
            >
              View All Products
            </button>
          </div>
        )}
      </section>

      {filtersOpen ? (
        <div
          className="premium-filter-overlay"
          onMouseDown={() =>
            setFiltersOpen(
              false,
            )
          }
        >
          <aside
            className="premium-filter-drawer"
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

                <h2>
                  Filters
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
                            size={
                              14
                            }
                          />
                        ) : null}
                      </button>
                    ),
                  )}
                </div>
              </FilterSection>

              <FilterSection title="Price">
                <label className="premium-filter-price">
                  <span>
                    Maximum price
                  </span>

                  <div>
                    <span>
                      ৳
                    </span>

                    <input
                      type="number"
                      min="0"
                      max={
                        highestPrice
                      }
                      value={
                        maxPrice
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
                      placeholder={
                        highestPrice
                          ? String(
                              highestPrice,
                            )
                          : "Any"
                      }
                    />
                  </div>
                </label>
              </FilterSection>

              <FilterSection title="Availability">
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

function CategoryButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children:
    React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={`premium-shop-category-chip ${
        active
          ? "is-active"
          : ""
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function FilterSection({
  title,
  children,
}: {
  title: string;
  children:
    React.ReactNode;
}) {
  return (
    <section className="premium-filter-section">
      <div className="premium-filter-section-title">
        {title}
      </div>

      {children}
    </section>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children:
    React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={`premium-filter-chip ${
        active
          ? "is-active"
          : ""
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}