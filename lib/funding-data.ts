import { supabase } from "./supabase-server";
import { DB_SOFT_READ_TIMEOUT_MS, withDbTimeout } from "./db-timeout";
import { FUNDING_PROGRAMS, type FundingProgram } from "./funding-programs";

// Server-side read of the funding dataset. Source of truth is Supabase
// (admin UI + quarterly verification routine write there); the code dataset
// in funding-programs.ts is the typed seed/fallback when the DB is empty or
// unreachable — same pattern as market prices (DEFAULT_PRICES).

let cache: { data: FundingProgram[]; ts: number } | null = null;
const TTL = 10 * 60 * 1000; // 10 min in-memory cache (warm function reuse)

// Kurze Ruhepause nach einem Fehlschlag — der Verstärker, nicht der Auslöser.
//
// Ohne sie feuert JEDER Seitenaufbau sofort wieder gegen eine Datenbank, die
// gerade nicht kann: Die Last steigt genau dann, wenn sie sinken müsste, und der
// Ausfall hält sich selbst am Leben (so lief die Kette bei einem
// Schwesterprojekt am 21.08.2026 — die Datenbank war 20 Minuten vor der Seite
// wieder gesund). 30 s sind kurz genug, dass eine Erholung sofort ankommt, und
// lang genug, dass zwischen zwei Versuchen Luft ist. Ausgeliefert wird in dieser
// Zeit der Code-Seed, also genau das, was ein Fehlschlag ohnehin liefert.
const FEHLER_RUHE = 30 * 1000;
let fehlerBis = 0;

