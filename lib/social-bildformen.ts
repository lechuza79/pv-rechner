// Die ausgearbeiteten Bildformen — Vorlage und Regelwerk an einer Stelle.
//
// Vorher lagen beide Hälften getrennt: die Namen in einer Tabelle, die Regeln in
// einer Verzweigung, die Begründungen verteilt in Kommentaren und Tests. Wer eine
// Form ergänzt, musste an drei Orte — und die Regel, die niemand findet, wird
// beim vierten Mal nicht mehr befolgt.
//
// Was ein Eintrag beantwortet: Wie heißt die Form, wofür ist sie gedacht, und
// unter welcher Bedingung TRÄGT sie. Die Bedingung ist der Kern: Eine Form, die
// wählbar ist, wählt irgendwann jemand, und dann steht im Bild eine Aussage, die
// die Zahlen nicht hergeben.

import type { KartenStil } from "./social-karten-stil";
import type { PostBild } from "./social-posts";

export type Bildform = {
  art: PostBild["art"];
  name: string;
  /**
   * Der Name, unter dem man diese Form ansprechen kann — zusammen mit dem
   * Farbschema die Kennung einer Variante („rangliste-highlight").
   *
   * AUSDRÜCKLICH GEFÜHRT und nicht aus `name` abgeleitet: Sonst wandert die
   * Kennung mit jeder Umbenennung, und ein Verweis von gestern zeigt ins Leere
   * oder — schlimmer — auf etwas anderes. Dieselbe Überlegung wie bei der
   * Kennung eines Beitrags, in die Template und Farbschema deshalb NICHT
   * hineindürfen.
   *
   * Sie weicht bewusst von `art` ab, wo die technische Bezeichnung nicht das
   * ist, was auf dem Bild steht: „vergleich" heißt in der Ansicht „Balken",
   * „donut" heißt „Ringpaar". Eine Kennung, die man tippt, muss zu dem passen,
   * was man sieht.
   */
  kennung: string;
  /** Ein Satz: wofür die Form gedacht ist und woran sie scheitert. */
  wofuer: string;
  /** Trägt die Form für dieses Bild? */
  passt: (bild: PostBild) => boolean;
};

const zwei = (b: PostBild) => b.serien.length === 2;
const hatGanzes = (b: PostBild) => b.ganzes != null;
const alleMitUmriss = (b: PostBild) => b.serien.length > 0 && b.serien.every((s) => !!s.umriss);

/**
 * Ab welcher Enge eine Rangliste nichts mehr zeigt.
 *
 * Die Regel „ein Balkenpaar taugt nur, wenn die Längen auseinandergehen" gilt
 * bei sechzehn Werten genauso — nur fällt der Verstoß dort NICHT auf: Zwei fast
 * gleich lange Balken sieht man, sechzehn liest man als Liste und hält sie für
 * eine Aussage. Deshalb steht die Bedingung hier als Zahl statt als Prosa.
 *
 * Gemessen an den fünf Länderreihen des Bestands (nach Abzug des Nullpunkts,
 * kleinster Wert als Anteil des größten): Freiflächenanteil 1 %, Privatdach 18 %,
 * Fünf-Jahres-Wachstum 22 %, Balkonquote 26 %, Heimspeicher 58 %. Die Schwelle
 * trennt die vier tragenden vom Speicher-Fall — dort stünden sechzehn Balken
 * zwischen 58 und 100 Prozent Länge, und der Unterschied zwischen dem ersten und
 * dem letzten Land verschwindet optisch, obwohl der Beitrag ihn behauptet.
 *
 * Wer sie verschiebt, misst nach: `npm run social:zahlen` legt die echten
 * Verteilungen ab.
 */
export const RANGLISTE_MAX_ENGE = 0.4;

/**
 * Zählt diese Reihe ab null?
 *
 * Nur dann lassen sich ihre Werte als Länge neben ihrer Zahl zeigen. Die
 * Begründung steht am Feld `nullpunkt` — kurz: Ein Balken ab 1 neben einer Zahl
 * ab 0 sind zwei Skalen in einem Bild, und der Leser sieht nur eine.
 */
