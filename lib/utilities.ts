// Stadtwerke / Energieversorger: Gebiets-Aggregate + Rangrechnung.
//
// Reine Funktionen, kein DB-/Next-Import — dieselbe Trennung wie beim
// Kommunen-Award, damit Admin-Ansicht, API und Tests dieselbe Rechnung sehen.
//
// KERNGEDANKE: Ein Versorgungsgebiet ist rechnerisch eine große Gemeinde. Die
// Kennzahlen seiner Gemeinden werden aufsummiert, die Einwohner ebenso — heraus
// kommt derselbe Datensatz, mit dem der Kommunen-Award rechnet. Damit gelten
// Rangrechnung (`rankGemeinden`), Größenklassen (`populationTertiles`) und die
// Einheiten-Formatter unverändert. Es gibt KEINE zweite Rangquelle.
//
// GRENZEN DER ZAHLEN — bewusst im Modul, nicht nur in der Oberfläche:
//  1. Versorgungsgebiete sind nicht öffentlich dokumentiert. Netzbetreiber,
//     Grundversorger und Vertrieb haben verschiedene Gebiete, die sich
//     überschneiden. Jede Zuordnung trägt deshalb ihre Herkunft (`quelle`), und
//     jedes Aggregat trägt sichtbar mit, wie viel davon nur vermutet ist.
//  2. Die Anlagendaten kennen nur das Inbetriebnahme-JAHR, keine Monate. „Zubau"
//     ist deshalb immer das letzte vollständige Kalenderjahr — kein rollierendes
//     12-Monats-Fenster. Ein solches bräuchte Monatsauflösung im MaStR-Import.

import { fmtWattProKopf } from "./atlas-format";
import {
  AWARD_CATEGORY_BY_KEY,
  populationTertiles,
  rankGemeinden,
  sizeBandOf,
  type AwardCategory,
  type GemeindeStats,
  type SizeBand,
} from "./awards";

// ─── Datensatz ────────────────────────────────────────────────────────────────

export type UtilityTyp = "stadtwerk" | "regionalversorger" | "genossenschaft";

export const UTILITY_TYP_LABEL: Record<UtilityTyp, string> = {
  stadtwerk: "Stadtwerk",
  regionalversorger: "Regionalversorger",
  genossenschaft: "Energiegenossenschaft",
};

/** Rolle einer Gemeinde beim Versorger. Nur `sitz` und `versorgungsgebiet`
 *  gehen in die Gebiets-Summe ein — eine Beteiligung ist ein Eigentumsverhältnis,
 *  kein Versorgungsgebiet, und würde die Zahlen still aufblähen. */
export type ZuordnungRolle = "sitz" | "versorgungsgebiet" | "beteiligung";

export const ZUORDNUNG_ROLLE_LABEL: Record<ZuordnungRolle, string> = {
  sitz: "Sitz",
  versorgungsgebiet: "Versorgungsgebiet",
  beteiligung: "Beteiligung",
};

/** Gemeinden, die in die Gebiets-Summe zählen. */
export const AREA_ROLLEN: ZuordnungRolle[] = ["sitz", "versorgungsgebiet"];

/** Woher die Zuordnung stammt — steigt von unten nach oben in der Verlässlichkeit.
 *  `gemessen`: aus den amtlichen Anlagendaten abgeleitet. Jede Anlage hängt an
 *    einem Netzanschlusspunkt, und der nennt seinen Netzbetreiber — wer in einer
 *    Gemeinde die Anlagen anschließt, betreibt dort das Netz. Das ist eine
 *    Auszählung mit Beleg (Anlagenzahl + Anteil), keine Einschätzung.
 *  `verlinkt`: auf der Gemeinde- oder Versorger-Website ausgewiesen.
 *  `recherchiert`: aus einer anderen belastbaren Quelle (Presse, Satzung).
 *  `vermutet`: plausibel, aber unbelegt. */
export type ZuordnungQuelle = "gemessen" | "verlinkt" | "recherchiert" | "vermutet";

export const ZUORDNUNG_QUELLE_LABEL: Record<ZuordnungQuelle, string> = {
  gemessen: "gemessen",
  verlinkt: "verlinkt",
  recherchiert: "recherchiert",
  vermutet: "vermutet",
};

