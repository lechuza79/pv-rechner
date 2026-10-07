/**
 * Key figures per sending ("Aussendung"), with FAIR time windows.
 *
 * WHY: a total "since the send" makes a two-day-old sending look worse than a
 * month-old one by construction. Every figure here is therefore also counted in
 * fixed windows after the send day (2, 7, 28 days), and a window that has not
 * elapsed yet says so ("noch offen") instead of showing a number that only
 * looks smaller.
 *
 * EVERYTHING IS DATED, so the table is computable retroactively — no snapshot
 * table. Pure functions only; loading lives in lib/aussand-kennzahlen-server.ts.
 *
 * ATTRIBUTION OF LINKS (the point of this module, tested):
 * a publication belongs to the EARLIEST sending that reached its place on or
 * before the day we first saw it — a delivered letter to exactly that region,
 * or a delivered press mail whose `bezug` covers the place (district covers
 * municipality, in either direction). On the same day the letter wins: it
 * names the place, the press mail only its district. A publication that no
 * sending reached beforehand is attributed to nothing and counted separately.
 */
import { BUNDESLAENDER_DATEN } from "../public/shared-nav/bundeslaender.js";
import { liegtImBezug } from "./kommunen-veroeffentlichung";
import { kanalName } from "./outreach-herkunft";
import { tagInBerlin } from "./zeit";

/** Windows in days after the send day (send day counts as day 0). */
export const FENSTER_TAGE = [2, 7, 28] as const;
export type FensterTage = (typeof FENSTER_TAGE)[number];
export type Fenster = FensterTage | "bisher";
export const ALLE_FENSTER: Fenster[] = [...FENSTER_TAGE, "bisher"];
/**
 * Windows for "Seite aufgerufen". Only two: every window costs one analytics
 * query per send day and Land, and Vercel allows 400 an hour — the first build
 * with all four windows used the hour up in one run (07.10.2026). Two days is
 * the fair comparison between sendings, "bisher" the total; links cost
 * nothing and keep all windows.
 */
export const SEITE_FENSTER = [2, "bisher"] as const;
export type SeiteFenster = (typeof SEITE_FENSTER)[number];

/** A window that has not elapsed for every recipient of the sending. */
export const OFFEN = "noch offen" as const;
export type Zelle<T> = T | typeof OFFEN;

export type Brief = {
  regionId: string;
  /** Campaign id; null = a single letter outside any campaign. */
  kampagne: string | null;
  /** Send time (timestamptz). */
  gesendetAm: string;
  zugestellt: boolean;
};

export type PresseMail = {
  /** Domain of the medium the mail went to — a medium that publishes after receiving it acted on THIS mail. */
  domain?: string;
  zielgruppe: string;
  anlass: string;
  bezug: string[];
  gesendetAm: string;
  zugestellt: boolean;
};

export type Fund = {
  regionId: string;
  url: string;
  mitLink: boolean;
  /** Day we first saw it (YYYY-MM-DD); without it nothing can be attributed. */
  gesehenAb: string | null;
};

export type AussendungsArt = "brief" | "presse";

/** Stable id of a sending: one per campaign for letters, zielgruppe+anlass otherwise. */
export function briefId(kampagne: string | null): string {
  return `brief:${kampagne ?? "ohne"}`;
}
export function presseId(m: Pick<PresseMail, "zielgruppe" | "anlass">): string {
  return `presse:${m.zielgruppe}:${m.anlass}`;
}

