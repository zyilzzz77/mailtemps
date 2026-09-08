# MailTemps.space — SEO + GEO Optimization Plan

> Goal: Make `mailtemps.space` highly crawlable, indexable, and competitive for search queries such as:
> `temp mail`, `temporary email`, `disposable email`, `temp email`, `mailtemp`, `10 minute mail`, `burner email`, `throwaway email`, and Indonesian variations such as `email sementara`.

---

# 1. Primary Objectives

## SEO Objectives

- Ensure Google can crawl and index all public SEO pages.
- Rank the homepage for high-intent keywords:
  - temp mail
  - temporary email
  - disposable email
  - temp email
- Rank supporting pages for long-tail keywords.
- Build topical authority around temporary/disposable email.
- Improve Core Web Vitals.
- Build high-quality backlinks.
- Avoid indexation of temporary inboxes and private/user-specific content.

## GEO Objectives

Optimize content so it is easy for AI search engines and answer engines to understand and cite, including:

- ChatGPT Search
- Perplexity
- Claude Search
- Google AI search experiences
- Bing/Copilot ecosystem

GEO focus:

- clear factual answers
- structured content
- strong entity identity
- crawlability
- trustworthy pages
- original information
- authoritative backlinks

---

# 2. Priority Keyword Map

## Primary Keywords

- temp mail
- temporary email
- disposable email
- temp email

## Secondary Keywords

- temporary email address
- free temporary email
- disposable email address
- 10 minute mail
- throwaway email
- burner email
- email generator
- temporary inbox
- receive email online

## Long-Tail Keywords

- free temp mail
- free temporary email address
- temp mail no signup
- temporary email no registration
- anonymous temporary email
- instant temporary email
- temporary email for testing
- temp email for developers
- temporary email for OTP testing
- temporary mailbox
- disposable inbox

## Indonesian Keywords

- email sementara
- email sementara gratis
- email sekali pakai
- email temp
- email disposable
- buat email sementara
- email sementara tanpa daftar

---

# 3. Phase 0 — Fix Crawlability and Server Stability

This is P0.

Before doing anything else, verify:

```bash
curl -I https://mailtemps.space
```

Expected:

```text
HTTP/2 200
```

Do not allow homepage responses such as:

```text
502
503
403
429
```

Check:

```text
https://mailtemps.space/
https://mailtemps.space/robots.txt
https://mailtemps.space/sitemap.xml
```

All must be publicly accessible.

## Cloudflare Checks

Review:

- WAF rules
- Bot Fight Mode
- Rate limiting
- Managed Challenge
- Browser Integrity Check
- cache configuration
- origin timeout
- reverse proxy
- DNS resolution

Make sure verified search engine crawlers are not challenged or blocked.

---

# 4. Canonical Domain

Primary domain:

```text
https://mailtemps.space
```

Redirect all alternatives with HTTP 301:

```text
http://mailtemps.space
http://www.mailtemps.space
https://www.mailtemps.space
```

to:

```text
https://mailtemps.space
```

Homepage canonical:

```html
<link rel="canonical" href="https://mailtemps.space/" />
```

All public pages must use self-referencing canonicals.

---

# 5. Homepage SEO Strategy

The homepage owns this keyword cluster:

```text
temp mail
temporary email
temp email
disposable email
temporary email address
```

Do not create multiple nearly identical landing pages such as:

```text
/temp-mail
/temp-email
/temporary-email
/disposable-email
```

if they only repeat the same content.

Avoid keyword cannibalization and doorway pages.

---

# 6. Homepage Structure

Recommended homepage:

```text
Navbar

H1
Short SEO introduction

Temporary Email Generator
Generated email address
Copy
Change
Delete
Refresh

Inbox

Benefits

How MailTemps Works

What Is Temp Mail?

Why Use Temporary Email?

Temp Mail vs Regular Email

Privacy and Security

When You Should Not Use Temporary Email

FAQ

Related Guides

Footer
```

The actual temporary-mail tool must stay above the fold.

---

# 7. Homepage H1

Recommended:

```text
Free Temp Mail – Instant Temporary Email Address
```

Alternative:

```text
Temp Mail – Free Disposable Temporary Email
```

