import { describe, expect, it } from "vitest";
import { KATEGORIEN } from "../redaktions-kategorien";
import { moeglicheFormen, templateVon } from "../social-bildformen";
import { ortsPostId, ortsPostTeile, ortsPosts, stellenVon } from "../orts-posts";
import { ortsStories, STORY_FAMILIE, type OrtsStory, type StoryDaten } from "../orts-stories";

// Eine Ortsgeschichte IST ein Beitrag — und dieser Test hält das fest.
//
// Er prüft nicht Formulierungen, sondern die vier Eigenschaften, ohne die eine
// Ortsgeschichte im Redaktionssystem nicht ankommt: Sie steht in einer Familie,
// die es wirklich gibt; ihr Bild trägt die Form, die ihre Zahlen hergeben; ihre
// Quellenzeile nennt die Lizenz; und ihre Kennung trägt den Ort, weil sonst
// zwei Gemeinden dieselbe redaktionelle Fassung teilen.

const JAHR = 2026;

const BASIS: StoryDaten = {
  name: "Musterdorf",
  regionId: "06440012",
  population: 6000,
  solar: {
    total_count: 400,
    total_kwp: 4000,
    by_segment: [
      { segment: "privat_dach", count: 300, kwp: 2400 },
      { segment: "gewerbe_dach", count: 60, kwp: 1000 },
      { segment: "freiflaeche", count: 2, kwp: 600 },
    ],
    by_year_segment: [
      { year: 2006, segment: "privat_dach", count: 40, kwp: 200 },
      { year: 2012, segment: "privat_dach", count: 120, kwp: 900 },
      { year: 2020, segment: "privat_dach", count: 140, kwp: 1300 },
      { year: 2021, segment: "gewerbe_dach", count: 60, kwp: 1000 },
    ],
  },
  speicher: { kwh_batterie: 900, by_segment: [{ segment: "batterie_privat", count: 90 }] },
  standIso: "2026-08-05",
  wohnungen: { gesamt: 2800, einZwei: 1900 },
  monate: [
    ...Array.from({ length: 20 }, (_, i) => ({
      monat: `2024-${String((i % 12) + 1).padStart(2, "0")}`,
      segment: "privat_dach",
      count: 3,
    })),
  ],
};

const ORT = { regionId: BASIS.regionId, name: BASIS.name };

const geschichten = (): OrtsStory[] => ortsStories({ daten: BASIS, heuteJahr: JAHR });
/** Nur die Beiträge — das Drumherum der Ortsseite prüft der eigene Test. */
const beitraege = (fassungen = {}) =>
  ortsPosts({ stories: geschichten(), ort: ORT, standIso: BASIS.standIso, fassungen }).map(
    (b) => b.post,
  );