/** Ein Themen-Fund auf der Website: worüber der Versorger berichtet, mit
 *  Direktlink. Bei `foerderung` ist das ein KANDIDAT — „hier steht etwas von
 *  Förderung" —, nie ein geprüftes Programm. Ob es eines gibt, wie hoch es ist
 *  und ob es noch läuft, entscheidet allein die Prüfung nach dem Förder-Runbook. */
export type Themenfund = { thema: string; url: string; begriff: string };

export const THEMA_LABEL: Record<string, string> = {
  solar: "Solar",
  speicher: "Speicher",
  waermepumpe: "Wärmepumpe",
  foerderung: "Förderung",
  klima: "Klimaschutz",
  buergerbeteiligung: "Bürgerbeteiligung",
};

export type UtilityRecord = {
  id: string;
  name: string;
  typ: UtilityTyp;
  website: string | null;
  kontaktEmail: string | null;
  kontaktseiteUrl: string | null;
  sitzGemeindeId: string | null;
  status: string;
  notiz: string | null;
  telefon: string | null;
  ort: string | null;
  /** Ergebnisse des Website-Laufs. */
  impressumUrl: string | null;
  rollenEmail: string | null;
  personenEmail: string | null;
  verantwortlichZeile: string | null;
  verantwortlichFunktion: string | null;
  verantwortlichOperativ: boolean | null;
  verbundDomain: string | null;
  themen: Themenfund[];
  profilGeprueftAm: string | null;
};

/** Die Adresse, an die man tatsächlich schreiben würde.
 *  Rollen-Postfach vor Registeradresse: Das Register nennt die Meldeadresse
 *  gegenüber der Bundesnetzagentur — meist Verwaltung, nicht Kommunikation.
 *  Personen-Adressen kommen zuletzt (Datenschutz-Leitplanke des Projekts). */
export function besteAdresse(u: UtilityRecord): { adresse: string; art: string } | null {
  if (u.rollenEmail) return { adresse: u.rollenEmail, art: "Rollen-Postfach von der Website" };
  if (u.kontaktEmail) return { adresse: u.kontaktEmail, art: "Meldeadresse im Register" };
  if (u.personenEmail) return { adresse: u.personenEmail, art: "Personen-Adresse aus dem Impressum" };
  return null;
}

export type UtilityMembership = {
  utilityId: string;
  regionId: string; // 8-stelliger AGS
  rolle: ZuordnungRolle;
  quelle: ZuordnungQuelle;
  /** Nur bei `quelle: "gemessen"`: Anlagen dieses Netzbetreibers in der Gemeinde. */
  anlagen?: number | null;
  /** Nur bei `quelle: "gemessen"`: Anteil an allen Anlagen der Gemeinde, 0..1.
   *  In 2.583 von 11.016 Gemeinden gibt es mehr als einen Netzbetreiber — der
   *  Anteil sagt, wie stark dieser dort vertreten ist. */
  anteil?: number | null;
};

// ─── Gebiets-Aggregat ─────────────────────────────────────────────────────────

/** Ein Versorger mit seinem aufsummierten Gebiet.
 *  `stats` hat bewusst die Form einer Gemeinde (`GemeindeStats`), damit die
 *  Rangrechnung des Kommunen-Awards unverändert darauf läuft. */
