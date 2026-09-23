/**
 * Prüfungen der Kostenreihe.
 *
 * Jede hier festgenagelte Regel stammt aus einem Fehlgriff beim Bauen, nicht aus
 * einer Vermutung — die Muster-Reihenfolge, die macOS-Schreibweise der
 * Umlaute, die Zelladressen der Tabelle und der Zeitraum-Vergleich sind alle
 * einmal danebengegangen, und jeder dieser Fehler war von außen unsichtbar.
 */

import { describe, expect, it } from "vitest";
import {
  ANBIETER,
  anbieterFuer,
  anteilBetrag,
  summiereKosten,
  listenwertUsd,
  type Kostenmonat,
  type Listenwerttag,
} from "../projekt-kosten";
import { tokenPreisUsd, bekannteModelle, PREISE_STAND } from "../modellpreise";
import { bilanz, STUNDEN_JE_TAG } from "../projekt-bilanz";
import { spalteAus, istUebersicht } from "../../scripts/projekt-kosten-erfassen";
import type { Bestandstag, Summe } from "../projekt-statistik";
import { schaetzeAufwand, type Zaehlstand } from "../aufwand-schaetzung";

const monat = (anbieter: string, m: string, betrag: number): Kostenmonat => ({
  monat: m, anbieter, betragEur: betrag, buchungen: 1,
});

describe("Anbieter erkennen", () => {
  it("ordnet das Abo dem Abo zu, nicht den verbrauchsabhängigen Kontingenten", () => {
    // DIE REIHENFOLGE IST DER PUNKT: Beide Buchungen nennen denselben Anbieter.
    // Stünde das allgemeinere Muster vorn, landete der Festbetrag des Abos in
    // der Spalte, die den Verbrauch misst — und beide Zahlen wären falsch,
    // ohne dass die Summe sich ändert.
    expect(anbieterFuer("ANTHROPIC* CLAUDE SUB", "Claude Max plan 20x")?.schluessel)
      .toBe("claude-abo");
    expect(anbieterFuer("ANTHROPIC IRELAND", "API-Guthaben (10,37 USD)")?.schluessel)
      .toBe("claude-kontingente");
  });

  it("verwirft alles, was nicht zu diesem Projekt gehört", () => {
    for (const fremd of [
      ["Finanzamt (StOK Bayern)", "USt-Voranmeldung Juni 2026"],
      ["Sebastian Schäder (privat)", "Abfluss auf Privatkonto"],
      ["Spotify", "Premium Family"],
      ["ING-DiBa AG", "Rate ING Wohnkredit"],
      ["Telekom Deutschland GmbH", "Festnetz August 2026"],
    ]) {
      expect(anbieterFuer(fremd[0], fremd[1]), fremd.join(" / ")).toBeNull();
    }
  });

  it("erkennt jeden Anbieter an einer echten Buchungszeile", () => {
    const echte: [string, string, string][] = [
      ["ANTHROPIC* CLAUDE SUB", "Claude Max plan 20x", "claude-abo"],
      ["Anthropic Ireland Limited", "Receipt 9BF0758D-3174367", "claude-kontingente"],
      ["OPENAI", "API-Guthaben (23,80 USD)", "openai"],
      ["VERCEL INC.", "Rechnung DABD42F0-0006", "vercel"],
      ["SUPABASE", "Rechnung SHAUGR-00025", "datenbank"],
      ["RESEND", "Transactional Pro (20,00 USD)", "mailversand"],
      ["Neue Medien Münnich (All-Inkl)", "Sammellastschrift", "domain"],
      ["PADDLE.NET* DATAFORSEO", "DataForSEO über Paddle", "seo-abfragen"],
      ["GITHUB, INC.", "GitHub (4,79 USD)", "quellcode-verwaltung"],
    ];
    for (const [g, z, erwartet] of echte) {
      expect(anbieterFuer(g, z)?.schluessel, `${g} / ${z}`).toBe(erwartet);
    }
  });
});

describe("Aufteilungsschlüssel", () => {
  it("nennt für jeden Anteil einen Beleg und ein Messdatum", () => {
    // Ein Schlüssel ohne Beleg ist eine Behauptung — dieselbe Fehlerklasse wie
    // ein Prüfdatum, hinter dem keine Prüfung steht.
    for (const a of ANBIETER) {
      expect(a.anteil.beleg.length, a.name).toBeGreaterThan(30);
      expect(a.anteil.gemessenAm, a.name).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(a.anteil.anteil, a.name).toBeGreaterThan(0);
      expect(a.anteil.anteil, a.name).toBeLessThanOrEqual(1);
    }
  });

  it("weist einen vollen Anteil nur aus, wo die Zuordnung eindeutig ist", () => {
    for (const a of ANBIETER) {
      if (a.anteil.anteil === 1) expect(a.anteil.herkunft, a.name).toBe("eindeutig");
    }
  });

  it("nennt einen geschätzten Schlüssel auch so", () => {
    const geschaetzt = ANBIETER.filter((a) => a.anteil.herkunft === "geschaetzt");
    // Nicht die Zahl der Schätzungen ist festgenagelt, sondern dass jede ihren
    // Grund nennt: Eine feste Zahl würde beim nächsten Anbieter rot, ohne dass
    // etwas falsch wäre.
    for (const a of geschaetzt) {
      expect(a.anteil.beleg, a.name).toMatch(/kein|ohne|nicht/i);
    }
  });
});

