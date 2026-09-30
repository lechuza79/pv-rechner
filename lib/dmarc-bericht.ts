/**
 * DMARC aggregate reports: unpack, read, judge.
 *
 * Mail providers (Google, WEB.DE, Yahoo, Microsoft) send a daily XML report
 * for every domain whose DMARC record names a `rua` address. It says how many
 * mails with our domain in the From header arrived, from which server, and
 * whether they passed SPF and DKIM. Both domains on this account point their
 * reports at the outreach mailbox (dmarc@solar-check.io and
 * dmarc@life-is-a-binge.com, set up 30.09.2026); nobody reads them by hand —
 * that is the point of this module.
 *
 * Why this matters: life-is-a-binge.com publishes `p=reject`. A mail of ours
 * that fails both checks there is not filtered, it is refused, and nothing on
 * our side notices. solar-check.io is `p=none` today; the reports are what
 * would justify tightening it.
 *
 * Pure: no network, no mailbox. The script `scripts/dmarc-berichte.ts` feeds it.
 */
import { gunzipSync, inflateRawSync } from "node:zlib";

export type DmarcZeile = {
  ip: string;
  anzahl: number;
  /** What the receiver did: none / quarantine / reject. */
  behandlung: string;
  /** DMARC-aligned results as evaluated by the receiver. */
  dkim: string;
  spf: string;
  headerFrom: string;
};

export type DmarcBericht = {
  domain: string;
  absender: string;
  beginn: string; // ISO date
  ende: string; // ISO date
  policy: string;
  zeilen: DmarcZeile[];
};

/**
 * Report attachments come as .xml, .xml.gz or .zip (Google, Microsoft zip,
 * WEB.DE and Yahoo gzip). The zip holds exactly one file; a minimal reader of
 * the first local file header is enough and avoids a dependency.
 */
export function entpacke(dateiname: string, inhalt: Buffer): string | null {
  const name = dateiname.toLowerCase();
  if (name.endsWith(".gz")) return gunzipSync(inhalt).toString("utf8");
  if (name.endsWith(".zip")) {
    if (inhalt.readUInt32LE(0) !== 0x04034b50) return null;
    const methode = inhalt.readUInt16LE(8);
    const groesse = inhalt.readUInt32LE(18);
    const nameLaenge = inhalt.readUInt16LE(26);
    const extraLaenge = inhalt.readUInt16LE(28);
    const start = 30 + nameLaenge + extraLaenge;
    // Size 0 in the local header means a data descriptor follows the data;
    // inflateRaw stops at the end of the deflate stream by itself.
    const daten = inhalt.subarray(start, groesse > 0 ? start + groesse : undefined);
    if (methode === 0) return daten.toString("utf8");
    if (methode === 8) return inflateRawSync(daten).toString("utf8");
    return null;
  }
  if (name.endsWith(".xml")) return inhalt.toString("utf8");
  return null;
}

const tag = (xml: string, name: string): string => xml.match(new RegExp(`<${name}>\\s*([^<]*?)\\s*</${name}>`))?.[1] ?? "";

const iso = (sekunden: string): string => {
  const n = Number(sekunden);
  return Number.isFinite(n) && n > 0 ? new Date(n * 1000).toISOString().slice(0, 10) : "";
};

export function leseBericht(xml: string): DmarcBericht | null {
  const meta = xml.match(/<report_metadata>([\s\S]*?)<\/report_metadata>/)?.[1];
  const policy = xml.match(/<policy_published>([\s\S]*?)<\/policy_published>/)?.[1];
  if (!meta || !policy) return null;
  const zeilen: DmarcZeile[] = [...xml.matchAll(/<record>([\s\S]*?)<\/record>/g)].map(([, r]) => {
    const row = r.match(/<row>([\s\S]*?)<\/row>/)?.[1] ?? "";
    const pe = row.match(/<policy_evaluated>([\s\S]*?)<\/policy_evaluated>/)?.[1] ?? "";
    return {
      ip: tag(row, "source_ip"),
      anzahl: Number(tag(row, "count")) || 0,
      behandlung: tag(pe, "disposition") || "none",
      dkim: tag(pe, "dkim") || "fail",
      spf: tag(pe, "spf") || "fail",
      headerFrom: tag(r, "header_from"),
    };
  });
  return {
    domain: tag(policy, "domain"),
    absender: tag(meta, "org_name"),
    beginn: iso(tag(meta, "begin")),
    ende: iso(tag(meta, "end")),
    policy: tag(policy, "p"),
    zeilen,
  };
}

/** A message passes DMARC when at least one aligned check passes. */
export const bestanden = (z: DmarcZeile): boolean => z.dkim === "pass" || z.spf === "pass";

export type DomainUrteil = {
  domain: string;
  policy: string;
  mails: number;
  durchgefallen: number;
  abgewiesen: number;
  /** Failing sources, largest first — where to look. */
  quellen: { ip: string; anzahl: number; absender: string[] }[];
  /** Receivers that reported, for the log line. */
  absender: string[];
  zeitraum: { von: string; bis: string };
};

/**
 * Below this share, failures are background: forwarded mail and strangers
 * spoofing the domain show up in every report and are not our mail. Above it,
 * something of ours is probably failing. Kept deliberately low — at a few
 * hundred mails a day, 5 % is a batch of press releases.
 */
export const AUFFAELLIG_AB_ANTEIL = 0.05;
export const AUFFAELLIG_AB_MAILS = 3;

export function beurteile(berichte: readonly DmarcBericht[]): DomainUrteil[] {
  const je = new Map<string, DmarcBericht[]>();
  for (const b of berichte) je.set(b.domain, [...(je.get(b.domain) ?? []), b]);
  return [...je].map(([domain, bs]) => {
    const quellen = new Map<string, { anzahl: number; absender: Set<string> }>();
    let mails = 0, durchgefallen = 0, abgewiesen = 0;
    for (const b of bs) for (const z of b.zeilen) {
      mails += z.anzahl;
      if (z.behandlung === "reject") abgewiesen += z.anzahl;
      if (bestanden(z)) continue;
      durchgefallen += z.anzahl;
      const q = quellen.get(z.ip) ?? { anzahl: 0, absender: new Set<string>() };
      q.anzahl += z.anzahl;
      q.absender.add(b.absender);
      quellen.set(z.ip, q);
    }
    const daten = bs.flatMap((b) => [b.beginn, b.ende]).filter(Boolean).sort();
    return {
      domain,
      policy: bs[bs.length - 1].policy,
      mails,
      durchgefallen,
      abgewiesen,
      quellen: [...quellen].map(([ip, q]) => ({ ip, anzahl: q.anzahl, absender: [...q.absender] })).sort((a, b) => b.anzahl - a.anzahl),
      absender: [...new Set(bs.map((b) => b.absender))],
      zeitraum: { von: daten[0] ?? "", bis: daten[daten.length - 1] ?? "" },
    };
  });
}

export function istAuffaellig(u: DomainUrteil): boolean {
  return u.durchgefallen >= AUFFAELLIG_AB_MAILS && u.durchgefallen / Math.max(u.mails, 1) >= AUFFAELLIG_AB_ANTEIL;
}

/** Report mails are recognised by subject; every large receiver uses this form. */
export const istDmarcBericht = (betreff: string): boolean => /^report domain:/i.test(betreff.trim());
