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
  | { art: "leistung-zu-gross"; ueberKw: number }
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
 * Wie weit die Leistung AM AUSLEGUNGSPUNKT von der Auslegung abweichen darf.
 *
 * Bezugsgröße ist seit dem 05.09.2026 nicht mehr die Katalogzahl, sondern der
 * daraus abgeleitete reale Wert (siehe `leistungAmAuslegungspunkt`). Das ändert
 * die Bedeutung dieser beiden Grenzen grundlegend, und der frühere Kommentar an
 * dieser Stelle beschreibt einen Stand, den es nicht mehr gibt:
 *
 *   Er begründete die enge Untergrenze damit, dass der Betriebspunkt unbekannt
 *   ist und deshalb NICHT gerechnet wird — „ein Toleranzband nach unten würde
 *   diesen Fehler verstärken". Genau dieser Fehler wird jetzt korrigiert, bevor
 *   verglichen wird. Die Toleranz muss ihn also nicht mehr mit auffangen.
 *
 * Die fachliche Prüfung vom 05.09.2026 hat den alten Aufbau als „am falschen
 * Ende angesetzt" bezeichnet, und das trifft es: Ein symmetrisches Band von
 * ±10 % kann einen systematischen Versatz von Faktor 1,3 bis 2,0 nicht
 * auffangen. Es behandelte eine Zahl mit unbekanntem Bezugspunkt wie einen
 * Messwert mit Streuung.
 *
 * Was die 10 % nach unten jetzt sind — und nur noch sind: eine Rundungstoleranz
 * auf eine geschätzte Größe. Die Auslegungsleistung kommt aus Wohnfläche mal
 * Dämmkennwert mal Haustyp und trägt bereits den Auslegungsfaktor 0,85; auf
 * eine Zahl dieser Herkunft eine harte Grenze zu setzen, verwechselt Vorsicht
 * mit Genauigkeit.
 *
 * **Weiterhin eine Zwischenlösung.** Die Antwort bleibt die amtliche Liste
 * förderfähiger Wärmepumpen, die die Nennleistung getrennt für 35 und 55 °C
 * führt und sich über die Artikelnummer mit dem Katalog verbinden lässt. Dann
 * entfällt der pauschale Abschlag und mit ihm die Unsicherheit.
 */
const LEISTUNG_UNTER = 0.1;
const LEISTUNG_UEBER = 0.25;

/**
 * Ab hier ist ein Gerät nicht mehr großzügig, sondern falsch — harte Obergrenze.
 *
 * Bis 05.09.2026 schloss zu viel Leistung gar nicht aus; ein Gerät mit dem
 * Dreifachen der Auslegung stand mit dem Hinweis „läuft öfter im Takt" in der
 * Liste. Die fachliche Prüfung hat beides beanstandet: die fehlende Grenze und
 * den verharmlosenden Satz.
 *
 * Warum 1,6 und nicht enger: Entscheidend ist nicht die Nennleistung, sondern
 * wie weit ein Gerät herunterregeln kann. Gute Inverter schaffen 25–30 % ihrer
 * Maximalleistung, viele nur 40 %. Solange es bei mildem Wetter noch moduliert,
 * ist Überdimensionierung harmlos — bis rund 130 % unkritisch, ab 150 % beginnt
 * es, ab 200 % ist es ein Schaden.
 *
 * Die durchgerechnete Folge (gut saniertes Haus, 7,1 kW Auslegung, 16-kW-Gerät,
 * +10 °C außen): Der Wärmebedarf liegt bei 2,6 kW, das Gerät kommt nicht unter
 * 4,8 kW — Zyklus 29 Minuten, rund 50 Verdichterstarts am Tag. Hersteller geben
 * höchstens drei pro Stunde frei. Das richtig ausgelegte Gerät läuft bei diesem
 * Wetter durch, null Starts. Was der Nutzer davon merkt: Anfahrgeräusche (der
 * häufigste Anlass für Nachbarschaftsbeschwerden), 0,3–0,5 Punkte weniger
 * Jahresarbeitszahl (300–500 € im Jahr) und ein Verdichter, der nach acht statt
 * zwanzig Jahren aufgibt.
 *
 * Gemessen kostet die Grenze wenig Auswahl: Bei Altbauten greift sie praktisch
 * nie, weil der Katalog nach oben ohnehin ausläuft.
 */
