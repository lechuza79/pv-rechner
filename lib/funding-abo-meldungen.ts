import type { HistorieEintrag, HistorieFeld } from "./funding-history";
import { deckt, technikenVon, type FundingProgram } from "./funding-programs";
import type { Meldung } from "./gemeinde-meldungen";
import { tagMonatJahr } from "./stand-format";

const LABELS: Partial<Record<HistorieFeld, string>> = {
  status: "Antragsstatus", rates: "Fördersätze", conditions: "Bedingungen",
  coveredCosts: "förderfähige Kosten", maxFoerderung: "Höchstbetrag",
  eligibility: "Antragsberechtigung", capped: "verfügbare Mittel",
};

/** Recorded catalogue changes, never an inferred programme start date. */
export function fundingAboMeldungen(
  scope: string, programmes: FundingProgram[], history: Map<string, HistorieEintrag[]>, now: Date,
): Meldung[] {
  const programId = scope.startsWith("funding:program:") ? scope.slice("funding:program:".length) : null;
  const regionId = scope.startsWith("funding:region:") ? scope.slice("funding:region:".length) : null;
  if (!programId && !regionId) return [];
  return programmes.flatMap((p): Meldung[] => {
    if (programId ? p.id !== programId : p.level !== "bund" && !deckt(p, regionId!)) return [];
    const entries = (history.get(p.id) ?? []).filter(e =>
      e.programId === p.id && e.bedeutung === "inhalt" &&
      Number.isFinite(Date.parse(e.festgestelltAm)) && Date.parse(e.festgestelltAm) <= now.getTime() &&
      (e.feld === "aufnahme" || (LABELS[e.feld] && e.alt !== e.neu)),
    );
    // One digest per observation avoids a separate mail paragraph for each field.
    const groups = new Map<number, HistorieEintrag[]>();
    for (const e of entries) {
      const time = Date.parse(e.festgestelltAm);
      groups.set(time, [...(groups.get(time) ?? []), e]);
    }
    return [...groups].map(([time, changes]) => {
      const added = changes.some(e => e.feld === "aufnahme");
      const fields = [...new Set(changes.map(e => LABELS[e.feld]).filter(Boolean))].join(", ");
      const date = tagMonatJahr(new Date(time).toISOString().slice(0, 10));
      const mixed = technikenVon(p).length > 1
        ? " Das Programm umfasst mehrere Techniken; eine Änderung kann auch einen anderen Teil des Programms betreffen." : "";
      return {
        schluessel: `funding-update-${p.id}-${time}`, art: "bewegung", gewicht: 100,
        titel: added ? `Neu im Förderkatalog: ${p.name}` : `Förderupdate: ${p.name}`,
        text: added
          ? `Am ${date} haben wir dieses Programm für deine Auswahl erstmals erfasst. Das ist nicht zwingend der Programmstart. Den aktuellen Antragsstatus und die Voraussetzungen findest du beim Fördergeber.`
          : `Am ${date} haben wir in unserem Förderkatalog Änderungen erfasst: ${fields}. Prüfe vor einem Antrag den aktuellen Stand beim Fördergeber.${mixed}`,
        festgestelltAm: new Date(time).toISOString(), techniken: technikenVon(p),
        quelleUrl: p.url,
      };
    });
  }).sort((a, b) => Date.parse(b.festgestelltAm!) - Date.parse(a.festgestelltAm!));
}