function domainOhneWww(u: string): string {
  return u.replace(/^https?:\/\//i, "").split(/[/?#]/)[0].replace(/^www\./i, "").toLowerCase();
}

/** German calendar day of a send timestamp. */
export function sendeTag(gesendetAm: string): string {
  return tagInBerlin(new Date(gesendetAm));
}

/** Adds days to a YYYY-MM-DD date. */
export function plusTage(tag: string, n: number): string {
  const d = new Date(`${tag}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Does the window [sendTag, sendTag + W] lie entirely before today? */
export function fensterVorbei(sendTag: string, w: Fenster, heute: string): boolean {
  return w === "bisher" || plusTage(sendTag, w) < heute;
}

/** Is `tag` inside window W of a send day? */
export function imFenster(tag: string, sendTag: string, w: Fenster): boolean {
  return tag >= sendTag && (w === "bisher" || tag <= plusTage(sendTag, w));
}

export type Zuordnung = { aussendung: string; art: AussendungsArt; sendTag: string };

/**
 * The sending a publication belongs to — the earliest one that reached its
 * place on or before `gesehenAb`. Undelivered mails reached nobody.
 */
export function ordneFundZu(fund: Fund, briefe: readonly Brief[], presse: readonly PresseMail[]): Zuordnung | null {
  if (!fund.gesehenAb) return null;
  const kandidaten: (Zuordnung & { rang: number })[] = [];
  for (const b of briefe) {
    if (!b.zugestellt || b.regionId !== fund.regionId) continue;
    const tag = sendeTag(b.gesendetAm);
    if (tag <= fund.gesehenAb) kandidaten.push({ aussendung: briefId(b.kampagne), art: "brief", sendTag: tag, rang: 0 });
  }
  for (const m of presse) {
    if (!m.zugestellt || !liegtImBezug(fund.regionId, m.bezug)) continue;
    const tag = sendeTag(m.gesendetAm);
    if (tag <= fund.gesehenAb) kandidaten.push({ aussendung: presseId(m), art: "presse", sendTag: tag, rang: 1 });
  }
  // A medium that received a press mail about this place and then published
  // acted on that mail — even when the town had a letter earlier (homburg1.de
  // on Blieskastel, nachrichten-kl.de on Kaiserslautern, 07.10.2026). The
  // earliest-sending rule is for everyone else: a town's own page, or a portal
  // that picked up the town's post (gude.news on Nidda).
  const fundDomain = domainOhneWww(fund.url);
  const direkt = presse
    .filter((m) => m.zugestellt && m.domain && domainOhneWww(m.domain) === fundDomain && liegtImBezug(fund.regionId, m.bezug))
    .map((m) => ({ aussendung: presseId(m), art: "presse" as const, sendTag: sendeTag(m.gesendetAm) }))
    .filter((z) => z.sendTag <= fund.gesehenAb!)
    .sort((a, b) => a.sendTag.localeCompare(b.sendTag))[0];
  if (direkt) return direkt;
  kandidaten.sort((a, b) => (a.sendTag < b.sendTag ? -1 : a.sendTag > b.sendTag ? 1 : a.rang - b.rang));
  const erster = kandidaten[0];
  return erster ? { aussendung: erster.aussendung, art: erster.art, sendTag: erster.sendTag } : null;
}

const SOZIALE_NETZE = new Set(["Facebook", "Instagram", "LinkedIn", "X", "Threads", "YouTube", "Bluesky", "nebenan.de", "Nextdoor"]);

/** Is the publication a post in a social network (not a website)? */
export function istSozial(url: string): boolean {
  try {
    return SOZIALE_NETZE.has(kanalName(new URL(url).hostname));
  } catch {
    return false;
  }
}

export type LinkZahl = { gesamt: number; sozial: number };

export type AussendungsZeile = {
  id: string;
  art: AussendungsArt;
  label: string;
  ersterTag: string;
  letzterTag: string;
  /** Delivered mails (no bounce, no recorded non-delivery). */
  mails: number;
  /**
   * Recipients whose place page was opened, per window. null for press: a
   * press mail links the same municipal pages, so a visit cannot be traced to
   * one mail.
   */
  seite: Record<SeiteFenster, Zelle<number>> | null;
  /** Delivered recipients without an atlas page — they can never count as opened. */
  ohneSeite: number;
  links: Record<Fenster, Zelle<LinkZahl>>;
};

export type Kennzahlen = {
  zeilen: AussendungsZeile[];
  /** Publications with a link that no sending reached beforehand. */
  ohneZuordnung: { regionId: string; url: string }[];
  heute: string;
};

/** Short "20.–26.08." / "06.10." range. */
export function zeitraumText(erster: string, letzter: string): string {
  const [, m1, d1] = erster.split("-");
  const [, m2, d2] = letzter.split("-");
  if (erster === letzter) return `${d1}.${m1}.`;
  return m1 === m2 ? `${d1}.–${d2}.${m2}.` : `${d1}.${m1}.–${d2}.${m2}.`;
}

/**
 * Readable German label. Dates and Länder come from the data; only the kind of
 * sending is mapped here. An unknown id shows the id.
 */
export function aussendungsLabel(
  id: string,
  ersterTag: string,
  letzterTag: string,
  regionIds: readonly string[] = [],
): string {
  const zeit = ` (${zeitraumText(ersterTag, letzterTag)})`;
  if (id.startsWith("presse:")) {
    const [, zielgruppe, anlass] = id.split(":");
    const art: Record<string, string> = { pressemitteilung: "Pressemitteilung", update: "Update an Redaktionen" };
    const gruppe = zielgruppe === "presse" ? "Presse" : zielgruppe;
    return `${gruppe}: ${art[anlass] ?? anlass}${zeit}`;
  }
  const kampagne = id.slice("brief:".length);
  const codes = [...new Set(regionIds.map((r) => r.slice(0, 2)))].sort();
  const laender = codes.map((c) => BUNDESLAENDER_DATEN.find((b) => b.ags === c));
  const landText =
    laender.length > 3 ? laender.map((l) => l?.short ?? "?").join(", ") : laender.map((l) => l?.name ?? "?").join(", ");
  if (kampagne === "ohne") return `Einzelbrief ohne Schub${zeit}`;
  if (kampagne.startsWith("mail-")) return `Gemeinden ${landText}${zeit}`;
  if (kampagne.startsWith("kreise-")) return `Gemeinden ganzer Kreise ${landText}${zeit}`;
  return `${kampagne}${zeit}`;
}

/**
 * Assembles the table. `geoeffnet(regionId, sendTag, w)` answers whether the
 * place page of a letter recipient was opened within the window — computed by
 * the server part from the visitor statistics.
 */
export function baueKennzahlen(eingabe: {
  briefe: readonly Brief[];
  presse: readonly PresseMail[];
  funde: readonly Fund[];
  /** Region ids that have an atlas page. */
  mitSeite: ReadonlySet<string>;
  geoeffnet: (regionId: string, sendTag: string, w: Fenster) => boolean;
  heute: string;
}): Kennzahlen {
  const { briefe, presse, funde, mitSeite, geoeffnet, heute } = eingabe;

  type Empfaenger = { regionId: string | null; sendTag: string };
  const gruppen = new Map<string, { art: AussendungsArt; empfaenger: Empfaenger[]; tage: string[]; regionen: string[] }>();
  const gruppe = (id: string, art: AussendungsArt) => {
    let g = gruppen.get(id);
    if (!g) gruppen.set(id, (g = { art, empfaenger: [], tage: [], regionen: [] }));
    return g;
  };
  for (const b of briefe) {
    const g = gruppe(briefId(b.kampagne), "brief");
    const tag = sendeTag(b.gesendetAm);
    g.tage.push(tag);
    g.regionen.push(b.regionId);
    if (b.zugestellt) g.empfaenger.push({ regionId: b.regionId, sendTag: tag });
  }
  for (const m of presse) {
    const g = gruppe(presseId(m), "presse");
    const tag = sendeTag(m.gesendetAm);
    g.tage.push(tag);
    if (m.zugestellt) g.empfaenger.push({ regionId: null, sendTag: tag });
  }

  const zuordnungen = funde
    .filter((f) => f.mitLink)
    .map((f) => ({ fund: f, z: ordneFundZu(f, briefe, presse) }));

  const zeilen: AussendungsZeile[] = [];
  for (const [id, g] of gruppen) {
    const tage = [...g.tage].sort();
    // A window is open as long as it is open for ANY delivered recipient.
    const vorbei = (w: Fenster) => g.empfaenger.every((e) => fensterVorbei(e.sendTag, w, heute));

    let seite: AussendungsZeile["seite"] = null;
    if (g.art === "brief") {
      seite = {} as Record<SeiteFenster, Zelle<number>>;
      for (const w of SEITE_FENSTER) {
        seite[w] = vorbei(w)
          ? g.empfaenger.filter((e) => e.regionId && mitSeite.has(e.regionId) && geoeffnet(e.regionId, e.sendTag, w)).length
          : OFFEN;
      }
    }

    const links = {} as Record<Fenster, Zelle<LinkZahl>>;
    for (const w of ALLE_FENSTER) {
      if (!vorbei(w)) {
        links[w] = OFFEN;
        continue;
      }
      const drin = zuordnungen.filter(({ fund, z }) => z?.aussendung === id && imFenster(fund.gesehenAb!, z.sendTag, w));
      links[w] = { gesamt: drin.length, sozial: drin.filter(({ fund }) => istSozial(fund.url)).length };
    }

    zeilen.push({
      id,
      art: g.art,
      label: aussendungsLabel(id, tage[0], tage[tage.length - 1], g.regionen),
      ersterTag: tage[0],
      letzterTag: tage[tage.length - 1],
      mails: g.empfaenger.length,
      seite,
      ohneSeite: g.art === "brief" ? g.empfaenger.filter((e) => !e.regionId || !mitSeite.has(e.regionId)).length : 0,
      links,
    });
  }
  zeilen.sort((a, b) => (a.ersterTag < b.ersterTag ? -1 : a.ersterTag > b.ersterTag ? 1 : a.id.localeCompare(b.id)));

  return {
    zeilen,
    ohneZuordnung: zuordnungen.filter(({ z }) => !z).map(({ fund }) => ({ regionId: fund.regionId, url: fund.url })),
    heute,
  };
}

/** Cell as text — "noch offen" stays words, never a number. */
export function zelleText(z: Zelle<number> | null | undefined): string {
  if (z === null || z === undefined) return "–";
  return z === OFFEN ? OFFEN : String(z);
}

export function linkText(z: Zelle<LinkZahl>): string {
  if (z === OFFEN) return OFFEN;
  return z.sozial ? `${z.gesamt} (${z.sozial} sozial)` : String(z.gesamt);
}
