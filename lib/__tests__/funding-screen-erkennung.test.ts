import { describe, it, expect } from "vitest";
import { einordnen, sichtbarerText, istErledigt, SCREEN_VERSION, WIEDERVORLAGE_TAGE } from "../funding-screen-erkennung";

// Die Vorsortierung ist die einzige Stelle des Abdeckungs-Laufs, die urteilt.
// Beide Richtungen sind teuer: Ein übersehenes Programm fehlt für immer im
// Katalog, ein Falsch-Positiv kostet Lesezeit und macht die Leseliste wertlos.

describe("Nähe entscheidet, nicht bloßes Vorkommen", () => {
  it("meldet keinen Treffer, wenn der Fachbegriff nur in der Navigation steht", () => {
    // Der reale Fall aus Oldenburg: eine Seite über Zuschüsse zu
    // Verhütungsmitteln, auf der „Photovoltaik" im mitlaufenden Menü steht.
    const seite = sichtbarerText(`
      <nav><a>Photovoltaik</a><a>Wärmepumpe</a><a>Balkonkraftwerk</a></nav>
      <main><h1>Zuschuss zu Verhütungsmitteln</h1>
      <p>Die Stadt gewährt einen Zuschuss von bis zu 200 Euro für Verhütungsmittel.</p></main>
    `);
    expect(einordnen(seite).verdikt).toBe("kein-treffer");
  });

  it("meldet einen Treffer, wenn Betrag und Zuschuss-Wort beim Begriff stehen", () => {
    const seite = sichtbarerText(`
      <h2>Förderung von Balkonkraftwerken</h2>
      <p>Die Gemeinde gewährt einen Zuschuss von 100 Euro je steckerfertiger Anlage.</p>
    `);
    const b = einordnen(seite);
    expect(b.verdikt).toBe("treffer");
    expect(b.techniken).toContain("balkon");
  });

  it("findet den Treffer auch, wenn das erste Vorkommen die Navigation ist", () => {
    const seite = sichtbarerText(`
      <nav><a>Photovoltaik</a></nav>
      ${"<p>Allerlei Text ohne Bezug.</p>".repeat(30)}
      <h2>Photovoltaik</h2><p>Gefördert werden Anlagen mit 150 Euro je kWp.</p>
    `);
    expect(einordnen(seite).techniken).toContain("pv");
  });
});

describe("Techniken werden getrennt gemeldet", () => {
  it("trennt Dach-PV von Steckersolar", () => {
    // Bis 18.08.2026 lagen beide Wörter in derselben Liste: Ein Balkon-Treffer
    // war nicht von einem Dach-Treffer zu unterscheiden und blieb liegen.
    const nurBalkon = sichtbarerText(`
      <h2>Balkonkraftwerke</h2><p>Zuschuss: 75 Euro je Gerät.</p>
    `);
    const b = einordnen(nurBalkon);
    expect(b.techniken).toEqual(["balkon"]);
    expect(b.techniken).not.toContain("pv");
  });

  it("erkennt Wärmepumpen — die der alte Screener gar nicht kannte", () => {
    const seite = sichtbarerText(`
      <h2>Heizungstausch</h2>
      <p>Für den Einbau einer Wärmepumpe zahlt die Stadt einen Zuschuss von 1.000 Euro.</p>
    `);
    const b = einordnen(seite);
    expect(b.verdikt).toBe("treffer");
    expect(b.techniken).toContain("waermepumpe");
  });

  it("meldet mehrere Techniken, wenn die Seite mehrere Programme führt", () => {
    const seite = sichtbarerText(`
      <h2>Photovoltaik</h2><p>Zuschuss 150 Euro je kWp.</p>
      <h2>Balkonkraftwerk</h2><p>Zuschuss 100 Euro pauschal.</p>
      <h2>Wärmepumpe</h2><p>Zuschuss 500 Euro je Anlage.</p>
    `);
    expect(einordnen(seite).techniken.sort()).toEqual(["balkon", "pv", "waermepumpe"]);
  });
});

