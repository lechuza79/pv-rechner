"use client";

import { useState } from "react";
import { v, space, pad } from "../lib/theme";
import { IconGoogle } from "./Icons";
import {
  signInWithPassword,
  signUpWithPassword,
  requestPasswordReset,
  signInWithGoogle,
} from "../lib/auth";
import { FEHLERTEXT, PASSWORT_MIN, istEmail, passwortOk } from "../lib/auth-regeln";
import { AKTUELLE_BLEIBEN_FASSUNG } from "../lib/auth-einwilligung";

// ─── DAS Anmeldeformular. Ein Baustein, zwei Aufrufer ────────────────────────
//
// Anmeldeseite und Rechner-Ergebnis zeigen dieselbe Maske. Sie zweimal zu bauen
// hieße, dass sich Fehlermeldungen, Mindestlänge und die Reihenfolge der Wege
// binnen einer Woche unterscheiden — und die Anmeldung ist genau die Stelle,
// an der ein Unterschied wie ein Fehler aussieht.
//
// DREI ZUSTÄNDE, KEIN VIERTER: anmelden · Konto anlegen · Passwort setzen. Der
// letzte trägt beide Fälle — wer sein Passwort vergessen hat UND wer nie eins
// hatte. Die Konten aus der Zeit vor 09/2026 sind ohne Passwort angelegt
// worden; für sie ist das hier der Einstieg, und sie müssen dafür nichts
// wissen, was ein anderer Nutzer nicht auch wüsste.
//
// GOOGLE STEHT OBEN, weil es der kürzere Weg ist (ein Klick statt zwei Felder
// plus Bestätigungsmail). Der eigene Weg darunter ist gleichwertig und nicht
// weggeklappt: Wer kein Google-Konto benutzen will, soll nicht suchen müssen.

export type AnmeldeModus = "anmelden" | "registrieren" | "passwort";