export async function getFundingPrograms(): Promise<FundingProgram[]> {
  if (cache && Date.now() - cache.ts < TTL) return cache.data;

  const seed = Object.values(FUNDING_PROGRAMS);
  // Entwicklungs-Schalter: den Code-Seed erzwingen, obwohl eine Datenbank da ist.
  //
  // Gebraucht für die Abnahme im Browser. Die Stadtseiten lesen die Programme
  // aus der Datenbank; eine Änderung am Katalog im Code ist dort erst nach dem
  // Deploy UND dem Abgleich zu sehen — und der Abgleich darf nicht vorher
  // laufen, weil die Produktion dann neue Datenstrukturen mit altem Code
  // rendern würde. Ohne diesen Schalter bliebe nur ein Server ohne Datenbank,
  // und dem fehlen dann Anlagenbestand und Beispielrechnungen.
  //
  // Wirkt NUR außerhalb der Produktion — in der Produktion ist die Datenbank
  // die Wahrheit, und ein Schalter, der das umkehren kann, wäre eine zweite.
  if (process.env.NODE_ENV !== "production" && process.env.FOERDER_AUS_CODE === "1") return seed;
  if (!supabase) return seed;
  if (Date.now() < fehlerBis) return seed;

  try {
    // Pull the provenance column alongside the program json so pages can show
    // "Zuletzt geprüft" and the sitemap can emit a real <lastmod>.
    //
    // NUR `last_verified` — NIEMALS `updated_at` als Ersatz (korrigiert
    // 16.08.2026). `updated_at` ist der Zeitpunkt der letzten Schreibung, also
    // z. B. eines Resyncs, bei dem niemand irgendetwas geprüft hat. Über diesen
    // Fallback trugen 25 der 38 Programme ein "Zuletzt geprüft"-Datum, das eine
    // Prüfung behauptete, die nie stattgefunden hat — und das mit jedem Resync
    // frischer wurde (nur 13 hatten ein echtes Prüfdatum). Dieselbe Fehlerklasse wie am 28.07.2026, als ein Lauf allen
    // 36 Programmen das Datum des Tages aufstempelte (siehe Kopf von
    // scripts/set-funding-verified.mjs), nur auf dem stillen Weg.
    //
    // Ohne echtes Prüfdatum fällt fundingStandLabel auf den redaktionellen
    // `stand` zurück ("Stand: Juni 2026") — eine ehrliche, schwächere Aussage.
    // Zweistufig lesen — BLOCKER. Die Bestätigungs-Spalten sind jung; wird der
    // Code ausgeliefert, BEVOR /api/funding/setup sie angelegt hat, scheitert die
    // Abfrage komplett. Einstufig gelesen fiele der Lader dann auf den Code-Seed
    // zurück, und der trägt kein Prüfdatum — Ergebnis: JEDE Förderung
    // verschwindet schlagartig von Rechner, Stadtseiten und CTA. Genau das ist am
    // 17.08.2026 in einem Prüfskript passiert ("column page_changed_at does not
    // exist"). Fehlen die Spalten, lesen wir ohne sie weiter: Die Beträge bleiben
    // sichtbar, nur die tagesaktuelle Bestätigung fehlt, bis das Setup lief.
    let rows: Record<string, unknown>[] | null = null;
    const voll = await withDbTimeout(
      supabase.from("funding_programs").select("data, last_verified, page_seen_at, page_changed_at"),
      "funding-programs",
      DB_SOFT_READ_TIMEOUT_MS,
    );
    if (voll.error) {
      const schmal = await withDbTimeout(
        supabase.from("funding_programs").select("data, last_verified"),
        "funding-programs (schmal)",
        DB_SOFT_READ_TIMEOUT_MS,
      );
      if (schmal.error || !schmal.data) return seed;
      rows = schmal.data as Record<string, unknown>[];
    } else {
      rows = voll.data as Record<string, unknown>[];
    }
    const data = rows;
    if (!data || data.length === 0) return seed;
    const ausCode = new Map(seed.map((p) => [p.id, p]));
    const nichtVerstanden: string[] = [];
    const programs: FundingProgram[] = [];
    for (const r of data) {
      const roh = r.data as FundingProgram | undefined;
      const id = roh?.id;
      // Die Datenbank ist EINE, die Codestände sind viele — Begründung an
      // datenFormVerstanden(). Was dieser Code nicht als Text ausgeben kann, wird
      // hier abgefangen statt im JSX: Ein Objekt als React-Kind reißt beim
      // Vorrendern den ganzen Bau um, nicht nur die eine Seite.
      if (!datenFormVerstanden(roh)) {
        nichtVerstanden.push(id ?? "(ohne id)");
        // Der Code-Seed ist die Fassung, die zu DIESEM Code passt. Sie kommt
        // bewusst OHNE die Beleg-Spalten der Zeile: Die beschreiben einen Stand,
        // den wir gerade nicht lesen können, und ohne sie zählt das Programm
        // nicht mehr mit (fundingZaehlt) — es informiert weiter, zieht aber kein
        // Geld ab. Lieber kein Betrag als einer aus einer Form, die wir nicht
        // verstehen. Fehlt das Programm im Seed, gibt es gar keine stimmige
        // Fassung; dann fällt es weg.
        const ersatz = id ? ausCode.get(id) : undefined;
        if (ersatz) programs.push(ersatz);
        continue;
      }
      const lastVerified = (r.last_verified ?? null) as string | null;
      // Der Seiten-Waechter bestaetigt taeglich, dass die Amtsseite unveraendert
      // ist. Genau das haelt einen geprueften Wert am Leben (fundingBelegAktuell)
      // — ohne diese zwei Felder faellt jedes Programm nach zwei Wochen raus.
      const pageSeenAt = (r.page_seen_at ?? null) as string | null;
      const changedSinceIso = (r.page_changed_at ?? null) as string | null;
      programs.push({
        ...(roh as FundingProgram),
        ...(lastVerified ? { lastVerified } : {}),
        ...(pageSeenAt ? { pageSeenAt } : {}),
        ...(changedSinceIso ? { changedSinceIso } : {}),
      });
    }
    if (nichtVerstanden.length > 0) {
      // Sichtbar machen, nicht verschlucken: Ein stiller Rückfall sieht aus wie
      // ein gepflegter Katalog und ist einer, der stehengeblieben ist.
      console.warn(
        `[funding] Datenform nicht verstanden, auf den Code-Seed zurückgefallen: ${nichtVerstanden.join(", ")}`,
      );
    }
    cache = { data: programs, ts: Date.now() };
    return programs;
  } catch {
    fehlerBis = Date.now() + FEHLER_RUHE;
    return seed;
  }
}

