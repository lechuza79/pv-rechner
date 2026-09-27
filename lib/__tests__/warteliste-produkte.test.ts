import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const store = vi.hoisted(() => vi.fn());
vi.mock("../warteliste", () => ({ wartelisteEintragen:store, wartelisteBelegSetzen:vi.fn(), wartelisteVersandFehlgeschlagen:vi.fn() }));
vi.mock("../abo-versand", () => ({ sendeAboMail:vi.fn() }));
import { POST } from "../../app/api/warteliste/anmelden/route";

beforeEach(() => { store.mockReset(); store.mockResolvedValue({art:"still"}); });
let requestId=0;
function request(consent: string) {
  return new NextRequest("https://solar-check.io/api/warteliste/anmelden", {method:"POST",headers:{"content-type":"application/json","x-real-ip":`test-${++requestId}`},body:JSON.stringify({email:"test@example.com",elapsedMs:2000,consent})});
}
describe("Product waitlist routing", () => {
  it.each([["offer-check-v1","angebotscheck"],["offer-check-v2","angebotscheck"],["electric-car-v1","elektroauto"]])("keeps %s on its own list", async (consent,liste) => {
    await POST(request(consent));
    expect(store).toHaveBeenCalledWith(expect.objectContaining({liste,einwilligungVersion:consent}));
  });
  it("rejects unknown consent instead of subscribing to an arbitrary product", async () => {
    expect((await POST(request("unknown"))).status).toBe(400);
    expect(store).not.toHaveBeenCalled();
  });
});
