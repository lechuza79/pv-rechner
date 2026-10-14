"use client";
import {useState} from "react";
import FormError from "../FormError";
import InfoTooltip from "../InfoTooltip";
import {EXPORT_ONLY_ATTR, EXPORT_IGNORE_ATTR} from "../../lib/export-markers";

/** Keep source details in exports even when the on-screen notice is dismissed. */
export default function EnergyDataNotice({details}: {details: string}) {
  const [dismissed, setDismissed] = useState(false);
  return <>
    <p {...{[EXPORT_ONLY_ATTR]: "block"}} style={{display: "none"}}>{details}</p>
    {!dismissed && <div {...{[EXPORT_IGNORE_ATTR]: ""}}><FormError tone="awareness" title="" onClose={() => setDismissed(true)}>
    Daten gerade nur verzögert verfügbar.{" "}
    <InfoTooltip ariaLabel="Mehr zur Datenverfügbarkeit" exportNote={false}>{details}</InfoTooltip>
  </FormError></div>}
  </>;
}
