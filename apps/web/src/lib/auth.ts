import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { db } from "./db";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: "__Secure-next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax" as const,
        path: "/",
        secure: true,
        domain: ".getprepfly.com",
        maxAge: 30 * 24 * 60 * 60,
      },
    },
    callbackUrl: {
      name: "__Secure-next-auth.callback-url",
      options: {
        httpOnly: false,
        sameSite: "lax" as const,
        path: "/",
        secure: true,
        domain: ".getprepfly.com",
        maxAge: 30 * 24 * 60 * 60,
      },
    },
    csrfToken: {
      name: "__Host-next-auth.csrf-token",
      options: {
        httpOnly: true,
        sameSite: "lax" as const,
        path: "/",
        secure: true,
      },
    },
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
          (user as any).id = existingUser.id;
          (user as any).role = existingUser.role;
          (user as any).centreId = existingUser.centreId;
        }
      }
      return true;
    },

    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.centreId = (user as any).centreId;
        token.centreName = (user as any).centreName;
        token.centreSlug = (user as any).centreSlug;
        token.planType = (user as any).planType || "FREE";
      }

      // Handle session update (e.g., after plan upgrade)
      if (trigger === "update" && session) {
        token.planType = session.planType || token.planType;
        token.centreId = session.centreId || token.centreId;
      }

      return token;
    },

    async session({ session, token }) {
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
