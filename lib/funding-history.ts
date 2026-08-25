// ─── Verlauf eines Förderprogramms: was sich wann geändert hat ────────────────
//
// WARUM ES DIESE DATEI GIBT (18.08.2026): Der Förder-Wächter sieht ohnehin jeden
// Zustandswechsel — er überschrieb ihn bisher nur. Wenn Frankfurt seinen Topf
// leerlaufen lässt, stand am Tag davor „aktiv" in der Datenbank und am Tag danach
// „ausgeschöpft"; dass es einen Tag davor gab, wusste hinterher niemand mehr.
//
// Wer stattdessen jeden Wechsel wegschreibt, hat nach zwölf Monaten etwas, das
// kein Wettbewerber hat: belegte Verläufe statt Momentaufnahmen. Enpal und
// Check24 scrapen den Ist-Stand — „seit Juli ausgeschöpft, davor 150 €/kWh" kann
// nur jemand sagen, der mitgeschrieben hat.
//
// DIE PRÜFDATUM-REGEL GILT HIER GENAUSO (CLAUDE.md, „Zuletzt geprüft"): Ein
// Eintrag darf nur behaupten, was belegt ist. Deshalb
//   1. heißt das Datum `festgestelltAm` und NICHT „geändert am" — wir wissen,
//      wann die Änderung bei UNS ankam, nicht, wann die Stadt sie beschlossen
//      hat. Zwischen Ratsbeschluss und unserer Feststellung können Wochen liegen;
//      das eine als das andere auszugeben wäre dieselbe Fehlerklasse, die 2026
//      schon 25 Programmen ein erfundenes Prüfdatum gab.
//   2. wird dieses Datum HEREINGEREICHT, nie hier drin aus `new Date()` oder aus
//      `updated_at` gezogen. Ein mitlaufendes Datum behauptet eine Beobachtung,
//      die niemand gemacht hat. `vergleiche()` ist deshalb eine reine Funktion
//      ohne Uhr — sie sagt nur, WAS sich unterscheidet.
//
// AUFHEBEN STATT AUFRÄUMEN: Das Rechts-Audit vom 17.08.2026 hat bestätigt, dass
// von unseren Beständen nur die Förderdatenbank überhaupt ein
// Datenbankherstellerrecht trägt — und die Protokolle sind das einzige
// Beweismittel für die dafür nötige „wesentliche Investition". Einträge zu
// längst eingestellten Programmen werden deshalb NICHT gelöscht.

import type { FundingProgram } from "./funding-programs";
import { FUNDING_STATUS_LABEL } from "./funding-programs";
import { supabase } from "./supabase-server";
import { DB_SOFT_READ_TIMEOUT_MS, withDbTimeout } from "./db-timeout";

/**
 * Welche Sache sich geändert hat.
 *
 * `aufnahme` ist kein Wechsel, sondern der Aufzeichnungsbeginn: der Tag, an dem
 * wir das Programm zum ersten Mal gesehen haben. Ohne ihn liest sich ein leerer
 * Verlauf wie „hat sich nie etwas geändert" — dabei heißt er meist „wir schauen
 * erst seit vier Wochen hin".
 */
export type HistorieFeld =
  | "aufnahme"
  | "status"
  | "rates"
  | "conditions"
  | "coveredCosts"
  | "maxFoerderung"
  | "eligibility"
  | "capped"
  | "rechenwerte";

/**
 * Ob der Eintrag jemanden vor Ort betrifft oder nur unsere Buchhaltung.
 *
 * `intern` sind die strukturierten Rechenwerte (`pvPerKwp` & Co.). Sie sind die
 * maschinelle Spiegelung dessen, was in `rates` als Satz steht, und sie tragen
 * KEINE eigene lesbare Einheit — wer sie anzeigt, muss sich eine ausdenken
 * („€/kWp"), und damit gäbe es eine zweite Quelle für eine Einheit neben dem
 * redaktionellen Satz. Genau das verbietet die Einheiten-Regel. Aufgehoben
 * werden sie trotzdem: Sie belegen unsere Arbeit an den Daten.
 */
export type Bedeutung = "inhalt" | "intern";

export type Aenderung = {
  programId: string;
  feld: HistorieFeld;
  bedeutung: Bedeutung;
  /** Vorheriger Wert als lesbarer Text; null = gab es vorher nicht. */
  alt: string | null;
  /** Neuer Wert als lesbarer Text; null = gibt es nicht mehr. */
  neu: string | null;
};

export type HistorieEintrag = Aenderung & {
  /** Wann WIR die Änderung festgestellt haben (ISO). Nie das Datum der Stadt. */
  festgestelltAm: string;
  /** Amtsseite, auf die sich der Eintrag stützt. */
  quelle: string | null;
  /**
   * Tag, an dem das Programm zuletzt an der Amtsquelle bestätigt war, wie er zum
   * Zeitpunkt der Feststellung in der Datenbank stand. Wird nicht angezeigt (er
   * kann älter sein als die Änderung selbst, wenn die Bestätigung erst danach
   * nachgetragen wird) — er gehört zum Beweismittel, nicht auf die Seite.
   */
  belegtAm: string | null;
};

