import { describe, it, expect } from "vitest";
import {
  BASIS_TAGE,
  MIN_ADRESSEN,
  MIN_AUFBAUTEN,
  MIN_VERGLEICHSTAGE,
  SPRUNG_FAKTOR,
  beurteileKostenTag,
  fehlbetragObergrenze,
  groesstesVielfaches,
  leseGruppen,
  median,
  zuBeurteilenderTag,
  type Tagesmenge,
} from "../kostenwache";

// Was dieser Test hält — und warum er in BEIDE Richtungen gebaut ist:
//
// Die Projektanleitung nennt mehrere Fälle, in denen ein Wächter nichts sah und
// trotzdem grün meldete (der Datenbank-Wächter, der sechs von neun Aufrufen
// übersah; der Test, der einen falschen Gemeindeschlüssel mit sich selbst
// verglich). Ein Melder, der nur beweist, dass er bei Ruhe schweigt, beweist
// nichts. Deshalb steht neben jedem „schlägt nicht an" ein „schlägt an", mit
// echten Zahlen: dem gemessenen Normalbetrieb der beiden Projekte und dem
// Ausmaß des Vorfalls, um den es geht (+249 %, also das 3,49-fache).

const tag = (n: number) => new Date(Date.UTC(2026, 7, n)).toISOString().slice(0, 10);

/** Vierzehn Tage Normalbetrieb um ein Niveau herum, mit Wochenend-Schwankung. */
function normalReihe(basisLast: number, basisFlaeche: number): Tagesmenge[] {
  const schwankung = [1, 0.82, 1.14, 0.93, 1.21, 0.7, 1.06, 0.88, 1.17, 0.95, 1.28, 0.76, 1.09, 1.02];
  return schwankung.map((f, i) => ({
    tag: tag(i + 1),
    aufbauten: Math.round(basisLast * f),
    adressen: Math.round(basisFlaeche * f),
  }));
}

describe("Antwort der Plattform lesen", () => {
  // Echte Antwort vom 29.08.2026, gekürzt auf die Struktur.
  const echt = `## Runtime Log Counts

**Project:** prj_x
**Grouped by:** statusCode

| statusCode | count |
|---|---|
| 200 | 5656 |
| 304 | 41 |
| 307 | 34 |
| 404 | 7 |
| 405 | 1 |

*6 distinct values total; showing top 5.*`;

  it("liest Summe, gezeigte Gruppen und Gesamtzahl", () => {
    const b = leseGruppen(echt);
    expect(b).not.toBeNull();
    expect(b!.summe).toBe(5739);
    expect(b!.gezeigt).toBe(5);
    expect(b!.verschiedene).toBe(6);
  });

  it("zählt Kopf- und Trennzeile nicht mit", () => {
    // Die Kopfzeile trägt „count" statt einer Zahl, die Trennzeile Striche —
    // beides darf nicht als Gruppe durchgehen, sonst wäre die Summe erfunden.
    expect(leseGruppen(echt)!.gezeigt).toBe(5);
  });

  it("liest die Gesamtzahl auch mit Tausenderpunkt", () => {
    expect(leseGruppen("| a | 1 |\n\n*53.947 distinct values total; showing top 25.*")!.verschiedene).toBe(53947);
  });

  // DIE WICHTIGSTE ZEILE DIESER DATEI. Die Protokolle werden einen Tag
  // aufbewahrt; ein zu spät gefragter Tag antwortet leer. Käme daraus eine Null
  // als Messwert, behauptete die Wache am Folgetag einen Sprung ins Unendliche
  // und verdürbe danach zwei Wochen lang das Vergleichsniveau.
  it("gibt bei einer leeren Antwort NICHTS zurück, nicht null Verkehr", () => {
    expect(leseGruppen("No runtime logs found for the given filters.")).toBeNull();
    expect(leseGruppen("")).toBeNull();
  });

  it("rechnet aus, wie weit die Summe höchstens danebenliegt", () => {
    // Eine Gruppe fehlt, die kleinste gezeigte hatte den Wert 1 → höchstens 1.
    expect(fehlbetragObergrenze(leseGruppen(echt)!, 1)).toBe(1);
    // Und ohne fehlende Gruppen ist die Lücke null, egal wie klein die kleinste ist.
    expect(fehlbetragObergrenze({ summe: 10, gezeigt: 3, verschiedene: 3 }, 99)).toBe(0);
  });
});

