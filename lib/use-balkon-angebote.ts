"use client";
import { useEffect, useState } from "react";
import type { ShopAngebote } from "./shop-solakon";

export interface BalkonKatalog {
  daten: ShopAngebote | null;
  fehlgeschlagen: boolean;
}

/** One catalogue snapshot drives both the result and the product cards. */
export function useBalkonAngebote(enabled = true): BalkonKatalog {
  const [state, setState] = useState<BalkonKatalog>({ daten: null, fehlgeschlagen: false });
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    fetch("/api/shop/balkon", { signal: controller.signal })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(String(r.status))))
      .then((daten: ShopAngebote) => {
        if (!Array.isArray(daten.angebote)) throw new Error("Invalid catalogue");
        setState({ daten, fehlgeschlagen: false });
      })
      .catch(() => { if (!controller.signal.aborted) setState({ daten: null, fehlgeschlagen: true }); });
    return () => controller.abort();
  }, [enabled]);
  return state;
}
