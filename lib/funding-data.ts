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
    const programs = data.map((r) => {
      const lastVerified = (r.last_verified ?? null) as string | null;
      // Der Seiten-Waechter bestaetigt taeglich, dass die Amtsseite unveraendert
      // ist. Genau das haelt einen geprueften Wert am Leben (fundingBelegAktuell)
      // — ohne diese zwei Felder faellt jedes Programm nach zwei Wochen raus.
      const pageSeenAt = (r.page_seen_at ?? null) as string | null;
      const changedSinceIso = (r.page_changed_at ?? null) as string | null;
      return {
        ...(r.data as FundingProgram),
        ...(lastVerified ? { lastVerified } : {}),
        ...(pageSeenAt ? { pageSeenAt } : {}),
        ...(changedSinceIso ? { changedSinceIso } : {}),
      };
    });
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
