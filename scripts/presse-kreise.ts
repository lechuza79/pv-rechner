/**
 * Pressemitteilungen je Landkreis ENTWERFEN — verschickt wird ausschließlich über
 * scripts/aussendung.ts (`npm run presse:versand`), das jede Mail vor dem
 * Senden in der Datenbank vermerkt.
 *
 *   npx tsx scripts/presse-kreise.ts [--beispiel <Kreisname>] [--nur-kreis <Schlüssel>]
 *
 * Übernommen am 07.10.2026 aus einem ungetrackten Skript, mit dem am 29./30.09.
 * die ersten 138 Mitteilungen hinausgingen. Der Text ist der damals Zeile für
 * Zeile abgenommene; die Regeln dazu stehen in den Kommentaren unten. Das
 * eigene Senden des alten Skripts ist entfernt — es schrieb sein Protokoll in
 * einen temporären Ordner, und der wurde aufgeräumt.
 *
 * Ergebnis: presse-kreise-mails.json im selben Verzeichnis wie die Eingaben,
 * je Mail { an, titel, kreise, charge, anlass, betreff, text }. Diese Datei ist
 * die Eingabe von `npm run presse:versand`.
 */
import fs from "node:fs";
import { resolve } from "node:path";
import { GROESSENKLASSEN, spanneVon } from "../lib/gemeindegroesse";
import { MAIN_CHECKOUT } from "./lib/contact-v2-config";
const SPANNE = (slug: string) => { const k = GROESSENKLASSEN.find((x) => x.slug === slug); return k ? ` (${spanneVon(k).replace("–", " bis ")} Einwohner)` : ""; };

// Inputs and output live in the main checkout's cache, never in a session's
// temporary folder: that is where the September protocol was lost.
const S = process.env.PRESSE_KREISE_DIR ?? resolve(MAIN_CHECKOUT, "scripts/.cache/presse-kreise");
const EINGABEN = ["hooks.json", "kreise.json", "laender.json", "foerderung.json", "weit.json", "wind.json"];
const fehlen = EINGABEN.filter((d) => !fs.existsSync(`${S}/${d}`));
if (fehlen.length) {
  console.error(
    `Es fehlen Eingaben in ${S}: ${fehlen.join(", ")}.\n` +
    "Sie wurden im September von Hand in einer Sitzung erzeugt und sind mit deren temporärem Ordner verloren " +
    "gegangen. Vor dem nächsten Schub müssen sie neu gebaut werden — aus den Ranglisten (hooks, weit), dem " +
    "Presse-Katalog (kreise), den Landesnamen, dem Förderkatalog und den Windgemeinden.",
  );
  process.exit(1);
}
type Hook = { zeile?: string; region_id: string; name: string; platz: number; von: number; abgeschnitten: boolean; seite_ok: boolean; seite_url: string; rangliste_url: string };
type Medium = { domain: string; titel: string; mail: string; pruefung: string; mail_eigen: boolean };
const hooks: Hook[] = JSON.parse(fs.readFileSync(`${S}/hooks.json`, "utf8")).filter((h: Hook) => h.platz > 0 && h.seite_ok)
  // "Leichlingen (Rheinland)" -> "Leichlingen": the official suffix reads odd in a press text (operator, 29.09.2026)
  .map((h: Hook) => ({ ...h, name: h.name.replace(/\/.*$/, "").replace(/\s*\([^)]*\)$/, "") }));
const kreise: Record<string, { name: string; medien: Medium[] }> = JSON.parse(fs.readFileSync(`${S}/kreise.json`, "utf8"));
const laender: Record<string, string> = JSON.parse(fs.readFileSync(`${S}/laender.json`, "utf8"));
const foerderung: Record<string, { tech: string; status: string; name: string }> = JSON.parse(fs.readFileSync(`${S}/foerderung.json`, "utf8"));

