"use client";

import Link from "next/link";

import {
  FormEvent,
  useState,
} from "react";

import {
  ArrowRight,
  Mail,
  MapPin,
  Phone,
} from "lucide-react";

import {
  FaFacebookF,
  FaInstagram,
  FaLinkedinIn,
  FaTiktok,
  FaWhatsapp,
  FaXTwitter,
  FaYoutube,
} from "react-icons/fa6";

import {
  Logo,
} from "@/components/shared/logo";

/* =========================================================
   TYPES
   ========================================================= */

type Settings =
  Record<
    string,
    unknown
  >;

type NavCategory = {
  name: string;
  slug: string;
};

type StoreFooterProps = {
  settings: Settings;

  navCategories:
    NavCategory[];
};

/* =========================================================
   HELPERS
   ========================================================= */

function getSocialIcon(
  network: string,
) {
  const key =
    network
      .toLowerCase()
      .replace(
        /[\s_-]/g,
        "",
      );

  switch (key) {
    case "facebook":
    case "fb":
      return (
        <FaFacebookF />
      );

    case "instagram":
    case "ig":
      return (
        <FaInstagram />
      );

    case "youtube":
      return (
        <FaYoutube />
      );

    case "tiktok":
      return (
        <FaTiktok />
      );

    case "twitter":
    case "x":
    case "xtwitter":
      return (
        <FaXTwitter />
      );

    case "linkedin":
      return (
        <FaLinkedinIn />
      );

    case "whatsapp":
      return (
        <FaWhatsapp />
      );

    default:
      return null;
  }
}

function formatNetworkName(
  value: string,
) {
  return value
    .replace(
      /([a-z])([A-Z])/g,
      "$1 $2",
    )
    .replace(
      /[-_]/g,
      " ",
    )
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase(),
    );
}

async function readResponse(
  response: Response,
) {
  const text =
    await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(
      text,
    ) as Record<
      string,
      unknown
    >;
  } catch {
    return {
      error:
        text.slice(
          0,
          300,
        ),
    };
  }
}

/* =========================================================
   FOOTER
   ========================================================= */

