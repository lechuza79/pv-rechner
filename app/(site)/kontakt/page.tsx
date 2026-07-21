import { Metadata } from "next";
import { v } from "../../../lib/theme";
import { pageMetadata } from "../../../lib/seo";
import ObfuscatedEmail from "../../../components/ObfuscatedEmail";
import ContactForm from "./ContactForm";
import BackLink from "../../../components/BackLink";

export const metadata: Metadata = pageMetadata({
  path: "/kontakt",
  title: "Kontakt – Solar Check",
  description: "So erreichst du uns. Fragen, Feedback oder Anregungen zu Solar Check.",
  ogImageTitle: "Kontakt",
  ogImageSubtitle: "Fragen, Feedback oder Anregungen? Schreib uns.",
});

const S = {
  page: {
    background: v('--color-bg'),
    fontFamily: v('--font-text'),
    color: v('--color-text-primary'),
    minHeight: "100vh",
    padding: "20px 16px",
  } as React.CSSProperties,
  wrap: { maxWidth: v('--page-max-width'), margin: "0 auto" } as React.CSSProperties,
  back: {
    fontSize: 13,
    color: v('--color-text-secondary'),
    textDecoration: "none",
    display: "inline-block",
    marginBottom: 24,
  } as React.CSSProperties,
  h1: {
    fontSize: 22,
    fontWeight: 800,
    letterSpacing: "-0.02em",
    color: v('--color-text-primary'),
    lineHeight: 1.2,
    marginBottom: 24,
  } as React.CSSProperties,
  p: {
    fontSize: 14,
    lineHeight: 1.7,
    color: v('--color-text-secondary'),
    marginBottom: 16,
  } as React.CSSProperties,
};

export default function Kontakt() {
  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <BackLink style={S.back} />
        <h1 style={S.h1}>Kontakt</h1>

        <p style={S.p}>
          Fragen, Feedback oder Verbesserungsvorschläge? Schreib uns über das Formular oder direkt per E-Mail.
        </p>

        <ContactForm />

        <p style={{ ...S.p, marginTop: 24, fontSize: 13, color: v('--color-text-muted') }}>
          Alternativ erreichst du uns direkt per E-Mail:{" "}
          <ObfuscatedEmail user="hey" domain="solar-check.io" style={{ color: v('--color-accent'), fontWeight: 600 }} />.
          {" "}Wir antworten in der Regel innerhalb von 1–2 Werktagen.
        </p>
      </div>
    </div>
  );
}
