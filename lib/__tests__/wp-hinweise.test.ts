import { describe, it, expect } from "vitest";
import {
  geraeteHinweise,
  fallHinweise,
  HINWEISE_JE_KACHEL,
  WP_HINWEIS_SCHLUSS,
  type WpHinweisFall,
  type Hinweis,
} from "../wp-hinweise";
import type { WpGeraet } from "../wp-katalog";

/**
 * Die fachlichen Hinweise zu jeder Geräteempfehlung.
 *
 * Vorgabe des Betreibers (05.09.2026): „es muss bei jeder empfehlung ein
 * entsprechender output sein (textlich mit hinweisen)". Der erste Test unten
 * ist genau diese Vorgabe — er läuft über alle Kombinationen der Eingaben und
 * verlangt für jede mindestens einen Hinweis.
 *
 * Die übrigen Tests sichern die Eigenschaften, die einen Hinweis von Werbung
 * unterscheiden: keine Kaufaufforderung, keine Behauptung über Dinge, die wir
 * nicht wissen, keine Paragrafen im Nutzertext, und nicht mehr Text, als
 * jemand neben einer Kachel liest.
 */

const geraet = (ueber: Partial<WpGeraet> = {}): WpGeraet => ({
  id: "1",
  name: "Prüfgerät",
  marke: "TEST",
  leistungKw: 18,
  herkunft: "ausgeschrieben",
  bauart: "luft-wasser",
  preisEur: 10_000,
  versandEur: 0,
  link: "https://example.invalid",
  bildUrl: null,
  lieferbar: true,
  vorlaufMaxC: 65,
  kaeltemittel: "r290",
  aufbau: "monoblock",
  umfang: "paket",
  ...ueber,
});

const fall = (ueber: Partial<WpHinweisFall> = {}): WpHinweisFall => ({
  auslegungKw: 10,
  vorlaufC: 55,
  wpType: "lwwp",
  situation: "bestand",
  heizsystem: "hk_alt",
  personen: 3.5,
  heizkoerperTausch: false,
  ...ueber,
});

/**
 * Die Fälle, gegen die geprüft wird.
 *
 * BEWUSST NICHT das volle Kreuzprodukt aller Eingaben. Das wären 768 Fälle mal
 * 216 Geräte — der erste Entwurf lief damit ins Zeitlimit, und ein Test, der
 * ins Zeitlimit läuft, urteilt nicht. Stattdessen: sechs realistische
 * Referenzfälle plus je eine Variante für jede Dimension, die eine Regel
 * unterscheidet. Jede Regel wird davon mindestens einmal getroffen; der Test
 * „keine Empfehlung ohne Hinweis" prüft zusätzlich alle Gerätevarianten gegen
 * jeden dieser Fälle.
 */
function alleFaelle(): WpHinweisFall[] {
  const basis: WpHinweisFall[] = [
    { auslegungKw: 4.8, vorlaufC: 35, wpType: "lwwp", situation: "neubau", heizsystem: "fbh", personen: 2, heizkoerperTausch: false },
    { auslegungKw: 7.1, vorlaufC: 45, wpType: "lwwp", situation: "bestand", heizsystem: "hk_neu", personen: 3.5, heizkoerperTausch: true },
    { auslegungKw: 11.3, vorlaufC: 55, wpType: "lwwp", situation: "bestand", heizsystem: "hk_alt", personen: 5, heizkoerperTausch: false },
    { auslegungKw: 19.6, vorlaufC: 55, wpType: "lwwp", situation: "bestand", heizsystem: "hk_alt", personen: 5, heizkoerperTausch: false },
    { auslegungKw: 7.1, vorlaufC: 45, wpType: "swwp", situation: "bestand", heizsystem: "hk_neu", personen: 1, heizkoerperTausch: false },
    { auslegungKw: 4.8, vorlaufC: 35, wpType: "swwp", situation: "neubau", heizsystem: "fbh", personen: 1, heizkoerperTausch: false },
  ];
  const varianten: Partial<WpHinweisFall>[] = [
    { situation: "neubau" },
    { situation: "bestand" },
    { heizsystem: "fbh" },
    { heizsystem: "hk_neu" },
    { heizsystem: "hk_alt" },
    { wpType: "lwwp" },
    { wpType: "swwp" },
    { personen: 1 },
    { personen: 5 },
    { heizkoerperTausch: true },
    { heizkoerperTausch: false },
  ];
  return [...basis, ...varianten.map((v) => ({ ...basis[2], ...v }))];
}