export function StoreFooter({
  settings,
  navCategories,
}: StoreFooterProps) {
  const [
    email,
    setEmail,
  ] = useState("");

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const contact =
    (settings.contact ??
      {}) as Record<
      string,
      unknown
    >;

  const social =
    (settings.social ??
      {}) as Record<
      string,
      unknown
    >;

  const phone =
    String(
      contact.phone ??
        "",
    ).trim();

  const contactEmail =
    String(
      contact.email ??
        "",
    ).trim();

  const address =
    String(
      contact.address ??
        "",
    ).trim();

  const socialLinks =
    Object.entries(
      social,
    ).filter(
      (
        entry,
      ): entry is [
        string,
        string,
      ] =>
        typeof entry[1] ===
          "string" &&
        entry[1].startsWith(
          "http",
        ),
    );

  const footerCategories =
    navCategories.slice(
      0,
      5,
    );

  /* =======================================================
     NEWSLETTER
     ======================================================= */

  async function subscribe(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const value =
      email.trim();

    if (!value) {
      return;
    }

    setSubmitting(true);
    setMessage("");

    try {
      const response =
        await fetch(
          "/api/newsletter",
          {
            method:
              "POST",

            headers: {
              "content-type":
                "application/json",
            },

            body:
              JSON.stringify({
                email:
                  value,
              }),
          },
        );

      const result =
        await readResponse(
          response,
        );

      if (!response.ok) {
        setMessage(
          String(
            result.error ??
              "Unable to subscribe.",
          ),
        );

        return;
      }

      setMessage(
        String(
          result.message ??
            "You’re on the list.",
        ),
      );

      setEmail("");
    } catch {
      setMessage(
        "Unable to subscribe right now.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <footer className="store-footer">
      <div className="container store-footer-main">
        {/* =================================================
            BRAND + CONTACT
            ================================================= */}

        <div className="store-footer-brand">
          <div className="store-footer-logo">
            <Logo />
          </div>

          <p className="store-footer-description">
            Sports, fashion and
            everyday essentials
            made for people who
            live with energy.
          </p>

          <span className="store-footer-brand-line">
            Experience The
            Thrill.
          </span>

          {(phone ||
            contactEmail ||
            address) ? (
            <div className="store-footer-brand-contact">
              {phone ? (
                <a
                  href={`tel:${phone}`}
                >
                  <Phone
                    size={13}
                    strokeWidth={
                      1.7
                    }
                  />

                  <span>
                    {phone}
                  </span>
                </a>
              ) : null}

              {contactEmail ? (
                <a
                  href={`mailto:${contactEmail}`}
                >
                  <Mail
                    size={13}
                    strokeWidth={
                      1.7
                    }
                  />

                  <span>
                    {
                      contactEmail
                    }
                  </span>
                </a>
              ) : null}

              {address ? (
                <div>
                  <MapPin
                    size={13}
                    strokeWidth={
                      1.7
                    }
                  />

                  <span>
                    {address}
                  </span>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* =================================================
            SHOP
            ================================================= */}

        <nav
          className="store-footer-column"
          aria-label="Footer shop navigation"
        >
          <span className="store-footer-column-title">
            Shop
          </span>

          <Link href="/shop?sort=newest">
            New Arrivals
          </Link>

          {footerCategories.map(
            (
              category,
            ) => (
              <Link
                key={
                  category.slug
                }
                href={`/shop?category=${category.slug}`}
              >
                {
                  category.name
                }
              </Link>
            ),
          )}

          <Link href="/categories">
            All Categories
          </Link>
        </nav>

        {/* =================================================
            CUSTOMER
            ================================================= */}

        <nav
          className="store-footer-column"
          aria-label="Footer customer navigation"
        >
          <span className="store-footer-column-title">
            Customer
          </span>

          <Link href="/account">
            My Account
          </Link>

          <Link href="/account/orders">
            My Orders
          </Link>

          <Link href="/track-order">
            Track Order
          </Link>

          <Link href="/cart">
            Shopping Bag
          </Link>

          <Link href="/shop">
            Shop All
          </Link>
        </nav>

        {/* =================================================
            NEWSLETTER + SOCIAL
            ================================================= */}

        <div className="store-footer-newsletter">
          <span className="store-footer-newsletter-eyebrow">
            Stay In The Game
          </span>

          <h3>
            Join Our Movement.
          </h3>

          <p>
            New drops,
            members-only offers
            and the latest from
            Game On Garb.
          </p>

          <form
            className="store-footer-form"
            onSubmit={
              subscribe
            }
          >
            <input
              type="email"
              required
              aria-label="Email address"
              placeholder="Enter your email"
              value={
                email
              }
              disabled={
                submitting
              }
              onChange={(
                event,
              ) =>
                setEmail(
                  event.target
                    .value,
                )
              }
            />

            <button
              type="submit"
              aria-label="Subscribe to newsletter"
              disabled={
                submitting
              }
            >
              <ArrowRight
                size={16}
                strokeWidth={
                  1.8
                }
              />
            </button>
          </form>

          {message ? (
            <small className="store-footer-message">
              {message}
            </small>
          ) : null}

          {socialLinks.length >
          0 ? (
            <div className="store-footer-social-block">
              <span className="store-footer-social-label">
                Follow Us
              </span>

              <div className="store-footer-social-icons">
                {socialLinks.map(
                  ([
                    network,
                    href,
                  ]) => {
                    const icon =
                      getSocialIcon(
                        network,
                      );

                    if (!icon) {
                      return null;
                    }

                    return (
                      <a
                        key={
                          network
                        }
                        href={
                          href
                        }
                        target="_blank"
                        rel="noreferrer"
                        aria-label={
                          formatNetworkName(
                            network,
                          )
                        }
                        title={
                          formatNetworkName(
                            network,
                          )
                        }
                      >
                        {icon}
                      </a>
                    );
                  },
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* =====================================================
          FINAL BRAND CREDIT
          ===================================================== */}

      <div className="store-footer-credit">
        <div className="container">
          <span>
            © 2026 Game On Garb.
            All rights reserved.
          </span>
        </div>
      </div>
    </footer>
  );
}