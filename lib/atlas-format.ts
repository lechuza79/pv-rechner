// Anzeige-Regeln des Solar-Atlas: Einheiten und Regionsnamen.
//
// Bewusst ohne Datenbank- oder Next-Importe, damit Server-Seiten, Client-
// Komponenten und Embed-Widgets dieselben Funktionen benutzen können. Genau das
// war der Grund für die Drift: sechs Dateien hatten je eine eigene Kopie des
// Leistungs-Formatters, fünf davon mit der falschen Einheit.

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

// ─── Regionsnamen ─────────────────────────────────────────────────────────────

/** Wörter, die im amtlichen Verzeichnis vor den Kernnamen gesetzt werden. */
const VORANGESTELLT = ["Landkreis", "Kreis", "Region", "Städteregion", "Regionalverband", "Verbandsgemeinde"];

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
