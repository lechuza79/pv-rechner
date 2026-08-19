// Einstiegstext der Atlas-Regionsseiten (Deutschland, Bundesländer, Landkreise).
//
// WARUM ES DAS GIBT (18.08.2026): Die Bundesland-Seiten hatten im Hauptteil 114
// Wörter, davon fast alles Kachel-Beschriftung — echte Sätze waren es fünf, und
// die standen auf jeder der 17 Seiten in derselben Form. Das ist der Grund, warum
// die Seiten auf Position 17 bis 66 stehen und warum dort kaum etwas zu erklären
// ist: An 114 Wörtern lässt sich nichts optimieren.
//
// Die Sätze hier erfinden nichts. Sie formulieren aus, was die Seite ohnehin
// geladen hat (Kinder-Regionen mit Rang und Pro-Kopf-Werten, Zubau je Jahr,
// Speicher) — und liefern damit je Region GENUIN andere Fakten statt einer
// Schablone mit ausgetauschten Zahlen. Dasselbe Prinzip wie bei
// lib/gemeinde-highlight.ts, eine Ebene höher.
//
// EINHEITEN kommen ausschließlich aus lib/atlas-format.ts — diese Datei steht
// deshalb im Einheiten-Wächter (lib/__tests__/einheiten-waechter.test.ts).

import { fmtWattProKopf, fmtAnteilProzent, prozentGerundet } from "./atlas-format";

const nf = (n: number) => Math.round(n).toLocaleString("de-DE");

export type RegionKind = {
  name: string;
  /** Dach-Leistung je Einwohner — der faire Bürger-Vergleich (Freifläche raus). */
  wPerCapitaDach: number | null;
  count: number;
  /** Adresse der Unterseite. Fehlt sie, bleibt der Name unverlinkter Text. */
  href?: string | null;
};

/**
 * Ein Textstück des Absatzes — entweder nackter Text oder ein benannter Verweis.
 *
 * WARUM DER ABSATZ NICHT EINFACH EIN STRING IST: Die im Text genannten Gebiete
 * sind Seiten, die es gibt, und ein Verweis mit dem Ortsnamen als Ankertext ist
 * der stärkste interne Hinweis nach der Navigation. Neue Crawl-Wege entstehen
 * dadurch KEINE — die Rangliste weiter unten verlinkt dieselben Gebiete ohnehin
 * alle. Genau deshalb ist es hier gefahrlos: Die Sorge aus dem Juli 2026 (eine
 * indexierte Seite öffnet den Weg in Tausende noindex-Seiten) betrifft neue
 * Pfade, nicht zusätzliche Anker auf bestehende.
 */
export type HighlightTeil =
  | string
  | { text: string; href: string }
  /** Hervorgehobener Wert — dasselbe Textstyling wie im Einstiegsabsatz darüber
   *  (`S.strong`), nicht ein zweites erfinden. */
  | { text: string; stark: true };

export type RegionHighlightInput = {
  /** Ebene der Seite selbst. */
  level: "de" | "bundesland" | "landkreis";
  /** Name der Region — Subjekt des Rangsatzes. */
  name: string;
  /** Gattungswort der Kinder im Plural, z. B. „Kreise", „Gemeinden". */
  kindWort: string;
  /** Die Kinder-Regionen mit ihren Kennzahlen. */
  kinder: RegionKind[];
  /** Rang dieser Region unter ihren Geschwistern (1 = stärkste), Dach je Einwohner. */
  rang?: number | null;
  /** Wie viele Geschwister es insgesamt gibt. */
  rangVon?: number | null;
  /** Name der Vergleichsebene für den Rangsatz, z. B. „Bundesländer". */
  rangGattung?: string | null;
  /** Neu in Betrieb genommene Anlagen je Jahr. */
  byYear?: { year: number; count: number }[];
  lastYear?: number;
  /** Bestand gesamt, für den Anteil des Zubaus. */
  count: number;
};

/**
 * Platz unter den Geschwistern.
 *
 * Der wertvollste Satz der Seite, weil er auf jeder Seite einen anderen Inhalt
 * hat und nirgends sonst steht. Bewusst mit der Dach-Leistung je Einwohner:
 * Absolute Zahlen messen die Größe des Gebiets, nicht seinen Ausbau, und
 * Freiflächen-Parks vergiften den Pro-Kopf-Wert kleiner Gebiete.
 */
