import Link from "next/link";

import {
  PackageCheck,
  RefreshCw,
  Truck,
} from "lucide-react";

import { HeroSlider } from "@/components/home/hero-slider";
import { HomeProductRail } from "@/components/home/home-product-rail";
import { PromotionPopup } from "@/components/home/promotion-popup";
import { Section } from "@/components/home/section";

import {
  getCategoryTree,
  getProducts,
} from "@/lib/catalog";

import { db } from "@/lib/db";

export const dynamic =
  "force-dynamic";

export default async function Home() {
  const [
    sections,
    products,
    categories,
    promotionSetting,
  ] = await Promise.all([
    db.homepageSection.findMany({
      where: {
        enabled: true,
      },

      orderBy: {
        sortOrder: "asc",
      },

      include: {
        slides: {
          where: {
            enabled: true,
          },

          orderBy: {
            sortOrder: "asc",
          },
        },
      },
    }),

    getProducts(),

    getCategoryTree({
      homepageOnly: true,
    }),

    db.storeSetting.findUnique({
      where: {
        key:
          "homepage_promotion_popup",
      },
    }),
  ]);

    const promotionValue =
    promotionSetting?.value &&
    typeof promotionSetting.value ===
      "object" &&
    !Array.isArray(
      promotionSetting.value,
    )
      ? promotionSetting.value as Record<
          string,
          unknown
        >
      : null;

  const promotionPopup = {
    enabled:
      promotionValue?.enabled ===
      true,

    image:
      typeof promotionValue?.image ===
      "string"
        ? promotionValue.image
        : null,

    redirectLink:
      typeof promotionValue?.redirectLink ===
      "string"
        ? promotionValue.redirectLink
        : "/shop",

    delayMs:
      typeof promotionValue?.delayMs ===
        "number"
        ? promotionValue.delayMs
        : 1400,
  };

  const rendered =
    sections.map((section) => {
      const props = {
        section,
        products,
        categories,
      };

      switch (section.type) {
        case "HERO":
          return (
            <Hero
              key={section.id}
              {...props}
            />
          );

        case "NEW_ARRIVALS":
          return (
            <ProductsSection
              key={section.id}
              title={
                section.heading ??
                "New Arrivals"
              }
              products={configuredProducts(
                section,

                products.filter(
                  (product) =>
                    product.badge ===
                      "NEW" ||
                    product.badge ===
                      "FEATURED",
                ),

                products,
              ).slice(0, 12)}
              link="/shop?sort=newest"
              direction="right-to-left"
            />
          );

        case "SPORTS":
          return (
            <Campaign
              key={section.id}
              eyebrow="Sports"
              title={
                section.heading ??
                "Built to move."
              }
              subtitle={
                section.subtitle ??
                "Performance for every day."
              }
              link={
                section.ctaLink ??
                "/shop?category=sports"
              }
              cta={
                section.ctaLabel ??
                "Explore Sports"
              }
              image={
                section.image
              }
              mobileImage={
                section.mobileImage
              }
            />
          );

                case "POLO":
          return (
            <Campaign
              key={section.id}
              eyebrow="Polo"
              title={
                section.heading ??
                "Made for every day."
              }
              subtitle={
                section.subtitle ??
                "Polished, relaxed and ready."
              }
              link={
                section.ctaLink ??
                "/shop?category=polo"
              }
              cta={
                section.ctaLabel ??
                "Explore Polo"
              }
              image={
                section.image
              }
              mobileImage={
                section.mobileImage
              }
              light
            />
          );

        case "CATEGORIES":
          return (
            <CategoriesSection
              key={section.id}
              heading={
                section.heading ??
                "Shop by Category"
              }
              categories={configuredCategories(
                section,
                categories,
              ).slice(0, 4)}
            />
          );

        case "TRENDING":
          return (
            <ProductsSection
              key={section.id}
              title={
                section.heading ??
                "Trending Now"
              }
              products={configuredProducts(
                section,

                products.filter(
                  (product) =>
                    product.stock > 0,
                ),

                products,
              ).slice(0, 12)}
              link="/shop?sort=featured"
              direction="left-to-right"
            />
          );

        case "BRAND_STORY":
          return (
            <BrandStory
              key={section.id}
              heading={
                section.heading
              }
              subtitle={
                section.subtitle
              }
              cta={
                section.ctaLabel
              }
              link={
                section.ctaLink
              }
              image={
                section.image
              }
            />
          );

        default:
          return null;
      }
    });

  const homepageContent:
    React.ReactNode[] = [];

  for (
    let index = 0;
    index < sections.length;
    index += 1
  ) {
    const current =
      sections[index];

    const next =
      sections[index + 1];

    const currentIsCampaign =
      current.type === "SPORTS" ||
      current.type === "POLO";

    const nextIsCampaign =
      next?.type === "SPORTS" ||
      next?.type === "POLO";

    if (
      currentIsCampaign &&
      nextIsCampaign
    ) {
      homepageContent.push(
        <div
          key={`campaign-pair-${current.id}-${next.id}`}
          className="container home-campaign-pair"
        >
          {rendered[index]}

          {rendered[index + 1]}
        </div>,
      );

      index += 1;

      continue;
    }

    homepageContent.push(
      rendered[index],
    );
  }

  return (
    <div className="home-page">
      {homepageContent.length >
      0 ? (
        homepageContent
      ) : (
        <EmptyHomepage />
      )}
    </div>
  );
}

