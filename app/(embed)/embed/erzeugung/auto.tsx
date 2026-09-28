"use client";

import { useEffect, useState } from "react";
import ErzeugungWidget from "./client";

// `?auto=` only starts a timer that cycles the energy carriers — it changes
// nothing in the first render. Reading it here in the browser instead of from
// searchParams on the server keeps both erzeugung pages static (a page that
// reads searchParams is rebuilt on every embed view and never cached), and the
// first render stays exactly what it was: the widget without a running timer.

// Akzeptiert "1" (= 6000 ms Default-Intervall) oder eine Ganzzahl in ms.
// Werte unter 1000 oder über 60000 werden geclamped.
export function parseAuto(raw: string | null | undefined): number {
  if (!raw) return 0;
  if (raw === "1") return 6000;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(60_000, Math.max(1000, n));
}

export default function ErzeugungEmbedAuto({ compact = false }: { compact?: boolean }) {
  const [autoswitchMs, setAutoswitchMs] = useState(0);
  useEffect(() => {
    setAutoswitchMs(parseAuto(new URLSearchParams(window.location.search).get("auto")));
  }, []);
  return <ErzeugungWidget compact={compact} autoswitchMs={autoswitchMs} />;
}