const abNull = (b: PostBild) => (b.nullpunkt ?? 0) === 0;

/**
 * Wie eng eine Reihe beisammenliegt — kleinster Wert als Anteil des größten.
 * 0 heißt maximal gespreizt, 1 heißt: alle Balken gleich lang.
 */
export function reihenEnge(b: PostBild): number {
  const werte = (b.reihe ?? []).map((s) => Math.abs(s.wert));
  if (werte.length < 2) return 1;
  const max = Math.max(...werte);
  if (max <= 0) return 1;
  return Math.max(0, Math.min(...werte)) / max;
}

/**
 * Zeigen zwei VERSCHIEDENE Werte dieselbe Zahl, wenn man so rundet?
 *
 * Die Regel gilt in jedem Bild mit mehr als einem Wert, nicht nur in einer
 * Reihe: Zwei Balken verschiedener Länge mit derselben Zahl daneben lesen sich
 * als Fehler in der Grafik, und im Zweifel glaubt man dem Balken. Vorkommen im
 * Bestand: Gewerbedach 35,04 und Freifläche 35,25 standen als zweimal „35",
 * Schleswig-Holstein 50,2 und Sachsen 50,0 als zweimal „50".
 *
 * Ausdrücklich nur bei VERSCHIEDENEN Werten. Zwei Länder, die wirklich gleich
 * stehen, dürfen dieselbe Zahl tragen — das ist dann keine verlorene
 * Unterscheidung, sondern die Auskunft.
 */
export function kollidiert(werte: number[], stellen: number): boolean {
  const gezeigt = werte.map((w) => Math.abs(w).toFixed(stellen));
  for (let i = 0; i < werte.length; i++) {
    for (let j = i + 1; j < werte.length; j++) {
      if (Math.abs(werte[i]) !== Math.abs(werte[j]) && gezeigt[i] === gezeigt[j]) return true;
    }
  }
  return false;
}

/** Fällt ein Wert, der nicht null ist, bei dieser Rundung auf null? */
export function verschwindet(werte: number[], stellen: number): boolean {
  return werte.some((w) => Math.abs(w) > 0 && Number(Math.abs(w).toFixed(stellen)) === 0);
}

/**
 * Mit wie vielen Nachkommastellen eine Rangliste ihre Werte zeigt.
 *
 * Bei zwei Werten genügt die Angabe an der Serie. Bei sechzehn nicht mehr, und
 * beide Fälle zeigten sich erst am gerenderten Bild:
 *
 * — Eine Null, die keine ist. Der Freiflächenanteil trägt `stellen: 0`; Berlin
 *   und Hamburg standen damit als „0 %" da (tatsächlich 0,4) neben einem Balken,
 *   der sichtbar nicht null war. Das ist keine Rundung, sondern eine falsche
 *   Angabe im Bild.
 * — Eine Ordnung, die verschwindet. Schleswig-Holstein (50,2) und Sachsen (50,0)
 *   standen untereinander mit derselben Zahl. In einer Rangliste ist die
 *   Reihenfolge die Aussage; zwei Ränge, die man nicht unterscheiden kann,
 *   nehmen ihr genau das.
 *
 * Höchstens EINE Stelle mehr als die Serie. Wer danach immer noch Dubletten hat,
 * hat Werte, die praktisch gleich sind — und dafür ist eine dritte Ziffer keine
 * Auskunft, sondern nur Aufwand.
 */
export function ranglistenStellen(b: PostBild): number {
  const basis = b.serien[0]?.stellen ?? 0;
  const werte = (b.reihe ?? []).map((s) => Math.abs(s.wert));
  if (werte.length === 0) return basis;
  return verschwindet(werte, basis) || kollidiert(werte, basis) ? basis + 1 : basis;
}

/**
 * Mit wie vielen Nachkommastellen eine Aufteilung ihre Teile zeigt.
 *
 * Dieselbe Klasse wie bei der Rangliste, anderes Kriterium: Hier müssen die
 * gezeigten Zahlen sich zum Ganzen addieren. Am Bild aufgefallen — die drei
 * Solarsegmente plus Rest standen als 35 + 35 + 28 + 1 in der Legende, das sind
 * 99. Der Balken daneben war voll. Eine Aufteilung, deren Teile nicht aufgehen,
 * widerlegt sich selbst, und zwar auf der Fläche, die weitergeteilt wird.
 *
 * Mit einer Stelle: 35,3 + 35,0 + 28,5 + 1,2 = 100,0.
 */
