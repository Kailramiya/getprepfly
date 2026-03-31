import { DefaultSession, DefaultUser } from "next-auth";
import { DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "SUPER_ADMIN" | "CENTRE_ADMIN" | "TEACHER" | "STUDENT";
      centreId?: string;
      centreName?: string;
      centreSlug?: string;
      planType: "FREE" | "VIP_30" | "VIP_90" | "VIP_180";
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    role: "SUPER_ADMIN" | "CENTRE_ADMIN" | "TEACHER" | "STUDENT";
    centreId?: string;
    centreName?: string;
    centreSlug?: string;
    planType: "FREE" | "VIP_30" | "VIP_90" | "VIP_180";
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    role: "SUPER_ADMIN" | "CENTRE_ADMIN" | "TEACHER" | "STUDENT";
    centreId?: string;
    centreName?: string;
    centreSlug?: string;
    planType: "FREE" | "VIP_30" | "VIP_90" | "VIP_180";
  }
}
