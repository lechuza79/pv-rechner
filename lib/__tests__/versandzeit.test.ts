import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { versandzeitOk, AB_EMPFAENGERN, GUTE_WOCHENTAGE, FENSTER } from "../versandzeit";

// Das Versandfenster — und die vier Arten, auf die so eine Bremse falsch wird.
//
// 1. SIE BREMST EINEN KLEINEN LAUF. Bei siebzehn Empfängern ist der gemessene
//    Unterschied ein einziger Mensch; eine Nachricht dafür einen Tag liegen zu
//    lassen kostet mehr, als sie bringt.
// 2. SIE SCHLÄGT MITTEN IM LAUF ZU. Dann sind die Hälfte der Mails draußen und
//    der Rest vertagt — und niemand sieht dem Lauf an, ob er gelaufen ist.
// 3. SIE ERBT DIE FERIENBREMSE der Kommunen-Anschreiben. Die gilt der
//    Kaltakquise, nicht Menschen, die eine Meldung bestellt haben.
// 4. SIE BLENDET DEN PROBELAUF. Der verschickt ohnehin nichts; schweigt er
//    außerhalb des Fensters, verbirgt er genau das, wofür es ihn gibt.

const lies = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");
const lauf = lies("lib/abo-lauf.ts");

// Ein Dienstag um 18 Uhr deutscher Zeit (Sommerzeit = UTC+2).
const imFenster = new Date("2026-09-08T16:00:00Z");
const sonntag = new Date("2026-09-06T16:00:00Z");
// Derselbe Dienstag um 10 Uhr — mitten im Arbeitstag, also draußen. Genau
// dieses Fenster stand hier zuerst; es ist die Empfehlung für
// Geschäftsempfänger und für Privatleute die falsche Zielgruppe.
const dienstagVormittags = new Date("2026-09-08T08:00:00Z");

describe("Das Fenster selbst", () => {
  it("lässt einen kleinen Lauf immer durch", () => {
    // Sonntag, 20 Uhr — der schlechteste denkbare Zeitpunkt. Die Menge ist
    // eine FESTE Zahl, nicht `AB_EMPFAENGERN - 1`: Die erste Fassung rechnete
    // gegen die Schwelle selbst und blieb grün, als die Schwelle auf null
    // gesetzt wurde — der Test hätte den Fehler mit sich selbst verglichen.
    expect(versandzeitOk(sonntag, 17).ok).toBe(true);
  });

  it("die Schwelle steht, wo sie hergeleitet ist", () => {
    // Bei siebzehn Empfängern macht die gemessene Spanne (5–8 Prozentpunkte)
    // keinen ganzen Menschen aus. Wer sie senkt, bremst Läufe, bei denen das
    // Warten teurer ist als der Gewinn.
    expect(AB_EMPFAENGERN).toBe(20);
  });

  it("bremst einen großen Lauf am falschen Tag", () => {
    const u = versandzeitOk(sonntag, AB_EMPFAENGERN);
    expect(u.ok).toBe(false);
    if (!u.ok) expect(u.grund).toMatch(/Sonntag/);
  });

  it("bremst einen großen Lauf zur falschen Stunde", () => {
    const u = versandzeitOk(dienstagVormittags, 500);
    expect(u.ok).toBe(false);
    if (!u.ok) expect(u.grund).toMatch(/außerhalb/);
  });

  it("lässt einen großen Lauf im Fenster durch", () => {
    expect(versandzeitOk(imFenster, 500).ok).toBe(true);
  });

  it("rechnet in DEUTSCHER Zeit, nicht in UTC", () => {
    // 15:30 UTC ist im Sommer 17:30 in Deutschland — also drin. Wer die
    // Systemzeit nimmt, sperrt hier zu, und im Winter genau andersherum.
    expect(versandzeitOk(new Date("2026-09-08T15:30:00Z"), 500).ok).toBe(true);
    // Dieselbe Uhrzeit im Winter (UTC+1) ist 16:30 — also draußen.
    expect(versandzeitOk(new Date("2026-12-08T15:30:00Z"), 500).ok).toBe(false);
  });

  it("nennt bei Ablehnung, wann es wieder geht", () => {
    const u = versandzeitOk(sonntag, 500);
    if (!u.ok) expect(u.naechstes.length).toBeGreaterThan(10);
  });

  it("versendet werktags am ABEND, nicht im Arbeitstag", () => {
    // Empfänger sind Privatleute zu Hause. Die Vormittagsempfehlung gilt
    // Geschäftsempfängern und stand hier zuerst — sie ist die falsche
    // Zielgruppe, und der Fehler war von außen unsichtbar.
    expect(FENSTER.filter((f) => f.tag < 5)).toEqual([
      { tag: 2, von: 17, bis: 20 },
      { tag: 3, von: 17, bis: 20 },
      { tag: 4, von: 17, bis: 20 },
    ]);
    expect(versandzeitOk(new Date("2026-09-08T08:00:00Z"), 500).ok).toBe(false);
  });

  it("der SAMSTAG zählt mit — und am frühen Nachmittag, nicht abends", () => {
    // Er fehlte zuerst, weil eine Suchantwort ihn nannte und niemand sie
    // auswertete. Er trägt sich über einen Mechanismus, nicht über eine
    // Öffnungsrate: Am Wochenende verschicken deutlich weniger Absender, das
    // Postfach ist leerer, und wer samstags liest, hat Zeit.
    expect(GUTE_WOCHENTAGE).toEqual([2, 3, 4, 6]);
    // Samstag, 14 Uhr deutscher Sommerzeit.
    expect(versandzeitOk(new Date("2026-09-12T12:00:00Z"), 500).ok).toBe(true);
    // Samstag, 18 Uhr — werktags das beste Fenster, samstags ist niemand da.
    expect(versandzeitOk(new Date("2026-09-12T16:00:00Z"), 500).ok).toBe(false);
  });

  it("der SONNTAG bleibt draußen", () => {
    // Der einzige Tag, für den eine Quelle einen deutlich schlechteren Wert
    // nennt (21,8 % gegen 26,9 % am besten Tag).
    expect(GUTE_WOCHENTAGE).not.toContain(0);
    expect(versandzeitOk(new Date("2026-09-13T12:00:00Z"), 500).ok).toBe(false);
  });

  it("übernimmt die Nachtstunden des Öffnungs-Benchmarks NICHT", () => {
    // Der Inxmail-Benchmark 2026 weist 3–6 Uhr morgens als beste Versandzeit
    // aus. Das misst zu gutem Teil sich selbst: Apples Mail-Datenschutz lädt
    // die Bilder beim EINGANG, und Apple Mail steht für rund 58 % aller
    // gemeldeten Öffnungen. Eine Nacht-Zustellung wäre hier ein Fehler, der
    // sich auf eine große Zahl beruft.
    expect(versandzeitOk(new Date("2026-09-08T02:00:00Z"), 500).ok).toBe(false);
  });
});

