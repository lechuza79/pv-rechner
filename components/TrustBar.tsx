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

/**
 * Setzt Betonung und Quellen-Links in den Satz.
 *
 * Beide werden per Textsuche platziert, damit der Satz in lib/trust-signals.ts
 * ein lesbarer Satz bleibt und kein Markup-Gerüst. Trifft eine Markierung nicht,
 * fällt sie still aus — ein Test hält deshalb fest, dass jeder Begriff wörtlich
 * im Text vorkommt.
 */
type Marke = { start: number; ende: number; betont: boolean; url?: string };

function markiere(text: string, betont?: string, links?: { begriff: string; url: string }[]) {
  const marken: Marke[] = [];
  const setze = (begriff: string, url?: string) => {
    const i = text.indexOf(begriff);
    if (i < 0) return;
    const ende = i + begriff.length;
    const deckungsgleich = marken.find((m) => m.start === i && m.ende === ende);
    if (deckungsgleich) {
      // Dieselbe Wortfolge ist Link UND Hervorhebung — der Regelfall beim
      // Namen der Forschungsgruppe. Beides auf ein Element legen, statt eines
      // von beiden fallen zu lassen.
      if (url) deckungsgleich.url = url;
      else deckungsgleich.betont = true;
      return;
    }
    // Teilweise Überschneidungen verwerfen: Sie ergäben ein Element im Element.
    // Ein Test macht sie sichtbar, statt sie hier still zu schlucken.
    if (marken.some((m) => i < m.ende && ende > m.start)) return;
    marken.push({ start: i, ende, betont: !url, url });
  };
  links?.forEach((l) => setze(l.begriff, l.url));
  if (betont) setze(betont);
  marken.sort((a, b) => a.start - b.start);

  const teile: React.ReactNode[] = [];
  let pos = 0;
  marken.forEach((m, i) => {
    if (m.start > pos) teile.push(text.slice(pos, m.start));
    const roh = text.slice(m.start, m.ende);
    const inhalt = m.betont ? <strong className="trust-item-betont">{roh}</strong> : roh;
    teile.push(
      m.url ? (
        <a
          key={i}
          href={m.url}
          target="_blank"
          rel="noopener noreferrer"
          className="trust-item-quelle"
        >
          {inhalt}
        </a>
      ) : (
        <span key={i}>{inhalt}</span>
      ),
    );
    pos = m.ende;
  });
  if (pos < text.length) teile.push(text.slice(pos));
  return <>{teile}</>;
}

/**
 * Ein Punkt der Leiste.
 *
 * Die Kachel ist NIE als Ganzes anklickbar (Betreiber-Vorgabe 18.08.2026): Im
 * Satz stehen eigene Links auf die Quellen, und ein Klickziel innerhalb eines
 * Klickziels ist weder bedienbar noch zulässiges Markup. Anklickbar ist genau
 * das, was eine Handlung ankündigt — der "Mehr erfahren"-Knopf, und den gibt es
 * nur dort, wo dahinter auch etwas steht.
 */
function TrustItem({ signal, onOeffnen }: { signal: TrustSignal; onOeffnen: () => void }) {
  const Icon = ICONS[signal.icon];
  return (
    <li className="trust-item">
      <span className="trust-item-icon" aria-hidden="true">
        <Icon size={17} color={v("--color-accent")} />
      </span>
      <span>
        <span className="trust-item-title">{signal.titel}</span>
        <span className="trust-item-text">
          {markiere(signal.text, signal.betont, signal.links)}
        </span>
        {signal.mehr && (
          <button type="button" className="trust-item-mehr" onClick={onOeffnen}>
            Mehr erfahren
            <IconArrowRight size={13} />
          </button>
        )}
      </span>
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