const LEISTUNG_MAX_FAKTOR = 1.6;

/**
 * Was die Katalog-Kilowattzahl am Auslegungspunkt wirklich liefert.
 *
 * DAS IST DIE WICHTIGSTE KORREKTUR AN DIESER AUSWAHL, und sie behebt einen
 * Vergleich zwischen zwei verschiedenen Größen. Die Auslegungsleistung gilt bei
 * Normaußentemperatur (−10 bis −14 °C). Die Zahl im Händlerkatalog ist im
 * Regelfall etwas anderes, und der Katalog sagt nicht, was:
 *
 *   1. Maximalleistung bei +7 °C Außentemperatur und 35 °C Vorlauf
 *   2. Maximalleistung bei −7 °C und 35 °C — die, auf die es ankommt
 *   3. Nennleistung nach EN 14825, ein Teillastpunkt aus der Ökodesign-Messung
 *
 * Der eigene Bestand belegt Fall 3: „VWL 105/8.1 A … 10 kW" nennt im Datenblatt
 * desselben Händlers 5,69 kW. Beide Zahlen stimmen, sie messen Verschiedenes.
 * Deshalb ist die Streuung auch nicht „uneinheitlich" — es sind drei Messgrößen.
 *
 * Dazu kommt ein Effekt, den das Modell bis 05.09.2026 gar nicht kannte: Die
 * VORLAUFTEMPERATUR senkt die Leistung. Bei 55 °C liefert ein Luft/Wasser-Gerät
 * 15–25 % weniger als bei 35 °C. Die Vorlauftemperatur war bisher nur ein
 * Ja/Nein-Kriterium; gegen die Leistung gerechnet wurde sie nie.
 *
 * BEWUSST OHNE MARKEN-ZUORDNUNG. Die fachliche Prüfung schlug vor, den
 * Betriebspunkt je Hersteller aus der Typenbezeichnung abzuleiten. Das wäre
 * genauer — aber die Zuordnung ist bislang von niemandem an Datenblättern
 * nachgeprüft, und eine falsche Marken-Regel ist schlimmer als ein pauschaler
 * Abschlag: Sie sähe genau aus und wäre still falsch. Bis jemand die
 * Datenblätter durchgeht, gilt für alle derselbe vorsichtige Wert.
 *
 * Die Richtung ist Absicht: Lieber ein etwas zu großes Gerät empfehlen als
 * eines, das im Winter zum Direktheizer wird.
 */
const BETRIEBSPUNKT_ABSCHLAG = 0.3;

/** Ab dieser Vorlauftemperatur kostet die Kennlinie zusätzlich Leistung. */
const VORLAUF_ABSCHLAG_AB_C = 50;
const VORLAUF_ABSCHLAG = 0.2;

/**
 * Die Leistung, mit der wir rechnen — nicht die, die im Katalog steht.
 *
 * Getrennt von der angezeigten Zahl: Auf der Kachel steht weiterhin die
 * Herstellerangabe (alles andere wäre eine erfundene Zahl), die AUSWAHL läuft
 * über diesen Wert.
 *
 * MASSGEBLICH IST DER HEIZUNGS-VORLAUF, NICHT DAS WARMWASSER — und das ist der
 * eigentliche Punkt dieser Funktion. Die erste Fassung nahm hier das Maximum
 * aus beidem, also mindestens 55 °C. Damit rechnete JEDES Gerät überall mit
 * 56 % seiner Katalogleistung, auch im Neubau mit Fußbodenheizung.
 *
 * Die Folge war nicht „etwas vorsichtiger", sondern eine UMKEHRUNG des Urteils
 * in beide Richtungen. Gemessen am 05.09.2026, Neubau 140 m², 4,8 kW
 * Auslegung, 35 °C: Das passende 7-kW-Paket (8.679 €) fiel als zu schwach
 * heraus, das 12-kW-Paket (10.329 €, 2,5-fache Heizlast) stand auf Platz 1.
 * Die Regel richtete damit genau den Schaden an, gegen den LEISTUNG_MAX_FAKTOR
 * gebaut ist — sie verschob das Auswahlfenster um 25 % nach oben.
 *
 * Fachlich: Der Vorlauf-Abschlag beschreibt den Leistungsverlust, wenn der
 * Verflüssiger heiß fährt. Am Auslegungspunkt — kältester Tag — fährt die
 * Maschine Raumheizung, nicht Warmwasser. Die Warmwasserbereitung läuft mit
 * Vorrangschaltung als Kurzbetrieb; die Raumheizung steht solange still, und
 * die Gebäudeträgheit fängt das ab. Zwei Sicherheiten übereinander (30 %
 * Betriebspunkt × 20 % Vorlauf) sind keine Vorsicht mehr, sondern ein
 * systematischer Auslegungsfehler mit Vorzeichen.
 *
 * Für die TEMPERATUR-Prüfung gilt weiterhin das Maximum (siehe
 * `vorlaufBefund`) — ein Gerät, das bei 45 °C endet, macht kein Duschwasser.
 * Dieselbe Konstante, zwei Verwendungen: bei der Temperatur gehört sie hin,
 * bei der Leistung nicht.
 */
