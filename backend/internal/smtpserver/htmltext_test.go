package smtpserver

import "testing"

func TestHTMLToText(t *testing.T) {
	tests := []struct {
		name string
		in   string
		want string
	}{
		{
			name: "paragraf dengan tag inline",
			in:   `<html><head><title>x</title></head><body><p>Halo <b>dunia</b>, selamat datang.</p></body></html>`,
			want: "Halo dunia, selamat datang.",
		},
		{
			name: "br dan div jadi baris baru",
			in:   `<div>Baris satu<br>baris dua</div><div>Baris tiga</div>`,
			want: "Baris satu\nbaris dua\nBaris tiga",
		},
		{
			name: "script dan style dibuang",
			in:   `<html><head><style>.a{color:red}</style></head><body><p>Teks</p><script>alert(1)</script></body></html>`,
			want: "Teks",
		},
		{
			name: "entitas HTML didekode",
			in:   `<p>A &amp; B &lt;tag&gt; &nbsp;C</p>`,
			want: "A & B <tag> C",
		},
		{
			name: "daftar menjadi baris terpisah",
			in:   `<ul><li>satu</li><li>dua</li></ul>`,
			want: "satu\ndua",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := htmlToText(tt.in); got != tt.want {
				t.Errorf("htmlToText() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestLooksLikeHTML(t *testing.T) {
	tests := []struct {
		in   string
		want bool
	}{
		{`<!doctype html><html></html>`, true},
		{`<div style="color:red">Halo</div>`, true},
		{`<p>Halo</p>`, true},
		{"Halo, ini teks biasa.", false},
		{"Teks dengan <3 dan > simbol.", false},
	}
	for _, tt := range tests {
		if got := looksLikeHTML(tt.in); got != tt.want {
			t.Errorf("looksLikeHTML(%q) = %v, want %v", tt.in, got, tt.want)
		}
	}
}