const MESS: Record<string, string> = {
  "solarleistung-je-einwohner": "bei der privaten Solarleistung auf den Dächern je Einwohner",
  "balkonkraftwerke-je-einwohner": "bei Balkonkraftwerken je 1.000 Einwohner",
  "speicherkapazitaet-je-einwohner": "bei der privaten Speicherkapazität je Einwohner",
  "speicher-je-dachanlage": "bei Batteriespeichern je 100 private Dachanlagen",
  "zubau-3-jahre-je-einwohner": "beim Solar-Zubau auf privaten Dächern je Einwohner seit Ende 2023",
  "zubau-5-jahre-je-einwohner": "beim Solar-Zubau auf privaten Dächern je Einwohner seit Ende 2021",
};
const KLASSE: Record<string, string> = {
  doerfer: "Dörfern", "kleine-gemeinden": "kleinen Gemeinden", "gemeinden-und-kleinstaedte": "Gemeinden und Kleinstädten",
  "mittelgrosse-staedte": "mittelgroßen Städten", grossstaedte: "Großstädten",
};
// "Kreis Rhein-Sieg-Kreis" -> "Rhein-Sieg-Kreis"; the registry prefixes every district.
const kreisAnzeige = (n: string) => n.replace(/^(Landkreis|Kreis) (?=.*[Kk]reis)/, "");
const istKreisfrei = (n: string) => !/^(Landkreis|Kreis|Regionalverband|Region|Städteregion)\b|[Kk]reis/.test(n);
const imKreis = (n: string) => {
  const d = kreisAnzeige(n);
  if (/^(Städteregion|Region) /.test(d)) return `in der ${d}`;
  if (/^(Landkreis|Kreis|Regionalverband)\b|[Kk]reis/.test(d)) return `im ${d.replace(/er Kreis$/, "en Kreis")}`;
  return `in ${d}`;
};

// Rank of the same town in the same metric and size class across its Land and Germany
// (measured from the live ranking pages, totals from "Plätze 1–200 von N").
type Weit = { rid: string; metrik: string; land: number; landVon: number; de: number; deVon: number };
const weitRang = new Map<string, Weit>((JSON.parse(fs.readFileSync(`${S}/weit.json`, "utf8")) as Weit[]).map((w) => [`${w.rid}|${w.metrik}`, w]));
const fmtZahl = (n: number) => n.toLocaleString("de-DE");
type Staerke = { ebene: "de" | "land"; platz: number; von: number; wo: string; stufe: number };
/** The strongest ranking beyond the district, or null. Order: German #1, Land #1, German top 10. */
function staerke(h: Hook): Staerke | null {
  const metrik = h.rangliste_url.split("?")[0].split("/ranking/")[1].split("/")[0];
  const w = weitRang.get(`${h.region_id}|${metrik}`);
  if (!w) return null;
  const land = laender[h.region_id.slice(0, 2)];
  if (w.de === 1) return { ebene: "de", platz: 1, von: w.deVon, wo: "bundesweit", stufe: 3 };
  if (w.land === 1 && w.landVon >= 5) return { ebene: "land", platz: 1, von: w.landVon, wo: `in ${land}`, stufe: 2 };
  if (w.de > 0 && w.de <= 10) return { ebene: "de", platz: w.de, von: w.deVon, wo: "bundesweit", stufe: 1 };
  return null;
}
const metrikVon = (h: Hook) => h.rangliste_url.split("?")[0].split("/ranking/")[1].split("/")[0];
const klasseVon = (h: Hook) => h.rangliste_url.split("?")[0].split("/ranking/")[1].split("/")[1];