/**
 * Die Geräte-Ausprägungen, die die Regeln unterscheiden.
 *
 * Hier ist das volle Kreuzprodukt vertretbar (72 Geräte) und auch nötig: Die
 * Regeln greifen auf Kombinationen — ein Gerät ohne Bauart-Angabe UND ohne
 * Kältemittel-Angabe erfüllt zwei Regeln gleichzeitig, und genau dort
 * entscheidet sich, welcher der beiden auf die Kachel passt.
 */
function alleGeraete(): WpGeraet[] {
  const out: WpGeraet[] = [];
  for (const aufbau of ["monoblock", "split", null] as const)
    for (const kaeltemittel of ["r290", "r32", null] as const)
      for (const vorlaufMaxC of [65, null])
        for (const umfang of ["paket", "geraet"] as const)
          for (const leistungKw of [12, 18, 26])
            out.push({ ...geraet({ aufbau, kaeltemittel, vorlaufMaxC, umfang, leistungKw }) });
  // Die abgeleitete Leistung ist eine eigene Dimension, aber sie kreuzt mit
  // nichts — eine Ausprägung genügt.
  out.push(geraet({ herkunft: "typenschluessel" }));
  return out;
}

describe("Keine Empfehlung ohne Hinweis — die Vorgabe selbst", () => {
  it("liefert zu jeder Kombination aus Gerät und Fall mindestens einen Hinweis", () => {
    const faelle = alleFaelle();
    const geraete = alleGeraete();
    const ohne: string[] = [];
    for (const f of faelle) {
      for (const g of geraete) {
        if (geraeteHinweise(g, f).length === 0) {
          ohne.push(`${g.aufbau}/${g.kaeltemittel}/${g.umfang} bei ${f.vorlaufC} °C`);
        }
      }
    }
    expect(ohne.slice(0, 5), `${ohne.length} Kombinationen ohne Hinweis`).toEqual([]);
  });

  it("liefert zu jedem Fall mindestens einen Hinweis unter der Liste", () => {
    const ohne = alleFaelle().filter((f) => fallHinweise(f).length === 0);
    expect(ohne.slice(0, 3), `${ohne.length} Fälle ohne Hinweis`).toEqual([]);
  });

  it("hat einen Schlusssatz, der die Liste einordnet", () => {
    // Ohne ihn liest sich eine Reihe von Geräten mit Preisen und Kaufknöpfen
    // wie eine Kaufempfehlung. Sie ist eine Vorauswahl.
    expect(WP_HINWEIS_SCHLUSS).toMatch(/ersetzt keine Heizlastberechnung/);
    expect(WP_HINWEIS_SCHLUSS).toMatch(/vor Ort/);
  });
});

