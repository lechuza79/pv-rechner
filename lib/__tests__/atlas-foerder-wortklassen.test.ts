import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Zwei Seitenfamilien, dieselben Orte — und getrennte Wortklassen in Titel und
 * Beschreibung.
 *
 * DIE REGEL: Die Förderseiten gehören zur Geld-Frage (förderung, zuschuss,
 * klimabonus, programm) + Ort. Die Atlas-Seiten gehören zur Bestands-Frage
 * (photovoltaik, solar, pv, solaranlagen) + Ort. Ab der Ortswelle tragen beide
 * Familien denselben Ortsnamen; wenn sie dann auch dieselben Wörter tragen,
 * konkurrieren zwei eigene Seiten um dieselbe Anfrage und beide verlieren
 * Position. Konzept: docs/ortswelle-und-foerderseiten.md.
 *
 * WARUM ALS TEST UND NICHT ALS MERKSATZ (18.08.2026): Die Regel stand seit
 * demselben Vormittag im Konzeptpapier — und wurde am Nachmittag von derselben
 * Sitzung gebrochen, die sie aufgeschrieben hatte: In die Beschreibung der
 * Atlas-Seiten wanderte der Zusatz „mit Rangliste und Landesförderung". Gefunden
 * hat das nicht der Autor, sondern ein adversarialer Prüfer. Ein Merksatz, den
 * man beim Schreiben des nächsten Satzes vergisst, ist keine Sperre.
 *
 * Der Test prüft die Vorlagen im Code, nicht die Rankings — was Google daraus
 * macht, kann er nicht wissen. Er hält nur die Trennung ein, die wir selbst
 * beschlossen haben.
 */

const ROOT = join(__dirname, "..", "..");

const ATLAS_SEITEN = [
  "app/(site)/solar-atlas/[[...pfad]]/page.tsx",
  "app/(site)/solar-atlas/[bundesland]/[kreis]/[gemeinde]/page.tsx",
];

const FOERDER_STADTSEITE = "app/(site)/photovoltaik-foerderung/[bundesland]/[stadt]/page.tsx";

/** Wörter der Geld-Frage. Kleingeschrieben geprüft. */
const GELD_WOERTER = /(förder|zuschuss|klimabonus|förderprogramm|subvention)/i;

/** Wörter der Bestands-Frage. */
const BESTANDS_WOERTER = /(photovoltaik|solaranlagen|solar|pv)/i;

/**
 * Holt den Inhalt von `title:` und `description:` aus dem pageMetadata-Aufruf.
 *
 * Bewusst grob: Der Test soll anschlagen, wenn ein Geld-Wort in die Nähe von
 * Titel oder Beschreibung gerät — nicht ein Parser sein. Kommentarzeilen werden
 * entfernt, sonst schlägt jede Begründung an, die das verbotene Wort nennt (und
 * genau solche Begründungen stehen dort inzwischen).
 */
