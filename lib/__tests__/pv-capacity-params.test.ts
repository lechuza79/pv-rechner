import { describe, expect, it } from "vitest";
import { ANLAGEN } from "../constants";
import { paramFloat, paramInt } from "../calc";
import { pvCapacityParams } from "../pv-capacity-params";
import { SHARE_KEYS } from "../share-keys";
import { paramsToInitial, paramsToRow, rowToParams, type CalcParams, type CalculationRow } from "../types";

describe("exact recommendation capacity in result links", () => {
  it.each([1, 4, 4.5, 5, 5.5, 6.5, 8, 8.5, 9.5, 10, 10.5, 12.5, 14.5, 15, 15.5, 30, 50])(
    "%s kWp survives URL serialization and share filtering", kwp => {
      const serialized = pvCapacityParams(kwp).toString();
      const shared = Object.fromEntries([...new URLSearchParams(serialized)]
        .filter(([key]) => SHARE_KEYS.includes(key)));
      const index = paramInt(shared, "a", 2, 0, 4);
      const restored = index < 4 ? ANLAGEN[index].kwp : paramFloat(shared, "ck", 12, 1, 50);
      expect(restored).toBe(kwp);
    },
  );

  it.each([[5, 0], [8, 1], [10, 2], [15, 3]])("keeps the legacy %s kWp preset", (kwp, index) => {
    expect(pvCapacityParams(kwp).toString()).toBe(`a=${index}`);
  });

  it.each([4, 6.5, 5, 8, 10, 12.5, 15, 17.5])("preserves %s kWp when saving and reopening", kwp => {
    const link = Object.fromEntries(pvCapacityParams(kwp));
    const params: CalcParams = {
      anlage: Number(link.a), customKwp: Number(link.ck ?? 12), speicher: 0,
      personen: 0, nutzung: 0, wp: "nein", ea: "nein", eaKm: 15000,
      oKosten: null, oEv: null, oStrom: 0.312, oEinsp: null,
      einspeisungModus: "teil", oErtrag: 1050, plz: "", fuelType: "gas",
      flowType: "empfehlung", haustyp: 0, dachart: 0, budgetLimit: null,
    };
    const stored = paramsToRow(params, { kwp, amortisationJahre: null, rendite25j: null });
    const restored = paramsToInitial(rowToParams({ ...stored, id: "test", user_id: "test",
      name: "Test", description: null, created_at: "", updated_at: "" } as CalculationRow));
    const index = Number(restored.a);
    expect(index < 4 ? ANLAGEN[index].kwp : Number(restored.ck)).toBe(kwp);
  });
});
