import Link from "next/link";

import {
  ArrowRight,
  ImageIcon,
  Images,
  Layers3,
  Shirt,
  Trophy,
} from "lucide-react";

export const dynamic =
  "force-dynamic";

const sections = [
  {
    title:
      "Hero Slides",

    description:
      "Manage desktop and mobile hero banners, campaign text, CTA links, visibility and slide order.",

    href:
      "/admin/homepage/hero",

    icon:
      Images,
  },

  {
    title:
      "Sports",

    description:
      "Manage the Sports campaign image, headline, CTA and storefront visibility.",

    href:
      "/admin/homepage/sports",

    icon:
      Trophy,
  },

  {
    title:
      "Polo",

    description:
      "Manage the Polo campaign image, headline, CTA and storefront visibility.",

    href:
      "/admin/homepage/polo",

    icon:
      Shirt,
  },

  {
    title:
      "Category Images",

    description:
      "Upload and update category artwork used across the homepage and Categories page.",

    href:
      "/admin/homepage/category-images",

    icon:
      ImageIcon,
  },

  {
    title:
      "Experience The Thrill",

    description:
      "Manage the final homepage brand campaign image, copy, CTA and storefront visibility.",

    href:
      "/admin/homepage/brand-story",

    icon:
      Layers3,
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
            Manage the major
            visual campaigns and
            category artwork of
            the Game On Garb
            storefront.
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
          Storefront appearance
        </strong>

        <span>
          Hero, Sports, Polo,
          Category Images and
          Experience The Thrill
          are connected directly
          to the storefront.
        </span>
      </div>

      <div className="homepage-builder-grid">
        {sections.map(
          (
            section,
          ) => {
            const Icon =
              section.icon;

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
                <div className="homepage-builder-card-top">
                  <div className="homepage-builder-icon">
                    <Icon
                      size={21}
                    />
                  </div>

                  <span className="homepage-builder-status is-ready">
                    Ready
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
                    Manage section
                  </span>

                  <ArrowRight
                    size={16}
                  />
                </div>
              </Link>
            );
          },
        )}
      </div>
    </div>
  );
}