import { describe, expect, it } from "vitest";
import {
  findeDavid,
  findeFlaechenmix,
  findeFoerderluecken,
  findeHeizungsfoerderung,
  findeKohorte,
  findeTopliste,
  findeWohnform,
  findeAnomalie,
  ortsnamen,
  findeSaison,
  findeAufholer,
  MUSTER_TAKT,
} from "../social-funde";
import type { AwardCategory } from "../awards";

/** Eine Pro-Kopf-Kategorie, wie sie die Ranglisten kennen. */
const KAT = {
  key: "test-pk",
  thema: "private Solarleistung je Einwohner",
  themaDativ: "privater Solarleistung je Einwohner",
  format: "wattProKopf",
  menge: (g: { solarCount?: number }) => g.solarCount ?? 0,
  metric: (g: { population: number; privatDachKwp: number }) =>
    g.population > 0 ? (g.privatDachKwp * 1000) / g.population : null,
  plausibel: () => true,
} as unknown as AwardCategory;

const ort = (name: string, population: number, privatDachKwp: number, extra: object = {}) =>
  ({ regionId: "0", name, population, privatDachKwp, solarCount: 50, ...extra }) as never;

describe("David gegen Goliath", () => {
  it("rechnet den gemeinsamen Wert der Städte aus SUMMEN, nicht als Mittel ihrer Quoten", () => {
    // Drei Städte: eine mit 1.000.000 Einwohnern und 100 W/Kopf, zwei mit je
    // 100.000 und 1.000 W/Kopf. Der MITTELWERT der Quoten wäre 700 W/Kopf, die
    // gemeinsame Rechnung ergibt 250 — man summiert keine Quoten. Ein Dorf mit
    // 300 W/Kopf schlägt die drei zusammen also wirklich, obwohl es weit unter
    // dem Mittelwert liegt. Genau daran scheitert dieser Vergleich in der Presse.
    const gemeinden = [
      ort("Großstadt", 1_000_000, 100_000),
      ort("Mittelstadt", 100_000, 100_000),
      ort("Drittstadt", 100_000, 100_000),
      // Das Dorf muss die Städte um mindestens das Dreifache schlagen (250 →
      // 750 W/Kopf), sonst greift die Hürde: Sie schlicht zu übertreffen
      // schaffen tausende Orte.
      ort("Dorf", 2_000, 1_600),
      ...Array.from({ length: 30 }, (_, i) => ort(`F${i}`, 5_000, 500)),
    ];
    const funde = findeDavid(gemeinden, KAT, "g3");
    expect(funde.map((f) => f.satz).join(" ")).toContain("Dorf");
    expect(Math.round(funde[0].werte[1].wert)).toBe(250);
  });
});

describe("Top-Liste", () => {
  it("nennt den Anteil am Gesamtbestand — ohne Nenner ist die Aussage bedeutungslos", () => {
    // 100 Dörfer, 20 Städte. Die Dörfer stellen die Spitze — das ist bei 83 %
    // Anteil am Bestand aber das Erwartete und darf NICHT als Fund herauskommen.
    const gemeinden = [
      ...Array.from({ length: 100 }, (_, i) => ort(`D${i}`, 2_000, 200 + i)),
      ...Array.from({ length: 20 }, (_, i) => ort(`S${i}`, 200_000, 100)),
    ];
    const funde = findeTopliste(
      gemeinden,
      KAT,
      "g3",
      (g: { population: number }) => (g.population < 5_000 ? "Dörfer" : "Städte"),
      "Größe",
    );
    expect(funde).toHaveLength(0);
  });
});