Use exactly one main H1.

The H1 must exist in server-rendered HTML.

Avoid:

```html
<h1></h1>
```

that only gets populated after client-side JavaScript loads.

---

# 8. Homepage Intro

Example:

```text
MailTemps provides a free temporary email address you can use instantly without registration. Generate a disposable inbox, receive verification emails, and keep your primary email address protected from spam.
```

Primary keywords should appear naturally in the first 100 words.

Do not keyword-stuff.

---

# 9. Title Tag

Recommended:

```text
Temp Mail – Free Temporary Email & Disposable Inbox | MailTemps
```

Alternative:

```text
Free Temp Mail – Instant Temporary Email Address | MailTemps
```

Keep titles descriptive, readable, and unique.

---

# 10. Meta Description

Recommended:

```text
Create a free temporary email address instantly with MailTemps. No signup required. Receive verification emails while protecting your primary inbox from spam.
```

Avoid repetitive keyword lists.

---

# 11. Next.js Metadata Example

```tsx
export const metadata = {
  metadataBase: new URL("https://mailtemps.space"),

  title: {
    default:
      "Temp Mail – Free Temporary Email & Disposable Inbox | MailTemps",
    template: "%s | MailTemps",
  },

  description:
    "Create a free temporary email address instantly with MailTemps. No signup required. Receive emails while protecting your primary inbox from spam.",

  alternates: {
    canonical: "/",
  },

  robots: {
    index: true,
    follow: true,
  },

  openGraph: {
    type: "website",
    url: "https://mailtemps.space",
    siteName: "MailTemps",
    title:
      "Temp Mail – Free Temporary Email & Disposable Inbox",
    description:
      "Create a free temporary email address instantly.",
  },
};
```

---

# 12. robots.txt

Create:

```text
https://mailtemps.space/robots.txt
```

Recommended:

```text
User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /inbox/
Disallow: /message/
Disallow: /auth/

Sitemap: https://mailtemps.space/sitemap.xml
```

## AI Search Crawlers

Allow AI search crawlers on public content.

Example:

```text
User-agent: OAI-SearchBot
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /inbox/
Disallow: /message/

User-agent: PerplexityBot
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /inbox/
Disallow: /message/

User-agent: Claude-SearchBot
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /inbox/
Disallow: /message/

User-agent: Claude-User
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /inbox/
Disallow: /message/
```

`GPTBot` is not required for ChatGPT Search visibility.

---

# 13. sitemap.xml

Create:

```text
https://mailtemps.space/sitemap.xml
```

Include only public SEO pages.

Example:

```text
/
 /about
 /privacy
 /terms
 /acceptable-use
 /abuse
 /contact

/guides/what-is-temp-mail
/guides/how-temp-mail-works
/guides/is-temp-mail-safe
/guides/disposable-email
/guides/burner-email
/guides/10-minute-mail
/guides/temp-mail-for-testing
/guides/protect-email-from-spam
```

Do not include:

```text
/inbox/*
/message/*
/api/*
/admin/*
/auth/*
/generated-email/*
```

---

# 14. Next.js sitemap.ts

```ts
import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://mailtemps.space";

  return [
    {
      url: `${base}/`,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${base}/about`,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${base}/privacy`,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${base}/terms`,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${base}/guides/what-is-temp-mail`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];
}
```

Only set `lastModified` when the page really changes.

---

# 15. Protect User Inboxes From Search Engines

Temporary inboxes must not be indexed.

Apply:

```html
<meta
  name="robots"
  content="noindex,nofollow,noarchive"
/>
```

or HTTP:

```text
X-Robots-Tag: noindex, nofollow, noarchive
```

to:

```text
/inbox/*
/message/*
```

Temporary/user inbox content should preferably:

- require a session/token
- have no permanent public URL
- not appear in sitemap
- not be internally linked from SEO pages

Expired inboxes can return:

```text
410 Gone
```

when appropriate.

---

# 16. Site Architecture

Recommended:

