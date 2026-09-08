import type { Metadata } from "next";

import type { SeoContentPage } from "@/lib/seo-content";

const SOCIAL_IMAGE = {
  url: "/logo-mailtemps.webp",
  width: 512,
  height: 512,
  alt: "MailTemps temporary email logo",
};

export function buildPageMetadata(page: SeoContentPage): Metadata {
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: page.path },
    robots: { index: true, follow: true },
    openGraph: {
      type: "article",
      url: page.path,
      siteName: "MailTemps",
      title: page.title,
      description: page.description,
      images: [SOCIAL_IMAGE],
    },
    twitter: {
      card: "summary",
      title: page.title,
      description: page.description,
      images: [SOCIAL_IMAGE.url],
    },
  };
}
