import { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "../../../components/Breadcrumb";
import { v } from "../../../lib/theme";
import { pageMetadata } from "../../../lib/seo";
import ObfuscatedEmail from "../../../components/ObfuscatedEmail";

export const metadata: Metadata = pageMetadata({
  path: "/impressum",
  title: "Impressum – Solar Check",
  description: "Impressum und Angaben gemäß § 5 DDG für Solar Check.",
  ogImageTitle: "Impressum",
});

const S = {
  page: {
    background: v('--color-bg'),
    fontFamily: v('--font-text'),
    color: v('--color-text-primary'),
    minHeight: "100vh",
    padding: "0 16px 20px",
  },
  wrap: { maxWidth: v('--content-max-width'), margin: "0 auto", paddingTop: "var(--content-lede-top)" },
  back: {
    fontSize: v('--font-size-small'),
    color: v('--color-text-secondary'),
    textDecoration: "none",
    display: "inline-block",
    marginBottom: 24,
  },
  h1: {
    fontSize: v('--font-size-h1'),
    fontWeight: 800,
    letterSpacing: "-0.02em",
    color: v('--color-text-primary'),
    lineHeight: 1.2,
    marginBottom: 24,
  },
  h2: {
    fontSize: v('--font-size-h2'),
    fontWeight: 700,
    color: v('--color-text-primary'),
    marginTop: 28,
    marginBottom: 10,
  },
  h3: {
    fontSize: v('--font-size-h3'),
    fontWeight: 700,
    color: v('--color-text-secondary'),
    marginTop: 20,
    marginBottom: 8,
  },
  p: {
    fontSize: v('--font-size-body'),
    color: v('--color-text-muted'),
    lineHeight: 1.7,
    marginBottom: 12,
  },
  footer: {
    marginTop: 48,
    paddingTop: 20,
    borderTop: `1px solid ${v('--color-border')}`,
    display: "flex",
    justifyContent: "center",
    gap: 20,
    fontSize: v('--font-size-small'),
  },
  footerLink: {
    color: v('--color-text-muted'),
    textDecoration: "none",
  },
};

export default function ImpressumPage() {
  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <Breadcrumb items={[{ label: "Start", href: "/" }, { label: "Impressum" }]} jsonLd />

        <h1 style={S.h1}>Impressum</h1>

        <h2 style={S.h2}>Angaben gemäß § 5 DDG</h2>
        <p style={S.p}>
          Sebastian Schäder
          <br />
          Albrecht-Dürer-Str. 57
          <br />
          97204 Höchberg
        </p>

        <h2 style={S.h2}>Kontakt</h2>
        <p style={S.p}>
          E-Mail: <ObfuscatedEmail user="hey" domain="solar-check.io" style={{ color: v('--color-accent') }} />
        </p>
        <p style={S.p}>
          Alternativ erreichst du mich über das <Link href="/kontakt" style={{ color: v('--color-accent') }}>Kontaktformular</Link>.
        </p>

        <h2 style={S.h2}>Umsatzsteuer-ID</h2>
        <p style={S.p}>
          Umsatzsteuer-Identifikationsnummer gemäß § 27a Umsatzsteuergesetz:
          <br />
          DE350007581
        </p>

        <h2 style={S.h2}>
          Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV
        </h2>
        <p style={S.p}>
          Sebastian Schäder
          <br />
          Anschrift wie oben
        </p>

        <h2 style={S.h2}>Haftungsausschluss</h2>

        <h3 style={S.h3}>Haftung für Inhalte</h3>
        <p style={S.p}>
          Die Inhalte dieser Seite wurden mit größter Sorgfalt erstellt. Für die
          Richtigkeit, Vollständigkeit und Aktualität der Inhalte können wir
          jedoch keine Gewähr übernehmen. Als Diensteanbieter sind wir gemäß § 7
          Abs. 1 DDG für eigene Inhalte auf diesen Seiten nach den allgemeinen
          Gesetzen verantwortlich. Nach §§ 8 bis 10 DDG sind wir als
          Diensteanbieter jedoch nicht verpflichtet, übermittelte oder
          gespeicherte fremde Informationen zu überwachen.
        </p>

        <h3 style={S.h3}>Haftung für Links</h3>
        <p style={S.p}>
          Unser Angebot enthält Links zu externen Websites Dritter, auf deren
          Inhalte wir keinen Einfluss haben. Für die Inhalte der verlinkten
          Seiten ist stets der jeweilige Anbieter verantwortlich.
        </p>

        <h3 style={S.h3}>Keine Anlageberatung</h3>
        <p style={S.p}>
          Die auf dieser Website bereitgestellten Berechnungen und Informationen
          dienen ausschließlich der allgemeinen Information und stellen keine
          Steuer-, Finanz- oder Anlageberatung dar. Die Ergebnisse des
          PV-Rechners basieren auf vereinfachten Annahmen und können von der
          tatsächlichen Wirtschaftlichkeit abweichen. Für individuelle Beratung
          wende dich bitte an einen qualifizierten Fachberater.
        </p>
      </div>
    </div>
  );
}
