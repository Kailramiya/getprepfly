import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Log in to Prepfly",
  description: "Log in to your Prepfly account and continue your PTE Academic practice.",
  alternates: { canonical: "/login" },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