function rangSatz(i: RegionHighlightInput): string | null {
  if (!i.rang || !i.rangVon || !i.rangGattung || !i.name) return null;
  if (i.rangVon < 3) return null; // ein Rang unter zweien sagt nichts
  // Das Subjekt gehört in den Satz: „führt damit alle 16 an" ohne Namen war die
  // erste Fassung — grammatisch unvollständig und beim Vorlesen sinnlos.
  const name = regionName(i.name);
  const wo =
    i.rang === 1
      ? `führt ${name} alle ${i.rangVon} ${i.rangGattung} an`
      : i.rang === i.rangVon
        ? `steht ${name} auf dem letzten der ${i.rangVon} Plätze`
        : // „von 16 Bundesländer" war die erste Fassung — nach „von" steht der
          // Dativ. Deutsche Pluralformen bekommen dort ein -n, außer sie enden
          // schon auf -n oder -s.
          `liegt ${name} auf Platz ${i.rang} von ${i.rangVon} ${dativPlural(i.rangGattung)}`;
  return `Gemessen an der Dachleistung je Einwohner ${wo}.`;
}

/**
 * Die Spitze des Feldes mit Namen — und wie weit es auseinanderliegt.
 *
 * DREI SATZFORMEN, gewählt nach der Spanne im Feld, nicht nach Zufall:
 * Ein Feld, in dem der Erste das Zwanzigfache des Letzten hat, verlangt einen
 * anderen Satz als eines, in dem alle dicht beieinander liegen. Das ist
 * strukturelle Variation aus der Datenlage — nicht dasselbe wie Synonyme zu
 * streuen. Die Warnung im Wellenplan gilt dem Fall, dass die Umformulierung der
 * EINZIGE Unterschied zwischen zwei Seiten ist; hier unterscheiden sich Namen,
 * Werte, Reihenfolge und Satzbau.
 *
 * Das Schlusslicht wird benannt, nicht als Faktor verrechnet: „das 25-fache des
 * schwächsten Kreises" konnte niemand einordnen und verdeckte, dass vorn
 * ländliche Kreise stehen und hinten fast immer eine Großstadt.
 *
 * Werte stehen in Klammern hinter dem Namen und tragen die Hervorhebung des
 * Einstiegsabsatzes — der Satz soll den Ort betonen, nicht die Einheit
 * wiederholen.
 */
function spitzeSatz(i: RegionHighlightInput): HighlightTeil[] | null {
  const mitWert = i.kinder.filter(
    (k): k is RegionKind & { wPerCapitaDach: number } => k.wPerCapitaDach !== null,
  );
  if (mitWert.length < 3) return null;
  const sortiert = [...mitWert].sort((a, b) => b.wPerCapitaDach - a.wPerCapitaDach);
  const spitze = sortiert[0];
  const schluss = sortiert[sortiert.length - 1];
  const spanne =
    schluss.wPerCapitaDach > 0 ? spitze.wPerCapitaDach / schluss.wPerCapitaDach : 1;

  /**
   * Name (verlinkt, wenn es die Seite gibt) plus Wert in Klammern.
   *
   * DER ARTIKEL BLEIBT AUSSERHALB DES VERWEISES: „der" gehört zur Grammatik des
   * Satzes, nicht zum Namen des Gebiets. Verlinkt wird „Landkreis Biberach" —
   * das ist auch der Ankertext, den Google liest.
   */
  const mitWertGenannt = (k: RegionKind & { wPerCapitaDach: number }): HighlightTeil[] => {
    const teile: HighlightTeil[] = [];
    const artikel = artikelVon(k.name);
    if (artikel) teile.push(artikel);
    teile.push(k.href ? { text: k.name, href: k.href } : k.name);
    teile.push(
      " (",
      { text: fmtWattProKopf(Math.round(k.wPerCapitaDach)), stark: true } as HighlightTeil,
      " je Einwohner)",
    );
    return teile;
  };

  const teile: HighlightTeil[] =
    spanne >= 8
      ? [
          // „Zwischen den Kreise" — derselbe Dativ-Fehler wie „von 16
          // Bundesländer", zwei Stunden später an anderer Stelle. Deshalb geht
          // JEDE Gattungsangabe in diesem Modul durch dativPlural().
          `Zwischen den ${dativPlural(i.kindWort)} liegen Welten: vorn `,
          ...mitWertGenannt(spitze),
          ", am Ende ",
          ...mitWertGenannt(schluss),
          ".",
        ]
      : spanne >= 1.5
        ? [
            "Am weitesten ist ",
            ...mitWertGenannt(spitze),
            ", am wenigsten weit ",
            ...mitWertGenannt(schluss),
            ".",
          ]
        : [`Das Feld liegt dicht beieinander, vorn `, ...mitWertGenannt(spitze), "."];
  return teile;
}

