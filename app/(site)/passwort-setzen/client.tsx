"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { v, space, pad } from "../../../lib/theme";
import { useAuth, setNewPassword } from "../../../lib/auth";
import { FEHLERTEXT, PASSWORT_MIN, passwortOk } from "../../../lib/auth-regeln";

// Hier landet, wer dem Link aus der „Passwort setzen"-Mail folgt. Der Link hat
// den Nutzer über die Rückkehr-Adresse bereits angemeldet — diese Seite vergibt
// nur noch das Passwort.
//
// Sie ist deshalb NICHT über das Menü erreichbar und trägt kein zweites
// Anmeldeformular: Wer ohne gültigen Link hier ankommt, bekommt den Weg zur
// Anmeldung gezeigt, statt eine Maske, die für ihn nicht funktionieren kann.

export default function PasswortSetzen() {
  const authState = useAuth();
  const router = useRouter();
  const [passwort, setPasswort] = useState("");
  const [wiederholung, setWiederholung] = useState("");
  const [fehler, setFehler] = useState("");
  const [busy, setBusy] = useState(false);
  const [fertig, setFertig] = useState(false);

  async function absenden(e: React.FormEvent) {
    e.preventDefault();
    if (!passwortOk(passwort)) {
      setFehler(FEHLERTEXT.passwort_zu_kurz);
      return;
    }
    if (passwort !== wiederholung) {
      setFehler("Die beiden Eingaben sind nicht gleich.");
      return;
    }
    setBusy(true);
    setFehler("");
    const antwort = await setNewPassword(passwort);
    setBusy(false);
    if (antwort.fehler) {
      setFehler(FEHLERTEXT[antwort.fehler]);
      return;
    }
    setFertig(true);
  }

  return (
    <div style={{ background: v("--color-bg"), minHeight: "70vh", padding: "0 16px 40px", fontFamily: v("--font-text"), color: v("--color-text-primary") }}>
      <div style={{ maxWidth: 420, margin: "0 auto" }}>
        <h1 style={{ fontSize: v("--font-size-h1"), fontWeight: 800, letterSpacing: "-0.02em", marginBottom: space.sm }}>Passwort setzen</h1>

        <div style={card}>
          {fertig ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: v("--font-size-body"), fontWeight: 700, color: v("--color-accent"), marginBottom: space.md }}>Passwort gespeichert</div>
              <div style={{ fontSize: v("--font-size-body"), color: v("--color-text-secondary"), marginBottom: space.xl, lineHeight: 1.5 }}>
                Ab jetzt meldest du dich damit an.
              </div>
              <button type="button" onClick={() => { router.push("/dashboard"); router.refresh(); }} style={{ ...knopf, cursor: "pointer" }}>
                Zu meinen Berechnungen
              </button>
            </div>
          ) : authState.status === "loading" ? (
            // Ohne diesen Zweig zeigt die Seite für einen Wimpernschlag das
            // Formular und springt dann auf „Link abgelaufen" — der Anmelde-
            // Zustand steht erst nach dem ersten Abruf fest. Ein kurz
            // aufblitzendes Formular, das dann verschwindet, liest sich wie ein
            // Fehler.
            <div style={{ textAlign: "center", fontSize: v("--font-size-body"), color: v("--color-text-muted") }}>
              Einen Moment…
            </div>
          ) : authState.status === "anon" ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: v("--font-size-body"), color: v("--color-text-secondary"), lineHeight: 1.5, marginBottom: space.xl }}>
                Dieser Link ist abgelaufen oder wurde schon benutzt. Fordere über die Anmeldung einen neuen an.
              </div>
              <Link href="/login" style={{ ...knopf, display: "inline-block", textDecoration: "none", width: "auto" }}>Zur Anmeldung</Link>
            </div>
          ) : (
            <form onSubmit={absenden}>
              <label htmlFor="neues-passwort" style={label}>Neues Passwort</label>
              <input
                id="neues-passwort"
                type="password"
                autoComplete="new-password"
                autoFocus
                placeholder={`mindestens ${PASSWORT_MIN} Zeichen`}
                value={passwort}
                onChange={(e) => setPasswort(e.target.value)}
                style={feld}
              />
              <label htmlFor="passwort-wiederholung" style={{ ...label, marginTop: space.lg }}>Noch einmal zur Sicherheit</label>
              <input
                id="passwort-wiederholung"
                type="password"
                autoComplete="new-password"
                value={wiederholung}
                onChange={(e) => setWiederholung(e.target.value)}
                style={feld}
              />
              <button type="submit" disabled={busy} style={{ ...knopf, marginTop: space.xl, opacity: busy ? 0.7 : 1, cursor: busy ? "default" : "pointer" }}>
                {busy ? "Einen Moment…" : "Passwort speichern"}
              </button>
              {fehler && <div role="alert" style={{ fontSize: v("--font-size-small"), color: v("--color-negative"), marginTop: space.md, lineHeight: 1.4 }}>{fehler}</div>}
            </form>
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

const label: React.CSSProperties = {
  display: "block",
  fontSize: v("--font-size-small"),
  fontWeight: 600,
  color: v("--color-text-secondary"),
  marginBottom: space.md,
};

const feld: React.CSSProperties = {
  width: "100%",
  padding: pad("lg", "lg"),
  borderRadius: v("--radius-md"),
  fontSize: v("--font-size-body"),
  fontFamily: v("--font-text"),
  background: v("--color-bg-muted"),
  border: `1px solid ${v("--color-border")}`,
  color: v("--color-text-primary"),
  outline: "none",
  boxSizing: "border-box",
};

const knopf: React.CSSProperties = {
  width: "100%",
  padding: pad("lg", "lg"),
  borderRadius: v("--radius-md"),
  fontSize: v("--font-size-body"),
  fontWeight: 700,
  fontFamily: v("--font-text"),
  background: v("--color-accent"),
  border: "none",
  color: v("--color-text-on-accent"),
  boxSizing: "border-box",
};
