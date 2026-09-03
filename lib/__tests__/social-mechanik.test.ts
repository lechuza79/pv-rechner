import { describe, expect, it } from "vitest";
import { baueAllePosts, type PostBild, type SocialKennzahlen, type SocialPost } from "../social-posts";
import { MECHANIK_REGELN, pruefeMechanisch, sperren } from "../social-mechanik";

/**
 * Die mechanische Prüfung — beide Richtungen.
 *
 * ERSTE RICHTUNG: Jede Sperre muss anschlagen, wenn der Fehler da ist. Ein
 * Wächter, der nichts sieht und trotzdem grün meldet, ist schlimmer als keiner;
 * dieses Projekt hat die Lehre schon zweimal bezahlt. Deshalb bekommt jede
 * Regel hier einen absichtlich kaputten Fall.
 *
 * ZWEITE RICHTUNG, die wichtigere: Keine Sperre darf an gesunder Arbeit
 * anschlagen. Eine Sperre mit Fehlalarm wird abgeschaltet — und nimmt die
 * richtigen mit. Deshalb laufen alle Regeln zusätzlich über ALLE echten
 * Beiträge, und was dort meldet, muss namentlich begründet sein.
 */

const basis = JSON.parse(JSON.stringify({
  standIso: "2026-08-05T00:00:00+00:00",
  stadtLand: { stadtAb: 100000, landUnter: 20000, stadtAnzahl: 80, landAnzahl: 10037, stadtJeTausend: 9.9, landJeTausend: 22.8 },
  wachstum: { balkonJetzt: 1453026, balkonVorJahr: 1202467, solarKwpJetzt: 127100000, solarKwpVorJahr: 117600000 },
  segmente: { privatDachKwp: 36200000, gewerbeDachKwp: 44500000, freiflaecheKwp: 44900000, solarGesamtKwp: 127100000 },
  ueberEinwohner: { mindestEinwohner: 500, betrachtet: 10000, darueber: 6848 },
  foerderung: { programme: 108, gemeinden: 97, nurBalkon: 12, ohneHoechstbetrag: 61, mitAntragVorher: 74 },
  kohorte: { privatAnlagen: 3120000, mittlereKwp: 9.4, speicherEinheiten: 1180000, speicherJe100: 37.8 },
  anomalie: { ort: "Beispielstadt", einwohner: 24500, jeTausend: 61.2, bundesJeTausend: 17.3, mindestEinwohner: 5000 },
  laender: [
    { name: "Niedersachsen", balkonJeTausend: 23.1, wpProKopf: 505, privatDachKwp: 4200000, speicherJe100: 41, freiflaecheAnteil: 17.4, solarKwp: 11300000, wachstumFuenfJahre: 2.23 },
    { name: "Rheinland-Pfalz", balkonJeTausend: 21.7, wpProKopf: 558, privatDachKwp: 2100000, speicherJe100: 36, freiflaecheAnteil: 32.9, solarKwp: 6500000, wachstumFuenfJahre: 2.32 },
    { name: "Brandenburg", balkonJeTausend: 20.5, wpProKopf: 377, privatDachKwp: 1500000, speicherJe100: 24, freiflaecheAnteil: 70.3, solarKwp: 9800000, wachstumFuenfJahre: 2.05 },
    { name: "Nordrhein-Westfalen", balkonJeTausend: 16.1, wpProKopf: 378, privatDachKwp: 6900000, speicherJe100: 33, freiflaecheAnteil: 9.1, solarKwp: 15500000, wachstumFuenfJahre: 2.33 },
    { name: "Thüringen", balkonJeTausend: 18.7, wpProKopf: 295, privatDachKwp: 900000, speicherJe100: 29, freiflaecheAnteil: 39.6, solarKwp: 3300000, wachstumFuenfJahre: 1.75 },
    { name: "Berlin", balkonJeTausend: 7.1, wpProKopf: 72, privatDachKwp: 200000, speicherJe100: 12, freiflaecheAnteil: 0.4, solarKwp: 500000, wachstumFuenfJahre: 3.48 },
    { name: "Hamburg", balkonJeTausend: 6.1, wpProKopf: 84, privatDachKwp: 150000, speicherJe100: 15, freiflaecheAnteil: 0.4, solarKwp: 300000, wachstumFuenfJahre: 4.38 },
  ],
})) as SocialKennzahlen;

const BILD: PostBild = {
  art: "vergleich",
  aussage: "Balkonkraftwerke stehen auf dem Land",
  gemessen: "Angemeldete Geräte je 1.000 Einwohner",
  serien: [
    { label: "Stadt", wert: 9.9, einheit: "je 1.000 Ew.", stellen: 1 },
    { label: "Land", wert: 22.8, einheit: "je 1.000 Ew.", stellen: 1, hervorgehoben: true },
  ],
  quelle: "Marktstammdatenregister (Bundesnetzagentur), dl-de/by-2-0, aggregiert",
  stil: "hell",
};

