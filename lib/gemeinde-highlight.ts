// Einleitungstext je Gemeinde: nicht die KPIs nacherzählen, sondern gemeinde-
// spezifische Fakten aneinanderreihen, die sich real unterscheiden — damit die
// ~11.000 Seiten nicht als Near-Duplicate durchgehen. Rein datengetrieben
// (Anlagen-Mix, Speicher, Pro-Kopf, Rang im Landkreis, Zubau-Trend), aktualisiert
// sich mit dem Monatslauf von selbst. SEO über Ort + Solar/Photovoltaik + Vergleich.

import { fmtAnteilProzent, fmtPvLeistung, fmtWattProKopf } from "./atlas-format";
import { ortPhrase } from "./atlas-orte";

type SegRow = { segment: string; count: number; kwp: number };
type MiniAtlas = {
  solar: { total_count: number; total_kwp: number; by_segment: SegRow[] };
  /** `by_segment` liefert die Zahl der BATTERIEN. Ohne sie liesse sich eine
   *  Dichte-Aussage nicht von "zwei Batterien in einem winzigen Ort"
   *  unterscheiden. Das Gesamt-`count` taugt dafuer nicht: es zaehlt den
   *  Pumpspeicher mit. */
  speicher: { kwh_batterie: number; by_segment?: { segment: string; count: number }[] };
};

function batterieCount(a: MiniAtlas): number {
  return (a.speicher.by_segment ?? [])
    .filter((s) => s.segment.startsWith("batterie"))
    .reduce((x, s) => x + s.count, 0);
}

function segCount(a: MiniAtlas, seg: string): number {
  return a.solar.by_segment.find((s) => s.segment === seg)?.count ?? 0;
}

const nf = (n: number) => Math.round(n).toLocaleString("de-DE");
const fmtMW = fmtPvLeistung;
/** Anteil als Prozentangabe. Das Vorzeichen trägt der Satz („über"/„unter"),
 *  deshalb hier immer der Betrag. Zahl und Zeichen kommen aus atlas-format. */
const pct = (f: number) => fmtAnteilProzent(Math.abs(f));

/** Ab so vielen Batterien traegt eine Aussage ueber die Speicherdichte. */
const MIN_BATTERIEN = 5;

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
  if (ff > 0.3 && ff > shareKwp(blAtlas, "freiflaeche") * 1.3) {
    // "Solarparks" im Plural stand auch dort, wo es genau eine Anlage ist.
    // Gezählt wird ausserdem, was das Register führt: ANLAGEN. Ein Park kann
    // als mehrere Einheiten gemeldet sein, deshalb hier nie von "Parks" reden.
    const n = segCount(atlas, "freiflaeche");
    const wie =
      n === 1
        ? "Eine große Freiflächen-Anlage prägt das Bild"
        : "Freiflächen-Anlagen prägen das Bild";
    cs.push({ mag: ff, text: `${wie} — ${pct(ff)} der Leistung stehen auf der Fläche, deutlich mehr als im ${blName}-Schnitt.` });
  }
  const pv = shareKwp(atlas, "privat_dach");
  if (pv > 0.55 && pv > shareKwp(blAtlas, "privat_dach") * 1.15)
    cs.push({ mag: pv, text: `Der Solarstrom kommt hier vor allem von privaten Dächern — ${pct(pv)} der Leistung, überdurchschnittlich für ${blName}.` });
  const gw = shareKwp(atlas, "gewerbe_dach");
  if (gw > 0.35 && gw > shareKwp(blAtlas, "gewerbe_dach") * 1.3)
    cs.push({ mag: gw, text: `Auffällig viel Gewerbe-Solar — ${pct(gw)} der Leistung steht auf gewerblichen Dächern, mehr als im ${blName}-Schnitt.` });
  const rk = roofKwp(atlas);
  const sd = rk > 0 ? atlas.speicher.kwh_batterie / rk : 0;
  const rkBl = roofKwp(blAtlas);
  const sdBl = rkBl > 0 ? blAtlas.speicher.kwh_batterie / rkBl : 0;
  // "Überdurchschnittlich VIELE Hausbatterien" war eine Mengen-Aussage über eine
  // DICHTE — bei drei Batterien in einem kleinen Ort schlug sie an und stimmte
  // trotzdem nicht. Jetzt sagt der Satz, was gemessen wurde, und es braucht
  // genug Batterien, damit die Dichte etwas trägt.
  if (sd > 0 && sdBl > 0 && sd > sdBl * 1.25 && batterieCount(atlas) >= MIN_BATTERIEN)
    cs.push({ mag: (sd - sdBl) / sdBl, text: `Überdurchschnittlich viel Batteriespeicher — je installiertem kWp Dachleistung steht hier mehr als im ${blName}-Schnitt.` });
  // Balkonkraftwerke bewusst KEIN Aufhänger: nach Stückzahl zahlreich, nach
  // Leistung irrelevant — hier zählt die Leistung.
  cs.sort((a, b) => b.mag - a.mag);
  if (cs[0]) return cs[0].text;

  // Fallback: die konkrete Zusammensetzung (je Gemeinde verschieden).
  const parts: string[] = [];
  if (pv >= 0.05) parts.push(`${pct(pv)} private Dächer`);
  if (gw >= 0.05) parts.push(`${pct(gw)} Gewerbe`);
  if (ff >= 0.05) parts.push(`${pct(ff)} Freifläche`);
  if (parts.length >= 2) return `Der Solarstrom verteilt sich auf ${parts.join(", ")}.`;
  return null;
}

