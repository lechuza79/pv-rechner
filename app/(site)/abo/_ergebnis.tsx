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

const S: Record<string, React.CSSProperties> = {
  page: {
    background: v("--color-bg"),
    fontFamily: v("--font-text"),
    color: v("--color-text-primary"),
    minHeight: "60vh",
    padding: "0 16px 20px",
  },
  wrap: {
    maxWidth: v("--content-max-width"),
    margin: "0 auto",
    paddingTop: "var(--content-lede-top)",
  },
  h1: {
    fontSize: v("--font-size-h1"),
    fontWeight: 800,
    letterSpacing: "-0.02em",
    lineHeight: 1.2,
    marginBottom: space.lg,
  },
  p: {
    fontSize: v("--font-size-body"),
    color: v("--color-text-muted"),
    lineHeight: 1.7,
    marginBottom: space.md,
  },
  aktionen: { marginTop: space.xxl, display: "flex", gap: space.md, flexWrap: "wrap" },
  cta: {
    display: "inline-block",
    background: v("--color-accent"),
    color: "#fff",
    textDecoration: "none",
    padding: "12px 20px",
    borderRadius: v("--radius-md"),
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
        <div style={S.aktionen}>
          {o.ortHref && o.ortName ? (
            <Link href={o.ortHref} style={S.cta}>
              Zahlen zu {o.ortName} ansehen
            </Link>
          ) : (
            <Link href="/solar-atlas" style={S.cta}>
              Zum Solar-Atlas
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
