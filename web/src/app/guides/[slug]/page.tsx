import type { Metadata } from "next";
import { notFound } from "next/navigation";

import ContentPage from "@/components/content-page";
import { guidePages } from "@/lib/seo-content";
import { buildPageMetadata } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(guidePages).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = guidePages[(await params).slug];
  return page ? buildPageMetadata(page) : {};
}

export default async function GuidePage({ params }: Props) {
  const page = guidePages[(await params).slug];
  if (!page) notFound();
  return <ContentPage page={page} />;
}