/**
 * „Landkreis Dingolfing-Landau" → „der Landkreis Dingolfing-Landau".
 *
 * Ohne Artikel las sich der Satz als „Am weitesten ist Landkreis
 * Dingolfing-Landau" — kein deutscher Satz. Die Gattungswörter stehen in
 * lib/atlas-orte.ts; hier wird nur der Artikel davorgesetzt, der zur Gattung
 * gehört. Namen ohne vorangestellte Gattung (Städte, Gemeinden) bleiben nackt.
 */
function regionName(name: string): string {
  const artikel = artikelVon(name);
  return artikel ? `${artikel}${name}` : name;
}

/** Der Artikel samt Leerzeichen — oder leer, wenn der Name keinen trägt. */
function artikelVon(name: string): string {
  if (/^(Landkreis|Kreis|Saalekreis|Ostalbkreis|Regionalverband)\b/.test(name)) return "der ";
  if (/^(Region|Städteregion|Verbandsgemeinde)\b/.test(name)) return "die ";
  // Genau ein Bundesland trägt einen Artikel — dieselbe Ausnahme, für die es in
  // lib/atlas-orte.ts schon „im Saarland" statt „in Saarland" gibt.
  if (/^Saarland$/.test(name)) return "das ";
  return "";
}

/** Dativ Plural: „von 16 Bundesländern". Endet das Wort schon auf -n oder -s,
 *  bleibt es (Gemeinden, Kreise → Kreisen). */
function dativPlural(wort: string): string {
  return /[ns]$/i.test(wort) ? wort : `${wort}n`;
}

/**
 * Zubau des letzten vollen Jahres, als Anteil am Bestand.
 *
 * Der Anteil ist die eigentliche Aussage: 20.000 neue Anlagen sind in Bayern
 * etwas anderes als im Saarland. Der Vergleich zum Vorjahr steht daneben, weil
 * er die Richtung zeigt — ohne ihn liest sich jede Zahl wie Wachstum.
 */
function zubauSatz(i: RegionHighlightInput): string | null {
  if (!i.byYear || i.lastYear == null || !i.count) return null;
  const letztes = i.byYear.find((y) => y.year === i.lastYear);
  const vorletztes = i.byYear.find((y) => y.year === (i.lastYear as number) - 1);
  if (!letztes || letztes.count < 1) return null;
  // „%" ist eine Einheit wie kWp und wird nicht getippt — der Einheiten-Wächter
  // hat genau diese Zeile in ihrer ersten Fassung gefangen.
  const anteil = letztes.count / i.count;
  const anteilText = prozentGerundet(anteil) >= 1 ? fmtAnteilProzent(anteil) : `unter ${fmtAnteilProzent(0.01)}`;
  const richtung =
    vorletztes && vorletztes.count > 0
      ? letztes.count > vorletztes.count * 1.05
        ? " — mehr als im Jahr davor"
        : letztes.count < vorletztes.count * 0.95
          ? " — weniger als im Jahr davor"
          : " — etwa so viele wie im Jahr davor"
      : "";
  // Verb und Zahl gehören zusammen: „kamen eine Anlage dazu" ist derselbe Fehler
  // wie „1 neue Anlagen" — Singular gibt es wirklich, in kleinen Gemeinden.
  const zugang = letztes.count === 1 ? "kam eine Anlage" : `kamen ${nf(letztes.count)} Anlagen`;
  return `${i.lastYear} ${zugang} dazu, also ${anteilText} des heutigen Bestands${richtung}.`;
}

/**
 * BEWUSST KEIN SPEICHER-SATZ. Auf Regionsebene liegt nur die Zahl ALLER Speicher
 * vor (inklusive Pumpspeicher) und getrennt davon die Kapazität der Batterien.
 * Beides in einen Satz zu setzen hieße, eine Anzahl mit einer Kapazität zu
 * paaren, die etwas anderes meint — genau der Fehler, den die Speicher-Kachel
 * schon einmal gemacht hat („513 Anlagen" über 512 Batterien). Die Batterie-Zahl
 * je Region müsste erst aus den Segmenten abgeleitet werden; solange das nicht
 * sauber steht, fehlt der Satz lieber.
 */

