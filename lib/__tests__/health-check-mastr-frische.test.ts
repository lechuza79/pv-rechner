import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { mastrAlterTage, MASTR_WORKFLOW } from "../../scripts/health-check";
import {
  IMPORT_NACHFRIST_TAGE,
  importNoetig,
  importPlanBefund,
  importTageAusZeitplan,
  importlaufMeldung,
  zyklusStart,
} from "../mastr-import-plan";

/**
 * Der Totmann-Schalter für den Anlagenbestand.
 *
 * ANLASS DER ERSTEN FASSUNG (Audit 19.08.2026): Über 11.000 Atlas-Seiten rechnen
 * mit den Zahlen aus EINEM monatlichen Import. Bleibt der aus, liefern alle
 * diese Seiten weiterhin HTTP 200, sind schnell, sehen richtig aus — und zeigen
 * den Bestand von vorletztem Monat.
 *
 * ANLASS DER ZWEITEN (09.09.2026): Genau dieser Fall trat am 05.09.2026 ein, und
 * die Aufsicht hat geschwiegen. Sie urteilte über das ALTER in Tagen (ab 45
 * gelb, ab 70 rot); am Tag des Fehlschlags war der Bestand 31 Tage alt, also
 * grün. Rot wäre er erst am 14.10. geworden — nach dem Oktober-Lauf, der die
 * Lücke stillschweigend geschlossen hätte. Bemerkt hat es ein Mensch, zufällig,
 * vier Tage später.
 *
 * Eine Tagesschwelle kann „ein Lauf ist ausgefallen" nicht ausdrücken: Sie misst
 * den Abstand zum letzten Erfolg, nicht den zum letzten TERMIN. Geprüft wird
 * hier deshalb die Terminrechnung — und zwar in beide Richtungen: Schlägt sie
 * an, wenn ein Zyklus verstrichen ist, und schweigt sie, solange der Rhythmus
 * stimmt?
 */

const TAGE = [5, 7, 9]; // wie im Zeitplan der Action

describe("Import-Termin: aus dem Zeitplan gelesen, nicht getippt", () => {
  it("liest die Tage aus dem echten Zeitplan der Action", () => {
    const yaml = readFileSync(join(__dirname, "..", "..", ".github", "workflows", MASTR_WORKFLOW), "utf8");
    expect(importTageAusZeitplan(yaml)).toEqual(TAGE);
  });

  it("nimmt Kommalisten und mehrere Zeilen", () => {
    expect(importTageAusZeitplan('    - cron: "0 4 5,7,9 * *"')).toEqual([5, 7, 9]);
    expect(importTageAusZeitplan('- cron: "0 4 5 * *"\n- cron: "0 4 9 * *"')).toEqual([5, 9]);
  });

  it("sagt „weiß nicht“ statt zu raten", () => {
    // Ein Sternchen ist kein Monatsrhythmus, eine Schrittweite auch nicht. Beides
    // hier zu deuten hieße raten — und ein geratener Termin erzeugt entweder
    // Fehlalarme oder Schweigen, je nachdem wie man rät.
    expect(importTageAusZeitplan('- cron: "0 4 * * *"')).toBeNull();
    expect(importTageAusZeitplan('- cron: "0 4 */3 * *"')).toBeNull();
    expect(importTageAusZeitplan("kein Zeitplan hier")).toBeNull();
    // Ein Tag jenseits des 28. gibt es nicht in jedem Monat — der Februar wäre
    // eine stille Lücke.
    expect(importTageAusZeitplan('- cron: "0 4 31 * *"')).toBeNull();
  });
});

describe("Zyklus: welcher Termin gilt gerade", () => {
  it("der erste Termin des Monats, sobald er angebrochen ist", () => {
    expect(zyklusStart(TAGE, new Date("2026-09-05T04:00:00Z"))).toBe("2026-09-05");
    expect(zyklusStart(TAGE, new Date("2026-09-30T23:00:00Z"))).toBe("2026-09-05");
  });

  it("vor dem Termin läuft noch der Zyklus des Vormonats", () => {
    expect(zyklusStart(TAGE, new Date("2026-09-04T23:00:00Z"))).toBe("2026-08-05");
  });

  it("trägt über den Jahreswechsel", () => {
    expect(zyklusStart(TAGE, new Date("2026-01-03T00:00:00Z"))).toBe("2025-12-05");
  });
});

