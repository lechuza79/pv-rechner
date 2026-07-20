import { Metadata } from "next";
import Header from "../../../components/Header";
import Breadcrumb from "../../../components/Breadcrumb";
import { v } from "../../../lib/theme";
import { allGlossaryEntries } from "../../../lib/glossary";

export const metadata: Metadata = {
  title: "Glossar – PV- & Energie-Fachbegriffe einfach erklärt",
  description:
    "Alle wichtigen Begriffe rund um Photovoltaik, Speicher und Wärmepumpe verständlich erklärt: kWp, Eigenverbrauch, Einspeisevergütung, Autarkie, Amortisation, JAZ und mehr.",
  alternates: { canonical: "/glossar" },
};

const S = {
  page: {
    background: v("--color-bg"),
    fontFamily: v("--font-text"),
    color: v("--color-text-primary"),
    minHeight: "100vh",
    padding: "20px 16px",
  },
  wrap: { maxWidth: v("--content-max-width"), margin: "0 auto" },
  back: {
    fontSize: v("--font-size-small"),
    color: v("--color-text-secondary"),
    textDecoration: "none",
    display: "inline-block",
    marginBottom: 24,
  },
  h1: {
    fontSize: v("--font-size-h1"),
    fontWeight: 800,
    letterSpacing: "-0.02em",
    color: v("--color-text-primary"),
    lineHeight: 1.2,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: v("--font-size-lead"),
    color: v("--color-text-muted"),
    marginBottom: 24,
    lineHeight: 1.6,
  },
  nav: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: 8,
    marginBottom: 28,
  },
  navLink: {
    fontSize: v("--font-size-small"),
    fontWeight: 600,
    color: v("--color-accent"),
    textDecoration: "none",
    background: v("--color-accent-dim"),
    borderRadius: v("--radius-sm"),
    padding: "4px 9px",
  },
  entry: {
    scrollMarginTop: "20px",
    borderTop: `1px solid ${v("--color-border")}`,
    paddingTop: 18,
    marginTop: 18,
  },
  term: {
    fontSize: v("--font-size-h3"),
    fontWeight: 700,
    color: v("--color-text-primary"),
    marginBottom: 8,
  },
  body: {
    fontSize: v("--font-size-body"),
    color: v("--color-text-muted"),
    lineHeight: 1.7,
  },
  aliases: {
    fontSize: v("--font-size-caption"),
    color: v("--color-text-faint"),
    marginTop: 6,
    fontFamily: v("--font-mono"),
  },
};

export default function GlossarPage() {
  const entries = allGlossaryEntries();
  return (
    <div style={S.page}>
      <Header />
      <div style={S.wrap}>
        <Breadcrumb items={[{ label: "Start", href: "/" }, { label: "Glossar" }]} jsonLd />

        <h1 style={S.h1}>Glossar</h1>
        <p style={S.subtitle}>
          Die wichtigsten Begriffe rund um Photovoltaik, Speicher und Wärmepumpe
          — in einfacher Sprache erklärt.
        </p>

        <nav style={S.nav} aria-label="Begriffe">
          {entries.map(({ slug, entry }) => (
            <a key={slug} href={`#${slug}`} style={S.navLink}>
              {entry.term}
            </a>
          ))}
        </nav>

        {entries.map(({ slug, entry }) => (
          <section key={slug} id={slug} style={S.entry}>
            <h2 style={S.term}>{entry.term}</h2>
            <p style={S.body}>{entry.long ?? entry.short}</p>
            {entry.aliases && entry.aliases.length > 0 && (
              <p style={S.aliases}>
                auch: {entry.aliases.join(" · ")}
              </p>
            )}
          </section>
        ))}

      </div>
    </div>
  );
}
