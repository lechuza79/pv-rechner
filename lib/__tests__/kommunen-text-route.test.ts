import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ save: vi.fn(), reset: vi.fn(), town: vi.fn(), national: vi.fn(), admin: vi.fn() }));
vi.mock("../admin-guard", () => ({ istAdminOderCron: mocks.admin }));
vi.mock("../social-vorlagen-db", () => ({ ladeFassungen: async () => ({}), speichereFassung: mocks.save, setzeVorlageZurueck: mocks.reset }));
vi.mock("../orts-beitraege-server", () => ({ ortsBeitraegeFuerId: mocks.town }));
vi.mock("../social-kennzahlen", () => ({ socialKennzahlen: mocks.national }));
import { POST } from "../../app/api/social/fassung/route";
const id = "ort-06440012-test";
const request = (body: object) => new NextRequest("http://localhost/api/social/fassung", {method:"POST", body:JSON.stringify(body)});
beforeEach(() => { vi.clearAllMocks(); mocks.admin.mockResolvedValue(true); mocks.town.mockResolvedValue({beitraege:[{post:{id, platzhalter:[{name:"ort", wert:"Musterdorf"}]}}]}); });
it("saves a municipal template using municipal data only", async () => {
  const res = await POST(request({postId:id, vorlage:"Neu in {ort}"}));
  expect(res.status).toBe(200);
  expect(mocks.save).toHaveBeenCalledWith(id, {vorlage:"Neu in {ort}"});
  expect(mocks.national).not.toHaveBeenCalled();
});
it("rejects unknown placeholders without saving", async () => {
  expect((await POST(request({postId:id, vorlage:"{unbekannt}"}))).status).toBe(400);
  expect(mocks.save).not.toHaveBeenCalled();
});
it("rejects missing municipal stories", async () => {
  mocks.town.mockResolvedValue(null);
  expect((await POST(request({postId:id, vorlage:"Text"}))).status).toBe(400);
  expect(mocks.save).not.toHaveBeenCalled();
});
it("resets through the existing text-only reset", async () => {
  expect((await POST(request({postId:id, zuruecksetzen:true}))).status).toBe(200);
  expect(mocks.reset).toHaveBeenCalledWith(id);
});
it("requires authorization", async () => {
  mocks.admin.mockResolvedValue(false);
  expect((await POST(request({postId:id, vorlage:"Text"}))).status).toBe(401);
  expect(mocks.save).not.toHaveBeenCalled();
});
