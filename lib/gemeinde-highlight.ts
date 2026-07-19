// Einleitungstext je Gemeinde: nicht die KPIs nacherzählen, sondern das
// Auffälligste herausgreifen — was diese Gemeinde vom Bundesland-Schnitt
// unterscheidet. Rein datengetrieben (Anlagen-Mix + Speicher + Pro-Kopf),
// aktualisiert sich also mit dem Monatslauf von selbst; SEO über Ort +
// Solaranlagen/Photovoltaik + Bundesland-Vergleich.

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

export function buildGemeindeHighlight(opts: {
  name: string;
  atlas: MiniAtlas;
  blAtlas: MiniAtlas;
  blName: string;
  perCapita: number | null;
  perCapitaVsBl: number | null;
}): string {
  const { name, atlas, blAtlas, blName, perCapita, perCapitaVsBl } = opts;

  const base = `In ${name} sind ${nf(atlas.solar.total_count)} Solaranlagen mit ${fmtMW(
    atlas.solar.total_kwp,
  )} Photovoltaik-Leistung in Betrieb.`;

  // Kandidaten: Abweichung ggü. dem Bundesland-Schnitt. Der stärkste gewinnt.
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
  // Balkonkraftwerke bewusst KEIN Aufhänger: nach Stückzahl zahlreich, nach
  // Leistung irrelevant — und für die Bewertung zählt die Leistung. Alle
  // Besonderheiten hier sind leistungsbasiert (kWp-Anteile), plus Speicher/Pro-Kopf.
  const rk = roofKwp(atlas);
  const sd = rk > 0 ? atlas.speicher.kwh_batterie / rk : 0;
  const rkBl = roofKwp(blAtlas);
  const sdBl = rkBl > 0 ? blAtlas.speicher.kwh_batterie / rkBl : 0;
  if (sd > 0 && sdBl > 0 && sd > sdBl * 1.25)
    cs.push({ mag: (sd - sdBl) / sdBl, text: `Überdurchschnittlich viele Hausbatterien — je installiertem kWp Dachleistung steht hier mehr Speicher als im ${blName}-Schnitt.` });

  cs.sort((a, b) => b.mag - a.mag);
  const highlight = cs[0]?.text;

  let perCap = "";
  if (perCapita !== null && perCapitaVsBl !== null) {
    perCap =
      perCapitaVsBl >= 0
        ? `Je Einwohner sind das ${nf(perCapita)} W Photovoltaik — ${pct(perCapitaVsBl)} % über dem ${blName}-Schnitt.`
        : `Je Einwohner sind das ${nf(perCapita)} W — ${pct(perCapitaVsBl)} % unter dem ${blName}-Schnitt, hier ist also noch viel Luft nach oben.`;
  }

  return [base, highlight, perCap].filter(Boolean).join(" ");
}
