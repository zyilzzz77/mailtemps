package httpapi

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"math/big"
	"net"
	"net/http"
	"strconv"
	"strings"
	"time"
	"unicode"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	"mailtemps.space/backend/internal/config"
	database "mailtemps.space/backend/internal/database/generated"
	"mailtemps.space/backend/internal/mailsender"
	"mailtemps.space/backend/internal/ratelimit"
)

type Server struct {
	cfg     config.Config
	pool    *pgxpool.Pool
	queries *database.Queries
	redis   *redis.Client
	limiter *ratelimit.Limiter
	sender  mailsender.Sender
	log     *slog.Logger
}

type inboxView struct {
	ID             uuid.UUID `json:"id"`
	Address        string    `json:"address"`
	CreatedAt      time.Time `json:"created_at"`
	ExpiresAt      time.Time `json:"expires_at"`
	ExtensionsUsed int16     `json:"extensions_used"`
	ExtensionLimit int16     `json:"extension_limit"`
}

type messageSummary struct {
	ID            uuid.UUID `json:"id"`
	SenderName    string    `json:"sender_name"`
	SenderAddress string    `json:"sender_address"`
	Recipients    []string  `json:"recipients"`
	Subject       string    `json:"subject"`
	Preview       string    `json:"preview"`
	Status        string    `json:"status"`
	ErrorMessage  string    `json:"error_message"`
	ReceivedAt    time.Time `json:"received_at"`
}

type messageView struct {
	ID                uuid.UUID        `json:"id"`
	InternetMessageID string           `json:"internet_message_id"`
	SenderName        string           `json:"sender_name"`
	SenderAddress     string           `json:"sender_address"`
	Recipients        []string         `json:"recipients"`
	Subject           string           `json:"subject"`
	TextBody          string           `json:"text_body"`
	HtmlBody          string           `json:"html_body"`
	ReceivedAt        time.Time        `json:"received_at"`
	Attachments       []attachmentView `json:"attachments"`
}

type attachmentView struct {
	ID          uuid.UUID `json:"id"`
	Filename    string    `json:"filename"`
	ContentType string    `json:"content_type"`
	SizeBytes   int64     `json:"size_bytes"`
}

func New(cfg config.Config, pool *pgxpool.Pool, redisClient *redis.Client, sender mailsender.Sender, logger *slog.Logger) *Server {
	server := &Server{
		cfg:     cfg,
		pool:    pool,
		queries: database.New(pool),
		redis:   redisClient,
		log:     logger,
	}
	if redisClient != nil {
		server.limiter = ratelimit.New(redisClient, cfg.CreateRateLimit, cfg.CreateRateWindow)
	}
	if cfg.OutboundEnabled {
		server.sender = sender
	}
	return server
}

func (s *Server) Handler() http.Handler {
	router := chi.NewRouter()
	router.Use(middleware.RequestID)
	router.Use(middleware.RealIP)
	router.Use(middleware.Recoverer)
	router.Use(middleware.Timeout(30 * time.Second))
	router.Use(s.cors)

	router.Get("/healthz", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})
	router.Get("/readyz", s.ready)

	router.Route("/api/v1", func(r chi.Router) {
		r.Post("/inboxes", s.createInbox)
		r.Post("/inboxes/{inboxID}/messages", s.sendMessage)
		r.Get("/inboxes/{inboxID}", s.getInbox)
		r.Patch("/inboxes/{inboxID}/extend", s.extendInbox)
		r.Post("/inboxes/{inboxID}/rotate", s.rotateInbox)
		r.Delete("/inboxes/{inboxID}", s.deleteInbox)
		r.Get("/inboxes/{inboxID}/messages/{messageID}", s.getMessage)
		r.Delete("/inboxes/{inboxID}/messages/{messageID}", s.deleteMessage)
	})
	return router
}

