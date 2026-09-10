DROP INDEX IF EXISTS messages_outbound_received_idx;

ALTER TABLE messages
    DROP COLUMN IF EXISTS error_message,
    DROP COLUMN IF EXISTS status,
    DROP COLUMN IF EXISTS direction;
