// Social-Posts: Text UND Bild entstehen aus derselben Funktion.
//
// Das ist der ganze Punkt dieses Moduls. Ein Post besteht nicht aus einer
// Textdatei plus einer Bilddatei, sondern aus einer Berechnung, die beides
// ausgibt. Sobald jemand den Satz von Hand tippt und die Grafik separat baut,
// driften sie beim nächsten Datenstand auseinander — dieselbe Fehlerklasse, die
// bei den Gemeindebriefen schon einmal zugeschlagen hat: Der Brief behauptete
// einen Rang, den die verlinkte Seite widerlegte.
//
// Rein und ohne Datenbank-Import, damit ein Test die Aussagen gegen die Zahlen
// halten kann, ohne einen Server-Kontext zu brauchen. Die Zahlen kommen von
// lib/social-kennzahlen.ts (server-only) und werden hereingereicht.

import { fmtPvLeistung } from "./atlas-format";
import { zeitraumSeitStichtag } from "./anlagenbestand";
import { feedInRatesFor, naechsteDegressionIso } from "./feedin-config";
import { eegVerfahrenSatz } from "./eeg-reform-config";
import { PERCAPITA_SERIES, YEARS_PERCAPITA } from "./country-comparison-percapita";
import type { KategorieSchluessel } from "./redaktions-kategorien";
import { DATA_SOURCES } from "./data-sources";
import { KARTEN_STIL_STANDARD, istKartenStil, type KartenStil } from "./social-karten-stil";
import { moeglicheFormen as formenFuer } from "./social-bildformen";
import { fuelle, type PlatzhalterInfo } from "./social-vorlage";
// Das Formen-Register liegt in einem eigenen Modul, importiert aber den Bildtyp
// von hier. Re-exportiert, damit Aufrufer nicht zwei Module kennen müssen.
export { BILDFORMEN, BILDFORM_NAME, TEMPLATES, bildform, moeglicheFormen, templateVon } from "./social-bildformen";

/** Zahlenbasis eines Posts. Kommt aus der Datenbank, wird hereingereicht. */
export type SocialKennzahlen = {
  /** Datenstand des Anlagenregisters (ISO-Datum). */
  standIso: string;
  /**
   * Das Jahr, dessen 31.12. die Vergleichsbasis von `wachstum` ist.
   *
   * Ohne dieses Feld ist der Zeitraum nicht benennbar, und die Posts nannten
   * ihn „zwölf Monate" — bei einem Datenstand im August waren es sieben. Das
   * Register führt je Anlage nur das JAHR der Inbetriebnahme; ein Bestand vor
   * genau zwölf Monaten ist daraus nicht ableitbar, ein Jahresendbestand schon.
   */
  stichtagJahr: number;
  stadtLand: {
    /** Städte ab dieser Einwohnerzahl. */
    stadtAb: number;
    /** Gemeinden unter dieser Einwohnerzahl. */
    landUnter: number;
    stadtAnzahl: number;
    landAnzahl: number;
    stadtJeTausend: number;
    landJeTausend: number;
  };
  wachstum: {
    balkonJetzt: number;
    /** Bestand am 31.12. von `stichtagJahr` — nicht „vor einem Jahr". */
    balkonVorJahr: number;
    solarKwpJetzt: number;
    solarKwpVorJahr: number;
  };
  segmente: {
    privatDachKwp: number;
    gewerbeDachKwp: number;
    freiflaecheKwp: number;
    solarGesamtKwp: number;
  };
  ueberEinwohner: {
    mindestEinwohner: number;
    betrachtet: number;
    darueber: number;
  };
  /**
   * Die typische private Dachanlage — und wie viele Heimspeicher daneben stehen.
   *
   * ACHTUNG, das ist KEIN Anteil: Gezählt werden angemeldete SPEICHER-Einheiten,
   * nicht Dachanlagen mit Speicher. Ein Haushalt kann mehrere anmelden, und ein
   * Balkonspeicher hat gar keine Dachanlage — deshalb kommen Werte über hundert
   * vor (Bremen). Als „Quote" beschriftet wäre das eine falsche Aussage auf der
   * Fläche, die weitergeteilt wird.
   */
  kohorte: {
    privatAnlagen: number;
    mittlereKwp: number;
    speicherEinheiten: number;
    /** Heimspeicher je 100 private Dachanlagen. Verhältnis, kein Anteil. */
    speicherJe100: number;
  };
  /**
   * Der stärkste POSITIVE Ausschlag bei Balkonkraftwerken, über einer
   * Mindestgröße. Nur positiv: Ein negativer Ausschlag wäre eine Bloßstellung,
   * und die beendet den Outreach in einer ganzen Region.
   */
  anomalie: {
    ort: string;
    einwohner: number;
    jeTausend: number;
    bundesJeTausend: number;
    mindestEinwohner: number;
  };
  /**
   * Der Förderkatalog, verdichtet.
   *
   * Nur Programme, die aktuell zählen (`fundingZaehlt`) — ein abgelaufener
   * Beleg macht aus einer Auskunft eine Behauptung, und in einem Beitrag ist
   * das genauso teuer wie im Rechner.
   */
  foerderung: {
    programme: number;
    gemeinden: number;
    nurBalkon: number;
    ohneHoechstbetrag: number;
    mitAntragVorher: number;
  };
  laender: {
    name: string;
    balkonJeTausend: number;
    wpProKopf: number;
    /** Private Dachleistung des Landes. Für den Anteil am Landesbestand. */
    privatDachKwp: number;
    /** Heimspeicher je 100 private Dachanlagen. Verhältnis, kein Anteil. */
    speicherJe100: number;
    freiflaecheAnteil: number;
    solarKwp: number;
    wachstumFuenfJahre: number;
  }[];
};

export type BildSerie = {
  /** Die Gruppe selbst, groß gesetzt: „Städte", ein Ländername. */
  label: string;
  /**
   * Die Eingrenzung darunter, klein: „über 100k Einwohner".
   *
   * Getrennt vom Label, weil beides zusammen in einer Zeile die Kachel sprengt
   * und die Gruppe im Nebensatz verschwinden lässt — man liest dann die
   * Bedingung und sucht die Gruppe.
   */
  zusatz?: string;
  /**
   * Bundesland, dessen Umriss schwach hinter dem Wert steht.
   *
   * Ausdrücklich gesetzt und nicht aus dem Label erraten: Ein Land, das zufällig
   * so heißt wie die Gruppe, bekäme sonst einen Umriss, und ein Land, dessen
   * Schreibweise sich um ein Zeichen unterscheidet, keinen — beides ohne dass
   * etwas fehlschlägt. Ein Test hält die Namen gegen die Umriss-Tabelle.
   */
  umriss?: string;
  /**
   * Der Abstand zum anderen Wert, als fertiger Text.
   *
   * Vom Post gesetzt, nicht in der Karte gerechnet: Er muss zur FORMULIERUNG im
   * Beitrag passen. „2,3-mal so viele" im Text und „+130 %" im Bild sind
   * dieselbe Zahl in zwei Ausdrucksformen — der Leser müsste umrechnen, um zu
   * sehen, dass sie sich nicht widersprechen. Dieselbe Regel wie bei den
   * Nachkommastellen.
   */
  delta?: string;
  wert: number;
  einheit: string;
  /** Nachkommastellen im Bild. MUSS zur Rundung im Text passen — sonst zeigt das
   *  Bild 8,1 %, wo der Text 8 % sagt, und die beiden widersprechen sich auf
   *  genau der Fläche, die weitergeteilt wird. Im Bild aufgefallen, nicht im Test. */
  stellen?: number;
  hervorgehoben?: boolean;
};

/**
 * Was ins Bild kommt. Bewusst datenförmig und nicht als fertiges SVG: Die
 * Darstellung gehört in die Komponente, die Aussage hierher.
 */
