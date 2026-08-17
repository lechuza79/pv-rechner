import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { STAND, standGeprueftIso, standLastModIso, monatJahr, tagMonatJahr } from "../stand";
import { DEFAULT_BALKON_CONFIG, BALKON_RECHT } from "../balkon-config";
import { DEFAULT_AIRCON_CONFIG } from "../aircon-config";
import { DEFAULT_HEATPUMP_CONFIG } from "../heatpump-config";
import { GREEN_GAS_CONFIG } from "../greengas-config";
import { CO2_PRICE } from "../co2-config";
import { FEED_IN_GEPRUEFT_ISO } from "../feedin-config";
import { EEG_REFORM_STAND } from "../eeg-reform-config";

/**
 * Kohärenz-Wächter für die sichtbare „Stand:"-Zeile unter den Rechnern.
 *
 * Die Zeile ist ein Vertrauenssignal: Sie behauptet, dass an einem bestimmten
 * Tag jemand die Quellen aufgeschlagen hat. Zwei Arten, sie zu ruinieren, sind
 * im Projekt schon vorgekommen — beide werden hier verboten:
 *
 *  1. Ein Datum, das mitläuft, ohne dass geprüft wurde (Förderprogramme trugen
 *     bis 16.08.2026 `updated_at` als „Zuletzt geprüft"). Deshalb: kein Datum
 *     aus der Build-Zeit, keines in der Zukunft.
 *  2. Ein Datum, das für mehrere Sachen gleichzeitig gelten soll. Marktpreise,
 *     Rechtsstand und Modellannahmen altern verschieden schnell; ein
 *     gemeinsames Datum wäre für mindestens eines gelogen.
 *
 * Dazu die strukturelle Frage: Jede Seite mit einer Stand-Zeile muss dasselbe
 * Datum auch als `lastmod` in die Sitemap geben — sonst steht das Recrawl-
 * Signal woanders als die Aussage.
 */

const ROOT = join(__dirname, "..", "..");
const HEUTE = new Date().toISOString().slice(0, 10);

/** Quelltext ohne Kommentare — sonst schlägt ein Verbot schon an der Stelle an,
 *  an der die Regel erklärt wird. */
const ohneKommentare = (quelle: string) =>
  quelle.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

/** Alle Configs, deren Prüfdatum in einer Stand-Zeile sichtbar wird — jede mit
 *  dem Paar aus Wertstand und Prüftag, das die Seite nebeneinander zeigt. */
const GEPRUEFT = [
  { name: "DEFAULT_AIRCON_CONFIG", geprueftIso: DEFAULT_AIRCON_CONFIG.geprueftIso, validFrom: DEFAULT_AIRCON_CONFIG.validFrom, reviewBy: DEFAULT_AIRCON_CONFIG.reviewBy },
  { name: "DEFAULT_HEATPUMP_CONFIG", geprueftIso: DEFAULT_HEATPUMP_CONFIG.geprueftIso, validFrom: DEFAULT_HEATPUMP_CONFIG.validFrom, reviewBy: DEFAULT_HEATPUMP_CONFIG.reviewBy },
  { name: "DEFAULT_HEATPUMP_CONFIG (Förderung)", geprueftIso: DEFAULT_HEATPUMP_CONFIG.geprueftFoerderungIso, validFrom: DEFAULT_HEATPUMP_CONFIG.validFrom, reviewBy: DEFAULT_HEATPUMP_CONFIG.reviewBy },
  { name: "GREEN_GAS_CONFIG", geprueftIso: GREEN_GAS_CONFIG.geprueftIso, validFrom: GREEN_GAS_CONFIG.validFrom, reviewBy: GREEN_GAS_CONFIG.reviewBy },
  { name: "GREEN_GAS_CONFIG (Rechtsstand)", geprueftIso: GREEN_GAS_CONFIG.geprueftRechtIso, validFrom: GREEN_GAS_CONFIG.validFrom, reviewBy: GREEN_GAS_CONFIG.reviewBy },
  { name: "CO2_PRICE", geprueftIso: CO2_PRICE.geprueftIso, validFrom: CO2_PRICE.validFrom, reviewBy: CO2_PRICE.reviewBy },
  { name: "BALKON_RECHT", geprueftIso: BALKON_RECHT.geprueftIso, validFrom: DEFAULT_BALKON_CONFIG.validFrom, reviewBy: DEFAULT_BALKON_CONFIG.reviewBy },
  { name: "DEFAULT_BALKON_CONFIG", geprueftIso: DEFAULT_BALKON_CONFIG.geprueftIso, validFrom: DEFAULT_BALKON_CONFIG.validFrom, reviewBy: DEFAULT_BALKON_CONFIG.reviewBy },
];

