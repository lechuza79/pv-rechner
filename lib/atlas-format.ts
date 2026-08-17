// Anzeige-Regeln des Solar-Atlas: Einheiten und Regionsnamen.
//
// Bewusst ohne Datenbank- oder Next-Importe, damit Server-Seiten, Client-
// Komponenten und Embed-Widgets dieselben Funktionen benutzen können. Genau das
// war der Grund für die Drift: sechs Dateien hatten je eine eigene Kopie des
// Leistungs-Formatters, fünf davon mit der falschen Einheit.

import { VORANGESTELLTE_GATTUNG } from "./atlas-orte";

const nf = (n: number) => Math.round(n).toLocaleString("de-DE");
const dez = (n: number, stellen: number) => n.toLocaleString("de-DE", { maximumFractionDigits: stellen });

/**
 * Zahl und Einheit — getrennt.
 *
 * Eine Quelle für beides, aber NICHT zu einem Textblock verschmolzen: in einer
 * Kachel ist der Zahlenwert die dominante Angabe und die Einheit steht kleiner
 * daneben. Wer nur den fertigen String bekommt, kann das nicht mehr setzen —
 * genau so ist beim Zusammenführen der sechs Formatter-Kopien die
 * Größenstaffelung in den Kacheln verlorengegangen.
 *
 * Faustregel: `fmt…()` für Fließtext, `…Teile()` überall dort, wo die Zahl groß
 * gesetzt wird.
 */
export type Messwert = { value: string; unit: string };

const zusammen = (m: Messwert) => `${m.value} ${m.unit}`;

/**
 * Installierte Photovoltaik-Leistung.
 *
 * Einheit ist kWp/MWp/GWp ("Peak"), nicht kW: der Wert ist die Nennleistung der
 * Module unter Standardbedingungen, keine Momentanleistung. Beides steht auf der
 * Seite nebeneinander (die Live-Simulation zeigt echte kW), deshalb muss die
 * Unterscheidung sichtbar bleiben.
 *
 * NICHT für Speicher (kWh) und nicht für einen Technologie-Mix aus Solar, Wind
 * und Biomasse — dort ist die Nennleistung keine Peak-Leistung.
 */
export function pvLeistungTeile(kwp: number): Messwert {
  if (kwp >= 1_000_000) return { value: dez(kwp / 1_000_000, 1), unit: "GWp" };
  if (kwp >= 1000) return { value: dez(kwp / 1000, 1), unit: "MWp" };
  return { value: nf(kwp), unit: "kWp" };
}
export const fmtPvLeistung = (kwp: number): string => zusammen(pvLeistungTeile(kwp));

/**
 * Installierte Leistung eines TECHNOLOGIE-MIX (Solar + Wind + Biomasse + Wasser).
 *
 * Bewusst kW/MW/GW ohne „p": „Peak" ist die Nennleistung von Solarmodulen unter
 * Standard-Testbedingungen. Ein Windrad oder ein Biomasse-Block hat keine
 * Peak-Leistung, deshalb wäre „MWp" über einer gemischten Summe eine stille
 * Falschaussage — dieselbe Fehlerklasse wie kW statt kWp, nur andersherum.
 *
 * NICHT für reine Solar-Summen nehmen (dort pvLeistungTeile).
 */
export function mixLeistungTeile(kw: number): Messwert {
  if (kw >= 1_000_000) return { value: dez(kw / 1_000_000, 1), unit: "GW" };
  if (kw >= 1000) return { value: dez(kw / 1000, 1), unit: "MW" };
  return { value: nf(kw), unit: "kW" };
}
export const fmtMixLeistung = (kw: number): string => zusammen(mixLeistungTeile(kw));

/**
 * Installierte Photovoltaik je Einwohner.
 *
 * Auch das ist Peak-Leistung, nur geteilt durch die Einwohnerzahl — also Wp,
 * nicht W. Stand vorher an sechs Stellen als "W" da und wäre dieselbe stille
 * Falschaussage wie kW/kWp.
 */
export const wattProKopfTeile = (w: number): Messwert => ({ value: nf(w), unit: "Wp" });
export const fmtWattProKopf = (w: number): string => zusammen(wattProKopfTeile(w));

/** Speicherkapazität — kWh, ab vier Stellen MWh/GWh. */
export function speicherKwhTeile(kwh: number): Messwert {
  if (kwh >= 1_000_000) return { value: dez(kwh / 1_000_000, 1), unit: "GWh" };
  if (kwh >= 1000) return { value: dez(kwh / 1000, 1), unit: "MWh" };
  return { value: nf(kwh), unit: "kWh" };
}
export const fmtSpeicherKwh = (kwh: number): string => zusammen(speicherKwhTeile(kwh));

