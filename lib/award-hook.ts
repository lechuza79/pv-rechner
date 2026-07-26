// Anschreiben-Aufhänger: aus allen Platzierungen einer Gemeinde den EINEN
// wählen, der im Outreach-Brief am besten zieht — wahr, glaubwürdig,
// schmeichelhaft. Löst den „Städte-Catcher" von selbst: die Auswahl nimmt die
// stärkste glaubwürdige Platzierung über ALLE Kategorien, also gewinnt das Dorf
// mit „Dach pro Kopf", die Stadt mit „Solar-Standort".
//
// Reine Funktionen auf dem Award-Rechenkern — eine Rangquelle, keine zweite.

import {
  AWARD_CATEGORIES,
  AWARD_CATEGORY_BY_KEY,
  rankGemeinden,
  scopeIdOf,
  type AwardScopeLevel,
  type GemeindeStats,
  type Traeger,
} from "./awards";

export type HookLevel = "kreis" | "land" | "bund";
const SCOPE_OF: Record<HookLevel, AwardScopeLevel> = { kreis: "landkreis", land: "bundesland", bund: "de" };

export const LEVEL_LABEL: Record<HookLevel, string> = { kreis: "Landkreis", land: "Bundesland", bund: "bundesweit" };

/** Nur BÜRGER-Kategorien werden zum Anschreiben-Aufhänger (Gegenprüfung 2026-07-25):
 *  Standort-/Gewerbe-Kategorien (Solar-Standort, Freifläche, Gewerbespeicher,
 *  Wind/Biomasse/Wasser, Zubau inkl. Freifläche) messen fremde Investoren-Projekte,
 *  nicht die Leistung der Gemeinde — ein Dorf mit Investoren-Park wäre sonst
 *  „Zubau-Champion". Sie bleiben in der Award-Rangliste, taugen aber nicht als
 *  Betreff einer Mail ans Rathaus. */
const HOOK_TRAEGER: Traeger = "buerger";

/** Einwohner-Untergrenze für Pro-Kopf-Aufhänger (wie der öffentliche Atlas,
 *  `p_min_pop`): sonst führt ein 30-Einwohner-Koog jede Pro-Kopf-Liste an — der
 *  Wert ist dann ein Nenner-Artefakt, kein Ausbau. Nur Pro-Kopf-Kategorien. */
export const HOOK_MIN_POPULATION = 2000;

/** Bekannte Register-Fehler → nie ein Aufhänger, nur neutral. Aktuell nur
 *  Finsing (09177118): eine Gewerbe-Batterie ist dort als privat gemeldet und
 *  würde sonst „Speicher-Vorreiter/-Hauptstadt Nr. 1".
 *  Das Waldshut-Trio ist NICHT hier: die Dedup-Session hat gemessen, dass das ein
 *  Pumpspeicher-Fehler (kWh) ist — er fasst keine Solar-Award-Kategorie an. Die 10
 *  echten Solar-Doppelzählungen treffen nur „Solar-Standort" (kein Aufhänger,
 *  Bürger-only) und bekommen eine eigene Leitplanke in der Rangliste. */
export const HOOK_QUARANTINE = new Set(["09177118"]);

/** Spike-Wächter: liegt ein Pro-Kopf-Wert extrem über dem Gruppen-Median, ist das
 *  eher ein Datenfehler als ein echter Vorreiter → nicht krönen (fällt auf
 *  neutral). Konservativ, weil „neutral statt Superlativ" ein sicherer Fehlschlag
 *  ist; die absolute Absicherung ist der sichtbare Belegwert in der Ansicht. */
const SPIKE_FACTOR = 12;

/** Fertige Anschreiben-Zeile je Gemeinde — vorberechnet und gecacht, damit die
 *  Suche in der Ansicht nur noch filtert (nicht neu rechnet). */
export type HookExample = {
  regionId: string;
  name: string;
  bl: string;
  population: number;
  kind: HookKind;
  categoryKey: string | null;
  level: HookLevel | null;
  scopeId: string | null;
  betreff: string;
  einstieg: string;
  others: string[];
  /** Belegwert des gewählten Aufhängers, fertig formatiert (z. B. „2.480 Wp/Kopf",
   *  „53,4 MWh") — damit der Mensch einen Ausreißer sieht. Null bei neutral. */
  valueStr: string | null;
};

