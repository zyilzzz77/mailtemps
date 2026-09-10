package mailsender

import (
	"bytes"
	"context"
	"crypto/rsa"
	"crypto/tls"
	"crypto/x509"
	"encoding/base64"
	"encoding/pem"
	"errors"
	"fmt"
	"log/slog"
	"mime"
	"mime/quotedprintable"
	"net"
	"net/mail"
	"net/smtp"
	"sort"
	"strings"
	"time"

	"github.com/emersion/go-msgauth/dkim"

	"mailtemps.space/backend/internal/config"
)

const smtpPort = "25"

// DirectSender mengirim email langsung ke MX server tujuan pada port 25.
type DirectSender struct {
	helo     string
	timeout  time.Duration
	domain   string
	selector string
	key      *rsa.PrivateKey
	log      *slog.Logger

	lookupMX func(domain string) ([]*net.MX, error)
	dial     func(ctx context.Context, network, address string) (net.Conn, error)
}

var _ Sender = (*DirectSender)(nil)

func NewDirect(cfg config.Config, logger *slog.Logger) (*DirectSender, error) {
	sender := &DirectSender{
		helo:     cfg.HeloHostname,
		timeout:  cfg.SendTimeout,
		domain:   cfg.MailDomain,
		selector: cfg.DKIMSelector,
		log:      logger,
		lookupMX: net.LookupMX,
	}

	dialer := &net.Dialer{Timeout: cfg.SendTimeout}
	sender.dial = dialer.DialContext

	if strings.TrimSpace(cfg.DKIMPrivateKeyB64) == "" {
		logger.Warn("DKIM_PRIVATE_KEY_B64 kosong; email keluar dikirim tanpa tanda tangan DKIM")
		return sender, nil
	}

	pemBytes, err := base64.StdEncoding.DecodeString(strings.TrimSpace(cfg.DKIMPrivateKeyB64))
	if err != nil {
		return nil, fmt.Errorf("decode DKIM_PRIVATE_KEY_B64: %w", err)
	}
	key, err := parseRSAPrivateKey(pemBytes)
	if err != nil {
		return nil, fmt.Errorf("parse kunci DKIM: %w", err)
	}
	sender.key = key
	return sender, nil
}

func (s *DirectSender) Send(ctx context.Context, msg Message) error {
	if len(msg.To) == 0 {
		return errors.New("pesan tanpa penerima")
	}

	raw, err := buildMessage(msg)
	if err != nil {
		return err
	}
	if s.key != nil {
		if raw, err = s.sign(raw); err != nil {
			return err
		}
	}

	domain := domainOf(msg.To[0].Address)
	if domain == "" {
		return errors.New("domain penerima tidak dapat dibaca")
	}

	records, err := s.lookupMX(domain)
	if err != nil {
		return fmt.Errorf("lookup MX %s: %w", domain, err)
	}
	if len(records) == 0 {
		return fmt.Errorf("tidak ada MX untuk %s", domain)
	}
	sort.SliceStable(records, func(i, j int) bool { return records[i].Pref < records[j].Pref })

	var lastErr error
	for _, record := range records {
		host := strings.TrimSuffix(record.Host, ".")
		if host == "" {
			continue
		}
		if err := s.deliver(ctx, host, msg, raw); err != nil {
			s.log.Warn("pengiriman ke MX gagal", "mx", host, "error", err)
			lastErr = err
			continue
		}
		return nil
	}
	if lastErr == nil {
		lastErr = fmt.Errorf("tidak ada MX yang dapat dihubungi untuk %s", domain)
	}
	return lastErr
}