export default function AnmeldeFormular({
  next = "/dashboard",
  startModus = "anmelden",
  onErfolg,
  kompakt = false,
}: {
  /** Wohin nach erfolgreicher Anmeldung. Wird serverseitig gegen fremde Ziele geprüft. */
  next?: string;
  startModus?: AnmeldeModus;
  /** Wird nach erfolgreicher Anmeldung mit Passwort gerufen (Weiterleitung o. Ä.). */
  onErfolg?: () => void;
  /** Schmale Fassung ohne eigene Überschrift — für den Einsatz im Dialog. */
  kompakt?: boolean;
}) {
  const [modus, setModus] = useState<AnmeldeModus>(startModus);
  const [email, setEmail] = useState("");
  const [passwort, setPasswort] = useState("");
  const [fehler, setFehler] = useState("");
  const [gesendet, setGesendet] = useState<null | "bestaetigung" | "passwortlink">(null);
  // NICHT vorausgewählt: Eine Einwilligung, die schon gesetzt ist, ist keine.
  const [bleiben, setBleiben] = useState(false);
  const [busy, setBusy] = useState(false);

  function wechsle(neu: AnmeldeModus) {
    setModus(neu);
    setFehler("");
    setGesendet(null);
  }

  async function absenden(e: React.FormEvent) {
    e.preventDefault();
    const adresse = email.trim();
    if (!istEmail(adresse)) {
      setFehler("Bitte eine gültige E-Mail-Adresse eingeben.");
      return;
    }
    if (modus !== "passwort" && !passwort) {
      setFehler(FEHLERTEXT.ungueltige_eingabe);
      return;
    }
    if (modus === "registrieren" && !passwortOk(passwort)) {
      setFehler(FEHLERTEXT.passwort_zu_kurz);
      return;
    }

    setBusy(true);
    setFehler("");
    const antwort =
      modus === "anmelden"
        ? await signInWithPassword(adresse, passwort, bleiben)
        : modus === "registrieren"
          ? await signUpWithPassword(adresse, passwort, { next })
          : await requestPasswordReset(adresse);
    setBusy(false);

    if (antwort.fehler) {
      setFehler(FEHLERTEXT[antwort.fehler]);
      return;
    }
    if (modus === "anmelden") {
      onErfolg?.();
      return;
    }
    setGesendet(modus === "registrieren" ? "bestaetigung" : "passwortlink");
  }

  async function google() {
    setFehler("");
    setBusy(true);
    const antwort = await signInWithGoogle({ next, bleiben });
    // Bei Erfolg verlässt der Browser die Seite — der Zustand danach ist nur im
    // Fehlerfall überhaupt noch sichtbar.
    if (antwort.fehler) {
      setBusy(false);
      setFehler(FEHLERTEXT[antwort.fehler]);
    }
  }

  if (gesendet) {
    const adresse = email.trim();
    return (
      <div style={{ textAlign: "center", padding: pad("xl", "lg") }}>
        <div style={{ fontSize: v("--font-size-body"), fontWeight: 700, color: v("--color-accent"), marginBottom: space.md }}>
          {gesendet === "bestaetigung" ? "Fast geschafft" : "Mail ist unterwegs"}
        </div>
        <div style={{ fontSize: v("--font-size-body"), color: v("--color-text-secondary"), lineHeight: 1.5 }}>
          {gesendet === "bestaetigung"
            ? `Wir haben eine Bestätigungsmail an ${adresse} geschickt. Klicke den Link darin, dann ist dein Konto da.`
            : `Wenn es zu ${adresse} ein Konto gibt, findest du dort gleich eine Mail mit einem Link, über den du dein Passwort setzt.`}
        </div>
        <div style={{ fontSize: v("--font-size-small"), color: v("--color-text-faint"), marginTop: space.lg, lineHeight: 1.5 }}>
          Nichts angekommen? Sieh auch im Spam-Ordner nach.
        </div>
        <button type="button" onClick={() => wechsle("anmelden")} style={S.textknopf}>
          Zurück zur Anmeldung
        </button>
      </div>
    );
  }

  const knopfText =
    modus === "anmelden" ? "Anmelden" : modus === "registrieren" ? "Konto anlegen" : "Link zum Passwort-Setzen schicken";

  return (
    <div>
      {modus !== "passwort" && (
        <>
          <button type="button" onClick={google} disabled={busy} style={S.google}>
            <IconGoogle size={18} />
            {modus === "anmelden" ? "Mit Google anmelden" : "Mit Google fortfahren"}
          </button>
          {/* Der Satz steht DORT, wo geklickt wird, nicht nur in der
              Datenschutzerklärung. Er ist keine Wirksamkeitsvoraussetzung —
              zwei Legal-Judges haben das am 02.09.2026 geprüft, der zweite mit
              dem Auftrag, den ersten zu widerlegen, und genau diese Behauptung
              hat er gekippt (die Grundangaben Empfänger und Zweck stehen schon
              auf dem Knopf). Er bleibt trotzdem: Wer erst nach dem Klick
              erfährt, dass Google beteiligt ist, hat die Wahl nicht gehabt. */}
          <p style={S.hinweis}>
            Dabei erfährt Google, dass du dich hier anmeldest, und übermittelt uns deine E-Mail-Adresse und dein
            öffentliches Google-Profil.{" "}
            <a href="/datenschutz#konto" style={S.hinweisLink}>Was das heißt</a>
          </p>
          <div style={S.trenner}>
            <span style={S.trennerLinie} />
            <span style={S.trennerText}>oder mit E-Mail</span>
            <span style={S.trennerLinie} />
          </div>
        </>
      )}

      {modus === "passwort" && (
        <p style={{ fontSize: v("--font-size-small"), color: v("--color-text-muted"), lineHeight: 1.5, marginBottom: space.lg }}>
          Trag deine Adresse ein — du bekommst einen Link, über den du ein neues Passwort vergibst. Das ist auch der
          Weg, wenn du dich bisher immer über einen Link in der Mail angemeldet hast und noch gar kein Passwort hast.
        </p>
      )}

      <form onSubmit={absenden}>
        <label htmlFor="anmelde-email" style={S.label}>E-Mail-Adresse</label>
        <input
          id="anmelde-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoFocus={!kompakt}
          placeholder="du@beispiel.de"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={S.feld}
        />

        {modus !== "passwort" && (
          <>
            <label htmlFor="anmelde-passwort" style={{ ...S.label, marginTop: space.lg }}>Passwort</label>
            <input
              id="anmelde-passwort"
              type="password"
              autoComplete={modus === "anmelden" ? "current-password" : "new-password"}
              placeholder={modus === "registrieren" ? `mindestens ${PASSWORT_MIN} Zeichen` : "••••••••"}
              value={passwort}
              onChange={(e) => setPasswort(e.target.value)}
              style={S.feld}
            />
          </>
        )}

        {modus === "anmelden" && (
          <div style={S.bleibenBlock}>
            <label style={S.bleibenLabel}>
              <input
                type="checkbox"
                checked={bleiben}
                onChange={(e) => setBleiben(e.target.checked)}
                style={S.haken}
              />
              <span>{AKTUELLE_BLEIBEN_FASSUNG.label}</span>
            </label>
            <p style={S.bleibenErklaerung}>{AKTUELLE_BLEIBEN_FASSUNG.erklaerung}</p>
          </div>
        )}

        <button type="submit" disabled={busy} style={{ ...S.absenden, opacity: busy ? 0.7 : 1, cursor: busy ? "default" : "pointer" }}>
          {busy ? "Einen Moment…" : knopfText}
        </button>
        {fehler && <div role="alert" style={S.fehler}>{fehler}</div>}
      </form>

      <div style={S.fusszeile}>
        {modus === "anmelden" && (
          <>
            <button type="button" onClick={() => wechsle("passwort")} style={S.textknopf}>Passwort vergessen?</button>
            <span style={S.fussTrenner}>·</span>
            <button type="button" onClick={() => wechsle("registrieren")} style={S.textknopf}>Noch kein Konto?</button>
          </>
        )}
        {modus === "registrieren" && (
          <button type="button" onClick={() => wechsle("anmelden")} style={S.textknopf}>Ich habe schon ein Konto</button>
        )}
        {modus === "passwort" && (
          <button type="button" onClick={() => wechsle("anmelden")} style={S.textknopf}>Zurück zur Anmeldung</button>
        )}
      </div>
    </div>
  );
}

