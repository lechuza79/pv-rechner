import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { gemeindeMeldungen, hatNachricht } from "../gemeinde-meldungen";

// Der Versandlauf — und die drei Fehler, die ein Versandlauf üblicherweise
// macht.
//
// 1. ER SCHICKT ZWEIMAL. Bricht er zwischen zwei Empfängern ab, schreibt der
//    Neustart die schon Bedienten erneut an. Deshalb wird der Merker VOR dem
//    Versand gesetzt, nicht danach: Der Preis ist eine verlorene Meldung im
//    Fehlerfall, und das ist die günstigere Richtung.
// 2. ER SCHICKT OHNE ANLASS. Ein Lauf, der bei jedem Durchgang etwas
//    verschickt, macht aus dem Abo einen Newsletter — und bricht die Zusage
//    neben dem Anmeldeknopf, für die sich jemand eingetragen hat.
// 3. ER SCHICKT AN ABGEMELDETE. Die Zeile bleibt nach der Abmeldung als
//    Nachweis stehen; wer die Tabelle selbst abfragt statt die Empfängerliste
//    zu nehmen, hebt die Zweckbindung auf.

const lies = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");
/**
 * Der Lauf OHNE seine Import-Zeilen.
 *
 * Zum dritten Mal in diesem Bereich dieselbe Falle: Ein Muster, das nach einem
 * Funktionsnamen sucht, findet zuerst den Import — und misst damit, dass etwas
 * eingebunden ist, nicht dass es benutzt wird. Einmal blieb ein Wächter
 * deswegen grün, nachdem der Aufruf zur Probe entfernt worden war.
 */
const lauf = (() => {
  const roh = lies("lib/abo-lauf.ts");
  return roh.slice(roh.indexOf("export type LaufErgebnis"));
})();
const route = lies("app/api/abo/versenden/route.ts");
const schicht = lies("lib/gemeinde-abo.ts");

describe("Kein doppelter Versand", () => {
  it("setzt den Merker VOR dem Versand", () => {
    const i = lauf.indexOf("versandVermerken");
    const j = lauf.indexOf("sendeAboMail(");
    expect(i).toBeGreaterThan(0);
    expect(j).toBeGreaterThan(0);
    expect(i, "Der Versandmerker muss vor dem Senden gesetzt werden").toBeLessThan(j);
  });

  it("sendet gar nicht, wenn der Merker nicht gesetzt werden konnte", () => {
    // Sonst ist die Reihenfolge oben wirkungslos: Merker scheitert, Mail geht
    // trotzdem raus, und der nächste Lauf schickt sie noch einmal.
    const stelle = lauf.slice(lauf.indexOf("versandVermerken"));
    expect(stelle.slice(0, 600)).toMatch(/catch[\s\S]{0,300}continue;/);
  });

  it("die Schreibfunktion schweigt bei einem Fehler NICHT", () => {
    const stelle = schicht.slice(schicht.indexOf("export async function versandVermerken"));
    expect(stelle.slice(0, 800)).toMatch(/throw new Error/);
  });

  it("überspringt, wer heute schon Post bekommen hat", () => {
    // AUF DEN AUFRUF, nicht auf den Namen. In der Gegenprobe wurde die
    // Aufrufzeile entfernt und die Funktionsdefinition blieb stehen — der Test
    // blieb grün, während der Lauf jeden Empfänger mehrfach am Tag
    // angeschrieben hätte. Vierter Fall derselben Klasse in diesem Bereich:
    // Ein Wächter, der Vorhandensein prüft statt Verwendung, prüft nichts.
    expect(lauf).toMatch(/if \(schonHeuteGeschrieben\(abo, o\.jetzt\)\) continue;/);

    // Am KALENDERTAG, nicht an einem Zeitabstand: Zwei Läufe am selben Tag
    // sollen sich nicht überholen, der nächste Tag aber schreiben dürfen.
    const stelle = lauf.slice(lauf.indexOf("function schonHeuteGeschrieben"));
    expect(stelle.slice(0, 400)).toMatch(/slice\(0,\s*10\)/);
  });
});

