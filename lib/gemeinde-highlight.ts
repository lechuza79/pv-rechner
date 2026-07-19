// Einleitungstext je Gemeinde: nicht die KPIs nacherzählen, sondern gemeinde-
// spezifische Fakten aneinanderreihen, die sich real unterscheiden — damit die
// ~11.000 Seiten nicht als Near-Duplicate durchgehen. Rein datengetrieben
// (Anlagen-Mix, Speicher, Pro-Kopf, Rang im Landkreis, Zubau-Trend), aktualisiert
// sich mit dem Monatslauf von selbst. SEO über Ort + Solar/Photovoltaik + Vergleich.

type SegRow = { segment: string; count: number; kwp: number };
type MiniAtlas = {
  solar: { total_count: number; total_kwp: number; by_segment: SegRow[] };
  speicher: { kwh_batterie: number };
};

const nf = (n: number) => Math.round(n).toLocaleString("de-DE");
const fmtMW = (kwp: number) =>
  kwp >= 1000 ? `${(kwp / 1000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} MW` : `${nf(kwp)} kW`;
const pct = (f: number) => Math.round(Math.abs(f) * 100);

function shareKwp(a: MiniAtlas, seg: string): number {
  const tot = a.solar.total_kwp || 1;
  return (a.solar.by_segment.find((s) => s.segment === seg)?.kwp ?? 0) / tot;
}
function roofKwp(a: MiniAtlas): number {
  return a.solar.by_segment.filter((s) => s.segment !== "freiflaeche").reduce((x, s) => x + s.kwp, 0);
}

/** Charakter-Satz: was diese Gemeinde ausmacht. Erst die markanten Ausreißer
 *  gegenüber dem Bundesland; wenn keiner heraussticht, die tatsächliche
 *  Mix-Zusammensetzung — die ist je Gemeinde verschieden, also nie textlos. */
function characterSentence(atlas: MiniAtlas, blAtlas: MiniAtlas, blName: string): string | null {
  const cs: { mag: number; text: string }[] = [];
  const ff = shareKwp(atlas, "freiflaeche");
  if (ff > 0.3 && ff > shareKwp(blAtlas, "freiflaeche") * 1.3)
    cs.push({ mag: ff, text: `Große Freiflächen-Solarparks prägen das Bild — ${pct(ff)} % der Leistung stehen auf der Fläche, deutlich mehr als im ${blName}-Schnitt.` });
  const pv = shareKwp(atlas, "privat_dach");
  if (pv > 0.55 && pv > shareKwp(blAtlas, "privat_dach") * 1.15)
    cs.push({ mag: pv, text: `Der Solarstrom kommt hier vor allem von privaten Dächern — ${pct(pv)} % der Leistung, überdurchschnittlich für ${blName}.` });
  const gw = shareKwp(atlas, "gewerbe_dach");
  if (gw > 0.35 && gw > shareKwp(blAtlas, "gewerbe_dach") * 1.3)
    cs.push({ mag: gw, text: `Auffällig viel Gewerbe-Solar — ${pct(gw)} % der Leistung steht auf gewerblichen Dächern, mehr als im ${blName}-Schnitt.` });
  const rk = roofKwp(atlas);
  const sd = rk > 0 ? atlas.speicher.kwh_batterie / rk : 0;
  const rkBl = roofKwp(blAtlas);
  const sdBl = rkBl > 0 ? blAtlas.speicher.kwh_batterie / rkBl : 0;
  if (sd > 0 && sdBl > 0 && sd > sdBl * 1.25)
    cs.push({ mag: (sd - sdBl) / sdBl, text: `Überdurchschnittlich viele Hausbatterien — je installiertem kWp Dachleistung steht hier mehr Speicher als im ${blName}-Schnitt.` });
  // Balkonkraftwerke bewusst KEIN Aufhänger: nach Stückzahl zahlreich, nach
  // Leistung irrelevant — hier zählt die Leistung.
  cs.sort((a, b) => b.mag - a.mag);
  if (cs[0]) return cs[0].text;

  // Fallback: die konkrete Zusammensetzung (je Gemeinde verschieden).
  const parts: string[] = [];
  if (pv >= 0.05) parts.push(`${pct(pv)} % private Dächer`);
  if (gw >= 0.05) parts.push(`${pct(gw)} % Gewerbe`);
  if (ff >= 0.05) parts.push(`${pct(ff)} % Freifläche`);
  if (parts.length >= 2) return `Der Solarstrom verteilt sich auf ${parts.join(", ")}.`;
  return null;
}