export type Placement = {
  categoryKey: string;
  level: HookLevel;
  scopeId: string;
  rank: number;
  total: number;
  value: number;
  /** Pro-Kopf-Wert weit über dem Gruppen-Median → Datenfehler-Verdacht. */
  spike: boolean;
};

export type HookKind = "sieger" | "podium" | "perzentil" | "neutral";

export type Hook = {
  kind: HookKind;
  categoryKey: string | null;
  categoryLabel: string | null;
  traeger: Traeger | null;
  level: HookLevel | null;
  scopeId: string | null;
  rank: number | null;
  total: number | null;
  percentile: number | null; // 0..1, nur bei kind === "perzentil"
  value: number | null; // roher Belegwert des Aufhängers
};

export type HookSettings = {
  /** Glaubwürdigkeit: Mindest-Teilnehmer, damit „Sieger"/„Podium" zählt. */
  minTotal: number;
  /** Perzentil-Grenze, z. B. 0,10 = „Top 10 %". */
  percentileCut: number;
  /** Bei Gleichstand die Bürger-Kategorie bevorzugen (Rathaus-Adressat). */
  preferBuerger: boolean;
  /** Höhere Ebene sticht (Bund > Land > Kreis). */
  preferHigherLevel: boolean;
};

export const DEFAULT_HOOK_SETTINGS: HookSettings = {
  minTotal: 5,
  percentileCut: 0.1,
  preferBuerger: true,
  preferHigherLevel: true,
};

/** Für jede Gemeinde ihre Platzierungen: je Kategorie × Ebene (Kreis/Land/Bund)
 *  Rang und Gruppengröße. Ebene = geografischer Bezug, KEINE Rollen-/Größen-
 *  Aufteilung — für einen Brief ist „Platz 1 von 34 im Landkreis" die klarste,
 *  nachprüfbare Aussage. Einmal rechnen, dann je Gemeinde nachschlagen. */
export function computePlacements(gemeinden: GemeindeStats[]): Map<string, Placement[]> {
  const out = new Map<string, Placement[]>();
  const push = (id: string, p: Placement) => {
    const arr = out.get(id);
    if (arr) arr.push(p);
    else out.set(id, [p]);
  };
  // Bekannte Fehl-Gemeinden ganz aus der Aufhänger-Bildung nehmen (nur neutral).
  const pool = gemeinden.filter((g) => !HOOK_QUARANTINE.has(g.regionId));
  const levels: HookLevel[] = ["kreis", "land", "bund"];
  for (const cat of AWARD_CATEGORIES) {
    if (cat.traeger !== HOOK_TRAEGER) continue; // nur Bürger-Leistung wird zum Aufhänger
    const floor = cat.messart === "proKopf" ? HOOK_MIN_POPULATION : 0;
    const isProKopf = cat.messart === "proKopf";
    for (const level of levels) {
      const groups = new Map<string, GemeindeStats[]>();
      for (const g of pool) {
        if (g.population < floor) continue; // Pro-Kopf: Nenner-Artefakt kleiner Gemeinden vermeiden
        const m = cat.metric(g);
        if (m == null || m <= 0) continue;
        const sid = scopeIdOf(g.regionId, SCOPE_OF[level]);
        const arr = groups.get(sid);
        if (arr) arr.push(g);
        else groups.set(sid, [g]);
      }
      for (const [sid, list] of Array.from(groups.entries())) {
        const ranked = rankGemeinden(list, cat);
        const total = ranked.length;
        // Median der Gruppe für den Spike-Wächter (nur Pro-Kopf sinnvoll — bei
        // absoluten Kategorien liegt der Sieger naturgemäß weit über dem Median).
        const median = total ? ranked[Math.floor(total / 2)].value : 0;
        for (const r of ranked) {
          const spike = isProKopf && median > 0 && r.value > SPIKE_FACTOR * median;
          push(r.regionId, { categoryKey: cat.key, level, scopeId: sid, rank: r.rank, total, value: r.value, spike });
        }
      }
    }
  }
  return out;
}

const NEUTRAL: Hook = {
  kind: "neutral",
  categoryKey: null,
  categoryLabel: null,
  traeger: null,
  level: null,
  scopeId: null,
  rank: null,
  total: null,
  percentile: null,
  value: null,
};

