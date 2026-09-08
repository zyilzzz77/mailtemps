# Mailtemps.space

Temporary inbox receive-only dengan Next.js, Go, PostgreSQL, Redis, Caddy, dan Docker Compose.

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

## Deployment pada server dengan Caddy yang sudah aktif

1. Ganti password dalam `.env`.
2. Ubah `SMTP_BIND_IP=0.0.0.0` dan `SMTP_PUBLIC_PORT=25`.
3. Jalankan `docker compose up --build -d`.
4. Gabungkan isi `deploy/Caddyfile` ke Caddyfile host, validasi, lalu reload Caddy.
5. Arahkan DNS berikut ke IP server:

```dns
mailtemps.space.      A     <IP_SERVER>
mx.mailtemps.space.   A     <IP_SERVER>
mailtemps.space.      MX 10 mx.mailtemps.space.
```

6. Buka firewall TCP 80/443 untuk Caddy dan TCP 25 untuk SMTP receiver.

Jika memakai Cloudflare, record `mx.mailtemps.space` harus DNS-only untuk proxy DNS biasa.

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
- SMTP menerima satu recipient aktif pada domain `mailtemps.space` dan tidak menyediakan relay.
- HTML email disimpan tetapi tidak dirender oleh frontend; UI hanya menampilkan versi teks aman.
- Attachment baru disimpan sebagai metadata. Penyimpanan object dan malware scanning adalah tahap hardening berikutnya.
