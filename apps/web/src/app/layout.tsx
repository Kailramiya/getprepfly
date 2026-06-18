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

const SITE_NAME = "Prepfly";
const SITE_URL = "https://getprepfly.com";
const SITE_DESCRIPTION =
  "Practice PTE Academic with AI-powered scoring. Speaking, Writing, Reading & Listening practice with instant feedback. Free during beta.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Prepfly — AI-Powered PTE Practice Platform",
    template: "%s | Prepfly",
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "PTE", "PTE Academic", "PTE practice", "PTE mock test", "PTE preparation",
    "PTE score 79", "Prepfly", "getprepfly", "PTE India", "AI PTE practice",
    "PTE speaking practice", "PTE writing practice",
  ],
  manifest: "/manifest.json",
  openGraph: {
    siteName: SITE_NAME,
    url: SITE_URL,
    type: "website",
    title: "Prepfly — AI-Powered PTE Practice Platform",
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "Prepfly — AI-Powered PTE Practice Platform",
    description: SITE_DESCRIPTION,
    site: "@getprepfly",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-snippet": -1, "max-image-preview": "large" },
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