describe("Flächenfrage", () => {
  it("vergleicht nur innerhalb EINES Bundeslands", () => {
    // Zwei Länder, in jedem vier Kreise. Der Unterschied liegt zwischen den
    // Ländern, innerhalb keines Landes — es darf nichts herauskommen.
    const bau = (land: string, frei: number) =>
      Array.from(
        { length: 4 },
        (_, i) =>
          ({
            regionId: `${land}${i}`,
            name: `${land}${i}`,
            population: 50_000,
            freiflaecheKwp: frei,
            gewerbeDachKwp: 10_000,
            privatDachKwp: 20_000,
          }) as never,
      );
    const funde = findeFlaechenmix(
      [...bau("A", 90_000), ...bau("B", 0)],
      "g14",
      (g: { regionId: string }) => g.regionId,
      (g: { regionId: string }) => g.regionId[0],
    );
    expect(funde).toHaveLength(0);
  });
});

describe("Förderlücken", () => {
  it("nennt keine einzige Kommune beim Namen", () => {
    const programme = Array.from({ length: 40 }, () => ({
      status: "aktiv",
      level: "kommune",
      name: "Solarbonus Musterstadt",
      capped: true,
      conditions: [],
    }));
    for (const f of findeFoerderluecken(programme, "g12")) {
      expect(f.satz).not.toContain("Musterstadt");
    }
  });
});

describe("Kohorte", () => {
  const solar = (year: number, count: number, kwp: number) => ({
    year,
    segment: "privat_dach",
    count,
    kwp,
  });

  it("hört auf, bevor mehr Speicher gemeldet werden als neue Anlagen gebaut", () => {
    // Gemessen im echten Bestand: Die Quote läuft von 18 Prozent (2015) auf 98
    // (2024) und steht 2025 bei 136 — es werden mehr Speicher angemeldet als
    // neue private Dachanlagen gebaut. „Jede neue Anlage hat einen" wäre ab da
    // falsch, weil die Speicherzahl nicht mehr nur an neuen Dachanlagen hängt
    // (Nachrüstung, Gewerbe — das Register trennt beim Speicher keine Segmente).
    const jahre = [2020, 2021, 2022, 2023, 2024, 2025];
    const solarReihe = jahre.map((y) => solar(y, 100_000, 900_000));
    const speicherReihe = jahre.map((y) => ({
      year: y,
      segment: "n/a",
      count: y === 2025 ? 136_000 : 90_000,
      kwp: 0,
    }));
    const funde = findeKohorte(solarReihe, speicherReihe, "g16", 2025);
    const speicherSatz = funde.find((f) => f.satz.startsWith("Speicher"));
    expect(speicherSatz?.satz).toContain("2024");
    expect(speicherSatz?.satz).not.toContain("2025 kam auf");
    // Die Überschreitung verschwindet nicht, sie wandert in die Grundlage —
    // ohne Ursachenzuschreibung: Wie viel davon Nachrüstung ist, sagen die
    // Daten nicht.
    expect(speicherSatz?.grundlage).toContain("2025");
    expect(speicherSatz?.grundlage).toContain("über 100 Prozent");
  });

  it("lässt die Fantasie-Jahrgänge des Registers draußen", () => {
    // Das Anlagenregister trägt Baujahre aus Tippfehlern (1900, 1923, 1998).
    // Ohne Untergrenze begann der Satz bei 1998.
    const funde = findeKohorte(
      [
        solar(1900, 5_000, 5_000),
        solar(1998, 5_000, 14_000),
        // Die Anlage wächst über die Jahrgänge von 3 auf 11 kWp — sonst gibt es
        // gar keinen Fund, und der Test prüfte nichts.
        ...[2000, 2005, 2010, 2015, 2020, 2024].map((y, i) =>
          solar(y, 50_000, 50_000 * (3 + i * 1.6)),
        ),
      ],
      [],
      "g16",
      2024,
    );
    expect(funde[0].satz).toContain("2000");
    expect(funde[0].satz).not.toContain("1998");
    expect(funde[0].satz).not.toContain("1900");
  });
});