const levelRank = (l: HookLevel): number => (l === "bund" ? 3 : l === "land" ? 2 : 1);

/** Den besten Aufhänger aus den Platzierungen wählen. Ein echter Sieg schlägt ein
 *  Podium schlägt ein Perzentil; darüber sticht die Ebene (oder — abgeschaltet —
 *  die Lokalität) und die Träger-Präferenz. Nichts Glaubwürdiges → neutral. */
export function selectHook(placements: Placement[] | undefined, settings: HookSettings = DEFAULT_HOOK_SETTINGS): Hook {
  let best: Hook = NEUTRAL;
  let bestScore = -Infinity;

  for (const p of placements ?? []) {
    if (p.spike) continue; // Datenfehler-Verdacht → kein Aufhänger (fällt auf neutral)
    const cat = AWARD_CATEGORY_BY_KEY[p.categoryKey];
    if (!cat) continue;
    const ratio = p.rank / Math.max(p.total, 1);

    let kind: HookKind | null = null;
    if (p.total >= settings.minTotal && p.rank === 1) kind = "sieger";
    else if (p.total >= settings.minTotal && p.rank <= 3) kind = "podium";
    else if (p.total >= settings.minTotal && ratio <= settings.percentileCut) kind = "perzentil";
    if (!kind) continue;

    let score = kind === "sieger" ? 300 : kind === "podium" ? 200 : 100;
    const lvl = levelRank(p.level);
    score += (settings.preferHigherLevel ? lvl : 4 - lvl) * 10;
    if (settings.preferBuerger && cat.traeger === "buerger") score += 5;
    score += Math.min(p.total, 1000) / 200; // größere Grundgesamtheit = beeindruckender
    score += (1 - ratio) * 3; // Feinschliff nach Platz

    if (score > bestScore) {
      bestScore = score;
      best = {
        kind,
        categoryKey: cat.key,
        categoryLabel: cat.label,
        traeger: cat.traeger,
        level: p.level,
        scopeId: p.scopeId,
        rank: p.rank,
        total: p.total,
        percentile: kind === "perzentil" ? ratio : null,
        value: p.value,
      };
    }
  }
  return best;
}

// ─── Text ────────────────────────────────────────────────────────────────────

export type HookNames = { gemeinde: string; kreis: string; land: string };

function scopeIn(level: HookLevel, n: HookNames): string {
  if (level === "kreis") return `im ${n.kreis}`;
  if (level === "land") return `in ${n.land}`;
  return "bundesweit";
}

/** Betreff (Catcher) + Einstiegssatz aus dem gewählten Aufhänger. Reiner Text,
 *  keine Freitext-Interpolation von außen (Allowlist-Muster). */
export function hookText(hook: Hook, n: HookNames): { betreff: string; einstieg: string } {
  const wo = hook.level ? scopeIn(hook.level, n) : "";
  const titel = hook.categoryLabel ?? "";
  switch (hook.kind) {
    case "sieger":
      return {
        betreff: `${n.gemeinde} ist ${titel} ${wo}`,
        einstieg: `${n.gemeinde} ist ${wo} die Nummer 1 bei „${titel}“ — Platz 1 von ${hook.total} Gemeinden.`,
      };
    case "podium":
      return {
        betreff: `${n.gemeinde}: Platz ${hook.rank} ${wo} bei „${titel}“`,
        einstieg: `${n.gemeinde} gehört ${wo} zur Spitze: Platz ${hook.rank} von ${hook.total} bei „${titel}“.`,
      };
    case "perzentil": {
      const pct = Math.max(1, Math.round((hook.percentile ?? 0.1) * 100));
      return {
        betreff: `${n.gemeinde} gehört bei „${titel}“ zu den besten ${pct} %`,
        einstieg: `${n.gemeinde} liegt bei „${titel}“ ${wo} unter den besten ${pct} % (Platz ${hook.rank} von ${hook.total}).`,
      };
    }
    default:
      return {
        betreff: `So steht ${n.gemeinde} beim Solarausbau da`,
        einstieg: `Wir haben den Solarausbau in ${n.gemeinde} aus den amtlichen Anlagendaten aufbereitet — hier der Überblick für Ihre Gemeinde.`,
      };
  }
}
