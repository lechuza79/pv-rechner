/**
 * Rewrites internal links that point at a REDIRECTED address to the address
 * the redirect ends on. The redirect table is read from next.config.js — the
 * one source for "which addresses no longer exist" — never listed here.
 *
 * Why: the design package links a few old addresses (found 28.09.2026: the
 * homepage's "Passende Anlage finden" pointed at /pv-bedarf-berechnen, which
 * 308s to /photovoltaik-rechner). Every such link costs a hop and spreads the
 * signal over two addresses, and the homepage's no-JS block copies the link
 * out of the bundle, so the crawler-visible version inherited it too.
 * Applied at takeover time (scripts/startseite-uebernehmen.mjs), where a
 * person is watching, not when a page is served.
 *
 * Only exact, unconditional redirects count: an entry with `has` (query/host
 * conditions) or a parameter in its source is not a vanished address.
 * A link only matches as a whole string literal or template tail
 * ("…", '…', ${base}…) followed by a quote, `?` or `#` — a longer path that
 * merely starts with an old one is a different page.
 *
 *   node scripts/endadressen.mjs <datei> [<datei> …]   # rewrites in place
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";

const WURZEL = resolve(dirname(new URL(import.meta.url).pathname), "..");

/** Map old address → final address, chains followed to their end. */
export async function weiterleitungsZiele() {
  const config = createRequire(import.meta.url)(join(WURZEL, "next.config.js"));
  const liste = await config.redirects();
  const direkt = new Map();
  for (const r of liste) {
    if (r.has || r.missing) continue;
    if (!r.source.startsWith("/") || r.source === "/" || /[:*(]/.test(r.source)) continue;
    if (!r.destination.startsWith("/") || /[:*(]/.test(r.destination)) continue;
    direkt.set(r.source, r.destination);
  }
  const ende = new Map();
  for (const alt of direkt.keys()) {
    let ziel = direkt.get(alt);
    const gesehen = new Set([alt]);
    while (direkt.has(ziel) && !gesehen.has(ziel)) {
      gesehen.add(ziel);
      ziel = direkt.get(ziel);
    }
    ende.set(alt, ziel);
  }
  return ende;
}

const maske = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Pattern for one old address as a link target (see header). */
export function linkMuster(alt) {
  return new RegExp(`(["'}])${maske(alt)}(?=["'?#])`, "g");
}

/** One pattern for ALL old addresses; group 2 is the old address. For
 *  scanning many files — one pattern per address is slow under load. */
export function alleLinkMuster(alte) {
  return new RegExp(`(["'}])(${[...alte].map(maske).join("|")})(?=["'?#])`, "g");
}

/** Returns the text with every redirected link replaced, plus what was replaced. */
export function aufEndadressen(text, ziele) {
  const ersetzt = [];
  for (const [alt, neu] of ziele) {
    const muster = linkMuster(alt);
    const n = (text.match(muster) ?? []).length;
    if (!n) continue;
    ersetzt.push(`${alt} → ${neu} (${n}×)`);
    text = text.replace(muster, `$1${neu}`);
  }
  return { text, ersetzt };
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop())) {
  const ziele = await weiterleitungsZiele();
  for (const datei of process.argv.slice(2)) {
    const { text, ersetzt } = aufEndadressen(readFileSync(datei, "utf8"), ziele);
    if (ersetzt.length) writeFileSync(datei, text);
    console.log(`${datei}: ${ersetzt.length ? ersetzt.join(", ") : "nichts umgeleitet"}`);
  }
}