describe("Median als Vergleichsniveau", () => {
  it("nimmt die Mitte, nicht den Durchschnitt", () => {
    expect(median([1, 2, 3, 4, 100])).toBe(3);
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });

  // Der Grund für den Median: Ein Vorfall darf das Niveau nicht anheben, sonst
  // versteckt der erste den zweiten.
  it("lässt sich von einem Ausreißer nicht anheben", () => {
    const ruhig = median([100, 100, 100, 100, 100, 100, 100]);
    const mitVorfall = median([100, 100, 100, 100, 100, 100, 900]);
    expect(mitVorfall).toBe(ruhig);
  });
});

describe("Anlaufzeit: kein Urteil ist nicht „in Ordnung“", () => {
  it("urteilt nicht, solange weniger als sieben Vortage abgelegt sind", () => {
    const reihe = normalReihe(60000, 50000).slice(0, 6);
    const u = beurteileKostenTag({ tag: tag(7), aufbauten: 200000, adressen: 180000 }, reihe);
    // Ein dreifacher Wert — und trotzdem KEIN Alarm, weil es nichts gibt,
    // wogegen man ihn halten könnte. Das ist Absicht und muss so aussehen.
    expect(u.art).toBe("kein-urteil");
    if (u.art === "kein-urteil") {
      expect(u.grund).toMatch(/Vergleichsniveau/);
      expect(u.grund).toContain(String(MIN_VERGLEICHSTAGE));
    }
  });

  it("urteilt ab dem siebten Vortag", () => {
    const reihe = normalReihe(60000, 50000).slice(0, MIN_VERGLEICHSTAGE);
    const u = beurteileKostenTag({ tag: tag(8), aufbauten: 61000, adressen: 50500 }, reihe);
    expect(u.art).toBe("ruhig");
  });

  it("zählt nur Tage VOR dem beurteilten mit", () => {
    // Sieben Zeilen, aber eine davon ist der Tag selbst → sechs Vortage.
    const reihe = normalReihe(60000, 50000).slice(0, MIN_VERGLEICHSTAGE);
    const u = beurteileKostenTag({ tag: tag(5), aufbauten: 61000, adressen: 50500 }, reihe);
    expect(u.art).toBe("kein-urteil");
  });
});

describe("Normalbetrieb löst nicht aus", () => {
  // Gemessener Normalbetrieb beider Projekte am 28.08.2026:
  // solar-check.io 5.738 Aufbauten / 1.177 Adressen, Filmprojekt 65.586 / 53.924.
  it("schweigt bei gewöhnlicher Tagesschwankung (großes Projekt)", () => {
    const reihe = normalReihe(65586, 53924);
    for (const f of [0.7, 0.9, 1.0, 1.3, 1.6, 2.0, 2.3]) {
      const u = beurteileKostenTag(
        { tag: tag(20), aufbauten: Math.round(65586 * f), adressen: Math.round(53924 * f) },
        reihe,
      );
      expect(u.art, `Faktor ${f} hätte nicht anschlagen dürfen`).toBe("ruhig");
    }
  });

  it("schweigt bei gewöhnlicher Tagesschwankung (kleines Projekt)", () => {
    const reihe = normalReihe(5738, 1177);
    const u = beurteileKostenTag({ tag: tag(20), aufbauten: 12000, adressen: 2600 }, reihe);
    expect(u.art).toBe("ruhig");
  });

  // Die Mindestmengen: Bei einstelligen Werten ist jedes Vielfache Rauschen —
  // und es kostet auch nichts. Ohne sie hätte die wachsende Seite ständig
  // gemeldet (gemessen: im Normalbetrieb bis zum 9,59-fachen).
  it("schweigt bei winzigen Mengen, auch wenn sie sich verzehnfachen", () => {
    const klein: Tagesmenge[] = Array.from({ length: 10 }, (_, i) => ({
      tag: tag(i + 1),
      aufbauten: 3,
      adressen: 2,
    }));
    const u = beurteileKostenTag({ tag: tag(12), aufbauten: 30, adressen: 20 }, klein);
    expect(u.art).toBe("ruhig");
  });

  it("kennt die Mindestmengen als benannte Grenze, nicht als Zufall", () => {
    expect(MIN_AUFBAUTEN).toBeGreaterThan(0);
    expect(MIN_ADRESSEN).toBeGreaterThan(0);
  });
});

