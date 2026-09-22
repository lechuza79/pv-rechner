import { sichtbarerText } from "./funding-screen-erkennung";

export type SourceFailure = "network" | "blocked" | "missing" | "server" | "unsupported" | "empty" | "shell" | "redirected";
export function sourceFailure(status: number, contentType: string, html: string, requested: string, final: string): SourceFailure | null {
  if (!status) return "network";
  if (status === 403 || status === 429) return "blocked";
  if (status === 404 || status === 410) return "missing";
  if (status < 200 || status >= 300) return "server";
  if (/xml/i.test(contentType) && !/html/i.test(contentType)) return html.trim() ? null : "empty";
  if (!/text\/html/i.test(contentType)) return "unsupported";
  const text = sichtbarerText(html);
  if (!text) return "empty";
  // A fetched shell is not a negative funding finding. Challenge markers must
  // describe the page itself, not an incidental link to a privacy notice.
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").toLowerCase();
  if (/just a moment|access denied|checking your browser|security verification/.test(title)) return "blocked";
  if (/seite (?:befindet sich im umbau|ist umgezogen)|website (?:has moved|ist umgezogen)/.test(text)) return "shell";
  if (text.length < 300 && /enable javascript|javascript (?:aktivieren|einschalten)|loading[,.…]|please wait|bitte warten/.test(text)) return "shell";
  try {
    const from = new URL(requested), to = new URL(final);
    const generic = /^\/(?:|(?:stiftung\/)?(?:u[eü]ber-uns|uber-uns|about|startseite|home)(?:\/|\.html)?)$/i;
    if (from.pathname.replace(/\/$/, "") !== to.pathname.replace(/\/$/, "") && generic.test(to.pathname)) return "redirected";
  } catch { return "redirected"; }
  return null;
}

/**
 * NOLIS municipal portals (e.g. amtboizenburgland.de) put a notice page in
 * front of every deep link while a "Wichtiger Hinweis" is active: the request
 * is redirected to `/?ruri=<path>%3Fvs%3D1`, and that page links onward to
 * `<path>?vs=1`, which serves the requested page. Without following it, every
 * source of the portal read as "redirected" and could never be quittiert.
 * Only a same-origin target whose path is the requested path is followed —
 * never an arbitrary address taken from the page.
 */
export function noticeBypassTarget(requested: string, final: string): string | null {
  try {
    const from = new URL(requested), to = new URL(final);
    if (to.origin.replace("://www.", "://") !== from.origin.replace("://www.", "://")) return null;
    if (to.pathname.replace(/\/$/, "") !== "") return null;
    const ruri = to.searchParams.get("ruri");
    if (!ruri || !ruri.startsWith("/")) return null;
    const target = new URL(ruri, to.origin);
    if (target.origin !== to.origin) return null;
    if (target.pathname.replace(/\/$/, "") !== from.pathname.replace(/\/$/, "")) return null;
    if (target.searchParams.get("vs") !== "1") return null;
    return target.toString();
  } catch { return null; }
}

// Operational retry windows, not assertions about program validity: network
// failures get tomorrow's run; blocks/shells get a weekly alternate-path review;
// removed URLs need rediscovery rather than daily hammering of a dead path.
export function retryAt(reason: SourceFailure, at: string): string {
  const days = reason === "missing" ? 30 : ["blocked", "shell", "redirected", "unsupported"].includes(reason) ? 7 : 1;
  return new Date(Date.parse(at) + days * 86400_000).toISOString();
}

export type DiscoveryRecord = { website?: string | null; verdikt: string; such_version: number | null; checked_at?: string | null };
export const DISCOVERY_REVIEW_DAYS = 30;
export function discoveryDue(record: DiscoveryRecord | undefined, website: string, version: number, now: string): boolean {
  if (!record || record.website !== website) return true;
  if (record.verdikt === "unerreichbar") return true; // retry policy is applied separately
  if ((record.such_version ?? 1) < version) return true;
  const age = Date.parse(now) - Date.parse(record.checked_at ?? "");
  const days = record.verdikt === "unvollstaendig" ? 7 : DISCOVERY_REVIEW_DAYS;
  return !Number.isFinite(age) || age >= days * 86400_000;
}
