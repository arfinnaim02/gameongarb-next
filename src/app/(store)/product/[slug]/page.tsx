import type {
  Metadata,
} from "next";

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
        "Product",
    };
  }

  return {
    title:
      result.raw
        .seoTitle ??
      result.product
        .name,

    description:
      result.raw
        .seoDescription ??
      result.raw
        .shortDescription ??
      undefined,
  };
}

/* =========================================================
   PAGE
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
        take: 16,
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
     RELATED PRODUCTS
     ======================================================= */

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
     STRUCTURED DATA
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

  return (
    <>
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
          raw.sizeChart
            ? serializePublicSizeChart(
                raw.sizeChart,
              )
            : null
        }
      />

      {related.length >
      0 ? (
        <Section
          title="You May Also Like"
          link="/shop"
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

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html:
            JSON.stringify({
              "@context":
                "https://schema.org",

              "@type":
                "Product",

              name:
                product.name,

              image:
                product.images.map(
                  (
                    image,
                  ) =>
                    image.url,
                ),

              description:
                raw.shortDescription ??
                raw.description ??
                undefined,

              sku:
                product.variants?.[0]
                  ?.sku,

              offers: {
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
              },
            }),
        }}
      />
    </>
  );
}