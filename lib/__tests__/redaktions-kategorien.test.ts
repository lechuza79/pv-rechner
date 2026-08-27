import { describe, expect, it } from "vitest";
import { KATEGORIEN, kategorie, kategorieAusAdresse } from "../redaktions-kategorien";
import { FAMILIEN } from "../redaktionsplan";
import { KARTEN_STILE, KARTEN_STIL_STANDARD, kartenTokens, istKartenStil } from "../social-karten-stil";
import { BILDFORMEN, BILDFORM_NAME, TEMPLATES, baueAllePosts, kurzEinwohner, moeglicheFormen, templateVon, type SocialKennzahlen } from "../social-posts";
import { BUNDESLAND_UMRISS } from "../bundesland-umrisse";

// Die beiden Ausfälle, die diese Ansicht haben kann, sind von außen unsichtbar:
// ein Reiter ohne Stories (ein Versprechen ohne Inhalt) und eine Story ohne
// Reiter (sie steht nirgends und fehlt nur dem, der sie vermisst).

const basis: SocialKennzahlen = {
  standIso: "2026-08-05T00:00:00+00:00",
  stadtLand: {
    stadtAb: 100_000,
    landUnter: 20_000,
    stadtAnzahl: 80,
    landAnzahl: 10_037,
    stadtJeTausend: 9.9,
    landJeTausend: 22.8,
  },
  wachstum: {
    balkonJetzt: 1_453_026,
    balkonVorJahr: 1_202_467,
    solarKwpJetzt: 127_100_000,
    solarKwpVorJahr: 117_600_000,
  },
  segmente: {
    privatDachKwp: 36_200_000,
    gewerbeDachKwp: 44_500_000,
    freiflaecheKwp: 44_900_000,
    solarGesamtKwp: 127_100_000,
  },
  ueberEinwohner: { mindestEinwohner: 500, betrachtet: 10_000, darueber: 6_848 },
  foerderung: { programme: 108, gemeinden: 97, nurBalkon: 12, ohneHoechstbetrag: 61, mitAntragVorher: 74 },
  kohorte: { privatAnlagen: 3_120_000, mittlereKwp: 9.4, speicherEinheiten: 1_180_000, speicherJe100: 37.8 },
  anomalie: {
    ort: "Beispielstadt",
    einwohner: 24_500,
    jeTausend: 61.2,
    bundesJeTausend: 17.3,
    mindestEinwohner: 5_000,
  },
  laender: [
    { name: "Niedersachsen", balkonJeTausend: 23.1, wpProKopf: 505, privatDachKwp: 4_000_000, speicherJe100: 30, freiflaecheAnteil: 17.4, solarKwp: 11_300_000, wachstumFuenfJahre: 2.23 },
    { name: "Brandenburg", balkonJeTausend: 20.5, wpProKopf: 377, privatDachKwp: 950_000, speicherJe100: 30, freiflaecheAnteil: 70.3, solarKwp: 9_800_000, wachstumFuenfJahre: 2.05 },
    { name: "Nordrhein-Westfalen", balkonJeTausend: 16.1, wpProKopf: 378, privatDachKwp: 6_800_000, speicherJe100: 30, freiflaecheAnteil: 9.1, solarKwp: 15_500_000, wachstumFuenfJahre: 2.33 },
    { name: "Berlin", balkonJeTausend: 7.1, wpProKopf: 72, privatDachKwp: 260_000, speicherJe100: 30, freiflaecheAnteil: 0.4, solarKwp: 500_000, wachstumFuenfJahre: 3.48 },
    { name: "Hamburg", balkonJeTausend: 6.1, wpProKopf: 84, privatDachKwp: 150_000, speicherJe100: 30, freiflaecheAnteil: 0.4, solarKwp: 300_000, wachstumFuenfJahre: 4.38 },
    { name: "Bremen", balkonJeTausend: 5.4, wpProKopf: 61, privatDachKwp: 110_000, speicherJe100: 30, freiflaecheAnteil: 0.2, solarKwp: 200_000, wachstumFuenfJahre: 3.9 },
  ],
};

const posts = baueAllePosts(basis);

