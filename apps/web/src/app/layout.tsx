import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/providers";
import { PWARegister } from "@/components/pwa-register";
import { ContentProtection } from "@/components/content-protection";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  metadataBase: new URL("https://getprepfly.com"),
  title: {
    default: "Prepfly — AI-Powered PTE Practice Platform",
    template: "%s | Prepfly",
  },
  description:
    "Practice PTE Academic with AI-powered scoring. Speaking, Writing, Reading & Listening practice with instant feedback. Free during beta.",
  keywords: ["PTE", "PTE Academic", "PTE practice", "PTE mock test", "Prepfly", "getprepfly", "PTE India"],
  manifest: "/manifest.json",
  openGraph: {
    siteName: "Prepfly",
    url: "https://getprepfly.com",
    type: "website",
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
      </body>
    </html>
  );
}
