"use client";

import { useEffect, useRef, useState } from "react";

export function IdleSession() {
  const [remaining, setRemaining] = useState<number | null>(null);
  const [working, setWorking] = useState(false);
  const stayButton = useRef<HTMLButtonElement>(null);
  const deadlineRef = useRef(0);

  useEffect(() => {
    let active = true;
    let busy = false;
    let queuedTouch = false;
    let lastTouch = 0;
    let expiring = false;
    const update = (seconds: number) => {
      deadlineRef.current = Date.now() + seconds * 1000;
      if (active) setRemaining(seconds);
    };
    const expire = async () => {
      if (expiring) return;
      expiring = true;
      try { await fetch("/api/session", { method: "DELETE", cache: "no-store" }); } catch { /* Sitzung ist serverseitig bereits abgelaufen. */ }
      window.location.replace("/login?idle=1");
    };
    const request = async (method: "GET" | "POST") => {
      if (expiring) return;
      if (busy) { if (method === "POST") queuedTouch = true; return; }
      busy = true;
      try {
        const response = await fetch("/api/session", { method, cache: "no-store" });
        if (response.status === 401) { await expire(); return; }
        if (!response.ok) return;
        const data = await response.json() as { remainingSeconds: number };
        if (Number.isFinite(data.remainingSeconds)) update(data.remainingSeconds);
      } catch { /* Bei Netzfehlern wird die serverseitige Frist nicht verlängert. */ }
      finally {
        busy = false;
        if (queuedTouch && !expiring) { queuedTouch = false; void request("POST"); }
      }
    };
    const activity = () => {
      if (deadlineRef.current > 0 && deadlineRef.current - Date.now() <= 30_000) return;
      if (Date.now() - lastTouch < 10_000) return;
      lastTouch = Date.now();
      void request("POST");
    };
    const tick = () => {
      if (!deadlineRef.current || expiring) return;
      const seconds = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000));
      setRemaining(seconds);
      if (seconds === 0) void request("GET");
    };
    void request("GET");
    const clock = window.setInterval(tick, 1000);
    const check = window.setInterval(() => void request("GET"), 5000);
    for (const event of ["pointerdown", "keydown", "scroll", "touchstart"] as const) window.addEventListener(event, activity, { passive: true });
    const visible = () => { if (!document.hidden) void request("GET"); };
    document.addEventListener("visibilitychange", visible);
    return () => {
      active = false;
      window.clearInterval(clock);
      window.clearInterval(check);
      for (const event of ["pointerdown", "keydown", "scroll", "touchstart"] as const) window.removeEventListener(event, activity);
      document.removeEventListener("visibilitychange", visible);
    };
  }, []);

  const warning = remaining !== null && remaining > 0 && remaining <= 30;
  useEffect(() => { if (warning) stayButton.current?.focus(); }, [warning]);
  const stay = async () => {
    setWorking(true);
    try {
      const response = await fetch("/api/session", { method: "POST", cache: "no-store" });
      if (response.status === 401) { window.location.replace("/login?idle=1"); return; }
      if (response.ok) {
        const seconds = (await response.json() as { remainingSeconds: number }).remainingSeconds;
        deadlineRef.current = Date.now() + seconds * 1000;
        setRemaining(seconds);
      }
    } catch { /* Die serverseitige Frist läuft unverändert weiter. */ }
    finally { setWorking(false); }
  };
  const signOut = async () => {
    try { await fetch("/api/session", { method: "DELETE", cache: "no-store" }); }
    catch { /* Bei Netzfehlern bleibt die serverseitige Ablaufzeit maßgeblich. */ }
    window.location.replace("/login");
  };
  if (!warning) return null;
  return <div className="idle-overlay"><div className="idle-dialog" role="alertdialog" aria-modal="true" aria-labelledby="idle-title" aria-describedby="idle-description">
    <div className="eyebrow">Sicherheitshinweis</div><h2 id="idle-title">Gleich wirst du abgemeldet</h2>
    <p id="idle-description">Wegen Inaktivität endet deine Wiki-Sitzung in <strong>{remaining} Sekunden</strong>.</p>
    <div className="idle-actions"><button ref={stayButton} className="button" onClick={stay} disabled={working}>Angemeldet bleiben</button><button className="button button-secondary" onClick={() => { void signOut(); }}>Jetzt abmelden</button></div>
  </div></div>;
}
