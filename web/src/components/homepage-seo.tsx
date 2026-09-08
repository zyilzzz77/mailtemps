import Link from "next/link";
import { ArrowRight, Check, Copy, Inbox, Trash2 } from "lucide-react";

const steps = [
  { icon: Inbox, title: "1. Generate", text: "Choose a readable name. MailTemps adds six random digits and creates a unique temporary email address." },
  { icon: Copy, title: "2. Copy", text: "Use the address for an authorized test or a low-risk signup that does not need long-term recovery." },
  { icon: Check, title: "3. Receive", text: "Incoming messages appear automatically. MailTemps displays the safe text body without loading remote trackers." },
  { icon: Trash2, title: "4. Delete", text: "Press Finish when done, or let the inbox expire. The address and its messages cannot be recovered afterward." },
];

const related = [
  ["/guides/what-is-temp-mail", "What is temp mail?"],
  ["/guides/how-temp-mail-works", "How temporary email works"],
  ["/guides/is-temp-mail-safe", "Is temp mail safe?"],
  ["/guides/temp-mail-for-testing", "Temp mail for developers"],
  ["/compare/temp-mail-vs-email-alias", "Temp mail vs email aliases"],
  ["/guides/protect-email-from-spam", "Protect your email from spam"],
] as const;

export default function HomepageSeo() {
  return (
    <section className="homepage-seo" aria-labelledby="temp-mail-explained">
      <header className="seo-heading">
        <p className="eyebrow">Temporary email, without the hype</p>
        <h2 id="temp-mail-explained">Free temp mail for short-lived, low-risk email.</h2>
        <p>MailTemps creates a free temporary email address without registration. Use the disposable inbox to receive a verification email, test a signup flow you own, or keep a one-time interaction away from your primary email address. It is receive-only, expires automatically, and is not intended for important or sensitive accounts.</p>
      </header>

      <section className="glance-card" aria-labelledby="glance-title">
        <div><p className="eyebrow">Factual summary</p><h2 id="glance-title">MailTemps at a glance</h2></div>
        <dl>
          <div><dt>Price</dt><dd>Free</dd></div>
          <div><dt>Signup</dt><dd>Not required</dd></div>
          <div><dt>Inbox type</dt><dd>Temporary, receive-only</dd></div>
          <div><dt>Default expiry</dt><dd>10 minutes</dd></div>
          <div><dt>Extensions</dt><dd>2 × 10 minutes maximum</dd></div>
          <div><dt>Address format</dt><dd>Chosen name + 6 random digits</dd></div>
          <div><dt>Manual delete</dt><dd>Yes, with Finish</dd></div>
          <div><dt>Remote trackers</dt><dd>Not loaded in the reader</dd></div>
        </dl>
      </section>

      <div className="seo-editorial-grid">
        <article>
          <p className="eyebrow">Definition</p>
          <h2>What is temp mail?</h2>
          <p>Temp mail is a temporary email address that receives messages for a limited period. It is also called disposable email, throwaway email, burner email, or a temporary inbox. Unlike a regular mailbox, it is designed to be abandoned instead of becoming a permanent online identity.</p>
          <p>The useful privacy benefit is separation. A low-value website can send its immediate confirmation without learning the address used for work, family, banking, or account recovery. That reduces unnecessary exposure, but it does not make the interaction anonymous or encrypted end to end.</p>
          <Link href="/guides/what-is-temp-mail">Read the complete definition <ArrowRight aria-hidden="true" /></Link>
        </article>
        <article>
          <p className="eyebrow">Use cases</p>
          <h2>Why use a disposable email address?</h2>
          <p>A disposable email address is appropriate when the message should arrive soon, the interaction is low risk, and losing future access has no serious consequence. Common examples include an authorized QA test, a one-time verification, or evaluating a service before choosing whether to share a permanent address.</p>
          <p>It is not appropriate for banking, purchases that need receipts or warranties, healthcare, employment, government services, password recovery, or any account you would be upset to lose. Some websites also reject known temporary-email domains.</p>
          <Link href="/guides/disposable-email">Understand disposable email <ArrowRight aria-hidden="true" /></Link>
        </article>
      </div>

      <section className="how-steps" aria-labelledby="how-title">
        <div className="section-heading"><p className="eyebrow">Four clear steps</p><h2 id="how-title">How MailTemps works</h2></div>
        <div>{steps.map(({ icon: Icon, title, text }) => <article key={title}><Icon aria-hidden="true" /><h3>{title}</h3><p>{text}</p></article>)}</div>
      </section>

      <section className="comparison-block" aria-labelledby="comparison-title">
        <div><p className="eyebrow">Choose by consequence</p><h2 id="comparison-title">Temp mail vs regular email</h2><p>A temporary inbox minimizes ongoing exposure; a regular inbox provides continuity and recovery. Neither is universally better—the correct choice depends on how costly it would be to lose the address or message.</p></div>
        <div className="comparison-table" role="table" aria-label="Temporary and regular email comparison">
          <div role="row"><strong role="columnheader">Need</strong><strong role="columnheader">Temp mail</strong><strong role="columnheader">Regular email</strong></div>
          <div role="row"><span role="cell">Immediate low-risk verification</span><span role="cell">Good fit</span><span role="cell">Also works</span></div>
          <div role="row"><span role="cell">Long-term recovery</span><span role="cell">Do not use</span><span role="cell">Recommended</span></div>
          <div role="row"><span role="cell">Receive replies later</span><span role="cell">Unreliable</span><span role="cell">Recommended</span></div>
          <div role="row"><span role="cell">Sensitive information</span><span role="cell">Do not use</span><span role="cell">Use a secured provider</span></div>
        </div>
      </section>

      <section className="related-home" aria-labelledby="learn-title">
        <div><p className="eyebrow">Learn before you use it</p><h2 id="learn-title">Temporary email guides</h2></div>
        <div>{related.map(([href, label]) => <Link href={href} key={href}><span>{label}</span><ArrowRight aria-hidden="true" /></Link>)}</div>
        <Link className="all-guides-link" href="/guides">Browse every guide</Link>
      </section>
    </section>
  );
}