```text
/
├── guides/
│   ├── what-is-temp-mail
│   ├── how-temp-mail-works
│   ├── disposable-email
│   ├── burner-email
│   ├── 10-minute-mail
│   ├── is-temp-mail-safe
│   ├── temporary-email-security
│   ├── temp-mail-for-testing
│   └── protect-email-from-spam
│
├── compare/
│   ├── temporary-email-vs-regular-email
│   └── temp-mail-vs-email-alias
│
├── developers/
│   └── api
│
├── about
├── privacy
├── terms
├── acceptable-use
├── abuse
└── contact
```

Only create `/developers/api` if an API really exists.

---

# 17. Content Cluster Strategy

Start with 10–20 excellent pages.

Do not generate hundreds of thin AI articles.

## Cluster A — Temp Mail

- What Is Temp Mail?
- How Does Temp Mail Work?
- Is Temp Mail Safe?
- Is Temp Mail Anonymous?
- How Long Does Temp Mail Last?

## Cluster B — Disposable Email

- What Is a Disposable Email?
- Disposable Email vs Regular Email
- Disposable Email vs Email Alias
- When Should You Use Disposable Email?

## Cluster C — Privacy

- How Temporary Email Protects Your Privacy
- How to Reduce Email Spam
- Why Websites Ask for Your Email
- Temporary Email Security Risks

## Cluster D — Developers

- Temporary Email for Developers
- Testing Email Verification Flows
- Testing OTP Emails
- Testing Signup Emails
- Testing Password Reset Emails

## Cluster E — 10 Minute Mail

Only if this is relevant to actual MailTemps functionality:

- What Is 10 Minute Mail?
- 10 Minute Mail vs Temporary Email
- How Long Should a Temporary Inbox Last?

---

# 18. Content Quality Rules

Every page must provide unique value.

Avoid mass-generated pages like:

```text
/temp-mail-for-instagram
/temp-mail-for-facebook
/temp-mail-for-tiktok
/temp-mail-for-discord
/temp-mail-for-twitter
/temp-mail-for-netflix
...
```

unless each page contains genuinely unique, useful information.

Do not create scaled low-value content only for SEO.

---

# 19. Internal Linking

Every important article should link to:

- homepage
- related guides
- related comparison pages

Example:

```html
<a href="/">
  free temp mail service
</a>
```

Suggested flow:

```text
Homepage
↓
What Is Temp Mail
↓
Disposable Email
↓
Temporary Email Security
↓
Temp Mail for Developers
```

Important SEO pages should be reachable within about 2–3 clicks from the homepage.

Use crawlable `<a href="">` links.

---

# 20. Brand and Entity SEO

Use one consistent brand:

```text
MailTemps
```

or:

```text
MailTemps.space
```

Use consistently in:

- page titles
- logo alt text
- Organization schema
- Open Graph
- social profiles
- footer
- about page
- GitHub
- documentation

Avoid switching randomly between:

```text
MailTemp
Mail Temps
Mailtemps
MailTemps
```

---

# 21. Structured Data

## Organization

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "MailTemps",
  "url": "https://mailtemps.space",
  "logo": "https://mailtemps.space/logo.png"
}
```

## WebSite

```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "MailTemps",
  "url": "https://mailtemps.space/"
}
```

## SoftwareApplication

If appropriate:

```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "MailTemps",
  "url": "https://mailtemps.space",
  "applicationCategory": "UtilitiesApplication",
  "operatingSystem": "Web",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  }
}
```

Never fabricate ratings or reviews.

---

# 22. GEO Content Strategy

Make pages easy for answer engines to parse.

## Answer-First Format

Avoid intros like:

```text
In today's ever-changing digital world...
```

Prefer:

```text
Temp mail is a temporary email address that lets you receive messages without using your primary inbox.
```

Then expand with details.

---

# 23. Add Factual Summary Blocks

Example:

```text
MailTemps at a glance