const post = (ueber: Partial<SocialPost> = {}, bild: Partial<PostBild> = {}): SocialPost => ({
  id: "test",
  titel: "Test",
  kategorie: "g13",
  kanal: ["linkedin"],
  text: "In kleinen Gemeinden stehen mehr Balkonkraftwerke als in Städten.",
  bild: { ...BILD, ...bild },
  belege: [],
  ...ueber,
});

const schluessel = (p: SocialPost) => sperren(pruefeMechanisch(p, basis)).map((b) => b.regel);

describe("Jede Sperre schlägt an, wenn der Fehler da ist", () => {
  it("Link im Beitragstext", () => {
    expect(schluessel(post({ text: "Mehr dazu auf solar-check.io" }))).toContain("kein-link");
  });

  it("Quellenangabe ohne Lizenz", () => {
    // Der Fall, der live stand: Bereitsteller genannt, Lizenz nicht.
    expect(schluessel(post({}, { quelle: "Marktstammdatenregister (Bundesnetzagentur). Eigene Berechnung." }))).toContain(
      "quelle-lizenz",
    );
  });

  it("gar keine Quellenangabe", () => {
    expect(schluessel(post({}, { quelle: "" }))).toContain("quelle-lizenz");
  });

  it("Einheit weder an der Zahl noch sonstwo im Bild — als HINWEIS", () => {
    // Der echte Fund ist schwer (eine Zahl ohne Einheit), aber die Regel
    // meldete an den echten Beiträgen dreimal von vier zu Unrecht: Die Einheit
    // steht abgekürzt an der Serie und ausgeschrieben im Untertitel. Deshalb
    // Hinweis — sie taucht NICHT unter den Sperren auf.
    const p = post({}, {
      einheitAmWert: false,
      gemessen: "Wind- und Solarstrom je Einwohner",
      serien: [
        { label: "Dänemark", wert: 4080, einheit: "kWh je Ew." },
        { label: "Deutschland", wert: 2553, einheit: "kWh je Ew." },
      ],
    });
    expect(pruefeMechanisch(p, basis).map((b) => b.regel)).toContain("einheit-im-bild");
    expect(schluessel(p)).not.toContain("einheit-im-bild");
  });

  it("Jahreszahl mit Tausenderpunkt", () => {
    expect(schluessel(post({ text: "Platz 4 von 6 Ländern, Stand 2.024." }))).toContain("jahr-trennzeichen");
  });

  it("eine Menge im selben Format ist KEIN Treffer", () => {
    // 2.553 Kilowattstunden ist eine gültige Angabe. Der Wertebereich trennt.
    expect(schluessel(post({ text: "Dänemark kam auf 2.553 Kilowattstunden je Einwohner." }))).not.toContain(
      "jahr-trennzeichen",
    );
  });

  it("Rechenrest im sichtbaren Text", () => {
    expect(schluessel(post({}, { aussage: "Jedes 0-te Programm fördert nur noch Balkonkraftwerke" }))).toContain(
      "kaputte-zahl",
    );
  });

  it("Prozentwerte ohne Ganzes", () => {
    const p = post({}, {
      ganzes: undefined,
      serien: [
        { label: "Freifläche", wert: 35.3, einheit: "%" },
        { label: "Privatdach", wert: 28.5, einheit: "%" },
      ],
    });
    expect(schluessel(p)).toContain("prozent-ohne-ganzes");
  });

  it("Grundmenge unter der eigenen Mindestgröße", () => {
    // Der dokumentierte Fehler „16 Einwohner, Platz 1 von 150" — hier im Post.
    const klein = { ...basis, anomalie: { ...basis.anomalie, einwohner: 16 } };
    const p = post({ kategorie: "g10" });
    expect(sperren(pruefeMechanisch(p, klein)).map((b) => b.regel)).toContain("grundmenge");
  });

  it("Richtungswort, das dem Anteil widerspricht", () => {
    // Der dokumentierte Fall: Die Aussage behauptet eine Mehrheit, der Anteil
    // liegt bei 21 Prozent. Beim Drehen der Zahl drehte das Wort nicht mit.
    const p = post({}, {
      ganzes: 100,
      aussage: "In den meisten Gemeinden steht ein Gerät",
      serien: [{ label: "mit Gerät", wert: 21, einheit: "%" }],
    });
    expect(schluessel(p)).toContain("richtungswort");
  });

  it("dasselbe Wort über einer STÜCKZAHL ist kein Widerspruch", () => {
    // Ein Anteilswort kann nur einem Anteil widersprechen. Ohne diese Bedingung
    // meldete die Regel bei einer Serie mit 6.848 Gemeinden — weil 6.848 nicht
    // zwischen 50 und 100 liegt. Das ist ein Kategorienfehler, kein Befund.
    const p = post({}, {
      aussage: "In den meisten Gemeinden steht ein Gerät",
      serien: [{ label: "Gemeinden", wert: 6848, einheit: "" }],
    });
    expect(schluessel(p)).not.toContain("richtungswort");
  });
});

