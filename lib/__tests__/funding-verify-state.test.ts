import { describe, it, expect } from "vitest";
import {
  arbeitsvorrat,
  eskalationsVorschlag,
  pruefstandFuer,
  zaehltAlsGeprueft,
  ESKALATION_AB_FEHLVERSUCHEN,
  PRUEF_INTERVALL_TAGE,
  type Erreichbarkeit,
  type PruefVersuch,
} from "../funding-verify-state";

const HEUTE = "2026-08-16";

function versuch(programId: string, checkedAt: string, erreichbarkeit: Erreichbarkeit): PruefVersuch {
  return { programId, checkedAt, erreichbarkeit };
}

const frankfurt = { id: "frankfurt", name: "Klimabonus", region: "Frankfurt am Main", level: "kommune" as const, status: "aktiv" as const };

describe("Was als geprüft zählt", () => {
  it("nur der Blick auf die Amtsquelle selbst", () => {
    expect(zaehltAlsGeprueft("traeger")).toBe(true);
    for (const e of ["archiv", "sekundaer", "pruefseite", "gesperrt"] as Erreichbarkeit[]) {
      expect(zaehltAlsGeprueft(e)).toBe(false);
    }
  });

  it("ein Archiv-Treffer setzt das Prüfdatum NICHT zurück — er belegt Inhalt, nicht Aktualität", () => {
    const stand = pruefstandFuer(
      { id: "frankfurt", lastVerified: "2026-01-10" },
      [versuch("frankfurt", "2026-08-15", "archiv")],
      HEUTE,
    );
    expect(stand.letzteQuellenpruefung).toBe("2026-01-10");
    expect(stand.archivBeleg).toBe(true);
    expect(stand.faellig).toBe(true);
  });

  it("Sekundärquellen ebenso wenig", () => {
    const stand = pruefstandFuer(
      { id: "frankfurt", lastVerified: "2026-01-10" },
      [versuch("frankfurt", "2026-08-15", "sekundaer")],
      HEUTE,
    );
    expect(stand.letzteQuellenpruefung).toBe("2026-01-10");
    expect(stand.fehlversuche).toBe(1);
  });
});

describe("Prüfstand aus den protokollierten Versuchen", () => {
  it("zählt Fehlversuche erst ab dem letzten Erfolg", () => {
    const stand = pruefstandFuer({ id: "frankfurt" }, [
      versuch("frankfurt", "2026-05-01", "pruefseite"),
      versuch("frankfurt", "2026-05-02", "gesperrt"),
      versuch("frankfurt", "2026-06-01", "traeger"),
      versuch("frankfurt", "2026-07-01", "pruefseite"),
    ], HEUTE);

    expect(stand.letzteQuellenpruefung).toBe("2026-06-01");
    expect(stand.fehlversuche).toBe(1);
  });

  it("nimmt Versuche anderer Programme nicht mit", () => {
    const stand = pruefstandFuer({ id: "frankfurt" }, [
      versuch("koeln", "2026-08-01", "pruefseite"),
      versuch("koeln", "2026-08-02", "pruefseite"),
    ], HEUTE);
    expect(stand.fehlversuche).toBe(0);
  });

  it("erbt das alte Prüfdatum aus der Datenbank, statt alles als nie geprüft zu werten", () => {
    // Die Versuchsreihe beginnt erst mit diesem Mechanismus. Ohne dieses Erbe
    // stünden am ersten Tag schlagartig alle 38 Programme als ungeprüft da.
    const stand = pruefstandFuer({ id: "frankfurt", lastVerified: "2026-08-01" }, [], HEUTE);
    expect(stand.tageSeitQuellenpruefung).toBe(15);
    expect(stand.faellig).toBe(false);
  });

  it("noch nie geprüft ist fällig, nicht unendlich geduldig", () => {
    const stand = pruefstandFuer({ id: "neu" }, [], HEUTE);
    expect(stand.letzteQuellenpruefung).toBeNull();
    expect(stand.faellig).toBe(true);
  });

  it("wird genau am Intervall fällig", () => {
    const gestern = new Date(Date.parse(HEUTE) - PRUEF_INTERVALL_TAGE * 86_400_000).toISOString().slice(0, 10);
    expect(pruefstandFuer({ id: "x", lastVerified: gestern }, [], HEUTE).faellig).toBe(true);
  });
});