describe("Summe", () => {
  it("zieht Erstattungen ab, statt sie zu übergehen", () => {
    // Im Juni 2026 hat der Anbieter zu viel berechnete Steuer zurückerstattet.
    // Eine Kostenreihe, die nur Belastungen kennt, nennt dauerhaft einen zu
    // hohen Betrag — und das fällt niemandem auf.
    const s = summiereKosten([
      monat("claude-kontingente", "2026-06", 100),
      monat("claude-kontingente", "2026-06", -25),
    ]);
    expect(Math.round(s.gesamtEur)).toBe(75);
  });

  it("rechnet den Projektanteil, statt ihn abzulegen", () => {
    const m = monat("datenbank", "2026-07", 100);
    // 8 Prozent laut gemessenem Schlüssel.
    expect(Math.round(anteilBetrag(m))).toBe(8);
    expect(m.betragEur).toBe(100);
  });

  it("trennt die Kostenarten", () => {
    const s = summiereKosten([
      monat("claude-abo", "2026-07", 100),
      monat("vercel", "2026-07", 100),
      monat("seo-abfragen", "2026-07", 100),
    ]);
    expect(s.jeArt.rechenleistung).toBeGreaterThan(0);
    expect(s.jeArt.betrieb).toBeGreaterThan(0);
    expect(s.jeArt.daten).toBe(100);
  });

  it("zählt Monate, nicht Zeilen", () => {
    const s = summiereKosten([
      monat("claude-abo", "2026-07", 10),
      monat("vercel", "2026-07", 10),
      monat("vercel", "2026-08", 10),
    ]);
    expect(s.monate).toBe(2);
  });
});

describe("Listenwert", () => {
  const tag = (modell: string, over: Partial<Listenwerttag> = {}): Listenwerttag => ({
    tag: "2026-09-01", modell,
    tokensGelesen: 0, tokensSchreibenKurz: 0, tokensSchreibenLang: 0,
    tokensEingabe: 0, tokensAusgabe: 0, ...over,
  });

  it("bleibt bei einem unbekannten Modell leer, statt einen Preis zu raten", () => {
    expect(listenwertUsd(tag("claude-gibtsnicht-9", { tokensAusgabe: 1e6 }))).toBeNull();
  });

  it("rechnet eine Million Ausgabe-Token zum Listenpreis", () => {
    expect(listenwertUsd(tag("claude-opus-5", { tokensAusgabe: 1e6 }))).toBeCloseTo(25, 5);
    expect(listenwertUsd(tag("claude-fable-5-1", { tokensAusgabe: 1e6 }))).toBeCloseTo(50, 5);
  });

  it("macht das Wiederlesen billig und das Schreiben teuer", () => {
    const gelesen = listenwertUsd(tag("claude-opus-5", { tokensGelesen: 1e6 }))!;
    const eingabe = listenwertUsd(tag("claude-opus-5", { tokensEingabe: 1e6 }))!;
    const kurz = listenwertUsd(tag("claude-opus-5", { tokensSchreibenKurz: 1e6 }))!;
    const lang = listenwertUsd(tag("claude-opus-5", { tokensSchreibenLang: 1e6 }))!;
    expect(gelesen).toBeLessThan(eingabe);
    expect(kurz).toBeGreaterThan(eingabe);
    expect(lang).toBeGreaterThan(kurz);
  });

  it("kennt die abweichende Wiederlese-Rate des großen Modells", () => {
    // Beim Fable-Modell kostet das Wiederlesen ein Vierzigstel statt eines
    // Zehntels. Über den Dreisatz gerechnet wäre es viermal zu teuer — und die
    // Zahl sähe trotzdem plausibel aus.
    const p = tokenPreisUsd("claude-fable-5-1")!;
    expect(p.gelesen).toBe(0.25);
    expect(tokenPreisUsd("claude-fable-5")!.gelesen).toBe(1);
  });

  it("liest den Preis auch bei einem Zusatz an der Modellkennung", () => {
    // Ein größeres Kontextfenster hängt einen Zusatz an den Namen. Ohne dieses
    // Abschneiden fiele jede solche Antwort ersatzlos aus der Rechnung.
    expect(tokenPreisUsd("claude-opus-5[1m]")).toEqual(tokenPreisUsd("claude-opus-5"));
  });

  it("trägt einen Stichtag an der Preisliste", () => {
    expect(PREISE_STAND).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(bekannteModelle().length).toBeGreaterThan(5);
  });
});