export async function getFundingProgramById(id: string): Promise<FundingProgram | undefined> {
  return (await getFundingPrograms()).find((p) => p.id === id);
}

export function invalidateFundingCache(): void {
  cache = null;
  // Auch die Ruhepause aufheben: Wer gerade geschrieben hat, will den neuen
  // Stand sehen, nicht 30 s lang den Seed.
  fehlerBis = 0;
}

/**
 * Versteht DIESER Code die Form, in der die Datenbank ein Programm ablegt?
 *
 * WARUM ES DAS GIBT (27.08.2026): `row.data` wird an der Datenbank-Grenze per
 * `as FundingProgram` behauptet, nicht geprüft. TypeScript ist damit zufrieden,
 * und genau deshalb ist die Grenze blind: Die Datenbank ist EINE, die Codestände
 * sind viele. Wer den Abgleich fährt, schreibt die neue Form in dieselbe Tabelle,
 * aus der jeder ältere Zweig weiterliest — der rendert sie dann als React-Kind
 * und stirbt.
 *
 * Gemessen an genau diesem Fall: Die Bedingungen bekamen am 26.08.2026 neben dem
 * blanken Satz die Objektform `{ text, nur }`. Der Abgleich schrieb sie in die
 * Produktions-Datenbank. Ein Zweig ohne diese Änderung erwartete dort `string[]`,
 * spreizte die Liste direkt ins JSX und antwortete auf Niddas Stadtseite mit
 * HTTP 500 („Objects are not valid as a React child, keys {nur, text}") — im
 * Entwicklungsserver nachgestellt, nicht hergeleitet. Beim Vorrendern ist es
 * schlimmer als ein Laufzeitfehler: Der ganze Bau bricht ab.
 *
 * Die Antwort darauf war bis dahin eine Verfahrensregel („den Abgleich nicht vor
 * dem Deploy laufen lassen", siehe der Schalter FOERDER_AUS_CODE oben). Sie
 * hält nicht: An diesem Repo hängen dauerhaft ein Dutzend Arbeitsstände, und die
 * lesen alle dieselbe Datenbank. Eine Regel, die jeder Zweig gleichzeitig
 * einhalten müsste, ist keine.
 *
 * GEPRÜFT WIRD DIE RENDERBARKEIT, NICHT DIE EXAKTE FORM. Zusätzliche Felder
 * sind ausdrücklich erlaubt — sonst würde jede spätere Erweiterung hier als
 * „fremd" gelten und ein Programm stillschweigend abschalten. Verlangt wird nur,
 * dass alles, was eine Oberfläche als Text ausgibt, auch Text IST.
 *
 * WER {@link FundingCondition} ODER `rates` ERWEITERT, ERWEITERT DIESE PRÜFUNG
 * IM SELBEN COMMIT. Der Test hält den Code-Seed gegen sie: Eine neue Form, die
 * hier nicht bekannt ist, macht ihn rot, statt später jedes Programm auf den
 * Seed zurückfallen zu lassen.
 */
export function datenFormVerstanden(roh: unknown): boolean {
  if (!roh || typeof roh !== "object") return false;
  const p = roh as { conditions?: unknown; rates?: unknown };

  if (p.conditions !== undefined) {
    if (!Array.isArray(p.conditions)) return false;
    for (const c of p.conditions) {
      if (typeof c === "string") continue;
      // Die Objektform: mehr als `text` braucht keine Oberfläche, um sie
      // anzuzeigen — `nur` grenzt nur ein, was gezeigt wird.
      if (c && typeof c === "object" && typeof (c as { text?: unknown }).text === "string") continue;
      return false;
    }
  }

  if (p.rates !== undefined) {
    if (!Array.isArray(p.rates)) return false;
    for (const r of p.rates) {
      if (!r || typeof r !== "object") return false;
      const zeile = r as { label?: unknown; value?: unknown };
      if (typeof zeile.label !== "string" || typeof zeile.value !== "string") return false;
    }
  }

  return true;
}
