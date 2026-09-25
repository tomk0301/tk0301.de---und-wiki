export type NavigationRole = "reader" | "admin" | null;

export function navigationItems(role: NavigationRole) {
  const common = [{ href: "/wiki", label: "Hauptseite" }];
  if (role !== "admin") return common;
  return [
    ...common,
    { href: "/verwaltung", label: "Administration" },
    { href: "/verwaltung/articles", label: "Artikel verwalten" },
    { href: "/verwaltung/benutzer", label: "Benutzer" },
    { href: "/verwaltung/einstellungen", label: "Konfiguration" },
    { href: "/verwaltung/backup", label: "Backup & Restore" },
  ];
}
