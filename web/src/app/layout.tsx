import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://mailtemps.space"),
  title: {
    default: "Temp Mail – Free Temporary Email & Disposable Inbox | MailTemps",
    template: "%s | MailTemps",
  },
  description: "Create a free temporary email address instantly with MailTemps. No signup required. Receive verification emails while protecting your primary inbox from spam.",
  applicationName: "MailTemps",
  authors: [{ name: "MailTemps" }],
  creator: "MailTemps",
  publisher: "MailTemps",
  category: "technology",
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "MailTemps",
    title: "Temp Mail – Free Temporary Email & Disposable Inbox",
    description: "Create a free temporary email address instantly. No signup, receive-only, and deleted automatically.",
    images: [{ url: "/logo-mailtemps.webp", width: 512, height: 512, alt: "MailTemps temporary email logo" }],
  },
  twitter: {
    card: "summary",
    title: "Temp Mail – Free Temporary Email & Disposable Inbox",
    description: "Create a free temporary email address instantly with MailTemps.",
    images: ["/logo-mailtemps.webp"],
  },
  icons: {
    icon: [{ url: "/logo-mailtemps-rounded.webp", type: "image/webp" }],
    shortcut: [{ url: "/logo-mailtemps-rounded.webp", type: "image/webp" }],
    apple: [{ url: "/apple-touch-icon.png", type: "image/png", sizes: "180x180" }],
  },
  other: {
    "darkreader-lock": "true",
  },
};

export const viewport: Viewport = {
  themeColor: "#f3f5f2",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": "https://mailtemps.space/#organization",
      name: "MailTemps",
      url: "https://mailtemps.space/",
      logo: "https://mailtemps.space/logo-mailtemps.webp",
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": "https://mailtemps.space/#website",
      name: "MailTemps",
      url: "https://mailtemps.space/",
      publisher: { "@id": "https://mailtemps.space/#organization" },
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "MailTemps",
      url: "https://mailtemps.space/",
      applicationCategory: "UtilitiesApplication",
      operatingSystem: "Web",
      description: "A receive-only temporary email service with automatically expiring inboxes.",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
  ];

  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
        />
        {children}
      </body>
    </html>
  );
}
