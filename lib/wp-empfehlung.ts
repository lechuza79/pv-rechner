// ─── Welches Gerät zu diesem Haus passt ───────────────────────────────────────
//
// Nimmt den gerechneten Fall aus dem Wärmepumpen-Rechner und sucht die Geräte
// heraus, die dazu passen — mit den Gründen, warum sie passen oder eben nicht.
//
// Die Gründe sind hier BEFUNDE, keine fertigen Sätze. Die Formulierung gehört in
// die Oberfläche, weil jeder Satz über Kältemittel, Förderfähigkeit oder
// Installationspflichten eine belegpflichtige Aussage ist und getrennt geprüft
// werden muss. Ein Rechenmodul, das Werbetexte erzeugt, vermischt beides.

import type { WpGeraet } from "./wp-katalog";
import { leistungAnzeigbar } from "./wp-katalog";

/** Der Fall, wie ihn der Rechner ausgibt. */
export interface WpFall {
  /** Auslegungsleistung der Anlage in kW — NICHT die Norm-Heizlast des Gebäudes. */
  auslegungKw: number;
  /** Benötigte Vorlauftemperatur in °C (35 Fußboden, 45 getauscht, 55 alte Heizkörper). */
  vorlaufC: number;
  /** Wärmequelle, die der Nutzer gewählt hat. */
  wpType: "lwwp" | "swwp";
}

export type Befund =
  | { art: "leistung-passt"; abweichungProzent: number }
  | { art: "leistung-knapp"; fehltKw: number }
  | { art: "leistung-reichlich"; ueberKw: number }
  | { art: "leistung-unsicher" }
  | { art: "vorlauf-reicht"; geraetC: number; noetigC: number }
  | { art: "vorlauf-knapp"; geraetC: number; noetigC: number }
  | { art: "vorlauf-zu-niedrig"; geraetC: number; noetigC: number }
  | { art: "vorlauf-unbekannt" }
  | { art: "kaeltemittel-natuerlich" }
  | { art: "kaeltemittel-fluoriert" }
  | { art: "aufbau-monoblock" }
  | { art: "aufbau-split" };

export interface Empfehlung {
  geraet: WpGeraet;
  /** Warum es passt — und woran es hakt. */
  befunde: Befund[];
  /** Trägt das Gerät den Fall überhaupt? */
  geeignet: boolean;
}

/**
 * Wie weit die Geräteleistung von der Auslegung abweichen darf.
 *
 * **Die Untergrenze ist 0 — kein Gerät darf unter der Auslegungsleistung
 * liegen.** Das ist strenger als fachlich nötig, und der Grund ist die
 * Datenlage, nicht die Physik: Die Kilowattzahl im Händlerkatalog trägt keinen
 * Betriebspunkt. Hersteller bewerben mal die Leistung bei +7 °C, mal bei −7 °C
 * Außentemperatur — am selben Gerät liegen dazwischen bis zu Faktor zwei, und
 * die Richtung ist nicht einmal einheitlich (bei Vaillant liegt der −7-°C-Wert
 * über dem +7-°C-Wert, bei Dimplex darunter). Belegt am eigenen Bestand: Der
 * Artikel „VWL 105/8.1 A … 10 kW" nennt im Datenblatt DESSELBEN Händlers
 * 5,69 kW bei A7/W35.
 *
 * Ein Toleranzband nach unten würde diesen Fehler verstärken: Ein mit der
 * +7-°C-Zahl beworbenes Gerät ist am Auslegungspunkt ohnehin schon 20–25 %
 * schwächer, als der Katalog es führt. Es zusätzlich 10 % unter die Auslegung
 * zu lassen hieße, genau die unterdimensionierte Anlage zu empfehlen, deren
 * Heizstab-Betrieb der Rechner nicht abbildet.
 *
 * **Das ist eine Zwischenlösung, keine Antwort.** Die Antwort ist die amtliche
 * Liste förderfähiger Wärmepumpen, die die Nennleistung getrennt für 35 und
 * 55 °C führt und sich über die Artikelnummer mit dem Katalog verbinden lässt.
 * Solange sie nicht angebunden ist, gilt: lieber ein etwas zu großes Gerät
 * empfehlen als ein zu kleines.
 *
 * NACHTRAG 26.08.2026 — von null auf 10 %: Die Null war Scheingenauigkeit. Der
 * Betreiber sah in einem unsanierten Fall (12,3 kW) nur Einzelgeräte; gemessen
 * fiel das passende Vaillant-Paket für 10.329 € mit 12 kW durch — Abweichung
 * 2 %. Über 12,3 kW hat der Katalog überhaupt kein Paket.
 *
 * Zwei Prozent sind an dieser Stelle keine Aussage: Die Auslegungsleistung ist
 * selbst geschätzt (Wohnfläche × Dämmkennwert × Haustyp) und trägt bereits den
 * Auslegungsfaktor 0,85. Auf eine Zahl dieser Herkunft eine harte Grenze zu
 * setzen, verwechselt Vorsicht mit Genauigkeit — und kostet hier die gesamte
 * Paket-Auswahl. Fachlich wäre sogar mehr Spielraum nach unten vertretbar (der
 * Fachverband empfiehlt 50–80 % der Norm-Heizlast); 10 % bleibt bewusst darunter,
 * weil der Betriebspunkt der Katalogzahl weiter unbekannt ist.
 */
