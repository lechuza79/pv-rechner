// ─── Fetching a third-party image through our own server ──────────────────────
//
// Why this exists: the installer partner page (/fuer/<kennung>) shows the
// installer's logo. Loading it directly from his server would hand every
// visitor's IP address to a third party before they clicked anything (Legal
// checklist 2 — same rule as the shop product images). So the page points its
// <img> at /api/fachbetrieb-logo/<kennung>, and THIS module fetches the image
// server-side.
//
// That turns our server into something that fetches a URL it did not choose
// itself — the classic SSRF shape. The URL comes from our database (read off
// the installer's own homepage), never from the request, but the installer
// controls the target and every redirect behind it. Hence, per hop:
//   · http/https only, standard ports only, no credentials in the URL
//   · every DNS answer must be a PUBLIC address (no loopback, private,
//     link-local incl. the cloud metadata service, CGNAT, multicast, …)
//   · the connection is PINNED to the address we checked — resolving again at
//     connect time would let a rebinding DNS server swap in 127.0.0.1
//   · at most 3 redirects, each one checked like the first
// And for the answer: size cap, timeout, raster formats only by magic bytes.
// SVG is refused on purpose — served from our domain it could carry script.
//
// Pure core + injected I/O so the guard itself is under test, not a stub of it.

import { bildArtAusSignatur } from "./fachbetrieb-anfrage-fotos";

export const FREMDBILD_MAX_BYTES = 512 * 1024;
export const FREMDBILD_MAX_WEITERLEITUNGEN = 3;
export const FREMDBILD_TIMEOUT_MS = 5_000;

export type FremdbildTyp = "image/png" | "image/jpeg" | "image/webp" | "image/gif" | "image/x-icon";

/** One DNS answer. */
export type Adresse = { address: string; family: 4 | 6 };

/** Resolves a host name to ALL its addresses (like dns.lookup with all: true). */
export type Aufloeser = (host: string) => Promise<Adresse[]>;

/** Raw answer of one hop. `body` is at most `maxBytes + 1` long. */
export type Hop = { status: number; location: string | null; body: Uint8Array };

/**
 * Opens ONE hop, connecting to exactly the given (already checked) address.
 * Must not follow redirects and must stop reading after `maxBytes + 1` bytes.
 */
export type Oeffner = (url: URL, adresse: Adresse, maxBytes: number, timeoutMs: number) => Promise<Hop>;

// ─── Address classification ─────────────────────────────────────────────────

function ipv4Teile(ip: string): number[] | null {
  const m = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return null;
  const t = m.slice(1).map(Number);
  return t.every((n) => n <= 255) ? t : null;
}

function ipv4Oeffentlich([a, b, c]: number[]): boolean {
  if (a === 0) return false; // "this network"
  if (a === 10) return false; // private
  if (a === 127) return false; // loopback
  if (a === 100 && b >= 64 && b <= 127) return false; // CGNAT
  if (a === 169 && b === 254) return false; // link-local, incl. metadata service
  if (a === 172 && b >= 16 && b <= 31) return false; // private
  if (a === 192 && b === 0 && c === 0) return false; // IETF protocol assignments
  if (a === 192 && b === 0 && c === 2) return false; // TEST-NET-1
  if (a === 192 && b === 168) return false; // private
  if (a === 198 && (b === 18 || b === 19)) return false; // benchmarking
  if (a === 198 && b === 51 && c === 100) return false; // TEST-NET-2
  if (a === 203 && b === 0 && c === 113) return false; // TEST-NET-3
  if (a >= 224) return false; // multicast, reserved, broadcast
  return true;
}

