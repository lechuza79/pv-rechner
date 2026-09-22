/**
 * Decode published anti-spam address encodings without executing page scripts.
 *
 * Measured on the stored municipal originals (17.09.2026): the legacy TYPO3
 * link encryption appears on 472 municipal sites, the ROT13 "email encoder"
 * scheme on 49. For 130 of them no address was found at all before decoding.
 * Every decode is accepted only when the result is a syntactically valid
 * address — an undecodable value stays untouched rather than guessed.
 */
import { entschluesseltOderRoh } from "./uri-sicher";

const ADDRESS = /^[\w.+%-]+@[\w-]+(?:\.[\w-]+)+$/;

/** TYPO3 `linkTo_UnCryptMailto` shifts three character ranges by a fixed offset. */
function shiftRanges(text: string, offset: number): string {
  return text.replace(/[\x2B-\x3A\x40-\x5A\x61-\x7A]/g, ch => {
    const code = ch.charCodeAt(0);
    const [lo, hi] = [[43, 58], [64, 90], [97, 122]].find(([a, b]) => code >= a && code <= b)!;
    const length = hi - lo + 1;
    return String.fromCharCode(lo + (((code - lo + offset) % length) + length) % length);
  });
}

function rot13(text: string): string {
  return text.replace(/[a-z]/gi, c => {
    const base = c <= "Z" ? 65 : 97;
    return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
  });
}

export function decodeLegacyTypo3Mailto(encoded: string): string | null {
  const value = entschluesseltOderRoh(encoded);
  // The offset is site-specific; only one offset yields a valid mailto address.
  for (let offset = -25; offset <= 25; offset++) {
    const decoded = shiftRanges(value, offset);
    if (/^mailto:/i.test(decoded) && ADDRESS.test(decoded.slice(7).split("?")[0])) return decoded;
  }
  return null;
}

/** ROT13 is only assumed when the encoded top-level domain is `.qr` (= `.de`). */
export function decodeRot13Address(encoded: string): string | null {
  const plain = encoded.replace(/\s*(?:\[at\]|\(at\))\s*/i, "@");
  const decoded = /\.qr$/i.test(plain) ? rot13(plain) : plain;
  return ADDRESS.test(decoded) ? decoded : null;
}

/**
 * GIPS, the shared web platform of many German municipal utilities, publishes
 * `<a data-encrypted href="mailto:…">` whose value is base64 over the address
 * with every byte inverted and the order reversed. Without this the press
 * office of every GIPS site looked like it had no address (Erlanger Stadtwerke,
 * measured 21.09.2026). Only a result that is a valid address is accepted.
 */
export function decodeGipsMailto(encoded: string): string | null {
  if (!/^[A-Za-z0-9+/]{8,400}={0,2}$/.test(encoded)) return null;
  const bytes = Buffer.from(encoded, "base64");
  const plain = String.fromCharCode(...[...bytes].map(b => 255 - b).reverse());
  return ADDRESS.test(plain) ? plain : null;
}

/**
 * A widespread craft-business site builder shows a shuffled address as link
 * text and carries the real one as colon-separated character codes
 * (`data-q-uncrypt="105:110:102:111:64:…"`). Without this the shuffled text
 * itself was taken as an address (measured 21.09.2026 on two businesses).
 */
export function decodeCharCodeMail(encoded: string): string | null {
  if (!/^\d{2,3}(?::\d{2,3}){5,200}$/.test(encoded)) return null;
  const plain = String.fromCharCode(...encoded.split(":").map(Number));
  return ADDRESS.test(plain) ? plain : null;
}

export function deobfuscatePublishedMail(html: string): string {
  html = html.replace(
    /href=(["'])javascript:linkTo_UnCryptMailto\((?:%27|'|&#39;)([^'&]+?)(?:%27|'|&#39;)(?:,\s*-?\d+)?\);?\1/g,
    (all, quote: string, encoded: string) => {
      const decoded = decodeLegacyTypo3Mailto(encoded);
      return decoded ? `href=${quote}${decoded}${quote}` : all;
    },
  );
  // Attribute form first: the text rule below would otherwise decode it once and
  // this rule a second time.
  html = html.replace(/<a\s([^>]*?)data-enc-email=(["'])([^"']+)\2/gi, (all, before: string, _q: string, encoded: string) => {
    const decoded = decodeRot13Address(encoded);
    return decoded ? `<a href="mailto:${decoded}" data-enc-email-decoded="1" ${before}` : all;
  });
  html = html.replace(/(?<![="'\w])([a-z0-9._-]+\s*(?:\[at\]|\(at\))\s*[a-z0-9-]+(?:\.[a-z0-9-]+)*\.qr)\b/gi, (all, encoded: string) => decodeRot13Address(encoded) ?? all);
  // Symbol substitution (for example Kerpen, Hürth): "name⚹domain◦de", also percent-encoded in links.
  html = html.replace(/%E2%9A%B9/gi, "⚹").replace(/%E2%97%A6/gi, "◦");
  html = html.replace(/([\w.+-]+)⚹([\w-]+(?:◦[\w-]+)+)/g, (all, user: string, domain: string) => {
    const decoded = `${user}@${domain.replace(/◦/g, ".")}`;
    return ADDRESS.test(decoded) ? decoded : all;
  });
  return html;
}

/**
 * Text extraction sometimes glues a label onto the address ("E-MailMax.Muster@…")
 * or a following word onto the domain ("…@example.deweb"). The repair is accepted
 * only when the repaired address is literally present in the original page.
 * `pageLower` is the lower-cased page, computed once by the caller.
 */
export function repairGluedAddress(email: string, pageLower: string): string {
  const page = pageLower;
  // Present exactly as extracted: nothing was glued.
  if (page.includes(email.toLowerCase())) return email;
  let fixed = email.replace(/^(?:e-?mail|email)(?=[a-z])/i, "");
  if (!page.includes(fixed.toLowerCase())) {
    const trimmed = fixed.replace(/(\.(?:de|com|org|net|eu|info))[a-z]+$/i, "$1");
    if (page.includes(trimmed.toLowerCase())) fixed = trimmed;
  }
  return fixed !== email && page.includes(fixed.toLowerCase()) && ADDRESS.test(fixed) ? fixed.toLowerCase() : email;
}

/**
 * Municipal directories often publish each person as a vCard download. The card
 * carries name, function, unit and mailbox in fixed fields, so it is rendered as
 * one exclusive contact card for the ordinary extraction.
 */
export function vcardToHtml(vcard: string): string | null {
  const unfolded = vcard.replace(/\r?\n[ \t]/g, "");
  if (!/BEGIN:VCARD/i.test(unfolded)) return null;
  const field = (name: string) => [...unfolded.matchAll(new RegExp(`^${name}(?:;[^:\\r\\n]*)?:(.*)$`, "gim"))]
    .map(m => m[1].replace(/\\([,;\\])/g, "$1").replace(/\\n/gi, " ").replace(/;+/g, " ").trim()).filter(Boolean);
  const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const emails = field("EMAIL").filter(e => ADDRESS.test(e));
  if (!emails.length) return null;
  const heading = [...field("ORG"), ...field("TITLE"), ...field("ROLE")].join(" – ");
  const links = emails.map(e => `<a href="mailto:${esc(e)}">${esc(e)}</a>`).join(" ");
  return `<html><head><title>${esc(field("FN")[0] ?? "vCard")}</title></head><body><main><p>${esc(field("FN").join(" "))} ${esc(heading)} ${links}</p></main></body></html>`;
}