export type PostBild = {
  /**
   * Wie das Bild aufgebaut ist.
   *
   * "vergleich" stellt Balken nebeneinander — trägt nur, wenn die Längen
   * wirklich unterschiedlich sind. "kennzahl" zeigt eine große Zahl mit
   * Kontextzeile, für Fälle, in denen ein Balkenpaar nichts zeigt: 1,20 gegen
   * 1,45 Millionen sind zwei fast gleich lange Balken, obwohl dazwischen ein
   * Fünftel Wachstum liegt. Am gerenderten Bild aufgefallen, nicht am Code.
   *
   * "donut" ist die Ringfassung für ANTEILE, also für Werte mit einem Ganzen
   * (siehe `ganzes`). Dort bedeutet der ungefüllte Rest wirklich etwas.
   *
   * "umriss" füllt den Umriss eines Bundeslands anteilig — nur für ANTEILE,
   * also mit einem Ganzen. Die Form selbst behauptet ein Gefäß, das sich füllt;
   * ohne Ganzes wäre das eine Aussage über einen Rest, den es nicht gibt.
   *
   * "saeule" ist der Vergleich für genau zwei Werte OHNE Ganzes: eine Säule, in
   * der der kleinere Wert als Sockel steckt und der größere ihn überragt. Der
   * Unterschied ist dann die überragende Fläche selbst — man muss keine zwei
   * Längen nebeneinander abschätzen und nichts über eine Grundmenge annehmen,
   * die es nicht gibt.
   */
  art: "vergleich" | "kennzahl" | "donut" | "saeule" | "umriss";
  /** Die Kernaussage, im Bild als Titel gesetzt — nicht die neutrale Achsenbeschriftung. */
  aussage: string;
  /** Was gemessen wurde. Steht klein unter der Aussage. */
  gemessen: string;
  serien: BildSerie[];
  /** Pflicht: Lizenz der Quelle. Reist im Bild mit, weil der Beitragstext das nicht tut. */
  quelle: string;
  /**
   * Das Ganze, auf das sich die Werte beziehen — falls es eines gibt.
   *
   * Bei Anteilen ist es 100: „70 Prozent" ist eine Aussage über ein Ganzes, und
   * ein voller Ring für 70 behauptete 100. Dann heißt der ungefüllte Rest im
   * Bild wirklich etwas — hier: die Solarleistung, die eben nicht auf Freiflächen
   * steht.
   *
   * Fehlt es, wird am größeren der beiden Werte normiert. Das gilt für Zahlen
   * ohne Ganzes („9,9 gegen 22,8 je 1.000 Einwohner"), wo der ungefüllte Rest
   * nichts bedeutet.
   */
  ganzes?: number;
  /**
   * Steht die Einheit an der Zahl?
   *
   * Aus, wo der Untertitel sie ohnehin trägt („Angemeldete Steckersolargeräte je
   * 1.000 Einwohner") — dann stünde sie zweimal im selben Bild. An bleibt sie,
   * wo das Zeichen die Zahl erst deutet: „70" ohne Prozentzeichen ist keine
   * gekürzte Angabe, sondern eine andere.
   *
   * Aus heißt NICHT „ohne Einheit": Ein Test verlangt dann einen Untertitel, der
   * sie nennt. Sonst verschwindet sie still aus dem Bild, und das ist die
   * teuerste Sorte Fehler in diesem Projekt.
   */
  einheitAmWert?: boolean;
  /**
   * Farbschema der Karte.
   *
   * Steht am BILD und nicht an der Ansicht: Sonst zeigte das Werkzeug beim
   * Entwickeln etwas anderes, als beim Veröffentlichen aufgenommen wird. Weil es
   * hier steht, geht es von selbst in den Fingerabdruck der Prüfung ein — wer
   * nach der Freigabe umfärbt, verliert sie.
   *
   * Wird von `baueAllePosts` gesetzt: die gespeicherte Wahl, sonst der Standard.
   * Eine Entscheidung je Post, nicht je Kategorie — zwei Beiträge derselben
   * Kategorie dürfen in einer Woche verschieden aussehen.
   */
  stil: KartenStil;
};

/**
 * Dieselbe Erkenntnis für die eigene Seite.
 *
 * NICHT derselbe Text: Der Beitrag ist in der ersten Person geschrieben und auf
 * den Feed zugeschnitten („Ich finde die zweite Zahl aussagekräftiger"). Auf
 * einer Ratgeberseite wäre das die falsche Stimme. Gemeinsam ist beiden nur die
 * Berechnung — und genau darum geht es: Post und Seite können nicht
 * auseinanderlaufen, weil die Zahlen aus derselben Funktion kommen.
 */
export type OnsiteFassung = {
  /** Anker in der Adresse, damit ein Beitrag direkt hierher verlinken kann. */
  anker: string;
  ueberschrift: string;
  absaetze: string[];
};

export type SocialPost = {
  id: string;
  /** Interne Bezeichnung für die Vorschau, nicht Teil des Beitrags. */
  titel: string;
  /**
   * Aussageform, und damit das Design, dem diese Story folgt.
   *
   * Pflichtfeld: Eine Story ohne Kategorie stünde in der Ansicht unter keinem
   * Reiter und wäre nirgends zu sehen — ein Ausfall, den nur bemerkt, wer sie
   * vermisst.
   */
  kategorie: KategorieSchluessel;
  kanal: ("linkedin" | "instagram")[];
  text: string;
  bild: PostBild | null;
  /** Was ein Prüfer nachrechnen können muss. Erscheint nur in der Vorschau. */
  belege: string[];
  /** Fassung für die eigene Seite. Fehlt, solange es keine passende Seite gibt. */
  onsite?: OnsiteFassung;
  /**
   * Der Text als bearbeitbare Vorlage mit Platzhaltern, plus die Werte dazu.
   *
   * Damit kann im Redaktionstisch frei formuliert werden, ohne dass eine Zahl
   * anfassbar wäre. Fehlt beides, ist der Post noch nicht auf Vorlagen
   * umgestellt und dort nur lesbar.
   */
  vorlage?: string;
  platzhalter?: PlatzhalterInfo[];
};

/**
 * Ab wie vielen Zeichen der Feed den Beitrag hinter „mehr anzeigen" versteckt.
 *
 * Näherungswert für LinkedIn auf dem Desktop — die genaue Grenze hängt an der
 * Zeilenzahl und damit an der Fensterbreite, ist also nicht als Zahl zu haben.
 * Sie steht hier trotzdem, weil eine ungefähre Grenze in der Vorschau mehr wert
 * ist als gar keine: Die Aussage muss davor stehen, alles danach liest nur, wer
 * schon interessiert ist.
 */
export const FEED_ABSCHNITT_ZEICHEN = 210;

/** Cent-Betrag im Fließtext. Eigene Funktion, damit „ct" nicht an zwei Stellen
 *  an eine Zahl geklebt wird — dieselbe Regel wie bei den Atlas-Einheiten. */
const fmtCtText = (n: number) => `${n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Cent`;

const de = (n: number, stellen = 0) =>
  n.toLocaleString("de-DE", { minimumFractionDigits: stellen, maximumFractionDigits: stellen });

/**
 * Einwohnerzahl gekürzt: 100.000 → „100k".
 *
 * Nur für die kleine Zeile unter einer Gruppe im Bild, wo „über 100.000
 * Einwohner" die Kachel sprengt. Im Beitragstext bleibt die ausgeschriebene
 * Zahl — dort ist Platz, und „100k" liest sich in einem Satz wie ein Tippfehler.
 * Eine Funktion und keine getippte Kurzform, damit die Schwelle im Text und die
 * im Bild dieselbe Zahl bleiben.
 */
export function kurzEinwohner(n: number): string {
  if (n >= 1_000_000) return `${de(n / 1_000_000, n % 1_000_000 ? 1 : 0)} Mio.`;
  if (n >= 1_000) return `${de(n / 1_000, n % 1_000 ? 1 : 0)}k`;
  return de(n);
}

/**
 * Der Markenname steht hier, weil die Erwähnung der Unternehmensseite ihn im
 * Text finden muss — eine Erwähnung entsteht nur, wo der Name wörtlich
 * vorkommt. Die Quellenzeile ist dafür die natürliche Stelle: Sie sagt ohnehin,
 * wer gerechnet hat.
 */
const MARKE = "Solar Check";

/**
 * Zwei Fassungen derselben Angabe, und der Unterschied ist der Markenname:
 * Im TEXT muss er stehen, damit die Erwähnung der Unternehmensseite ihn findet.
 * Im BILD steht daneben das Logo — dort wäre der Name ein zweites Mal dasselbe.
 */
/**
 * Name und Lizenz kommen aus dem Quellenregister, nicht aus diesem Modul.
 *
 * DIE LIZENZ IST PFLICHT, und sie war getippt — also fehlte sie. Die mechanische
 * Prüfung hat das gemeldet und den Versand gesperrt, was richtig ist; die
 * Meldung war trotzdem der falsche Ort. Eine Angabe, die ohnehin gerechnet wird,
 * darf gar nicht erst ohne Lizenz entstehen können — sonst steht dieselbe
 * Korrektur bei jedem neuen Beitrag wieder an, und irgendwann schaltet jemand
 * die Sperre ab, statt die Zeile zu reparieren.
 *
 * Die Sperre bleibt: Sie fängt weiterhin, wer eine Quellenzeile von Hand tippt.
 */
function quelleAus(schluessel: "mastr" | "ember", stand: string, mitMarke: boolean): string {
  const q = DATA_SOURCES[schluessel];
  const lizenz = "license" in q && q.license ? `, ${q.license}` : "";
  // Der Änderungshinweis ist bei CC BY dort geschuldet, wo wir wirklich
  // verändern — und das tun wir überall hier: Wir mitteln, leiten ab, rechnen um.
  const veraendert = "license" in q && q.license?.startsWith("CC BY") ? ", Daten verändert" : "";
  const basis = `${q.name}${lizenz}${veraendert}. Stand ${stand}. Eigene Berechnung`;
  return mitMarke ? `${basis}, ${MARKE}.` : `${basis}.`;
}

export function quellenzeile(standIso: string, mitMarke: boolean): string {
  const d = new Date(standIso);
  const datum = d.toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" });
  return quelleAus("mastr", datum, mitMarke);
}

/**
 * Post 1 — Das Balkonkraftwerk ist kein Stadtthema.
 *
 * Die Aussage stand als Beispiel im Katalog, bevor sie jemand gerechnet hatte —
 * und war falsch (behauptet wurde ein Ost-West-Gefälle). Der gemessene Kontrast
 * ist Stadt gegen Land und stärker als der erfundene. Deshalb rechnet dieser
 * Post die Richtung mit, statt sie zu behaupten: Kippt das Verhältnis eines
 * Tages, kippt der Satz mit.
 */
