import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Wächter gegen „heute" aus der Weltzeit.
 *
 * DER ANLASS IST VIERMAL EINGETRETEN, nicht befürchtet. `new Date()` in einen
 * Kalendertag zu verwandeln, indem man `toISOString()` abschneidet, liest sich
 * wie „heute" und ist es zwischen 00:00 und 02:00 deutscher Zeit nicht — dann
 * steht dort der Vortag. Gegen einen deutschen Stichtag gehalten verschiebt das
 * den Wechsel um einen Tag, und zwar in einem Zeitfenster, in dem niemand
 * hinsieht:
 *   • die Monatsfrist der Balkon-Anmeldung (der erste Fall, deshalb gibt es
 *     lib/zeit.ts überhaupt),
 *   • drei Läufe, die ihr Fälligkeitsdatum daraus bildeten (01.09.2026),
 *   • der Einspeise-Stichtagsplan: am Stichtag zwei Stunden lang der ALTE
 *     Vergütungssatz (gemeldet 02.09.2026, behoben 08.09.2026),
 *   • der BEG-Fahrplan: am Stichtag zwei Stunden lang der alte Fördersatz und
 *     der alte Höchstbetrag (gleicher Befund, gleicher Tag).
 *
 * WARUM EIN WÄCHTER UND KEIN MERKSATZ: Die beiden letzten Fälle standen sechs
 * Tage lang gemeldet im Repo, ohne dass jemand sie anfasste — und die Fehler
 * davor waren zu diesem Zeitpunkt längst behoben und aufgeschrieben. Ein
 * Merksatz hat diese Klasse dreimal nicht verhindert. Was sie verhindert, ist
 * dieselbe Bauweise wie beim Einheiten- und beim Schriftgrößen-Wächter: Der
 * Test verbietet nicht den falschen Tag, sondern die Bauweise, die ihn erzeugt.
 *
 * WAS ER PRÜFT: die eine Form, die eindeutig „jetzt → Kalendertag" bedeutet —
 * `new Date()` oder `Date.now()` ohne Argument, abgeschnitten auf zehn Zeichen.
 * Für den deutschen Kalendertag gibt es `heuteInBerlin()` in lib/zeit.ts, für
 * ein Argument, das entweder Zeitpunkt oder gemeinter Tag sein kann,
 * `tagInBerlin()`.
 *
 * WAS ER NICHT PRÜFT, und das gehört benannt: Ein Helfer, der ein
 * HEREINGEREICHTES Datum abschneidet (`(d: Date) => d.toISOString().slice(0,10)`),
 * ist von hier aus nicht zu beurteilen — ob er richtig ist, entscheidet sein
 * Aufrufer. Die meisten dieser Stellen im Projekt sind korrekt: Sie rechnen auf
 * einem bereits UTC-verankerten Tag (`new Date(\`${iso}T12:00:00Z\`)`), was
 * reine Datumsarithmetik und von der Zeitzone unabhängig ist. Wer eine solche
 * Stelle neu baut, prüft selbst, woher ihr Datum kommt — dieser Test nimmt ihm
 * das nicht ab. Eine Regex kann den Unterschied nicht sehen; das zu behaupten
 * wäre ein Wächter, der mehr verspricht, als er hält.
 */

const ROOT = join(__dirname, "..", "..");

/** Durchsucht wird alles, was ausgeliefert oder ausgeführt wird — Tests inklusive.
 *  Ein Wächter, der die Testdateien ausnimmt, lässt die Bauweise durch die
 *  Hintertür zurückkommen: Ein Test, der um 00:30 mit dem Vortag rechnet, wird
 *  einmal im Jahr grundlos rot und wird dann entschärft statt verstanden. */
const VERZEICHNISSE = ["app", "components", "lib", "scripts"];

/**
 * „jetzt" direkt in einen Kalendertag verwandelt — beide Schreibweisen, die im
 * Projekt vorkommen (`.slice(0, 10)` und `.split("T")[0]`), und beide Quellen
 * der aktuellen Zeit. `Date.now()` ist mit erfasst, weil eine Verschiebung
 * daneben (`Date.now() + 86_400_000`) den Fehler nicht heilt, sondern mitnimmt.
 */
const JETZT_ALS_TAG = [
  /new Date\(\)\s*\.toISOString\(\)\s*\.slice\(\s*0\s*,\s*10\s*\)/,
  /new Date\(\)\s*\.toISOString\(\)\s*\.split\("T"\)\[0\]/,
  /new Date\(\s*Date\.now\(\)[^)]*\)\s*\.toISOString\(\)\s*\.slice\(\s*0\s*,\s*10\s*\)/,
  /new Date\(\s*Date\.now\(\)[^)]*\)\s*\.toISOString\(\)\s*\.split\("T"\)\[0\]/,
];

/**
 * Dauerhafte Ausnahmen: Stellen, an denen der Kalendertag der Weltzeit der
 * RICHTIGE ist. Jede braucht einen ausgeschriebenen Grund — „ist mir egal" ist
 * keiner, und die Regex aufzuweichen ist nie die Lösung.
 */
const WELTZEIT_IST_RICHTIG: { datei: string; grund: string }[] = [];

