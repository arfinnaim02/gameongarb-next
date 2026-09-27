import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProduct, getProducts } from "@/lib/catalog";
import { ProductDetail } from "@/components/product/product-detail";
import { ProductCard } from "@/components/product/product-card";
import { Section } from "@/components/home/section";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = await getProduct(slug);
  return {
    title: result?.raw.seoTitle ?? result?.product.name ?? "Product",
    description:
      result?.raw.seoDescription ?? result?.raw.shortDescription ?? undefined,
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [result, allProducts] = await Promise.all([
    getProduct(slug),
    getProducts({ take: 8 }),
  ]);
  if (!result) notFound();
  const { product, raw } = result;
  const related = allProducts.filter((x) => x.id !== product.id).slice(0, 4);
  return (
    <>
      <ProductDetail
        product={product}
        description={raw.description ?? raw.shortDescription ?? undefined}
      />
      <Section title="You May Also Like">
        <div className="grid-products">
          {related.map((x) => (
            <ProductCard key={x.id} product={x} />
          ))}
        </div>
      </Section>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: product.name,
            image: product.image,
            description: raw.shortDescription,
            offers: {
              "@type": "Offer",
              priceCurrency: "BDT",
              price: product.price,
              availability: product.stock
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
            },
          }),
        }}
      />
    </>
  );
}