export type UtilityArea = {
  utility: UtilityRecord;
  /** Die Summe des Gebiets, in Gemeinde-Form. `regionId` = Versorger-ID. */
  stats: GemeindeStats;
  /** Bundesland-AGS (2-stellig) — vom Sitz, ersatzweise von der Mehrheit der
   *  zugeordneten Gemeinden. Gebiete können Landesgrenzen kreuzen; das ist eine
   *  Vereinfachung und wird als solche angezeigt. */
  bundeslandAgs: string | null;
  /** Kreuzt das Gebiet Landesgrenzen? Dann ist die Bundesland-Einordnung grob. */
  mehrereBundeslaender: boolean;
  /** Zugeordnete Gemeinden mit Gebiets-Rolle (Beteiligungen zählen nicht mit). */
  gemeindeCount: number;
  /** Zuordnungen je Herkunft — die Näherungs-Angabe der Anzeige. */
  quellen: Record<ZuordnungQuelle, number>;
  /** Anteil vermuteter Zuordnungen, 0..1. */
  vermutetAnteil: number;
  /** Gemeinden, die auch mindestens einem ANDEREN Versorger zugeordnet sind. */
  ueberlappend: number;
  /** Zugeordnete Gemeinden ohne Kennzahlen (unbewohnt/kein Datensatz) — sie
   *  fehlen in der Summe, also gehört die Zahl sichtbar dazu. */
  ohneDaten: number;
  /** Solar gesamt (Dach privat + gewerblich + Freifläche + Balkon), kWp. */
  solarKwp: number;
  /** Alle Erzeugerarten zusammen, kW — Technologie-Mix, KEIN Peak. */
  erzeugungKw: number;
  /** Batteriekapazität gesamt (privat + gewerblich), kWh. */
  speicherKwh: number;
  /** Solar-Zubau des letzten vollständigen Jahres, kWp. */
  zubauKwp: number;
};

const LEER_QUELLEN: Record<ZuordnungQuelle, number> = { gemessen: 0, verlinkt: 0, recherchiert: 0, vermutet: 0 };

const NULL_STATS = (id: string, name: string): GemeindeStats => ({
  regionId: id,
  name,
  bezeichnung: "Versorgungsgebiet",
  population: 0,
  privatDachKwp: 0,
  gewerbeDachKwp: 0,
  freiflaecheKwp: 0,
  balkonCount: 0,
  balkonKwp: 0,
  batteriePrivatKwh: 0,
  batterieGewerbeKwh: 0,
  windKwp: 0,
  biomasseKwp: 0,
  wasserKwp: 0,
  solarZubauKwp: 0,
});

/** Häufigster Wert einer Liste (erste Fundstelle bei Gleichstand). */
function haeufigster(werte: string[]): string | null {
  const zaehler = new Map<string, number>();
  for (const w of werte) zaehler.set(w, (zaehler.get(w) ?? 0) + 1);
  let best: string | null = null;
  let bestN = 0;
  for (const [w, n] of Array.from(zaehler.entries())) {
    if (n > bestN) {
      best = w;
      bestN = n;
    }
  }
  return best;
}

/**
 * Ein Versorgungsgebiet aufsummieren.
 *
 * `statsByRegion` sind die Gemeinde-Kennzahlen (dieselben, mit denen der
 * Kommunen-Award rechnet — inklusive der dort schon abgezogenen
 * Freiflächen-Doppelzählungen). `mehrfachZugeordnet` enthält die Gemeinden, die
 * mehr als einem Versorger zugeordnet sind; daraus entsteht der
 * Überschneidungs-Hinweis.
 */
export function aggregateArea(
  utility: UtilityRecord,
  memberships: UtilityMembership[],
  statsByRegion: Map<string, GemeindeStats>,
  mehrfachZugeordnet: Set<string> = new Set(),
): UtilityArea {
  const gebiet = memberships.filter(
    (m) => m.utilityId === utility.id && AREA_ROLLEN.includes(m.rolle),
  );

  const stats = NULL_STATS(utility.id, utility.name);
  const quellen = { ...LEER_QUELLEN };
  let ohneDaten = 0;
  let ueberlappend = 0;
  const laender: string[] = [];

  for (const m of gebiet) {
    quellen[m.quelle]++;
    if (mehrfachZugeordnet.has(m.regionId)) ueberlappend++;
    laender.push(m.regionId.slice(0, 2));

    const g = statsByRegion.get(m.regionId);
    if (!g) {
      ohneDaten++;
      continue;
    }
    stats.population += g.population;
    stats.privatDachKwp += g.privatDachKwp;
    stats.gewerbeDachKwp += g.gewerbeDachKwp;
    stats.freiflaecheKwp += g.freiflaecheKwp;
    stats.balkonCount += g.balkonCount;
    stats.balkonKwp += g.balkonKwp;
    stats.batteriePrivatKwh += g.batteriePrivatKwh;
    stats.batterieGewerbeKwh += g.batterieGewerbeKwh;
    stats.windKwp += g.windKwp;
    stats.biomasseKwp += g.biomasseKwp;
    stats.wasserKwp += g.wasserKwp;
    stats.solarZubauKwp += g.solarZubauKwp;
  }

  const solarKwp = stats.privatDachKwp + stats.gewerbeDachKwp + stats.freiflaecheKwp + stats.balkonKwp;
  const sitzLand = utility.sitzGemeindeId ? utility.sitzGemeindeId.slice(0, 2) : null;
  const eindeutigeLaender = new Set(laender);

  return {
    utility,
    stats,
    bundeslandAgs: sitzLand ?? haeufigster(laender),
    mehrereBundeslaender: eindeutigeLaender.size > 1,
    gemeindeCount: gebiet.length,
    quellen,
    vermutetAnteil: gebiet.length > 0 ? quellen.vermutet / gebiet.length : 0,
    ueberlappend,
    ohneDaten,
    solarKwp,
    erzeugungKw: solarKwp + stats.windKwp + stats.biomasseKwp + stats.wasserKwp,
    speicherKwh: stats.batteriePrivatKwh + stats.batterieGewerbeKwh,
    zubauKwp: stats.solarZubauKwp,
  };
}

