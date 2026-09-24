// Der Einbettungs-Code eines Widgets — an EINER Stelle.
//
// WARUM ER HIER STEHT UND NICHT IN DER GALERIE: Er stand bis zum 05.09.2026
// mitten in der Galerie-Seite. Solange die Galerie der einzige Ort war, an dem
// jemand Code bekommt, ging das. Sobald eine zweite Oberfläche denselben Code
// anbietet — die Karte auf der Ortsseite —, wäre die zweite eine Kopie, und
// Kopien dieser Art laufen auseinander: Die eine bekommt das Ziel-Attribut,
// die andere nicht; die eine maskiert den Titel, die andere nicht. Der Code
// wird auf eine FREMDE Website eingefügt, mit unserem Namen darunter.
//
// REIN und ohne Browser-Zugriff: Ein Test kann den Code Zeichen für Zeichen
// prüfen, ohne eine Seite zu rendern.

/** Wohin der Verweis unter dem Rahmen zeigt. */
export type EmbedAttribution = {
  /**
   * Pfad auf solar-check.io.
   *
   * DIESER VERWEIS IST DER EIGENTLICHE RÜCKVERWEIS, nicht die Adresse im
   * Rahmen: Ein iframe zählt bei Suchmaschinen nicht als Verweis der
   * einbettenden Seite, der Textlink darunter schon. Wer ihn wegnimmt, nimmt
   * dem Einbetten seinen Sinn für uns.
   */
  path: string;
  text: string;
};

export type EmbedCodeOpts = {
  /** Adresse des Widgets, ohne Abfrageteil — z. B. "/embed/gemeinde-solar". */
  src: string;
  /** Was in den Abfrageteil gehört: Ort, Farbschema, Einstellungen. */
  params?: Record<string, string>;
  /** Breite in Pixeln. Der Rahmen bleibt darunter flexibel. */
  width: number;
  height: number;
  /** Steht im Titel des Rahmens — für Screenreader und als Beschriftung. */
  titel: string;
  attribution: EmbedAttribution;
  /** Basis-Adresse. Hereingereicht, damit ein Test nicht die Produktion nennt. */
  siteUrl: string;
};

/**
 * Was in ein HTML-Attribut geschrieben wird, wird maskiert — IMMER.
 *
 * Zweite Verteidigungslinie: Auch wenn der Aufrufer saubere Werte übergibt,
 * gehört in ein Attribut nichts Unmaskiertes. Ein Ortsname mit Anführungszeichen
 * würde den Rahmen sonst mitten im Attribut beenden, und das Ergebnis stünde
 * kaputt auf einer fremden Seite.
 */
function attr(t: string): string {
  return t
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Der fertige Code zum Kopieren. */
export function embedCode(o: EmbedCodeOpts): string {
  const qs = new URLSearchParams(o.params ?? {}).toString();
  const url = `${o.siteUrl}${o.src}${qs ? `?${qs}` : ""}`;
  return [
    `<iframe`,
    `  src="${attr(url)}"`,
    `  width="${o.width}"`,
    `  height="${o.height}"`,
    `  style="border:0;display:block;width:100%;max-width:${o.width}px"`,
    `  title="${attr(o.titel)} — Solar Check"`,
    `  loading="lazy"`,
    `></iframe>`,
    `<p style="margin:6px 0 0;font:13px/1.4 system-ui,sans-serif">`,
    `  <a href="${attr(`${o.siteUrl}${o.attribution.path}`)}" target="_blank" rel="noopener">${attr(o.attribution.text)}</a>`,
    `</p>`,
  ].join("\n");
}
