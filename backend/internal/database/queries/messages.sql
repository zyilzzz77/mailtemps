-- name: ListMessagesByInbox :many
SELECT id, inbox_id, internet_message_id, sender_name, sender_address,
       recipients, subject, left(text_body, 180)::text AS text_body,
       ''::text AS html_body, raw_size_bytes, received_at
FROM messages
WHERE inbox_id = $1
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

-- name: DeleteMessage :execrows
DELETE FROM messages WHERE id = $1 AND inbox_id = $2;

-- name: CreateAttachment :one
INSERT INTO attachments (message_id, filename, content_type, size_bytes, storage_key)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: ListAttachmentsByMessage :many
SELECT * FROM attachments WHERE message_id = $1 ORDER BY created_at;

