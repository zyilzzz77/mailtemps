import type { Metadata } from "next";
import { notFound } from "next/navigation";

import ContentPage from "@/components/content-page";
import { trustPages } from "@/lib/seo-content";
import { buildPageMetadata } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(trustPages).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = trustPages[(await params).slug];
  return page ? buildPageMetadata(page) : {};
}

export default async function TrustPage({ params }: Props) {
  const page = trustPages[(await params).slug];
  if (!page) notFound();
  return <ContentPage page={page} />;
}
