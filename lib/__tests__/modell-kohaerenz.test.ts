import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { calcHeatPump, type HeatPumpInputs } from "../heatpump";
import { DEFAULT_HEATPUMP_CONFIG as CFG } from "../heatpump-config";
import { greenGasApplies } from "../fossil-reference";
import { INSULATION_BESTAND, WP_FUEL_OPTIONS } from "../constants";
import { calc } from "../calc";
import { einspeiseVerlauf } from "../einspeise-regime";

/**
 * Wächter gegen INKOHÄRENTE MODELLE.
 *
 * Warum es diesen Test gibt (28.07.2026): An einem Tag sind vier Fehler
 * aufgetreten, die alle dieselbe Form hatten — ein Kostenblock stammte aus dem
 * einen Fall, ein anderer aus dem anderen:
 *
 *   · Die Beimischungspflicht wurde gerechnet (gilt nur für NEU eingebaute
 *     Heizungen), die Anschaffung dieser Heizung aber nicht angesetzt.
 *   · Ein alter Kessel mit 80 % Nutzungsgrad wurde als NEU eingebaute Heizung
 *     verkauft — rund 14.000 € geschenkter Vorteil für die Wärmepumpe.
 *   · Dieselbe Zahl hieß an zwei Stellen „Heizlast" und meinte zweimal etwas
 *     anderes (Gebäude vs. Anlage), 18 % Unterschied im Preis.
 *   · Die Aufschlüsselung rechnete ein anderes Szenario als die Überschrift.
 *
 * KEINER dieser Fehler ist im Browser zu sehen: Eine Zahl sieht man nicht an,
 * mit welchem Wirkungsgrad sie entstanden ist. Der Betreiber kann sie deshalb
 * nicht abnehmen — diese Prüfung muss die Abnahme ersetzen.
 *
 * Der Test prüft nicht einzelne Werte (das tun die Fach-Tests), sondern
 * INVARIANTEN: Aussagen, die über JEDE Eingabe gelten müssen, damit das Modell
 * in sich geschlossen bleibt. Sie sind so formuliert, dass sie auch anschlagen,
 * wenn jemand eine neue Option, eine neue Stufe oder einen neuen Rechner
 * hinzufügt — genau dann rutschen solche Fehler nämlich durch.
 */

const ROOT = join(__dirname, "..", "..");

/** Alle Bestands-Eingaben, die der Rechner zulässt — als Kreuzprodukt. */
function alleEingaben(): HeatPumpInputs[] {
  const out: HeatPumpInputs[] = [];
  for (const wohnflaeche of [80, 140, 220]) {
    for (let insulationIdx = 0; insulationIdx < INSULATION_BESTAND.length; insulationIdx++) {
      for (const heizsystem of ["fbh", "hk_neu", "hk_alt"] as const) {
        for (const fuel of WP_FUEL_OPTIONS) {
          out.push({
            situation: "bestand", wohnflaeche, insulationIdx, personen: 2,
            heizsystem, wpType: "lwwp", fuelKind: fuel.kind,
            override: { gasPrice: fuel.price, gasEfficiency: fuel.efficiency, gasCo2: fuel.co2PerKwh },
          });
        }
      }
    }
  }
  return out;
}