export function postStadtLand(k: SocialKennzahlen, eigeneVorlage?: string): SocialPost {
  const s = k.stadtLand;
  const faktor = s.landJeTausend / s.stadtJeTausend;
  const staerker = faktor >= 1;
  const sortiert = [...k.laender].sort((a, b) => b.balkonJeTausend - a.balkonJeTausend);
  // Stadtstaaten namentlich, nicht als „die letzten der Liste". Der Satz hieß
  // zuerst „bei den Stadtstaaten … Hamburg, Berlin. Niedersachsen kommt auf …"
  // und machte Niedersachsen damit zum Stadtstaat — die Aussage stimmte nur,
  // solange die Sortierung zufällig passte.
  const stadtstaatNamen = ["Berlin", "Hamburg", "Bremen"];
  const stadtstaaten = sortiert.filter((l) => stadtstaatNamen.includes(l.name));
  const flaechenlaender = sortiert.filter((l) => !stadtstaatNamen.includes(l.name));
  const spitze = flaechenlaender[0] ?? sortiert[0];

  // Werte einmal benannt, danach nur noch über Platzhalter angesprochen. Das
  // ist die Bedingung dafür, dass im Redaktionstisch frei formuliert werden
  // kann, ohne dass jemand eine Zahl überschreibt.
  const platzhalter: PlatzhalterInfo[] = [
    { name: "stadtAnzahl", wert: de(s.stadtAnzahl), erklaerung: "Zahl der Städte über der Schwelle" },
    { name: "stadtSchwelle", wert: `${de(s.stadtAb / 1000)}.000`, erklaerung: "Einwohnerschwelle Stadt" },
    { name: "stadtQuote", wert: de(s.stadtJeTausend, 1), erklaerung: "Geräte je 1.000 Einwohner, Städte" },
    { name: "landAnzahl", wert: de(Math.round(s.landAnzahl / 1000)), erklaerung: "Gemeinden unter der Schwelle, in Tausend" },
    { name: "landSchwelle", wert: `${de(s.landUnter / 1000)}.000`, erklaerung: "Einwohnerschwelle Gemeinde" },
    { name: "landQuote", wert: de(s.landJeTausend, 1), erklaerung: "Geräte je 1.000 Einwohner, Gemeinden" },
    { name: "faktor", wert: de(faktor, 1), erklaerung: "Verhältnis Land zu Stadt" },
    { name: "mehr", wert: de((faktor - 1) * 100, 0), erklaerung: "Vorsprung Land gegenüber Stadt in Prozent" },
    {
      name: "stadtstaaten",
      wert: stadtstaaten.map((l) => `${l.name} ${de(l.balkonJeTausend, 1)}`).join(", "),
      erklaerung: "Stadtstaaten mit ihrer Quote",
    },
    { name: "spitzenland", wert: spitze.name, erklaerung: "stärkstes Flächenland" },
    { name: "spitzenwert", wert: de(spitze.balkonJeTausend, 1), erklaerung: "dessen Quote" },
    { name: "quelle", wert: quellenzeile(k.standIso, true), erklaerung: "Quellenzeile mit Datenstand" },
  ];

  // Die ersten zwei Zeilen sind alles, was der Feed vor „mehr anzeigen" zeigt.
  // Hier stand zuerst die Prämisse und die Pointe kam danach — im
  // Redaktionstisch sofort sichtbar geworden, sobald die Vorschau die richtige
  // Reihenfolge hatte. Jetzt: Widerspruch zuerst, Herleitung danach.
  const standardVorlage = [
    `In deutschen Großstädten stehen nur halb so viele Balkonkraftwerke wie in kleinen Gemeinden. Bei einem Gerät, das als Lösung für Mieter in der Stadt gilt.`,
    ``,
    `Die Anmeldedaten: In den {stadtAnzahl} deutschen Städten über {stadtSchwelle} Einwohnern kommen {stadtQuote} Steckersolargeräte auf 1.000 Einwohner. In den gut {landAnzahl}.000 Gemeinden unter {landSchwelle} Einwohnern sind es {landQuote}. Also ${staerker ? `{mehr} Prozent mehr` : `weniger`} — und zwar dort, wo die meisten Leute ohnehin ein eigenes Dach hätten.`,
    ``,
    `Am deutlichsten in den Stadtstaaten: {stadtstaaten}. Unter den Flächenländern führt {spitzenland} mit {spitzenwert}.`,
    ``,
    `Warum das plausibel ist, wenn man kurz nachdenkt: Ein Balkonkraftwerk braucht keine Baugenehmigung und keinen Handwerker, aber es braucht jemanden, der es aufstellt und anmeldet. Im Reihenhaus mit Garten ist beides einfacher als im vierten Stock einer Mietwohnung, deren Balkon nach Norden zeigt.`,
    ``,
    `{quelle}`,
  ].join("\n");

  const werte = Object.fromEntries(platzhalter.map((p) => [p.name, p.wert]));
  const vorlage = eigeneVorlage ?? standardVorlage;
  const text = fuelle(vorlage, werte);

  return {
    id: "g13-stadt-land-balkon",
    vorlage,
    platzhalter,
    titel: "Das Balkonkraftwerk ist kein Stadtthema",
    kategorie: "g13",
    kanal: ["linkedin", "instagram"],
    text,
    bild: {
      stil: KARTEN_STIL_STANDARD,
      art: "saeule",
      aussage: staerker
        ? `Balkonkraftwerke stehen auf dem Land, nicht in der Stadt`
        : `Balkonkraftwerke stehen in der Stadt, nicht auf dem Land`,
      // Der Untertitel trägt die Einheit für beide Werte, deshalb steht sie
      // nicht noch einmal an den Zahlen.
      gemessen: `Angemeldete Steckersolargeräte je 1.000 Einwohner`,
      einheitAmWert: false,
      serien: [
        {
          label: "Städte",
          zusatz: `Über ${kurzEinwohner(s.stadtAb)} Einwohner`,
          wert: s.stadtJeTausend,
          einheit: "je 1.000 Ew.",
          stellen: 1,
        },
        {
          label: "Gemeinden",
          zusatz: `Unter ${kurzEinwohner(s.landUnter)} Einwohner`,
          wert: s.landJeTausend,
          einheit: "je 1.000 Ew.",
          stellen: 1,
          hervorgehoben: true,
          // Dieselbe Zahl in derselben Ausdrucksform wie im Beitragstext.
          // Stünde hier der Faktor und dort Prozent, müsste der Leser
          // umrechnen, um zu sehen, dass sich Bild und Text nicht widersprechen.
          delta: `+${de((faktor - 1) * 100, 0)} %`,
        },
      ],
      quelle: quellenzeile(k.standIso, false),
    },
    onsite: {
      anker: "stadt-land",
      ueberschrift: "Balkonkraftwerke stehen häufiger auf dem Land als in der Stadt",
      absaetze: [
        `Steckersolargeräte gelten als Lösung für Mieter in der Stadt. Die Anmeldungen im Marktstammdatenregister zeigen das Gegenteil: In den ${de(s.stadtAnzahl)} deutschen Städten über ${de(s.stadtAb / 1000)}.000 Einwohnern kommen ${de(s.stadtJeTausend, 1)} Geräte auf 1.000 Einwohner, in den Gemeinden unter ${de(s.landUnter / 1000)}.000 sind es ${de(s.landJeTausend, 1)}.`,
        `Am deutlichsten ist der Abstand in den Stadtstaaten: ${stadtstaaten.map((l) => `${l.name} ${de(l.balkonJeTausend, 1)}`).join(", ")}. Unter den Flächenländern führt ${spitze.name} mit ${de(spitze.balkonJeTausend, 1)}.`,
        `Der Grund liegt vermutlich nicht am Gerät, sondern an der Aufstellung: Ein Balkonkraftwerk braucht keine Baugenehmigung und keinen Handwerker, aber jemanden, der es anbringt und anmeldet — in der Mietwohnung zusätzlich das Einverständnis des Vermieters. Auf einer Terrasse oder im Garten ist das einfacher als an einem Mietbalkon, der nach Norden zeigt.`,
      ],
    },
    belege: [
      `Städte ab ${de(s.stadtAb)} Einwohnern: ${de(s.stadtAnzahl)} Gemeinden, ${de(s.stadtJeTausend, 1)} je 1.000 Einwohner`,
      `Gemeinden unter ${de(s.landUnter)}: ${de(s.landAnzahl)}, ${de(s.landJeTausend, 1)} je 1.000 Einwohner`,
      `Faktor ${de(faktor, 2)}`,
      `Stärkstes Flächenland ${spitze.name} ${de(spitze.balkonJeTausend, 1)} · Stadtstaaten ${stadtstaaten.map((l) => `${l.name} ${de(l.balkonJeTausend, 1)}`).join(", ")}`,
    ],
  };
}

/**
 * Post 2 — Wo der Zubau wirklich stattfindet.
 *
 * Zwei Wachstumsraten nebeneinander. Der Vergleich trägt nur, solange die
 * Balkon-Rate über der Solar-Rate liegt; kehrt sich das um, dreht der Text die
 * Aussage mit, statt eine überholte Pointe weiterzutragen.
 */
