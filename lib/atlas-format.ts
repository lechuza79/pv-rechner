// Anzeige-Regeln des Solar-Atlas: Einheiten und Regionsnamen.
//
// Bewusst ohne Datenbank- oder Next-Importe, damit Server-Seiten, Client-
// Komponenten und Embed-Widgets dieselben Funktionen benutzen können. Genau das
// war der Grund für die Drift: sechs Dateien hatten je eine eigene Kopie des
// Leistungs-Formatters, fünf davon mit der falschen Einheit.

const nf = (n: number) => Math.round(n).toLocaleString("de-DE");

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
export function fmtPvLeistung(kwp: number): string {
  if (kwp >= 1_000_000) return `${(kwp / 1_000_000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} GWp`;
  if (kwp >= 1000) return `${(kwp / 1000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} MWp`;
  return `${nf(kwp)} kWp`;
}

/** Speicherkapazität — kWh, ab vier Stellen MWh/GWh. */
export function fmtSpeicherKwh(kwh: number): string {
  if (kwh >= 1_000_000) return `${(kwh / 1_000_000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} GWh`;
  if (kwh >= 1000) return `${(kwh / 1000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} MWh`;
  return `${nf(kwh)} kWh`;
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
