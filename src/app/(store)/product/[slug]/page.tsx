import type {
  Metadata,
} from "next";

import Link from "next/link";

import {
  notFound,
} from "next/navigation";

import {
  ProductCard,
} from "@/components/product/product-card";

import {
  ProductDetail,
} from "@/components/product/product-detail";

import {
  Section,
} from "@/components/home/section";

import {
  getProduct,
  getProducts,
} from "@/lib/catalog";

import {
  serializePublicSizeChart,
} from "@/lib/size-charts";

export const dynamic =
  "force-dynamic";

/* =========================================================
   METADATA
   ========================================================= */

export async function generateMetadata({
  params,
}: {
  params:
    Promise<{
      slug: string;
    }>;
}): Promise<Metadata> {
  const {
    slug,
  } =
    await params;

  const result =
    await getProduct(
      slug,
    );

  if (!result) {
    return {
      title:
        "Product | Game On Garb",
    };
  }

  const {
    product,
    raw,
  } =
    result;

  const description =
    raw.seoDescription ??
    raw.shortDescription ??
    raw.description ??
    undefined;

  return {
    title:
      raw.seoTitle ??
      `${product.name} | Game On Garb`,

    description,

    openGraph: {
      title:
        raw.seoTitle ??
        product.name,

      description,

      images:
        product.image
          ? [
              {
                url:
                  product.image,

                alt:
                  product.alt,
              },
            ]
          : undefined,
    },
  };
}

/* =========================================================
   PRODUCT PAGE
   ========================================================= */

export default async function ProductPage({
  params,
}: {
  params:
    Promise<{
      slug: string;
    }>;
}) {
  const {
    slug,
  } =
    await params;

  const [
    result,
    allProducts,
  ] =
    await Promise.all([
      getProduct(
        slug,
      ),

      getProducts({
        take:
          20,
      }),
    ]);

  if (!result) {
    notFound();
  }

  const {
    product,
    raw,
  } =
    result;

  /* =======================================================
     SIZE CHART
     ======================================================= */

  const sizeChart =
    raw.sizeChart &&
    raw.sizeChart.active
      ? serializePublicSizeChart(
          raw.sizeChart,
        )
      : null;

  /* =======================================================
     RELATED PRODUCTS
     ======================================================= */

  /*
   * Prioritize products from the same category.
   *
   * If fewer than four exist, fill the remaining positions
   * with other products.
   */
  const sameCategory =
    allProducts.filter(
      (
        item,
      ) =>
        item.id !==
          product.id &&
        item.category ===
          product.category,
    );

  const otherProducts =
    allProducts.filter(
      (
        item,
      ) =>
        item.id !==
          product.id &&
        item.category !==
          product.category,
    );

  const related = [
    ...sameCategory,
    ...otherProducts,
  ].slice(
    0,
    4,
  );

  /* =======================================================
     AVAILABLE VARIANTS
     ======================================================= */

  const availableVariants =
    product.variants?.filter(
      (
        variant,
      ) =>
        variant.stock >
        0,
    ) ??
    [];

  const availablePrices =
    availableVariants.map(
      (
        variant,
      ) =>
        variant.price,
    );

  const lowPrice =
    availablePrices.length >
    0
      ? Math.min(
          ...availablePrices,
        )
      : product.price;

  const highPrice =
    availablePrices.length >
    0
      ? Math.max(
          ...availablePrices,
        )
      : product.price;

  /* =======================================================
     PRODUCT STRUCTURED DATA
     ======================================================= */

  const productSchema = {
    "@context":
      "https://schema.org",

    "@type":
      "Product",

    name:
      product.name,

    image:
      product.images.length >
      0
        ? product.images.map(
            (
              image,
            ) =>
              image.url,
          )
        : [
            product.image,
          ],

    description:
      raw.shortDescription ??
      raw.description ??
      undefined,

    sku:
      product.variants?.[0]
        ?.sku,

    brand: {
      "@type":
        "Brand",

      name:
        raw.brand ??
        "Game On Garb",
    },

    ...(product.reviewCount &&
    product.reviewCount >
      0 &&
    product.rating
      ? {
          aggregateRating: {
            "@type":
              "AggregateRating",

            ratingValue:
              product.rating,

            reviewCount:
              product.reviewCount,
          },
        }
      : {}),

    offers:
      availableVariants.length >
      1
        ? {
            "@type":
              "AggregateOffer",

            priceCurrency:
              "BDT",

            lowPrice,

            highPrice,

            offerCount:
              availableVariants.length,

            availability:
              product.stock >
              0
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
          }
        : {
            "@type":
              "Offer",

            priceCurrency:
              "BDT",

            price:
              lowPrice,

            availability:
              product.stock >
              0
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
          },
  };

  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <>
      {/* ===================================================
          MAIN PRODUCT DETAILS
          =================================================== */}

      <ProductDetail
        key={
          product.id
        }
        product={
          product
        }
        shortDescription={
          raw.shortDescription ??
          undefined
        }
        description={
          raw.description ??
          undefined
        }
        sizeChart={
          sizeChart
        }
      />

      {/* ===================================================
          RELATED PRODUCTS
          =================================================== */}

      {related.length >
      0 ? (
        <Section
          eyebrow="Recommended"
          title="You May Also Like"
          action={
            <Link
              href="/shop"
              className="home-view-all"
            >
              View All

              <span
                aria-hidden="true"
              >
                ↗
              </span>
            </Link>
          }
        >
          <div className="grid-products">
            {related.map(
              (
                item,
              ) => (
                <ProductCard
                  key={
                    item.id
                  }
                  product={
                    item
                  }
                />
              ),
            )}
          </div>
        </Section>
      ) : null}

      {/* ===================================================
          PRODUCT SEO
          =================================================== */}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html:
            JSON.stringify(
              productSchema,
            ),
        }}
      />
    </>
  );
}