export function postWachstum(k: SocialKennzahlen): SocialPost {
  const w = k.wachstum;
  const balkonProzent = (w.balkonJetzt / w.balkonVorJahr - 1) * 100;
  const solarProzent = (w.solarKwpJetzt / w.solarKwpVorJahr - 1) * 100;
  const zuwachs = w.balkonJetzt - w.balkonVorJahr;
  const gwp = (n: number) => de(n / 1_000_000, 0);
  // Der Zeitraum kommt aus den Daten, nicht aus einer Annahme: Vergleichsbasis
  // ist der Jahresendbestand, der Abstand zum Datenstand also so lang, wie das
  // laufende Jahr alt ist. Bis zum 26.08.2026 stand hier „zwölf Monate" — bei
  // einem Datenstand vom 5. August waren es sieben.
  const zeitraum = zeitraumSeitStichtag(k.standIso, k.stichtagJahr);
  const zeitraumKurz = zeitraum.replace(/^in den ersten /, "in ").replace(/^seit /, "seit ");

  // Aussage in die ersten zwei Zeilen, siehe postStadtLand.
  const text = [
    `Balkonkraftwerke wachsen ${de(balkonProzent / solarProzent, 1)}-mal so schnell wie Deutschlands Solarleistung insgesamt. ${de(Math.round(zuwachs / 1000))}.000 neue ${zeitraumKurz}.`,
    ``,
    `Die Solarleistung ist im selben Zeitraum um ${de(solarProzent, 0)} Prozent gewachsen, auf ${gwp(w.solarKwpJetzt)} Gigawatt. Die Zahl der Balkonkraftwerke um ${de(balkonProzent, 0)} Prozent, von ${de(w.balkonVorJahr / 1_000_000, 2)} auf ${de(w.balkonJetzt / 1_000_000, 2)} Millionen.`,
    ``,
    `Leistungsmäßig ist das eine Randnotiz. Aber als Zahl der Menschen, die zum ersten Mal selbst Strom erzeugen, ist es die interessantere Größe: so viele Haushalte in einem Jahr, ohne Handwerker, ohne Kredit, ohne Genehmigung.`,
    ``,
    `Ich finde die zweite Zahl aussagekräftiger als die erste, auch wenn sie in keiner Ausbaustatistik auftaucht.`,
    ``,
    quellenzeile(k.standIso, true),
  ].join("\n");

  return {
    id: "g13-wachstum-balkon-solar",
    titel: "Wo der Zubau wirklich stattfindet",
    kategorie: "g13",
    kanal: ["linkedin", "instagram"],
    text,
    bild: {
      stil: KARTEN_STIL_STANDARD,
      art: "kennzahl",
      aussage: `Balkonkraftwerke wachsen ${de(balkonProzent / solarProzent, 1)}-mal so schnell wie die Solarleistung`,
      gemessen: `Veränderung ${zeitraum}`,
      // Zwei Prozentbalken nebeneinander sagen im Bild nichts: Die Länge
      // vergleicht dann zwei Veränderungen, nicht zwei Größen. Gezeigt wird
      // deshalb der Bestand vorher und nachher; die Rate steht in der Aussage.
      serien: [
        {
          label: `neue Balkonkraftwerke ${zeitraumKurz} — von ${de(w.balkonVorJahr / 1_000_000, 2)} auf ${de(w.balkonJetzt / 1_000_000, 2)} Millionen`,
          wert: Math.round(zuwachs / 1000),
          einheit: "Tausend",
          hervorgehoben: true,
        },
      ],
      quelle: quellenzeile(k.standIso, false),
    },
    onsite: {
      anker: "balkon-wachstum",
      ueberschrift: "Balkonkraftwerke wachsen schneller als die Solarleistung insgesamt",
      absaetze: [
        `Deutschlands installierte Solarleistung ist ${zeitraum} um ${de(solarProzent, 0)} Prozent gewachsen, auf ${gwp(w.solarKwpJetzt)} Gigawatt. Die Zahl der angemeldeten Steckersolargeräte im selben Zeitraum um ${de(balkonProzent, 0)} Prozent, von ${de(w.balkonVorJahr / 1_000_000, 2)} auf ${de(w.balkonJetzt / 1_000_000, 2)} Millionen.`,
        `An der Leistung gemessen ist das eine Randnotiz: Ein Balkonkraftwerk bringt einen Bruchteil dessen, was eine Dachanlage liefert. Als Zahl der Haushalte, die zum ersten Mal eigenen Strom erzeugen, ist es die größere Bewegung — ${de(Math.round(zuwachs / 1000))}.000 in einem Jahr, ohne Handwerker, ohne Kredit und ohne Genehmigung.`,
      ],
    },
    belege: [
      `Solar ${fmtPvLeistung(w.solarKwpJetzt)} gegen ${fmtPvLeistung(w.solarKwpVorJahr)} (+${de(solarProzent, 1)} %)`,
      `Balkon ${de(w.balkonJetzt)} gegen ${de(w.balkonVorJahr)} (+${de(balkonProzent, 1)} %), Zuwachs ${de(zuwachs)}`,
    ],
  };
}

/**
 * Post 3 — Der Osten baut auf Feldern, der Westen auf Dächern.
 *
 * Der schärfste geografische Kontrast im Bestand, und einer mit einer Ursache,
 * die man nennen kann: verfügbare Fläche. Die Reihenfolge wird gerechnet, nicht
 * behauptet — kippt sie, kippt der Satz mit.
 */
export function postFreiflaeche(k: SocialKennzahlen): SocialPost {
  const sortiert = [...k.laender].sort((a, b) => b.freiflaecheAnteil - a.freiflaecheAnteil);
  const oben = sortiert[0];
  // Stadtstaaten haben praktisch keine Freifläche und wären ein unfairer
  // Gegenpol — verglichen wird das schwächste FLÄCHENLAND.
  const stadtstaaten = ["Berlin", "Hamburg", "Bremen"];
  const flaechen = sortiert.filter((l) => !stadtstaaten.includes(l.name));
  const unten = flaechen[flaechen.length - 1];

  const text = [
    `${oben.name} hat ${de(oben.freiflaecheAnteil, 0)} Prozent seiner Solarleistung auf Freiflächen stehen. ${unten.name} ${de(unten.freiflaecheAnteil, 0)} Prozent. Beide bauen Solar aus, aber an völlig verschiedenen Orten.`,
    ``,
    `Die Spanne über alle Flächenländer reicht von ${de(unten.freiflaecheAnteil, 0)} bis ${de(oben.freiflaecheAnteil, 0)} Prozent. In den Stadtstaaten liegt der Anteil unter einem Prozent — dort gibt es schlicht keine Flächen.`,
    ``,
    `Das ist keine Frage der Förderung und auch keine der Einstellung, sondern eine der verfügbaren Fläche. Wo Ackerland günstig und Siedlungsdichte niedrig ist, entstehen Solarparks. Wo beides umgekehrt ist, bleibt das Dach.`,
    ``,
    `Für die Debatte über Flächenverbrauch heißt das: Sie wird in wenigen Bundesländern geführt und betrifft die anderen kaum.`,
    ``,
    quellenzeile(k.standIso, true),
  ].join("\n");

  return {
    id: "g14-freiflaeche-ost-west",
    titel: "Der Osten baut auf Feldern, der Westen auf Dächern",
    kategorie: "g14",
    kanal: ["linkedin"],
    text,
    bild: {
      stil: KARTEN_STIL_STANDARD,
      // Das Ringpaar bleibt die eingebaute Form — es war die abgenommene. Die
      // gefüllten Landesumrisse sind eine VARIANTE und über den Umschalter
      // erreichbar: Was einmal abgenommen wurde, wird nicht durch eine neue Idee
      // ersetzt, sondern bekommt sie danebengestellt.
      art: "donut",
      // Hier trägt ausnahmsweise die gemessene Größe die Überschrift (Betreiber,
      // 27.08.2026): Das Bild zeigt zwei Anteile am selben Ganzen, und der
      // Sachtitel sagt in fünf Wörtern, was die Ringe sind. Die Deutung —
      // Fläche entscheidet, nicht Förderung — steht im Beitragstext, wo Platz
      // dafür ist. Das bleibt die Ausnahme: Ein Bild, dessen Überschrift nur die
      // Achse benennt, ist im Feed eine Zahlentafel.
      aussage: `Anteil Freiflächen an der Solarleistung`,
      gemessen: ``,
      // Anteile beziehen sich auf ein Ganzes, also wird daran normiert und nicht
      // am größeren der beiden Werte: Ein voller Ring für 70 Prozent behauptete
      // 100. Der leere Rest im Ring ist hier die Leistung, die auf Dächern steht.
      ganzes: 100,
      // Das Prozentzeichen bleibt: „70" ohne es ist keine gekürzte Angabe,
      // sondern eine andere Zahl.
      einheitAmWert: true,
      serien: [
        { label: oben.name, umriss: oben.name, wert: oben.freiflaecheAnteil, einheit: "%", stellen: 0, hervorgehoben: true },
        { label: unten.name, umriss: unten.name, wert: unten.freiflaecheAnteil, einheit: "%", stellen: 0 },
      ],
      quelle: quellenzeile(k.standIso, false),
    },
    belege: [
      `Spitze ${oben.name} ${de(oben.freiflaecheAnteil, 1)} % (${fmtPvLeistung(oben.solarKwp)})`,
      `Schwächstes Flächenland ${unten.name} ${de(unten.freiflaecheAnteil, 1)} % (${fmtPvLeistung(unten.solarKwp)})`,
      `Stadtstaaten ausgenommen: ${stadtstaaten.join(", ")}`,
    ],
  };
}

/**
 * Post 4 — Die Energiewende liegt nicht auf Privatdächern.
 *
 * Widerspricht dem verbreiteten Bild und braucht dafür keinen Ortsnamen, also
 * auch kein Kränkungsrisiko.
 */
