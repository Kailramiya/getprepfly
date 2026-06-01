import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/download", "/login", "/register"],
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
          "/pricing",
          "/feedback",
          "/my-flags",
          "/api",
        ],
      },
    ],
    sitemap: "https://getprepfly.com/sitemap.xml",
  };
}