function satz(h: Hook): string | null {
  const [metrik, klasse, ...ort] = h.rangliste_url.split("?")[0].split("/ranking/")[1].split("/");
  if (!MESS[metrik] || !KLASSE[klasse]) return null;
  const scope = ort.length === 2 ? imKreis(kreise[h.region_id.slice(0, 5)]?.name ?? "") : ort.length === 1 ? `in ${laender[h.region_id.slice(0, 2)]}` : "bundesweit";
  const w = weitRang.get(`${h.region_id}|${metrik}`);
  const von = ort.length === 1 && w ? w.landVon : ort.length === 0 && w ? w.deVon : h.abgeschnitten ? 0 : h.von;
  const gruppe = (von ? `unter den ${fmtZahl(von)} ${KLASSE[klasse]}` : `unter den ${KLASSE[klasse]}`) + SPANNE(klasse);
  let rang = h.platz === 1 ? `Das ist der Spitzenwert ${gruppe} ${scope}.` : `Damit liegt ${h.name} auf Platz ${h.platz} ${gruppe} ${scope}.`;
  if (w) {
    const land = laender[h.region_id.slice(0, 2)];
    const mehr: string[] = [];
    if (ort.length === 2 && w.land === 1 && w.landVon >= 5) mehr.push(`Auch in ganz ${land} ist das der Spitzenwert unter ${fmtZahl(w.landVon)} ${KLASSE[klasse]}`);
    if (ort.length === 2 && w.land > 1 && w.land <= 3 && !(w.de > 0 && w.de <= 10)) mehr.push(`In ganz ${land} bedeutet das Platz ${w.land} von ${fmtZahl(w.landVon)} ${KLASSE[klasse]}`);
    if (ort.length >= 1 && w.de > 0 && w.de <= 10) mehr.push(`Bundesweit ${w.de === 1 ? "ist das sogar der Spitzenwert unter" : `bedeutet das Platz ${w.de} von`} ${fmtZahl(w.deVon)} ${KLASSE[klasse]}`);
    if (ort.length === 2 && w.de > 0 && w.de <= 10 && !mehr.some((m) => m.startsWith("Bundesweit"))) mehr.push(`Bundesweit ${w.de === 1 ? "ist das sogar der Spitzenwert unter" : `bedeutet das Platz ${w.de} von`} ${fmtZahl(w.deVon)} ${KLASSE[klasse]}`);
    if (mehr.length) rang += " " + mehr.map((m, i) => (i ? m.charAt(0).toLowerCase() + m.slice(1) : m)).join(", ") + ".";
  }
  const f = foerderung[h.region_id];
  const foe = f && !(f.tech === "pv" && /stecker|balkon/i.test(f.name))
    ? ` ${h.name} ${f.status === "aktiv" ? "fördert" : "hat"} ${f.tech === "balkon" ? "Balkonkraftwerke" : "Photovoltaikanlagen"} mit einem eigenen Zuschuss${f.status === "aktiv" ? "" : " gefördert"}.`
    : "";
  const z = h.zeile ? (JSON.parse(h.zeile) as { basis: string; wert: string }) : null;
  const v = z?.wert.match(/^[\d.,]+/)?.[0];
  if (z && v) {
    switch (metrik) {
      case "balkonkraftwerke-je-einwohner": return `In ${h.name} sind ${z.basis} registriert, ${z.wert}. ${rang}${foe}`;
      case "speicher-je-dachanlage": return Number(v.replace(/\./g, "").replace(",", ".")) > 100
        ? `In ${h.name} gibt es mehr Hausspeicher als private Solardächer: ${v} Speicher auf 100 Dachanlagen. ${rang}${foe}`
        : `In ${h.name} kommen auf 100 private Dachanlagen ${v} Hausspeicher. ${rang}${foe}`;
      case "speicherkapazitaet-je-einwohner": return `In ${h.name} stehen in Hausspeichern ${v} Wattstunden Speicherkapazität je Einwohner bereit. ${rang}${foe}`;
      case "solarleistung-je-einwohner": return `Auf den privaten Dächern in ${h.name} sind ${v} Watt Solarleistung je Einwohner installiert. ${rang}${foe}`;
      case "zubau-3-jahre-je-einwohner": return `In ${h.name} sind seit Ende 2023 ${v} Watt Solarleistung je Einwohner auf privaten Dächern dazugekommen. ${rang}${foe}`;
      case "zubau-5-jahre-je-einwohner": return `In ${h.name} sind seit Ende 2021 ${v} Watt Solarleistung je Einwohner auf privaten Dächern dazugekommen. ${rang}${foe}`;
    }
  }
  return `${h.name} liegt ${MESS[metrik]} ${gruppe} ${scope} auf Platz ${h.platz}.`;
}

