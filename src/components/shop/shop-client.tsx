"use client";

import Image from "next/image";
import Link from "next/link";

import type {
  FormEvent,
  ReactNode,
} from "react";

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
  useSearchParams,
} from "next/navigation";

import {
  ProductCard,
} from "@/components/product/product-card";

import type {
  Product,
} from "@/lib/data";

import {
  formatBDT,
} from "@/lib/money";

import styles from "./shop-client.module.css";

/* =========================================================
   TYPES
   ========================================================= */

type ShopCategory = {
  id:
    string;

  name:
    string;

  slug:
    string;

  description:
    string | null;

  parentId:
    string | null;

  sortOrder:
    number;
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

  primaryCategoryMap:
    Record<
      string,
      string
    >;

  itemsPerPage:
    number;
};

type FilterState = {
  category:
    string;

  sizes:
    string[];

  colors:
    string[];

  maxPrice:
    string;

  onlyStock:
    boolean;

  offersOnly:
    boolean;
};

type CategoryOption = {
  category:
    ShopCategory;

  depth:
    number;
};

/* =========================================================
   CONSTANTS
   ========================================================= */

const CATEGORY_PRODUCT_LIMIT =
  8;

const RECENT_SEARCH_KEY =
  "gog_recent_searches";

const RECENT_SEARCH_LIMIT =
  6;

const SEARCH_PRODUCT_LIMIT =
  5;

const SEARCH_CATEGORY_LIMIT =
  4;

const PRICE_PRESETS = [
  {
    label:
      "Any price",

    value:
      "",
  },

  {
    label:
      "Under ৳500",

    value:
      "500",
  },

  {
    label:
      "Under ৳1,000",

    value:
      "1000",
  },

  {
    label:
      "Under ৳1,500",

    value:
      "1500",
  },

  {
    label:
      "Under ৳2,000",

    value:
      "2000",
  },

  {
    label:
      "Under ৳3,000",

    value:
      "3000",
  },
];

/* =========================================================
   HELPERS
   ========================================================= */

function parseList(
  value:
    string | null,
) {
  if (!value) {
    return [];
  }

  return [
    ...new Set(
      value
        .split(",")
        .map(
          (
            item,
          ) =>
            item.trim(),
        )
        .filter(
          Boolean,
        ),
    ),
  ];
}

function toggleValue(
  values:
    string[],

  value:
    string,
) {
  return values.includes(
    value,
  )
    ? values.filter(
        (
          item,
        ) =>
          item !==
          value,
      )
    : [
        ...values,
        value,
      ];
}

function collectAllowedCategoryIds(
  slug:
    string,

  categoryBySlug:
    Map<
      string,
      ShopCategory
    >,

  childrenByParent:
    Map<
      string | null,
      ShopCategory[]
    >,
) {
  if (
    slug ===
    "all"
  ) {
    return null;
  }

  const selected =
    categoryBySlug.get(
      slug,
    );

  if (!selected) {
    return new Set<
      string
    >();
  }

  const ids =
    new Set<
      string
    >();

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

    children.forEach(
      (
        child,
      ) =>
        walk(
          child.id,
        ),
    );
  }

  walk(
    selected.id,
  );

  return ids;
}

function getRootCategoryId(
  categoryId:
    string,

  categoryById:
    Map<
      string,
      ShopCategory
    >,
) {
  let current =
    categoryById.get(
      categoryId,
    );

  const visited =
    new Set<
      string
    >();

  while (
    current?.parentId &&
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

  return (
    current?.id ??
    categoryId
  );
}

function flattenCategoryTree(
  roots:
    ShopCategory[],

  childrenByParent:
    Map<
      string | null,
      ShopCategory[]
    >,
) {
  const result:
    CategoryOption[] =
    [];

  function walk(
    category:
      ShopCategory,

    depth:
      number,
  ) {
    result.push({
      category,
      depth,
    });

    const children =
      childrenByParent.get(
        category.id,
      ) ??
      [];

    children.forEach(
      (
        child,
      ) =>
        walk(
          child,
          depth +
            1,
        ),
    );
  }

  roots.forEach(
    (
      root,
    ) =>
      walk(
        root,
        0,
      ),
  );

  return result;
}

/* =========================================================
   SEARCH ENGINE
   ========================================================= */

function normalizeSearchText(
  value:
    string,
) {
  return value
    .normalize(
      "NFD",
    )
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      " ",
    )
    .trim();
}

function editDistance(
  first:
    string,
  second:
    string,
) {
  if (
    first ===
    second
  ) {
    return 0;
  }

  if (!first) {
    return second.length;
  }

  if (!second) {
    return first.length;
  }

  const previous =
    Array.from(
      {
        length:
          second.length +
          1,
      },
      (
        _,
        index,
      ) =>
        index,
    );

  for (
    let firstIndex =
      1;
    firstIndex <=
    first.length;
    firstIndex += 1
  ) {
    let diagonal =
      previous[0];

    previous[0] =
      firstIndex;

    for (
      let secondIndex =
        1;
      secondIndex <=
      second.length;
      secondIndex += 1
    ) {
      const oldValue =
        previous[
          secondIndex
        ];

      const cost =
        first[
          firstIndex -
            1
        ] ===
        second[
          secondIndex -
            1
        ]
          ? 0
          : 1;

      previous[
        secondIndex
      ] =
        Math.min(
          previous[
            secondIndex
          ] +
            1,

          previous[
            secondIndex -
              1
          ] +
            1,

          diagonal +
            cost,
        );

      diagonal =
        oldValue;
    }
  }

  return previous[
    second.length
  ];
}

