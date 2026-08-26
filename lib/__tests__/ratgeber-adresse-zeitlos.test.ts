import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { RATGEBER } from "../ratgeber";

/**
 * Die Jahreszahl gehört in den TITEL, nicht in die Adresse.
 *
 * Entschieden am 26.08.2026, nachdem drei unabhängige Prüfer die Gegenposition
 * gemessen statt behauptet hatten (DataForSEO, Deutschland):
 *
 *   - jahreslos „wärmepumpe förderung": 33.100/Monat, ganzjährig stabil
 *   - „wärmepumpe förderung 2025" heute: 40/Monat — nach 6.600 im Vorjahr,
 *     also ein Einbruch um 93 % zum Jahreswechsel
 *   - auf der Anfrage MIT Jahr stehen die Plätze 1–3 trotzdem auf jahreslosen
 *     Adressen (KfW, ADAC, Bosch), jeweils mit dem Jahr im Titel
 *   - unsere über hundert Förderseiten machen es längst so: Jahr im Titel,
 *     nie im Pfad. Der Ratgeber war der einzige Ausreißer im eigenen Haus.
 *
 * **Was hier NICHT als Begründung gilt:** „Google rät von Jahreszahlen in
 * Adressen ab." Search Central sagt zu Datumsangaben in Pfaden überhaupt
 * nichts — geprüft am 26.08.2026. Die Behauptung kursiert nur über
 * Sekundärquellen, genau wie die über Verzeichnistiefe, die hier schon einmal
 * zweieinhalb Wochen als Google-Aussage im Regelwerk stand.
 */
const REPO = join(__dirname, "..", "..");
const lies = (p: string) => readFileSync(join(REPO, p), "utf8");

const SEITE = "app/(site)/ratgeber/waermepumpe-foerderung/page.tsx";
const ALT_FLACH = "/waermepumpe-foerderung-2026";
const ALT_RATGEBER = "/ratgeber/waermepumpe-foerderung-2026";
const NEU = "/ratgeber/waermepumpe-foerderung";

