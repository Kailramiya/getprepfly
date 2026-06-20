import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/download", "/login", "/register", "/pricing", "/contact", "/terms", "/privacy"],
        disallow: [
          "/dashboard",
          "/practice",
          "/mock-test",
          "/progress",
          "/settings",
          "/admin",
          "/super-admin",
          "/study-guides",
          "/vocabulary",
          "/feedback",
          "/my-flags",
          "/api",
        ],
      },
    ],
    sitemap: "https://getprepfly.com/sitemap.xml",
    host: "https://getprepfly.com",
  };
}
