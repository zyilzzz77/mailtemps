import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { ContentFooter, ContentHeader } from "@/components/content-page";
import { comparisonPages, guidePages } from "@/lib/seo-content";

export const metadata: Metadata = {
  title: "Temporary email guides",
  description: "Clear, practical guides to temp mail, disposable email, inbox safety, spam protection, and authorized email-flow testing.",
  alternates: { canonical: "/guides" },
};

export default function GuidesIndex() {
  const pages = [...Object.values(guidePages), ...Object.values(comparisonPages)];
  return (
    <div className="content-shell">
      <ContentHeader />
      <main className="guide-index">
        <header><p className="eyebrow">MailTemps knowledge base</p><h1>Temporary email, explained clearly.</h1><p>Practical, answer-first guidance for choosing and using disposable inboxes without overstating their privacy or security.</p></header>
        <section aria-label="All temporary email guides">
          {pages.map((page) => (
            <Link className="guide-card" href={page.path} key={page.path}>
              <small>{page.eyebrow}</small><h2>{page.title}</h2><p>{page.description}</p><span>Read guide <ArrowRight aria-hidden="true" /></span>
            </Link>
          ))}
        </section>
      </main>
      <ContentFooter />
    </div>
  );
}
