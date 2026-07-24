import { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "../../../components/Breadcrumb";
import { IconArrowRight } from "../../../components/Icons";
import { v, iconSizes } from "../../../lib/theme";
import { pageMetadata } from "../../../lib/seo";
import { RATGEBER } from "../../../lib/ratgeber";

export function generateMetadata(): Metadata {
  return pageMetadata({
    path: "/ratgeber",
    title: "PV-Ratgeber — ehrliche Entscheidungshilfen zu Photovoltaik",
    description:
      "Unsere Ratgeber zu Photovoltaik: verständlich, ohne Verkaufsprosa, mit live gerechneten Beispielen. Speicher, Einspeisevergütung und mehr.",
    ogImageTitle: "PV-Ratgeber",
    ogImageSubtitle: "Ehrliche Entscheidungshilfen statt Verkaufsprosa.",
  });
}

const S = {
  page: {
    background: v("--color-bg"),
    fontFamily: v("--font-text"),
    color: v("--color-text-primary"),
    minHeight: "100vh",
    padding: "0 16px 20px",
  },
  wrap: { maxWidth: v("--content-max-width"), margin: "0 auto", paddingTop: "var(--content-lede-top)" },
  h1: {
    fontSize: v("--font-size-h1"),
    fontWeight: 800,
    letterSpacing: "-0.02em",
    color: v("--color-text-primary"),
    lineHeight: 1.25,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: v("--font-size-lead"),
    color: v("--color-text-muted"),
    marginBottom: 28,
    lineHeight: 1.6,
  },
  list: { display: "grid", gap: 14 },
  card: {
    display: "block",
    background: v("--color-bg"),
    border: `1px solid ${v("--color-border")}`,
    borderRadius: v("--radius-lg"),
    padding: "18px 20px",
    textDecoration: "none",
    color: "inherit",
  },
  cardTitle: {
    fontSize: v("--font-size-h3"),
    fontWeight: 700,
    color: v("--color-text-primary"),
    marginBottom: 6,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  cardTeaser: {
    fontSize: v("--font-size-body"),
    color: v("--color-text-muted"),
    lineHeight: 1.6,
    marginBottom: 10,
  },
  cardCta: {
    fontSize: v("--font-size-small"),
    fontWeight: 700,
    color: v("--color-accent"),
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  },
} as const;

export default function RatgeberPage() {
  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <Breadcrumb items={[{ label: "Start", href: "/" }, { label: "Ratgeber" }]} jsonLd />

        <h1 style={S.h1}>PV-Ratgeber</h1>
        <p style={S.subtitle}>
          Verständliche Entscheidungshilfen rund um Photovoltaik — ohne Verkaufsprosa, ohne
          Anmeldung. Jeder Ratgeber rechnet seine Beispiele live mit demselben Modell wie
          unser Rechner.
        </p>

        <div style={S.list}>
          {RATGEBER.map((r) => (
            <Link key={r.slug} href={r.slug} style={S.card}>
              <div style={S.cardTitle}>{r.title}</div>
              <p style={S.cardTeaser}>{r.teaser}</p>
              <span style={S.cardCta}>
                Zum Ratgeber <IconArrowRight size={iconSizes.sm} />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