describe("Form der Hinweise", () => {
  const alle = (): Hinweis[] => {
    const out: Hinweis[] = [];
    for (const f of alleFaelle()) {
      out.push(...fallHinweise(f));
      for (const g of alleGeraete()) out.push(...geraeteHinweise(g, f, Infinity));
    }
    // Nach Kennung entdoppeln — dieselbe Regel feuert vielfach.
    const gesehen = new Map<string, Hinweis>();
    for (const h of out) if (!gesehen.has(h.id)) gesehen.set(h.id, h);
    return [...gesehen.values()];
  };

  it("zeigt an der Kachel höchstens zwei — Warnungen ausgenommen", () => {
    // Warnungen werden nie abgeschnitten: Eine Warnung ist etwas, das den Kauf
    // zum Fehlkauf machen kann, und sie wegzulassen, damit die Kachel
    // aufgeräumter aussieht, wäre die Abwägung, die dieses Modul nicht treffen
    // darf. Alles andere füllt bis zur Grenze auf.
    for (const f of alleFaelle()) {
      for (const g of alleGeraete()) {
        const liste = geraeteHinweise(g, f);
        const warnungen = liste.filter((h) => h.gewicht === "warnung").length;
        const rest = liste.length - warnungen;
        expect(rest, "nicht-Warnungen über der Grenze").toBeLessThanOrEqual(
          Math.max(0, HINWEISE_JE_KACHEL - warnungen),
        );
        // Und die Kachel darf trotzdem nicht ausufern. Der schlimmste reale
        // Fall ist ein nacktes Split-Gerät mit Propan: Sachkunde des Monteurs,
        // Aufstellort, Lieferumfang — drei, jede davon kaufentscheidend.
        expect(liste.length, "Kachel läuft über").toBeLessThanOrEqual(4);
      }
    }
  });

  it("schneidet keine Warnung ab", () => {
    // Die Gegenprobe zur Regel, am realen Fall: Ein nacktes Split-Gerät mit
    // Propan trägt drei Warnungen. Mit einfachem Abschneiden verschwände der
    // Lieferumfang — der Hinweis, der die Kosten um den Faktor drei bis vier
    // verschiebt.
    const liste = geraeteHinweise(
      geraet({ aufbau: "split", kaeltemittel: "r290", umfang: "geraet" }),
      fall(),
    );
    const ids = liste.map((h) => h.id);
    expect(ids).toContain("split-sachkunde");
    expect(ids).toContain("propan-aufstellort");
    expect(ids).toContain("umfang-nacktes-geraet");
  });

  it("stellt die Warnung vor den Hinweis und den vor die Einordnung", () => {
    // An der Kachel überleben nur die ersten beiden — steht eine Einordnung
    // vor einer Warnung, fällt die Warnung heraus.
    const rang = { warnung: 0, hinweis: 1, einordnung: 2 } as const;
    for (const f of alleFaelle()) {
      for (const liste of [
        fallHinweise(f),
        ...alleGeraete().map((g) => geraeteHinweise(g, f, Infinity)),
      ]) {
        const raenge = liste.map((h) => rang[h.gewicht]);
        expect([...raenge].sort((a, b) => a - b)).toEqual(raenge);
      }
    }
  });

  it("schreibt ganze Sätze, höchstens zwei", () => {
    for (const h of alle()) {
      expect(h.text, h.id).toMatch(/^[A-ZÄÖÜ]/);
      expect(h.text, h.id).toMatch(/[.!?]$/);
      const saetze = h.text.split(/[.!?](?:\s|$)/).filter((s) => s.trim().length > 0);
      expect(saetze.length, `${h.id}: ${saetze.length} Sätze`).toBeLessThanOrEqual(2);
    }
  });

  it("nennt keine Paragrafen und keine Normnummern im Nutzertext", () => {
    // Die Fundstellen gehören in den Code-Kommentar. Im Text neben einer
    // Kachel liest sie niemand, und sie erwecken den Eindruck einer
    // Rechtsberatung, die wir nicht leisten.
    for (const h of alle()) {
      expect(h.text, h.id).not.toMatch(/§|Abs\.|DIN|EN \d|VDE|Verordnung|Richtlinie/);
    }
  });

  it("fordert nirgends zum Kauf auf", () => {
    // Die Kachel daneben trägt einen Affiliate-Link. Ein Satz, der zum Kauf
    // drängt, wäre an dieser Stelle eine geschäftliche Handlung mit ganz
    // anderen Anforderungen — die Hinweise sind fachliche Einordnung.
    for (const h of alle()) {
      expect(h.text, h.id).not.toMatch(
        /\b(kauf jetzt|jetzt kaufen|greif zu|empfehlenswert|unschlagbar|Schnäppchen|lohnt sich)\b/i,
      );
    }
  });

  it("gibt jedem Hinweis eine eigene Kennung", () => {
    const ids = alle().map((h) => h.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("Was wir nicht wissen, wird als offen benannt", () => {
  it("warnt bei fehlender Vorlauf-Angabe nur dort, wo sie zählt", () => {
    // Gemessen tragen 291 von 755 Geräten keine Angabe. Bei 35 °C erzeugt ein
    // Warnton dort Sorge ohne Anlass — von den Geräten MIT Angabe liegen nur
    // vier bei 35 °C, alle übrigen zwischen 55 und 75 °C.
    const ohneAngabe = geraet({ vorlaufMaxC: null });
    const imAltbau = geraeteHinweise(ohneAngabe, fall({ vorlaufC: 55 }));
    // Ungekürzt geprüft: Die Einordnung ist der am wenigsten dringende Hinweis
    // und fällt an der Kachel als erste heraus — geprüft wird die REGEL.
    const imNeubau = geraeteHinweise(
      ohneAngabe,
      fall({ vorlaufC: 35, auslegungKw: 12, situation: "neubau", heizsystem: "fbh" }),
      Infinity,
    );
    expect(imAltbau.find((h) => h.id === "vorlauf-unbekannt-kritisch")?.gewicht).toBe("warnung");
    expect(imNeubau.find((h) => h.id === "vorlauf-unbekannt-unkritisch")?.gewicht).toBe(
      "einordnung",
    );
  });

  it("benennt eine unbekannte Bauart, statt sie zu verschweigen", () => {
    // 302 von 755 Geräten sagen nicht, ob Monoblock oder Split. Ohne diese
    // Zeile fehlte der Hinweis ausgerechnet dort, wo wir ihn nicht stellen
    // können — dieselbe markenabhängige Verzerrung wie bei der Vorlauftemperatur.
    const ids = geraeteHinweise(geraet({ aufbau: null, umfang: "paket" }), fall(), Infinity).map(
      (h) => h.id,
    );
    expect(ids).toContain("aufbau-unbekannt");
  });

  it("nennt weder eine Dezibel-Zahl noch einen Bohrmeter-Preis", () => {
    // Beides steht in keiner unserer Quellen: Kein einziges der 755 Angebote
    // trägt einen Schallleistungspegel, und eine belegte Preisreihe je
    // Bohrmeter gibt es im Projekt nicht. Eine Zahl wäre erfunden.
    const luft = fallHinweise(fall({ wpType: "lwwp" }));
    const sole = fallHinweise(fall({ wpType: "swwp" }));
    expect(luft.find((h) => h.id === "schall-nachbarschaft")?.text).not.toMatch(/dB/);
    expect(sole.find((h) => h.id === "erdwaerme-bohrkosten")?.text).not.toMatch(/€|Euro/);
  });

  it("nennt keine Meterzahl für den Abstand zur Grenze", () => {
    // Abstandsflächen sind Landesrecht und je Land verschieden; das Bundesland
    // kennt die Geräteauswahl nicht. Eine Meterzahl wäre für die Mehrheit falsch.
    const h = fallHinweise(fall({ wpType: "lwwp" })).find((x) => x.id === "abstand-landesrecht");
    expect(h?.text).not.toMatch(/\d+\s*(m|Meter)\b/);
  });
});

describe("Die Hinweise folgen dem gewählten Weg, nicht der Rohantwort", () => {
  it("schlägt keinen Heizkörpertausch vor, der schon gewählt ist", () => {
    const ohne = fallHinweise(fall({ heizsystem: "hk_alt", heizkoerperTausch: false }));
    const mit = fallHinweise(fall({ heizsystem: "hk_alt", heizkoerperTausch: true }));
    expect(ohne.map((h) => h.id)).toContain("heizkoerper-einzelne-raeume");
    expect(mit.map((h) => h.id)).not.toContain("heizkoerper-einzelne-raeume");
  });

  it("trennt Erdwärme und Luft/Wasser vollständig", () => {
    const luft = fallHinweise(fall({ wpType: "lwwp" })).map((h) => h.id);
    const sole = fallHinweise(fall({ wpType: "swwp" })).map((h) => h.id);
    expect(luft).toContain("schall-nachbarschaft");
    expect(luft).not.toContain("erdwaerme-bohrkosten");
    expect(sole).toContain("erdwaerme-bohrkosten");
    expect(sole).not.toContain("schall-nachbarschaft");
  });

  it("spricht die Elektrik nur im Bestand an", () => {
    // Bewusst an der Situation und nicht am Dämmzustand: Die Dämmstufe ist kein
    // Baujahr, und aus ihr eine Aussage über die Elektroinstallation
    // abzuleiten wäre geraten.
    expect(fallHinweise(fall({ situation: "bestand" })).map((h) => h.id)).toContain(
      "zaehlerschrank",
    );
    expect(
      fallHinweise(fall({ situation: "neubau", heizsystem: "fbh" })).map((h) => h.id),
    ).not.toContain("zaehlerschrank");
  });

  it("nennt den Pufferspeicher nur bei Heizkörpern", () => {
    expect(fallHinweise(fall({ heizsystem: "hk_alt" })).map((h) => h.id)).toContain(
      "pufferspeicher",
    );
    expect(fallHinweise(fall({ heizsystem: "fbh" })).map((h) => h.id)).not.toContain(
      "pufferspeicher",
    );
  });
});

describe("Das Taktverhalten wird benannt, nicht verharmlost", () => {
  it("spricht ein reichlich großes Gerät an und nennt die Folge", () => {
    // Der frühere Satz hieß „läuft öfter im Takt" und benannte die Folge nicht.
    // 26 kW sind bei 55 °C 14,6 kW am Auslegungspunkt, also 46 % über den 10 kW.
    const h = geraeteHinweise(geraet({ leistungKw: 26 }), fall(), Infinity).find(
      (x) => x.id === "leistung-takten",
    );
    expect(h?.gewicht).toBe("warnung");
    expect(h?.text).toMatch(/Jahresarbeitszahl/);
    expect(h?.text).toMatch(/4,6 kW mehr/);
  });

  it("lässt ein passend großes Gerät in Ruhe", () => {
    // 18 kW sind bei 55 °C 10,1 kW — genau die Auslegung.
    expect(
      geraeteHinweise(geraet({ leistungKw: 18 }), fall(), Infinity).map((h) => h.id),
    ).not.toContain("leistung-takten");
  });
});

/**
 * Die Rechtsaussagen — und die Formulierungen, die nicht zurückkommen dürfen.
 *
 * Vier Sätze mit Rechtsbezug, zwei Prüfungen am 05.09.2026: eine Rechtsprüfung
 * und eine Gegenprüfung mit dem ausdrücklichen Auftrag, die erste zu widerlegen.
 * Die Gegenprüfung hat einen echten Fehler gefunden (Erdwärme: falsche tragende
 * Norm, übersehene Gesetzesänderung vom 23.12.2025, dreifach zu kurzer
 * Zeitanker) und eine Lücke geschlossen (Propan: die Zündquelle fehlte).
 *
 * Dieser Test prüft NICHT, ob die Sätze richtig sind — das kann kein Test, das
 * entscheidet das Lesen der Quelle. Er prüft, dass die verworfenen Fassungen
 * nicht zurückkehren. Genau das ist im Projekt die häufigste Wiederholung: Eine
 * Formulierung wird korrigiert, und ein halbes Jahr später schreibt sie jemand
 * plausibel wieder hin.
 */
describe("Rechtsaussagen: was verworfen wurde, bleibt verworfen", () => {
  const text = (id: string): string => {
    for (const f of alleFaelle()) {
      for (const h of [...fallHinweise(f), ...alleGeraete().flatMap((g) => geraeteHinweise(g, f, Infinity))]) {
        if (h.id === id) return h.text;
      }
    }
    throw new Error(`Hinweis ${id} kommt in keinem geprüften Fall vor`);
  };

  it("nimmt Propan-Geräte NICHT von der Zertifizierungspflicht aus", () => {
    // Die EU-Durchführungsverordnung von 2015 kannte nur fluorierte
    // Treibhausgase; sie ist seit 2024 aufgehoben, und die Nachfolgerin nennt
    // Kohlenwasserstoffe ausdrücklich. „Bei Propan brauchst du das nicht" ist
    // die gefährliche Richtung — der Monteur wäre dann nicht qualifiziert.
    const t = text("split-sachkunde");
    expect(t).toMatch(/auch bei Propan/);
    expect(t).not.toMatch(/außer bei Propan|nicht bei Propan|Propan.{0,20}ausgenommen/i);
  });

  it("erfindet keine Bagatellgrenze für die Zertifizierung", () => {
    // Die 5 Tonnen CO2-Äquivalent betreffen die Dichtheitskontrollen, nicht die
    // Zertifizierung. Für Füllmengen unter 3 kg gibt es eigens eine eigene
    // Zertifikatsklasse — kleine Wohnhaus-Splits sind ausdrücklich erfasst.
    expect(text("split-sachkunde")).not.toMatch(/Tonnen|ab \d+ ?kg|Füllmenge/);
  });

  it("nennt für den Propan-Schutzbereich KEINE Meterzahl", () => {
    // BLOCKER. Die kursierende Angabe „mindestens 1 Meter" ist beiden Prüfungen
    // nur in Sekundärquellen begegnet; die Norm ist kostenpflichtig und lag
    // keiner im Volltext vor. Der Schutzbereich wächst mit der Füllmenge, und
    // eine zu kleine getippte Zahl ist genau dort gefährlich, wo sie gelesen
    // wird. Wer sie nachtragen will, beschafft zuerst die Norm.
    const t = text("propan-aufstellort");
    expect(t).not.toMatch(/\d+\s*(m|Meter|cm)\b/);
    expect(t).toMatch(/Aufstellanleitung/);
    // Und die Zündquelle, die in der ersten Fassung fehlte.
    expect(t).toMatch(/Zündquelle/);
  });

  it("behauptet beim Aufstellort keine Pflicht des Bewohners", () => {
    // Gefahrstoff- und Betriebssicherheitsverordnung treffen den privaten
    // Haushalt nicht; verbindlich ist die Herstellervorgabe gegenüber dem
    // einbauenden Betrieb. „Gesetzlich vorgeschrieben" wäre eine Falschaussage.
    expect(text("propan-aufstellort")).not.toMatch(/gesetzlich|vorgeschrieben|verboten|Pflicht/i);
  });

  it("nennt bei der Erdwärme drei Monate, nicht einen", () => {
    // Der Monat ist die Anzeigefrist, nicht die Dauer bis zur Entscheidung.
    // Seit dem Geothermie-Beschleunigungsgesetz (in Kraft 23.12.2025) hat die
    // Behörde drei Monate ab Vollständigkeitsbestätigung. Neben einem
    // Kaufknopf einen Monat zu nennen, schickt jemanden zu früh in die
    // Bestellung — die teure Richtung.
    const t = text("erdwaerme-genehmigung");
    expect(t).toMatch(/drei Monaten/);
    expect(t).not.toMatch(/einen Monat|vier Wochen/);
  });

  it("beschränkt das Wasserschutzgebiets-Verbot auf SONDEN", () => {
    // Die Verordnung über Anlagen zum Umgang mit wassergefährdenden Stoffen
    // verbietet in der weiteren Zone ausdrücklich „Anlagen mit
    // Erdwärmesonden". Kollektoren sind nicht erfasst und bis 4 m Tiefe
    // außerhalb von Wasserschutzgebieten sogar privilegiert.
    expect(text("erdwaerme-genehmigung")).toMatch(/Erdwärmesonden/);
  });

  it("verlangt beim Netzbetreiber eine Anmeldung, keine Zustimmung", () => {
    // Für zusätzliche Verbrauchsgeräte ist nur die Mitteilung verlangt; eine
    // Zustimmung braucht es allein bei Ladeeinrichtungen über 12 kVA. Die
    // Verschärfung schreckt ab und wäre falsch.
    const t = text("netzbetreiber-steuerbar");
    expect(t).toMatch(/meldet der Fachbetrieb/);
    expect(t).not.toMatch(/zustimmen|Zustimmung|genehmigen|Genehmigung/i);
  });

  it("nennt die Steuerbarkeit als Pflicht, nicht als Regelfall", () => {
    // Alle Anlagen mit Inbetriebnahme nach dem 31.12.2023 sind
    // teilnahmeverpflichtet. „In der Regel steuerbar" ist zu weich.
    const t = text("netzbetreiber-steuerbar");
    expect(t).toMatch(/muss steuerbar sein/);
    expect(t).not.toMatch(/in der Regel steuerbar|meist steuerbar|kann steuerbar/i);
  });

  it("behauptet keine Zeitgrenze für die Drosselung", () => {
    // Die Festlegung bemisst die Dauer allein danach, wie lange sie
    // erforderlich ist. „Kurzzeitig" und „zwei Stunden" sind unbelegt — die
    // zwei Stunden gelten nur der befristeten präventiven Steuerung.
    const t = text("netzbetreiber-steuerbar");
    expect(t).not.toMatch(/kurzzeitig|zwei Stunden|vorübergehend/i);
    // Und das, was wirklich zählt: gedrosselt, nicht abgeschaltet.
    expect(t).toMatch(/drosseln, aber nicht abschalten/);
  });

  it("bindet die Mindestleistung an den Hausanschluss, nicht an das Gerät", () => {
    // Bei Steuerung über ein Energiemanagementsystem ist die Mindestleistung
    // eine Summe für den ganzen Anschluss: Bei zwei Geräten darf die
    // Wärmepumpe auf null, solange die Wallbox den Rest bekommt.
    expect(text("netzbetreiber-steuerbar")).toMatch(/deinem Hausanschluss/);
  });

  it("übersteht die Fristen, die 2026 und 2029 ablaufen", () => {
    // Zwei Fristen aus den Quellen laufen ab, ohne dass ein Satz falsch werden
    // darf: die Ausnahme für nachweislich nicht steuerbare Geräte
    // (Inbetriebnahme bis 31.12.2026) und die Fortgeltung alter
    // Sachkundebescheinigungen (bis 12.03.2029). Kein Satz stützt sich darauf —
    // das ist der Grund, aus dem sie keine Jahreszahl tragen.
    for (const id of ["split-sachkunde", "netzbetreiber-steuerbar", "erdwaerme-genehmigung"]) {
      expect(text(id), id).not.toMatch(/2026|2027|2028|2029/);
    }
  });
});
