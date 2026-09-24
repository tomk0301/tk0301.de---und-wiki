#!/bin/sh
set -eu

DOMAIN=wiki.tk0301.site
EXPECTED_IP=87.106.24.94
WEBROOT=/var/www/tk0301.site/public_html
CONFIG=/etc/nginx/sites-available/wiki.tk0301.site.conf
LINK=/etc/nginx/sites-enabled/wiki.tk0301.site.conf
BACKUP_DIR=/var/www/tk0301.site/backups
CERT_NAME=tk0301.site
CERT=/etc/letsencrypt/live/tk0301.site/fullchain.pem

fail() {
    printf 'Fehler: %s\n' "$*" >&2
    exit 1
}

[ "$(id -u)" -eq 0 ] || fail "Dieses Skript muss mit sudo ausgeführt werden."
command -v certbot >/dev/null 2>&1 || fail "Certbot ist nicht installiert."

RESOLVED=$(getent ahostsv4 "$DOMAIN" | awk 'NR == 1 { print $1 }')
[ "$RESOLVED" = "$EXPECTED_IP" ] ||
    fail "$DOMAIN zeigt lokal noch nicht auf $EXPECTED_IP (aktuell: ${RESOLVED:-keine Antwort})."

STAMP=$(date +%Y%m%d-%H%M%S)
mkdir -p "$BACKUP_DIR"
HAD_CONFIG=false
if [ -f "$CONFIG" ]; then
    HAD_CONFIG=true
    install -m 0644 "$CONFIG" "$BACKUP_DIR/wiki.tk0301.site.conf.$STAMP"
fi

restore_on_error() {
    if [ "$HAD_CONFIG" = true ]; then
        install -m 0644 "$BACKUP_DIR/wiki.tk0301.site.conf.$STAMP" "$CONFIG"
    else
        rm -f "$CONFIG" "$LINK"
    fi
    nginx -t >/dev/null 2>&1 && systemctl reload nginx || true
}
trap restore_on_error EXIT HUP INT TERM

cat >"$CONFIG" <<'HTTP_ONLY'
server {
    listen 80;
    listen [::]:80;
    server_name wiki.tk0301.site;

    location ^~ /.well-known/acme-challenge/ {
        root /var/www/tk0301.site/public_html;
        default_type "text/plain";
        try_files $uri =404;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}
HTTP_ONLY
ln -sfn "$CONFIG" "$LINK"
nginx -t
systemctl reload nginx

if ! openssl x509 -in "$CERT" -noout -text |
    grep -Fq "DNS:wiki.tk0301.site"; then
    certbot certonly \
        --webroot \
        --webroot-path "$WEBROOT" \
        --cert-name "$CERT_NAME" \
        --expand \
        --force-renewal \
        --non-interactive \
        -d mail.tk0301.site \
        -d tk0301.site \
        -d wiki.tk0301.site \
        -d www.tk0301.site
fi

openssl x509 -in "$CERT" -noout -text |
    grep -Fq "DNS:wiki.tk0301.site" ||
    fail "Das erneuerte Zertifikat enthält wiki.tk0301.site nicht."

cat >"$CONFIG" <<'NGINX'
server {
    listen 80;
    listen [::]:80;
    server_name wiki.tk0301.site;

    location ^~ /.well-known/acme-challenge/ {
        root /var/www/tk0301.site/public_html;
        default_type "text/plain";
        try_files $uri =404;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name wiki.tk0301.site;

    ssl_certificate     /etc/letsencrypt/live/tk0301.site/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tk0301.site/privkey.pem;

    access_log /var/www/tk0301.site/logs/access.log;
    error_log  /var/www/tk0301.site/logs/error.log;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    location = / {
        return 302 /wiki;
    }

    location / {
        proxy_pass http://127.0.0.1:3100;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
NGINX

nginx -t
systemctl reload nginx

READY=false
ATTEMPT=0
while [ "$ATTEMPT" -lt 20 ]; do
    if curl -fsS -o /dev/null https://wiki.tk0301.site/wiki; then
        READY=true
        break
    fi
    ATTEMPT=$((ATTEMPT + 1))
    sleep 1
done
[ "$READY" = true ] ||
    fail "Wiki-HTTPS-Endpunkt antwortet nach dem Nginx-Neuladen nicht korrekt."

trap - EXIT HUP INT TERM
printf 'wiki.tk0301.site wurde erfolgreich aktiviert.\n'
