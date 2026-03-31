import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/providers";
import { PWARegister } from "@/components/pwa-register";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: {
    default: "PTE Master — AI-Powered PTE Practice Platform",
    template: "%s | PTE Master",
  },
  description:
    "Practice PTE Academic with AI-powered scoring. Speaking, Writing, Reading & Listening practice with instant feedback. Free during beta.",
  keywords: ["PTE", "PTE Academic", "PTE practice", "PTE mock test", "PTE preparation", "PTE India"],
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <meta name="theme-color" content="#4F46E5" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="min-h-screen bg-gray-50 font-sans antialiased">
        <Providers>{children}</Providers>
        <PWARegister />
      </body>
    </html>
  );
}