/**
 * Vorübergehende Ausnahmen. Jede trägt eine Frist im Format JJJJ-MM-TT; läuft
 * sie ab, wird dieser Test rot. Das ist Absicht: Ein „OFFEN" ohne Wecker ist
 * ein Vorsatz, kein Termin.
 */
const NOCH_OFFEN: { datei: string; bis: string; grund: string }[] = [];

function dateienUnter(rel: string): string[] {
  const abs = join(ROOT, rel);
  const out: string[] = [];
  const lauf = (p: string) => {
    for (const eintrag of readdirSync(p)) {
      // Ein Verzeichnisdurchlauf, der Punkt-Einträge überspringt, übersieht auch
      // eine Sabotage, die so heißt — genau daran ist am 01.09.2026 die
      // Gegenprobe eines anderen Wächters gescheitert. Hier wird nur
      // ausgeschlossen, was wirklich nicht unser Code ist.
      if (eintrag === "node_modules" || eintrag === ".next" || eintrag === ".next-dev") continue;
      const voll = join(p, eintrag);
      if (statSync(voll).isDirectory()) lauf(voll);
      else if (/\.tsx?$/.test(eintrag)) out.push(voll);
    }
  };
  if (statSync(abs).isDirectory()) lauf(abs);
  else out.push(abs);
  return out;
}

/**
 * Kommentare heraus, bevor gesucht wird.
 *
 * Die Erklärung, warum diese Bauweise falsch ist, MUSS sie zitieren dürfen —
 * sie steht in lib/zeit.ts, in diesem Wächter und in mehreren Testkommentaren.
 * Ein Wächter, der sein eigenes Beispiel anschlägt, wird beim ersten Mal mit
 * einer Ausnahme für die Datei entschärft, in der die Begründung steht.
 */
function ohneKommentare(quelle: string): string {
  return quelle
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .split("\n")
    .map((z) => {
      const i = z.indexOf("//");
      return i < 0 ? z : z.slice(0, i);
    })
    .join("\n");
}

describe("Wächter: ein deutscher Stichtag wird gegen eine deutsche Uhr gehalten", () => {
  it("bildet keinen Kalendertag aus der Weltzeit, außer mit Begründung", () => {
    const ausgenommen = new Set([
      ...WELTZEIT_IST_RICHTIG.map((a) => a.datei),
      ...NOCH_OFFEN.map((a) => a.datei),
    ]);
    const dateien = VERZEICHNISSE.flatMap(dateienUnter);
    // Gegenprobe gegen einen Wächter, der nichts sieht und trotzdem grün meldet:
    // Findet der Durchlauf kaum Dateien, ist er kaputt, nicht der Code sauber.
    expect(dateien.length).toBeGreaterThan(300);

    const funde: string[] = [];
    for (const datei of dateien) {
      const rel = datei.slice(ROOT.length + 1);
      if (ausgenommen.has(rel)) continue;
      ohneKommentare(readFileSync(datei, "utf8"))
        .split("\n")
        .forEach((zeile, i) => {
          if (!JETZT_ALS_TAG.some((re) => re.test(zeile))) return;
          funde.push(`${rel}:${i + 1}  ${zeile.trim().slice(0, 120)}`);
        });
    }

    expect(
      funde,
      "Der laufende Kalendertag kommt aus heuteInBerlin() (lib/zeit.ts), nicht aus " +
        "toISOString(). Ein Argument, das Zeitpunkt ODER gemeinter Tag sein " +
        "kann, geht durch tagInBerlin(). Gehört die Weltzeit hier wirklich " +
        "hin, kommt die Datei mit Begründung in WELTZEIT_IST_RICHTIG:\n" +
        funde.join("\n"),
    ).toEqual([]);
  });

  it("jede vorübergehende Ausnahme hat eine Frist, und keine ist abgelaufen", () => {
    const heute = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" }).format(new Date());
    for (const a of NOCH_OFFEN) {
      expect(a.bis, `${a.datei}: Frist im Format JJJJ-MM-TT`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(a.grund.length, `${a.datei}: Grund fehlt`).toBeGreaterThan(20);
      expect(
        a.bis >= heute,
        `${a.datei}: Frist am ${a.bis} abgelaufen — entweder umstellen oder die Frist mit neuem Grund verlängern.`,
      ).toBe(true);
    }
  });

  it("jede dauerhafte Ausnahme nennt, warum die Weltzeit dort richtig ist", () => {
    for (const a of WELTZEIT_IST_RICHTIG) {
      expect(a.grund.length, `${a.datei}: Grund zu dünn`).toBeGreaterThan(60);
      // Die Ausnahme muss die Bauweise WIRKLICH enthalten — sonst steht sie für
      // eine Datei da, die längst umgestellt ist, und deckt beim nächsten Mal
      // eine neue Stelle mit ab, die niemand geprüft hat.
      const quelle = ohneKommentare(readFileSync(join(ROOT, a.datei), "utf8"));
      expect(
        JETZT_ALS_TAG.some((re) => re.test(quelle)),
        `${a.datei} steht in der Ausnahmeliste, benutzt die Bauweise aber gar nicht mehr — Eintrag entfernen.`,
      ).toBe(true);
    }
  });
});
