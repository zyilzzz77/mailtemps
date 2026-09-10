"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  CircleCheckBig,
  Copy,
  Mail,
  PenLine,
  RefreshCw,
  Send,
  ShieldCheck,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import useSWR from "swr";

import HomepageSeo from "@/components/homepage-seo";
import {
  ApiError,
  apiRequest,
  sendInboxMessage,
  type InboxPayload,
  type MessagePayload,
} from "@/lib/api";
import { sanitizeEmailHtml } from "@/lib/sanitize";

type InboxSession = { id: string; token: string; version: number };
type ConfirmMode = "replace" | "finish";
type InboxView = "inbox" | "sent";
type ToastTone = "success" | "error";
type Toast = { message: string; tone: ToastTone };
type MailtempsAppProps = { mode: "generator" | "inbox"; version?: number };

const STORAGE_KEY = "mailtemps.inbox.v1";
const MAIL_DOMAIN = "mailtemps.space";
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "0x4AAAAAAEur9TakuO4XajKU";
const TURNSTILE_SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

function loadTurnstileScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.turnstile) {
      resolve();
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>("script[data-turnstile]");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Turnstile failed to load")));
      return;
    }
    const script = document.createElement("script");
    script.src = TURNSTILE_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.dataset.turnstile = "true";
    script.addEventListener("load", () => resolve());
    script.addEventListener("error", () => reject(new Error("Turnstile failed to load")));
    document.head.appendChild(script);
  });
}

const RING_LENGTH = 264;
const relativeTime = new Intl.RelativeTimeFormat("id-ID", {
  numeric: "auto",
  style: "short",
});
const fileSizeNumber = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 1,
});

function formatTime(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds);
  return `${Math.floor(safe / 60).toString().padStart(2, "0")}:${(safe % 60).toString().padStart(2, "0")}`;
}

function timeAgo(value: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 45) return relativeTime.format(0, "second");
  if (seconds < 3600) return relativeTime.format(-Math.floor(seconds / 60), "minute");
  if (seconds < 86400) return relativeTime.format(-Math.floor(seconds / 3600), "hour");
  return relativeTime.format(-Math.floor(seconds / 86400), "day");
}

function formatFileSize(sizeBytes: number) {
  return `${fileSizeNumber.format(Math.max(sizeBytes / 1024, 0.1))}\u00a0KB`;
}

function copyWithSelection(value: string) {
  const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const input = document.createElement("textarea");
  input.value = value;
  input.setAttribute("readonly", "");
  input.style.position = "fixed";
  input.style.inset = "0 auto auto -9999px";
  input.style.opacity = "0";
  document.body.appendChild(input);
  input.focus();
  input.select();
  input.setSelectionRange(0, value.length);
  const copiedSuccessfully = document.execCommand("copy");
  input.remove();
  previousFocus?.focus();
  if (!copiedSuccessfully) throw new Error("Browser rejected the copy command");
}

function initials(name: string, address: string) {
  return (name.trim() || address.trim() || "M").slice(0, 1).toUpperCase();
}