function searchScore(
  query:
    string,

  candidates:
    (
      | string
      | null
      | undefined
    )[],
) {
  const cleanQuery =
    normalizeSearchText(
      query,
    );

  if (
    !cleanQuery
  ) {
    return 0;
  }

  let bestScore =
    0;

  candidates.forEach(
    (
      candidateValue,
    ) => {
      if (
        !candidateValue
      ) {
        return;
      }

      const candidate =
        normalizeSearchText(
          candidateValue,
        );

      if (
        !candidate
      ) {
        return;
      }

      const words =
        candidate
          .split(
            " ",
          )
          .filter(
            Boolean,
          );

      if (
        candidate ===
        cleanQuery
      ) {
        bestScore =
          Math.max(
            bestScore,
            120,
          );

        return;
      }

      if (
        words.includes(
          cleanQuery,
        )
      ) {
        bestScore =
          Math.max(
            bestScore,
            110,
          );
      }

      if (
        candidate.startsWith(
          cleanQuery,
        )
      ) {
        bestScore =
          Math.max(
            bestScore,
            100,
          );
      }

      if (
        words.some(
          (
            word,
          ) =>
            word.startsWith(
              cleanQuery,
            ),
        )
      ) {
        bestScore =
          Math.max(
            bestScore,
            90,
          );
      }

      if (
        candidate.includes(
          cleanQuery,
        )
      ) {
        bestScore =
          Math.max(
            bestScore,
            75,
          );
      }

      /*
       * Lightweight typo tolerance.
       *
       * Example:
       * "plo" can still match "polo".
       */
      if (
        cleanQuery.length >=
        3
      ) {
        const closest =
          Math.min(
            ...words.map(
              (
                word,
              ) =>
                editDistance(
                  cleanQuery,
                  word,
                ),
            ),
          );

        if (
          closest ===
          1
        ) {
          bestScore =
            Math.max(
              bestScore,
              58,
            );
        } else if (
          cleanQuery.length >=
            5 &&
          closest ===
            2
        ) {
          bestScore =
            Math.max(
              bestScore,
              42,
            );
        }
      }
    },
  );

  return bestScore;
}

