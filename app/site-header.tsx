import Link from "next/link";
import { getCurrentUser } from "../lib/current-user";
import { navigationItems } from "../lib/navigation";
import { logout } from "./login/actions";

export async function SiteHeader({ title, editorHref }: { title: string; editorHref?: string }) {
  const user = await getCurrentUser();
  return (
    <header className="site-header">
      <div className="brand" aria-label={`TK0301 · ${title}`}><span className="brand-mark">TK</span></div>
      <nav className="site-nav" aria-label="Hauptnavigation">
        {navigationItems(user?.role || null).map(({ href, label }) => <Link key={href} href={href}>{label}</Link>)}
        {editorHref && user?.role === "admin" && <Link href={editorHref}>Zurück zum Editor</Link>}
        {user ? <form action={logout}><button className="button button-small" type="submit">Abmelden</button></form> : <Link href="/login">Anmelden</Link>}
      </nav>
    </header>
  );
}
