// Links in waitlist mails. Signed with the town subscription's token scheme
// (lib/abo-token.ts), but the signed id carries a prefix: a town-subscription
// token can never confirm or cancel a waitlist entry and vice versa — the
// prefix is part of the signed payload, not of the address it arrives at.
import { abmeldeToken, bestaetigungsToken, type TokenBefund } from "./abo-token";

const PRAEFIX = "wl-";

export function wartelisteBestaetigenLink(basis: string, id: string, jetztMs: number): string {
  return `${basis}/warteliste/bestaetigen?t=${encodeURIComponent(bestaetigungsToken(PRAEFIX + id, jetztMs))}`;
}

export function wartelisteAbmeldeLink(basis: string, id: string): string {
  return `${basis}/warteliste/abmelden?t=${encodeURIComponent(abmeldeToken(PRAEFIX + id))}`;
}

/** The waitlist id behind a checked token, or null if it is not one of ours. */
export function wartelisteId(befund: TokenBefund): string | null {
  if (!befund.ok || !befund.aboId.startsWith(PRAEFIX)) return null;
  const id = befund.aboId.slice(PRAEFIX.length);
  return /^[0-9a-f-]{36}$/.test(id) ? id : null;
}