/** Gemeinden, die mehr als einem Versorger im GEBIET zugeordnet sind. */
export function findOverlaps(memberships: UtilityMembership[]): Set<string> {
  const zaehler = new Map<string, Set<string>>();
  for (const m of memberships) {
    if (!AREA_ROLLEN.includes(m.rolle)) continue;
    const set = zaehler.get(m.regionId) ?? new Set<string>();
    set.add(m.utilityId);
    zaehler.set(m.regionId, set);
  }
  const out = new Set<string>();
  for (const [regionId, utilities] of Array.from(zaehler.entries())) {
    if (utilities.size > 1) out.add(regionId);
  }
  return out;
}

// ─── Kategorien ───────────────────────────────────────────────────────────────

/** Zwei Kennzahlen, die es nur auf Gebiets-Ebene gibt. Alles Übrige wird aus dem
 *  Kommunen-Award wiederverwendet (gleiche Metrik, gleiche Rangrechnung). */
const GEBIETS_KATEGORIEN: AwardCategory[] = [
  {
    key: "erzeugung-gesamt",
    label: "Erzeugungsleistung im Gebiet",
    merit: "Installierte Leistung aller Erzeugerarten im Versorgungsgebiet.",
    traeger: "gewerbe",
    messart: "absolut",
    // Technologie-Mix → kW/MW/GW, kein Peak.
    format: "mixLeistung",
    metric: (g) =>
      g.privatDachKwp + g.gewerbeDachKwp + g.freiflaecheKwp + g.balkonKwp + g.windKwp + g.biomasseKwp + g.wasserKwp ||
      null,
  },
  {
    key: "solar-gesamt",
    label: "Solarleistung im Gebiet",
    merit: "Installierte Photovoltaik im Versorgungsgebiet, alle Segmente.",
    traeger: "gewerbe",
    messart: "absolut",
    format: "pvLeistung",
    metric: (g) => g.privatDachKwp + g.gewerbeDachKwp + g.freiflaecheKwp + g.balkonKwp || null,
  },
];

/** Aus dem Kommunen-Award übernommene Kategorien — identische Metrik, identische
 *  Rangrechnung. Nur die ANSPRACHE ist eine andere (siehe UTILITY_LABEL). */
const UEBERNOMMENE_KEYS = [
  "dach-privat-pk",
  "balkon-pk",
  "batterie-privat-pk",
  "zubau",
  "freiflaeche-standort",
  "wind-standort",
  "biomasse-standort",
  "wasser-standort",
  "gewerbespeicher-abs",
];

export const UTILITY_CATEGORIES: AwardCategory[] = [
  ...GEBIETS_KATEGORIEN,
  ...UEBERNOMMENE_KEYS.map((k) => AWARD_CATEGORY_BY_KEY[k]).filter(Boolean),
];

export const UTILITY_CATEGORY_BY_KEY: Record<string, AwardCategory> = Object.fromEntries(
  UTILITY_CATEGORIES.map((c) => [c.key, c]),
);

