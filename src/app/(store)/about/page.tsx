import type {
  Metadata,
} from "next";

import Link from "next/link";

import {
  ArrowRight,
  BadgeCheck,
  CreditCard,
  ExternalLink,
  HeartHandshake,
  Mail,
  MapPin,
  PackageCheck,
  Phone,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Truck,
} from "lucide-react";

import {
  FaFacebookF,
  FaInstagram,
  FaWhatsapp,
  FaYoutube,
} from "react-icons/fa6";

import {
  db,
  withDatabaseRetry,
} from "@/lib/db";

import styles from "./about.module.css";

export const dynamic =
  "force-dynamic";

export const metadata:
  Metadata = {
  title: {
    absolute:
      "About GameOn Garb | Sports, Fashion & Everyday Style in Bangladesh",
  },

  description:
    "Discover GameOn Garb, a Bangladesh-based sports and lifestyle fashion brand. Learn our story, what we offer, delivery options, contact details, and visit our Mirpur store.",

  alternates: {
    canonical:
      "/about",
  },

  openGraph: {
    title:
      "About GameOn Garb",

    description:
      "Sports, fashion and everyday essentials for people who live with energy. Discover the GameOn Garb story and visit our Mirpur store.",

    url:
      "/about",

    type:
      "website",
  },
};

const STORE_ADDRESS =
  "Shop-03, Road-08, Mirpur-02, opposite Gate-2 of the National Cricket Stadium, Mirpur, Dhaka, Bangladesh.";

const STORE_MAP_URL =
  "https://www.google.com/maps/place/Gameon+Garb";

const STORE_EMAIL =
  "gameongarb@gmail.com";

const WHATSAPP_URL =
  "https://wa.me/8801711992409";

const SOCIAL_LINKS = [
  {
    label:
      "Facebook",

    href:
      "https://www.facebook.com/GameOnGarb",

    icon:
      FaFacebookF,
  },
  {
    label:
      "Instagram",

    href:
      "https://www.instagram.com/gameon_garb/",

    icon:
      FaInstagram,
  },
  {
    label:
      "YouTube",

    href:
      "https://www.youtube.com/@gameongarb",

    icon:
      FaYoutube,
  },
  {
    label:
      "WhatsApp",

    href:
      WHATSAPP_URL,

    icon:
      FaWhatsapp,
  },
] as const;

const VALUES = [
  {
    icon:
      BadgeCheck,

    title:
      "Quality First",

    body:
      "We focus on wearable quality, dependable finishing and pieces that feel right from the first wear.",
  },
  {
    icon:
      Sparkles,

    title:
      "Modern Style",

    body:
      "Our collections bring together sports culture, streetwear energy and everyday versatility.",
  },
  {
    icon:
      HeartHandshake,

    title:
      "Customer Focus",

    body:
      "From product selection to delivery and after-sales support, we aim to keep the experience simple and dependable.",
  },
  {
    icon:
      ShieldCheck,

    title:
      "Built on Trust",

    body:
      "Clear pricing, secure payment options, order tracking and responsive support are part of how we serve our customers.",
  },
];

const EXPERIENCE = [
  {
    icon:
      ShoppingBag,

    label:
      "Easy Shopping",

    value:
      "Guest checkout and customer accounts",
  },
  {
    icon:
      CreditCard,

    label:
      "Flexible Payment",

    value:
      "Cash on Delivery and bKash",
  },
  {
    icon:
      Truck,

    label:
      "Nationwide Delivery",

    value:
      "Inside and outside Dhaka",
  },
  {
    icon:
      PackageCheck,

    label:
      "Order Visibility",

    value:
      "Track your order from the website",
  },
];

