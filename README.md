# Mailtemps.space

Temporary inbox dengan Next.js, Go, PostgreSQL, Redis, Caddy, dan Docker Compose. Bisa menerima email masuk dan mengirim email keluar (teks polos) dari alamat sementara.

Alamat dibuat dengan format tanpa separator:

```text
{namamail}{nomoracak6digit}@mailtemps.space
```

Contoh: `rintikmail482913@mailtemps.space`.

## Struktur

```text
web/       Next.js + TypeScript + Tailwind CSS
backend/   Go API, SMTP receiver, cleanup worker, pgx + sqlc
deploy/    Caddyfile untuk Caddy yang sudah berjalan di host
plans.md   arsitektur, checklist, dan batas MVP
```

## Menjalankan seluruh stack lokal

File `.env` yang disertakan hanya berisi kredensial development. Ganti semua password sebelum produksi.

```powershell
docker compose up --build -d
docker compose ps
```

Layanan lokal:

- Web: `http://localhost:3001`
- API readiness: `http://localhost:8081/readyz`
- SMTP development: `localhost:2525`

Hentikan tanpa menghapus data:

```powershell
docker compose down
```

## Development tanpa container web

Jalankan dependency data:

```powershell
docker compose up -d postgres redis
```

Untuk menjalankan Go dari host, ubah sementara `DATABASE_URL` menjadi host `localhost`, lalu:

```powershell
cd backend
sqlc generate
go run ./cmd/api
go run ./cmd/smtp
go run ./cmd/worker
```

Frontend development:

```powershell
cd web
$env:API_PROXY_TARGET="http://127.0.0.1:8081"
npm run dev
```

Frontend development berjalan di `http://localhost:3001`. Untuk proxy lokal pada port standar `80/443`, jalankan Caddy menggunakan `deploy/Caddyfile.local`; halaman diteruskan ke Next.js `3001` dan `/api/*` ke Go API `8081`.

Next.js meneruskan `/api/*` ke Go selama development. Di production, Caddy melakukan routing tersebut secara langsung.

## Uji SMTP lokal

Setelah membuat inbox lewat UI, kirim email ke alamat tersebut melalui port development `2525`. Salah satu cara adalah menggunakan `swaks`:

```text
swaks --server localhost:2525 --from sender@example.com --to ALAMAT_DARI_UI --header "Subject: Tes SMTP" --body "Pesan sudah masuk."
```

## Kirim email keluar

Tab **Compose** di halaman inbox mengirim email teks polos langsung ke MX server penerima (direct-to-MX, port 25). Tidak ada relay/smarthost. Batasannya: 1 penerima, teks polos tanpa attachment, wajib Turnstile tiap kirim, maksimum `SEND_PER_INBOX_LIMIT` (default 5) per inbox dan `SEND_GLOBAL_DAILY_LIMIT` (default 50) per 24 jam.

Agar email sampai ke Gmail/Outlook, semua ini wajib ada:

```dns
mailtemps.space.                TXT   "v=spf1 mx ip4:142.248.82.88 -all"
mail._domainkey.mailtemps.space. TXT  "v=DKIM1; k=rsa; p=<kunci publik dari deploy/dkim/mail.public.pem>"
_dmarc.mailtemps.space.         TXT   "v=DMARC1; p=none; rua=mailto:admin@mailtemps.space"
```

- **PTR/rDNS** `142.248.82.88` → `mx.mailtemps.space`, diatur di panel provider VPS (tidak bisa dari kode).
- **Egress TCP/25** harus terbuka. Banyak provider VPS memblokirnya secara default dan harus diajukan ke support. Cek dengan `nc -vz gmail-smtp-in.l.google.com 25`.
- `deploy/production.sh` membuat kunci DKIM di `deploy/dkim/` (gitignored), mengisi `DKIM_PRIVATE_KEY_B64` di `.env`, dan mencetak checklist DNS di akhir deploy.
- Mulai dari DMARC `p=none` untuk memantau, baru naikkan ke `quarantine`/`reject` setelah laporan bersih.

Variabel terkait: `OUTBOUND_ENABLED`, `HELO_HOSTNAME`, `DKIM_SELECTOR`, `DKIM_PRIVATE_KEY_B64`, `SEND_PER_INBOX_LIMIT`, `SEND_GLOBAL_DAILY_LIMIT`, `SEND_TIMEOUT`.

Catatan lokal: mengirim dari Windows lokal hampir selalu gagal karena ISP memblokir egress port 25 dan tidak ada PTR. Yang bisa diuji lokal adalah unit test `internal/mailsender` dengan SMTP server palsu.

## Deployment pada server dengan Caddy yang sudah aktif

Cara termudah: jalankan `deploy/production.sh` di server (VPS `142.248.82.88`).

```bash
# di server
git clone https://github.com/zyilzzz77/mailtemps.git /opt/mailtemps
cd /opt/mailtemps
bash deploy/production.sh
```

Script ini idempotent — untuk update selanjutnya cukup `bash deploy/production.sh` lagi. Yang dilakukan:

1. `git pull` kode terbaru
2. Generate `.env` production (password Postgres acak) jika belum ada
3. Build + jalankan stack: postgres, redis, api, smtp, worker, web
4. Migrasi database idempotent (tabel `schema_migrations`)
5. Smoke test: `/readyz`, buat inbox, homepage
6. Pasang blok Caddy `mailtemps.space` ke Caddyfile host yang sudah ada — dengan backup otomatis, `caddy validate`, dan reload. Kalau validasi gagal, file host dikembalikan otomatis.
7. Buka `25/tcp` di UFW untuk SMTP

Sub-perintah lain: `bash deploy/production.sh status` dan `bash deploy/production.sh logs`.

### DNS + SSL

Arahkan DNS di Cloudflare:

```dns
mailtemps.space.       A     142.248.82.88   (proxied OFF dulu agar Let's Encrypt bisa issue)
mx.mailtemps.space.    A     142.248.82.88   (wajib DNS-only)
mailtemps.space.       MX 10 mx.mailtemps.space.
```

SSL (`https://mailtemps.space`) diterbitkan otomatis oleh Caddy lewat Let's Encrypt setelah record A mengarah ke server. Setelah sertifikat terbit, proxy Cloudflare boleh diaktifkan lagi (mode Full/Strict).

## Validasi source

```powershell
cd backend
sqlc generate
go test ./...
go vet ./...

cd ../web
npm run lint
npm run build

cd ..
docker compose config
```

## Catatan keamanan MVP

- API menyimpan hash access token, bukan token plaintext.
- PostgreSQL dan Redis hanya berada dalam private Docker network.
- SMTP menerima satu recipient aktif pada domain `mailtemps.space` dan tidak menyediakan relay terbuka.
- Email keluar dibatasi: 1 penerima, teks polos, wajib Turnstile, dengan batas per-inbox dan batas harian global.
- HTML email masuk disimpan tetapi tidak dirender oleh frontend; UI hanya menampilkan versi teks aman.
- Attachment baru disimpan sebagai metadata. Penyimpanan object dan malware scanning adalah tahap hardening berikutnya.
