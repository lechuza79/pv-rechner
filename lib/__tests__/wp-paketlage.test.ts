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
  leistungKw: 18,
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

/**
 * Altbau: 10 kW Auslegung, alte Heizkörper mit 55 °C.
 *
 * Die Katalogleistungen liegen deutlich darüber, weil verglichen wird, was ein
 * Gerät AM AUSLEGUNGSPUNKT liefert: 30 % Abschlag für den unbekannten
 * Betriebspunkt, bei 55 °C weitere 20 % für die Kennlinie. 18 kW im Katalog
 * sind hier 10,1 kW.
 */
const ALTBAU: WpFall = { auslegungKw: 10, vorlaufC: 55, wpType: "lwwp" };

describe("Lage der Komplettpakete", () => {
  it("meldet 'vorhanden', wenn ein passendes Paket im Katalog steht", () => {
    const katalog = [
      g({ umfang: "paket", leistungKw: 19, vorlaufMaxC: 65 }),
      g({ umfang: "geraet", leistungKw: 18 }),
    ];
    expect(paketLage(katalog, ALTBAU)).toBe("vorhanden");
  });

  it("unterscheidet 'gibt es nicht' von 'passt nicht' — der eigentliche Befund", () => {
    // Ein Paket der richtigen Größe, das die Vorlauftemperatur nicht schafft.
    // Die frühere Fassung hätte hier „führt keine Komplettpakete" geschrieben.
    const passtNicht = [
      g({ umfang: "paket", leistungKw: 19, vorlaufMaxC: 45 }),
      g({ umfang: "geraet", leistungKw: 18, vorlaufMaxC: 65 }),
    ];
    expect(paketLage(passtNicht, ALTBAU)).toBe("unpassend");

    // Und der echte Fall: gar kein Paket in dieser Größenklasse.
    const keins = [g({ umfang: "geraet", leistungKw: 18, vorlaufMaxC: 65 })];
    expect(paketLage(keins, ALTBAU)).toBe("keine");
  });

  it("folgt der Eignungsregel des Rechners — auch als die sich verschärft hat", () => {
    // Diese Funktion MUSS derselben Regel folgen wie die Auswahl, sonst
    // widersprechen sich Liste und Erklärung.
    //
    // Die frühere Fassung dieses Tests belegte das an einem Paket mit dem
    // Dreifachen der Auslegung und erwartete „vorhanden": Damals schloss zu
    // viel Leistung nicht aus. Sie schrieb dazu, wer die Obergrenze zum
    // Ausschlussgrund machen wolle, ändere sie in `beurteile` — genau das ist
    // am 05.09.2026 geschehen. Der Test prüft dieselbe Aussage weiter, jetzt
    // an der geltenden Regel.
    //
    // 34 kW im Katalog sind bei 55 °C 19,0 kW am Auslegungspunkt, also das
    // 1,9-fache der Auslegung. Das Paket fällt in der Auswahl heraus, und
    // damit darf die Erklärung es auch nicht als vorhanden ausweisen.
    const zuGross = [
      g({ umfang: "paket", leistungKw: 34, vorlaufMaxC: 65 }),
      g({ umfang: "geraet", leistungKw: 18, vorlaufMaxC: 65 }),
    ];
    expect(paketLage(zuGross, ALTBAU)).toBe("unpassend");

    // Die Gegenprobe: knapp über der Auslegung bleibt es „vorhanden".
    const reichlich = [
      g({ umfang: "paket", leistungKw: 22, vorlaufMaxC: 65 }),
      g({ umfang: "geraet", leistungKw: 18, vorlaufMaxC: 65 }),
    ];
    expect(paketLage(reichlich, ALTBAU)).toBe("vorhanden");
  });

  it("zählt bei 'unpassend' nur Pakete der Größenklasse", () => {
    // Hier greift die Größenklasse: Ein Paket mit dem Zweieinhalbfachen der
    // Auslegung, das zusätzlich am Vorlauf scheitert, beantwortet die Frage
    // nicht, ob es für ein 10-kW-Haus eins gibt. Sonst stünde „gibt es, passt
    // nur nicht" über einem Sortiment, in dem für diese Größe wirklich nichts
    // ist. 45 kW im Katalog sind bei 55 °C 25,2 kW am Auslegungspunkt.
    const zuGrossUndZuKalt = [
      g({ umfang: "paket", leistungKw: 45, vorlaufMaxC: 45 }),
      g({ umfang: "geraet", leistungKw: 18, vorlaufMaxC: 65 }),
    ];
    expect(paketLage(zuGrossUndZuKalt, ALTBAU)).toBe("keine");
  });

  it("sieht nur die gewählte Wärmequelle", () => {
    // Ein Erdwärme-Paket ist für einen Luft/Wasser-Fall keine Antwort.
    const andereQuelle = [
      g({ umfang: "paket", bauart: "sole-wasser", leistungKw: 11, vorlaufMaxC: 65 }),
      g({ umfang: "geraet", leistungKw: 18, vorlaufMaxC: 65 }),
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
