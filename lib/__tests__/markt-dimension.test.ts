// Die Markt-Dimension ist eine Zusage, kein Feld: Ein Wert gehört genau einem
// Land, und ein Lauf betreut genau die Werte seines Landes. Beides ist im
// Browser unsichtbar und in keinem Typ ausdrückbar — ein vergessenes `markt`
// ist syntaktisch einwandfrei und lässt einen Wert still unter Deutschland
// mitlaufen. Deshalb hängt die Zusage hier.
//
// Vor dem Einchecken viermal absichtlich kaputtgemacht (26.09.2026): doppelter
// Schlüssel, Lauf ohne Markt auf einem Schweizer Feld, Feldverweis ins Leere,
// Bericht-Tag ohne Marktkürzel — jedes Mal rot, auf dem Rückweg wieder grün.
import { describe, expect, it } from "vitest";
import { MAERKTE, MARKT_VORGABE, marktTag, marktVon, pruefSchluessel, type Markt } from "../markt";
import { PRUEFSTAND, type PruefEintrag } from "../pruefstand";
import { WAECHTER, pruefEintraege, type WaechterJob } from "../waechter-register";

describe("Markt-Dimension", () => {
  it("kennt Deutschland als Vorgabe und führt es an erster Stelle", () => {
    expect(MARKT_VORGABE).toBe("de");
    expect(MAERKTE[0]).toBe("de");
    expect(new Set(MAERKTE).size).toBe(MAERKTE.length);
  });

  // Der Kern. Ein Feldname darf sich wiederholen, ein Schlüssel nie — sonst
  // entscheidet die Reihenfolge in der Liste, welcher Wert geprüft wird, und
  // der andere fällt lautlos heraus.
  it("vergibt jeden geprüften Wert genau einmal je Markt", () => {
    const gesehen = new Map<string, string>();
    const doppelt: string[] = [];
    for (const e of PRUEFSTAND) {
      const key = pruefSchluessel(marktVon(e), e.feld);
      if (gesehen.has(key)) doppelt.push(`${key} (${gesehen.get(key)} / ${e.was})`);
      gesehen.set(key, e.was);
    }
    expect(doppelt).toEqual([]);
  });

  it("vergibt jede Wächter-Kennung genau einmal je Markt", () => {
    const keys = WAECHTER.map((j) => pruefSchluessel(marktVon(j), j.id));
    expect(keys.length - new Set(keys).size).toBe(0);
  });

  // Ein Lauf, der ein Feld eines FREMDEN Marktes nennt, ist die Verwechslung,
  // gegen die es die Dimension gibt: Er läse ein Prüfdatum, das ein anderer
  // Lauf gestempelt hat, und gälte damit als lebendig, ohne gelaufen zu sein.
  it("lässt keinen Lauf ein Feld eines fremden Marktes betreuen", () => {
    const fehlend: string[] = [];
    for (const job of WAECHTER) {
      const markt = marktVon(job);
      for (const feld of job.pruefFelder) {
        const treffer = PRUEFSTAND.find((e) => e.feld === feld && marktVon(e) === markt);
        if (!treffer) fehlend.push(`${job.id} [${markt}] → ${feld}`);
      }
    }
    expect(fehlend).toEqual([]);
  });

  // Gegenprobe zur vorigen Regel: Sie darf nicht dadurch erfüllt sein, dass die
  // Auflösung gar nichts mehr findet. Ohne diese Zeile wäre ein
  // `pruefEintraege()`, das immer leer zurückgibt, „grün".
  it("löst die betreuten Felder wirklich auf", () => {
    const mitFeldern = WAECHTER.filter((j) => j.pruefFelder.length > 0);
    expect(mitFeldern.length).toBeGreaterThan(0);
    for (const job of mitFeldern) {
      expect(pruefEintraege(job).length).toBe(job.pruefFelder.length);
    }
  });

  // Die Ablage unterscheidet Läufe nur am Tag. Ohne Marktkürzel schriebe der
  // Schweizer Förder-Lauf in dieselbe Zeile wie der deutsche, und „läuft noch"
  // wäre für beide zusammen beantwortet — also für keinen.
  it("hängt das Marktkürzel an den Bericht-Tag jedes Nicht-Heimatmarktes", () => {
    expect(marktTag("foerder-news-waechter", "de")).toBe("foerder-news-waechter");
    expect(marktTag("foerder-news-waechter", "ch")).toBe("foerder-news-waechter-ch");

    const falsch = WAECHTER.filter((j) => {
      const markt = marktVon(j);
      return markt !== MARKT_VORGABE && j.tag !== null && !j.tag.endsWith(`-${markt}`);
    }).map((j) => j.id);
    expect(falsch).toEqual([]);
  });

  // Solange nur Deutschland läuft, ist der Bestand unverändert — die Dimension
  // darf nichts kosten, bevor sie gebraucht wird. Diese Zeile fällt, sobald der
  // zweite Markt kommt, und genau dann soll jemand hinsehen.
  it("lässt den deutschen Bestand unangetastet", () => {
    const fremd = [...PRUEFSTAND, ...WAECHTER].filter((e) => marktVon(e) !== "de");
    expect(fremd).toEqual([]);
  });
});

describe("Markt-Dimension: Gegenproben an erfundenen Einträgen", () => {
  // Die Regeln oben prüfen den echten Bestand und wären auch dann grün, wenn
  // die Mechanik gar nicht griffe. Hier wird sie an Attrappen belegt.
  const ch: Markt = "ch";

  const deWert: PruefEintrag = {
    was: "Strompreis",
    feld: "DEFAULT_PRICES.validFrom",
    geprueftIso: "2026-09-01",
    waechter: "preis-waechter",
    rhythmus: "monatlich",
    maxAlterTage: 45,
    runbook: "scripts/preise-verify.md",
  };
  const chWert: PruefEintrag = { ...deWert, markt: ch, geprueftIso: "2026-01-01" };

  const chLauf: WaechterJob = {
    markt: ch,
    id: "preis-waechter-ch",
    titel: "Preise Schweiz",
    zweck: "Prüft die Schweizer Marktpreise.",
    art: "auftrag",
    rhythmus: "monatlich",
    tag: "preis-waechter-ch",
    beleg: "pruefdatum",
    pruefFelder: ["DEFAULT_PRICES.validFrom"],
  };

  it("greift bei gleichem Feldnamen den Eintrag des eigenen Marktes", () => {
    const treffer = pruefEintraege(chLauf, [deWert, chWert]);
    expect(treffer).toHaveLength(1);
    expect(treffer[0].geprueftIso).toBe("2026-01-01");
  });

  it("findet nichts, wenn der Markt des Laufs fehlt", () => {
    const ohneMarkt: WaechterJob = { ...chLauf, markt: undefined };
    // Fällt auf Deutschland zurück und trifft damit den deutschen Wert — genau
    // die stille Verwechslung, die die Regel oben am echten Bestand verbietet.
    const treffer = pruefEintraege(ohneMarkt, [chWert]);
    expect(treffer).toEqual([]);
  });

  it("unterscheidet die Schlüssel beider Märkte", () => {
    expect(pruefSchluessel("de", deWert.feld)).not.toBe(pruefSchluessel(ch, chWert.feld));
  });
});
