"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";
import {
  LayoutDashboard,
  Mic,
  PenTool,
  BookOpen,
  Headphones,
  ClipboardList,

  BarChart3,
  GraduationCap,
  BookMarked,
  Settings,
  Users,
  Building2,
  Database,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Megaphone,
  AlertTriangle,
  Flag,
  IndianRupee,
  Trophy,
} from "lucide-react";
import { useState } from "react";
import { useDarkMode } from "@/hooks/use-dark-mode";
import { Moon, Sun } from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: any;
  roles?: string[];
}

const studentNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Speaking", href: "/practice/speaking", icon: Mic },
  { label: "Writing", href: "/practice/writing", icon: PenTool },
  { label: "Reading", href: "/practice/reading", icon: BookOpen },
  { label: "Listening", href: "/practice/listening", icon: Headphones },
  { label: "Mock Test", href: "/mock-test", icon: ClipboardList },
  { label: "My Flagged", href: "/my-flags", icon: Flag },
  { label: "Progress", href: "/progress", icon: BarChart3 },
  { label: "Leaderboard", href: "/leaderboard", icon: Trophy },
  { label: "Study Guides", href: "/study-guides", icon: GraduationCap },
  { label: "Vocabulary", href: "/vocabulary", icon: BookMarked },
  { label: "Upgrade", href: "/pricing", icon: CreditCard },
];

const centreAdminNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Students", href: "/admin/students", icon: Users },
  { label: "Batches", href: "/admin/batches", icon: Building2 },
  { label: "Questions", href: "/admin/questions", icon: Database },
  { label: "Mock Tests", href: "/mock-test", icon: ClipboardList },
  { label: "Templates", href: "/admin/templates", icon: BookOpen },
  { label: "Vocabulary", href: "/admin/vocabulary", icon: BookMarked },
  { label: "Teachers", href: "/admin/teachers", icon: GraduationCap },
  { label: "Centre Profile", href: "/admin/profile", icon: Building2 },
  { label: "Announcements", href: "/admin/announcements", icon: Megaphone },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
  { label: "Billing", href: "/admin/settings", icon: CreditCard },
];

const superAdminNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Centres", href: "/super-admin/centres", icon: Building2 },
  { label: "Users", href: "/super-admin/users", icon: Users },
  { label: "Questions", href: "/super-admin/questions", icon: Database },
  { label: "Vocabulary", href: "/super-admin/vocabulary", icon: BookMarked },
  { label: "Mock Tests", href: "/super-admin/mock-tests", icon: ClipboardList },
  { label: "Reports", href: "/super-admin/reports", icon: AlertTriangle },
  { label: "Coupons", href: "/super-admin/coupons", icon: CreditCard },
  { label: "Pricing", href: "/super-admin/pricing", icon: IndianRupee },
  { label: "Analytics", href: "/super-admin/analytics", icon: BarChart3 },
];


interface SidebarProps {
  onNavClick?: () => void;
}

export function Sidebar({ onNavClick }: SidebarProps) {
  const pathname = usePathname();
  const { user, isCentreAdmin, isSuperAdmin } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const { isDark, toggle } = useDarkMode();

  let navItems = studentNav;
  if (isSuperAdmin) navItems = superAdminNav;
  else if (isCentreAdmin) navItems = centreAdminNav;

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 transition-all duration-300",
        collapsed ? "w-[68px]" : "w-64"
      )}
    >
      {/* Logo */}
      <div className={cn(
        "flex h-16 items-center border-b border-gray-200 dark:border-slate-700 bg-slate-900 px-4",
        collapsed ? "justify-center" : "justify-between"
      )}>
        {!collapsed && (
          <Link href="/dashboard" className="overflow-hidden">
            <Logo size="sm" showText />
          </Link>
        )}
        {collapsed && (
          <Link href="/dashboard">
            <Logo size="sm" showText={false} />
          </Link>
        )}
        {!collapsed && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden rounded-md p-1 text-slate-400 hover:bg-slate-700 hover:text-slate-100 lg:block"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavClick}
                  className={cn(
                    "flex items-center rounded-lg py-2.5 text-sm font-medium transition-colors",
                    collapsed ? "justify-center px-2" : "gap-3 px-3",
                    isActive
                      ? "bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300"
                      : "text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-slate-100"
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon
                    className={cn(
                      "h-5 w-5 shrink-0",
                      isActive ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400 dark:text-slate-500"
                    )}
                  />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Expand button at bottom of nav when collapsed */}
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="mt-3 flex w-full items-center justify-center rounded-lg py-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-600 dark:hover:text-slate-300"
            title="Expand sidebar"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </nav>

      {/* User info + Settings */}
      <div className="border-t border-gray-200 dark:border-slate-700 p-2">
        <Link
          href="/settings"
          onClick={onNavClick}
          className={cn(
            "flex items-center rounded-lg py-2.5 text-sm font-medium text-gray-600 dark:text-slate-400 transition-colors hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-slate-100",
            collapsed ? "justify-center px-2" : "gap-3 px-3"
          )}
          title={collapsed ? "Settings" : undefined}
        >
          <Settings className="h-5 w-5 shrink-0 text-gray-400 dark:text-slate-500" />
          {!collapsed && <span>Settings</span>}
        </Link>

        <button
          onClick={toggle}
          className={cn(
            "flex w-full items-center rounded-lg py-2.5 text-sm font-medium text-gray-600 dark:text-slate-400 transition-colors hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-slate-100",
            collapsed ? "justify-center px-2" : "gap-3 px-3"
          )}
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDark ? <Sun className="h-5 w-5 shrink-0 text-amber-400" /> : <Moon className="h-5 w-5 shrink-0 text-gray-400" />}
          {!collapsed && <span>{isDark ? "Light Mode" : "Dark Mode"}</span>}
        </button>

        {!collapsed && user && (
          <div className="mt-2 flex items-center gap-3 rounded-lg bg-gray-50 dark:bg-slate-800 px-3 py-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900 text-sm font-bold text-indigo-600 dark:text-indigo-300">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-900 dark:text-slate-100">{user.name}</p>
              <p className="truncate text-xs text-gray-500 dark:text-slate-400">{user.email}</p>
            </div>
          </div>
        )}

      </div>
    </aside>
  );
}
