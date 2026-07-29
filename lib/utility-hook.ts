// Aufhänger je Versorger: aus allen Platzierungen die EINE wählen, die in einer
// B2B-Ansprache trägt — wahr, nachprüfbar, nicht aufgeblasen.
//
// Der Unterschied zum Kommunen-Aufhänger ist die Grundgesamtheit: Gemeinden gibt
// es 11.000, Versorger erfassen wir manuell — anfangs ein paar Dutzend. „Platz 3"
// unter vier Erfassten ist keine Auszeichnung, sondern eine Peinlichkeit, sobald
// der Angesprochene nachfragt. Deshalb gilt eine Mindest-Teilnehmerzahl; darunter
// gibt es bewusst KEINE Rangaussage, sondern nur die nackte Kennzahl.
//
// Der Aufhänger wächst damit von selbst mit dem Datenbestand: je mehr Versorger
// erfasst sind, desto eher wird aus der Kennzahl eine Platzierung.

import { formatAwardValue, type SizeBand } from "./awards";
import { bundeslandByAgs } from "./mastr-regions";
import {
  UTILITY_CATEGORY_BY_KEY,
  utilityCategoryLabel,
  type UtilityArea,
  type UtilityPlacement,
  type UtilityScope,
} from "./utilities";
import { fmtMixLeistung } from "./atlas-format";

/** Ab so vielen Verglichenen darf eine Platzierung behauptet werden. Gleiche
 *  Schwelle wie beim Kommunen-Aufhänger (dort `minTotal`). */
export const UTILITY_MIN_TOTAL = 5;

/** Ab hier gilt eine Platzierung noch als Spitzenfeld (sonst kein Aufhänger). */
export const UTILITY_TOP_ANTEIL = 0.25;

export type UtilityHookKind = "rang" | "neutral";

export type UtilityHook = {
  kind: UtilityHookKind;
  categoryKey: string | null;
  scope: UtilityScope | null;
  scopeId: string | null;
  sizeBand: SizeBand | null;
  rank: number | null;
  total: number | null;
  value: number | null;
};

const NEUTRAL: UtilityHook = {
  kind: "neutral",
  categoryKey: null,
  scope: null,
  scopeId: null,
  sizeBand: null,
  rank: null,
  total: null,
  value: null,
};

/**
 * Die stärkste glaubwürdige Platzierung wählen.
 *
 * Reihenfolge: echter Sieg schlägt Podium schlägt Spitzenfeld. Innerhalb einer
 * Stufe gewinnt das größere Vergleichsfeld (beeindruckender und schwerer
 * anzuzweifeln), knapp danach die Vergleichbarkeits-Achse (Größenklasse).
 */
export function selectUtilityHook(placements: UtilityPlacement[] | undefined): UtilityHook {
  let best = NEUTRAL;
  let bestScore = -Infinity;

  for (const p of placements ?? []) {
    if (p.total < UTILITY_MIN_TOTAL) continue; // zu kleines Feld → keine Rangaussage
    if (!UTILITY_CATEGORY_BY_KEY[p.categoryKey]) continue;

    const anteil = p.rank / Math.max(p.total, 1);
    let score: number;
    if (p.rank === 1) score = 300;
    else if (p.rank <= 3) score = 200;
    else if (anteil <= UTILITY_TOP_ANTEIL) score = 100;
    else continue;

    score += Math.min(p.total, 50); // größeres Feld = tragfähigere Aussage
    if (p.sizeBand) score += 5; // „unter vergleichbaren" zieht etwas besser
    score += (1 - anteil) * 3;

    if (score > bestScore) {
      bestScore = score;
      best = {
        kind: "rang",
        categoryKey: p.categoryKey,
        scope: p.scope,
        scopeId: p.scopeId,
        sizeBand: p.sizeBand,
        rank: p.rank,
        total: p.total,
        value: p.value,
      };
    }
  }
  return best;
}

// ─── Text ─────────────────────────────────────────────────────────────────────

const SIZE_WORT: Record<SizeBand, string> = {
  klein: "kleineren",
  mittel: "mittelgroßen",
  gross: "größeren",
};