describe("Der Lauf benutzt es richtig", () => {
  it("prüft das Fenster, BEVOR die erste Mail rausgeht", () => {
    const fenster = lauf.indexOf("versandzeitOk(");
    const senden = lauf.indexOf("sendeAboMail(");
    expect(fenster).toBeGreaterThan(0);
    expect(senden).toBeGreaterThan(0);
    expect(fenster, "Das Fenster darf nicht mitten im Versand zuschlagen").toBeLessThan(senden);
  });

  it("sammelt erst alle Empfänger und schickt dann", () => {
    // Ohne die zwei Durchgänge kennt das Fenster die Menge nicht und trifft
    // seine Entscheidung an einer Zahl, die noch wächst.
    const sammeln = lauf.indexOf("versandliste.push(");
    expect(sammeln).toBeGreaterThan(0);
    expect(sammeln).toBeLessThan(lauf.indexOf("versandzeitOk("));
  });

  it("verschiebt statt halb zu senden", () => {
    const stelle = lauf.slice(lauf.indexOf("versandzeitOk("));
    expect(stelle.slice(0, 400)).toMatch(/verschoben\s*=/);
    expect(stelle.slice(0, 400)).toMatch(/return erg;/);
  });

  it("greift NICHT im Probelauf", () => {
    const stelle = lauf.slice(lauf.indexOf("versandzeitOk("));
    expect(stelle.slice(0, 300)).toMatch(/!o\.trocken/);
  });

  it("erbt die Ferienbremse der Anschreiben NICHT", () => {
    // Sie gilt der Kaltakquise an Rathäuser. Wer sie hier übernimmt, hält
    // einem Abonnenten seine bestellte Meldung vor, weil in seinem Bundesland
    // Ferien sind.
    expect(lauf).not.toMatch(/schulferien|ferienAm|versandfenster\(/);
  });
});
