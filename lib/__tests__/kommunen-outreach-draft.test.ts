import { describe, it, expect } from "vitest";
import { renderOutreachDraft, renderMeldung, kleinKlasse, type DraftContext } from "../kommunen-outreach-draft";
import { AWARD_CATEGORIES } from "../awards";

// Die Fälle stammen aus dem Gegenlesen echter Entwürfe (27./28.07.2026) — jeder
// „nicht"-Test steht für einen Fehler, der wirklich im Brief stand.

const BASIS: DraftContext = {
  name: "Höchberg",
  pageUrl: "https://solar-check.io/solar-atlas/bayern/landkreis-wuerzburg/hoechberg",
  betreff: "Höchberg hat die meiste private Speicherkapazität im Landkreis Würzburg",
  einstieg: "Höchberg hat die meiste private Speicherkapazität im Landkreis Würzburg — Platz 1 von 52 Gemeinden.",
  variante: "nur_meldung",
  wo: "im Landkreis Würzburg",
  bestleistung: "die meiste private Speicherkapazität",
  themaDativ: "privater Speicherkapazität je Einwohner",
  phrase: "bei der privaten Speicherkapazität",
  gruppe: "Kleinen Gemeinden im Landkreis Würzburg",
  rangWert: "53,4 kWh/Kopf",
  // Die Grundmenge hinter der Rate — sie steht im Brief, die Rate nicht mehr.
  rangBasis: "36 Hausspeicher",
  rang: { platz: 1, von: 52 },
  zahlen: { anlagen: 1234, leistungKwp: 12400, privatDachKwp: 9000, wpProKopf: 1240, stand: "2026-07-15" },
};

describe("Meldung", () => {
  it("nennt Zahlen, Quelle und Stand", () => {
    const m = renderMeldung(BASIS);
    expect(m).toContain("1.234 Solaranlagen");
    expect(m).toContain("Marktstammdatenregister");
    expect(m).toContain("15. Juli 2026");
    expect(m).toContain("Platz 1 von 52");
  });

  // UMGEDREHT AM 19.08.2026 (Entscheidung des Betreibers): Vorher prüfte dieser
  // Test, DASS die Leistungsangaben in der Meldung stehen. Jetzt prüft er, dass
  // sie es NICHT tun. Der Empfänger ist eine Pressestelle, keine Netzabteilung;
  // „13,2 MWp" und „404 Wh je Einwohner" rechnet außerhalb der Branche niemand
  // im Kopf um. Die Meldung zählt Dinge — die Leistungswerte stehen weiterhin
  // auf der verlinkten Gemeindeseite.
  it("trägt keine Leistungs- und keine Pro-Kopf-Einheiten", () => {
    for (const ctx of [BASIS, { ...BASIS, rang: { platz: 3, von: 52 } }]) {
      const m = renderMeldung(ctx);
      expect(m, m).not.toMatch(/\d\s*(MWp|kWp|Wp|MWh|kWh|Wh)\b/);
      expect(m).not.toContain("pro Person");
      expect(m).not.toContain("je Einwohner\u00ad");
    }
  });

  it("nennt stattdessen Stückzahlen", () => {
    const m = renderMeldung(BASIS);
    expect(m).toContain("1.234 Solaranlagen");
    // Die Grundmenge hinter der Rate steht in der Klammer.
    expect(m).toContain("36 Hausspeicher");
  });

  it("bildet den Singular, wenn es nur eine Anlage gibt", () => {
    const m = renderMeldung({ ...BASIS, zahlen: { ...BASIS.zahlen, anlagen: 1 } });
    expect(m).toContain("ist eine Solaranlage in Betrieb");
    expect(m).not.toContain("1 Solaranlagen");
  });

  it("berichtet nüchtern statt zu loben", () => {
    const m = renderMeldung(BASIS);
    expect(m).not.toMatch(/Spitzenreiter|Vorreiter|Pionier|Hauptstadt|stolz|Glückwunsch/i);
  });

  it("kommt ohne Einwohnerzahl aus", () => {
    // Die Pro-Kopf-Zahl steht nicht mehr in der Meldung; eine fehlende
    // Einwohnerzahl darf den Text deshalb nicht mehr verändern.
    const ohne = renderMeldung({ ...BASIS, zahlen: { ...BASIS.zahlen, wpProKopf: null } });
    expect(ohne).toBe(renderMeldung(BASIS));
  });
});