/* =========================================================
   TYPES
   ========================================================= */

type HomeSection =
  Awaited<
    ReturnType<
      typeof db.homepageSection.findMany
    >
  >[number] & {
  slides: {
    id: string;
    title: string;
    subtitle: string | null;
    image: string;
    mobileImage: string | null;
    ctaLabel: string | null;
    ctaLink: string | null;
  }[];
  };

type StoreProduct =
  Awaited<
    ReturnType<
      typeof getProducts
    >
  >[number];

type CategoryTree =
  Awaited<
    ReturnType<
      typeof getCategoryTree
    >
  >;

/* =========================================================
   HOMEPAGE CONFIG
   ========================================================= */

function configIds(
  section: HomeSection,

  key:
    | "productIds"
    | "categoryIds",
) {
  if (
    !section.config ||
    typeof section.config !==
      "object" ||
    Array.isArray(
      section.config,
    )
  ) {
    return [];
  }

  const value =
    (
      section.config as Record<
        string,
        unknown
      >
    )[key];

  return Array.isArray(value)
    ? value.filter(
        (
          id,
        ): id is string =>
          typeof id ===
          "string",
      )
    : [];
}

function configuredProducts(
  section: HomeSection,
  fallback: StoreProduct[],
  all: StoreProduct[],
) {
  const ids =
    configIds(
      section,
      "productIds",
    );

  if (!ids.length) {
    return fallback;
  }

  const byId =
    new Map(
      all.map((product) => [
        product.id,
        product,
      ]),
    );

  return ids
    .map((id) =>
      byId.get(id),
    )
    .filter(
      (
        product,
      ): product is StoreProduct =>
        Boolean(product),
    );
}

function configuredCategories(
  section: HomeSection,
  fallback: CategoryTree,
) {
  const ids =
    configIds(
      section,
      "categoryIds",
    );

  if (!ids.length) {
    return fallback;
  }

  const byId =
    new Map(
      fallback.map(
        (category) => [
          category.id,
          category,
        ],
      ),
    );

  return ids
    .map((id) =>
      byId.get(id),
    )
    .filter(
      (
        category,
      ): category is CategoryTree[number] =>
        Boolean(category),
    );
}

/* =========================================================
   HERO
   ========================================================= */

function Hero({
  section,
}: {
  section: HomeSection;

  products: StoreProduct[];

  categories: CategoryTree;
}) {
  const firstSlide =
    section.slides[0];

  return (
    <>
      <HeroSlider
        slides={
          section.slides
        }
        fallback={{
          title:
            firstSlide?.title ??
            section.heading ??
            "Game on. Every day.",

          subtitle:
            firstSlide?.subtitle ??
            section.subtitle ??
            "Sports. Style. Everything between.",

          image:
            firstSlide?.image ??
            section.image ??
            "/images/campaigns/hero.svg",

          ctaLabel:
            firstSlide?.ctaLabel ??
            section.ctaLabel ??
            "Shop New Arrivals",

          ctaLink:
            firstSlide?.ctaLink ??
            section.ctaLink ??
            "/shop",
        }}
      />

      <TrustStrip />
    </>
  );
}

/* =========================================================
   TRUST STRIP
   ========================================================= */

function TrustStrip() {
  const items = [
    {
      icon: Truck,
      title:
        "Home Delivery",
      subtitle:
        "Across Bangladesh",
    },

    {
      icon: RefreshCw,
      title:
        "Easy Exchange",
      subtitle:
        "Hassle-free process",
    },

    {
      icon: PackageCheck,
      title:
        "100% Original",
      subtitle:
        "Quality you can trust",
    },
  ];

  return (
    <section className="home-trust-strip">
      <div className="container home-trust-grid">
        {items.map(
          ({
            icon: Icon,
            title,
            subtitle,
          }) => (
            <div
              key={title}
              className="home-trust-item"
            >
              <span className="home-trust-icon">
                <Icon
                  size={22}
                  strokeWidth={1.7}
                />
              </span>

              <div>
                <b>
                  {title}
                </b>

                <small>
                  {subtitle}
                </small>
              </div>
            </div>
          ),
        )}
      </div>
    </section>
  );
}

