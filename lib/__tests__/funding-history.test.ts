import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  vergleiche,
  zuEintraegen,
  verlaufFuerSeite,
  LISTEN_TRENNER,
  NICHT_PROTOKOLLIERTE_FELDER,
  type HistorieEintrag,
} from "../funding-history";
import type { FundingProgram } from "../funding-programs";

// ─── Verlauf der Förderprogramme ─────────────────────────────────────────────
//
// Der Verlauf lebt davon, dass ein Eintrag nur behauptet, was belegt ist. Die
// Fehlerklasse, gegen die hier geprüft wird, ist dieselbe, die 2026 schon 25
// Programmen ein erfundenes Prüfdatum gab: ein Datum, das mitläuft, statt eine
// Beobachtung zu bezeugen. Deshalb prüft dieser Test nicht nur, DASS Änderungen
// gefunden werden, sondern auch, dass der Vergleich keine eigene Uhr hat.

const programm = (over: Partial<FundingProgram> = {}): FundingProgram =>
  ({
    id: "test-stadt", name: "Testförderung", traeger: "Stadt Test", level: "kommune", region: "Test",
    url: "https://example.org/foerderung", stand: "August 2026", status: "aktiv", capped: true,
    verified: true, eligibility: ["privat"], coveredCosts: "Zuschuss je kWp",
    rates: [{ label: "PV", value: "150 €/kWp" }], conditions: ["Antrag vor Beauftragung"],
    combinableWith: [], pvPerKwp: 150, ...over,
  }) as FundingProgram;

describe("Was als Zustandswechsel zählt", () => {
  it("meldet nichts, wenn sich nichts geändert hat", () => {
    expect(vergleiche(programm(), programm())).toEqual([]);
  });

  it("führt den Statuswechsel mit den Worten, die auch auf der Seite stehen", () => {
    const a = vergleiche(programm(), programm({ status: "ausgeschoepft" }));
    expect(a).toHaveLength(1);
    expect(a[0]).toMatchObject({ feld: "status", alt: "aktiv", neu: "ausgeschöpft", bedeutung: "inhalt" });
  });

  it("hält den Wortlaut der Konditionen und Bedingungen unverändert fest", () => {
    const raten = vergleiche(programm(), programm({ rates: [{ label: "PV", value: "100 €/kWp" }] }));
    expect(raten[0]).toMatchObject({ feld: "rates", alt: "PV: 150 €/kWp", neu: "PV: 100 €/kWp" });

    const bed = vergleiche(programm(), programm({ conditions: ["Antrag vor Beauftragung", "nur Wohngebäude"] }));
    expect(bed[0]).toMatchObject({
      feld: "conditions",
      alt: "Antrag vor Beauftragung",
      neu: "Antrag vor Beauftragung · nur Wohngebäude",
    });
  });

  it("erzeugt beim ersten Sehen genau EINEN Eintrag, nicht acht gegen das Nichts", () => {
    const a = vergleiche(null, programm());
    expect(a).toHaveLength(1);
    expect(a[0]).toMatchObject({ feld: "aufnahme", alt: null, neu: "aktiv" });
  });

  it("hält die Rechenwerte fest, zeigt sie aber nicht — sie tragen keine Einheit", () => {
    const a = vergleiche(programm(), programm({ pvPerKwp: 100 }));
    expect(a).toHaveLength(1);
    expect(a[0].feld).toBe("rechenwerte");
    // BLOCKER: Diese Zahlen dürfen nie in eine Zeile für Leser wandern. Wer sie
    // anzeigt, muss sich eine Einheit ausdenken ("€/kWp") — und hätte damit eine
    // zweite Quelle neben dem redaktionellen Satz in `rates`.
    expect(a[0].bedeutung).toBe("intern");
    expect(verlaufFuerSeite(zuEintraegen(a, "2026-08-18T10:00:00Z", { quelle: null, belegtAm: null })).wechsel)
      .toHaveLength(0);
  });

  it("protokolliert Stammdaten und Prüf-Buchhaltung NICHT", () => {
    // Ein korrigierter Link oder ein aufgefrischtes `stand` ist keine Änderung
    // der Förderung. Als Eintrag ausgewiesen würde er die echten Wechsel zudecken.
    const leise: Partial<FundingProgram>[] = [
      { stand: "September 2026" },
      { verified: false },
      { lastVerified: "2026-09-01" },
      { url: "https://example.org/foerderung-neu" },
      { name: "Testförderung 2027" },
      { traeger: "Stadt Test, Amt für Umwelt" },
    ];
    for (const over of leise) {
      expect(vergleiche(programm(), programm(over)), Object.keys(over)[0]).toEqual([]);
    }
  });

  it("legt Listen mit dem Trenner zusammen, mit dem die Anzeige sie wieder zerlegt", () => {
    // Die Seite zeigt bei einer sechszeiligen Bedingungsliste nur den
    // hinzugekommenen Punkt — dafür zerlegt sie den gespeicherten Text wieder an
    // genau diesem Zeichen. Zwei getippte Trenner, die auseinanderlaufen, hießen:
    // Der Verlauf weist plötzlich die ganze Liste als „neu" aus.
    const a = vergleiche(programm(), programm({ conditions: ["Antrag vor Beauftragung", "nur Wohngebäude"] }));
    expect(a[0].neu!.split(LISTEN_TRENNER)).toEqual(["Antrag vor Beauftragung", "nur Wohngebäude"]);
  });

  it("nennt jedes stumme Feld beim Namen, damit „fehlt“ von „gehört nicht hin“ zu unterscheiden ist", () => {
    for (const feld of ["stand", "verified", "lastVerified", "url", "name", "traeger"]) {
      expect(NICHT_PROTOKOLLIERTE_FELDER).toContain(feld);
    }
  });
});

