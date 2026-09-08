-- name: CreateInbox :one
INSERT INTO inboxes (local_part, address, token_hash, expires_at)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: GetInboxByID :one
SELECT * FROM inboxes WHERE id = $1 LIMIT 1;

-- name: GetActiveInboxByAddress :one
SELECT * FROM inboxes
WHERE lower(address) = lower($1) AND expires_at > now()
LIMIT 1;

-- name: UpdateInboxExpiry :one
UPDATE inboxes
SET expires_at = $2,
    extensions_used = extensions_used + 1
WHERE id = $1 AND extensions_used < 2
RETURNING *;

-- name: DeleteInbox :execrows
DELETE FROM inboxes WHERE id = $1;

-- name: DeleteExpiredInboxes :many
DELETE FROM inboxes
WHERE id IN (
    SELECT id FROM inboxes
    WHERE expires_at <= now()
    ORDER BY expires_at
    LIMIT $1
)
RETURNING id;
