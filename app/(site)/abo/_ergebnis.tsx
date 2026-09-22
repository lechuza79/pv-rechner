import Link from "next/link";
import { v, space } from "../../../lib/theme";

// Die gemeinsame Hülle der beiden Abo-Seiten (bestätigen, abmelden).
//
// Beide sagen dasselbe in einer anderen Richtung: eine Überschrift, zwei Sätze,
// ein Weg zurück. Sie zweimal zu bauen hieße, dass sie sich binnen einer Woche
// in Abstand, Schriftgröße und Tonfall unterscheiden — dieselbe Begründung wie
// bei der klebenden Aktionsleiste, die als zweite Kopie beinahe entstanden
// wäre.
//
// Bewusst KEIN eigenes Top-Padding am Wurzel-Container: Der Abstand zur
// Kopfzeile kommt aus einer Quelle im Layout, und der Textabstand aus
// `--content-lede-top`. Wer hier eigene Luft setzt, ist die nächste
// Drift-Quelle.

export const ABO_KNOPF_STIL: React.CSSProperties = {
  display: "inline-block",
  background: v("--color-cta"),
  color: v("--color-cta-ink"),
  border: "none",
  padding: "12px 20px",
  borderRadius: v("--radius-pill"),
  fontWeight: 600,
  fontSize: v("--font-size-body"),
  fontFamily: "inherit",
  cursor: "pointer",
  marginTop: space.lg,
};

const S: Record<string, React.CSSProperties> = {
  page: {
    background: v("--color-bg"),
    fontFamily: v("--font-text"),
    color: v("--color-text-primary"),
    minHeight: "60vh",
    padding: "0 16px 20px",
  },
  wrap: {
    maxWidth: v("--content-max-width"), containerType: "inline-size",
    margin: "0 auto",
    paddingTop: "var(--content-lede-top)",
  },
  h1: { marginBottom: space.lg },
  p: {
    fontSize: v("--font-size-body"),
    color: v("--color-text-muted"),
    lineHeight: 1.7,
    marginBottom: space.md,
  },
  aktionen: { marginTop: space.xxl, display: "flex", gap: space.md, flexWrap: "wrap" },
  cta: {
    display: "inline-block",
    background: v("--color-cta"),
    color: v("--color-cta-ink"),
    textDecoration: "none",
    padding: "12px 20px",
    borderRadius: v("--radius-pill"),
    fontWeight: 600,
  },
  leise: {
    display: "inline-block",
    color: v("--color-text-muted"),
    textDecoration: "underline",
    padding: "12px 0",
  },
};

export default function AboErgebnis(o: {
  titel: string;
  saetze: string[];
  /** Zurück zum Ort — nur wenn wir wissen, um welchen es ging. */
  ortHref?: string;
  ortName?: string;
  /**
   * A form with the one action of the page (confirm, unsubscribe). Opening a
   * mail link only shows it; the step happens on the press, because mail
   * scanners open links on their own (legal review 18.09.).
   */
  aktion?: React.ReactNode;
}) {
  return (
    <main style={S.page}>
      <div style={S.wrap}>
        <h1 style={S.h1}>{o.titel}</h1>
        {o.saetze.map((s, i) => (
          <p key={i} style={S.p}>
            {s}
          </p>
        ))}
        {o.aktion}
        <div style={S.aktionen}>
          {o.ortHref && o.ortName ? (
            <Link href={o.ortHref} style={S.cta}>
              Zahlen zu {o.ortName} ansehen
            </Link>
          ) : (
            <Link href="/solar-atlas" style={S.cta}>
              Zum Energie-Atlas
            </Link>
          )}
          <Link href="/" style={S.leise}>
            Zur Startseite
          </Link>
        </div>
      </div>
    </main>
  );
}
