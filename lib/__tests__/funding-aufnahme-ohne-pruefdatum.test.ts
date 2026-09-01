import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fundingZaehlt, FUNDING_PROGRAMS } from "../funding-programs";

/**
 * Ein NEU aufgenommenes Programm zieht kein Geld ab, bis jemand die Amtsseite
 * gelesen hat — BLOCKER.
 *
 * WARUM ES DIESEN TEST GIBT (01.09.2026): Seit heute darf ein Wächter ein
 * Förderprogramm selbst aufnehmen, statt es nur vorzuschlagen
 * (`scripts/waechter-gate.md`, „Ein Förderprogramm neu aufnehmen"). Diese
 * Erlaubnis steht und fällt mit EINER Eigenschaft: Der Code-Seed trägt kein
 * Prüfdatum, also rechnet ein frisch aufgenommenes Programm nachweislich nicht
 * mit. Es steht auf der Stadtseite und informiert; Geld zieht es erst ab,
 * nachdem `npm run foerder:probe -- --ok <id> --wie traeger` einen gelesenen
 * Abruf an der AMTSSEITE protokolliert und damit `last_verified` gesetzt hat.
 *
 * DIE FEHLERKLASSE, GEGEN DIE DAS HIER STEHT, ist eine Bequemlichkeit, die sich
 * jederzeit richtig anfühlt: Wer den Abgleich erweitert, kommt leicht auf den
 * Gedanken, beim Aufnehmen gleich ein Prüfdatum mitzuschreiben — der Eintrag
 * wurde ja gerade erst geprüft. Damit fiele die einzige Bremse weg, und zwar
 * ohne dass irgendein bestehender Test rot würde: `funding-beleg-verfall`
 * prüft die FUNKTION `fundingZaehlt`, nicht den Schreiber. Genau diese Lücke
 * schließt der zweite Teil unten.
 *
 * Es ist dieselbe Systematik wie beim Förder-Prüfdatum überhaupt: Ein Datum darf
 * nur eine Prüfung stempeln, die stattgefunden hat. Über den Fallback auf die
 * Schreibzeit trugen einmal 25 von 38 Programmen ein erfundenes Prüfdatum.
 */

const WURZEL = resolve(__dirname, "../..");
const SEED_ROUTE = "app/api/funding/setup/route.ts";

/** Quelltext ohne Kommentare — sonst schlägt das Verbot an der Stelle an, an
 *  der die Regel erklärt wird. */
const ohneKommentare = (quelle: string) =>
  quelle.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

describe("Aufnehmen darf, Geld abziehen erst nach gelesener Amtsseite", () => {
  it("ein Programm ohne Prüfdatum zählt nicht, egal wie aktiv es ist", () => {
    // Das ist der Zustand direkt nach der Aufnahme: im Code, im Katalog, auf der
    // Stadtseite sichtbar — und ohne jeden Beleg, dass jemand die Amtsseite
    // aufgeschlagen hat.
    const frischAufgenommen = {
      status: "aktiv" as const,
      lastVerified: undefined,
      pageSeenAt: undefined,
      changedSinceIso: undefined,
    };
    expect(fundingZaehlt(frischAufgenommen, "2026-09-01")).toBe(false);
  });

  it("erst der protokollierte Träger-Abruf schaltet es scharf", () => {
    const geprueft = {
      status: "aktiv" as const,
      lastVerified: "2026-09-01",
      pageSeenAt: "2026-09-01",
      changedSinceIso: undefined,
    };
    expect(fundingZaehlt(geprueft, "2026-09-01")).toBe(true);
  });

  it("KEIN Programm im Code-Seed trägt ein Prüfdatum", () => {
    // Ein im Code hinterlegtes Prüfdatum wäre eine zweite Wahrheit neben der
    // Datenbank — und die im Code stünde still, während die Seite sie als
    // „zuletzt geprüft" ausgibt.
    const mitDatum = Object.values(FUNDING_PROGRAMS).filter(
      (p) => (p as { lastVerified?: string }).lastVerified,
    );
    expect(
      mitDatum.map((p) => p.id),
      "Prüfdaten gehören in die Datenbank, nicht in den Seed",
    ).toEqual([]);
  });

  it("der Abgleich schreibt beim Aufnehmen KEIN Prüfdatum", () => {
    // Der Schreiber, nicht die Funktion: Diese Route ist die einzige Stelle, die
    // ein Programm selbst in die Tabelle schreibt (festgehalten von
    // funding-erfassung-grenze). Setzt sie dabei `last_verified`, wäre jedes neu
    // aufgenommene Programm sofort scharf — ohne dass jemand die Amtsseite
    // gesehen hat, und ohne dass ein anderer Test das merkt.
    const quelle = ohneKommentare(readFileSync(resolve(WURZEL, SEED_ROUTE), "utf8"));

    // Der Block, der die Zeilen für den Upsert baut.
    const start = quelle.indexOf("Object.values(FUNDING_PROGRAMS).map(");
    expect(start, "Seed-Aufbau nicht gefunden — Route umgebaut? Test nachziehen").toBeGreaterThan(-1);
    const block = quelle.slice(start, quelle.indexOf("}));", start));

    expect(
      /last_verified/.test(block),
      "Der Seed-Upsert setzt last_verified — damit zieht ein frisch aufgenommenes Programm sofort Geld ab, ohne gelesene Amtsseite",
    ).toBe(false);

    // Gegenprobe, dass der Ausschnitt überhaupt etwas enthält: Ein leerer Block
    // würde die Prüfung oben stumm bestehen. Derselbe Fehler wie beim
    // Datenbank-Wächter, der sechs von neun Aufrufen gar nicht sah und trotzdem
    // grün meldete.
    expect(block, "Ausschnitt leer — die Prüfung oben liefe ins Nichts").toContain("data: p");
  });
});
