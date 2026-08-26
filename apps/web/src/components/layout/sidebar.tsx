"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";
import {
  LayoutDashboard,
  Activity,
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
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
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
  { label: "Practice Tracker", href: "/super-admin/practice-tracker", icon: Activity },
];


interface SidebarProps {
  onNavClick?: () => void;
}

export function Sidebar({ onNavClick }: SidebarProps) {
  const pathname = usePathname();
  const { user, isCentreAdmin, isSuperAdmin } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const isDark = theme === "dark";
  const toggle = () => setTheme(isDark ? "light" : "dark");

  let navItems = studentNav;
  if (isSuperAdmin) navItems = superAdminNav;
  else if (isCentreAdmin) navItems = centreAdminNav;

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-white/5 bg-background/80 backdrop-blur-2xl transition-all duration-500 ease-fluid shadow-[1px_0_15px_rgba(0,0,0,0.03)] dark:shadow-[1px_0_15px_rgba(0,0,0,0.2)]",
        collapsed ? "w-[68px]" : "w-[280px]"
      )}
    >
      {/* Logo */}
      <div className={cn(
        "flex h-16 items-center border-b border-border px-4",
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
            className="hidden rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground lg:block"
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
                    "group flex items-center rounded-full py-3 text-sm font-semibold tracking-wide transition-all duration-500 ease-fluid hover:pl-5 hover:pr-1 hover:shadow-glass hover:bg-muted/80 hover:text-foreground dark:hover:bg-white/5",
                    collapsed ? "justify-center px-2 hover:pl-2 hover:pr-2" : "gap-3 px-4",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-glass dark:shadow-glass-dark"
                      : "text-muted-foreground"
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon
                    className={cn(
                      "h-[18px] w-[18px] shrink-0 transition-transform duration-500 ease-fluid group-hover:scale-110",
                      isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
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
            className="mt-3 flex w-full items-center justify-center rounded-lg py-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            title="Expand sidebar"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </nav>

      {/* User info + Settings */}
      <div className="border-t border-border p-2">
        <Link
          href="/settings"
          onClick={onNavClick}
          className={cn(
            "group flex items-center rounded-full py-3 text-sm font-semibold tracking-wide text-muted-foreground transition-all duration-500 ease-fluid hover:pl-5 hover:pr-1 hover:shadow-glass hover:bg-muted/80 dark:hover:bg-white/5",
            collapsed ? "justify-center px-2 hover:pl-2 hover:pr-2" : "gap-3 px-4"
          )}
          title={collapsed ? "Settings" : undefined}
        >
          <Settings className="h-[18px] w-[18px] shrink-0 text-muted-foreground transition-transform duration-500 ease-fluid group-hover:scale-110 group-hover:text-foreground" />
          {!collapsed && <span>Settings</span>}
        </Link>

        <button
          onClick={toggle}
          className={cn(
            "group mt-1 flex w-full items-center rounded-full py-3 text-sm font-semibold tracking-wide text-muted-foreground transition-all duration-500 ease-fluid hover:pl-5 hover:pr-1 hover:shadow-glass hover:bg-muted/80 dark:hover:bg-white/5",
            collapsed ? "justify-center px-2 hover:pl-2 hover:pr-2" : "gap-3 px-4"
          )}
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {!mounted ? (
            <Moon className="h-[18px] w-[18px] shrink-0 text-muted-foreground" />
          ) : isDark ? (
            <Sun className="h-[18px] w-[18px] shrink-0 text-yellow-500 transition-transform duration-500 ease-fluid group-hover:scale-110" />
          ) : (
            <Moon className="h-[18px] w-[18px] shrink-0 text-muted-foreground transition-transform duration-500 ease-fluid group-hover:scale-110 group-hover:text-foreground" />
          )}
          {!collapsed && <span>{isDark ? "Light Mode" : "Dark Mode"}</span>}
        </button>

        {!collapsed && user && (
          <div className="mt-2 flex items-center gap-3 rounded-lg bg-muted px-3 py-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground" title="">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground" title="">{user.email}</p>
            </div>
          </div>
        )}

      </div>
    </aside>
  );
}
