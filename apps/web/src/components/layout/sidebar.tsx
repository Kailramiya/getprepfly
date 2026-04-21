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
} from "lucide-react";
import { useState } from "react";

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
  { label: "Progress", href: "/progress", icon: BarChart3 },
  { label: "Study Guides", href: "/study-guides", icon: GraduationCap },
  { label: "Vocabulary", href: "/vocabulary", icon: BookMarked },
  { label: "Upgrade", href: "/pricing", icon: CreditCard },
];

const centreAdminNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Students", href: "/admin/students", icon: Users },
  { label: "Batches", href: "/admin/batches", icon: Building2 },
  { label: "Questions", href: "/admin/questions", icon: Database },
  { label: "Templates", href: "/admin/templates", icon: BookOpen },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
  { label: "Billing", href: "/admin/settings", icon: CreditCard },
];

const superAdminNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Centres", href: "/super-admin/centres", icon: Building2 },
  { label: "Users", href: "/super-admin/users", icon: Users },
  { label: "Questions", href: "/super-admin/questions", icon: Database },
  { label: "Analytics", href: "/super-admin/analytics", icon: BarChart3 },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, isCentreAdmin, isSuperAdmin } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  let navItems = studentNav;
  if (isSuperAdmin) navItems = superAdminNav;
  else if (isCentreAdmin) navItems = centreAdminNav;

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-gray-200 bg-white transition-all duration-300",
        collapsed ? "w-[68px]" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4">
        <Link href="/dashboard" className="overflow-hidden">
          <Logo size="sm" showText={!collapsed} />
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 lg:block"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon
                    className={cn(
                      "h-5 w-5 shrink-0",
                      isActive ? "text-indigo-600" : "text-gray-400"
                    )}
                  />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User info + Settings */}
      <div className="border-t border-gray-200 p-3">
        <Link
          href="/settings"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
        >
          <Settings className="h-5 w-5 shrink-0 text-gray-400" />
          {!collapsed && <span>Settings</span>}
        </Link>

        {!collapsed && user && (
          <div className="mt-2 flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-600">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-900">{user.name}</p>
              <p className="truncate text-xs text-gray-500">{user.email}</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
