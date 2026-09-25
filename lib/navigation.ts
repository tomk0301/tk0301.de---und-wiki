export type NavigationRole = "reader" | "admin" | null;

export function navigationItems(role: NavigationRole) {
  const common = [{ href: "/wiki", label: "Hauptseite" }];
  if (role !== "admin") return common;
  return [
    ...common,
    { href: "/verwaltung/articles", label: "Artikel verwalten" },
    { href: "/verwaltung", label: "Administration" },
  ];
}
