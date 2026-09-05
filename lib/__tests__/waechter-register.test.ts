import { describe, it, expect } from "vitest";
import { PRUEFSTAND, type PruefEintrag } from "../pruefstand";
import {
  WAECHTER,
  beurteile,
  pruefEintraege,
  sortiere,
  tageText,
  toleranzTage,
  type WaechterJob,
} from "../waechter-register";

// Was dieser Test hält — und was er ausdrücklich nicht kann:
//
// Die Wächter-AUFTRÄGE liegen unter ~/.claude/scheduled-tasks/*/SKILL.md, also
// außerhalb des Repos. Ob es einen Auftrag dieses Namens wirklich gibt und ob er
// wirklich täglich läuft, kann hier niemand nachsehen (dieselbe Einschränkung
// notiert `lib/pruefstand.ts` beim Feld `waechter`). Was der Test hält, ist die
// INNERE Stimmigkeit: dass kein Eintrag auf ein Prüfstand-Feld zeigt, das es
// nicht gibt · dass kein Wert im Prüfstand ohne zuständigen Lauf dasteht · dass
// eine Beleg-Art trägt, was sie verspricht · und dass ein blinder Fleck als
// solcher benannt ist, statt als Versehen durchzugehen.

const job = (id: string): WaechterJob => {
  const j = WAECHTER.find((w) => w.id === id);
  if (!j) throw new Error(`kein Eintrag ${id}`);
  return j;
};

describe("Wächter-Register: innere Stimmigkeit", () => {
  it("kennt jedes Feld, auf das ein Eintrag zeigt", () => {
    const bekannt = new Set(PRUEFSTAND.map((e) => e.feld));
    for (const w of WAECHTER) {
      for (const f of w.pruefFelder) {
        expect(bekannt.has(f), `„${w.id}“ zeigt auf ein Prüfstand-Feld, das es nicht gibt: ${f}`).toBe(true);
      }
    }
  });

  // Die Gegenrichtung ist die wichtigere: Ein Wert, den kein Lauf im Register
  // bewegt, hat keinen Zuständigen — und niemand würde das merken, weil der
  // Prüfstand ihn trotzdem brav mitzählt.
  it("lässt keinen Prüfstand-Wert ohne zuständigen Lauf", () => {
    const betreut = new Set(WAECHTER.flatMap((w) => w.pruefFelder));
    const verwaist = PRUEFSTAND.filter((e) => !betreut.has(e.feld)).map((e) => e.feld);
    expect(verwaist, `ohne Lauf im Register: ${verwaist.join(", ")}`).toEqual([]);
  });

  it("hat eindeutige Kennungen und Tags", () => {
    const ids = WAECHTER.map((w) => w.id);
    expect(new Set(ids).size).toBe(ids.length);
    const tags = WAECHTER.map((w) => w.tag).filter(Boolean);
    expect(new Set(tags).size, "zwei Läufe unter demselben Tag wären in der Ablage nicht zu trennen").toBe(
      tags.length,
    );
  });

  it("verlangt zu jeder Beleg-Art, was sie braucht", () => {
    for (const w of WAECHTER) {
      if (w.beleg === "meldung") {
        expect(w.tag, `„${w.id}“ nennt die Meldung als Beleg, legt aber unter keinem Tag ab`).toBeTruthy();
      }
      if (w.beleg === "datenbank") {
        expect(w.dbQuelle, `„${w.id}“ nennt die Datenbank als Beleg, sagt aber nicht welche`).toBeTruthy();
      }
      if (w.beleg === "keiner") {
        expect(
          w.blindWeil,
          `„${w.id}“ ist ein blinder Fleck ohne Begründung — dann ist er von einem Versehen nicht zu unterscheiden`,
        ).toBeTruthy();
      }
    }
  });

  // Die Regel, wegen der es toleranzTage() gibt: Wo der Prüfstand die Grenze
  // schon kennt, darf sie im Register nicht ein zweites Mal stehen. Zwei Zahlen
  // für dieselbe Frage driften, und dann zeigt eine Seite rot, während die
  // andere grün ist.
  it("schreibt keine eigene Grenze, wo der Prüfstand schon eine hat", () => {
    for (const w of WAECHTER.filter((x) => x.beleg === "pruefdatum")) {
      expect(
        w.stummAbTage,
        `„${w.id}“ trägt eine eigene Grenze neben der aus dem Prüfstand`,
      ).toBeUndefined();
    }
  });

  it("holt die Grenze für Prüfdatum-Läufe aus dem Prüfstand — die engste", () => {
    // foerder-news bewegt zwei Felder: den Grüngas-Rechtsstand (14 Tage) und
    // den EEG-Reform-Sachstand (30). Maßgeblich ist die engste.
    expect(toleranzTage(job("foerder-news-waechter"))).toBe(14);
    expect(toleranzTage(job("eeg-verguetung-verify-halbjaehrlich"))).toBe(210);
    // Und die selbst gesetzte, wo es keine im Prüfstand gibt.
    expect(toleranzTage(job("health-check.yml"))).toBe(1);
  });

  it("wirft, wenn ein Prüfdatum-Lauf gar kein datiertes Feld bewegt", () => {
    const kaputt: WaechterJob = { ...job("foerder-news-waechter"), pruefFelder: [] };
    expect(() => toleranzTage(kaputt)).toThrow(/Prüfdatum/);
  });

  it("wirft, wenn einem Melde-Lauf die Grenze fehlt", () => {
    const kaputt: WaechterJob = { ...job("health-check.yml"), stummAbTage: undefined };
    expect(() => toleranzTage(kaputt)).toThrow(/stummAbTage/);
  });
});

