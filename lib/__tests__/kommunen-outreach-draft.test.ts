import { describe, it, expect } from "vitest";
import { renderOutreachDraft, renderMeldung, gattungKurz, type DraftContext } from "../kommunen-outreach-draft";
import { AWARD_CATEGORIES } from "../awards";

// Die Fälle stammen aus dem Gegenlesen echter Entwürfe (27./28.07.2026) — jeder
// „nicht"-Test steht für einen Fehler, der wirklich im Brief stand.

const BASIS: DraftContext = {
  name: "Höchberg",
  pageUrl: "https://solar-check.io/solar-atlas/bayern/landkreis-wuerzburg/hoechberg",
  vorschauUrl: "https://solar-check.io/r/hoechberg",
  betreff: "Höchberg hat die meiste private Speicherkapazität im Landkreis Würzburg",
  einstieg: "Höchberg hat die meiste private Speicherkapazität im Landkreis Würzburg — Platz 1 von 52 Gemeinden.",
  variante: "nur_meldung",
  gattung: "Markt",
  wo: "im Landkreis Würzburg",
  bestleistung: "die meiste private Speicherkapazität",
  themaDativ: "privater Speicherkapazität je Einwohner",
  phrase: "bei Hausspeichern",
  gruppe: "Kleinen Gemeinden im Landkreis Würzburg",
  rangWert: "53,4 kWh/Kopf",
  rang: { platz: 1, von: 52 },
  zahlen: { anlagen: 1234, leistungKwp: 12400, wpProKopf: 1240, stand: "2026-07-15" },
};

describe("Meldung", () => {
  it("nennt Zahlen, Quelle und Stand", () => {
    const m = renderMeldung(BASIS);
    expect(m).toContain("1.234 Solaranlagen");
    expect(m).toContain("Marktstammdatenregister");
    expect(m).toContain("15. Juli 2026");
    expect(m).toContain("Platz 1 von 52");
  });

  it("formatiert Einheiten über die kanonischen Formatierer", () => {
    // Einheiten werden nie handgeschrieben — sonst steht in der Meldung eine
    // andere Zahl als auf der verlinkten Seite.
    const m = renderMeldung(BASIS);
    expect(m).toMatch(/12,4\s*MWp/);
    expect(m).toMatch(/1\.240\s*Wp/);
  });

  it("berichtet nüchtern statt zu loben", () => {
    const m = renderMeldung(BASIS);
    expect(m).not.toMatch(/Spitzenreiter|Vorreiter|Pionier|Hauptstadt|stolz|Glückwunsch/i);
  });

  it("lässt den Pro-Kopf-Satz weg, wenn die Einwohnerzahl fehlt", () => {
    const m = renderMeldung({ ...BASIS, zahlen: { ...BASIS.zahlen, wpProKopf: null } });
    expect(m).not.toContain("je Einwohnerin");
  });
});

describe("Zwei Ask-Varianten", () => {
  it("nur_meldung enthält KEIN Wort zum Widget", () => {
    const d = renderOutreachDraft(BASIS);
    expect(d.body).not.toMatch(/Widget|einbett|iframe/i);
  });

  it("meldung_plus_widget hängt genau einen Absatz an", () => {
    const d = renderOutreachDraft({ ...BASIS, variante: "meldung_plus_widget" });
    expect(d.body).toMatch(/Widget/);
  });

  it("beide Fassungen sind sonst identisch", () => {
    // Sonst wäre nicht zu erkennen, ob eine Reaktion am Widget oder am Text lag.
    const a = renderOutreachDraft(BASIS).body;
    const b = renderOutreachDraft({ ...BASIS, variante: "meldung_plus_widget" }).body;
    const ohneWidget = b.split("\n").filter((z) => !/Widget/i.test(z)).join("\n");
    expect(ohneWidget.replace(/\n{2,}/g, "\n")).toBe(a.replace(/\n{2,}/g, "\n"));
  });

  it("die Meldung ist in beiden Fassungen dieselbe", () => {
    expect(renderOutreachDraft(BASIS).meldung).toBe(
      renderOutreachDraft({ ...BASIS, variante: "meldung_plus_widget" }).meldung,
    );
  });
});