Price: Free
Signup: Not required
Inbox type: Temporary
Email receiving: Yes
Custom address: [true feature only]
Attachments: [true feature only]
Default expiration: [real value]
Manual delete: [real value]
```

Only include accurate features.

---

# 24. Be Clear About Limitations

Add content such as:

```text
Temporary email is suitable for testing, low-risk registrations, and protecting your main inbox from spam. It should not be used for banking, important long-term accounts, password recovery, or sensitive communication.
```

Avoid unsupported claims such as:

```text
100% anonymous
100% secure
best temporary email
```

unless independently provable.

---

# 25. Trust Pages

Create:

```text
/about
/privacy
/terms
/acceptable-use
/abuse
/contact
```

About page should explain:

- what MailTemps is
- why it exists
- how inboxes work
- data retention
- email expiration
- deletion process
- who maintains the service
- how to contact support
- abuse reporting

This is especially important for temporary-email services.

---

# 26. Core Web Vitals

Targets:

```text
LCP < 2.5s
INP < 200ms
CLS < 0.1
```

Optimize:

- hero rendering
- JavaScript size
- font loading
- API loading
- ad scripts
- analytics
- email preview
- animations

The generator UI should render quickly.

---

# 27. Above-the-Fold UX

Recommended:

```text
MailTemps logo

Free Temp Mail – Instant Temporary Email Address

random-address@example.com

[Copy] [Change] [Delete]

Inbox
Waiting for incoming email...
```

Keep the core product immediately visible.

---

# 28. Fonts and Images

Use:

```text
next/font
```

when using Next.js.

Prefer:

```text
SVG
WebP
AVIF
```

Logo example:

```html
<img
  src="/logo.svg"
  alt="MailTemps temporary email"
/>
```

---

# 29. Google Search Console

Add Domain Property:

```text
mailtemps.space
```

Verify using DNS.

Submit:

```text
https://mailtemps.space/sitemap.xml
```

Inspect:

```text
https://mailtemps.space/
```

Check:

- URL available to Google
- crawl allowed
- page fetch successful
- indexing allowed
- canonical
- rendered HTML
- server response

Request indexing for important initial pages.

---

# 30. Search Console Issues to Monitor

Monitor:

```text
Server error (5xx)
Blocked by robots.txt
Excluded by noindex
Crawled - currently not indexed
Discovered - currently not indexed
Duplicate without user-selected canonical
Alternate page with proper canonical
Soft 404
```

Fix technical issues before publishing large amounts of content.

---

# 31. Do Not Use Google Indexing API for Normal Pages

Do not try to force-index general pages using Google's Indexing API.

For MailTemps, rely on:

```text
Search Console
Sitemap
Internal links
Backlinks
Normal crawling
```

---

# 32. Bing Webmaster Tools + IndexNow

Register:

```text
mailtemps.space
```

in Bing Webmaster Tools.

Implement IndexNow for newly:

- created
- updated
- deleted

public pages.

Example:

```text
/guides/what-is-temp-mail
```

IndexNow can speed discovery but does not guarantee indexing.

---

# 33. Backlink Strategy

Do not buy spam backlinks.

Avoid:

- PBN links
- automated forum profiles
- comment spam
- 1,000 backlink packages
- unrelated directories

Focus on link-worthy assets.

---

# 34. Developer API Strategy

If technically possible, provide a useful API.

Potential docs:

```text
GET /domains
POST /mailbox
GET /messages
GET /messages/:id
```

Create high-quality API documentation.

Developer tools naturally attract:

- GitHub mentions
- tutorials
- technical blog links
- community references

---

# 35. GitHub Strategy

Potential open-source repositories:

```text
mailtemps-js
mailtemps-python
mailtemps-sdk
mailtemps-examples
```

Example README positioning:

```text
Temporary email API powered by MailTemps.space
```

Add:

- API usage
- examples
- docs link
- official website
- issue tracker

---

# 36. Linkable Developer Content

Create articles such as:

```text
How to Test Email Verification with Playwright
How to Test OTP Emails with Node.js
How to Test Signup Emails in Next.js
How to Test Password Reset Emails
How to Test Transactional Emails
```

These are more naturally linkable than generic SEO articles.

---

# 37. Original Research

Publish original data.

Example:

```text
Temporary Email Delivery Benchmark 2026
```

Potential metrics:

- average email delivery latency
- HTML rendering
- attachment support
- expiration behavior
- mailbox creation speed
- provider compatibility

Original research helps:

- backlinks
- authority
- GEO citations
- media coverage
- developer references

---

# 38. Multilingual SEO

Primary global language:

```text
English
```

Optional Indonesian section:

```text
/id/
```

Examples:

```text
/id/
/id/email-sementara
/id/panduan/apa-itu-email-sementara
```

Use hreflang:

```html
<link
  rel="alternate"
  hreflang="en"
  href="https://mailtemps.space/"
