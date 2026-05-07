import { Metadata } from "next";
import Link from "next/link";
import { v } from "../../lib/theme";

export const metadata: Metadata = {
  title: "Kontakt – Solar Check",
  description: "So erreichst du uns. Fragen, Feedback oder Anregungen zu Solar Check.",
};

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
  email: {
    display: "inline-block",
    fontSize: 16,
    fontWeight: 600,
    color: v('--color-accent'),
    background: v('--color-bg-accent'),
    border: `1px solid ${v('--color-border-accent')}`,
    borderRadius: v('--radius-md'),
    padding: "12px 20px",
    marginTop: 8,
  } as React.CSSProperties,
};

export default function Kontakt() {
  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <Link href="/" style={S.back}>← Zurück</Link>
        <h1 style={S.h1}>Kontakt</h1>

        <p style={S.p}>
          Fragen, Feedback oder Verbesserungsvorschläge? Schreib uns gerne eine E-Mail.
        </p>

        <div style={S.email}>
          hey [at] solar-check.io
        </div>

        <p style={{ ...S.p, marginTop: 24, fontSize: 13, color: v('--color-text-muted') }}>
          Wir antworten in der Regel innerhalb von 1–2 Werktagen.
        </p>
      </div>
    </div>
  );
}