export function leistungAmAuslegungspunkt(g: WpGeraet, fall: WpFall): number {
  const vorlaufFaktor = fall.vorlaufC >= VORLAUF_ABSCHLAG_AB_C ? 1 - VORLAUF_ABSCHLAG : 1;
  return g.leistungKw * (1 - BETRIEBSPUNKT_ABSCHLAG) * vorlaufFaktor;
}

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
const WARMWASSER_C = 55;

function leistungsBefund(g: WpGeraet, fall: WpFall): Befund {
  // Gerechnet wird mit der Leistung AM AUSLEGUNGSPUNKT, nicht mit der
  // Katalogzahl — sonst vergleicht die Auswahl zwei verschiedene Größen.
  const real = leistungAmAuslegungspunkt(g, fall);
  const abw = (real - fall.auslegungKw) / fall.auslegungKw;
  if (abw < -LEISTUNG_UNTER) {
    return { art: "leistung-knapp", fehltKw: Math.round((fall.auslegungKw - real) * 10) / 10 };
  }
  if (real > fall.auslegungKw * LEISTUNG_MAX_FAKTOR) {
    return { art: "leistung-zu-gross", ueberKw: Math.round((real - fall.auslegungKw) * 10) / 10 };
  }
  if (abw > LEISTUNG_UEBER) {
    return { art: "leistung-reichlich", ueberKw: Math.round((real - fall.auslegungKw) * 10) / 10 };
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
    (b) =>
      b.art === "leistung-knapp" ||
      b.art === "leistung-zu-gross" ||
      b.art === "vorlauf-zu-niedrig",
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
  //
  // GERECHNET WIRD AM AUSLEGUNGSPUNKT, nicht mit der Katalogzahl. Die erste
  // Fassung verglich `leistungKw` direkt mit der Auslegung und wiederholte
  // damit genau den Fehler, den die Auswahl selbst nicht mehr macht: zwei
  // verschiedene Größen nebeneinander. Nach der Korrektur vom 05.09.2026 fiel
  // dadurch ein passgenaues 19-kW-Paket aus der Größenklasse heraus, und der
  // Nutzer las „führt in dieser Größe keine Pakete" über einem Sortiment, in
  // dem genau das richtige stand.
  //
  // Die Obergrenze liegt ÜBER LEISTUNG_MAX_FAKTOR, und das ist der Punkt:
  // Läge sie gleichauf, wäre jedes zu große Paket automatisch auch außerhalb
  // der Größenklasse — den Fall „es gibt eins, es ist nur zu groß" gäbe es
  // dann gar nicht mehr, und wir schrieben „führt keine", obwohl eins dasteht.
  const KLASSE_UNTER = 0.6;
  const KLASSE_UEBER = 2.2;
  const inGroessenklasse = (g: WpGeraet) => {
    const real = leistungAmAuslegungspunkt(g, fall);
    return real >= fall.auslegungKw * KLASSE_UNTER && real <= fall.auslegungKw * KLASSE_UEBER;
  };

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
