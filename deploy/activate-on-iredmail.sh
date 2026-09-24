#!/bin/sh
set -eu

APP_DIR=/var/www/tk0301.site/app
NGINX_CONFIG=/etc/nginx/sites-available/tk0301.site.conf
SERVICE_CONFIG=/etc/systemd/system/tk0301-web.service
BACKUP_DIR=/var/www/tk0301.site/backups
NODE_BIN=/home/thomas/.local/node/bin

fail() {
    printf 'Fehler: %s\n' "$*" >&2
    exit 1
}

[ "$(id -u)" -eq 0 ] || fail "Dieses Skript muss mit sudo ausgeführt werden."
[ -f "$APP_DIR/package.json" ] || fail "Anwendung fehlt unter $APP_DIR."
[ -f "$APP_DIR/.env" ] || fail "Admin-Konfiguration fehlt: $APP_DIR/.env"
[ -x "$NODE_BIN/node" ] || fail "Node.js-Laufzeit fehlt."
[ -f "$APP_DIR/dist/server/index.js" ] || fail "Produktions-Build fehlt."

STAMP=$(date +%Y%m%d-%H%M%S)
mkdir -p "$BACKUP_DIR"
install -m 0640 "$NGINX_CONFIG" "$BACKUP_DIR/tk0301.site.conf.$STAMP"

cat >"$SERVICE_CONFIG" <<'UNIT'
[Unit]
Description=TK0301 Website und Wiki
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=thomas
Group=www-data
WorkingDirectory=/var/www/tk0301.site/app
Environment=NODE_ENV=production
Environment=PATH=/home/thomas/.local/node/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin
EnvironmentFile=/var/www/tk0301.site/app/.env
ExecStart=/home/thomas/.local/node/bin/npm run start -- --port 3100
Restart=on-failure
RestartSec=5s
NoNewPrivileges=true
PrivateTmp=true
ProtectHome=read-only
ProtectSystem=strict
ReadWritePaths=/var/www/tk0301.site/app/.wrangler
IPAddressDeny=any
IPAddressAllow=localhost

[Install]
WantedBy=multi-user.target
UNIT

cat >"$NGINX_CONFIG" <<'NGINX'
server {
    listen 80;
    listen [::]:80;
    server_name tk0301.site www.tk0301.site;

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
    server_name tk0301.site www.tk0301.site;

    ssl_certificate     /etc/letsencrypt/live/tk0301.site/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tk0301.site/privkey.pem;

    access_log /var/www/tk0301.site/logs/access.log;
    error_log  /var/www/tk0301.site/logs/error.log;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "interest-cohort=()" always;

    location ^~ /.well-known/ {
        root /var/www/tk0301.site/public_html;
        default_type text/plain;
        try_files $uri =404;
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

install -d -o thomas -g www-data -m 2770 "$APP_DIR/.wrangler"
chown root:root "$SERVICE_CONFIG" "$NGINX_CONFIG"
chmod 0644 "$SERVICE_CONFIG" "$NGINX_CONFIG"

systemctl daemon-reload
systemctl enable --now tk0301-web.service
sleep 2
systemctl is-active --quiet tk0301-web.service ||
    fail "Webdienst konnte nicht gestartet werden."
curl -fsS http://127.0.0.1:3100/ >/dev/null ||
    fail "Lokale Startseite antwortet nicht."

if ! nginx -t; then
    install -m 0644 "$BACKUP_DIR/tk0301.site.conf.$STAMP" "$NGINX_CONFIG"
    nginx -t
    fail "Neue Nginx-Konfiguration war ungültig; Sicherung wurde wiederhergestellt."
fi

systemctl reload nginx
printf 'TK0301-Website wurde aktiviert.\n'
printf 'Nginx-Sicherung: %s/tk0301.site.conf.%s\n' "$BACKUP_DIR" "$STAMP"
