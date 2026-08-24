import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

/**
 * Wer in einem Werbetext genannt wird, muss auch eine Zahl geliefert haben.
 *
 * Anlass (24.08.2026): Auf der Startseite und in der Vorschaubeschreibung des
 * Wärmepumpen-Rechners stand „transparent nach Fraunhofer ISE & BWP". Fraunhofer
 * stimmt — von dort kommen die Jahresarbeitszahlen. Der Bundesverband Wärmepumpe
 * dagegen kam im gesamten Projekt kein einziges Mal vor: keine Zahl, keine
 * Fundstelle, kein Dokument. Wir haben uns die Autorität eines Verbands geliehen,
 * von dem nichts stammt.
 *
 * Das ist keine Kleinigkeit, sondern zwei bekannte Fehlerklassen in einem Satz:
 * Gate-Regel 2 („Quelle ist, wer gemessen hat, nicht wer publiziert hat") und eine
 * Werbeaussage ohne Beleg nach § 5 UWG — auf der Startseite und in jeder
 * Suchergebnis- und Social-Media-Vorschau gleichzeitig.
 *
 * Der Test prüft deshalb nicht den Wortlaut, sondern die Aussage: Taucht in einem
 * nach außen sichtbaren Text der Name einer Institution auf, muss dieselbe
 * Institution irgendwo in den Rechenkernen oder im Quellenregister als Beleg
 * vorkommen. Eine reine Sperrliste für „BWP" wäre wertlos — beim nächsten Mal
 * heißt der Verband anders.
 */

const WURZEL = join(__dirname, "..", "..");
const SEITEN = join(WURZEL, "app", "(site)");

/**
 * Institutionen, die in Werbetexten vorkommen können. Der Test kann nicht raten,
 * was ein Eigenname ist — deshalb eine benannte Liste der Stellen, die in diesem
 * Themenfeld überhaupt als Quelle in Frage kommen. Wer eine neue nennt, trägt sie
 * hier ein und der Test verlangt sofort den Beleg.
 */
const INSTITUTIONEN: { name: string; muster: RegExp }[] = [
  { name: "Fraunhofer ISE", muster: /Fraunhofer/i },
  { name: "Verbraucherzentrale", muster: /Verbraucherzentrale/i },
  { name: "Bundesnetzagentur", muster: /Bundesnetzagentur/i },
  { name: "KfW", muster: /\bKfW\b/ },
  { name: "HTW Berlin", muster: /\bHTW\b/ },
  { name: "BWP (Bundesverband Wärmepumpe)", muster: /\bBWP\b/ },
  { name: "dena", muster: /\bdena\b/i },
  { name: "BDEW", muster: /\bBDEW\b/ },
  { name: "BAFA", muster: /\bBAFA\b/ },
  // Im Code steht die Stiftung meist unter ihrer Netzadresse „test.de" — beide
  // Schreibweisen zählen, sonst meldet der Test einen Beleg als fehlend, den es gibt.
  { name: "Stiftung Warentest", muster: /Stiftung Warentest|test\.de/i },
  { name: "Öko-Institut", muster: /Öko-Institut/i },
  { name: "Agora Energiewende", muster: /Agora/i },
];

/** Wo ein Beleg stehen darf: Rechenkerne, Configs, Quellenregister. */
function belegQuellen(): string {
  const lib = join(WURZEL, "lib");
  let text = "";
  for (const eintrag of readdirSync(lib)) {
    const pfad = join(lib, eintrag);
    if (!statSync(pfad).isFile() || !eintrag.endsWith(".ts")) continue;
    text += readFileSync(pfad, "utf8");
  }
  return text;
}

/** Alle nach außen sichtbaren Texte der öffentlichen Seiten. */
function werbetexte(): { datei: string; text: string }[] {
  const gefunden: { datei: string; text: string }[] = [];

  function lauf(verzeichnis: string) {
    for (const eintrag of readdirSync(verzeichnis)) {
      const pfad = join(verzeichnis, eintrag);
      if (statSync(pfad).isDirectory()) {
        lauf(pfad);
      } else if (eintrag === "page.tsx" || eintrag === "client.tsx") {
        const roh = readFileSync(pfad, "utf8");
        // Kommentarzeilen zählen nicht — dort steht die Begründung, warum eine
        // Quelle NICHT genannt wird, und die soll den Test nicht auslösen.
        const ohneKommentare = roh
          .replace(/\/\*[\s\S]*?\*\//g, "")
          .replace(/^\s*\/\/.*$/gm, "");
        gefunden.push({ datei: pfad.slice(WURZEL.length + 1), text: ohneKommentare });
      }
    }
  }

  lauf(SEITEN);
  return gefunden;
}

describe("Quellennennungen in Werbetexten", () => {
  const belege = belegQuellen();
  const seiten = werbetexte();

  it("nennt keine Institution, die im Projekt keine Zahl liefert", () => {
    const unbelegt: string[] = [];

    for (const { datei, text } of seiten) {
      for (const institution of INSTITUTIONEN) {
        if (!institution.muster.test(text)) continue;
        if (institution.muster.test(belege)) continue;
        unbelegt.push(`${datei} nennt „${institution.name}" — kein Beleg in lib/`);
      }
    }

    expect(
      unbelegt,
      "Eine Institution im Werbetext muss im Projekt auch eine Zahl beisteuern.\n" +
        "Entweder die Quelle wirklich verwenden und belegen — oder den Namen streichen.\n" +
        unbelegt.join("\n"),
    ).toEqual([]);
  });

  it("nennt den Bundesverband Wärmepumpe nicht mehr", () => {
    // Der konkrete Rückfall, gegen den dieser Test entstanden ist. Die Regel
    // darüber fängt ihn bereits — dieser Fall steht zusätzlich da, damit beim
    // nächsten Rotwerden sofort klar ist, was gemeint war.
    const treffer = seiten.filter((s) => /\bBWP\b/.test(s.text)).map((s) => s.datei);
    expect(treffer).toEqual([]);
  });
});