describe("Arbeitsvorrat — wer am längsten nicht an der Quelle war, kommt zuerst", () => {
  const programme = [
    { id: "bund", level: "bund" as const, lastVerified: "2020-01-01" },
    { id: "frisch", level: "kommune" as const, lastVerified: HEUTE },
    { id: "alt", level: "kommune" as const, lastVerified: "2026-01-01" },
    { id: "haengt", level: "kommune" as const, lastVerified: "2026-05-01" },
  ];
  const versuche = [
    versuch("haengt", "2026-06-01", "pruefseite"),
    versuch("haengt", "2026-07-01", "pruefseite"),
  ];

  it("Fehlversuche schlagen Alter, frisch Geprüftes fällt raus", () => {
    const vorrat = arbeitsvorrat(programme, versuche, HEUTE);
    expect(vorrat.map((s) => s.programId)).toEqual(["haengt", "alt"]);
  });

  it("Bundesprogramme gehören dem BEG-Wächter, nicht diesem Vorrat", () => {
    expect(arbeitsvorrat(programme, versuche, HEUTE).some((s) => s.programId === "bund")).toBe(false);
  });

  it("ein Programm mit Fehlversuchen bleibt drin, auch wenn es noch nicht fällig wäre", () => {
    const vorrat = arbeitsvorrat(
      [{ id: "haengt", level: "kommune", lastVerified: HEUTE }],
      [versuch("haengt", HEUTE, "pruefseite")],
      HEUTE,
    );
    expect(vorrat).toHaveLength(1);
  });
});

// Der Seiten-Wächter (scripts/funding-watch.ts) läuft täglich in der Cloud und
// vergleicht nur Fingerabdrücke — er versteht nichts, aber er merkt zuverlässig,
// dass sich etwas bewegt hat. Das ist der einzige Weg, eine Kürzung mitten im
// Quartal zu bemerken, ohne dass ein Mensch oder ein Modell etwas ahnt.
describe("Bewegte Amtsseite", () => {
  it("macht sofort fällig, unabhängig vom Alter der letzten Prüfung", () => {
    const stand = pruefstandFuer(
      { id: "koeln", lastVerified: "2026-08-10" }, // erst 6 Tage alt
      [],
      HEUTE,
      [{ programId: "koeln", changedAt: "2026-08-15" }],
    );
    expect(stand.seiteGeaendert).toBe(true);
    expect(stand.faellig).toBe(true);
  });

  it("eine Änderung VOR unserer letzten Prüfung ist erledigt und zählt nicht mehr", () => {
    const stand = pruefstandFuer(
      { id: "koeln", lastVerified: "2026-08-14" },
      [],
      HEUTE,
      [{ programId: "koeln", changedAt: "2026-08-01" }],
    );
    expect(stand.seiteGeaendert).toBe(false);
    expect(stand.faellig).toBe(false);
  });

  it("eine Änderung am Tag der Prüfung gilt als gesehen — sonst löst jeder Lauf sich selbst wieder aus", () => {
    const stand = pruefstandFuer(
      { id: "koeln", lastVerified: HEUTE },
      [],
      HEUTE,
      [{ programId: "koeln", changedAt: HEUTE }],
    );
    expect(stand.seiteGeaendert).toBe(false);
  });

  it("steht im Arbeitsvorrat ganz oben — vor Hängern und vor Altersfällen", () => {
    const programme = [
      { id: "haengt", level: "kommune" as const, lastVerified: "2026-05-01" },
      { id: "alt", level: "kommune" as const, lastVerified: "2026-01-01" },
      { id: "bewegt", level: "kommune" as const, lastVerified: "2026-08-14" },
    ];
    const versuche = [
      versuch("haengt", "2026-06-01", "pruefseite"),
      versuch("haengt", "2026-07-01", "gesperrt"),
    ];
    const vorrat = arbeitsvorrat(programme, versuche, HEUTE, [
      { programId: "bewegt", changedAt: "2026-08-15" },
    ]);
    expect(vorrat[0].programId).toBe("bewegt");
  });
});