describe("Heizungsförderung", () => {
  it("sagt nie „Wärmepumpe“ — die Quelle schlüsselt auf Kreisebene keine Technik auf", () => {
    const zeilen = Array.from({ length: 30 }, (_, i) => ({
      region_id: `0900${i}`,
      jahr: 2025,
      programm: "BEG WG - Heizungsförderung Priv. - Zuschuss",
      anzahl: 200 + i * 10,
      volumen_mio: 3 + i,
    }));
    const funde = findeHeizungsfoerderung(
      zeilen,
      () => 100_000,
      (id) => `Kreis ${id}`,
      "g19",
    );
    expect(funde.length).toBeGreaterThan(0);
    for (const f of funde) {
      expect(f.satz).not.toMatch(/Wärmepumpe/i);
      expect(f.satz).toContain("Heizungsförderungen");
    }
  });

  it("lässt Kreise nahe der Unterdrückungsgrenze draußen", () => {
    // Werte unter zehn sind in der Quelle aus Datenschutzgründen unterdrückt.
    // Eine Kreissumme aus wenigen Zeilen ist damit zwangsläufig zu niedrig.
    // Der knappe Kreis muss die HÖCHSTE Quote haben, sonst prüft der Test
    // nichts: Ohne Schranke stünde er ganz oben, mit Schranke gar nicht da.
    // Die erste Fassung gab ihm die niedrigste — sie blieb grün, als die
    // Schranke zur Probe auf die Unterdrückungsgrenze gesenkt wurde.
    const zeilen = Array.from({ length: 30 }, (_, i) => ({
      region_id: `0900${i}`,
      jahr: 2025,
      programm: "BEG WG - Heizungsförderung Priv. - Zuschuss",
      anzahl: i === 0 ? 12 : 500,
      volumen_mio: 5,
    }));
    const funde = findeHeizungsfoerderung(
      zeilen,
      (id) => (id === "09000" ? 100 : 100_000),
      (id) => `Kreis ${id}`,
      "g19",
    );
    expect(funde.length).toBeGreaterThan(0);
    expect(funde.map((f) => f.satz).join(" ")).not.toContain("Kreis 09000 ");
  });
});

describe("Wohnform", () => {
  /** Ein Ort mit gegebenem Mehrfamilienhaus-Anteil und Solarleistung je Wohnung. */
  const bau = (n: number, mfhAnteil: number, wattJeWohnung: number, ab = 0) =>
    Array.from({ length: n }, (_, i) => ({
      ort: {
        regionId: `r${ab + i}`,
        name: `O${ab + i}`,
        population: 5_000,
        privatDachKwp: (wattJeWohnung * 2_000) / 1000,
      } as never,
      wohnraum: { gesamt: 2_000, mehrfamilie: Math.round(2_000 * mfhAnteil) },
    }));

  it("vergleicht die äußeren Fünftel, nicht die Hälften", () => {
    // Der Unterschied liegt an den Enden: Beide Ränder sind klar getrennt, die
    // Mitte liegt dazwischen. Über Hälften gemittelt verwischt der Befund.
    const orte = [
      ...bau(30, 0.1, 2_000, 0),
      ...bau(90, 0.4, 1_200, 30),
      ...bau(30, 0.9, 500, 120),
    ];
    const karte = new Map(orte.map((o) => [(o.ort as { regionId: string }).regionId, o.wohnraum]));
    const funde = findeWohnform(
      orte.map((o) => o.ort),
      (id) => karte.get(id) ?? null,
      "g15",
    );
    expect(funde).toHaveLength(1);
    expect(funde[0].werte[0].wert).toBe(2_000);
    expect(funde[0].werte[1].wert).toBe(500);
  });

  it("behauptet NICHT, welche Anlage auf welchem Gebäude steht", () => {
    // Der Katalogsatz verlangt eine Zuordnung Anlage → Gebäudetyp. Die gibt es
    // in diesen Daten nicht: Das Register nennt Gemeinde und Leistung, nie das
    // Gebäude darunter. Wer sie trotzdem behauptet, hat sie erfunden.
    const orte = [...bau(30, 0.1, 2_000, 0), ...bau(90, 0.4, 1_200, 30), ...bau(30, 0.9, 500, 120)];
    const karte = new Map(orte.map((o) => [(o.ort as { regionId: string }).regionId, o.wohnraum]));
    const [fund] = findeWohnform(
      orte.map((o) => o.ort),
      (id) => karte.get(id) ?? null,
      "g15",
    );
    expect(fund.satz).toMatch(/je Wohnung/);
    expect(fund.satz).not.toMatch(/auf Mehrfamilienhäusern stehen|davon stehen auf/);
    expect(fund.grundlage).toContain("nie das Gebäude darunter");
  });
});

