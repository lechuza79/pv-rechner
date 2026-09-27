import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ admin: vi.fn(), page: vi.fn(), approval: vi.fn(), save: vi.fn() }));
vi.mock("../admin-guard", () => ({ isAdminSession: mocks.admin }));
vi.mock("../orts-beitraege-server", () => ({ ortsBeitraegeFuerId: mocks.page }));
vi.mock("../orts-story-feed-db", () => ({ saveStoryEdition: mocks.save }));
vi.mock("../social-pruefung", () => ({ fassungsAbdruck: () => "fingerprint", pruefungGueltig: mocks.approval }));
vi.mock("../supabase-server", () => ({ supabase: null }));
import { POST } from "../../app/api/social/story-feed/route";
import { NextRequest } from "next/server";
const request = (action = "publish", fassung = "fingerprint") => new NextRequest("http://localhost/api/social/story-feed", { method: "POST", body: JSON.stringify({ regionId: "12345678", postId: "ort-12345678-test", fassung, action }) });
beforeEach(() => {
  vi.clearAllMocks();
  mocks.admin.mockResolvedValue(true);
  mocks.page.mockResolvedValue({ standIso: "2026-08-05", beitraege: [{ post: { id: "ort-12345678-test", text: "Test", bild: {} }, text: "Test", storyKennung: "test" }] });
  mocks.approval.mockResolvedValue({ ok: false, grund: "Freigabe fehlt" });
});
it("denies unauthenticated capture before reading any story", async () => {
  mocks.admin.mockResolvedValue(false);
  expect((await POST(request())).status).toBe(401);
  expect(mocks.page).not.toHaveBeenCalled();
});
it("never stores or publishes an unapproved edition on the publish path", async () => {
  expect((await POST(request())).status).toBe(409);
  expect(mocks.save).not.toHaveBeenCalled();
});
it("rejects stale browser content", async () => {
  expect((await POST(request("save", "old"))).status).toBe(409);
  expect(mocks.save).not.toHaveBeenCalled();
});
it("saves an explicit draft without publishing or claiming approval", async () => {
  const response = await POST(request("save"));
  expect(response.status).toBe(200);
  expect((await response.json()).published).toBe(false);
  expect(mocks.save).toHaveBeenCalledOnce();
  expect(mocks.approval).not.toHaveBeenCalled();
});
