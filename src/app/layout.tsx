import type { Metadata } from "next";

import "./globals.css";

import { StoreProvider } from "@/components/shared/store-provider";

export const metadata: Metadata = {
  title: {
    default:
      "GameOn Garb | Sneakers, Jerseys & Sportswear in Bangladesh",

    template:
      "%s | GameOn Garb",
  },

  description:
    "Shop sneakers, football jerseys, sportswear, polos and streetwear at GameOn Garb. Nationwide delivery across Bangladesh with COD and bKash.",

  metadataBase: new URL(
    process.env.APP_URL ??
      "https://www.gameongarb.com",
  ),

  openGraph: {
    title:
      "GameOn Garb | Sneakers, Jerseys & Sportswear in Bangladesh",

    description:
      "Shop sneakers, football jerseys, sportswear, polos and streetwear at GameOn Garb with nationwide delivery across Bangladesh.",

    type:
      "website",

    url:
      "/",

    siteName:
      "GameOn Garb",

    images: [
      {
        url:
          "/brand/game-on-garb-logo.svg",

        alt:
          "GameOn Garb",
      },
    ],
  },

  twitter: {
    card:
      "summary_large_image",

    title:
      "GameOn Garb | Sneakers, Jerseys & Sportswear in Bangladesh",

    description:
      "Shop sneakers, football jerseys, sportswear, polos and streetwear at GameOn Garb.",

    images: [
      "/brand/game-on-garb-logo.svg",
    ],
  },

  icons: {
    icon: [
      {
        url:
          "/favicon.svg",

        type:
          "image/svg+xml",
      },
    ],

    shortcut:
      "/favicon.svg",

    apple:
      "/favicon.svg",
  },

  manifest:
    "/manifest.webmanifest",

  alternates: {
    canonical:
      "/",
  },
};

const organizationSchema = {
  "@context":
    "https://schema.org",

  "@type":
    "Organization",

  name:
    "GameOn Garb",

  url:
    "https://www.gameongarb.com",

  logo:
    "https://www.gameongarb.com/brand/game-on-garb-logo.svg",

  sameAs: [
    "https://www.facebook.com/GameOnGarb",
    "https://www.instagram.com/gameon_garb/",
    "https://www.youtube.com/@gameongarb",
  ],
};

const websiteSchema = {
  "@context":
    "https://schema.org",

  "@type":
    "WebSite",

  name:
    "GameOn Garb",

  url:
    "https://www.gameongarb.com",

  inLanguage:
    "en-BD",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html:
              JSON.stringify(
                organizationSchema,
              ),
          }}
        />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html:
              JSON.stringify(
                websiteSchema,
              ),
          }}
        />

        <StoreProvider>
          {children}
        </StoreProvider>
      </body>
    </html>
  );
}