const feldBasis: React.CSSProperties = {
  width: "100%",
  padding: pad("lg", "lg"),
  borderRadius: v("--radius-md"),
  fontSize: v("--font-size-body"),
  fontFamily: v("--font-text"),
  outline: "none",
  boxSizing: "border-box",
};

const S: Record<string, React.CSSProperties> = {
  google: {
    ...feldBasis,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: space.md,
    fontWeight: 600,
    background: v("--color-bg"),
    border: `1px solid ${v("--color-border")}`,
    color: v("--color-text-primary"),
    cursor: "pointer",
  },
  bleibenBlock: { marginTop: space.lg },
  bleibenLabel: {
    display: "flex",
    alignItems: "center",
    gap: space.md,
    fontSize: v("--font-size-body"),
    color: v("--color-text-primary"),
    cursor: "pointer",
  },
  haken: { width: 18, height: 18, accentColor: v("--color-accent"), cursor: "pointer", flexShrink: 0 },
  bleibenErklaerung: {
    fontSize: v("--font-size-caption"),
    color: v("--color-text-faint"),
    lineHeight: 1.45,
    marginTop: space.sm,
    marginLeft: 18 + space.md,
  },
  hinweis: {
    fontSize: v("--font-size-caption"),
    color: v("--color-text-faint"),
    lineHeight: 1.45,
    marginTop: space.md,
    textAlign: "center",
  },
  hinweisLink: { color: v("--color-text-muted"), textDecoration: "underline" },
  trenner: { display: "flex", alignItems: "center", gap: space.md, margin: `${space.xl}px 0` },
  trennerLinie: { flex: 1, height: 1, background: v("--color-border") },
  trennerText: { fontSize: v("--font-size-caption"), color: v("--color-text-faint") },
  label: {
    display: "block",
    fontSize: v("--font-size-small"),
    fontWeight: 600,
    color: v("--color-text-secondary"),
    marginBottom: space.md,
  },
  feld: {
    ...feldBasis,
    background: v("--color-bg-muted"),
    border: `1px solid ${v("--color-border")}`,
    color: v("--color-text-primary"),
  },
  absenden: {
    ...feldBasis,
    marginTop: space.xl,
    fontWeight: 700,
    background: v("--color-accent"),
    border: "none",
    color: v("--color-text-on-accent"),
  },
  fehler: { fontSize: v("--font-size-small"), color: v("--color-negative"), marginTop: space.sm, lineHeight: 1.4 },
  fusszeile: {
    marginTop: space.xl,
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    gap: space.sm,
  },
  fussTrenner: { color: v("--color-text-faint"), fontSize: v("--font-size-small"), marginTop: space.md },
  textknopf: {
    background: "none",
    border: "none",
    padding: 0,
    marginTop: space.md,
    fontSize: v("--font-size-small"),
    fontFamily: v("--font-text"),
    color: v("--color-accent"),
    textDecoration: "underline",
    cursor: "pointer",
  },
};
