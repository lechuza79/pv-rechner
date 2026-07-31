// Anschreiben-Aufhänger: aus allen Platzierungen einer Gemeinde den EINEN
// wählen, der im Outreach-Brief am besten zieht — wahr, glaubwürdig,
// schmeichelhaft. Löst den „Städte-Catcher" von selbst: die Auswahl nimmt die
// stärkste glaubwürdige Platzierung über ALLE Kategorien, also gewinnt das Dorf
// mit „Dach pro Kopf", die Stadt mit „Solar-Standort".
//
// Reine Funktionen auf dem Award-Rechenkern — eine Rangquelle, keine zweite.

import { GROESSENKLASSE_BY_SLUG, klasseVon } from "./gemeindegroesse";
import {
  AWARD_CATEGORIES,
  AWARD_CATEGORY_BY_KEY,
  rankGemeinden,
  scopeIdOf,
  type AwardScopeLevel,
  type GemeindeStats,
  type Traeger,
} from "./awards";
import { ortPhrase } from "./atlas-orte";

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
/**
 * NICHT MEHR IN GEBRAUCH — bleibt nur, weil aeltere Aufrufer und Tests sie
 * kennen. Der Aufhaenger rankt seit dem 31.07.2026 INNERHALB der Groessenklasse
 * statt oberhalb einer Einwohner-Untergrenze.
 *
 * WARUM: Der Orden auf der Gemeindeseite rechnete mit dieser Grenze und ohne
 * Klassen, die verlinkte Rangliste ohne Grenze und mit. Der Brief sagte
 * "Platz 3", die Seite dahinter etwas anderes — zwei Zahlen fuer dieselbe Sache
 * auf zwei Oberflaechen, die aufeinander zeigen.
 */
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
  /** Platz und Gruppengröße des gewählten Aufhängers („Platz 1 von 34"). Wird
   *  für die Auswahl der Versandliste gebraucht: „von 34" wiegt schwerer als
   *  „von 5", und ohne diese Größe sortiert die Liste faktisch nach Einwohnern. */
  rank: number | null;
  total: number | null;
  /** Messgröße im Klartext („die meiste private Speicherkapazität") und der
   *  Bezug („im Landkreis Würzburg"). Fertig gebaut, damit Anschreiben und
   *  Meldung nicht dieselbe Formulierung ein zweites Mal zusammensetzen. */
  bestleistung: string | null;
  /** Dieselbe Messgröße im DATIV — sie steht ausnahmslos hinter „bei". */
  themaDativ: string | null;
  wo: string | null;
  /** Vergleichsgruppe im Dativ („Kleinen Gemeinden im Landkreis Würzburg").
   *  Ohne sie behauptet die Meldung einen kreisweiten Bestwert. */
  gruppe: string | null;
  /** Belegwert des gewählten Aufhängers, fertig formatiert (z. B. „2.480 Wp/Kopf",
   *  „53,4 MWh") — damit der Mensch einen Ausreißer sieht. Null bei neutral. */
  valueStr: string | null;
};

