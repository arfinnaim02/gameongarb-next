"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Logo } from "@/components/shared/logo";

type Settings = Record<string, unknown>;

export function StoreFooter({ settings }: { settings: Settings }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const contact = (settings.contact ?? {}) as Record<string, unknown>;
  const social = (settings.social ?? {}) as Record<string, unknown>;

  async function subscribe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      setMessage(
        response.ok
          ? String(result.message ?? "Subscribed successfully.")
          : String(result.error ?? "Unable to subscribe."),
      );

      if (response.ok) {
        setEmail("");
      }
    } catch {
      setMessage("Unable to subscribe right now.");
    }
  }

  const footerGroups = [
    {
      title: "Shop",
      links: [
        ["New In", "/shop?sort=newest"],
        ["Sports", "/shop?category=sports"],
        ["Polo", "/shop?category=polo"],
        ["Shoes", "/shop?category=shoes"],
      ],
    },
    {
      title: "Help",
      links: [
        ["Track Order", "/track-order"],
        ["Returns & Exchange", "/returns"],
        ["Size Guide", "/size-guide"],
        ["FAQ", "/faq"],
      ],
    },
    {
      title: "Company",
      links: [
        ["Our Story", "/about"],
        ["Contact", "/contact"],
        ["Shipping", "/shipping"],
        ["Privacy", "/privacy"],
      ],
    },
  ] as const;

  return (
    <footer className="store-footer">
      <div className="container store-footer-grid">
        <div className="store-footer-brand">
          <Logo />

          <p>
            Game On Garb brings together sports, fashion and everyday style for
            those who live with passion.
          </p>
        </div>

        {footerGroups.map((group) => (
          <div className="store-footer-group" key={group.title}>
            <b>{group.title}</b>

            {group.links.map(([label, href]) => (
              <Link key={label} href={href}>
                {label}
              </Link>
            ))}
          </div>
        ))}

        <div className="store-footer-newsletter">
          <b>Join Our Movement</b>

          <p>Get exclusive offers and new arrivals.</p>

          <form onSubmit={subscribe} className="store-footer-form">
            <input
              className="field"
              placeholder="Enter your email"
              aria-label="Email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />

            <button className="btn btn-primary" type="submit" aria-label="Subscribe">
              →
            </button>
          </form>

          {message ? (
            <small className="store-footer-message">{message}</small>
          ) : null}

          {Boolean(contact.phone || contact.email) ? (
            <p className="store-footer-contact">
              {String(contact.phone ?? "")}
              {contact.phone && contact.email ? " · " : ""}
              {String(contact.email ?? "")}
            </p>
          ) : null}

          <div className="store-footer-social">
            {Object.entries(social)
              .filter(
                ([, href]) =>
                  typeof href === "string" && href.startsWith("http"),
              )
              .map(([network, href]) => (
                <a
                  key={network}
                  href={String(href)}
                  target="_blank"
                  rel="noreferrer"
                >
                  {network.slice(0, 1).toUpperCase() + network.slice(1)}
                </a>
              ))}
          </div>
        </div>
      </div>

      <div className="container store-footer-bottom">
        <span>© 2026 Game On Garb. All rights reserved.</span>

        <span>
          <Link href="/privacy">Privacy Policy</Link>
          {" · "}
          <Link href="/terms">Terms &amp; Conditions</Link>
        </span>
      </div>
    </footer>
  );
}