describe("Eine Ortsgeschichte ist ein Beitrag des Redaktionssystems", () => {
  it("es gibt überhaupt welche — sonst prüft alles Folgende nichts", () => {
    expect(beitraege().length).toBeGreaterThan(3);
  });

  it("jede Kategorie ist eine Familie des Katalogs, keine eigene Aufzählung", () => {
    // Bis zum 06.09.2026 führte lib/orts-stories.ts „G4.1", „G3.vergleich",
    // „G10" als private Union neben demselben Katalog. Zwei Ordnungen für
    // dieselbe Sache — und die erfundene stand in der Ortsansicht.
    const bekannt = new Set(KATEGORIEN.map((k) => k.schluessel));
    for (const p of beitraege()) {
      expect(bekannt, `Kategorie „${p.kategorie}" gibt es im Katalog nicht`).toContain(p.kategorie);
    }
    for (const [art, f] of Object.entries(STORY_FAMILIE)) {
      expect(bekannt, `Sorte „${art}" zeigt auf eine Familie, die es nicht gibt`).toContain(
        f.kategorie,
      );
    }
  });

  it("die Beschriftung ist nie der Schlüssel selbst", () => {
    // Der Fund reichte bis zum 06.09.2026 `f.kategorie` als Beschriftung durch —
    // auf der Ortsseite stand damit wörtlich „g10". Unsichtbar geblieben, weil
    // der Block ausgeblendet war.
    for (const s of geschichten()) {
      expect(s.kategorieLabel, `„${s.kennung}" zeigt einen Schlüssel als Beschriftung`).not.toMatch(
        /^g\d+$/,
      );
      expect(s.kategorieLabel.length).toBeGreaterThan(3);
    }
  });

  it("jedes Bild trägt eine Form, die seine Zahlen wirklich hergeben", () => {
    // Die eingebaute Form ist ein Startwert, kein Freibrief: Trägt sie nicht,
    // behauptet das Bild etwas, das die Zahlen nicht sagen.
    for (const p of beitraege()) {
      expect(p.bild).toBeTruthy();
      const moeglich = moeglicheFormen(p.bild!);
      expect(moeglich, `„${p.id}" startet mit einer Form, die nicht trägt`).toContain(p.bild!.art);
    }
  });

  it("jede Quellenzeile nennt Bereitsteller UND Lizenz", () => {
    // Lizenzpflicht: Die Zeile reist im Bild mit, der Beitragstext tut das nicht.
    for (const p of beitraege()) {
      expect(p.bild!.quelle).toMatch(/Marktstammdatenregister|Zensus/);
      expect(p.bild!.quelle).toContain("Eigene Berechnung");
    }
    // Die Wohnform rechnet auf dem Zensus — eine gemeinsame Zeile über allen
    // wäre für genau sie falsch.
    const wohnform = beitraege().find((p) => p.id.endsWith("-wohnform"));
    expect(wohnform, "Referenzfall enthält keine Wohnform-Geschichte").toBeTruthy();
    expect(wohnform!.bild!.quelle).toContain("Zensus 2022");
  });

  it("die Kennung trägt den Ort, sonst teilen zwei Gemeinden eine Fassung", () => {
    for (const p of beitraege()) {
      expect(p.id.startsWith(`ort-${ORT.regionId}-`)).toBe(true);
      expect(ortsPostTeile(p.id)?.regionId).toBe(ORT.regionId);
      // Weder Farbschema noch Bildform dürfen hinein — wer umfärbt, verlöre
      // sonst seinen umformulierten Text.
      expect(p.id).not.toMatch(/hell|dunkel|highlight|kennzahl|saeule|donut/);
    }
    expect(ortsPostId("06632012", "eingespielt")).toBe("ort-06632012-eingespielt");
    expect(ortsPostTeile("g13-wachstum-balkon-solar")).toBeUndefined();
  });

  it("der Ort steht am Beitrag, nicht als Kategorie", () => {
    // Sieben Familien unter einem Reiter „Kommune" wären in der Ansicht nicht
    // mehr auseinanderzuhalten.
    for (const p of beitraege()) expect(p.ort).toEqual(ORT);
    expect(KATEGORIEN.some((k) => /kommune|ort/i.test(k.schluessel))).toBe(false);
  });

  it("eine gespeicherte Fassung greift — aber nur, wenn die Form trägt", () => {
    const erste = beitraege()[0];
    const mit = ortsPosts({
      stories: geschichten(),
      ort: ORT,
      standIso: BASIS.standIso,
      fassungen: { [erste.id]: { stil: "dunkel", form: "verlauf" } },
    })[0].post;
    expect(mit.bild!.stil).toBe("dunkel");
    // „verlauf" braucht eine Zeitachse — die hat keine Ortsgeschichte, also
    // bleibt die eingebaute Form stehen.
    expect(mit.bild!.art).toBe(erste.bild!.art);
  });

  it("mindestens eine Ortsgeschichte landet auf einem abgenommenen Template", () => {
    // Ohne das wäre die Umstellung folgenlos: Die Templates sind der Grund,
    // warum ein Ortsbeitrag ohne eigenes Design auskommt.
    expect(beitraege().some((p) => templateVon(p.bild!) !== undefined)).toBe(true);
  });

  it("die Nachkommastellen im Bild sind die des Textes", () => {
    // Die Geschichten runden EINMAL; zeigt das Bild mehr Stellen, widerspricht
    // es dem Satz daneben.
    expect(stellenVon(12)).toBe(0);
    expect(stellenVon(1.7)).toBe(1);
    expect(stellenVon(0.25)).toBe(2);
    // Fließkomma-Artefakt: kein zwanzigstelliger Wert im Bild.
    expect(stellenVon(1.7999999999999998)).toBe(2);
  });

  it("die tragende Zahl ist genau eine", () => {
    for (const p of beitraege()) {
      const haupt = p.bild!.serien.filter((s) => s.hervorgehoben);
      expect(haupt.length, `„${p.id}" hebt ${haupt.length} Werte hervor`).toBe(1);
    }
  });
});

// ─── Rechenmodell-Council 12.09.2026 ────────────────────────────────────────
//
// Der Referenzfall oben erzeugt keine Anomalie und liegt mit seiner Einspeise-
// summe über einer Million. Beide Fehler dieses Tages lagen genau dort, wo er
// nicht hinsah — deshalb Fälle, die die Ränder wirklich treffen.

/** Zwölf reife Monate mit einem Ausschlag; die zwei jüngsten gelten als unreif. */
function mitAusschlag(sonst: number, spitze: number): StoryDaten {
  const monate = Array.from({ length: 14 }, (_, i) => ({
    monat: i < 12 ? `2024-${String(i + 1).padStart(2, "0")}` : `2025-0${i - 11}`,
    segment: "privat_dach",
    count: i === 6 ? spitze : sonst,
  }));
  return { ...BASIS, monate };
}

