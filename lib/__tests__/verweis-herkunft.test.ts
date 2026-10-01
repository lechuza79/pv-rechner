import { describe, it, expect } from "vitest";
import { ordneVerweise, belegteVerweise } from "../verweis-herkunft";

// The real measurement of 01.10.2026: 29 linking domains, of which the report
// counted 2. Kept verbatim so the regression is visible, not described.
const GEMESSEN_2026_10_01 = new Map<string, string>([
  ["app.meindorfnet.de", "https://app.meindorfnet.de/news/7358?app_id=7"],
  ["bestonlinecasinomexico.online", "https://bestonlinecasinomexico.online/link-profile-hub/high-quality"],
  ["betulcrime.com", "https://betulcrime.com/all/2681/11.html"],
  ["betwinnermirror.com", "https://www.betwinnermirror.com/all/2681/11.html"],
  ["cvillico.com", "https://cvillico.com/all/2681/11.html"],
  ["gude.news", "https://gude.news/nidda-bei-balkonkraftwerken-im-wetteraukreis-vorne/"],
  ["heringen.de", "https://www.heringen.de/startseite/nachrichten/heringen_platz_1.html"],
  ["herzogtum-direkt.de", "https://herzogtum-direkt.de/index.php/2026/09/22/berkenthin-erreicht-platz-1"],
  ["nachrichten-kl.de", "https://www.nachrichten-kl.de/2026/09/30/kaiserslautern-mit-spitzenwert"],
  ["nidda.de", "https://www.nidda.de/news/balkonsolar/"],
  ["suedhessen.app", "https://suedhessen.app/redaktionnidda/nidda-mit-vielen-registrierten"],
  ["top5casino.online", "https://top5casino.online/link-equity-archive/expert-high-da-backlinks"],
  ["wetterau.news", "https://wetterau.news/wetteraukreis/nidda/480-nidda/34353-nidda"],
]);

const GEMEINDEN = new Map<string, string>([
  ["heringen.de", "Heringen (Werra)"],
  ["nidda.de", "Nidda"],
  ["riedstadt.de", "Riedstadt"],
]);

const BEITRAGS_DOMAINS = new Set([
  "wetterau.news",
  "gude.news",
  "herzogtum-direkt.de",
  "nachrichten-kl.de",
  "suedhessen.app",
  "app.meindorfnet.de",
  "nidda.de",
  "heringen.de",
]);

describe("Herkunft der Verweise", () => {
  it("zählt die Presse mit, nicht nur Gemeinde-Domains", () => {
    const h = ordneVerweise(GEMESSEN_2026_10_01, GEMEINDEN, BEITRAGS_DOMAINS);
    expect(h.gemeinden.map((g) => g.gemeinde)).toEqual(["Heringen (Werra)", "Nidda"]);
    expect(h.beitraege.map((b) => b.domain)).toEqual([
      "app.meindorfnet.de",
      "gude.news",
      "herzogtum-direkt.de",
      "nachrichten-kl.de",
      "suedhessen.app",
      "wetterau.news",
    ]);
    // Die alte Fassung meldete 2.
    expect(belegteVerweise(h)).toBe(8);
  });

  it("zählt nichts, was keiner eigenen Quelle zuzuordnen ist", () => {
    const h = ordneVerweise(GEMESSEN_2026_10_01, GEMEINDEN, BEITRAGS_DOMAINS);
    expect(h.unzugeordnet.map((u) => u.domain)).toEqual([
      "bestonlinecasinomexico.online",
      "betulcrime.com",
      "betwinnermirror.com",
      "cvillico.com",
      "top5casino.online",
    ]);
    // Sie werden gezeigt, aber nie mitgezählt.
    expect(belegteVerweise(h)).toBe(GEMESSEN_2026_10_01.size - h.unzugeordnet.length);
  });

  it("zählt eine Domain nur einmal, auch wenn sie beides ist", () => {
    // nidda.de ist Gemeinde-Domain UND Beitrags-Domain.
    const h = ordneVerweise(GEMESSEN_2026_10_01, GEMEINDEN, BEITRAGS_DOMAINS);
    const alle = [...h.gemeinden, ...h.beitraege, ...h.unzugeordnet].map((x) => x.domain);
    expect(new Set(alle).size).toBe(alle.length);
    expect(alle.length).toBe(GEMESSEN_2026_10_01.size);
  });

  it("ordnet eine Gemeinde ohne Verweis nicht zu", () => {
    const h = ordneVerweise(GEMESSEN_2026_10_01, GEMEINDEN, BEITRAGS_DOMAINS);
    expect(h.gemeinden.some((g) => g.gemeinde === "Riedstadt")).toBe(false);
  });

  it("gibt die erste verlinkende Seite mit, nicht nur die Domain", () => {
    const h = ordneVerweise(GEMESSEN_2026_10_01, GEMEINDEN, BEITRAGS_DOMAINS);
    expect(h.gemeinden.find((g) => g.domain === "nidda.de")?.url).toBe("https://www.nidda.de/news/balkonsolar/");
  });
});