/** Sachliche Bezeichnung für die Versorger-Ansprache. Die Award-Titel der
 *  Gemeinden („Solardach-Spitzenreiter") sind Wettbewerbs-Namen und passen nicht
 *  in ein B2B-Gespräch — die RECHNUNG ist dieselbe, nur die Wortwahl nicht.
 *
 *  Die Bezeichnung wiederholt NICHT, was der Formatter schon sagt: der Wert steht
 *  davor. „14,3 je 1.000 Ew. Balkonkraftwerke je 1.000 Einwohner" ist derselbe
 *  Fehler wie eine doppelte Einheit, nur in Worten. */
export const UTILITY_LABEL: Record<string, string> = {
  "erzeugung-gesamt": "Erzeugungsleistung im Gebiet",
  "solar-gesamt": "Solarleistung im Gebiet",
  // „Wp" allein sagt nicht, dass es je Einwohner ist — hier gehört es dazu.
  "dach-privat-pk": "private Dach-Solarleistung je Einwohner",
  // Der Formatter schreibt bereits „je 1.000 Ew." bzw. „Wh/Kopf".
  "balkon-pk": "Balkonkraftwerke",
  "batterie-privat-pk": "private Speicherkapazität",
  zubau: "Solar-Zubau im Gebiet",
  "freiflaeche-standort": "Freiflächen-Solarleistung",
  "wind-standort": "Windleistung im Gebiet",
  "biomasse-standort": "Biomasseleistung im Gebiet",
  "wasser-standort": "Wasserkraftleistung im Gebiet",
  "gewerbespeicher-abs": "gewerbliche Speicherkapazität",
};

export const utilityCategoryLabel = (key: string): string =>
  UTILITY_LABEL[key] ?? UTILITY_CATEGORY_BY_KEY[key]?.label ?? key;

// ─── Rangrechnung ─────────────────────────────────────────────────────────────

export type UtilityScope = "bund" | "land";

export const SCOPE_LABEL: Record<UtilityScope, string> = { bund: "bundesweit", land: "im Bundesland" };

export type UtilityPlacement = {
  categoryKey: string;
  scope: UtilityScope;
  scopeId: string; // "de" oder 2-stelliger Bundesland-AGS
  /** Größenklasse, in der verglichen wurde — null = alle Größen zusammen. */
  sizeBand: SizeBand | null;
  rank: number;
  total: number;
  value: number;
};

/** Untergrenze für Pro-Kopf-Vergleiche: unter dieser Einwohnerzahl ist ein
 *  Pro-Kopf-Wert eher ein Nenner-Artefakt als ein Ausbaustand. Gleiche Schwelle
 *  wie im Kommunen-Aufhänger. */
export const UTILITY_MIN_POPULATION = 2000;

/**
 * Alle Platzierungen je Versorger: Kategorie × (bundesweit | Bundesland) ×
 * (alle Größen | Größenklasse).
 *
 * Die Größenklassen-Grenzen kommen aus der Verteilung der ERFASSTEN Versorger
 * (Terzile der Einwohner im Gebiet), nicht aus gesetzten Zahlen — so wächst die
 * Einteilung mit dem Datenbestand, statt ihn zu verzerren.
 */