function metaZeilen(datei: string): { titel: string[]; beschreibung: string[] } {
  const roh = readFileSync(join(ROOT, datei), "utf8");
  const ohneKommentare = roh
    .split("\n")
    .filter((z) => !/^\s*(\/\/|\/\*|\*)/.test(z))
    .join("\n");

  /**
   * Steht dort statt eines Textes ein Funktionsaufruf (`title: seitenTitel(region)`),
   * wird die Funktion nachgeschlagen und ihr Rumpf ausgewertet. Ohne diesen
   * Schritt prüft der Test einen Bezeichner statt eines Satzes — er wäre grün,
   * egal was in der Funktion steht.
   *
   * Gesucht wird ERST im selben Modul, DANN im importierten (02.09.2026): Seit
   * der Titel als eine Quelle in lib/atlas-titel.ts liegt, steht in beiden
   * Seiten nur noch ein Aufruf. Ein Auflöser, der an der Dateigrenze aufgibt,
   * hätte hier ab sofort einen Bezeichner geprüft und nie wieder etwas gefunden
   * — die Fehlerklasse „Wächter prüft Vorhandensein statt Verwendung", nur an
   * der anderen Seite. Aufgelöst wird höchstens eine Ebene tief; wer die Vorlage
   * noch einmal weiterreicht, macht diesen Test rot statt ihn blind.
   */
  const rumpfAus = (quelle: string, name: string): string | null => {
    const fn = new RegExp(`function\\s+${name}\\s*\\([^)]*\\)[^{]*\\{([\\s\\S]*?)\\n\\}`, "m");
    return quelle.match(fn)?.[1] ?? null;
  };

  const aufloesen = (ausdruck: string, tiefe = 0): string => {
    const aufruf = ausdruck.trim().match(/^([A-Za-z_]\w*)\s*\(/);
    if (!aufruf || tiefe > 1) return ausdruck;
    const name = aufruf[1];

    const eigen = rumpfAus(ohneKommentare, name);
    if (eigen) return aufloesen(eigen.replace(/^\s*return\s*/, ""), tiefe + 1);

    // Nicht im Modul: dem Import folgen.
    const imp = roh.match(new RegExp(`import\\s*\\{[^}]*\\b${name}\\b[^}]*\\}\\s*from\\s*"([^"]+)"`));
    if (!imp) return ausdruck;
    const ziel = join(ROOT, datei, "..", `${imp[1]}.ts`);
    let fremd: string;
    try {
      fremd = readFileSync(ziel, "utf8");
    } catch {
      return ausdruck;
    }
    const ohne = fremd
      .split("\n")
      .filter((z) => !/^\s*(\/\/|\/\*|\*)/.test(z))
      .join("\n");
    return rumpfAus(ohne, name) ?? ausdruck;
  };

  const holen = (feld: "title" | "description") => {
    const treffer: string[] = [];
    // Der Blick zurück verhindert, dass `ogImageSubtitle:` als `title:` zählt —
    // die erste Fassung dieses Tests ist genau daran falsch rot geworden.
    const re = new RegExp(`(?<![A-Za-z])${feld}:\\s*([\\s\\S]*?)(?=\\n\\s{4,6}\\w+:|\\n\\s*\\}\\),)`, "g");
    let m: RegExpExecArray | null;
    while ((m = re.exec(ohneKommentare))) treffer.push(aufloesen(m[1]));
    return treffer;
  };
  return { titel: holen("title"), beschreibung: holen("description") };
}

describe("Wortklassen: Atlas und Förderseiten fassen sich nicht ins Revier", () => {
  it("Atlas-Titel und -Beschreibungen tragen kein Geld-Wort", () => {
    for (const datei of ATLAS_SEITEN) {
      const { titel, beschreibung } = metaZeilen(datei);
      expect(titel.length + beschreibung.length, `${datei}: nichts gefunden — Muster kaputt?`).toBeGreaterThan(0);
      for (const stelle of [...titel, ...beschreibung]) {
        const fund = stelle.match(GELD_WOERTER);
        expect(
          fund?.[0] ?? null,
          `${datei}: Titel oder Beschreibung enthält das Geld-Wort '${fund?.[0]}'. ` +
            `Die Atlas-Seiten beantworten die Bestands-Frage; Förder-Wörter gehören auf ` +
            `/photovoltaik-foerderung. Sonst konkurrieren ab der Ortswelle zwei eigene ` +
            `Seiten um dieselbe Anfrage (docs/ortswelle-und-foerderseiten.md).`,
        ).toBeNull();
      }
    }
  });

  it("Atlas-Titel tragen ein Bestands-Wort", () => {
    for (const datei of ATLAS_SEITEN) {
      const { titel } = metaZeilen(datei);
      for (const stelle of titel) {
        expect(
          BESTANDS_WOERTER.test(stelle),
          `${datei}: Der Titel nennt weder Photovoltaik noch Solaranlagen. Genau das ` +
            `fehlte bis zum 18.08.2026 — das Wort mit der gemessenen Nachfrage (36 ` +
            `Anfragen, 140 Einblendungen) stand in keinem Titel.`,
        ).toBe(true);
      }
    }
  });

  it("die Förder-Stadtseite trägt umgekehrt ihr Geld-Wort im Titel", () => {
    const { titel } = metaZeilen(FOERDER_STADTSEITE);
    expect(titel.length, "Förder-Stadtseite: kein Titel gefunden — Muster kaputt?").toBeGreaterThan(0);
    for (const stelle of titel) {
      expect(
        GELD_WOERTER.test(stelle),
        "Die Förder-Stadtseite muss ihre Frage im Titel führen, sonst rutscht sie in " +
          "die Bestands-Anfragen der Atlas-Ortsseiten. Gemessen am 18.08.2026 tragen " +
          "bereits 33 von 108 ihrer sichtbaren Anfragen kein Geld-Wort.",
      ).toBe(true);
    }
  });
});
