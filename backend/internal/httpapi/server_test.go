package httpapi

import (
	"net/http"
	"net/http/httptest"
	"regexp"
	"testing"
)

func TestNormalizeName(t *testing.T) {
	t.Parallel()
	tests := map[string]string{
		"Rintik Mail":        "rintikmail",
		"nama_mail":          "namamail",
		" ruang-angkasa 42 ": "ruangangkasa42",
		"%%%":                "",
	}
	for input, expected := range tests {
		if actual := normalizeName(input); actual != expected {
			t.Fatalf("normalizeName(%q) = %q, want %q", input, actual, expected)
		}
	}
}

func TestRandomDigits(t *testing.T) {
	t.Parallel()
	value, err := randomDigits(6)
	if err != nil {
		t.Fatal(err)
	}
	if !regexp.MustCompile(`^[0-9]{6}$`).MatchString(value) {
		t.Fatalf("randomDigits(6) = %q", value)
	}
}

func TestInboxBaseName(t *testing.T) {
	t.Parallel()
	tests := map[string]string{
		"rintikmail123456": "rintikmail",
		"nama99123456":     "nama99",
		"tanpadigit":       "tanpadigit",
		"123456":           "123456",
	}
	for input, expected := range tests {
		if actual := inboxBaseName(input); actual != expected {
			t.Fatalf("inboxBaseName(%q) = %q, want %q", input, actual, expected)
		}
	}
}

func TestMakeTokenStoresOnlyHash(t *testing.T) {
	t.Parallel()
	token, hash, err := makeToken()
	if err != nil {
		t.Fatal(err)
	}
	if token == "" || len(hash) != 32 {
		t.Fatalf("unexpected token or hash lengths: token=%d hash=%d", len(token), len(hash))
	}
	if string(hash) == token {
		t.Fatal("token was stored without hashing")
	}
}

func TestPrivateAPIResponsesAreNoIndex(t *testing.T) {
	t.Parallel()
	server := &Server{}
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/api/v1/inboxes/example", nil)

	server.cors(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	})).ServeHTTP(recorder, request)

	if actual := recorder.Header().Get("X-Robots-Tag"); actual != "noindex, nofollow, noarchive" {
		t.Fatalf("X-Robots-Tag = %q", actual)
	}
}