describe("Kategorien der Redaktionsansicht", () => {
  it("jede Story steht unter genau einem Reiter", () => {
    const schluessel = KATEGORIEN.map((k) => k.schluessel);
    for (const p of posts) {
      expect(schluessel, `${p.id} hat eine unbekannte Kategorie`).toContain(p.kategorie);
    }
  });

  it("die Kategorien SIND die Familien, keine zweite Liste", () => {
    // Ein erster Anlauf führte eine eigene Ordnung nach Aussageform neben den
    // beschlossenen Familien. Zwei Listen für dieselbe Sache driften, und die
    // erfundene stand in der Ansicht, während die beschlossene in der Planung
    // lag — wer eine Kategorie ändern wollte, hätte raten müssen, welche gilt.
    expect(KATEGORIEN).toBe(FAMILIEN);
    expect(new Set(KATEGORIEN.map((k) => k.schluessel)).size).toBe(KATEGORIEN.length);
  });

  it("der Zustand gebaut stimmt mit den Stories überein", () => {
    // Der Zustand ist handgepflegt, die Stories sind es nicht. Ohne diesen
    // Abgleich stünde in der Planung irgendwann „gebaut" an einer Familie, unter
    // der nichts liegt — und umgekehrt eine fertige Story unter „Daten fehlen".
    for (const k of KATEGORIEN) {
      const hatStories = posts.some((p) => p.kategorie === k.schluessel);
      expect(k.zustand === "gebaut", `${k.kuerzel} (${k.zustand}): Stories ${hatStories}`).toBe(hatStories);
    }
  });

  it("eine leere Kategorie ist ein Platz, kein Fehler", () => {
    // Die Regel hieß zuerst „kein Reiter ohne Stories" — richtig, solange die
    // Ansicht den Bestand zeigt. Sie ist aber auch ein Raster für das, was noch
    // kommt (Betreiber, 27.08.2026), und dann ist ein benannter leerer Platz
    // etwas anderes als ein leeres Versprechen: Er muss sagen, was dort hin
    // gehört, und die Ansicht muss den Zustand behandeln statt eine Überschrift
    // über nichts zu setzen.
    const leere = KATEGORIEN.filter((k) => !posts.some((p) => p.kategorie === k.schluessel));
    for (const k of leere) {
      expect(k.beschreibung.length, `${k.schluessel} ist leer und erklärt sich nicht`).toBeGreaterThan(80);
    }
    // Die Gegenrichtung bleibt scharf: Eine Story ohne Reiter stünde nirgends.
    for (const p of posts) {
      expect(KATEGORIEN.map((k) => k.schluessel)).toContain(p.kategorie);
    }
  });

  it("jede Kategorie sagt, was sie behauptet und woran sie scheitert", () => {
    for (const k of KATEGORIEN) {
      expect(k.beschreibung.length, `${k.schluessel} ohne Beschreibung`).toBeGreaterThan(80);
      expect(k.kurz.length, `${k.schluessel}: Nav-Beschriftung zu lang für eine Zeile`).toBeLessThanOrEqual(16);
    }
  });

  it("das Farbschema hängt am Post, nicht an der Kategorie", () => {
    // Zwei Beiträge derselben Kategorie dürfen verschieden aussehen. Stünde hier
    // eine Vorgabe, müsste jede Abweichung als solche ausgewiesen werden.
    expect(KATEGORIEN.every((k) => !("stil" in k))).toBe(true);
    for (const p of posts) {
      expect(KARTEN_STILE, `${p.id} ohne gültiges Farbschema`).toContain(p.bild?.stil);
    }
  });

  it("eine gespeicherte Wahl schlägt die Vorgabe — Unbekanntes nicht", () => {
    const [gewaehlt] = baueAllePosts(basis, { "stadt-land-balkon": { stil: "highlight" } });
    expect(gewaehlt.bild?.stil).toBe("highlight");

    // Ein Stil, den wir nicht mehr kennen, ist ein Fund für den Code und kein
    // Grund für eine ungefärbte Karte.
    const [zurueck] = baueAllePosts(basis, {
      "stadt-land-balkon": { stil: "neonpink" as never },
    });
    expect(zurueck.bild?.stil).toBe(KARTEN_STIL_STANDARD);
  });

  it("ein alter Adressteil führt auf die erste Kategorie, ein falscher Code-Schlüssel wirft", () => {
    expect(kategorieAusAdresse("gibtsnicht").schluessel).toBe(KATEGORIEN[0].schluessel);
    expect(kategorieAusAdresse(undefined).schluessel).toBe(KATEGORIEN[0].schluessel);
    expect(() => kategorie("gibtsnicht" as never)).toThrow();
  });
});