/** Expands an IPv6 literal into 8 groups; null if it is not one. */
function ipv6Gruppen(ip: string): number[] | null {
  let s = ip.toLowerCase().replace(/^\[|\]$/g, "").replace(/%.*$/, "");
  if (!s.includes(":")) return null;
  // Embedded IPv4 tail (::ffff:1.2.3.4) → two hex groups.
  const v4 = s.match(/^(.*:)(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (v4) {
    const t = ipv4Teile(v4[2]);
    if (!t) return null;
    s = `${v4[1]}${((t[0] << 8) | t[1]).toString(16)}:${((t[2] << 8) | t[3]).toString(16)}`;
  }
  const doppelt = s.split("::");
  if (doppelt.length > 2) return null;
  const links = doppelt[0] ? doppelt[0].split(":") : [];
  const rechts = doppelt.length === 2 && doppelt[1] ? doppelt[1].split(":") : [];
  const fehlend = 8 - links.length - rechts.length;
  if (doppelt.length === 1 ? fehlend !== 0 : fehlend < 1) return null;
  const alle = [...links, ...new Array(doppelt.length === 2 ? fehlend : 0).fill("0"), ...rechts];
  const gruppen = alle.map((g) => (/^[0-9a-f]{1,4}$/.test(g) ? parseInt(g, 16) : NaN));
  return gruppen.length === 8 && gruppen.every((n) => !Number.isNaN(n)) ? gruppen : null;
}

/**
 * Is this IP address a public unicast address? Anything that is not clearly an
 * IP literal counts as NOT public — the caller has to resolve names first.
 */
export function istOeffentlicheIp(ip: string): boolean {
  const v4 = ipv4Teile(ip);
  if (v4) return ipv4Oeffentlich(v4);
  const g = ipv6Gruppen(ip);
  if (!g) return false;
  if (g.every((n) => n === 0)) return false; // ::
  if (g.slice(0, 7).every((n) => n === 0) && g[7] === 1) return false; // ::1
  // IPv4-mapped (::ffff:a.b.c.d) and IPv4-compatible (::a.b.c.d): judge the IPv4.
  if (g.slice(0, 5).every((n) => n === 0) && (g[5] === 0xffff || g[5] === 0)) {
    return ipv4Oeffentlich([g[6] >> 8, g[6] & 0xff, g[7] >> 8, g[7] & 0xff]);
  }
  if (g[0] === 0x64 && g[1] === 0xff9b) {
    // NAT64 well-known prefix: judge the embedded IPv4.
    return ipv4Oeffentlich([g[6] >> 8, g[6] & 0xff, g[7] >> 8, g[7] & 0xff]);
  }
  if ((g[0] & 0xfe00) === 0xfc00) return false; // unique local fc00::/7
  if ((g[0] & 0xffc0) === 0xfe80) return false; // link-local fe80::/10
  if ((g[0] & 0xffc0) === 0xfec0) return false; // site-local (deprecated)
  if ((g[0] & 0xff00) === 0xff00) return false; // multicast
  if (g[0] === 0x2001 && g[1] === 0x0db8) return false; // documentation
  if (g[0] === 0x2002) return false; // 6to4 can tunnel to any IPv4 — refuse
  if (g[0] === 0x2001 && g[1] === 0) return false; // Teredo, same reason
  return true;
}

// ─── URL + DNS check for one hop ────────────────────────────────────────────

/**
 * Checks one hop's URL and returns the address to connect to, or null.
 * EVERY resolved address must be public: if a name answers with one public and
 * one private address, a later connection could pick the private one.
 */
export async function pruefeZiel(roh: string, aufloesen: Aufloeser): Promise<{ url: URL; adresse: Adresse } | null> {
  let url: URL;
  try {
    url = new URL(roh);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.username || url.password) return null;
  // Standard ports only: a favicon on :6379 is not a favicon.
  if (url.port && url.port !== (url.protocol === "https:" ? "443" : "80")) return null;

  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (!host) return null;

  let adressen: Adresse[];
  if (ipv4Teile(host)) adressen = [{ address: host, family: 4 }];
  else if (ipv6Gruppen(host)) adressen = [{ address: host, family: 6 }];
  else {
    try {
      adressen = await aufloesen(host);
    } catch {
      return null;
    }
  }
  if (adressen.length === 0) return null;
  if (!adressen.every((a) => istOeffentlicheIp(a.address))) return null;
  return { url, adresse: adressen[0] };
}

// ─── Image type by magic bytes ──────────────────────────────────────────────

/**
 * Raster formats a browser shows in an <img>. Reuses the photo signature check
 * of the installer request (JPEG/PNG/WebP) and adds the two favicon formats.
 * HEIC is dropped (browsers do not render it); SVG never matches — it is text.
 */
export function fremdbildTyp(b: Uint8Array): FremdbildTyp | null {
  const art = bildArtAusSignatur(b);
  if (art === "jpeg") return "image/jpeg";
  if (art === "png") return "image/png";
  if (art === "webp") return "image/webp";
  if (b.length >= 6) {
    const kopf = String.fromCharCode(...b.subarray(0, 6));
    if (kopf === "GIF87a" || kopf === "GIF89a") return "image/gif";
  }
  // ICO: reserved 0, type 1, image count ≥ 1.
  if (b.length >= 6 && b[0] === 0 && b[1] === 0 && b[2] === 1 && b[3] === 0 && (b[4] | (b[5] << 8)) >= 1) {
    return "image/x-icon";
  }
  return null;
}

// ─── The whole fetch ────────────────────────────────────────────────────────

export type Fremdbild = { typ: FremdbildTyp; bytes: Uint8Array };

/**
 * Fetches an image under all the rules above. Any failure — bad URL, private
 * address, too many redirects, wrong status, too big, not a raster image —
 * returns null. The caller answers 404 and the page shows no logo.
 */
export async function holeFremdbild(
  start: string,
  io: { aufloesen: Aufloeser; oeffnen: Oeffner },
  grenzen: { maxBytes?: number; maxWeiterleitungen?: number; timeoutMs?: number } = {},
): Promise<Fremdbild | null> {
  const maxBytes = grenzen.maxBytes ?? FREMDBILD_MAX_BYTES;
  const maxWeiter = grenzen.maxWeiterleitungen ?? FREMDBILD_MAX_WEITERLEITUNGEN;
  const timeoutMs = grenzen.timeoutMs ?? FREMDBILD_TIMEOUT_MS;

  let aktuell = start;
  for (let hop = 0; hop <= maxWeiter; hop++) {
    const ziel = await pruefeZiel(aktuell, io.aufloesen);
    if (!ziel) return null;

    let antwort: Hop;
    try {
      antwort = await io.oeffnen(ziel.url, ziel.adresse, maxBytes, timeoutMs);
    } catch {
      return null;
    }

    if (antwort.status >= 300 && antwort.status < 400) {
      if (!antwort.location) return null;
      try {
        aktuell = new URL(antwort.location, ziel.url).toString();
      } catch {
        return null;
      }
      continue; // the next iteration checks the new target like the first
    }
    if (antwort.status !== 200) return null;
    if (antwort.body.length > maxBytes) return null;
    const typ = fremdbildTyp(antwort.body);
    return typ ? { typ, bytes: antwort.body } : null;
  }
  return null; // redirect budget exhausted
}
