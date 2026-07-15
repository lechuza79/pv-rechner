import Link from "next/link";
import { ReactNode } from "react";
import { FaqEntry, FaqLink } from "../lib/faq";
import { IconChevronDown } from "./Icons";
import { v, iconSizes } from "../lib/theme";

// Visible FAQ accordion + matching FAQPage JSON-LD, both rendered from the same
// items so structured data always mirrors on-page content. Server component —
// native <details> handles expand/collapse, no client JS. The chevron rotation
// and answer reveal are pure CSS (scoped <style> below), so still zero JS.
// Answers hyperlink the explicit phrases in each entry (first occurrence) and
// can show one contextual CTA; links/CTAs pointing at `currentPath` or merely
// duplicating an inline link are suppressed.
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const linkStyle = { color: v("--color-accent"), textDecoration: "none", fontWeight: 600 };

// Scoped styles: hide the native marker, animate the chevron, reveal the answer.
const faqCss = `
.faq-heading{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--color-text-secondary);margin:0 0 6px}
.faq-item{border-bottom:1px solid var(--color-border)}
.faq-summary{cursor:pointer;list-style:none;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:15px 0;font-size:14.5px;font-weight:700;color:var(--color-text-primary);line-height:1.4}
.faq-summary::-webkit-details-marker{display:none}
.faq-chevron{flex:none;color:var(--color-text-muted);transition:transform 0.22s ease}
.faq-item[open] .faq-summary .faq-chevron{transform:rotate(180deg)}
.faq-item[open] .faq-answer{animation:faqReveal 0.22s ease-out}
@keyframes faqReveal{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
`;

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
}: {
  items: FaqEntry[];
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
    <section style={{ marginTop: 32, marginBottom: 24 }}>
      <style dangerouslySetInnerHTML={{ __html: faqCss }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <h2 className="faq-heading">{title}</h2>
      <div>
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
          return (
            <details key={item.q} className="faq-item">
              <summary className="faq-summary">
                <span>{item.q}</span>
                <span className="faq-chevron" style={{ display: "flex" }}>
                  <IconChevronDown size={iconSizes.md} />
                </span>
              </summary>
              <div className="faq-answer" style={{ paddingBottom: 16 }}>
                <p
                  style={{
                    fontSize: 13.5,
                    fontWeight: 400,
                    color: v("--color-text-muted"),
                    lineHeight: 1.7,
                    margin: "0 0 12px",
                  }}
                >
                  {linkify(item.a, links)}
                </p>
                {cta && (
                  <Link
                    href={cta.href}
                    style={{
                      display: "inline-block",
                      padding: "8px 16px",
                      borderRadius: v("--radius-md"),
                      fontSize: 13,
                      fontWeight: 700,
                      background: v("--color-accent"),
                      color: v("--color-text-on-accent"),
                      textDecoration: "none",
                    }}
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
