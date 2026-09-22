// ─── Veröffentlichungen der angeschriebenen Gemeinden: eine Zeile je Beitrag ──
//
// WARUM ES DAS GIBT (22.09.2026): Eine Veröffentlichung war bis dahin nur ein
// STATUS an der Gemeinde („veröffentlicht") plus ein Satz in ihrer Notiz. Damit
// ließ sich zählen, WIE VIELE Gemeinden veröffentlicht haben, aber nicht, was:
// Nidda steht in drei Medien, Riedstadt in zwei, Berkenthin einmal mit und
// einmal ohne Link. Die Fragen „wie viele Links haben wir bekommen?" und „wie
// viel davon steht woanders als auf der Gemeindeseite?" waren nur durch Lesen
// aller Notizen zu beantworten — und genau dieses Zusammensuchen hat bei jedem
// Bericht etwas übersehen.
//
// Ein Eintrag hier ist ein BELEG: Jemand hat den Beitrag selbst gesehen. Ein
// Hinweis aus Besucherherkunft oder Websuche kommt erst hierher, wenn er
// geprüft ist (lib/kommunen-hinweise.ts). Der Status an der Gemeinde wird beim
// Eintragen mitgesetzt — ein Schreibweg, nicht zwei.

export const KANAELE = ["eigene-website", "presse", "soziales-netz", "app"] as const;
export type Kanal = (typeof KANAELE)[number];

export const KANAL_TEXT: Record<Kanal, string> = {
  "eigene-website": "Website der Gemeinde",
  presse: "Presse und Nachrichtenportale",
  "soziales-netz": "Soziale Netze",
  app: "Gemeinde-Apps",
};

export type Veroeffentlichung = {
  region_id: string;
  url: string;
  kanal: Kanal;
  /** Verweist der Beitrag auf solar-check.io? Nur dieser Teil wirkt als Link. */
  mit_link: boolean;
  /** Frühester Tag, an dem wir ihn belegen können — nicht der Erscheinungstag, den kennen wir meist nicht. */
  gesehen_ab: string | null;
  /** Steht er noch dort? Ein verschwundener Beitrag bleibt eine Veröffentlichung, aber kein Link mehr. */
  noch_online: boolean;
};

const SOZIAL = /(^|\.)(facebook\.com|linkedin\.com|instagram\.com|x\.com|twitter\.com|threads\.net|mastodon\.)/;
const APP = /(^|\.)(meindorfnet\.de|dorfpages\.de|crossiety\.|heimatinfo\.)|^app\./;

/** Domain ohne Schema und `www.`. */
function domain(url: string): string {
  return url.replace(/^https?:\/\//i, "").split(/[/?#]/)[0].replace(/^www\./i, "").toLowerCase();
}

/**
 * Welche Art Beitrag ist das? Eigene Website erkennt man an der Domain der
 * Gemeinde, NICHT am Ortsnamen in der Adresse: „heringen.de" ist die Stadt,
 * „wetterau.news/…/nidda" ein Nachrichtenportal. Eine App-Unterdomain der
 * Gemeinde (app.wallertheim.de) ist eine App, keine Website.
 */
export function ordneKanal(url: string, gemeindeWebsite: string | null): Kanal {
  const d = domain(url);
  if (SOZIAL.test(d)) return "soziales-netz";
  if (APP.test(d)) return "app";
  const eigen = gemeindeWebsite ? domain(gemeindeWebsite) : "";
  if (eigen && (d === eigen || d.endsWith(`.${eigen}`))) return "eigene-website";
  return "presse";
}

export type Bilanz = {
  /** Gemeinden, an die ein Brief ohne bekannten Zustellfehler hinausging. */
  angeschrieben: number;
  /** Gemeinden mit mindestens einer belegten Veröffentlichung. */
  gemeinden: number;
  /** Beiträge insgesamt. */
  beitraege: number;
  /** Beiträge mit Link auf uns, und davon noch erreichbar. */
  mitLink: number;
  mitLinkOnline: number;
  jeKanal: Record<Kanal, number>;
  /** Beiträge, die NICHT auf der Seite der Gemeinde stehen. */
  woanders: number;
  /** Anteil der angeschriebenen Gemeinden mit Veröffentlichung, 0–1. */
  quote: number;
  jeGemeinde: { region_id: string; beitraege: number; mitLink: number; kanaele: Kanal[] }[];
};

/**
 * Die Zählung an EINER Stelle — Kommandozeile und Übersichtsseite lesen beide
 * hier. Der Nenner sind die angeschriebenen Gemeinden OHNE bekannten
 * Zustellfehler: Ein Brief, der nie ankam, kann nichts bewirken, und ihn
 * mitzuzählen drückte die Quote um eine Ursache, die mit dem Brief nichts zu
 * tun hat.
 */
export function bilanz(veroeffentlichungen: Veroeffentlichung[], angeschrieben: number): Bilanz {
  const jeKanal = Object.fromEntries(KANAELE.map((k) => [k, 0])) as Record<Kanal, number>;
  const je = new Map<string, { beitraege: number; mitLink: number; kanaele: Set<Kanal> }>();
  for (const v of veroeffentlichungen) {
    jeKanal[v.kanal]++;
    const g = je.get(v.region_id) ?? { beitraege: 0, mitLink: 0, kanaele: new Set<Kanal>() };
    g.beitraege++;
    if (v.mit_link) g.mitLink++;
    g.kanaele.add(v.kanal);
    je.set(v.region_id, g);
  }
  const mitLink = veroeffentlichungen.filter((v) => v.mit_link).length;
  return {
    angeschrieben,
    gemeinden: je.size,
    beitraege: veroeffentlichungen.length,
    mitLink,
    mitLinkOnline: veroeffentlichungen.filter((v) => v.mit_link && v.noch_online).length,
    jeKanal,
    woanders: veroeffentlichungen.length - jeKanal["eigene-website"],
    quote: angeschrieben ? je.size / angeschrieben : 0,
    jeGemeinde: [...je]
      .map(([region_id, g]) => ({ region_id, beitraege: g.beitraege, mitLink: g.mitLink, kanaele: [...g.kanaele] }))
      .sort((a, b) => b.beitraege - a.beitraege || b.mitLink - a.mitLink),
  };
}

/** Prozent mit einer Nachkommastelle — bei 7 von 285 ist „2 %" schon eine Rundung, die täuscht. */
export function quoteText(q: number): string {
  return `${(q * 100).toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
}

export const VEROEFFENTLICHUNG_DDL = `
  create table if not exists kommunen_veroeffentlichung (
    id uuid primary key default gen_random_uuid(),
    region_id text not null,
    url text not null,
    kanal text not null check (kanal in ('eigene-website','presse','soziales-netz','app')),
    mit_link boolean not null,
    gesehen_ab date,
    noch_online boolean not null default true,
    notiz text,
    erfasst_am timestamptz not null default now(),
    unique (region_id, url)
  );
  alter table kommunen_veroeffentlichung enable row level security;
  revoke all on kommunen_veroeffentlichung from anon, authenticated;
`;
