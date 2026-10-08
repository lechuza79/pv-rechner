"use client";

import Script from "next/script";
import { useState } from "react";
import Modal from "../Modal";
import FundingDetailModal from "../FundingDetailModal";
import ContactForm from "../ContactForm";
import { FundingStatusBadge } from "../FundingProgramParts";
import { istFinanzierung, saetzeFuer, technikenVon, type FundingProgram, type FundingTechnik } from "../../lib/funding-programs";

/**
 * Förderung auf der Ortsseite: je Programm eine Vorschaubox, die Einzelheiten
 * im Fenster.
 *
 * WARUM NICHT EIN LINK (Befund des Betreibers, 23.09.2026): Vorher stand hier
 * ein Verweis auf die Landesseite — bei Quitzdorf „Landesförderung in Sachsen",
 * obwohl Sachsens einziges Programm ein BEENDETER Balkon-Zuschuss ist. Ein Ort
 * ohne eigenes Programm bekommt jetzt den Satz, der wirklich gilt: dass die
 * bundesweite Regelung greift. Und wo es etwas gibt, steht es hier mit allem,
 * was wir dazu wissen — Wärmepumpe und Balkonkraftwerk eingeschlossen, nicht
 * nur Photovoltaik.
 *
 * Die Bundesprogramme (Nullsteuersatz, KfW 270) bekommen KEINE Box: Sie gelten
 * überall gleich und sagen über diesen Ort nichts aus. Sie stehen als Satz
 * darüber. Ein Weg zur bundesweiten Übersicht stand hier und ist weg
 * (Betreiber, 23.09.2026): Der Abschnitt beantwortet die Frage nach DIESEM
 * Ort, und ein Link in eine Liste aller Programme führt davon weg.
 */
const TECHNIK_WORT: Record<FundingTechnik, string> = {
  pv: "Photovoltaik",
  balkon: "Balkonkraftwerk",
  waermepumpe: "Wärmepumpe",
};

/** Dasselbe Motiv, das die Beispielrechnung derselben Technik trägt. */
const MOTIV: Record<FundingTechnik, string> = {
  pv: "house",
  balkon: "balcony-modern",
  waermepumpe: "heatpump-modern",
};

export type FoerderProgrammAnsicht = {
  programm: FundingProgram;
  geltungsbereich?: string;
  /** „Zuletzt geprüft am …" oder der redaktionelle Stand — serverseitig
   *  gebildet, damit die Regel dafür an einer Stelle bleibt. */
  standLabel: string;
  /** Zählt das Programm heute noch Geld? Entscheidet allein `fundingZaehlt()`
   *  auf dem Server; hier nur der Wortlaut. */
  zaehlt: boolean;
};

/** Archived = shown only in the closed archive below the cards. */
export const istArchiviert = (p: FoerderProgrammAnsicht) =>
  ["ausgeschoepft", "eingestellt", "pausiert"].includes(p.programm.status);

/**
 * The sentence above the cards — derived from EXACTLY the cards it introduces.
 *
 * It used to follow a different set (only programs that deduct money in the
 * calculator), so Berlin read "kein eigener Zuschuss bekannt" directly above
 * an active SolarPLUS card. Whether a program deducts money stays with
 * `fundingZaehlt()` on the server; this sentence only names what is listed.
 * Loans are named as loans: Bremen's only card is a loan, and "Diese
 * Zuschüsse" above it was false. The place takes its preposition from the
 * shared rule ("Im Vogelsbergkreis", "Im Saarland"), not a bare "Für X".
 */
export function foerderEinleitung(ort: string, praeposition: string, aktuell: FoerderProgrammAnsicht[]): string {
  if (aktuell.length === 0) {
    const wo = `${praeposition.charAt(0).toUpperCase()}${praeposition.slice(1)} ${ort}`;
    return `${wo} ist uns derzeit kein eigenes Förderprogramm bekannt. Es gilt die bundesweite Förderung.`;
  }
  const eins = aktuell.length === 1;
  const darlehen = aktuell.filter((p) => istFinanzierung(p.programm)).length;
  const subjekt =
    darlehen === aktuell.length
      ? eins ? "Dieses Darlehen gilt" : "Diese Darlehen gelten"
      : darlehen === 0
        ? eins ? "Dieser Zuschuss gilt" : "Diese Zuschüsse gelten"
        : "Diese Programme gelten";
  return `${subjekt} hier zusätzlich zur bundesweiten Förderung.`;
}