describe("Ein Eintrag darf nur behaupten, was belegt ist", () => {
  it("bekommt seinen Zeitpunkt gereicht — der Vergleich hat keine eigene Uhr", () => {
    // Der Beweis liegt im Code, nicht im Verhalten: Eine Funktion, die selbst
    // `new Date()` aufruft, stempelt irgendwann ein Datum auf eine Beobachtung,
    // die niemand gemacht hat. Genau so entstand das erfundene Prüfdatum.
    const quelltext = readFileSync(resolve(__dirname, "../funding-history.ts"), "utf8");
    // Geprüft wird der Teil, der Einträge ERZEUGT — bis zur Leseseite. Dahinter
    // steht die Verfallszeit des Zwischenspeichers, und die darf eine Uhr lesen:
    // Sie sagt nichts über die Welt aus, sondern nur, wann wir zuletzt geladen
    // haben. Ein Test, der auch sie verbietet, verbietet das Falsche und wird
    // beim nächsten Umbau entschärft statt befolgt.
    const ohneKommentare = (t: string) =>
      t.split("\n").filter((z) => !z.trim().startsWith("//") && !z.trim().startsWith("*")).join("\n");
    const erzeugend = ohneKommentare(quelltext.split("// ── Leseseite")[0]);
    expect(erzeugend).not.toMatch(/new Date\(/);
    expect(erzeugend).not.toMatch(/Date\.now\(/);
    // `updated_at` ist der Zeitpunkt der letzten Schreibung — als Prüf- oder
    // Beobachtungsdatum ist er genau die Lüge, die 2026 schon einmal passiert
    // ist. Er hat in dieser Datei nirgends etwas zu suchen.
    expect(ohneKommentare(quelltext)).not.toMatch(/updated_at/);
  });

  it("trägt Quelle und Belegdatum an jeden Eintrag", () => {
    const e = zuEintraegen(vergleiche(programm(), programm({ status: "pausiert" })), "2026-08-18T09:00:00Z", {
      quelle: "https://example.org/foerderung",
      belegtAm: "2026-08-01",
    });
    expect(e[0]).toMatchObject({
      festgestelltAm: "2026-08-18T09:00:00Z",
      quelle: "https://example.org/foerderung",
      belegtAm: "2026-08-01",
    });
  });
});

describe("Was der Abschnitt auf der Seite zeigt", () => {
  const eintrag = (over: Partial<HistorieEintrag>): HistorieEintrag => ({
    programId: "test-stadt", feld: "status", bedeutung: "inhalt", alt: "aktiv", neu: "ausgeschöpft",
    festgestelltAm: "2026-09-01T00:00:00Z", quelle: null, belegtAm: null, ...over,
  });

  it("zeigt den neuesten Wechsel zuerst", () => {
    const { wechsel } = verlaufFuerSeite([
      eintrag({ festgestelltAm: "2026-07-01T00:00:00Z" }),
      eintrag({ festgestelltAm: "2026-09-01T00:00:00Z" }),
    ]);
    expect(wechsel.map((w) => w.festgestelltAm.slice(0, 10))).toEqual(["2026-09-01", "2026-07-01"]);
  });

  it("zählt die Aufnahme nicht als Wechsel, merkt sich aber den Aufzeichnungsbeginn", () => {
    const { wechsel, beobachtetSeit } = verlaufFuerSeite([
      eintrag({ feld: "aufnahme", alt: null, neu: "aktiv", festgestelltAm: "2026-06-01T00:00:00Z" }),
    ]);
    // Ein Abschnitt, der nur „seit Juni im Verzeichnis" meldet, ist kein
    // Verlauf — er bliebe auf 110 Stadtseiten dieselbe leere Zeile.
    expect(wechsel).toHaveLength(0);
    expect(beobachtetSeit).toBe("2026-06-01T00:00:00Z");
  });

  it("nimmt bei zweimaliger Aufnahme die frühere — beobachtet wird seit dem ersten Mal", () => {
    const { beobachtetSeit } = verlaufFuerSeite([
      eintrag({ feld: "aufnahme", festgestelltAm: "2027-01-01T00:00:00Z" }),
      eintrag({ feld: "aufnahme", festgestelltAm: "2026-06-01T00:00:00Z" }),
    ]);
    expect(beobachtetSeit).toBe("2026-06-01T00:00:00Z");
  });
});
