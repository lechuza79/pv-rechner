"use client";
import { useEffect, useState } from "react";
import Toast from "./Toast";
import { dismissLocationLinkChange, useLocationLinkChange } from "../lib/location";
import { v } from "../lib/theme";

/** Announce an explicit link replacing the visitor's remembered location. */
export default function LocationChangeToast() {
  const change = useLocationLinkChange();
  const [remaining, setRemaining] = useState(10);
  useEffect(() => {
    if (!change) return;
    const deadline = Date.now() + 10_000;
    setRemaining(10);
    const timer = setInterval(() => {
      const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemaining(seconds);
      if (!seconds) dismissLocationLinkChange();
    }, 250);
    return () => clearInterval(timer);
  }, [change]);
  return <Toast open={!!change} onClose={dismissLocationLinkChange} tone="awareness">
    {change && <>
      <span>PLZ aus dem Link übernommen: {change.next} statt {change.previous}.</span>{" "}
      <span style={{ whiteSpace: "nowrap" }}><button type="button" onClick={change.undo} style={{ color: "inherit", font: "inherit", fontWeight: 700, background: "none", border: 0, padding: "8px 0", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }}>Rückgängig</button>{" "}
      <span aria-hidden="true" style={{ fontVariantNumeric: "tabular-nums", color: v("--color-awareness") }}>({remaining} s)</span></span>
    </>}
  </Toast>;
}