/**
 * Trennzeichen zwischen den Punkten einer Liste (Bedingungen, Konditionen).
 *
 * Steht hier, weil die Anzeige es zum Zerlegen wieder braucht: Sie zeigt bei
 * einer sechszeiligen Bedingungsliste nicht zweimal die ganze Liste, sondern
 * nur den hinzugekommenen Punkt. Zwei getippte Trennzeichen, die auseinander
 * laufen, hießen: Der Verlauf zeigt plötzlich die ganze Liste als „neu".
 */
export const LISTEN_TRENNER = " · ";

/** Aus einer Liste von Sätzen wird eine Zeile — der Wortlaut bleibt unangetastet. */
function ausListe(werte: string[] | undefined): string | null {
  if (!werte || werte.length === 0) return null;
  return werte.join(LISTEN_TRENNER);
}

function ausRaten(raten: FundingProgram["rates"] | undefined): string | null {
  if (!raten || raten.length === 0) return null;
  return raten.map((r) => `${r.label}: ${r.value}`).join(LISTEN_TRENNER);
}

/**
 * Die strukturierten Rechenwerte als ein Feld.
 *
 * Bewusst als JSON und bewusst `intern`: Diese Zahlen tragen ihre Einheit nicht
 * mit sich, sie werden nie einem Leser gezeigt, und einzeln aufgeführt wären es
 * neun Einträge für eine einzige inhaltliche Änderung.
 */
const RECHENFELDER = [
  "pvPerKwp", "pvSockel", "speicherPerKwh", "percentOfCost",
  "pvCap", "speicherCap", "pvTiers", "speicherTiers", "speicherMin",
] as const;

function ausRechenwerten(p: FundingProgram): string | null {
  const teil: Record<string, unknown> = {};
  for (const f of RECHENFELDER) if (p[f] !== undefined) teil[f] = p[f];
  return Object.keys(teil).length ? JSON.stringify(teil) : null;
}

/**
 * Was NICHT protokolliert wird — und warum. Ohne diese Liste ist „fehlt" nicht
 * von „gehört da nicht hin" zu unterscheiden.
 *
 * - `stand`   — redaktionelles Als-of-Datum. Es bewegt sich bei jeder Berührung
 *               und sagt über das Programm nichts aus; als Verlaufseintrag wäre
 *               es reines Rauschen, das die echten Wechsel zudeckt.
 * - `verified`, `lastVerified`, `pageSeenAt`, `changedSinceIso` — unsere
 *               Prüf-Buchhaltung, kein Zustand des Programms. Sie steht bereits
 *               in `funding_checks`.
 * - `name`, `traeger`, `url`, `agsCode`, `region`, `bundesland`, `level`,
 *   `combinableWith` — Stammdaten. Ein korrigierter Link ist keine Änderung der
 *               Förderung; wer ihn als solche ausweist, verwässert den Verlauf.
 */
const NICHT_PROTOKOLLIERT = [
  "stand", "verified", "lastVerified", "pageSeenAt", "changedSinceIso",
  "name", "traeger", "url", "agsCode", "region", "bundesland", "level", "combinableWith",
] as const;
export const NICHT_PROTOKOLLIERTE_FELDER: readonly string[] = NICHT_PROTOKOLLIERT;

type Ableitung = { feld: HistorieFeld; bedeutung: Bedeutung; lies: (p: FundingProgram) => string | null };

const ABLEITUNGEN: Ableitung[] = [
  { feld: "status", bedeutung: "inhalt", lies: (p) => FUNDING_STATUS_LABEL[p.status] ?? p.status },
  { feld: "rates", bedeutung: "inhalt", lies: (p) => ausRaten(p.rates) },
  { feld: "conditions", bedeutung: "inhalt", lies: (p) => ausListe(p.conditions) },
  { feld: "coveredCosts", bedeutung: "inhalt", lies: (p) => p.coveredCosts || null },
  { feld: "maxFoerderung", bedeutung: "inhalt", lies: (p) => p.maxFoerderung || null },
  { feld: "eligibility", bedeutung: "inhalt", lies: (p) => ausListe(p.eligibility) },
  { feld: "capped", bedeutung: "inhalt", lies: (p) => (p.capped ? "Mittel begrenzt" : "Mittel nicht begrenzt") },
  { feld: "rechenwerte", bedeutung: "intern", lies: ausRechenwerten },
];

/**
 * Der Vergleich — eine reine Funktion, absichtlich ohne Uhr und ohne Datenbank.
 *
 * `alt === null` heißt „zum ersten Mal gesehen": Dann entsteht genau EIN Eintrag
 * (`aufnahme`) und nicht acht Feld-Einträge gegen das Nichts. Ein Programm, das
 * neu in den Katalog kommt, hat sich nicht geändert — wir haben angefangen
 * hinzusehen.
 */
