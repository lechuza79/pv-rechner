import { Metadata } from "next";
import ArticleTeasers from "../../../components/ArticleTeasers";
import Breadcrumb from "../../../components/Breadcrumb";
import EditorialPage from "../../../components/EditorialPage";
import editorial from "../../../components/EditorialContent.module.css";
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

export default function RatgeberPage() {
  return (
    <EditorialPage>

        <Breadcrumb variant="compact" items={[{ label: "Start", href: "/" }, { label: "Ratgeber" }]} jsonLd />

        <h1 className={editorial.h1}>PV-Ratgeber</h1>
        <p className={editorial.subtitle}>
          Verständliche Entscheidungshilfen rund um Photovoltaik — ohne Verkaufsprosa, ohne
          Anmeldung. Jeder Ratgeber rechnet seine Beispiele live mit demselben Modell wie
          unser Rechner.
        </p>

        <ArticleTeasers layout="list" items={RATGEBER.map((r) => ({
          href: r.slug, title: r.title, teaser: r.teaser, cta: "Zum Ratgeber",
        }))} />

    </EditorialPage>
  );
}
