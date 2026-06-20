import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/providers";
import { PWARegister } from "@/components/pwa-register";
import { ContentProtection } from "@/components/content-protection";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  preload: true,
});

const SITE_NAME = "PrepFly";
const SITE_URL = "https://getprepfly.com";
const SITE_DESCRIPTION =
  "Practice PTE Academic with AI-powered scoring. Speaking, Writing, Reading & Listening practice with instant feedback. Free during beta.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: "PrepFly",
  title: {
    default: "PrepFly — AI-Powered PTE Practice Platform",
    template: "%s | PrepFly",
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "PTE", "PTE Academic", "PTE practice", "PTE mock test", "PTE preparation",
    "PTE score 79", "PrepFly", "Prepfly", "getprepfly", "get prepfly",
    "prepfly.com", "PTE India", "AI PTE practice", "PTE coaching",
    "PTE speaking practice", "PTE writing practice", "PTE reading practice",
    "PTE listening practice", "PTE online coaching", "PTE preparation India",
    "best PTE app", "PTE practice app", "PTE AI scoring",
  ],
  authors: [{ name: "PrepFly", url: SITE_URL }],
  creator: "PrepFly",
  publisher: "PrepFly",
  category: "Education",
  manifest: "/manifest.json",
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    siteName: SITE_NAME,
    url: SITE_URL,
    type: "website",
    title: "PrepFly — AI-Powered PTE Practice Platform",
    description: SITE_DESCRIPTION,
    images: [
      {
        url: `${SITE_URL}/icons/logo.png`,
        width: 1024,
        height: 559,
        alt: "PrepFly — AI-Powered PTE Practice Platform",
      },
    ],
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: "PrepFly — AI-Powered PTE Practice Platform",
    description: SITE_DESCRIPTION,
    site: "@getprepfly",
    creator: "@getprepfly",
    images: [`${SITE_URL}/icons/logo.png`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-snippet": -1, "max-image-preview": "large", "max-video-preview": -1 },
  },
  verification: {
    // Add your Google Search Console verification token here once you have it:
    // google: "YOUR_VERIFICATION_TOKEN",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <meta name="theme-color" content="#14B8A6" />
<link rel="icon" href="/icons/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
      <body className="min-h-screen bg-gray-50 font-sans antialiased dark:bg-slate-900">
        <Providers>
          <ContentProtection />
          {children}
        </Providers>
        <PWARegister />
        <Analytics />
      </body>
    </html>
  );
}
