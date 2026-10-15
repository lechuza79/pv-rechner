/**
 * DER ZWEITE MARKT DARF DEN ERSTEN NICHT ANFASSEN.
 *
 * Jede Prüfung hier hängt an einem Fehler, der beim Bauen am 07.10.2026
 * eingetreten ist oder unmittelbar drohte — keine ist vorsorglich.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  CH_LUECKEN,
  CH_MARKT_WURZEL,
  CH_SEGMENTE,
  CH_TRAEGER,
  chBezirkSchluessel,
  chElternSchluessel,
  chGemeindeSchluessel,
  chKantonSchluessel,
  istChSchluessel,
} from "../ch-register";
import { FlaechenIndex, imPolygon, type Flaeche } from "../gpkg-punkt";
import { MASTR_ROLLUP_SQL } from "../mastr-rollup-sql";

describe("Schweizer Regionsschlüssel", () => {
  it("kollidiert mit keinem deutschen Schlüssel", () => {
    // Der Anlass: Schweizer Gemeindenummern laufen von 1 bis 6831, deutsche
    // Bundesländer von „01" bis „16". Ein nackter Kanton 10 und das Saarland
    // wären derselbe Schlüssel — kein Typfehler, kein roter Test, nur der
    // Bestand des einen Landes unter dem Namen des anderen.
    const deutsch = /^\d*$/;
    for (const k of [
      CH_MARKT_WURZEL,
      chKantonSchluessel(1),
      chKantonSchluessel(10),
      chKantonSchluessel(26),
      chBezirkSchluessel(101),
      chGemeindeSchluessel(1),
      chGemeindeSchluessel(261),
      chGemeindeSchluessel(6831),
    ]) {
      expect(deutsch.test(k), `${k} sieht wie ein deutscher Schlüssel aus`).toBe(false);
      expect(istChSchluessel(k)).toBe(true);
    }
    for (const d of ["", "09", "09679", "09679147", "10041100"]) {
      expect(istChSchluessel(d), `${d} wurde als schweizerisch erkannt`).toBe(false);
    }
  });

  it("besteht die Eingangsprüfung der Atlas-Funktionen", () => {
    // Die Funktionen nehmen nur Ziffern und Kleinbuchstaben, höchstens 16
    // Zeichen. Ein Bindestrich im Schlüssel wäre dort abgewiesen worden — und
    // die Gemeindeseite hätte eine Ausnahme geworfen statt Zahlen gezeigt.
    const erlaubt = /^[0-9a-z]{0,16}$/;
    for (const k of [CH_MARKT_WURZEL, chKantonSchluessel(7), chBezirkSchluessel(2604), chGemeindeSchluessel(6831)]) {
      expect(erlaubt.test(k), `${k} verstößt gegen die Eingangsprüfung`).toBe(true);
    }
  });

  it("füllt die Nummer auf, damit Schlüssel sortierbar bleiben", () => {
    expect(chGemeindeSchluessel(1)).toBe("chg0001");
    expect(chGemeindeSchluessel(261)).toBe("chg0261");
    expect(chKantonSchluessel(1)).toBe("chk01");
    expect([chGemeindeSchluessel(9), chGemeindeSchluessel(100)].sort()).toEqual(["chg0009", "chg0100"]);
  });

  it("trägt die Hierarchie NICHT in den Stellen — das ist der Punkt", () => {
    // Für Deutschland beginnt ein Gemeindeschlüssel mit dem seines Kreises; in
    // der Schweiz ist das nicht so, und es wird hier auch nicht nachgebaut. Wer
    // es nachbaut, bringt die Stellenlogik zurück, die am 06.10.2026 gerade
    // ausgebaut wurde.
    expect(chGemeindeSchluessel(261).startsWith(chKantonSchluessel(1))).toBe(false);
    expect(chGemeindeSchluessel(261).startsWith(chBezirkSchluessel(112))).toBe(false);
  });
});

describe("Elternteil im Verzeichnis", () => {
  it("wird mit Kennung UND Zielebene nachgeschlagen", () => {
    // Die historische Kennung des Verzeichnisses ist nur innerhalb einer Ebene
    // eindeutig: 11 Kennungen sind doppelt vergeben, je einmal an eine Gemeinde
    // und einmal an einen Bezirk. Wer nur die Kennung nimmt, bekommt Thalwil im
    // Kanton Zürich als Kind von Vionnaz im Wallis — und das sieht wie eine
    // Hierarchie aus.
    expect(chElternSchluessel("10078", "2")).not.toBe(chElternSchluessel("10078", "1"));
  });
});

describe("Was der Schweiz fehlt, wird benannt", () => {
  it("nennt Speicher und Balkonkraftwerke mit Befund", () => {
    const woerter = CH_LUECKEN.map((l) => l.was);
    expect(woerter).toContain("Speicher");
    expect(woerter).toContain("Balkonkraftwerke");
    for (const l of CH_LUECKEN) {
      // Eine Lücke ohne Begründung wird beim nächsten Lesen zur Behauptung.
      expect(l.befund.length, `${l.was} ohne Befund`).toBeGreaterThan(60);
    }
  });

  it("presst die Schweizer Segmente nicht in die deutschen", () => {
    // „freistehend" ist NICHT „Freifläche" — darunter fällt auch ein
    // freistehendes Vordach. Wer die Werte abbildet, behauptet eine Aussage
    // über die Nutzung, die das Register nicht trägt.
    const deutsche = ["privat_dach", "gewerbe_dach", "freiflaeche", "steckersolar"];
    for (const s of Object.values(CH_SEGMENTE)) {
      expect(deutsche, `${s} ist ein deutsches Segment`).not.toContain(s);
    }
    expect(Object.values(CH_SEGMENTE)).toContain("freistehend");
  });

  it("übernimmt nur Energieträger, die unsere Tabelle kennt", () => {
    // Kernenergie, Erdgas und Kohle stehen im Schweizer Register und nicht in
    // unserer Prüfbedingung — ein Import würde dort abbrechen.
    const erlaubt = ["solar", "wind", "biomasse", "wasser", "speicher"];
    for (const t of Object.values(CH_TRAEGER)) expect(erlaubt).toContain(t);
  });
});

describe("Punkt in Fläche", () => {
  const quadrat: Flaeche = {
    id: "A",
    name: "Quadrat mit Loch",
    minX: 0,
    minY: 0,
    maxX: 10,
    maxY: 10,
    ringe: [
      [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
        [0, 0],
      ],
      [
        [4, 4],
        [6, 4],
        [6, 6],
        [4, 6],
        [4, 4],
      ],
    ],
  };

  it("erkennt innen, außen und das Loch", () => {
    expect(imPolygon(1, 1, quadrat)).toBe(true);
    expect(imPolygon(11, 1, quadrat)).toBe(false);
    // Ohne die Loch-Prüfung läge eine Enklave in ihrer Umgebungsgemeinde — in
    // der Schweiz gibt es genau solche Fälle.
    expect(imPolygon(5, 5, quadrat)).toBe(false);
  });

  it("findet dieselbe Fläche über den Rasterindex", () => {
    const ix = new FlaechenIndex([quadrat]);
    expect(ix.finde(1, 1)).toBe("A");
    expect(ix.finde(5, 5)).toBeNull();
    expect(ix.finde(99_999, 99_999)).toBeNull();
  });
});

describe("Neuaufbau der Regionssummen", () => {
  const SQL = MASTR_ROLLUP_SQL;

  it("leitet die Zugehörigkeit aus der Elternkette ab, nicht aus den Stellen", () => {
    expect(SQL).toMatch(/WITH RECURSIVE/);
    expect(SQL).toMatch(/parent_region_id/);
    const stellen = SQL.replace(/^\s*--.*$/gm, "").match(/left\(\s*region_id\s*,\s*\d+\s*\)/gi) ?? [];
    expect(stellen, `Stellenlogik zurück: ${stellen.join(", ")}`).toEqual([]);
  });

  it("nimmt die Gemeinde NICHT in die Summen", () => {
    // Der Rollup trägt bewusst nur Bund, Land und Kreis — für einen
    // Gemeindeschlüssel trifft die Reihen-Abfrage ohnehin genau eine Zeile.
    // Ohne diese Bedingung wuchs er gemessen von 65.137 auf 80.560 Zeilen, für
    // keinen einzigen Leser.
    expect(SQL).toMatch(/m\.region_key\s*<>\s*m\.gemeinde_id/);
  });

  it("verlässt sich NICHT auf ein Aufheben des Zeitlimits von innen", () => {
    // `SET LOCAL statement_timeout = 0` als erste Zeile einer Funktion ist
    // wirkungslos: Postgres legt das Limit beim Start des Statements fest.
    // Die Zeile stand hier zwei Monate und sah wie eine Absicherung aus —
    // gemessen am 07.10.2026 wurde der Aufbau trotzdem nach acht Sekunden
    // abgeschnitten. Stattdessen drei Funktionen, jede für sich aufrufbar.
    const ohneKommentare = SQL.replace(/^\s*--.*$/gm, "");
    expect(ohneKommentare).not.toMatch(/SET\s+LOCAL\s+statement_timeout/i);
    expect(SQL).toMatch(/CREATE OR REPLACE FUNCTION mastr_refresh_region_mitglied\(\)/);
    expect(SQL).toMatch(/CREATE OR REPLACE FUNCTION mastr_refresh_region_rollup_teil\(p_traeger text\)/);
    expect(SQL).toMatch(/CREATE OR REPLACE FUNCTION mastr_refresh_region_rollup\(\)/);
  });

  it("scheitert laut, wenn die Zugehörigkeit leer bleibt", () => {
    // Ein leerer Rollup sieht auf jeder Kreis- und Landesseite wie „hier steht
    // nichts" aus — ohne Fehler, ohne roten Test, ohne kaputtes Aussehen.
    expect(SQL).toMatch(/RAISE EXCEPTION 'mastr_region_mitglied ist leer/);
  });

  it("löscht beim Teilaufbau nur seinen eigenen Energieträger", () => {
    // Ein TRUNCATE nähme die Träger mit, die schon fertig sind: Ein
    // abgebrochener Lauf hinterließe dann weniger als vorher statt gleich viel.
    expect(SQL).toMatch(/DELETE FROM mastr_region_rollup WHERE energietraeger = p_traeger/);
    const truncRollup = SQL.replace(/^\s*--.*$/gm, "").match(/TRUNCATE\s+mastr_region_rollup\b/g) ?? [];
    expect(truncRollup, "TRUNCATE auf den Summen zurück").toEqual([]);
  });

  it("steht nur in diesem Modul, nicht zusätzlich in der Setup-Route", () => {
    // Zwei handgetippte Fassungen derselben Funktion sind der Fehler, aus dem
    // `lib/mastr-region-sql.ts` entstanden ist: Ein späterer Setup-Lauf schrieb
    // die ältere kommentarlos zurück.
    const route = readFileSync(resolve(__dirname, "../../app/api/mastr/setup/route.ts"), "utf8");
    expect(route).toMatch(/MASTR_ROLLUP_SQL/);
    expect(route).not.toMatch(/CREATE OR REPLACE FUNCTION mastr_refresh_region_rollup/);
  });
});

describe("Niemand ruft den Neuaufbau in einem Zug", () => {
  /**
   * Der Monatslauf hätte mit der neuen Funktion am Zeitlimit abgebrochen — und
   * zwar erst in Produktion, einmal im Monat, mit der Meldung „canceling
   * statement due to statement timeout" auf einem Lauf, der zwei Stunden
   * gedauert hat. Fünf Stellen im Projekt rufen den Aufbau; vier mussten
   * umgestellt werden.
   */
  const DATEIEN = [
    "scripts/mastr-bnetza-refresh.ts",
    "scripts/mastr-ags-umschluesseln.ts",
    "scripts/ch-import.ts",
    "scripts/rollup-einspielen.ts",
    "app/api/mastr/setup/route.ts",
  ];

  it("ruft überall die Schritte, nie die Sammelfunktion", () => {
    for (const d of DATEIEN) {
      const text = readFileSync(resolve(__dirname, "../..", d), "utf8");
      const direkt = text.match(/rpc\(\s*["']mastr_refresh_region_rollup["']/g) ?? [];
      expect(direkt, `${d} ruft den Aufbau in einem Zug`).toEqual([]);
      expect(text, `${d} ruft die Schritte nicht`).toMatch(/rollupSchrittweise/);
    }
  });

  it("behauptet nirgends mehr, die Funktion hebe ihr Zeitlimit selbst auf", () => {
    // Genau dieser Satz stand zwei Monate im Monatslauf und war falsch.
    for (const d of DATEIEN) {
      const text = readFileSync(resolve(__dirname, "../..", d), "utf8");
      expect(text, `${d} behauptet es noch`).not.toMatch(/hebt ihr Statement-Timeout selbst auf/);
    }
  });
});
