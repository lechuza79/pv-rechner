"use client";
import { useState, useEffect } from "react";
import { DEFAULT_FEED_IN, type FeedInRates } from "./feedin-config";

export { DEFAULT_FEED_IN, type FeedInRates } from "./feedin-config";

const CACHE_KEY = "solar-check-feedin";
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export function useFeedInRates(): FeedInRates {
  const [rates, setRates] = useState<FeedInRates>(DEFAULT_FEED_IN);

  useEffect(() => {
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, ts } = JSON.parse(cached);
        if (Date.now() - ts < CACHE_TTL) {
          setRates(data);
          return;
        }
      }
    } catch { /* ignore */ }

    fetch("/api/feedin")
      .then(res => res.ok ? res.json() : null)
      .then((data: FeedInRates | null) => {
        if (data && data.teilUnder10 > 0) {
          setRates(data);
          try {
            sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
          } catch { /* ignore */ }
        }
      })
      .catch(() => { /* keep defaults */ });
  }, []);

  return rates;
}
