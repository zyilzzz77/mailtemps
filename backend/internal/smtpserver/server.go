package smtpserver

import (
	"context"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/mail"
	"strings"
	"time"

	mailmessage "github.com/emersion/go-message/mail"
	"github.com/emersion/go-smtp"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	"mailtemps.space/backend/internal/config"
	database "mailtemps.space/backend/internal/database/generated"
)

type Backend struct {
	cfg     config.Config
	pool    *pgxpool.Pool
	queries *database.Queries
	redis   *redis.Client
	log     *slog.Logger
}

type session struct {
	backend   *Backend
	from      string
	recipient *database.Inbox
}

type attachmentMeta struct {
	filename    string
	contentType string
	size        int64
}

type countingReader struct {
	reader io.Reader
	read   int64
}

func (r *countingReader) Read(buffer []byte) (int, error) {
	n, err := r.reader.Read(buffer)
	r.read += int64(n)
	return n, err
}

func New(cfg config.Config, pool *pgxpool.Pool, redisClient *redis.Client, logger *slog.Logger) *smtp.Server {
	backend := &Backend{cfg: cfg, pool: pool, queries: database.New(pool), redis: redisClient, log: logger}
	server := smtp.NewServer(backend)
	server.Addr = cfg.SMTPAddr
	server.Domain = "mx." + cfg.MailDomain
	server.MaxRecipients = 1
	server.MaxMessageBytes = cfg.MaxMessageBytes
	server.MaxLineLength = 9980
	server.ReadTimeout = 30 * time.Second
	server.WriteTimeout = 30 * time.Second
	server.AllowInsecureAuth = false
	return server
}

func (b *Backend) NewSession(_ *smtp.Conn) (smtp.Session, error) {
	return &session{backend: b}, nil
}

func (s *session) Mail(from string, _ *smtp.MailOptions) error {
	s.from = strings.TrimSpace(from)
	s.recipient = nil
	return nil
}

func (s *session) Rcpt(to string, _ *smtp.RcptOptions) error {
	address, err := mail.ParseAddress(to)
	if err != nil {
		return permanentError(550, "alamat penerima tidak valid")
	}
	parts := strings.Split(strings.ToLower(address.Address), "@")
	if len(parts) != 2 || parts[1] != s.backend.cfg.MailDomain {
		return permanentError(550, "domain penerima tidak dilayani")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	inbox, err := s.backend.queries.GetActiveInboxByAddress(ctx, address.Address)
	if err != nil {
		return permanentError(550, "inbox tidak ditemukan atau sudah kedaluwarsa")
	}
	s.recipient = &inbox
	return nil
}

func (s *session) Data(reader io.Reader) error {
	if s.recipient == nil {
		return permanentError(554, "penerima belum ditentukan")
	}

	counter := &countingReader{reader: io.LimitReader(reader, s.backend.cfg.MaxMessageBytes+1)}
	mailReader, err := mailmessage.CreateReader(counter)
	if err != nil {
		return permanentError(550, "format email tidak dapat dibaca")
	}
	defer mailReader.Close()

	subject, _ := mailReader.Header.Subject()
	if strings.TrimSpace(subject) == "" {
		subject = "(Tanpa subjek)"
	}
	messageID, _ := mailReader.Header.MessageID()
	senderName, senderAddress := "", s.from
	if senders, headerErr := mailReader.Header.AddressList("From"); headerErr == nil && len(senders) > 0 {
		senderName = senders[0].Name
		senderAddress = senders[0].Address
	}

	var textBody, htmlBody string
	attachments := make([]attachmentMeta, 0)
	for {
		part, nextErr := mailReader.NextPart()
		if errors.Is(nextErr, io.EOF) {
			break
		}
		if nextErr != nil {
			return permanentError(550, "bagian email rusak")
		}
		switch header := part.Header.(type) {
		case *mailmessage.InlineHeader:
			contentType, _, _ := header.ContentType()
			body, readErr := io.ReadAll(io.LimitReader(part.Body, s.backend.cfg.MaxMessageBytes+1))
			if readErr != nil {
				return temporaryError("body email belum dapat dibaca")
			}
			switch strings.ToLower(contentType) {
			case "text/plain":
				if textBody == "" {
					textBody = string(body)
				}
			case "text/html":
				if htmlBody == "" {
					htmlBody = string(body)
				}
			}
		case *mailmessage.AttachmentHeader:
			filename, _ := header.Filename()
			contentType, _, _ := header.ContentType()
			size, readErr := io.Copy(io.Discard, io.LimitReader(part.Body, s.backend.cfg.MaxMessageBytes+1))
			if readErr != nil {
				return temporaryError("attachment belum dapat dibaca")
			}
			attachments = append(attachments, attachmentMeta{filename: filename, contentType: contentType, size: size})
		}
	}
	if counter.read > s.backend.cfg.MaxMessageBytes {
		return permanentError(552, "ukuran email melebihi batas")
	}
	if textBody == "" && htmlBody != "" {
		textBody = "Email ini hanya memiliki versi HTML. Tampilan HTML dinonaktifkan untuk keamanan."
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	tx, err := s.backend.pool.Begin(ctx)
	if err != nil {
		return temporaryError("penyimpanan email belum tersedia")
	}
	defer tx.Rollback(ctx)
	queries := s.backend.queries.WithTx(tx)
	stored, err := queries.CreateMessage(ctx, database.CreateMessageParams{
		InboxID: s.recipient.ID, InternetMessageID: messageID, SenderName: senderName,
		SenderAddress: senderAddress, Recipients: []string{s.recipient.Address}, Subject: subject,
		TextBody: textBody, HtmlBody: htmlBody, RawSizeBytes: counter.read,
	})
	if err != nil {
		s.backend.log.Error("store message", "error", err)
		return temporaryError("email belum dapat disimpan")
	}
	for _, attachment := range attachments {
		filename := strings.TrimSpace(attachment.filename)
		if filename == "" {
			filename = "attachment"
		}
		if _, err := queries.CreateAttachment(ctx, database.CreateAttachmentParams{
			MessageID: stored.ID, Filename: filename, ContentType: attachment.contentType,
			SizeBytes: attachment.size, StorageKey: pgtype.Text{},
		}); err != nil {
			return temporaryError("metadata attachment belum dapat disimpan")
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return temporaryError("email belum dapat disimpan")
	}

	if s.backend.redis != nil {
		channel := fmt.Sprintf("mailtemps:inbox:%s", s.recipient.ID)
		if err := s.backend.redis.Publish(ctx, channel, stored.ID.String()).Err(); err != nil {
			s.backend.log.Warn("publish inbox event", "error", err)
		}
	}
	s.backend.log.Info("email accepted", "inbox_id", s.recipient.ID, "message_id", stored.ID, "bytes", counter.read)
	return nil
}

func (s *session) Reset() {
	s.from = ""
	s.recipient = nil
}

func (s *session) Logout() error {
	s.Reset()
	return nil
}

func permanentError(code int, message string) error {
	return &smtp.SMTPError{Code: code, Message: message}
}

func temporaryError(message string) error {
	return &smtp.SMTPError{Code: 451, Message: message}
}

var _ smtp.Backend = (*Backend)(nil)
var _ smtp.Session = (*session)(nil)
