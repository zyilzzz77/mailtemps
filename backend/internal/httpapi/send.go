package httpapi

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/mail"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgtype"

	database "mailtemps.space/backend/internal/database/generated"
	"mailtemps.space/backend/internal/mailsender"
)

const (
	maxSendBodyBytes = 64 * 1024
	maxSubjectLength = 200
	maxBodyLength    = 16 * 1024

	sendPerInboxWindow = 10 * time.Minute
	sendGlobalWindow   = 24 * time.Hour
)

type sendInput struct {
	To             string `json:"to"`
	Subject        string `json:"subject"`
	Body           string `json:"body"`
	TurnstileToken string `json:"turnstile_token"`
}

type outboundMessage struct {
	To      mail.Address
	Subject string
	Body    string
}

func (s *Server) sendMessage(w http.ResponseWriter, r *http.Request) {
	inbox, ok := s.authorizeInbox(w, r)
	if !ok {
		return
	}
	if s.sender == nil {
		writeError(w, http.StatusServiceUnavailable, "pengiriman email belum aktif")
		return
	}

	var input sendInput
	r.Body = http.MaxBytesReader(w, r.Body, maxSendBodyBytes)
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil && !errors.Is(err, context.Canceled) {
		writeError(w, http.StatusBadRequest, "body JSON tidak valid")
		return
	}

	outbound, err := validateSendInput(input, s.cfg.MailDomain)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	if err := s.verifyTurnstile(r.Context(), input.TurnstileToken, clientIP(r)); err != nil {
		s.log.Warn("turnstile verification failed on send", "error", err)
		writeError(w, http.StatusBadRequest, "verifikasi keamanan gagal; muat ulang halaman lalu coba lagi")
		return
	}

	if !s.allowSend(w, r, inbox) {
		return
	}

	messageID := makeMessageID(s.cfg.MailDomain)
	stored, err := s.queries.CreateOutboundMessage(r.Context(), database.CreateOutboundMessageParams{
		InboxID:           inbox.ID,
		InternetMessageID: messageID,
		SenderName:        "",
		SenderAddress:     inbox.Address,
		Recipients:        []string{outbound.To.Address},
		Subject:           outbound.Subject,
		TextBody:          outbound.Body,
	})
	if err != nil {
		s.log.Error("create outbound message", "error", err)
		writeError(w, http.StatusInternalServerError, "pesan belum dapat disimpan")
		return
	}

	sendCtx, cancel := context.WithTimeout(r.Context(), s.cfg.SendTimeout)
	defer cancel()
	sendErr := s.sender.Send(sendCtx, mailsender.Message{
		From:      mail.Address{Address: inbox.Address},
		To:        []mail.Address{outbound.To},
		Subject:   outbound.Subject,
		TextBody:  outbound.Body,
		MessageID: messageID,
		Date:      time.Now().UTC(),
	})

	status := "sent"
	errorMessage := ""
	if sendErr != nil {
		status = "failed"
		errorMessage = sendErr.Error()
	}
	if err := s.queries.UpdateMessageStatus(r.Context(), database.UpdateMessageStatusParams{
		ID: stored.ID, Status: status, ErrorMessage: errorMessage,
	}); err != nil {
		s.log.Error("update outbound status", "error", err, "message_id", stored.ID)
	}

	summary := messageSummary{
		ID: stored.ID, SenderName: stored.SenderName, SenderAddress: stored.SenderAddress,
		Recipients: stored.Recipients, Subject: stored.Subject,
		Preview: strings.TrimSpace(stored.TextBody), Status: status,
		ErrorMessage: errorMessage, ReceivedAt: stored.ReceivedAt.Time,
	}

	if sendErr != nil {
		s.log.Warn("pengiriman email gagal", "inbox", inbox.ID, "error", sendErr)
		writeJSON(w, http.StatusBadGateway, map[string]any{
			"error":   map[string]string{"message": "email gagal dikirim ke server penerima", "status": "502"},
			"message": summary,
		})
		return
	}

	s.log.Info("email terkirim", "inbox", inbox.ID, "recipient", outbound.To.Address)
	writeJSON(w, http.StatusCreated, map[string]any{"message": summary})
}