export function aufteilungsStellen(b: PostBild): number {
  const basis = b.serien[0]?.stellen ?? 0;
  const ganzes = b.ganzes ?? 100;
  const teile = [...b.serien.map((s) => Math.abs(s.wert)), restVon(b)].filter((w) => w > 0);
  const gehtAuf = (stellen: number) => {
    const summe = teile.reduce((s, w) => s + Number(w.toFixed(stellen)), 0);
    return Math.abs(summe - ganzes) < Math.pow(10, -stellen) / 2;
  };
  // Zwei Bedingungen, und die zweite hätte gefehlt: Eine Aufteilung, deren Teile
  // sich zwar zum Ganzen addieren, in der aber zwei verschieden große Segmente
  // dieselbe Zahl tragen, ist genauso kaputt — 50,1 und 49,9 ergeben als „50"
  // und „50" hundert und behaupten zwei gleiche Hälften. Aufgefallen ist die
  // Lücke einer parallelen Sitzung an genau diesem Beitrag, eine Fassung bevor
  // ich sie zufällig mit der Nachkommastelle geschlossen hatte.
  const taugt = (stellen: number) =>
    gehtAuf(stellen) && !kollidiert(teile, stellen) && !verschwindet(teile, stellen);
  if (taugt(basis)) return basis;
  // Geht es auch mit einer Stelle mehr nicht auf, liegt es nicht an der Rundung —
  // dann sind die Teile schlicht keine Aufteilung, und `schoepftAus` weist die
  // Form ab.
  return basis + 1;
}

/** Was bei einer Aufteilung zum Ganzen fehlt. */
export function restVon(b: PostBild): number {
  const ganzes = b.ganzes ?? 100;
  return Math.max(0, ganzes - b.serien.reduce((s, x) => s + Math.abs(x.wert), 0));
}

/** Summe der Serien — für die Frage, ob sie ein Ganzes ausschöpfen. */
const serienSumme = (b: PostBild) => b.serien.reduce((s, x) => s + Math.abs(x.wert), 0);

/**
 * Schöpfen die Serien das Ganze aus — und ist der Rest benannt, falls nicht?
 *
 * Das ist die Bedingung, die eine Aufteilung von zwei beliebigen Anteilen am
 * selben Ganzen trennt. Bei den Förder-Lücken sind es 21 und 20 Prozent
 * derselben Programmmenge; sie überlappen einander und ergänzen sich nicht.
 * Gestapelt gezeichnet behauptete das Bild, zusammen ergäben sie 41 Prozent
 * eines Ganzen — eine Aussage, die die Zahlen nicht hergeben.
 */
function schoepftAus(b: PostBild): boolean {
  const ganzes = b.ganzes;
  if (ganzes == null || ganzes <= 0) return false;
  const summe = serienSumme(b);
  // Über dem Ganzen liegen heißt: Es sind keine Teile einer Aufteilung.
  if (summe > ganzes * 1.001) return false;
  // Bleibt ein Rest, muss er einen Namen haben. Eine namenlose Lücke im Bild
  // ist eine Behauptung über etwas, das niemand benennen kann.
  if (summe < ganzes * 0.999) return !!b.restLabel;
  return true;
}

