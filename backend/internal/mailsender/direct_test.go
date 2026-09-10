package mailsender

import (
	"context"
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/base64"
	"encoding/pem"
	"fmt"
	"io"
	"log/slog"
	"net"
	"net/mail"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/emersion/go-msgauth/dkim"
	"github.com/emersion/go-smtp"

	"mailtemps.space/backend/internal/config"
)

type capturedMessage struct {
	from string
	to   []string
	data string
}

type fakeBackend struct {
	mu       sync.Mutex
	captured []capturedMessage
}

func (b *fakeBackend) NewSession(_ *smtp.Conn) (smtp.Session, error) {
	return &fakeSession{backend: b}, nil
}

func (b *fakeBackend) messages() []capturedMessage {
	b.mu.Lock()
	defer b.mu.Unlock()
	return append([]capturedMessage(nil), b.captured...)
}

type fakeSession struct {
	backend *fakeBackend
	from    string
	to      []string
}

func (s *fakeSession) Mail(from string, _ *smtp.MailOptions) error {
	s.from = from
	return nil
}

func (s *fakeSession) Rcpt(to string, _ *smtp.RcptOptions) error {
	s.to = append(s.to, to)
	return nil
}

func (s *fakeSession) Data(reader io.Reader) error {
	payload, err := io.ReadAll(reader)
	if err != nil {
		return err
	}
	s.backend.mu.Lock()
	defer s.backend.mu.Unlock()
	s.backend.captured = append(s.backend.captured, capturedMessage{from: s.from, to: s.to, data: string(payload)})
	return nil
}

func (s *fakeSession) Reset() {
	s.from = ""
	s.to = nil
}

func (s *fakeSession) Logout() error { return nil }

func startFakeServer(t *testing.T) (string, *fakeBackend) {
	t.Helper()
	backend := &fakeBackend{}
	server := smtp.NewServer(backend)
	server.Domain = "test.local"

	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("listen: %v", err)
	}
	go func() { _ = server.Serve(listener) }()
	t.Cleanup(func() {
		_ = server.Close()
		_ = listener.Close()
	})
	return listener.Addr().String(), backend
}

func testLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(io.Discard, nil))
}

func newTestSender(t *testing.T, cfg config.Config) *DirectSender {
	t.Helper()
	sender, err := NewDirect(cfg, testLogger())
	if err != nil {
		t.Fatalf("NewDirect: %v", err)
	}
	return sender
}

func testDKIMKey(t *testing.T) (string, string) {
	t.Helper()
	key, err := rsa.GenerateKey(rand.Reader, 1024)
	if err != nil {
		t.Fatalf("generate key: %v", err)
	}
	block := &pem.Block{Type: "RSA PRIVATE KEY", Bytes: x509.MarshalPKCS1PrivateKey(key)}
	privateB64 := base64.StdEncoding.EncodeToString(pem.EncodeToMemory(block))

	publicDER, err := x509.MarshalPKIXPublicKey(&key.PublicKey)
	if err != nil {
		t.Fatalf("marshal public key: %v", err)
	}
	publicTXT := "v=DKIM1; k=rsa; p=" + base64.StdEncoding.EncodeToString(publicDER)
	return privateB64, publicTXT
}

func sampleMessage(t *testing.T) Message {
	t.Helper()
	from, err := mail.ParseAddress("Temp Inbox <rintikmail123456@mailtemps.space>")
	if err != nil {
		t.Fatalf("parse from: %v", err)
	}
	to, err := mail.ParseAddress("Budi <budi@example.com>")
	if err != nil {
		t.Fatalf("parse to: %v", err)
	}
	return Message{
		From:      *from,
		To:        []mail.Address{*to},
		Subject:   "Halo dari mailtemps",
		TextBody:  "Baris pertama\nBaris kedua dengan huruf é dan tanda =",
		MessageID: "<abc123@mailtemps.space>",
		Date:      time.Date(2026, 9, 10, 10, 0, 0, 0, time.UTC),
	}
}

func TestSendDeliversEnvelopeAndHeaders(t *testing.T) {
	t.Parallel()
	addr, backend := startFakeServer(t)
	sender := newTestSender(t, config.Config{
		MailDomain: "mailtemps.space", HeloHostname: "mx.mailtemps.space",
		SendTimeout: 5 * time.Second, DKIMSelector: "mail",
	})
	sender.lookupMX = func(string) ([]*net.MX, error) {
		return []*net.MX{{Host: "mx1.test.", Pref: 10}}, nil
	}
	sender.dial = func(ctx context.Context, network, _ string) (net.Conn, error) {
		var dialer net.Dialer
		return dialer.DialContext(ctx, network, addr)
	}

	if err := sender.Send(context.Background(), sampleMessage(t)); err != nil {
		t.Fatalf("Send: %v", err)
	}

	messages := backend.messages()
	if len(messages) != 1 {
		t.Fatalf("pesan diterima = %d, mau 1", len(messages))
	}
	if messages[0].from != "rintikmail123456@mailtemps.space" {
		t.Fatalf("MAIL FROM = %q", messages[0].from)
	}
	if len(messages[0].to) != 1 || messages[0].to[0] != "budi@example.com" {
		t.Fatalf("RCPT TO = %v", messages[0].to)
	}

	parsed, err := mail.ReadMessage(strings.NewReader(messages[0].data))
	if err != nil {
		t.Fatalf("baca pesan: %v", err)
	}
	if got := parsed.Header.Get("Subject"); got != "Halo dari mailtemps" {
		t.Fatalf("Subject = %q", got)
	}
	if got := parsed.Header.Get("Message-ID"); got != "<abc123@mailtemps.space>" {
		t.Fatalf("Message-ID = %q", got)
	}
	if !strings.Contains(messages[0].data, "Content-Type: text/plain; charset=utf-8") {
		t.Fatalf("Content-Type teks hilang:\n%s", messages[0].data)
	}
	if strings.Contains(messages[0].data, "Baris kedua dengan huruf é") {
		t.Fatal("body seharusnya di-encode quoted-printable")
	}
}