export function computeUtilityPlacements(areas: UtilityArea[]): Map<string, UtilityPlacement[]> {
  const out = new Map<string, UtilityPlacement[]>();
  const push = (id: string, p: UtilityPlacement) => {
    const arr = out.get(id);
    if (arr) arr.push(p);
    else out.set(id, [p]);
  };

  const bewertbar = areas.filter((a) => a.gemeindeCount > 0);
  if (bewertbar.length === 0) return out;

  const t = populationTertiles(bewertbar.map((a) => a.stats));
  const bandOf = (a: UtilityArea): SizeBand => sizeBandOf(a.stats.population, t.c1, t.c2);

  for (const cat of UTILITY_CATEGORIES) {
    const floor = cat.messart === "proKopf" ? UTILITY_MIN_POPULATION : 0;
    const pool = bewertbar.filter((a) => a.stats.population >= floor);

    // Vier Vergleichsgruppen-Achsen: bundesweit/Land × alle/Größenklasse.
    const gruppen = new Map<string, { scope: UtilityScope; scopeId: string; sizeBand: SizeBand | null; areas: UtilityArea[] }>();
    for (const a of pool) {
      const kombis: { scope: UtilityScope; scopeId: string; sizeBand: SizeBand | null }[] = [
        { scope: "bund", scopeId: "de", sizeBand: null },
        { scope: "bund", scopeId: "de", sizeBand: bandOf(a) },
      ];
      if (a.bundeslandAgs) {
        kombis.push({ scope: "land", scopeId: a.bundeslandAgs, sizeBand: null });
        kombis.push({ scope: "land", scopeId: a.bundeslandAgs, sizeBand: bandOf(a) });
      }
      for (const k of kombis) {
        const key = [k.scope, k.scopeId, k.sizeBand ?? ""].join("|");
        const eintrag = gruppen.get(key);
        if (eintrag) eintrag.areas.push(a);
        else gruppen.set(key, { ...k, areas: [a] });
      }
    }

    for (const g of Array.from(gruppen.values())) {
      const ranked = rankGemeinden(
        g.areas.map((a) => a.stats),
        cat,
      );
      for (const r of ranked) {
        push(r.regionId, {
          categoryKey: cat.key,
          scope: g.scope,
          scopeId: g.scopeId,
          sizeBand: g.sizeBand,
          rank: r.rank,
          total: ranked.length,
          value: r.value,
        });
      }
    }
  }
  return out;
}

// ─── Highlights ───────────────────────────────────────────────────────────────

/**
 * Eine Kennzahl mit Einordnung.
 *
 * Das `niveau` ist KEINE Wertung der Zahl an sich, sondern ihr Verhältnis zum
 * Median der erfassten Versorger — und der Bezug steht deshalb sichtbar dabei.
 * „Grün" ohne Vergleichsgröße wäre eine Behauptung; „grün, Median liegt bei
 * 412 Wp" ist eine Einordnung.
 */
export type Kennzahl = {
  wert: number | null;
  /** Fertig formatiert, Einheit aus dem kanonischen Formatter. */
  anzeige: string;
  niveau: "hoch" | "mittel" | "niedrig" | null;
  /** Woran gemessen wurde — gehört immer mit angezeigt. */
  referenz: string;
};

/** Ab welchem Verhältnis zum Median eine Zahl hervorgehoben wird. Bewusst
 *  großzügig: bei ±10 % ist der Unterschied Rauschen, keine Auszeichnung. */
const HOCH_AB = 1.25;
const NIEDRIG_BIS = 0.75;

function median(werte: number[]): number | null {
  const s = werte.filter((n) => n > 0).sort((a, b) => a - b);
  if (s.length === 0) return null;
  return s[Math.floor(s.length / 2)];
}

function einordnen(wert: number | null, med: number | null): "hoch" | "mittel" | "niedrig" | null {
  if (wert == null || med == null || med <= 0) return null;
  if (wert >= med * HOCH_AB) return "hoch";
  if (wert <= med * NIEDRIG_BIS) return "niedrig";
  return "mittel";
}

/** Anteil der privaten Dachanlagen an der gesamten Solarleistung des Gebiets.
 *  Ehrlicher Nenner: ALLE Solaranlagen im Gebiet. Die Zahl sagt, wie viel vom
 *  Ausbau auf Bürgerdächern liegt und wie viel auf Gewerbehallen und Parks. */
export function buergerAnteil(area: UtilityArea): number | null {
  return area.solarKwp > 0 ? area.stats.privatDachKwp / area.solarKwp : null;
}

/** Private Dach-Solarleistung je Einwohner, in Wp. */
export function dachProKopf(area: UtilityArea): number | null {
  return area.stats.population > 0 ? (area.stats.privatDachKwp * 1000) / area.stats.population : null;
}

export type UtilityHighlights = {
  dachProKopf: Kennzahl;
  buergerAnteil: Kennzahl;
  zubauAnteil: Kennzahl;
};