func (s *Server) ready(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()
	if err := s.pool.Ping(ctx); err != nil {
		writeError(w, http.StatusServiceUnavailable, "database belum siap")
		return
	}
	if s.redis != nil {
		if err := s.redis.Ping(ctx).Err(); err != nil {
			writeError(w, http.StatusServiceUnavailable, "redis belum siap")
			return
		}
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ready"})
}

func (s *Server) allowCreate(w http.ResponseWriter, r *http.Request) bool {
	allowed, err := s.limiter.Allow(r.Context(), clientIP(r))
	if err != nil {
		s.log.Warn("rate limiter unavailable", "error", err)
	}
	if !allowed {
		retryAfter := int64(s.cfg.CreateRateWindow / time.Second)
		if retryAfter < 1 {
			retryAfter = 1
		}
		w.Header().Set("Retry-After", strconv.FormatInt(retryAfter, 10))
		writeError(w, http.StatusTooManyRequests, "terlalu banyak alamat baru; coba lagi sebentar")
		return false
	}
	return true
}

func (s *Server) createInbox(w http.ResponseWriter, r *http.Request) {
	if !s.allowCreate(w, r) {
		return
	}

	var input struct {
		Name           string `json:"name"`
		TurnstileToken string `json:"turnstile_token"`
	}
	r.Body = http.MaxBytesReader(w, r.Body, 4096)
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil && !errors.Is(err, context.Canceled) {
		writeError(w, http.StatusBadRequest, "body JSON tidak valid")
		return
	}

	if err := s.verifyTurnstile(r.Context(), input.TurnstileToken, clientIP(r)); err != nil {
		s.log.Warn("turnstile verification failed", "error", err)
		writeError(w, http.StatusBadRequest, "verifikasi keamanan gagal; muat ulang halaman lalu coba lagi")
		return
	}

	base := normalizeName(input.Name)
	if len(base) < 2 {
		base = "inbox"
	}
	if len(base) > 32 {
		base = base[:32]
	}

	token, tokenHash, err := makeToken()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "gagal membuat token inbox")
		return
	}

	var inbox database.Inbox
	for attempt := 0; attempt < 6; attempt++ {
		digits, randomErr := randomDigits(6)
		if randomErr != nil {
			writeError(w, http.StatusInternalServerError, "gagal membuat alamat inbox")
			return
		}
		localPart := base + digits
		inbox, err = s.queries.CreateInbox(r.Context(), database.CreateInboxParams{
			LocalPart: localPart,
			Address:   localPart + "@" + s.cfg.MailDomain,
			TokenHash: tokenHash,
			ExpiresAt: pgtype.Timestamptz{Time: time.Now().UTC().Add(s.cfg.InboxTTL), Valid: true},
		})
		if err == nil {
			break
		}
		var pgErr *pgconn.PgError
		if !errors.As(err, &pgErr) || pgErr.Code != "23505" {
			break
		}
	}
	if err != nil {
		s.log.Error("create inbox", "error", err)
		writeError(w, http.StatusInternalServerError, "inbox belum dapat dibuat")
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{
		"inbox":        toInboxView(inbox),
		"access_token": token,
		"messages":     []messageSummary{},
	})
}

func (s *Server) getInbox(w http.ResponseWriter, r *http.Request) {
	inbox, ok := s.authorizeInbox(w, r)
	if !ok {
		return
	}
	rows, err := s.queries.ListMessagesByInbox(r.Context(), database.ListMessagesByInboxParams{InboxID: inbox.ID, Limit: 100})
	if err != nil {
		s.log.Error("list messages", "error", err)
		writeError(w, http.StatusInternalServerError, "pesan belum dapat dimuat")
		return
	}
	messages := make([]messageSummary, 0, len(rows))
	for _, row := range rows {
		messages = append(messages, messageSummary{
			ID: row.ID, SenderName: row.SenderName, SenderAddress: row.SenderAddress,
			Recipients: row.Recipients, Subject: row.Subject,
			Preview: strings.TrimSpace(row.TextBody), Status: row.Status,
			ErrorMessage: row.ErrorMessage, ReceivedAt: row.ReceivedAt.Time,
		})
	}

	sentRows, err := s.queries.ListOutboundMessagesByInbox(r.Context(), database.ListOutboundMessagesByInboxParams{InboxID: inbox.ID, Limit: 100})
	if err != nil {
		s.log.Error("list outbound messages", "error", err)
		writeError(w, http.StatusInternalServerError, "pesan terkirim belum dapat dimuat")
		return
	}
	sent := make([]messageSummary, 0, len(sentRows))
	for _, row := range sentRows {
		sent = append(sent, messageSummary{
			ID: row.ID, SenderName: row.SenderName, SenderAddress: row.SenderAddress,
			Recipients: row.Recipients, Subject: row.Subject,
			Preview: strings.TrimSpace(row.TextBody), Status: row.Status,
			ErrorMessage: row.ErrorMessage, ReceivedAt: row.ReceivedAt.Time,
		})
	}

	writeJSON(w, http.StatusOK, map[string]any{"inbox": toInboxView(inbox), "messages": messages, "sent": sent})
}

