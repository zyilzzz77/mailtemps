import type { MetadataRoute } from "next";

import { allPublicPages } from "@/lib/seo-content";

const BASE_URL = "https://mailtemps.space";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${BASE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${BASE_URL}/guides`, changeFrequency: "monthly", priority: 0.75 },
    ...allPublicPages.map((page) => ({
      url: `${BASE_URL}${page.path}`,
      changeFrequency: "monthly" as const,
      priority: page.path.startsWith("/guides/") ? 0.8 : page.path.startsWith("/compare/") ? 0.7 : 0.5,
    })),
  ];
}