describe("Die Kennung eines Beitrags", () => {
  // Sie ist der einzige Name, der zwischen Ansicht, Ablage und Prüfung derselbe
  // ist. Zwei Beiträge mit derselben Kennung wären von außen unsichtbar: Der
  // gespeicherte Text des einen erschiene am anderen, und eine Freigabe für den
  // einen ließe den anderen durch. Bei einer Handvoll Beiträgen passiert das
  // nicht, bei hunderten schon.
  it("gibt es kein zweites Mal", () => {
    const ids = posts.map((p) => p.id);
    const doppelte = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(doppelte, `doppelte Kennungen: ${doppelte.join(", ")}`).toEqual([]);
  });

  it("besteht aus Kleinbuchstaben, Ziffern und Bindestrichen", () => {
    // Sie steht in Adressen, in JSON und in einer Datenbankspalte. Ein
    // Leerzeichen oder ein Umlaut darin fällt erst dort auf, wo er kodiert
    // werden muss — also spät.
    for (const p of posts) expect(p.id, p.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("ist lang genug, um bei hunderten Beiträgen noch etwas zu sagen", () => {
    // Der Einwand des Betreibers: Bei hunderten Posts trägt ein sprechender
    // Name nicht mehr allein. Was trägt, ist ein Name, der die FAMILIE nennt —
    // dann steht die Kennung in derselben Ordnung wie die Ansicht, und zwei
    // Beiträge derselben Familie stehen im Verzeichnis nebeneinander.
    for (const p of posts) expect(p.id.length, p.id).toBeGreaterThan(8);
  });
});

describe("Bildform und Einheit", () => {
  it("Ringpaar und Säule tragen genau zwei Werte", () => {
    // Beide Formen zeigen ein Verhältnis zwischen zweien. Bei drei Werten wäre
    // der dritte nirgends, ohne dass etwas fehlschlägt.
    for (const p of posts) {
      if (p.bild?.art === "donut" || p.bild?.art === "saeule") {
        expect(p.bild.serien.length, `${p.id}: ${p.bild.art} mit ${p.bild.serien.length} Werten`).toBe(2);
      }
    }
  });

  it("gefüllte Umrisse nur für Anteile, und jede Serie hat ihren Umriss", () => {
    // Die Form behauptet ein Gefäß, das sich füllt. Ohne Ganzes wäre das eine
    // Aussage über einen Rest, den es nicht gibt; ohne Umriss bliebe eine leere
    // Fläche, ohne dass etwas fehlschlägt.
    for (const p of posts) {
      if (p.bild?.art !== "umriss") continue;
      expect(p.bild.ganzes, `${p.id}: gefüllter Umriss ohne Ganzes`).toBeGreaterThan(0);
      for (const s of p.bild.serien) {
        expect(BUNDESLAND_UMRISS[s.umriss ?? ""], `${p.id}: ${s.label} ohne Umriss`).toBeTruthy();
      }
    }
  });

  it("Ringe nur für Anteile, Säulen nur ohne Ganzes", () => {
    // Die Regel, um die es geht: Ein Ring bildet einen Anteil an einem Ganzen
    // ab — ohne Ganzes behauptet der leere Rest etwas, das es nicht gibt. Eine
    // Säule zeigt ein Verhältnis zwischen zwei Werten und braucht kein Ganzes;
    // mit einem wäre der Sockel plötzlich ein Anteil und die Höhe eine andere
    // Aussage.
    for (const p of posts) {
      if (p.bild?.art === "donut") {
        expect(p.bild.ganzes, `${p.id}: Ringpaar ohne Ganzes`).toBeGreaterThan(0);
      }
      if (p.bild?.art === "saeule") {
        expect(p.bild.ganzes, `${p.id}: Säule mit Ganzem`).toBeUndefined();
      }
    }
  });

  it("angeboten wird nur, was für diese Zahlen trägt", () => {
    // Der Umschalter im Redaktionstisch nimmt genau diese Liste. Eine Form, die
    // wählbar ist, wählt irgendwann jemand — und dann steht eine Aussage im
    // Bild, die die Zahlen nicht hergeben.
    for (const p of posts) {
      if (!p.bild) continue;
      const formen = moeglicheFormen(p.bild);
      // Die eingebaute Form muss dabei sein, sonst wäre die Story selbst ein
      // Fall, den der Umschalter verbietet.
      expect(formen, `${p.id}: eigene Form nicht in der Liste`).toContain(p.bild.art);
      const zwei = p.bild.serien.length === 2;
      const ganzes = p.bild.ganzes != null;
      expect(formen.includes("donut"), `${p.id}: Ringpaar`).toBe(zwei && ganzes);
      expect(formen.includes("saeule"), `${p.id}: Säule`).toBe(zwei && !ganzes);
      expect(formen.includes("umriss"), `${p.id}: Umrisse`).toBe(
        ganzes && p.bild.serien.every((s) => !!s.umriss),
      );
    }
  });

  it("eine gespeicherte Form gilt nur, solange sie trägt", () => {
    // Ändern sich die Daten — eine dritte Serie, ein weggefallenes Ganzes —,
    // fällt die Story auf ihre eingebaute Form zurück, statt eine Aussage zu
    // zeigen, die das Bild nicht mehr hergibt.
    const [passend] = baueAllePosts(basis, { "stadt-land-balkon": { form: "kennzahl" } });
    expect(passend.bild?.art).toBe("kennzahl");

    const [unpassend] = baueAllePosts(basis, { "stadt-land-balkon": { form: "umriss" } });
    expect(unpassend.bild?.art).toBe("saeule");
  });

  it("ein Abstandswert steht in derselben Form wie im Beitragstext", () => {
    // „2,3-mal so viele" im Text und „+130 %" im Bild sind dieselbe Zahl in zwei
    // Ausdrucksformen. Der Leser müsste umrechnen, um zu sehen, dass sie sich
    // nicht widersprechen — dieselbe Fehlerklasse wie eine abweichende Rundung.
    const stadtLand = posts.find((p) => p.id === "stadt-land-balkon")!;
    const delta = stadtLand.bild!.serien.find((s) => s.delta)!.delta!;
    const zahl = delta.replace(/[^0-9,]/g, "");
    expect(stadtLand.text, `Text nennt „${zahl}" nicht`).toContain(zahl);
  });

  it("Anteile werden am Ganzen normiert, nicht am größeren Wert", () => {
    // Ein voller Ring für 70 Prozent behauptet 100. Wo es ein Ganzes gibt, muss
    // es am Bild stehen — und kein Wert darf darüber liegen, sonst wird der Ring
    // stillschweigend gekappt und zeigt eine andere Zahl als die Kachel.
    const freiflaeche = posts.find((p) => p.id === "freiflaeche-ost-west")!;
    expect(freiflaeche.bild?.ganzes).toBe(100);
    for (const p of posts) {
      const ganzes = p.bild?.ganzes;
      if (ganzes == null) continue;
      for (const s of p.bild!.serien) {
        expect(Math.abs(s.wert), `${p.id}: ${s.label} liegt über dem Ganzen`).toBeLessThanOrEqual(ganzes);
      }
    }
  });

  it("wo die Einheit nicht an der Zahl steht, nennt der Untertitel sie", () => {
    // Der eigentliche Punkt: „ohne Einheit an der Zahl" darf nie „ohne Einheit
    // im Bild" bedeuten. Eine Einheit, die still verschwindet, ist der teuerste
    // Fehler, den dieses Projekt machen kann.
    for (const p of posts) {
      if (p.bild?.einheitAmWert === false) {
        // Nur DANN ist der Untertitel Pflicht: Er ist die einzige Stelle, an der
        // die Einheit dann noch steht. Wo sie an der Zahl bleibt, darf er fehlen.
        expect(p.bild.gemessen.trim().length, `${p.id} ohne Untertitel`).toBeGreaterThan(10);
        const einheiten = new Set(p.bild.serien.map((s) => s.einheit));
        expect(einheiten.size, `${p.id}: verschiedene Einheiten, ein gemeinsamer Untertitel`).toBe(1);
      }
    }
  });

  it("kürzt Einwohnerzahlen fürs Bild, nicht für den Text", () => {
    expect(kurzEinwohner(100_000)).toBe("100k");
    expect(kurzEinwohner(20_000)).toBe("20k");
    expect(kurzEinwohner(2_500)).toBe("2,5k");
    expect(kurzEinwohner(500)).toBe("500");
    expect(kurzEinwohner(1_200_000)).toBe("1,2 Mio.");
    // Im Beitragstext bleibt die ausgeschriebene Zahl: „100k" liest sich in
    // einem Satz wie ein Tippfehler.
    const stadtLand = posts.find((p) => p.id === "stadt-land-balkon")!;
    expect(stadtLand.text).toContain("100.000");
    expect(stadtLand.bild!.serien[0].zusatz).toContain("100k");
  });
});

describe("Was die Zahl misst", () => {
  it("beschriftet Speicher-Zahlen nicht als Anteil", () => {
    // Der teuerste Fund dieser Arbeit: `batterie_privat_count` zählt angemeldete
    // SPEICHER, nicht Dachanlagen mit Speicher. Ein Haushalt kann mehrere
    // anmelden, ein Balkonspeicher hat gar keine Dachanlage — als Anteil
    // beschriftet kam Bremen auf 98 Prozent und der Bund auf 67. Beides las sich
    // plausibel und war falsch.
    //
    // Geprüft wird die MECHANIK, nicht der Wortlaut: kein Prozentzeichen an der
    // Zahl, kein Ganzes am Bild. Eine erste Fassung suchte nach den Wörtern
    // „Anteil" und „Quote" — und schlug bei dem Satz an, der genau das
    // ausdrücklich verneint.
    for (const p of posts) {
      const worum = `${p.bild?.aussage ?? ""} ${p.bild?.gemessen ?? ""}`;
      if (!/Speicher/i.test(worum)) continue;
      expect(p.bild?.ganzes, `${p.id}: Speicherzahl mit einem Ganzen`).toBeUndefined();
      for (const s of p.bild?.serien ?? []) {
        expect(s.einheit, `${p.id}: Speicherzahl in Prozent`).not.toBe("%");
      }
    }
  });
});

describe("Das Formen-Register", () => {
  it("jede Form nennt, wofür sie taugt und woran sie scheitert", () => {
    // Das Register ist die Vorlage: Wer eine Form ergänzt, schreibt Bedingung
    // und Begründung an dieselbe Stelle. Vorher lagen Namen, Regeln und Gründe
    // an drei Orten — und die Regel, die niemand findet, wird nicht befolgt.
    for (const f of BILDFORMEN) {
      expect(f.name.length, f.art).toBeGreaterThan(3);
      expect(f.wofuer.length, f.art).toBeGreaterThan(60);
      expect(BILDFORM_NAME[f.art]).toBe(f.name);
    }
    // Keine Form ohne Eintrag: Sonst fiele sie aus dem Umschalter, und die Story
    // bliebe auf ihrer eingebauten Form stehen, ohne dass etwas fehlschlägt.
    const arten = new Set(posts.map((p) => p.bild?.art).filter(Boolean));
    for (const a of arten) expect(BILDFORMEN.some((f) => f.art === a), String(a)).toBe(true);
  });
});

describe("Templates", () => {
  it("jedes Template ist eine mögliche Kombination", () => {
    // Ein Template, dessen Bildform es nicht gibt oder dessen Farbschema nicht
    // existiert, wäre nie erreichbar — und alle Beiträge, die es benutzen
    // sollten, stünden stillschweigend als ungestaltet da.
    for (const t of TEMPLATES) {
      expect(BILDFORMEN.some((f) => f.art === t.art), t.name).toBe(true);
      expect(KARTEN_STILE, t.name).toContain(t.stil);
      expect(t.name.length, t.art).toBeGreaterThan(5);
    }
  });

  it("gestaltet heißt: verwendet ein abgenommenes Template", () => {
    // Kein Häkchen am Post. Ein handgesetzter Zustand müsste gepflegt werden,
    // stünde irgendwann auf „fertig" an einer Story, die niemand angesehen hat,
    // und sagte nichts darüber, WELCHES Design gemeint ist.
    for (const p of posts) {
      if (!p.bild) continue;
      const t = templateVon(p.bild);
      if (!t) continue;
      expect(t.art).toBe(p.bild.art);
      expect(t.stil).toBe(p.bild.stil);
    }
  });
});

describe("Bundesland-Umrisse", () => {
  it("jeder gesetzte Umriss existiert wirklich", () => {
    // Der Name kommt aus der Datenbank, der Umriss aus dem Melderegister-Geodatensatz.
    // Weicht die Schreibweise um ein Zeichen ab, fehlt der Umriss stumm — die
    // Karte sieht dann normal aus, nur leer.
    for (const p of posts) {
      for (const s of p.bild?.serien ?? []) {
        if (!s.umriss) continue;
        expect(BUNDESLAND_UMRISS[s.umriss], `${p.id}: kein Umriss für „${s.umriss}"`).toBeTruthy();
      }
    }
  });

  it("kein Land verschwindet in seiner eigenen Bounding-Box", () => {
    // Hamburg gehört die Insel Neuwerk, hundert Kilometer draußen in der
    // Nordsee. Solange sie mitgerechnet wurde, spannte sie das Quadrat auf und
    // das Stadtgebiet — das, was man erkennen soll — füllte davon 31 Prozent.
    // Von außen sah das nach einem Staubkorn aus, nicht nach einem Fehler.
    //
    // Die Schwelle liegt zwischen diesen 31 Prozent und dem engsten ECHTEN Fall:
    // Bremen besteht wirklich aus zwei getrennten Teilen, und der größere füllt
    // 50 Prozent. Beide Zahlen gemessen, nicht geschätzt — wer die Schwelle
    // verschiebt, misst nach.
    for (const [name, pfad] of Object.entries(BUNDESLAND_UMRISS)) {
      const teile = pfad.split("M").filter(Boolean);
      const groesste = Math.max(
        ...teile.map((t) => {
          const punkte = t
            .replace("Z", "")
            .split("L")
            .map((paar) => paar.trim().split(" ").map(Number));
          const xs = punkte.map((p) => p[0]);
          const ys = punkte.map((p) => p[1]);
          return Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
        }),
      );
      expect(groesste, `${name}: größte Teilfläche füllt das Quadrat kaum`).toBeGreaterThan(40);
    }
  });

  it("jedes Land ist gleich fein aufgelöst, auch die kleinen", () => {
    // Die Vereinfachung lief zuerst mit einer festen Toleranz in Grad. Für
    // Bayern war das ein Zweihundertstel der Form, für Berlin ein Zwanzigstel —
    // die Stadtstaaten kamen als Klötze heraus, während die Flächenländer sauber
    // aussahen. Dieselbe Zahl, zwei völlig verschiedene Auflösungen.
    for (const [name, pfad] of Object.entries(BUNDESLAND_UMRISS)) {
      const punkte = (pfad.match(/[ML]/g) ?? []).length;
      expect(punkte, `${name}: nur ${punkte} Punkte — als Form nicht mehr erkennbar`).toBeGreaterThan(40);
    }
  });

  it("kennt alle sechzehn Länder und hält sie klein", () => {
    const namen = Object.keys(BUNDESLAND_UMRISS);
    expect(namen.length).toBe(16);
    for (const n of namen) {
      expect(BUNDESLAND_UMRISS[n].startsWith("M"), `${n} ohne Pfad`).toBe(true);
      // Grob genug fürs Hintergrundzeichen, fein genug zum Wiedererkennen. Wer
      // die Toleranz im Erzeuger ändert, sieht hier, wohin es kippt.
      expect(BUNDESLAND_UMRISS[n].length, `${n} zu ausführlich für ein Hintergrundzeichen`).toBeLessThan(6000);
    }
  });
});

describe("Farbschemata der Karte", () => {
  it("jeder Stil setzt Grund UND Textfarben — sonst erbt die Karte von der Seite", () => {
    for (const s of KARTEN_STILE) {
      const t = kartenTokens(s);
      for (const token of ["--color-bg", "--color-text-primary", "--color-text-secondary", "--color-accent"]) {
        expect(t[token], `${s} ohne ${token}`).toBeTruthy();
      }
    }
  });

  it("Highlight hat einen blauen Grund, nicht den weißen", () => {
    expect(kartenTokens("highlight")["--color-bg"]).not.toBe(kartenTokens("hell")["--color-bg"]);
  });

  it("erkennt nur die Stile, die es gibt", () => {
    expect(istKartenStil("highlight")).toBe(true);
    expect(istKartenStil("neonpink")).toBe(false);
    expect(istKartenStil(undefined)).toBe(false);
  });
});
