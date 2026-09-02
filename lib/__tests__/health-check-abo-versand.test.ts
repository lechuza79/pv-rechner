import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { aboVersandStockt } from "../../scripts/health-check";

// ─── Wirkt der Abo-Versand, oder ist er bloss eingerichtet? ──────────────────
//
// DER ECHTE FALL (02.09.2026, in der Fehler-Triage an der Produktion
// gemessen): Der Bereitschafts-Melder sagte „Versandweg und Signatur sind in
// der Produktion gesetzt" — und in der Ablage standen zwei Anmeldungen und
// NULL je versendete Bestaetigungsmails. Genau diese Zahlen stehen unten als
// Fixture, damit der Waechter gegen den ECHTEN Vorfall geprueft wird und nicht
// gegen eine bequeme Nachbildung.
//
// Die Fehlerklasse ist die vierte Ausprägung derselben Sache im Projekt: Was
// niemand wiederkehrend MISST, merkt niemand. Der Spaltenabgleich fand sie
// zwischen Code und Tabelle, die Kostenwache zwischen Mengen und Rechnung, der
// Bereitschafts-Melder zwischen Code und Umgebung — und hier liegt sie
// zwischen der Umgebung und ihrer Wirkung.

const VORFALL_02_09 = { bereit: true, ohneBeleg: 2 };

describe("Abo-Versand: eingerichtet ist nicht gewirkt", () => {
  it("meldet den echten Vorfall: eingerichtet, und trotzdem wartet jemand", () => {
    expect(aboVersandStockt(VORFALL_02_09)).toBe(true);
  });

  it("schweigt, wenn jede Anmeldung ihre Bestaetigung bekommen hat", () => {
    expect(aboVersandStockt({ bereit: true, ohneBeleg: 0 })).toBe(false);
  });

  // „Konnte nicht nachsehen" ist kein Befund — dieselbe Trennung wie ueberall
  // sonst im Gesundheitscheck zwischen „ist kaputt" und „Abruf kam nicht
  // durch". Der Fall tritt real auf, solange eine aeltere Auslieferung laeuft,
  // die das Feld noch gar nicht kennt.
  it("meldet nichts, wenn gar nicht gemessen werden konnte", () => {
    expect(aboVersandStockt({ bereit: true, ohneBeleg: null })).toBe(false);
  });

  // Fehlt die Konfiguration, steht der Grund schon im Befund nebenan. Beides zu
  // melden waere derselbe Sachverhalt zweimal — und von zwei Meldungen ueber
  // eine Ursache gewoehnt man sich ab, Meldungen zu lesen.
  it("doppelt den Konfigurations-Befund nicht", () => {
    expect(aboVersandStockt({ bereit: false, ohneBeleg: 5 })).toBe(false);
  });
});

// ─── Die Gegenprobe: misst die Route ueberhaupt das Richtige? ────────────────
//
// Ein Waechter, der nichts sieht und trotzdem gruen meldet, ist schlimmer als
// keiner. Die Urteilsfunktion oben ist rein und leicht zu pruefen — die
// eigentliche Arbeit steckt in der Abfrage, und die kann man nur daran messen,
// dass ihre vier Einschraenkungen wirklich dastehen. Jede einzelne davon ist
// ein Fehlalarm oder ein blinder Fleck, wenn sie fehlt.
describe("Die Abfrage hinter der Zahl", () => {
  const quelle = readFileSync(
    resolve(__dirname, "../../app/api/abo/bereit/route.ts"),
    "utf-8",
  );

  it("zaehlt nur offene Anmeldungen — eine bestaetigte hat ihre Mail bekommen", () => {
    expect(quelle).toMatch(/\.eq\("status",\s*"ausstehend"\)/);
  });

  it("zaehlt nur Zeilen ohne Versandbeleg", () => {
    expect(quelle).toMatch(/\.is\("versand_beleg",\s*null\)/);
  });

  // Ohne Karenz faellt jeder Lauf, der zwischen Anlegen und Beleg misst, auf
  // eine gesunde Anmeldung herein. Ohne Fenster meldet eine liegengebliebene
  // Zeile bis in alle Ewigkeit weiter — und eine Warnung, die bei jedem Lauf
  // angeht, filtert man weg und verpasst dann die echte.
  it("laesst dem Versand seine Karenz und schaut nur in ein Fenster", () => {
    expect(quelle).toMatch(/KARENZ_MS\s*=\s*15\s*\*\s*60\s*\*\s*1000/);
    expect(quelle).toMatch(/FENSTER_MS\s*=\s*24\s*\*\s*60\s*\*\s*60\s*\*\s*1000/);
    expect(quelle).toMatch(/\.lt\("erstellt_am"/);
    expect(quelle).toMatch(/\.gt\("erstellt_am"/);
  });

  // Ein Fehler beim Zaehlen darf nicht als „null Haenger" zurueckkommen: Das
  // waere eine Entwarnung aus einem gescheiterten Abruf, also genau die
  // Verwechslung, gegen die der ganze Melder gebaut ist.
  it("gibt bei einem Fehler nicht null Haenger zurueck, sondern gar keine Auskunft", () => {
    expect(quelle).toMatch(/if\s*\(error\)\s*return null;/);
  });
});