const THEMA: Record<string, string> = {
  "solarleistung-je-einwohner": "der Solarleistung auf den Dächern",
  "balkonkraftwerke-je-einwohner": "Balkonkraftwerken",
  "speicherkapazitaet-je-einwohner": "Hausspeichern",
  "speicher-je-dachanlage": "Hausspeichern",
  "zubau-3-jahre-je-einwohner": "dem Solar-Zubau der letzten Jahre",
  "zubau-5-jahre-je-einwohner": "dem Solar-Zubau der letzten Jahre",
};
const liste = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} und ${xs[xs.length - 1]}`);
function einstieg(kreisName: string, hs: Hook[], wo = imKreis(kreisName)): string {
  const vorn = hs.filter((h) => h.platz === 1);
  const weit = hs.filter((h) => h.platz > 1);
  const thema = (xs: Hook[]) => liste([...new Set(xs.map((h) => THEMA[h.rangliste_url.split("/ranking/")[1].split("/")[0]]).filter(Boolean))]);
  const saetze: string[] = [];
  const top = hs.map((h) => ({ h, st: staerke(h) })).filter((x) => x.st).sort((a, b) => b.st!.stufe - a.st!.stufe || a.st!.platz - b.st!.platz)[0];
  if (top) {
    const st = top.st!;
    saetze.push(`${top.h.name} liegt ${MESS[metrikVon(top.h)]} ${st.wo} ${st.platz === 1 ? "an der Spitze" : "weit vorn"}: Platz ${st.platz} von ${fmtZahl(st.von)} ${KLASSE[klasseVon(top.h)]}${SPANNE(klasseVon(top.h))}.`);
  }
  if (top) { const i = vorn.indexOf(top.h); if (i >= 0) vorn.splice(i, 1); }
  if (vorn.length) saetze.push(`${top ? "Im Kreisvergleich " + (vorn.length > 1 ? "stehen auch " : "steht auch ") + liste(vorn.map((h) => h.name)) + " ganz vorn" : `${liste(vorn.map((h) => h.name))} ${vorn.length > 1 ? "stehen" : "steht"} beim Solarausbau ${wo} ganz vorn`}: ${vorn.length > 1 ? "jeweils " : ""}Platz 1 in der eigenen Größenklasse bei ${thema(vorn)}.`);
  if (false) saetze.push(`${liste(vorn.map((h) => h.name))} ${vorn.length > 1 ? "stehen" : "steht"} beim Solarausbau ${wo} ganz vorn: ${vorn.length > 1 ? "jeweils " : ""}Platz 1 in der eigenen Größenklasse bei ${thema(vorn)}.`);
  if (weit.length) saetze.push(`${vorn.length ? "Knapp dahinter" : `Weit vorn ${wo}`}: ${liste(weit.map((h) => `${h.name} (Platz ${h.platz})`))} bei ${thema(weit)}.`);
  saetze.push("Das zeigt eine Auswertung von solar-check.io auf Grundlage des Marktstammdatenregisters der Bundesnetzagentur.");
  return saetze.join(" ");
}
const wo = (k: string) => (istKreisfrei(kreise[k].name) ? `in ${laender[k.slice(0, 2)]}` : imKreis(kreise[k].name));
function mitteilung(kreisIds: string[]) {
  const bloecke: string[] = [];
  const links: string[] = [];
  const kreisLinks: string[] = [];
  const titelOrte: string[] = [];
  for (const k of kreisIds) {
    const hs = hooks.filter((h) => h.region_id.startsWith(k)).sort((a, b) => a.platz - b.platz || a.name.localeCompare(b.name));
    const zeilen = hs.map((h) => ({ h, s: satz(h) })).filter((x) => x.s);
    if (!zeilen.length) continue;
    titelOrte.push(...zeilen.filter((x) => x.h.platz === 1).map((x) => x.h.name));
    const kreisUrl = zeilen[0].h.seite_url.split("/").slice(0, -1).join("/");
    const k1 = kreise[k].name;
    const kreisfrei = hs.length === 1 && zeilen[0].h.seite_url.endsWith(`/${zeilen[0].h.seite_url.split("/").slice(-2, -1)[0]}`);
    bloecke.push([einstieg(k1, zeilen.map((x) => x.h), wo(k)), zeilen.map((x) => x.s).join("\n\n")].join("\n\n"));
    links.push(...zeilen.map((x) => `${x.h.name}: ${x.h.seite_url.split("#")[0]}`));
    if (!kreisfrei) kreisLinks.push(`${k1}: ${kreisUrl}`);
  }
  if (!bloecke.length) return null;
  const kreisNamen = kreisIds.map((k) => kreise[k].name);
  const orte = [...new Set(titelOrte)];
  const staerkste = kreisIds.flatMap((k) => hooks.filter((h) => h.region_id.startsWith(k)).map((h) => ({ h, st: staerke(h) })))
    .filter((x) => x.st && THEMA[metrikVon(x.h)]).sort((a, b) => b.st!.stufe - a.st!.stufe || a.st!.platz - b.st!.platz)[0];
  const betreff = staerkste
    ? `Pressemitteilung: ${staerkste.h.name} ${staerkste.st!.ebene === "de" ? `bundesweit ${staerkste.st!.platz === 1 ? "Spitzenreiter" : `auf Platz ${staerkste.st!.platz}`} bei ${THEMA[metrikVon(staerkste.h)]}` : `mit Spitzenwert bei ${THEMA[metrikVon(staerkste.h)]} ${staerkste.st!.wo}`}`
    : orte.length === 1 ? `Pressemitteilung: ${orte[0]} beim Solarausbau ${wo(kreisIds[0])} vorn`
    : orte.length > 1 ? `Pressemitteilung: ${orte.length > 3 ? orte.slice(0, 2).join(", ") + " und weitere Orte" : orte.slice(0, -1).join(", ") + " und " + orte[orte.length - 1]} beim Solarausbau vorn`
    : `Pressemitteilung: Solarausbau ${imKreis(kreisNamen[0])} im Vergleich`;
  const text = [
    `Guten Tag,`,
    `anbei eine kurze Pressemitteilung zum Solarausbau ${kreisNamen.map(imKreis).join(" und ")}. Die Zahlen stammen von der Bundesnetzagentur.`,
    `——————————————————————————————\n\nPRESSEMITTEILUNG\n${betreff.replace(/^Pressemitteilung: /, "")}`,
    ...bloecke,
    ...(kreisLinks.length ? [`Alle Gemeinden ${kreisLinks.length > 1 ? "der Kreise" : imKreis(kreisLinks[0].split(": ")[0])} im Vergleich: ${kreisLinks.map((l) => l.split(": ")[1]).join(" · ")}`] : []),
    `Quelle: Bundesnetzagentur, Marktstammdatenregister (dl-de/by-2-0); Auswertung: solar-check.io`,
    `——————————————————————————————`,
    `Die Mitteilung können Sie unverändert oder gekürzt übernehmen. Hier finden Sie jeweils weitere Details und größtenteils auch Infografiken zum Download:\n${links.join("\n")}`,
    `Fehlt Ihnen etwas oder wünschen Sie sich eine andere Informationsgrafik? Schreiben Sie mir gern.`,
    `Die Gemeinden wurden über ihre Platzierung informiert, ein Statement können Sie gegebenenfalls dort einholen.`,
    `Wir arbeiten gerade daran, diese Auswertungen als Grafik zum Einbinden anzubieten, die sich jeden Monat selbst aktualisiert. Wäre das für Sie interessant? Eine kurze Antwort genügt, das ist noch ganz unverbindlich.`,
    `Um zu Gemeinden und ihrem Landkreis auf dem Laufenden zu bleiben, nutzen Sie gerne unser kostenloses Abo-Angebot auf den jeweiligen Seiten.`,
    `Für Rückfragen bin ich gern da.`,
    `Viele Grüße`,
    `Sebastian Schäder\nDipl. Des., Gründer von solar-check.io\n0177/2897086`,
    `--\nIhre Adresse stammt aus dem Impressum Ihrer Website und wird nur für diese Nachricht genutzt. Keine weiteren Mails gewünscht? Eine kurze Antwort genügt.\nImpressum: https://solar-check.io/impressum · Datenschutz: https://solar-check.io/datenschutz`,
  ];
  return { betreff, text: text.join("\n\n") };
}