func (s *Server) extendInbox(w http.ResponseWriter, r *http.Request) {
	inbox, ok := s.authorizeInbox(w, r)
	if !ok {
		return
	}
	if inbox.ExtensionsUsed >= 2 {
		writeError(w, http.StatusConflict, "batas perpanjangan 2 kali sudah tercapai")
		return
	}
	now := time.Now().UTC()
	base := inbox.ExpiresAt.Time
	if base.Before(now) {
		base = now
	}
	nextExpiry := base.Add(s.cfg.InboxTTL)
	maximum := now.Add(s.cfg.MaxInboxTTL)
	if nextExpiry.After(maximum) {
		nextExpiry = maximum
	}
	updated, err := s.queries.UpdateInboxExpiry(r.Context(), database.UpdateInboxExpiryParams{
		ID: inbox.ID, ExpiresAt: pgtype.Timestamptz{Time: nextExpiry, Valid: true},
	})
	if errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusConflict, "batas perpanjangan 2 kali sudah tercapai")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "masa aktif belum dapat diperpanjang")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"inbox": toInboxView(updated)})
}

func (s *Server) rotateInbox(w http.ResponseWriter, r *http.Request) {
	current, ok := s.authorizeInbox(w, r)
	if !ok {
		return
	}
	if !s.allowCreate(w, r) {
		return
	}

	token, tokenHash, err := makeToken()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "gagal membuat token inbox baru")
		return
	}
	base := inboxBaseName(current.LocalPart)
	var rotated database.Inbox

	for attempt := 0; attempt < 6; attempt++ {
		digits, randomErr := randomDigits(6)
		if randomErr != nil {
			writeError(w, http.StatusInternalServerError, "gagal membuat alamat inbox baru")
			return
		}
		tx, beginErr := s.pool.Begin(r.Context())
		if beginErr != nil {
			writeError(w, http.StatusInternalServerError, "alamat inbox belum dapat diganti")
			return
		}
		queries := s.queries.WithTx(tx)
		localPart := base + digits
		rotated, err = queries.CreateInbox(r.Context(), database.CreateInboxParams{
			LocalPart: localPart,
			Address:   localPart + "@" + s.cfg.MailDomain,
			TokenHash: tokenHash,
			ExpiresAt: pgtype.Timestamptz{Time: time.Now().UTC().Add(s.cfg.InboxTTL), Valid: true},
		})
		if err != nil {
			_ = tx.Rollback(r.Context())
			var pgErr *pgconn.PgError
			if errors.As(err, &pgErr) && pgErr.Code == "23505" {
				continue
			}
			break
		}
		deleted, deleteErr := queries.DeleteInbox(r.Context(), current.ID)
		if deleteErr != nil || deleted != 1 {
			_ = tx.Rollback(r.Context())
			err = deleteErr
			if err == nil {
				err = errors.New("inbox lama tidak ditemukan saat rotasi")
			}
			break
		}
		if commitErr := tx.Commit(r.Context()); commitErr != nil {
			err = commitErr
			break
		}
		writeJSON(w, http.StatusCreated, map[string]any{
			"inbox":        toInboxView(rotated),
			"access_token": token,
			"messages":     []messageSummary{},
		})
		return
	}

	s.log.Error("rotate inbox", "error", err)
	writeError(w, http.StatusInternalServerError, "alamat inbox belum dapat diganti")
}

func (s *Server) deleteInbox(w http.ResponseWriter, r *http.Request) {
	inbox, ok := s.authorizeInbox(w, r)
	if !ok {
		return
	}
	if _, err := s.queries.DeleteInbox(r.Context(), inbox.ID); err != nil {
		writeError(w, http.StatusInternalServerError, "inbox belum dapat dihapus")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) getMessage(w http.ResponseWriter, r *http.Request) {
	inbox, ok := s.authorizeInbox(w, r)
	if !ok {
		return
	}
	messageID, err := uuid.Parse(chi.URLParam(r, "messageID"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "ID pesan tidak valid")
		return
	}
	message, err := s.queries.GetMessageByID(r.Context(), database.GetMessageByIDParams{ID: messageID, InboxID: inbox.ID})
	if errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusNotFound, "pesan tidak ditemukan")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "pesan belum dapat dimuat")
		return
	}
	attachments, err := s.queries.ListAttachmentsByMessage(r.Context(), message.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "attachment belum dapat dimuat")
		return
	}
	items := make([]attachmentView, 0, len(attachments))
	for _, attachment := range attachments {
		items = append(items, attachmentView{ID: attachment.ID, Filename: attachment.Filename, ContentType: attachment.ContentType, SizeBytes: attachment.SizeBytes})
	}
	writeJSON(w, http.StatusOK, map[string]any{"message": messageView{
		ID: message.ID, InternetMessageID: message.InternetMessageID, SenderName: message.SenderName,
		SenderAddress: message.SenderAddress, Recipients: message.Recipients, Subject: message.Subject,
		TextBody: message.TextBody, HtmlBody: message.HtmlBody, ReceivedAt: message.ReceivedAt.Time, Attachments: items,
	}})
}

