/**
 * Der Gemeindeschlüssel-Wächter — die ABLEITUNG unter Test, nicht sein Urteil.
 *
 * ANLASS (12.09.2026): Der nächtliche Lauf stand vom 10. bis 12.09.2026 drei
 * Tage rot, und zwar aus einem Grund, der nichts mit einem falschen Schlüssel zu
 * tun hatte: Seit dem 09.09.2026 kann ein Programm mehrere Fördergebiete haben,
 * und bei einer Verbandsgemeinde trägt der Schlüssel den Namen einer
 * MITGLIEDSgemeinde („Verbandsgemeinde Brohltal" gegen „Schalkenbach"). Der
 * Namensvergleich konnte dort nie passen.
 *
 * Weil der Schlüssel-Check der ERSTE Schritt der Nacht ist, sind vier weitere
 * drei Nächte lang gar nicht gelaufen — Fingerabdrücke, Einzelseiten, Technik,
 * Abdeckung. Ein Wächter, der am falschen Ort rot wird, schaltet die übrigen ab.
 *
 * UND DER GRÖSSERE BEFUND: An `agsCodes` war bis dahin ÜBERHAUPT NICHTS
 * geprüft — 32 Schlüssel, darunter alle neun Mitgliedsgemeinden der
 * StädteRegion Aachen, deren Programm gar kein `agsCode` trägt und deshalb
 * schon durch den Filter fiel.
 */
import { describe, it, expect } from "vitest";
import { pruefeProgramm, pruefeVerzeichnis } from "../funding-ags-urteil";

/** Das Melderegister, so knapp wie die Prüfung es braucht. */
const REGISTER = new Map<string, string>([
  ["07131006", "Bad Breisig"],
  ["07131014", "Brohl-Lützing"],
  ["07131081", "Waldorf"],
  ["07131073", "Schalkenbach"],
  ["07131204", "Galenberg"],
  ["05334004", "Alsdorf"],
  ["05334008", "Baesweiler"],
  ["05334002", "Aachen"],
  ["06440016", "Nidda"],
  ["07314000", "Ludwigshafen am Rhein"],
  ["07140131", "Roth"],
  ["06437014", "Rothenberg"],
  ["07140076", "Külz (Hunsrück)"],
]);

