"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { v } from "../lib/theme";
import { TRUST_SIGNALS, pruefSignal, type TrustSignal, type TrustIcon } from "../lib/trust-signals";
import { IconCheck, IconQuote, IconRefresh, IconLock } from "./Icons";

// Vertrauens-Leiste über dem Footer, auf jeder (site)-Seite.
//
// Die Aussagen selbst stehen NICHT hier, sondern in lib/trust-signals.ts — eine
// Quelle, jede mit Beleg. Diese Datei ist reine Darstellung.
//
// Client-Komponente aus genau einem Grund: der Prüf-Punkt. Sein Verfall muss
// gegen die echte aktuelle Zeit laufen, und auf einer vollstatisch
// ausgelieferten Seite wäre eine serverseitige Zeit die des Builds (siehe
// app/api/trust/pruefstand/route.ts). Die drei dauerhaften Punkte rendern
// deshalb schon im Server-HTML — sie sind sofort da, im Quelltext lesbar und
// brauchen kein JavaScript. Nachgeladen wird ausschließlich der vierte.

const ICONS: Record<TrustIcon, (p: { size?: number; color?: string }) => React.ReactElement> = {
  check: IconCheck,
  quote: IconQuote,
  refresh: IconRefresh,
  lock: IconLock,
};

function TrustItem({ signal }: { signal: TrustSignal }) {
  const Icon = ICONS[signal.icon];
  return (
    <li>
      <Link href={signal.href} className="trust-item">
        <span className="trust-item-icon" aria-hidden="true">
          <Icon size={14} color={v("--color-accent")} />
        </span>
        <span>
          <span className="trust-item-title">{signal.titel}</span>
          <span className="trust-item-text">{signal.text}</span>
        </span>
      </Link>
    </li>
  );
}

export default function TrustBar() {
  // null = noch nicht geladen oder keine gültige Prüfung. In beiden Fällen wird
  // der Punkt nicht gezeigt: Ohne Protokoll gibt es keine Prüfung zu behaupten.
  const [pruef, setPruef] = useState<TrustSignal | null>(null);

  useEffect(() => {
    let abgebrochen = false;
    fetch("/api/trust/pruefstand")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { iso?: string | null } | null) => {
        if (abgebrochen || !d) return;
        setPruef(pruefSignal(d.iso ?? null));
      })
      .catch(() => {
        /* Der Punkt entfällt still — er ist ein Zusatz, kein Seiteninhalt. */
      });
    return () => {
      abgebrochen = true;
    };
  }, []);

  const signals = pruef ? [...TRUST_SIGNALS, pruef] : TRUST_SIGNALS;

  return (
    <div className="trust-bar">
      <ul className="trust-bar-grid">
        {signals.map((s) => (
          <TrustItem key={s.titel} signal={s} />
        ))}
      </ul>
    </div>
  );
}
