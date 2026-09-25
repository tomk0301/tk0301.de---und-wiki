# TK0301 Website und Wiki

Persönliche Website für `tk0301.site` und Wiki für
`wiki.tk0301.site`.

## Versionierung

Die Versionsnummer stammt zentral aus `package.json` und erscheint in der
Fußleiste. Die erste Wiki-Veröffentlichung nach diesem Schema ist `1.0.0`
(Linie 1.0). Größere funktionale Erweiterungen erhöhen die mittlere Zahl
und setzen die letzte auf null, z. B. `1.1.0`. Kleinere Ergänzungen und
Korrekturen erhöhen nur die letzte Zahl, z. B. `1.0.1`. Dazu
`node scripts/bump-version.mjs minor` beziehungsweise `patch` verwenden;
das Skript hält `package-lock.json` synchron.

## Markdown-Inhalte

Die aktive Anwendung liest Artikel aus `.wrangler/wiki-content/public` und
`.wrangler/wiki-content/private`. Der Editor speichert Markdown mit
Frontmatter; fertige `.md`-Dateien können im Editor importiert werden.
Öffentliche Artikel liegen in diesem Repository unter `content/articles/public`.
Private Artikel und Laufzeitdaten bleiben ausschließlich auf dem Server.

## Backup & Restore

Unter `/verwaltung/backup` wird ein **eigenes** Wiki-Sicherungsziel konfiguriert:
WebDAV mit separatem NAS-Benutzer und eigenem Zielordner oder ein für den
Dienstbenutzer `thomas` beschreibbarer lokaler/gemounteter Pfad. SCC-Zugangsdaten
und SCC-Sicherungsverzeichnisse werden nicht übernommen. Die Konfiguration
liegt mit Modus 0600 unter `.wrangler/wiki-backup-config.json` und gehört
ausdrücklich nicht ins Repository.
Für selbstsignierte WebDAV-Zertifikate ist zusätzlich der SHA-256-Fingerabdruck
zu hinterlegen; bei Zertifikatswechsel muss dieser bewusst aktualisiert werden.

Der Dienst sichert `.wrangler/wiki-content` (öffentlich und privat), Benutzer,
Geräte, Einstellungen, Uploads, den alten Artikelbestand und `.env` in ein
GPG-verschlüsseltes Archiv. Nach Upload wird das Archiv erneut geladen,
per SHA-256 geprüft, entschlüsselt und isoliert extrahiert. Erst danach gilt
ein Lauf als erfolgreich. Die tägliche Sicherung und manuelle Aufträge aus
der Administrationsseite werden von zwei systemd-Timern ausgeführt; alte
Archive werden erst nach einem erfolgreichen neuen Backup gemäß Aufbewahrung
gelöscht.

Den Verschlüsselungsschlüssel **außerhalb des Servers** sicher verwahren. Ohne
ihn ist ein Restore nach Serverausfall nicht möglich. Für einen isolierten
Restore-Test: `node scripts/wiki-backup.mjs verify`. Ein produktiver Restore
ist absichtlich noch kein Web-Knopf. Ein geprüftes Archiv kann mit
`node scripts/wiki-backup.mjs restore-to ARCHIV-ID /pfad/zu/einem/leeren/ziel`
in einen separaten Ordner zurückgespielt werden. Erst nach Sichtprüfung,
separater Vorsicherung und Wartungsfenster dürfen die aktiven Dateien ersetzt
werden. Das Restore-Ziel muss leer sein; die Produktivdaten bleiben unverändert.

Nach einem Checkout für den Serverbetrieb die freigegebenen öffentlichen
Dateien nach `.wrangler/wiki-content/public` kopieren. Die privaten Dateien
dürfen dabei nicht ersetzt werden. Für die einmalige Übernahme des alten
JSON-Bestands dient `scripts/migrate-articles.mjs`; vor dem Aufruf eine
Sicherung von `.wrangler/wiki-articles.json` erstellen. Das Skript bricht ab,
wenn das Markdown-Ziel nicht leer ist.

## Enthalten

- erweiterbare Hauptseite
- öffentliches Lese-Wiki
- einzelner Administrator
- Passwort plus TOTP-2FA
- signierte, HTTP-only Sitzung mit acht Stunden Laufzeit
- vorbereitete Nginx-Konfiguration für den bestehenden iRedMail-Server

Die Anwendung greift nicht auf iRedMail-Konten, Passwörter oder Datenbanken zu.

## Lokal starten

1. Abhängigkeiten mit `pnpm install` installieren.
2. Mit `pnpm setup:admin` sichere Administrator-Werte erzeugen.
3. `.env.example` nach `.env` kopieren und die erzeugten Werte eintragen.
4. Den ausgegebenen TOTP-Schlüssel manuell in der Authenticator-App als
   zeitbasierten sechsstelligen Schlüssel hinzufügen.
5. Mit `pnpm dev` starten.

## Veröffentlichung

Die Anwendung wird als eigener Dienst unter einem unprivilegierten Benutzer
betrieben und nur an `127.0.0.1:3100` gebunden. Die Vorlage
`deploy/nginx-tk0301.conf` wird kontrolliert in die vorhandene
iRedMail-Nginx-Konfiguration übernommen.

Vor der Aktivierung:

- DNS für `tk0301.site`, `www.tk0301.site` und `wiki.tk0301.site` setzen
- TLS-Zertifikate für alle drei Namen bereitstellen
- `.env` ausschließlich für den Dienstbenutzer lesbar machen
- Nginx-Konfiguration testen
- Mailversand, Mailempfang und Webmail nach der Änderung prüfen

Die Serverinstallation ist bewusst nicht automatisiert: Änderungen an einem
produktiven iRedMail-Host werden erst nach Sichtung der vorhandenen
Konfiguration vorgenommen.