export function postSegmente(k: SocialKennzahlen): SocialPost {
  const s = k.segmente;
  const anteil = (v: number) => (s.solarGesamtKwp ? (v / s.solarGesamtKwp) * 100 : 0);
  const privat = anteil(s.privatDachKwp);
  const gewerbe = anteil(s.gewerbeDachKwp);
  const frei = anteil(s.freiflaecheKwp);

  const text = [
    `Auf privaten Dächern liegen ${de(privat, 0)} Prozent der deutschen Solarleistung. Gewerbedächer und Freiflächen tragen zusammen den Rest.`,
    ``,
    `Die genaue Aufteilung: privates Dach ${de(privat, 1)} Prozent, Gewerbe ${de(gewerbe, 1)}, Freifläche ${de(frei, 1)}. Zusammen ${fmtPvLeistung(s.solarGesamtKwp)}.`,
    ``,
    `Das Bild von der Energiewende auf dem Einfamilienhausdach stimmt also nur für gut ein Viertel. Der größere Teil entsteht dort, wo jemand gewerblich rechnet — auf Hallendächern und auf Feldern.`,
    ``,
    `Was das für die eigene Anlage bedeutet: nichts. Sie rechnet sich unabhängig davon, wie groß ihr Anteil an der Gesamtstatistik ist. Für die Debatte darüber, wo Solar hingehört, ist es aber der Ausgangspunkt.`,
    ``,
    quellenzeile(k.standIso, true),
  ].join("\n");

  return {
    id: "g7-segmente-anteile",
    titel: "Die Energiewende liegt nicht auf Privatdächern",
    kategorie: "g7",
    kanal: ["linkedin", "instagram"],
    text,
    bild: {
      stil: KARTEN_STIL_STANDARD,
      art: "vergleich",
      aussage: `Nur gut ein Viertel der Solarleistung liegt auf privaten Dächern`,
      gemessen: `Anteil an der installierten Solarleistung`,
      serien: [
        { label: "Freifläche", wert: frei, einheit: "%", stellen: 0 },
        { label: "Gewerbedach", wert: gewerbe, einheit: "%", stellen: 0 },
        { label: "Privates Dach", wert: privat, einheit: "%", stellen: 0, hervorgehoben: true },
      ],
      quelle: quellenzeile(k.standIso, false),
    },
    belege: [
      `Gesamt ${fmtPvLeistung(s.solarGesamtKwp)}`,
      `privat ${fmtPvLeistung(s.privatDachKwp)} · Gewerbe ${fmtPvLeistung(s.gewerbeDachKwp)} · Freifläche ${fmtPvLeistung(s.freiflaecheKwp)}`,
    ],
  };
}

/**
 * Post 5 — Die Städte holen auf.
 *
 * Gegenstück zur Stadt-Land-Geschichte: Beim Bestand liegen die Städte hinten,
 * beim Wachstum vorn. Beide Aussagen stimmen und widersprechen einander nicht —
 * wer wenig hat, wächst schneller.
 */
export function postAufholjagd(k: SocialKennzahlen): SocialPost {
  const sortiert = [...k.laender].filter((l) => l.wachstumFuenfJahre > 0).sort((a, b) => b.wachstumFuenfJahre - a.wachstumFuenfJahre);
  const oben = sortiert[0];
  const unten = sortiert[sortiert.length - 1];

  const text = [
    `${oben.name} hat seine Solarleistung in fünf Jahren mehr als ${de(Math.floor(oben.wachstumFuenfJahre), 0)}-mal so groß gemacht. ${unten.name} kam auf das ${de(unten.wachstumFuenfJahre, 1)}-fache.`,
    ``,
    `Das klingt nach einer Überraschung, ist aber die Regel: Wer wenig hatte, wächst schneller. Die Stadtstaaten führen diese Liste an, weil sie von einem sehr niedrigen Stand kommen — an installierter Leistung je Einwohner liegen sie weiter hinten.`,
    ``,
    `Beide Zahlen stimmen gleichzeitig, und sie beantworten verschiedene Fragen. Wer wissen will, wo viel Solar steht, schaut auf den Bestand. Wer wissen will, wo sich gerade etwas bewegt, auf das Wachstum.`,
    ``,
    quellenzeile(k.standIso, true),
  ].join("\n");

  return {
    id: "g3-aufholjagd-fuenf-jahre",
    titel: "Die Städte holen auf",
    kategorie: "g3",
    kanal: ["linkedin"],
    text,
    bild: {
      stil: KARTEN_STIL_STANDARD,
      art: "saeule",
      aussage: `Wer wenig hatte, wächst am schnellsten`,
      gemessen: `Solarleistung heute im Verhältnis zu vor fünf Jahren`,
      einheitAmWert: false,
      // Kein Abstandswert: Die Werte SIND schon Faktoren. „2,6-mal so viel
      // Wachstum" ist ein Faktor eines Faktors und sagt niemandem etwas.
      serien: [
        { label: oben.name, umriss: oben.name, wert: oben.wachstumFuenfJahre, einheit: "fach", stellen: 1, hervorgehoben: true },
        { label: unten.name, umriss: unten.name, wert: unten.wachstumFuenfJahre, einheit: "fach", stellen: 1 },
      ],
      quelle: quellenzeile(k.standIso, false),
    },
    belege: sortiert.map((l) => `${l.name} ${de(l.wachstumFuenfJahre, 2)}x`),
  };
}

/**
 * Post 6 — Zwei von drei Gemeinden haben mehr Kilowatt als Einwohner.
 *
 * Eine Bundeszahl mit anschaulicher Größenordnung. Die Mindest-Einwohnerzahl
 * steht im Text: Ohne sie wäre die Aussage eine Eigenschaft des Nenners.
 */
export function postUeberEinwohner(k: SocialKennzahlen): SocialPost {
  const u = k.ueberEinwohner;
  const anteil = u.betrachtet ? (u.darueber / u.betrachtet) * 100 : 0;

  const text = [
    `In ${de(u.darueber, 0)} von ${de(u.betrachtet, 0)} deutschen Gemeinden steht mehr Solarleistung, als der Ort Einwohner hat. Also mehr als ein Kilowatt je Kopf.`,
    ``,
    `Das sind ${de(anteil, 0)} Prozent aller Gemeinden ab ${de(u.mindestEinwohner, 0)} Einwohnern. Kleinere sind ausgenommen: Dort entscheidet ein einzelner Solarpark über die Zahl, und dann sagt sie mehr über den Nenner als über den Ort.`,
    ``,
    `Ein Kilowatt je Einwohner klingt nach wenig und ist es nicht. Es erzeugt im Jahr grob so viel Strom, wie ein Ein-Personen-Haushalt verbraucht — für jeden Einwohner, vom Säugling bis zum Rentner.`,
    ``,
    quellenzeile(k.standIso, true),
  ].join("\n");

  return {
    id: "g3-mehr-kwp-als-einwohner",
    titel: "Zwei von drei Gemeinden haben mehr Kilowatt als Einwohner",
    kategorie: "g3",
    kanal: ["linkedin", "instagram"],
    text,
    bild: {
      stil: KARTEN_STIL_STANDARD,
      art: "kennzahl",
      aussage: `In den meisten Gemeinden steht mehr Solarleistung als Einwohner`,
      gemessen: `Gemeinden ab ${de(u.mindestEinwohner, 0)} Einwohnern`,
      serien: [
        {
          label: `von ${de(u.betrachtet, 0)} Gemeinden haben mehr als ein Kilowatt Solarleistung je Einwohner`,
          wert: u.darueber,
          einheit: "",
          hervorgehoben: true,
        },
      ],
      quelle: quellenzeile(k.standIso, false),
    },
    belege: [
      `${de(u.darueber, 0)} von ${de(u.betrachtet, 0)} (${de(anteil, 1)} %)`,
      `Untergrenze ${de(u.mindestEinwohner, 0)} Einwohner`,
    ],
  };
}

/**
 * Post 7 — Die Kohorte: wie die typische private Anlage aussieht.
 *
 * Ohne Ortsbezug und damit ohne Kränkungsrisiko — eine der wenigen Familien
 * ganz ohne Schranke. Die Speicherquote ist die Zahl, die überrascht: Sie liegt
 * über dem, was die meisten schätzen.
 */