func TestSendAddsDKIMSignature(t *testing.T) {
	t.Parallel()
	addr, backend := startFakeServer(t)
	privateB64, publicTXT := testDKIMKey(t)
	sender := newTestSender(t, config.Config{
		MailDomain: "mailtemps.space", HeloHostname: "mx.mailtemps.space",
		SendTimeout: 5 * time.Second, DKIMSelector: "mail", DKIMPrivateKeyB64: privateB64,
	})
	sender.lookupMX = func(string) ([]*net.MX, error) {
		return []*net.MX{{Host: "mx1.test.", Pref: 10}}, nil
	}
	sender.dial = func(ctx context.Context, network, _ string) (net.Conn, error) {
		var dialer net.Dialer
		return dialer.DialContext(ctx, network, addr)
	}

	if err := sender.Send(context.Background(), sampleMessage(t)); err != nil {
		t.Fatalf("Send: %v", err)
	}

	messages := backend.messages()
	if len(messages) != 1 {
		t.Fatalf("pesan diterima = %d, mau 1", len(messages))
	}
	if !strings.Contains(messages[0].data, "DKIM-Signature:") {
		t.Fatalf("DKIM-Signature tidak ada:\n%s", messages[0].data)
	}
	if !strings.Contains(messages[0].data, "d=mailtemps.space") || !strings.Contains(messages[0].data, "s=mail") {
		t.Fatalf("DKIM-Signature tidak memakai domain/selector yang benar")
	}

	verifications, err := dkim.VerifyWithOptions(strings.NewReader(messages[0].data), &dkim.VerifyOptions{
		LookupTXT: func(domain string) ([]string, error) {
			if domain != "mail._domainkey.mailtemps.space" {
				return nil, fmt.Errorf("lookup TXT tak terduga: %s", domain)
			}
			return []string{publicTXT}, nil
		},
	})
	if err != nil {
		t.Fatalf("verifikasi DKIM gagal: %v", err)
	}
	if len(verifications) == 0 {
		t.Fatal("tidak ada hasil verifikasi DKIM")
	}
	for _, verification := range verifications {
		if verification.Err != nil {
			t.Fatalf("tanda tangan DKIM tidak valid: %v", verification.Err)
		}
	}
}

func TestSendWithoutDKIMKey(t *testing.T) {
	t.Parallel()
	addr, backend := startFakeServer(t)
	sender := newTestSender(t, config.Config{
		MailDomain: "mailtemps.space", HeloHostname: "mx.mailtemps.space",
		SendTimeout: 5 * time.Second, DKIMSelector: "mail",
	})
	sender.lookupMX = func(string) ([]*net.MX, error) {
		return []*net.MX{{Host: "mx1.test.", Pref: 10}}, nil
	}
	sender.dial = func(ctx context.Context, network, _ string) (net.Conn, error) {
		var dialer net.Dialer
		return dialer.DialContext(ctx, network, addr)
	}

	if err := sender.Send(context.Background(), sampleMessage(t)); err != nil {
		t.Fatalf("Send: %v", err)
	}
	if strings.Contains(backend.messages()[0].data, "DKIM-Signature:") {
		t.Fatal("pesan tanpa kunci tidak boleh punya DKIM-Signature")
	}
}

func TestSendFallsBackToNextMX(t *testing.T) {
	t.Parallel()
	addr, backend := startFakeServer(t)
	sender := newTestSender(t, config.Config{
		MailDomain: "mailtemps.space", HeloHostname: "mx.mailtemps.space",
		SendTimeout: 5 * time.Second, DKIMSelector: "mail",
	})
	sender.lookupMX = func(string) ([]*net.MX, error) {
		return []*net.MX{
			{Host: "mx-broken.test.", Pref: 10},
			{Host: "mx-good.test.", Pref: 20},
		}, nil
	}
	sender.dial = func(ctx context.Context, network, address string) (net.Conn, error) {
		if strings.HasPrefix(address, "mx-broken.test") {
			return nil, net.ErrClosed
		}
		var dialer net.Dialer
		return dialer.DialContext(ctx, network, addr)
	}

	if err := sender.Send(context.Background(), sampleMessage(t)); err != nil {
		t.Fatalf("Send: %v", err)
	}
	if len(backend.messages()) != 1 {
		t.Fatalf("pesan diterima = %d, mau 1 lewat MX kedua", len(backend.messages()))
	}
}

func TestSendUsesDialDeadline(t *testing.T) {
	t.Parallel()
	sender := newTestSender(t, config.Config{
		MailDomain: "mailtemps.space", HeloHostname: "mx.mailtemps.space",
		SendTimeout: 3 * time.Second, DKIMSelector: "mail",
	})
	sender.lookupMX = func(string) ([]*net.MX, error) {
		return []*net.MX{{Host: "mx1.test.", Pref: 10}}, nil
	}
	var hadDeadline bool
	sender.dial = func(ctx context.Context, _, _ string) (net.Conn, error) {
		_, hadDeadline = ctx.Deadline()
		return nil, net.ErrClosed
	}

	_ = sender.Send(context.Background(), sampleMessage(t))
	if !hadDeadline {
		t.Fatal("dial harus memakai context dengan deadline")
	}
}