/**
 * Wie auffällig ist diese Tatsache für DIESE Region? Höher = gehört nach vorn.
 *
 * DER AUFHÄNGER ROTIERT DATENGETRIEBEN, ER WIRD NICHT UMFORMULIERT. Das ist der
 * Unterschied, auf dem der Wellenplan besteht: Dieselbe Aussage in Synonyme zu
 * kleiden ist Content-Spinning und selbst ein Thin-Signal. Was einen Text
 * unterscheidbar macht, ist die Frage, WOMIT er anfängt — und die beantwortet
 * hier die Datenlage, nicht ein Zufallsgenerator (der bei jedem Aufbau eine
 * andere Fassung liefern würde; die Seite ist gecacht, das wäre bloß Unruhe).
 *
 * Die Skala ist bewusst grob. Sie muss nur sortieren, nicht messen.
 */
function auffaelligkeit(i: RegionHighlightInput): { rang: number; spitze: number; zubau: number } {
  // Rang: Erster und Letzter sind eine Nachricht, Platz 8 von 16 ist keine.
  let rang = 0;
  if (i.rang && i.rangVon && i.rangVon >= 3) {
    const relativ = (i.rang - 1) / (i.rangVon - 1); // 0 = vorn, 1 = hinten
    rang = i.rang === 1 || i.rang === i.rangVon ? 3 : relativ <= 0.2 || relativ >= 0.8 ? 2 : 1;
  }

  // Spanne: Ein Feld, in dem der Erste ein Vielfaches des Letzten hat, erklärt
  // die Region besser als ihr Mittelwert.
  const werte = i.kinder.map((k) => k.wPerCapitaDach).filter((w): w is number => w !== null);
  let spitze = werte.length >= 3 ? 1 : 0;
  if (werte.length >= 3) {
    const max = Math.max(...werte);
    const min = Math.min(...werte);
    if (min > 0 && max / min >= 8) spitze = 3;
    else if (min > 0 && max / min >= 3) spitze = 2;
  }

  // Zubau: auffällig ist die Richtung, nicht die Menge.
  let zubau = 0;
  if (i.byYear && i.lastYear != null && i.count) {
    const letztes = i.byYear.find((y) => y.year === i.lastYear);
    const vorletztes = i.byYear.find((y) => y.year === (i.lastYear as number) - 1);
    if (letztes && letztes.count > 0) {
      zubau = 1;
      if (vorletztes && vorletztes.count > 0) {
        const v = letztes.count / vorletztes.count;
        if (v >= 1.25 || v <= 0.75) zubau = 3;
        else if (v >= 1.05 || v <= 0.95) zubau = 2;
      }
    }
  }
  return { rang, spitze, zubau };
}

/**
 * Setzt den Absatz zusammen. Leere Sätze fallen weg, statt „—" zu schreiben:
 * Eine Region ohne Kinder oder ohne Zubau bekommt einen kürzeren Text, keinen
 * mit Lücken.
 *
 * Die Reihenfolge folgt der Auffälligkeit (siehe oben). Bei Gleichstand bleibt
 * es bei Rang → Spitze → Zubau, damit dieselbe Datenlage immer denselben Text
 * ergibt: Ein Text, der sich bei jedem Aufbau umsortiert, wäre für Google eine
 * wechselnde Seite und für einen wiederkehrenden Leser Verwirrung.
 */
export function buildRegionHighlight(i: RegionHighlightInput): HighlightTeil[] {
  const gewicht = auffaelligkeit(i);
  const rang = rangSatz(i);
  const zubau = zubauSatz(i);
  const saetze: { teile: HighlightTeil[] | null; gewicht: number; reihenfolge: number }[] = [
    { teile: rang ? [rang] : null, gewicht: gewicht.rang, reihenfolge: 0 },
    { teile: spitzeSatz(i), gewicht: gewicht.spitze, reihenfolge: 1 },
    { teile: zubau ? [zubau] : null, gewicht: gewicht.zubau, reihenfolge: 2 },
  ];
  const gewaehlt = saetze
    .filter((s): s is { teile: HighlightTeil[]; gewicht: number; reihenfolge: number } => !!s.teile)
    .sort((a, b) => b.gewicht - a.gewicht || a.reihenfolge - b.reihenfolge);

  // Zwischen den Sätzen ein Leerzeichen, aber keins am Anfang.
  return gewaehlt.flatMap((s, idx) => (idx === 0 ? s.teile : [" ", ...s.teile]));
}

/** Der Absatz als reiner Text — für Tests und für Stellen ohne Markup. */
export function highlightAlsText(teile: HighlightTeil[]): string {
  return teile.map((t) => (typeof t === "string" ? t : t.text)).join("");
}

/** Nur für die Überschrift des Blocks — sagt, worauf sich die Sätze beziehen. */
export function regionHighlightTitel(level: RegionHighlightInput["level"], name: string): string {
  return level === "de" ? "Wie Deutschland dasteht" : `Wie ${name} dasteht`;
}