export function postKohorte(k: SocialKennzahlen): SocialPost {
  const c = k.kohorte;

  const text = [
    `Die typische private Dachanlage in Deutschland ist ${de(c.mittlereKwp, 1)} Kilowatt groß. Auf 100 solcher Anlagen kommen ${de(c.speicherJe100, 0)} angemeldete Heimspeicher.`,
    ``,
    `Gerechnet über alle ${de(Math.round(c.privatAnlagen / 1000))}.000 privaten Dachanlagen und ${de(Math.round(c.speicherEinheiten / 1000))}.000 Speicher im Anlagenregister.`,
    ``,
    `Das ist ausdrücklich KEINE Quote „so viele Anlagen haben einen Speicher". Das Register zählt Speicher als eigene Einheiten: Ein Haushalt kann mehrere anmelden, und ein Balkonspeicher hat gar keine Dachanlage. Die beiden Zahlen lassen sich ins Verhältnis setzen, aber nicht einander zuordnen.`,
    ``,
    `Beide sind außerdem Durchschnitte über alle Jahrgänge und sagen wenig über das, was heute gebaut wird — eine Anlage von 2012 zieht den Schnitt nach unten, bei der Größe wie beim Speicher.`,
    ``,
    quellenzeile(k.standIso, true),
  ].join("\n");

  return {
    id: "g16-kohorte-typische-anlage",
    titel: "Wie die typische private Anlage aussieht",
    kategorie: "g16",
    kanal: ["linkedin", "instagram"],
    text,
    bild: {
      stil: KARTEN_STIL_STANDARD,
      art: "kennzahl",
      aussage: `Auf 100 private Dachanlagen kommen ${de(c.speicherJe100, 0)} Heimspeicher`,
      gemessen: `Angemeldete Anlagen im Register, alle Jahrgänge`,
      serien: [
        {
          label: `angemeldete Heimspeicher je 100 private Dachanlagen — nicht jede Anlage hat einen, manche Haushalte mehrere`,
          wert: c.speicherJe100,
          einheit: "",
          stellen: 0,
          hervorgehoben: true,
        },
      ],
      quelle: quellenzeile(k.standIso, false),
    },
    belege: [
      `${de(c.privatAnlagen)} private Dachanlagen, ${de(c.speicherEinheiten)} Heimspeicher (${de(c.speicherJe100, 1)} je 100)`,
      `Mittlere Größe ${de(c.mittlereKwp, 2)} kWp`,
      `Speicher sind eigene Einheiten im Register — die Zahl ist ein Verhältnis, kein Anteil`,
    ],
  };
}

/**
 * Post 8 — Die Anomalie als offene Frage.
 *
 * Der stärkste Kommentar-Motor des Katalogs, und der mit den schärfsten
 * Schranken: nur ein POSITIVER Ausschlag (ein negativer wäre eine
 * Bloßstellung), nur über einer Mindestgröße (sonst entsteht der Superlativ
 * vollständig im Nenner), und die Frage bleibt offen — wir kennen die Ursache
 * nicht und behaupten sie deshalb nicht.
 */
export function postAnomalie(k: SocialKennzahlen): SocialPost {
  const a = k.anomalie;
  const faktor = a.bundesJeTausend ? a.jeTausend / a.bundesJeTausend : 0;

  const text = [
    `In ${a.ort} stehen ${de(a.jeTausend, 1)} Balkonkraftwerke je 1.000 Einwohner. Bundesweit sind es ${de(a.bundesJeTausend, 1)}. Weiß jemand, was da los ist?`,
    ``,
    `Der Ort hat ${de(a.einwohner)} Einwohner, liegt also weit über der Schwelle, ab der so eine Quote aus einer Handvoll Geräten entstehen kann. Es ist das ${de(faktor, 1)}-fache des Bundesschnitts.`,
    ``,
    `Wir sehen im Anlagenregister nur die Anmeldungen, nicht ihren Grund. Denkbar wäre vieles: ein kommunales Programm, eine Aktion eines Vereins, ein Bericht in der Lokalzeitung, ein einzelner Händler vor Ort.`,
    ``,
    `Falls jemand die Antwort kennt: Sie interessiert uns, und sie wird der nächste Beitrag.`,
    ``,
    quellenzeile(k.standIso, true),
  ].join("\n");

  return {
    id: "g10-anomalie-balkon-ort",
    titel: "Die Anomalie als offene Frage",
    kategorie: "g10",
    kanal: ["linkedin"],
    text,
    bild: {
      stil: KARTEN_STIL_STANDARD,
      art: "saeule",
      aussage: `${a.ort} hat das ${de(faktor, 1)}-fache des Bundesschnitts`,
      gemessen: `Angemeldete Steckersolargeräte je 1.000 Einwohner`,
      einheitAmWert: false,
      serien: [
        {
          label: a.ort,
          zusatz: `${kurzEinwohner(a.einwohner)} Einwohner`,
          wert: a.jeTausend,
          einheit: "je 1.000 Ew.",
          stellen: 1,
          hervorgehoben: true,
          delta: `+${de((faktor - 1) * 100, 0)} %`,
        },
        {
          label: "Deutschland",
          zusatz: "alle Gemeinden",
          wert: a.bundesJeTausend,
          einheit: "je 1.000 Ew.",
          stellen: 1,
        },
      ],
      quelle: quellenzeile(k.standIso, false),
    },
    belege: [
      `${a.ort}: ${de(a.jeTausend, 2)} je 1.000 Einwohner bei ${de(a.einwohner)} Einwohnern`,
      `Bundesschnitt ${de(a.bundesJeTausend, 2)} je 1.000 Einwohner`,
      `Mindestgröße für die Auswahl: ${de(a.mindestEinwohner)} Einwohner`,
    ],
  };
}

/**
 * Post 14 — Wo der Speicher Standard ist.
 *
 * Dieselbe Form wie die Flächenfrage, andere Zahl: Der Speicher ist die
 * Entscheidung, die je Land am weitesten auseinandergeht — und sie sagt mehr
 * über Beratung und Handwerk vor Ort als über Sonne.
 */
export function postSpeicherJeLand(k: SocialKennzahlen): SocialPost {
  const sortiert = [...k.laender].filter((l) => l.speicherJe100 > 0).sort((a, b) => b.speicherJe100 - a.speicherJe100);
  const oben = sortiert[0];
  const unten = sortiert[sortiert.length - 1];
  const faktor = unten.speicherJe100 ? oben.speicherJe100 / unten.speicherJe100 : 0;

  const text = [
    `In ${oben.name} kommen auf 100 private Dachanlagen ${de(oben.speicherJe100, 0)} angemeldete Heimspeicher. In ${unten.name} sind es ${de(unten.speicherJe100, 0)}.`,
    ``,
    `Das ${de(faktor, 1)}-fache — der größte Unterschied zwischen den Ländern, den wir im Bestand finden. Größer als beim Zubau, größer als bei der Anlagengröße.`,
    ``,
    `Wichtig für die Einordnung: Das ist keine Quote „so viele Anlagen haben einen Speicher". Das Register führt Speicher als eigene Einheiten — ein Haushalt kann mehrere anmelden, und ein Balkonspeicher hat gar keine Dachanlage. Gerade in den Stadtstaaten hebt das die Zahl.`,
    ``,
    `Die Sonne erklärt den Abstand nicht. Was sich unterscheidet, ist eher, was vor Ort angeboten und beraten wird — ein Speicher wird verkauft, nicht gesucht.`,
    ``,
    quellenzeile(k.standIso, true),
  ].join("\n");

  return {
    id: "g16-speicher-je-land",
    titel: "Wo der Speicher Standard ist",
    kategorie: "g16",
    kanal: ["linkedin"],
    text,
    bild: {
      stil: KARTEN_STIL_STANDARD,
      // Säule und nicht gefüllter Umriss: Ein Verhältnis hat kein Ganzes, und
      // ein Umriss, der sich füllt, behauptete genau das. Bremen läge damit über
      // dem Rand — die Form würde gekappt und zeigte eine andere Zahl als die
      // Beschriftung darunter.
      art: "saeule",
      aussage: `Heimspeicher je 100 private Dachanlagen`,
      gemessen: `Angemeldete Speicher-Einheiten im Verhältnis zu den Dachanlagen`,
      einheitAmWert: false,
      serien: [
        {
          label: oben.name,
          umriss: oben.name,
          wert: oben.speicherJe100,
          einheit: "je 100",
          stellen: 0,
          hervorgehoben: true,
          delta: `${de(faktor, 1)}×`,
        },
        { label: unten.name, umriss: unten.name, wert: unten.speicherJe100, einheit: "je 100", stellen: 0 },
      ],
      quelle: quellenzeile(k.standIso, false),
    },
    belege: [
      ...sortiert.map((l) => `${l.name} ${de(l.speicherJe100, 1)} Speicher je 100 Dachanlagen`),
      `Speicher sind eigene Einheiten im Register — Werte über 100 sind möglich und kein Fehler`,
    ],
  };
}

/**
 * Post 13 — Wo der Strom vom eigenen Dach kommt.
 *
 * Gegenstück zur Flächenfrage, aus derselben Aufteilung von der anderen Seite
 * gelesen: Wo wenig auf Freiflächen steht, steht viel auf privaten Dächern —
 * und die Länder, die dabei vorn liegen, sind nicht dieselben.
 */
