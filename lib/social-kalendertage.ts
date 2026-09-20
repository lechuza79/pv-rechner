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
 * Ab wie vielen Ländern ein Ferienband gezeigt wird.
 *
 * EINS — also immer, wenn irgendwo Ferien sind. Vorher standen hier acht, und
 * das war ein Fehler, den man im Bild sofort sah: Das Band endete am 15. August,
 * obwohl Berlin, Brandenburg und Mecklenburg-Vorpommern bis zum 22. Ferien
 * hatten. Es endete nicht, weil die Ferien endeten, sondern weil die Zahl der
 * Länder unter die gegriffene Schwelle fiel. Ein Balken, dessen Enden keinem
 * Datum in der Wirklichkeit entsprechen, ist keine Auskunft, sondern eine
 * Fehlinformation mit runden Ecken.
 *
 * Der Preis ist ein Band an vielen Tagen des Jahres. Das ist die Wahrheit:
 * Irgendwo in Deutschland hat fast immer jemand Ferien. Wie viele es sind, sagt
 * die Beschriftung — und die schwankt jetzt sichtbar, statt dass der Balken
 * verschwindet.
 */
export const FERIEN_AB_LAENDERN = 1;

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
  /**
   * WAS für ein Zeitraum das ist — und daran hängt die Darstellung.
   *
   * Vorher entschied die BREITE in dieser Woche: ein Tag = Punkt, mehrere =
   * Balken. Das war die falsche Frage. Am 14.09.2026 lag der letzte Tag der
   * bayerischen Sommerferien allein am Montag; daraus wurde ein Punkt, der wie
   * ein Feiertag aussah — sechs Wochen Ferien, dargestellt als Ereignis ohne
   * Dauer. Ein Ferienzeitraum hat immer Ausdehnung; dass davon nur ein Tag ins
   * Sichtfeld ragt, ändert daran nichts. Ein Feiertag dagegen HAT keine Dauer.
   */
  art: "feiertag" | "ferien";
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
      art: "feiertag",
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
      // ZWEI ZAHLEN, wenn die Woche sich bewegt. Der Höchstwert allein wäre eine
      // Aussage über EINEN Tag, quer über sieben gemalt: In der Woche ab dem
      // 10.08.2026 sind es am Montag dreizehn Länder und am Sonntag sieben, und
      // „Ferien in 13 Ländern" stimmt dann an fünf von sieben Tagen nicht.
      const zahlen = tage.slice(start, i).map((t) => t.befund.ferienLaender);
      const min = Math.min(...zahlen);
      const max = Math.max(...zahlen);
      const laender = min === max ? `${max}` : `${min}–${max}`;
      baender.push({
        vonIndex: start,
        tagIso: tage[start].iso,
        bisIndex: ende,
        // Läuft der Zeitraum schon am Sonntag davor bzw. am Montag danach? Dann
        // ist der Rand hier kein Anfang, sondern eine Schnittkante.
        echterBeginn: !ferienAmRand(montagIso, -1),
        echtesEnde: !ferienAmRand(montagIso, 7),
        art: "ferien",
        // Singular wird gebraucht, seit die Schwelle bei eins liegt.
        text: `Ferien in ${laender} ${min === 1 && max === 1 ? "Land" : "Ländern"}`,
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

/**
 * Welche Länder an diesem Tag einen Feiertag haben, und wie man das sagt.
 *
 * DREI FORMEN, weil eine Zahl allein die falsche Auskunft ist: „in 2 Ländern"
 * beantwortet nicht, ob man selbst dazugehört. Bei wenigen Ländern werden sie
 * aufgezählt; sind es fast alle, ist die Ausnahme die Information („alle außer
 * Bayern und Saarland"). Die Grenze ist keine gegriffene Zahl, sondern die
 * kürzere der beiden Listen — wer weniger aufzählen muss, sagt mehr.
 */
export function feiertagInfo(iso: string): { name: string; wo: string } | null {
  const bundesweit = FEIERTAGE["*"]?.find((f) => f.tag === iso);
  if (bundesweit) return { name: bundesweit.name, wo: "Bundesweit" };

  let name: string | null = null;
  const mit: string[] = [];
  for (const [land, liste] of Object.entries(FEIERTAGE)) {
    if (land === "*") continue;
    const treffer = liste.find((f) => f.tag === iso);
    if (!treffer) continue;
    name ??= treffer.name;
    if (treffer.name === name) mit.push(LAND_NAME[land] ?? land);
  }
  if (!name) return null;

  const ohne = LAENDER.filter((l) => !mit.includes(LAND_NAME[l] ?? l)).map((l) => LAND_NAME[l] ?? l);
  return {
    name,
    wo: ohne.length < mit.length ? `In allen Ländern außer ${aufzaehlung(ohne)}` : `In ${aufzaehlung(mit)}`,
  };
}

/** „A, B und C" — die letzte Trennung ist ein „und", keine Kommaliste. */
function aufzaehlung(namen: string[]): string {
  if (namen.length === 0) return "keinem Land";
  if (namen.length === 1) return namen[0];
  return `${namen.slice(0, -1).join(", ")} und ${namen[namen.length - 1]}`;
}

/** Ferienlage aller sechzehn Länder an einem Tag — für das Detailfenster. */
export function ferienJeLand(iso: string): { land: string; name: string; von: string; bis: string }[] {
  return LAENDER.flatMap((l) => {
    const f = ferienAm(l, iso);
    return f ? [{ land: LAND_NAME[l] ?? l, name: f.name, von: f.von, bis: f.bis }] : [];
  });
}

/** Amtlicher Länderschlüssel → Name. Steht hier, weil ihn sonst niemand braucht. */
export const LAND_NAME: Record<string, string> = {
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