describe("Stand-Zeile: nur stempeln, was geprüft wurde", () => {
  it("kein Prüfdatum liegt in der Zukunft", () => {
    for (const [pfad, seite] of Object.entries(STAND)) {
      for (const e of seite.eintraege) {
        expect(e.iso <= HEUTE, `${pfad}: „${e.was}" trägt ${e.iso} — das liegt in der Zukunft`).toBe(true);
      }
    }
  });

  it("kein Prüfdatum kommt aus der Build-Zeit", () => {
    // Das Verbot gilt für lib/stand.ts UND für jede Config, aus der ein
    // Prüfdatum kommt. Nur stand.ts zu prüfen war eine Lücke (Prüfagent,
    // 17.08.2026): `geprueftIso: new Date().toISOString().slice(0,10)` in einer
    // Config wäre an allen Tests vorbeigelaufen — kein Zukunftsdatum, Frist
    // später, Prüftag nach Wertstand — und hätte trotzdem genau das getan, was
    // dieses Feature verbietet: eine Prüfung behaupten, die nie stattfand.
    // `new Date(iso)` bleibt erlaubt; verboten ist das argumentlose „jetzt".
    const dateien = [
      "lib/stand.ts", "lib/pruefstand.ts",
      "lib/aircon-config.ts", "lib/balkon-config.ts", "lib/co2-config.ts",
      "lib/feedin-config.ts", "lib/greengas-config.ts", "lib/heatpump-config.ts",
      "lib/eeg-reform-config.ts",
    ];
    for (const datei of dateien) {
      const quelle = ohneKommentare(readFileSync(join(ROOT, datei), "utf8"));
      // Zeilen mit einem Prüf-/Standdatum: dort ist „jetzt" nie zulässig.
      for (const zeile of quelle.split("\n")) {
        if (!/(geprueft\w*Iso|validFrom|GEPRUEFT_ISO)\s*[:=]/.test(zeile)) continue;
        expect(zeile, `${datei}: Prüfdatum aus der Laufzeit`).not.toMatch(/new Date\(\s*\)|Date\.now\(/);
      }
    }
  });

  it("das Datum passt zu seiner Genauigkeit", () => {
    for (const [pfad, seite] of Object.entries(STAND)) {
      for (const e of seite.eintraege) {
        const muster = e.praezision === "tag" ? /^\d{4}-\d{2}-\d{2}$/ : /^\d{4}-\d{2}$/;
        expect(e.iso, `${pfad}: „${e.was}" ist ${e.praezision}genau, trägt aber ${e.iso}`).toMatch(muster);
      }
    }
  });

  it("jede Config hat eine Frist, die nach ihrem Prüfdatum liegt", () => {
    // Ein Prüfdatum, das seine eigene Frist überholt hat, heißt: Es hat jemand
    // geprüft und vergessen, den nächsten Termin zu setzen — dann fällt die
    // Config aus dem Wächter-Rhythmus, ohne dass es auffällt.
    for (const c of GEPRUEFT) {
      expect(c.geprueftIso <= HEUTE, `${c.name}.geprueftIso liegt in der Zukunft`).toBe(true);
      expect(
        c.reviewBy > c.geprueftIso,
        `${c.name}: reviewBy (${c.reviewBy}) liegt nicht nach geprueftIso (${c.geprueftIso})`
      ).toBe(true);
    }
  });

  it("das Prüfdatum ist nie älter als der Stand der Werte", () => {
    // `validFrom` = von wann sind die Werte, `geprueftIso` = wann sah jemand
    // nach. Wer einen Wert ändert, hat ihn zwangsläufig gerade geprüft — ein
    // Prüfdatum VOR dem Wertstand wäre also unmöglich und zeigt an, dass beim
    // Ändern nur eines von beiden nachgezogen wurde.
    for (const c of GEPRUEFT) {
      // Monatsgenaue Stände (Balkon) auf den Monatsanfang vergleichen.
      const stand = c.validFrom.length === 7 ? `${c.validFrom}-01` : c.validFrom;
      expect(
        c.geprueftIso >= stand,
        `${c.name}: geprueftIso (${c.geprueftIso}) liegt vor validFrom (${c.validFrom})`
      ).toBe(true);
    }
  });
});

describe("Stand-Zeile: getrennte Daten für getrennte Sachen", () => {
  it("jede Seite nennt entweder geprüfte Stände oder ihre Live-Werte", () => {
    for (const [pfad, seite] of Object.entries(STAND)) {
      expect(
        seite.eintraege.length + seite.live.length,
        `${pfad}: leerer Eintrag — dann gehört die Seite nicht in STAND`
      ).toBeGreaterThan(0);
    }
  });

  it("keine Seite nennt dieselbe Sache zweimal", () => {
    for (const [pfad, seite] of Object.entries(STAND)) {
      const was = seite.eintraege.map(e => e.was);
      expect(new Set(was).size, `${pfad}: „${was.join(", ")}" enthält eine Dopplung`).toBe(was.length);
    }
  });

  it("die Daten kommen aus den Configs, nicht aus lib/stand.ts", () => {
    // Ein hier getipptes Datum wäre eine Zweitkopie — sie bliebe beim nächsten
    // Wächter-Lauf zurück, und die Seite behauptete eine Prüfung von gestern.
    const quelle = ohneKommentare(readFileSync(join(ROOT, "lib", "stand.ts"), "utf8"));
    const tabelle = quelle.slice(quelle.indexOf("export const STAND"), quelle.indexOf("export const monatJahr"));
    expect(tabelle).not.toMatch(/iso:\s*["'`]/);
  });

  it("die sichtbaren Daten sind die der Configs", () => {
    const iso = (pfad: string, was: string) => STAND[pfad].eintraege.find(e => e.was === was)?.iso;
    expect(iso("/waermepumpe-rechner", "Anschaffung und Tarife")).toBe(DEFAULT_HEATPUMP_CONFIG.geprueftIso);
    expect(iso("/waermepumpe-rechner", "BEG-Förderung")).toBe(DEFAULT_HEATPUMP_CONFIG.geprueftFoerderungIso);
    expect(iso("/waermepumpe-rechner", "Grüngas-Pflicht")).toBe(GREEN_GAS_CONFIG.geprueftRechtIso);
    expect(iso("/waermepumpe-rechner", "Gaspreis-Bestandteile")).toBe(GREEN_GAS_CONFIG.geprueftIso);
    expect(iso("/waermepumpe-rechner", "CO₂-Preispfad")).toBe(CO2_PRICE.geprueftIso);
    expect(iso("/klimaanlage-stromkosten", "Gerätepreise und Effizienzen")).toBe(DEFAULT_AIRCON_CONFIG.geprueftIso);
    expect(iso("/photovoltaik-rechner", "EEG-Vergütungssätze")).toBe(FEED_IN_GEPRUEFT_ISO);
    expect(iso("/photovoltaik-rechner", "Sachstand der EEG-Reform 2027")).toBe(EEG_REFORM_STAND.geprueftIso);
    expect(iso("/balkonkraftwerk-rechner", "rechtliche Angaben")).toBe(BALKON_RECHT.geprueftIso);
    expect(iso("/balkonkraftwerk-rechner", "Set- und Speicherpreise")).toBe(DEFAULT_BALKON_CONFIG.geprueftIso);
  });
});

describe("Stand-Zeile: dasselbe Datum steht in der Sitemap", () => {
  const sitemap = readFileSync(join(ROOT, "app", "sitemap.ts"), "utf8");

  it("das lastmod folgt den WERTEN, nicht dem Prüftag", () => {
    // Der Unterschied ist die ganze Regel: Zwei Prüfdaten werden täglich
    // nachgezogen. Hinge das lastmod daran, meldete die Sitemap jeden Tag eine
    // Änderung, die keine ist — und Google entwertet das Signal domainweit.
    for (const [pfad, seite] of Object.entries(STAND)) {
      const werte = seite.eintraege
        .map(e => e.wertIso)
        .filter((iso): iso is string => !!iso)
        .map(iso => (iso.length === 7 ? `${iso}-01` : iso))
        .sort();
      expect(standLastModIso(pfad), `${pfad}: lastmod weicht vom jüngsten Wertstand ab`).toBe(
        werte.length ? werte[werte.length - 1] : undefined
      );
    }
  });

  it("ein täglich nachgezogenes Prüfdatum bewegt das lastmod nicht", () => {
    // Nachgestellt: Der tägliche Wächter stempelt den Rechtsstand auf morgen.
    // Der Prüftag der Seite wandert mit, das lastmod darf es nicht.
    const vorher = standLastModIso("/waermepumpe-rechner");
    const seite = STAND["/waermepumpe-rechner"];
    const recht = seite.eintraege.find(e => e.was === "Grüngas-Pflicht")!;
    const alt = recht.iso;
    try {
      recht.iso = "2099-01-01";
      expect(standGeprueftIso("/waermepumpe-rechner")).toBe("2099-01-01");
      expect(standLastModIso("/waermepumpe-rechner")).toBe(vorher);
    } finally {
      recht.iso = alt;
    }
  });

  it("eine Seite ohne Wertstand bekommt kein lastmod", () => {
    // Die Live-Simulation hat keinen Stichtag. Einen zu erfinden wäre schlimmer
    // als keinen zu haben.
    expect(standLastModIso("/pv-simulation")).toBeUndefined();
    expect(standLastModIso("/gibt-es-nicht")).toBeUndefined();
  });

  it("jede Seite mit Stand-Zeile steht mit ihrem Datum in der Sitemap", () => {
    for (const pfad of Object.keys(STAND)) {
      if (!standLastModIso(pfad)) continue;
      expect(sitemap, `${pfad} trägt einen Wertstand, aber die Sitemap holt ihn nicht`).toMatch(
        new RegExp(`\\$\\{BASE_URL\\}${pfad}\`,\\s*lastModified: rechnerStand\\("${pfad}"\\)`)
      );
    }
  });

  it("jede Seite mit <StandNote> hat einen Eintrag — und umgekehrt", () => {
    const seiten = join(ROOT, "app", "(site)");
    const gefunden = new Set<string>();
    const suchen = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) suchen(p);
        else if (name.endsWith(".tsx")) {
          for (const m of readFileSync(p, "utf8").matchAll(/StandNote\s+pfad="([^"]+)"/g)) gefunden.add(m[1]);
        }
      }
    };
    suchen(seiten);
    expect([...gefunden].sort()).toEqual(Object.keys(STAND).sort());
  });
});

describe("Stand-Zeile: Formulierung", () => {
  it("schreibt Monat und Tag aus, statt ISO zu zeigen", () => {
    expect(monatJahr("2026-07")).toBe("Juli 2026");
    expect(tagMonatJahr("2026-08-16")).toBe("16. August 2026");
  });
});
