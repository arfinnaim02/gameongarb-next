import Link from "next/link";

import {
  ArrowRight,
  Grid2X2,
  Images,
  Layers3,
  LayoutGrid,
  Shirt,
  Sparkles,
  Trophy,
} from "lucide-react";

export const dynamic =
  "force-dynamic";

const sections = [
  {
    title: "Hero Slides",
    description:
      "Manage desktop and mobile hero banners, campaign text, CTA links, visibility and slide order.",
    href: "/admin/homepage/hero",
    icon: Images,
    ready: true,
  },

  {
    title: "New Arrivals",
    description:
      "Control the products, heading, content and visibility of the New Arrivals section.",
    href: "/admin/homepage/new-arrivals",
    icon: Sparkles,
    ready: false,
  },

  {
    title: "Sports",
    description:
      "Manage the Sports campaign section, campaign image, CTA and assigned products.",
    href: "/admin/homepage/sports",
    icon: Trophy,
    ready: false,
  },

  {
    title: "Polo",
    description:
      "Manage the Polo campaign section, image, text, CTA and product assignment.",
    href: "/admin/homepage/polo",
    icon: Shirt,
    ready: false,
  },

  {
    title: "Categories",
    description:
      "Choose homepage categories, control images and manage their display order.",
    href: "/admin/homepage/categories",
    icon: Grid2X2,
    ready: false,
  },

  {
    title: "Trending Now",
    description:
      "Select trending products and manage section heading, visibility and order.",
    href: "/admin/homepage/trending",
    icon: LayoutGrid,
    ready: false,
  },

  {
    title: "Brand Story",
    description:
      "Manage the final brand campaign section, image, copy and call-to-action.",
    href: "/admin/homepage/brand-story",
    icon: Layers3,
    ready: false,
  },
];

export default function HomepageBuilderPage() {
  return (
    <div className="homepage-admin">
      <div className="homepage-admin-heading">
        <div>
          <span className="homepage-admin-eyebrow">
            Appearance
          </span>

          <h1>
            Homepage Builder
          </h1>

          <p>
            Control the main
            storefront homepage
            without editing code.
          </p>
        </div>

        <Link
          href="/"
          target="_blank"
          className="homepage-admin-preview"
        >
          Preview Store
          <ArrowRight
            size={15}
          />
        </Link>
      </div>

      <div className="homepage-admin-notice">
        <strong>
          Homepage sections
        </strong>

        <span>
          Hero management is
          connected. We will
          connect the remaining
          sections one by one.
        </span>
      </div>

      <div className="homepage-builder-grid">
        {sections.map(
          (section) => {
            const Icon =
              section.icon;

            const content = (
              <>
                <div className="homepage-builder-card-top">
                  <div className="homepage-builder-icon">
                    <Icon
                      size={21}
                    />
                  </div>

                  <span
                    className={
                      section.ready
                        ? "homepage-builder-status is-ready"
                        : "homepage-builder-status"
                    }
                  >
                    {section.ready
                      ? "Ready"
                      : "Coming next"}
                  </span>
                </div>

                <div className="homepage-builder-card-copy">
                  <h2>
                    {
                      section.title
                    }
                  </h2>

                  <p>
                    {
                      section.description
                    }
                  </p>
                </div>

                <div className="homepage-builder-card-footer">
                  <span>
                    {section.ready
                      ? "Manage section"
                      : "Not connected yet"}
                  </span>

                  <ArrowRight
                    size={16}
                  />
                </div>
              </>
            );

            if (
              !section.ready
            ) {
              return (
                <div
                  key={
                    section.title
                  }
                  className="homepage-builder-card is-disabled"
                >
                  {content}
                </div>
              );
            }

            return (
              <Link
                key={
                  section.title
                }
                href={
                  section.href
                }
                className="homepage-builder-card"
              >
                {content}
              </Link>
            );
          },
        )}
      </div>
    </div>
  );
}