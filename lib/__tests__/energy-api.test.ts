import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  unixToISO,
  ddmmyyyyToISO,
  mmyyyyToPeriod,
  createCache,
  clampAbsoluteRange,
  safeCountry,
  ENERGY_DATA_FLOOR_YEAR,
} from "../energy-api";

// ─── Untrusted-input guards (DoS/amplification protection) ───────────────────

describe("clampAbsoluteRange", () => {
  it("returns null when a param is missing", () => {
    expect(clampAbsoluteRange(null, "2025-01-01")).toBeNull();
    expect(clampAbsoluteRange("2025-01-01", null)).toBeNull();
    expect(clampAbsoluteRange(null, null)).toBeNull();
  });

  it("returns null for malformed date strings", () => {
    expect(clampAbsoluteRange("2025", "2025-12-31")).toBeNull();
    expect(clampAbsoluteRange("2025-13-45", "2025-12-31")).toBeNull(); // impossible month/day
    expect(clampAbsoluteRange("not-a-date", "also-not")).toBeNull();
  });

  it("passes a normal in-range window through unchanged", () => {
    expect(clampAbsoluteRange("2024-03-01", "2024-06-30")).toEqual({
      start: "2024-03-01",
      end: "2024-06-30",
    });
  });

  it("clamps an absurd range to the data floor and today (the amplification guard)", () => {
    const result = clampAbsoluteRange("0001-01-01", "9999-12-31");
    expect(result).not.toBeNull();
    expect(result!.start).toBe(`${ENERGY_DATA_FLOOR_YEAR}-01-01`);
    // end is clamped to today, never a far-future date
    expect(new Date(result!.end).getTime()).toBeLessThanOrEqual(Date.now());
  });

  it("returns null for an inverted range", () => {
    expect(clampAbsoluteRange("2025-06-01", "2025-01-01")).toBeNull();
  });
});

describe("safeCountry", () => {
  it("passes known country codes (case-insensitive)", () => {
    expect(safeCountry("de")).toBe("de");
    expect(safeCountry("FR")).toBe("fr");
  });

  it("falls back to 'de' for unknown or empty values", () => {
    expect(safeCountry(null)).toBe("de");
    expect(safeCountry("")).toBe("de");
    expect(safeCountry("../etc/passwd")).toBe("de");
    expect(safeCountry("xx")).toBe("de");
  });
});

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
  }, 20000); // real 1s backoff between attempts — generous headroom so CPU load can't trip the 5s default

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
  }, 20000); // real 1s+2s backoff — generous headroom so CPU load can't trip the 5s default

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
