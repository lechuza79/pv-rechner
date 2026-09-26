import type { Metadata } from "next";
import { v } from "../../../lib/theme";
import { suche } from "../../../lib/suche";
import { searchFormHtml, searchResultsHtml } from "../../../public/shared-nav/search-content.js";

// The search result page. Two jobs: it is where the header form lands without
// JavaScript (and on Enter), and it is the address the search can be checked
// under before the magnifier appears in the menu. Results come from the same
// function and the same renderer as the header flyout — never a second layout.
//
// Not for the index: a results page per query is thin content by definition.
export const metadata: Metadata = {
  title: "Suche",
  robots: { index: false, follow: true },
};

export default async function SuchSeite(props: { searchParams: Promise<{ q?: string | string[] }> }) {
  const sp = await props.searchParams;
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q) ?? "";
  const ergebnis = await suche(q);
  return (
    <main
      style={{
        background: v("--color-bg"),
        color: v("--color-text-primary"),
        fontFamily: v("--font-text"),
        minHeight: "70vh",
        padding: "0 16px 48px",
      }}
    >
      <div style={{ maxWidth: 1120, margin: "0 auto", paddingTop: "var(--content-lede-top)" }}>
        <h1 style={{ marginBottom: 24 }}>Suche</h1>
        <div className="sc-search-page">
          <div className="sc-search-panel">
            <div dangerouslySetInnerHTML={{ __html: searchFormHtml(q, "sc-search-page-input") }} />
            <div className="sc-search-results" dangerouslySetInnerHTML={{ __html: searchResultsHtml(ergebnis) }} />
          </div>
        </div>
      </div>
    </main>
  );
}
