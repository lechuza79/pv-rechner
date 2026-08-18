"use client";

import { useState } from "react";
import Link from "next/link";
import Modal from "./Modal";
import { v } from "../lib/theme";
import { TRUST_SIGNALS, type TrustSignal, type TrustIcon } from "../lib/trust-signals";
import { PRUEFSTAND } from "../lib/pruefstand";
import { IconCheck, IconQuote, IconRefresh, IconLock, IconArrowRight } from "./Icons";

// Vertrauens-Leiste über dem Footer, auf jeder (site)-Seite.
//
// Die Aussagen selbst stehen NICHT hier, sondern in lib/trust-signals.ts — eine
// Quelle, jede mit Beleg. Diese Datei ist Darstellung.
//
// Warum die Punkte KEINE einzelnen Links mehr sind, sondern ein gemeinsames
// Modal öffnen: Vier Verweise auf drei verschiedene Seiten in einer Fußzeile
// zerlegen den Leser. Wer wissen will, was hinter einer Zusage steckt, will sie
// erklärt bekommen — nicht die Seite verlassen und sich die Antwort auf einer
// Unterseite zusammensuchen. Das Modal führt beides zusammen: die Ausführung je
// Punkt, die Prüftermine je Größe, und von dort die Wege zu Methodik,
// Datenstand und Datenschutz.

const ICONS: Record<TrustIcon, (p: { size?: number; color?: string }) => React.ReactElement> = {
  check: IconCheck,
  quote: IconQuote,
  refresh: IconRefresh,
  lock: IconLock,
};

/** Beschriftung des seiteninternen Wegs — sagt, was dort steht, nicht "mehr". */
function wegLabel(href: string): string {
  if (href === "/methodik") return "Wie wir rechnen";
  if (href === "/datenschutz") return "Was mit deinen Daten passiert";
  return "Werte, Stand und Quellen";
}

/** Setzt `betont` fett — die einzige Hervorhebung je Punkt. */
function MitBetonung({ text, betont }: { text: string; betont?: string }) {
  if (!betont) return <>{text}</>;
  const i = text.indexOf(betont);
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <strong className="trust-item-betont">{betont}</strong>
      {text.slice(i + betont.length)}
    </>
  );
}

function TrustItem({ signal, onOeffnen }: { signal: TrustSignal; onOeffnen: () => void }) {
  const Icon = ICONS[signal.icon];
  return (
    <li>
      <button type="button" className="trust-item" onClick={onOeffnen}>
        <span className="trust-item-icon" aria-hidden="true">
          <Icon size={17} color={v("--color-accent")} />
        </span>
        <span>
          <span className="trust-item-title">{signal.titel}</span>
          <span className="trust-item-text">
            <MitBetonung text={signal.text} betont={signal.betont} />
          </span>
        </span>
      </button>
    </li>
  );
}

/**
 * Prüftermine je Größe — der Inhalt, der "regelmäßig" belegt statt behauptet.
 *
 * Kommt aus PRUEFSTAND (lib/pruefstand.ts), derselben Liste, gegen die
 * `npm run stand:faellig` meldet, wenn ein Wächter stillsteht. Damit kann die
 * Aufzählung hier nicht auseinanderlaufen mit dem, was tatsächlich geprüft wird.
 */
function Pruefrhythmen() {
  return (
    <section className="trust-modal-punkt">
      <h3 className="trust-modal-h3">Was wann geprüft wird</h3>
      <ul className="trust-modal-liste">
        {PRUEFSTAND.map((e) => (
          <li key={e.was}>
            <span>{e.was}</span>
            <span className="trust-modal-rhythmus">{e.rhythmus}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function TrustBar() {
  const [offen, setOffen] = useState(false);

  return (
    <div className="trust-bar">
      <ul className="trust-bar-grid">
        {TRUST_SIGNALS.map((s) => (
          <TrustItem key={s.titel} signal={s} onOeffnen={() => setOffen(true)} />
        ))}
      </ul>
      <button type="button" className="trust-mehr" onClick={() => setOffen(true)}>
        Mehr erfahren
        <IconArrowRight size={14} />
      </button>

      <Modal
        open={offen}
        onClose={() => setOffen(false)}
        title="Worauf du dich hier verlassen kannst"
        intro="Vier Zusagen — und was jeweils dahintersteckt."
        maxWidth={640}
      >
        <div className="trust-modal">
          {TRUST_SIGNALS.map((s) => {
            const Icon = ICONS[s.icon];
            return (
              <section key={s.titel} className="trust-modal-punkt">
                <h3 className="trust-modal-h3">
                  <span className="trust-item-icon" aria-hidden="true">
                    <Icon size={17} color={v("--color-accent")} />
                  </span>
                  {s.titel}
                </h3>
                <p className="trust-modal-text">{s.detail}</p>
                <p className="trust-modal-wege">
                  <Link href={s.href} onClick={() => setOffen(false)}>
                    {wegLabel(s.href)}
                  </Link>
                  {s.belegUrl && (
                    <>
                      {" · "}
                      <a href={s.belegUrl} target="_blank" rel="noopener noreferrer">
                        {s.belegLabel}
                      </a>
                    </>
                  )}
                </p>
              </section>
            );
          })}
          <Pruefrhythmen />
        </div>
      </Modal>
    </div>
  );
}
