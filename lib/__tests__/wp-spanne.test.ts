import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { calcHeatPumpScenarios, type HeatPumpInputs } from "../heatpump";
import { DEFAULT_HEATPUMP_CONFIG } from "../heatpump-config";

/**
 * Die Bandbreite unter der großen Zahl — und was NICHT hineingehört.
 *
 * Beanstandet vom Betreiber am 05.09.2026: Unter einem Ergebnis von
 * +25.165 € stand „Je nach Annahme sind es −18.010 € bis +39.029 €". Seine
 * Reaktion: „damit ist unser ergebnis ja für die tonne" — und er hatte recht,
 * eine Spanne, die das Vorzeichen wechselt, entwertet die Zahl darüber.
 *
 * DIE URSACHE WAR KEIN DARSTELLUNGSFEHLER. Die Spanne mischte zwei Fragen
 * verschiedener Art:
 *
 *   „Wie stark steigen die Energiepreise?" — offen, drei Pfade, gehört in die
 *   Spanne. Das ist der Zweck des Satzes: Wir behaupten keine Preisprognose.
 *
 *   „Kommt die Grüngas-Pflicht?" — ein beschlossenes Gesetz, kein Münzwurf.
 *   Wer sie in dieselbe Spanne wirft, behandelt geltendes Recht wie eine
 *   Annahme, und das Minimum stammt dann aus dem Fall „Gesetz kommt nicht UND
 *   Strom wird teuer UND Gas bleibt billig".
 *
 * Für den zweiten Fall gibt es den Umschalter darüber, der beide Rechtslagen
 * nebeneinanderstellt. Die Spanne bleibt bei den Preisen.
 */

const WURZEL = path.resolve(__dirname, "..", "..");
const RECHNER = path.join(WURZEL, "app", "(site)", "waermepumpe-rechner", "waermepumpe.tsx");
const quelle = () => fs.readFileSync(RECHNER, "utf-8");

/**
 * Nur der Text, den ein Nutzer sieht — Kommentare weggeschnitten.
 *
 * Ohne das schlägt der Test an seiner eigenen Begründung an: Der Kommentar an
 * der Anzeigestelle zitiert den entfernten Satz, um zu erklären, warum er weg
 * ist. Dieselbe Falle wie beim Werbe-Wächter am selben Tag — dort las die erste
 * Fassung Zeilen mitten in einem Blockkommentar mit und meldete einen
 * Fehlalarm, der eine echte Prüfung wie ein Versäumnis aussehen ließ.
 */