/** Wie die Vergleichsgruppe im Satz heißt. */
function gruppenText(hook: UtilityHook): string {
  const land = hook.scope === "land" && hook.scopeId ? bundeslandByAgs(hook.scopeId)?.name : null;
  const wo = land ? `in ${land}` : "bundesweit";
  // „vergleichbar" nur sagen, wenn tatsächlich in einer Größenklasse verglichen
  // wurde — sonst behauptet der Satz eine Einordnung, die die Zahl nicht hat.
  const wer = hook.sizeBand
    ? `unter ${SIZE_WORT[hook.sizeBand]} Versorgern`
    : "unter den erfassten Versorgern";
  return `${wer} ${wo}`;
}

export type UtilityHookText = {
  /** Der Aufhänger in einem Satz. */
  headline: string;
  /** Näherungs-Hinweis — gehört IMMER dazu, nie weglassen. */
  hinweis: string;
};

/**
 * Aufhänger als Text. Kein Anschreiben, nur die Zeile, die im Cockpit steht —
 * das Anschreiben schreibt ein Mensch, wenn der Kommunen-Test Zahlen liefert.
 */
export function utilityHookText(hook: UtilityHook, area: UtilityArea): UtilityHookText {
  const hinweis = naeherungsHinweis(area);

  if (hook.kind === "rang" && hook.categoryKey && hook.value != null) {
    const cat = UTILITY_CATEGORY_BY_KEY[hook.categoryKey];
    const wert = formatAwardValue(hook.value, cat.format);
    const was = utilityCategoryLabel(hook.categoryKey);
    // Bezugsgrößen wie „je 1.000 Ew." tragen ihren Bezug in der Einheit. Voran-
    // gestellt ergäbe das „14,3 je 1.000 Ew. Balkonkraftwerke" — richtig
    // gerechnet, aber unlesbar. Dort steht die Größe zuerst.
    const bezugsgroesse = cat.format === "countPer1000" || cat.format === "whProKopf";
    const kennzahl = bezugsgroesse ? `${was}: ${wert}` : `${wert} ${was}`;
    return {
      headline: `${kennzahl} — Platz ${hook.rank} von ${hook.total} ${gruppenText(hook)}`,
      hinweis,
    };
  }

  // Kein tragfähiger Rang: die Kennzahl allein, ohne Vergleichsbehauptung.
  const gemeinden = `${area.gemeindeCount} ${area.gemeindeCount === 1 ? "Gemeinde" : "Gemeinden"}`;
  return {
    headline: `${fmtMixLeistung(area.erzeugungKw)} Erzeugungsleistung im Gebiet (${gemeinden})`,
    hinweis: `${hinweis} Für einen Rangvergleich sind bisher zu wenige Versorger erfasst.`,
  };
}

/**
 * Der Näherungs-Hinweis, der an JEDER Aggregat-Anzeige hängt.
 *
 * Grund (Vorgabe des Betreibers): Versorgungsgebiete sind nicht öffentlich
 * dokumentiert und überschneiden sich. Eine Zahl, die als exakt verkauft wird und
 * der erste Versorger widerspricht ihr, kostet mehr Glaubwürdigkeit, als sie
 * jemals einbringt.
 */
export function naeherungsHinweis(area: UtilityArea): string {
  const teile: string[] = [];
  const g = area.gemeindeCount;
  teile.push(`Näherung: ${g} ${g === 1 ? "Gemeinde" : "Gemeinden"} zugeordnet`);
  if (area.quellen.vermutet > 0) teile.push(`davon ${area.quellen.vermutet} nur vermutet`);
  if (area.ueberlappend > 0) {
    teile.push(
      `${area.ueberlappend} auch einem anderen Versorger zugeordnet`,
    );
  }
  if (area.ohneDaten > 0) teile.push(`${area.ohneDaten} ohne Anlagendaten`);
  if (area.mehrereBundeslaender) teile.push("Gebiet reicht über Landesgrenzen");
  return `${teile.join(", ")}.`;
}
