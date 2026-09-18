import { describe, expect, it } from "vitest";
import { ATLAS_CITIES, fundingFor } from "../atlas-cities";
import { FUNDING_PROGRAMS, deckt, foerdergebiete, fundingForAgs } from "../funding-programs";

/**
 * Ein Programm kann MEHRERE Fördergebiete haben — und muss es, seit der Katalog
 * Verbandsgemeinden führt.
 *
 * DER ANLASS (09.09.2026): In Rheinland-Pfalz zahlt regelmäßig die
 * Verbandsgemeinde, nicht die einzelne Ortsgemeinde. Deren Ortsgemeinden teilen
 * sich aber keinen eigenen Schlüssel: Ihr gemeinsames Präfix ist der LANDKREIS.
 * Die Verbandsgemeinden Brohltal und Bad Breisig liegen BEIDE im Kreis
 * Ahrweiler und zahlen verschieden viel — wer eine davon unter dem Kreisschlüssel
 * einträgt, gibt ihr Programm dem ganzen Kreis und legt es über das andere.
 *
 * Genau der Fehler, gegen den die Regel „das Fördergebiet enthält die Gemeinde,
 * nie umgekehrt" gebaut ist, nur eine Ebene höher.
 */
describe("Programme mit mehreren Fördergebieten", () => {
  it("führt beide Felder an EINER Stelle zusammen", () => {
    const vg = FUNDING_PROGRAMS["vg-brohltal-balkonkraftwerke"];
    expect(foerdergebiete(vg)).toEqual(["07131073", "07131204", "07131201"]);
    // Ein Programm ohne Zusatzgebiete verhält sich unverändert.
    expect(foerdergebiete(FUNDING_PROGRAMS["taunusstein-balkonsolar"])).toEqual(["06439015"]);
  });

  it("deckt jede seiner Ortsgemeinden — und keine fremde", () => {
    const vg = FUNDING_PROGRAMS["vg-brohltal-balkonkraftwerke"];
    for (const ort of ["07131073", "07131204", "07131201"]) {
      expect(deckt(vg, ort), ort).toBe(true);
    }
    // Bad Breisig liegt im selben Landkreis und hat ein EIGENES Programm mit
    // anderem Betrag. Unter dem Kreisschlüssel 07131 lägen beide übereinander.
    expect(deckt(vg, "07131006")).toBe(false);
    expect(deckt(FUNDING_PROGRAMS["vg-bad-breisig-balkonkraftwerke"], "07131073")).toBe(false);
  });

  it("kein Mehrgebiets-Programm trägt einen Kreisschlüssel", () => {
    // Die naheliegende Abkürzung — den gemeinsamen Präfix der Ortsgemeinden
    // nehmen — ist genau der Fehler: Bei einer Verbandsgemeinde ist dieser
    // Präfix der Landkreis. Fünf Stellen bedeuten „ganzes Kreisgebiet"; das
    // darf nur ein Programm tragen, das der Landkreis auch zahlt.
    //
    // Geprüft werden ausschließlich Programme mit mehreren Gebieten. Eine
    // kreisfreie Stadt führt zu Recht fünf Stellen und ist trotzdem `kommune` —
    // eine Prüfung über alle Programme wäre an Stuttgart hängengeblieben und
    // hätte damit den echten Fall nie erreicht.
    for (const p of Object.values(FUNDING_PROGRAMS)) {
      if (!(p.agsCodes ?? []).length) continue;
      // Ein Landkreis darf mehrere Gebiete tragen, wenn er einen Teil seines
      // Kreises ausnimmt: Die StädteRegion Aachen fördert ihre neun Gemeinden
      // OHNE die Stadt Aachen (Nr. 3.2 beider Richtlinien, 11.09.2026). Auch
      // dann gilt die Prüfung darunter — nur Gemeindeschlüssel, nie der Kreis.
      expect(["kommune", "landkreis"], `${p.id}`).toContain(p.level);
      for (const g of foerdergebiete(p)) {
        expect(g.length, `${p.id}: Fördergebiet ${g} ist ein Kreisschlüssel`).toBe(8);
      }
    }
  });

  it("der Rechner findet das Programm an jeder Ortsgemeinde", () => {
    // Über die Postleitzahl kommt immer ein achtstelliger Gemeindeschlüssel an.
    for (const ort of ["07143237", "07143311", "07143244"]) {
      const ids = fundingForAgs(ort).map((p) => p.id);
      expect(ids, ort).toContain("vg-rennerod-klimaschutz");
    }
  });

  it("die Stadtseite ordnet das Programm dem spezifischeren Gebiet zu", () => {
    // Schalkenbach gehört zur VG Brohltal. Läge dort zusätzlich ein
    // Kreisprogramm, müsste das Gemeinde-Gebiet gewinnen — die Spezifität hängt
    // am TREFFENDEN Gebiet, nicht am ersten Feld des Programms.
    const ort = ATLAS_CITIES.find((c) => c.slug === "schalkenbach");
    expect(ort).toBeTruthy();
    expect(fundingFor(ort!)?.id).toBe("vg-brohltal-balkonkraftwerke");
  });
});
