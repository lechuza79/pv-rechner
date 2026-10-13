import { trackEvent } from "./analytics";

/** Bridge classic page scripts to the existing property-free counters. */
export function bindMunicipalShareAnalytics(target: EventTarget) {
  const opened = () => trackEvent("gemeinde_meldung_geoeffnet");
  const copied = () => trackEvent("gemeinde_meldung_kopiert");
  target.addEventListener("municipal-message-opened", opened);
  target.addEventListener("municipal-message-copied", copied);
  return () => {
    target.removeEventListener("municipal-message-opened", opened);
    target.removeEventListener("municipal-message-copied", copied);
  };
}
