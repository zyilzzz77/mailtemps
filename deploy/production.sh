#!/usr/bin/env bash
#
# production.sh — deploy/update mailtemps.space di server production.
# Idempotent: aman dijalankan ulang kapan saja.
#
# Yang dilakukan:
#   1. git pull / clone repo
#   2. generate .env (password acak) jika belum ada
#   3. build + jalankan full stack: postgres, redis, api, smtp, worker, web
#   4. migrasi database (idempotent via tabel schema_migrations)
#   5. generate kunci DKIM + pastikan env pengiriman keluar ada di .env
#   6. smoke test: readyz + create inbox + homepage
#   7. pasang blok Caddy mailtemps.space di Caddyfile host (backup + validate + reload)
#   8. buka port 25 untuk SMTP + cek egress port 25
#   9. cetak checklist DNS pengiriman keluar (SPF, DKIM, DMARC, PTR)
#
# Usage:
#   bash deploy/production.sh            # deploy penuh / update
#   bash deploy/production.sh status     # status container
#   bash deploy/production.sh logs       # log container

set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_FILE="$APP_DIR/deploy.log"
CADDY_CONTAINER="exisel-production-caddy-1"
CADDY_FILE="/opt/exisel/Caddyfile"
MARK_START="# >>> mailtemps.space (dikelola deploy/production.sh) >>>"
MARK_END="# <<< mailtemps.space <<<"
PG_CONTAINER="mailtemps-postgres-1"
REDIS_CONTAINER="mailtemps-redis-1"

log() { echo "[mailtemps] $(date '+%F %T') $*" | tee -a "$LOG_FILE"; }
die() { log "ERROR: $*"; exit 1; }

command -v docker >/dev/null || die "docker tidak ditemukan"
if docker compose version >/dev/null 2>&1; then COMPOSE="docker compose"; else COMPOSE="docker-compose"; fi

case "${1:-deploy}" in
  status) cd "$APP_DIR"; $COMPOSE ps; exit 0 ;;
  logs)   cd "$APP_DIR"; $COMPOSE logs --tail="${2:-80}"; exit 0 ;;
esac

cd "$APP_DIR"
log "=== mulai deploy/update ==="

log "tarik kode terbaru"
if [ -d .git ]; then
  BEFORE="$(git rev-parse HEAD)"
  git pull --ff-only origin main
  AFTER="$(git rev-parse HEAD)"
  if [ "$BEFORE" != "$AFTER" ] && ! git diff --quiet "$BEFORE" "$AFTER" -- deploy/production.sh; then
    log "production.sh diperbarui — jalankan ulang dengan versi baru"
    exec bash "$APP_DIR/deploy/production.sh"
  fi
else
  git clone --depth 1 https://github.com/zyilzzz77/mailtemps.git "$APP_DIR"
  cd "$APP_DIR"
fi

if [ ! -f .env ]; then
  PG_PASS="$(od -An -N16 -tx1 /dev/urandom | tr -d ' \n')"
  cat > .env <<EOF
MAIL_DOMAIN=mailtemps.space
API_ADDR=:8081
SMTP_ADDR=:2525
DATABASE_URL=postgres://mailtemps:${PG_PASS}@postgres:5432/mailtemps?sslmode=disable
REDIS_ADDR=redis:6379
REDIS_PASSWORD=
INBOX_TTL=10m
MAX_INBOX_TTL=30m
CLEANUP_INTERVAL=1m
MAX_MESSAGE_BYTES=10485760
CREATE_RATE_LIMIT=10
TRUSTED_ORIGINS=http://localhost:3000,http://localhost:3001,https://mailtemps.space
OUTBOUND_ENABLED=true
HELO_HOSTNAME=mx.mailtemps.space
DKIM_SELECTOR=mail
SEND_PER_INBOX_LIMIT=5
SEND_GLOBAL_DAILY_LIMIT=50
POSTGRES_DB=mailtemps
POSTGRES_USER=mailtemps
POSTGRES_PASSWORD=${PG_PASS}
WEB_PORT=3001
API_PORT=8081
SMTP_BIND_IP=0.0.0.0
SMTP_PUBLIC_PORT=25
EOF
  chmod 600 .env
  log ".env dibuat dengan password acak"
fi

ensure_env() {
  local key="$1" value="$2"
  if ! grep -qE "^${key}=" .env; then
    printf '%s=%s\n' "$key" "$value" >> .env
    log ".env: tambah $key"
  fi
}

log "pastikan env pengiriman keluar ada"
ensure_env OUTBOUND_ENABLED true
ensure_env HELO_HOSTNAME "mx.${MAIL_DOMAIN:-mailtemps.space}"
ensure_env DKIM_SELECTOR mail
ensure_env SEND_PER_INBOX_LIMIT 5
ensure_env SEND_GLOBAL_DAILY_LIMIT 50

