import { describe, it, expect } from "vitest";
import { computePlacements, hookText, selectHook, type Hook, type Placement } from "../award-hook";
import { AWARD_CATEGORIES, type GemeindeStats } from "../awards";

function g(regionId: string, over: Partial<GemeindeStats> = {}): GemeindeStats {
  return {
    regionId, name: over.name ?? regionId, bezeichnung: "Gemeinde", population: 5000,
    privatDachKwp: 0, gewerbeDachKwp: 0, freiflaecheKwp: 0, balkonCount: 0, balkonKwp: 0,
    batteriePrivatKwh: 0, batterieGewerbeKwh: 0, windKwp: 0, biomasseKwp: 0, wasserKwp: 0,
    solarZubauKwp: 0, ...over,
  };
}

const names = { gemeinde: "Musterdorf", kreis: "Landkreis Musterkreis", land: "Bayern" };

describe("computePlacements", () => {
  it("vergibt Rang und Gruppengröße je Kategorie und Ebene", () => {
    const gem = [
      g("09111001", { privatDachKwp: 9000 }),
      g("09111002", { privatDachKwp: 3000 }),
      g("09222001", { privatDachKwp: 6000 }),
    ];
    const pl = computePlacements(gem);
    const kreis1 = pl.get("09111001")!.find((p) => p.categoryKey === "dach-privat-pk" && p.level === "kreis")!;
    expect(kreis1.rank).toBe(1);
    expect(kreis1.total).toBe(2); // zwei Gemeinden im Kreis 09111
    const bund1 = pl.get("09111001")!.find((p) => p.categoryKey === "dach-privat-pk" && p.level === "bund")!;
    expect(bund1.rank).toBe(1);
    expect(bund1.total).toBe(3);
  });
});

describe("Aufhänger-Guardrails (Gegenprüfung 2026-07-25)", () => {
  it("nimmt nur Bürger-Kategorien als Aufhänger (kein Standort/Gewerbe/Zubau)", () => {
    const gem = [
      g("09111001", { population: 5000, gewerbeDachKwp: 9000, freiflaecheKwp: 5000, windKwp: 9000, solarZubauKwp: 9000, privatDachKwp: 100 }),
    ];
    const keys = new Set((computePlacements(gem).get("09111001") ?? []).map((p) => p.categoryKey));
    for (const off of ["solar-standort", "freiflaeche-standort", "zubau", "wind-standort", "gewerbespeicher-abs"]) {
      expect(keys.has(off)).toBe(false);
    }
  });

  it("vergleicht nur innerhalb der Größenklasse — ein Weiler schlägt keine Stadt", () => {
    // ERSETZT DIE FRUEHERE EINWOHNER-UNTERGRENZE (2.000). Die schloss kleine
    // Orte ganz aus; jetzt treten sie gegeneinander an. Entscheidend ist, dass
    // ihre absurde Pro-Kopf-Zahl nicht mehr in derselben Liste steht wie die
    // Stadt — sonst zeigte der Orden einen anderen Platz als die Rangliste, auf
    // die er verlinkt.
    const winzling = g("09111001", { population: 300, privatDachKwp: 9000 });
    const stadt = g("09111002", { population: 5000, privatDachKwp: 3000 });
    const pl = computePlacements([winzling, stadt]);
    const klasseVon = (id: string) =>
      (pl.get(id) ?? []).find((p) => p.categoryKey === "dach-privat-pk")?.klasseSlug;
    expect(klasseVon("09111001")).toBe("kleingemeinden");
    expect(klasseVon("09111002")).toBe("kleinstaedte");
    expect(klasseVon("09111001")).not.toBe(klasseVon("09111002"));
  });

  it("macht aus einer Ein-Ort-Gruppe keinen Aufhänger", () => {
    // Die Klassen-Trennung erzeugt kleine Gruppen. "Platz 1 von 1" ist keine
    // Auszeichnung — davor schuetzt die Mindest-Gruppengroesse.
    const allein = g("09111001", { population: 300, privatDachKwp: 9000 });
    const hook = selectHook(computePlacements([allein]).get("09111001"));
    expect(hook.kind).toBe("neutral");
  });
});

