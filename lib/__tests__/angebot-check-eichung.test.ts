import { describe, it, expect } from "vitest";
import { pruefeAngebot, geraetepreisVergleichbar, type AusgelesenesAngebot } from "../angebot-check";

// ─── Eichung an zwei echten Angeboten ─────────────────────────────────────────
//
// Von Hand ausgelesen am 28.08.2026 aus zwei Angeboten, die ein Bauherr
// öffentlich zum Vergleich gestellt hat (Denkmalschutz-Altbau, Außeneinheit 6 m
// entfernt im Garten). Sie liegen als Bilder im Repo.
//
// WARUM VON HAND: Ein Prüfwerkzeug, das nur gegen sich selbst getestet wird,
// misst nichts. Bevor ein Auslese-Lauf Zahlen liefert, müssen ein paar Fälle
// von Hand gelöst sein — sonst ist nicht unterscheidbar, ob ein seltsames
// Ergebnis am Angebot liegt oder am Werkzeug.
//
// Die beiden Fälle sind mit Absicht dieses Paar: Das eine Angebot listet das
// Gerät als eigene Zeile, das andere bündelt fünf Positionen zu einem Preis.
// Genau an diesem Unterschied hängt, ob ein Preisvergleich mit dem Onlinehandel
// überhaupt zulässig ist.

const pos = (id: string | null, wortlaut: string, betragEur: number | null, enthaeltAuch: string[] = []) =>
  ({ id, wortlaut, betragEur, enthaeltAuch });

/**
 * Bosch-Angebot, Gesamtkosten brutto nach 5 % Rabatt: 26.110,30 €.
 * Außeneinheit „AW 7 OR-S" — die 7 ist die Nennleistung in kW.
 */
const bosch: AusgelesenesAngebot = {
  geraet: "Bosch Compress CS6800iAW 12 E / Monoblock-Außeneinheit AW 7 OR-S",
  marke: "Bosch",
  leistungKw: 7,
  gesamtpreisEur: 26110.3,
  positionen: [
    // Pos. 10–50 tragen EINEN gemeinsamen Preis: Außeneinheit, Inneneinheit,
    // Pufferspeicher, Warmwasserspeicher, Speicherfühler.
    pos("geraet", "Monoblock-Außeneinheit AW 7 OR-S + Inneneinheit + Speicher", 10640.46, ["pufferspeicher", "warmwasser"]),
    pos("fundament", "Montagesockel klein für AW OR-S", 313.32),
    pos("hydraulischer-abgleich", "Hydraulische Abgleich", 250),
    pos("montage", "Montagekosten", 5600),
    pos("heizkoerpertausch", "Heizkörper Profilheizkörper PLATTELLA V6 L", 760),
  ],
  rueckfragen: [
    { text: "Frag nach, ob die Elektroarbeiten für die Wärmepumpe enthalten sind — im Angebot findet sich dazu keine Position.", bezug: "elektroinstallation" },
    { text: "Frag, ob das Ausbauen und Entsorgen der alten Heizung im Preis steckt oder gesondert berechnet wird.", bezug: "demontage" },
    { text: "Frag nach, ob dein Zählerschrank für die Wärmepumpe angepasst werden muss und wer das übernimmt.", bezug: "zaehlerschrank" },
    { text: "Lass dir aufschlüsseln, was von dem gemeinsamen Preis für Außeneinheit, Inneneinheit und die beiden Speicher auf welches Gerät entfällt.", bezug: "geraet" },
  ],
  unsicher: [
    "Die Positionen 10 bis 50 tragen einen gemeinsamen Preis — was davon auf die Wärmepumpe selbst entfällt, steht nicht im Angebot.",
  ],
};

/**
 * Buderus-Angebot desselben Bauherrn, Übertrag Seite 3: 28.114,74 € netto —
 * die Schlussseite liegt nicht vor, der Gesamtpreis ist deshalb offen.
 */
