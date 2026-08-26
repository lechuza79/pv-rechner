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

export type SocialPost = {
  id: string;
  /** Interne Bezeichnung für die Vorschau, nicht Teil des Beitrags. */
  titel: string;
  kanal: ("linkedin" | "instagram")[];
  text: string;
  bild: PostBild | null;
  /** Was ein Prüfer nachrechnen können muss. Erscheint nur in der Vorschau. */
  belege: string[];
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
  // Stadtstaaten namentlich, nicht als „die letzten der Liste". Der Satz hieß
  // zuerst „bei den Stadtstaaten … Hamburg, Berlin. Niedersachsen kommt auf …"
  // und machte Niedersachsen damit zum Stadtstaat — die Aussage stimmte nur,
  // solange die Sortierung zufällig passte.
  const stadtstaatNamen = ["Berlin", "Hamburg", "Bremen"];
  const stadtstaaten = sortiert.filter((l) => stadtstaatNamen.includes(l.name));
  const flaechenlaender = sortiert.filter((l) => !stadtstaatNamen.includes(l.name));
  const spitze = flaechenlaender[0] ?? sortiert[0];

  // Die ersten zwei Zeilen sind alles, was der Feed vor „mehr anzeigen" zeigt.
  // Hier stand zuerst die Prämisse und die Pointe kam danach — im
  // Redaktionstisch sofort sichtbar geworden, sobald die Vorschau die richtige
  // Reihenfolge hatte. Jetzt: Widerspruch zuerst, Herleitung danach.
  const text = [
    `In deutschen Großstädten stehen nur halb so viele Balkonkraftwerke wie in kleinen Gemeinden. Bei einem Gerät, das als Lösung für Mieter in der Stadt gilt.`,
    ``,
    `Die Anmeldedaten: In den ${de(s.stadtAnzahl)} deutschen Städten über ${de(s.stadtAb / 1000)}.000 Einwohnern kommen ${de(s.stadtJeTausend, 1)} Steckersolargeräte auf 1.000 Einwohner. In den gut ${de(Math.round(s.landAnzahl / 1000))}.000 Gemeinden unter ${de(s.landUnter / 1000)}.000 Einwohnern sind es ${de(s.landJeTausend, 1)}. Also ${staerker ? `${de(faktor, 1)}-mal so viele` : `weniger`} — und zwar dort, wo die meisten Leute ohnehin ein eigenes Dach hätten.`,
    ``,
    `Am deutlichsten in den Stadtstaaten: ${stadtstaaten.map((l) => `${l.name} ${de(l.balkonJeTausend, 1)}`).join(", ")}. Unter den Flächenländern führt ${spitze.name} mit ${de(spitze.balkonJeTausend, 1)}.`,
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
    quellenzeile(k.standIso),
  ].join("\n");

  return {
    id: "wachstum-balkon-solar",
    titel: "Wo der Zubau wirklich stattfindet",
    kanal: ["linkedin", "instagram"],
    text,
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
