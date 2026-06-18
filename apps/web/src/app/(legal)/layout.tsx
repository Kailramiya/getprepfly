import Link from "next/link";
import { ReactNode } from "react";
import { APP_NAME } from "@/lib/constants";

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-gray-800">
      <header className="border-b border-gray-200">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-lg font-bold text-indigo-600">
            {APP_NAME}
          </Link>
          <nav className="flex gap-4 text-sm text-gray-500">
            <Link href="/terms" className="hover:text-indigo-600">Terms</Link>
            <Link href="/privacy" className="hover:text-indigo-600">Privacy</Link>
            <Link href="/refund-policy" className="hover:text-indigo-600">Refunds</Link>
            <Link href="/contact" className="hover:text-indigo-600">Contact</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10">
        <article className="prose prose-sm max-w-none prose-headings:font-bold prose-headings:text-gray-900 prose-a:text-indigo-600">
          {children}
        </article>
      </main>
      <footer className="border-t border-gray-200">
        <div className="mx-auto max-w-3xl px-4 py-6 text-xs text-gray-400">
          © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