describe("Modell-Kohärenz: kein halber Fall", () => {
  it("die Beimischungspflicht gilt genau dann, wenn eine Heizung neu eingebaut wird", () => {
    // Der Kernfehler des Tages, als Regel festgenagelt. § 43 Abs. 1 GModG knüpft
    // die Pflicht an den Neueinbau — wer sie rechnet, muss auch dessen Kosten
    // ansetzen, und wer sie nicht rechnet, darf sie auch nicht behaupten.
    expect(greenGasApplies({ fuelKind: "gas", fossilInvest: CFG.fossilErsatzInvest })).toBe(true);
    expect(greenGasApplies({ fuelKind: "gas", fossilInvest: 0 })).toBe(false);
    // Heizöl: Das Gesetz erfasst es zwar gleichrangig, aber unser Preispfad
    // modelliert nur den Gas-Mix. Solange das so ist, wird sie hier nicht gerechnet
    // — sichtbar ausgewiesen im Ergebnis (siehe waermepumpe.tsx).
    expect(greenGasApplies({ fuelKind: "oil", fossilInvest: CFG.fossilErsatzInvest })).toBe(false);
  });

  it("ohne Anschaffung nie ein Grüngas-Aufschlag — über alle Eingaben", () => {
    // Diese Lücke war zwischenzeitlich offen: Die Oberfläche blendete das Szenario
    // aus, die Rechnung schlug es trotzdem auf. Ein UI-Guard reicht nicht.
    for (const inp of alleEingaben()) {
      const ohne = calcHeatPump({ ...inp, greenGas: false, override: { ...inp.override, fossilErsatzInvest: 0 } });
      const mit = calcHeatPump({ ...inp, greenGas: true, override: { ...inp.override, fossilErsatzInvest: 0 } });
      expect(mit.tcoGas).toBe(ohne.tcoGas);
    }
  });

  it("wird eine Heizung neu eingebaut, ist es kein Altgerät", () => {
    // „Alter Gaskessel" (80 %) als Neuanlage zu rechnen, war der teuerste Einzelfehler.
    // Neugeräte und Bestandsanlagen sind in WP_FUEL_OPTIONS getrennt markiert; diese
    // Trennung darf nicht verlorengehen, wenn jemand eine Option ergänzt.
    for (const f of WP_FUEL_OPTIONS) {
      if (f.bestandsanlage) continue;
      expect(f.efficiency, `${f.label} ist als Neugerät gelistet`).toBeGreaterThanOrEqual(0.85);
    }
    expect(WP_FUEL_OPTIONS.some(f => f.bestandsanlage)).toBe(true);
  });
});

describe("Modell-Kohärenz: eine Größe, eine Bedeutung", () => {
  it("Heizlast und Auslegung laufen nie zusammen — über alle Eingaben", () => {
    for (const inp of alleEingaben()) {
      const r = calcHeatPump(inp);
      // Die Anlage ist kleiner als die Heizlast des Gebäudes (oder auf der 4-kW-
      // Untergrenze). Fielen beide zusammen, wäre der Auslegungsfaktor verlorengegangen.
      expect(r.auslegungKw <= r.heizlastKw || r.auslegungKw === 4).toBe(true);
    }
  });

  it("die Bilanz geht über alle Eingaben auf den Euro auf", () => {
    // Fängt jeden Posten, der künftig hinzugefügt und in einer der beiden Summen
    // vergessen wird — die häufigste Art, wie ein TCO-Vergleich still kippt.
    for (const inp of alleEingaben()) {
      const r = calcHeatPump(inp);
      expect(r.tcoGas).toBe(r.gasKosten + r.gasFix + r.gasWartung + r.gasInvest);
      expect(r.tcoWp).toBe(r.investNetto + r.stromKosten + r.wartungWp - r.pvBenefit);
      expect(r.tcoEinsparung).toBe(Math.round(r.tcoGas - r.tcoWp));
      // Und die Kurve, die den Nutzern die Amortisation zeigt, folgt derselben Summe.
      expect(Math.abs(r.years[r.years.length - 1].kum - r.tcoEinsparung)).toBeLessThanOrEqual(25);
    }
  });
});

describe("Modell-Kohärenz: Skalen wachsen mit", () => {
  /**
   * Eine feste Position in einer Liste, die wachsen kann, ist eine stille Bombe:
   * Als die vierte Dämmstufe dazukam, fiel sie im Klima-Rechner beinahe weg, weil
   * die Stufen dort einzeln per Index abgeschrieben waren — kein Typfehler, kein
   * roter Test, nur eine Auswahl, die weniger anbietet als die andere.
   */
  const DATEIEN = [
    "lib/aircon-config.ts",
    "lib/heatpump-config.ts",
    "app/(site)/waermepumpe-rechner/waermepumpe.tsx",
    "app/(site)/datenstand/page.tsx",
  ];
  /** INSULATION_BESTAND[2] o. ä. — eine hart adressierte Stufe. */
  const FESTER_INDEX = /INSULATION_(BESTAND|NEUBAU)\s*\[\s*\d+\s*\]/g;
  /** Begründete Ausnahmen: Position ist hier die Aussage, nicht ein Zugriff. */
  const ERLAUBT = [
    { fragment: "INSULATION_NEUBAU[0]", grund: "Neubau-Mindeststandard als bewusster Bucket (Klima-Rechner) bzw. schlechtester Fall einer Spanne" },
  ];

  it("keine hart adressierte Dämmstufe", () => {
    const funde: string[] = [];
    for (const datei of DATEIEN) {
      let inhalt: string;
      try {
        inhalt = readFileSync(join(ROOT, datei), "utf8");
      } catch {
        continue;   // Datei umbenannt/entfernt — dann greift der Test woanders
      }
      for (const treffer of inhalt.match(FESTER_INDEX) ?? []) {
        if (ERLAUBT.some(e => treffer.includes(e.fragment))) continue;
        funde.push(`${datei}: ${treffer}`);
      }
    }
    expect(
      funde,
      `Hart adressierte Dämmstufe(n) gefunden. Über die Länge iterieren oder eine ` +
      `begründete Ausnahme in ERLAUBT eintragen:\n${funde.join("\n")}`,
    ).toEqual([]);
  });
});

