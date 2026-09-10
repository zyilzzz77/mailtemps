export type Inbox = {
  id: string;
  address: string;
  created_at: string;
  expires_at: string;
  extensions_used: number;
  extension_limit: number;
};

export type MessageSummary = {
  id: string;
  sender_name: string;
  sender_address: string;
  recipients: string[];
  subject: string;
  preview: string;
  status: string;
  error_message: string;
  received_at: string;
};

export type Attachment = {
  id: string;
  filename: string;
  content_type: string;
  size_bytes: number;
};

export type Message = {
  id: string;
  internet_message_id: string;
  sender_name: string;
  sender_address: string;
  recipients: string[];
  subject: string;
  text_body: string;
  html_body: string;
  received_at: string;
  attachments: Attachment[];
};

export type InboxPayload = {
  inbox: Inbox;
  messages: MessageSummary[];
  sent: MessageSummary[];
  access_token?: string;
};

export type MessagePayload = { message: Message };

export type SendMessageInput = {
  to: string;
  subject: string;
  body: string;
  turnstile_token: string;
};

export type SendMessagePayload = { message: MessageSummary };

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function apiRequest<T>(path: string, token?: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  if (init?.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(path, { ...init, headers, cache: "no-store" });
  if (response.status === 204) return undefined as T;
  const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null;
  if (!response.ok) {
    throw new ApiError(response.status, payload?.error?.message ?? "Layanan belum dapat memproses permintaan.");
  }
  return payload as T;
}

export async function sendInboxMessage(
  inboxId: string,
  token: string,
  input: SendMessageInput,
): Promise<SendMessagePayload> {
  return apiRequest<SendMessagePayload>(`/api/v1/inboxes/${inboxId}/messages`, token, {
    method: "POST",
    body: JSON.stringify(input),
  });
}
