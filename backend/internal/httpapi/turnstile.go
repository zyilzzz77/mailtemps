package httpapi

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/url"
	"strings"
	"time"
)

var turnstileVerifyURL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"

type turnstileVerifyResponse struct {
	Success bool `json:"success"`
}

func (s *Server) verifyTurnstile(ctx context.Context, token, ip string) error {
	if strings.TrimSpace(s.cfg.TurnstileSecretKey) == "" {
		return nil
	}
	if strings.TrimSpace(token) == "" {
		return errors.New("token turnstile kosong")
	}

	form := url.Values{}
	form.Set("secret", s.cfg.TurnstileSecretKey)
	form.Set("response", token)
	if strings.TrimSpace(ip) != "" {
		form.Set("remoteip", ip)
	}

	verifyCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	request, err := http.NewRequestWithContext(verifyCtx, http.MethodPost, turnstileVerifyURL, strings.NewReader(form.Encode()))
	if err != nil {
		return err
	}
	request.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	response, err := http.DefaultClient.Do(request)
	if err != nil {
		return err
	}
	defer response.Body.Close()

	var result turnstileVerifyResponse
	if err := json.NewDecoder(response.Body).Decode(&result); err != nil {
		return err
	}
	if !result.Success {
		return errors.New("verifikasi turnstile gagal")
	}
	return nil
}
