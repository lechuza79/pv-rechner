/**
 * Erzeugt `lib/strahlung-tage.ts`: die Globalstrahlung je TAG als Mittel über
 * die DWD-Strahlungsstationen (Wh/m²), 1991 bis zum letzten vollen Jahr.
 *
 * Wofür: Das Amortisations-Rennen verteilt den Monatsnutzen der Anlage nach
 * der Tagesstrahlung auf die Tage des Monats — die Kurve bekommt damit die
 * Textur echter Tage (Regenwoche flach, Hochdrucklage steil), ohne dass das
 * Geld je Monat vom Rechner abweicht. Die MENGE kommt weiter aus den
 * Monatsrastern (lib/strahlungsjahre.ts), dieser Datensatz liefert nur die
 * FORM innerhalb des Monats. Deshalb ist das ungewichtete Stationsmittel gut
 * genug: Es ist kein Flächenmittel, aber die Tag-zu-Tag-Form über Deutschland
 * ist an 30–50 Stationen dieselbe wie im Raster.
 *
 * Datensatz: DWD CDC, observations_germany/climate/daily/solar — je Station
 * eine Datei, Spalte FG_STRAHL = Tagessumme Globalstrahlung in J/cm², Fehlwert
 * −999. Lizenz CC BY 4.0 (Nutzungsbedingungen CDC-OpenData, Stand Mai 2024).
 * 1 J/cm² = 10 kJ/m² = 2,7778 Wh/m².
 *
 * Aufruf: npm run strahlung:tage   (--bis <jahr> begrenzt, --trocken schreibt nicht)
 *
 * Ein Tag zählt nur mit mindestens MIN_STATIONEN gültigen Werten; fehlt ein Tag
 * ganz, steht 0 in der Reihe und der Verteiler fällt für diesen Monat auf
 * gleiche Tagesgewichte zurück (lib/kostenrennen-tage.ts) — nichts Erfundenes.
 */
import { writeFileSync } from "fs";
import { join } from "path";
import { Open } from "unzipper";

const BASIS = "https://opendata.dwd.de/climate_environment/CDC/observations_germany/climate/daily/solar";
const ERSTES_JAHR = 1991;
const MIN_STATIONEN = 5;
const ZIEL = join(process.cwd(), "lib", "strahlung-tage.ts");
const J_CM2_ZU_WH_M2 = 10_000 / 3_600;

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function tageImJahr(jahr: number): number {
  return (jahr % 4 === 0 && jahr % 100 !== 0) || jahr % 400 === 0 ? 366 : 365;
}

/** Tag im Jahr (0-basiert) aus JJJJMMTT. */
export function tagImJahr(datum: string): { jahr: number; tag: number } {
  const jahr = Number(datum.slice(0, 4)), monat = Number(datum.slice(4, 6)), tag = Number(datum.slice(6, 8));
  const d = Date.UTC(jahr, monat - 1, tag) - Date.UTC(jahr, 0, 1);
  return { jahr, tag: Math.round(d / 86_400_000) };
}

async function stationsliste(): Promise<string[]> {
  const res = await fetch(`${BASIS}/`);
  if (!res.ok) throw new Error(`Stationsliste: HTTP ${res.status}`);
  const html = await res.text();
  return [...html.matchAll(/href="(tageswerte_ST_\d+_row\.zip)"/g)].map((m) => m[1]);
}

/** Liest FG_STRAHL je Tag aus einer Stationsdatei; liefert Map JJJJMMTT → J/cm². */
export function parseStation(text: string): Map<string, number> {
  const out = new Map<string, number>();
  const zeilen = text.split(/\r?\n/);
  const kopf = zeilen[0].split(";").map((s) => s.trim());
  const iDatum = kopf.indexOf("MESS_DATUM"), iFg = kopf.indexOf("FG_STRAHL");
  if (iDatum < 0 || iFg < 0) throw new Error("Spalten MESS_DATUM/FG_STRAHL fehlen");
  for (const z of zeilen.slice(1)) {
    const f = z.split(";");
    if (f.length <= iFg) continue;
    const v = Number(f[iFg]);
    if (!Number.isFinite(v) || v < 0) continue; // −999 = Fehlwert
    out.set(f[iDatum].trim(), v);
  }
  return out;
}