describe("Kein Versand ohne Anlass", () => {
  it("fragt die Rechnung, nicht den Kalender", () => {
    expect(lauf).toMatch(/hatNachricht\(/);
    // Und zwar BEVOR die Empfänger geladen werden — ein Ort ohne Nachricht
    // kostet dann nicht einmal eine Abfrage.
    expect(lauf.indexOf("hatNachricht(")).toBeLessThan(lauf.indexOf("empfaengerFuerOrt("));
  });

  it("eine reine Bestandsbeschreibung ist kein Anlass", () => {
    // Gegenprobe an der Funktion selbst: Ein Ort, über den es nur den Bestand
    // zu sagen gibt, löst keine Mail aus. Er stand beim letzten Mal genauso da.
    const nurBestand = gemeindeMeldungen({
      daten: {
        name: "Musterdorf",
        regionId: "09679147",
        population: 9000,
        solar: {
          total_count: 300,
          total_kwp: 3000,
          by_segment: [{ segment: "privat_dach", count: 250, kwp: 1800 }],
          by_year: [],
          by_year_segment: [],
        },
        speicher: { kwh_batterie: 900 },
        standIso: "2026-08-05",
      },
      heuteJahr: 2026,
    });
    expect(nurBestand.length).toBeGreaterThan(0); // es gibt etwas zu sagen …
    expect(hatNachricht(nurBestand)).toBe(false); // … aber nichts zu schicken
  });
});

describe("Kein Versand an Abgemeldete", () => {
  it("nimmt die Empfängerliste, nicht die Tabelle", () => {
    expect(lauf).toMatch(/empfaengerFuerOrt\(/);
    expect(lauf).not.toMatch(/from\("gemeinde_abos"\)/);
  });
});

describe("Der Lauf lässt sich ohne Wirkung ausprobieren", () => {
  it("kennt einen Probelauf", () => {
    // Ein Versandlauf, den noch nie jemand ohne Wirkung gesehen hat, ist einer,
    // dessen erste Wirkung eine echte Mail an einen echten Menschen ist.
    expect(lauf).toMatch(/trocken\?:\s*boolean/);
    expect(route).toMatch(/trocken/);
    const stelle = lauf.slice(lauf.indexOf("if (o.trocken)"));
    expect(stelle.slice(0, 200)).toMatch(/continue;/);
  });

  it("nimmt Zeit und Adresse von außen", () => {
    // Die Zeit, weil sich sonst nichts prüfen lässt, ohne die Systemuhr zu
    // verstellen. Die Adresse, weil ein Abmeldelink, der aus einer Testumgebung
    // auf die Produktion zeigt, dort ein fremdes Abo abmeldet.
    expect(lauf).toMatch(/jetzt:\s*Date/);
    expect(lauf).toMatch(/basisUrl:\s*string/);
    expect(lauf).not.toMatch(/Date\.now\(\)/);
  });

  it("fällt NICHT auf die Produktionsadresse zurück", () => {
    expect(route).not.toMatch(/\|\|\s*"https:\/\/solar-check\.io"/);
    expect(route).toMatch(/status:\s*503/);
  });
});

describe("Der Lauf steht hinter dem Betriebsgeheimnis", () => {
  it("weist ohne Berechtigung ab", () => {
    expect(route).toMatch(/CRON_SECRET/);
    expect(route).toMatch(/status:\s*401/);
  });

  it("hat genug Zeit", () => {
    // Ohne eigenes Zeitbudget bricht der Lauf mitten in der Empfängerliste ab —
    // und weil der Merker vorher sitzt, bekämen die Übersprungenen nie eine
    // Meldung, statt sie beim nächsten Lauf nachzuholen.
    expect(route).toMatch(/maxDuration/);
  });
});