func (s *DirectSender) deliver(ctx context.Context, host string, msg Message, raw []byte) error {
	dialCtx, cancel := context.WithTimeout(ctx, s.timeout)
	defer cancel()

	conn, err := s.dial(dialCtx, "tcp", net.JoinHostPort(host, smtpPort))
	if err != nil {
		return fmt.Errorf("dial %s: %w", host, err)
	}
	defer conn.Close()
	if deadline, ok := dialCtx.Deadline(); ok {
		_ = conn.SetDeadline(deadline)
	}

	client, err := smtp.NewClient(conn, host)
	if err != nil {
		return fmt.Errorf("handshake %s: %w", host, err)
	}
	defer client.Close()

	if err := client.Hello(s.helo); err != nil {
		return fmt.Errorf("helo %s: %w", host, err)
	}
	if ok, _ := client.Extension("STARTTLS"); ok {
		if err := client.StartTLS(&tls.Config{ServerName: host, MinVersion: tls.VersionTLS12}); err != nil {
			return fmt.Errorf("starttls %s: %w", host, err)
		}
	}
	if err := client.Mail(msg.From.Address); err != nil {
		return fmt.Errorf("mail from %s: %w", host, err)
	}
	for _, recipient := range msg.To {
		if err := client.Rcpt(recipient.Address); err != nil {
			return fmt.Errorf("rcpt to %s: %w", host, err)
		}
	}

	writer, err := client.Data()
	if err != nil {
		return fmt.Errorf("data %s: %w", host, err)
	}
	if _, err := writer.Write(raw); err != nil {
		_ = writer.Close()
		return fmt.Errorf("tulis pesan ke %s: %w", host, err)
	}
	if err := writer.Close(); err != nil {
		return fmt.Errorf("tutup data %s: %w", host, err)
	}
	return client.Quit()
}

func (s *DirectSender) sign(raw []byte) ([]byte, error) {
	options := &dkim.SignOptions{
		Domain:   s.domain,
		Selector: s.selector,
		Signer:   s.key,
		HeaderKeys: []string{
			"From", "To", "Subject", "Date", "Message-ID",
			"MIME-Version", "Content-Type", "Content-Transfer-Encoding",
		},
	}
	var signed bytes.Buffer
	if err := dkim.Sign(&signed, bytes.NewReader(raw), options); err != nil {
		return nil, fmt.Errorf("dkim sign: %w", err)
	}
	return signed.Bytes(), nil
}

func buildMessage(msg Message) ([]byte, error) {
	if strings.TrimSpace(msg.From.Address) == "" {
		return nil, errors.New("pengirim kosong")
	}
	if len(msg.To) == 0 {
		return nil, errors.New("pesan tanpa penerima")
	}

	recipients := make([]string, 0, len(msg.To))
	for _, recipient := range msg.To {
		if strings.TrimSpace(recipient.Address) == "" {
			return nil, errors.New("penerima kosong")
		}
		recipients = append(recipients, recipient.String())
	}

	var buffer bytes.Buffer
	writeHeader := func(name, value string) {
		buffer.WriteString(name)
		buffer.WriteString(": ")
		buffer.WriteString(value)
		buffer.WriteString("\r\n")
	}
	writeHeader("From", msg.From.String())
	writeHeader("To", strings.Join(recipients, ", "))
	writeHeader("Subject", mime.QEncoding.Encode("utf-8", msg.Subject))
	writeHeader("Date", msg.Date.Format(time.RFC1123Z))
	writeHeader("Message-ID", msg.MessageID)
	writeHeader("MIME-Version", "1.0")
	writeHeader("Content-Type", "text/plain; charset=utf-8")
	writeHeader("Content-Transfer-Encoding", "quoted-printable")
	buffer.WriteString("\r\n")

	body := quotedprintable.NewWriter(&buffer)
	if _, err := body.Write([]byte(msg.TextBody)); err != nil {
		return nil, fmt.Errorf("encode body: %w", err)
	}
	if err := body.Close(); err != nil {
		return nil, fmt.Errorf("tutup body: %w", err)
	}
	return normalizeCRLF(buffer.Bytes()), nil
}

func normalizeCRLF(raw []byte) []byte {
	normalized := strings.ReplaceAll(string(raw), "\r\n", "\n")
	normalized = strings.ReplaceAll(normalized, "\r", "\n")
	return []byte(strings.ReplaceAll(normalized, "\n", "\r\n"))
}

func domainOf(address string) string {
	parsed, err := mail.ParseAddress(address)
	if err != nil {
		return ""
	}
	index := strings.LastIndex(parsed.Address, "@")
	if index < 0 {
		return ""
	}
	return strings.ToLower(parsed.Address[index+1:])
}

func parseRSAPrivateKey(pemBytes []byte) (*rsa.PrivateKey, error) {
	block, _ := pem.Decode(pemBytes)
	if block == nil {
		return nil, errors.New("PEM tidak valid")
	}
	if key, err := x509.ParsePKCS1PrivateKey(block.Bytes); err == nil {
		return key, nil
	}
	parsed, err := x509.ParsePKCS8PrivateKey(block.Bytes)
	if err != nil {
		return nil, err
	}
	key, ok := parsed.(*rsa.PrivateKey)
	if !ok {
		return nil, errors.New("kunci bukan RSA")
	}
	return key, nil
}