describe("selectHook", () => {
  const P = (over: Partial<Placement>): Placement => ({
    categoryKey: "dach-privat-pk", level: "kreis", scopeId: "09111", klasseSlug: "gemeinden", klasseLabel: "Kleinen Gemeinden", rank: 1, total: 20, value: 100, spike: false, ...over,
  });

  it("überspringt Spike-Platzierungen (Datenfehler-Verdacht)", () => {
    expect(selectHook([P({ rank: 1, total: 20, spike: true })]).kind).toBe("neutral");
  });

  it("wählt einen Sieg", () => {
    const h = selectHook([P({ rank: 1, total: 20 })]);
    expect(h.kind).toBe("sieger");
    expect(h.categoryKey).toBe("dach-privat-pk");
  });

  it("bevorzugt die höhere Ebene bei gleichem Sieg", () => {
    const h = selectHook([P({ level: "kreis" }), P({ level: "bund" })]);
    expect(h.level).toBe("bund");
  });

  it("ein echter Sieg schlägt ein Podium auf höherer Ebene", () => {
    const h = selectHook([P({ level: "kreis", rank: 1 }), P({ level: "bund", rank: 2 })]);
    expect(h.kind).toBe("sieger");
    expect(h.level).toBe("kreis");
  });

  it("greift die Glaubwürdigkeits-Schwelle (kleine Gruppe zählt nicht als Sieg)", () => {
    const h = selectHook([P({ rank: 1, total: 3 })]); // total < minTotal(5)
    expect(h.kind).toBe("neutral");
  });

  it("fällt auf Perzentil zurück", () => {
    const h = selectHook([P({ rank: 8, total: 100 })]); // 8% → Top 10%
    expect(h.kind).toBe("perzentil");
    expect(Math.round((h.percentile ?? 0) * 100)).toBe(8);
  });

  it("liefert neutral, wenn nichts trägt", () => {
    expect(selectHook([P({ rank: 50, total: 100 })]).kind).toBe("neutral");
    expect(selectHook([]).kind).toBe("neutral");
  });

  it("bevorzugt Bürger bei sonst gleichem Sieg", () => {
    const h = selectHook([
      P({ categoryKey: "solar-standort", rank: 1, total: 20 }),
      P({ categoryKey: "dach-privat-pk", rank: 1, total: 20 }),
    ]);
    expect(h.categoryKey).toBe("dach-privat-pk");
  });
});

