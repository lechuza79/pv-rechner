import { gemeindeDomain, ordneHerkunft } from "./outreach-herkunft";

// ─── Fremde Seiten, die auf IRGENDEINE unserer Seiten verweisen ───────────────
//
// WHY (26.09.2026): The visitor-origin check only looked at the atlas page of
// each contacted municipality. Two publications linked elsewhere and stayed
// invisible for days: the regional paper Lübecker Nachrichten linked the
// DISTRICT page (Herzogtum Lauenburg, home of Berkenthin), the city of Trier
// linked our HOME page. A publication links wherever its author thinks fits —
// so the question is asked across the whole site, and the landing page is only
// used to attribute the visit to a municipality where that is unambiguous.

export type Angeschrieben = {
  name: string;
  website: string | null;
  /** Atlas address of the municipality page, e.g. /solar-atlas/land/kreis/ort. */
  pfad: string | null;
  /** Outreach status — only used to break a tie below a district page. */
  status?: string;
};

export type FremderVerweis = {
  host: string;
  besucher: number;
  pfade: { pfad: string; besucher: number }[];
};

export type Zuordnung =
  /** Visits on the municipality's own atlas page — already counted per page. */
  | { art: "ortsseite" }
  /** Attributed to exactly one contacted municipality. */
  | { art: "gemeinde"; gemeinde: string; grund: string }
  /** Points into our site, but not to one contacted municipality. */
  | { art: "ohne-ort"; grund: string };

/**
 * Where does this foreign referrer belong? `null` = not an outreach question
 * (search engine, our own tools, mail scanners, mailboxes).
 */
export function ordneWebsiteVerweis(v: FremderVerweis, angeschriebene: readonly Angeschrieben[]): Zuordnung | null {
  const host = v.host.trim().toLowerCase().replace(/^www\./, "");
  const art = ordneHerkunft(host);
  if (art !== "veroeffentlichung" && art !== "andere") return null;

  // The municipality's own website is the strongest attribution there is,
  // wherever on our site it links to.
  for (const a of angeschriebene) {
    const d = gemeindeDomain(a.website);
    if (d && (host === d || host.endsWith(`.${d}`))) {
      return { art: "gemeinde", gemeinde: a.name, grund: `Website der Gemeinde → ${liste(v.pfade)}` };
    }
  }

  // Landing pages: a municipality page is handled by the per-page check; a
  // district or state page counts for a municipality only if exactly ONE
  // contacted municipality lies underneath it — otherwise it is a guess.
  const treffer = new Set<string>();
  let ortsseite = false;
  let andere = false;
  for (const p of v.pfade) {
    if (angeschriebene.some((a) => a.pfad === p.pfad)) {
      ortsseite = true;
      continue;
    }
    if (!p.pfad.startsWith("/solar-atlas/")) {
      andere = true;
      continue;
    }
    const darunter = angeschriebene.filter((a) => a.pfad?.startsWith(`${p.pfad}/`));
    // Several contacted places below a district page: only the one that has
    // answered or published is a plausible author — and only if it is ONE.
    const kandidaten = darunter.length === 1 ? darunter : darunter.filter((a) => a.status === "geantwortet" || a.status === "veroeffentlicht");
    if (kandidaten.length === 1) treffer.add(kandidaten[0].name);
    else andere = true;
  }
  // A source that sends people to municipality pages is counted there. A stray
  // visit to a state page next to it must not turn it into a lead for whichever
  // place happens to lie below that page (Facebook → "Aue-Bad Schlema" because
  // one visitor opened /solar-atlas/sachsen, 26.09.2026).
  if (ortsseite) return { art: "ortsseite" };
  if (treffer.size === 1) {
    const [gemeinde] = treffer;
    return { art: "gemeinde", gemeinde, grund: `verweist auf die übergeordnete Seite → ${liste(v.pfade)}` };
  }
  if (!andere && !v.pfade.length) return { art: "ohne-ort", grund: "keine Zielseite" };
  return { art: "ohne-ort", grund: liste(v.pfade) };
}

function liste(pfade: FremderVerweis["pfade"]): string {
  return pfade.map((p) => `${p.pfad} (${p.besucher})`).join(", ");
}
