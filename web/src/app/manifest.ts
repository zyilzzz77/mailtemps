import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MailTemps – Temporary Email",
    short_name: "MailTemps",
    description: "Free receive-only temporary email with automatically expiring inboxes.",
    start_url: "/",
    display: "standalone",
    background_color: "#f3f5f2",
    theme_color: "#1847e8",
    icons: [{ src: "/logo-mailtemps-rounded.webp", sizes: "512x512", type: "image/webp", purpose: "any" }],
  };
}
