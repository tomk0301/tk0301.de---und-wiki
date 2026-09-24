import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "TK0301 — Persönliche Website",
    template: "%s · TK0301",
  },
  description: "Persönliche Website und geschütztes Wiki von TK0301.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de">
      <body>{children}<footer className="site-footer global-footer">© Thomas Knebel · Version 02.08.2026</footer></body>
    </html>
  );
}
