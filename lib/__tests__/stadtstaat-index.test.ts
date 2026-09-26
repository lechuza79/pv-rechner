import { describe, it, expect } from "vitest";
import { ortsseiteIndexierbar, atlasIsIndexable, GEMEINDE_MIN_ANLAGEN } from "../atlas-index";
import { ortsseitenPfad, istStadtstaat } from "../atlas-orte";

/**
 * Die Ortsseite eines Stadtstaats IST die Landesseite.
 *
 * DER ANLASS (23.09.2026, an der Produktion gemessen): Seit Hamburg und Berlin
 * unter der kurzen Adresse ihres Bundeslands wohnen, beurteilte die Seite sich
 * weiter nach der Gemeinde-Regel — und die Ebene ist gesperrt. Ergebnis:
 * Bayern und Bremen trugen „index, follow", Hamburg und Berlin „noindex,
 * nofollow", und alle vier standen in der Sitemap. Zwei seit Monaten
 * indexierte Landesseiten wären still aus dem Index gefallen; angemeldet und
 * gleichzeitig abgemeldet ist der Widerspruch, den Google als Fehler meldet.
 *
 * Von aussen war davon nichts zu sehen: kein Fehler, kein roter Test, die
 * Seite sah richtig aus.
 */
describe("Ortsseite eines Stadtstaats", () => {
  it("wird als Bundesland beurteilt, nicht als Gemeinde", () => {
    // Hamburg (02000) und Berlin (11000) — die beiden einzigen.
    for (const ags of ["02000000", "11000000"]) {
      expect(istStadtstaat(ags), ags).toBe(true);
      expect(ortsseiteIndexierbar(ags, { einzeln: false, anlagen: 0 }), ags).toBe(
        atlasIsIndexable("bundesland"),
      );
    }
  });

  it("liegt unter der kurzen Adresse — sonst waere die Regel gar nicht noetig", () => {
    expect(ortsseitenPfad("02000000", "hamburg", "hamburg", "hamburg")).toBe("/solar-atlas/hamburg");
    expect(ortsseitenPfad("09679147", "bayern", "landkreis-wuerzburg", "hoechberg")).toBe(
      "/solar-atlas/bayern/landkreis-wuerzburg/hoechberg",
    );
  });

  it("Bremen gehoert NICHT dazu: dort ist Bremerhaven ein echter zweiter Kreis", () => {
    expect(istStadtstaat("04011000")).toBe(false);
    expect(ortsseiteIndexierbar("04011000", { einzeln: false, anlagen: 99999 })).toBe(
      atlasIsIndexable("gemeinde", 99999),
    );
  });

  it("aendert an der gewoehnlichen Ortsseite nichts", () => {
    const ags = "09679147";
    expect(ortsseiteIndexierbar(ags, { einzeln: false, anlagen: 500 })).toBe(
      atlasIsIndexable("gemeinde", 500),
    );
    // Einzelfreigabe: der Ort zaehlt seine Anlagen selbst.
    expect(ortsseiteIndexierbar(ags, { einzeln: true, anlagen: GEMEINDE_MIN_ANLAGEN })).toBe(true);
    expect(ortsseiteIndexierbar(ags, { einzeln: true, anlagen: GEMEINDE_MIN_ANLAGEN - 1 })).toBe(false);
  });
});
