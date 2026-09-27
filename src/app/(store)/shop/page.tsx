import type {
  Metadata,
} from "next";

import {
  Suspense,
} from "react";

import {
  ShopClient,
} from "@/components/shop/shop-client";

import {
  ShopHeroSlider,
} from "@/components/shop/shop-hero-slider";

import {
  getProducts,
} from "@/lib/catalog";

import {
  db,
} from "@/lib/db";

export const metadata: Metadata = {
  title: "Shop",

  description:
    "Shop premium Game On Garb sports and lifestyle fashion.",
};

export const dynamic =
  "force-dynamic";

export default async function ShopPage() {
  const [
    products,
    categories,
    productCategoryRows,
    shopHeroSlides,
    otherSetting,
  ] = await Promise.all([
    getProducts(),

    db.category.findMany({
      where: {
        active: true,
      },

      orderBy: [
        {
          sortOrder: "asc",
        },
        {
          name: "asc",
        },
      ],

      select: {
        id: true,
        name: true,
        slug: true,
        parentId: true,
        sortOrder: true,
      },
    }),

    db.productCategory.findMany({
      select: {
        productId: true,
        categoryId: true,
      },
    }),

    db.shopHeroSlide.findMany({
      where: {
        enabled: true,
      },

      orderBy: [
        {
          sortOrder: "asc",
        },
        {
          createdAt: "asc",
        },
      ],

      select: {
        id: true,
        title: true,
        subtitle: true,
        image: true,
        mobileImage: true,
        ctaLabel: true,
        ctaLink: true,
        enabled: true,
        sortOrder: true,
      },
    }),

    db.storeSetting.findUnique({
      where: {
        key: "other",
      },
    }),
  ]);

  const other =
    (otherSetting?.value ??
      {}) as {
      itemsPerPage?: number;
    };

  const productCategoryMap =
    productCategoryRows.reduce<
      Record<
        string,
        string[]
      >
    >(
      (
        map,
        row,
      ) => {
        if (
          !map[
            row.productId
          ]
        ) {
          map[
            row.productId
          ] = [];
        }

        map[
          row.productId
        ].push(
          row.categoryId,
        );

        return map;
      },
      {},
    );

  return (
    <main className="premium-shop-page">
      <ShopHeroSlider
        slides={
          shopHeroSlides
        }
      />

      <Suspense
        fallback={
          <ShopSkeleton />
        }
      >
        <ShopClient
          products={
            products
          }

          categories={
            categories
          }

          productCategoryMap={
            productCategoryMap
          }

          itemsPerPage={
            other.itemsPerPage ??
            12
          }
        />
      </Suspense>
    </main>
  );
}

function ShopSkeleton() {
  return (
    <section className="container premium-shop-loading">
      <div className="premium-shop-loading-bar skeleton" />

      <div className="premium-shop-loading-grid">
        {Array.from({
          length: 8,
        }).map(
          (
            _,
            index,
          ) => (
            <div
              key={
                index
              }
              className="premium-shop-loading-card"
            >
              <div className="premium-shop-loading-image skeleton" />

              <div className="premium-shop-loading-line skeleton" />

              <div className="premium-shop-loading-line is-short skeleton" />
            </div>
          ),
        )}
      </div>
    </section>
  );
}