describe("Tabellen einlesen", () => {
  it("rechnet Spaltenbuchstaben in Positionen um", () => {
    expect(spalteAus("A")).toBe(0);
    expect(spalteAus("G")).toBe(6);
    expect(spalteAus("Z")).toBe(25);
    expect(spalteAus("AA")).toBe(26);
    expect(spalteAus(undefined)).toBeNull();
  });

  it("erkennt den Dateinamen auch in der zerlegten Schreibweise von macOS", () => {
    // DAS IST DIE FALLE, die den ersten Lauf leer ausgehen ließ: Das „Ü" kommt
    // vom Dateisystem als U plus Trema, im Quelltext ist es ein Zeichen. Beide
    // sehen gleich aus.
    const zusammen = "Übersicht_Q1_2026.csv";
    const zerlegt = zusammen.normalize("NFD");
    expect(zerlegt).not.toBe(zusammen);
    expect(istUebersicht(zusammen)).toBe(true);
    expect(istUebersicht(zerlegt)).toBe(true);
  });

  it("übergeht die Sicherungskopien eines geöffneten Dokuments", () => {
    expect(istUebersicht("~$Übersicht_August_2026.xlsx")).toBe(false);
    expect(istUebersicht("Kontoauszug.pdf")).toBe(false);
  });
});

describe("Übersicht", () => {
  const BESTAND: Bestandstag = {
    tag: "2026-09-22", dateien: 2293, codezeilen: 214328, dokuzeilen: 28408,
    testdateien: 300, testfaelle: 4467, commitsGesamt: 2474,
  };
  const ZAEHLSTAND: Zaehlstand = {
    rechner: 5, seiten: 97, widgets: 9, routen: 105, komponenten: 162,
    foerderprogramme: 237,
  };
  const leer: Summe = {
    tage: 0, tokensGelesen: 0, tokensNeu: 0, tokensEingabe: 0, tokensAusgabe: 0,
    tokensGesamt: 1e9, sitzungen: 0, nachrichtenGetippt: 0, nachrichtenLang: 0,
    antworten: 0, werkzeugschritte: 0, commits: 0,
  };
  const basis = {
    statistik: leer,
    arbeitsminuten: 60 * 400,
    arbeitstage: 60,
    kosten: summiereKosten([monat("claude-abo", "2026-08", 1000)]),
    listenwertUsd: 50000,
    bestand: BESTAND,
    aufwand: schaetzeAufwand(BESTAND, ZAEHLSTAND),
  };

  it("bildet das Rechenleistungs-Verhältnis NUR über den gemeinsamen Zeitraum", () => {
    // OHNE ÜBERLAPPUNG KEINE ZAHL: Die Kosten decken die ganze Laufzeit ab, der
    // Listenwert nur die letzten Wochen. Beide Gesamtsummen zu teilen ergäbe
    // ein Verhältnis, dessen Zähler und Nenner verschiedene Zeiträume messen —
    // genau das stand in der ersten Fassung und war um mehr als das Doppelte
    // daneben.
    expect(bilanz(basis).hebelRechenleistung).toBeNull();

    const mit = bilanz({
      ...basis,
      ueberlappung: { bezahltEur: 500, listenwertUsd: 20000, monate: 2 },
    });
    expect(mit.hebelRechenleistung).toBe(Math.round((20000 * 0.866) / 500));
    expect(mit.hebelRechenleistungMonate).toBe(2);
  });

  it("zählt hochgerechnete Stunden in den Zeit-Vergleich, hält sie aber getrennt", () => {
    const ohne = bilanz(basis);
    const mit = bilanz({ ...basis, stundenHochgerechnet: 200 });
    expect(ohne.investiert.stundenHochgerechnet).toBe(0);
    expect(mit.investiert.stundenHochgerechnet).toBe(200);
    // Die gemessene Stundenzahl bleibt unberührt — sie ist eine Messung.
    expect(mit.investiert.stunden).toBe(ohne.investiert.stunden);
    // Der Vergleich rechnet die Hochrechnung mit, sonst fiele er zu gut aus.
    expect(mit.hebelZeit!).toBeLessThan(ohne.hebelZeit!);
  });

  it("rechnet den Herstellwert zum belegten Stundensatz", () => {
    const b = bilanz(basis);
    expect(b.wert.eur).toBe(b.wert.personentage * 100 * STUNDEN_JE_TAG);
    expect(b.wert.vonEur).toBeLessThan(b.wert.eur);
    expect(b.wert.bisEur).toBeGreaterThan(b.wert.eur);
  });

  it("nennt keine Gesamtsumme über Bezahltes und Geschätztes", () => {
    // Die drei Größen haben verschiedene Einheiten und verschiedene Herkünfte.
    // Eine Summe über sie wäre die Zahl, die in jeder Erzählung als erstes
    // zitiert und als letztes geprüft wird.
    const b = bilanz(basis) as unknown as Record<string, unknown>;
    for (const feld of Object.keys(b)) {
      expect(feld).not.toMatch(/gesamt|summe/i);
    }
  });
});