describe("Eskalation in die sichere Richtung", () => {
  const dreiFehl = [
    versuch("frankfurt", "2026-06-01", "pruefseite"),
    versuch("frankfurt", "2026-07-01", "pruefseite"),
    versuch("frankfurt", "2026-08-01", "gesperrt"),
  ];

  it("schlägt erst nach drei Fehlversuchen an — eine Prüfseite ist eine Laune, kein Zustand", () => {
    const zwei = pruefstandFuer({ id: "frankfurt" }, dreiFehl.slice(0, 2), HEUTE);
    expect(eskalationsVorschlag(frankfurt, zwei)).toBeNull();

    const drei = pruefstandFuer({ id: "frankfurt" }, dreiFehl, HEUTE);
    expect(drei.fehlversuche).toBe(ESKALATION_AB_FEHLVERSUCHEN);
    expect(eskalationsVorschlag(frankfurt, drei)?.statusNeu).toBe("unsicher");
  });

  it("schaltet nur ab, was aktiv ist — nie wieder ein", () => {
    const drei = pruefstandFuer({ id: "frankfurt" }, dreiFehl, HEUTE);
    for (const status of ["unsicher", "ausgeschoepft", "pausiert", "eingestellt"] as const) {
      expect(eskalationsVorschlag({ ...frankfurt, status }, drei)).toBeNull();
    }
  });

  it("die Entscheidungszeile nennt Programm, Ort und den letzten Beleg — ohne interne Bezeichner", () => {
    const drei = pruefstandFuer({ id: "frankfurt", lastVerified: "2026-05-01" }, dreiFehl, HEUTE);
    const text = eskalationsVorschlag(frankfurt, drei)!.entscheidung;
    expect(text).toContain("Klimabonus");
    expect(text).toContain("Frankfurt am Main");
    expect(text).toContain("2026-05-01");
    expect(text).not.toContain("traeger");
    expect(text).not.toContain("pruefseite");
  });

  it("weist einen Archiv-Beleg aus, verkauft ihn aber nicht als Aktualität", () => {
    const mitArchiv = pruefstandFuer({ id: "frankfurt" }, [...dreiFehl, versuch("frankfurt", "2026-08-10", "archiv")], HEUTE);
    const text = eskalationsVorschlag(frankfurt, mitArchiv)!.entscheidung;
    expect(text).toContain("Archiv");
    expect(text).toMatch(/nicht.*heute noch läuft/);
  });
});

// ─── Ein gescheiterter Maschinen-Abruf ist kein Fehlversuch ──────────────────
//
// Gemessen am ersten Cloud-Lauf (17.08.2026): Vom Rechner des Betreibers waren
// 2 Amtsseiten unerreichbar, aus GitHubs Rechenzentrum 5 — dieselben Seiten,
// andere IP-Reputation. Der Crawler fährt die Eskalationsleiter nicht (kein
// echter Browser, kein Archiv); seine Abbrüche dürfen deshalb nie in die
// Eskalation zählen, sonst schaltet er binnen drei Tagen Programme ab, die ein
// Browser problemlos liest.
describe("Crawler-Abbrüche eskalieren nicht", () => {
  it("machen fällig, zählen aber nicht als Fehlversuch", () => {
    const stand = pruefstandFuer(
      { id: "frankfurt", lastVerified: "2026-08-01" },
      [],
      HEUTE,
      [
        { programId: "frankfurt", changedAt: "2026-08-15" },
        { programId: "frankfurt", changedAt: "2026-08-16" },
        { programId: "frankfurt", changedAt: "2026-08-17" },
      ],
    );
    expect(stand.faellig).toBe(true);
    expect(stand.fehlversuche).toBe(0);
    expect(eskalationsVorschlag(frankfurt, stand)).toBeNull();
  });
});
