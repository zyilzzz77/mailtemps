ALTER TABLE messages
    ADD COLUMN IF NOT EXISTS direction text NOT NULL DEFAULT 'inbound'
        CHECK (direction IN ('inbound', 'outbound')),
    ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'received'
        CHECK (status IN ('received', 'queued', 'sent', 'failed')),
    ADD COLUMN IF NOT EXISTS error_message text NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS messages_outbound_received_idx
    ON messages (received_at DESC) WHERE direction = 'outbound';