describe("Modell-Kohärenz: Beschriftung folgt der Rechnung", () => {
  /**
   * Wo der Nutzer den Energieträger umschalten kann, darf im Ergebnis kein festes
   * „Gas" stehen. Genau das war der Ausgangspunkt des ganzen Tages: Der Rechner
   * rechnete mit Heizöl und beschriftete alles als Gas — für einen Fachnutzer im
   * Forum sah das aus wie ein Rechenfehler, und er hatte recht, ohne recht zu haben.
   */
  const GAS_LITERAL = /["'>](Gasheizung|Gas-Referenz|Gaspreis|TCO Gas)\b/;

  /**
   * Zeilenweise geprüft, damit der KONTEXT mitzählt. Zwei Zeilen dürfen „Gas"
   * fest schreiben, und zwar aus einem inhaltlichen Grund, nicht aus Bequemlichkeit:
   *  · Die Zeile trifft selbst eine Fallunterscheidung über den Energieträger
   *    (`fuel.kind === "oil" ? "Heizölpreis" : "Gaspreis"`) — dann folgt die
   *    Beschriftung ja gerade der Rechnung.
   *  · Die Zeile gehört zum Grüngas-Block. Den gibt es nur bei Netzgas (der
   *    Preispfad hängt an Biomethan und Gas-Netzentgelten), dort IST es Gas.
   * Wer eine dritte Ausnahme braucht, muss sie hier begründen — das ist die
   * Stelle, an der auffällt, ob es eine Entscheidung oder ein Versehen ist.
   */
  const KONTEXT_ERLAUBT = /fuel\.|Grüngas|Gasnetz|Gas-Mix/;

  it("das Wärmepumpen-Ergebnis nennt die Referenzheizung nicht fest „Gas“", () => {
    const inhalt = readFileSync(join(ROOT, "app/(site)/waermepumpe-rechner/waermepumpe.tsx"), "utf8");
    const funde = inhalt
      .split("\n")
      .map((zeile, i) => ({ zeile: zeile.trim(), nr: i + 1 }))
      .filter(({ zeile }) => GAS_LITERAL.test(zeile) && !KONTEXT_ERLAUBT.test(zeile))
      .map(({ zeile, nr }) => `Zeile ${nr}: ${zeile.slice(0, 110)}`);
    expect(
      funde,
      `Feste Gas-Beschriftung im Ergebnis gefunden — sie muss aus fuel.refLabel / ` +
      `fuel.label kommen, sonst liest ein Öl-Nutzer durchgehend „Gas“:\n${funde.join("\n")}`,
    ).toEqual([]);
  });
});

/**
 * Fünfte Klasse (Council 15.08.2026): DER KOSTENBLOCK GEHÖRT ZU SEINEM FALL.
 *
 * Der Erlösverlauf des EEG-Entwurfs sind zwei verschiedene Fälle hintereinander:
 * Erst nimmt der NETZBETREIBER ab (befristete Übergangszahlung), danach verkauft
 * ein DIENSTLEISTER an der Börse. Nur der zweite Fall kostet eine Grundgebühr —
 * im ersten gibt es niemanden, der sie erheben könnte.
 *
 * Genau diese Vermischung stand live: Der Rechner zog die Grundgebühr pauschal
 * in JEDEM Jahr ab, in dem überhaupt ein Erlös floss, also auch in den
 * Übergangsjahren. Der Ratgeber, der dieselbe Anlage rechnet, zog sie GAR NICHT
 * ab — zwei Oberflächen, eine Anlage, zwei Ergebnisse.
 *
 * Die Regel dagegen: Welches Jahr welche festen Kosten trägt, sagt einzig der
 * Erlösverlauf. Wer sie im Aufrufer nachbaut oder weglässt, baut den Fehler nach.
 */
describe("Modell-Kohärenz: der Kostenblock gehört zu seinem Fall", () => {
  const BASIS = {
    kwp: 10, kosten: 16000, strompreis: 0.31, eigenverbrauch: 35, einspeisung: 0,
    stromSteigerung: 0.03, ertragKwp: 1000, monthly: null,
  };

  const verlaufFuer = (kwp: number, jahr: number, marktErloes: boolean) =>
    einspeiseVerlauf({
      regime: "reform2027", kwp, inbetriebnahmeJahr: jahr,
      heuteSatzCt: 7.86, marktErloes, profilFaktor: 0.9,
    });

  it("in den Jahren ohne Vermarkter fällt keine Grundgebühr an", () => {
    for (const kwp of [2, 10, 24, 30, 49, 60]) {
      for (const jahr of [2027, 2028, 2029, 2030, 2031]) {
        for (const marktErloes of [true, false]) {
          for (const j of verlaufFuer(kwp, jahr, marktErloes)) {
            if (j.art !== "uebergang" && j.art !== "keine") continue;
            expect(
              j.fixkosten,
              `${kwp} kWp / ${jahr} / Jahr ${j.i} (${j.art}): Hier nimmt kein ` +
              `Dienstleister ab — eine Grundgebühr wäre ein Kostenblock aus dem Marktfall.`,
            ).toBe(0);
          }
        }
      }
    }
  });

  it("die Amortisation zieht genau die festen Kosten ab, die der Verlauf ausweist", () => {
    for (const kwp of [10, 30]) {
      for (const marktErloes of [true, false]) {
        const verlauf = verlaufFuer(kwp, 2027, marktErloes);
        const modell = {
          satzCtImJahr: (i: number) => verlauf[i - 1]?.satzCt ?? 0,
          einspeiseAnteil: 0.5,
        };
        const ohne = calc({ ...BASIS, kwp, einspeiseModell: modell });
        const mit = calc({
          ...BASIS, kwp,
          einspeiseModell: { ...modell, fixkostenImJahr: (i: number) => verlauf[i - 1]?.fixkosten ?? 0 },
        });
        // Erwartet: die Summe der Grundgebühren aus genau den Jahren, in denen
        // auch vermarktet wird (satzCt > 0). Kein Jahr mehr, keins weniger.
        const erwartet = verlauf
          .filter(j => j.satzCt > 0)
          .reduce((a, j) => a + j.fixkosten, 0);
        expect(
          Math.round(ohne.total - mit.total),
          `${kwp} kWp / Markterlös ${marktErloes}: abgezogen wurde etwas anderes als der Verlauf ausweist`,
        ).toBe(Math.round(erwartet));
      }
    }
  });

  it("kein Aufrufer baut den Erlösverlauf ohne seine festen Kosten nach", () => {
    // Der Ratgeber übergab `satzCtImJahr` und ließ die Gebühr weg — für
    // TypeScript in Ordnung (das Feld ist optional), fürs Ergebnis nicht: Die
    // Reform-Kurve stand dadurch rund 1.700 € zu gut da. Wer den einen Teil des
    // Verlaufs übernimmt, übernimmt auch den anderen.
    const AUFRUFER = [
      "app/(site)/photovoltaik-rechner/rechner.tsx",
      "app/(site)/ratgeber/lohnt-sich-pv-ohne-einspeiseverguetung/_components/RenditeVergleich.tsx",
    ];
    for (const datei of AUFRUFER) {
      const quelle = readFileSync(join(ROOT, datei), "utf8");
      const satz = (quelle.match(/satzCtImJahr:/g) ?? []).length;
      const fix = (quelle.match(/fixkostenImJahr:/g) ?? []).length;
      expect(
        fix,
        `${datei}: ${satz}× satzCtImJahr, aber ${fix}× fixkostenImJahr — ein Erlösverlauf ` +
        `ohne seine Kosten rechnet die Anlage besser als der Rechner nebenan.`,
      ).toBe(satz);
    }
  });
});
