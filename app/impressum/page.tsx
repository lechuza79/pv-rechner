import { Metadata } from "next";
import Link from "next/link";
import { IconArrowRight } from "../../components/Icons";
import { v } from "../../lib/theme";

export const metadata: Metadata = {
  title: "Impressum – Solar Check",
  description: "Impressum und Angaben gemäß § 5 TMG für Solar Check.",
};

const S = {
  page: {
    background: v('--color-bg'),
    fontFamily: v('--font-text'),
    color: v('--color-text-primary'),
    minHeight: "100vh",
    padding: "20px 16px",
  },
  wrap: { maxWidth: v('--page-max-width'), margin: "0 auto" },
  back: {
    fontSize: 13,
    color: v('--color-text-secondary'),
    textDecoration: "none",
    display: "inline-block",
    marginBottom: 24,
  },
  h1: {
    fontSize: 22,
    fontWeight: 800,
    letterSpacing: "-0.02em",
    color: v('--color-text-primary'),
    lineHeight: 1.2,
    marginBottom: 24,
  },
  h2: {
    fontSize: 16,
    fontWeight: 700,
    color: v('--color-text-primary'),
    marginTop: 28,
    marginBottom: 10,
  },
  h3: {
    fontSize: 14,
    fontWeight: 700,
    color: v('--color-text-secondary'),
    marginTop: 20,
    marginBottom: 8,
  },
  p: {
    fontSize: 13,
    color: v('--color-text-muted'),
    lineHeight: 1.7,
    marginBottom: 10,
  },
  footer: {
    marginTop: 48,
    paddingTop: 20,
    borderTop: `1px solid ${v('--color-border')}`,
    display: "flex",
    justifyContent: "center",
    gap: 20,
    fontSize: 12,
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
        <Link href="/" style={S.back}>
<span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><IconArrowRight size={12} style={{ transform: "rotate(180deg)" }} /> Zurück zum Rechner</span>
        </Link>

        <h1 style={S.h1}>Impressum</h1>

        <h2 style={S.h2}>Angaben gemäß § 5 TMG</h2>
        <p style={S.p}>
          Sebastian Schäder
          <br />
          Albrecht-Dürer-Str. 57
          <br />
          97204 Höchberg
        </p>

        <h2 style={S.h2}>Kontakt</h2>
        <p style={S.p}>E-Mail: [DEINE@EMAIL.DE]</p>

        <h2 style={S.h2}>
          Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV
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
          Abs. 1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen
          Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als
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
          wenden Sie sich bitte an einen qualifizierten Fachberater.
        </p>

        <div style={S.footer}>
          <Link href="/datenschutz" style={S.footerLink}>
            Datenschutz
          </Link>
          <Link href="/" style={S.footerLink}>
            Solar Check
          </Link>
        </div>
      </div>
    </div>
  );
}
