import { describe, it, expect } from "vitest";
import {
  aboBestaetigungsMail,
  aboMailKopfzeilen,
  aboMeldungsMail,
  fehlendeAboPflichtangaben,
} from "../abo-mail";
import type { Meldung } from "../gemeinde-meldungen";

// Was in einer Abo-Mail stehen MUSS und was darin nichts zu suchen hat.
//
// Die drei Unterschiede zum Kommunen-Anschreiben sind hier festgenagelt, weil
// sie beim Kopieren aus dem Anschreiben genau falsch herum landen würden: Dort
// ist die Abmelde-Kopfzeile absichtlich weg und die Herkunftszeile nennt
// Art. 14 — beides wäre hier ein Fehler, und keiner davon sähe im Browser
// verkehrt aus.

const MELDUNG: Meldung = {
  schluessel: "auslauf-2026",
  art: "stichtag",
  titel: "40 Anlagen in Musterdorf verlieren Ende 2026 die Einspeisevergütung",
  text: "In Musterdorf stehen 40 Anlagen auf privaten Dächern, die 2006 ans Netz gingen.",
  gewicht: 100,
};

const ABMELDEN = "https://solar-check.io/abo/abmelden?t=abc.unsub.def";

describe("Bestätigungsmail", () => {
  const m = aboBestaetigungsMail({
    ortName: "Musterdorf",
    bestaetigenUrl: "https://solar-check.io/abo/bestaetigen?t=x.1.y",
  });

  it("nennt den Ort im Betreff", () => {
    expect(m.subject).toContain("Musterdorf");
  });

  it("trägt den Bestätigungslink", () => {
    expect(m.html).toContain("/abo/bestaetigen?t=x.1.y");
    expect(m.text).toContain("/abo/bestaetigen?t=x.1.y");
  });

  it("nennt Art. 13, NICHT Art. 14", () => {
    // Beim Kaltbrief stammt die Adresse aus einer fremden Quelle (Art. 14).
    // Hier hat der Empfänger sie selbst eingetragen — ein „wir haben Ihre
    // Adresse im Internet gefunden" wäre schlicht falsch.
    expect(m.html).toContain("Art. 13 DSGVO");
    expect(m.html).not.toContain("Art. 14");
  });

  it("hat KEINEN Abmeldelink", () => {
    // Es gibt noch nichts, wovon man sich abmelden könnte. Und eine
    // Abmelde-Kopfzeile auf einer transaktionalen Mail lässt Postfächer die
    // Bestätigung selbst als Werbung einstufen.
    expect(m.html).not.toContain("/abo/abmelden");
  });
});

describe("Meldungsmail", () => {
  const m = aboMeldungsMail({
    ortName: "Musterdorf",
    ortUrl: "https://solar-check.io/solar-atlas/hessen/fulda/musterdorf",
    meldungen: [MELDUNG],
    abmeldeUrl: ABMELDEN,
    standLabel: "5. August 2026",
  });

  it("nimmt die Überschrift der stärksten Meldung als Betreff", () => {
    expect(m.subject).toBe(MELDUNG.titel);
  });

  it("trägt Abmeldelink, Impressum, Datenschutz und den Grund", () => {
    expect(fehlendeAboPflichtangaben(m.html)).toEqual([]);
  });

  it("sagt, warum die Mail kam", () => {
    expect(m.html).toMatch(/Diese E-Mail bekommst du, weil du Meldungen zu Musterdorf abonniert hast/);
  });

  it("weist den Datenstand und den Vorbehalt aus", () => {
    // „Geschätzt heißt geschätzt" — das Wort steht in der Mail, nicht nur in
    // einer Fußnote auf der Seite.
    expect(m.html).toContain("5. August 2026");
    expect(m.html).toMatch(/gerechnet, nicht gemessen/);
  });

  it("verlinkt die Seite, auf der dieselben Zahlen stehen", () => {
    expect(m.html).toContain("/solar-atlas/hessen/fulda/musterdorf");
  });

  it("baut keine Mail ohne Meldung", () => {
    // Eine Meldungsmail ohne Meldung wäre eine Mail, für die es keinen Anlass
    // gibt — genau die, nach der sich Leute abmelden. Der Versand entscheidet
    // das vorher; hier wird es hart abgelehnt statt still eine leere Mail
    // gebaut.
    expect(() =>
      aboMeldungsMail({
        ortName: "Musterdorf",
        ortUrl: "https://solar-check.io/x",
        meldungen: [],
        abmeldeUrl: ABMELDEN,
        standLabel: "5. August 2026",
      }),
    ).toThrow();
  });

  it("schützt Sonderzeichen im Ortsnamen", () => {
    const boese = aboMeldungsMail({
      ortName: 'Muster<script>alert("x")</script>dorf',
      ortUrl: "https://solar-check.io/x",
      meldungen: [MELDUNG],
      abmeldeUrl: ABMELDEN,
      standLabel: "5. August 2026",
    });
    expect(boese.html).not.toContain("<script>");
  });
});

describe("Kopfzeilen", () => {
  it("bietet die Ein-Klick-Abmeldung an", () => {
    // ANDERS ALS BEIM ANSCHREIBEN, und das ist der Punkt: Dort erzeugt die
    // Kopfzeile ein „Mailing-Liste"-Banner über einem persönlichen Brief. Hier
    // IST es eine Liste — das Banner sagt die Wahrheit, und der Ein-Klick ist
    // genau das, was der Anmeldeknopf zusagt.
    const k = aboMailKopfzeilen(ABMELDEN);
    expect(k["List-Unsubscribe"]).toBe(`<${ABMELDEN}>`);
    expect(k["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
  });
});

describe("Pflichtangaben-Prüfung", () => {
  it("meldet, was fehlt — statt es durchzulassen", () => {
    // Gegenprobe: Der Wächter muss anschlagen, wenn die Angaben fehlen. Ein
    // Prüfer, der bei leerem Text „alles da" sagt, ist schlimmer als keiner.
    const fehlt = fehlendeAboPflichtangaben("<p>Hallo</p>");
    expect(fehlt).toContain("Abmeldelink");
    expect(fehlt).toContain("Impressum-Link");
    expect(fehlt).toContain("Datenschutz-Link");
    expect(fehlt).toContain("Grund der Zusendung");
  });
});
