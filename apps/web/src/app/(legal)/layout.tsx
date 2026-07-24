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
    <div className="min-h-[100dvh] bg-background text-foreground relative overflow-hidden">
      <div className="pointer-events-none fixed left-1/2 top-0 -z-10 h-[800px] w-[1200px] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(ellipse_at_top,rgba(20,184,166,0.15),transparent_70%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(20,184,166,0.1),transparent_70%)]" />
      
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/5 bg-background/50 px-4 backdrop-blur-xl sm:px-6 lg:px-8 shadow-glass">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Logo size="sm" />
          </Link>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link href="/" className="text-sm font-bold tracking-wide text-muted-foreground hover:text-foreground transition-colors duration-500 ease-fluid">
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
            <h2 className="mb-4 px-3 text-xs font-bold uppercase tracking-widest text-muted-foreground/60">
              Legal & Support
            </h2>
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex items-center justify-between rounded-[1rem] px-4 py-3 text-sm font-bold tracking-wide transition-all duration-700 ease-fluid ${
                    isActive
                      ? "bg-primary/10 text-primary shadow-inner border border-primary/20"
                      : "text-muted-foreground hover:bg-white/5 hover:text-foreground hover:shadow-float border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon
                      className={`h-5 w-5 shrink-0 transition-transform duration-700 ease-fluid group-hover:scale-110 ${
                        isActive
                          ? "text-primary"
                          : "text-muted-foreground/60 group-hover:text-primary"
                      }`}
                    />
                    {item.label}
                  </div>
                  {isActive && <ChevronRight className="h-4 w-4 text-primary/50" />}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Content Area */}
        <main className="mt-8 flex-1 lg:mt-0">
          <div className="rounded-[2rem] border border-white/5 bg-card/50 p-6 shadow-glass backdrop-blur-xl sm:p-10 ring-1 ring-white/10 relative overflow-hidden">
            {/* Custom typography for standard HTML tags within the legal pages */}
            <article className="
              prose prose-slate max-w-none 
              dark:prose-invert prose-headings:text-foreground prose-p:text-muted-foreground 
              prose-a:text-primary prose-a:no-underline hover:prose-a:underline 
              prose-li:text-muted-foreground prose-strong:text-foreground
            ">
              {children}
            </article>
          </div>
        </main>
      </div>
      
      {/* Footer */}
      <footer className="mt-20 border-t border-white/5 bg-background/50 backdrop-blur-xl py-8">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm font-medium text-muted-foreground/60 sm:px-6 lg:px-8">
          © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
