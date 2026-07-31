// Auswahl der Versandliste („Testballon") — reine Funktionen, damit die Regeln
// testbar sind und nicht in einer API-Route verschwinden.
//
// Die Auswahl wird FESTGESCHRIEBEN, nicht bei jedem Aufruf neu gefiltert: Der
// Aufhänger einer Gemeinde ändert sich mit jedem Monatslauf der Anlagendaten.
// Ein reiner Filter hätte in Charge 2 andere Gemeinden als in Charge 1, und die
// Staffelung wäre wertlos — genau ihr Zweck ist, dass Charge 2 dieselbe Sorte
// Gemeinde trifft wie die 15 aus Charge 1.

export type Kandidat = {
  regionId: string;
  name: string;
  population: number;
  /** Verwaltungs-Verbund: im Impressum belegte fremde Domain, sonst der eigene
   *  Website-Host. Nie zwei aus einem Verbund in derselben Charge. */
  verbundKey: string | null;
  /** Stärke des Aufhängers: „sieger" ist die Vorgabe für den Testballon. */
  hookKind: string;
  /** Rang innerhalb der Aufhänger-Art (kleiner = stärker), z. B. Platz 1 von N. */
  hookRang: number;
  /** Größe der Vergleichsgruppe: „Platz 1 von 34" wiegt schwerer als „von 5". */
  hookTotal: number;
  /** Erreichbar? Ohne Kontaktweg ist die Gemeinde nicht anschreibbar. */
  hatKanal: boolean;
};

export type Auswahl = {
  gewaehlt: { regionId: string; charge: number }[];
  /** Was NICHT hineinkam und warum — stilles Abschneiden liest sich wie
   *  „alle berücksichtigt", obwohl es das nicht war. */
  bericht: {
    poolGesamt: number;
    ohneKanal: number;
    verbundGeschwister: number;
    kleinGewaehlt: number;
    grossGewaehlt: number;
    kleinFehlend: number;
    grossFehlend: number;
  };
};

export type AuswahlRegeln = {
  /** Zielmenge insgesamt. */
  ziel: number;
  /** Umfang der ersten, kleinen Charge. */
  charge1: number;
  /** Anteil Gemeinden unter der Einwohnergrenze (z. B. 2/3). */
  kleinAnteil: number;
  /** Einwohnergrenze zwischen „klein" und „groß". */
  grenze: number;
};

export const TESTBALLON_REGELN: AuswahlRegeln = {
  ziel: 100,
  // Erste Aussendung 50 (Vorgabe des Betreibers 27.07.2026: „test sollten
  // 50-100 sein"). Vorher 15 — zu wenig, um aus den Antworten etwas abzulesen.
  charge1: 50,
  kleinAnteil: 2 / 3,
  grenze: 10_000,
};

/**
 * Versandliste zusammenstellen.
 *
 * Reihenfolge der Regeln:
 *  1. Nur erreichbare Gemeinden (Kontaktformular oder Rollen-Postfach).
 *  2. Je Verwaltungs-Verbund nur EINE — die mit dem stärksten Aufhänger. Der
 *     Rest bleibt unangetastet („zurückgestellt", nicht verbrannt): Wenn sich
 *     die Verbund-Annahme als falsch erweist, kostet das eine spätere Mail,
 *     nicht eine verbrannte Gemeinde.
 *  3. Zwei Töpfe nach Einwohnerzahl, damit der Testballon nicht nur aus
 *     Großstädten besteht — der Ausbau soll für kleine Gemeinden funktionieren.
 *  4. Charge 1 (50) nimmt die STÄRKSTEN aus beiden Töpfen — die Sieger zuerst.
 */
export function waehleTestballon(kandidaten: Kandidat[], regeln = TESTBALLON_REGELN): Auswahl {
  const poolGesamt = kandidaten.length;
  const erreichbar = kandidaten.filter((k) => k.hatKanal);
  const ohneKanal = poolGesamt - erreichbar.length;

  // Stärkster zuerst: kleinerer Rang schlägt größeren; bei gleichem Rang wiegt
  // die größere Vergleichsgruppe schwerer („Platz 1 von 34" statt „von 5"), erst
  // danach entscheidet die Einwohnerzahl. Ohne die Gruppengröße sortiert die
  // Liste faktisch nur nach Einwohnern — dann stehen München und Stuttgart oben
  // und der Testballon prüft nicht, was er prüfen soll.
  const staerke = (a: Kandidat, b: Kandidat) =>
    a.hookRang - b.hookRang || b.hookTotal - a.hookTotal || b.population - a.population;

  // Je Verbund nur der stärkste Kandidat.
  const proVerbund = new Map<string, Kandidat>();
  const ohneVerbund: Kandidat[] = [];
  for (const k of erreichbar.slice().sort(staerke)) {
    if (!k.verbundKey) {
      ohneVerbund.push(k);
      continue;
    }
    if (!proVerbund.has(k.verbundKey)) proVerbund.set(k.verbundKey, k);
  }
  const entdoppelt = [...ohneVerbund, ...Array.from(proVerbund.values())].sort(staerke);
  const verbundGeschwister = erreichbar.length - entdoppelt.length;

  const zielKlein = Math.round(regeln.ziel * regeln.kleinAnteil);
  const zielGross = regeln.ziel - zielKlein;
  const klein = entdoppelt.filter((k) => k.population < regeln.grenze);
  const gross = entdoppelt.filter((k) => k.population >= regeln.grenze);

  const nimmKlein = klein.slice(0, zielKlein);
  const nimmGross = gross.slice(0, zielGross);
  // Reicht ein Topf nicht, wird aus dem anderen aufgefüllt — aber im Bericht
  // steht, dass die Mischung nicht erreicht wurde.
  const fehlt = regeln.ziel - nimmKlein.length - nimmGross.length;
  if (fehlt > 0) {
    nimmKlein.push(...klein.slice(nimmKlein.length, nimmKlein.length + fehlt));
    const rest = regeln.ziel - nimmKlein.length - nimmGross.length;
    if (rest > 0) nimmGross.push(...gross.slice(nimmGross.length, nimmGross.length + rest));
  }

  // Charge 1 = die STÄRKSTEN zuerst, anteilig aus beiden Töpfen. Vorgabe des
  // Betreibers: die Sieger zuerst anschreiben. Beide Listen sind bereits nach
  // Aufhänger-Stärke sortiert, also sind die ersten N auch die stärksten.
  const c1Klein = Math.round(regeln.charge1 * regeln.kleinAnteil);
  const c1Gross = regeln.charge1 - c1Klein;
  const gewaehlt: { regionId: string; charge: number }[] = [];
  nimmKlein.forEach((k, i) => gewaehlt.push({ regionId: k.regionId, charge: i < c1Klein ? 1 : 2 }));
  nimmGross.forEach((k, i) => gewaehlt.push({ regionId: k.regionId, charge: i < c1Gross ? 1 : 2 }));

  return {
    gewaehlt,
    bericht: {
      poolGesamt,
      ohneKanal,
      verbundGeschwister,
      kleinGewaehlt: nimmKlein.length,
      grossGewaehlt: nimmGross.length,
      kleinFehlend: Math.max(0, zielKlein - nimmKlein.length),
      grossFehlend: Math.max(0, zielGross - nimmGross.length),
    },
  };
}
