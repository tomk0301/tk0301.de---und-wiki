#!/usr/bin/env bash
set -euo pipefail

APP_DIR=/var/www/tk0301.site/app
NODE_BIN=/home/thomas/.local/node/bin
ACTIVATOR=/home/thomas/activate-tk0301-website.sh

if [[ ! -f "$APP_DIR/package.json" || ! -x "$NODE_BIN/node" ]]; then
    echo "Fehler: Anwendung oder Node.js-Laufzeit fehlt." >&2
    exit 1
fi

echo "TK0301-Website: Administrator einrichten"
read -r -s -p "Neues Admin-Passwort (mindestens 14 Zeichen): " ADMIN_PASSWORD
echo
if [[ ${#ADMIN_PASSWORD} -lt 14 ]]; then
    unset ADMIN_PASSWORD
    echo "Fehler: Das Passwort muss mindestens 14 Zeichen lang sein." >&2
    exit 1
fi

SETUP_OUTPUT=$(
    printf '%s\n' "$ADMIN_PASSWORD" |
        PATH="$NODE_BIN:$PATH" npm --prefix "$APP_DIR" run --silent setup:admin
)
unset ADMIN_PASSWORD

umask 077
printf '%s\n' "$SETUP_OUTPUT" |
    grep -E '^(ADMIN_PASSWORD_HASH|ADMIN_TOTP_SECRET|SESSION_SECRET)=' \
        >"$APP_DIR/.env"

if [[ $(wc -l <"$APP_DIR/.env") -ne 3 ]]; then
    rm -f "$APP_DIR/.env"
    echo "Fehler: Admin-Konfiguration konnte nicht vollständig erzeugt werden." >&2
    exit 1
fi
chmod 0600 "$APP_DIR/.env"

TOTP_SECRET=$(sed -n 's/^ADMIN_TOTP_SECRET=//p' "$APP_DIR/.env")
echo
echo "Diesen Schlüssel jetzt in der Authenticator-App eintragen:"
echo
echo "$TOTP_SECRET"
echo
echo "Typ: zeitbasiert (TOTP), 6 Stellen, 30 Sekunden"
read -r -p "Wenn der Schlüssel gespeichert ist, Eingabetaste drücken: "

echo
echo "Die Website wird nun aktiviert. sudo fragt nach Ihrem Serverkennwort."
sudo "$ACTIVATOR"