describe("Keine Sperre schlägt an gesunder Arbeit an", () => {
  it("der Referenzbeitrag läuft sauber durch", () => {
    expect(schluessel(post())).toEqual([]);
  });

  it("ein Richtungswort in der PROSA ist kein Widerspruch", () => {
    // Gemessen: Über den ganzen Text gelesen hatte die Regel 2 von 2 Treffern
    // falsch. „Die meisten Leute hätten ohnehin ein eigenes Dach" ist kein
    // Anteil, den das Bild zeigt. Geprüft wird deshalb nur die Bildaussage und
    // die erste Zeile.
    const p = post({
      text: "In kleinen Gemeinden stehen mehr Geräte.\n\nWobei die meisten Leute dort ohnehin ein eigenes Dach haben.",
    });
    expect(schluessel(p)).not.toContain("richtungswort");
  });
});

describe("Die echten Beiträge", () => {
  /**
   * Was heute auf der Hauptlinie wirklich meldet.
   *
   * Diese Liste ist KEIN Freibrief, sondern ein Protokoll: Jeder Eintrag ist ein
   * echter Defekt, der zum Zeitpunkt dieses Tests im Bestand steht. Zwei davon
   * sind in einem noch nicht eingemergten Zweig bereits behoben; die
   * Lizenzangabe ebenso. Wird der Zweig eingemergt, wird dieser Test ROT — und
   * das ist die Absicht: Wer mergt, streicht die behobenen Zeilen hier und sieht
   * dabei, was er behoben hat.
   *
   * Eine Liste, die stillschweigend schrumpfen darf, verrottet. Eine, die beim
   * Schrumpfen rot wird, wird gepflegt.
   */
  const BEKANNTE_DEFEKTE: Record<string, string[]> = {
    // DIE ZWÖLF LIZENZ-BEFUNDE SIND WEG, und zwar nicht durch eine gelockerte
    // Regel: Die Quellenzeile wird nicht mehr getippt, sondern aus dem
    // Quellenregister gebaut — Name und Lizenz kommen von dort, und ohne Lizenz
    // kann sie gar nicht erst entstehen.
    //
    // Der Anlass war der Einwand des Betreibers: Eine Angabe, die ohnehin
    // gerechnet wird, gehört nicht als Sperre gemeldet, sondern richtig
    // erzeugt. Sonst steht dieselbe Korrektur bei jedem neuen Beitrag wieder
    // an, und irgendwann schaltet jemand die Sperre ab, statt die Zeile zu
    // reparieren.
    //
    // Die Sperre BLEIBT trotzdem — sie fängt weiterhin, wer eine Quellenzeile
    // von Hand tippt. Genau das war der ursprüngliche Befund: Zwei handgetippte
    // Fassungen derselben Angabe wichen VERSCHIEDEN ab, und welche stimmte,
    // hing daran, wer die Zeile gerade schrieb.
    "g8-ausland-pro-kopf": ["jahr-trennzeichen"],
    "g7-segmente-anteile": ["prozent-ohne-ganzes"],
  };

  it("meldet genau die bekannten Defekte, nicht mehr und nicht weniger", () => {
    const posts = baueAllePosts(basis, {}, "2026-08-28");
    const ist: Record<string, string[]> = {};
    for (const p of posts) {
      const s = schluessel(p);
      if (s.length) ist[p.id] = [...s].sort();
    }
    const soll = Object.fromEntries(
      Object.entries(BEKANNTE_DEFEKTE).map(([k, v]) => [k, [...v].sort()]),
    );
    expect(
      ist,
      "Weicht ab: Entweder ist ein Defekt behoben (dann Zeile hier streichen) oder ein neuer entstanden.",
    ).toEqual(soll);
  });
});

describe("Das Regelverzeichnis", () => {
  it("beschreibt jede Regel, die es gibt", () => {
    const gemeldet = new Set(
      baueAllePosts(basis, {}, "2026-08-28").flatMap((p) => pruefeMechanisch(p, basis).map((b) => b.regel)),
    );
    const bekannt = new Set(MECHANIK_REGELN.map((r) => r.schluessel));
    for (const g of gemeldet) {
      expect(bekannt, `Die Regel "${g}" meldet, steht aber in keinem Verzeichnis`).toContain(g);
    }
  });

  it("nennt für jede Regel, was sie feststellt", () => {
    for (const r of MECHANIK_REGELN) {
      expect(r.prueft.length, `Die Regel "${r.schluessel}" sagt nicht, was sie prüft`).toBeGreaterThan(20);
    }
  });
});
