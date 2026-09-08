import type { MetadataRoute } from "next";

const privatePaths = ["/api/", "/admin/", "/inbox/", "/message/", "/auth/"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: privatePaths },
      { userAgent: "OAI-SearchBot", allow: "/", disallow: privatePaths },
      { userAgent: "PerplexityBot", allow: "/", disallow: privatePaths },
      { userAgent: "Claude-SearchBot", allow: "/", disallow: privatePaths },
      { userAgent: "Claude-User", allow: "/", disallow: privatePaths },
    ],
    sitemap: "https://mailtemps.space/sitemap.xml",
    host: "https://mailtemps.space",
  };
}
