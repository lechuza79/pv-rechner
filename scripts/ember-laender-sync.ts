/**
 * Erzeugt `lib/country-comparison.ts` aus Embers "Yearly Electricity Data".
 *
 * Warum als Skript und nicht von Hand: Die Datei trug den Vermerk
 * „AUTO-generiert", ohne dass es den Generator noch gab — und blieb dadurch
 * beim Datensatz-Jahrgang 2025 stehen (Werte bis 2024), während Ember zweimal
 * im Monat nachliefert. Ein Datensatz, dessen Fortschreibung an einer
 * Erinnerung hängt, wird nicht fortgeschrieben.
 *
 * Aufruf: npm run laender:sync   (--datei <pfad.csv> nimmt eine lokale Kopie)
 *
 * Ember revidiert auch zurückliegende Jahre. Das Skript meldet deshalb jede
 * Abweichung zu den bisherigen Werten und bricht bei einem Sprung über 30 % ab
 * — dieselbe Schwelle wie im Wächter-Gate. Ein solcher Sprung ist eher ein
 * Fehler beim Einlesen als eine echte Korrektur.
 *
 * NICHT enthalten: die Pro-Kopf-Reihe. Sie braucht die Einwohnerzahl, und die
 * hat Ember mit der Formatumstellung im Juli 2026 aus diesem Datensatz genommen
 * (früher aus Verbrauch ÷ Verbrauch-pro-Kopf ableitbar). Sie steht deshalb in
 * `lib/country-comparison-percapita.ts` und bleibt unangetastet, bis wir eine
 * belegte Bevölkerungsquelle haben — mit ihrer eigenen, kürzeren Jahresachse,
 * damit niemand sie für gleich aktuell hält.
 */
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const CSV_URL =
  "https://files.ember-energy.org/public-downloads/generation/outputs/release_generation_yearly_global.csv";

/** Länder der Reihen — Ember-Name, Anzeigename, Fahne, Farbe. */
const LAENDER = [
  { ember: "Germany", label: "Deutschland", flag: "🇩🇪", colorToken: "--color-accent" },
  { ember: "China", label: "China", flag: "🇨🇳", colorToken: "--color-negative" },
  { ember: "United States", label: "USA", flag: "🇺🇸", colorToken: "--color-energy-gas" },
  { ember: "United Kingdom", label: "UK", flag: "🇬🇧", colorToken: "--color-energy-cat-renewable" },
  { ember: "India", label: "Indien", flag: "🇮🇳", colorToken: "--color-energy-lignite" },
  { ember: "France", label: "Frankreich", flag: "🇫🇷", colorToken: "--color-energy-nuclear" },
  { ember: "World", label: "Welt", flag: "🌍", colorToken: "--color-text-muted" },
];

/** Der Zubau-Chart zeigt eine kleinere Auswahl (ohne UK) in fester Reihenfolge. */
const ZUBAU_LAENDER = ["Germany", "China", "United States", "France", "India", "World"];

const ANTEIL_START = 2000;
const ZUBAU_START = 2010;

type Zelle = {
  anteil?: number;
  intensitaet?: number;
  kapWindSolar?: number;
  kapAtom?: number;
  /** Erzeugung der jeweiligen Quelle — nur als Beleg dafür, dass eine fehlende
   *  Kapazität wirklich „nichts am Netz" heißt und keine Lücke ist. */
  erzAtom?: number;
};

function parseCsv(text: string): Map<string, Map<number, Zelle>> {
  const zeilen = text.split("\n");
  const kopf = zeileSplitten(zeilen[0]);
  const idx = (name: string) => {
    const i = kopf.indexOf(name);
    if (i < 0) throw new Error(`Spalte fehlt: ${name} — Ember hat das Format geändert.`);
    return i;
  };
  const iArea = idx("Area");
  const iYear = idx("Year");
  const iSource = idx("Electricity source");
  const iShare = idx("Share of generation (%)");
  const iCap = idx("Capacity (GW)");
  const iGen = idx("Generation (TWh)");
  const iIntens = idx("Emissions intensity (gCO2e/kWh)");

  const gesucht = new Set(LAENDER.map((l) => l.ember));
  const out = new Map<string, Map<number, Zelle>>();
  for (let n = 1; n < zeilen.length; n++) {
    if (!zeilen[n]) continue;
    const f = zeileSplitten(zeilen[n]);
    const area = f[iArea];
    if (!gesucht.has(area)) continue;
    const jahr = Number(f[iYear]);
    if (!Number.isFinite(jahr)) continue;
    const quelle = f[iSource];
    const land = out.get(area) ?? new Map<number, Zelle>();
    const zelle = land.get(jahr) ?? {};
    if (quelle === "Wind and solar") {
      if (f[iShare]) zelle.anteil = Number(f[iShare]);
      if (f[iCap]) zelle.kapWindSolar = Number(f[iCap]);
    } else if (quelle === "Nuclear") {
      if (f[iCap]) zelle.kapAtom = Number(f[iCap]);
      if (f[iGen]) zelle.erzAtom = Number(f[iGen]);
    } else if (quelle === "Total generation") {
      if (f[iIntens]) zelle.intensitaet = Number(f[iIntens]);
    }
    land.set(jahr, zelle);
    out.set(area, land);
  }
  return out;
}