describe("Anrede und Gattung", () => {
  it("nennt eine Stadt nicht „Gemeinde“", () => {
    const d = renderOutreachDraft({ ...BASIS, name: "Stuttgart", gattung: "Kreisfreie Stadt" });
    expect(d.body).toContain("Website Ihrer Stadt");
    expect(d.body).not.toContain("Ihrer Gemeinde");
  });

  it("gattungKurz reduziert auf ein natürliches Wort", () => {
    expect(gattungKurz("Große Kreisstadt")).toBe("Stadt");
    expect(gattungKurz("Markt")).toBe("Markt");
    expect(gattungKurz(null)).toBe("Gemeinde");
  });

  it("bittet um Weiterleitung, wenn keine zuständige Stelle bekannt ist", () => {
    const d = renderOutreachDraft(BASIS);
    expect(d.body).toMatch(/Weiterleitung/);
    expect(d.body.indexOf("Weiterleitung")).toBeLessThan(d.body.indexOf("Meldung"));
  });

  it("lässt die Bitte weg, wenn eine operative Stelle benannt ist", () => {
    const d = renderOutreachDraft({ ...BASIS, funktion: "Referentin für Öffentlichkeitsarbeit" });
    expect(d.body).not.toMatch(/Weiterleitung/);
  });
});

describe("Kein Textbaustein-Unfall", () => {
  it("die Meldung wiederholt ihre eigene Überschrift nicht wortgleich", () => {
    const m = renderMeldung(BASIS);
    expect(m.split(BASIS.bestleistung).length - 1).toBe(1); // nur in der Überschrift
    // Der Belegsatz greift die Aussage auf, ohne sie wortgleich zu wiederholen —
    // und nennt dabei die gerankte Messgrösse statt der Gesamtzahlen.
    expect(m).toContain("Damit hat Höchberg die meiste private Speicherkapazität unter den Kleinen Gemeinden");
  });

  it("schreibt nach dem Weiterleitungs-Absatz gross, direkt nach der Anrede klein", () => {
    expect(renderOutreachDraft(BASIS).body).toContain("Aus den amtlichen");
    expect(renderOutreachDraft({ ...BASIS, funktion: "Pressestelle" }).body).toContain("aus den amtlichen");
  });

  it("wiederholt die Aussage nicht dreimal", () => {
    // Vorher stand die Bestleistung im Betreff, im Einstiegssatz UND zweimal in
    // der Meldung — in zehn Zeilen viermal dasselbe.
    const d = renderOutreachDraft(BASIS);
    const treffer = d.body.split(BASIS.bestleistung).length - 1;
    expect(treffer).toBeLessThanOrEqual(2); // Überschrift + Fließtext der Meldung
  });
});

describe("Der veroeffentlichte Link ist die echte Adresse", () => {
  it("die Meldung enthaelt NIE die Zaehl-Weiterleitung", () => {
    // Eine Verwaltung veroeffentlicht keine kryptische Umleitung, und als
    // Backlink ist sie schwaecher als die kanonische Adresse.
    const d = renderOutreachDraft(BASIS);
    expect(d.meldung).toContain("/solar-atlas/bayern/landkreis-wuerzburg/hoechberg");
    expect(d.meldung).not.toContain("/r/");
  });

  it("die Vorschau-Weiterleitung steht nur im Brief", () => {
    const d = renderOutreachDraft(BASIS);
    expect(d.body).toContain("/r/hoechberg");
  });

  it("ohne Vorschau-Link fehlt der Satz ganz", () => {
    expect(renderOutreachDraft({ ...BASIS, vorschauUrl: null }).body).not.toContain("Blick vorab");
  });
});