/** Anteil einer Erzeugerart an der installierten Erzeugungsleistung des Gebiets. */
export type Erzeugungsanteil = { art: string; kw: number; anteil: number };

/**
 * Woraus die Erzeugungsleistung im Gebiet besteht.
 *
 * Das ist ein echter Anteil mit echtem Nenner: die Summe der installierten
 * Leistung im Gebiet. Es ist ausdrücklich NICHT der Anteil am Strommix — dafür
 * bräuchte es Verbrauch und Erzeugungsmengen, nicht Nennleistungen.
 *
 * Alles, was hier gezählt wird, ist erneuerbar (Solar, Wind, Biomasse, Wasser).
 * Konventionelle Erzeugung steht im Register in eigenen Dateien, die unsere
 * Auswertung bisher nicht liest — deshalb ist die Gesamtsumme hier gleichbedeutend
 * mit „installierte erneuerbare Leistung", und ein „Anteil erneuerbar" wäre
 * zwangsläufig 100 %. Das wäre keine Aussage, sondern ein Artefakt.
 */
export function erzeugungsMix(area: UtilityArea): Erzeugungsanteil[] {
  const teile = [
    { art: "Solar", kw: area.solarKwp },
    { art: "Wind", kw: area.stats.windKwp },
    { art: "Biomasse", kw: area.stats.biomasseKwp },
    { art: "Wasser", kw: area.stats.wasserKwp },
  ].filter((t) => t.kw > 0);
  const summe = teile.reduce((s, t) => s + t.kw, 0);
  if (summe <= 0) return [];
  return teile
    .map((t) => ({ ...t, anteil: t.kw / summe }))
    .sort((a, b) => b.kw - a.kw);
}

/**
 * Die drei Kennzahlen, die in der Tabelle hervorgehoben werden.
 *
 * Bewusst NICHT dabei: ein „Anteil Erneuerbare am Strommix". Dafür bräuchte es
 * den Verbrauch und die konventionelle Erzeugung im Gebiet — beides steht in
 * den Anlagendaten nicht. Eine solche Zahl wäre geschätzt und würde neben
 * gemessenen Werten wie eine gemessene aussehen.
 */
export function computeHighlights(area: UtilityArea, alle: UtilityArea[]): UtilityHighlights {
  const pool = alle.filter((a) => a.gemeindeCount > 0);
  const medDach = median(pool.map((a) => dachProKopf(a) ?? 0));
  const medBuerger = median(pool.map((a) => buergerAnteil(a) ?? 0));
  const medZubau = median(pool.map((a) => (a.solarKwp > 0 ? a.zubauKwp / a.solarKwp : 0)));

  const dach = dachProKopf(area);
  const buerger = buergerAnteil(area);
  const zubau = area.solarKwp > 0 ? area.zubauKwp / area.solarKwp : null;
  const pct = (n: number | null) => (n == null ? "—" : `${(n * 100).toLocaleString("de-DE", { maximumFractionDigits: 1 })} %`);

  return {
    dachProKopf: {
      wert: dach,
      anzeige: dach == null ? "—" : fmtWattProKopf(dach),
      niveau: einordnen(dach, medDach),
      referenz: medDach ? `Median ${fmtWattProKopf(medDach)}` : "kein Vergleichswert",
    },
    buergerAnteil: {
      wert: buerger,
      anzeige: pct(buerger),
      niveau: einordnen(buerger, medBuerger),
      referenz: medBuerger ? `Median ${pct(medBuerger)} · Anteil an aller Solarleistung im Gebiet` : "kein Vergleichswert",
    },
    zubauAnteil: {
      wert: zubau,
      anzeige: pct(zubau),
      niveau: einordnen(zubau, medZubau),
      referenz: medZubau ? `Median ${pct(medZubau)} · Zubau des letzten Jahres am Bestand` : "kein Vergleichswert",
    },
  };
}

/** Größenklasse eines Versorgers innerhalb der erfassten Menge. */
export function utilitySizeBand(area: UtilityArea, areas: UtilityArea[]): SizeBand {
  const t = populationTertiles(areas.filter((a) => a.gemeindeCount > 0).map((a) => a.stats));
  return sizeBandOf(area.stats.population, t.c1, t.c2);
}
