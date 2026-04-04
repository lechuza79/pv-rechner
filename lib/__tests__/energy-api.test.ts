import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  unixToISO,
  ddmmyyyyToISO,
  mmyyyyToPeriod,
  createCache,
} from "../energy-api";

// ─── Timestamp Normalization ────────────────────────────────────────────────

describe("unixToISO", () => {
  it("converts unix seconds to ISO 8601", () => {
    expect(unixToISO(1704067200)).toBe("2024-01-01T00:00:00.000Z");
  });

  it("handles fractional results correctly", () => {
    const result = unixToISO(1704067260); // +60s
    expect(result).toBe("2024-01-01T00:01:00.000Z");
  });
});

describe("ddmmyyyyToISO", () => {
  it("converts DD.MM.YYYY to ISO date", () => {
    expect(ddmmyyyyToISO("01.01.2024")).toBe("2024-01-01T00:00:00Z");
    expect(ddmmyyyyToISO("15.12.2025")).toBe("2025-12-15T00:00:00Z");
  });

  it("pads single-digit days and months", () => {
    expect(ddmmyyyyToISO("1.1.2024")).toBe("2024-01-01T00:00:00Z");
    expect(ddmmyyyyToISO("9.3.2024")).toBe("2024-03-09T00:00:00Z");
  });
});

describe("mmyyyyToPeriod", () => {
  it("converts MM.YYYY to YYYY-MM", () => {
    expect(mmyyyyToPeriod("01.2024")).toBe("2024-01");
    expect(mmyyyyToPeriod("12.2025")).toBe("2025-12");
  });

  it("pads single-digit months", () => {
    expect(mmyyyyToPeriod("1.2024")).toBe("2024-01");
  });
});

// ─── In-Memory Cache ────────────────────────────────────────────────────────

describe("createCache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("stores and retrieves values", () => {
    const cache = createCache<string>(60000);
    cache.set("key1", "value1");
    expect(cache.get("key1")).toBe("value1");
  });

  it("returns null for missing keys", () => {
    const cache = createCache<string>(60000);
    expect(cache.get("nonexistent")).toBeNull();
  });

  it("expires entries after TTL", () => {
    const cache = createCache<string>(1000); // 1s TTL
    cache.set("key1", "value1");
    expect(cache.get("key1")).toBe("value1");

    vi.advanceTimersByTime(1001);
    expect(cache.get("key1")).toBeNull();
  });

  it("invalidates specific key", () => {
    const cache = createCache<string>(60000);
    cache.set("key1", "value1");
    cache.set("key2", "value2");
    cache.invalidate("key1");
    expect(cache.get("key1")).toBeNull();
    expect(cache.get("key2")).toBe("value2");
  });

  it("invalidates all keys", () => {
    const cache = createCache<string>(60000);
    cache.set("key1", "value1");
    cache.set("key2", "value2");
    cache.invalidate();
    expect(cache.get("key1")).toBeNull();
    expect(cache.get("key2")).toBeNull();
  });

  afterEach(() => {
    vi.useRealTimers();
  });
});

// ─── fetchWithTimeout retry logic ───────────────────────────────────────────

describe("fetchWithTimeout retry logic", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("returns on first successful response", async () => {
    const { fetchWithTimeout } = await import("../energy-api");
    const mockRes = { ok: true, status: 200 } as Response;
    vi.mocked(fetch).mockResolvedValueOnce(mockRes);

    const result = await fetchWithTimeout("https://example.com/test", 5000, 3);
    expect(result).toBe(mockRes);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("retries on 429 and succeeds", async () => {
    const { fetchWithTimeout } = await import("../energy-api");
    const mockFail = { ok: false, status: 429 } as Response;
    const mockOk = { ok: true, status: 200 } as Response;

    vi.mocked(fetch)
      .mockResolvedValueOnce(mockFail)
      .mockResolvedValueOnce(mockOk);

    const result = await fetchWithTimeout("https://example.com/test", 5000, 3);
    expect(result).toBe(mockOk);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("throws after all retries exhausted on 429", async () => {
    const { fetchWithTimeout } = await import("../energy-api");
    const mockFail = { ok: false, status: 429 } as Response;

    vi.mocked(fetch)
      .mockResolvedValue(mockFail);

    await expect(
      fetchWithTimeout("https://example.com/test", 5000, 2)
    ).rejects.toThrow("HTTP 429");
    // 1 initial + 2 retries = 3 calls
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("throws immediately on non-429 errors", async () => {
    const { fetchWithTimeout } = await import("../energy-api");
    const mockFail = { ok: false, status: 500 } as Response;

    vi.mocked(fetch).mockResolvedValueOnce(mockFail);

    await expect(
      fetchWithTimeout("https://example.com/test", 5000, 3)
    ).rejects.toThrow("HTTP 500");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });
});
