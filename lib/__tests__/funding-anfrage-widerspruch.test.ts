import { describe, expect, it } from "vitest";
import { renderInquiryDraft } from "../funding-inquiry-draft";
import { fehlendePflichtangaben } from "../outreach-mail";
import { FUNDING_PROGRAMS } from "../funding-programs";
import { OFFENE_FRAGEN } from "../../scripts/funding-anfrage";

/**
 * Eine Sachfrage, die an eine Behörde hinausgeht, ist ein veröffentlichter Text
 * wie jeder andere — nur dass ihn kein Nutzer korrigieren kann, wenn er falsch
 * ist. Er ist dann weg.
 *
 * DIE FEHLERKLASSE, GEGEN DIE HIER GEBAUT WIRD (09.09.2026): Der Entwurfstext
 * gab es nur in EINER Fassung — „Ihre Seite ist durch einen Bot-Schutz
 * gesichert". Für Waldalgesheim wäre das eine Falschaussage gewesen: Die Seite
 * ist bestens erreichbar, sie sagt nur zwei verschiedene Dinge. Wer einer
 * Gemeinde etwas über ihre eigene Website schreibt, das nicht stimmt, bekommt
 * keine Antwort mehr — und verdient sie auch nicht.
 */
describe("Sachfrage bei widersprüchlichen Angaben", () => {
  const angaben = [
    { fundstelle: "im Text der Förderseite", wert: "100 € je Haushalt" },
    { fundstelle: "in der Richtlinie daneben", wert: "200 € je Haushalt" },
  ];
  const basis = {
    programName: "Installation von Balkon-Photovoltaik-Anlagen",
    traeger: "Ortsgemeinde Waldalgesheim",
    url: "https://waldalgesheim.de/foerderung-balkonkraftwerke/",
    hinterlegt: ["Balkonkraftwerk: 100 € pauschal je Haushalt"],
    standIso: "2026-09-09",
  };
  const widerspruch = renderInquiryDraft({ ...basis, anlass: { art: "widerspruch", angaben } });

  it("behauptet keinen Bot-Schutz, wo keiner ist", () => {
    expect(widerspruch.body).not.toContain("Bot-Schutz");
    expect(widerspruch.body).not.toContain("nicht erreichbar");
  });

  it("nennt beide Angaben mit ihrer Fundstelle", () => {
    expect(widerspruch.body).toContain("- im Text der Förderseite: 100 € je Haushalt");
    expect(widerspruch.body).toContain("- in der Richtlinie daneben: 200 € je Haushalt");
  });

  it("sagt, was wir bis zur Antwort ausweisen", () => {
    // Ohne diesen Satz sieht die Stelle auf unserer Seite eine der beiden Zahlen
    // stehen und weiß nicht, ob wir uns schon entschieden haben.
    expect(widerspruch.body).toContain("die vorsichtigere aus");
  });

  it("gibt das Lesedatum als Lesedatum aus, nicht als „belegten Stand“", () => {
    // Wer im selben Absatz zwei Werte von der Seite zitiert und behauptet, er
    // habe keinen Stand, widerspricht sich vor den Augen des Empfängers.
    expect(widerspruch.body).toContain("Gelesen habe ich die Seite zuletzt am 09.09.2026.");
    expect(widerspruch.body).not.toContain("letzter belegter Stand");
  });

  it("ein einzelner Wert ist kein Widerspruch", () => {
    expect(() =>
      renderInquiryDraft({ ...basis, anlass: { art: "widerspruch", angaben: [angaben[0]] } }),
    ).toThrow();
  });

  it("der unerreichbare Fall bleibt unverändert", () => {
    const alt = renderInquiryDraft(basis);
    expect(alt.body).toContain("Bot-Schutz");
    expect(alt.body).toContain("Unser letzter belegter Stand ist vom 09.09.2026.");
  });

  it("trägt Klarname, Impressum, Datenschutz und den Herkunftshinweis", () => {
    // Der Auslöser für Art. 14 ist nicht die Mail, sondern dass die Adresse der
    // Stelle in unserer Kontakttabelle liegt — erhoben aus ihrem Impressum.
    expect(fehlendePflichtangaben(widerspruch.body)).toEqual([]);
  });

  it("nennt die eigene Fundstelle erst NACH der Frage", () => {
    // Ein Link von uns als Erstes gelesen macht aus einer Sachfrage eine Mail,
    // die etwas will. Steht er hinter der Aufzählung, ist er das, was er sein
    // soll: der Ort zum Nachsehen.
    const mit = renderInquiryDraft({
      ...basis,
      anlass: { art: "widerspruch", angaben },
      unsereSeite: "https://solar-check.io/balkonkraftwerk/foerderung",
    });
    expect(mit.body).toContain("So steht das Programm derzeit bei mir: https://solar-check.io/balkonkraftwerk/foerderung");
    expect(mit.body.indexOf("solar-check.io/balkonkraftwerk")).toBeGreaterThan(mit.body.indexOf("Welche Angabe ist die gültige?"));
  });

  it("ohne eigene Seite steht dort auch keine Zeile", () => {
    // Ein reines PV-Programm ohne freigegebene Ortsseite hat keine Adresse, die
    // wir zeigen könnten. Eine erfundene wäre ein toter Link an eine Behörde.
    expect(widerspruch.body).not.toContain("So steht das Programm derzeit bei mir");
  });

  it("nennt den Programmnamen nur im Betreff", () => {
    // Er steht dort bereits; ihn im ersten Satz zu wiederholen ist derselbe
    // Satz zweimal.
    expect(widerspruch.subject).toContain(basis.programName);
    expect(widerspruch.body).not.toContain(basis.programName);
  });

  it("wirbt nicht — sonst wäre die Mail Kaltakquise", () => {
    for (const wort of ["Widget", "Kooperation", "Partnerschaft", "verlinken Sie", "kostenlos anbieten"]) {
      expect(widerspruch.body).not.toContain(wort);
    }
  });
});

describe("Die offenen Fragen decken sich mit dem Katalog", () => {
  it("jede Frage nennt ein Programm, das es gibt", () => {
    for (const id of Object.keys(OFFENE_FRAGEN)) {
      expect(FUNDING_PROGRAMS[id], id).toBeTruthy();
    }
  });

  it("die Zahlen der Frage stehen auch in den Bedingungen des Programms", () => {
    // ZWEI FASSUNGEN DERSELBEN SACHE, und deshalb aneinandergenagelt: Die
    // Bedingung auf der Stadtseite erklärt dem Leser den Widerspruch in Prosa,
    // die Frage hier braucht ihn strukturiert. Laufen sie auseinander, fragen
    // wir die Gemeinde nach etwas anderem, als wir öffentlich behaupten.
    for (const [id, angaben] of Object.entries(OFFENE_FRAGEN)) {
      const text = (FUNDING_PROGRAMS[id].conditions ?? [])
        .map((c) => (typeof c === "string" ? c : c.text))
        .join(" ");
      for (const a of angaben) {
        const zahl = a.wert.replace(/\D+/g, "");
        expect(text.replace(/\./g, ""), `${id}: ${a.wert} fehlt in den Bedingungen`).toContain(zahl);
      }
    }
  });
});