/**
 * Durchschnittliche Größe einer Hausbatterie.
 *
 * Eigene Funktion statt speicherKwhTeile, weil hier eine Nachkommastelle zählt:
 * Hausbatterien liegen bei 5 bis 15 kWh, gerundet wären 8,7 und 9,4 dieselbe
 * Zahl.
 */
export const batterieMittelTeile = (kwh: number): Messwert => ({ value: dez(kwh, 1), unit: "kWh" });
export const fmtBatterieMittel = (kwh: number): string => zusammen(batterieMittelTeile(kwh));

/**
 * Speicherdichte: Batteriekapazität je installiertem kWp DACHLEISTUNG.
 *
 * Der Nenner lässt Freiflächen-Parks bewusst weg (ein Solarpark ohne Batterie
 * würde sonst ein "hier speichert niemand" vortäuschen) — dann muss der Nenner
 * auch drangeschrieben stehen, sonst behauptet die Zeile etwas anderes, als sie
 * rechnet.
 */
export function fmtSpeicherJeKwp(kwhProKwp: number): string {
  return `${kwhProKwp.toLocaleString("de-DE", { maximumFractionDigits: 2 })} kWh je kWp Dach`;
}

/** Standort-Ertrag: Jahresertrag je installiertem kWp. */
export function fmtErtragProKwp(kwhProKwp: number): string {
  return `${Math.round(kwhProKwp).toLocaleString("de-DE")} kWh/kWp`;
}

/**
 * Rechnerisch vermiedenes CO₂ in Tonnen pro Jahr.
 *
 * Staffelung t → Tsd. t → Mio. t: eine Gemeinde liegt bei Hunderten Tonnen,
 * ein Bundesland bei Millionen — ohne Staffelung wäre eine der beiden Zahlen
 * unlesbar. „CO₂" steht bewusst NICHT in der Einheit: die Spalte bzw. der
 * Satz daneben benennt die Größe, die Einheit bleibt die Masse.
 */
/**
 * Gestaffelte Werte kompakt: unter 10 eine Nachkommastelle (9,8), darüber
 * ganze Zahlen (404 statt 404,2). Die Wirkungs-Spalten sind Modellwerte —
 * mehr als zwei, drei signifikante Stellen wären Scheingenauigkeit, und die
 * Tabelle braucht jeden Pixel für die Namensspalte.
 */
const kompakt = (n: number) => dez(n, n < 10 ? 1 : 0);

export function co2TonnenTeile(tonnen: number): Messwert {
  if (tonnen >= 1_000_000) return { value: kompakt(tonnen / 1_000_000), unit: "Mio. t" };
  if (tonnen >= 1000) return { value: kompakt(tonnen / 1000), unit: "Tsd. t" };
  return { value: nf(tonnen), unit: "t" };
}
export const fmtCo2Tonnen = (tonnen: number): string => zusammen(co2TonnenTeile(tonnen));

/**
 * CO₂-Faktor als Fließtext („0,38 kg CO₂ je Kilowattstunde"). Eigene Funktion,
 * damit der Faktor in Fußnoten nicht als handgeklebte Einheit landet.
 */
export const fmtCo2FaktorKg = (kgProKwh: number): string =>
  `${dez(kgProKwh, 2)} kg CO₂ je Kilowattstunde`;

/**
 * Erlös- bzw. Preissatz je Kilowattstunde („14,8 ct"). Eigene Funktion aus
 * demselben Grund wie oben: Der Satz steht in Hilfetexten neben anderen
 * Zahlen, und eine handgeklebte Einheit ist genau die Bauweise, die der
 * Einheiten-Wächter verbietet.
 */
export const ctProKwhTeile = (ct: number): Messwert => ({ value: dez(ct, 1), unit: "ct" });
export const fmtCtProKwh = (ct: number): string => zusammen(ctProKwhTeile(ct));

/**
 * Ein Anteil als Prozentangabe („27 %").
 *
 * Nimmt den ANTEIL (0…1), nicht die bereits mit 100 multiplizierte Zahl — genau
 * diese Verwechslung ist der Fehler, den eine gemeinsame Funktion verhindert:
 * mit 0,27 aufgerufen käme sonst „0 %" heraus, mit 27 ein „2.700 %".
 *
 * Ganze Prozent ohne Nachkommastelle: Die Anteile im Atlas sind Modellwerte
 * (Eigenverbrauch aus Anlagengröße und Speicherbestand). Eine Nachkommastelle
 * wäre Scheingenauigkeit.
 */
