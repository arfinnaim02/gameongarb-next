"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Check,
  ChevronDown,
  Filter,
  Grid2X2,
  List,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";

import {
  useSearchParams,
} from "next/navigation";

import type {
  Product,
} from "@/lib/data";

import {
  ProductCard,
} from "@/components/product/product-card";

type ShopClientProps = {
  products: Product[];

  categories: {
    name: string;
    slug: string;
  }[];

  itemsPerPage: number;
};

export function ShopClient({
  products,
  categories,
  itemsPerPage,
}: ShopClientProps) {
  const searchParams =
    useSearchParams();

  const initialSearch =
    searchParams.get("q") ??
    "";

  const initialCategory =
    searchParams.get(
      "category",
    ) ?? "all";

  const initialSort =
    searchParams.get(
      "sort",
    ) ?? "featured";

  const [search, setSearch] =
    useState(initialSearch);

  const [category, setCategory] =
    useState(initialCategory);

  const [sort, setSort] =
    useState(initialSort);

  const [onlyStock, setOnlyStock] =
    useState(false);

  const [filtersOpen, setFiltersOpen] =
    useState(false);

  const [size, setSize] =
    useState("all");

  const [color, setColor] =
    useState("all");

  const [maxPrice, setMaxPrice] =
    useState("");

  const [visibleCount, setVisibleCount] =
    useState(itemsPerPage);

  const [gridMode, setGridMode] =
    useState<"grid" | "compact">(
      "grid",
    );

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
    useMemo(
      () =>
        Math.ceil(
          Math.max(
            ...products.map(
              (product) =>
                product.price,
            ),
            0,
          ),
        ),
      [products],
    );

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
                ...(product.variants?.map(
                  (variant) =>
                    variant.sku,
                ) ?? []),
              ]
                .join(" ")
                .toLowerCase();

            const matchesSearch =
              !keyword ||
              searchable.includes(
                keyword,
              );

            const matchesCategory =
              category === "all" ||
              normalize(
                product.category,
              ) ===
                normalize(
                  category,
                );

            const matchesStock =
              !onlyStock ||
              product.stock >
                0;

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

            const matchesPrice =
              !maxPrice ||
              product.price <=
                Number(
                  maxPrice,
                );

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
      search,
      category,
      sort,
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
                  setCategory(
                    "all",
                  )
                }
              >
                All
              </CategoryButton>

              {categories.map(
                (item) => (
                  <CategoryButton
                    key={
                      item.slug
                    }
                    active={
                      normalize(
                        category,
                      ) ===
                      normalize(
                        item.slug,
                      )
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
                  value={
                    sort
                  }
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
                    Price:
                    Low to High
                  </option>

                  <option value="high">
                    Price:
                    High to Low
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
            {visibleProducts.length}
            {" "}of{" "}
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
                value={
                  search
                }
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
                    setSearch(
                      "",
                    )
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

        {filteredProducts.length ? (
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
                (product) => (
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
                        count,
                      ) =>
                        count +
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
              No products
              found
            </h2>

            <p>
              Try changing
              your search or
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
              <FilterSection
                title="Size"
              >
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

              <FilterSection
                title="Color"
              >
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

              <FilterSection
                title="Price"
              >
                <label className="premium-filter-price">
                  <span>
                    Maximum
                    price
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

              <FilterSection
                title="Availability"
              >
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
                    In stock
                    only
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
  children: React.ReactNode;
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
  children: React.ReactNode;
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
  children: React.ReactNode;
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

function normalize(
  value: string,
) {
  return value
    .toLowerCase()
    .replace(
      /[^a-z0-9]/g,
      "",
    );
}