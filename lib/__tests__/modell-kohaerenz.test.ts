import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { calcHeatPump, type HeatPumpInputs } from "../heatpump";
import { DEFAULT_HEATPUMP_CONFIG as CFG } from "../heatpump-config";
import { greenGasApplies } from "../fossil-reference";
import { INSULATION_BESTAND, WP_FUEL_OPTIONS } from "../constants";

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