export function vergleiche(alt: FundingProgram | null, neu: FundingProgram): Aenderung[] {
  if (!alt) {
    return [{
      programId: neu.id,
      feld: "aufnahme",
      bedeutung: "inhalt",
      alt: null,
      neu: FUNDING_STATUS_LABEL[neu.status] ?? neu.status,
    }];
  }

  const aenderungen: Aenderung[] = [];
  for (const a of ABLEITUNGEN) {
    const vorher = a.lies(alt);
    const nachher = a.lies(neu);
    if (vorher === nachher) continue;
    aenderungen.push({ programId: neu.id, feld: a.feld, bedeutung: a.bedeutung, alt: vorher, neu: nachher });
  }
  return aenderungen;
}

/**
 * Aus den Änderungen werden Protokollzeilen — der Zeitpunkt kommt von außen.
 *
 * Das ist die Stelle, an der die Prüfdatum-Regel technisch durchgesetzt wird:
 * Wer diese Funktion aufruft, muss ein Datum liefern und kann keines erben.
 */
export function zuEintraegen(
  aenderungen: Aenderung[],
  festgestelltAm: string,
  belege: { quelle: string | null; belegtAm: string | null },
): HistorieEintrag[] {
  return aenderungen.map((a) => ({ ...a, festgestelltAm, quelle: belege.quelle, belegtAm: belege.belegtAm }));
}

// ── Leseseite ────────────────────────────────────────────────────────────────

type Zeile = {
  program_id: string;
  observed_at: string;
  feld: string;
  bedeutung: string;
  alt: string | null;
  neu: string | null;
  quelle: string | null;
  belegt_am: string | null;
};

let cache: { data: Map<string, HistorieEintrag[]>; ts: number } | null = null;
const TTL = 10 * 60 * 1000;

function ausZeile(z: Zeile): HistorieEintrag {
  return {
    programId: z.program_id,
    festgestelltAm: z.observed_at,
    feld: z.feld as HistorieFeld,
    bedeutung: z.bedeutung === "intern" ? "intern" : "inhalt",
    alt: z.alt,
    neu: z.neu,
    quelle: z.quelle,
    belegtAm: z.belegt_am,
  };
}

/**
 * Verlauf aller Programme, gebündelt gelesen.
 *
 * Fehlt die Tabelle, liefert das eine leere Karte statt eines Fehlers — dieselbe
 * BLOCKER-Lehre wie in `funding-data.ts`: Wird der Code ausgeliefert, bevor
 * `/api/funding/setup` gelaufen ist, darf davon nichts auf den Seiten kaputtgehen.
 * Ohne Verlauf blendet sich der Abschnitt schlicht aus.
 */
export async function getFundingHistory(): Promise<Map<string, HistorieEintrag[]>> {
  if (cache && Date.now() - cache.ts < TTL) return cache.data;
  const leer = new Map<string, HistorieEintrag[]>();
  if (!supabase) return leer;

  try {
    const { data, error } = await withDbTimeout(
      supabase
        .from("funding_history")
        .select("program_id, observed_at, feld, bedeutung, alt, neu, quelle, belegt_am")
        .order("observed_at", { ascending: false })
        .limit(2000),
      "funding-history",
      DB_SOFT_READ_TIMEOUT_MS,
    );
    if (error || !data) return leer;

    const karte = new Map<string, HistorieEintrag[]>();
    for (const z of data as Zeile[]) {
      const liste = karte.get(z.program_id) ?? [];
      liste.push(ausZeile(z));
      karte.set(z.program_id, liste);
    }
    cache = { data: karte, ts: Date.now() };
    return karte;
  } catch {
    return leer;
  }
}

export async function getFundingHistoryFor(programId: string): Promise<HistorieEintrag[]> {
  return (await getFundingHistory()).get(programId) ?? [];
}

export function invalidateFundingHistoryCache(): void {
  cache = null;
}

/**
 * Was der Abschnitt auf der Seite zeigt.
 *
 * Getrennt von der Rohliste, weil zwei Fragen dranhängen: Welche Einträge sieht
 * ein Leser (nur `inhalt`, und die Aufnahme ist kein Wechsel), und ab wann
 * schauen wir überhaupt hin. Ein Abschnitt, der nur „aufgenommen am …" zeigt,
 * ist kein Verlauf — dann bleibt er weg.
 */
export function verlaufFuerSeite(eintraege: HistorieEintrag[]): {
  wechsel: HistorieEintrag[];
  beobachtetSeit: string | null;
} {
  const inhalt = eintraege.filter((e) => e.bedeutung === "inhalt");
  const aufnahme = inhalt.filter((e) => e.feld === "aufnahme");
  const wechsel = inhalt
    .filter((e) => e.feld !== "aufnahme")
    .slice()
    .sort((a, b) => b.festgestelltAm.localeCompare(a.festgestelltAm));
  // Die früheste Aufnahme gewinnt: Ein Programm, das aus dem Katalog fiel und
  // wieder aufgenommen wurde, wird seit dem ersten Mal beobachtet.
  const beobachtetSeit = aufnahme.length
    ? aufnahme.map((e) => e.festgestelltAm).sort()[0]
    : null;
  return { wechsel, beobachtetSeit };
}
