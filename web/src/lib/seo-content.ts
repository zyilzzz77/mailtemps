export type ContentSection = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
};

export type SeoContentPage = {
  path: string;
  eyebrow: string;
  title: string;
  description: string;
  quickAnswer: string;
  facts: string[];
  sections: ContentSection[];
  related: string[];
};

export const trustPages: Record<string, SeoContentPage> = {
  about: {
    path: "/about",
    eyebrow: "About the service",
    title: "About MailTemps",
    description: "Learn why MailTemps exists, how its temporary inboxes work, and what the receive-only service stores and deletes.",
    quickAnswer: "MailTemps is a free, receive-only temporary email service designed for short-lived verification messages, testing, and low-risk signups without exposing a primary inbox.",
    facts: ["No account required", "10-minute default inbox", "Receive-only service", "Manual and automatic deletion"],
    sections: [
      { heading: "Why MailTemps exists", paragraphs: ["Many websites ask for an email address before a person can evaluate the service. Reusing a primary address for every low-risk signup creates a long-term trail and increases exposure to unwanted mail. MailTemps provides a short-lived alternative for situations where a permanent mailbox is unnecessary.", "The service is deliberately narrow. It creates a generated address, accepts incoming email for that active address, and displays a safe text version in the browser. It does not send or reply to email, and it is not a replacement for a normal mailbox."] },
      { heading: "How an inbox is handled", paragraphs: ["A visitor chooses a readable base name and MailTemps adds six random digits. A new inbox starts with ten minutes of availability and may be extended twice by ten minutes. The address, message metadata, text and HTML bodies, and attachment metadata are stored only while the inbox is active.", "Access is controlled by a secret browser token. The server stores a hash of that token rather than the token itself. Pressing Finish deletes the active inbox and its messages; expired inboxes are removed by the cleanup process."] },
      { heading: "What MailTemps is not", paragraphs: ["Temporary email does not provide guaranteed anonymity, end-to-end encryption, or long-term recovery. It should never be used for banking, health information, identity documents, business-critical accounts, or any service that may require password recovery later."], bullets: ["No outgoing email", "No permanent archive", "No promise that every website accepts the domain", "No recovery after deletion or expiry"] },
    ],
    related: ["/guides/what-is-temp-mail", "/guides/how-temp-mail-works", "/privacy", "/acceptable-use"],
  },
  privacy: {
    path: "/privacy",
    eyebrow: "Privacy notice",
    title: "MailTemps privacy and data handling",
    description: "Understand what MailTemps stores, why temporary inbox data is processed, and when inboxes and messages are deleted.",
    quickAnswer: "MailTemps does not require a name, account, or password. It processes the minimum operational data needed to create an inbox, receive messages, prevent abuse, and delete expired data.",
    facts: ["No registration profile", "Access tokens are hashed server-side", "Email content is temporary", "IP addresses may be processed for abuse controls"],
    sections: [
      { heading: "Data processed by the service", paragraphs: ["To operate an inbox, MailTemps stores its generated address, creation and expiry timestamps, and the number of extensions used. Incoming mail can include sender and recipient addresses, sender name, subject, plain-text and HTML bodies, message identifiers, size, and attachment metadata such as filename and content type.", "The current interface shows only the text body. HTML, remote images, scripts, and tracking pixels are not rendered. Attachment bytes are not exposed for download in the current version, although metadata about an attachment may be recorded with the message."] },
      { heading: "Access, retention, and deletion", paragraphs: ["The browser keeps an inbox access token in session storage. The server stores only its cryptographic hash. Anyone who obtains the live token may be able to read that inbox, so users should not share the token or use a temporary inbox on an untrusted device.", "An inbox begins with a ten-minute expiry and can be extended at most twice. Pressing Finish removes the inbox and related messages from the active database. The cleanup worker removes expired records. Operational logs and infrastructure backups, when enabled for a deployment, may follow separate short security and recovery retention windows."] },
      { heading: "Security and limitations", paragraphs: ["MailTemps is designed to reduce unnecessary disclosure of a primary email address; it is not a guarantee of anonymity. Network providers and infrastructure may process connection metadata, and incoming email is not necessarily encrypted end to end. Do not send secrets, identity documents, financial information, or sensitive personal data to a temporary inbox."], bullets: ["Use a trusted device and network", "Close the inbox when finished", "Never use temporary email as the recovery address for an important account", "Report suspected abuse through the abuse page"] },
    ],
    related: ["/guides/is-temp-mail-safe", "/guides/temporary-email-security", "/terms", "/abuse"],
  },
  terms: {
    path: "/terms",
    eyebrow: "Service terms",
    title: "Terms of use",
    description: "The basic conditions for using MailTemps responsibly, including service limitations, deletion, availability, and prohibited conduct.",
    quickAnswer: "Use MailTemps only for lawful, low-risk, receive-only email needs. Inboxes are temporary, may disappear without recovery, and must not be used to harm people or evade platform safeguards.",
    facts: ["Service provided as available", "No inbox recovery guarantee", "Users remain responsible for their activity", "Abuse may be blocked"],
    sections: [
      { heading: "Using MailTemps", paragraphs: ["By using the service, you agree to follow these terms and the acceptable-use policy. You must have the legal capacity to use the service in your jurisdiction. MailTemps may limit creation rates, reject mail, suspend access, or remove content when necessary to protect the service and others.", "The service is intended for short-lived receipt of ordinary email. It is not designed for permanent storage, emergency communication, regulated records, or credentials that must remain recoverable."] },
      { heading: "Availability and deletion", paragraphs: ["Inbox availability, delivery time, and compatibility with third-party websites are not guaranteed. A sender, receiving network, DNS provider, or third-party website may delay, reject, or block temporary email. Messages and inboxes are deleted on expiry or when the user finishes the session, and deleted data cannot be restored through the product."] },
      { heading: "Responsibility and changes", paragraphs: ["You are responsible for deciding whether temporary email is suitable for a particular use. To the extent permitted by law, MailTemps is provided without warranties of uninterrupted operation, fitness for a particular purpose, or delivery of every message. Material changes to these terms should be reflected on this page before public release."], bullets: ["Do not use the service for illegal activity", "Do not attempt to disrupt or overload the infrastructure", "Do not use received content you are not authorized to access", "Follow the acceptable-use policy"] },
    ],
    related: ["/acceptable-use", "/privacy", "/abuse", "/about"],
  },
  "acceptable-use": {
    path: "/acceptable-use",
    eyebrow: "Usage policy",
    title: "Acceptable use policy",
    description: "Rules for lawful and responsible use of the MailTemps temporary email service.",
    quickAnswer: "MailTemps may be used for legitimate privacy protection and testing. It may not be used for fraud, harassment, unauthorized access, spam operations, or attempts to evade legal and platform controls.",
    facts: ["Lawful use only", "No credential theft", "No automated abuse", "No service disruption"],
    sections: [
      { heading: "Allowed examples", paragraphs: ["Appropriate uses include evaluating a low-risk website, separating a one-time verification message from a primary inbox, testing an application you own, and reproducing email-delivery bugs in an authorized environment."], bullets: ["QA testing of signup and verification flows", "Receiving a newsletter sample before subscribing permanently", "Protecting a main address during a low-risk trial", "Demonstrating email parsing in a controlled classroom or lab"] },
      { heading: "Prohibited activity", paragraphs: ["You may not use MailTemps to commit or facilitate fraud, impersonation, phishing, malware delivery, harassment, stalking, credential theft, payment abuse, or unauthorized account creation. You may not use automation to exhaust resources, bypass rate limits, probe other inboxes, interfere with mail delivery, or obtain messages meant for another person."] },
      { heading: "Enforcement", paragraphs: ["MailTemps may reject messages, delete inboxes, rate-limit traffic, preserve limited evidence when legally required, and block sources associated with abuse. Enforcement should be proportionate to the risk and may occur without prior notice when immediate action is necessary to protect users or infrastructure."], bullets: ["Security research requires authorization", "Testing must target systems you own or are permitted to test", "Legal requests are evaluated under applicable law", "Abuse reports should include reproducible, non-sensitive evidence"] },
    ],
    related: ["/terms", "/abuse", "/privacy", "/guides/temp-mail-for-testing"],
  },
  abuse: {
    path: "/abuse",
    eyebrow: "Safety channel",
    title: "Report abuse involving MailTemps",
    description: "How to prepare an actionable abuse report for misuse involving a MailTemps temporary address.",
    quickAnswer: "Preserve the relevant address, timestamps, message headers, and a concise description. Never post passwords, access tokens, or sensitive message bodies in a public report.",
    facts: ["Include UTC timestamps", "Include full email headers when safe", "Redact secrets", "Urgent danger belongs with local authorities"],
    sections: [
      { heading: "What makes a report actionable", paragraphs: ["An effective report identifies the MailTemps address involved, the approximate time including timezone, the affected service, and the behavior being reported. Full mail headers are useful because they contain routing evidence, but sensitive content should be redacted unless it is essential to understanding the incident.", "Do not attempt to access the inbox yourself, and do not send additional messages to provoke the actor. Preserve evidence in its original form and explain how you obtained it."] },
      { heading: "Reporting channel during local development", paragraphs: ["MailTemps is currently being tested locally and no public abuse mailbox or ticketing endpoint is claimed as operational in this build. A verified reporting address must be published here before production launch. This avoids directing sensitive reports to an inbox that has not been configured or monitored."] },
      { heading: "Emergencies and legal requests", paragraphs: ["If someone faces immediate danger, contact the appropriate local emergency service. Law-enforcement and legal requests should use a verified official channel once published and include the requesting authority, legal basis, exact records sought, and preservation period. MailTemps cannot recover an inbox that has already been deleted from active storage."], bullets: ["Never include an inbox access token", "State whether the incident is ongoing", "Separate observed facts from assumptions", "Use secure transmission for sensitive evidence"] },
    ],
    related: ["/acceptable-use", "/privacy", "/terms", "/contact"],
  },
  contact: {
    path: "/contact",
    eyebrow: "Contact",
    title: "Contact MailTemps",
    description: "Current support status and the information to include when contacting MailTemps about product, privacy, or abuse issues.",
    quickAnswer: "This build is still in local development. A verified public support address is intentionally not advertised until the mailbox and response workflow are operational.",
    facts: ["No fake support address", "No account support required", "Do not share inbox tokens", "Production contact is pending"],
    sections: [
      { heading: "Before contacting support", paragraphs: ["Most product questions are answered in the guides and FAQ. If an inbox is expired or was deleted with Finish, it cannot be restored. MailTemps cannot ask a third-party sender to resend a message and cannot make another website accept a temporary-email domain."] },
      { heading: "Information that helps", paragraphs: ["For a technical problem, record the page URL, local time and timezone, device and browser version, the action you took, and the visible error. Do not include the inbox bearer token, passwords, one-time codes, full private messages, or unrelated personal data."], bullets: ["A short reproduction sequence", "Expected and actual behavior", "A redacted screenshot when useful", "Whether the problem occurs on another browser or network"] },
      { heading: "Launch requirement", paragraphs: ["Before MailTemps is deployed publicly, this page must be updated with a monitored support channel and a separate secure path for abuse or legal reports. Publishing an invented or unmonitored address would be misleading, so the local build states the limitation directly."] },
    ],
    related: ["/about", "/guides/how-temp-mail-works", "/privacy", "/abuse"],
  },
};

