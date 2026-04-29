import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db } from "./db";

// Generate a new session ID and save it to the user record.
// This invalidates any existing sessions on other devices.
async function rotateSessionId(userId: string): Promise<string> {
  const sessionId = crypto.randomUUID();
  await db.user.update({
    where: { id: userId },
    data: { activeSessionId: sessionId },
  });
  return sessionId;
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
    newUser: "/register",
    error: "/login",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
          include: {
            centre: { select: { id: true, name: true, slug: true } },
            studentPlan: { select: { planType: true, status: true, endDate: true } },
          },
        });

        if (!user) {
          throw new Error("No account found with this email");
        }

        if (!user.passwordHash) {
          throw new Error("Please sign in with Google");
        }

        if (!user.isActive) {
          throw new Error("Your account has been deactivated");
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isValid) {
          throw new Error("Invalid password");
        }

        // Rotate session ID - kicks out any other active session
        const sessionId = await rotateSessionId(user.id);

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar || undefined,
          centreId: user.centreId || undefined,
          centreName: user.centre?.name,
          centreSlug: user.centre?.slug,
          planType: user.studentPlan?.planType || "FREE",
          activeSessionId: sessionId,
        } as any;
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Handle Google OAuth — create user if not exists
      if (account?.provider === "google") {
        const existingUser = await db.user.findUnique({
          where: { email: user.email! },
        });

        if (!existingUser) {
          // Google login only — no auto-signup
          // User must register first via /register, then can use Google to login
          throw new Error("No account found with this email. Please register first.");

          /* UNCOMMENT to enable Google auto-signup later:
          const newUser = await db.user.create({
            data: {
              email: user.email!.toLowerCase().trim(),
              name: user.name || "User",
              avatar: user.image,
              emailVerified: new Date(),
              role: "STUDENT",
              oauthAccounts: {
                create: {
                  provider: "google",
                  providerAccountId: account.providerAccountId,
                  accessToken: account.access_token,
                  refreshToken: account.refresh_token,
                },
              },
              studentPlan: {
                create: { planType: "FREE" },
              },
            },
          });
          (user as any).id = newUser.id;
          (user as any).role = newUser.role;
          (user as any).planType = "FREE";
          */
        } else {
          // Link Google account if not linked
          const existingOAuth = await db.oAuthAccount.findUnique({
            where: {
              provider_providerAccountId: {
                provider: "google",
                providerAccountId: account.providerAccountId,
              },
            },
          });
          if (!existingOAuth) {
            await db.oAuthAccount.create({
              data: {
                provider: "google",
                providerAccountId: account.providerAccountId,
                accessToken: account.access_token,
                refreshToken: account.refresh_token,
                userId: existingUser.id,
              },
            });
          }

          // Fetch full user with centre + plan
          const fullUser = await db.user.findUnique({
            where: { id: existingUser.id },
            include: {
              centre: { select: { id: true, name: true, slug: true } },
              studentPlan: { select: { planType: true } },
            },
          });

          // Rotate session ID — kicks out any other active session
          const sessionId = await rotateSessionId(fullUser!.id);

          (user as any).id = fullUser!.id;
          (user as any).role = fullUser!.role;
          (user as any).centreId = fullUser!.centreId || undefined;
          (user as any).centreName = fullUser!.centre?.name;
          (user as any).centreSlug = fullUser!.centre?.slug;
          (user as any).planType = fullUser!.studentPlan?.planType || "FREE";
          (user as any).activeSessionId = sessionId;
        }
      }
      return true;
    },

    async jwt({ token, user, trigger, session }) {
      if (user) {
        // Initial sign-in — capture everything including sessionId
        token.id = user.id;
        token.role = (user as any).role;
        token.centreId = (user as any).centreId;
        token.centreName = (user as any).centreName;
        token.centreSlug = (user as any).centreSlug;
        token.planType = (user as any).planType || "FREE";
        token.activeSessionId = (user as any).activeSessionId;
      } else if (token.id) {
        // Subsequent request — validate the session is still active.
        // Only re-check DB every 60s to avoid hitting it on every API call.
        const now = Math.floor(Date.now() / 1000);
        const lastChecked = (token as any).lastSessionCheck || 0;
        const SESSION_CHECK_INTERVAL = 60; // seconds

        if (now - lastChecked > SESSION_CHECK_INTERVAL) {
          const dbUser = await db.user.findUnique({
            where: { id: token.id as string },
            select: { activeSessionId: true, centreId: true },
          });

          // Session invalidated — user logged in from another device
          if (
            !dbUser ||
            (dbUser.activeSessionId && dbUser.activeSessionId !== token.activeSessionId)
          ) {
            (token as any).sessionInvalid = true;
          } else {
            (token as any).lastSessionCheck = now;
          }
        }
      }

      // Backfill missing centre info for existing sessions
      if (token.id && token.centreId && (!token.centreSlug || !token.centreName)) {
        const centre = await db.centre.findUnique({
          where: { id: token.centreId as string },
          select: { name: true, slug: true },
        });
        if (centre) {
          token.centreName = centre.name;
          token.centreSlug = centre.slug;
        }
      }

      // Handle session update (e.g., after plan upgrade)
      if (trigger === "update" && session) {
        token.planType = session.planType || token.planType;
        token.centreId = session.centreId || token.centreId;
      }

      return token;
    },

    async session({ session, token }) {
      // Session was invalidated by login on another device
      if ((token as any).sessionInvalid) {
        return { ...session, user: undefined as any, expires: "1970-01-01T00:00:00.000Z" };
      }
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).centreId = token.centreId;
        (session.user as any).centreName = token.centreName;
        (session.user as any).centreSlug = token.centreSlug;
        (session.user as any).planType = token.planType;
      }
      return session;
    },
  },
};
