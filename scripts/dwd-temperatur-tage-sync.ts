/**
 * Erzeugt `lib/temperatur-tage.ts`: die Tagesmitteltemperatur als Mittel über
 * die DWD-Klimastationen, die auch Strahlung messen (dieselbe Stationsmenge wie
 * lib/strahlung-tage.ts), 1991 bis zum letzten vollen Jahr, in Zehntelgrad.
 *
 * Wofür: Das Heizkosten-Rennen (Gasheizung gegen Wärmepumpe) verteilt den
 * Jahres-Heizbedarf nach Gradtagen auf die Tage — ein kalter Januar ist steil,
 * ein milder flach, und kein Winter gleicht dem anderen. Die MENGE kommt aus
 * dem Wärmepumpen-Rechner, dieser Datensatz liefert nur die FORM und die
 * Jahr-zu-Jahr-Abweichung (normiert auf das Fenster-Mittel).
 *
 * Datensatz: DWD CDC, observations_germany/climate/daily/kl/historical — je
 * Station eine Datei, Spalte TMK = Tagesmittel der Lufttemperatur in °C,
 * Fehlwert −999. Lizenz CC BY 4.0 (Nutzungsbedingungen CDC-OpenData).
 *
 * Aufruf: npm run temperatur:tage   (--bis <jahr> begrenzt, --trocken schreibt nicht)
 *
 * Ein Tag zählt nur mit mindestens MIN_STATIONEN gültigen Werten; fehlt ein Tag
 * ganz, steht null in der Reihe und der Verteiler fällt für dieses Jahr auf
 * gleiche Gewichte zurück — nichts Erfundenes.
 */
import { writeFileSync } from "fs";
import { join } from "path";
import { Open } from "unzipper";

const BASIS_KL = "https://opendata.dwd.de/climate_environment/CDC/observations_germany/climate/daily/kl/historical";
const BASIS_ST = "https://opendata.dwd.de/climate_environment/CDC/observations_germany/climate/daily/solar";
const ERSTES_JAHR = 1991;
const MIN_STATIONEN = 5;
const ZIEL = join(process.cwd(), "lib", "temperatur-tage.ts");

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
function tageImJahr(jahr: number): number {
  return (jahr % 4 === 0 && jahr % 100 !== 0) || jahr % 400 === 0 ? 366 : 365;
}

/** Liest TMK je Tag aus einer Stationsdatei; liefert Map JJJJMMTT → °C. */
export function parseStation(text: string): Map<string, number> {
  const out = new Map<string, number>();
  const zeilen = text.split(/\r?\n/);
  const kopf = zeilen[0].split(";").map((s) => s.trim());
  const iDatum = kopf.indexOf("MESS_DATUM"), iTmk = kopf.indexOf("TMK");
  if (iDatum < 0 || iTmk < 0) throw new Error("Spalten MESS_DATUM/TMK fehlen");
  for (const z of zeilen.slice(1)) {
    const f = z.split(";");
    if (f.length <= iTmk) continue;
    const v = Number(f[iTmk]);
    if (!Number.isFinite(v) || v <= -99) continue; // −999 = Fehlwert
    out.set(f[iDatum].trim(), v);
  }
  return out;
}