/** Ein kleines Dorf: fünf Anlagen, eine Einspeisesumme weit unter einer Million. */
const KLEINES_DORF: StoryDaten = {
  ...BASIS,
  population: 300,
  solar: {
    total_count: 5,
    total_kwp: 40,
    by_segment: [{ segment: "privat_dach", count: 5, kwp: 40 }],
    by_year_segment: [{ year: 2022, segment: "privat_dach", count: 5, kwp: 40 }],
  },
};

const beitraegeVon = (d: StoryDaten) =>
  ortsPosts({ stories: ortsStories({ daten: d, heuteJahr: JAHR }), ort: ORT, standIso: d.standIso, fassungen: {} }).map(
    (b) => b.post,
  );

describe("Die eingebaute Bildform trägt auch an den Rändern", () => {
  const faelle: [string, StoryDaten][] = [
    ["Ausschlag über einem Ort, der sonst nichts baut", mitAusschlag(0, 8)],
    ["Ausschlag über einem Median von eins", mitAusschlag(1, 8)],
    ["Ausschlag über einem Median von zwei", mitAusschlag(2, 12)],
    ["kleines Dorf", KLEINES_DORF],
  ];

  it("jede Geschichte startet mit einer Form, die ihre Zahlen hergeben", () => {
    for (const [name, d] of faelle) {
      const posts = beitraegeVon(d);
      expect(posts.length, name).toBeGreaterThan(0);
      for (const p of posts) {
        expect(moeglicheFormen(p.bild!), `${name}: „${p.id}" trägt ${p.bild!.art} nicht`).toContain(p.bild!.art);
      }
    }
  });

  it("es gibt die Anomalie in den Randfällen wirklich — sonst prüft der Test nichts", () => {
    for (const [name, d] of faelle.slice(0, 3)) {
      expect(beitraegeVon(d).some((p) => p.id.includes("anomalie")), name).toBe(true);
    }
  });

  it("die Säule zeigt den echten Vergleichswert, und der Titel behauptet kein Vielfaches von nichts", () => {
    const ohne = ortsStories({ daten: mitAusschlag(0, 8), heuteJahr: JAHR }).find((s) => s.art === "anomalie")!;
    expect(ohne.werte.map((w) => w.wert)).toEqual([8, 0]);
    expect(ohne.titel).not.toMatch(/-mal/);
    const zwei = ortsStories({ daten: mitAusschlag(2, 12), heuteJahr: JAHR }).find((s) => s.art === "anomalie")!;
    expect(zwei.werte.map((w) => w.wert)).toEqual([12, 2]);
    expect(zwei.titel).toContain("6-mal");
  });
});

describe("Die Einspeisesumme steht in Kachel und Titel als dieselbe Zahl", () => {
  it("über und unter einer Million", () => {
    for (const d of [BASIS, KLEINES_DORF]) {
      const s = ortsStories({ daten: d, heuteJahr: JAHR }).find((x) => x.art === "eingespielt");
      expect(s, d.name).toBeTruthy();
      const haupt = s!.werte.find((w) => w.haupt)!;
      expect(haupt.wert, `${d.solar.total_count} Anlagen: die Kachel zeigt null`).toBeGreaterThan(0);
      const geschrieben = `${haupt.wert.toLocaleString("de-DE", { maximumFractionDigits: 1 })} ${haupt.einheit}`;
      expect(s!.titel, `${d.solar.total_count} Anlagen`).toContain(geschrieben);
    }
  });
});

describe("Municipal editorial text", () => {
  it("keeps the generated default and applies the same override to web and feed", () => {
    const original = beitraege()[0];
    const vorlage = "In {ort}: {wert1}. {einordnung}";
    const result = ortsPosts({ stories: geschichten(), ort: ORT, standIso: BASIS.standIso,
      fassungen: { [original.id]: { vorlage, stil: "dunkel" } } });
    const own = result[0];
    expect(own.text).toContain("In Musterdorf:");
    expect(own.post.text).toContain(own.text);
    expect(own.post.text).toContain(own.post.textRahmen!.vorher);
    expect(own.post.text).toContain(own.post.textRahmen!.nachher);
    expect(own.post.bild?.aussage).toEqual(original.bild?.aussage);
    expect(own.post.bild?.serien).toEqual(original.bild?.serien);
    expect(result[1].post.text).toEqual(beitraege()[1].text);
    const reset = beitraege({ [original.id]: { stil: "dunkel" } })[0];
    expect(reset.text).toEqual(original.text);
    expect(reset.bild?.stil).toBe("dunkel");
    expect(reset.vorlage).toBe("{einordnung}");
  });
  it("never applies one municipality's override to another", () => {
    const original = beitraege()[0];
    const other = ortsPosts({stories: geschichten(), ort: {name:"Anderer Ort", regionId:"06440013"}, standIso: BASIS.standIso,
      fassungen: {[original.id]: {vorlage:"Only Musterdorf"}}});
    expect(other.every(b => !b.post.text.includes("Only Musterdorf"))).toBe(true);
  });
});
