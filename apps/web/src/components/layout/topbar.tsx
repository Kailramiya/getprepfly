"use client";

import { useAuth } from "@/hooks/use-auth";
import { signOut } from "next-auth/react";
import { Bell, LogOut, Menu, Sparkles, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface TopbarProps {
  onMenuClick?: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { user } = useAuth();

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
        {/* Free Beta Badge */}
        <Badge className="gap-1 bg-gradient-to-r from-teal-500 to-indigo-500 text-white">
          <Sparkles className="h-3 w-3" />
          Free Beta
        </Badge>

        {/* Feedback button */}
        <Link href="/feedback">
          <button className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50">
            <MessageSquare className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Feedback</span>
          </button>
        </Link>

        {/* Notifications */}
        <button className="relative rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
          <Bell className="h-5 w-5" />
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
