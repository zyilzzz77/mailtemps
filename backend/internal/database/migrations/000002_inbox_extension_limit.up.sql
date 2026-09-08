ALTER TABLE inboxes
ADD COLUMN IF NOT EXISTS extensions_used smallint NOT NULL DEFAULT 0
CHECK (extensions_used BETWEEN 0 AND 2);