DKIM_DIR="$APP_DIR/deploy/dkim"
DKIM_KEY="$DKIM_DIR/mail.private.pem"
DKIM_PUB="$DKIM_DIR/mail.public.pem"
if [ ! -f "$DKIM_KEY" ]; then
  if command -v openssl >/dev/null 2>&1; then
    mkdir -p "$DKIM_DIR"
    openssl genrsa -out "$DKIM_KEY" 2048 2>/dev/null
    openssl rsa -in "$DKIM_KEY" -pubout -out "$DKIM_PUB" 2>/dev/null
    chmod 600 "$DKIM_KEY"
    log "kunci DKIM dibuat di $DKIM_DIR"
  else
    log "PERINGATAN: openssl tidak ada — DKIM dilewati, email keluar akan dikirim tanpa tanda tangan"
  fi
fi
if [ -f "$DKIM_KEY" ] && ! grep -qE '^DKIM_PRIVATE_KEY_B64=' .env; then
  DKIM_B64="$(base64 -w0 "$DKIM_KEY" 2>/dev/null || base64 "$DKIM_KEY" | tr -d '\n')"
  printf 'DKIM_PRIVATE_KEY_B64=%s\n' "$DKIM_B64" >> .env
  log ".env: DKIM_PRIVATE_KEY_B64 diisi"
fi

log "build + jalankan stack"
$COMPOSE up -d --build --remove-orphans

log "hubungkan api+web ke network caddy host"
CADDY_NET="exisel-production_edge"
if docker network inspect "$CADDY_NET" >/dev/null 2>&1; then
  for svc in api web; do
    cname="mailtemps-${svc}-1"
    if ! docker network inspect "$CADDY_NET" --format '{{range .Containers}}{{.Name}} {{end}}' | grep -qw "$cname"; then
      docker network connect --alias "mailtemps-${svc}" "$CADDY_NET" "$cname"
      log "network: $cname masuk $CADDY_NET"
    fi
  done
fi

log "tunggu postgres + redis sehat"
ok=0
for _ in $(seq 1 90); do
  if docker exec "$PG_CONTAINER" pg_isready -U mailtemps -d mailtemps >/dev/null 2>&1 \
     && [ "$(docker exec "$REDIS_CONTAINER" redis-cli ping 2>/dev/null)" = "PONG" ]; then
    ok=1; break
  fi
  sleep 2
done
[ "$ok" = "1" ] || { $COMPOSE logs --tail=40 postgres redis; die "postgres/redis tidak siap"; }

pgq() { docker exec "$PG_CONTAINER" psql -U mailtemps -d mailtemps "$@"; }

log "migrasi database"
pgq -tAc "CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())" >/dev/null
if [ "$(pgq -tAc 'SELECT count(*) FROM schema_migrations' | tr -d '[:space:]')" = "0" ] \
   && [ "$(pgq -tAc "SELECT to_regclass('public.inboxes') IS NOT NULL" | tr -d '[:space:]')" = "t" ]; then
  pgq -tAc "INSERT INTO schema_migrations(name) VALUES('000001_init.up.sql') ON CONFLICT DO NOTHING" >/dev/null
fi
for f in $(find "$APP_DIR/backend/internal/database/migrations" -maxdepth 1 -name '*.up.sql' | sort); do
  name="$(basename "$f")"
  if [ -z "$(pgq -tAc "SELECT 1 FROM schema_migrations WHERE name='$name'" | tr -d '[:space:]')" ]; then
    log "migrasi: $name"
    docker exec -i "$PG_CONTAINER" psql -U mailtemps -d mailtemps -v ON_ERROR_STOP=1 -q < "$f"
    pgq -tAc "INSERT INTO schema_migrations(name) VALUES('$name')" >/dev/null
  fi
done
log "migrasi selesai"

log "tunggu api siap"
code=""
for _ in $(seq 1 90); do
  code="$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8081/readyz || true)"
  [ "$code" = "200" ] && break
  sleep 2
done
[ "$code" = "200" ] || { $COMPOSE logs --tail=50 api; die "api tidak siap (readyz=$code)"; }

log "smoke test: endpoint buat inbox"
CREATE="$(curl -s -m 10 -X POST http://127.0.0.1:8081/api/v1/inboxes \
  -H 'Content-Type: application/json' -d '{"name":"smoke"}')"
if [ -n "$(grep '^TURNSTILE_SECRET_KEY=' .env | cut -d= -f2- | tr -d '[:space:]')" ]; then
  # Turnstile aktif: request tanpa token memang harus ditolak.
  # Itu sekaligus bukti verifikasi keamanan benar-benar berjalan.
  echo "$CREATE" | grep -q 'verifikasi keamanan gagal' || { $COMPOSE logs --tail=50 api; die "smoke gagal (turnstile aktif): $CREATE"; }
  log "smoke OK: Turnstile aktif dan menolak request tanpa token"
