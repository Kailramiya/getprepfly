"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { signOut } from "next-auth/react";
import { LogOut, Menu, Sparkles, MessageSquare, User, Settings, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useConfirm } from "@/components/ui/confirm-dialog";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

interface TopbarProps {
  onMenuClick?: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { user } = useAuth();
  const confirm = useConfirm();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    const ok = await confirm({
      title: "Log out?",
      description: "You'll be signed out of your account on this device.",
      confirmLabel: "Log out",
      cancelLabel: "Stay",
      variant: "warning",
    });
    if (ok) signOut({ callbackUrl: "/login" });
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 px-4 backdrop-blur-md sm:px-6">
      {/* Left — mobile menu + centre name */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          aria-label="Open menu"
          className="rounded-md p-2 text-gray-500 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        {user?.centreName && (
          <Badge variant="secondary" className="hidden sm:inline-flex">
            {user.centreName}
          </Badge>
        )}
      </div>

      {/* Right — actions */}
      <div className="flex items-center gap-3">
        {/* Free Beta Badge */}
        <Badge className="gap-1 bg-gradient-to-r from-teal-500 to-indigo-500 text-white hidden sm:inline-flex">
          <Sparkles className="h-3 w-3" />
          Free Beta
        </Badge>

        <ThemeToggle />

        {/* Feedback */}
        <Link href="/feedback">
          <button className="flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-slate-300 transition hover:bg-gray-50 dark:hover:bg-slate-800">
            <MessageSquare className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Feedback</span>
          </button>
        </Link>

        {/* Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            aria-label="Account menu"
            aria-expanded={dropdownOpen}
            className="flex items-center gap-2 rounded-lg p-1.5 transition hover:bg-gray-100 dark:hover:bg-slate-800"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-indigo-600 text-sm font-bold text-white">
              {user?.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div className="hidden text-left sm:block">
              <p className="text-sm font-medium text-gray-900 dark:text-slate-100 leading-tight">{user?.name}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400 leading-tight">{user?.role?.replace(/_/g, " ")}</p>
            </div>
            <ChevronDown className={`h-4 w-4 text-gray-400 dark:text-slate-400 transition ${dropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg">
              {/* User info */}
              <div className="border-b border-gray-100 dark:border-slate-700 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-indigo-600 text-base font-bold text-white">
                    {user?.name?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900 dark:text-slate-100">{user?.name}</p>
                    <p className="truncate text-xs text-gray-500 dark:text-slate-400">{user?.email}</p>
                  </div>
                </div>
                {user?.centreName && (
                  <p className="mt-2 truncate text-xs text-teal-600 dark:text-teal-400">{user.centreName}</p>
                )}
              </div>

              {/* Menu items */}
              <div className="py-1">
                <Link href="/settings" onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-slate-300 transition hover:bg-gray-50 dark:hover:bg-slate-700">
                  <User className="h-4 w-4 text-gray-400 dark:text-slate-500" />
                  Profile & Settings
                </Link>
                <Link href="/settings" onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-slate-300 transition hover:bg-gray-50 dark:hover:bg-slate-700">
                  <Settings className="h-4 w-4 text-gray-400 dark:text-slate-500" />
                  {user?.role === "CENTRE_ADMIN" ? "Centre Branding" : "Preferences"}
                </Link>
                <Link href="/feedback" onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-slate-300 transition hover:bg-gray-50 dark:hover:bg-slate-700">
                  <MessageSquare className="h-4 w-4 text-gray-400 dark:text-slate-500" />
                  Send Feedback
                </Link>
              </div>

              {/* Logout */}
              <div className="border-t border-gray-100 dark:border-slate-700 py-1">
                <button onClick={handleLogout}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 transition hover:bg-red-50 dark:hover:bg-red-900/20">
                  <LogOut className="h-4 w-4" />
                  Log Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