/** CSV-Zeile mit Anführungszeichen-Feldern (Ländernamen enthalten Kommas). */
function zeileSplitten(zeile: string): string[] {
  const out: string[] = [];
  let feld = "";
  let inAnfuehrung = false;
  for (let i = 0; i < zeile.length; i++) {
    const c = zeile[i];
    if (c === '"') {
      if (inAnfuehrung && zeile[i + 1] === '"') {
        feld += '"';
        i++;
      } else inAnfuehrung = !inAnfuehrung;
    } else if (c === "," && !inAnfuehrung) {
      out.push(feld);
      feld = "";
    } else feld += c;
  }
  out.push(feld.replace(/\r$/, ""));
  return out;
}

const rund1 = (n: number) => Math.round(n * 10) / 10;

function reihe(
  daten: Map<string, Map<number, Zelle>>,
  jahre: number[],
  lies: (z: Zelle | undefined) => number | undefined,
  laender = LAENDER,
): { label: string; flag: string; colorToken: string; values: number[] }[] {
  return laender.map((l) => {
    const land = daten.get(l.ember);
    if (!land) throw new Error(`Keine Zeilen für ${l.ember}`);
    const values = jahre.map((j) => {
      const wert = lies(land.get(j));
      if (wert === undefined) throw new Error(`${l.ember} ${j}: Wert fehlt`);
      return rund1(wert);
    });
    return { label: l.label, flag: l.flag, colorToken: l.colorToken, values };
  });
}

function serienLiteral(
  reihen: { label: string; flag: string; colorToken: string; values: number[] }[],
): string {
  return reihen
    .map(
      (r) =>
        `  { key: ${JSON.stringify(r.label)}, label: ${JSON.stringify(r.label)}, flag: "${r.flag}", ` +
        `colorToken: "${r.colorToken}", values: [${r.values.join(", ")}] },`,
    )
    .join("\n");
}

/** Meldet Abweichungen gegen den bisherigen Stand und stoppt bei großen Sprüngen. */
function vergleiche(alt: string, neuWerte: Map<string, number[]>): void {
  let auffaellig = 0;
  for (const [name, werte] of neuWerte) {
    const treffer = new RegExp(`key: "${name}"[^\\n]*?values: \\[([^\\]]*)\\]`).exec(alt);
    if (!treffer) continue;
    const alteWerte = treffer[1].split(",").map((s) => Number(s.trim()));
    for (let i = 0; i < Math.min(alteWerte.length, werte.length); i++) {
      const a = alteWerte[i];
      const n = werte[i];
      if (a === n) continue;
      const basis = Math.max(Math.abs(a), 1);
      const abw = Math.abs(n - a) / basis;
      if (abw > 0.3) {
        throw new Error(
          `${name}, Position ${i}: ${a} → ${n} (${Math.round(abw * 100)} %). Über der ` +
            `30-%-Grenze — eher ein Lesefehler als eine Revision. Bitte von Hand ansehen.`,
        );
      }
      auffaellig++;
    }
  }
  console.log(
    auffaellig === 0
      ? "Zurückliegende Jahre unverändert."
      : `${auffaellig} zurückliegende Werte hat Ember revidiert (alle unter 30 %).`,
  );
}

