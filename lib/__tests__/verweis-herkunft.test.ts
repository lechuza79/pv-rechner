import { describe, it, expect } from "vitest";
import { ordneVerweise, belegteVerweise, type VerweisEingabe } from "../verweis-herkunft";

// Die echte Messung vom 01.10.2026. Der Bericht meldete damals 2 Verweise.
const VERLINKEND = new Map<string, string>([
  ["app.meindorfnet.de", "https://app.meindorfnet.de/news/7358?app_id=7"],
  ["bestonlinecasinomexico.online", "https://bestonlinecasinomexico.online/link-profile-hub/high-quality"],
  ["betulcrime.com", "https://betulcrime.com/all/2681/11.html"],
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

// Dieselben vier Seiten schickten an diesem Tag Besucher, ohne dass die
// Backlink-Prüfung sie kannte — der Grund, warum es zwei Quellen gibt.
const BESUCHER = new Map<string, number>([
  ["nidda.de", 17],
  ["trier.de", 13],
  ["ln-online.de", 9],
  ["herzogtum-direkt.de", 8],
  ["heringen.de", 5],
  ["nachrichten-kl.de", 5],
  ["riedstadt.de", 1],
  ["lokalo.de", 1],
]);

const GEMEINDEN = new Map<string, string>([
  ["heringen.de", "Heringen (Werra)"],
  ["nidda.de", "Nidda"],
  ["riedstadt.de", "Riedstadt"],
  ["trier.de", "Trier"],
  ["meinersen.de", "Meinersen"],
]);

const BEITRAGS_DOMAINS = new Set([
  "wetterau.news", "gude.news", "herzogtum-direkt.de", "nachrichten-kl.de",
  "suedhessen.app", "app.wallertheim.de", "nidda.de", "heringen.de",
]);

const EINGABE: VerweisEingabe = {
  verlinkend: VERLINKEND,
  besucherJeDomain: BESUCHER,
  gemeinden: GEMEINDEN,
  beitragsDomains: BEITRAGS_DOMAINS,
};

describe("Herkunft der Verweise", () => {
  it("zählt die Presse mit, nicht nur Gemeinde-Domains", () => {
    const h = ordneVerweise(EINGABE);
    expect(h.beitraege.map((b) => b.domain)).toEqual([
      "gude.news", "herzogtum-direkt.de", "nachrichten-kl.de", "suedhessen.app", "wetterau.news",
    ]);
  });

  it("findet Seiten, die nur die Besucherherkunft kennt", () => {
    const h = ordneVerweise(EINGABE);
    // trier.de und riedstadt.de sind Gemeinden, ln-online.de und lokalo.de nicht —
    // alle vier stehen in keiner Backlink-Datenbank und verlinken trotzdem.
    expect(h.gemeinden.map((g) => g.gemeinde)).toContain("Trier");
    expect(h.gemeinden.map((g) => g.gemeinde)).toContain("Riedstadt");
    expect(h.besucher.map((b) => b.domain)).toEqual(["ln-online.de", "lokalo.de"]);
    // Die alte Fassung meldete 2.
    expect(belegteVerweise(h)).toBe(11);
  });

  it("sagt, aus welcher Quelle ein Verweis bekannt ist", () => {
    const h = ordneVerweise(EINGABE);
    const q = (d: string) => [...h.gemeinden, ...h.beitraege, ...h.besucher, ...h.unzugeordnet].find((v) => v.domain === d)?.quelle;
    expect(q("nidda.de")).toBe("beides");
    expect(q("trier.de")).toBe("besucher");
    expect(q("wetterau.news")).toBe("verlinkung");
  });

  it("zählt nichts, was keiner eigenen Quelle zuzuordnen ist", () => {
    const h = ordneVerweise(EINGABE);
    expect(h.unzugeordnet.map((u) => u.domain)).toEqual([
      "app.meindorfnet.de", "bestonlinecasinomexico.online", "betulcrime.com",
      "cvillico.com", "top5casino.online",
    ]);
    // Spam verlinkt, schickt aber niemanden.
    expect(h.unzugeordnet.every((u) => !u.besucher)).toBe(true);
  });

  it("zählt eine Domain nur einmal, auch wenn sie mehreres ist", () => {
    const h = ordneVerweise(EINGABE);
    const alle = [...h.gemeinden, ...h.beitraege, ...h.besucher, ...h.unzugeordnet].map((x) => x.domain);
    expect(new Set(alle).size).toBe(alle.length);
    expect(alle.length).toBe(new Set([...VERLINKEND.keys(), ...BESUCHER.keys()]).size);
  });

  it("ordnet eine Gemeinde ohne jeden Verweis nicht zu", () => {
    const h = ordneVerweise(EINGABE);
    expect(h.gemeinden.some((g) => g.gemeinde === "Meinersen")).toBe(false);
  });

  it("gibt die verlinkende Seite mit, wo sie bekannt ist", () => {
    const h = ordneVerweise(EINGABE);
    expect(h.gemeinden.find((g) => g.domain === "nidda.de")?.url).toBe("https://www.nidda.de/news/balkonsolar/");
    // Nur über Besucher bekannt: keine Adresse, und das wird nicht erfunden.
    expect(h.gemeinden.find((g) => g.domain === "trier.de")?.url).toBe("");
  });
});
