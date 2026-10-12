import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
vi.mock("../atlas", () => ({ getRegionById: vi.fn(async (id: string) => id === "07" ? { name: "Rheinland-Pfalz" } : id === "08221" ? { name: "Heidelberg" } : null), atlasPathForRegionId: vi.fn() }));
vi.mock("../funding-data", () => ({ getFundingPrograms: vi.fn(async () => [{ id: "known-program", name: "Known programme" }]) }));
vi.mock("../gemeinde-abo", () => ({ normalisiereEmail: (s: string) => s, siehtNachEmailAus: () => true, aboAnlegen: vi.fn(async () => ({ art: "still" })), versandBelegSetzen: vi.fn() }));
import { aboRegion, aboRegionPath } from "../abo-region";
import { aboAnlegen } from "../gemeinde-abo";
import { POST } from "../../app/api/abo/anmelden/route";
import { FOERDER_ABO_EINWILLIGUNG, einwilligungsFassung } from "../abo-einwilligung";
beforeEach(() => { vi.clearAllMocks(); vi.stubEnv("NEXT_PUBLIC_BASE_URL", "http://localhost"); });
it("resolves programme and regional scopes without broadening them", async () => {
  expect(await aboRegion("funding:program:known-program")).toEqual({ name: "Known programme" });
  expect(await aboRegion("funding:program:missing")).toBeNull();
  expect(await aboRegion("funding:region:07")).toEqual({ name: "Förderung · Rheinland-Pfalz" });
  expect(await aboRegionPath("funding:program:known-program")).toBe("/photovoltaik-foerderung#programm-known-program");
  expect(einwilligungsFassung(FOERDER_ABO_EINWILLIGUNG.version)).toEqual(FOERDER_ABO_EINWILLIGUNG);
});
it.each(["funding:program:known-program", "funding:region:07"])("persists exact funding scope %s through the existing opt-in flow", async ags => {
  const result = await POST(new NextRequest("http://localhost/api/abo/anmelden", { method: "POST", headers: { "x-real-ip": ags }, body: JSON.stringify({ ags, email: "test@example.org", quelle: "foerderung", einwilligung: FOERDER_ABO_EINWILLIGUNG.version }) }));
  expect(result.status).toBe(200);
  expect(aboAnlegen).toHaveBeenCalledWith(expect.objectContaining({ regionId: ags, quelle: "foerderung", einwilligungVersion: FOERDER_ABO_EINWILLIGUNG.version }));
});
it("rejects unknown programmes and funding scopes on the general subscription path", async () => {
  for (const [ags, quelle] of [["funding:program:missing", "foerderung"], ["funding:program:known-program", "gemeinde"]]) {
    const result = await POST(new NextRequest("http://localhost/api/abo/anmelden", { method: "POST", headers: { "x-real-ip": `${ags}-${quelle}` }, body: JSON.stringify({ ags, quelle, email: "test@example.org" }) }));
    expect(result.status).toBe(400);
  }
  expect(aboAnlegen).not.toHaveBeenCalled();
});

it("returns a municipal funding subscription to its own funding page", async () => {
  expect(await aboRegionPath("funding:region:08221")).toBe("/photovoltaik-foerderung/baden-wuerttemberg/heidelberg");
});
