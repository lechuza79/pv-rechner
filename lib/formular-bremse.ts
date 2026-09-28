// ─── Brakes for public forms that trigger a mail to a third party ─────────────
//
// Two cheap signals against form-filling bots, shared so that every form uses
// the same field name and the same threshold:
//
//  • Honeypot: the hidden field "website". Humans never see it; bots that fill
//    every field trip it.
//  • Minimum fill time: the client sends the moment the form was opened
//    (epoch ms). A request that arrives faster than a human can type — or
//    without the timestamp at all — is treated as a bot.
//
// Callers answer a tripped brake with a FAKE success and send nothing, so the
// bot does not learn which signal gave it away (same rule as the contact form
// and the subscription route).

/** Name of the hidden honeypot field — identical in every form. */
export const HONIGTOPF_FELD = "website";
/** Name of the field carrying the moment the form was opened (epoch ms). */
export const GEOEFFNET_FELD = "geoeffnetAm";
/** Faster than this, no human has filled a multi-field form. */
export const MIN_FUELLZEIT_MS = 3000;
/** Tolerance for client clocks that run slightly ahead of the server. */
const UHR_TOLERANZ_MS = 60_000;

export function honigtopfGefuellt(payload: Record<string, unknown>): boolean {
  const wert = payload[HONIGTOPF_FELD];
  return typeof wert === "string" && wert.trim().length > 0;
}

/**
 * True if the form was sent too fast to come from a human, or without a
 * plausible opening timestamp.
 */
export function zuSchnellAusgefuellt(payload: Record<string, unknown>, jetzt: number = Date.now()): boolean {
  const geoeffnet = payload[GEOEFFNET_FELD];
  if (typeof geoeffnet !== "number" || !Number.isFinite(geoeffnet)) return true;
  if (geoeffnet > jetzt + UHR_TOLERANZ_MS) return true;
  return jetzt - geoeffnet < MIN_FUELLZEIT_MS;
}

/** One question for the route: should this request be silently dropped? */
export function istVermutlichBot(payload: Record<string, unknown>, jetzt: number = Date.now()): boolean {
  return honigtopfGefuellt(payload) || zuSchnellAusgefuellt(payload, jetzt);
}
