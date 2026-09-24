---
id: "b0fa7411-fbef-4cb9-bcc0-43b0679d2546"
slug: "scc"
title: "SCC und SCC Server Edition"
summary: "Alles rund um SCC"
category: "Software"
status: "published"
visibility: "public"
createdAt: "2026-08-04T13:57:57.971Z"
updatedAt: "2026-09-22T18:35:25.357Z"
---

## SCC

:::hinweis
**Text kommt noch**
:::

## SCC Server Edition

### Erreichbarkeit 

:::info
**Desktop:** 
https://mail.tk0301.site/admin/
:::

:::info
**Mobil:** 
https://mail.tk0301.site/mobil/admin/
:::

:::info
**Mailboxverwaltung:** 
https://mail.tk0301.site/mailbox/
:::

### Installation auf einem weiteren Server

:::hinweis
set -Eeuo pipefail
workdir=$(mktemp -d /root/scc-install.XXXXXX)
wget -O "$workdir/SCC-Server-Edition-Installation.zip" https://github.com/tomk0301/SCC-Server-Edition-Downloads/releases/latest/download/SCC-Server-Edition-Installation.zip
unzip -q "$workdir/SCC-Server-Edition-Installation.zip" -d "$workdir"
install_dir=$(find "$workdir" -mindepth 1 -maxdepth 1 -type d -name 'SCC-Server-Edition-*' -print -quit)
test -n "$install_dir"
cd "$install_dir"
chmod 700 Install_SCC_Server_Edition.sh
sudo ./Install_SCC_Server_Edition.sh --resume \
  --hostname "$(hostname -f)" \
  --timezone Europe/Berlin
:::

### Ablage Mac

**Künftig ausschließlich Projektdateien auf der NVMe**
Verwende künftig als festen Arbeitsort:


:::neutral
/Volumes/NVME 4TB/SCC-Server-Edition
:::

Auf einem neuen Mac:

:::neutral
gh repo clone tomk0301/SCC-Server-Edition \
"/Volumes/NVME 4TB/SCC-Server-Edition"
:::

Danach genau diesen Ordner in Codex als Projekt öffnen.
Wichtig: Projekt- und Entwicklungsdateien können vollständig auf der NVMe liegen. Einige interne Programmdateien, Einstellungen und Caches von Codex beziehungsweise ChatGPT bleiben jedoch normalerweise unter ~/.codex und ~/Library auf der internen SSD. Eine vollständige Verlagerung dieser App-Daten ist nicht ohne zusätzliche, potenziell störanfällige Umleitung möglich.