async function main() {
  const dateiArg = process.argv.indexOf("--datei");
  const text =
    dateiArg > -1
      ? readFileSync(process.argv[dateiArg + 1], "utf8")
      : await (async () => {
          console.log("Lade Ember-Datensatz …");
          const res = await fetch(CSV_URL);
          if (!res.ok) throw new Error(`Ember antwortet mit ${res.status}`);
          return res.text();
        })();

  const daten = parseCsv(text);
  const welt = daten.get("World");
  if (!welt) throw new Error("Keine Weltzeilen gefunden");
  const letztesJahr = Math.max(
    ...[...welt.entries()].filter(([, z]) => z.kapWindSolar !== undefined).map(([j]) => j),
  );
  console.log(`Datensatz reicht bis ${letztesJahr}.`);

  const anteilJahre: number[] = [];
  for (let j = ANTEIL_START; j <= letztesJahr; j++) anteilJahre.push(j);
  const zubauJahre: number[] = [];
  for (let j = ZUBAU_START; j <= letztesJahr; j++) zubauJahre.push(j);

  const anteil = reihe(daten, anteilJahre, (z) => z?.anteil);
  const intensitaet = reihe(daten, anteilJahre, (z) => z?.intensitaet);

  const zubauLaender = ZUBAU_LAENDER.map((e) => LAENDER.find((l) => l.ember === e)!);
  const zubau = zubauLaender.map((l) => {
    const land = daten.get(l.ember)!;
    // Eine fehlende Kapazität ist NICHT automatisch null: bei einer Quelle, die
    // im selben Jahr auch nichts erzeugt hat, heißt sie „nichts mehr am Netz"
    // (Deutschland seit dem Ausstieg — Ember lässt das Feld dann leer), sonst
    // ist sie eine Lücke im Datensatz und darf nicht als Rückbau durchgehen.
    const kapazitaet = (jahr: number, feld: "kapWindSolar" | "kapAtom"): number => {
      const zelle = land.get(jahr);
      const wert = zelle?.[feld];
      if (wert !== undefined) return wert;
      if (feld === "kapAtom" && zelle?.erzAtom === 0) return 0;
      throw new Error(
        `${l.ember} ${jahr}: Kapazität fehlt (${feld}) und die Erzeugung belegt keine Null.`,
      );
    };
    const diff = (feld: "kapWindSolar" | "kapAtom") =>
      zubauJahre.map((j) => rund1(kapazitaet(j, feld) - kapazitaet(j - 1, feld)));
    return { ...l, windsolar: diff("kapWindSolar"), nuclear: diff("kapAtom") };
  });

  const pfad = join(process.cwd(), "lib/country-comparison.ts");
  const alt = readFileSync(pfad, "utf8");
  const vergleichsWerte = new Map<string, number[]>();
  anteil.forEach((r) => vergleichsWerte.set(r.label, r.values));
  vergleiche(alt, vergleichsWerte);

  const jahresListe = (von: number, bis: number) => {
    const j: number[] = [];
    for (let y = von; y <= bis; y++) j.push(y);
    return j.join(", ");
  };

  const datei = `// AUTO-generiert aus Ember "Yearly Electricity Data" (CC BY 4.0) —
// erzeugt von scripts/ember-laender-sync.ts, nicht von Hand pflegen.
// Länder-Vergleich Stromsektor. Quelle: Ember (ember-energy.org), CC BY 4.0.
// CO₂-Intensität ist PRODUKTIONSbasiert (direkte Emissionen der Erzeugung im
// Land) — daher liegt z.B. Frankreich etwas höher als RTEs verbrauchs-/
// lebenszyklusbasierte eco2mix-Zahl. Rundung: kaufmännisch auf 1 Nachkommastelle.
//
// Die Pro-Kopf-Reihe steht in country-comparison-percapita.ts: sie braucht die
// Einwohnerzahl, die Ember mit der Formatumstellung (Juli 2026) aus diesem
// Datensatz genommen hat. Sie endet deshalb ein Jahr früher.

import type { LineSeries } from "../components/charts/LineChart";

export const COUNTRY_COMPARE_META = {
  source: "Ember – Yearly Electricity Data",
  sourceUrl: "https://ember-energy.org/data/yearly-electricity-data/",
  license: "CC BY 4.0",
  licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
  /** Letztes Jahr, für das der Datensatz vollständige Werte führt. */
  dataAsOf: "${letztesJahr}",
} as const;

// Namen ohne Jahreszahl: Sonst benennt jeder Datenlauf die Konstanten um und
// jede aufrufende Datei muss angefasst werden — ein Update, das Arbeit macht,
// unterbleibt irgendwann.
export const YEARS_ANTEIL: number[] = [${jahresListe(ANTEIL_START, letztesJahr)}];
export const YEARS_ZUBAU: number[] = [${jahresListe(ZUBAU_START, letztesJahr)}];

/** Anteil Wind + Solar an der Stromerzeugung (%). Statisch, mehrere Länder. */
export const WINDSOLAR_SHARE_SERIES: LineSeries[] = [
${serienLiteral(anteil)}
];

/** CO₂-Intensität der Stromerzeugung, produktionsbasiert (g CO₂/kWh). */
export const CO2_INTENSITY_COMPARE_SERIES: LineSeries[] = [
${serienLiteral(intensitaet)}
];

/**
 * Zubau je Land: Erneuerbare (Wind+Solar) vs. Atomkraft, GW/Jahr (Netto-Zubau
 * inkl. Rückbau), ${ZUBAU_START}–${letztesJahr}. Für den interaktiven Land-für-Land-Vergleich.
 */
export interface ZubauCountry {
  key: string;
  label: string;
  flag: string;
  colorToken: string;
  windsolar: number[];
  nuclear: number[];
}
export const ZUBAU_BY_COUNTRY: ZubauCountry[] = [
${zubau
  .map(
    (z) =>
      `  { key: ${JSON.stringify(z.label)}, label: ${JSON.stringify(z.label)}, flag: "${z.flag}", ` +
      `colorToken: "${z.colorToken}", windsolar: [${z.windsolar.join(", ")}], ` +
      `nuclear: [${z.nuclear.join(", ")}] },`,
  )
  .join("\n")}
];

export { PERCAPITA_SERIES, YEARS_PERCAPITA } from "./country-comparison-percapita";
`;

  writeFileSync(pfad, datei, "utf8");
  console.log(`lib/country-comparison.ts geschrieben (${anteilJahre.length} Jahre).`);
  console.log(
    `Welt ${letztesJahr}: Wind+Solar ${zubau.find((z) => z.label === "Welt")!.windsolar.at(-1)} GW, ` +
      `Atomkraft ${zubau.find((z) => z.label === "Welt")!.nuclear.at(-1)} GW.`,
  );
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
