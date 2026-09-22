import { describe, expect, it } from "vitest";
import { waehleRedaktionsSchub } from "../redaktions-schub";
import { AKTUELLER_SCHUB, GEPARKTE_KAMPAGNE_BWBY, SCHUEBE } from "../kommunen-testballon";

const batch = (schluessel: string, offen: number) => ({ schluessel, offen, abIso: SCHUEBE[schluessel].abIso });
const geplant = batch("mail-sept-26", 74);
const geparkt = batch(GEPARKTE_KAMPAGNE_BWBY, 100);

describe("Editorial batch selection", () => {
  it("keeps the September plan ahead of the larger, future BW/BY batch", () => {
    expect(waehleRedaktionsSchub([geparkt, geplant], AKTUELLER_SCHUB, "2026-09-09")).toBe("mail-sept-26");
  });
  it("keeps the plan first even once the larger batch has started", () => {
    expect(waehleRedaktionsSchub([geparkt, geplant], AKTUELLER_SCHUB, "2026-09-16")).toBe("mail-sept-26");
  });
  it("does not return an already completed plan", () => {
    expect(waehleRedaktionsSchub([geparkt, { ...geplant, offen: 0 }], AKTUELLER_SCHUB, "2026-09-16")).toBe(GEPARKTE_KAMPAGNE_BWBY);
  });
  it("does not substitute a future batch when the plan is completed", () => {
    expect(waehleRedaktionsSchub([geparkt, { ...geplant, offen: 0 }], AKTUELLER_SCHUB, "2026-09-09")).toBeNull();
  });
  it("uses a started open batch if the plan is stale", () => {
    expect(waehleRedaktionsSchub([batch("mail-he-rp-sl", 0), geplant], "mail-he-rp-sl", "2026-09-09")).toBe("mail-sept-26");
  });
  it("includes the scheduled start day, but not the day before", () => {
    expect(waehleRedaktionsSchub([geplant], AKTUELLER_SCHUB, "2026-09-07")).toBeNull();
    expect(waehleRedaktionsSchub([geplant], AKTUELLER_SCHUB, "2026-09-08")).toBe("mail-sept-26");
  });
  it("has no selection without open batches", () => {
    expect(waehleRedaktionsSchub([], AKTUELLER_SCHUB, "2026-09-09")).toBeNull();
  });
});
