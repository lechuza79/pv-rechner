import { Metadata } from "next";
import Faq from "../../../components/Faq";
import RelatedLinks from "../../../components/RelatedLinks";
import { einspeiseverguetungFaq } from "../../../lib/faq";
import { pageMetadata } from "../../../lib/seo";
import { v } from "../../../lib/theme";
import EinspeiseRechner from "./rechner";

export const metadata: Metadata = pageMetadata({
  path: "/einspeiseverguetung-rechner",
  title: `Einspeisevergütung-Rechner ${new Date().getFullYear()} – aktueller Satz & Jahresvergütung`,
  description:
    "Wie viel bringt die Einspeisevergütung? Aktuelle EEG-Sätze für Teil- und Volleinspeisung, gewichteter Mischsatz für größere Anlagen und die geschätzte Jahresvergütung — kostenlos, ohne Anmeldung.",
  ogImageTitle: "Was bringt die Einspeisevergütung?",
  ogImageSubtitle: "Aktuelle EEG-Sätze und Jahresvergütung — sofort berechnet.",
});

export default function EinspeiseverguetungPage() {
  return (
    <div style={{ background: v("--color-bg"), fontFamily: v("--font-text"), color: v("--color-text-primary"), minHeight: "100vh", padding: "0 16px 32px" }}>
      <div style={{ maxWidth: v("--page-max-width"), margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", color: v("--color-text-primary"), lineHeight: 1.2 }}>
            Einspeisevergütung-Rechner
          </h1>
          <p style={{ fontSize: 13, color: v("--color-text-muted"), marginTop: 6, lineHeight: 1.5 }}>
            Aktueller EEG-Satz und Jahresvergütung für deine Anlage — die Sätze folgen
            automatisch den gesetzlichen Stichtagen.
          </p>
        </div>
        <EinspeiseRechner />
        <Faq items={einspeiseverguetungFaq()} title="Häufige Fragen zur Einspeisevergütung" currentPath="/einspeiseverguetung-rechner" />
        <RelatedLinks
          currentPath="/einspeiseverguetung-rechner"
          links={[
            { href: "/photovoltaik-rechner", label: "Photovoltaik-Rechner", desc: "Amortisation, Rendite und Eigenverbrauch für deine Anlage — alle Annahmen transparent und anpassbar." },
            { href: "/ratgeber/lohnt-sich-pv-ohne-einspeiseverguetung", label: "Lohnt sich PV ohne Einspeisevergütung?", desc: "Was die geplante EEG-Reform für neue Anlagen bedeutet — und warum Eigenverbrauch die Rechnung trägt." },
            { href: "/ratgeber/lohnt-sich-pv-mit-speicher", label: "Lohnt sich PV mit Speicher?", desc: "Die ehrliche Rechnung mit aktuellen Marktpreisen — und wann sich ein Speicher wirklich rechnet." },
            { href: "/datenstand", label: "Aktuelle Werte & Annahmen" },
          ]}
        />
      </div>
    </div>
  );
}