describe("Anomalie", () => {
  /** 24 Monate ruhiger Zubau, optional ein Schub in drei davon. */
  const reihe = (regionId: string, ruhig: number, schubAb?: number, schub?: number) =>
    Array.from({ length: 24 }, (_, i) => {
      const monat = `2024-${String((i % 12) + 1).padStart(2, "0")}`;
      const jahr = 2024 + Math.floor(i / 12);
      const m = `${jahr}-${String((i % 12) + 1).padStart(2, "0")}`;
      void monat;
      const imSchub = schubAb !== undefined && i >= schubAb && i < schubAb + 3;
      return { regionId, monat: m, count: imSchub ? Math.round((schub ?? 0) / 3) : ruhig };
    });

  it("lässt die jüngsten Monate draußen — sie wachsen noch nach", () => {
    // Anlagen werden nach der Inbetriebnahme registriert. Ein Schub im letzten
    // Monat ist deshalb kein Befund, sondern ein halb gemeldeter Monat.
    const zeilen = reihe("r1", 2, 21, 300);
    const funde = findeAnomalie(zeilen, () => "Musterdorf", "g10", "Balkonkraftwerke");
    expect(funde).toHaveLength(0);
  });

  it("meldet nur nach oben, nie einen Einbruch", () => {
    // Ein Ort, der dauerhaft viel baut und in drei Monaten wenig: Der Faktor
    // ist genauso auffällig, der Satz wäre eine Bloßstellung.
    //
    // Der Einbruch muss ÜBER der Mindestmenge liegen, sonst prüft der Test
    // nichts: Die erste Fassung ließ ihn auf null fallen und blieb grün, als
    // zur Probe auch Einbrüche gemeldet wurden — verworfen hatte sie die
    // Mengenschranke, nicht die Richtung.
    const zeilen = reihe("r1", 200, 5, 30);
    const funde = findeAnomalie(zeilen, () => "Musterdorf", "g10", "Balkonkraftwerke");
    expect(funde).toHaveLength(0);
  });

  it("erfindet keine Ursache und endet mit der Frage", () => {
    const zeilen = reihe("r1", 2, 6, 240);
    const [fund] = findeAnomalie(zeilen, () => "Musterdorf", "g10", "Balkonkraftwerke");
    expect(fund).toBeDefined();
    expect(fund.satz).toContain("Weiß jemand, was da los war?");
    expect(fund.satz).not.toMatch(/weil|Sammelbestellung|Neubaugebiet|vermutlich/);
  });
});

describe("Ortsnamen", () => {
  it("hängt den Kreis nur an, wo der Name mehrfach vorkommt", () => {
    // „Lichtenau" gibt es viermal in Deutschland (Nordrhein-Westfalen,
    // Baden-Württemberg, Bayern, Sachsen). Ein Satz über „Lichtenau" behauptet
    // gegenüber drei anderen Lichtenaus etwas, das dort nicht stimmt.
    const orte = [
      { regionId: "05774028", name: "Lichtenau" },
      { regionId: "08216028", name: "Lichtenau" },
      { regionId: "11000000", name: "Berlin" },
    ];
    const name = ortsnamen(orte, (id) =>
      id === "05774" ? "Kreis Paderborn" : id === "08216" ? "Landkreis Rastatt" : "Berlin",
    );
    expect(name("05774028")).toBe("Lichtenau (Kreis Paderborn)");
    expect(name("08216028")).toBe("Lichtenau (Landkreis Rastatt)");
    // Kein „Berlin (Berlin)" — der Zusatz kommt nur, wo er gebraucht wird.
    expect(name("11000000")).toBe("Berlin");
  });

  it("nennt lieber gar keinen Ort als den falschen", () => {
    // Ohne Kreisnamen ist der Zusatz nicht bildbar. Dann fällt der Ort aus,
    // statt mehrdeutig genannt zu werden.
    const name = ortsnamen(
      [
        { regionId: "05774028", name: "Lichtenau" },
        { regionId: "08216028", name: "Lichtenau" },
      ],
      () => null,
    );
    expect(name("05774028")).toBeNull();
  });
});