func (s *Server) allowSend(w http.ResponseWriter, r *http.Request, inbox database.Inbox) bool {
	if s.limiter != nil {
		allowed, err := s.limiter.Allow(r.Context(), "send:"+inbox.ID.String())
		if err != nil {
			s.log.Warn("rate limiter unavailable", "error", err)
		}
		if !allowed {
			w.Header().Set("Retry-After", "60")
			writeError(w, http.StatusTooManyRequests, "terlalu banyak pengiriman; coba lagi nanti")
			return false
		}
	}

	now := time.Now().UTC()
	inboxCount, err := s.queries.CountOutboundByInboxSince(r.Context(), database.CountOutboundByInboxSinceParams{
		InboxID:    inbox.ID,
		ReceivedAt: pgtype.Timestamptz{Time: now.Add(-sendPerInboxWindow), Valid: true},
	})
	if err != nil {
		s.log.Error("count outbound per inbox", "error", err)
		writeError(w, http.StatusInternalServerError, "layanan pengiriman belum siap")
		return false
	}
	if inboxCount >= s.cfg.SendPerInboxLimit {
		writeError(w, http.StatusTooManyRequests, fmt.Sprintf("batas %d pengiriman per inbox sudah tercapai", s.cfg.SendPerInboxLimit))
		return false
	}

	globalCount, err := s.queries.CountOutboundSince(r.Context(), pgtype.Timestamptz{Time: now.Add(-sendGlobalWindow), Valid: true})
	if err != nil {
		s.log.Error("count outbound global", "error", err)
		writeError(w, http.StatusInternalServerError, "layanan pengiriman belum siap")
		return false
	}
	if globalCount >= s.cfg.SendGlobalDailyLimit {
		writeError(w, http.StatusServiceUnavailable, "kapasitas pengiriman harian habis")
		return false
	}
	return true
}

func validateSendInput(input sendInput, mailDomain string) (outboundMessage, error) {
	to := strings.TrimSpace(input.To)
	subject := strings.TrimSpace(input.Subject)
	body := strings.TrimSpace(input.Body)

	if to == "" {
		return outboundMessage{}, errors.New("alamat penerima wajib diisi")
	}
	if strings.ContainsAny(to, "\r\n") {
		return outboundMessage{}, errors.New("alamat penerima tidak valid")
	}
	if subject == "" {
		return outboundMessage{}, errors.New("subjek wajib diisi")
	}
	if len([]rune(subject)) > maxSubjectLength {
		return outboundMessage{}, fmt.Errorf("subjek maksimal %d karakter", maxSubjectLength)
	}
	if strings.ContainsAny(subject, "\r\n") {
		return outboundMessage{}, errors.New("subjek tidak boleh berisi baris baru")
	}
	if body == "" {
		return outboundMessage{}, errors.New("isi pesan wajib diisi")
	}
	if len(body) > maxBodyLength {
		return outboundMessage{}, fmt.Errorf("isi pesan maksimal %d byte", maxBodyLength)
	}
	if strings.ContainsRune(body, '\x00') {
		return outboundMessage{}, errors.New("isi pesan mengandung karakter yang tidak diizinkan")
	}

	recipient, err := mail.ParseAddress(to)
	if err != nil {
		return outboundMessage{}, errors.New("alamat penerima tidak valid")
	}
	parts := strings.Split(recipient.Address, "@")
	if len(parts) != 2 || parts[0] == "" || parts[1] == "" {
		return outboundMessage{}, errors.New("alamat penerima tidak valid")
	}
	if strings.EqualFold(parts[1], mailDomain) {
		return outboundMessage{}, errors.New("pengiriman ke alamat " + mailDomain + " belum didukung")
	}

	return outboundMessage{To: *recipient, Subject: subject, Body: body}, nil
}

func makeMessageID(domain string) string {
	random := make([]byte, 16)
	if _, err := rand.Read(random); err != nil {
		return fmt.Sprintf("<%d@%s>", time.Now().UnixNano(), domain)
	}
	return fmt.Sprintf("<%s@%s>", base64.RawURLEncoding.EncodeToString(random), domain)
}
