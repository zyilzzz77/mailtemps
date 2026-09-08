# Mailtemps.space — Implementation Plan

Dokumen ini adalah kontrak teknis sekaligus checklist eksekusi untuk membangun layanan temporary email self-hosted di `mailtemps.space`.

## 1. Sasaran produk

- Pengguna dapat membuat inbox sementara tanpa akun.
- Format alamat wajib tanpa separator: `{namamail}{nomoracak6digit}@mailtemps.space`.
- Contoh: `rintikmail482913@mailtemps.space`.
- `namamail` dinormalisasi ke huruf kecil dan angka saja, maksimal 32 karakter.
- Nomor acak dibuat dengan random source kriptografis dan kombinasi alamat harus unik.
- Inbox memiliki access token rahasia dan masa aktif awal 10 menit.
- Pengguna dapat melihat, menyegarkan, memperpanjang, dan menghapus inbox/pesan.
- Email, attachment, dan inbox kedaluwarsa dihapus otomatis.
- Layanan bersifat receive-only; tidak menyediakan pengiriman email keluar.

## 2. Arsitektur

```text
Browser
  |
  | HTTPS :443
  v
Caddy (sudah berjalan di host)
  |-- /api/* --> Go API 127.0.0.1:8081
  `-- /*      --> Next.js 127.0.0.1:3001

Internet SMTP
  |
  | TCP :25
  v
Go SMTP Receiver
  |-- parse MIME dan validasi recipient
  |-- simpan metadata/body ke PostgreSQL
  `-- publish event ke Redis

Go Worker
  `-- hapus inbox, pesan, dan attachment kedaluwarsa

PostgreSQL <-- pgx v5 + sqlc --> Go services
Redis      <-- go-redis      --> rate limiter + event signal
```

## 3. Komponen dan tanggung jawab

### Frontend — Next.js + TypeScript + Tailwind CSS

- [x] Mengganti demo state dengan data dari Go API.
- [x] Form nama inbox dan pembuatan alamat server-side.
- [x] Menyimpan inbox ID dan access token sementara di `sessionStorage`.
- [x] Countdown berdasarkan `expires_at` dari server.
- [x] Daftar pesan, detail pesan, refresh, extend, dan delete.
- [x] Loading, empty, error, offline, dan expired states.
- [x] Polling ringan sebagai MVP; kontrak dapat ditingkatkan ke SSE.
- [x] Domain UI menggunakan `mailtemps.space`.
- [x] Production build memakai Next.js standalone output.
- [x] FAQ penggunaan, keamanan, privasi, retensi data, dan batasan layanan.
- [x] `Ganti alamat` mempertahankan nama depan dan merotasi 6 digit acak.
- [x] Tombol perpanjangan menampilkan sisa kuota dan nonaktif setelah 2 kali.

### Backend API — Go

- [x] `GET /healthz` untuk liveness.
- [x] `GET /readyz` untuk kesiapan PostgreSQL dan Redis.
- [x] `POST /api/v1/inboxes` membuat inbox dan token.
- [x] `GET /api/v1/inboxes/{id}` mengambil inbox dan daftar pesan.
- [x] `PATCH /api/v1/inboxes/{id}/extend` menambah masa aktif dengan batas persisten 2 kali per inbox.
- [x] `POST /api/v1/inboxes/{id}/rotate` mengganti 6 digit alamat secara atomik dan mereset inbox.
- [x] `DELETE /api/v1/inboxes/{id}` menghapus inbox.
- [x] `GET /api/v1/inboxes/{id}/messages/{message_id}` mengambil detail pesan.
- [x] `DELETE /api/v1/inboxes/{id}/messages/{message_id}` menghapus pesan.
- [x] Bearer token di-hash SHA-256 sebelum disimpan.
- [x] Rate limit pembuatan inbox memakai Redis dan IP klien.
- [x] CORS hanya untuk development; production menggunakan same-origin lewat Caddy.

### SMTP receiver — Go

- [x] Listen pada `:2525` di container; host production memetakan TCP `25:2525`.
- [x] Hanya menerima recipient `@mailtemps.space` yang inbox-nya aktif.
- [x] Tidak mendukung relay atau pengiriman keluar.
- [x] Batasi ukuran pesan, jumlah recipient, dan durasi koneksi.
- [x] Parse header, text/plain, text/html, serta metadata attachment.
- [x] Sanitasi HTML dilakukan saat ditampilkan; raw HTML tidak dirender langsung.
- [x] Publish notifikasi inbox ke Redis setelah pesan tersimpan.

### PostgreSQL + pgx + sqlc

- [x] Migration untuk `inboxes`, `messages`, `attachments`, dan penghitung perpanjangan inbox.
- [x] Foreign key dengan cascade delete.
- [x] Index untuk address, expiration, inbox-message, dan cleanup.
- [x] Query disimpan di SQL dan kode akses dihasilkan oleh sqlc (`pgx/v5`).
- [x] Database tidak diekspos ke internet.

### Redis

- [x] Rate limiter fixed-window untuk endpoint pembuatan inbox.
- [x] Pub/Sub event `mailtemps:inbox:{id}` sebagai fondasi realtime.
- [x] Redis tidak menjadi source of truth; kegagalan Redis tidak menghilangkan email.
- [x] Redis tidak diekspos ke internet dan memakai health check.

### Cleanup worker

- [x] Menjalankan cleanup berkala dengan interval configurable.
- [x] Menghapus inbox kedaluwarsa secara batch; relasi ikut terhapus via cascade.
- [x] Graceful shutdown saat container dihentikan.

## 4. Docker dan jaringan

- [x] Multi-stage Dockerfile untuk Next.js standalone.
- [x] Multi-stage Dockerfile untuk binary Go non-root.
- [x] Compose services: `web`, `api`, `smtp`, `worker`, `postgres`, `redis`.
- [x] Hanya `127.0.0.1:3001` dan `127.0.0.1:8081` yang dipublish untuk Caddy host.
- [x] Development SMTP dipublish ke `127.0.0.1:2525`.
- [x] Production memetakan host `0.0.0.0:25` ke SMTP container `2525` melalui environment Compose.
- [x] PostgreSQL dan Redis hanya berada pada private Compose network.
- [x] Health checks dan dependency conditions untuk startup yang deterministik.
- [x] Named volumes untuk data PostgreSQL dan Redis.

## 5. Caddy dan DNS

### Caddy host

```caddyfile
mailtemps.space {
    encode zstd gzip

    handle /api/* {
        reverse_proxy 127.0.0.1:8081
    }

    handle {
        reverse_proxy 127.0.0.1:3001
    }
}
```

- [x] Simpan snippet Caddy production di repository.
- [ ] Caddy tetap menjadi satu-satunya proses pada port 80/443.
- [ ] API tetap menerima prefix `/api`; prefix tidak di-strip.

### DNS yang dibutuhkan

```dns
mailtemps.space.      A     <IP_SERVER>
mx.mailtemps.space.   A     <IP_SERVER>
mailtemps.space.      MX 10 mx.mailtemps.space.
```

- `mx.mailtemps.space` harus DNS-only jika memakai Cloudflare proxy biasa.
- Firewall publik: TCP 80/443 ke Caddy dan TCP 25 ke SMTP receiver.
- Port 587/465, IMAP, dan POP3 tidak dibuka karena produk receive-only berbasis web.

## 6. Environment

- [x] Root `.env.example` tanpa rahasia.
- [x] `MAIL_DOMAIN=mailtemps.space`.
- [x] `INBOX_TTL=10m`, `MAX_INBOX_TTL=30m`.
- [x] `DATABASE_URL` hanya tersedia bagi service Go.
- [x] `REDIS_ADDR` hanya menunjuk private Compose network.
- [ ] Production secrets wajib diganti sebelum deploy.

## 7. Security baseline

- [x] Token inbox tidak disimpan plaintext di database.
- [x] Query selalu dibatasi oleh inbox ID dan token yang tervalidasi.
- [x] SMTP menolak recipient tidak dikenal dan domain selain `mailtemps.space`.
- [x] SMTP tidak pernah menjadi open relay.
- [x] Request body, MIME message, attachment, dan recipient count dibatasi.
- [x] Header keamanan disetel di Caddy.
- [x] HTML email ditampilkan sebagai teks aman pada MVP; renderer tersanitasi dapat ditambah kemudian.
- [x] Database/Redis tidak memiliki published public port.

## 8. Verifikasi

- [x] `sqlc generate` berhasil.
- [x] `go test ./...` berhasil.
- [x] `go vet ./...` berhasil.
- [x] `npm run lint` berhasil.
- [x] `npm run build` berhasil.
- [x] `docker compose config` berhasil.
- [ ] Service Compose sehat dan API ready.
- [x] Flow lokal create inbox -> ingest SMTP -> read message -> delete teruji tanpa Docker.
- [ ] Cleanup kedaluwarsa dan flow Docker teruji end-to-end.

## 9. Batas eksekusi awal

Eksekusi ini menghasilkan fondasi MVP lengkap dan dapat dijalankan lokal. Attachment disimpan sebagai metadata terlebih dahulu; object storage dan malware scanning menjadi hardening lanjutan. HTML email tidak di-render sebagai HTML pada MVP untuk mencegah XSS. Deployment ke server dan perubahan DNS tidak dilakukan otomatis karena memerlukan akses server/DNS milik pengguna.