describe("Der echte Ausfall vom 05.09.2026", () => {
  // Gemessen: Der Lauf am 05.09. brach nach 26 Sekunden ab (der Server der
  // Behörde war vom Läufer aus nicht erreichbar), in der Datenbank stand am
  // 09.09. weiterhin der 05.08. Die alte Aufsicht meldete an keinem dieser Tage
  // irgendetwas.
  const stand = "2026-08-05";

  it("am Tag des Fehlschlags: der Zyklus ist offen, gemeldet wird der rote Lauf", () => {
    const b = importPlanBefund(stand, TAGE, new Date("2026-09-05T09:00:00Z"));
    expect(b.art).toBe("unterwegs");
    // Ohne den Ausgang des Laufs ist das noch kein Befund — der Zyklus läuft ja.
    expect(importlaufMeldung(b, "success")).toBeNull();
    // Mit rotem Lauf schon, aber als Warnung: Am 07. steht der nächste Anlauf an.
    expect(importlaufMeldung(b, "failure")?.stufe).toBe("warnung");
    expect(importlaufMeldung(b, "cancelled")?.stufe).toBe("warnung");
  });

  it("nach dem letzten Anlauf samt Nachfrist: Befund für Claude", () => {
    const b = importPlanBefund(stand, TAGE, new Date("2026-09-11T13:00:00Z"));
    expect(b.art).toBe("ausgefallen");
    // Auch ohne jede Kenntnis der Lauf-Historie — der Termin allein trägt hier.
    expect(importlaufMeldung(b, null)?.stufe).toBe("claude");
  });

  it("die Nachfrist wird eingehalten, nicht übersprungen", () => {
    // Am letzten Anlauf selbst läuft der Lauf noch (rund zweieinhalb Stunden,
    // danach Ungültig-Erklären und Aufwärmen). Wer hier schon meldet, meldet
    // jeden Monat grundlos — und eine Meldung, die immer angeht, filtert man weg.
    expect(importPlanBefund(stand, TAGE, new Date("2026-09-09T09:00:00Z")).art).toBe("unterwegs");
    expect(importPlanBefund(stand, TAGE, new Date("2026-09-10T23:00:00Z")).art).toBe("unterwegs");
  });

  it("die alte Tagesschwelle hätte hier geschwiegen", () => {
    // Der Beleg dafür, dass die Umstellung nötig war und nicht Geschmack ist:
    // 31 Tage am Tag des Fehlschlags, 37 am Tag der Entdeckung — beides lag
    // unter den 45, ab denen die alte Aufsicht überhaupt erst gelb wurde.
    expect(mastrAlterTage("2026-08-05T00:00:00+00:00", new Date("2026-09-05T09:00:00Z"))).toBeLessThan(45);
    expect(mastrAlterTage("2026-08-05T00:00:00+00:00", new Date("2026-09-11T13:00:00Z"))).toBeLessThan(45);
    // Und die neue Aufsicht meldet an genau diesem Tag.
    expect(importPlanBefund("2026-08-05", TAGE, new Date("2026-09-11T13:00:00Z")).art).toBe("ausgefallen");
  });
});

describe("Der Normalfall darf nicht melden", () => {
  it("frisch importierter Bestand ist aktuell", () => {
    expect(importPlanBefund("2026-09-05", TAGE, new Date("2026-09-20T00:00:00Z")).art).toBe("aktuell");
  });

  it("kurz vor dem nächsten Termin ist ein Monat alter Bestand noch richtig", () => {
    // Am 04.10. ist der Bestand vom 05.09. 29 Tage alt — und vollkommen in
    // Ordnung, weil der Oktober-Zyklus noch gar nicht begonnen hat. Genau diese
    // Unterscheidung kann eine Tagesschwelle nicht treffen.
    expect(importPlanBefund("2026-09-05", TAGE, new Date("2026-10-04T00:00:00Z")).art).toBe("aktuell");
  });

  it("ein roter Lauf bei aktuellem Bestand ist eine Warnung, kein Ausfall", () => {
    const b = importPlanBefund("2026-09-05", TAGE, new Date("2026-09-20T00:00:00Z"));
    expect(importlaufMeldung(b, "failure")?.stufe).toBe("warnung");
    expect(importlaufMeldung(b, "success")).toBeNull();
  });

  it("ohne Kenntnis der Lauf-Historie wird nichts behauptet", () => {
    const b = importPlanBefund("2026-09-05", TAGE, new Date("2026-09-20T00:00:00Z"));
    expect(importlaufMeldung(b, null)).toBeNull();
  });
});

describe("Der Lauf selbst: hat er noch etwas zu tun?", () => {
  it("der Nachhol-Termin überspringt sich, wenn der erste geglückt ist", () => {
    // Ohne das wären die zusätzlichen Termine keine Absicherung, sondern
    // dreifache Arbeit: dreimal 3,2 GB und dreimal zwei Stunden Aufwärmen.
    expect(importNoetig("2026-09-05", TAGE, new Date("2026-09-07T04:00:00Z"))).toBe(false);
    expect(importNoetig("2026-09-05", TAGE, new Date("2026-09-09T04:00:00Z"))).toBe(false);
  });

  it("der Nachhol-Termin arbeitet, wenn der erste ausgefallen ist", () => {
    expect(importNoetig("2026-08-05", TAGE, new Date("2026-09-07T04:00:00Z"))).toBe(true);
  });

  it("und er arbeitet im neuen Monat wieder", () => {
    expect(importNoetig("2026-09-05", TAGE, new Date("2026-10-05T04:00:00Z"))).toBe(true);
  });
});

describe("Die Nachfrist bleibt, wo der Rhythmus sie hinsetzt", () => {
  it("keine Nachfrist jenseits eines halben Zyklus", () => {
    // CLAUDE.md: „kein Hochsetzen der Schwellen, damit ein Befund verschwindet."
    // Eine Nachfrist von zwei Wochen machte aus der Aufsicht wieder das, was sie
    // vorher war: eine, die den Ausfall erst bemerkt, wenn der nächste Import
    // ihn geheilt hat.
    expect(IMPORT_NACHFRIST_TAGE).toBeGreaterThanOrEqual(1);
    expect(IMPORT_NACHFRIST_TAGE).toBeLessThanOrEqual(5);
  });
});

describe("Das Alter bleibt Auskunft, nicht Urteil", () => {
  it("rechnet gegen einen hereingereichten Stichtag, nicht gegen die Uhr", () => {
    expect(mastrAlterTage("2026-08-05T00:00:00+00:00", new Date("2026-08-19T00:00:00Z"))).toBe(14);
  });

  it("schneidet angebrochene Tage ab, statt aufzurunden", () => {
    expect(mastrAlterTage("2026-08-05T00:00:00+00:00", new Date("2026-08-05T23:59:00Z"))).toBe(0);
  });
});