describe("Anomalie: Förderkatalog als Gegenprobe", () => {
  it("fragt nicht, wo wir die Antwort kennen", () => {
    // „Weiß jemand, was da los war?" ist eine echte Frage, solange wir es nicht
    // wissen. Steht die Ursache in unserem eigenen Förderkatalog, wäre sie eine
    // Inszenierung — und die erste Antwort in den Kommentaren zeigt das.
    const zeilen = Array.from({ length: 24 }, (_, i) => {
      const jahr = 2024 + Math.floor(i / 12);
      const m = `${jahr}-${String((i % 12) + 1).padStart(2, "0")}`;
      const imSchub = i >= 6 && i < 9;
      return { regionId: "r1", monat: m, count: imSchub ? 80 : 2 };
    });
    const ohne = findeAnomalie(zeilen, () => "Musterdorf", "g10", "Balkonkraftwerke");
    expect(ohne).toHaveLength(1);

    const mit = findeAnomalie(zeilen, () => "Musterdorf", "g10", "Balkonkraftwerke", {
      foerderungBekannt: () => true,
    });
    expect(mit).toHaveLength(0);
  });
});

describe("Saisonvergleich", () => {
  /** Elf Jahre, eine Woche je Jahr, mit vorgegebenem Anteil an der Last. */
  const reihe = (anteile: Record<number, number>, woche = 35, last = 8000) =>
    Object.entries(anteile).map(([jahr, anteil]) => ({
      jahr: Number(jahr),
      woche,
      wert: (anteil / 100) * last,
      last,
    }));

  it("misst den ANTEIL, nicht die erzeugte Menge", () => {
    // Die Menge wächst mit dem Zubau und schlüge fast jedes Jahr einen Rekord —
    // eine Meldung ohne Aussage. Hier verdoppelt sich die Menge über die Jahre,
    // die Last aber auch: Der Anteil bleibt gleich, also gibt es nichts zu
    // melden.
    const zeilen = Array.from({ length: 11 }, (_, i) => ({
      jahr: 2015 + i,
      woche: 35,
      wert: 1000 + i * 200,
      last: 5000 + i * 1000,
    }));
    // Plus eine laufende Woche, damit die jüngste vollständige gewertet wird.
    zeilen.push({ jahr: 2025, woche: 36, wert: 0, last: 0 });
    expect(findeSaison(zeilen, "g6", "Solarstrom", { heute: { jahr: 2025, woche: 36 } })).toHaveLength(0);
  });

  it("überspringt die zuletzt erhobene Woche — sie ist noch unvollständig", () => {
    const zeilen = [
      ...reihe({ 2015: 10, 2016: 11, 2017: 12, 2018: 13, 2019: 14, 2020: 15, 2021: 16 }),
      // Die laufende Woche steht mit einem absurden Rekord da, weil erst zwei
      // Tage erhoben sind. Sie darf nicht gemeldet werden.
      { jahr: 2021, woche: 36, wert: 7900, last: 8000 },
    ];
    const funde = findeSaison(zeilen, "g6", "Solarstrom", { heute: { jahr: 2021, woche: 36 } });
    expect(funde.every((f) => !f.satz.includes("KW 36"))).toBe(true);
  });

  it("meldet nur am Rand der Reihe, nicht im Mittelfeld", () => {
    // Ein vierter Platz ist keine Geschichte.
    const zeilen = [
      ...reihe({ 2015: 30, 2016: 28, 2017: 26, 2018: 24, 2019: 22, 2020: 20, 2021: 25 }),
      { jahr: 2021, woche: 36, wert: 0, last: 0 },
    ];
    expect(findeSaison(zeilen, "g6", "Solarstrom", { heute: { jahr: 2021, woche: 36 } })).toHaveLength(0);
  });

  it("nennt den bisherigen Bestwert samt Jahr", () => {
    const zeilen = [
      ...reihe({ 2015: 10, 2016: 12, 2017: 14, 2018: 16, 2019: 18, 2020: 20, 2021: 31 }),
      { jahr: 2021, woche: 36, wert: 0, last: 0 },
    ];
    const [fund] = findeSaison(zeilen, "g6", "Solarstrom", { heute: { jahr: 2021, woche: 36 } });
    expect(fund.satz).toContain("höchste Wert für eine KW 35 seit 2015");
    expect(fund.satz).toContain("20 Prozent 2020");
    // Zeitgebunden: „diese Woche" ist in einem Monat niemandes Woche mehr.
    expect(fund.evergreen).toBe(false);
  });

  it("braucht genug Vergleichsjahre", () => {
    const zeilen = [
      ...reihe({ 2019: 10, 2020: 12, 2021: 40 }),
      { jahr: 2021, woche: 36, wert: 0, last: 0 },
    ];
    expect(findeSaison(zeilen, "g6", "Solarstrom", { heute: { jahr: 2021, woche: 36 } })).toHaveLength(0);
  });
});

