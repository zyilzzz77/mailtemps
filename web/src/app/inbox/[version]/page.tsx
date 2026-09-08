import type { Metadata } from "next";
import { notFound } from "next/navigation";

import MailtempsApp from "@/components/mailtemps-app";

export const metadata: Metadata = {
  title: "Private temporary inbox",
  description: "A private, short-lived MailTemps inbox session.",
  robots: { index: false, follow: false, noarchive: true, nosnippet: true },
};

export default async function InboxPage({ params }: { params: Promise<{ version: string }> }) {
  const { version } = await params;
  if (!/^v\d+$/.test(version)) notFound();
  const inboxVersion = Number(version.slice(1));
  if (!Number.isSafeInteger(inboxVersion)) notFound();
  return <MailtempsApp mode="inbox" version={inboxVersion} />;
}
