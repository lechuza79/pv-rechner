import Script from "next/script";
import Logo from "./Logo";
import { fussInnenHtml, vertrauenInnenHtml } from "../lib/site-fuss";
import "../public/shared-footer/footer.css";

/**
 * Trust section + footer of the new design on every React page. Same markup
 * and data as the document pages (lib/site-fuss.ts); only the brand logo is
 * the React component here, so it follows the footer's colour tokens.
 */
export default function SiteFuss({ zwischen }: { zwischen?: React.ReactNode } = {}) {
  return (
    <div data-sc-fuss>
      <section className="sc-trust" aria-label="Unsere Grundlagen" dangerouslySetInnerHTML={{ __html: vertrauenInnenHtml() }} />
      {/* Platz zwischen Vertrauensleiste und Fußzeile: Die Ortsseite stellt ihre
          Quellen dorthin — sie gehören zur Grundlage, nicht in den Inhalt. */}
      {zwischen}
      <footer className="sc-footer">
        <div className="sc-footer-wrap">
          <a className="sc-footer-brand" href="/" aria-label="Solar Check – Startseite">
            <Logo width={220} />
          </a>
          <div style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: fussInnenHtml() }} />
        </div>
      </footer>
      {/* Artwork first, then the web component that reads it. */}
      <Script src="/shared-footer/trust-badges-v7/trust-art-web.js" strategy="afterInteractive" />
      <Script src="/shared-footer/trust-badges-v7/trust-badges.js" strategy="lazyOnload" />
    </div>
  );
}