const buderus: AusgelesenesAngebot = {
  geraet: "Buderus Logaplus M WLW186i-5 AR",
  marke: "Buderus",
  leistungKw: null,
  gesamtpreisEur: null,
  positionen: [
    pos("geraet", "Buderus Logaplus M WLW186i-5 AR EWLW186I-12 E, WLW-5 MB AR, MX400", 7577.7),
    pos("pufferspeicher", "Buderus Logaplus WP-Speicherpaket SP9Paket EWH200", 2717.52),
    pos("fundament", "Logatherm Fertigfundament für Wärmepumpenaußeneinheit", 507),
    pos("elektroinstallation", "Stromanschluß für Innen- und Außeneinheit, separater Zähler inkl. Zählerschrank", 1600, ["zaehlerschrank"]),
    pos("montage", "Montage der Anlage", 7275, ["demontage"]),
    pos("heizkoerpertausch", "Heizkörper austauschen und Zusätzlich", 680.92),
  ],
  rueckfragen: [
    { text: "Der hydraulische Abgleich hat eine eigene Überschrift mit dem Hinweis, dass er für die Förderung Pflicht ist — die Posten darunter sind aber als Alternative ausgewiesen. Frag nach, ob er nun im Preis enthalten ist.", bezug: "hydraulischer-abgleich" },
    { text: "Lass dir die Heizleistung der angebotenen Wärmepumpe schriftlich bestätigen — im Angebot steht sie nur in der Typenbezeichnung.", bezug: null },
  ],
  unsicher: [
    "Die Leistung steht nur in der Typenbezeichnung, nicht als eigene Angabe.",
    "Der hydraulische Abgleich hat eine eigene Überschrift mit dem Hinweis, dass er für die Förderung Pflicht ist — alle Unterpositionen sind aber als Alternative oder mit 0,00 € ausgewiesen.",
    "Die Schlussseite mit dem Gesamtpreis liegt nicht vor.",
  ],
};

// Kein Gebäudekennwert in der Anfrage — Denkmalschutz-Altbau ohne Flächenangabe.
// Für die Eichung ein plausibler Bezug; die Größenprüfung wird hier nicht bewertet.
const gebaeude = { heizlastKw: 9, auslegungKw: 7.65 };

describe("Eichung: Bosch-Angebot (gebündelte Positionen)", () => {
  const b = pruefeAngebot(bosch, gebaeude);

  it("verbietet den Vergleich mit einem Onlinepreis", () => {
    // Der Betrag deckt Außeneinheit, Inneneinheit und zwei Speicher. Ihn neben
    // den Onlinepreis einer Außeneinheit zu stellen, wäre der irreführende
    // Vergleich, den beide Rechtsprüfungen benannt haben.
    expect(geraetepreisVergleichbar(bosch)).toBe(false);
  });

  it("meldet den Preis als UNTER dem üblichen Band", () => {
    // 26.110 € / 7 kW = 3.730 €/kW; bei 4–7 kW liegen die meisten ausgewerteten
    // Angebote zwischen 5.000 und 8.500 €/kW.
    expect(b.preis.urteil).toBe("darunter");
    expect(Math.round(b.preis.spezKostenEurProKw!)).toBe(3730);
  });

  it("erklärt den günstigen Preis über die fehlenden Positionen", () => {
    // DAS ist die eigentliche Leistung der Prüfung: „günstig" und „unvollständig"
    // sind hier dieselbe Beobachtung. Elektroinstallation und Entsorgung der
    // Altanlage fehlen — beides kommt später als Nachforderung.
    const fehlt = b.vollstaendigkeit.fehlend.map((f) => f.position.id);
    expect(fehlt).toContain("elektroinstallation");
    expect(fehlt).toContain("demontage");
  });

  it("führt den Zählerschrank als offene Möglichkeit", () => {
    expect(b.vollstaendigkeit.moeglicherweiseNoetig.map((f) => f.position.id)).toContain("zaehlerschrank");
  });
});

describe("Eichung: Buderus-Angebot (eigene Gerätezeile)", () => {
  const b = pruefeAngebot(buderus, gebaeude);

  it("erlaubt den Vergleich mit einem Onlinepreis", () => {
    // Eine reine Gerätezeile ohne Zusätze — hier ist die Gegenüberstellung
    // sachlich richtig.
    expect(geraetepreisVergleichbar(buderus)).toBe(true);
  });

  it("erkennt Elektroinstallation und Zählerschrank als abgedeckt", () => {
    const fehlt = b.vollstaendigkeit.fehlend.map((f) => f.position.id);
    expect(fehlt).not.toContain("elektroinstallation");
    expect(b.vollstaendigkeit.moeglicherweiseNoetig.map((f) => f.position.id)).not.toContain("zaehlerschrank");
  });

  it("meldet den fehlenden hydraulischen Abgleich — den Förder-Blocker", () => {
    const abgleich = b.vollstaendigkeit.fehlend.find((f) => f.position.id === "hydraulischer-abgleich");
    expect(abgleich).toBeDefined();
    expect(abgleich!.position.folge).toMatch(/Förderung/);
  });

  it("urteilt nicht über den Preis, wenn Leistung und Gesamtpreis fehlen", () => {
    expect(b.preis.urteil).toBe("unbekannt");
    expect(b.groesse.urteil).toBe("unbekannt");
  });

  it("reicht durch, was beim Lesen unklar blieb", () => {
    // Drei Vorbehalte, jeder aus dem Dokument selbst. Eine leere Liste wäre
    // hier eine Behauptung: Das Angebot IST an drei Stellen mehrdeutig.
    expect(b.unsicher).toHaveLength(3);
    expect(b.unsicher.join(" ")).toMatch(/Typenbezeichnung/);
  });
});
