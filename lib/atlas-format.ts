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

// ─── Anteile ──────────────────────────────────────────────────────────────────

/**
 * Anteil in Prozent.
 *
 * Nimmt den ANTEIL (0…1), NICHT die schon mit 100 multiplizierte Zahl. Das ist
 * der Grund, warum die Funktion so und nicht anders geschnitten ist: Wer
 * `anteilProzentTeile(kwp / total)` schreibt, kann die Multiplikation weder
 * vergessen noch zweimal machen — beides sah man dem Ergebnis vorher nicht an,
 * weil „%" von Hand daneben stand und jede Zahl plausibel wirkte.
 *
 * Prozent ist eine Einheit wie kWp: Sie wird nicht getippt, sondern kommt hier
 * her. Zwischen Zahl und Zeichen steht im Deutschen ein Leerzeichen (DIN 5008).
 */
export const anteilProzentTeile = (anteil: number): Messwert => ({
  value: prozentGerundet(anteil).toLocaleString("de-DE"),
  unit: "%",
});
export const fmtAnteilProzent = (anteil: number): string => zusammen(anteilProzentTeile(anteil));

/**
 * Der gerundete Prozentwert als ZAHL — für Entscheidungen, die an der
 * angezeigten Stufe hängen (z. B. „±0 %" statt „+0 %"). Damit trifft die
 * Entscheidung dieselbe Rundung wie die Anzeige und kann nicht gegen sie
 * driften.
 */
export function prozentGerundet(anteil: number): number {
  return Math.round(anteil * 100);
}

/**
 * Anteil in Prozent, fein — Chart-Konvention der Donut-Legenden: ab 10 % ganze
 * Prozent, darunter eine Nachkommastelle.
 *
 * Eigene Funktion statt eines Schalters, aus demselben Grund wie
 * batterieMittelTeile: Unter 10 % würde die Rundung Segmente einebnen, die sich
 * in der Legende sichtbar unterscheiden (0,4 % und 1,4 % wären beide „1 %" bzw.
 * „0 %"). Oberhalb trägt die Nachkommastelle nichts und macht die Legende unruhig.
 */
export function anteilProzentFeinTeile(anteil: number): Messwert {
  const p = anteil * 100;
  return {
    value:
      p >= 9.95
        ? nf(p)
        : p.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
    unit: "%",
  };
}
export const fmtAnteilProzentFein = (anteil: number): string => zusammen(anteilProzentFeinTeile(anteil));

/**
 * Rangstufe „Top X %".
 *
 * Bewusst AUFgerundet und mindestens 1 %: Die Stufe darf die Platzierung nicht
 * besser aussehen lassen, als sie ist. Platz 3 von 200 ist „Top 2 %" — kaufmännisch
 * gerundet stünde dort „Top 1 %", also eine Behauptung, die den Ort in die
 * Spitzengruppe hebt, in der er nicht steht.
 */
export const topProzentTeile = (anteil: number): Messwert => ({
  value: Math.max(1, Math.ceil(anteil * 100)).toLocaleString("de-DE"),
  unit: "%",
});
export const fmtTopProzent = (anteil: number): string => zusammen(topProzentTeile(anteil));

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
