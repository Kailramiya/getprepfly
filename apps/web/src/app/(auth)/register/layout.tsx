import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create your Prepfly account",
  description: "Sign up for Prepfly and start practising PTE Academic with AI-powered scoring — free during beta.",
  alternates: { canonical: "/register" },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