describe("hookText", () => {
  const sieger = (key: string, label: string) =>
    hookText(
      { kind: "sieger", categoryKey: key, categoryLabel: label, klasseLabel: "Kleinen Gemeinden", traeger: "buerger", level: "kreis", scopeId: "09111", rank: 1, total: 34, percentile: null, value: 65 },
      names,
    );

  it("Betreff und Meldungs-Überschrift sagen dasselbe verschieden", () => {
    // Der Betreff nennt den RANG zuerst, die Meldungs-Überschrift die MESSGRÖSSE
    // als Superlativ. Stünde beides gleich, läse sich der Brief wie ein
    // Textbaustein-Unfall.
    const s = sieger("dach-privat-abs", "Solardach-Hauptstadt");
    expect(s.betreff).toMatch(/^Musterdorf bei .+ auf Platz 1 im Landkreis$/);
    expect(s.betreff).not.toContain("die meiste"); // Superlativ gehört in die Meldung
    expect(s.einstieg).toContain("die meiste"); // dort steht er
  });

  it("baut den Dativ korrekt (kein „bei private Solarleistung“)", () => {
    // Der Betreff traegt die KURZFORM; der Einstieg die volle Messgroesse im Dativ.
    expect(sieger("dach-privat-pk", "x").betreff).toContain("bei privater Solarleistung");
    // Beim Sieger steht im Einstieg der Superlativ; der Dativ greift ab Platz 2.
    expect(sieger("dach-privat-pk", "x").einstieg).toContain("die meiste private Solarleistung");
    const zweiter = hookText(
      { kind: "podium", categoryKey: "dach-privat-pk", categoryLabel: "x", klasseLabel: "Kleinen Gemeinden", traeger: "buerger", level: "kreis", scopeId: "09111", rank: 2, total: 34, percentile: null, value: 5 },
      names,
    );
    expect(zweiter.einstieg).toContain("bei Solarleistung auf privaten Dächern je Einwohner");
    expect(sieger("balkon-abs", "x").betreff).toContain("bei Balkonkraftwerken");
  });

  it("nennt die Messgröße im Klartext, nicht den internen Titel", () => {
    // Vorher stand hier der Titel: „Musterdorf ist Balkon-Pionier im Landkreis".
    // Der sagt nicht, was gemessen wurde, und die Auszeichnung existiert
    // öffentlich nirgends — eine Verwaltung liest das als Marketing-Erfindung.
    const s = sieger("balkon-pk", "Balkon-Pionier");
    // Die Groessenklasse steht im Satz — ohne sie behauptete der Brief einen
    // Vergleich mit ALLEN Orten des Kreises, waehrend die verlinkte Rangliste
    // innerhalb der Klasse rechnet.
    expect(s.betreff).toBe("Musterdorf bei Balkonkraftwerken auf Platz 1 im Landkreis");
    // Die Einzelheiten stehen im Einstieg, nicht im Betreff.
    expect(s.einstieg).toContain("unter den Kleinen Gemeinden im Landkreis Musterkreis");
    expect(s.einstieg).toContain("Platz 1 von 34");
  });

  it("lässt die internen Titel NIRGENDS nach außen", () => {
    // Blocker: sobald ein Kunstwort im Brief steht, müssten wir es öffentlich
    // führen, pflegen und verteidigen. Gilt für jede Kategorie.
    for (const [key, label] of [
      ["balkon-pk", "Balkon-Pionier"],
      ["batterie-privat-abs", "Speicher-Hauptstadt"],
      ["dach-privat-pk", "Solardach-Spitzenreiter"],
      ["dach-privat-abs", "Solardach-Hauptstadt"],
    ] as const) {
      const s = sieger(key, label);
      expect(`${s.betreff} ${s.einstieg}`).not.toContain(label);
    }
  });

  it("formuliert Platzierungen unterhalb von Platz 1 ohne Superlativ", () => {
    const p = hookText(
      { kind: "podium", categoryKey: "balkon-pk", categoryLabel: "Balkon-Pionier", klasseLabel: "Kleinen Gemeinden", traeger: "buerger", level: "kreis", scopeId: "09111", rank: 3, total: 34, percentile: null, value: 40 },
      names,
    );
    expect(p.betreff).toBe("Musterdorf bei Balkonkraftwerken auf Platz 3 im Landkreis");
    expect(p.betreff).not.toContain("die meisten");
  });

  it("fällt ohne Aufhänger auf einen neutralen Satz zurück", () => {
    const neutral = hookText({ kind: "neutral", categoryKey: null, categoryLabel: null, klasseLabel: null, traeger: null, level: null, scopeId: null, rank: null, total: null, percentile: null, value: null }, names);
    expect(neutral.betreff).toContain("So steht Musterdorf beim Solarausbau da");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ALLE VARIANTEN, NICHT DREI STICHPROBEN
//
// Auslöser (31.07.2026): Eine Handprobe zeigte „liegt bei Balkonkraftwerke je
// 1.000 Einwohner" und „liegt bei private Solarleistung" — falscher Fall, im
// Fließtext, seit Monaten. Der bestehende Dativ-Test prüfte nur den Betreff.
// Ein Brief entsteht aus Kategorie × Ebene × Platzierungsart; geprüft wurde
// bisher eine Handvoll davon. Hier läuft jede Kombination durch.
// ─────────────────────────────────────────────────────────────────────────────
describe("Anschreiben über alle Varianten", () => {
  const namen = { gemeinde: "Musterdorf", kreis: "Landkreis Musterkreis", land: "Bayern" };
  const KLASSEN = ["Dörfern", "Kleinen Gemeinden", "Gemeinden und Kleinstädten", "Mittelgroßen Städten", "Großstädten"];
  const LEVELS = ["kreis", "land", "bund"] as const;

  /** Jede Kategorie, die überhaupt ein Aufhänger werden kann. */
  const hookKategorien = AWARD_CATEGORIES.filter((c) => c.traeger === "buerger");

  const varianten: { hook: Hook; was: string }[] = [];
  for (const cat of hookKategorien) {
    for (const level of LEVELS) {
      for (const klasseLabel of KLASSEN) {
        for (const [kind, rank, percentile] of [
          ["sieger", 1, null],
          ["podium", 3, null],
          ["perzentil", 12, 0.09],
        ] as const) {
          varianten.push({
            was: `${cat.key} · ${level} · ${klasseLabel} · ${kind}`,
            hook: {
              kind,
              categoryKey: cat.key,
              categoryLabel: cat.label,
              klasseLabel,
              traeger: "buerger",
              level,
              scopeId: "09111",
              rank,
              total: 134,
              percentile,
              value: 65,
            },
          });
        }
      }
    }
  }

  it("deckt eine nennenswerte Zahl von Kombinationen ab", () => {
    // Sonst prüft die Schleife irgendwann nichts mehr, ohne dass es auffällt.
    expect(varianten.length).toBeGreaterThan(100);
  });

  it("bildet nach „bei/beim“ nie den Nominativ", () => {
    // DER ECHTE FEHLER: „liegt bei private Solarleistung", „bei Balkonkraftwerke
    // je 1.000 Einwohner". Ein Substantiv im Plural endet nach „bei" auf -n,
    // ein Adjektiv davor ebenso.
    const falsch = [
      "bei private ",
      "bei Balkonkraftwerke ",
      "bei Zubau ",
      "bei Batteriespeicher ",
    ];
    for (const v of varianten) {
      const t = hookText(v.hook, namen);
      for (const f of falsch) {
        expect(`${t.betreff} ${t.einstieg}`, `${v.was}: „${f.trim()}“`).not.toContain(f);
      }
    }
  });

  it("hält den Betreff kurz genug fürs Postfach", () => {
    // Vorher: 123 Zeichen. Gängige Postfächer schneiden um 60–70 ab; über 80
    // sieht der Empfänger den Rang nicht mehr.
    for (const v of varianten) {
      const b = hookText(v.hook, namen).betreff;
      expect(b.length, `${v.was}: „${b}“ (${b.length} Zeichen)`).toBeLessThanOrEqual(80);
    }
  });

  it("baut saubere Sätze — keine Lücken, keine Platzhalter, kein doppelter Punkt", () => {
    for (const v of varianten) {
      const t = hookText(v.hook, namen);
      for (const [feld, text] of [["Betreff", t.betreff], ["Einstieg", t.einstieg]] as const) {
        const wo = `${v.was} · ${feld}: „${text}“`;
        expect(text, wo).not.toMatch(/\s{2,}/); // doppelte Leerzeichen
        expect(text, wo).not.toMatch(/undefined|null|NaN|\[object/);
        expect(text, wo).not.toMatch(/\.\.|\s\./); // ".." oder " ."
        expect(text.startsWith("Musterdorf"), wo).toBe(true);
      }
      // Der Betreff ist eine Zeile, kein Satz — ohne Schlusspunkt.
      expect(t.betreff.endsWith("."), `${v.was}: Betreff endet auf Punkt`).toBe(false);
      expect(t.einstieg.endsWith("."), `${v.was}: Einstieg ohne Punkt`).toBe(true);
    }
  });

  it("nennt in jedem Einstieg die Vergleichsgruppe — sonst meint die Zahl etwas anderes", () => {
    // Der Rang gilt INNERHALB der Größenklasse. Fehlt sie im Satz, liest sich
    // „Platz 3 im Landkreis" als Vergleich mit allen Orten des Kreises — und
    // die verlinkte Rangliste zeigt dann eine andere Zahl.
    for (const v of varianten) {
      const t = hookText(v.hook, namen);
      expect(t.einstieg, v.was).toContain(v.hook.klasseLabel as string);
    }
  });

  it("wiederholt keine Wendung im selben Satz", () => {
    // „unter den Kleinen Gemeinden bundesweit unter den besten 9 %" — zweimal
    // „unter den" stolpert beim Lesen. Gilt für jede Kombination.
    for (const v of varianten) {
      const t = hookText(v.hook, namen);
      for (const [feld, text] of [["Betreff", t.betreff], ["Einstieg", t.einstieg]] as const) {
        const treffer = text.match(/unter den/g) ?? [];
        expect(treffer.length, `${v.was} · ${feld}: „${text}“`).toBeLessThanOrEqual(1);
      }
    }
  });

  it("nennt nie mehr als 99 % als „unter den besten“", () => {
    const extrem = hookText(
      { ...varianten[0].hook, kind: "perzentil", rank: 200, total: 134, percentile: 1.5 },
      namen,
    );
    expect(extrem.betreff).not.toMatch(/besten (1\d\d|100) %/);
  });

  it("lässt kein Kunstwort nach außen — über alle Kategorien", () => {
    for (const v of varianten) {
      const t = hookText(v.hook, namen);
      const label = v.hook.categoryLabel as string;
      expect(`${t.betreff} ${t.einstieg}`, `${v.was}: „${label}“`).not.toContain(label);
    }
  });
});

describe("Absolute Kategorien werden kein Aufhänger", () => {
  it("erzeugt für sie gar keine Platzierung", () => {
    // "Die meisten Balkonkraftwerke im Landkreis" kürt gemessen die
    // einwohnerstärkste Kommune — ein Brief damit lobt Größe, nicht Leistung.
    // Aus den öffentlichen Ranglisten sind sie aus demselben Grund längst raus.
    const gross = g("09111001", { population: 50_000, balkonCount: 900, privatDachKwp: 20_000 });
    const klein = g("09111002", { population: 800, balkonCount: 90, privatDachKwp: 900 });
    const alle = [gross, klein, ...Array.from({ length: 8 }, (_, i) =>
      g(`0911100${i + 3}`.slice(0, 8), { population: 900 + i, balkonCount: 20 + i, privatDachKwp: 500 + i }))];
    const pl = computePlacements(alle);
    const keys = new Set([...pl.values()].flat().map((p) => p.categoryKey));
    for (const abs of ["balkon-abs", "dach-privat-abs", "batterie-privat-abs"]) {
      expect(keys.has(abs), `${abs} darf kein Aufhänger sein`).toBe(false);
    }
  });

  it("lässt Verhältniszahlen zu — pro Kopf und je Dach", () => {
    const orte = Array.from({ length: 10 }, (_, i) =>
      g(`0911100${i}`.slice(0, 8), { population: 1000 + i * 10, balkonCount: 50 - i, privatDachKwp: 900 + i }));
    const keys = new Set([...computePlacements(orte).values()].flat().map((p) => p.categoryKey));
    expect(keys.has("balkon-pk")).toBe(true);
    expect(keys.has("dach-privat-pk")).toBe(true);
  });
});