/** Rang nach installierter Solarleistung im Landkreis — je Gemeinde ein anderer. */
function rankSentence(name: string, kreisName: string | null, rank: number | null, total: number | null): string | null {
  if (!kreisName || rank == null || total == null || total < 3) return null;
  if (rank === 1) return `Damit ist ${name} die solarstärkste Gemeinde im ${kreisName} (von ${total} nach installierter Leistung).`;
  if (rank === total) return `Nach installierter Solarleistung steht ${name} damit an letzter Stelle im ${kreisName} (Platz ${total} von ${total}) — viel Luft nach oben.`;
  return `Nach installierter Solarleistung steht ${name} damit auf Platz ${rank} von ${total} im ${kreisName}.`;
}

/** Zubau-Dynamik: letztes volles Jahr gegen Vorjahr — je Gemeinde eigener Verlauf. */
function zubauSentence(byYear: { year: number; count: number }[], lastYear: number): string | null {
  const last = byYear.find((y) => y.year === lastYear)?.count ?? 0;
  const prev = byYear.find((y) => y.year === lastYear - 1)?.count ?? 0;
  if (last <= 0) return null;
  if (prev >= 3 && last > prev * 1.2)
    return `Der Zubau zieht an: ${nf(last)} neue Solaranlagen ${lastYear} nach ${nf(prev)} im Vorjahr.`;
  if (prev >= 3 && last < prev * 0.8)
    return `Der Zubau hat nachgelassen: ${nf(last)} neue Anlagen ${lastYear} nach ${nf(prev)} im Vorjahr.`;
  return `Zuletzt kamen ${nf(last)} Solaranlagen dazu (${lastYear}).`;
}

export function buildGemeindeHighlight(opts: {
  name: string;
  atlas: MiniAtlas;
  blAtlas: MiniAtlas;
  blName: string;
  perCapita: number | null;
  perCapitaVsBl: number | null;
  kreisName?: string | null;
  rankInKreis?: number | null;
  kreisTotal?: number | null;
  byYear?: { year: number; count: number }[];
  lastYear?: number;
}): string {
  const { name, atlas, blAtlas, blName, perCapita, perCapitaVsBl } = opts;

  const base = `In ${name} sind ${nf(atlas.solar.total_count)} Solaranlagen mit ${fmtMW(
    atlas.solar.total_kwp,
  )} Photovoltaik-Leistung in Betrieb.`;

  const character = characterSentence(atlas, blAtlas, blName);
  const rank = rankSentence(name, opts.kreisName ?? null, opts.rankInKreis ?? null, opts.kreisTotal ?? null);
  const zubau =
    opts.byYear && opts.lastYear != null ? zubauSentence(opts.byYear, opts.lastYear) : null;

  let perCap = "";
  if (perCapita !== null && perCapitaVsBl !== null) {
    perCap =
      perCapitaVsBl >= 0
        ? `Je Einwohner sind das ${nf(perCapita)} W Photovoltaik — ${pct(perCapitaVsBl)} % über dem ${blName}-Schnitt.`
        : `Je Einwohner sind das ${nf(perCapita)} W — ${pct(perCapitaVsBl)} % unter dem ${blName}-Schnitt, hier ist also noch viel Luft nach oben.`;
  }

  return [base, character, rank, zubau, perCap].filter(Boolean).join(" ");
}
