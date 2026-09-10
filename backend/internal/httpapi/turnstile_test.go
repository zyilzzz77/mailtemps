package httpapi

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"

	"mailtemps.space/backend/internal/config"
)

func TestVerifyTurnstile(t *testing.T) {
	var mu sync.Mutex
	received := map[string]string{}
	verifier := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = r.ParseForm()
		mu.Lock()
		received[r.Form.Get("response")] = r.Form.Get("secret")
		mu.Unlock()
		if r.Form.Get("secret") == "secret-test" && r.Form.Get("response") == "token-valid" {
			_ = json.NewEncoder(w).Encode(map[string]any{"success": true})
			return
		}
		_ = json.NewEncoder(w).Encode(map[string]any{"success": false})
	}))
	defer verifier.Close()

	original := turnstileVerifyURL
	turnstileVerifyURL = verifier.URL
	defer func() { turnstileVerifyURL = original }()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	server := &Server{cfg: config.Config{TurnstileSecretKey: "secret-test"}}

	if err := server.verifyTurnstile(ctx, "token-valid", "1.2.3.4"); err != nil {
		t.Fatalf("token valid seharusnya lolos: %v", err)
	}
	if err := server.verifyTurnstile(ctx, "token-invalid", "1.2.3.4"); err == nil {
		t.Fatal("token invalid seharusnya ditolak")
	}
	if err := server.verifyTurnstile(ctx, "", "1.2.3.4"); err == nil {
		t.Fatal("token kosong seharusnya ditolak")
	}
	if err := (&Server{cfg: config.Config{}}).verifyTurnstile(ctx, "", "1.2.3.4"); err != nil {
		t.Fatalf("tanpa secret key verifikasi seharusnya dilewati: %v", err)
	}

	mu.Lock()
	defer mu.Unlock()
	if received["token-valid"] != "secret-test" {
		t.Fatalf("secret key tidak diteruskan ke verifier: %v", received)
	}
}
