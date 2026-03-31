"use client";

import { useAuth } from "@/hooks/use-auth";
import { signOut } from "next-auth/react";
import { Bell, LogOut, Menu, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface TopbarProps {
  onMenuClick?: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { user, isPremium } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white/80 px-4 backdrop-blur-md sm:px-6">
      {/* Left — mobile menu + page context */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-md p-2 text-gray-400 hover:bg-gray-100 lg:hidden"
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
        {/* Plan badge */}
        {!isPremium ? (
          <Link href="/settings">
            <Button variant="outline" size="sm" className="gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50">
              <Crown className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Upgrade to VIP</span>
            </Button>
          </Link>
        ) : (
          <Badge variant="success" className="gap-1">
            <Crown className="h-3 w-3" />
            VIP
          </Badge>
        )}

        {/* Notifications */}
        <button className="relative rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
        </button>

        {/* User avatar + logout */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-600">
            {user?.name?.charAt(0)?.toUpperCase() || "U"}
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            title="Log out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