describe("Gemeindeschlüssel-Wächter", () => {
  describe("Ein Fördergebiet — der Namensvergleich fängt den Vertipper", () => {
    it("lässt den passenden Schlüssel durch", () => {
      expect(pruefeProgramm({ id: "nidda-solar", region: "Nidda", agsCode: "06440016" }, REGISTER)).toEqual([]);
    });

    it("schlägt an, wenn der Schlüssel auf einen anderen Ort zeigt", () => {
      const b = pruefeProgramm({ id: "test", region: "Nidda", agsCode: "07314000" }, REGISTER);
      expect(b).toHaveLength(1);
      expect(b[0].text).toContain("Ludwigshafen am Rhein");
      expect(b[0].text).toContain("Nidda");
    });

    it("schlägt an, wenn es den Schlüssel im Melderegister gar nicht gibt", () => {
      const b = pruefeProgramm({ id: "test", region: "Nidda", agsCode: "06440017" }, REGISTER);
      expect(b).toHaveLength(1);
      expect(b[0].text).toContain("existiert im Melderegister nicht");
    });
  });

  describe("Mehrere Fördergebiete — der Kreis tritt an die Stelle des Namens", () => {
    it("lässt eine Verbandsgemeinde durch, deren Schlüssel Mitgliedsgemeinden sind", () => {
      // Genau der Fall, an dem der Lauf drei Tage rot stand: Der Name des
      // Programms („Verbandsgemeinde Bad Breisig") steht im Melderegister
      // nirgends, seine Ortsgemeinden schon.
      expect(
        pruefeProgramm(
          { id: "vg-bad-breisig-balkonkraftwerke", region: "Verbandsgemeinde Bad Breisig", agsCode: "07131006", agsCodes: ["07131014", "07131081"] },
          REGISTER,
        ),
      ).toEqual([]);
    });

    it("lässt ein Programm ohne eigenen agsCode durch, wenn nur agsCodes gesetzt sind", () => {
      // Die StädteRegion Aachen trägt kein `agsCode`. Vor dem 12.09.2026 fiel
      // sie damit durch den Filter und war KOMPLETT ungeprüft.
      expect(
        pruefeProgramm(
          { id: "staedteregion-aachen-ee", region: "StädteRegion Aachen", agsCodes: ["05334004", "05334008"] },
          REGISTER,
        ),
      ).toEqual([]);
    });

    it("schlägt an, wenn ein Gebiet in einem anderen Landkreis liegt", () => {
      const b = pruefeProgramm(
        { id: "test", region: "Verbandsgemeinde Bad Breisig", agsCode: "07131006", agsCodes: ["05334004"] },
        REGISTER,
      );
      expect(b).toHaveLength(1);
      expect(b[0].text).toContain("mehreren Landkreisen");
      expect(b[0].text).toContain("05334");
      expect(b[0].text).toContain("07131");
    });

    it("schlägt auch bei mehreren Gebieten an, wenn einer im Melderegister fehlt", () => {
      // Die Existenzprüfung gilt für JEDEN Schlüssel — sie ist das, was von der
      // alten Prüfung bei Mehrfach-Gebieten übrig bleibt.
      const b = pruefeProgramm(
        { id: "test", region: "Verbandsgemeinde Bad Breisig", agsCode: "07131006", agsCodes: ["07131099"] },
        REGISTER,
      );
      expect(b.some((x) => x.text.includes("07131099") && x.text.includes("existiert im Melderegister nicht"))).toBe(true);
    });

    it("lässt eine Verbandsgemeinde mit nur EINEM belegten Gebiet durch", () => {
      // Gefunden am 12.09.2026, als der umgebaute Wächter zum ersten Mal über
      // den echten Bestand lief: Sprendlingen-Gensingen trägt genau einen
      // Schlüssel (Sankt Johann) und ist trotzdem ein Verbandsgemeinde-
      // Programm — wir tragen nur die Ortsgemeinden ein, für die wir es belegt
      // haben. Eine Regel nach der ANZAHL der Gebiete hätte hier wieder
      // fälschlich angeschlagen; maßgeblich ist der TRÄGER.
      expect(
        pruefeProgramm(
          { id: "sprendlingen-gensingen-balkonsolar", region: "Verbandsgemeinde Sprendlingen-Gensingen", agsCode: "07131073" },
          REGISTER,
        ),
      ).toEqual([]);
    });

    it("prüft auch beim Verband, dass der Schlüssel im Melderegister steht", () => {
      const b = pruefeProgramm({ id: "test", region: "Verbandsgemeinde Irgendwo", agsCode: "07131999" }, REGISTER);
      expect(b).toHaveLength(1);
      expect(b[0].text).toContain("existiert im Melderegister nicht");
    });

    it("nennt die GRENZE ehrlich: ein Vertipper im selben Kreis bleibt unentdeckt", () => {
      // Das ist kein Versehen, sondern die Datenlage — und es gehört
      // festgehalten, damit niemand die Prüfung für schärfer hält, als sie ist.
      // Brohl-Lützing gegen Waldorf zu vertauschen bleibt hier unsichtbar.
      expect(
        pruefeProgramm(
          { id: "test", region: "Verbandsgemeinde Brohltal", agsCode: "07131073", agsCodes: ["07131204", "07131014"] },
          REGISTER,
        ),
      ).toEqual([]);
    });
  });

  describe("Fünfstellige Schlüssel bleiben außen vor", () => {
    it("prüft ein Landes- oder Kreisprogramm nicht gegen Gemeindenamen", () => {
      expect(pruefeProgramm({ id: "test", region: "Berlin", agsCode: "11" }, REGISTER)).toEqual([]);
      expect(pruefeProgramm({ id: "test", region: "Kreis Bergstraße", agsCode: "06431" }, REGISTER)).toEqual([]);
    });
  });

  describe("Städte-Verzeichnis", () => {
    it("lässt den passenden Eintrag durch", () => {
      expect(pruefeVerzeichnis({ slug: "nidda", name: "Nidda", ags: "06440016" }, REGISTER)).toEqual([]);
    });

    it("schlägt an, wenn der Eintrag auf einen anderen Ort zeigt", () => {
      const b = pruefeVerzeichnis({ slug: "nidda", name: "Nidda", ags: "07314000" }, REGISTER);
      expect(b).toHaveLength(1);
      expect(b[0].text).toContain("Ludwigshafen am Rhein");
    });
  });
  describe("Kurzer Ortsname mit eigenem Zusatz in Klammern", () => {
    // 27.09.2026: „Roth (Hunsrück)“ gegen Registername „Roth“ wurde als
    // falscher Schlüssel gemeldet — die Prüfung hielt „roth“ gegen „rothh“.
    it("lässt Roth (Hunsrück) auf dem Schlüssel von Roth durch", () => {
      expect(pruefeProgramm({ id: "roth", region: "Roth (Hunsrück)", agsCode: "07140131" }, REGISTER)).toEqual([]);
      expect(pruefeVerzeichnis({ slug: "roth-hunsrueck", name: "Roth (Hunsrück)", ags: "07140131" }, REGISTER)).toEqual([]);
    });

    it("schlägt weiter an, wenn der Schlüssel auf einen längeren Ort mit gleichem Anfang zeigt", () => {
      expect(pruefeProgramm({ id: "roth", region: "Roth (Hunsrück)", agsCode: "06437014" }, REGISTER)).toHaveLength(1);
      expect(pruefeVerzeichnis({ slug: "roth-hunsrueck", name: "Roth (Hunsrück)", ags: "06437014" }, REGISTER)).toHaveLength(1);
      expect(pruefeProgramm({ id: "roth", region: "Roth", agsCode: "06437014" }, REGISTER)).toHaveLength(1);
    });

    it("lässt einen Zusatz durch, den auch das Register trägt", () => {
      expect(pruefeProgramm({ id: "kuelz", region: "Külz (Hunsrück)", agsCode: "07140076" }, REGISTER)).toEqual([]);
    });
  });
});
