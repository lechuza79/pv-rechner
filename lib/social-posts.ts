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
import type { KategorieSchluessel } from "./redaktions-kategorien";
import { KARTEN_STIL_STANDARD, istKartenStil, type KartenStil } from "./social-karten-stil";
import { fuelle, type PlatzhalterInfo } from "./social-vorlage";

/** Zahlenbasis eines Posts. Kommt aus der Datenbank, wird hereingereicht. */
export type SocialKennzahlen = {
  /** Datenstand des Anlagenregisters (ISO-Datum). */
  standIso: string;
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
  laender: {
    name: string;
    balkonJeTausend: number;
    wpProKopf: number;
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
   * "saeule" ist der Vergleich für genau zwei Werte OHNE Ganzes: eine Säule, in
   * der der kleinere Wert als Sockel steckt und der größere ihn überragt. Der
   * Unterschied ist dann die überragende Fläche selbst — man muss keine zwei
   * Längen nebeneinander abschätzen und nichts über eine Grundmenge annehmen,
   * die es nicht gibt.
   */
  art: "vergleich" | "kennzahl" | "donut" | "saeule";
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
function quellenzeile(standIso: string, mitMarke: boolean): string {
  const d = new Date(standIso);
  const datum = d.toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" });
  const basis = `Marktstammdatenregister (Bundesnetzagentur), Stand ${datum}. Eigene Berechnung`;
  return mitMarke ? `${basis}, ${MARKE}.` : `${basis}.`;
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
    id: "stadt-land-balkon",
    vorlage,
    platzhalter,
    titel: "Das Balkonkraftwerk ist kein Stadtthema",
    kategorie: "kontrast",
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
        `Der Grund liegt vermutlich nicht am Gerät, sondern an der Aufstellung: Ein Balkonkraftwerk braucht keine Genehmigung und keinen Handwerker, aber jemanden, der es anbringt und anmeldet. Auf einer Terrasse oder im Garten ist das einfacher als an einem Mietbalkon, der nach Norden zeigt.`,
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

  // Aussage in die ersten zwei Zeilen, siehe postStadtLand.
  const text = [
    `Balkonkraftwerke wachsen ${de(balkonProzent / solarProzent, 1)}-mal so schnell wie Deutschlands Solarleistung insgesamt. ${de(Math.round(zuwachs / 1000))}.000 neue in zwölf Monaten.`,
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
    id: "wachstum-balkon-solar",
    titel: "Wo der Zubau wirklich stattfindet",
    kategorie: "bewegung",
    kanal: ["linkedin", "instagram"],
    text,
    bild: {
      stil: KARTEN_STIL_STANDARD,
      art: "kennzahl",
      aussage: `Balkonkraftwerke wachsen ${de(balkonProzent / solarProzent, 1)}-mal so schnell wie die Solarleistung`,
      gemessen: `Veränderung in zwölf Monaten`,
      // Zwei Prozentbalken nebeneinander sagen im Bild nichts: Die Länge
      // vergleicht dann zwei Veränderungen, nicht zwei Größen. Gezeigt wird
      // deshalb der Bestand vorher und nachher; die Rate steht in der Aussage.
      serien: [
        {
          label: `neue Balkonkraftwerke in zwölf Monaten — von ${de(w.balkonVorJahr / 1_000_000, 2)} auf ${de(w.balkonJetzt / 1_000_000, 2)} Millionen`,
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
        `Deutschlands installierte Solarleistung ist in zwölf Monaten um ${de(solarProzent, 0)} Prozent gewachsen, auf ${gwp(w.solarKwpJetzt)} Gigawatt. Die Zahl der angemeldeten Steckersolargeräte im selben Zeitraum um ${de(balkonProzent, 0)} Prozent, von ${de(w.balkonVorJahr / 1_000_000, 2)} auf ${de(w.balkonJetzt / 1_000_000, 2)} Millionen.`,
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
    id: "freiflaeche-ost-west",
    titel: "Der Osten baut auf Feldern, der Westen auf Dächern",
    kategorie: "kontrast",
    kanal: ["linkedin"],
    text,
    bild: {
      stil: KARTEN_STIL_STANDARD,
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
    id: "segmente-anteile",
    titel: "Die Energiewende liegt nicht auf Privatdächern",
    kategorie: "aufteilung",
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
    id: "aufholjagd-fuenf-jahre",
    titel: "Die Städte holen auf",
    kategorie: "bewegung",
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
    id: "mehr-kwp-als-einwohner",
    titel: "Zwei von drei Gemeinden haben mehr Kilowatt als Einwohner",
    kategorie: "groessenordnung",
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

export const ALLE_POSTS = [
  postStadtLand,
  postWachstum,
  postFreiflaeche,
  postSegmente,
  postAufholjagd,
  postUeberEinwohner,
] as const;

/**
 * Was der Redaktionstisch je Story gespeichert hat: der umformulierte Text und
 * das gewählte Farbschema. Beides zusammen ist die FASSUNG einer Story — und
 * beides zusammen prüft die Freigabe.
 */
export type GespeicherteFassung = { vorlage?: string; stil?: KartenStil };

/**
 * Alle Posts, mit optional bearbeiteten Fassungen.
 *
 * Nur Posts, die auf Vorlagen umgestellt sind, nehmen einen eigenen Text an. Die
 * übrigen liefern ihren eingebauten — sie sind im Redaktionstisch dann lesbar,
 * aber nicht bearbeitbar, und das steht dort auch so. Das Farbschema dagegen
 * lässt sich an jeder Story stellen; es hängt nicht am Text.
 */
export function baueAllePosts(k: SocialKennzahlen, fassungen: Record<string, GespeicherteFassung> = {}): SocialPost[] {
  return ALLE_POSTS.map((f) => {
    const roh = f(k);
    const fassung = fassungen[roh.id];
    const post =
      f.length > 1 ? (f as (k: SocialKennzahlen, v?: string) => SocialPost)(k, fassung?.vorlage) : roh;
    // Ein unbekannter Stil aus der Ablage fällt auf den Standard zurück, statt
    // die Karte ungefärbt zu lassen: Ein Wert, den wir nicht mehr kennen, ist
    // ein Fund für den Code, kein Grund für ein kaputtes Bild.
    if (post.bild && istKartenStil(fassung?.stil)) {
      post.bild = { ...post.bild, stil: fassung!.stil! };
    }
    return post;
  });
}