describe("Ratgeber-Adresse ohne Jahreszahl", () => {
  it("kein Ratgeber-Slug trägt eine Jahreszahl", () => {
    for (const eintrag of RATGEBER) {
      expect(eintrag.slug, `${eintrag.slug} trägt ein Jahr im Pfad`).not.toMatch(/-20\d\d(\/|$)/);
    }
  });

  it("der Registry-Titel trägt kein Jahr — er ist eine feste Zeichenkette", () => {
    // Er speist Übersicht, Krümelspur und Sitemap. Ein Jahr darin wäre am
    // 1. Januar an drei Stellen gleichzeitig falsch.
    const eintrag = RATGEBER.find((r) => r.slug === NEU);
    expect(eintrag, "Ratgeber-Eintrag fehlt").toBeDefined();
    expect(eintrag!.title).not.toMatch(/20\d\d/);
  });

  it("die Seite tippt ihr Jahr nicht, sondern nimmt es aus dem Kalender", () => {
    const src = lies(SEITE);
    expect(src).toMatch(/const JAHR = new Date\(\)\.getFullYear\(\)/);
    // Überschrift, Seitentitel, Krümelspur und das Bild für soziale Netze —
    // alle vier aus derselben Größe. Bliebe eine davon fest, sagte sie am
    // 1. Januar etwas anderes als die Zahlen darunter.
    for (const stelle of [
      /title: `Wärmepumpen-Förderung \$\{JAHR\}/,
      /ogImageTitle: `Wärmepumpen-Förderung \$\{JAHR\}`/,
      /label: `Wärmepumpen-Förderung \$\{JAHR\}`/,
      /<h1[^>]*>Wärmepumpen-Förderung \{JAHR\}/,
      /headline=\{`Wärmepumpen-Förderung \$\{JAHR\}/,
    ]) {
      expect(src, `Stelle ohne JAHR: ${stelle}`).toMatch(stelle);
    }
    expect(src).not.toMatch(/Wärmepumpen-Förderung 20\d\d/);
  });

  it("beide alten Pfade springen DIREKT auf das Ziel — keine Kette", () => {
    // Die Seite ist im Juli 2026 schon einmal umgezogen; der damalige Eintrag
    // zeigte auf die -2026-Adresse. Wer ihn stehen lässt und die neue
    // Weiterleitung danebenhängt, baut zwei Sprünge hintereinander — Google
    // folgt ihnen, überträgt die Signale aber über den Umweg, und der nächste
    // Umzug verlängert die Kette.
    const cfg = lies("next.config.js");
    const block = cfg.slice(cfg.indexOf("async redirects()"));
    const ziele = new Map<string, string>();
    for (const m of block.matchAll(/source:\s*"([^"]+)"[^}]*?destination:\s*"([^"]+)"/g)) {
      ziele.set(m[1], m[2]);
    }
    expect(ziele.get(ALT_FLACH), "flacher Altpfad zeigt nicht aufs Endziel").toBe(NEU);
    expect(ziele.get(ALT_RATGEBER), "alter Ratgeber-Pfad fehlt oder zeigt falsch").toBe(NEU);
    // Und kein Ziel darf selbst wieder Quelle sein.
    for (const [quelle, ziel] of ziele) {
      expect(ziele.has(ziel), `${quelle} → ${ziel} → … ist eine Kette`).toBe(false);
    }
  });

  it("die Zeitleiste ersetzt den Archiv-Artikel — aus dem Fahrplan, nicht getippt", () => {
    // Der Betreiber fragte, ob die auslaufende Fassung eine eigene Seite
    // bekommt. Gemessen: 40 Aufrufe im Monat für die Vorjahres-Anfrage gegen
    // 33.100 zeitlos. Eine zweite Seite wäre kein Verkehr, sondern eine zweite
    // Fläche mit Förderbeträgen — dieselbe Zweitfassung, die dieses Projekt bei
    // Zahlen überall verbietet. Stattdessen: alle Stufen in EINER Tabelle, die
    // von selbst ins Archiv hineinwächst.
    const src = lies(SEITE);
    expect(src).toMatch(/BEG_FAHRPLAN\.map/);
    expect(src).toMatch(/Alle Stufen auf einen Blick/);
    // Der Antragstag entscheidet, nicht der Einbau — sonst rechnet jemand mit
    // der falschen Zeile.
    expect(src).toMatch(/Tag, an dem der Antrag eingeht — nicht der Einbau/);
    // Und ab 2027 ist „15 %" allein die halbe Auskunft: Der EU-Bonus gibt
    // dieselben 15 Punkte zurück. Eine Spalte ohne diese Bedingung wäre genau
    // die Zahl-ohne-Bedingung, die diesen Abschnitt schon einmal falsch machte.
    expect(src).toMatch(/BEG_WERTSCHOEPFUNGS_BONUS\.abIso/);
    expect(src).toMatch(/bei EU-Ursprung/);
    // Die erste Fahrplan-Stufe heißt „heute". Als Zeilenbeschriftung wäre das
    // ein Etikett, das mit der Zeit lügt — 2027 stünde „heute" über „vorbei".
    // Sie trägt deshalb ihren Stichtag.
    expect(src).toMatch(/stufe\.bezeichnung === "heute" \? formatFullDate\(stufe\.abIso\)/);
  });

  it("niemand verlinkt die alte Adresse", () => {
    // nav-aktiv.test.ts prüft das allgemein; hier steht es zusätzlich, weil
    // sechzehn offene Arbeitsstände den alten Pfad tragen und ihn beim
    // Zusammenführen still zurückbringen könnten.
    for (const pfad of [
      SEITE,
      "lib/beg-antrag.ts",
      "lib/faq.ts",
      "lib/ratgeber.ts",
      "e2e/routen.ts",
      "app/(site)/ratgeber/gasheizung-oder-waermepumpe/page.tsx",
    ]) {
      // Kommentarzeilen fliegen vorher raus. Der Umzug ist im Seitenkopf
      // begründet, und diese Begründung nennt die alte Adresse zwangsläufig.
      // Ein Test, der auch Kommentare trifft, zwingt dazu, die Begründung zu
      // löschen — dann steht beim nächsten Mal wieder niemand da, der weiß warum.
      const ohneKommentare = lies(pfad)
        .split("\n")
        .filter((z) => !/^\s*(\/\/|\/\*|\*)/.test(z))
        .join("\n");
      expect(ohneKommentare, `${pfad} verlinkt noch die alte Adresse`).not.toContain(ALT_RATGEBER);
    }
  });
});
