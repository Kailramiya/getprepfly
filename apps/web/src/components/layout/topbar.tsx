"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { signOut } from "next-auth/react";
import { LogOut, Menu, Sparkles, MessageSquare, User, Settings, ChevronDown, Share } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

interface TopbarProps {
  onMenuClick?: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { user } = useAuth();
  const confirm = useConfirm();
  const { toast } = useToast();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleShare = async () => {
    const shareData = {
      title: "PrepFly — AI-Powered PTE Practice Platform",
      text: "Check out PrepFly for AI-powered PTE speaking, writing, reading, and listening practice with instant feedback! Free during beta.",
      url: window.location.origin,
    };
    
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        toast("success", "Share link has been copied to your clipboard.");
      }
    } catch (err) {
      console.error("Share failed:", err);
    }
  };

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
    <header className="sticky top-6 z-30 mx-4 sm:mx-6 lg:mx-8 flex h-14 items-center justify-between rounded-full border border-white/10 bg-background/70 px-4 backdrop-blur-2xl shadow-glass dark:shadow-glass-dark transition-all duration-500 ease-fluid">
      {/* Left — mobile menu + centre name */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          aria-label="Open menu"
          className="rounded-md p-2 text-muted-foreground hover:bg-muted lg:hidden"
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
          <button className="flex items-center gap-1.5 rounded-full bg-white/5 border border-white/5 px-4 py-1.5 text-xs font-semibold tracking-wide text-muted-foreground transition-all duration-500 ease-fluid hover:bg-white/10 hover:text-foreground hover:shadow-glass active:scale-[0.98]">
            <MessageSquare className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Feedback</span>
          </button>
        </Link>

        {/* Share */}
        <button 
          onClick={handleShare}
          className="flex items-center gap-1.5 rounded-full bg-white/5 border border-white/5 px-4 py-1.5 text-xs font-semibold tracking-wide text-muted-foreground transition-all duration-500 ease-fluid hover:bg-white/10 hover:text-foreground hover:shadow-glass active:scale-[0.98]"
        >
          <Share className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Share</span>
        </button>

        {/* Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            aria-label="Account menu"
            aria-expanded={dropdownOpen}
            className="flex items-center gap-2 rounded-full p-1 transition-all duration-500 ease-fluid hover:bg-white/5 hover:shadow-glass active:scale-[0.98]"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-indigo-600 text-sm font-bold text-white shadow-inner">
              {user?.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div className="hidden text-left sm:block pr-1">
              <p className="text-sm font-semibold text-foreground leading-tight tracking-tight">{user?.name}</p>
              <p className="text-xs text-muted-foreground leading-tight">{user?.role?.replace(/_/g, " ")}</p>
            </div>
            <ChevronDown className={`h-4 w-4 mr-2 text-muted-foreground transition-transform duration-500 ease-fluid ${dropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-lg">
              {/* User info */}
              <div className="border-b border-border px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-indigo-600 text-base font-bold text-white">
                    {user?.name?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{user?.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                </div>
                {user?.centreName && (
                  <p className="mt-2 truncate text-xs text-teal-600 dark:text-teal-400">{user.centreName}</p>
                )}
              </div>

              {/* Menu items */}
              <div className="py-1">
                <Link href="/settings" onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground transition hover:bg-muted">
                  <User className="h-4 w-4 text-muted-foreground" />
                  Profile & Settings
                </Link>
                <Link href="/settings" onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground transition hover:bg-muted">
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  {user?.role === "CENTRE_ADMIN" ? "Centre Branding" : "Preferences"}
                </Link>
                <Link href="/feedback" onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground transition hover:bg-muted">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  Send Feedback
                </Link>
              </div>

              {/* Logout */}
              <div className="border-t border-border py-1">
                <button onClick={handleLogout}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-destructive transition hover:bg-destructive/10">
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