export function postPrivatdachAnteil(k: SocialKennzahlen): SocialPost {
  // Stadtstaaten haben praktisch keine Freifläche und stünden hier zwangsläufig
  // oben — verglichen werden deshalb Flächenländer, wie schon bei der
  // Freiflächen-Story.
  const stadtstaaten = ["Berlin", "Hamburg", "Bremen"];
  const flaechen = k.laender
    .filter((l) => !stadtstaaten.includes(l.name) && l.solarKwp > 0)
    .map((l) => ({ ...l, privatAnteil: (l.privatDachKwp / l.solarKwp) * 100 }))
    .sort((a, b) => b.privatAnteil - a.privatAnteil);
  const oben = flaechen[0];
  const unten = flaechen[flaechen.length - 1];

  const text = [
    `In ${oben.name} stehen ${de(oben.privatAnteil, 0)} Prozent der Solarleistung auf privaten Dächern. In ${unten.name} sind es ${de(unten.privatAnteil, 0)} Prozent.`,
    ``,
    `Das ist dieselbe Aufteilung wie bei der Freiflächen-Frage, nur von der anderen Seite gelesen — und die Reihenfolge ist eine andere. Ein Land kann wenig Freifläche haben und trotzdem wenig Privatdach, wenn das Gewerbe dazwischenliegt.`,
    ``,
    `Für die Debatte über Flächen heißt das: Wer „Dach statt Feld" fordert, meint in den meisten Ländern zuerst Hallendächer, nicht Einfamilienhäuser. Die private Fläche ist überall die kleinste der drei.`,
    ``,
    `Stadtstaaten sind hier ausgenommen: Sie haben kaum Freifläche und stünden zwangsläufig oben, ohne dass das etwas über die Dächer sagt.`,
    ``,
    quellenzeile(k.standIso, true),
  ].join("\n");

  return {
    id: "g14-privatdach-anteil",
    titel: "Wo der Strom vom eigenen Dach kommt",
    kategorie: "g14",
    kanal: ["linkedin"],
    text,
    bild: {
      stil: KARTEN_STIL_STANDARD,
      art: "umriss",
      aussage: `Anteil privater Dächer an der Solarleistung`,
      gemessen: ``,
      ganzes: 100,
      einheitAmWert: true,
      serien: [
        {
          label: oben.name,
          umriss: oben.name,
          wert: oben.privatAnteil,
          einheit: "%",
          stellen: 0,
          hervorgehoben: true,
        },
        { label: unten.name, umriss: unten.name, wert: unten.privatAnteil, einheit: "%", stellen: 0 },
      ],
      quelle: quellenzeile(k.standIso, false),
    },
    belege: flaechen.map((l) => `${l.name} ${de(l.privatAnteil, 1)} % privat (${fmtPvLeistung(l.solarKwp)} gesamt)`),
  };
}

/**
 * Post 11 — Was in kommunalen Förderprogrammen fehlt.
 *
 * Ohne einen einzigen Ortsnamen. Diese Familie hilft, sie bewertet nicht: Eine
 * vorgeführte Gemeinde beendet den Outreach in ihrer ganzen Region, ohne dass
 * es jemand sagt — und die Programme sind ohnehin nicht die Leistung einer
 * einzelnen Verwaltung, sondern das Muster.
 */
export function postFoerderLuecken(k: SocialKennzahlen): SocialPost {
  const f = k.foerderung;
  // „AUFFINDBAR", nicht „genannt": Gemessen wird unser Katalogfeld, nicht die
  // Amtsseite. Ein Programm, dessen Höchstbetrag irgendwo im Satzungstext
  // steht, den wir nicht erfasst haben, wäre sonst als Versäumnis der Gemeinde
  // ausgewiesen — dieselbe Fehlerklasse wie eine Beschriftung, die etwas
  // anderes sagt als die Zahl darunter misst. Und für die Aussage der Familie
  // ist die Auffindbarkeit ohnehin der Punkt.
  const anteilOhne = f.programme ? (f.ohneHoechstbetrag / f.programme) * 100 : 0;
  const anteilAntrag = f.programme ? (f.mitAntragVorher / f.programme) * 100 : 0;

  const text = [
    `Bei ${de(f.ohneHoechstbetrag)} von ${de(f.programme)} kommunalen Förderprogrammen haben wir keinen Höchstbetrag gefunden. Wer wissen will, wie viel er bekommt, muss anrufen.`,
    ``,
    `Wir pflegen den Katalog täglich und sehen dabei dasselbe Muster: Bei ${de(anteilOhne, 0)} Prozent ist keine Obergrenze auffindbar, ${de(anteilAntrag, 0)} Prozent verlangen den Antrag vor der Beauftragung — die teuerste Bedingung überhaupt, weil sie den Zuschuss nachträglich unmöglich macht und selten prominent steht.`,
    ``,
    `Keine Namen hier: Das ist kein Versäumnis einzelner Verwaltungen, sondern ein Muster. Drei Dinge würden es abstellen — ein genannter Höchstbetrag, ein verlinktes Formular und der Satz „Antrag vor Auftragsvergabe" als Erstes statt im Kleingedruckten.`,
    ``,
    `Wer sein Programm daraufhin ansehen will: Wir schauen kostenlos drauf und sagen, was fehlt.`,
    ``,
    quellenzeile(k.standIso, true),
  ].join("\n");

  return {
    id: "g12-foerder-luecken",
    titel: "Was in Förderprogrammen fehlt",
    kategorie: "g12",
    kanal: ["linkedin"],
    text,
    bild: {
      stil: KARTEN_STIL_STANDARD,
      art: "donut",
      aussage: `Bei den meisten Programmen ist kein Höchstbetrag auffindbar`,
      gemessen: `Anteil der kommunalen Programme im Katalog`,
      ganzes: 100,
      einheitAmWert: true,
      serien: [
        { label: "kein Höchstbetrag auffindbar", wert: anteilOhne, einheit: "%", stellen: 0, hervorgehoben: true },
        { label: "Antrag vor Beauftragung", wert: anteilAntrag, einheit: "%", stellen: 0 },
      ],
      quelle: quellenzeile(k.standIso, false),
    },
    belege: [
      `${de(f.programme)} zählende Programme in ${de(f.gemeinden)} Gemeinden`,
      `kein Höchstbetrag im Katalog ${de(f.ohneHoechstbetrag)} (${de(anteilOhne, 1)} %)`,
      `Antrag vor Beauftragung ${de(f.mitAntragVorher)} (${de(anteilAntrag, 1)} %)`,
    ],
  };
}

/**
 * Post 12 — Kommunen, die nur noch Steckersolar fördern.
 *
 * Der Befund selbst ist die Geschichte: Ein Programm, das die Dachanlage
 * streicht und das Balkonkraftwerk behält, ist eine Entscheidung über
 * Reichweite je Euro — und sie fällt gerade in Serie.
 */
export function postNurBalkon(k: SocialKennzahlen): SocialPost {
  const f = k.foerderung;
  const anteil = f.programme ? (f.nurBalkon / f.programme) * 100 : 0;

  const text = [
    `${de(f.nurBalkon)} von ${de(f.programme)} kommunalen Förderprogrammen fördern nur noch Balkonkraftwerke — keine Dachanlagen mehr.`,
    ``,
    `Das sind ${de(anteil, 0)} Prozent des Katalogs, den wir täglich pflegen. München ist der bekannteste Fall: seit Ende 2024 nur noch Steckersolar.`,
    ``,
    `Die Rechnung dahinter ist nachvollziehbar. Ein Zuschuss von ein paar hundert Euro bewegt bei einer Dachanlage für 15.000 Euro wenig; beim Balkonkraftwerk für 500 Euro ist er ein Drittel des Preises. Wer Haushalte erreichen will, die sonst nichts machen, bekommt hier mehr Bewegung je Euro.`,
    ``,
    `Ob das die richtige Entscheidung ist, hängt am Ziel — Leistung oder Zahl der Beteiligten. Beides ist vertretbar, aber es sind zwei verschiedene Ziele.`,
    ``,
    quellenzeile(k.standIso, true),
  ].join("\n");

  return {
    id: "g5-nur-balkon-foerderung",
    titel: "Kommunen, die nur noch Steckersolar fördern",
    kategorie: "g5",
    kanal: ["linkedin"],
    text,
    bild: {
      stil: KARTEN_STIL_STANDARD,
      art: "kennzahl",
      aussage: `Jedes ${de(anteil ? 100 / anteil : 0, 0)}-te Programm fördert nur noch Balkonkraftwerke`,
      gemessen: `Kommunale Förderprogramme im Katalog`,
      serien: [
        {
          label: `von ${de(f.programme)} Programmen fördern keine Dachanlagen mehr`,
          wert: f.nurBalkon,
          einheit: "",
          hervorgehoben: true,
        },
      ],
      quelle: quellenzeile(k.standIso, false),
    },
    belege: [
      `${de(f.nurBalkon)} von ${de(f.programme)} Programmen (${de(anteil, 1)} %)`,
      `Grundmenge: Programme, die aktuell zählen (aktiv und belegt)`,
    ],
  };
}

/**
 * Die Quellenzeile für Zahlen, die NICHT aus dem Anlagenregister kommen.
 *
 * Getrennt und nicht als Parameter der anderen: Wer eine fremde Quelle als
 * Marktstammdatenregister ausweist, macht eine falsche Lizenzangabe — und zwar
 * genau auf der Fläche, die weitergeteilt wird. Der Änderungshinweis ist bei
 * CC BY Pflicht, wo wir wirklich verändern; hier mitteln wir über Jahre und
 * Länder, also gehört er dazu.
 */
function quellenzeileEmber(mitMarke: boolean): string {
  const bis = YEARS_PERCAPITA[YEARS_PERCAPITA.length - 1];
  return quelleAus("ember", String(bis), mitMarke);
}

/**
 * Post 10 — Das Ausland, pro Kopf statt absolut.
 *
 * Absolut ist Deutschland weit vorn und die Aussage wertlos: Ein großes Land
 * erzeugt mehr. Je Einwohner steht es woanders, und das ist die Zahl, die
 * vergleichbar ist.
 *
 * Die Reihe hat eine EIGENE Jahresachse und endet ein Jahr früher als die
 * übrigen Länderreihen — Ember hat die Einwohnerzahl aus dem Jahresdatensatz
 * genommen. Das Jahr steht deshalb im Text, statt „heute" zu behaupten.
 */