function filterProducts(
  products:
    Product[],

  productCategoryMap:
    Record<
      string,
      string[]
    >,

  categoryNameById:
    Map<
      string,
      string
    >,

  allowedCategoryIds:
    Set<
      string
    > | null,

  filters:
    FilterState,

  keyword:
    string,
) {
  const cleanKeyword =
    keyword
      .trim()
      .toLowerCase();

  return products.filter(
    (
      product,
    ) => {
      /* ===============================================
         SEARCH
         =============================================== */

      const assignedCategoryNames =
        (
          productCategoryMap[
            product.id
          ] ??
          []
        )
          .map(
            (
              categoryId,
            ) =>
              categoryNameById.get(
                categoryId,
              ),
          )
          .filter(
            (
              value,
            ): value is string =>
              Boolean(
                value,
              ),
          );

      const searchCandidates =
        [
          product.name,

          product.category,

          ...assignedCategoryNames,

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
        ];

      const matchesSearch =
        !cleanKeyword ||
        searchScore(
          cleanKeyword,
          searchCandidates,
        ) >
          0;

      /* ===============================================
         CATEGORY
         =============================================== */

      const assignedCategories =
        productCategoryMap[
          product.id
        ] ??
        [];

      const matchesCategory =
        allowedCategoryIds ===
        null
          ? true
          : assignedCategories.some(
              (
                categoryId,
              ) =>
                allowedCategoryIds.has(
                  categoryId,
                ),
            );

      /* ===============================================
         STOCK
         =============================================== */

      const matchesStock =
        !filters.onlyStock ||
        product.stock >
          0;

      /* ===============================================
         SIZE + COLOR

         When both are selected, an actual
         purchasable variant must satisfy both.
         =============================================== */

      const needsVariantFilter =
        filters.sizes.length >
          0 ||
        filters.colors.length >
          0;

      const variants =
        product.variants ??
        [];

      const matchesVariant =
        !needsVariantFilter
          ? true
          : variants.length >
              0
            ? variants.some(
                (
                  variant,
                ) =>
                  variant.stock >
                    0 &&
                  (
                    filters.sizes.length ===
                      0 ||
                    filters.sizes.includes(
                      variant.size,
                    )
                  ) &&
                  (
                    filters.colors.length ===
                      0 ||
                    filters.colors.includes(
                      variant.color,
                    )
                  ),
              )
            : (
                filters.sizes.length ===
                  0 ||
                filters.sizes.some(
                  (
                    selectedSize,
                  ) =>
                    product.sizes.includes(
                      selectedSize,
                    ),
                )
              ) &&
              (
                filters.colors.length ===
                  0 ||
                filters.colors.some(
                  (
                    selectedColor,
                  ) =>
                    product.colors.includes(
                      selectedColor,
                    ),
                )
              );

      /* ===============================================
         PRICE
         =============================================== */

      const numericMax =
        Number(
          filters.maxPrice,
        );

      const matchesPrice =
        !filters.maxPrice ||
        !Number.isFinite(
          numericMax,
        ) ||
        product.price <=
          numericMax;

      /* ===============================================
         OFFERS
         =============================================== */

      const matchesOffers =
        !filters.offersOnly ||
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
}

function sortProducts(
  products:
    Product[],

  sort:
    string,

  originalOrder:
    Map<
      string,
      number
    >,
) {
  const result = [
    ...products,
  ];

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
}

/* =========================================================
   SHOP
   ========================================================= */

export function ShopClient({
  products,
  categories,
  productCategoryMap,
  primaryCategoryMap,
  itemsPerPage,
}: ShopClientProps) {
  const pathname =
    usePathname();

  const searchParams =
    useSearchParams();

  /* =======================================================
     APPLIED URL STATE
     ======================================================= */

  const appliedQuery =
    searchParams.get(
      "q",
    ) ??
    "";

  const appliedSort =
    searchParams.get(
      "sort",
    ) ??
    "featured";

  const appliedFilters:
    FilterState = {
    category:
      searchParams.get(
        "category",
      ) ??
      "all",

    sizes:
      parseList(
        searchParams.get(
          "size",
        ),
      ),

    colors:
      parseList(
        searchParams.get(
          "color",
        ),
      ),

    maxPrice:
      searchParams.get(
        "max",
      ) ??
      "",

    onlyStock:
      searchParams.get(
        "stock",
      ) ===
      "1",

    offersOnly:
      searchParams.get(
        "offers",
      ) ===
      "1",
  };

  /* =======================================================
     LOCAL UI STATE
     ======================================================= */

  const [
    searchDraft,
    setSearchDraft,
  ] =
    useState(
      appliedQuery,
    );

  const [
    searchOpen,
    setSearchOpen,
  ] =
    useState(
      false,
    );

  const [
    recentSearches,
    setRecentSearches,
  ] =
    useState<
      string[]
    >(
      [],
    );

  const [
    draftFilters,
    setDraftFilters,
  ] =
    useState<FilterState>({
      ...appliedFilters,

      sizes: [
        ...appliedFilters.sizes,
      ],

      colors: [
        ...appliedFilters.colors,
      ],
    });

  const [
    filtersOpen,
    setFiltersOpen,
  ] =
    useState(
      false,
    );

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

      /* =======================================================
     RECENT SEARCHES
     ======================================================= */

  useEffect(() => {
    try {
      const stored =
        window.localStorage
          .getItem(
            RECENT_SEARCH_KEY,
          );

      if (
        !stored
      ) {
        return;
      }

      const parsed =
        JSON.parse(
          stored,
        );

      if (
        Array.isArray(
          parsed,
        )
      ) {
        setRecentSearches(
          parsed
            .filter(
              (
                value,
              ): value is string =>
                typeof value ===
                "string",
            )
            .slice(
              0,
              RECENT_SEARCH_LIMIT,
            ),
        );
      }
    } catch {
      /*
       * Search history is optional.
       * Ignore unavailable/corrupt
       * browser storage.
       */
    }
  }, []);


  /* =======================================================
     BODY LOCK
     ======================================================= */

  useEffect(() => {
    if (
      !filtersOpen
    ) {
      return;
    }

    const previous =
      document.body.style
        .overflow;

    document.body.style.overflow =
      "hidden";

    function escape(
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
      escape,
    );

    return () => {
      document.body.style.overflow =
        previous;

      window.removeEventListener(
        "keydown",
        escape,
      );
    };
  }, [
    filtersOpen,
  ]);

  /* =======================================================
     CATEGORY MAPS
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

  const categoryBySlug =
    useMemo(
      () =>
        new Map(
          categories.map(
            (
              category,
            ) => [
              category.slug,
              category,
            ],
          ),
        ),

      [
        categories,
      ],
    );

  const categoryNameById =
    useMemo(
      () =>
        new Map(
          categories.map(
            (
              category,
            ) => [
              category.id,
              category.name,
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

        categories.forEach(
          (
            category,
          ) => {
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

  const rootCategories =
    useMemo(
      () => {
        const roots =
          childrenByParent.get(
            null,
          ) ??
          [];

        return [
          ...roots,
        ].sort(
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

      [
        childrenByParent,
      ],
    );

  const categoryOptions =
    useMemo(
      () =>
        flattenCategoryTree(
          rootCategories,
          childrenByParent,
        ),

      [
        childrenByParent,
        rootCategories,
      ],
    );

  /* =======================================================
     ACTIVE CATEGORY
     ======================================================= */

  const selectedCategory =
    appliedFilters.category ===
    "all"
      ? null
      : categoryBySlug.get(
          appliedFilters.category,
        ) ??
        null;

  const activeRootCategory =
    selectedCategory
      ? categoryById.get(
          getRootCategoryId(
            selectedCategory.id,
            categoryById,
          ),
        ) ??
        null
      : null;

  const activeSubcategories =
    activeRootCategory
      ? categoryOptions
          .filter(
            (
              option,
            ) =>
              option.depth >
                0 &&
              getRootCategoryId(
                option.category.id,
                categoryById,
              ) ===
                activeRootCategory.id,
          )
          .map(
            (
              option,
            ) =>
              option.category,
          )
      : [];

  /* =======================================================
     LIVE SEARCH SUGGESTIONS
     ======================================================= */

  const productSuggestions =
    useMemo(
      () => {
        const query =
          searchDraft.trim();

        if (!query) {
          return [];
        }

        return products
          .map(
            (
              product,
            ) => {
              const assignedCategories =
                (
                  productCategoryMap[
                    product.id
                  ] ??
                  []
                )
                  .map(
                    (
                      categoryId,
                    ) =>
                      categoryNameById.get(
                        categoryId,
                      ),
                  )
                  .filter(
                    (
                      value,
                    ): value is string =>
                      Boolean(
                        value,
                      ),
                  );

              const score =
                searchScore(
                  query,
                  [
                    product.name,

                    product.category,

                    ...assignedCategories,

                    ...product.colors,

                    ...product.sizes,

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
                  ],
                );

              return {
                product,
                score,
              };
            },
          )
          .filter(
            (
              suggestion,
            ) =>
              suggestion.score >
              0,
          )
          .sort(
            (
              first,
              second,
            ) =>
              second.score -
                first.score ||
              Number(
                second.product
                  .stock >
                  0,
              ) -
                Number(
                  first.product
                    .stock >
                    0,
                ),
          )
          .slice(
            0,
            SEARCH_PRODUCT_LIMIT,
          );
      },

      [
        categoryNameById,
        productCategoryMap,
        products,
        searchDraft,
      ],
    );

  const categorySuggestions =
    useMemo(
      () => {
        const query =
          searchDraft.trim();

        if (!query) {
          return [];
        }

        return categories
          .map(
            (
              category,
            ) => ({
              category,

              score:
                searchScore(
                  query,
                  [
                    category.name,
                    category.slug,
                    category.description,
                  ],
                ),
            }),
          )
          .filter(
            (
              suggestion,
            ) =>
              suggestion.score >
              0,
          )
          .sort(
            (
              first,
              second,
            ) =>
              second.score -
                first.score ||
              first.category
                .sortOrder -
                second.category
                  .sortOrder,
          )
          .slice(
            0,
            SEARCH_CATEGORY_LIMIT,
          );
      },

      [
        categories,
        searchDraft,
      ],
    );

  /* =======================================================
     FILTER VALUES
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
                },
              ),
          ),

      [
        products,
      ],
    );

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
        const map =
          new Map<
            string,
            string
          >();

        products.forEach(
          (
            product,
          ) => {
            (
              product.variants ??
              []
            ).forEach(
              (
                variant,
              ) => {
                if (
                  variant.color &&
                  variant.colorHex &&
                  !map.has(
                    variant.color,
                  )
                ) {
                  map.set(
                    variant.color,
                    variant.colorHex,
                  );
                }
              },
            );
          },
        );

        return map;
      },

      [
        products,
      ],
    );

  const highestPrice =
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
    );

  /* =======================================================
     ORIGINAL PRODUCT ORDER
     ======================================================= */

  const originalOrder =
    useMemo(
      () =>
        new Map(
          products.map(
            (
              product,
              index,
            ) => [
              product.id,
              index,
            ],
          ),
        ),

      [
        products,
      ],
    );

  /* =======================================================
     APPLIED PRODUCTS
     ======================================================= */

  const appliedAllowedCategories =
    collectAllowedCategoryIds(
      appliedFilters.category,
      categoryBySlug,
      childrenByParent,
    );

  const filteredProducts =
    sortProducts(
      filterProducts(
        products,
        productCategoryMap,
        categoryNameById,
        appliedAllowedCategories,
        appliedFilters,
        appliedQuery,
      ),

      appliedSort,
      originalOrder,
    );

  /* =======================================================
     DRAFT / LIVE FILTER COUNT
     ======================================================= */

  const draftAllowedCategories =
    collectAllowedCategoryIds(
      draftFilters.category,
      categoryBySlug,
      childrenByParent,
    );

  const draftResultCount =
    filterProducts(
      products,
      productCategoryMap,
      categoryNameById,
      draftAllowedCategories,
      draftFilters,
      appliedQuery,
    ).length;

  /* =======================================================
     GROUPED DEFAULT VIEW
     ======================================================= */

  const hasAppliedFilters =
    Boolean(
      appliedQuery.trim(),
    ) ||
    appliedFilters.category !==
      "all" ||
    appliedFilters.sizes.length >
      0 ||
    appliedFilters.colors.length >
      0 ||
    Boolean(
      appliedFilters.maxPrice,
    ) ||
    appliedFilters.onlyStock ||
    appliedFilters.offersOnly;

  const rootOrder =
    new Map(
      rootCategories.map(
        (
          category,
          index,
        ) => [
          category.id,
          index,
        ],
      ),
    );

  function productRootId(
    product:
      Product,
  ) {
    const primaryCategoryId =
      primaryCategoryMap[
        product.id
      ];

    if (
      primaryCategoryId
    ) {
      return getRootCategoryId(
        primaryCategoryId,
        categoryById,
      );
    }

    const assigned =
      productCategoryMap[
        product.id
      ] ??
      [];

    const rootIds = [
      ...new Set(
        assigned.map(
          (
            categoryId,
          ) =>
            getRootCategoryId(
              categoryId,
              categoryById,
            ),
        ),
      ),
    ];

    rootIds.sort(
      (
        first,
        second,
      ) =>
        (
          rootOrder.get(
            first,
          ) ??
          9999
        ) -
        (
          rootOrder.get(
            second,
          ) ??
          9999
        ),
    );

    return (
      rootIds[0] ??
      null
    );
  }

  const allSortedProducts =
    sortProducts(
      products,
      appliedSort,
      originalOrder,
    );

  const categorySections =
    rootCategories
      .map(
        (
          category,
          index,
        ) => {
          const sectionProducts =
            allSortedProducts.filter(
              (
                product,
              ) =>
                productRootId(
                  product,
                ) ===
                category.id,
            );

          return {
            category,

            index,

            products:
              sectionProducts,

            visible:
              sectionProducts.slice(
                0,
                Math.min(
                  CATEGORY_PRODUCT_LIMIT,
                  Math.max(
                    4,
                    itemsPerPage,
                  ),
                ),
              ),
          };
        },
      )
      .filter(
        (
          section,
        ) =>
          section.products.length >
          0,
      );

  const showGroupedView =
    !hasAppliedFilters &&
    categorySections.length >
      0;

  /* =======================================================
     COUNTS
     ======================================================= */

  const appliedFilterCount =
    (
      appliedFilters.category !==
      "all"
        ? 1
        : 0
    ) +
    appliedFilters.sizes.length +
    appliedFilters.colors.length +
    (
      appliedFilters.maxPrice
        ? 1
        : 0
    ) +
    (
      appliedFilters.onlyStock
        ? 1
        : 0
    ) +
    (
      appliedFilters.offersOnly
        ? 1
        : 0
    );

  const visibleProducts =
    filteredProducts.slice(
      0,
      visibleCount,
    );

  /* =======================================================
     NAVIGATION
     ======================================================= */

  function navigate(
    update:
      (
        params:
          URLSearchParams,
      ) => void,
  ) {
    const params =
      new URLSearchParams(
        searchParams.toString(),
      );

    update(
      params,
    );

    const query =
      params.toString();

    window.location.assign(
      query
        ? `${pathname}?${query}`
        : pathname,
    );
  }

  /* =======================================================
     SEARCH
     ======================================================= */

  function rememberSearch(
    value:
      string,
  ) {
    const clean =
      value.trim();

    if (!clean) {
      return;
    }

    const next = [
      clean,

      ...recentSearches.filter(
        (
          item,
        ) =>
          item.toLowerCase() !==
          clean.toLowerCase(),
      ),
    ].slice(
      0,
      RECENT_SEARCH_LIMIT,
    );

    setRecentSearches(
      next,
    );

    try {
      window.localStorage
        .setItem(
          RECENT_SEARCH_KEY,
          JSON.stringify(
            next,
          ),
        );
    } catch {
      /*
       * Search still works if
       * browser storage is blocked.
       */
    }
  }

  function clearRecentSearches() {
    setRecentSearches(
      [],
    );

    try {
      window.localStorage
        .removeItem(
          RECENT_SEARCH_KEY,
        );
    } catch {
      // Optional browser storage.
    }
  }
  function submitSearch(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const value =
      searchDraft.trim();

    if (
      value
    ) {
      rememberSearch(
        value,
      );
    }

    setSearchOpen(
      false,
    );

    navigate(
      (
        params,
      ) => {
        if (
          value
        ) {
          params.set(
            "q",
            value,
          );
        } else {
          params.delete(
            "q",
          );
        }
      },
    );
  }
  /* =======================================================
     CATEGORY QUICK NAVIGATION
     ======================================================= */

  function applyCategory(
    slug:
      string,
  ) {
    navigate(
      (
        params,
      ) => {
        if (
          slug ===
          "all"
        ) {
          params.delete(
            "category",
          );
        } else {
          params.set(
            "category",
            slug,
          );
        }
      },
    );
  }

  /* =======================================================
     SORT
     ======================================================= */

  function applySort(
    value:
      string,
  ) {
    navigate(
      (
        params,
      ) => {
        if (
          value ===
          "featured"
        ) {
          params.delete(
            "sort",
          );
        } else {
          params.set(
            "sort",
            value,
          );
        }
      },
    );
  }

  /* =======================================================
     OPEN FILTERS
     ======================================================= */

  function openFilters() {
    setDraftFilters({
      ...appliedFilters,

      sizes: [
        ...appliedFilters.sizes,
      ],

      colors: [
        ...appliedFilters.colors,
      ],
    });

    setFiltersOpen(
      true,
    );
  }

  /* =======================================================
     APPLY DRAFT FILTERS
     ======================================================= */

  function showProducts() {
    const params =
      new URLSearchParams(
        searchParams.toString(),
      );

    if (
      draftFilters.category ===
      "all"
    ) {
      params.delete(
        "category",
      );
    } else {
      params.set(
        "category",
        draftFilters.category,
      );
    }

    if (
      draftFilters.sizes.length
    ) {
      params.set(
        "size",
        draftFilters.sizes.join(
          ",",
        ),
      );
    } else {
      params.delete(
        "size",
      );
    }

    if (
      draftFilters.colors.length
    ) {
      params.set(
        "color",
        draftFilters.colors.join(
          ",",
        ),
      );
    } else {
      params.delete(
        "color",
      );
    }

    if (
      draftFilters.maxPrice
    ) {
      params.set(
        "max",
        draftFilters.maxPrice,
      );
    } else {
      params.delete(
        "max",
      );
    }

    if (
      draftFilters.onlyStock
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
      draftFilters.offersOnly
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

    const query =
      params.toString();

    window.location.assign(
      query
        ? `${pathname}?${query}`
        : pathname,
    );
  }

  function resetDraftFilters() {
    setDraftFilters({
      category:
        "all",

      sizes:
        [],

      colors:
        [],

      maxPrice:
        "",

      onlyStock:
        false,

      offersOnly:
        false,
    });
  }

  function clearAllApplied() {
    navigate(
      (
        params,
      ) => {
        [
          "q",
          "category",
          "size",
          "color",
          "max",
          "stock",
          "offers",
        ].forEach(
          (
            key,
          ) =>
            params.delete(
              key,
            ),
        );
      },
    );
  }

  function removeAppliedListValue(
    key:
      "size" | "color",

    value:
      string,
  ) {
    navigate(
      (
        params,
      ) => {
        const values =
          parseList(
            params.get(
              key,
            ),
          ).filter(
            (
              item,
            ) =>
              item !==
              value,
          );

        if (
          values.length
        ) {
          params.set(
            key,
            values.join(
              ",",
            ),
          );
        } else {
          params.delete(
            key,
          );
        }
      },
    );
  }

  /* =======================================================
     COLLECTION TITLE
     ======================================================= */

  const collectionTitle =
    selectedCategory?.name ??
    (
      appliedFilters.offersOnly
        ? "Offers"
        : appliedQuery
          ? `Search Results`
          : "All Products"
    );

  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <>
      {/* ===================================================
          DISCOVERY
          =================================================== */}

      <section className={styles.discovery}>
        <div className={`container ${styles.discoveryInner}`}>
          <div className={styles.discoveryHeading}>
            <div>
              <span>
                Shop Game On Garb
              </span>

              <h2>
                Find Your Style
              </h2>
            </div>

            <p>
              Browse by category,
              search products or
              refine by size,
              colour and price.
            </p>
          </div>

          {/* ===============================================
              CATEGORY NAV
              =============================================== */}

          <div className={styles.categoryNav}>
            <button
              type="button"
              className={`${styles.categoryButton} ${
                appliedFilters.category ===
                "all"
                  ? styles.categoryActive
                  : ""
              }`}
              onClick={() =>
                applyCategory(
                  "all",
                )
              }
            >
              All
            </button>

            {rootCategories.map(
              (
                category,
              ) => (
                <button
                  key={
                    category.id
                  }
                  type="button"
                  className={`${styles.categoryButton} ${
                    activeRootCategory
                      ?.id ===
                    category.id
                      ? styles.categoryActive
                      : ""
                  }`}
                  onClick={() =>
                    applyCategory(
                      category.slug,
                    )
                  }
                >
                  {
                    category.name
                  }
                </button>
              ),
            )}
          </div>

          {/* ===============================================
              SUBCATEGORY NAV
              =============================================== */}

          {activeRootCategory &&
          activeSubcategories.length >
            0 ? (
            <div className={styles.subcategoryNav}>
              <span>
                {
                  activeRootCategory.name
                }
              </span>

              <button
                type="button"
                className={
                  appliedFilters.category ===
                  activeRootCategory.slug
                    ? styles.subcategoryActive
                    : ""
                }
                onClick={() =>
                  applyCategory(
                    activeRootCategory.slug,
                  )
                }
              >
                All
              </button>

              {activeSubcategories.map(
                (
                  category,
                ) => (
                  <button
                    key={
                      category.id
                    }
                    type="button"
                    className={
                      appliedFilters.category ===
                      category.slug
                        ? styles.subcategoryActive
                        : ""
                    }
                    onClick={() =>
                      applyCategory(
                        category.slug,
                      )
                    }
                  >
                    {
                      category.name
                    }
                  </button>
                ),
              )}
            </div>
          ) : null}

          {/* ===============================================
              SEARCH + TOOLS
              =============================================== */}

          <div className={styles.toolsRow}>
            <div
              className={
                styles.searchShell
              }
              onBlur={(
                event,
              ) => {
                if (
                  !event.currentTarget
                    .contains(
                      event.relatedTarget as
                        Node |
                        null,
                    )
                ) {
                  setSearchOpen(
                    false,
                  );
                }
              }}
            >
              <form
                className={
                  styles.search
                }
                onSubmit={
                  submitSearch
                }
              >
                <Search
                  size={
                    18
                  }
                  strokeWidth={
                    1.7
                  }
                />

                <input
                  type="search"
                  value={
                    searchDraft
                  }
                  placeholder="Search products, categories, SKU..."
                  aria-label="Search products"
                  aria-expanded={
                    searchOpen
                  }
                  aria-controls="shop-search-suggestions"
                  autoComplete="off"
                  onFocus={() =>
                    setSearchOpen(
                      true,
                    )
                  }
                  onChange={(
                    event,
                  ) => {
                    setSearchDraft(
                      event.target
                        .value,
                    );

                    setSearchOpen(
                      true,
                    );
                  }}
                />

                {searchDraft ? (
                  <button
                    type="button"
                    className={
                      styles.searchClear
                    }
                    aria-label="Clear search"
                    onClick={() => {
                      setSearchDraft(
                        "",
                      );

                      setSearchOpen(
                        true,
                      );
                    }}
                  >
                    <X
                      size={
                        15
                      }
                    />
                  </button>
                ) : null}

                <button
                  type="submit"
                  className={
                    styles.searchButton
                  }
                >
                  Search
                </button>
              </form>

              {searchOpen ? (
                <div
                  id="shop-search-suggestions"
                  className={
                    styles.searchSuggestions
                  }
                >
                  {!searchDraft.trim() &&
                  recentSearches.length >
                    0 ? (
                    <div
                      className={
                        styles.suggestionSection
                      }
                    >
                      <div
                        className={
                          styles.suggestionHeading
                        }
                      >
                        <span>
                          Recent Searches
                        </span>

                        <button
                          type="button"
                          onClick={
                            clearRecentSearches
                          }
                        >
                          Clear
                        </button>
                      </div>

                      <div
                        className={
                          styles.recentSearches
                        }
                      >
                        {recentSearches.map(
                          (
                            item,
                          ) => (
                            <button
                              key={
                                item
                              }
                              type="button"
                              onClick={() => {
                                setSearchDraft(
                                  item,
                                );

                                rememberSearch(
                                  item,
                                );

                                setSearchOpen(
                                  false,
                                );

                                navigate(
                                  (
                                    params,
                                  ) => {
                                    params.set(
                                      "q",
                                      item,
                                    );
                                  },
                                );
                              }}
                            >
                              <Search
                                size={
                                  12
                                }
                              />

                              {
                                item
                              }
                            </button>
                          ),
                        )}
                      </div>
                    </div>
                  ) : null}

                  {searchDraft.trim() &&
                  productSuggestions.length >
                    0 ? (
                    <div
                      className={
                        styles.suggestionSection
                      }
                    >
                      <div
                        className={
                          styles.suggestionHeading
                        }
                      >
                        <span>
                          Products
                        </span>
                      </div>

                      <div
                        className={
                          styles.productSuggestions
                        }
                      >
                        {productSuggestions.map(
                          ({
                            product,
                          }) => (
                            <Link
                              key={
                                product.id
                              }
                              href={`/product/${product.slug}`}
                              className={
                                styles.productSuggestion
                              }
                              onClick={() => {
                                rememberSearch(
                                  searchDraft,
                                );

                                setSearchOpen(
                                  false,
                                );
                              }}
                            >
                              <span
                                className={
                                  styles.suggestionImage
                                }
                              >
                                <Image
                                  src={
                                    product.image
                                  }
                                  alt=""
                                  width={
                                    48
                                  }
                                  height={
                                    54
                                  }
                                />
                              </span>

                              <span
                                className={
                                  styles.suggestionProductCopy
                                }
                              >
                                <small>
                                  {
                                    product.category
                                  }
                                </small>

                                <strong>
                                  {
                                    product.name
                                  }
                                </strong>

                                <span>
                                  {formatBDT(
                                    product.price,
                                  )}
                                </span>
                              </span>

                              <span
                                className={`${styles.stockStatus} ${
                                  product.stock >
                                  0
                                    ? styles.inStock
                                    : styles.outOfStock
                                }`}
                              >
                                {product.stock >
                                0
                                  ? "In stock"
                                  : "Sold out"}
                              </span>
                            </Link>
                          ),
                        )}
                      </div>
                    </div>
                  ) : null}

                  {searchDraft.trim() &&
                  categorySuggestions.length >
                    0 ? (
                    <div
                      className={
                        styles.suggestionSection
                      }
                    >
                      <div
                        className={
                          styles.suggestionHeading
                        }
                      >
                        <span>
                          Categories
                        </span>
                      </div>

                      <div
                        className={
                          styles.categorySuggestions
                        }
                      >
                        {categorySuggestions.map(
                          ({
                            category,
                          }) => (
                            <button
                              key={
                                category.id
                              }
                              type="button"
                              onClick={() => {
                                rememberSearch(
                                  category.name,
                                );

                                setSearchOpen(
                                  false,
                                );

                                applyCategory(
                                  category.slug,
                                );
                              }}
                            >
                              <span>
                                {
                                  category.name
                                }
                              </span>

                              <b>
                                View category →
                              </b>
                            </button>
                          ),
                        )}
                      </div>
                    </div>
                  ) : null}

                  {searchDraft.trim() &&
                  productSuggestions.length ===
                    0 &&
                  categorySuggestions.length ===
                    0 ? (
                    <div
                      className={
                        styles.noSuggestions
                      }
                    >
                      <Search
                        size={
                          18
                        }
                      />

                      <div>
                        <strong>
                          No instant match
                        </strong>

                        <span>
                          Search all products for “
                          {
                            searchDraft
                          }
                          ”
                        </span>
                      </div>
                    </div>
                  ) : null}

                  {searchDraft.trim() ? (
                    <button
                      type="button"
                      className={
                        styles.searchAll
                      }
                      onClick={() => {
                        rememberSearch(
                          searchDraft,
                        );

                        setSearchOpen(
                          false,
                        );

                        navigate(
                          (
                            params,
                          ) => {
                            params.set(
                              "q",
                              searchDraft.trim(),
                            );
                          },
                        );
                      }}
                    >
                      <span>
                        Search all for “
                        {
                          searchDraft.trim()
                        }
                        ”
                      </span>

                      <b>
                        →
                      </b>
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className={styles.toolActions}>
              <label className={styles.sortWrap}>
                <span>
                  Sort
                </span>

                <select
                  value={
                    appliedSort
                  }
                  onChange={(
                    event,
                  ) =>
                    applySort(
                      event.target
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
                  size={14}
                />
              </label>

              <button
                type="button"
                className={`${styles.filterButton} ${
                  appliedFilterCount >
                  0
                    ? styles.filterButtonActive
                    : ""
                }`}
                onClick={
                  openFilters
                }
              >
                <SlidersHorizontal
                  size={17}
                />

                Filters

                {appliedFilterCount >
                0 ? (
                  <b>
                    {
                      appliedFilterCount
                    }
                  </b>
                ) : null}
              </button>

              <div className={styles.viewSwitch}>
                <button
                  type="button"
                  aria-label="Standard grid"
                  className={
                    gridMode ===
                    "grid"
                      ? styles.viewActive
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
                      ? styles.viewActive
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
              APPLIED FILTER CHIPS
              =============================================== */}

          {hasAppliedFilters ? (
            <div className={styles.activeFilters}>
              <span>
                Applied
              </span>

              {appliedQuery ? (
                <FilterPill
                  label={`Search: ${appliedQuery}`}
                  onRemove={() =>
                    navigate(
                      (
                        params,
                      ) =>
                        params.delete(
                          "q",
                        ),
                    )
                  }
                />
              ) : null}

              {selectedCategory ? (
                <FilterPill
                  label={
                    selectedCategory.name
                  }
                  onRemove={() =>
                    navigate(
                      (
                        params,
                      ) =>
                        params.delete(
                          "category",
                        ),
                    )
                  }
                />
              ) : null}

              {appliedFilters.sizes.map(
                (
                  value,
                ) => (
                  <FilterPill
                    key={`size-${value}`}
                    label={`Size ${value}`}
                    onRemove={() =>
                      removeAppliedListValue(
                        "size",
                        value,
                      )
                    }
                  />
                ),
              )}

              {appliedFilters.colors.map(
                (
                  value,
                ) => (
                  <FilterPill
                    key={`color-${value}`}
                    label={
                      value
                    }
                    onRemove={() =>
                      removeAppliedListValue(
                        "color",
                        value,
                      )
                    }
                  />
                ),
              )}

              {appliedFilters.maxPrice ? (
                <FilterPill
                  label={`Up to ৳${Number(
                    appliedFilters.maxPrice,
                  ).toLocaleString(
                    "en-BD",
                  )}`}
                  onRemove={() =>
                    navigate(
                      (
                        params,
                      ) =>
                        params.delete(
                          "max",
                        ),
                    )
                  }
                />
              ) : null}

              {appliedFilters.onlyStock ? (
                <FilterPill
                  label="In stock"
                  onRemove={() =>
                    navigate(
                      (
                        params,
                      ) =>
                        params.delete(
                          "stock",
                        ),
                    )
                  }
                />
              ) : null}

              {appliedFilters.offersOnly ? (
                <FilterPill
                  label="Offers"
                  onRemove={() =>
                    navigate(
                      (
                        params,
                      ) =>
                        params.delete(
                          "offers",
                        ),
                    )
                  }
                />
              ) : null}

              <button
                type="button"
                className={styles.clearAll}
                onClick={
                  clearAllApplied
                }
              >
                Clear all
              </button>
            </div>
          ) : null}
        </div>
      </section>

      {/* ===================================================
          GROUPED CATEGORY SHOP
          =================================================== */}

      {showGroupedView ? (
        <section className={`container ${styles.categorySections}`}>
          {categorySections.map(
            (
              section,
              sectionIndex,
            ) => (
              <section
                key={
                  section.category.id
                }
                className={styles.categorySection}
              >
                <div className={styles.sectionHeading}>
                  <div>
                    <span>
                      {String(
                        sectionIndex +
                          1,
                      ).padStart(
                        2,
                        "0",
                      )}{" "}
                      / Collection
                    </span>

                    <h2>
                      {
                        section.category.name
                      }
                    </h2>

                    {section.category.description ? (
                      <p>
                        {
                          section.category.description
                        }
                      </p>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    className={styles.viewCategory}
                    onClick={() =>
                      applyCategory(
                        section.category.slug,
                      )
                    }
                  >
                    View All{" "}
                    {
                      section.products.length
                    }

                    <span>
                      ↗
                    </span>
                  </button>
                </div>

                <ProductGrid
                  products={
                    section.visible
                  }
                  compact={
                    gridMode ===
                    "compact"
                  }
                />
              </section>
            ),
          )}
        </section>
      ) : (
        /* =================================================
           FILTERED / SEARCH RESULTS
           ================================================= */

        <section className={`container ${styles.results}`}>
          <div className={styles.resultsHeading}>
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
              <ProductGrid
                products={
                  visibleProducts
                }
                compact={
                  gridMode ===
                  "compact"
                }
              />

              {visibleCount <
              filteredProducts.length ? (
                <div className={styles.loadMoreWrap}>
                  <button
                    type="button"
                    className={styles.loadMore}
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
            <div className={styles.empty}>
              <div>
                <Search
                  size={26}
                />
              </div>

              <span>
                No Match
              </span>

              <h2>
                No products found
              </h2>

              <p>
                Try another
                category, size,
                colour or price
                range.
              </p>

              <button
                type="button"
                onClick={
                  clearAllApplied
                }
              >
                View All Products
              </button>
            </div>
          )}
        </section>
      )}

      {/* ===================================================
          FILTER DRAWER
          =================================================== */}

      {filtersOpen ? (
        <div
          className={styles.filterOverlay}
          role="presentation"
          onMouseDown={() =>
            setFiltersOpen(
              false,
            )
          }
        >
          <aside
            className={styles.filterDrawer}
            role="dialog"
            aria-modal="true"
            aria-labelledby="shop-filter-title"
            onMouseDown={(
              event,
            ) =>
              event.stopPropagation()
            }
          >
            <header className={styles.filterHeader}>
              <div>
                <span>
                  Refine Your Shop
                </span>

                <h2
                  id="shop-filter-title"
                >
                  Filter Products
                </h2>

                <p>
                  {
                    draftResultCount
                  }{" "}
                  products match
                  your current
                  selection.
                </p>
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
                  size={18}
                />
              </button>
            </header>

            <div className={styles.filterBody}>
              {/* ===========================================
                  CATEGORY
                  =========================================== */}

              <FilterAccordion
                title="Category"
                value={
                  draftFilters.category ===
                  "all"
                    ? "All"
                    : categoryBySlug.get(
                        draftFilters.category,
                      )?.name ??
                      "Selected"
                }
                defaultOpen
              >
                <div className={styles.radioList}>
                  <RadioRow
                    checked={
                      draftFilters.category ===
                      "all"
                    }
                    label="All Categories"
                    onChange={() =>
                      setDraftFilters(
                        (
                          current,
                        ) => ({
                          ...current,

                          category:
                            "all",
                        }),
                      )
                    }
                  />

                  {categoryOptions.map(
                    (
                      option,
                    ) => (
                      <RadioRow
                        key={
                          option.category.id
                        }
                        checked={
                          draftFilters.category ===
                          option.category.slug
                        }
                        label={`${option.depth ? `${"— ".repeat(option.depth)}` : ""}${option.category.name}`}
                        onChange={() =>
                          setDraftFilters(
                            (
                              current,
                            ) => ({
                              ...current,

                              category:
                                option.category.slug,
                            }),
                          )
                        }
                      />
                    ),
                  )}
                </div>
              </FilterAccordion>

              {/* ===========================================
                  SIZE
                  =========================================== */}

              <FilterAccordion
                title="Size"
                value={
                  draftFilters.sizes.length
                    ? `${draftFilters.sizes.length} selected`
                    : "Any"
                }
              >
                <div className={styles.sizeGrid}>
                  {sizes.map(
                    (
                      value,
                    ) => {
                      const checked =
                        draftFilters.sizes.includes(
                          value,
                        );

                      return (
                        <label
                          key={
                            value
                          }
                          className={`${styles.sizeCheck} ${
                            checked
                              ? styles.sizeCheckActive
                              : ""
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={
                              checked
                            }
                            onChange={() =>
                              setDraftFilters(
                                (
                                  current,
                                ) => ({
                                  ...current,

                                  sizes:
                                    toggleValue(
                                      current.sizes,
                                      value,
                                    ),
                                }),
                              )
                            }
                          />

                          {
                            value
                          }
                        </label>
                      );
                    },
                  )}
                </div>
              </FilterAccordion>

              {/* ===========================================
                  COLOUR
                  =========================================== */}

              <FilterAccordion
                title="Colour"
                value={
                  draftFilters.colors.length
                    ? `${draftFilters.colors.length} selected`
                    : "Any"
                }
              >
                <div className={styles.checkList}>
                  {colors.map(
                    (
                      value,
                    ) => {
                      const checked =
                        draftFilters.colors.includes(
                          value,
                        );

                      return (
                        <label
                          key={
                            value
                          }
                          className={styles.checkRow}
                        >
                          <input
                            type="checkbox"
                            checked={
                              checked
                            }
                            onChange={() =>
                              setDraftFilters(
                                (
                                  current,
                                ) => ({
                                  ...current,

                                  colors:
                                    toggleValue(
                                      current.colors,
                                      value,
                                    ),
                                }),
                              )
                            }
                          />

                          <span className={styles.checkBox}>
                            {checked ? (
                              <Check
                                size={11}
                              />
                            ) : null}
                          </span>

                          <span
                            className={styles.colorDot}
                            style={{
                              background:
                                colorSwatches.get(
                                  value,
                                ) ??
                                value,
                            }}
                          />

                          <span className={styles.checkLabel}>
                            {
                              value
                            }
                          </span>
                        </label>
                      );
                    },
                  )}
                </div>
              </FilterAccordion>

              {/* ===========================================
                  PRICE
                  =========================================== */}

              <FilterAccordion
                title="Price"
                value={
                  draftFilters.maxPrice
                    ? `Up to ৳${Number(
                        draftFilters.maxPrice,
                      ).toLocaleString(
                        "en-BD",
                      )}`
                    : "Any"
                }
              >
                <div className={styles.pricePresets}>
                  {PRICE_PRESETS.map(
                    (
                      preset,
                    ) => (
                      <button
                        key={
                          preset.label
                        }
                        type="button"
                        className={
                          draftFilters.maxPrice ===
                          preset.value
                            ? styles.pricePresetActive
                            : ""
                        }
                        onClick={() =>
                          setDraftFilters(
                            (
                              current,
                            ) => ({
                              ...current,

                              maxPrice:
                                preset.value,
                            }),
                          )
                        }
                      >
                        {
                          preset.label
                        }
                      </button>
                    ),
                  )}
                </div>

                <label className={styles.customPrice}>
                  <span>
                    Custom maximum
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
                        draftFilters.maxPrice
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
                        setDraftFilters(
                          (
                            current,
                          ) => ({
                            ...current,

                            maxPrice:
                              event.target
                                .value,
                          }),
                        )
                      }
                    />
                  </div>
                </label>
              </FilterAccordion>

              {/* ===========================================
                  AVAILABILITY
                  =========================================== */}

              <FilterAccordion
                title="Availability & Offers"
                value={
                  draftFilters.onlyStock ||
                  draftFilters.offersOnly
                    ? "Filtered"
                    : "Any"
                }
                defaultOpen
              >
                <div className={styles.checkList}>
                  <CheckRow
                    checked={
                      draftFilters.onlyStock
                    }
                    label="In stock only"
                    description="Hide products that are currently sold out."
                    onChange={() =>
                      setDraftFilters(
                        (
                          current,
                        ) => ({
                          ...current,

                          onlyStock:
                            !current.onlyStock,
                        }),
                      )
                    }
                  />

                  <CheckRow
                    checked={
                      draftFilters.offersOnly
                    }
                    label="Discounted / offers"
                    description="Show products with an active reduced price."
                    onChange={() =>
                      setDraftFilters(
                        (
                          current,
                        ) => ({
                          ...current,

                          offersOnly:
                            !current.offersOnly,
                        }),
                      )
                    }
                  />
                </div>

                <div className={styles.bdCheckoutNote}>
                  Cash on Delivery
                  and bKash options
                  are available at
                  checkout according
                  to store settings.
                </div>
              </FilterAccordion>
            </div>

            {/* =============================================
                FILTER FOOTER
                ============================================= */}

            <footer className={styles.filterFooter}>
              <button
                type="button"
                className={styles.resetButton}
                onClick={
                  resetDraftFilters
                }
              >
                Reset
              </button>

              <button
                type="button"
                className={styles.showProductsButton}
                onClick={
                  showProducts
                }
              >
                Show{" "}
                {
                  draftResultCount
                }{" "}
                Products
              </button>
            </footer>
          </aside>
        </div>
      ) : null}
    </>
  );
}

/* =========================================================
   PRODUCT GRID
   ========================================================= */

function ProductGrid({
  products,
  compact,
}: {
  products:
    Product[];

  compact:
    boolean;
}) {
  return (
    <div
      className={`${styles.productGrid} ${
        compact
          ? styles.productGridCompact
          : ""
      }`}
    >
      {products.map(
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
  );
}

/* =========================================================
   FILTER PILL
   ========================================================= */

function FilterPill({
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
      className={styles.filterPill}
      onClick={
        onRemove
      }
    >
      {
        label
      }

      <X
        size={11}
      />
    </button>
  );
}

/* =========================================================
   FILTER ACCORDION
   ========================================================= */

function FilterAccordion({
  title,
  value,
  defaultOpen = false,
  children,
}: {
  title:
    string;

  value:
    string;

  defaultOpen?:
    boolean;

  children:
    ReactNode;
}) {
  const [
    open,
    setOpen,
  ] =
    useState(
      defaultOpen,
    );

  return (
    <section className={styles.filterAccordion}>
      <button
        type="button"
        className={styles.filterAccordionButton}
        aria-expanded={
          open
        }
        onClick={() =>
          setOpen(
            (
              current,
            ) =>
              !current,
          )
        }
      >
        <span>
          <strong>
            {
              title
            }
          </strong>

          <small>
            {
              value
            }
          </small>
        </span>

        <ChevronDown
          size={16}
          className={
            open
              ? styles.chevronOpen
              : ""
          }
        />
      </button>

      {open ? (
        <div className={styles.filterAccordionContent}>
          {
            children
          }
        </div>
      ) : null}
    </section>
  );
}

/* =========================================================
   RADIO ROW
   ========================================================= */

function RadioRow({
  checked,
  label,
  onChange,
}: {
  checked:
    boolean;

  label:
    string;

  onChange:
    () => void;
}) {
  return (
    <label className={styles.radioRow}>
      <input
        type="radio"
        checked={
          checked
        }
        onChange={
          onChange
        }
      />

      <span className={styles.radioCircle}>
        {checked ? (
          <span />
        ) : null}
      </span>

      <span>
        {
          label
        }
      </span>
    </label>
  );
}

/* =========================================================
   SIMPLE COLOUR CHECK ROW
   ========================================================= */

function CheckRow({
  checked,
  label,
  description,
  onChange,
}: {
  checked:
    boolean;

  label:
    string;

  description:
    string;

  onChange:
    () => void;
}) {
  return (
    <label className={styles.checkRow}>
      <input
        type="checkbox"
        checked={
          checked
        }
        onChange={
          onChange
        }
      />

      <span className={styles.checkBox}>
        {checked ? (
          <Check
            size={11}
          />
        ) : null}
      </span>

      <span className={styles.checkText}>
        <strong>
          {
            label
          }
        </strong>

        <small>
          {
            description
          }
        </small>
      </span>
    </label>
  );
}