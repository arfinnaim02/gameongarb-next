import type {
  Metadata,
} from "next";

import Link from "next/link";

import {
  notFound,
} from "next/navigation";

import {
  HomeProductRail,
} from "@/components/home/home-product-rail";

import {
  Section,
} from "@/components/home/section";

import {
  ProductDetail,
} from "@/components/product/product-detail";

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

      /*
       * Fetch enough products to build
       * a meaningful recommendation rail.
       */
      getProducts({
        take:
          24,
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
   * Recommendation priority:
   *
   * 1. Products from the same category.
   * 2. Other active products.
   * 3. Never include the current product.
   *
   * Eight items gives the carousel
   * enough content for a smooth loop
   * without making the query excessive.
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
    8,
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
          PRODUCT RECOMMENDATIONS
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
          <HomeProductRail
            products={
              related
            }
            direction="right-to-left"
            label="You May Also Like"
          />
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