async function main() {
  const trocken = process.argv.includes("--trocken");
  const bis = Number(arg("--bis") ?? new Date().getFullYear() - 1);
  const dateien = await stationsliste();
  if (dateien.length < 20) throw new Error(`Nur ${dateien.length} Stationsdateien gefunden — Listing prüfen`);
  console.log(`${dateien.length} Stationen`);

  // Summe und Zähler je Tag
  const summe = new Map<string, number>();
  const zahl = new Map<string, number>();
  for (const datei of dateien) {
    const res = await fetch(`${BASIS}/${datei}`);
    if (!res.ok) throw new Error(`${datei}: HTTP ${res.status}`);
    const zip = await Open.buffer(Buffer.from(await res.arrayBuffer()));
    const produkt = zip.files.find((f) => /^produkt_st_tag_.*\.txt$/.test(f.path));
    if (!produkt) { console.log(`${datei}: keine Produktdatei`); continue; }
    const werte = parseStation((await produkt.buffer()).toString("latin1"));
    let n = 0;
    for (const [datum, v] of werte) {
      const jahr = Number(datum.slice(0, 4));
      if (jahr < ERSTES_JAHR || jahr > bis) continue;
      summe.set(datum, (summe.get(datum) ?? 0) + v);
      zahl.set(datum, (zahl.get(datum) ?? 0) + 1);
      n++;
    }
    console.log(`${datei}: ${n} Tage`);
  }

  const reihe: { jahr: number; tage: number[]; stationenMin: number; luecken: number }[] = [];
  for (let jahr = ERSTES_JAHR; jahr <= bis; jahr++) {
    const n = tageImJahr(jahr);
    const tage: number[] = [];
    let stationenMin = Infinity, luecken = 0;
    for (let t = 0; t < n; t++) {
      const d = new Date(Date.UTC(jahr, 0, 1 + t));
      const key = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
      const k = zahl.get(key) ?? 0;
      if (k >= MIN_STATIONEN) {
        tage.push(Math.round(((summe.get(key) ?? 0) / k) * J_CM2_ZU_WH_M2));
        stationenMin = Math.min(stationenMin, k);
      } else {
        tage.push(0);
        luecken++;
      }
    }
    // Das letzte Jahr ist erst vollständig, wenn der Dezember da ist.
    if (jahr === bis && luecken > 31) { console.log(`${jahr}: noch unvollständig (${luecken} Tage ohne Wert) — bleibt draußen`); break; }
    reihe.push({ jahr, tage, stationenMin: Number.isFinite(stationenMin) ? stationenMin : 0, luecken });
    console.log(`${jahr}: Σ ${Math.round(tage.reduce((a, b) => a + b, 0) / 1000)} kWh/m², min. ${stationenMin} Stationen, ${luecken} Lücken`);
  }
  if (reihe.length === 0) throw new Error("Keine Jahre gelesen");

  const heute = new Date().toISOString().slice(0, 10);
  const datei = `// AUTO-generiert aus den DWD-Stationstageswerten der Globalstrahlung (CC BY 4.0) —
// erzeugt von scripts/dwd-strahlung-tage-sync.ts, nicht von Hand pflegen.
//
// Je Kalenderjahr die Tagessummen der Globalstrahlung in Wh/m² (1. Januar …
// 31. Dezember), ungewichtetes Mittel über die DWD-Strahlungsstationen mit
// gültigem Wert (mindestens ${MIN_STATIONEN}); 0 = kein Wert. Quelle: DWD Climate Data
// Center (CDC), Tageswerte Solar (FG_STRAHL), unsere Ableitung (Stationsmittel).
//
// Wofür: NUR die Form innerhalb eines Monats — der Verteiler im Amortisations-
// Rennen legt den Monatsnutzen nach diesen Tagesgewichten auf die Tage. Die
// Menge je Monat kommt aus den Monatsrastern (lib/strahlungsjahre.ts).

export const STRAHLUNG_TAGE_META = {
  quelle: "DWD Climate Data Center (CDC), Tageswerte Solar, Stationsmittel",
  einheit: "Wh/m²",
  erzeugt: "${heute}",
  ersteJahr: ${reihe[0].jahr},
  letztesJahr: ${reihe[reihe.length - 1].jahr},
  stationen: ${dateien.length},
} as const;

export const STRAHLUNG_TAGE: { jahr: number; tage: number[] }[] = [
${reihe.map((r) => `  { jahr: ${r.jahr}, tage: [${r.tage.join(",")}] },`).join("\n")}
];
`;
  if (trocken) { console.log("(trocken — nichts geschrieben)"); return; }
  writeFileSync(ZIEL, datei);
  console.log(`geschrieben: ${ZIEL} (${reihe[0].jahr}–${reihe[reihe.length - 1].jahr}, täglich)`);
}

if (process.argv[1] && /dwd-strahlung-tage-sync/.test(process.argv[1])) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
