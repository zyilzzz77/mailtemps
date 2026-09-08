package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/smtp"
	"os"
	"regexp"
	"time"
)

type createResponse struct {
	Inbox struct {
		ID      string `json:"id"`
		Address string `json:"address"`
	} `json:"inbox"`
	AccessToken string `json:"access_token"`
}

type inboxResponse struct {
	Messages []struct {
		ID      string `json:"id"`
		Subject string `json:"subject"`
	} `json:"messages"`
}

func main() {
	apiBase := env("SMOKE_API_BASE", "http://127.0.0.1:3001/api/v1")
	smtpAddr := env("SMOKE_SMTP_ADDR", "127.0.0.1:2525")
	client := &http.Client{Timeout: 4 * time.Second}

	created := createResponse{}
	doJSON(client, http.MethodPost, apiBase+"/inboxes", "", map[string]string{"name": "zyilzz"}, http.StatusCreated, &created)
	if !regexp.MustCompile(`^zyilzz[0-9]{6}@mailtemps[.]space$`).MatchString(created.Inbox.Address) {
		fatalf("unexpected address format: %s", created.Inbox.Address)
	}

	rawMessage := []byte("From: Smoke Test <sender@example.com>\r\n" +
		"To: " + created.Inbox.Address + "\r\n" +
		"Subject: Local smoke test\r\n" +
		"Message-ID: <smoke@mailtemps.space>\r\n" +
		"Content-Type: text/plain; charset=utf-8\r\n\r\n" +
		"Email masuk melalui SMTP tanpa Docker.\r\n")
	if err := smtp.SendMail(smtpAddr, nil, "sender@example.com", []string{created.Inbox.Address}, rawMessage); err != nil {
		fatalf("smtp send failed: %v", err)
	}

	var inbox inboxResponse
	deadline := time.Now().Add(5 * time.Second)
	for {
		doJSON(client, http.MethodGet, apiBase+"/inboxes/"+created.Inbox.ID, created.AccessToken, nil, http.StatusOK, &inbox)
		if len(inbox.Messages) > 0 {
			break
		}
		if time.Now().After(deadline) {
			fatalf("message did not appear in inbox")
		}
		time.Sleep(150 * time.Millisecond)
	}
	if inbox.Messages[0].Subject != "Local smoke test" {
		fatalf("unexpected subject: %s", inbox.Messages[0].Subject)
	}

	var detail map[string]any
	doJSON(client, http.MethodGet, apiBase+"/inboxes/"+created.Inbox.ID+"/messages/"+inbox.Messages[0].ID, created.AccessToken, nil, http.StatusOK, &detail)
	doJSON(client, http.MethodPatch, apiBase+"/inboxes/"+created.Inbox.ID+"/extend", created.AccessToken, nil, http.StatusOK, nil)
	doJSON(client, http.MethodPatch, apiBase+"/inboxes/"+created.Inbox.ID+"/extend", created.AccessToken, nil, http.StatusOK, nil)
	doJSON(client, http.MethodPatch, apiBase+"/inboxes/"+created.Inbox.ID+"/extend", created.AccessToken, nil, http.StatusConflict, nil)

	rotated := createResponse{}
	doJSON(client, http.MethodPost, apiBase+"/inboxes/"+created.Inbox.ID+"/rotate", created.AccessToken, nil, http.StatusCreated, &rotated)
	if !regexp.MustCompile(`^zyilzz[0-9]{6}@mailtemps[.]space$`).MatchString(rotated.Inbox.Address) {
		fatalf("unexpected rotated address format: %s", rotated.Inbox.Address)
	}
	if rotated.Inbox.Address == created.Inbox.Address {
		fatalf("rotation kept the same random digits: %s", rotated.Inbox.Address)
	}
	doJSON(client, http.MethodGet, apiBase+"/inboxes/"+created.Inbox.ID, created.AccessToken, nil, http.StatusNotFound, nil)
	doJSON(client, http.MethodDelete, apiBase+"/inboxes/"+rotated.Inbox.ID, rotated.AccessToken, nil, http.StatusNoContent, nil)

	fmt.Printf("PASS create=%s smtp=accepted api=read extend_limit=2 rotate=%s delete=ok\n", created.Inbox.Address, rotated.Inbox.Address)
}

func doJSON(client *http.Client, method, url, token string, body any, expected int, output any) {
	var reader io.Reader
	if body != nil {
		buffer := &bytes.Buffer{}
		if err := json.NewEncoder(buffer).Encode(body); err != nil {
			fatalf("encode request: %v", err)
		}
		reader = buffer
	}
	request, err := http.NewRequest(method, url, reader)
	if err != nil {
		fatalf("build request: %v", err)
	}
	if body != nil {
		request.Header.Set("Content-Type", "application/json")
	}
	if token != "" {
		request.Header.Set("Authorization", "Bearer "+token)
	}
	response, err := client.Do(request)
	if err != nil {
		fatalf("%s %s: %v", method, url, err)
	}
	defer response.Body.Close()
	payload, err := io.ReadAll(response.Body)
	if err != nil {
		fatalf("read response: %v", err)
	}
	if response.StatusCode != expected {
		fatalf("%s %s returned %d, want %d: %s", method, url, response.StatusCode, expected, payload)
	}
	if output != nil && len(payload) > 0 {
		if err := json.Unmarshal(payload, output); err != nil {
			fatalf("decode response: %v", err)
		}
	}
}

func env(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func fatalf(format string, values ...any) {
	fmt.Fprintf(os.Stderr, "FAIL "+format+"\n", values...)
	os.Exit(1)
}
