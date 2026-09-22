import { describe, expect, it } from "vitest";
import { postfachTauglich } from "../kontakt-tauglichkeit";

describe("Taugt ein Postfach für ein Anschreiben?", () => {
  it("weist Postfächer ab, die nie einen Brief von uns bekommen", () => {
    for (const m of ["datenschutz@essen.de", "noreply@firma.de", "bewerbung@elektro-muster.de", "rechnung@solar.de", "security@stadtwerke.de"]) {
      expect(postfachTauglich(m).ok, m).toBe(false);
    }
  });
  it("weist Platzhalter aus Vorlagen ab", () => {
    for (const m of ["vorname.nachname@kistlerneueenergie.de", "email@example.com", "info@website.com", "max.mustermann@firma.de"]) {
      expect(postfachTauglich(m).ok, m).toBe(false);
    }
  });
  it("lässt gewöhnliche Postfächer durch — auch Gratis-Anbieter und webmaster@", () => {
    for (const m of ["info@elektro-ilg.de", "kesselgruber@email.de", "buckgmbh@t-online.de", "webmaster@norstedt.de", "pressestelle@flensburg.de"]) {
      expect(postfachTauglich(m).ok, m).toBe(true);
    }
  });
  it("weist kaputte Adressen ab", () => {
    expect(postfachTauglich("info@quartiersnetz-bayern.de​").ok).toBe(false);
    expect(postfachTauglich("kein-postfach").ok).toBe(false);
  });
});
