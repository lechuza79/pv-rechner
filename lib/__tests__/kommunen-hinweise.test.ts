import { describe, expect, it } from "vitest";
import { hinweisBericht, neueHinweise, schonVermerkt } from "../kommunen-hinweise";

// Die Fälle sind die echten vom 22.09.2026: Was damals schon vermerkt war, darf
// nicht wiederkommen, und was liegen gelassen wurde, muss erscheinen.
describe("Hinweise auf Veröffentlichungen", () => {
  const riedstadt =
    "[2026-09-22] veröffentlicht (von Hand geprüft): https://www.rheinmainverlag.de/2026/09/22/riedstadt-mit-spitzenplatz-in-hessen-beim-privaten-klimaschutz (Regionalzeitung)";

  it("erkennt eine schon vermerkte Adresse, auch mit www und Schrägstrich", () => {
    expect(
      schonVermerkt("https://rheinmainverlag.de/2026/09/22/riedstadt-mit-spitzenplatz-in-hessen-beim-privaten-klimaschutz/", riedstadt),
    ).toBe(true);
  });

  it("ein zweiter Artikel derselben Zeitung ist NEU", () => {
    expect(schonVermerkt("https://www.rheinmainverlag.de/2026/10/01/riedstadt-nochmal", riedstadt)).toBe(false);
  });

  it("eine bloße Domain gilt als vermerkt, wenn sie in der Notiz steht", () => {
    expect(schonVermerkt("riedstadt.de", "[2026-09-22] eigene Meldung: https://www.riedstadt.de/rathaus/x.html")).toBe(true);
  });

  it("Facebook-Hostnamen sind eine Fundstelle, und der alte Vermerk nennt nur den Namen", () => {
    const heringen = "[2026-08-28] veröffentlicht über Facebook, heringen.de (erster Besuch von dort)";
    for (const h of ["lm.facebook.com", "m.facebook.com", "facebook.com", "l.facebook.com"]) {
      expect(schonVermerkt(h, heringen)).toBe(true);
    }
  });

  it("der Ortsname im Betreff macht die Domain der Gemeinde NICHT bekannt", () => {
    // Meinersens Notiz enthält den Ortsnamen im Betreff der Antwort; ein erster
    // Besuch von der eigenen Website ist trotzdem neu.
    expect(schonVermerkt("sg-meinersen.de", "[2026-09-16] AW: Meinersen beim Solar-Zubau auf Platz 1")).toBe(false);
  });

  it("die liegen gelassenen Fälle vom 22.09. erscheinen, die vermerkten nicht", () => {
    const notizen = new Map<string, string | null>([
      ["Berkenthin", null],
      ["Heringen (Werra)", "veröffentlicht über Facebook, heringen.de"],
    ]);
    const neu = neueHinweise(
      [
        { gemeinde: "Berkenthin", fundstelle: "herzogtum-direkt.de", quelle: "Besucher" },
        { gemeinde: "Berkenthin", fundstelle: "herzogtum-direkt.de", quelle: "Besucher" },
        { gemeinde: "Heringen (Werra)", fundstelle: "m.facebook.com", quelle: "Besucher" },
      ],
      notizen,
    );
    expect(neu.map((h) => h.gemeinde)).toEqual(["Berkenthin"]);
  });

  it("der Bericht wird auch leer abgelegt und sagt das", () => {
    expect(hinweisBericht([], "Besucherherkunft").done[0]).toMatch(/keine neuen Hinweise/);
    const b = hinweisBericht([{ gemeinde: "Berkenthin", fundstelle: "herzogtum-direkt.de", quelle: "Besucher" }], "Besucherherkunft");
    expect(b.done[0]).toMatch(/1 neuer Hinweis/);
    expect(b.details).toContain("Berkenthin — herzogtum-direkt.de");
  });
});

describe("Beitragsnummer statt voller Adresse", () => {
  const aue = "[2026-09-22] veröffentlicht: https://www.facebook.com/StadtAue/posts/1375797844665308/";
  it("derselbe Facebook-Beitrag mit lesbarem Pfadstück gilt als vermerkt", () => {
    expect(
      schonVermerkt("https://www.facebook.com/StadtAue/posts/wusstet-ihr-schonaue-bad-schlema/1375797844665308/", aue),
    ).toBe(true);
  });
  it("ein anderer Beitrag derselben Seite ist neu", () => {
    expect(schonVermerkt("https://www.facebook.com/StadtAue/posts/886307373614360/", aue)).toBe(false);
  });
  it("eine kurze Nummer genügt nicht", () => {
    expect(schonVermerkt("https://app.meindorfnet.de/news/7358?app_id=7", "https://app.wallertheim.de/news/7358")).toBe(false);
  });
});