func (s *Server) deleteMessage(w http.ResponseWriter, r *http.Request) {
	inbox, ok := s.authorizeInbox(w, r)
	if !ok {
		return
	}
	messageID, err := uuid.Parse(chi.URLParam(r, "messageID"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "ID pesan tidak valid")
		return
	}
	count, err := s.queries.DeleteMessage(r.Context(), database.DeleteMessageParams{ID: messageID, InboxID: inbox.ID})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "pesan belum dapat dihapus")
		return
	}
	if count == 0 {
		writeError(w, http.StatusNotFound, "pesan tidak ditemukan")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) authorizeInbox(w http.ResponseWriter, r *http.Request) (database.Inbox, bool) {
	id, err := uuid.Parse(chi.URLParam(r, "inboxID"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "ID inbox tidak valid")
		return database.Inbox{}, false
	}
	authorization := strings.TrimSpace(r.Header.Get("Authorization"))
	if !strings.HasPrefix(authorization, "Bearer ") {
		writeError(w, http.StatusUnauthorized, "access token diperlukan")
		return database.Inbox{}, false
	}
	inbox, err := s.queries.GetInboxByID(r.Context(), id)
	if errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusNotFound, "inbox tidak ditemukan")
		return database.Inbox{}, false
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "inbox belum dapat dimuat")
		return database.Inbox{}, false
	}
	tokenHash := sha256.Sum256([]byte(strings.TrimPrefix(authorization, "Bearer ")))
	if subtle.ConstantTimeCompare(inbox.TokenHash, tokenHash[:]) != 1 {
		writeError(w, http.StatusUnauthorized, "access token tidak valid")
		return database.Inbox{}, false
	}
	if !inbox.ExpiresAt.Valid || !inbox.ExpiresAt.Time.After(time.Now().UTC()) {
		writeError(w, http.StatusGone, "inbox sudah kedaluwarsa")
		return database.Inbox{}, false
	}
	return inbox, true
}

func (s *Server) cors(next http.Handler) http.Handler {
	trusted := make(map[string]struct{}, len(s.cfg.TrustedOrigins))
	for _, origin := range s.cfg.TrustedOrigins {
		trusted[origin] = struct{}{}
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/api/") {
			w.Header().Set("X-Robots-Tag", "noindex, nofollow, noarchive")
		}
		origin := r.Header.Get("Origin")
		if _, ok := trusted[origin]; ok {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Vary", "Origin")
			w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
		}
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func normalizeName(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	var builder strings.Builder
	for _, char := range value {
		if char <= unicode.MaxASCII && (char >= 'a' && char <= 'z' || char >= '0' && char <= '9') {
			builder.WriteRune(char)
		}
	}
	return builder.String()
}

func makeToken() (string, []byte, error) {
	buffer := make([]byte, 32)
	if _, err := rand.Read(buffer); err != nil {
		return "", nil, err
	}
	token := base64.RawURLEncoding.EncodeToString(buffer)
	hash := sha256.Sum256([]byte(token))
	return token, hash[:], nil
}

func randomDigits(length int) (string, error) {
	var builder strings.Builder
	for range length {
		number, err := rand.Int(rand.Reader, big.NewInt(10))
		if err != nil {
			return "", err
		}
		builder.WriteByte(byte('0' + number.Int64()))
	}
	return builder.String(), nil
}

func inboxBaseName(localPart string) string {
	if len(localPart) <= 6 {
		return localPart
	}
	suffix := localPart[len(localPart)-6:]
	for _, char := range suffix {
		if char < '0' || char > '9' {
			return localPart
		}
	}
	return localPart[:len(localPart)-6]
}

func clientIP(r *http.Request) string {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err == nil {
		return host
	}
	return r.RemoteAddr
}

func toInboxView(inbox database.Inbox) inboxView {
	return inboxView{
		ID: inbox.ID, Address: inbox.Address, CreatedAt: inbox.CreatedAt.Time,
		ExpiresAt: inbox.ExpiresAt.Time, ExtensionsUsed: inbox.ExtensionsUsed, ExtensionLimit: 2,
	}
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(value); err != nil {
		slog.Error("encode response", "error", err)
	}
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]any{"error": map[string]string{"message": message, "status": fmt.Sprint(status)}})
}