/* =========================================================
   PRODUCT SECTIONS
   ========================================================= */

function ProductsSection({
  title,
  products,
  link,
  direction,
}: {
  title: string;

  products: StoreProduct[];

  link: string;

  direction:
    | "right-to-left"
    | "left-to-right";
}) {
  return (
    <Section
      title={title}
      action={
        <Link
          href={link}
          className="home-view-all"
        >
          View All

          <span aria-hidden="true">
            ↗
          </span>
        </Link>
      }
    >
      <HomeProductRail
        products={products}
        direction={direction}
        label={title}
      />
    </Section>
  );
}

/* =========================================================
   CAMPAIGNS
   ========================================================= */
function Campaign({
  eyebrow,
  title,
  subtitle,
  link,
  cta,
  image,
  mobileImage,
  light = false,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  link: string;
  cta: string;

  image:
    | string
    | null;

  mobileImage:
    | string
    | null;

  light?: boolean;
}) {
  const desktopBackground =
    image
      ? `url("${image}")`
      : "none";

  /*
   * Mobile uses its own image when
   * available. Otherwise it safely
   * falls back to the desktop image.
   */
  const mobileBackground =
    mobileImage
      ? `url("${mobileImage}")`
      : desktopBackground;

  return (
    <section className="home-campaign-section">
      <div
        className={`home-campaign-card ${
          light
            ? "is-light"
            : ""
        }`}
        style={
          {
            "--campaign-image-desktop":
              desktopBackground,

            "--campaign-image-mobile":
              mobileBackground,
          } as React.CSSProperties
        }
      >
        <div className="home-campaign-copy">
          <div className="eyebrow">
            {eyebrow}
          </div>

          <h2 className="display home-campaign-title">
            {title}
          </h2>

          <p>
            {subtitle}
          </p>

          <Link
            href={link}
            className="btn btn-outline home-campaign-cta"
          >
            {cta}

            <span aria-hidden="true">
              →
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
/* =========================================================
   CATEGORIES
   ========================================================= */

function CategoriesSection({
  heading,
  categories,
}: {
  heading: string;
  categories: CategoryTree;
}) {
  return (
    <Section
      title={heading}
      action={
        <Link
          href="/categories"
          className="home-view-all"
        >
          View All

          <span aria-hidden="true">
            ↗
          </span>
        </Link>
      }
    >
      <div className="home-categories">
        {categories.map(
          (
            category,
            index,
          ) => (
            <Link
              key={
                category.id
              }
              href={`/shop?category=${category.slug}`}
              className="premium-category-card"
              style={
                {
                  "--category-image":
                    category.image
                      ? `url("${category.image}")`
                      : index %
                            2 ===
                          1
                        ? "linear-gradient(140deg,#5f4a3a,#171919)"
                        : "linear-gradient(140deg,#2c302f,#101212)",
                } as React.CSSProperties
              }
            >
              <span>
                {
                  category.name
                }

                <b aria-hidden="true">
                  →
                </b>
              </span>
            </Link>
          ),
        )}
      </div>
    </Section>
  );
}

/* =========================================================
   BRAND STORY
   ========================================================= */

function BrandStory({
  heading,
  subtitle,
  cta,
  link,
  image,
}: {
  heading:
    | string
    | null;

  subtitle:
    | string
    | null;

  cta:
    | string
    | null;

  link:
    | string
    | null;

  image:
    | string
    | null;
}) {
  return (
    <section
      className="home-brand-story"
      style={
        {
          "--brand-story-image":
            image
              ? `url("${image}")`
              : "none",
        } as React.CSSProperties
      }
    >
      <div className="container home-brand-story-inner">
        <div className="home-brand-story-copy">
          <div className="eyebrow">
            Game On Garb
          </div>

          <h2 className="display">
            {heading ??
              "Experience the thrill."}
          </h2>

          <p>
            {subtitle ??
              "More than what you wear. It’s a movement. It’s a mindset."}
          </p>

          <Link
            href={
              link ??
              "/about"
            }
            className="btn btn-outline"
          >
            {cta ??
              "Our Story"}

            <span aria-hidden="true">
              →
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   EMPTY HOMEPAGE
   ========================================================= */

function EmptyHomepage() {
  return (
    <section className="home-empty">
      <div className="container">
        <h1>
          Homepage is being
          prepared
        </h1>

        <p className="muted">
          Enable sections from
          Admin → Homepage Builder.
        </p>
      </div>
    </section>
  );
}