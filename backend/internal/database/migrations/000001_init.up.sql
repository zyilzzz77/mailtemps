CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE inboxes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    local_part text NOT NULL UNIQUE CHECK (local_part ~ '^[a-z0-9]{7,38}$'),
    address text NOT NULL UNIQUE,
    token_hash bytea NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL,
    extensions_used smallint NOT NULL DEFAULT 0 CHECK (extensions_used BETWEEN 0 AND 2)
);

CREATE INDEX inboxes_expires_at_idx ON inboxes (expires_at);

CREATE TABLE messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    inbox_id uuid NOT NULL REFERENCES inboxes(id) ON DELETE CASCADE,
    internet_message_id text NOT NULL DEFAULT '',
    sender_name text NOT NULL DEFAULT '',
    sender_address text NOT NULL DEFAULT '',
    recipients text[] NOT NULL DEFAULT '{}',
    subject text NOT NULL DEFAULT '(Tanpa subjek)',
    text_body text NOT NULL DEFAULT '',
    html_body text NOT NULL DEFAULT '',
    raw_size_bytes bigint NOT NULL DEFAULT 0,
    received_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX messages_inbox_received_idx ON messages (inbox_id, received_at DESC);

CREATE TABLE attachments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    filename text NOT NULL,
    content_type text NOT NULL DEFAULT 'application/octet-stream',
    size_bytes bigint NOT NULL DEFAULT 0,
    storage_key text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX attachments_message_idx ON attachments (message_id);