const LEISTUNG_UNTER = 0.1;
const LEISTUNG_UEBER = 0.25;

/** Wie viel Spielraum die Vorlauftemperatur haben soll, bevor sie „knapp“ heißt. */
const VORLAUF_PUFFER_C = 5;

/**
 * Das Warmwasser braucht seine eigene Temperatur — unabhängig vom Heizsystem.
 *
 * Ohne diese Schwelle galt ein 35-°C-Gerät im Neubau mit Fußbodenheizung als
 * geeignet. Das Haus wird damit warm, das Duschwasser nicht: Ein Speicher
 * braucht rund 50 °C Ladetemperatur, und nach dem Wärmeübergang bleibt davon
 * ohnehin weniger übrig. Der Bewohner merkt es nach dem Einbau.
 *
 * Eine gesetzliche 60-°C-Pflicht gibt es im Einfamilienhaus nicht — die
 * Legionellen-Anforderung des DVGW-Arbeitsblatts W 551 greift erst bei
 * Speichern über 400 l oder mehr als 3 l Rohrinhalt je Strang. 50 °C ist der
 * übliche Auslegungswert, keine Rechtspflicht.
 */
const WARMWASSER_C = 50;

function leistungsBefund(g: WpGeraet, fall: WpFall): Befund {
  const abw = (g.leistungKw - fall.auslegungKw) / fall.auslegungKw;
  if (abw < -LEISTUNG_UNTER) {
    return { art: "leistung-knapp", fehltKw: Math.round((fall.auslegungKw - g.leistungKw) * 10) / 10 };
  }
  if (abw > LEISTUNG_UEBER) {
    return { art: "leistung-reichlich", ueberKw: Math.round((g.leistungKw - fall.auslegungKw) * 10) / 10 };
  }
  // Eine aus der Typenbezeichnung abgeleitete Leistung ist auf ganze kW
  // gerundet. Sie taugt zum Filtern, aber „passt auf 3 % genau" wäre eine
  // Genauigkeit, die die Zahl nicht hat.
  if (!leistungAnzeigbar(g)) return { art: "leistung-unsicher" };
  return { art: "leistung-passt", abweichungProzent: Math.round(abw * 100) };
}

function vorlaufBefund(g: WpGeraet, fall: WpFall): Befund {
  if (g.vorlaufMaxC === null) return { art: "vorlauf-unbekannt" };
  // Maßgeblich ist die höhere der beiden Anforderungen: das Heizsystem oder
  // das Warmwasser. Im Neubau gewinnt fast immer das Warmwasser.
  const noetigC = Math.max(fall.vorlaufC, WARMWASSER_C);
  if (g.vorlaufMaxC < noetigC) {
    return { art: "vorlauf-zu-niedrig", geraetC: g.vorlaufMaxC, noetigC };
  }
  if (g.vorlaufMaxC < noetigC + VORLAUF_PUFFER_C) {
    return { art: "vorlauf-knapp", geraetC: g.vorlaufMaxC, noetigC };
  }
  return { art: "vorlauf-reicht", geraetC: g.vorlaufMaxC, noetigC };
}

