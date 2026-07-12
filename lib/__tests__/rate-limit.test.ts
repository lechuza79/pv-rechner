import { describe, it, expect } from "vitest";
import { rateLimit } from "../rate-limit";

function reqWithIp(ip: string | null): Request {
  const headers = new Headers();
  if (ip) headers.set("x-forwarded-for", ip);
  return new Request("https://solar-check.io/api/test", { headers });
}

describe("rateLimit", () => {
  it("lets requests through under the limit", () => {
    const ns = "test-under";
    for (let i = 0; i < 5; i++) {
      expect(rateLimit(reqWithIp("1.1.1.1"), ns, 5, 60_000)).toBeNull();
    }
  });

  it("returns a 429 once the limit is exceeded", () => {
    const ns = "test-over";
    for (let i = 0; i < 3; i++) rateLimit(reqWithIp("2.2.2.2"), ns, 3, 60_000);
    const blocked = rateLimit(reqWithIp("2.2.2.2"), ns, 3, 60_000);
    expect(blocked).not.toBeNull();
    expect(blocked!.status).toBe(429);
    expect(blocked!.headers.get("Retry-After")).toBe("60");
    expect(blocked!.headers.get("Cache-Control")).toBe("no-store");
  });

  it("tracks each IP independently", () => {
    const ns = "test-per-ip";
    for (let i = 0; i < 3; i++) rateLimit(reqWithIp("3.3.3.3"), ns, 3, 60_000);
    // a different IP still has its full budget
    expect(rateLimit(reqWithIp("4.4.4.4"), ns, 3, 60_000)).toBeNull();
  });

  it("keeps namespaces separate", () => {
    for (let i = 0; i < 3; i++) rateLimit(reqWithIp("5.5.5.5"), "ns-a", 3, 60_000);
    // same IP, different namespace → not throttled
    expect(rateLimit(reqWithIp("5.5.5.5"), "ns-b", 3, 60_000)).toBeNull();
  });

  it("never throttles internal calls without a client IP", () => {
    const ns = "test-internal";
    for (let i = 0; i < 100; i++) {
      expect(rateLimit(reqWithIp(null), ns, 3, 60_000)).toBeNull();
    }
  });

  it("only counts the first IP in an x-forwarded-for chain", () => {
    const ns = "test-chain";
    const req = new Request("https://solar-check.io/api/test", {
      headers: { "x-forwarded-for": "6.6.6.6, 10.0.0.1, 10.0.0.2" },
    });
    for (let i = 0; i < 3; i++) expect(rateLimit(req, ns, 3, 60_000)).toBeNull();
    expect(rateLimit(req, ns, 3, 60_000)).not.toBeNull();
  });
});
