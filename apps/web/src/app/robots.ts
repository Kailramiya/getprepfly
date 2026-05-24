import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/download", "/login", "/register"],
        disallow: ["/dashboard/", "/api/", "/admin/"],
      },
    ],
    sitemap: "https://getprepfly.com/sitemap.xml",
  };
}