export const BILDFORMEN: Bildform[] = [
  {
    art: "vergleich",
    name: "Balken",
    kennung: "balken",
    wofuer:
      "Zwei bis drei Werte als Längen nebeneinander. Trägt nur, wenn die Längen wirklich auseinandergehen — zwei fast gleich lange Balken zeigen nichts — und wenn die Werte ab null zählen.",
    passt: (b) => abNull(b),
  },
  {
    art: "kennzahl",
    name: "Einzelkennzahl",
    kennung: "einzelkennzahl",
    wofuer:
      "Eine Zahl groß, mit einer Kontextzeile darunter. Für Fälle, in denen ein Vergleich nichts zeigt, weil die Werte zu nah beieinanderliegen.",
    passt: () => true,
  },
  {
    art: "donut",
    name: "Ringpaar",
    kennung: "ringpaar",
    wofuer:
      "Zwei ANTEILE als konzentrische Ringe. Nur mit einem Ganzen: Ohne eines behauptet der leere Rest etwas, das es nicht gibt.",
    passt: (b) => zwei(b) && hatGanzes(b),
  },
  {
    art: "umriss",
    name: "Gefüllte Umrisse",
    kennung: "umrisse",
    wofuer:
      "Landesumrisse, anteilig von unten gefüllt. Braucht ein Ganzes und einen Umriss je Wert — die Form behauptet ein Gefäß, das sich füllt.",
    passt: (b) => hatGanzes(b) && alleMitUmriss(b),
  },
  {
    art: "saeule",
    name: "Säule",
    kennung: "saeule",
    wofuer:
      "Zwei Werte als EINE Säule, der kleinere als Sockel darin. Für Verhältnisse OHNE Ganzes — der Unterschied ist die überragende Fläche selbst.",
    passt: (b) => zwei(b) && !hatGanzes(b),
  },
  {
    art: "rangliste",
    name: "Rangliste",
    kennung: "rangliste",
    wofuer:
      "Die ganze Ordnung als Balkenreihe, statt nur der ersten und letzten. Braucht die vollständige Reihe, Werte ab null und genug Abstand zwischen ihnen — sechzehn fast gleich lange Balken lesen sich als Aussage und sind keine.",
    passt: (b) => (b.reihe?.length ?? 0) >= 3 && abNull(b) && reihenEnge(b) < RANGLISTE_MAX_ENGE,
  },
  {
    art: "aufteilung",
    name: "Aufteilung",
    kennung: "aufteilung",
    wofuer:
      "Drei und mehr Teile eines Ganzen als ein durchgehender Balken. Nur wenn die Teile das Ganze wirklich ausschöpfen — zwei Anteile derselben Menge, die einander überlappen, ergänzen sich nicht und dürfen nicht gestapelt werden.",
    passt: (b) => b.serien.length >= 3 && schoepftAus(b),
  },
  {
    art: "verlauf",
    name: "Verlauf",
    kennung: "verlauf",
    wofuer:
      "Werte über die Zeit als Linien. Für Aussagen über eine Entwicklung — ob ein Abstand wächst oder schrumpft, sieht man an zwei Stichtagen nicht. Braucht eine Zeitachse und je Serie einen Wert dazu.",
    passt: (b) =>
      (b.achse?.length ?? 0) >= 3 &&
      b.serien.length > 0 &&
      b.serien.every((s) => s.verlauf?.length === b.achse!.length),
  },
];

export const BILDFORM_NAME: Record<PostBild["art"], string> = Object.fromEntries(
  BILDFORMEN.map((f) => [f.art, f.name]),
) as Record<PostBild["art"], string>;

/**
 * Die Kennung einer VARIANTE: Bildform × Farbschema, etwa „rangliste-highlight".
 *
 * Sie ist der Name, unter dem eine Variante angesprochen wird — „arbeite an
 * ringpaar-dunkel". Anders als der Template-Name gibt es sie für jede
 * Kombination, nicht nur für die abgenommenen: Man muss über eine Variante reden
 * können, BEVOR sie abgenommen ist, sonst hat gerade das, woran gearbeitet wird,
 * keinen Namen.
 */
export function variantenKennung(art: PostBild["art"], stil: KartenStil): string {
  return `${bildform(art).kennung}-${stil}`;
}

/** Die Variante zu einer Kennung — oder nichts, wenn es sie nicht gibt. */
export function variante(kennung: string): { art: PostBild["art"]; stil: KartenStil } | undefined {
  for (const f of BILDFORMEN) {
    for (const stil of ["hell", "dunkel", "highlight"] as KartenStil[]) {
      if (variantenKennung(f.art, stil) === kennung) return { art: f.art, stil };
    }
  }
  return undefined;
}