describe("Urteil", () => {
  const stand: PruefEintrag[] = PRUEFSTAND;

  it("nennt einen Lauf ohne Lebenszeichen blind, nicht still", () => {
    const u = beurteile(job("solar-check-seo-waechter"), { ablageLesbar: true }, "2026-08-24");
    expect(u.zustand).toBe("blind");
    expect(u.satz).toMatch(/alert|Prüfdatum/i);
  });

  // Der Kern: Bei einem Lauf, der nur im Ernstfall meldet, ist eine leere Ablage
  // der NORMALFALL. Ihn deswegen als Stillstand auszuweisen hieße, einen Ausfall
  // zu behaupten, den es nicht gibt — und nach drei solchen Fehlalarmen sieht
  // niemand mehr hin.
  it("wertet die leere Ablage nicht gegen einen Lauf, der nur im Ernstfall meldet", () => {
    const u = beurteile(
      job("solar-check-preis-waechter"),
      { letzteMeldung: null, datenbankStand: "2026-08-01", ablageLesbar: true },
      "2026-08-24",
    );
    expect(u.zustand).toBe("laeuft");
    expect(u.belegDatum).toBe("2026-08-01");
  });

  it("erkennt Stillstand an dem Beleg, den der Eintrag benennt", () => {
    const wp = job("waermepumpe-werte-verify-jaehrlich");
    const grenze = toleranzTage(wp, stand); // 120
    const gerade = beurteile(wp, { pruefdatum: "2026-05-01", ablageLesbar: true }, "2026-08-24");
    expect(gerade.alterTage).toBe(115);
    expect(gerade.zustand).toBe("laeuft");

    const drueber = beurteile(wp, { pruefdatum: "2026-04-01", ablageLesbar: true }, "2026-08-24");
    expect(drueber.alterTage).toBeGreaterThan(grenze);
    expect(drueber.zustand).toBe("stillstand");
    expect(drueber.satz).toContain(String(grenze));
  });

  it("unterscheidet „nie gemeldet“ von „nicht nachgesehen“", () => {
    const j = job("solar-check-error-triage-daily");
    expect(beurteile(j, { letzteMeldung: null, ablageLesbar: true }, "2026-08-24").zustand).toBe("stillstand");
    // Datenbank weg: Nichts behaupten. Ein Messfehler ist kein Befund.
    expect(beurteile(j, { letzteMeldung: null, ablageLesbar: false }, "2026-08-24").zustand).toBe("unbekannt");
  });

  it("sortiert das Schlimmste nach oben", () => {
    const zeilen = WAECHTER.map((j) => ({
      job: j,
      urteil: beurteile(
        j,
        { letzteMeldung: "2026-08-24", pruefdatum: "2026-08-24", datenbankStand: "2026-08-24", ablageLesbar: true },
        "2026-08-24",
      ),
    }));
    const raus = sortiere(zeilen);
    // Alle Belege frisch — übrig bleiben genau die, die wir gar nicht sehen.
    const blind = raus.filter((z) => z.urteil.zustand === "blind");
    expect(blind.length).toBeGreaterThan(0);
    expect(raus.slice(0, blind.length).every((z) => z.urteil.zustand === "blind")).toBe(true);
  });
});

describe("Formulierung", () => {
  // Grammatik ist Teil der Richtigkeit — „vor 1 Tagen" ist derselbe Fehler in
  // Worten wie eine falsche Einheit.
  it("beugt Tage richtig", () => {
    expect(tageText(0)).toBe("weniger als einem Tag");
    expect(tageText(1)).toBe("einem Tag");
    expect(tageText(2)).toBe("2 Tagen");
  });
});

describe("Auflösung der Prüfstand-Einträge", () => {
  it("gibt die Einträge zurück, nicht nur die Feldnamen", () => {
    const e = pruefEintraege(job("solar-check-geraete-config-verify-jaehrlich"));
    expect(e).toHaveLength(3);
    expect(e.map((x) => x.was)).toContain("Klimaanlage: Gerätepreise und Effizienzen");
  });

  it("überspringt still, was es nicht gibt, statt zu werfen", () => {
    const kaputt: WaechterJob = { ...job("foerder-news-waechter"), pruefFelder: ["GIBTS_NICHT"] };
    expect(pruefEintraege(kaputt)).toEqual([]);
  });
});
