import { describe, expect, it } from "vitest";
import {
  hinweisBericht,
  hinweisZeileLesen,
  neueHinweise,
  offeneHinweisZeilen,
  schonVermerkt,
} from "../kommunen-hinweise";

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

// Die Übersicht zeigt den ABGELEGTEN Bericht des letzten wöchentlichen Laufs.
// Bis zum 23.09.2026 zeigte sie ihn wörtlich — ein Hinweis, der am Dienstag
// abgearbeitet wurde, stand bis zum nächsten Montag weiter als offen da. Der
// gemessene Fall: Bocholt, am 22.09. geprüft und in der Notiz verworfen, stand
// am 23.09. erneut in der Liste und wurde ein zweites Mal aufgerufen und
// gelesen. Genau davor soll dieses Modul schützen — eine Liste, die zur Hälfte
// aus Erledigtem besteht, liest irgendwann niemand mehr.
describe("Offene Zeilen eines abgelegten Berichts", () => {
  const BOCHOLT_URL =
    "https://www.bbv-net.de/bocholt/photovoltaik-ausbau-bocholt-platz-3-im-monitor-2026-solarenergie-enpal-solaranlage-w1162021-6000509794/";
  const BOCHOLT = `Bocholt — ${BOCHOLT_URL} (Websuche, Titel passt, uns nicht genannt)`;
  const WALLERTHEIM = "Wallertheim — m.baidu.com (1 Besucher von dort, seit 2026-08-04)";

  it("zerlegt eine Berichtszeile in Gemeinde und Fundstelle", () => {
    expect(hinweisZeileLesen(BOCHOLT)).toEqual({ gemeinde: "Bocholt", fundstelle: BOCHOLT_URL });
    expect(hinweisZeileLesen(WALLERTHEIM)).toEqual({ gemeinde: "Wallertheim", fundstelle: "m.baidu.com" });
  });

  it("die Adresse behält ihre eigenen Bindestriche", () => {
    // Getrennt wird am ERSTEN Gedankenstrich: Er trennt Gemeinde und
    // Fundstelle, die Bindestriche im Pfad sind ein anderes Zeichen.
    expect(hinweisZeileLesen(BOCHOLT)!.fundstelle).toContain("solarenergie-enpal-solaranlage");
  });

  it("ein zweiter Gedankenstrich in der Quellenangabe verschiebt die Trennung nicht", () => {
    // Die Websuche hängt den Titel des Treffers an, und Zeitungstitel tragen
    // Gedankenstriche. Am LETZTEN Trenner zerlegt, wäre die halbe Zeile der
    // Ortsname und die Fundstelle verloren — und die Zeile bliebe für immer
    // offen, weil sie zu keiner Gemeinde mehr passt.
    const zeile = "Riedstadt — https://example.invalid/a (Websuche: Riedstadt — Spitzenplatz in Hessen)";
    expect(hinweisZeileLesen(zeile)).toEqual({
      gemeinde: "Riedstadt",
      fundstelle: "https://example.invalid/a",
    });
    // Und der Filter erkennt sie trotzdem als erledigt, wenn die Adresse in der
    // Notiz steht — die Gemeinde stimmt, darauf kommt es an.
    expect(
      offeneHinweisZeilen([zeile], new Map([["Riedstadt", ["gesehen: https://example.invalid/a"]]])),
    ).toEqual([]);
  });

  it("eine Zeile verschwindet, sobald ihr Ergebnis in der Notiz steht", () => {
    const notiz = `[2026-09-22] Hinweis geprüft, keine Veröffentlichung: ${BOCHOLT_URL} — fremde Rangliste.`;
    expect(offeneHinweisZeilen([BOCHOLT], new Map([["Bocholt", [notiz]]]))).toEqual([]);
  });

  it("ohne Vermerk bleibt sie stehen", () => {
    expect(offeneHinweisZeilen([BOCHOLT], new Map([["Bocholt", [null]]]))).toEqual([BOCHOLT]);
    expect(
      offeneHinweisZeilen([BOCHOLT], new Map([["Bocholt", ["[2026-09-01] irgendetwas anderes"]]])),
    ).toEqual([BOCHOLT]);
  });

  it("ein unbekannter Ortsname lässt die Zeile stehen, statt sie zu verschlucken", () => {
    // Ein Hinweis zu viel kostet einen Blick, ein verschwundener die
    // Veröffentlichung.
    expect(offeneHinweisZeilen([BOCHOLT], new Map())).toEqual([BOCHOLT]);
  });

  it("bei mehreren Orten gleichen Namens zählt erst, wenn ALLE vermerkt haben", () => {
    // Die Berichtszeile trägt den Namen, nicht den Gemeindeschlüssel, und
    // Mühlhausen und Senden gibt es mehrfach in Deutschland.
    const zeile = "Senden — https://example.invalid/artikel (Websuche)";
    expect(
      offeneHinweisZeilen([zeile], new Map([["Senden", [`… ${"https://example.invalid/artikel"} …`, null]]])),
    ).toEqual([zeile]);
    expect(
      offeneHinweisZeilen(
        [zeile],
        new Map([["Senden", ["… https://example.invalid/artikel …", "gesehen: example.invalid/artikel"]]]),
      ),
    ).toEqual([]);
  });

  it("eine unlesbare Zeile bleibt stehen", () => {
    const kaputt = "irgendein Text ohne Trenner";
    expect(hinweisZeileLesen(kaputt)).toBeNull();
    expect(offeneHinweisZeilen([kaputt], new Map())).toEqual([kaputt]);
  });
});