describe("Takt", () => {
  it("kennt jedes Muster", () => {
    // Ein Muster ohne Takt wäre im Redaktionsplan unsichtbar — man wüsste
    // nicht, wann es sich lohnt, es erneut zu ernten.
    const gebraucht = [
      "ausreisser", "kontrast", "umkehrung", "aufholer", "topliste", "david",
      "flaechenmix", "foerderluecke", "kohorte", "heizungsfoerderung",
      "wohnform", "anomalie", "saison",
    ] as const;
    for (const m of gebraucht) {
      expect(MUSTER_TAKT[m]).toBeDefined();
    }
  });
});

describe("Aufholer: nur eine Richtung", () => {
  const kat = (key: string, thema: string, feld: string): AwardCategory =>
    ({
      key,
      thema,
      themaDativ: thema,
      format: "wattProKopf",
      menge: () => 50,
      metric: (g: Record<string, number>) => Number(g[feld] ?? 0),
      plausibel: () => true,
    }) as unknown as AwardCategory;

  const BESTAND = kat("bestand", "Bestand", "privatDachKwp");
  const TEMPO = kat("tempo", "Tempo", "solarKwpLy");

  it("meldet nie, dass eine Region nachlässt", () => {
    // Gruppe A: viel Bestand, wenig Tempo — sie LÄSST NACH.
    // Gruppe B: wenig Bestand, viel Tempo — sie holt auf.
    //
    // Die erste Fassung ging über die Umkehrung und filterte danach auf ein
    // Wort im Satz. Das war wirkungslos, weil der Umkehrungs-Satz IMMER beide
    // Messgrößen nennt: „A steht bei Bestand weit vorn und bei Tempo weit
    // hinten" kam als Aufholer heraus — die Bloßstellung, die der Kommentar
    // ausdrücklich ausschließt, im unveränderten Wortlaut der Umkehrung.
    const orte: never[] = [];
    for (let i = 0; i < 30; i++) {
      orte.push({
        regionId: `A${i}`,
        name: `A${i}`,
        population: 5_000,
        privatDachKwp: 900 + i,
        solarKwpLy: 10 + i,
      } as never);
      orte.push({
        regionId: `B${i}`,
        name: `B${i}`,
        population: 5_000,
        privatDachKwp: 10 + i,
        solarKwpLy: 900 + i,
      } as never);
    }

    const funde = findeAufholer(orte, BESTAND, TEMPO, "g2", (g: { name: string }) =>
      g.name.slice(0, 1),
    );
    expect(funde.length).toBeGreaterThan(0);
    for (const f of funde) {
      expect(f.satz).toContain("baut derzeit mit am schnellsten zu");
      // Kein Satz darf die verbotene Richtung tragen.
      expect(f.satz).not.toMatch(/steht bei .* weit vorn/);
      expect(f.muster).toBe("aufholer");
    }
    // Nur die aufholende Gruppe, nie die nachlassende.
    expect(funde.map((f) => f.satz).join(" ")).toContain("B ");
    expect(funde.map((f) => f.satz).join(" ")).not.toMatch(/^A |\bA baut/);
  });
});