const sichtbar = () =>
  quelle()
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((z) => !/^\s*\/\//.test(z))
    .join("\n");

/**
 * Ein unsanierter Altbau mit alten Heizkörpern — der Fall aus der Beanstandung.
 *
 * Bewusst minimal gehalten wie im Bestandstest: Jedes zusätzlich gesetzte Feld
 * ist eine Annahme, die die Rechnung mitträgt, ohne dass dieser Test etwas
 * darüber aussagen will.
 */
const ALTBAU: HeatPumpInputs = {
  situation: "bestand",
  wohnflaeche: 140,
  insulationIdx: 0,
  personen: 3.5,
  heizsystem: "hk_alt",
  wpType: "lwwp",
};

describe("Bandbreite unter der Einsparung", () => {
  it("rechnet beide Rechtslagen getrennt und vollständig durch", () => {
    // Der Kern der Korrektur: Bis 05.09.2026 gab es die Grüngas-Rechnung nur
    // als EINEN Wert (mittlerer Preispfad), die Pfade ohne Pflicht dagegen als
    // drei. Wer eine Bandbreite wollte, musste deshalb die Rechtslage in die
    // Preisspanne mischen.
    //
    // Der frühere Test verglich hier, ob die gemischte Spanne breiter ist. Das
    // trug, solange die Preispfade weit auseinanderlagen (+5 % gegen +1 %
    // Strom) — mit den belegten Pfaden vom selben Tag liegen beide Minima auf
    // demselben Wert, und ein „echt breiter" wäre eine Aussage über die
    // Zahlenwerte statt über die Struktur. Geprüft wird jetzt die Struktur.
    const mit = calcHeatPumpScenarios({ ...ALTBAU, greenGas: true }, DEFAULT_HEATPUMP_CONFIG);
    const ohne = calcHeatPumpScenarios({ ...ALTBAU, greenGas: false }, DEFAULT_HEATPUMP_CONFIG);

    expect(mit).toHaveLength(3);
    expect(ohne).toHaveLength(3);

    // Und die beiden Sätze sind wirklich zwei Rechnungen, keine Kopie: Die
    // Grüngas-Pflicht verteuert Gas, die Wärmepumpe spart dadurch mehr.
    for (const id of ["pessimistic", "realistic", "optimistic"]) {
      const a = mit.find((s) => s.id === id)!.tcoEinsparung;
      const b = ohne.find((s) => s.id === id)!.tcoEinsparung;
      expect(a, `${id}: Grüngas ändert nichts`).not.toBe(b);
    }
  });

  it("enthält die angezeigte Zahl", () => {
    // Eine Bandbreite, die den eigenen Wert nicht einschließt, ist die
    // schlimmste Form: Sie sieht nach Sorgfalt aus und widerspricht der Zahl
    // darüber.
    const mit = calcHeatPumpScenarios({ ...ALTBAU, greenGas: true }, DEFAULT_HEATPUMP_CONFIG);
    const angezeigt = mit.find((s) => s.id === "realistic")!.tcoEinsparung;
    const min = Math.min(...mit.map((s) => s.tcoEinsparung));
    const max = Math.max(...mit.map((s) => s.tcoEinsparung));
    expect(angezeigt).toBeGreaterThanOrEqual(min);
    expect(angezeigt).toBeLessThanOrEqual(max);
  });

  it("rechnet die Grüngas-Pflicht in allen drei Preispfaden durch", () => {
    // Vorher gab es sie nur als einen Wert (mittlerer Pfad). Genau deshalb
    // musste die Spanne auf die Pfade OHNE Pflicht zurückgreifen.
    const mit = calcHeatPumpScenarios({ ...ALTBAU, greenGas: true }, DEFAULT_HEATPUMP_CONFIG);
    const werte = mit.map((s) => s.tcoEinsparung);
    expect(new Set(werte).size, "drei Pfade, aber identische Werte").toBe(3);
  });

  it("zieht die Grüngas-Zahl aus dem Szenarien-Satz, nicht aus einer zweiten Rechnung", () => {
    // Zwei Aufrufe derselben Größe laufen beim nächsten Umbau auseinander.
    const t = quelle();
    expect(t).toMatch(/scenariosGruengas\.find\(s => s\.id === "realistic"\)/);
    expect(t).not.toMatch(/gruengasResult = useMemo\(\(\) => calcHeatPump\(/);
  });

  it("zeigt gar keine Bandbreite mehr unter der großen Zahl", () => {
    // BETREIBER-ENTSCHEIDUNG 05.09.2026. Die Bandbreite kam Ende Juli dazu,
    // nachdem ein Nutzer die einzelne Zahl als Prognose gelesen hatte —
    // richtige Absicht, falsches Mittel. Sie wechselte in sechs von acht
    // durchgerechneten Gebäudefällen das Vorzeichen und entwertete damit die
    // Zahl, unter der sie stand.
    //
    // An ihre Stelle tritt die Angabe, WELCHES Modell gerechnet wird, mit dem
    // Weg zu den anderen. Die Unsicherheit verschwindet dadurch nicht: Sie
    // steht im Preis-Block, und Strompreis, Gaspreis und Jahresarbeitszahl
    // sind im Ergebnis einzeln editierbar.
    const t = sichtbar();
    expect(t).not.toMatch(/Je nach Annahme sind es/);
    expect(t).not.toMatch(/spanne\.min|spanne\.max/);
    // Und der Ersatz ist wirklich da — sonst stünde die Zahl nackt.
    expect(t).toMatch(/Gerechnet mit/);
    expect(t).toMatch(/Künftige Energiepreise kennt niemand/);
  });

  it("verweist auf den Block, in dem die Modelle erklärt und umschaltbar sind", () => {
    // Ohne den Verweis wäre die Angabe „gerechnet mit Modell X" eine Sackgasse:
    // Der Leser erführe, dass es Annahmen gibt, aber nicht, wo er sie sieht.
    const t = quelle();
    expect(t).toMatch(/preisBlockRef/);
    expect(t).toMatch(/setPreisExpanded\(true\)/);
  });
});
