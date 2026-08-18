"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { programmeFuerTechnik, type FundingProgram, type FundingTechnik } from "./funding-programs";

/**
 * Kommunale Förderung für einen Rechner auflösen: PLZ rein, zutreffende
 * Programme raus.
 *
 * WARUM ALS HOOK (18.08.2026): Diese Mechanik stand im PV-Rechner — Abruf,
 * Mehrdeutigkeit einer PLZ, Vorbelegung über einen Programm-Link, Ladezustand.
 * Als Balkon- und Wärmepumpen-Rechner dieselbe Förderung bekommen sollten,
 * standen drei Möglichkeiten offen: dreimal dasselbe schreiben, zweimal
 * dasselbe schreiben, oder es einmal an einen Ort legen. Die ersten beiden sind
 * dieselbe Entscheidung mit unterschiedlicher Verzögerung — die Fassungen
 * driften, und gemerkt wird es an der, die jemand vergessen hat.
 *
 * WAS HIER NICHT HINEINGEHÖRT: `fundingEnabled` (ob der Nutzer die Förderung
 * einrechnen lässt) bleibt beim Rechner. Das ist eine Anzeige-Entscheidung, die
 * je Rechner anders voreingestellt sein darf.
 */

export type FoerderKandidat = { ort: string; ags: string; programs: FundingProgram[] };

export type Foerderung = {
  /** Programme für DIESE Technik — der Rechner filtert nie selbst. */
  programme: FundingProgram[];
  /** Orte hinter einer mehrdeutigen PLZ; null = noch nicht aufgelöst. */
  kandidaten: FoerderKandidat[] | null;
  /** Der gewählte Ort (achtstelliger Gemeindeschlüssel). */
  ags: string | null;
  laedt: boolean;
  /** PLZ auflösen — nach jeder PLZ-Eingabe aufrufen. */
  ausPlz: (plz: string) => Promise<void>;
  /** Bei mehrdeutiger PLZ: Ort wählen. */
  waehleOrt: (ags: string) => void;
};

export function useFoerderung(technik: FundingTechnik, seedProgrammId?: string | null): Foerderung {
  const [kandidaten, setKandidaten] = useState<FoerderKandidat[] | null>(null);
  const [ags, setAgs] = useState<string | null>(null);
  const [alle, setAlle] = useState<FundingProgram[]>([]);
  const [laedt, setLaedt] = useState(false);

  // Ein Programm, das die gefragte Technik nicht fördert, gehört hier nicht hin
  // — auch dann nicht, wenn es für den Ort gilt. München fördert seit Dezember
  // 2024 ausschließlich Steckersolar; im PV-Rechner zu zeigen hieße, jemandem
  // mit Dachplänen eine Förderung vor die Nase zu halten, die er nicht bekommt.
  const programme = useMemo(() => programmeFuerTechnik(alle, technik), [alle, technik]);

  const ausPlz = useCallback(async (plz: string) => {
    if (!/^\d{5}$/.test(plz)) return;
    setLaedt(true);
    try {
      const res = await fetch(`/api/funding?plz=${plz}`);
      const data = await res.json();
      const gefunden: FoerderKandidat[] = Array.isArray(data.candidates) ? data.candidates : [];
      setKandidaten(gefunden);
      if (gefunden.length === 1) {
        setAgs(gefunden[0].ags);
        setAlle(gefunden[0].programs);
      } else {
        // Mehrdeutig → erst fragen. Solange keine Programme, denn eine PLZ kann
        // zwei Gemeinden mit völlig verschiedener Förderung abdecken.
        setAgs(null);
        setAlle([]);
      }
    } catch {
      setKandidaten([]);
      setAgs(null);
      setAlle([]);
    }
    setLaedt(false);
  }, []);

  const waehleOrt = useCallback((gewaehlt: string) => {
    setAgs(gewaehlt);
    setAlle(kandidaten?.find((k) => k.ags === gewaehlt)?.programs ?? []);
  }, [kandidaten]);

  // Vorbelegung über einen Programm-Link (von einer Stadt- oder Förderseite).
  useEffect(() => {
    if (!seedProgrammId) return;
    let abgebrochen = false;
    (async () => {
      setLaedt(true);
      try {
        const res = await fetch(`/api/funding?foe=${seedProgrammId}`);
        const data = await res.json();
        if (!abgebrochen && Array.isArray(data.programs) && data.programs.length) {
          setAlle(data.programs);
          setAgs(typeof data.ags === "string" ? data.ags : null);
        }
      } catch { /* ohne Vorbelegung weiter — die PLZ-Eingabe löst es ohnehin auf */ }
      if (!abgebrochen) setLaedt(false);
    })();
    return () => { abgebrochen = true; };
  }, [seedProgrammId]);

  return { programme, kandidaten, ags, laedt, ausPlz, waehleOrt };
}