export type Placement = {
  categoryKey: string;
  level: HookLevel;
  scopeId: string;
  /** Groessenklasse, INNERHALB derer der Rang gilt. Ohne sie stuenden Brief und
   *  verlinkte Rangliste auf zwei verschiedenen Rechnungen. */
  klasseSlug: string;
  klasseLabel: string;
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
  /** Groessenklasse des Vergleichs ("Kleine Gemeinden"). Gehoert in JEDEN Satz,
   *  der einen Rang nennt — sonst behauptet der Brief einen anderen Vergleich
   *  als die Rangliste, auf die er verlinkt. */
  klasseLabel: string | null;
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
    // KEINE ABSOLUTEN KATEGORIEN (31.07.2026). "Die meisten Balkonkraftwerke im
    // Landkreis" kürt gemessen die einwohnerstärkste Kommune: In BW, BY und NRW
    // ist der Sieger jeweils exakt die größte Gemeinde, und 6 bis 10 der ersten
    // Zehn sind schlicht die zehn einwohnerstärksten Orte. Ein Brief mit diesem
    // Aufhänger lobt Größe, nicht Leistung — und aus den öffentlichen
    // Ranglisten haben wir sie aus demselben Grund längst herausgenommen.
    // Verhältniszahlen (pro Kopf, je Dach) bleiben.
    if (cat.messart === "absolut") continue;
    for (const level of levels) {
      // Gruppiert wird nach Gebiet UND Groessenklasse — exakt wie in der
      // Rangliste, auf die der Orden und der Brief verlinken.
      const groups = new Map<string, GemeindeStats[]>();
      for (const g of pool) {
        // Dieselbe Groessenpruefung wie in der Liste: Wo "private" Anlagen
        // Wohnhausgroesse sprengen, zaehlt der Ort dort nicht mit.
        if (cat.plausibel && !cat.plausibel(g)) continue;
        const klasse = klasseVon(g.population);
        if (!klasse) continue;
        const m = cat.metric(g);
        if (m == null || m <= 0) continue;
        const sid = scopeIdOf(g.regionId, SCOPE_OF[level]);
        const key = `${sid}|${klasse.slug}`;
        const arr = groups.get(key);
        if (arr) arr.push(g);
        else groups.set(key, [g]);
      }
      for (const [key, list] of Array.from(groups.entries())) {
        const [sid, klasseSlug] = key.split("|");
        const klasse = GROESSENKLASSE_BY_SLUG[klasseSlug];
        const ranked = rankGemeinden(list, cat);
        const total = ranked.length;
        // Median der Gruppe für den Spike-Wächter (nur Pro-Kopf sinnvoll — bei
        // absoluten Kategorien liegt der Sieger naturgemäß weit über dem Median).
        const median = total ? ranked[Math.floor(total / 2)].value : 0;
        for (const r of ranked) {
          // Der Spike-Waechter greift jetzt fuer ALLE verbliebenen Kategorien —
          // es sind ausnahmslos Verhaeltniszahlen, und genau dort ist ein Wert
          // weit ueber dem Gruppen-Median eher ein Datenfehler als ein Vorreiter.
          const spike = median > 0 && r.value > SPIKE_FACTOR * median;
          push(r.regionId, {
            categoryKey: cat.key,
            level,
            scopeId: sid,
            klasseSlug,
            klasseLabel: klasse?.labelDativ ?? klasseSlug,
            rank: r.rank,
            total,
            value: r.value,
            spike,
          });
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
  klasseLabel: null,
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
        klasseLabel: p.klasseLabel,
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

/**
 * Kurzform des Gebiets fuer den BETREFF: "im Landkreis" statt "im Landkreis
 * Musterkreis". Der Empfaenger sitzt in diesem Kreis — der Name kostet dort nur
 * Zeichen, die im Postfach abgeschnitten werden. Das Bundesland bleibt benannt,
 * weil "im Bundesland" nichts sagt.
 */
export function scopeKurz(level: HookLevel, n: HookNames): string {
  if (level === "kreis") return "im Landkreis";
  if (level === "land") return ortPhrase({ name: n.land, level: "bundesland" });
  return "bundesweit";
}

export function scopeIn(level: HookLevel, n: HookNames): string {
  // Präposition aus lib/atlas-orte, nicht hier getippt: "im Region Hannover"
  // stand sonst im Anschreiben.
  if (level === "kreis") return ortPhrase({ name: n.kreis });
  if (level === "land") return ortPhrase({ name: n.land, level: "bundesland" });
  return "bundesweit";
}

/** Betreff (Catcher) + Einstiegssatz aus dem gewählten Aufhänger. Reiner Text,
 *  keine Freitext-Interpolation von außen (Allowlist-Muster). */
export function hookText(hook: Hook, n: HookNames): { betreff: string; einstieg: string } {
  const wo = hook.level ? scopeIn(hook.level, n) : "";
  const woKurz = hook.level ? scopeKurz(hook.level, n) : "";
  // KEIN interner Titel nach außen (siehe `bestleistung` in lib/awards.ts):
  // „Erlenbach a.Main ist Speicher-Hauptstadt" sagt nicht, was gemessen wurde,
  // klingt bei 9.717 Einwohnern erfunden, und die Auszeichnung gibt es
  // öffentlich nirgends. Stattdessen die Messgröße im Klartext — jeder Satzteil
  // belegbar und ohne Erklärung verständlich.
  const cat = hook.categoryKey ? AWARD_CATEGORY_BY_KEY[hook.categoryKey] : null;
  const bestleistung = cat?.bestleistung ?? "den größten Solar-Ausbau";
  const themaDativ = cat?.themaDativ ?? "Solar-Ausbau";
  // Praepositionalphrase am Stueck — nie aus "bei" + Substantiv zusammengesetzt.
  const phrase = cat?.betreffPhrase ?? `bei ${themaDativ}`;
  // "unter den Kleinen Gemeinden im Landkreis Miltenberg" — der Vergleich
  // gehoert in den Satz. Ohne ihn steht im Brief "Platz 3 von 34" und auf der
  // verlinkten Rangliste eine andere Zahl, weil die innerhalb der Groessenklasse
  // rechnet. Zwei Zahlen fuer dieselbe Sache sind der schwerste Fehler, den
  // dieses Projekt machen kann.
  const gruppe = hook.klasseLabel ? `unter den ${hook.klasseLabel} ${wo}` : wo;
  switch (hook.kind) {
    case "sieger":
      return {
        // Rang zuerst: Die Meldungs-Überschrift trägt bereits die Messgröße als
        // Superlativ. Stünde beides gleich, läse sich der Brief wie ein
        // Textbaustein-Unfall — Betreff und Überschrift sagen dasselbe, nur
        // anders herum.
        // KURZ. Die Einzelheiten — Groessenklasse, Gruppengroesse, Wert —
        // stehen im Einstieg, wo Platz dafuer ist.
        betreff: `${n.gemeinde} ${phrase} auf Platz 1 ${woKurz}`,
        einstieg: `${n.gemeinde} hat ${bestleistung} ${gruppe} — Platz 1 von ${hook.total}.`,
      };
    case "podium":
      return {
        betreff: `${n.gemeinde} ${phrase} auf Platz ${hook.rank} ${woKurz}`,
        // NACH "bei" DER DATIV, nicht `thema`: Der Einstieg sagte "liegt bei
        // private Solarleistung" und "bei Balkonkraftwerke je 1.000 Einwohner" —
        // genau der Fehler, vor dem `themaDativ` in lib/awards.ts warnt. Der
        // bestehende Test prueft nur den Betreff, deshalb lief es lange mit.
        einstieg: `${n.gemeinde} liegt bei ${themaDativ} ${gruppe} auf Platz ${hook.rank} von ${hook.total}.`,
      };
    case "perzentil": {
      // Gedeckelt: "unter den besten 118 %" ist keine Auszeichnung, sondern ein
      // Rechenfehler auf dem Papier. Kann bei sauberen Daten nicht auftreten —
      // die Klammer kostet nichts und faengt es trotzdem ab.
      const pct = Math.min(99, Math.max(1, Math.round((hook.percentile ?? 0.1) * 100)));
      return {
        betreff: `${n.gemeinde} ${phrase} unter den besten ${pct} % ${woKurz}`,
        // "gehoert … zu den besten", nicht "liegt … unter den besten": Die
        // Vergleichsgruppe beginnt schon mit "unter den Kleinen Gemeinden" —
        // zweimal dieselbe Wendung im selben Satz stolpert beim Lesen.
        einstieg: `${n.gemeinde} gehört bei ${themaDativ} ${gruppe} zu den besten ${pct} % — Platz ${hook.rank} von ${hook.total}.`,
      };
    }
    default:
      return {
        betreff: `So steht ${n.gemeinde} beim Solarausbau da`,
        einstieg: `Wir haben den Solarausbau in ${n.gemeinde} aus den amtlichen Anlagendaten aufbereitet — hier der Überblick für Ihre Gemeinde.`,
      };
  }
}
