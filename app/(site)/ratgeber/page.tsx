import { Metadata } from "next";
import ArticleTeasers from "../../../components/ArticleTeasers";
import Breadcrumb from "../../../components/Breadcrumb";
import { v } from "../../../lib/theme";
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
  wrap: { maxWidth: v("--content-max-width"), containerType: "inline-size", margin: "0 auto", paddingTop: "var(--content-lede-top)" },
  h1: { color: v("--color-text-primary"), marginBottom: 10 },
  subtitle: {
    fontSize: v("--font-size-lead"),
    color: v("--color-text-muted"),
    marginBottom: 28,
    lineHeight: 1.6,
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

        <ArticleTeasers layout="list" items={RATGEBER.map((r) => ({
          href: r.slug, title: r.title, teaser: r.teaser, cta: "Zum Ratgeber",
        }))} />
      </div>
    </div>
  );
}
