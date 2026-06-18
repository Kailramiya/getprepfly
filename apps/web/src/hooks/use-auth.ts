"use client";

import { useSession } from "next-auth/react";

export function useAuth() {
  const { data: session, status, update } = useSession();

  return {
    user: session?.user
      ? {
          id: session.user.id,
          name: session.user.name || "",
          email: session.user.email || "",
          image: session.user.image,
          role: session.user.role,
          centreId: session.user.centreId,
          centreName: session.user.centreName,
          centreSlug: session.user.centreSlug,
          planType: session.user.planType,
        }
      : null,
    isLoading: status === "loading",
    isAuthenticated: status === "authenticated",
    isStudent: session?.user?.role === "STUDENT",
    isTeacher: session?.user?.role === "TEACHER",
    isCentreAdmin: session?.user?.role === "CENTRE_ADMIN",
    isSuperAdmin: session?.user?.role === "SUPER_ADMIN",
    // Rough client-side hint only. The authoritative entitlement check is the
    // server's getUserAccess (exposed via GET /api/access/me) — gate features on
    // that, not on this flag.
    isPremium:
      session?.user?.role === "SUPER_ADMIN" ||
      (!!session?.user?.planType && session.user.planType !== "FREE"),
    updateSession: update,
  };
}
