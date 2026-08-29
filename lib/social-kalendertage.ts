// Feiertage und Schulferien im Redaktionskalender — als AUSKUNFT, nicht als
// Sperre.
//
// DER UNTERSCHIED ZUM BRIEFVERSAND, und er ist inhaltlich: Ein Anschreiben, das
// in einem Ferien-Postfach landet, ist verloren — deshalb verweigert der Versand
// dort. Ein Beitrag im Feed erreicht in den Ferien nur ein etwas anderes
// Publikum; ihn zu sperren wäre eine Sperre ohne Schaden dahinter. Und sie hätte
// einen Preis: Ein Platz, den die Automatik blockiert, wird zum verstrichenen
// Plan, und davon hat dieser Kalender schon genug Bauformen.
//
// Also: hinschreiben, was ist, und den Menschen entscheiden lassen.
//
// BUNDESWEIT GEDACHT, nicht je Land. Der Briefversand fragt „darf ich HEUTE nach
// Nidda schreiben" — eine Frage an ein Bundesland. Der Feed hat kein
// Bundesland; für ihn zählt, wie viele der sechzehn gerade Ferien haben. Ein
// Land in Ferien ist Rauschen, zwölf sind eine Aussage über die Reichweite.

import { FEIERTAGE, SCHULFERIEN, SCHULFERIEN_ABGEDECKT_BIS, ferienAm } from "./schulferien";

/** Die sechzehn Länderschlüssel, aus der Ferientabelle selbst. */
const LAENDER = Object.keys(SCHULFERIEN);

export type Tagesbefund = {
  /** Bundesweiter Feiertag, sonst null. */
  feiertagUeberall: string | null;
  /** Feiertag in einzelnen Ländern — Name und Anzahl. */
  feiertagRegional: { name: string; laender: number } | null;
  /** In wie vielen der sechzehn Länder Schulferien sind. */
  ferienLaender: number;
  /**
   * Reicht die Tabelle für diesen Tag?
   *
   * Läuft sie aus, sagt sie nicht „keine Ferien", sondern „ich weiß es nicht" —
   * und der Kalender muss das unterscheiden können. Eine leere Tabelle, die als
   * „nichts los" gelesen wird, ist gefährlicher als gar keine.
   */
  bekannt: boolean;
};

export function tagesbefund(iso: string): Tagesbefund {
  if (iso > SCHULFERIEN_ABGEDECKT_BIS) {
    return { feiertagUeberall: null, feiertagRegional: null, ferienLaender: 0, bekannt: false };
  }

  const bundesweit = FEIERTAGE["*"]?.find((f) => f.tag === iso)?.name ?? null;

  // Regionale Feiertage: derselbe Name kann in mehreren Ländern stehen.
  const regional = new Map<string, number>();
  for (const [land, liste] of Object.entries(FEIERTAGE)) {
    if (land === "*") continue;
    const treffer = liste.find((f) => f.tag === iso);
    if (treffer) regional.set(treffer.name, (regional.get(treffer.name) ?? 0) + 1);
  }
  const groesster = [...regional.entries()].sort((a, b) => b[1] - a[1])[0];

  const ferienLaender = LAENDER.filter((l) => ferienAm(l, iso)).length;

  return {
    feiertagUeberall: bundesweit,
    feiertagRegional: bundesweit || !groesster ? null : { name: groesster[0], laender: groesster[1] },
    ferienLaender,
    bekannt: true,
  };
}

/**
 * Der Satz, der im Kalender an einem Tag steht — oder nichts.
 *
 * Schweigt bei wenigen Ferienländern: Irgendwo in Deutschland hat immer jemand
 * Ferien, und ein Hinweis, der an zweihundert Tagen im Jahr erscheint, wird
 * weggelesen. Die Schwelle ist gegriffen und darf deshalb NICHTS sperren — sie
 * steuert nur, ob ein Satz sichtbar wird.
 */
export const FERIEN_AB_LAENDERN = 8;

export function tagesHinweis(b: Tagesbefund): string | null {
  if (!b.bekannt) return "Ferientermine für diesen Tag nicht erfasst";
  if (b.feiertagUeberall) return b.feiertagUeberall;
  if (b.feiertagRegional) {
    return `${b.feiertagRegional.name} (${b.feiertagRegional.laender} ${
      b.feiertagRegional.laender === 1 ? "Land" : "Länder"
    })`;
  }
  if (b.ferienLaender >= FERIEN_AB_LAENDERN) return `Ferien in ${b.ferienLaender} Ländern`;
  return null;
}

