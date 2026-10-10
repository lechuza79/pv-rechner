import { describe, expect, it } from "vitest";
import { nenntAngeschriebeneGemeinde, ohneZitat, ordneEin, ortAusAbsender } from "../outreach-ruecklauf";


describe("Antwort von einer fremden Amtsdomain", () => {
  const gemeinden = [
    { region_id: "01053009", name: "Berkenthin" },
    { region_id: "01053094", name: "Niendorf bei Berkenthin" },
    { region_id: "16063064", name: "Berg" },
    { region_id: "09999999", name: "Linden" },
    { region_id: "06531005", name: "Heringen (Werra)" },
  ];
  it("ordnet den Bürgermeister des Amtes seiner Gemeinde zu", () => {
    // Echter Fall vom 13.09.2026: Brief an berkenthin.de, Antwort von
    // amt-berkenthin.de, Betreff „Pressemitteilung".
    expect(ortAusAbsender("bgm.berkenthin@amt-berkenthin.de", [gemeinden[0], gemeinden[2]])?.name).toBe("Berkenthin");
  });
  it("bleibt still, wenn zwei angeschriebene Orte passen", () => {
    expect(ortAusAbsender("bgm.berkenthin@amt-berkenthin.de", gemeinden)).toBeNull();
  });
  it("nimmt einen Namen nicht mitten aus einem Wort", () => {
    expect(ortAusAbsender("info@lindenberg.de", gemeinden)).toBeNull();
    expect(ortAusAbsender("info@heringsdorf.de", gemeinden)).toBeNull();
  });
  it("lässt fremde Absender in Ruhe", () => {
    for (const von of ["franziska.kremer@solakon.de", "mailer-daemon@dd23208.kasserver.com", "no-reply@awin.com"]) {
      expect(ortAusAbsender(von, gemeinden)).toBeNull();
    }
  });
  it("findet den Ort auch mit Umlaut und Klammerzusatz", () => {
    expect(ortAusAbsender("post@stadt-heringen.de", [gemeinden[4]])?.region_id).toBe("06531005");
    expect(ortAusAbsender("info@amt-luebbecke.de", [{ region_id: "05770020", name: "Lübbecke" }])?.name).toBe("Lübbecke");
  });
});


describe("Was überhaupt nach einem Rückläufer klingt", () => {
  const gemeinden = [
    { region_id: "01053009", name: "Berkenthin" },
    { region_id: "07211000", name: "Trier" },
    { region_id: "05111000", name: "Düsseldorf" },
  ];

  // Echte Mails vom 22.09.2026: Vier Nachrichten des Shop-Partners gingen als
  // „sieht nach einer echten Antwort aus" an den Betreiber. In keiner steht ein
  // Gemeindename — in Berkenthins Pressemitteilung steht einer, obwohl sie
  // weder unseren Betreff noch einen Bezug auf unsere Nachricht trägt.
  it("erkennt geschäftliche Post als nichts für den Rücklauf", () => {
    expect(
      nenntAngeschriebeneGemeinde("Re: Rückmeldung Solakon\nHallo, anbei die Konditionen zum Partnerprogramm.", gemeinden),
    ).toEqual([]);
  });

  it("erkennt eine Antwort, die den Ort nennt", () => {
    const orte = nenntAngeschriebeneGemeinde(
      "Pressemitteilung\nIch habe daraus eine Pressemitteilung gemacht: Berkenthin erreicht Platz 1 …",
      gemeinden,
    );
    expect(orte.map((o) => o.name)).toEqual(["Berkenthin"]);
  });

  it("meldet auch, wenn mehrere Orte vorkommen — dann ist Hinsehen erst recht nötig", () => {
    expect(nenntAngeschriebeneGemeinde("Trier und Berkenthin", gemeinden)).toHaveLength(2);
  });

  it("nimmt einen Namen nicht mitten aus einem Wort", () => {
    expect(nenntAngeschriebeneGemeinde("Düsseldorfer Straße 1", gemeinden)).toEqual([]);
  });
});

// Real case (05.10.2026): a local newsroom answered our press release from an
// English-language mail client. The quote header "On <date> <name> wrote:" was
// not recognised, so the search for objection words ran through our OWN quoted
// footer ("Keine weiteren Mails gewünscht?") and classified a fee offer as an
// objection. For a municipality that would have meant a permanent block.
describe("Zitatkopf englischer Mailprogramme", () => {
  const antwort = [
    "Hallo Herr Schäder,",
    "",
    "gerne können wir gegen ein Honorar Ihre Pressemitteilung veröffentlichen.",
    "",
    "Herzliche Grüße",
    "",
    "On Wednesday, September 30, 2026 13:12 CEST, Sebastian Schäder <sebastian@solar-check.io> wrote:",
    "",
    "PRESSEMITTEILUNG",
    "Ihre Adresse stammt aus dem Impressum Ihrer Website und wird nur für diese Nachricht genutzt. Keine weiteren Mails gewünscht? Eine kurze Antwort genügt.",
  ].join("\n");

  it("schneidet den zitierten Brief ab", () => {
    expect(ohneZitat(antwort)).not.toMatch(/keine weiteren mails/i);
    expect(ohneZitat(antwort)).toMatch(/Honorar/);
  });

  it("stuft die Antwort nicht als Widerspruch ein", () => {
    expect(ordneEin({ von: "redaktion@example.de", betreff: "Re: Pressemitteilung", text: antwort })).not.toBe("widerspruch");
  });

  it("lässt einen Satz mit „on“ und „wrote“ im eigenen Text stehen", () => {
    const eigen = "Wir haben online darüber berichtet, the editor wrote: bitte keine weiteren Mails.";
    expect(ohneZitat(eigen)).toBe(eigen);
  });
});
