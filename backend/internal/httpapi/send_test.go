package httpapi

import (
	"strings"
	"testing"
)

func TestValidateSendInput(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name    string
		input   sendInput
		wantErr bool
	}{
		{
			name:  "valid",
			input: sendInput{To: "budi@example.com", Subject: "Halo", Body: "Pesan biasa"},
		},
		{
			name:  "valid dengan nama tampilan",
			input: sendInput{To: "Budi Santoso <budi@example.com>", Subject: "Halo", Body: "Pesan"},
		},
		{
			name:    "penerima kosong",
			input:   sendInput{To: "  ", Subject: "Halo", Body: "Pesan"},
			wantErr: true,
		},
		{
			name:    "penerima tidak valid",
			input:   sendInput{To: "bukan-email", Subject: "Halo", Body: "Pesan"},
			wantErr: true,
		},
		{
			name:    "header injection pada penerima",
			input:   sendInput{To: "budi@example.com\r\nBcc: jahat@example.com", Subject: "Halo", Body: "Pesan"},
			wantErr: true,
		},
		{
			name:    "header injection pada subjek",
			input:   sendInput{To: "budi@example.com", Subject: "Halo\r\nX-Evil: 1", Body: "Pesan"},
			wantErr: true,
		},
		{
			name:    "domain sendiri ditolak",
			input:   sendInput{To: "lain@mailtemps.space", Subject: "Halo", Body: "Pesan"},
			wantErr: true,
		},
		{
			name:    "domain sendiri ditolak tanpa peduli huruf besar",
			input:   sendInput{To: "lain@MailTemps.Space", Subject: "Halo", Body: "Pesan"},
			wantErr: true,
		},
		{
			name:    "subjek kosong",
			input:   sendInput{To: "budi@example.com", Subject: "   ", Body: "Pesan"},
			wantErr: true,
		},
		{
			name:    "subjek kepanjangan",
			input:   sendInput{To: "budi@example.com", Subject: strings.Repeat("a", maxSubjectLength+1), Body: "Pesan"},
			wantErr: true,
		},
		{
			name:    "body kosong",
			input:   sendInput{To: "budi@example.com", Subject: "Halo", Body: "\n\n"},
			wantErr: true,
		},
		{
			name:    "body kepanjangan",
			input:   sendInput{To: "budi@example.com", Subject: "Halo", Body: strings.Repeat("a", maxBodyLength+1)},
			wantErr: true,
		},
		{
			name:    "body dengan NUL",
			input:   sendInput{To: "budi@example.com", Subject: "Halo", Body: "Pesan\x00jahat"},
			wantErr: true,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			t.Parallel()
			result, err := validateSendInput(test.input, "mailtemps.space")
			if test.wantErr {
				if err == nil {
					t.Fatalf("mau error, dapat sukses dengan %+v", result)
				}
				return
			}
			if err != nil {
				t.Fatalf("tidak mau error, dapat: %v", err)
			}
			if result.To.Address == "" {
				t.Fatal("alamat penerima hasil validasi kosong")
			}
		})
	}
}

func TestValidateSendInputTrimsFields(t *testing.T) {
	t.Parallel()
	result, err := validateSendInput(sendInput{
		To:      "  budi@example.com  ",
		Subject: "  Halo  ",
		Body:    "  Pesan  ",
	}, "mailtemps.space")
	if err != nil {
		t.Fatalf("tidak mau error, dapat: %v", err)
	}
	if result.To.Address != "budi@example.com" {
		t.Fatalf("alamat = %q", result.To.Address)
	}
	if result.Subject != "Halo" {
		t.Fatalf("subjek = %q", result.Subject)
	}
	if result.Body != "Pesan" {
		t.Fatalf("body = %q", result.Body)
	}
}
