import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  db,
} from "@/lib/db";

export const dynamic =
  "force-dynamic";

/* =========================================================
   SEARCH HELPERS
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

/* =========================================================
   GET
   ========================================================= */

export async function GET(
  request:
    NextRequest,
) {
  const query =
    request.nextUrl
      .searchParams
      .get(
        "q",
      )
      ?.trim()
      .slice(
        0,
        60,
      ) ??
    "";

  if (
    query.length <
    1
  ) {
    return NextResponse.json({
      products: [],
      categories: [],
    });
  }

  /*
   * Fetch a controlled candidate set.
   *
   * This keeps the global header search
   * lightweight while still allowing
   * fuzzy matching.
   */
  const [
    products,
    categories,
  ] =
    await Promise.all([
      db.product.findMany({
        where: {
          status:
            "ACTIVE",
        },

        orderBy: [
          {
            featured:
              "desc",
          },

          {
            createdAt:
              "desc",
          },
        ],

        take: 120,

        select: {
          id:
            true,

          slug:
            true,

          name:
            true,

          regularPrice:
            true,

          salePrice:
            true,

          featured:
            true,

          images: {
            orderBy: {
              sortOrder:
                "asc",
            },

            take: 1,

            select: {
              url:
                true,

              alt:
                true,
            },
          },

          variants: {
            where: {
              active:
                true,
            },

            select: {
              sku:
                true,

              size:
                true,

              color:
                true,

              stock:
                true,

              priceOverride:
                true,
            },
          },

          categories: {
            include: {
              category: {
                select: {
                  name:
                    true,
                },
              },
            },
          },
        },
      }),

      db.category.findMany({
        where: {
          active:
            true,
        },

        orderBy: [
          {
            sortOrder:
              "asc",
          },

          {
            name:
              "asc",
          },
        ],

        select: {
          id:
            true,

          name:
            true,

          slug:
            true,

          description:
            true,

          sortOrder:
            true,
        },
      }),
    ]);

  const rankedProducts =
    products
      .map(
        (
          product,
        ) => {
          const categoryNames =
            product.categories.map(
              (
                item,
              ) =>
                item.category
                  .name,
            );

          const score =
            searchScore(
              query,
              [
                product.name,

                ...categoryNames,

                ...product.variants.flatMap(
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

          const stock =
            product.variants.reduce(
              (
                total,
                variant,
              ) =>
                total +
                variant.stock,

              0,
            );

          const availablePrices =
            product.variants
              .filter(
                (
                  variant,
                ) =>
                  variant.stock >
                  0,
              )
              .map(
                (
                  variant,
                ) =>
                  Number(
                    variant.priceOverride ??
                      product.salePrice ??
                      product.regularPrice,
                  ),
              );

          const price =
            availablePrices.length >
            0
              ? Math.min(
                  ...availablePrices,
                )
              : Number(
                  product.salePrice ??
                    product.regularPrice,
                );

          return {
            id:
              product.id,

            slug:
              product.slug,

            name:
              product.name,

            category:
              categoryNames[0] ??
              "Lifestyle",

            image:
              product.images[0]
                ?.url ??
              "/images/products/tshirt.svg",

            price,

            stock,

            featured:
              product.featured,

            score,
          };
        },
      )
      .filter(
        (
          product,
        ) =>
          product.score >
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
            second.stock >
              0,
          ) -
            Number(
              first.stock >
                0,
            ) ||
          Number(
            second.featured,
          ) -
            Number(
              first.featured,
            ),
      )
      .slice(
        0,
        5,
      )
      .map(
        ({
          featured: _featured,
          score: _score,
          ...product
        }) =>
          product,
      );

  const rankedCategories =
    categories
      .map(
        (
          category,
        ) => ({
          id:
            category.id,

          name:
            category.name,

          slug:
            category.slug,

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
          category,
        ) =>
          category.score >
          0,
      )
      .sort(
        (
          first,
          second,
        ) =>
          second.score -
          first.score,
      )
      .slice(
        0,
        4,
      )
      .map(
        ({
          score: _score,
          ...category
        }) =>
          category,
      );

  return NextResponse.json({
    products:
      rankedProducts,

    categories:
      rankedCategories,
  });
}