/>

<link
  rel="alternate"
  hreflang="id"
  href="https://mailtemps.space/id/"
/>

<link
  rel="alternate"
  hreflang="x-default"
  href="https://mailtemps.space/"
/>
```

Do not mass-auto-translate dozens of languages without review.

---

# 39. Recommended Homepage Content Depth

Recommended range:

```text
1,200–2,000 useful words
```

without pushing the product below the fold.

Suggested structure:

```text
H1
Free Temp Mail – Instant Temporary Email Address

Short introduction

TEMP EMAIL TOOL

H2
What Is Temp Mail?

H2
How Does MailTemps Work?

H3
1. Generate
H3
2. Copy
H3
3. Receive
H3
4. Delete

H2
Why Use a Temporary Email Address?

H2
Temp Mail vs Regular Email

H2
When Should You Not Use Temporary Email?

H2
Is Temporary Email Safe?

H2
Frequently Asked Questions

H2
Learn More About Email Privacy
```

---

# 40. Keyword Placement

Homepage:

## Title

```text
Temp Mail – Free Temporary Email & Disposable Inbox | MailTemps
```

## H1

```text
Free Temp Mail – Instant Temporary Email Address
```

## First 100 Words

Naturally mention:

```text
temp mail
temporary email
disposable email
```

## H2 Ideas

```text
What Is Temp Mail?
How Does Temporary Email Work?
Why Use a Disposable Email Address?
Is Temp Mail Safe?
```

Do not target a specific keyword density percentage.

---

# 41. GEO Page Template

Use this structure for educational pages.

```text
H1

Quick Answer

Key Facts

Detailed Explanation

How It Works

Benefits

Risks / Limitations

Comparison Table

Examples

FAQ

Related Guides
```

This format works well for:

- search snippets
- AI answers
- user readability
- content extraction

---

# 42. llms.txt

Optional experimental addition:

```text
https://mailtemps.space/llms.txt
```

Example:

```md
# MailTemps

> MailTemps is a temporary email service.

## Main Pages

