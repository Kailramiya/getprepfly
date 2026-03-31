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
    // Year 1: Everything free for all users
    isPremium: true,
    updateSession: update,
  };
}
