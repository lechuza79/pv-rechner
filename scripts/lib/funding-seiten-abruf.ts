import { seitenAbrufAdressen } from "../../lib/funding-seiten";
import type { FundingSourceReader } from "./funding-source-reader";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";

/** Is any fetch address of this stored page key due for another attempt? */
export function seiteFaellig(sources: Pick<FundingSourceReader, "due">, schluessel: string): boolean {
  return seitenAbrufAdressen(schluessel).some((u) => sources.due(u));
}

/**
 * Fetch a stored page key, trying the stored host first and the www form only
 * after a failure. Each address keeps its own source state, so a dead bare host
 * does not block the www form and vice versa. Returns null when none is readable.
 */
export async function holeSeite(
  sources: Pick<FundingSourceReader, "due" | "fetch">,
  schluessel: string,
  timeoutMs = 15_000,
): Promise<string | null> {
  for (const adresse of seitenAbrufAdressen(schluessel)) {
    if (!sources.due(adresse)) continue;
    try {
      const res = await sources.fetch(adresse, {
        headers: { "User-Agent": UA, "Accept-Language": "de-DE,de;q=0.9" },
        redirect: "follow",
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (res.ok) return await res.text();
    } catch {
      /* next address */
    }
  }
  return null;
}