export default function GemeindeFoerderung({
  ort,
  programme,
  praeposition="in",
}: {
  ort: string;
  praeposition?: string;
  programme: FoerderProgrammAnsicht[];
}) {
  const [offen, setOffen] = useState<FoerderProgrammAnsicht | null>(null);
  const [meldung, setMeldung] = useState<FoerderProgrammAnsicht | null>(null);


  const archiv = programme.filter(istArchiviert);
  const aktuell = programme.filter((p) => !istArchiviert(p));
  const karten = (liste: FoerderProgrammAnsicht[]) => (
        <div className="v3-examples sc-feature-list gemeinde-foerder-liste">
          {liste.map((p) => {
            const satz = saetzeFuer(p.programm.rates)[0];
            const techniken = technikenVon(p.programm);
            return (
              <article key={p.programm.id} className="sc-feature-card sc-feature-card--compact">
                {/* @ts-expect-error — web component from /illustrations-motion/solar-illustrations.js */}
                <solar-illustration
                  class="v3-example-art sc-feature-visual"
                  motif={MOTIV[techniken[0]] ?? "house"}
                  label={TECHNIK_WORT[techniken[0]] ?? "Förderung"}
                  circle=""
                  loading="lazy"
                  loading-margin="1200"
                  thumbnail=""
                />
                <div className="v3-example-copy sc-feature-content">
                  <div className="gemeinde-foerder-kopf" data-status={p.programm.status}><p className="atlas-kicker">{techniken.map((t) => TECHNIK_WORT[t]).join(" · ")}</p><FundingStatusBadge status={p.programm.status} compact /></div>
                  <h3>{p.programm.name}</h3>
                  <p>{satz ? `${satz.value}${satz.label ? ` · ${satz.label}` : ""}` : p.programm.coveredCosts}</p>
                  <p className="gemeinde-foerder-ebene"><a href={p.programm.url} target="_blank" rel="noopener noreferrer">{p.programm.traeger}</a></p>
                {p.geltungsbereich && <p className="gemeinde-foerder-ebene">{p.geltungsbereich}</p>}
                <div className="gemeinde-foerder-aktionen">
                <button type="button" className="v3-example-cta sc-feature-action" onClick={() => setOffen(p)}>
                  Einzelheiten
                </button>
                <button type="button" className="v3-example-cta sc-feature-action gemeinde-foerder-melden" onClick={() => setMeldung(p)}>
                  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 21V4m0 0c5-4 9 4 14 0v10c-5 4-9-4-14 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  <span>Änderung melden</span>
                </button>
                </div>
                </div>
              </article>
            );
          })}
        </div>
  );
  return (
    <div className="v3-examples-foerderung" id="atlas-foerderung">
      <Script src="/illustrations-motion/solar-illustrations.js" strategy="afterInteractive"/>
      <h3>Förderung {praeposition} {ort}</h3>
      <p>{foerderEinleitung(ort, praeposition, aktuell)}</p>
      {/* DIESELBE Karte wie die drei Beispielrechnungen darüber (Betreiber,
          23.09.2026: „Box wie die anderen und noch das Visual rein, nicht
          Styles erfinden, recyceln"). Vorher hatte dieser Abschnitt eine
          eigene, handgeschriebene Box — eigene Schrift, eigene Ränder, eigene
          Abstände, und nichts davon passte zur Seite. Hier kommt nur der
          Inhalt hinzu; Aufbau, Bild und Knopf sind die des geteilten
          Bausteins. */}
      {aktuell.length > 0 && karten(aktuell)}
      {archiv.length > 0 && <details className="gemeinde-foerder-archiv">
        <summary>Archiv: derzeit nicht verfügbare Förderprogramme ({archiv.length})</summary>
        {karten(archiv)}
      </details>}

      <Modal open={meldung !== null} onClose={() => setMeldung(null)} title="Änderung melden" maxWidth={560} className="gemeinde-meldung">
        {meldung && <>
          <p className="gemeinde-meldung-programm">{meldung.programm.name} · {ort}</p>
          <p>Was hat sich geändert? Ein Hinweis oder ein Link zur aktuellen Information hilft uns bei der Prüfung.</p>
          <ContactForm key={meldung.programm.id} initialTopic="Fehler melden" initialMessage={`Änderung zum Förderprogramm: ${meldung.programm.name}\nOrt: ${ort}\nFördergeber: ${meldung.programm.traeger}\nQuelle: ${meldung.programm.url}\n\nDas hat sich geändert:\n`} />
        </>}
      </Modal>

      <FundingDetailModal selected={offen} onClose={() => setOffen(null)} ort={ort} />
    </div>
  );
}