- https://mailtemps.space/
- https://mailtemps.space/about
- https://mailtemps.space/guides/what-is-temp-mail
- https://mailtemps.space/privacy
- https://mailtemps.space/developers/api
```

Treat this as a bonus.

Do not rely on `llms.txt` for discoverability.

Higher priority:

```text
crawlability
OAI-SearchBot
PerplexityBot
Claude-SearchBot
content quality
backlinks
entity consistency
structured data
```

---

# 43. 90-Day Roadmap

## Days 1–3

P0:

- [ ] Fix all 5xx errors.
- [ ] Ensure homepage returns 200.
- [ ] Verify HTTPS.
- [ ] Force canonical domain.
- [ ] Create robots.txt.
- [ ] Create sitemap.xml.
- [ ] Add SSR H1.
- [ ] Add SSR intro.
- [ ] Configure title.
- [ ] Configure meta description.
- [ ] Add canonical tags.
- [ ] Noindex inbox/message pages.
- [ ] Add Google Search Console.
- [ ] Add Bing Webmaster Tools.

Goal:

```text
Googlebot can crawl the homepage successfully.
```

---

## Days 4–7

Create:

- [ ] /about
- [ ] /privacy
- [ ] /terms
- [ ] /acceptable-use
- [ ] /abuse
- [ ] /contact

Structured data:

- [ ] Organization
- [ ] WebSite
- [ ] SoftwareApplication

Publish:

- [ ] /guides/what-is-temp-mail
- [ ] /guides/how-temp-mail-works
- [ ] /guides/is-temp-mail-safe

---

## Weeks 2–4

Publish 8–12 high-quality guides.

Topics:

- [ ] temp mail
- [ ] temporary email
- [ ] disposable email
- [ ] email privacy
- [ ] spam prevention
- [ ] developer email testing

Also:

- [ ] Build internal linking.
- [ ] Add related articles.
- [ ] Improve FAQ sections.
- [ ] Test all SEO metadata.
- [ ] Validate schema.
- [ ] Monitor Search Console indexing.

---

## Month 2

Backlinks and authority:

- [ ] Create GitHub organization/repositories.
- [ ] Publish API docs if applicable.
- [ ] Publish developer tutorials.
- [ ] Submit to legitimate software directories.
- [ ] Contact privacy/security bloggers.
- [ ] Publish original benchmark/research.
- [ ] Earn contextual backlinks.

---

## Month 3

Use Search Console query data.

Find queries with:

```text
high impressions
average position 8–30
```

Then optimize those specific pages.

Examples:

```text
free temporary email address
anonymous temp mail
disposable email online
temporary mailbox
```

Improvements can include:

- better title
- stronger introduction
- additional section
- better internal linking
- FAQ improvements
- supporting backlinks

---

# 44. SEO KPI Tracking

Google Search Console:

- indexed pages
- total impressions
- total clicks
- CTR
- average position
- non-branded impressions
- non-branded clicks

Track keyword clusters:

```text
temp mail
temporary email
disposable email
temp email
10 minute mail
burner email
```

---

# 45. Product Analytics

Track:

- organic users
- organic landing pages
- country
- device
- engagement
- email generated
- copy-email button clicks
- refresh clicks
- inbox usage
- return users

Do not collect unnecessary personal information.

---

# 46. GEO Tracking

Monitor referrals from:

```text
chatgpt.com
perplexity.ai
claude.ai
bing.com
```

Periodically test prompts such as:

```text
What are some free temporary email services?
```

```text
What is a good temporary email for testing?
```

```text
What is temp mail?
```

Record whether MailTemps appears or gets cited.

---

# 47. Technical SEO Checklist

## Global

- [ ] HTTPS only
- [ ] one canonical domain
- [ ] homepage returns 200
- [ ] no accidental 5xx
- [ ] no accidental noindex
- [ ] robots.txt valid
- [ ] sitemap.xml valid
- [ ] canonical tags valid
- [ ] page title present in SSR HTML
- [ ] meta description present in SSR HTML
- [ ] H1 present in SSR HTML
- [ ] content visible without client JS
- [ ] structured data valid
- [ ] Open Graph tags
- [ ] favicon
- [ ] apple-touch-icon
- [ ] web manifest
- [ ] sitemap submitted to Search Console
- [ ] sitemap submitted to Bing

## Privacy / Inbox

- [ ] inbox routes noindex
- [ ] message routes noindex
- [ ] inbox routes excluded from sitemap
- [ ] messages excluded from sitemap
- [ ] sensitive data not publicly crawlable
- [ ] expired inbox behavior defined

---

# 48. Performance Checklist

- [ ] LCP < 2.5 seconds
- [ ] INP < 200 ms
- [ ] CLS < 0.1
- [ ] optimize JavaScript bundle
- [ ] lazy-load secondary UI
- [ ] optimize email preview renderer
- [ ] optimize images
- [ ] use SVG logo
- [ ] use next/font
- [ ] minimize third-party scripts
- [ ] cache static content
- [ ] compress text responses
- [ ] Brotli/gzip enabled
- [ ] use CDN properly

---

# 49. Content Checklist

Every SEO article should have:

- [ ] unique title
- [ ] unique H1
- [ ] unique meta description
- [ ] canonical
- [ ] strong first paragraph
- [ ] direct answer
- [ ] meaningful sections
- [ ] accurate factual claims
- [ ] internal links
- [ ] related content
- [ ] clear author/editorial ownership if applicable
- [ ] last updated date only when genuinely updated
- [ ] no keyword stuffing
- [ ] no copied competitor text
- [ ] no filler content

---

# 50. Backlink Checklist

Prioritize:

- [ ] GitHub
- [ ] open-source projects
- [ ] developer tutorials
- [ ] software directories
- [ ] privacy blogs
- [ ] security blogs
- [ ] educational articles
- [ ] original research
- [ ] technical documentation
- [ ] legitimate partnerships

Avoid:

- [ ] PBN
- [ ] automated backlinks
- [ ] unrelated guest-post farms
- [ ] comment spam
- [ ] forum profile spam
- [ ] low-quality directory blasts

---

# 51. Final Priority Matrix

| Priority | Task |
|---|---|
| P0 | Fix 5xx / origin stability |
| P0 | Homepage 200 OK |
| P0 | Google Search Console |
| P0 | robots.txt |
| P0 | sitemap.xml |
| P0 | SSR H1 |
| P0 | SSR SEO intro |
| P0 | canonical |
| P0 | title + description |
| P0 | noindex inbox/message |
| P1 | Homepage supporting content |
| P1 | About/Privacy/Terms/Abuse |
| P1 | Organization/WebSite schema |
| P1 | Initial content cluster |
| P1 | Internal linking |
| P1 | AI-search crawler access |
| P2 | Bing + IndexNow |
| P2 | GitHub presence |
| P2 | Developer content |
| P2 | API/docs |
| P2 | Original research |
| P2 | Backlink outreach |
| P3 | Indonesian `/id/` |
| P3 | llms.txt |

---

# 52. Target SEO Architecture

```text
                     mailtemps.space
                           │
               Temp Mail / Temporary Email
                           │
          ┌────────────────┼────────────────┐
          │                │                │
   Disposable Email      Privacy        Developers
          │                │                │
    Burner Email        Security       Email Testing
    10 Minute Mail      Spam Guide          API