else
  echo "$CREATE" | grep -q '"address"' || { $COMPOSE logs --tail=50 api; die "smoke gagal: $CREATE"; }
  log "smoke OK: $(echo "$CREATE" | grep -o '"address":"[^"]*"' | head -1)"
fi

log "cek homepage web"
PAGE="$(curl -s -m 10 -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/ || true)"
[ "$PAGE" = "200" ] || { $COMPOSE logs --tail=50 web; die "web tidak merespons (http=$PAGE)"; }
log "web OK (http=$PAGE)"

log "pasang blok caddy mailtemps.space"
if [ -f "$CADDY_FILE" ] && docker ps --format '{{.Names}}' | grep -qx "$CADDY_CONTAINER"; then
  if grep -qF "$MARK_START" "$CADDY_FILE"; then
    sed -i "\\|$MARK_START|,\\|$MARK_END|d" "$CADDY_FILE"
  fi
  BACKUP="$CADDY_FILE.bak.$(date +%Y%m%d%H%M%S)"
  cp "$CADDY_FILE" "$BACKUP"
  # Caddy host jalan di dalam container, jadi upstream pakai nama container
  # (terhubung lewat network exisel-production_edge), bukan 127.0.0.1 host.
  BLOCK="$(cat "$APP_DIR/deploy/Caddyfile")"
  BLOCK="${BLOCK//127.0.0.1:8081/mailtemps-api:8081}"
  BLOCK="${BLOCK//127.0.0.1:3001/mailtemps-web:3000}"
  { echo ""; echo "$MARK_START"; printf '%s\n' "$BLOCK"; echo "$MARK_END"; } >> "$CADDY_FILE"
  ls -1t "$CADDY_FILE".bak.* 2>/dev/null | tail -n +11 | xargs -r rm -f

  log "validasi konfigurasi caddy"
  if ! docker exec "$CADDY_CONTAINER" caddy validate --config /etc/caddy/Caddyfile; then
    log "validasi GAGAL — restore backup"
    cp "$BACKUP" "$CADDY_FILE"
    docker exec "$CADDY_CONTAINER" caddy validate --config /etc/caddy/Caddyfile || true
    die "blok caddy baru tidak valid; Caddyfile host dikembalikan seperti semula"
  fi

  # Admin API caddy host dimatikan (admin off), jadi reload tidak tersedia.
  # Satu-satunya cara mengaktifkan blok baru: restart container (downtime ~1-2 detik).
  log "admin API off — restart $CADDY_CONTAINER untuk mengaktifkan blok mailtemps"
  docker restart "$CADDY_CONTAINER" >/dev/null
  caddy_ok=0
  for _ in $(seq 1 30); do
    code="$(curl -sk -m 5 --resolve mailtemps.space:443:127.0.0.1 -o /dev/null -w '%{http_code}' https://mailtemps.space/ || true)"
    if [ "$code" != "000" ] && [ -n "$code" ]; then caddy_ok=1; break; fi
    sleep 2
  done
  [ "$caddy_ok" = "1" ] || die "caddy tidak kembali setelah restart; periksa: docker logs $CADDY_CONTAINER"
  log "caddy aktif kembali dengan blok mailtemps.space (backup: $BACKUP)"
else
  log "SKIP caddy: $CADDY_FILE atau container $CADDY_CONTAINER tidak ditemukan"
fi

log "buka port 25 untuk SMTP"
if command -v ufw >/dev/null 2>&1 && ufw status 2>/dev/null | grep -q "Status: active"; then
  if ! ufw status | grep -qE '^25/tcp'; then
    ufw allow 25/tcp
    log "ufw: 25/tcp dibuka"
  else
    log "ufw: 25/tcp sudah terbuka"
  fi
fi

log "cek egress port 25 (syarat pengiriman keluar)"
if timeout 8 bash -c 'cat < /dev/null > /dev/tcp/gmail-smtp-in.l.google.com/25' 2>/dev/null; then
  log "egress port 25 OK"
else
  log "PERINGATAN: egress port 25 TIDAK tembus."
  log "  Banyak provider VPS memblokir TCP/25 keluar. Ajukan pembukaan lewat support provider,"
  log "  atau pengiriman keluar ke Gmail/Outlook tidak akan pernah berhasil."
fi

log "checklist DNS pengiriman keluar (pasang manual di Cloudflare):"
log "  SPF    : mailtemps.space. TXT \"v=spf1 mx ip4:142.248.82.88 -all\""
log "  DMARC  : _dmarc.mailtemps.space. TXT \"v=DMARC1; p=none; rua=mailto:admin@mailtemps.space\""
if [ -f "$DKIM_PUB" ]; then
  DKIM_TXT="$(grep -v -- '-----' "$DKIM_PUB" | tr -d '\n')"
  log "  DKIM   : mail._domainkey.mailtemps.space. TXT \"v=DKIM1; k=rsa; p=${DKIM_TXT}\""
else
  log "  DKIM   : kunci publik belum ada (openssl tidak tersedia saat deploy)"
fi
log "  PTR    : set reverse DNS 142.248.82.88 -> mx.mailtemps.space di panel provider VPS"
log "  Verifikasi setelah semua terpasang: https://www.mail-tester.com/"

log "=== deploy selesai ==="
$COMPOSE ps
log "web: http://127.0.0.1:3001 | api: http://127.0.0.1:8081 | smtp: :25"
log "SSL aktif otomatis setelah DNS mailtemps.space -> 142.248.82.88 (A) dan MX mx.mailtemps.space -> 142.248.82.88"