describe("Zwei Ask-Varianten", () => {
  it("nur_meldung enthält KEIN Wort zum Widget", () => {
    const d = renderOutreachDraft(BASIS);
    expect(d.body).not.toMatch(/Widget|einbett|iframe/i);
  });

  it("meldung_plus_widget hängt genau einen Absatz an", () => {
    const d = renderOutreachDraft({ ...BASIS, variante: "meldung_plus_widget" });
    expect(d.body).toContain("Grafik für Ihre Website");
  });

  // WEDER ANHANG NOCH VORSCHAU-LINK (19.08.2026). Der Anhang fiel wegen der
  // Zustellbarkeit, die Vorschau nach dem ersten Blick darauf: Die Grafik ist in
  // dieser Breite nicht vorzeigbar, die Quellenangabe läuft in die letzte
  // Kachel. Ein Angebot, das man nicht ansehen kann, ist besser als eines, das
  // man ansieht und dann nicht will.
  it("zeigt die Grafik nicht, auch wenn eine Adresse bekannt ist", () => {
    const d = renderOutreachDraft({
      ...BASIS,
      variante: "meldung_plus_widget",
      widgetUrl: "https://solar-check.io/embed/gemeinde-solar?ags=09679138",
    });
    expect(d.body).not.toContain("/embed/");
    expect(d.body).not.toContain("So sieht sie");
  });

  it("beide Fassungen sind sonst identisch", () => {
    // Sonst wäre nicht zu erkennen, ob eine Reaktion am Widget oder am Text lag.
    // Der Unterschied ist GENAU EIN Absatz — deshalb absatzweise vergleichen
    // und nicht zeilenweise nach dem Wort „Widget" filtern.
    const a = renderOutreachDraft(BASIS).body.split("\n\n");
    const b = renderOutreachDraft({ ...BASIS, variante: "meldung_plus_widget" }).body.split("\n\n");
    expect(b.length).toBe(a.length + 1);
    expect(b.filter((abs) => !a.includes(abs))).toHaveLength(1);
  });

  it("die Meldung ist in beiden Fassungen dieselbe", () => {
    expect(renderOutreachDraft(BASIS).meldung).toBe(
      renderOutreachDraft({ ...BASIS, variante: "meldung_plus_widget" }).meldung,
    );
  });
});

describe("Anrede", () => {

  it("bittet um Weiterleitung, wenn keine zuständige Stelle bekannt ist", () => {
    const d = renderOutreachDraft(BASIS);
    expect(d.body).toMatch(/weiterleiten/);
    expect(d.body.indexOf("weiterleiten")).toBeLessThan(d.body.indexOf("Meldung"));
  });

  it("lässt die Bitte weg, wenn eine operative Stelle benannt ist", () => {
    const d = renderOutreachDraft({ ...BASIS, funktion: "Referentin für Öffentlichkeitsarbeit" });
    expect(d.body).not.toMatch(/weiterleiten/);
  });
});

