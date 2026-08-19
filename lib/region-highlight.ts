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
};

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
 * Der stärkste Kreis (bzw. die stärkste Gemeinde) mit Namen — und wie weit das
 * Feld auseinanderliegt.
 *
 * Der Abstand wird als Faktor gesagt und der schwächste NICHT benannt: Die Zahl
 * ist die Aussage, der Pranger wäre keine.
 */
function spitzeSatz(i: RegionHighlightInput): string | null {
  const mitWert = i.kinder.filter(
    (k): k is RegionKind & { wPerCapitaDach: number } => k.wPerCapitaDach !== null,
  );
  if (mitWert.length < 3) return null;
  const sortiert = [...mitWert].sort((a, b) => b.wPerCapitaDach - a.wPerCapitaDach);
  const spitze = sortiert[0];
  const schluss = sortiert[sortiert.length - 1];
  const spitzeWert = fmtWattProKopf(Math.round(spitze.wPerCapitaDach));

  // Das SCHLUSSLICHT WIRD BENANNT, nicht nur als Faktor verrechnet. Erste Fassung
  // sagte „das 25-fache des schwächsten Kreises" — eine Zahl, die niemand
  // einordnen kann und die eine unfaire Gegenüberstellung verdeckt: Vorn stehen
  // ländliche Kreise mit viel Dachfläche je Kopf, hinten fast immer eine
  // Großstadt. Mit beiden Namen sieht man den Grund, statt ihn zu raten
  // (CLAUDE.md: „Trägt ein Mittelwert überhaupt?" — hier: trägt der Vergleich?).
  const spanne =
    schluss.wPerCapitaDach > 0 && spitze.wPerCapitaDach / schluss.wPerCapitaDach >= 1.5
      ? ` Am anderen Ende steht ${regionName(schluss.name)} mit ${fmtWattProKopf(Math.round(schluss.wPerCapitaDach))}.`
      : "";
  return `Am weitesten ist ${regionName(spitze.name)} mit ${spitzeWert} auf dem Dach je Einwohner.${spanne}`;
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
  if (/^(Landkreis|Kreis|Saalekreis|Ostalbkreis|Regionalverband)\b/.test(name)) return `der ${name}`;
  if (/^(Region|Städteregion|Verbandsgemeinde)\b/.test(name)) return `die ${name}`;
  // Genau ein Bundesland trägt einen Artikel — dieselbe Ausnahme, für die es in
  // lib/atlas-orte.ts schon „im Saarland" statt „in Saarland" gibt.
  if (/^Saarland$/.test(name)) return "das Saarland";
  return name;
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
 * Setzt den Absatz zusammen. Leere Sätze fallen weg, statt „—" zu schreiben:
 * Eine Region ohne Kinder oder ohne Zubau bekommt einen kürzeren Text, keinen
 * mit Lücken.
 */
export function buildRegionHighlight(i: RegionHighlightInput): string {
  return [rangSatz(i), spitzeSatz(i), zubauSatz(i)].filter(Boolean).join(" ");
}

/** Nur für die Überschrift des Blocks — sagt, worauf sich die Sätze beziehen. */
export function regionHighlightTitel(level: RegionHighlightInput["level"], name: string): string {
  return level === "de" ? "Wie Deutschland dasteht" : `Wie ${name} dasteht`;
}