// One mail per recipient; a medium covering several districts gets them in one mail.
const jeEmpfaenger = new Map<string, { titel: string; kreise: string[] }>();
for (const [k, v] of Object.entries(kreise)) {
  for (const m of v.medien) {
    if (m.pruefung !== "passt" || !m.mail_eigen) continue;
    // District administrations are not newsrooms (30.09.2026: lkspn, lkjl,
    // lksuedwestpfalz got the release; the Landrat's office answered).
    if (/@lk[a-z]{2,}\.de$|@(landkreis|kreis)-[a-z-]+\.de$|landratsamt|kreisverwaltung/i.test(m.mail)) continue;
    const key = m.mail.toLowerCase();
    const e = jeEmpfaenger.get(key) ?? { titel: m.titel, kreise: [] };
    if (!e.kreise.includes(k)) e.kreise.push(k);
    jeEmpfaenger.set(key, e);
  }
}
const CHARGE_GROESSE = 40;
const mails = [...jeEmpfaenger]
  .map(([an, e]) => ({ an, titel: e.titel, kreise: e.kreise.sort(), m: mitteilung(e.kreise) }))
  .filter((x) => x.m)
  // Batches follow the order of the municipal letters (by state and district), a district never split.
  .sort((a, b) => a.kreise[0].localeCompare(b.kreise[0]) || a.an.localeCompare(b.an));
