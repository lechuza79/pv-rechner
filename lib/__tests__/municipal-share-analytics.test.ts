import { expect, it, vi } from "vitest";
import { bindMunicipalShareAnalytics } from "../municipal-share-analytics";
import { trackEvent } from "../analytics";

vi.mock("../analytics", () => ({ trackEvent: vi.fn() }));

it("routes only the two counters and removes listeners on unmount", () => {
  const target = new EventTarget();
  const cleanup = bindMunicipalShareAnalytics(target);
  target.dispatchEvent(new Event("municipal-message-opened"));
  target.dispatchEvent(new Event("municipal-message-copied"));
  cleanup();
  target.dispatchEvent(new Event("municipal-message-opened"));
  expect(vi.mocked(trackEvent).mock.calls).toEqual([
    ["gemeinde_meldung_geoeffnet"], ["gemeinde_meldung_kopiert"],
  ]);
});

