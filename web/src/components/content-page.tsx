import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Clock3, ShieldCheck } from "lucide-react";

import type { SeoContentPage } from "@/lib/seo-content";
import { getPageByPath } from "@/lib/seo-content";

function titleForPath(path: string) {
  if (path === "/") return "Free temp mail";
  return getPageByPath(path)?.title ?? path.split("/").filter(Boolean).at(-1)?.replaceAll("-", " ") ?? "MailTemps";
}

export function ContentHeader() {
  return (
    <header className="content-header">
      <Link className="brand" href="/" aria-label="MailTemps home">
        <span className="brand-mark" aria-hidden="true">
          <Image src="/logo-mailtemps.webp" alt="" width={38} height={38} loading="eager" />
        </span>
        <span>MailTemps</span>
      </Link>
      <nav aria-label="Main navigation">
        <Link href="/#generator">Create inbox</Link>
        <Link href="/guides">Guides</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/about">About</Link>
      </nav>
    </header>
  );
}

export function ContentFooter() {
  return (
    <footer className="content-footer">
      <div>
        <strong>MailTemps</strong>
        <p>Receive-only temporary email for low-risk verification and authorized testing.</p>
      </div>
      <nav aria-label="Trust and policy links">
        <Link href="/about">About</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/acceptable-use">Acceptable use</Link>
        <Link href="/abuse">Abuse</Link>
        <Link href="/contact">Contact</Link>
      </nav>
    </footer>
  );
}

export default function ContentPage({ page }: { page: SeoContentPage }) {
  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": `https://mailtemps.space${page.path}#webpage`,
      url: `https://mailtemps.space${page.path}`,
      name: page.title,
      description: page.description,
      isPartOf: { "@id": "https://mailtemps.space/#website" },
      publisher: { "@id": "https://mailtemps.space/#organization" },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "MailTemps", item: "https://mailtemps.space/" },
        { "@type": "ListItem", position: 2, name: page.title, item: `https://mailtemps.space${page.path}` },
      ],
    },
  ];

  return (
    <div className="content-shell">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }}
      />
      <ContentHeader />
      <main className="article-main">
        <Link className="back-link" href="/"><ArrowLeft aria-hidden="true" /> Back to temp mail</Link>
        <header className="article-hero">
          <p className="eyebrow">{page.eyebrow}</p>
          <h1>{page.title}</h1>
          <p className="article-description">{page.description}</p>
        </header>

        <section className="answer-card" aria-labelledby="quick-answer-title">
          <span aria-hidden="true"><Check /></span>
          <div><h2 id="quick-answer-title">Quick answer</h2><p>{page.quickAnswer}</p></div>
        </section>

        <section className="fact-strip" aria-label="Key facts">
          {page.facts.map((fact, index) => (
            <div key={fact}>{index % 2 === 0 ? <Clock3 aria-hidden="true" /> : <ShieldCheck aria-hidden="true" />}<span>{fact}</span></div>
          ))}
        </section>

        <article className="article-body">
          {page.sections.map((section) => (
            <section key={section.heading}>
              <h2>{section.heading}</h2>
              {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              {section.bullets ? <ul>{section.bullets.map((item) => <li key={item}>{item}</li>)}</ul> : null}
            </section>
          ))}
        </article>

        <aside className="related-guides" aria-labelledby="related-title">
          <p className="eyebrow">Continue reading</p>
          <h2 id="related-title">Related MailTemps guides</h2>
          <div>
            {page.related.map((path) => (
              <Link href={path} key={path}><span>{titleForPath(path)}</span><ArrowRight aria-hidden="true" /></Link>
            ))}
          </div>
        </aside>
      </main>
      <ContentFooter />
    </div>
  );
}