export default async function AboutPage() {
  const contactSetting =
    await withDatabaseRetry(
      () =>
        db.storeSetting.findUnique({
          where: {
            key:
              "contact",
          },

          select: {
            value:
              true,
          },
        }),
    );

  const contact =
    (
      contactSetting?.value ??
      {}
    ) as Record<
      string,
      unknown
    >;

  const phone =
    String(
      contact.phone ??
        "",
    ).trim();

  const telHref =
    phone
      ? `tel:${phone.replace(
          /[^+\d]/g,
          "",
        )}`
      : null;

  return (
    <main className={styles.page}>
      {/* ===================================================
          HERO
          =================================================== */}
      <section className={styles.hero}>
        <div className={`container ${styles.heroInner}`}>
          <div className={styles.heroCopy}>
            <span className={styles.kicker}>
              GameOn Garb
            </span>

            <h1>
              More Than
              <br />
              What You Wear.
            </h1>

            <p className={styles.heroLead}>
              GameOn Garb brings
              sports, fashion and
              everyday style together
              for people who move with
              confidence, energy and
              purpose.
            </p>

            <div className={styles.heroActions}>
              <Link
                href="/shop"
                className={styles.primaryAction}
              >
                Shop the Collection

                <ArrowRight
                  size={17}
                  aria-hidden="true"
                />
              </Link>

              <a
                href={STORE_MAP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.secondaryAction}
              >
                Visit Our Store

                <ExternalLink
                  size={15}
                  aria-hidden="true"
                />
              </a>
            </div>
          </div>

          <div className={styles.heroStatement}>
            <span>
              Our Mindset
            </span>

            <strong>
              Experience
              <br />
              The Thrill.
            </strong>

            <p>
              Built in Bangladesh.
              Designed for movement,
              expression and everyday
              life.
            </p>
          </div>
        </div>
      </section>

      {/* ===================================================
          STORY
          =================================================== */}
      <section className={styles.story}>
        <div className={`container ${styles.storyGrid}`}>
          <div className={styles.sectionIntro}>
            <span>
              Our Story
            </span>

            <h2>
              Built for people who
              live in motion.
            </h2>
          </div>

          <div className={styles.storyCopy}>
            <p>
              GameOn Garb is a
              Bangladesh-based sports,
              fashion and lifestyle
              brand created for people
              who want comfort, energy
              and modern style in the
              same wardrobe.
            </p>

            <p>
              Our collections move
              across sneakers,
              football jerseys,
              sportswear, polo shirts,
              drop-shoulder styles,
              baggy trousers and other
              everyday essentials. The
              goal is simple: make
              pieces that look good,
              feel comfortable and fit
              naturally into real life.
            </p>

            <p>
              From match day to
              everyday wear, we want
              GameOn Garb to feel
              active, confident and
              easy to choose.
            </p>
          </div>
        </div>
      </section>

      {/* ===================================================
          VALUES
          =================================================== */}
      <section className={styles.valuesSection}>
        <div className="container">
          <div className={styles.sectionHeading}>
            <span>
              What We Stand For
            </span>

            <h2>
              A better everyday
              shopping experience.
            </h2>
          </div>

          <div className={styles.valuesGrid}>
            {VALUES.map(
              ({
                icon:
                  Icon,
                title,
                body,
              }) => (
                <article
                  key={title}
                  className={styles.valueCard}
                >
                  <span className={styles.valueIcon}>
                    <Icon
                      size={23}
                      strokeWidth={1.7}
                    />
                  </span>

                  <h3>
                    {title}
                  </h3>

                  <p>
                    {body}
                  </p>
                </article>
              ),
            )}
          </div>
        </div>
      </section>

      {/* ===================================================
          OFFER
          =================================================== */}
      <section className={styles.offerSection}>
        <div className={`container ${styles.offerGrid}`}>
          <div className={styles.offerCopy}>
            <span>
              What We Offer
            </span>

            <h2>
              Sports energy.
              Everyday versatility.
            </h2>

            <p>
              Explore sneakers,
              football jerseys,
              sportswear, polos,
              drop shoulders, baggy
              trousers and lifestyle
              pieces selected for the
              modern Bangladesh
              customer.
            </p>

            <Link
              href="/categories"
              className={styles.textLink}
            >
              Explore Categories

              <ArrowRight
                size={15}
              />
            </Link>
          </div>

          <div className={styles.categoryStack}>
            <div>
              <strong>
                Sneakers
              </strong>

              <span>
                Everyday comfort,
                street-ready style and
                pairs built to lead the
                rotation.
              </span>
            </div>

            <div>
              <strong>
                Football &
                Sports
              </strong>

              <span>
                Match-day spirit,
                performance influence
                and fan culture.
              </span>
            </div>

            <div>
              <strong>
                Casual &
                Streetwear
              </strong>

              <span>
                Relaxed silhouettes
                built for everyday
                rotation.
              </span>
            </div>

            <div>
              <strong>
                Everyday
                Essentials
              </strong>

              <span>
                Clean, versatile pieces
                that work across your
                week.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================
          EXPERIENCE
          =================================================== */}
      <section className={styles.experienceSection}>
        <div className="container">
          <div className={styles.sectionHeading}>
            <span>
              Shopping With Us
            </span>

            <h2>
              Simple from cart
              to doorstep.
            </h2>
          </div>

          <div className={styles.experienceGrid}>
            {EXPERIENCE.map(
              ({
                icon:
                  Icon,
                label,
                value,
              }) => (
                <div
                  key={label}
                  className={styles.experienceItem}
                >
                  <Icon
                    size={21}
                    strokeWidth={1.7}
                  />

                  <div>
                    <small>
                      {label}
                    </small>

                    <strong>
                      {value}
                    </strong>
                  </div>
                </div>
              ),
            )}
          </div>

          <div className={styles.deliveryStrip}>
            <div>
              <span>
                Inside Dhaka
              </span>

              <strong>
                ৳80
              </strong>

              <small>
                Standard delivery
                charge
              </small>
            </div>

            <div>
              <span>
                Outside Dhaka
              </span>

              <strong>
                ৳150
              </strong>

              <small>
                Standard delivery
                charge
              </small>
            </div>

            <div className={styles.deliveryNote}>
              <Truck
                size={24}
                strokeWidth={1.6}
              />

              <p>
                Delivery is available
                across Bangladesh.
                Final availability and
                charges are confirmed
                during checkout.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================
          LOCATION + CONTACT
          =================================================== */}
      <section className={styles.contactSection}>
        <div className={`container ${styles.contactGrid}`}>
          <div className={styles.locationPanel}>
            <span className={styles.kicker}>
              Visit GameOn Garb
            </span>

            <h2>
              Find us in
              Mirpur, Dhaka.
            </h2>

            <div className={styles.addressBlock}>
              <MapPin
                size={24}
                strokeWidth={1.7}
              />

              <p>
                {STORE_ADDRESS}
              </p>
            </div>

            <a
              href={STORE_MAP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.mapAction}
            >
              Get Directions

              <ExternalLink
                size={15}
              />
            </a>
          </div>

          <div className={styles.contactPanel}>
            <span>
              Contact & Support
            </span>

            <h3>
              Need help before
              or after your order?
            </h3>

            <div className={styles.contactList}>
              {phone ? (
                <a
                  href={telHref ?? undefined}
                >
                  <Phone
                    size={19}
                    strokeWidth={1.7}
                  />

                  <div>
                    <small>
                      Call Us
                    </small>

                    <strong>
                      {phone}
                    </strong>
                  </div>
                </a>
              ) : null}

              <a
                href={`mailto:${STORE_EMAIL}`}
              >
                <Mail
                  size={19}
                  strokeWidth={1.7}
                />

                <div>
                  <small>
                    Email Us
                  </small>

                  <strong>
                    {STORE_EMAIL}
                  </strong>
                </div>
              </a>

              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                <FaWhatsapp
                  aria-hidden="true"
                />

                <div>
                  <small>
                    WhatsApp
                  </small>

                  <strong>
                    Chat with GameOn Garb
                  </strong>
                </div>
              </a>
            </div>

            <div className={styles.socialBlock}>
              <small>
                Follow GameOn Garb
              </small>

              <div>
                {SOCIAL_LINKS.map(
                  ({
                    label,
                    href,
                    icon:
                      Icon,
                  }) => (
                    <a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                      title={label}
                    >
                      <Icon />
                    </a>
                  ),
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================
          FINAL CTA
          =================================================== */}
      <section className={styles.finalCta}>
        <div className={`container ${styles.finalCtaInner}`}>
          <div>
            <span>
              Ready to Move?
            </span>

            <h2>
              Find your next
              GameOn Garb piece.
            </h2>
          </div>

          <div className={styles.finalActions}>
            <Link
              href="/shop?sort=newest"
              className={styles.primaryAction}
            >
              New Arrivals

              <ArrowRight
                size={17}
              />
            </Link>

            <Link
              href="/track-order"
              className={styles.darkOutlineAction}
            >
              Track Order
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
