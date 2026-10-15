"use client";
import {useState} from "react";
import FormError from "../FormError";
import {EXPORT_ONLY_ATTR, EXPORT_IGNORE_ATTR} from "../../lib/export-markers";

/** Keep source details in exports even when the on-screen notice is dismissed. */
export default function EnergyDataNotice({details, stale}: {details: string; stale: boolean}) {
  const [dismissed, setDismissed] = useState(false);
  return <>
    <p {...{[EXPORT_ONLY_ATTR]: "block"}} style={{display: "none"}}>{details}</p>
    {stale && !dismissed && <div {...{[EXPORT_IGNORE_ATTR]: ""}}><FormError tone="awareness" title="" onClose={() => setDismissed(true)}>
    Die Daten sind gerade nur verzögert verfügbar.
  </FormError></div>}
  </>;
}
