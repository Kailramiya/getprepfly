"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { APP_NAME } from "@/lib/constants";
import { Logo } from "@/components/logo";
import { FileText, Shield, CreditCard, Mail, ChevronRight } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

const navItems = [
  { href: "/terms", label: "Terms of Service", icon: FileText },
  { href: "/privacy", label: "Privacy Policy", icon: Shield },
  { href: "/refund-policy", label: "Refunds & Cancellations", icon: CreditCard },
  { href: "/contact", label: "Contact Us", icon: Mail },
];

export default function LegalLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/80 px-4 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80 sm:px-6 lg:px-8">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Logo size="sm" />
          </Link>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link href="/" className="text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors">
              Back to Home
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <div className="mx-auto flex max-w-7xl flex-col lg:flex-row lg:gap-12 px-4 py-12 sm:px-6 lg:px-8">
        {/* Sidebar */}
        <aside className="w-full shrink-0 lg:w-64">
          <nav className="sticky top-24 space-y-1">
            <h2 className="mb-4 px-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-500">
              Legal & Support
            </h2>
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                    isActive
                      ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon
                      className={`h-4 w-4 shrink-0 ${
                        isActive
                          ? "text-indigo-600 dark:text-indigo-400"
                          : "text-gray-400 group-hover:text-gray-600 dark:text-slate-500 dark:group-hover:text-slate-300"
                      }`}
                    />
                    {item.label}
                  </div>
                  {isActive && <ChevronRight className="h-4 w-4 text-indigo-500/50 dark:text-indigo-400/50" />}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Content Area */}
        <main className="mt-8 flex-1 lg:mt-0">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-10">
            {/* Custom typography for standard HTML tags within the legal pages */}
            <article className="
              prose prose-slate max-w-none 
              dark:prose-invert
              prose-headings:font-bold prose-headings:tracking-tight 
              prose-h1:text-3xl prose-h1:text-gray-900 dark:prose-h1:text-slate-50
              prose-h2:mt-10 prose-h2:text-2xl prose-h2:text-gray-800 dark:prose-h2:text-slate-100
              prose-p:text-gray-600 dark:prose-p:text-slate-300 prose-p:leading-relaxed
              prose-a:text-indigo-600 dark:prose-a:text-indigo-400 prose-a:font-medium prose-a:no-underline hover:prose-a:underline
              prose-li:text-gray-600 dark:prose-li:text-slate-300
              prose-strong:text-gray-900 dark:prose-strong:text-slate-100
            ">
              {children}
            </article>
          </div>
        </main>
      </div>
      
      {/* Footer */}
      <footer className="mt-20 border-t border-gray-200 bg-white py-8 dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-gray-500 dark:text-slate-500 sm:px-6 lg:px-8">
          © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