export const guidePages: Record<string, SeoContentPage> = {
  "what-is-temp-mail": {
    path: "/guides/what-is-temp-mail", eyebrow: "Temp mail basics", title: "What is temp mail?", description: "A direct explanation of temp mail, what a temporary email address does, when it helps, and when a permanent inbox is safer.",
    quickAnswer: "Temp mail is a short-lived email address that receives messages without exposing your primary inbox. It is useful for low-risk verification and testing, but unsuitable for important accounts or sensitive communication.",
    facts: ["Also called disposable or throwaway email", "Receives mail for a limited time", "Usually needs no registration", "Not a permanent identity"],
    sections: [
      { heading: "A temporary address, not a second identity", paragraphs: ["A temp mail service creates an address that exists for minutes or hours rather than years. Senders deliver to it through normal email infrastructure, while the recipient reads the message in a temporary web inbox. The main benefit is separation: a one-time interaction does not need to learn or retain the person's everyday address.", "Disposable email, burner email, throwaway email, and temporary inbox are overlapping terms. Providers differ in lifespan, address control, attachment handling, privacy practices, and whether old addresses can be recovered."] },
      { heading: "Good and bad use cases", paragraphs: ["Temp mail is useful for testing a signup you own, receiving a low-risk confirmation, or previewing a service before deciding whether to share a permanent address. It is a poor choice when the address controls ownership, password recovery, payments, health records, employment, or long-term communication."], bullets: ["Use it when loss of the inbox has little consequence", "Assume the address will disappear", "Do not treat temporary email as end-to-end encrypted", "Expect some websites to reject disposable domains"] },
      { heading: "How MailTemps implements it", paragraphs: ["MailTemps combines a chosen base name with six random digits, starts a ten-minute inbox, and allows two ten-minute extensions. It receives mail only, renders the safe text body, and lets the user delete the inbox immediately with Finish. No signup or password is required."] },
    ], related: ["/guides/how-temp-mail-works", "/guides/disposable-email", "/guides/is-temp-mail-safe", "/"],
  },
  "how-temp-mail-works": {
    path: "/guides/how-temp-mail-works", eyebrow: "Delivery explained", title: "How does temporary email work?", description: "Follow the path from generating a temporary address through DNS and SMTP delivery to expiry and deletion.",
    quickAnswer: "A temporary email provider publishes mail-routing records for its domain, creates a short-lived recipient, accepts matching SMTP deliveries, and displays the message to someone holding the inbox token until the expiry time.",
    facts: ["DNS MX routes incoming mail", "SMTP transfers the message", "A token protects the inbox view", "Cleanup removes expired records"],
    sections: [
      { heading: "From generated address to SMTP recipient", paragraphs: ["When a user creates an inbox, the provider records a unique local part such as a readable name plus random digits. The domain's MX record tells sending mail servers where to deliver. During the SMTP conversation, the receiving server checks whether the recipient exists and is still active before accepting the message."] },
      { heading: "Parsing and showing a message", paragraphs: ["Accepted email is parsed into fields such as sender, recipients, subject, text body, HTML body, message identifier, and attachment metadata. A web API returns only messages belonging to the authenticated inbox. MailTemps displays the plain-text body and does not render remote HTML, scripts, images, or tracking pixels."] },
      { heading: "Expiry is part of the design", paragraphs: ["Temporary inboxes need a clear end. MailTemps starts at ten minutes and allows two extensions, after which the user must create another address. The user can also press Finish to delete early. An expired address should not be trusted for future account recovery because later mail may be rejected and the previous inbox cannot be reopened."], bullets: ["Generate", "Copy the address", "Receive and read", "Finish or let it expire"] },
    ], related: ["/guides/what-is-temp-mail", "/guides/how-long-does-temp-mail-last", "/guides/temporary-email-security", "/"],
  },
  "is-temp-mail-safe": {
    path: "/guides/is-temp-mail-safe", eyebrow: "Risk guide", title: "Is temp mail safe?", description: "Understand what temporary email protects, what it cannot protect, and how to choose low-risk uses.",
    quickAnswer: "Temp mail can reduce spam exposure by hiding a primary address, but it is not safe for confidential messages, valuable accounts, or anything that needs reliable recovery. Safety depends on the use case and provider design.",
    facts: ["Reduces primary-address exposure", "Does not guarantee anonymity", "Inbox access links must stay secret", "Sensitive accounts need permanent email"],
    sections: [
      { heading: "What temp mail can protect", paragraphs: ["A disposable address limits how many organizations receive a primary address. If a low-risk site later sends marketing mail or suffers a data leak, the permanent mailbox is less directly exposed. A provider that renders only text can also avoid loading remote tracking pixels when a message is opened."] },
      { heading: "Risks that remain", paragraphs: ["Email can cross multiple servers and is not automatically end-to-end encrypted. A weak provider might expose inboxes publicly, reuse addresses, retain messages too long, or load hostile HTML. Network and service logs can still contain metadata, and the sender already knows the temporary address and whatever information was supplied during signup."], bullets: ["Do not share the inbox token", "Do not open unexpected links blindly", "Never receive banking or identity information", "Delete the inbox as soon as the task is complete"] },
      { heading: "A practical decision rule", paragraphs: ["Ask what happens if the inbox disappears now or another person reads the message. If the answer involves money, identity, legal rights, account ownership, personal safety, or significant inconvenience, use a trusted permanent mailbox with strong authentication instead."] },
    ], related: ["/guides/temporary-email-security", "/privacy", "/guides/what-is-temp-mail", "/"],
  },
  "disposable-email": {
    path: "/guides/disposable-email", eyebrow: "Disposable email", title: "What is a disposable email address?", description: "Learn how disposable email addresses differ from permanent mailboxes and aliases, with practical use cases and limitations.",
    quickAnswer: "A disposable email address is intentionally short-lived or easy to discard. It separates one interaction from a permanent inbox and reduces the cost of abandoning an address that starts receiving unwanted mail.",
    facts: ["Designed to be discarded", "May last minutes or longer", "Can be a mailbox or forwarding alias", "Not suitable for account recovery"],
    sections: [
      { heading: "Mailbox versus alias", paragraphs: ["Some disposable addresses open a temporary mailbox on the provider's site. Others are aliases that forward messages to a permanent account and can be switched off later. Temporary mailboxes reveal less about the destination address, while aliases usually provide better continuity and recovery."] },
      { heading: "Why people use disposable addresses", paragraphs: ["The common reason is inbox hygiene. A separate address contains marketing, limits correlation across services, and makes it easy to walk away from a low-value signup. Developers also use disposable inboxes to test whether verification, notification, and transactional email flows work as expected."], bullets: ["One-time verification", "Short product evaluation", "Authorized application testing", "Keeping promotional mail separate"] },
      { heading: "Limits to remember", paragraphs: ["A disposable address can be blocked by a website, expire before a delayed message arrives, or become unavailable when the provider has an outage. It does not make false identities, fraud, or platform-policy violations acceptable. For long-term but privacy-conscious use, a stable alias may be the better tool."] },
    ], related: ["/compare/temp-mail-vs-email-alias", "/compare/temporary-email-vs-regular-email", "/guides/burner-email", "/"],
  },
  "burner-email": {
    path: "/guides/burner-email", eyebrow: "Terminology", title: "What is a burner email?", description: "A practical definition of burner email, how it relates to temp mail, and the tradeoffs between short-lived inboxes and aliases.",
    quickAnswer: "Burner email is an informal name for an address created for limited use and then abandoned. It may be a temporary inbox, a separate account, or a forwarding alias depending on how long it must remain reachable.",
    facts: ["Informal umbrella term", "May be temporary or persistent", "Separates identities or contexts", "Still subject to law and platform rules"],
    sections: [
      { heading: "Burner does not always mean ten minutes", paragraphs: ["A ten-minute mailbox is one type of burner address, but the term can also describe a secondary account kept for a project or an alias disabled after a purchase. The right implementation depends on whether replies, recovery, or future receipts are expected."] },
      { heading: "Choosing the right lifespan", paragraphs: ["For a test message expected immediately, a short-lived inbox reduces residual data. For a purchase receipt, warranty, or account that may need recovery, a stable alias or permanent mailbox is safer. The address lifespan should be longer than the complete communication lifecycle, not just the first verification message."], bullets: ["Minutes: controlled tests and low-risk verification", "Days: short projects with follow-up", "Persistent alias: shopping and newsletters", "Permanent mailbox: identity and important accounts"] },
      { heading: "Responsible use", paragraphs: ["A burner address does not remove responsibility for activity performed with it. It should not be used to impersonate others, evade bans, create abusive accounts, or conceal fraud. Providers can apply rate limits and retain limited security evidence consistent with law and their privacy notice."] },
    ], related: ["/guides/10-minute-mail", "/guides/disposable-email", "/acceptable-use", "/"],
  },
  "10-minute-mail": {
    path: "/guides/10-minute-mail", eyebrow: "Short-lived inbox", title: "What is 10 minute mail?", description: "How a ten-minute temporary inbox works, when ten minutes is enough, and how MailTemps extensions affect expiry.",
    quickAnswer: "Ten minute mail is a disposable inbox with a short default expiry. MailTemps starts each inbox at ten minutes and permits two additional ten-minute extensions, for up to about thirty minutes from creation.",
    facts: ["10-minute default", "Two extensions maximum", "Receive-only", "Delete early with Finish"],
    sections: [
      { heading: "Why use a short timer", paragraphs: ["A clear expiry reduces forgotten mailboxes and limits how long received content remains active. Ten minutes is often enough for an automated verification email, but delivery delays and manual review can take longer, which is why a small, bounded extension option is useful."] },
      { heading: "MailTemps expiry behavior", paragraphs: ["The countdown starts when the inbox is created. Each successful extension adds ten minutes, and the extension counter is stored server-side so refreshing the browser cannot reset it. After two extensions the button is disabled and the API rejects further attempts. Pressing Finish deletes the inbox immediately instead of waiting for cleanup."], bullets: ["Create: 10 minutes", "First extension: add 10 minutes", "Second extension: add 10 minutes", "Third attempt: rejected"] },
      { heading: "When ten minutes is not appropriate", paragraphs: ["Do not use a short-lived address when a message may arrive hours later, when a receipt must be retained, or when the account will use email for recovery. A delay outside the temporary inbox window can permanently block access to the message."] },
    ], related: ["/guides/how-long-does-temp-mail-last", "/guides/how-temp-mail-works", "/guides/is-temp-mail-safe", "/"],
  },
  "temp-mail-for-testing": {
    path: "/guides/temp-mail-for-testing", eyebrow: "Developer workflow", title: "Temporary email for application testing", description: "Use temporary inboxes responsibly to test signup, verification, OTP, and notification flows in systems you own.",
    quickAnswer: "Temporary email is useful for manual and automated QA when the tester controls the application and needs isolated recipients. Tests should use authorized environments, redact message content, and avoid depending on a public inbox for deterministic CI.",
    facts: ["Useful for end-to-end QA", "Each test can use a fresh recipient", "Public services can be nondeterministic", "Only test systems you are authorized to test"],
    sections: [
      { heading: "What to verify", paragraphs: ["A good email-flow test checks more than whether a message arrived. Verify the recipient, subject, sender identity, important text, link destination, expiry behavior, and duplicate-delivery handling. Record delivery latency separately from application response time so infrastructure delays are not misdiagnosed as frontend failures."] },
      { heading: "Manual and automated testing", paragraphs: ["For exploratory QA, a temporary web inbox is convenient because it needs no account setup. For repeatable CI, a dedicated test mail server or documented API with isolated credentials is usually more reliable. MailTemps currently exposes an authenticated product API for its own frontend, not a promised public developer API."], bullets: ["Create a fresh inbox per scenario", "Never log the bearer token", "Wait with a bounded timeout", "Delete test data after the assertion", "Test delayed and duplicate messages"] },
      { heading: "Security boundaries", paragraphs: ["Only test applications and domains you own or are explicitly authorized to assess. Do not use temporary addresses to bypass limits or create accounts on third-party services. Test messages should contain synthetic data, never real passwords, financial records, or personal information."] },
    ], related: ["/guides/how-temp-mail-works", "/guides/temporary-email-security", "/acceptable-use", "/"],
  },
  "protect-email-from-spam": {
    path: "/guides/protect-email-from-spam", eyebrow: "Inbox hygiene", title: "How to protect your email address from spam", description: "Practical ways to reduce unwanted email using temporary addresses, aliases, filters, and careful signup habits.",
    quickAnswer: "Reduce spam by sharing your primary address less often, using temporary email for low-risk one-time needs, using aliases for ongoing relationships, and reporting rather than replying to suspicious messages.",
    facts: ["Minimize address sharing", "Use aliases for ongoing services", "Use temp mail only for short-lived needs", "Enable strong account security"],
    sections: [
      { heading: "Choose the right address for each context", paragraphs: ["A primary mailbox should be reserved for people and accounts that matter. A unique alias works well for shops, newsletters, and services that need future contact. A temporary address works best when the interaction is low risk and no future recovery is expected."] },
      { heading: "Reduce exposure and reaction", paragraphs: ["Avoid publishing a personal address in machine-readable public pages. Review pre-checked marketing consent, unsubscribe from legitimate senders, and use the mail provider's spam-reporting control for deceptive messages. Do not reply to suspicious mail because a response can confirm the address is monitored."], bullets: ["Use unique aliases where possible", "Disable breached or noisy aliases", "Block remote images for untrusted senders", "Inspect link destinations before opening", "Use multi-factor authentication on the permanent mailbox"] },
      { heading: "What temp mail cannot solve", paragraphs: ["Temporary email does not remove tracking performed through a website account, browser fingerprint, payment method, or network connection. It is one layer of data minimization, not a complete privacy system. Use it alongside good browser, password, and account-security practices."] },
    ], related: ["/guides/disposable-email", "/guides/is-temp-mail-safe", "/compare/temp-mail-vs-email-alias", "/"],
  },
  "temporary-email-security": {
    path: "/guides/temporary-email-security", eyebrow: "Security model", title: "Temporary email security risks and safeguards", description: "A threat-focused guide to inbox tokens, message rendering, transport limits, data retention, and safer temporary-email use.",
    quickAnswer: "The main temporary-email risks are unauthorized inbox access, sensitive content retention, hostile message content, address reuse, and false assumptions about anonymity. A safer service uses unguessable tokens, bounded retention, strict recipient checks, and text-only display.",
    facts: ["Tokens must be unguessable", "Addresses alone should not grant access", "Remote content can track readers", "Deletion and retention must be explicit"],
    sections: [
      { heading: "Inbox access and address guessing", paragraphs: ["A generated address is shared with senders and should not be treated as a password. The inbox view needs a separate high-entropy token, and the server should compare a stored token hash. Rate limits reduce automated guessing and creation abuse but should fail safely in production."] },
      { heading: "Message-content threats", paragraphs: ["Email HTML can contain deceptive links, remote images, tracking pixels, and complex markup. Scripts are usually stripped by mail clients, but a temporary-email UI should still avoid injecting raw HTML. MailTemps displays plain text and does not request remote images when the user opens a message."], bullets: ["Treat links as untrusted", "Do not render raw scripts or event handlers", "Keep remote images disabled by default", "Limit message and request sizes", "Validate recipient activity before accepting mail"] },
      { heading: "Retention and operational privacy", paragraphs: ["Automatic expiry is useful only when the cleanup process is reliable and the privacy notice explains any separate log or backup windows. Temporary email is not anonymous by definition: network addresses, timestamps, senders, and recipients can create metadata even when no user account exists."] },
    ], related: ["/privacy", "/guides/is-temp-mail-safe", "/guides/how-temp-mail-works", "/"],
  },
  "how-long-does-temp-mail-last": {
    path: "/guides/how-long-does-temp-mail-last", eyebrow: "Retention and expiry", title: "How long does temporary email last?", description: "Compare common temporary-email lifetimes and understand the exact MailTemps ten-minute expiry and extension limit.",
    quickAnswer: "Temporary email can last from minutes to days depending on the provider. A MailTemps inbox starts at ten minutes, can be extended twice by ten minutes, and can be deleted sooner with Finish.",
    facts: ["Provider lifetimes differ", "MailTemps starts at 10 minutes", "Maximum two extensions", "Expiry ends reliable access"],
    sections: [
      { heading: "There is no universal lifespan", paragraphs: ["The phrase temporary email describes intent, not one technical duration. Some providers keep a mailbox for ten minutes, some for a browser session, and others maintain an alias until the user disables it. Always check the provider's actual expiry rule before relying on delayed delivery."] },
      { heading: "What affects the useful window", paragraphs: ["The useful period must include sender processing, mail transfer, greylisting or retries, and the time a person needs to act. A message triggered near expiry can arrive too late. If the transaction matters or follow-up may occur, choose a permanent address or stable alias instead."], bullets: ["Automated verification may arrive in seconds", "Mail retries may take minutes or hours", "Manual support replies often take longer", "Password recovery may be needed months later"] },
      { heading: "MailTemps timing", paragraphs: ["MailTemps stores expiry and extension usage in the database. Reloading or changing devices does not create extra extensions for the same inbox. Once expired, the API returns an expiry response and the cleanup worker removes the record; the old session should be considered unrecoverable."] },
    ], related: ["/guides/10-minute-mail", "/guides/how-temp-mail-works", "/compare/temporary-email-vs-regular-email", "/"],
  },
};