describe("Pflichtangaben", () => {
  it("trägt Signatur, Impressum und DSGVO-Hinweis", () => {
    const d = renderOutreachDraft(BASIS);
    expect(d.body).toContain("Sebastian Schäder");
    expect(d.body).toContain("solar-check.io/impressum");
    expect(d.body).toContain("Art. 14 DSGVO");
  });

  it("nennt den Backlink als einzige Gegenleistung", () => {
    expect(renderOutreachDraft(BASIS).body).toMatch(/Link auf solar-check\.io stehen zu lassen/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DIE MELDUNG IST DER TEXT, DEN EINE VERWALTUNG WÖRTLICH VERÖFFENTLICHT.
// Sie behauptete bedingungslos „Das ist der höchste Wert" — auch auf Platz 3,
// auch ohne Platzierung, und belegte den Superlativ mit den GESAMT-Solarzahlen,
// während die Überschrift eine ganz andere Messgröße nannte. Damit war der Satz
// selbst beim echten Sieger falsch: Ein Nachbarort mit Solarpark hat mehr
// Gesamtleistung — nachlesbar auf unserer eigenen Seite, die darunter verlinkt ist.
// ─────────────────────────────────────────────────────────────────────────────
describe("Meldung behauptet nur, was stimmt", () => {
  it("nennt den Superlativ ausschliesslich auf Platz 1", () => {
    expect(renderMeldung(BASIS)).toContain(BASIS.bestleistung);
    for (const platz of [2, 3, 8, 40]) {
      const m = renderMeldung({ ...BASIS, rang: { platz, von: 52 } });
      expect(m, `Platz ${platz}`).not.toContain(BASIS.bestleistung);
      expect(m, `Platz ${platz}`).not.toContain("höchste");
    }
  });

  it("behauptet ohne Platzierung gar keinen Rang", () => {
    const m = renderMeldung({ ...BASIS, rang: null });
    expect(m).not.toContain("Platz");
    expect(m).not.toContain("höchste");
    expect(m).toContain("Solaranlagen"); // der Bestandsbericht bleibt
  });

  it("belegt den Rang mit der GERANKTEN Grösse, nicht mit den Gesamtzahlen", () => {
    // Platz 1: Superlativ im Fliesstext, mit Wert. Ab Platz 2: Messgroesse im Dativ.
    const eins = renderMeldung(BASIS);
    expect(eins).toContain("die meiste private Speicherkapazität");
    expect(eins).toContain("53,4 kWh/Kopf");
    const drei = renderMeldung({ ...BASIS, rang: { platz: 3, von: 52 } });
    expect(drei).toContain("Bei privater Speicherkapazität je Einwohner");
    expect(drei).toContain("53,4 kWh/Kopf");
  });

  it("nennt die Vergleichsgruppe, in der der Rang gilt", () => {
    // „Platz 1 von 52" ohne Gruppe liest sich als kreisweiter Bestwert — der
    // Rang gilt aber innerhalb der Grössenklasse.
    for (const platz of [1, 3, 20]) {
      const m = renderMeldung({ ...BASIS, rang: { platz, von: 52 } });
      expect(m, `Platz ${platz}`).toContain("Kleinen Gemeinden im Landkreis Würzburg");
    }
  });

  it("trägt den Lizenzvermerk und die Herkunft der Einwohnerzahlen", () => {
    // Wir geben den Text zur Weiterverbreitung heraus — unsere eigenen Seiten
    // tragen den Vermerk, dieser muss es auch.
    const m = renderMeldung(BASIS);
    expect(m).toContain("dl-de/by-2-0");
    expect(m).toMatch(/Statistischen? Bundesamt/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ALLE VARIANTEN DER MELDUNG — nicht drei Stichproben.
// Der Kasus-Fehler nach „bei" ist in dieser Sitzung DREIMAL aufgetreten: im
// Betreff, im Einstiegssatz und hier. Jedes Mal an einer Stelle, die niemand
// gerade ansah. Deshalb läuft hier jede Kategorie durch jede Platzierungsart.
// ─────────────────────────────────────────────────────────────────────────────
describe("Meldung über alle Varianten", () => {
  const hookKategorien = AWARD_CATEGORIES.filter((c) => c.traeger === "buerger" && c.messart !== "absolut");
  const GRUPPEN = ["Dörfern im Landkreis Musterkreis", "Großstädten in Bayern", "Landeshauptstädten bundesweit"];
  const PLAETZE: (number | null)[] = [1, 2, 3, 12, 40, null];

  const varianten = hookKategorien.flatMap((cat) =>
    GRUPPEN.flatMap((gruppe) =>
      PLAETZE.map((platz) => ({
        was: `${cat.key} · ${gruppe} · ${platz ?? "ohne Platz"}`,
        ctx: {
          ...BASIS,
          bestleistung: cat.bestleistung,
          themaDativ: cat.themaDativ,
          phrase: cat.betreffPhrase ?? `bei ${cat.themaDativ}`,
          gruppe,
          rang: platz != null ? { platz, von: 52 } : null,
        } as DraftContext,
      })),
    ),
  );

  it("prüft eine nennenswerte Zahl von Kombinationen", () => {
    expect(varianten.length).toBeGreaterThan(50);
  });

  it("bildet nach „bei“ nie den Nominativ", () => {
    for (const v of varianten) {
      const m = renderMeldung(v.ctx);
      for (const f of ["bei private ", "bei Balkonkraftwerke ", "bei Zubau ", "bei Batteriespeicher "]) {
        expect(m, `${v.was}: „${f.trim()}“`).not.toContain(f);
      }
    }
  });

  it("baut saubere Sätze — keine Lücken, keine Platzhalter", () => {
    for (const v of varianten) {
      const m = renderMeldung(v.ctx);
      expect(m, v.was).not.toMatch(/[ \t]{2,}/);
      expect(m, v.was).not.toMatch(/undefined|null|NaN|\[object/);
      expect(m, v.was).not.toMatch(/\s\.|\.\./);
    }
  });

  it("verspricht den Superlativ nur auf Platz 1", () => {
    for (const v of varianten) {
      const m = renderMeldung(v.ctx);
      const platz = v.ctx.rang?.platz ?? null;
      if (platz === 1) expect(m, v.was).toContain(v.ctx.bestleistung);
      else expect(m, v.was).not.toContain(v.ctx.bestleistung);
    }
  });

  it("nennt bei jedem Rang die Vergleichsgruppe und trägt immer die Lizenz", () => {
    for (const v of varianten) {
      const m = renderMeldung(v.ctx);
      if (v.ctx.rang) expect(m, v.was).toContain(v.ctx.gruppe);
      expect(m, v.was).toContain("dl-de/by-2-0");
    }
  });
});

describe("Kurz oben, genau unten", () => {
  // Dieselbe Aufteilung wie bei Betreff und Einstieg des Anschreibens: Die
  // Überschrift trägt Ort, Platz und Thema — mehr nicht. Sie behauptet keinen
  // Geltungsbereich und kann damit nicht falsch werden. Der präzise Satz mit
  // Größenklasse, Gruppengröße und Wert steht im Fliesstext.
  const titel = (c: DraftContext) => renderMeldung(c).split("\n")[0];

  it("hält die Überschrift kurz", () => {
    for (const platz of [1, 3, 40]) {
      const t = titel({ ...BASIS, rang: { platz, von: 52 } });
      expect(t.length, `Platz ${platz}: „${t}“ (${t.length} Zeichen)`).toBeLessThanOrEqual(60);
    }
  });

  it("behauptet in der Überschrift keinen Geltungsbereich", () => {
    // Eine Pressestelle kürzt lange Schlagzeilen selbst — und dabei fällt
    // zuverlässig genau der Teil weg, der die Aussage wahr macht.
    for (const platz of [1, 3, 40]) {
      const t = titel({ ...BASIS, rang: { platz, von: 52 } });
      expect(t, `Platz ${platz}`).not.toContain("Landkreis");
      expect(t, `Platz ${platz}`).not.toContain(BASIS.gruppe);
      expect(t, `Platz ${platz}`).not.toContain("höchste");
    }
  });

  it("nennt Größenklasse, Gruppengröße und Wert im Fliesstext", () => {
    for (const platz of [1, 3]) {
      const m = renderMeldung({ ...BASIS, rang: { platz, von: 52 } });
      expect(m, `Platz ${platz}`).toContain(BASIS.gruppe);
      expect(m, `Platz ${platz}`).toContain("von 52");
      expect(m, `Platz ${platz}`).toContain("53,4 kWh/Kopf");
    }
  });
});

describe("Weitere Platzierungen im Brief", () => {
  // Der Brief darf zeigen, dass die Zahl kein Zufallstreffer ist — die MELDUNG
  // nicht: Ein Text, den eine Verwaltung veröffentlichen soll, trägt eine Aussage.
  const MIT: DraftContext = {
    ...BASIS,
    weitere: [
      { phrase: "bei Balkonkraftwerken", gruppe: "Kleinen Gemeinden im Landkreis Würzburg", platz: 2, von: 52 },
      { phrase: "beim Solar-Zubau seit Ende 2023", gruppe: "Kleinen Gemeinden in Bayern", platz: 3, von: 1840 },
    ],
    ranglisteUrl: "https://solar-check.io/solar-atlas/ranking/x/kleine-gemeinden/bayern",
  };

  it("nennt jede weitere Platzierung mit Platz, Gruppengrösse und Vergleichsgruppe", () => {
    const b = renderOutreachDraft(MIT).body;
    expect(b).toContain("Platz 2 von 52 bei Balkonkraftwerken unter den Kleinen Gemeinden im Landkreis Würzburg");
    expect(b).toContain("Platz 3 von 1.840 beim Solar-Zubau seit Ende 2023 unter den Kleinen Gemeinden in Bayern");
  });

  it("schreibt Tausender mit Punkt", () => {
    expect(renderOutreachDraft(MIT).body).not.toMatch(/von 1840/);
  });

  it("verlinkt die Rangliste zum Nachprüfen", () => {
    expect(renderOutreachDraft(MIT).body).toContain(MIT.ranglisteUrl as string);
  });

  it("lässt die weiteren Platzierungen aus der Meldung heraus", () => {
    const m = renderMeldung(MIT);
    expect(m).not.toContain("Balkonkraftwerken");
    expect(m).not.toContain("weiteren Messgrößen");
  });

  it("schweigt, wenn es keine weiteren gibt", () => {
    const b = renderOutreachDraft({ ...BASIS, weitere: [], ranglisteUrl: null }).body;
    expect(b).not.toContain("weiteren Messgrößen");
    expect(b).not.toContain("vollständige Rangliste");
  });
});

describe("Datenschutz-Hinweis", () => {
  it("beugt die Gattung richtig", () => {
    // „Website Ihrer Markt" stand so im Brief — Markt ist männlich.
    for (const [bez, erwartet] of [
      ["Markt", "Website Ihres Marktes"],
      ["Kreisfreie Stadt", "Website Ihrer Stadt"],
      ["Gemeinde", "Website Ihrer Gemeinde"],
    ] as const) {
      expect(renderOutreachDraft({ ...BASIS, gattung: bez }).body).toContain(erwartet);
    }
  });

  it("nennt den Zähl-Link, statt „einmalig“ zu versprechen", () => {
    // Der Vorschau-Link zählt Aufrufe mit — „nutze ich einmalig" las sich
    // daneben schöner, als es ist.
    const b = renderOutreachDraft(BASIS).body;
    expect(b).toContain("wird gezählt");
    expect(b).not.toContain("nutze ich einmalig");
  });
});