// Diese Story braucht die Registerzahlen nicht — sie steht auf einer eigenen
// Quelle. Der Parameter bleibt der Einheitlichkeit halber in der Signatur.
export function postAusland(_k: SocialKennzahlen): SocialPost {
  const jahr = YEARS_PERCAPITA[YEARS_PERCAPITA.length - 1];
  const letzter = (r: (typeof PERCAPITA_SERIES)[number]) => r.values[r.values.length - 1] ?? 0;
  const rang = [...PERCAPITA_SERIES].sort((a, b) => letzter(b) - letzter(a));
  const de_ = rang.find((r) => r.key === "Deutschland") ?? rang[0];
  const platz = rang.indexOf(de_) + 1;
  const spitze = rang[0];
  const vorsprung = letzter(de_) ? letzter(spitze) / letzter(de_) : 0;

  const text = [
    `Deutschland erzeugte ${de(letzter(de_))} Kilowattstunden Wind- und Solarstrom je Einwohner. ${spitze.label} kam auf ${de(letzter(spitze))} — das ${de(vorsprung, 1)}-fache.`,
    ``,
    `Platz ${de(platz)} von ${de(rang.length)} verglichenen Ländern, Stand ${de(jahr)}. Absolut liegt Deutschland weit vorn, aber das sagt vor allem etwas über die Größe des Landes. Je Einwohner ist die Zahl vergleichbar — und da ist noch Luft.`,
    ``,
    `Der Abstand nach oben ist kein Naturgesetz: ${spitze.label} hat weder mehr Sonne noch mehr Fläche je Kopf. Was dort anders läuft, ist eine eigene Diskussion — die Zahl selbst ist erst einmal nur ein Maßstab.`,
    ``,
    quellenzeileEmber(true),
  ].join("\n");

  return {
    id: "g8-ausland-pro-kopf",
    titel: "Das Ausland, pro Kopf gerechnet",
    kategorie: "g8",
    kanal: ["linkedin"],
    text,
    bild: {
      stil: KARTEN_STIL_STANDARD,
      art: "saeule",
      aussage: `${spitze.label} erzeugt je Einwohner das ${de(vorsprung, 1)}-fache`,
      gemessen: `Wind- und Solarstrom je Einwohner, ${de(jahr)}`,
      einheitAmWert: false,
      serien: [
        {
          label: spitze.label,
          wert: letzter(spitze),
          einheit: "kWh je Ew.",
          hervorgehoben: true,
          delta: `+${de((vorsprung - 1) * 100, 0)} %`,
        },
        {
          label: de_.label,
          zusatz: `Platz ${de(platz)} von ${de(rang.length)}`,
          wert: letzter(de_),
          einheit: "kWh je Ew.",
        },
      ],
      quelle: quellenzeileEmber(false),
    },
    belege: rang.map((r, i) => `${i + 1}. ${r.label} ${de(letzter(r))} kWh je Einwohner`),
  };
}

/**
 * Post 9 — Der Degressionstermin.
 *
 * Der planbare Teil des Redaktionsplans: Die Absenkung steht im Gesetz, sie
 * passiert am 1. Februar und am 1. August, und das lässt sich Wochen vorher
 * schreiben.
 *
 * Der Post nennt den TERMIN und die Regel, nicht den künftigen Satz. Der stünde
 * erst mit der nächsten Periode in der Config; ihn hier aus der Regel
 * abzuleiten wäre eine zweite Rechnung neben der einen Quelle — genau die Sorte
 * Nebenrechnung, die irgendwann von ihr abweicht.
 *
 * Und er trägt den Vorbehalt der laufenden Reform, aus derselben einen Quelle
 * wie alle anderen Oberflächen: Ein Beitrag, der eine Fortschreibung als sicher
 * darstellt, während ein Gesetzentwurf sie gerade abschaffen will, ist die
 * teuerste Auskunft, die wir geben können.
 */
export function postDegression(k: SocialKennzahlen, _vorlage?: string, heuteIso?: string): SocialPost {
  const heute = heuteIso ?? k.standIso.slice(0, 10);
  const satz = feedInRatesFor(new Date(heute));
  const termin = naechsteDegressionIso(heute);
  const terminText = new Date(termin).toLocaleDateString("de-DE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const text = [
    `Am ${terminText} sinkt die Einspeisevergütung wieder um ein Prozent. Wer vorher ans Netz geht, behält den höheren Satz — zwanzig Jahre lang.`,
    ``,
    `Heute sind es ${fmtCtText(satz.teilUnder10)} je eingespeister Kilowattstunde für eine Anlage bis ${de(satz.thresholdKwp)} Kilowatt mit Eigenverbrauch. Die Absenkung ist kein Beschluss, der jedes Mal neu fällt, sondern steht als feste Regel im Gesetz: ein Prozent zum 1. Februar und zum 1. August (§ 49 EEG).`,
    ``,
    `Maßgeblich ist der Tag der Inbetriebnahme, nicht der Tag der Bestellung. Wer im Januar unterschreibt und im März angeschlossen wird, bekommt den niedrigeren Satz.`,
    ``,
    `Ein Vorbehalt, der dazugehört: ${eegVerfahrenSatz({ kurz: true })}. Er würde die Vergütung für neue Anlagen grundlegend umstellen. Solange er nicht beschlossen ist, gilt die Regel oben.`,
    ``,
    quellenzeile(k.standIso, true),
  ].join("\n");

  return {
    id: "g6-degression-stichtag",
    titel: "Der nächste Degressionstermin",
    kategorie: "g6",
    kanal: ["linkedin"],
    text,
    bild: {
      stil: KARTEN_STIL_STANDARD,
      art: "kennzahl",
      aussage: `Am ${terminText} sinkt die Einspeisevergütung um ein Prozent`,
      gemessen: `Teileinspeisung, Anlage bis ${de(satz.thresholdKwp)} kW, heute`,
      serien: [
        {
          label: `Cent je eingespeister Kilowattstunde — für zwanzig Jahre festgeschrieben`,
          wert: satz.teilUnder10,
          einheit: "ct",
          stellen: 2,
          hervorgehoben: true,
        },
      ],
      quelle: quellenzeile(k.standIso, false),
    },
    belege: [
      `Satz gültig ab ${satz.validFrom}: Teileinspeisung ${de(satz.teilUnder10, 2)} ct (≤ ${de(satz.thresholdKwp)} kWp)`,
      `Nächster Stichtag ${termin} (§ 49 EEG, 1 % je Halbjahr zum 1.2. und 1.8.)`,
      `Reform-Vorbehalt: ${eegVerfahrenSatz({ kurz: true })}`,
    ],
  };
}

export const ALLE_POSTS = [
  postStadtLand,
  postWachstum,
  postFreiflaeche,
  postSegmente,
  postAufholjagd,
  postUeberEinwohner,
  postKohorte,
  postAnomalie,
  postDegression,
  postAusland,
  postFoerderLuecken,
  postNurBalkon,
  postPrivatdachAnteil,
  postSpeicherJeLand,
] as const;

/**
 * Was der Redaktionstisch je Story gespeichert hat: der umformulierte Text und
 * das gewählte Farbschema. Beides zusammen ist die FASSUNG einer Story — und
 * beides zusammen prüft die Freigabe.
 */
export type GespeicherteFassung = { vorlage?: string; stil?: KartenStil; form?: PostBild["art"] };

/**
 * Alle Posts, mit optional bearbeiteten Fassungen.
 *
 * Nur Posts, die auf Vorlagen umgestellt sind, nehmen einen eigenen Text an. Die
 * übrigen liefern ihren eingebauten — sie sind im Redaktionstisch dann lesbar,
 * aber nicht bearbeitbar, und das steht dort auch so. Das Farbschema dagegen
 * lässt sich an jeder Story stellen; es hängt nicht am Text.
 */
export function baueAllePosts(
  k: SocialKennzahlen,
  fassungen: Record<string, GespeicherteFassung> = {},
  // Der Tag wird HEREINGEREICHT, nie aus der Uhr einer Rechenfunktion gezogen —
  // sonst lässt sich ein Stichtags-Beitrag nicht gegen einen Stichtag prüfen.
  // Nur dieser Rand darf die Uhr lesen.
  heuteIso: string = new Date().toISOString().slice(0, 10),
): SocialPost[] {
  return ALLE_POSTS.map((f) => {
    const roh = f(k, undefined, heuteIso);
    const fassung = fassungen[roh.id];
    const post =
      f.length > 1
        ? (f as (k: SocialKennzahlen, v?: string, h?: string) => SocialPost)(k, fassung?.vorlage, heuteIso)
        : roh;
    // Ein unbekannter Stil aus der Ablage fällt auf den Standard zurück, statt
    // die Karte ungefärbt zu lassen: Ein Wert, den wir nicht mehr kennen, ist
    // ein Fund für den Code, kein Grund für ein kaputtes Bild.
    if (post.bild && istKartenStil(fassung?.stil)) {
      post.bild = { ...post.bild, stil: fassung!.stil! };
    }
    // Eine gewählte Bildform gilt nur, wenn sie für dieses Bild überhaupt trägt.
    // Ändern sich die Daten so, dass sie es nicht mehr tut — eine dritte Serie,
    // ein weggefallenes Ganzes —, fällt die Story auf ihre eingebaute Form
    // zurück, statt eine Aussage zu zeigen, die das Bild nicht hergibt.
    if (post.bild && fassung?.form && formenFuer(post.bild).includes(fassung.form)) {
      post.bild = { ...post.bild, art: fassung.form };
    }
    return post;
  });
}
