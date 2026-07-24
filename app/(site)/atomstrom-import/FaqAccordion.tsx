import Link from "next/link";
import { ReactNode } from "react";
import { GLOSSARY } from "../../../lib/glossary";
import { v } from "../../../lib/theme";

export interface AccordionItem {
  q: string;
  /** Jargon-free short answer, rendered bold. Omitted for pure methodology items. */
  short?: string;
  /** Erläuterung — glossary terms are auto-linked here (never in `short`). */
  long: string;
}

// Only these energy terms get auto-linked inside Erläuterung bodies. Scoped tight
// on purpose: linking PV base terms (kWh, Eigenverbrauch, …) would add noise in
// this atom/energy fact-check context. Terms are linked on first occurrence only.
const LINK_SLUGS = [
  "arenh",
  "blackout",
  "dunkelflaute",
  "grenzkosten",
  "grundlastfaehig",
  "kapazitaetsmechanismus",
  "merit-order",
  "redispatch",
  "residuallast",
  "saidi",
];

interface Phrase {
  phrase: string;
  slug: string;
}

// term + aliases → slug, longest phrase first so specific matches win over generic.
const PHRASES: Phrase[] = (() => {
  const list: Phrase[] = [];
  for (const slug of LINK_SLUGS) {
    const entry = GLOSSARY[slug];
    if (!entry) continue;
    list.push({ phrase: entry.term, slug });
    for (const alias of entry.aliases ?? []) list.push({ phrase: alias, slug });
  }
  return list.sort((a, b) => b.phrase.length - a.phrase.length);
})();

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const PATTERN = new RegExp(
  `\\b(${PHRASES.map((p) => escapeRe(p.phrase)).join("|")})\\b`,
  "gi",
);

const linkStyle = { color: v("--color-accent"), textDecoration: "none", fontWeight: 600 };

/** Split text into plain runs + glossary links (first occurrence per term). */
function linkify(text: string): ReactNode[] {
  const linked = new Set<string>();
  const out: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  PATTERN.lastIndex = 0;
  while ((m = PATTERN.exec(text)) !== null) {
    const matchText = m[0];
    const phrase = PHRASES.find((p) => p.phrase.toLowerCase() === matchText.toLowerCase());
    // Unknown match or term already linked earlier → leave as plain text.
    if (!phrase || linked.has(phrase.slug)) continue;
    if (m.index > last) out.push(text.slice(last, m.index));
    linked.add(phrase.slug);
    out.push(
      <Link key={`${phrase.slug}-${m.index}`} href={`/glossar#${phrase.slug}`} style={linkStyle}>
        {matchText}
      </Link>,
    );
    last = m.index + matchText.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

const S = {
  item: {
    borderBottom: `1px solid ${v("--color-border")}`,
  },
  summary: {
    cursor: "pointer",
    listStyle: "none",
    padding: "14px 0",
    fontSize: v("--font-size-h3"),
    fontWeight: 700,
    color: v("--color-text-primary"),
    lineHeight: 1.35,
  },
  answer: {
    paddingBottom: 16,
  },
  short: {
    fontSize: v("--font-size-body"),
    fontWeight: 700,
    color: v("--color-text-primary"),
    lineHeight: 1.6,
    margin: "0 0 12px",
  },
  long: {
    fontSize: v("--font-size-body"),
    fontWeight: 400,
    color: v("--color-text-muted"),
    lineHeight: 1.7,
    margin: 0,
  },
};

export default function FaqAccordion({ items }: { items: AccordionItem[] }) {
  return (
    <div>
      {items.map((item) => (
        <details key={item.q} style={S.item}>
          <summary style={S.summary}>{item.q}</summary>
          <div style={S.answer}>
            {item.short && <p style={S.short}>{item.short}</p>}
            <p style={S.long}>{linkify(item.long)}</p>
          </div>
        </details>
      ))}
    </div>
  );
}