describe("Gegenprobe: ein erfundener Sprung MUSS anschlagen", () => {
  // Das Ausmaß des Vorfalls, um den es geht: +249 %, also das 3,49-fache.
  const VORFALL = 3.49;

  it("schlägt beim Ausmaß des bekannten Vorfalls an", () => {
    const reihe = normalReihe(65586, 53924);
    const u = beurteileKostenTag(
      { tag: tag(20), aufbauten: Math.round(65586 * VORFALL), adressen: Math.round(53924 * VORFALL) },
      reihe,
    );
    expect(u.art).toBe("sprung");
  });

  it("schlägt auch beim kleinen Projekt an", () => {
    const reihe = normalReihe(5738, 1177);
    const u = beurteileKostenTag(
      { tag: tag(20), aufbauten: Math.round(5738 * VORFALL), adressen: Math.round(1177 * VORFALL) },
      reihe,
    );
    expect(u.art).toBe("sprung");
  });

  it("liegt die Schwelle unter dem Vorfall und über der Schwankung", () => {
    expect(SPRUNG_FAKTOR).toBeLessThan(VORFALL);
    // 2,39 war die größte im Normalbetrieb gemessene Tagesschwankung (Film,
    // drei Wochen, 29.08.2026).
    expect(SPRUNG_FAKTOR).toBeGreaterThan(2.39);
  });
});

describe("Die zwei Größen werden unterschieden", () => {
  const reihe = normalReihe(65586, 53924);

  it("nennt es „Fläche“, wenn nur die verschiedenen Adressen springen", () => {
    const u = beurteileKostenTag({ tag: tag(20), aufbauten: 70000, adressen: 200000 }, reihe);
    expect(u.art).toBe("sprung");
    if (u.art !== "sprung") return;
    expect(u.satz).toMatch(/Nur die Fläche/);
    expect(u.groessen.find((g) => g.groesse === "adressen")!.gesprungen).toBe(true);
    expect(u.groessen.find((g) => g.groesse === "aufbauten")!.gesprungen).toBe(false);
  });

  it("nennt es „Last“, wenn nur die Zahl der Aufbauten springt", () => {
    const u = beurteileKostenTag({ tag: tag(20), aufbauten: 400000, adressen: 55000 }, reihe);
    expect(u.art).toBe("sprung");
    if (u.art !== "sprung") return;
    expect(u.satz).toMatch(/Nur die Last/);
  });

  it("nennt beides, wenn beides springt — und sagt etwas anderes", () => {
    const u = beurteileKostenTag({ tag: tag(20), aufbauten: 400000, adressen: 200000 }, reihe);
    expect(u.art).toBe("sprung");
    if (u.art !== "sprung") return;
    expect(u.satz).toMatch(/Last UND Fläche/);
    expect(u.satz).not.toMatch(/Nur die/);
  });
});

describe("Kein Niveau, kein Vielfaches", () => {
  it("behauptet bei einem Nullniveau kein Vielfaches", () => {
    const reihe: Tagesmenge[] = Array.from({ length: 10 }, (_, i) => ({
      tag: tag(i + 1),
      aufbauten: 0,
      adressen: 0,
    }));
    const u = beurteileKostenTag({ tag: tag(12), aufbauten: 5000, adressen: 3000 }, reihe);
    // Division durch null ergäbe „unendlich" — das wäre eine Zahl, die niemand
    // gemessen hat. Stattdessen: kein Vielfaches, kein Sprung.
    if (u.art === "kein-urteil") throw new Error("hier sollte ein Urteil möglich sein");
    for (const g of u.groessen) expect(g.vielfaches).toBeNull();
    expect(u.art).toBe("ruhig");
  });
});

describe("Nachjustierung fußt auf gemessenen Werten", () => {
  it("nennt das größte bisher abgelegte Vielfache", () => {
    const reihe = normalReihe(1000, 1000);
    reihe.push({ tag: tag(20), aufbauten: 5000, adressen: 1000 });
    const max = groesstesVielfaches(reihe, "aufbauten");
    expect(max).not.toBeNull();
    expect(max!).toBeGreaterThan(4);
  });

  it("gibt nichts zurück, solange es zu wenig Tage sind", () => {
    expect(groesstesVielfaches(normalReihe(1000, 1000).slice(0, 5), "aufbauten")).toBeNull();
  });

  it("schaut höchstens über das Vergleichsfenster zurück", () => {
    expect(BASIS_TAGE).toBeGreaterThanOrEqual(MIN_VERGLEICHSTAGE);
  });
});

describe("Beurteilt wird der letzte VOLLSTÄNDIGE Tag", () => {
  it("nimmt den Vortag, nicht den laufenden", () => {
    expect(zuBeurteilenderTag(new Date("2026-08-29T07:00:00Z"))).toBe("2026-08-28");
    // Auch kurz nach Mitternacht — sonst würde ein Lauf um 00:30 einen Tag
    // beurteilen, von dem eine halbe Stunde vorliegt, und ihn als Einbruch lesen.
    expect(zuBeurteilenderTag(new Date("2026-08-29T00:30:00Z"))).toBe("2026-08-28");
  });
});
