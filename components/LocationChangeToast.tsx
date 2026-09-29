"use client";
import Toast from "./Toast";
import { dismissLocationLinkChange, useLocationLinkChange } from "../lib/location";

/** Announce an explicit link replacing the visitor's remembered location. */
export default function LocationChangeToast() {
  const change = useLocationLinkChange();
  return <Toast open={!!change} onClose={dismissLocationLinkChange} tone="awareness" autoHideMs={10000} showCountdown countdownKey={change ? `${change.previous}-${change.next}` : undefined}>
    {change && <>
      <span>PLZ aus dem Link übernommen: {change.next} statt {change.previous}.</span>{" "}
      <span style={{ whiteSpace: "nowrap" }}><button type="button" onClick={change.undo} style={{ color: "inherit", font: "inherit", fontWeight: 700, background: "none", border: 0, padding: "8px 0", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }}>Rückgängig</button>{" "}
      </span>
    </>}
  </Toast>;
}