export function beurteile(g: WpGeraet, fall: WpFall): Empfehlung {
  const befunde: Befund[] = [leistungsBefund(g, fall), vorlaufBefund(g, fall)];

  if (g.kaeltemittel === "r290") befunde.push({ art: "kaeltemittel-natuerlich" });
  if (g.kaeltemittel === "r32") befunde.push({ art: "kaeltemittel-fluoriert" });
  if (g.aufbau === "monoblock") befunde.push({ art: "aufbau-monoblock" });
  if (g.aufbau === "split") befunde.push({ art: "aufbau-split" });

  // Zwei harte Ausschlussgründe: zu wenig Leistung, zu kalter Vorlauf. Ein
  // Gerät, das die Wohnung nicht warm bekommt, darf nicht als günstigere
  // Alternative danebenstehen — es wäre die billigste Zeile der Liste und damit
  // die, auf die zuerst jemand klickt.
  //
  // Eine UNBEKANNTE Vorlauftemperatur schließt NICHT mehr aus. Diese Regel gab
  // es zwischenzeitlich, und sie hat sich als teurer erwiesen als der Fehler,
  // vor dem sie schützen sollte:
  //
  //   Sie trifft nicht Geräte, sondern Werbetexte. Weil die Angabe aus dem
  //   Serientext der Baureihe kommt, ist sie ein Alles-oder-nichts je Baureihe:
  //   Wer sie in seine Produktbeschreibung schreibt, kommt durch, wer nicht,
  //   fällt komplett heraus. Gemessen blieben von 28 Luft/Wasser-Komplettpaketen
  //   ganze 2 übrig — Bosch und Vaillant nennen die Temperatur in ihren
  //   Paketnamen nicht, Remko schon. Das ist dieselbe markenabhängige
  //   Verzerrung, die der Modulkopf des Katalogs als eigentliches Risiko
  //   beschreibt, nur an anderer Stelle.
  //
  //   Dazu die Marktlage: Von den nachgeschlagenen aktuellen Baureihen erreicht
  //   jede mindestens 55 °C (aroTHERM plus 75, pro 70, Split 63, LG R32 65,
  //   R290 75, Stiebel WPL 20 65, Bosch CS7000iAW 62). Der Fall, gegen den der
  //   Ausschluss schützt, ist im heutigen Sortiment die Ausnahme.
  //
  // Stattdessen steht die Unsicherheit als Befund in der Kachel. Wer 55 °C
  // braucht, sieht dort „Vorlauftemperatur nicht angegeben" statt einer
  // Behauptung — und die Auswahl bleibt eine Auswahl.
  const geeignet = !befunde.some(
    (b) => b.art === "leistung-knapp" || b.art === "vorlauf-zu-niedrig",
  );

  return { geraet: g, befunde, geeignet };
}

/**
 * Die passenden Geräte, das günstigste zuerst.
 *
 * Sortiert wird nach dem Preis für den Nutzer, nicht nach unserer Provision
 * (Vorgabe des Betreibers vom 19.08.2026 für die Balkon-Vergleichsseite, gilt
 * hier genauso). Der Grundsatz gehört sichtbar auf die Seite — sonst ist er
 * nur eine Behauptung im Code.
 */
export function empfehlungenFuer(
  katalog: WpGeraet[],
  fall: WpFall,
  grenze = 3,
): Empfehlung[] {
  const quelle = fall.wpType === "swwp" ? "sole-wasser" : "luft-wasser";

  const geeignet = katalog
    .filter((g) => g.bauart === quelle)
    .map((g) => beurteile(g, fall))
    .filter((e) => e.geeignet)
    .sort((a, b) => a.geraet.preisEur - b.geraet.preisEur);

  // Höchstens ein Angebot je Hersteller. Ohne diese Regel stehen dreimal
  // Nachbarmodelle derselben Baureihe untereinander — gemessen lieferte der
  // Altbau-Fall drei LG-Monoblocks, zwei davon mit identischem Preis. Das ist
  // keine Auswahl, sondern eine Liste mit drei Zeilen desselben Geräts.
  const jeMarke = (kandidaten: Empfehlung[]): Empfehlung[] => {
    const gesehen = new Set<string>();
    const auswahl: Empfehlung[] = [];
    for (const e of kandidaten) {
      if (gesehen.has(e.geraet.marke)) continue;
      gesehen.add(e.geraet.marke);
      auswahl.push(e);
      if (auswahl.length === grenze) break;
    }
    return auswahl;
  };

  // Komplettpakete zuerst — und wenn es welche gibt, AUSSCHLIESSLICH sie.
  //
  // Eine gemischte Liste wäre der schlechteste Fall: Der Monoblock allein
  // kostet für dieselbe Anlagengröße rund 4.000 € weniger als das Paket und
  // stünde damit immer oben, obwohl er ohne Speicher und Regelung keine
  // Heizung ergibt. Wer nur den Preis vergleicht, kauft dann die Hälfte.
  //
  // Reine Geräte bleiben als Rückfall, denn nicht jede Größe hat ein Paket:
  // gemessen 5 bis 22 Pakete je Größenklasse, aber eben nicht in jeder. Dann
  // ist ein Gerät mit ausgeschriebenem Umfang besser als eine leere Liste —
  // die Kachel sagt in beiden Fällen, was drin ist.
  const pakete = geeignet.filter((e) => e.geraet.umfang === "paket");
  return pakete.length > 0 ? jeMarke(pakete) : jeMarke(geeignet);
}

