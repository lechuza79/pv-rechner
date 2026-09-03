import { describe, it, expect } from "vitest";
import { SEO_GRUNDREGELN, UNZULAESSIGE_BEGRUENDUNGEN } from "../seo-grundregeln";
import { RELEASE_PLAN } from "../release-plan";
import { FREIGABE_NACHWEIS } from "../atlas-index";

/**
 * Die Grundregeln sind nur dann eine Absicherung, wenn sie auf die Nachweise
 * angewandt werden — sonst sind sie ein Merkzettel, den beim nächsten Mal
 * niemand liest. Genau das ist am 29.08.2026 fünfmal passiert.
 */
describe("SEO-Grundregeln", () => {
  it("trägt jede Regel einen Beleg und den Fehlschluss, den sie verhindert", () => {
    for (const r of SEO_GRUNDREGELN) {
      expect(r.beleg.length, `${r.id}: Beleg fehlt oder ist zu dünn`).toBeGreaterThan(60);
      expect(r.verhindert.length, `${r.id}: verhinderter Fehlschluss fehlt`).toBeGreaterThan(30);
      // Ein Beleg nennt eine Fundstelle oder ein Messdatum — „ist bekannt" ist keiner.
      expect(r.beleg, `${r.id}: Beleg ohne Fundstelle oder Datum`).toMatch(
        /Search Central|gemessen|Gemessen|\d{2}\.\d{2}\.\d{4}/,
      );
    }
  });

  it("verwendet kein Freigabe-Nachweis mehr eine unzulässige Begründung", () => {
    const texte: { wo: string; text: string }[] = [];
    for (const s of RELEASE_PLAN) {
      if (!s.nachweis) continue;
      texte.push({ wo: `Schub ${s.id}`, text: `${s.nachweis.nachfrage} ${s.nachweis.kannibalisierung}` });
    }
    for (const [ebene, n] of Object.entries(FREIGABE_NACHWEIS)) {
      if (n) texte.push({ wo: `Ebene ${ebene}`, text: `${n.nachfrage} ${n.kannibalisierung}` });
    }

    const treffer: string[] = [];
    for (const { wo, text } of texte) {
      for (const u of UNZULAESSIGE_BEGRUENDUNGEN) {
        if (u.muster.test(text)) treffer.push(`${wo}: ${u.warum}`);
      }
    }
    expect(treffer, "Ein Nachweis stützt sich auf einen widerlegten Schluss").toEqual([]);
  });

  it("nennt jeder Nachweis, WORAUF er sich stützt — nicht nur ein Ergebnis", () => {
    // „Nein." allein ist kein Nachweis. Es muss erkennbar sein, was gemessen
    // wurde: ein Ergebnisseiten-Aufbau, ein Wettbewerbsvergleich, eine Zahl mit
    // Quelle. Sonst ist die Entscheidung beim nächsten Lesen nicht überprüfbar.
    for (const s of RELEASE_PLAN) {
      if (!s.nachweis) continue;
      expect(s.nachweis.nachfrage.length, `${s.id}: Nachweis zu knapp, um überprüfbar zu sein`).toBeGreaterThan(80);
    }
  });
});
