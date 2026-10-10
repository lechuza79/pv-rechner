import Link from "next/link";
import { ReactNode } from "react";
import { FaqEntry, FaqLink } from "../lib/faq";
import { FAQ_CSS } from "../lib/faq-design";
import { faqContentGap } from "../lib/theme";
import { jsonLdHtml } from "../lib/json-ld";

// Visible FAQ accordion + matching FAQPage JSON-LD, both rendered from the same
// items so structured data always mirrors on-page content. Server component —
// native <details> handles expand/collapse, no client JS. The chevron rotation
// and answer reveal are pure CSS (scoped <style> below), so still zero JS.
// Answers hyperlink the explicit phrases in each entry (first occurrence) and
// can show one contextual CTA; links/CTAs pointing at `currentPath` or merely
// duplicating an inline link are suppressed.
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const linkStyle = { color: "inherit" };

/** Replace the first occurrence of each phrase in `text` with a link. */
function linkify(text: string, links: FaqLink[]): ReactNode[] {
  if (!links.length) return [text];
  // Longest phrase first so a specific phrase wins over a shorter substring.
  const ordered = [...links].sort((a, b) => b.phrase.length - a.phrase.length);
  let nodes: ReactNode[] = [text];
  for (const link of ordered) {
    const re = new RegExp(escapeRe(link.phrase));
    const next: ReactNode[] = [];
    let replaced = false;
    for (const node of nodes) {
      if (replaced || typeof node !== "string") {
        next.push(node);
        continue;
      }
      const m = node.match(re);
      if (!m || m.index === undefined) {
        next.push(node);
        continue;
      }
      const before = node.slice(0, m.index);
      const after = node.slice(m.index + link.phrase.length);
      if (before) next.push(before);
      next.push(
        <Link key={`${link.href}-${m.index}`} href={link.href} style={linkStyle}>
          {link.phrase}
        </Link>,
      );
      if (after) next.push(after);
      replaced = true;
    }
    nodes = next;
  }
  return nodes;
}

export default function Faq({
  items,
  title = "Häufige Fragen",
  currentPath,
  theme = "light",
  jsonLd: emitJsonLd = true,
}: {
  items: FaqEntry[];
  /** Emit this block's own FAQPage JSON-LD. A page that shows several FAQ
   *  groups sets this to false and publishes ONE FAQPage over all groups —
   *  several FAQPage blocks on one page are duplicates for search engines. */
  jsonLd?: boolean;
  theme?: "light" | "dark";
  title?: string;
  /** Path of the page this FAQ renders on. Links/CTAs pointing here are
   *  suppressed — no point sending a reader to the page they're already on. */
  currentPath?: string;
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    // Abstand aus faqContentGap (lib/theme) — dieselbe Quelle nutzt das
    // Akkordeon der Atomstrom-Seite, sonst driften die beiden FAQ-Bausteine.
    <section className="sc-faq" data-theme={theme} data-layout={theme === "light" ? "inline" : undefined} style={{ marginTop: faqContentGap, marginBottom: 24 }}>
      <style dangerouslySetInnerHTML={{ __html: FAQ_CSS }} />
      {emitJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdHtml(jsonLd) }}
        />
      )}
      <h2>{title}</h2>
      <div className="sc-faq-wrap">
        {items.map((item) => {
          // Don't link the page we're already on.
          const links = (item.links ?? []).filter((l) => l.href !== currentPath);
          // Show the CTA only when it adds a destination: not the current page,
          // and not a duplicate of a phrase already linked inline in the answer.
          const cta =
            item.cta &&
            item.cta.href !== currentPath &&
            !links.some((l) => l.href === item.cta!.href)
              ? item.cta
              : undefined;
          // A blank line in `a` starts a new paragraph. Each link still fires
          // only once: in the first paragraph that contains its phrase.
          let remaining = links;
          const paragraphs = item.a.split(/\n\s*\n/).map((text) => {
            const own = remaining.filter((l) => text.includes(l.phrase));
            remaining = remaining.filter((l) => !own.includes(l));
            return linkify(text, own);
          });
          return (
            <details key={item.q} className="faq-item">
              <summary className="faq-summary">
                <span>{item.q}</span>
              </summary>
              <div className="sc-faq-answer">
                {paragraphs.map((nodes, i) => (
                  <p key={i}>{nodes}</p>
                ))}
                {cta && (
                  <Link
                    href={cta.href}
                    className="sc-faq-cta"
                  >
                    {cta.label} →
                  </Link>
                )}
              </div>
            </details>
          );
        })}
      </div>
    </section>
  );
}
