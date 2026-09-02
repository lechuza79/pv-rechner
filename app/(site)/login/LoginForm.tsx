"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { v, space, pad } from "../../../lib/theme";
import { useAuth } from "../../../lib/auth";
import AnmeldeFormular from "../../../components/AnmeldeFormular";

// Die Anmeldeseite der Website. Die Maske selbst ist der geteilte Baustein —
// dieselbe steht im Rechner-Ergebnis, damit „Berechnung speichern" nicht in
// eine zweite, anders aussehende Anmeldung führt.
//
// `next` ist das Ziel nach der Anmeldung (Vorgabe: der eigene Bereich). Die
// Seite prüft es bereits gegen fremde Ziele, die Rückkehr-Adresse noch einmal.

export default function LoginForm({ next = "/dashboard" }: { next?: string }) {
  const authState = useAuth();
  const router = useRouter();

  return (
    <div style={{ background: v("--color-bg"), minHeight: "70vh", padding: "0 16px 40px", fontFamily: v("--font-text"), color: v("--color-text-primary") }}>
      <div style={{ maxWidth: 420, margin: "0 auto" }}>
        <h1 style={{ fontSize: v("--font-size-h1"), fontWeight: 800, letterSpacing: "-0.02em", marginBottom: space.sm }}>Anmelden</h1>
        <p style={{ fontSize: v("--font-size-body"), color: v("--color-text-muted"), marginBottom: space.xxl, lineHeight: 1.5 }}>
          Ein Konto brauchst du nur, um Berechnungen zu speichern und später wieder aufzurufen. Rechnen kannst du ohne.
        </p>

        <div style={card}>
          {authState.status === "authed" ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: v("--font-size-body"), fontWeight: 700, marginBottom: space.sm }}>Du bist bereits angemeldet.</div>
              <div style={{ fontSize: v("--font-size-small"), color: v("--color-text-secondary"), marginBottom: space.xl }}>{authState.user.email}</div>
              <Link href={next} style={weiterKnopf}>Weiter →</Link>
            </div>
          ) : (
            <AnmeldeFormular
              next={next}
              onErfolg={() => {
                router.push(next);
                router.refresh();
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

const card: React.CSSProperties = {
  background: v("--color-bg"),
  border: `1px solid ${v("--color-border")}`,
  borderRadius: v("--radius-lg"),
  padding: pad("xxl", "xxl"),
  boxShadow: v("--shadow-sm"),
};

const weiterKnopf: React.CSSProperties = {
  display: "inline-block",
  padding: pad("lg", "xxl"),
  borderRadius: v("--radius-md"),
  fontSize: v("--font-size-body"),
  fontWeight: 700,
  background: v("--color-accent"),
  color: v("--color-text-on-accent"),
  textDecoration: "none",
};
