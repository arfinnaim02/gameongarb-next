import type { Metadata } from "next";

import "./globals.css";

import { StoreProvider } from "@/components/shared/store-provider";

export const metadata: Metadata = {
  title: {
    default: "Game On Garb | Experience the Thrill",
    template: "%s | Game On Garb",
  },

  description:
    "Premium sports-inspired fashion and everyday style across Bangladesh.",

  metadataBase: new URL(
    process.env.APP_URL ??
      "http://localhost:3000",
  ),

  openGraph: {
    title: "Game On Garb",
    description: "Game on. Every day.",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <StoreProvider>
          {children}
        </StoreProvider>
      </body>
    </html>
  );
}