/**
 * Gattung aus der amtlichen Bezeichnung — eine Stadt als "Gemeinde" zu
 * bezeichnen ist auf ihrer eigenen Seite falsch, und zwar sichtbar falsch.
 * Alles, was keine der bekannten Formen trägt, bleibt "Kommune" statt zu raten.
 */
function gattung(bezeichnung: string | null | undefined): string {
  const b = (bezeichnung ?? "").toLowerCase();
  if (b.includes("stadt")) return "Stadt";
  if (b.includes("markt")) return "Marktgemeinde";
  if (b.includes("gemeinde")) return "Gemeinde";
  return "Kommune";
}

/** Rang nach installierter Solarleistung im Landkreis — je Gemeinde ein anderer. */
function rankSentence(
  name: string,
  kreisName: string | null,
  rank: number | null,
  total: number | null,
  bezeichnung?: string | null,
): string | null {
  if (!kreisName || rank == null || total == null || total < 3) return null;
  const wo = ortPhrase({ name: kreisName });
  if (rank === 1)
    return `Damit ist ${name} die solarstärkste ${gattung(bezeichnung)} ${wo} (von ${total} nach installierter Leistung).`;
  if (rank === total) return `Nach installierter Solarleistung steht ${name} damit an letzter Stelle ${wo} (Platz ${total} von ${total}) — viel Luft nach oben.`;
  return `Nach installierter Solarleistung steht ${name} damit auf Platz ${rank} von ${total} ${wo}.`;
}

/** Zubau-Dynamik: letztes volles Jahr gegen Vorjahr — je Gemeinde eigener Verlauf. */
function zubauSentence(byYear: { year: number; count: number }[], lastYear: number): string | null {
  const last = byYear.find((y) => y.year === lastYear)?.count ?? 0;
  const prev = byYear.find((y) => y.year === lastYear - 1)?.count ?? 0;
  if (last <= 0) return null;
  // Kleine Gemeinden bauen einzelne Anlagen zu — "1 neue Anlagen" stand real auf
  // der Seite, solange der Satz nur die Mehrzahl kannte.
  const eins = last === 1;
  const anlagen = (wort: string) => `${nf(last)} ${eins ? `neue ${wort}` : `neue ${wort}n`}`;
  if (prev >= 3 && last > prev * 1.2)
    return `Der Zubau zieht an: ${anlagen("Solaranlage")} ${lastYear} nach ${nf(prev)} im Vorjahr.`;
  if (prev >= 3 && last < prev * 0.8)
    return `Der Zubau hat nachgelassen: ${anlagen("Anlage")} ${lastYear} nach ${nf(prev)} im Vorjahr.`;
  return eins
    ? `Zuletzt kam eine Solaranlage dazu (${lastYear}).`
    : `Zuletzt kamen ${nf(last)} Solaranlagen dazu (${lastYear}).`;
}

export function buildGemeindeHighlight(opts: {
  name: string;
  atlas: MiniAtlas;
  blAtlas: MiniAtlas;
  blName: string;
  perCapita: number | null;
  perCapitaVsBl: number | null;
  /** Amtliche Bezeichnung der Gemeinde (Stadt/Markt/Gemeinde) für den Rangsatz. */
  bezeichnung?: string | null;
  kreisName?: string | null;
  rankInKreis?: number | null;
  kreisTotal?: number | null;
  byYear?: { year: number; count: number }[];
  lastYear?: number;
}): string {
  const { name, atlas, blAtlas, blName, perCapita, perCapitaVsBl } = opts;

  // "sind 1 Solaranlagen" — derselbe Fehler wie eine falsche Einheit, nur in
  // Worten. Kleine Gemeinden mit einer einzigen Anlage gibt es wirklich.
  const eineAnlage = atlas.solar.total_count === 1;
  const base = eineAnlage
    ? `In ${name} ist eine Solaranlage mit ${fmtMW(atlas.solar.total_kwp)} Photovoltaik-Leistung in Betrieb.`
    : `In ${name} sind ${nf(atlas.solar.total_count)} Solaranlagen mit ${fmtMW(
        atlas.solar.total_kwp,
      )} Photovoltaik-Leistung in Betrieb.`;

  const character = characterSentence(atlas, blAtlas, blName);
  const rank = rankSentence(name, opts.kreisName ?? null, opts.rankInKreis ?? null, opts.kreisTotal ?? null, opts.bezeichnung);
  const zubau =
    opts.byYear && opts.lastYear != null ? zubauSentence(opts.byYear, opts.lastYear) : null;

  let perCap = "";
  if (perCapita !== null && perCapitaVsBl !== null) {
    // Ein Solarpark in einem 700-Einwohner-Ort ergibt "4.935 % über dem
    // Schnitt". Rechnerisch richtig, als Satz unlesbar — ab dem Dreifachen
    // sagt der Text das Vielfache, das liest sich als Größenordnung.
    const abstand =
      perCapitaVsBl >= 3
        ? `das ${nf(perCapitaVsBl + 1)}-fache des ${blName}-Schnitts`
        : `${pct(perCapitaVsBl)} über dem ${blName}-Schnitt`;
    perCap =
      perCapitaVsBl >= 0
        ? `Je Einwohner sind das ${fmtWattProKopf(perCapita)} Photovoltaik — ${abstand}.`
        : `Je Einwohner sind das ${fmtWattProKopf(perCapita)} — ${pct(perCapitaVsBl)} unter dem ${blName}-Schnitt, hier ist also noch viel Luft nach oben.`;
  }

  return [base, character, rank, zubau, perCap].filter(Boolean).join(" ");
}
