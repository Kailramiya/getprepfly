"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { Footer } from "@/components/layout/footer";
import { TrialBanner } from "@/components/layout/trial-banner";
import { AppInstallPrompt } from "@/components/app-install-prompt";
import { SessionWatcher } from "@/components/session-watcher";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-[100dvh] bg-background">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed left-0 top-0 z-50 lg:hidden">
            <Sidebar onNavClick={() => setMobileMenuOpen(false)} />
          </div>
        </>
      )}

      {/* Main content */}
      <div className="transition-all duration-500 ease-fluid lg:pl-[280px]">
        <Topbar onMenuClick={() => setMobileMenuOpen(!mobileMenuOpen)} />
        <TrialBanner />
        <main className="p-4 sm:p-6 lg:p-12 xl:p-16 2xl:px-24 2xl:py-20">{children}</main>
        <Footer />
      </div>

      {/* PWA / App Install Prompt — shows on mobile after 5 seconds */}
      <AppInstallPrompt />

      {/* Watch for session invalidation from another device login */}
      <SessionWatcher />
    </div>
  );
}