export const anteilProzentTeile = (anteil: number): Messwert => ({
  value: dez(anteil * 100, 0),
  unit: "%",
});
export const fmtAnteilProzent = (anteil: number): string => zusammen(anteilProzentTeile(anteil));

/**
 * Hängt den Zeitbezug an eine Einheit: aus „Tsd. t" wird „Tsd. t/Jahr".
 *
 * Nur für FLUSSGRÖSSEN. In der Ranking-Tabelle stehen Jahreswerte neben
 * Bestandsgrößen (Anlagen, Leistung, Speicher) — ohne den Zusatz liest sich
 * „404 Tsd. t" als „so viel hat die Gemeinde bisher gespart". Der Zeitbezug
 * gehört deshalb an die Zahl, nicht in den Hilfetext hinter dem „?".
 *
 * Bewusst „/Jahr" und nicht „p. a.": Die Abkürzung ist korrekt, setzt aber
 * Vorwissen voraus, und die Seite schreibt Klartext.
 */
export const proJahr = (m: Messwert): Messwert => ({ value: m.value, unit: `${m.unit}/Jahr` });

/** Geldbeträge (rechnerischer Stromwert): € → Tsd. € → Mio. € → Mrd. €. */
export function euroTeile(euro: number): Messwert {
  if (euro >= 1_000_000_000) return { value: kompakt(euro / 1_000_000_000), unit: "Mrd. €" };
  if (euro >= 1_000_000) return { value: kompakt(euro / 1_000_000), unit: "Mio. €" };
  if (euro >= 1000) return { value: kompakt(euro / 1000), unit: "Tsd. €" };
  return { value: nf(euro), unit: "€" };
}
export const fmtEuro = (euro: number): string => zusammen(euroTeile(euro));

/**
 * Voller Euro-Betrag ohne Größenstaffelung — für Haushalts-Beispiele in
 * Rechner-Größenordnung, wo „12.400 €" lesbarer ist als „12,4 Tsd. €".
 * NICHT für Regions-Summen (dort euroTeile/fmtEuro, sonst wird ein
 * Bundesland zu einer zehnstelligen Zahl).
 */
export const fmtEuroVoll = (euro: number): string => `${nf(euro)} €`;

// ─── Regionsnamen ─────────────────────────────────────────────────────────────

// Die Liste der vorangestellten Gattungswörter steht in lib/atlas-orte.ts —
// dort hängt auch die Präposition dran. Zwei Kopien wären ein Fehler, kein
// Duplikat: Käme ein Gattungswort nur hier dazu, kürzte der Anzeigename es weg,
// während die Ortsangabe daneben weiter das Doppelte nennt.
const VORANGESTELLT: readonly string[] = VORANGESTELLTE_GATTUNG;

/**
 * Trägt der Name die Gattung schon selbst? Deckt beide Bauarten ab: als eigenes
 * Wort ("Oberbergischer Kreis", "Region Hannover") und angehängt
 * ("Ennepe-Ruhr-Kreis", "Hochsauerlandkreis", "Eifelkreis Bitburg-Prüm").
 */
function traegtGattung(rest: string): boolean {
  return rest.split(/[\s-]+/).some((w) => /kreis$|region$|verband$/i.test(w));
}

/**
 * Anzeigename einer Region ohne doppelte Gattung.
 *
 * Das amtliche Verzeichnis stellt "Kreis"/"Landkreis" vor jeden Kreisnamen —
 * auch vor die 50 Kreise, deren Name die Gattung bereits enthält. Daraus wurde
 * "Kreis Ennepe-Ruhr-Kreis" und "Landkreis Hochsauerlandkreis". Generisch
 * gelöst, nicht als Sonderfall: das vorangestellte Wort fällt weg, sobald der
 * Rest die Gattung selbst trägt.
 *
 * "Landkreis Rostock" und "Städteregion Aachen" bleiben unverändert — dort
 * steckt die Gattung nur im Präfix.
 *
 * Nur Anzeige. Slugs bleiben, wie sie sind (sie stehen in Links und Sitemaps).
 */
export function regionDisplayName(name: string): string {
  const idx = name.indexOf(" ");
  if (idx < 1) return name;
  const erstes = name.slice(0, idx);
  const rest = name.slice(idx + 1).trim();
  if (!VORANGESTELLT.includes(erstes)) return name;
  return traegtGattung(rest) ? rest : name;
}