function trapDialogTab(event: KeyboardEvent, container: HTMLElement | null) {
  if (event.key !== "Tab" || !container) return;
  const focusable = Array.from(
    container.querySelectorAll<HTMLElement>(
      'button:not(:disabled), [href], input:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
    ),
  );
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && (document.activeElement === first || document.activeElement === container)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

export default function MailtempsApp({ mode, version = 0 }: MailtempsAppProps) {
  const router = useRouter();
  const isDevelopment = process.env.NODE_ENV === "development";
  const [session, setSession] = useState<InboxSession | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [compactMode, setCompactMode] = useState(false);
  const [mailName, setMailName] = useState("rintikmail");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(false);
  const [actionPending, setActionPending] = useState(false);
  const [formError, setFormError] = useState("");
  const [actionError, setActionError] = useState("");
  const [toast, setToast] = useState<Toast | null>(null);
  const [confirmMode, setConfirmMode] = useState<ConfirmMode | null>(null);
  const [activeView, setActiveView] = useState<InboxView>("inbox");
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [sending, setSending] = useState(false);
  const [composeError, setComposeError] = useState("");
  const toastTimer = useRef<number | null>(null);
  const confirmDialog = useRef<HTMLDivElement | null>(null);
  const composeDialog = useRef<HTMLDivElement | null>(null);
  const lastFocusedElement = useRef<HTMLElement | null>(null);
  const turnstileRef = useRef<HTMLDivElement | null>(null);
  const turnstileWidgetId = useRef("");
  const turnstileToken = useRef("");
  const composeTurnstileRef = useRef<HTMLDivElement | null>(null);
  const composeTurnstileWidgetId = useRef("");
  const composeTurnstileToken = useRef("");

  useEffect(() => {
    let savedSession: InboxSession | null = null;
    try {
      const saved = window.sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<InboxSession>;
        if (typeof parsed.id === "string" && typeof parsed.token === "string") {
          savedSession = {
            id: parsed.id,
            token: parsed.token,
            version: Number.isSafeInteger(parsed.version) && Number(parsed.version) >= 0 ? Number(parsed.version) : 0,
          };
        }
      }
    } catch {
      window.sessionStorage.removeItem(STORAGE_KEY);
    }
    queueMicrotask(() => {
      setSession(savedSession);
      setSessionReady(true);
      if (mode === "generator" && savedSession) {
        router.replace(`/inbox/v${savedSession.version}`);
      } else if (mode === "inbox" && !savedSession) {
        router.replace("/");
      } else if (mode === "inbox" && savedSession && savedSession.version !== version) {
        router.replace(`/inbox/v${savedSession.version}`);
      }
    });
  }, [mode, router, version]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => () => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 820px)");
    const syncMode = () => setCompactMode(media.matches);
    syncMode();
    media.addEventListener("change", syncMode);
    return () => media.removeEventListener("change", syncMode);
  }, []);

  useEffect(() => {
    if (mode !== "generator" || !TURNSTILE_SITE_KEY) return;
    let cancelled = false;
    loadTurnstileScript()
      .then(() => {
        if (cancelled || !turnstileRef.current || !window.turnstile) return;
        turnstileWidgetId.current = window.turnstile.render(turnstileRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          theme: "auto",
          callback: (token: string) => {
            turnstileToken.current = token;
          },
          "expired-callback": () => {
            turnstileToken.current = "";
          },
          "error-callback": () => {
            turnstileToken.current = "";
          },
        });
      })
      .catch(() => {
        setFormError("Verifikasi keamanan gagal dimuat. Muat ulang halaman lalu coba lagi.");
      });
    return () => {
      cancelled = true;
      if (turnstileWidgetId.current && window.turnstile) {
        window.turnstile.remove(turnstileWidgetId.current);
        turnstileWidgetId.current = "";
        turnstileToken.current = "";
      }
    };
  }, [mode]);

  useEffect(() => {
    if (mode !== "inbox" || !composeOpen || !TURNSTILE_SITE_KEY) return;
    let cancelled = false;
    loadTurnstileScript()
      .then(() => {
        if (cancelled || !composeTurnstileRef.current || !window.turnstile) return;
        composeTurnstileWidgetId.current = window.turnstile.render(composeTurnstileRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          theme: "auto",
          callback: (token: string) => {
            composeTurnstileToken.current = token;
          },
          "expired-callback": () => {
            composeTurnstileToken.current = "";
          },
          "error-callback": () => {
            composeTurnstileToken.current = "";
          },
        });
      })
      .catch(() => {
        setComposeError("Verifikasi keamanan gagal dimuat. Muat ulang halaman lalu coba lagi.");
      });
    return () => {
      cancelled = true;
      if (composeTurnstileWidgetId.current && window.turnstile) {
        window.turnstile.remove(composeTurnstileWidgetId.current);
        composeTurnstileWidgetId.current = "";
        composeTurnstileToken.current = "";
      }
    };
  }, [mode, composeOpen]);

  useEffect(() => {
    if (!composeOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusFrame = window.requestAnimationFrame(() => composeDialog.current?.focus());

    function handleDialogKeys(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setComposeOpen(false);
        return;
      }
      trapDialogTab(event, composeDialog.current);
    }

    document.addEventListener("keydown", handleDialogKeys);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleDialogKeys);
      document.body.style.overflow = previousOverflow;
      if (lastFocusedElement.current?.isConnected) lastFocusedElement.current.focus();
    };
  }, [composeOpen]);

  useEffect(() => {
    if (!confirmMode) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusFrame = window.requestAnimationFrame(() => confirmDialog.current?.focus());

    function handleDialogKeys(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (confirmDialog.current?.getAttribute("aria-busy") === "true") return;
        event.preventDefault();
        setConfirmMode(null);
        return;
      }
      trapDialogTab(event, confirmDialog.current);
    }

    document.addEventListener("keydown", handleDialogKeys);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleDialogKeys);
      document.body.style.overflow = previousOverflow;
      if (lastFocusedElement.current?.isConnected) lastFocusedElement.current.focus();
    };
  }, [confirmMode]);

  const inboxKey: [string, string] | null = session ? [`/api/v1/inboxes/${session.id}`, session.token] : null;
  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWR<InboxPayload>(
    inboxKey,
    ([path, token]: [string, string]) => apiRequest<InboxPayload>(path, token),
    {
      refreshInterval: 5000,
      revalidateOnFocus: true,
      shouldRetryOnError: false,
      onError: (requestError) => {
        if (requestError instanceof ApiError && (requestError.status === 401 || requestError.status === 404 || requestError.status === 410)) {
          window.sessionStorage.removeItem(STORAGE_KEY);
          setSession(null);
          setSelectedId(null);
          router.replace("/");
        }
      },
    },
  );

  const selectedMessageExists = data?.messages.some((message) => message.id === selectedId) ?? false;
  const effectiveSelectedId = selectedMessageExists
    ? selectedId
    : compactMode
      ? null
      : data?.messages[0]?.id ?? null;

  const messageKey: [string, string] | null = session && effectiveSelectedId
    ? [`/api/v1/inboxes/${session.id}/messages/${effectiveSelectedId}`, session.token]
    : null;
  const { data: messageData, isLoading: messageLoading } = useSWR<MessagePayload>(
    messageKey,
    ([path, token]: [string, string]) => apiRequest<MessagePayload>(path, token),
    { revalidateOnFocus: false, shouldRetryOnError: false },
  );

  const safeHtml = useMemo(
    () => (messageData?.message.html_body ? sanitizeEmailHtml(messageData.message.html_body) : ""),
    [messageData],
  );

  const secondsLeft = data?.inbox
    ? Math.max(0, Math.ceil((new Date(data.inbox.expires_at).getTime() - now) / 1000))
    : 0;
  const totalLifetime = data?.inbox
    ? Math.max(1, Math.floor((new Date(data.inbox.expires_at).getTime() - new Date(data.inbox.created_at).getTime()) / 1000))
    : 600;
  const ringOffset = RING_LENGTH - RING_LENGTH * Math.min(secondsLeft / totalLifetime, 1);
  const extensionsUsed = data?.inbox.extensions_used ?? 0;
  const extensionLimit = data?.inbox.extension_limit ?? 2;
  const extensionsRemaining = Math.max(0, extensionLimit - extensionsUsed);
  const inboxAddress = data?.inbox.address ?? `••••••@${MAIL_DOMAIN}`;

  const previewName = useMemo(() => {
    const normalized = mailName.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 32);
    return normalized || "inbox";
  }, [mailName]);

  function showToast(message: string, tone: ToastTone = "success") {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast({ message, tone });
    toastTimer.current = window.setTimeout(() => {
      setToast(null);
      toastTimer.current = null;
    }, tone === "error" ? 4200 : 2200);
  }

  function openCompose() {
    lastFocusedElement.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setComposeError("");
    setComposeOpen(true);
  }

  async function createInbox(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setFormError("");
    try {
      const token = turnstileToken.current;
      if (TURNSTILE_SITE_KEY && !token) {
        setFormError("Selesaikan verifikasi keamanan di bawah tombol terlebih dahulu.");
        return;
      }
      const payload = await apiRequest<InboxPayload>("/api/v1/inboxes", undefined, {
        method: "POST",
        body: JSON.stringify({ name: mailName, turnstile_token: token }),
      });
      const nextSession = { id: payload.inbox.id, token: payload.access_token ?? "", version: 0 };
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession));
      setSession(nextSession);
      setSelectedId(null);
      router.push("/inbox/v0");
    } catch (requestError) {
      setFormError(requestError instanceof Error ? requestError.message : "The inbox could not be created.");
    } finally {
      turnstileToken.current = "";
      if (turnstileWidgetId.current && window.turnstile) window.turnstile.reset(turnstileWidgetId.current);
      setCreating(false);
    }
  }

  async function copyAddress() {
    if (!data?.inbox.address) return;
    setActionError("");
    try {
      if (window.isSecureContext && navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(data.inbox.address);
        } catch {
          copyWithSelection(data.inbox.address);
        }
      } else {
        copyWithSelection(data.inbox.address);
      }
      setCopied(true);
      showToast("Email address copied");
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setActionError("The address could not be copied automatically. Press and hold it to copy manually.");
    }
  }

  async function extendInbox() {
    if (!session || extensionsRemaining === 0) return;
    setActionPending(true);
    setActionError("");
    try {
      await apiRequest(`/api/v1/inboxes/${session.id}/extend`, session.token, { method: "PATCH" });
      await mutate();
    } catch (requestError) {
      setActionError(requestError instanceof Error ? requestError.message : "The inbox time could not be extended. Try again.");
    } finally {
      setActionPending(false);
    }
  }

  function requestInboxClose(mode: ConfirmMode) {
    lastFocusedElement.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setActionError("");
    setConfirmMode(mode);
  }

  function dismissConfirm() {
    if (!actionPending) setConfirmMode(null);
  }

  async function closeInbox(mode: ConfirmMode) {
    if (!session) return;
    setActionPending(true);
    setActionError("");
    try {
      if (mode === "replace") {
        const payload = await apiRequest<InboxPayload>(`/api/v1/inboxes/${session.id}/rotate`, session.token, { method: "POST" });
        const nextVersion = session.version + 1;
        const nextSession = { id: payload.inbox.id, token: payload.access_token ?? "", version: nextVersion };
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession));
        setSession(nextSession);
        setSelectedId(null);
        setConfirmMode(null);
        showToast("A new address was created");
        router.replace(`/inbox/v${nextVersion}`);
      } else {
        await apiRequest(`/api/v1/inboxes/${session.id}`, session.token, { method: "DELETE" });
        window.sessionStorage.removeItem(STORAGE_KEY);
        setSession(null);
        setSelectedId(null);
        setConfirmMode(null);
        showToast("The inbox was finished and deleted");
        router.replace("/");
      }
    } catch (requestError) {
      setActionError(requestError instanceof Error ? requestError.message : "The inbox could not be deleted. Try again.");
    } finally {
      setActionPending(false);
    }
  }

  async function deleteMessage() {
    if (!session || !effectiveSelectedId) return;
    if (!window.confirm("Delete this message permanently?")) return;
    setActionPending(true);
    setActionError("");
    try {
      await apiRequest(`/api/v1/inboxes/${session.id}/messages/${effectiveSelectedId}`, session.token, { method: "DELETE" });
      setSelectedId(null);
      await mutate();
    } catch (requestError) {
      setActionError(requestError instanceof Error ? requestError.message : "The message could not be deleted. Try again.");
    } finally {
      setActionPending(false);
    }
  }

  function closeMessage() {
    const previousId = effectiveSelectedId;
    setSelectedId(null);
    window.requestAnimationFrame(() => {
      if (previousId) document.getElementById(`mail-${previousId}`)?.focus();
    });
  }

  async function sendEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    setSending(true);
    setComposeError("");
    try {
      const token = composeTurnstileToken.current;
      if (TURNSTILE_SITE_KEY && !token) {
        setComposeError("Selesaikan verifikasi keamanan di bawah tombol terlebih dahulu.");
        return;
      }
      await sendInboxMessage(session.id, session.token, {
        to: composeTo,
        subject: composeSubject,
        body: composeBody,
        turnstile_token: token,
      });
      setComposeTo("");
      setComposeSubject("");
      setComposeBody("");
      setComposeOpen(false);
      await mutate();
      setActiveView("sent");
      showToast("Email sent", "success");
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Email could not be sent.";
      setComposeError(message);
      showToast(message, "error");
      await mutate();
    } finally {
      composeTurnstileToken.current = "";
      if (composeTurnstileWidgetId.current && window.turnstile) window.turnstile.reset(composeTurnstileWidgetId.current);
      setSending(false);
    }
  }

  return (
    <main className="app-shell">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <header className="topbar">
        <Link className="brand" href="/" aria-label="MailTemps home">
          <span className="brand-mark" aria-hidden="true">
            <Image src="/logo-mailtemps.webp" alt="" width={38} height={38} loading="eager" />
          </span>
          <span>MailTemps</span>
        </Link>
        <div className="topbar-status">
          <span className="live-dot" aria-hidden="true" />
          <span>{session ? error ? "Connection lost" : "Inbox active" : "Ready to create"}</span>
          <span className="status-divider" aria-hidden="true" />
          <span>Auto delete</span>
        </div>
      </header>

      {mode === "generator" ? (
        <section className="create-deck" id="generator" aria-labelledby="create-title">
          <div>
            <p className="eyebrow">New temporary address</p>
            <h1 id="create-title">Free Temp Mail.<br />Instant temporary email.</h1>
            <p className="deck-note" id="main-content">Create a disposable email address instantly without registration. Receive verification email while keeping your primary inbox away from spam.</p>
          </div>
          <form className="create-form" onSubmit={createInbox}>
            <label htmlFor="mail-name">Email name</label>
            <div className="name-input-row">
              <input
                id="mail-name"
                value={mailName}
                onChange={(event) => setMailName(event.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""))}
                autoComplete="off"
                inputMode="text"
                autoCapitalize="none"
                spellCheck={false}
                aria-describedby="mail-name-hint mail-preview"
                minLength={2}
                maxLength={32}
                placeholder="rintikmail…"
                required
              />
              <span>+ 6 random digits</span>
            </div>
            <p className="field-hint" id="mail-name-hint">Use 2–32 letters or numbers, without spaces.</p>
            <p className="address-preview" id="mail-preview" aria-live="polite">{previewName}<strong>••••••</strong>@<span translate="no">{MAIL_DOMAIN}</span></p>
            <button className="primary-button create-button" type="submit" disabled={creating}>
              <Mail aria-hidden="true" /> {creating ? "Creating…" : "Create inbox"}
            </button>
            {TURNSTILE_SITE_KEY ? <div className="turnstile-wrap" ref={turnstileRef} /> : null}
            {formError ? <p className="form-error" role="alert">{formError}</p> : null}
            {isDevelopment ? <p className="local-notice">Local mode · send test mail to SMTP localhost:2525. Gmail works only after public DNS MX and the mail server are active.</p> : null}
          </form>
        </section>
      ) : !sessionReady || !session ? (
        <section className="inbox-loading" id="main-content" aria-live="polite">
          <span className="live-dot" aria-hidden="true" />
          <p>Preparing your private inbox…</p>
        </section>
      ) : (
        <>
          <section className="address-deck" id="main-content" aria-labelledby="address-title">
            <div className="deck-copy">
              <p className="eyebrow">Your temporary address</p>
              <div className="address-row">
                <h1 id="address-title" aria-label={inboxAddress}>
                  <span className="address-full" translate="no">{inboxAddress}</span>
                </h1>
                <button className="icon-button copy-button" type="button" onClick={copyAddress} aria-label="Copy email address"><Copy aria-hidden="true" /></button>
              </div>
              <p className="deck-note">Ready to receive email. New messages are checked automatically every five seconds.</p>
              {isDevelopment ? <p className="local-notice compact">Local mode · test email arrives through SMTP localhost:2525, not from Gmail.</p> : null}
              <div className="deck-actions">
                <button className="secondary-button compose-trigger" type="button" onClick={openCompose} disabled={actionPending}><PenLine aria-hidden="true" /> Compose</button>
                <button className="primary-button" type="button" onClick={copyAddress} disabled={!data}><Copy aria-hidden="true" />{copied ? "Copied" : "Copy address"}</button>
                <button className="secondary-button" type="button" onClick={() => requestInboxClose("replace")} disabled={actionPending}>Change address</button>
                <button className="finish-button" type="button" onClick={() => requestInboxClose("finish")} disabled={actionPending}><CircleCheckBig aria-hidden="true" /> Finish</button>
              </div>
            </div>
            <div className="timer-card" aria-label={`Address expires in ${formatTime(secondsLeft)}`}>
              <div className="timer-ring">
                <svg viewBox="0 0 96 96" aria-hidden="true"><circle className="ring-track" cx="48" cy="48" r="42" /><circle className="ring-progress" cx="48" cy="48" r="42" style={{ strokeDashoffset: ringOffset }} /></svg>
                <div className="timer-value"><span>{isLoading ? "--:--" : formatTime(secondsLeft)}</span><small>left</small></div>
              </div>
              <button type="button" onClick={extendInbox} disabled={actionPending || isLoading || extensionsRemaining === 0}>
                {extensionsRemaining > 0 ? `+ 10 minutes · ${extensionsRemaining} left` : "2-extension limit reached"}
              </button>
            </div>
          </section>

          {error ? <div className="service-error" role="alert">The inbox connection was lost. Make sure the API is running, then refresh.</div> : null}
          {actionError && !confirmMode ? <div className="service-error" role="alert">{actionError}</div> : null}

          <div className="view-tabs" role="tablist" aria-label="Inbox views">
            <button className={`view-tab ${activeView === "inbox" ? "is-active" : ""}`} type="button" role="tab" aria-selected={activeView === "inbox"} onClick={() => setActiveView("inbox")}>
              <Mail aria-hidden="true" /> Inbox
            </button>
            <button className={`view-tab ${activeView === "sent" ? "is-active" : ""}`} type="button" role="tab" aria-selected={activeView === "sent"} onClick={() => setActiveView("sent")}>
              <Send aria-hidden="true" /> Sent{data?.sent?.length ? ` (${data.sent.length})` : ""}
            </button>
          </div>

          {activeView === "sent" ? (
            <section className="mail-workspace is-single" aria-label="Sent messages">
              <aside className="mail-list-panel">
                <div className="panel-heading">
                  <div><p className="eyebrow">Sent messages</p><h2>{data?.sent?.length ?? 0} email</h2></div>
                  <button className={`icon-button ${isValidating ? "is-spinning" : ""}`} type="button" onClick={() => mutate()} aria-label="Refresh sent messages"><RefreshCw aria-hidden="true" /></button>
                </div>
                <ul className="mail-list">
                  {data?.sent?.length ? data.sent.map((mail, index) => (
                    <li className="mail-list-entry" key={mail.id}>
                      <div className="mail-item is-static">
                        <span className="sender-mark" data-color={index % 2 === 0 ? "orange" : "blue"}>{initials("", mail.recipients[0] ?? "")}</span>
                        <span className="mail-summary">
                          <span className="mail-meta"><strong>{mail.recipients.join(", ") || "No recipient"}</strong><time dateTime={mail.received_at}>{timeAgo(mail.received_at)}</time></span>
                          <span className="mail-subject">{mail.subject || "No subject"}</span>
                          <span className="mail-preview">{mail.status === "failed" ? mail.error_message || "Delivery failed" : mail.preview || "Sent"}</span>
                        </span>
                        <span className="status-badge" data-status={mail.status === "failed" ? "failed" : "sent"}>{mail.status === "failed" ? "Failed" : "Sent"}</span>
                      </div>
                    </li>
                  )) : (
                    <li className="empty-list"><span><Send aria-hidden="true" /></span><strong>No sent mail</strong><p>Messages you send appear here.</p></li>
                  )}
                </ul>
              </aside>
            </section>
          ) : (
          <section className={`mail-workspace ${effectiveSelectedId ? "has-message-open" : ""}`} aria-label="Kotak masuk sementara">
            <aside className="mail-list-panel">
              <div className="panel-heading">
                <div><p className="eyebrow">Incoming messages</p><h2>{data?.messages.length ?? 0} email</h2></div>
                <button className={`icon-button ${isValidating ? "is-spinning" : ""}`} type="button" onClick={() => mutate()} aria-label="Refresh inbox"><RefreshCw aria-hidden="true" /></button>
              </div>
              <ul className="mail-list">
                {isLoading ? <li className="list-loading">Checking deliveries…</li> : null}
                {!isLoading && data?.messages.length ? data.messages.map((mail, index) => (
                  <li className="mail-list-entry" key={mail.id}>
                    <button id={`mail-${mail.id}`} className={`mail-item ${effectiveSelectedId === mail.id ? "is-selected" : ""}`} type="button" onClick={() => setSelectedId(mail.id)} aria-current={effectiveSelectedId === mail.id ? "true" : undefined}>
                      <span className="sender-mark" data-color={index % 2 === 0 ? "blue" : "orange"}>{initials(mail.sender_name, mail.sender_address)}</span>
                      <span className="mail-summary">
                        <span className="mail-meta"><strong>{mail.sender_name || mail.sender_address}</strong><time dateTime={mail.received_at}>{timeAgo(mail.received_at)}</time></span>
                        <span className="mail-subject">{mail.subject || "No subject"}</span>
                        <span className="mail-preview">{mail.preview || "Email without a text version."}</span>
                      </span>
                    </button>
                  </li>
                )) : null}
                {!isLoading && data?.messages.length === 0 ? (
                  <li className="empty-list"><span><Mail aria-hidden="true" /></span><strong>Waiting for mail</strong><p>New email will appear here.</p></li>
                ) : null}
              </ul>
            </aside>

            <article className="message-panel">
              {effectiveSelectedId ? (
                <>
                  <div className="message-toolbar">
                    <button className="message-back" type="button" onClick={closeMessage}><ChevronLeft aria-hidden="true" /> Inbox</button>
                    <span className="message-reference">Pesan / {effectiveSelectedId.slice(0, 8)}</span>
                    <button className="icon-button danger-button" type="button" onClick={deleteMessage} disabled={actionPending} aria-label="Delete message"><Trash2 aria-hidden="true" /></button>
                  </div>
                  {messageLoading || !messageData ? <div className="empty-message"><p>Loading message…</p></div> : (
                    <div className="message-content">
                      <p className="eyebrow">{timeAgo(messageData.message.received_at)}</p>
                      <h2>{messageData.message.subject || "No subject"}</h2>
                      <div className="sender-line"><span className="sender-mark large" data-color="blue">{initials(messageData.message.sender_name, messageData.message.sender_address)}</span><div><strong>{messageData.message.sender_name || "Sender"}</strong><span>{messageData.message.sender_address}</span></div></div>
                      <div className="message-body">{safeHtml ? <div className="message-html" dangerouslySetInnerHTML={{ __html: safeHtml }} /> : <p>{messageData.message.text_body || "This email does not have a safe text version to display."}</p>}</div>
                      {messageData.message.attachments.length ? <div className="attachments"><strong>Attachments</strong>{messageData.message.attachments.map((attachment) => <span key={attachment.id}>{attachment.filename || "Unnamed file"} · {formatFileSize(attachment.size_bytes)}</span>)}</div> : null}
                    </div>
                  )}
                  <footer className="message-safety"><ShieldCheck aria-hidden="true" /> HTML is sanitized: scripts, external images, and trackers are blocked.</footer>
                </>
              ) : (
                <div className="empty-message"><span><Mail aria-hidden="true" /></span><h2>No email yet</h2><p>Use the address above. Incoming email appears automatically without reloading the page.</p><button className="secondary-button" type="button" onClick={copyAddress}>{copied ? "Address copied" : "Copy address"}</button></div>
              )}
            </article>
          </section>
          )}
        </>
      )}

      {mode === "generator" ? <HomepageSeo /> : null}
      {mode === "generator" ? <footer className="site-footer"><span translate="no">MailTemps.space / temporary mail</span><span>Inboxes and messages are deleted automatically after expiry.</span></footer> : null}
      {composeOpen ? (
        <div className="confirm-overlay">
          <div
            className="compose-dialog"
            ref={composeDialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="compose-title"
            tabIndex={-1}
          >
            <button className="confirm-close" type="button" onClick={() => setComposeOpen(false)} aria-label="Tutup form kirim">
              <X aria-hidden="true" />
            </button>
            <div className="compose-head">
              <p className="eyebrow">From {inboxAddress}</p>
              <h2 id="compose-title">New message</h2>
            </div>
            <form className="compose-form" onSubmit={sendEmail}>
              <label htmlFor="compose-to">To</label>
              <div className="name-input-row">
                <input id="compose-to" type="email" value={composeTo} onChange={(event) => setComposeTo(event.target.value)} placeholder="friend@example.com" autoComplete="off" spellCheck={false} required />
              </div>
              <label htmlFor="compose-subject">Subject</label>
              <div className="name-input-row">
                <input id="compose-subject" value={composeSubject} onChange={(event) => setComposeSubject(event.target.value)} maxLength={200} placeholder="Subject" autoComplete="off" required />
              </div>
              <label htmlFor="compose-body">Message</label>
              <textarea id="compose-body" value={composeBody} onChange={(event) => setComposeBody(event.target.value)} rows={7} maxLength={16000} placeholder="Write your message…" required />
              <p className="field-hint">Plain text only · one recipient · outgoing mail is rate limited.</p>
              <button className="primary-button create-button" type="submit" disabled={sending || actionPending}>
                <Send aria-hidden="true" /> {sending ? "Sending…" : "Send email"}
              </button>
              {TURNSTILE_SITE_KEY ? <div className="turnstile-wrap" ref={composeTurnstileRef} /> : null}
              {composeError ? <p className="form-error" role="alert">{composeError}</p> : null}
            </form>
          </div>
        </div>
      ) : null}
      {confirmMode ? (
        <div className="confirm-overlay">
          <div
            className="confirm-dialog"
            ref={confirmDialog}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby="confirm-description"
            aria-busy={actionPending}
            tabIndex={-1}
          >
            <button className="confirm-close" type="button" onClick={dismissConfirm} disabled={actionPending} aria-label="Tutup konfirmasi">
              <X aria-hidden="true" />
            </button>
            <span className="confirm-icon" aria-hidden="true"><TriangleAlert /></span>
            <div className="confirm-copy">
              <p className="eyebrow">Permanent action</p>
              <h2 id="confirm-title">{confirmMode === "finish" ? "Finish this inbox?" : "Change the inbox address?"}</h2>
              <p id="confirm-description">
                {confirmMode === "finish"
                  ? "The inbox and every email inside it will be deleted permanently. You cannot return to or recover this inbox."
                  : "The old inbox and its messages will be deleted permanently. MailTemps will create a new address with the same name and six different random digits."}
              </p>
              <code translate="no">{inboxAddress}</code>
            </div>
            {actionError ? <p className="confirm-error" role="alert">{actionError}</p> : null}
            <div className="confirm-actions">
              <button className="secondary-button" type="button" onClick={dismissConfirm} disabled={actionPending}>Cancel</button>
              <button className="confirm-destructive" type="button" onClick={() => closeInbox(confirmMode)} disabled={actionPending}>
                <Trash2 aria-hidden="true" /> {actionPending ? "Deleting…" : confirmMode === "finish" ? "Yes, finish" : "Yes, change address"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <div
        className={`toast ${toast ? "is-visible" : ""} ${toast?.tone === "error" ? "is-error" : ""}`}
        role={toast?.tone === "error" ? "alert" : "status"}
        aria-live={toast?.tone === "error" ? "assertive" : "polite"}
      >
        {toast ? (
          <>
            <span className={`toast-check ${toast.tone === "error" ? "is-error" : ""}`}>
              {toast.tone === "error" ? <X aria-hidden="true" /> : <CircleCheckBig aria-hidden="true" />}
            </span>
            <span>{toast.message}</span>
          </>
        ) : null}
      </div>
    </main>
  );
}