```

The goal is for search engines to understand MailTemps not merely as:

```text
a website that generates email addresses
```

but as:

```text
a legitimate temporary-email service and topical authority covering disposable email, privacy, anti-spam use cases, and email testing.
```

---

# 53. Definition of Done

The initial SEO/GEO implementation is considered complete when:

- [ ] `https://mailtemps.space/` consistently returns HTTP 200.
- [ ] Googlebot can render the homepage.
- [ ] Homepage H1 is visible in raw/server-rendered HTML.
- [ ] Metadata is present in raw HTML.
- [ ] `robots.txt` exists.
- [ ] `sitemap.xml` exists.
- [ ] Search Console property is verified.
- [ ] Sitemap is submitted.
- [ ] Homepage is indexable.
- [ ] Temporary inboxes are not indexable.
- [ ] Canonical URLs are correct.
- [ ] Core Web Vitals are within target.
- [ ] At least 6 trust pages exist.
- [ ] At least 10 high-quality supporting pages exist.
- [ ] All main pages have internal links.
- [ ] AI search crawlers can access public content.
- [ ] Structured data validates.
- [ ] Bing Webmaster is configured.
- [ ] IndexNow is implemented if desired.
- [ ] GitHub / developer assets exist where relevant.
- [ ] Search Console impressions are being monitored.
- [ ] No spam backlink or scaled-content strategy is used.

---

# 54. Execution Order for Claude Code / Codex

Implement in this exact order:

```text
1. Audit current Next.js routes and rendering mode.
2. Verify homepage/server response and fix 5xx first.
3. Add canonical-domain redirect rules.
4. Add global metadata.
5. Ensure SSR H1 + SEO intro.
6. Create robots.ts.
7. Create sitemap.ts.
8. Add noindex to private/inbox/message routes.
9. Add Organization + WebSite schema.
10. Add trust pages.
11. Build homepage supporting content.
12. Create the first 3 guides.
13. Build reusable guide SEO metadata helper.
14. Add internal-link components.
15. Add remaining initial content cluster.
16. Optimize Core Web Vitals.
17. Verify raw HTML with curl.
18. Verify robots.txt and sitemap.xml.
19. Validate structured data.
20. Submit to Google Search Console.
21. Configure Bing + IndexNow.
22. Begin backlinks and original-content strategy.
```

---

# 55. Non-Negotiable Rules

Do NOT:

```text
keyword stuff
cloak content
buy bulk backlinks
generate thousands of thin AI pages
index user inboxes
fake review schema
fake ratings
publish false privacy/security claims
create near-duplicate doorway pages
use temporary redirects where permanent redirects are intended
depend on JavaScript for critical SEO text
```

Always prioritize:

```text
crawlability
reliability
useful content
user experience
clear site structure
trust
original value
real backlinks
```

---

End of plan.
