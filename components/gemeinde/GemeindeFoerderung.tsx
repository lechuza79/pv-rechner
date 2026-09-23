"use client";

import { useEffect, useRef, useState } from "react";
import { FundingStatusBadge, FundingRates, FundingConditions, istDachSicht } from "../FundingProgramParts";
import { saetzeFuer, technikenVon, type FundingProgram, type FundingTechnik } from "../../lib/funding-programs";

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
 * darunter, mit dem Weg zur vollständigen Übersicht.
 */
const TECHNIK_WORT: Record<FundingTechnik, string> = {
  pv: "Photovoltaik",
  balkon: "Balkonkraftwerk",
  waermepumpe: "Wärmepumpe",
};

const EBENE_WORT: Record<string, string> = {
  kommune: "Programm der Gemeinde",
  landkreis: "Programm des Landkreises",
  land: "Landesprogramm",
  bund: "Bundesprogramm",
};

const pfeil = (
  <svg className="sc-live-icon" aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M3.333 8h9.334m0 0L8 3.333M12.667 8 8 12.667" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export type FoerderProgrammAnsicht = {
  programm: FundingProgram;
  /** „Zuletzt geprüft am …" oder der redaktionelle Stand — serverseitig
   *  gebildet, damit die Regel dafür an einer Stelle bleibt. */
  standLabel: string;
  /** Zählt das Programm heute noch Geld? Entscheidet allein `fundingZaehlt()`
   *  auf dem Server; hier nur der Wortlaut. */
  zaehlt: boolean;
};

export default function GemeindeFoerderung({
  ort,
  programme,
  uebersichtHref,
}: {
  ort: string;
  programme: FoerderProgrammAnsicht[];
  /** Die bundesweite Übersicht — der Weg für alles, was hier nicht steht. */
  uebersichtHref: string;
}) {
  const [offen, setOffen] = useState<FoerderProgrammAnsicht | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (offen) dialog.current?.showModal();
  }, [offen]);

  const aktive = programme.filter((p) => p.zaehlt);
  return (
    <div className="v3-examples-foerderung" id="atlas-foerderung">
      <h3>Förderung in {ort}</h3>
      <p>
        {aktive.length > 0
          ? `Diese Zuschüsse gelten hier zusätzlich zur bundesweiten Förderung.`
          : `Für ${ort} ist uns derzeit kein eigener Zuschuss bekannt. Es gilt die bundesweite Förderung.`}
      </p>
      {programme.length > 0 && (
        <ul className="gemeinde-foerder-liste">
          {programme.map((p) => {
            const satz = saetzeFuer(p.programm.rates)[0];
            return (
              <li key={p.programm.id}>
                <button type="button" className="gemeinde-foerder-box" onClick={() => setOffen(p)}>
                  <span className="gemeinde-foerder-technik">
                    {technikenVon(p.programm).map((t) => (
                      <span key={t}>{TECHNIK_WORT[t]}</span>
                    ))}
                  </span>
                  <strong>{p.programm.name}</strong>
                  <span className="gemeinde-foerder-satz">
                    {satz ? `${satz.value}${satz.label ? ` · ${satz.label}` : ""}` : p.programm.coveredCosts}
                  </span>
                  <span className="gemeinde-foerder-fuss">
                    <span>{EBENE_WORT[p.programm.level] ?? p.programm.traeger}</span>
                    <span className="gemeinde-foerder-mehr">Einzelheiten {pfeil}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <a className="atlas-link" href={uebersichtHref}>
        Was bundesweit gilt {pfeil}
      </a>

      {/* aria-modal, damit die Farbtoken der Site in diesem Fenster gelten —
          die Sätze und Bedingungen kommen aus den geteilten Bausteinen. */}
      <dialog
        ref={dialog}
        className="atlas-dialog gemeinde-foerder-dialog"
        aria-modal="true"
        aria-labelledby="gemeinde-foerder-titel"
        onClose={() => setOffen(null)}
        onClick={(e) => {
          if (e.target === dialog.current) dialog.current?.close();
        }}
      >
        {offen && (
          <>
            <button className="atlas-close" aria-label="Schließen" onClick={() => dialog.current?.close()}>
              ×
            </button>
            <h2 id="gemeinde-foerder-titel">{offen.programm.name}</h2>
            <div className="atlas-dialog-body">
              <p className="gemeinde-foerder-traeger">
                <FundingStatusBadge status={offen.programm.status} /> <span>{offen.programm.traeger}</span>
              </p>
              <p>
                Förderfähig: {offen.programm.coveredCosts}
                {istDachSicht(technikenVon(offen.programm)[0]) && offen.programm.maxFoerderung ? ` · ${offen.programm.maxFoerderung}` : ""}
              </p>
              {/* Je Technik ein Abschnitt — nie alles in einer Liste: Bei Nidda
                  stünde sonst „höchstens zwei Module je Haushalt" (Balkon)
                  neben dem Satz je kWp (Dach), und beides schlösse einander
                  aus. Dieselbe Regel wie auf der Stadtseite und im Rechner. */}
              {technikenVon(offen.programm).map((technik) => (
                <section key={technik} className="gemeinde-foerder-technikblock">
                  {technikenVon(offen.programm).length > 1 && <h3>{TECHNIK_WORT[technik]}</h3>}
                  <FundingRates rates={offen.programm.rates} bordered label="Konditionen" technik={technik} />
                  <FundingConditions conditions={offen.programm.conditions} eligibility={offen.programm.eligibility} technik={technik} />
                </section>
              ))}
              <p className="gemeinde-foerder-quelle">
                <a href={offen.programm.url} target="_blank" rel="noopener noreferrer">
                  Zur offiziellen Quelle {pfeil}
                </a>
                <span>{offen.standLabel}</span>
              </p>
            </div>
          </>
        )}
      </dialog>
    </div>
  );
}