describe("Kein Textbaustein-Unfall", () => {
  it("die Meldung wiederholt ihre eigene Überschrift nicht wortgleich", () => {
    const m = renderMeldung(BASIS);
    expect(m.split(BASIS.bestleistung).length - 1).toBe(1); // nur in der Überschrift
    // Der Belegsatz greift die Aussage auf, ohne sie wortgleich zu wiederholen —
    // und nennt dabei die gerankte Messgrösse statt der Gesamtzahlen.
    // „Damit" behauptete, die Gesamtzahlen im Satz davor belegten den Rang. Sie
    // messen etwas anderes — „Zugleich" sagt, dass beides gilt, und nur das
    // stimmt.
    expect(m).toContain("Zugleich hat Höchberg die meiste private Speicherkapazität unter den kleinen Gemeinden");
    expect(m).not.toContain("Damit hat");
  });

  // GENAU EIN SATZ setzt die Anrede fort — und der beginnt klein.
  //
  // Die vorige Fassung dieses Tests verlangte den kleinen Anfangsbuchstaben in
  // BEIDEN Fällen und war grün, während 88 von 100 echten Briefen so aussahen:
  // Anrede, dann ein vollständiger Satz mit Punkt, dann eine Zeile darunter ein
  // kleingeschriebener Satzanfang. Der Test hat den Fehler mit sich selbst
  // verglichen. Jetzt wird die Regel geprüft, nicht die Zeichenfolge.
  it("setzt die Anrede mit genau einem kleingeschriebenen Satz fort", () => {
    // Ohne benannte Stelle trägt die Weiterleitungs-Bitte die Fortsetzung,
    // der Einstieg beginnt danach als neuer Satz gross.
    const ohne = renderOutreachDraft({ ...BASIS, funktion: null }).body;
    expect(ohne).toContain("Damen und Herren,\n\nfalls Sie nicht zuständig sind");
    expect(ohne).toContain("Im Marktstammdatenregister");
    expect(ohne).not.toContain("im Marktstammdatenregister der Bundesnetzagentur steckt");

    // Mit benannter Stelle entfällt die Bitte — dann setzt der Einstieg selbst
    // die Anrede fort und beginnt klein.
    const mit = renderOutreachDraft({ ...BASIS, funktion: "Pressestelle" }).body;
    expect(mit).toContain("Damen und Herren,\n\nim Marktstammdatenregister");
    expect(mit).not.toContain("zuständig sind");
  });

  // Verallgemeinert: Nach dem ersten Satzende darf kein kleingeschriebener
  // Satzanfang mehr kommen. Das ist die Regel, an der die alte Fassung
  // vorbeigeprüft hat.
  it("kein kleingeschriebener Satzanfang nach einem beendeten Satz", () => {
    for (const funktion of [null, "Pressestelle"]) {
      const body = renderOutreachDraft({ ...BASIS, funktion }).body;
      const absaetze = body.split("\n\n");
      for (const [i, absatz] of absaetze.entries()) {
        const erstesZeichen = absatz.trimStart()[0] ?? "";
        // Der erste Absatz ist die Anrede, der zweite setzt sie fort (klein).
        if (i <= 1) continue;
        // Aufzählungen, Trennlinien und die Meldung selbst sind keine Sätze.
        if (/^[·─—\d]/.test(erstesZeichen)) continue;
        expect(
          erstesZeichen === erstesZeichen.toUpperCase(),
          `funktion=${funktion}, Absatz ${i}: „${absatz.slice(0, 40)}…"`,
        ).toBe(true);
      }
    }
  });

  it("wiederholt die Aussage nicht dreimal", () => {
    // Vorher stand die Bestleistung im Betreff, im Einstiegssatz UND zweimal in
    // der Meldung — in zehn Zeilen viermal dasselbe.
    const d = renderOutreachDraft(BASIS);
    const treffer = d.body.split(BASIS.bestleistung).length - 1;
    expect(treffer).toBeLessThanOrEqual(2); // Überschrift + Fließtext der Meldung
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// KEIN ZAEHL-LINK IM ANSCHREIBEN (Entscheidung des Betreibers, 31.07.2026).
// Der Brief trug bis dahin eine Weiterleitung `solar-check.io/r/…`, die
// Oeffnungen zaehlte. Umgedrehter Test: Frueher wurde geprueft, DASS sie im
// Brief steht — jetzt, dass sie NIRGENDS mehr steht.
// ─────────────────────────────────────────────────────────────────────────────
describe("Jeder Link im Anschreiben ist die echte Adresse", () => {
  it("die Meldung enthaelt NIE die Zaehl-Weiterleitung", () => {
    // Eine Verwaltung veroeffentlicht keine kryptische Umleitung, und als
    // Backlink ist sie schwaecher als die kanonische Adresse.
    const d = renderOutreachDraft(BASIS);
    expect(d.meldung).toContain("/solar-atlas/bayern/landkreis-wuerzburg/hoechberg");
    expect(d.meldung).not.toContain("/r/");
  });

  it("auch der BRIEF traegt keine Zaehl-Weiterleitung mehr", () => {
    const d = renderOutreachDraft(BASIS);
    expect(d.body).not.toContain("solar-check.io/r/");
    expect(d.body).not.toMatch(/Vorab ansehen|Blick vorab/);
  });

  it("nennt keine Zaehlung und kein Nachverfolgen", () => {
    const d = renderOutreachDraft(BASIS);
    expect(`${d.subject} ${d.body} ${d.meldung}`).not.toMatch(/zähl|Zähl|Klick|tracking/i);
  });

  // ENTSCHEIDUNG DES BETREIBERS (19.08.2026): Die Ranglisten-Zeile ist raus,
  // zugunsten des Hinweises auf die Grafik. Nachprüfbar bleibt der Rang über die
  // Gemeindeseite, die in der Meldung steht und selbst zu den Ranglisten führt.
  it("trägt keine Ranglisten-Zeile mehr", () => {
    const mit = renderOutreachDraft({ ...BASIS, ranglisteUrl: "https://solar-check.io/solar-atlas/ranking/x" });
    expect(mit.body).not.toContain("Vollständige Rangliste");
    expect(mit.body).not.toContain("/solar-atlas/ranking/x");
  });

  it("der Link auf die Gemeindeseite bleibt — er ist der Zweck des Ganzen", () => {
    const d = renderOutreachDraft(BASIS);
    expect(d.body).toContain(BASIS.pageUrl as string);
    expect(d.meldung).toContain(BASIS.pageUrl as string);
  });

  it("alle Links im Brief zeigen auf solar-check.io-Seiten, nicht auf Weiterleitungen", () => {
    const d = renderOutreachDraft({ ...BASIS, ranglisteUrl: "https://solar-check.io/solar-atlas/ranking/x" });
    const urls = d.body.match(/https?:\/\/\S+/g) ?? [];
    expect(urls.length).toBeGreaterThan(0);
    for (const u of urls) expect(u, u).not.toMatch(/solar-check\.io\/r\//);
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
    expect(renderOutreachDraft(BASIS).body).toMatch(/Link stehen zu lassen/);
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
    expect(eins).toContain("36 Hausspeicher");
    const drei = renderMeldung({ ...BASIS, rang: { platz: 3, von: 52 } });
    expect(drei).toContain("Bei privater Speicherkapazität je Einwohner");
    expect(drei).toContain("36 Hausspeicher");
  });

  it("nennt die Vergleichsgruppe, in der der Rang gilt", () => {
    // „Platz 1 von 52" ohne Gruppe liest sich als kreisweiter Bestwert — der
    // Rang gilt aber innerhalb der Grössenklasse.
    for (const platz of [1, 3, 20]) {
      const m = renderMeldung({ ...BASIS, rang: { platz, von: 52 } });
      expect(m, `Platz ${platz}`).toContain("kleinen Gemeinden im Landkreis Würzburg");
    }
  });

  it("trägt den Lizenzvermerk und die Herkunft der Einwohnerzahlen", () => {
    // Wir geben den Text zur Weiterverbreitung heraus — unsere eigenen Seiten
    // tragen den Vermerk, dieser muss es auch.
    const m = renderMeldung(BASIS);
    expect(m).toContain("dl-de/by-2-0");
    expect(m).toMatch(/Statistische[sn]? Bundesamt/);
    // Die Lizenz verlangt den Namen der bereitstellenden Stelle. Die Zeile darf
    // kurz sein, dieses Wort darf sie nicht verlieren.
    expect(m).toContain("Bundesnetzagentur");
  });

  // Der Link ist der ganze Zweck: Veröffentlicht die Gemeinde den Text ohne
  // ihn, haben wir einen Aufsatz verschenkt. Deshalb steht er auf einer eigenen
  // Zeile — beim Kürzen soll er als Erstes auffallen, nicht als Letztes.
  it("stellt den Link auf eine eigene Zeile", () => {
    const m = renderMeldung(BASIS);
    const zeile = m.split("\n").find((z) => z.includes(BASIS.pageUrl as string));
    expect(zeile).toBeTruthy();
    expect(zeile).toMatch(/^Laufend aktualisierte Übersicht für Höchberg: \S+$/);
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
      expect(m, `Platz ${platz}`).toContain(kleinKlasse(BASIS.gruppe));
      expect(m, `Platz ${platz}`).toContain("von 52");
      expect(m, `Platz ${platz}`).toContain("36 Hausspeicher");
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

  // Bei gleicher Vergleichsgruppe steht sie GAR NICHT mehr in der Zeile
  // (Vorgabe des Betreibers, 19.08.2026): Sie steht schon in der Meldung
  // darüber, und „von 52" sagt von selbst, dass es um eine Teilmenge geht.
  it("lässt die Vergleichsgruppe weg, wenn sie bei allen dieselbe ist", () => {
    const gleich = renderOutreachDraft({
      ...BASIS,
      weitere: [
        { phrase: "bei Balkonkraftwerken", gruppe: "Kleinen Gemeinden im Landkreis Würzburg", platz: 2, von: 52 },
        { phrase: "beim Solar-Zubau", gruppe: "Kleinen Gemeinden im Landkreis Würzburg", platz: 3, von: 52 },
      ],
    }).body;
    const zeile = gleich.split("\n\n").find((a) => a.startsWith("Auch sonst")) ?? "";
    expect(zeile).toBe(
      "Auch sonst steht Höchberg weit vorn: Platz 2 von 52 bei Balkonkraftwerken, Platz 3 von 52 beim Solar-Zubau.",
    );
  });

  it("nennt jede weitere Platzierung mit Platz, Gruppengrösse und Vergleichsgruppe", () => {
    const b = renderOutreachDraft(MIT).body;
    // Verschiedene Vergleichsgruppen — dann bleibt die Gruppe an der Zeile,
    // weil eine ausgeklammerte Gruppe für die andere Zeile falsch wäre.
    expect(b).toContain("Platz 2 von 52 bei Balkonkraftwerken unter den kleinen Gemeinden im Landkreis Würzburg");
    expect(b).toContain("Platz 3 von 1.840 beim Solar-Zubau seit Ende 2023 unter den kleinen Gemeinden in Bayern");
  });

  it("schreibt Tausender mit Punkt", () => {
    expect(renderOutreachDraft(MIT).body).not.toMatch(/von 1840/);
  });

  it("verlinkt die Rangliste NICHT mehr im Brief", () => {
    expect(renderOutreachDraft(MIT).body).not.toContain(MIT.ranglisteUrl as string);
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
  it("nennt den Ort beim Namen statt bei der Gattung", () => {
    // „Website Ihrer Markt" stand so im Brief — Markt ist männlich. Der Name hat
    // kein Geschlecht und ist konkreter; jede Beugungstabelle wäre eine Falle.
    for (const name of ["Höchberg", "Stuttgart", "Markt Schwaben"]) {
      const b = renderOutreachDraft({ ...BASIS, name }).body;
      expect(b, name).toContain(`Website von ${name}`);
      expect(b, name).not.toMatch(/Website Ihre[rs]? (Markt|Stadt|Gemeinde)/);
    }
  });

  it("verspricht nicht mehr „einmalig“", () => {
    // Der Vorschau-Link zählt Aufrufe mit; „einmalig" las sich daneben schöner,
    // als es ist. Die Einzelheiten stehen in der Datenschutzerklärung, nicht im
    // Brief — dort wäre ein Absatz darüber eine Affäre aus einer Nebensache.
    const b = renderOutreachDraft(BASIS).body;
    expect(b).not.toContain("einmalig");
    expect(b).toContain("Speicherdauer");
  });
});

describe("Eröffnungszahl erzählt dieselbe Geschichte wie der Rang", () => {
  // DER FALL: Glüsing, 110 Einwohner, 2,1 MWp — ein Solarpark. Die Meldung
  // eröffnete mit „18.894 Wp pro Person" und behauptete zwei Zeilen später
  // etwas über private Dächer. Die Zahl stimmt und erzählt trotzdem die falsche
  // Geschichte: Sie gehört einem Investor, nicht den Bürgern.
  const parkDorf: DraftContext = {
    ...BASIS,
    name: "Glüsing",
    zahlen: { anlagen: 15, leistungKwp: 2100, privatDachKwp: 260, wpProKopf: 18_894, stand: "2026-07-15" },
  };

  // Wo der Park die Leistung beherrscht, ERÖFFNEN die privaten Dächer, und die
  // Gesamtleistung steht dahinter. Vorher stand die Investorenzahl vorn und der
  // private Anteil als Nachsatz — in Ferschweiler waren das 18,7 MWp gegen
  // 825 kWp, und die Meldung sagte danach etwas über Hausbatterien.
  // DER GANZE FALL IST MIT DEN STÜCKZAHLEN VERSCHWUNDEN.
  //
  // Glüsing hat 110 Einwohner und 2,1 MWp, fast alles ein Solarpark. Solange
  // die Meldung Leistungen nannte, eröffnete sie mit der Zahl eines Investors
  // und behauptete danach etwas über die Bürger — das musste eine
  // Fallunterscheidung abfangen. Eine ANLAGENZAHL hat dieses Problem nicht:
  // Ein Solarpark ist eine Anlage, nicht zweitausend.
  it("nennt auch im Solarpark-Dorf keine Leistung und keine Pro-Kopf-Zahl", () => {
    const m = renderMeldung(parkDorf);
    expect(m).not.toMatch(/\d\s*(MWp|kWp|Wp|MWh|kWh|Wh)\b/);
    expect(m).not.toContain("18.894");
    expect(m).not.toContain("pro Person");
  });

  it("zählt dort die Anlagen wie überall", () => {
    expect(renderMeldung(parkDorf)).toContain("Solaranlagen in Betrieb");
  });
});

describe("Der Brief bleibt lesbar kurz", () => {
  // Er hatte 2.400 Zeichen und las sich wie ein Aufsatz. In einem Rathaus liest
  // das niemand zu Ende — und ein Brief, der nicht gelesen wird, hat keinen Ask.
  const MIT_ALLEM: DraftContext = {
    ...BASIS,
    variante: "meldung_plus_widget",
    weitere: [
      { phrase: "bei Balkonkraftwerken", gruppe: "Kleinen Gemeinden im Landkreis Würzburg", platz: 2, von: 52 },
      { phrase: "beim Solar-Zubau seit Ende 2023", gruppe: "Kleinen Gemeinden in Bayern", platz: 3, von: 1840 },
    ],
    ranglisteUrl: "https://solar-check.io/solar-atlas/ranking/x/kleine-gemeinden/bayern",
  };

  /** Der Brief OHNE die Meldung — sie ist die Nutzlast, nicht die Verpackung. */
  const rahmen = (c: DraftContext) =>
    renderOutreachDraft(c).body.replace(/-{40}[\s\S]*?-{40}/, "");

  it("hält die Verpackung im aufwendigsten Fall unter 1.400 Zeichen", () => {
    // Die Grenze ist am 19.08.2026 von 1.350 auf 1.400 gegangen: Die
    // Weiterleitungs-Bitte nennt jetzt Website, Mitteilungsblatt und Social
    // Media statt nur „Website- oder Pressestelle". Das sind 40 Zeichen für
    // einen Kanal, über den kleine Gemeinden häufiger erreichbar sind als über
    // eine Pressestelle, die es dort nicht gibt.
    const r = rahmen(MIT_ALLEM);
    expect(r.length, `${r.length} Zeichen Verpackung`).toBeLessThanOrEqual(1400);
  });

  it("kommt drumherum mit höchstens acht Absätzen aus", () => {
    const absaetze = rahmen(MIT_ALLEM).split(/\n\n+/).filter((x) => x.trim());
    expect(absaetze.length, absaetze.map((a) => a.slice(0, 36)).join(" | ")).toBeLessThanOrEqual(9);
  });

  // WIE VIELE LINKS DARF EIN BRIEF ANS RATHAUS TRAGEN?
  //
  // Er trug einmal vier: Zähl-Weiterleitung, Gemeindeseite, Rangliste,
  // Impressum/Datenschutz. Übrig sind die, die einen Zweck haben: die
  // Gemeindeseite (sie ist der Ask — sie soll veröffentlicht werden), die
  // Pflichtangaben, und in der Widget-Fassung die Vorschau der Grafik.
  it("trägt keine zusätzlichen Beleg-Links mehr", () => {
    const body = renderOutreachDraft(MIT_ALLEM).body;
    expect(body).not.toContain("Vollständige Rangliste");
    expect(body).not.toMatch(/·\s+Vollständige Rangliste/);
    // Die Gemeindeseite genau einmal — im Meldungstext, wo sie hingehört.
    expect(body.split(MIT_ALLEM.pageUrl as string).length - 1).toBe(1);
  });
});

// EINE EINZIGE LEISTUNGSAUSSAGE, und die als Vergleich (Vorgabe des Betreibers,
// 19.08.2026): „13,2 MWp" sagt einer Pressestelle nichts, „42 % mehr als im
// Durchschnitt" sagt ihr genau das, was sie veröffentlichen will.
describe("Vergleich zum Landesschnitt", () => {
  it("nennt den Vorsprung in Prozent", () => {
    const m = renderMeldung({ ...BASIS, vergleich: { anteil: 0.42, bezug: "in Bayern" } });
    expect(m).toContain("42 % mehr Solarleistung als im Durchschnitt in Bayern");
    // Ausdrücklich auf den PRIVATEN Dächern — die Gesamtleistung gehört
    // vielerorts einem Freiflächenpark.
    expect(m).toContain("auf den privaten Dächern");
  });

  it("schweigt, wo der Ort unter dem Schnitt liegt", () => {
    const m = renderMeldung({ ...BASIS, vergleich: { anteil: -0.3, bezug: "in Bayern" } });
    expect(m).not.toContain("Durchschnitt");
  });

  it("schweigt bei einem Vorsprung, den niemand merkt", () => {
    const m = renderMeldung({ ...BASIS, vergleich: { anteil: 0.04, bezug: "in Bayern" } });
    expect(m).not.toContain("Durchschnitt");
  });

  it("macht aus einem sehr großen Vorsprung ein Vielfaches", () => {
    // „280 % mehr" liest niemand als Größenordnung.
    const m = renderMeldung({ ...BASIS, vergleich: { anteil: 2.8, bezug: "in Bayern" } });
    expect(m).toContain("das 3,8-fache des Durchschnitts in Bayern");
    expect(m).not.toContain("280 %");
  });

  it("kommt ohne Vergleich aus", () => {
    expect(renderMeldung({ ...BASIS, vergleich: null })).toBe(renderMeldung(BASIS));
  });
});

// Die HTML-Fassung entsteht MECHANISCH aus dem Text — zwei getrennt gepflegte
// Fassungen desselben Briefes laufen auseinander, und die, die auseinanderläuft,
// ist die, die niemand liest.
describe("HTML-Fassung", () => {
  it("enthält dieselben Adressen wie der Text", () => {
    const d = renderOutreachDraft(BASIS);
    for (const u of d.body.match(/https?:\/\/[^\s]+/g) ?? []) {
      expect(d.bodyHtml, u).toContain(u.replace(/[.,;:)]$/, ""));
    }
  });

  // Im Quelltext der ersten echten Probemail hing die untere Trennlinie der
  // Meldung im selben Absatz wie die Quellenzeile und erbte deren Kursiv.
  it("macht aus den Strichlinien echte Linien", () => {
    const h = renderOutreachDraft(BASIS).bodyHtml;
    expect(h).not.toContain("----------");
    // Zwei um die Meldung, eine vor dem Fuß.
    expect(h.split("<hr").length - 1).toBe(3);
    // Und die Quellenzeile steht in einem eigenen Absatz, nicht mit einer
    // Linie zusammen.
    expect(h).toMatch(/<p style="font-style:italic[^"]*">[\s\S]*?Quelle:[^<]*<\/span><\/p>/);
  });

  it("setzt den Fuß ab und färbt ihn", () => {
    const h = renderOutreachDraft(BASIS).bodyHtml;
    expect(h).toContain("<hr");
    expect(h).toMatch(/Impressum[\s\S]*color:/);
  });

  it("stellt die Quellenzeile kursiv und leise", () => {
    const h = renderOutreachDraft(BASIS).bodyHtml;
    expect(h).toMatch(/font-style:italic[\s\S]{0,80}?>[\s\S]{0,40}?Quelle:/);
    expect(h).toMatch(/font-size:12px/);
    // Und der Fließtext ist größer als seine Nebensachen — beide Größen werden
    // gesetzt, sonst entscheidet die Voreinstellung des Mailprogramms.
    expect(h).toContain("font-size:14px");
  });

  // Die Signatur steht mitten in einem Absatz („Mit freundlichen Grüßen", Name,
  // Rolle) — die leise Auszeichnung muss also zeilenweise greifen. Sie beginnt
  // aber ERST UNTER DEM NAMEN: In einem Brief steht der Absender in derselben
  // Größe wie das, was er schreibt. Eine Zwischenfassung setzte auch den Namen
  // klein, weil er in einem früheren Stand als größte Zeile wirkte — das lag am
  // damals zu kleinen Fließtext, nicht am Namen.
  it("setzt die Rolle leise, den Namen aber in Textgröße", () => {
    const h = renderOutreachDraft(BASIS).bodyHtml;
    expect(h).toMatch(/<span style="font-size:12px">Betreiber solar-check\.io<\/span>/);
    expect(h).not.toMatch(/<span style="font-size:12px">Sebastian Schäder<\/span>/);
    expect(h).toContain("Sebastian Schäder");
    // LEISER HEISST KLEINER, NICHT GRAUER: Grau bleibt allein im Fuß.
    expect(h).not.toMatch(/<span style="[^"]*color:[^"]*">Sebastian/);
    // Die Grußformel darüber gehört zum Brief und bleibt normal.
    expect(h).toMatch(/>Mit freundlichen Grüßen<br>/);
  });

  it("lässt keine spitzen Klammern aus dem Text durch", () => {
    const d = renderOutreachDraft({ ...BASIS, name: "Musterdorf <script>" });
    expect(d.bodyHtml).not.toContain("<script>");
    expect(d.bodyHtml).toContain("&lt;script&gt;");
  });
});