/**
 * Ein zusammenhängendes Band innerhalb EINER Woche.
 *
 * Bänder enden am Wochenrand, auch wenn die Ferien weiterlaufen — der Kalender
 * setzt Wochen untereinander, und ein Band, das über den Zeilenrand hinausragen
 * will, gibt es im Raster nicht. Dass es weitergeht, sagt das nächste Band in
 * der nächsten Zeile.
 */
export type FreiBand = {
  /** Spaltenindex in der Woche, 0 = Montag. */
  vonIndex: number;
  /** Der erste Tag des Bandes als Datum — für Hinweis und Detailfenster. */
  tagIso: string;
  bisIndex: number;
  /** Fängt der Zeitraum hier wirklich an — oder läuft er aus der Vorwoche? */
  echterBeginn: boolean;
  echtesEnde: boolean;
  /** Was das Band benennt. */
  text: string;
  /** Ein Tag = Punkt, mehrere = Balken. */
  einTag: boolean;
};

/**
 * Die Bänder einer Woche.
 *
 * ZUSAMMENGEFASST, NICHT JE BUNDESLAND. Sechzehn Länder ergäben bis zu sechzehn
 * Streifen übereinander und in einer Kalenderzeile Brei. Das Band sagt, DASS
 * Ferien sind und wie viele Länder betroffen sind; welche, steht im Fenster
 * dahinter.
 */
export function freiBaender(montagIso: string): FreiBand[] {
  const tage = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(`${montagIso}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + i);
    const iso = d.toISOString().slice(0, 10);
    return { iso, befund: tagesbefund(iso) };
  });

  const baender: FreiBand[] = [];

  // Feiertage sind EINZELNE Tage und bekommen jeder seinen eigenen Punkt —
  // auch zwei aufeinanderfolgende (Weihnachten) sind zwei Feiertage mit zwei
  // Namen, kein Zeitraum mit einem.
  tage.forEach((t, i) => {
    const name = t.befund.feiertagUeberall ?? t.befund.feiertagRegional?.name;
    if (!name) return;
    const regional = !t.befund.feiertagUeberall && t.befund.feiertagRegional;
    baender.push({
      vonIndex: i,
      tagIso: t.iso,
      bisIndex: i,
      echterBeginn: true,
      echtesEnde: true,
      einTag: true,
      text: regional
        ? `${name} (${regional.laender} ${regional.laender === 1 ? "Land" : "Länder"})`
        : `${name} (bundesweit)`,
    });
  });

  // Ferien: zusammenhängende Strecken, ab der Schwelle.
  let start = -1;
  for (let i = 0; i <= 7; i++) {
    const an = i < 7 && tage[i].befund.bekannt && tage[i].befund.ferienLaender >= FERIEN_AB_LAENDERN;
    if (an && start < 0) start = i;
    if (!an && start >= 0) {
      const ende = i - 1;
      const laender = Math.max(...tage.slice(start, i).map((t) => t.befund.ferienLaender));
      baender.push({
        vonIndex: start,
        tagIso: tage[start].iso,
        bisIndex: ende,
        // Läuft der Zeitraum schon am Sonntag davor bzw. am Montag danach? Dann
        // ist der Rand hier kein Anfang, sondern eine Schnittkante.
        echterBeginn: !ferienAmRand(montagIso, -1),
        echtesEnde: !ferienAmRand(montagIso, 7),
        einTag: start === ende,
        text: `Ferien in ${laender} von 16 Ländern`,
      });
      start = -1;
    }
  }

  return baender;
}

function ferienAmRand(montagIso: string, versatz: number): boolean {
  const d = new Date(`${montagIso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + versatz);
  const b = tagesbefund(d.toISOString().slice(0, 10));
  return b.bekannt && b.ferienLaender >= FERIEN_AB_LAENDERN;
}

/** Ferienlage aller sechzehn Länder an einem Tag — für das Detailfenster. */
export function ferienJeLand(iso: string): { land: string; name: string; von: string; bis: string }[] {
  return LAENDER.flatMap((l) => {
    const f = ferienAm(l, iso);
    return f ? [{ land: LAND_NAME[l] ?? l, name: f.name, von: f.von, bis: f.bis }] : [];
  });
}

/** Amtlicher Länderschlüssel → Name. Steht hier, weil ihn sonst niemand braucht. */
const LAND_NAME: Record<string, string> = {
  "01": "Schleswig-Holstein",
  "02": "Hamburg",
  "03": "Niedersachsen",
  "04": "Bremen",
  "05": "Nordrhein-Westfalen",
  "06": "Hessen",
  "07": "Rheinland-Pfalz",
  "08": "Baden-Württemberg",
  "09": "Bayern",
  "10": "Saarland",
  "11": "Berlin",
  "12": "Brandenburg",
  "13": "Mecklenburg-Vorpommern",
  "14": "Sachsen",
  "15": "Sachsen-Anhalt",
  "16": "Thüringen",
};