describe("Beendete Programme", () => {
  it("wertet eine ausgelaufene Förderung nicht als Treffer", () => {
    const seite = sichtbarerText(`
      <h2>Photovoltaik</h2>
      <p>Das Förderprogramm ist ausgelaufen, es werden keine Anträge mehr angenommen.</p>
    `);
    expect(einordnen(seite).verdikt).toBe("ausgelaufen");
  });

  it("verschluckt ein laufendes Programm nicht, weil ein anderes beendet ist", () => {
    // Der Grund für die Umstellung auf technik-getrenntes Ende (18.08.2026):
    // „Beendet" beendete vorher die ganze Seite, sobald es irgendwo bei einem
    // Begriff stand — hier wäre die laufende Wärmepumpen-Förderung verschwunden.
    const seite = sichtbarerText(`
      <h2>Balkonkraftwerke</h2><p>Die Mittel sind ausgeschöpft, keine Anträge mehr.</p>
      <h2>Wärmepumpe</h2><p>Gefördert wird der Einbau mit einem Zuschuss von 800 Euro.</p>
    `);
    const b = einordnen(seite);
    expect(b.verdikt).toBe("treffer");
    expect(b.techniken).toEqual(["waermepumpe"]);
  });

  it("erkennt auch einen vorangestellten Ende-Hinweis", () => {
    // Zugeordnet wird nach vorne; steht kein Fachbegriff davor, gilt der Hinweis
    // dem folgenden Programm. Ohne diesen Rückfall wäre „Das Programm ist
    // beendet. Gefördert wurden Balkonkraftwerke mit 100 €" ein Treffer.
    const seite = sichtbarerText(`
      <p>Das Förderprogramm ist beendet.</p>
      <p>Gefördert wurden Balkonkraftwerke mit einem Zuschuss von 100 Euro.</p>
    `);
    expect(einordnen(seite).verdikt).toBe("ausgelaufen");
  });
});

describe("Versionsstempel", () => {
  it("steht bei 2 — wer die Wortlisten ändert, zählt hoch", () => {
    // Der Stempel holt die 878 Seiten zurück, die mit der PV-only-Erkennung
    // abgehakt wurden. Bleibt er stehen, während sich die Listen ändern, gilt
    // eine Seite als geprüft, die nie durch die neue Erkennung lief.
    expect(SCREEN_VERSION).toBe(2);
  });
});


describe("Wiedervorlage: einmal ohne Fund heißt nicht für immer ohne Fund", () => {
  const HEUTE = Date.parse("2026-08-18");
  const vorTagen = (n: number) => new Date(HEUTE - n * 86_400_000).toISOString();
  const zeile = (extra: Partial<Parameters<typeof istErledigt>[0]> = {}) => ({
    verdict: "kein-treffer", screen_version: SCREEN_VERSION, gelesen_am: null,
    checked_at: vorTagen(1), ...extra,
  }) as Parameters<typeof istErledigt>[0];

  it("legt eine Gemeinde ohne Fund nach der Frist wieder vor", () => {
    // Der Fall, für den es die Regel gibt: Kommunale Zuschüsse werden mit dem
    // Haushalt beschlossen. Eine Gemeinde ohne Programm ist keine Gemeinde, die
    // nie eines haben wird — vor dieser Regel sah der Lauf sie nie wieder an.
    expect(istErledigt(zeile({ checked_at: vorTagen(WIEDERVORLAGE_TAGE - 1) }), HEUTE)).toBe(true);
    expect(istErledigt(zeile({ checked_at: vorTagen(WIEDERVORLAGE_TAGE + 1) }), HEUTE)).toBe(false);
  });

  it("holt einen GELESENEN Treffer NICHT zurück", () => {
    // Sonst stünde die mühsam abgearbeitete Leseliste vierteljährlich wieder da.
    // Aufgenommene Programme ruft der Seiten-Wächter ohnehin täglich ab;
    // verworfene waren keine Förderseiten, und das ändert sich nicht in 90 Tagen.
    const gelesen = zeile({ verdict: "treffer", gelesen_am: "2026-08-18", checked_at: vorTagen(999) });
    expect(istErledigt(gelesen, HEUTE)).toBe(true);
  });

  it("nimmt Unerreichbare und veraltete Erkennungen immer wieder vor", () => {
    expect(istErledigt(zeile({ verdict: "unerreichbar" }), HEUTE)).toBe(false);
    expect(istErledigt(zeile({ screen_version: SCREEN_VERSION - 1 }), HEUTE)).toBe(false);
  });

  it("behandelt eine nie angesehene Gemeinde als offen", () => {
    expect(istErledigt(undefined, HEUTE)).toBe(false);
    expect(istErledigt(zeile({ checked_at: null }), HEUTE)).toBe(false);
  });
});