export const comparisonPages: Record<string, SeoContentPage> = {
  "temporary-email-vs-regular-email": {
    path: "/compare/temporary-email-vs-regular-email", eyebrow: "Comparison", title: "Temporary email vs regular email", description: "Compare temporary and regular email across lifespan, recovery, privacy, reliability, and appropriate use cases.",
    quickAnswer: "Temporary email is optimized for short-lived separation and easy deletion. Regular email is optimized for durable identity, recovery, ongoing communication, and higher-value accounts.",
    facts: ["Temp: short retention", "Regular: long-term access", "Temp: low-risk use", "Regular: important identity and recovery"],
    sections: [
      { heading: "Core differences", paragraphs: ["A regular mailbox is a continuing communication identity. It normally supports sending, receiving, folders, search, recovery, and security controls. A temporary inbox is intentionally narrow: it receives for a bounded period and makes abandonment easy."] },
      { heading: "Which one should you use?", paragraphs: ["Use temporary email when the message is expected immediately, losing it has little consequence, and no future relationship is needed. Use regular email for banking, work, healthcare, purchases with warranties, legal records, personal relationships, and any account that may require recovery."], bullets: ["Low-risk verification: temporary can fit", "Newsletter sample: temporary or alias", "Long-term subscription: alias or regular", "Important account: regular", "Sensitive communication: secure permanent service"] },
      { heading: "Privacy is not binary", paragraphs: ["A permanent address can be privacy-friendly when paired with unique aliases and good security. A temporary address can still leak metadata or expose a message if access controls are weak. Choose based on retention, access, and consequence rather than the label alone."] },
    ], related: ["/compare/temp-mail-vs-email-alias", "/guides/disposable-email", "/guides/is-temp-mail-safe", "/"],
  },
  "temp-mail-vs-email-alias": {
    path: "/compare/temp-mail-vs-email-alias", eyebrow: "Comparison", title: "Temp mail vs email alias", description: "Choose between a short-lived temp inbox and a forwarding email alias based on recovery, privacy, and future contact needs.",
    quickAnswer: "Use temp mail for a low-risk interaction that should end soon. Use an email alias when the sender may need to contact you later but you still want to protect or compartmentalize the primary address.",
    facts: ["Temp mail has its own short-lived inbox", "Aliases forward to another mailbox", "Aliases support future contact", "Temp mail minimizes ongoing exposure"],
    sections: [
      { heading: "How the tools differ", paragraphs: ["A temporary mailbox stores messages at the temp-mail provider until expiry. A forwarding alias receives at one address and delivers to a separate permanent mailbox. The sender sees the alias, but the user keeps long-term access through the destination account."] },
      { heading: "Decision examples", paragraphs: ["A controlled QA test or immediate low-risk code can use temp mail. Shopping, newsletters, travel bookings, and services with future receipts often fit a unique alias better. Banking, government, health, and primary identity accounts should use a carefully secured permanent address."], bullets: ["Need a reply next month: alias", "Need one test message now: temp mail", "Need to disable one noisy sender: alias", "Need no link to a primary inbox: temp mail", "Need account recovery: alias or regular mailbox"] },
      { heading: "Shared limitations", paragraphs: ["Neither tool grants permission to violate platform rules, and neither guarantees anonymity. The alias provider can observe forwarding metadata, while the temp-mail provider processes the temporary message. Read the provider's retention and security practices before sending sensitive information."] },
    ], related: ["/guides/disposable-email", "/guides/protect-email-from-spam", "/compare/temporary-email-vs-regular-email", "/"],
  },
};

export const allPublicPages = [
  ...Object.values(trustPages),
  ...Object.values(guidePages),
  ...Object.values(comparisonPages),
];

export function getPageByPath(path: string) {
  return allPublicPages.find((page) => page.path === path);
}
