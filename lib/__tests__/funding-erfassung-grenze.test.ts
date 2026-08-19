import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";

/**
 * Die Erfassung darf den Katalog nicht direkt beschreiben — BLOCKER.
 *
 * WARUM (19.08.2026): Die Förder-Stadtseite liest die Programme aus der
 * Datenbank, der Kohärenz-Test `atlas-funding-sync` liest sie aus dem Code.
 * Beides geht gut, solange die Datenbank NUR aus dem Code befüllt wird. Schreibt
 * dagegen irgendein Lauf ein Programm direkt in die Tabelle, ist es für den Test
 * unsichtbar — und wenn dabei zwei Programme auf denselben Gemeindeschlüssel
 * fallen, liefert die Zuordnung `fundingFor()` bewusst `undefined` (raten wäre
 * schlimmer als nichts zeigen). Folge: `isCityPublished` wird false, die Adresse
 * fällt aus `generateStaticParams`, und die Stadtseite antwortet 404 —
 * ohne Fehlermeldung, ohne roten Test, ohne kaputtes Aussehen. Ein Indexverlust,
 * den niemand bemerkt.
 *
 * DIE TRENNLINIE IST DIE SPALTE, NICHT DIE TABELLE. Nur `data` trägt das
 * Programm selbst, also kann nur darüber ein Zwilling entstehen. Die
 * Beleg-Spalten (`last_verified`, `page_fingerprint`, `page_seen_at`,
 * `page_changed_at`, `confidence`, `archived`) werden absichtlich von mehreren
 * Stellen fortgeschrieben — Prüfstand und Seiten-Wächter leben davon. Ein Test,
 * der jeden Schreibzugriff verbietet, würde die mitfangen und beim nächsten Lauf
 * als Fehlalarm weggeklickt.
 *
 * Gemessen am 19.08.2026: vier Schreiber auf der Tabelle, genau EINER schreibt
 * `data` — der code-gespeiste Resync in `/api/funding/setup`.
 */

const WURZEL = resolve(__dirname, "../..");
const ORDNER = ["lib", "scripts", "app"];

/** Die einzige Stelle, die ein Programm selbst schreiben darf. */
const SEED_ROUTE = "app/api/funding/setup/route.ts";

function dateien(ordner: string): string[] {
  const start = join(WURZEL, ordner);
  const raus: string[] = [];
  const lauf = (p: string) => {
    for (const e of readdirSync(p)) {
      if (e === "node_modules" || e === ".next" || e === ".next-dev") continue;
      const voll = join(p, e);
      if (statSync(voll).isDirectory()) lauf(voll);
      else if (/\.(ts|tsx|mjs)$/.test(e) && !/__tests__/.test(voll)) raus.push(voll);
    }
  };
  lauf(start);
  return raus;
}

/** Schreibende Zugriffe auf funding_programs samt dem folgenden Aufruf. */
function schreibstellen(quelltext: string): string[] {
  const treffer: string[] = [];
  const re = /from\(\s*["'`]funding_programs["'`]\s*\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(quelltext))) {
    // Der Aufruf steht direkt dahinter — großzügiges Fenster, weil die Kette
    // über mehrere Zeilen umgebrochen sein kann.
    const fenster = quelltext.slice(m.index, m.index + 600);
    if (/\.\s*(upsert|insert|update)\s*\(/.test(fenster)) treffer.push(fenster);
  }
  return treffer;
}

describe("Grenze zwischen Erfassung und Katalog", () => {
  const alle = ORDNER.flatMap(dateien);

  it("nur der code-gespeiste Resync schreibt die Programm-Spalte `data`", () => {
    const verstoesse: string[] = [];
    for (const datei of alle) {
      const rel = datei.slice(WURZEL.length + 1);
      if (rel === SEED_ROUTE) continue;
      for (const stelle of schreibstellen(readFileSync(datei, "utf8"))) {
        // Schreibt dieser Aufruf das Programm selbst?
        if (/\bdata\s*:/.test(stelle) || /\bupsert\s*\(\s*rows\b/.test(stelle)) {
          verstoesse.push(rel);
        }
      }
    }
    expect(
      verstoesse,
      `Diese Stellen schreiben ein Programm direkt in die Datenbank, am Code-Seed vorbei. ` +
        `Damit wäre ein doppelter Gemeindeschlüssel für den Sync-Test unsichtbar und die ` +
        `Stadtseite verschwände lautlos (404). Der Katalog wird ausschließlich über ` +
        `${SEED_ROUTE} befüllt; die Erfassung schreibt in ihre eigenen Tabellen.`,
    ).toEqual([]);
  });

  it("die Beleg-Spalten dürfen weiterhin von mehreren Stellen kommen", () => {
    // Gegenrichtung: Der Test darf den Prüfstand und den Seiten-Wächter NICHT
    // mitfangen. Schlägt das hier fehl, ist die Regel zu scharf geworden.
    const belegSchreiber = alle.filter((datei) =>
      schreibstellen(readFileSync(datei, "utf8")).some(
        (s) => /last_verified|page_fingerprint|page_seen_at|page_changed_at/.test(s) && !/\bdata\s*:/.test(s),
      ),
    );
    expect(belegSchreiber.length).toBeGreaterThan(0);
  });
});