describe("Anomalie: der Stichtag kommt vom Kalender", () => {
  it("lässt einen unfertigen Monat auch dann draußen, wenn er in den Daten fehlt", () => {
    // Die Karenz schnitt vorher die letzten drei EINTRÄGE ab. Fehlt der
    // laufende Monat in der Tabelle — früh im Monat, oder ein Segment ohne
    // Zubau —, entfernte sie drei abgeschlossene Monate und ließ den jüngsten,
    // erst zu 82 Prozent gemeldeten stehen.
    const monate: string[] = [];
    for (let i = 0; i < 20; i++) {
      const jahr = 2025 + Math.floor(i / 12);
      monate.push(`${jahr}-${String((i % 12) + 1).padStart(2, "0")}`);
    }
    // Der letzte Monat der Reihe trägt einen Schub. Er liegt genau ein Jahr vor
    // „heute" — also weit außerhalb der Karenz — und muss gefunden werden.
    const zeilen = monate.map((m, i) => ({
      regionId: "r1",
      monat: m,
      count: i >= 6 && i < 9 ? 60 : 2,
    }));

    const heuteWeitSpaeter = findeAnomalie(zeilen, () => "Musterdorf", "g10", "Balkonkraftwerke", {
      heuteMonat: "2027-06",
    });
    expect(heuteWeitSpaeter.length).toBe(1);

    // Steht „heute" dagegen mitten im Schub, ist er unfertig und fällt weg —
    // obwohl die Datenreihe unverändert ist.
    const heuteImSchub = findeAnomalie(zeilen, () => "Musterdorf", "g10", "Balkonkraftwerke", {
      heuteMonat: "2025-08",
    });
    expect(heuteImSchub).toHaveLength(0);
  });

  it("verwirft nur das geförderte Fenster, nicht den ganzen Ort", () => {
    // Ein Programm, das 2025 lief, erklärt keinen Ausschlag von 2026.
    const monate: string[] = [];
    for (let i = 0; i < 24; i++) {
      const jahr = 2025 + Math.floor(i / 12);
      monate.push(`${jahr}-${String((i % 12) + 1).padStart(2, "0")}`);
    }
    const zeilen = monate.map((m, i) => ({
      regionId: "r1",
      monat: m,
      // Zwei Schübe: einer früh (gefördert), einer spät (nicht gefördert).
      count: (i >= 3 && i < 6) || (i >= 15 && i < 18) ? 60 : 2,
    }));

    const funde = findeAnomalie(zeilen, () => "Musterdorf", "g10", "Balkonkraftwerke", {
      heuteMonat: "2027-06",
      // Nur der frühe Schub liegt in der Förderzeit.
      foerderungBekannt: (_id, von) => von < "2025-10",
    });
    // Der spätere Ausschlag bleibt — die erste Fassung brach hier ab und
    // verwarf den Ort komplett.
    expect(funde.length).toBe(1);
    expect(funde[0].satz).toContain("2026");
  });
});
