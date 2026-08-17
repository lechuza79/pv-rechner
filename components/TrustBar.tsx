import Link from "next/link";
import { v } from "../lib/theme";
import { TRUST_SIGNALS, type TrustSignal, type TrustIcon } from "../lib/trust-signals";
import { IconCheck, IconQuote, IconRefresh, IconLock } from "./Icons";

// Vertrauens-Leiste über dem Footer, auf jeder (site)-Seite.
//
// Die Aussagen selbst stehen NICHT hier, sondern in lib/trust-signals.ts — eine
// Quelle, jede mit Beleg. Diese Datei ist reine Darstellung.
//
// Server-Komponente ohne eigene Daten: Die Leiste trug zwischenzeitlich ein
// nachgeladenes Prüfdatum aus der Datenbank. Das ist raus (siehe die Begründung
// in lib/trust-signals.ts — wir prüfen in verschiedenen Takten, ein Datum für
// alle wäre falsch). Ohne diesen Wert braucht sie weder Client-JavaScript noch
// einen Datenbank-Read und steht vollständig im ausgelieferten HTML.

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
  return (
    <div className="trust-bar">
      <ul className="trust-bar-grid">
        {TRUST_SIGNALS.map((s) => (
          <TrustItem key={s.titel} signal={s} />
        ))}
      </ul>
    </div>
  );
}