// A district is never split across batches: districts linked by a medium that
// covers several of them form one group, and batch boundaries fall only
// between groups.
const eltern = new Map<string, string>();
const wurzel = (k: string): string => { const p = eltern.get(k) ?? k; if (p === k) return k; const r = wurzel(p); eltern.set(k, r); return r; };
for (const x of mails) for (const k of x.kreise.slice(1)) eltern.set(wurzel(k), wurzel(x.kreise[0]));
const gruppen = new Map<string, typeof mails>();
for (const x of mails) { const g = wurzel(x.kreise[0]); gruppen.set(g, [...(gruppen.get(g) ?? []), x]); }
let charge = 1, zaehler = 0;
const mitCharge: ((typeof mails)[number] & { charge: number })[] = [];
for (const [, gruppe] of [...gruppen].sort((p, q) => Math.min(...p[1].flatMap((x) => x.kreise.map(Number))) - Math.min(...q[1].flatMap((x) => x.kreise.map(Number))))) {
  if (zaehler >= CHARGE_GROESSE) { charge++; zaehler = 0; }
  for (const x of gruppe) mitCharge.push({ ...x, charge });
  zaehler += gruppe.length;
}
// 30.09.2026: while wind turbines are not yet drawn on the pages, the unsent
// districts without a single wind town named in their release go first, as new
// batches 7 (NRW), 8 (RP/HE/SL), 9 (north/east). A district that shares a
// medium with a wind district stays out entirely, so no district is split.
const windOrte = new Set<string>(JSON.parse(fs.readFileSync(`${S}/wind.json`, "utf8")).gemeinden);
const windKreis = (k: string) => hooks.some((h) => h.region_id.startsWith(k) && windOrte.has(h.region_id));
const offen = mitCharge.filter((x) => x.charge !== 4);
const windfrei = offen.filter((x) => !x.kreise.some(windKreis));
const geteilt = new Set(windfrei.flatMap((x) => x.kreise).filter((k) => offen.some((x) => x.kreise.includes(k) && x.kreise.some(windKreis))));
for (const x of windfrei) {
  if (x.kreise.some((k) => geteilt.has(k))) continue;
  const land = x.kreise[0].slice(0, 2);
  x.charge = land === "05" ? 7 : ["06", "07", "10"].includes(land) ? 8 : 9;
}

async function main() {
  const i = process.argv.indexOf("--beispiel");
  if (i > 0) {
    const x = mitCharge.find((m) => m.kreise.some((k) => kreise[k].name.includes(process.argv[i + 1])));
    if (x) console.log(`An: ${x.an} (${x.titel})\nBetreff: ${x.m!.betreff}\n\n${x.m!.text}`);
    return;
  }
  const nk = process.argv.indexOf("--nur-kreis");
  if (nk > 0) { const x = mitteilung([process.argv[nk + 1]]); if (x) console.log(`Betreff: ${x.betreff}\n\n${x.text}`); return; }
  console.log(`Mails: ${mitCharge.length}, Kreise: ${new Set(mitCharge.flatMap((m) => m.kreise)).size}, Chargen: ${charge}`);
  for (let c = 1; c <= 9; c++) {
    const cs = mitCharge.filter((m) => m.charge === c);
    if (cs.length) console.log(`  Charge ${c}: ${cs.length} Mails, Länder ${[...new Set(cs.flatMap((m) => m.kreise.map((k) => laender[k.slice(0, 2)])))].join(", ")}`);
  }
  fs.writeFileSync(`${S}/presse-kreise-mails.json`, JSON.stringify(
    mitCharge.map((x) => ({ an: x.an, titel: x.titel, kreise: x.kreise, charge: x.charge, anlass: "pressemitteilung", bezug: x.kreise, betreff: x.m!.betreff, text: x.m!.text })),
    null, 1,
  ));
}
main().catch((e) => { console.error(e); process.exit(1); });