/**
 * Warum keine Pakete dastehen — falls keine dastehen.
 *
 * Die Oberfläche schrieb dafür „In dieser Anlagengröße führt der Händler keine
 * Komplettpakete" und leitete das allein daraus ab, dass in der Trefferliste
 * keins vorkam. Das sind zwei verschiedene Aussagen: `empfehlungenFuer` filtert
 * ERST auf Eignung und wählt DANACH Pakete aus. Ein Altbau mit 55 °C, für den
 * es ein passend großes Paket gibt, das aber nur 50 °C schafft, bekam damit die
 * Auskunft, es gebe in seiner Größe keine — eine Falschaussage über das
 * Sortiment eines Dritten, und die eigentliche Ursache blieb ungenannt.
 *
 * Drei Fälle, die der Nutzer auseinanderhalten können muss:
 *   `keine`      — der Händler führt in dieser Größe wirklich keins
 *   `unpassend`  — es gibt welche, sie scheitern an Leistung oder Vorlauf
 *   `vorhanden`  — Pakete stehen in der Liste, der Satz entfällt
 */
export type PaketLage = "vorhanden" | "unpassend" | "keine";

export function paketLage(katalog: WpGeraet[], fall: WpFall): PaketLage {
  const quelle = fall.wpType === "swwp" ? "sole-wasser" : "luft-wasser";
  const passendeQuelle = katalog.filter((g) => g.bauart === quelle);

  if (passendeQuelle.some((g) => g.umfang === "paket" && beurteile(g, fall).geeignet)) {
    return "vorhanden";
  }
  // Grob dieselbe Größenordnung: Ein 30-kW-Paket im Katalog beantwortet die
  // Frage nicht, ob es für ein 8-kW-Haus eins gibt. Der Rahmen ist bewusst
  // weiter als die Empfehlungs-Toleranz — hier geht es nicht um Eignung,
  // sondern um „gibt es in dieser Größenklasse überhaupt welche".
  const inGroessenklasse = (g: WpGeraet) =>
    g.leistungKw >= fall.auslegungKw * 0.6 && g.leistungKw <= fall.auslegungKw * 1.6;

  return passendeQuelle.some((g) => g.umfang === "paket" && inGroessenklasse(g))
    ? "unpassend"
    : "keine";
}

/**
 * Einzelgeräte als abgesetzte Alternative unter den Paketen.
 *
 * Getrennt geliefert, nicht in dieselbe Liste gemischt: In einer Reihe stünde
 * das Einzelgerät wegen des Preises immer oben, obwohl es Speicher und Regelung
 * nicht enthält — rund 4.000 € Unterschied, die man der Zahl nicht ansieht. Als
 * eigener, ausdrücklich beschrifteter Block ist es eine Alternative für den, der
 * Speicher und Regelung schon hat oder getrennt kauft.
 *
 * Leer, wenn es ohnehin keine Pakete gab: Dann zeigt `empfehlungenFuer` bereits
 * Einzelgeräte, und derselbe Block ein zweites Mal wäre eine Dublette.
 */
export function einzelgeraeteAlternativ(
  katalog: WpGeraet[],
  fall: WpFall,
  grenze = 2,
): Empfehlung[] {
  const quelle = fall.wpType === "swwp" ? "sole-wasser" : "luft-wasser";
  const geeignet = katalog
    .filter((g) => g.bauart === quelle)
    .map((g) => beurteile(g, fall))
    .filter((e) => e.geeignet);

  if (!geeignet.some((e) => e.geraet.umfang === "paket")) return [];

  const einzeln = geeignet
    .filter((e) => e.geraet.umfang === "geraet")
    .sort((a, b) => a.geraet.preisEur - b.geraet.preisEur);

  const gesehen = new Set<string>();
  const auswahl: Empfehlung[] = [];
  for (const e of einzeln) {
    if (gesehen.has(e.geraet.marke)) continue;
    gesehen.add(e.geraet.marke);
    auswahl.push(e);
    if (auswahl.length === grenze) break;
  }
  return auswahl;
}
