-- name: ListMessagesByInbox :many
SELECT id, inbox_id, internet_message_id, sender_name, sender_address,
       recipients, subject, left(text_body, 180)::text AS text_body,
       ''::text AS html_body, raw_size_bytes, received_at,
       direction, status, error_message
FROM messages
WHERE inbox_id = $1 AND direction = 'inbound'
ORDER BY received_at DESC
LIMIT $2;

-- name: ListOutboundMessagesByInbox :many
SELECT id, inbox_id, internet_message_id, sender_name, sender_address,
       recipients, subject, left(text_body, 180)::text AS text_body,
       ''::text AS html_body, raw_size_bytes, received_at,
       direction, status, error_message
FROM messages
WHERE inbox_id = $1 AND direction = 'outbound'
ORDER BY received_at DESC
LIMIT $2;

-- name: GetMessageByID :one
SELECT * FROM messages
WHERE id = $1 AND inbox_id = $2
LIMIT 1;

-- name: CreateMessage :one
INSERT INTO messages (
    inbox_id, internet_message_id, sender_name, sender_address, recipients,
    subject, text_body, html_body, raw_size_bytes
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING *;

-- name: CreateOutboundMessage :one
INSERT INTO messages (
    inbox_id, internet_message_id, sender_name, sender_address, recipients,
    subject, text_body, html_body, raw_size_bytes, direction, status
)
VALUES ($1, $2, $3, $4, $5, $6, $7, '', 0, 'outbound', 'queued')
RETURNING *;

-- name: UpdateMessageStatus :exec
UPDATE messages
SET status = $2, error_message = $3
WHERE id = $1;

-- name: CountOutboundByInboxSince :one
SELECT count(*) FROM messages
WHERE inbox_id = $1 AND direction = 'outbound' AND received_at >= $2;

-- name: CountOutboundSince :one
SELECT count(*) FROM messages
WHERE direction = 'outbound' AND received_at >= $1;

-- name: DeleteMessage :execrows
DELETE FROM messages WHERE id = $1 AND inbox_id = $2;

-- name: CreateAttachment :one
INSERT INTO attachments (message_id, filename, content_type, size_bytes, storage_key)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: ListAttachmentsByMessage :many
SELECT * FROM attachments WHERE message_id = $1 ORDER BY created_at;
