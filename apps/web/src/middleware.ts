import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Super admin routes
    if (path.startsWith("/super-admin") && token?.role !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Centre admin routes
    if (path.startsWith("/admin") && !["SUPER_ADMIN", "CENTRE_ADMIN"].includes(token?.role || "")) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/practice/:path*",
    "/mock-test/:path*",
    "/progress/:path*",
    "/settings/:path*",
    "/admin/:path*",
    "/super-admin/:path*",
    "/study-guides/:path*",
    "/vocabulary/:path*",
  ],
};
