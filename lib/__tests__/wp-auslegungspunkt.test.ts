import { describe, it, expect } from "vitest";
import { leistungAmAuslegungspunkt, beurteile, type WpFall } from "../wp-empfehlung";
import type { WpGeraet } from "../wp-katalog";

/**
 * Die Leistung am Auslegungspunkt — und warum das Warmwasser NICHT hineingehört.
 *
 * Am 05.09.2026 baute eine Sitzung den Vorlauf-Abschlag mit
 * `max(Heizungsvorlauf, Warmwasser)` ein. Gemeint war Vorsicht, herausgekommen
 * ist eine UMKEHRUNG: Weil das Warmwasser mit 55 °C angesetzt war, griff der
 * 20-%-Abschlag überall — auch im Neubau mit 35 °C Fußbodenheizung. Jedes Gerät
 * rechnete dort nur noch mit 56 % seiner Katalogleistung, das Auswahlfenster
 * verschob sich um 25 % nach oben.
 *
 * Gemessen am echten Katalog (755 Geräte), Neubau 140 m², 4,8 kW Auslegung:
 * Das passende 7-kW-Paket (8.679 €) fiel als zu schwach heraus, das 12-kW-Paket
 * (10.329 €, 2,5-fache Heizlast) stand auf Platz 1. Die Regel richtete damit
 * genau den Taktschaden an, gegen den die Obergrenze gebaut ist — und kostete
 * den Nutzer 1.650 € für die größere Maschine.
 *
 * Fachlich: Am kältesten Tag fährt die Maschine Raumheizung, nicht Warmwasser.
 * Die Warmwasserbereitung ist Vorrang-Kurzbetrieb, die Raumheizung steht
 * solange still, die Gebäudeträgheit fängt das ab.
 *
 * Für die TEMPERATUR-Prüfung bleibt das Warmwasser maßgeblich — dieselbe
 * Konstante, zwei Verwendungen. Beide Richtungen stehen unten.
 */

const geraet = (leistungKw: number, ueber: Partial<WpGeraet> = {}): WpGeraet => ({
  id: `g${leistungKw}`,
  name: `Prüfgerät ${leistungKw} kW`,
  marke: "PRUEF",
  leistungKw,
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
  umfang: "geraet",
  ...ueber,
});

const NEUBAU: WpFall = { auslegungKw: 4.8, vorlaufC: 35, wpType: "lwwp" };
const SANIERT: WpFall = { auslegungKw: 7.1, vorlaufC: 45, wpType: "lwwp" };
const ALTBAU: WpFall = { auslegungKw: 11.3, vorlaufC: 55, wpType: "lwwp" };

describe("Leistung am Auslegungspunkt", () => {
  it("zieht den Vorlauf-Abschlag nur bei hoher HEIZUNGS-Vorlauftemperatur", () => {
    // 35 und 45 °C: nur der Betriebspunkt-Abschlag (30 %).
    expect(leistungAmAuslegungspunkt(geraet(10), NEUBAU)).toBeCloseTo(7.0, 5);
    expect(leistungAmAuslegungspunkt(geraet(10), SANIERT)).toBeCloseTo(7.0, 5);
    // 55 °C: zusätzlich der Vorlauf-Abschlag (20 %).
    expect(leistungAmAuslegungspunkt(geraet(10), ALTBAU)).toBeCloseTo(5.6, 5);
  });

  it("rechnet im Neubau NICHT mit der Warmwassertemperatur", () => {
    // Die Fehlerklasse als solche: Wäre das Warmwasser (55 °C) maßgeblich,
    // stünde hier 5,6 statt 7,0 — und mit ihm ein um 25 % zu großes Gerät.
    const mitFehler = 10 * 0.7 * 0.8;
    expect(leistungAmAuslegungspunkt(geraet(10), NEUBAU)).not.toBeCloseTo(mitFehler, 5);
  });

  it("hält das passende Gerät im Neubau drin und das zu große draußen", () => {
    // Die beiden Geräte aus der Messung am echten Katalog.
    const passend = beurteile(geraet(7), NEUBAU);
    const zuGross = beurteile(geraet(12), NEUBAU);
    expect(passend.geeignet, "7 kW bei 4,8 kW Auslegung").toBe(true);
    expect(zuGross.geeignet, "12 kW bei 4,8 kW Auslegung").toBe(false);
    expect(zuGross.befunde.map((b) => b.art)).toContain("leistung-zu-gross");
  });

  it("hält die Reihenfolge: kleiner ist nie schlechter beurteilt als 2,5-fach zu groß", () => {
    // Die Umkehrung war der eigentliche Schaden, nicht der Verlust an Auswahl.
    // Über die ganze Baureihe: Sobald ein Gerät geeignet ist, darf kein
    // deutlich größeres es ebenfalls sein.
    const geeignete = [6, 7, 8, 9, 10, 11, 12, 14, 16].filter(
      (kw) => beurteile(geraet(kw), NEUBAU).geeignet,
    );
    expect(geeignete.length, "keine Auswahl im Neubau").toBeGreaterThan(0);
    const groesstes = Math.max(...geeignete);
    expect(groesstes / NEUBAU.auslegungKw, "größtes geeignetes Gerät").toBeLessThan(2.5);
  });

  it("lässt im Altbau mit 55 °C weiterhin Auswahl übrig", () => {
    // Die Gegenprobe zur Verschärfung: Eine Regel, nach der für einen
    // typischen Altbau nichts mehr übrig bleibt, wäre unbrauchbar.
    const geeignete = [16, 18, 20, 22, 25, 28].filter(
      (kw) => beurteile(geraet(kw), ALTBAU).geeignet,
    );
    expect(geeignete.length, "keine Auswahl im Altbau bei 55 °C").toBeGreaterThan(0);
  });
});

describe("Warmwasser bleibt für die TEMPERATUR maßgeblich", () => {
  it("schließt ein 45-°C-Gerät auch im 35-°C-Neubau aus", () => {
    // Das Haus wird damit warm, das Duschwasser nicht. Der Ausschluss ist
    // richtig und darf mit dem Leistungs-Fix nicht mit verschwinden.
    const e = beurteile(geraet(7, { vorlaufMaxC: 45 }), NEUBAU);
    expect(e.geeignet).toBe(false);
    expect(e.befunde.map((b) => b.art)).toContain("vorlauf-zu-niedrig");
  });

  it("lässt ein 65-°C-Gerät im Neubau zu", () => {
    expect(beurteile(geraet(7, { vorlaufMaxC: 65 }), NEUBAU).geeignet).toBe(true);
  });
});
