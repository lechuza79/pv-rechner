import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { paketLage, type WpFall } from "../wp-empfehlung";
import type { WpGeraet } from "../wp-katalog";

/**
 * Warum keine Komplettpakete dastehen — und warum das drei Fälle sind.
 *
 * Die Oberfläche schrieb „In dieser Anlagengröße führt der Händler keine
 * Komplettpakete", sobald unter den Treffern keins war. Das ist eine andere
 * Aussage als die, die sie belegen konnte: Die Auswahl filtert ERST auf Eignung
 * und wählt DANACH Pakete. Gibt es ein passend großes Paket, das nur an der
 * Vorlauftemperatur scheitert, war der Satz eine Falschaussage über das
 * Sortiment eines Dritten — und der eigentliche Grund blieb ungenannt.
 *
 * Gefunden von einer Gegenprüfung am 05.09.2026.
 */

const g = (ueber: Partial<WpGeraet>): WpGeraet => ({
  id: Math.random().toString(36).slice(2),
  name: "Testgerät",
  marke: "TEST",
  leistungKw: 10,
  herkunft: "ausgeschrieben",
  bauart: "luft-wasser",
  preisEur: 9000,
  versandEur: 0,
  link: "https://example.invalid",
  bildUrl: null,
  lieferbar: true,
  vorlaufMaxC: 65,
  kaeltemittel: "r290",
  aufbau: "monoblock",
  umfang: "geraet",
  ...ueber,
});

/** Altbau: 10 kW Auslegung, alte Heizkörper mit 55 °C. */
const ALTBAU: WpFall = { auslegungKw: 10, vorlaufC: 55, wpType: "lwwp" };

describe("Lage der Komplettpakete", () => {
  it("meldet 'vorhanden', wenn ein passendes Paket im Katalog steht", () => {
    const katalog = [
      g({ umfang: "paket", leistungKw: 11, vorlaufMaxC: 65 }),
      g({ umfang: "geraet", leistungKw: 10 }),
    ];
    expect(paketLage(katalog, ALTBAU)).toBe("vorhanden");
  });

  it("unterscheidet 'gibt es nicht' von 'passt nicht' — der eigentliche Befund", () => {
    // Ein Paket der richtigen Größe, das die Vorlauftemperatur nicht schafft.
    // Die frühere Fassung hätte hier „führt keine Komplettpakete" geschrieben.
    const passtNicht = [
      g({ umfang: "paket", leistungKw: 11, vorlaufMaxC: 45 }),
      g({ umfang: "geraet", leistungKw: 10, vorlaufMaxC: 65 }),
    ];
    expect(paketLage(passtNicht, ALTBAU)).toBe("unpassend");

    // Und der echte Fall: gar kein Paket in dieser Größenklasse.
    const keins = [g({ umfang: "geraet", leistungKw: 10, vorlaufMaxC: 65 })];
    expect(paketLage(keins, ALTBAU)).toBe("keine");
  });

  it("folgt der Eignungsregel des Rechners, auch wo die großzügig ist", () => {
    // Ein 30-kW-Paket für ein 10-kW-Haus gilt als „vorhanden" — und das ist
    // KEIN Fehler dieser Funktion, sondern die geltende Eignungsregel: Zu wenig
    // Leistung schließt aus, zu viel nicht (siehe `beurteile`). Das Paket landet
    // deshalb wirklich in der Trefferliste, und ein Satz „führt keine Pakete"
    // stünde dann direkt über einem.
    //
    // Diese Funktion MUSS derselben Regel folgen wie die Auswahl — sonst
    // widersprechen sich Liste und Erklärung. Wer die Obergrenze zum
    // Ausschlussgrund machen will, ändert sie in `beurteile`, nicht hier.
    const zuGross = [
      g({ umfang: "paket", leistungKw: 30, vorlaufMaxC: 65 }),
      g({ umfang: "geraet", leistungKw: 10, vorlaufMaxC: 65 }),
    ];
    expect(paketLage(zuGross, ALTBAU)).toBe("vorhanden");
  });

  it("zählt bei 'unpassend' nur Pakete der Größenklasse", () => {
    // Hier greift die Größenklasse: Ein 30-kW-Paket, das zusätzlich am Vorlauf
    // scheitert, beantwortet die Frage nicht, ob es für ein 10-kW-Haus eins
    // gibt. Sonst stünde „gibt es, passt nur nicht" über einem Sortiment, in
    // dem für diese Größe wirklich nichts ist.
    const zuGrossUndZuKalt = [
      g({ umfang: "paket", leistungKw: 30, vorlaufMaxC: 45 }),
      g({ umfang: "geraet", leistungKw: 10, vorlaufMaxC: 65 }),
    ];
    expect(paketLage(zuGrossUndZuKalt, ALTBAU)).toBe("keine");
  });

  it("sieht nur die gewählte Wärmequelle", () => {
    // Ein Erdwärme-Paket ist für einen Luft/Wasser-Fall keine Antwort.
    const andereQuelle = [
      g({ umfang: "paket", bauart: "sole-wasser", leistungKw: 11, vorlaufMaxC: 65 }),
      g({ umfang: "geraet", leistungKw: 10, vorlaufMaxC: 65 }),
    ];
    expect(paketLage(andereQuelle, ALTBAU)).toBe("keine");
  });

  it("wird in der Oberfläche wirklich benutzt, statt aus den Treffern geraten", () => {
    const kachel = fs.readFileSync(
      path.resolve(__dirname, "..", "..", "components", "WpGeraeteEmpfehlung.tsx"),
      "utf-8",
    );
    // Beide Sätze hängen an der Lage aus dem Katalog …
    expect(kachel).toMatch(/paketLage === "keine"/);
    expect(kachel).toMatch(/paketLage === "unpassend"/);
    // … und die alte Ableitung aus der Trefferliste ist weg.
    expect(kachel).not.toMatch(/nurEinzelgeraete/);
    // Die Schnittstelle liefert sie mit.
    const route = fs.readFileSync(
      path.resolve(__dirname, "..", "..", "app", "api", "wp-geraete", "route.ts"),
      "utf-8",
    );
    expect(route).toMatch(/paketLage:\s*paketLage\(/);
  });
});
