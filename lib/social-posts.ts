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

/** Zahlenbasis eines Posts. Kommt aus der Datenbank, wird hereingereicht. */
export type SocialKennzahlen = {
  /** Datenstand des Anlagenregisters (ISO-Datum). */
  standIso: string;
  /**
   * Das Jahr, dessen 31.12. die Vergleichsbasis von `wachstum` ist.
   *
   * Ohne dieses Feld war der Zeitraum nicht benennbar, und der Post nannte ihn
   * „zwölf Monate" — bei einem Datenstand im August waren es sieben. Das
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
  laender: { name: string; balkonJeTausend: number; wpProKopf: number }[];
};

export type BildSerie = {
  label: string;
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
   */
  art: "vergleich" | "kennzahl";
  /** Die Kernaussage, im Bild als Titel gesetzt — nicht die neutrale Achsenbeschriftung. */
  aussage: string;
  /** Was gemessen wurde. Steht klein unter der Aussage. */
  gemessen: string;
  serien: BildSerie[];
  /** Pflicht: Lizenz der Quelle. Reist im Bild mit, weil der Beitragstext das nicht tut. */
  quelle: string;
};

/**
 * Dieselbe Aussage für die eigene Seite.
 *
 * Der Feed-Text ist in der ersten Person geschrieben und endet mit einer
 * Quellenzeile, weil dort nichts mitreist. Auf einer Seite wäre beides falsch:
 * Die Quelle steht dort einmal zentral, und ein „Ich finde" gehört nicht in
 * einen Abschnitt, der eine Frage beantwortet. Was NICHT zweimal existieren
 * darf, sind die Zahlen — deshalb entstehen beide Fassungen aus derselben
 * Berechnung und nicht aus zwei Texten.
 */
export type PostOnsite = {
  ueberschrift: string;
  absaetze: string[];
};

export type SocialPost = {
  id: string;
  /** Interne Bezeichnung für die Vorschau, nicht Teil des Beitrags. */
  titel: string;
  kanal: ("linkedin" | "instagram")[];
  text: string;
  /** Fassung für die eigene Seite — dieselben Zahlen, andere Stimme. */
  onsite: PostOnsite;
  bild: PostBild | null;
  /** Was ein Prüfer nachrechnen können muss. Erscheint nur in der Vorschau. */
  belege: string[];
};

const de = (n: number, stellen = 0) =>
  n.toLocaleString("de-DE", { minimumFractionDigits: stellen, maximumFractionDigits: stellen });

/**
 * Die drei Stadtstaaten. Nur zum Prüfen einer Aussage über sie — nicht als
 * Auswahl: Wer die Namen in einen Satz tippt, behauptet ihre Reihenfolge.
 */
const STADTSTAATEN = ["Berlin", "Hamburg", "Bremen"];

/**
 * Stehen wirklich die drei Stadtstaaten am Ende der Rangliste?
 *
 * Der Satz „bei den Stadtstaaten wird es noch deutlicher" stand hier als
 * Behauptung, während der Code nur die zwei letzten Plätze holte — welche
 * Länder das sind, war ihm gleich. Am 26.08.2026 stimmte es zufällig (Hamburg,
 * Berlin, Bremen belegen die letzten drei Plätze); an dem Tag, an dem ein
 * Flächenland durchsackt, wäre daraus eine Falschaussage geworden, ohne dass
 * sich eine Zahl sichtbar bewegt hätte. Jetzt entscheidet die Messung, ob der
 * Satz mit Gruppennamen erscheint oder nur mit den gemessenen Namen.
 */
function stadtstaatenAmEnde(sortiert: { name: string }[]): boolean {
  if (!STADTSTAATEN.every((n) => sortiert.some((l) => l.name === n))) return false;
  const letzteDrei = sortiert.slice(-3).map((l) => l.name);
  return STADTSTAATEN.every((n) => letzteDrei.includes(n));
}

