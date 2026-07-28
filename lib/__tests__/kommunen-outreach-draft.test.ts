import { describe, it, expect } from "vitest";
import { renderOutreachDraft, renderMeldung, gattungKurz, type DraftContext } from "../kommunen-outreach-draft";

// Die Fälle stammen aus dem Gegenlesen echter Entwürfe (27./28.07.2026) — jeder
// „nicht"-Test steht für einen Fehler, der wirklich im Brief stand.

const BASIS: DraftContext = {
  name: "Höchberg",
  pageUrl: "https://solar-check.io/r/hoechberg",
  betreff: "Höchberg hat die meiste private Speicherkapazität im Landkreis Würzburg",
  einstieg: "Höchberg hat die meiste private Speicherkapazität im Landkreis Würzburg — Platz 1 von 52 Gemeinden.",
  variante: "nur_meldung",
  gattung: "Markt",
  wo: "im Landkreis Würzburg",
  bestleistung: "die meiste private Speicherkapazität",
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
    expect(m).toContain("Das ist der höchste Wert");
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