async function main() {
  const trocken = process.argv.includes("--trocken");
  const bis = Number(arg("--bis") ?? new Date().getFullYear() - 1);
  // Stationsmenge: die Strahlungsstationen — dieselbe Auswahl wie in
  // lib/strahlung-tage.ts, damit beide Wetterreihen denselben Raum meinen.
  const stHtml = await (await fetch(`${BASIS_ST}/`)).text();
  const solarIds = new Set([...stHtml.matchAll(/tageswerte_ST_(\d+)_row\.zip/g)].map((m) => m[1]));
  const klHtml = await (await fetch(`${BASIS_KL}/`)).text();
  const dateien = [...klHtml.matchAll(/tageswerte_KL_(\d+)_(\d{8})_(\d{8})_hist\.zip/g)]
    .filter((m) => solarIds.has(m[1]) && Number(m[3].slice(0, 4)) >= bis)
    .map((m) => m[0]);
  if (dateien.length < 20) throw new Error(`Nur ${dateien.length} Stationsdateien gefunden — Listing prüfen`);
  console.log(`${dateien.length} Stationen (Strahlungsstationen mit Klimareihe bis ${bis})`);

  const summe = new Map<string, number>();
  const zahl = new Map<string, number>();
  for (const datei of dateien) {
    const res = await fetch(`${BASIS_KL}/${datei}`);
    if (!res.ok) throw new Error(`${datei}: HTTP ${res.status}`);
    const zip = await Open.buffer(Buffer.from(await res.arrayBuffer()));
    const produkt = zip.files.find((f) => /^produkt_klima_tag_.*\.txt$/.test(f.path));
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

  const reihe: { jahr: number; tage: (number | null)[]; luecken: number }[] = [];
  for (let jahr = ERSTES_JAHR; jahr <= bis; jahr++) {
    const n = tageImJahr(jahr);
    const tage: (number | null)[] = [];
    let luecken = 0;
    for (let t = 0; t < n; t++) {
      const d = new Date(Date.UTC(jahr, 0, 1 + t));
      const key = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
      const k = zahl.get(key) ?? 0;
      if (k >= MIN_STATIONEN) tage.push(Math.round(((summe.get(key) ?? 0) / k) * 10));
      else { tage.push(null); luecken++; }
    }
    if (jahr === bis && luecken > 31) { console.log(`${jahr}: noch unvollständig (${luecken} Tage ohne Wert) — bleibt draußen`); break; }
    reihe.push({ jahr, tage, luecken });
    const mittel = tage.filter((x): x is number => x !== null).reduce((a, b) => a + b, 0) / (10 * (n - luecken));
    console.log(`${jahr}: Ø ${mittel.toFixed(1)} °C, ${luecken} Lücken`);
  }
  if (reihe.length === 0) throw new Error("Keine Jahre gelesen");

  const heute = new Date().toISOString().slice(0, 10);
  const datei = `// AUTO-generiert aus den DWD-Stationstageswerten der Lufttemperatur (CC BY 4.0) —
// erzeugt von scripts/dwd-temperatur-tage-sync.ts, nicht von Hand pflegen.
//
// Je Kalenderjahr das Tagesmittel der Lufttemperatur in ZEHNTELGRAD Celsius
// (1. Januar … 31. Dezember), ungewichtetes Mittel über die DWD-Klimastationen
// mit Strahlungsmessung (mindestens ${MIN_STATIONEN} gültige Werte); null = kein Wert.
// Quelle: DWD Climate Data Center (CDC), Tageswerte Klima (TMK), unsere
// Ableitung (Stationsmittel).
//
// Wofür: die FORM des Heizens im Jahr (Gradtage je Tag) und die Abweichung der
// Jahre voneinander — die Menge kommt aus dem Wärmepumpen-Rechner.

export const TEMPERATUR_TAGE_META = {
  quelle: "DWD Climate Data Center (CDC), Tageswerte Klima, Stationsmittel",
  einheit: "Zehntelgrad Celsius",
  erzeugt: "${heute}",
  ersteJahr: ${reihe[0].jahr},
  letztesJahr: ${reihe[reihe.length - 1].jahr},
  stationen: ${dateien.length},
} as const;

export const TEMPERATUR_TAGE: { jahr: number; tage: (number | null)[] }[] = [
${reihe.map((r) => `  { jahr: ${r.jahr}, tage: [${r.tage.map((x) => (x === null ? "null" : String(x))).join(",")}] },`).join("\n")}
];
`;
  if (trocken) { console.log("(trocken — nichts geschrieben)"); return; }
  writeFileSync(ZIEL, datei);
  console.log(`geschrieben: ${ZIEL} (${reihe[0].jahr}–${reihe[reihe.length - 1].jahr}, täglich)`);
}

if (process.argv[1] && /dwd-temperatur-tage-sync/.test(process.argv[1])) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