function quellenzeile(standIso: string): string {
  const d = new Date(standIso);
  const datum = d.toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" });
  return `Marktstammdatenregister (Bundesnetzagentur), Stand ${datum}. Eigene Berechnung.`;
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
export function postStadtLand(k: SocialKennzahlen): SocialPost {
  const s = k.stadtLand;
  const faktor = s.landJeTausend / s.stadtJeTausend;
  const staerker = faktor >= 1;
  const sortiert = [...k.laender].sort((a, b) => b.balkonJeTausend - a.balkonJeTausend);
  const spitze = sortiert[0];
  const schluss = sortiert[sortiert.length - 1];
  // Das untere Ende wird aufgezählt, nicht zusammengefasst: Sobald ein
  // Gruppenname fällt („die Stadtstaaten"), muss die Gruppe auch vollständig
  // dastehen — sonst behauptet der Satz mehr, als er zeigt.
  const unten = sortiert.slice(-3).reverse();
  const untenText = unten
    .map((l) => `${l.name} mit ${de(l.balkonJeTausend, 1)}`)
    .join(", ")
    .replace(/, ([^,]*)$/, " und $1");
  const schlussSatz = stadtstaatenAmEnde(sortiert)
    ? `Die letzten drei Plätze belegen die Stadtstaaten:`
    : `Am unteren Ende stehen`;

  const text = [
    `Das Balkonkraftwerk gilt als Lösung für Mieter in der Stadt. Kleine Wohnung, kein eigenes Dach, 800 Watt am Geländer.`,
    ``,
    `Die Anmeldedaten sagen etwas anderes.`,
    ``,
    `In den ${de(s.stadtAnzahl)} deutschen Städten über ${de(s.stadtAb / 1000)}.000 Einwohnern kommen ${de(s.stadtJeTausend, 1)} Steckersolargeräte auf 1.000 Einwohner. In den gut ${de(Math.round(s.landAnzahl / 1000))}.000 Gemeinden unter ${de(s.landUnter / 1000)}.000 Einwohnern sind es ${de(s.landJeTausend, 1)}. Also ${staerker ? `${de(faktor, 1)}-mal so viele` : `weniger`} — und zwar dort, wo die meisten Leute ohnehin ein eigenes Dach hätten.`,
    ``,
    `${schlussSatz} ${untenText}. ${spitze.name} kommt auf ${de(spitze.balkonJeTausend, 1)}.`,
    ``,
    `Warum das plausibel ist, wenn man kurz nachdenkt: Ein Balkonkraftwerk braucht keine Baugenehmigung und keinen Handwerker, aber es braucht jemanden, der es aufstellt und anmeldet. Im Reihenhaus mit Garten ist beides einfacher als im vierten Stock einer Mietwohnung, deren Balkon nach Norden zeigt.`,
    ``,
    quellenzeile(k.standIso),
  ].join("\n");

  return {
    id: "stadt-land-balkon",
    titel: "Das Balkonkraftwerk ist kein Stadtthema",
    kanal: ["linkedin", "instagram"],
    text,
    onsite: {
      ueberschrift: "Balkonkraftwerke stehen nicht dort, wo man sie vermutet",
      absaetze: [
        `Das Balkonkraftwerk gilt als Lösung für Mieter in der Stadt: kleine Wohnung, kein eigenes Dach, 800 Watt am Geländer. Die Anmeldedaten zeigen das Gegenteil.`,
        `In den ${de(s.stadtAnzahl)} Städten über ${de(s.stadtAb / 1000)}.000 Einwohnern kommen ${de(s.stadtJeTausend, 1)} Steckersolargeräte auf 1.000 Einwohner, in den gut ${de(Math.round(s.landAnzahl / 1000))}.000 Gemeinden unter ${de(s.landUnter / 1000)}.000 Einwohnern sind es ${de(s.landJeTausend, 1)} — ${staerker ? `das ${de(faktor, 1)}-Fache` : `weniger`}. ${schlussSatz} ${untenText} je 1.000 Einwohner; an der Spitze steht ${spitze.name} mit ${de(spitze.balkonJeTausend, 1)}.`,
        `Plausibel wird das, wenn man sich den Aufbau vorstellt: Ein Balkonkraftwerk braucht keine Baugenehmigung und keinen Handwerker, aber jemanden, der es aufstellt, ausrichtet und anmeldet — und in der Mietwohnung zusätzlich das Einverständnis des Vermieters. Im Reihenhaus mit Garten fällt beides weg.`,
      ],
    },
    bild: {
      art: "vergleich",
      aussage: staerker
        ? `Balkonkraftwerke stehen auf dem Land, nicht in der Stadt`
        : `Balkonkraftwerke stehen in der Stadt, nicht auf dem Land`,
      gemessen: `Angemeldete Steckersolargeräte je 1.000 Einwohner`,
      serien: [
        {
          label: `Städte über ${de(s.stadtAb / 1000)}.000 Einwohner`,
          wert: s.stadtJeTausend,
          einheit: "je 1.000 Ew.",
          stellen: 1,
        },
        {
          label: `Gemeinden unter ${de(s.landUnter / 1000)}.000 Einwohner`,
          wert: s.landJeTausend,
          einheit: "je 1.000 Ew.",
          stellen: 1,
          hervorgehoben: true,
        },
      ],
      quelle: quellenzeile(k.standIso),
    },
    belege: [
      `Städte ab ${de(s.stadtAb)} Einwohnern: ${de(s.stadtAnzahl)} Gemeinden, ${de(s.stadtJeTausend, 1)} je 1.000 Einwohner`,
      `Gemeinden unter ${de(s.landUnter)}: ${de(s.landAnzahl)}, ${de(s.landJeTausend, 1)} je 1.000 Einwohner`,
      `Faktor ${de(faktor, 2)}`,
      `Spitze ${spitze.name} ${de(spitze.balkonJeTausend, 1)} · Schlusslicht ${schluss.name} ${de(schluss.balkonJeTausend, 1)}`,
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
  // Der Zeitraum wird aus den Daten benannt, nicht behauptet: Vergleichsbasis
  // ist der Jahresendbestand, der Abstand zum Datenstand also so lang, wie das
  // laufende Jahr alt ist. Bis zum 26.08.2026 stand hier „in den letzten zwölf
  // Monaten" — bei einem Datenstand vom 5. August waren es sieben.
  const zeitraum = zeitraumSeitStichtag(k.standIso, k.stichtagJahr);

  const text = [
    `Deutschlands Solarleistung ist ${zeitraum} um ${de(solarProzent, 0)} Prozent gewachsen. Auf jetzt ${gwp(w.solarKwpJetzt)} Gigawatt.`,
    ``,
    `Die Zahl der Balkonkraftwerke im selben Zeitraum: plus ${de(balkonProzent, 0)} Prozent. Von ${de(w.balkonVorJahr / 1_000_000, 2)} auf ${de(w.balkonJetzt / 1_000_000, 2)} Millionen.`,
    ``,
    `Leistungsmäßig ist das eine Randnotiz. Aber als Zahl der Menschen, die zum ersten Mal selbst Strom erzeugen, ist es die interessantere Größe: ${de(Math.round(zuwachs / 1000))}.000 Haushalte, ohne Handwerker, ohne Kredit, ohne Genehmigung.`,
    ``,
    `Ich finde die zweite Zahl aussagekräftiger als die erste, auch wenn sie in keiner Ausbaustatistik auftaucht.`,
    ``,
    quellenzeile(k.standIso),
  ].join("\n");

  return {
    id: "wachstum-balkon-solar",
    titel: "Wo der Zubau wirklich stattfindet",
    kanal: ["linkedin", "instagram"],
    text,
    onsite: {
      ueberschrift: "Wie schnell der Bestand wächst",
      absaetze: [
        `Die installierte Solarleistung ist ${zeitraum} um ${de(solarProzent, 0)} Prozent gewachsen, auf ${fmtPvLeistung(w.solarKwpJetzt)}. Die Zahl der Balkonkraftwerke ist im selben Zeitraum um ${de(balkonProzent, 0)} Prozent gestiegen, von ${de(w.balkonVorJahr / 1_000_000, 2)} auf ${de(w.balkonJetzt / 1_000_000, 2)} Millionen.`,
        `Leistungsmäßig bleibt der zweite Wert eine Randnotiz — wie klein der Beitrag ist, zeigt die Aufteilung nach Segmenten weiter oben. Als Zahl der Haushalte, die zum ersten Mal selbst Strom erzeugen, ist er die aussagekräftigere Größe: ${de(Math.round(zuwachs / 1000))}.000 kamen ${zeitraum} dazu.`,
        `Beide Werte beziehen sich auf den Bestand am 31. Dezember ${k.stichtagJahr}. Das Register führt je Anlage nur das Jahr der Inbetriebnahme — ein Bestand vor genau zwölf Monaten lässt sich daraus nicht ableiten, ein Jahresendbestand schon.`,
      ],
    },
    bild: {
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
      quelle: quellenzeile(k.standIso),
    },
    belege: [
      `Solar ${fmtPvLeistung(w.solarKwpJetzt)} gegen ${fmtPvLeistung(w.solarKwpVorJahr)} (+${de(solarProzent, 1)} %)`,
      `Balkon ${de(w.balkonJetzt)} gegen ${de(w.balkonVorJahr)} (+${de(balkonProzent, 1)} %), Zuwachs ${de(zuwachs)}`,
    ],
  };
}

export const ALLE_POSTS = [postStadtLand, postWachstum] as const;

export function baueAllePosts(k: SocialKennzahlen): SocialPost[] {
  return ALLE_POSTS.map((f) => f(k));
}