export function bildform(art: PostBild["art"]): Bildform {
  const f = BILDFORMEN.find((x) => x.art === art);
  if (!f) throw new Error(`Unbekannte Bildform: ${art}`);
  return f;
}

/** Welche Formen für dieses Bild tragen — in der Reihenfolge des Registers. */
export function moeglicheFormen(bild: PostBild): PostBild["art"][] {
  return BILDFORMEN.filter((f) => f.passt(bild)).map((f) => f.art);
}

/**
 * Die ABGENOMMENEN Templates: Bildform × Farbschema.
 *
 * Das ist die Design-Einheit, an der beliebig viele Beiträge hängen können — und
 * der Grund, warum „gestaltet" kein Häkchen am einzelnen Post ist. Wer ein
 * abgenommenes Template verwendet, hat ein abgenommenes Design; wer eine
 * Kombination benutzt, die noch niemand durchgesehen hat, eben nicht.
 *
 * Ein handgesetztes Flag am Post wäre hier die schlechtere Wahl: Es müsste
 * jemand pflegen, es steht irgendwann auf „fertig" an einer Story, die niemand
 * angesehen hat, und es sagt nichts darüber, WELCHES Design gemeint ist.
 */
export type Template = { art: PostBild["art"]; stil: KartenStil; name: string };

/**
 * OFFEN: das quadratische Story-Visual für die Ortsseiten (05.09.2026).
 *
 * Die Gemeindeseiten rechnen seit dem 05.09.2026 sieben Geschichten je Ort
 * (lib/orts-stories.ts) und geben sie in derselben Form heraus wie ein Fund:
 * Schlagzeile, benannte Werte mit Einheit, Grundlage. Was fehlt, ist das Bild —
 * und es gehört HIERHER, nicht auf die Ortsseite.
 *
 * DREI ANLÄUFE AUF DER SEITE SIND AM SELBEN PUNKT GESCHEITERT, und der Grund
 * ist kein Maßfehler, sondern eine Eigenschaft der Beitrags-Karte:
 *
 *  1. Sie ist FEST 1080 PIXEL breit (`BREITE` in components/social/SocialKarte).
 *     In einen 300 Pixel breiten Teaser skaliert lief sie über und schnitt die
 *     Überschrift ab; die kleine Stufe wiederum lässt Ring und Säule bewusst
 *     weg und fällt auf Balken zurück — womit die Formenwahl wirkungslos wird.
 *  2. Sie ÜBERSCHREIBT die Farb-Tokens mit ihrer eigenen Palette
 *     (`kartenTokens`). Das ist für ein Bild in einem fremden Feed genau
 *     richtig und auf einer Seite mit Tageslicht-Theme falsch: Auf dunklem
 *     Grund stand ein weißer Block.
 *
 * WAS GEBRAUCHT WIRD: eine quadratische Kachel, die (a) eine beliebige Breite
 * annimmt statt einer festen, und (b) ihre Farben aus den Seiten-Tokens nimmt,
 * statt sie zu ersetzen — mit denselben Formen und denselben Regeln. Dieselbe
 * Kachel trägt dann Teaser (klein) und Fenster (groß) auf der Ortsseite und
 * bleibt für den Beitrag das, was sie ist.
 *
 * WAS NICHT GEBRAUCHT WIRD: eine dritte Zeichnung. Auf der Ortsseite stand
 * kurzzeitig eine eigene, mit Seiten-Tokens gezeichnete Fassung — sie war die
 * zweite Wahrheit neben den Templates hier und ist deshalb wieder heraus. Die
 * Ortsseite ist bis dahin ausgeblendet.
 */
export const TEMPLATES: Template[] = [
  { art: "saeule", stil: "hell", name: "Säule hell" },
  { art: "donut", stil: "highlight", name: "Ringpaar Highlight" },
  { art: "donut", stil: "hell", name: "Ringpaar hell" },
  { art: "umriss", stil: "hell", name: "Gefüllte Umrisse hell" },
];

/** Das abgenommene Template dieses Bildes — oder nichts. */
export function templateVon(bild: PostBild): Template | undefined {
  return TEMPLATES.find((t) => t.art === bild.art && t.stil === bild.stil);
}
