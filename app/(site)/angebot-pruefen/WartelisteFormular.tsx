"use client";

import { useEffect, useRef, useState } from "react";
import { v, space } from "../../../lib/theme";

// Sign-up for the offer-check waitlist. Posts to the same endpoint the header
// menu used before, with the consent version whose wording the page showed.
export default function WartelisteFormular({ version, zusage }: { version: string; zusage: string }) {
  const [email, setEmail] = useState("");
  const [sendet, setSendet] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [fertig, setFertig] = useState(false);
  const falle = useRef<HTMLInputElement>(null);
  const seit = useRef(0);
  useEffect(() => {
    seit.current = Date.now();
  }, []);

  async function absenden(e: React.FormEvent) {
    e.preventDefault();
    setSendet(true);
    setFehler(null);
    try {
      const antwort = await fetch("/api/warteliste/anmelden", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          website: falle.current?.value ?? "",
          elapsedMs: Date.now() - seit.current,
          consent: version,
        }),
      });
      const daten = (await antwort.json().catch(() => ({}))) as { error?: string };
      if (!antwort.ok) throw new Error(daten.error || "Die Anmeldung klappt gerade nicht. Bitte später erneut versuchen.");
      setFertig(true);
    } catch (err) {
      setFehler((err as Error).message);
    } finally {
      setSendet(false);
    }
  }

  if (fertig) {
    return (
      <div role="status" style={S.quittung}>
        <p style={S.quittungTitel}>Fast geschafft</p>
        <p style={S.quittungText}>
          Bitte bestätige deine Anmeldung über den Link in deinem Postfach. Ohne Bestätigung schreiben wir dir nicht.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={absenden} style={S.form} noValidate={false}>
      <label htmlFor="warteliste-email" style={S.label}>
        E-Mail-Adresse
      </label>
      <input
        id="warteliste-email"
        type="email"
        autoComplete="email"
        required
        maxLength={254}
        placeholder="du@beispiel.de"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={S.feld}
        aria-describedby={fehler ? "warteliste-fehler" : undefined}
      />
      <div aria-hidden="true" style={S.falle}>
        <label>
          Website
          <input ref={falle} name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {fehler && (
        <p id="warteliste-fehler" role="alert" style={S.fehler}>
          {fehler}
        </p>
      )}
      <button type="submit" disabled={sendet || !email} style={{ ...S.knopf, opacity: sendet || !email ? 0.6 : 1 }}>
        {sendet ? "Wird gesendet …" : "Auf die Warteliste"}
      </button>
      <p style={S.zusage}>
        {zusage}{" "}
        <a href="/datenschutz" style={S.link}>
          Datenschutz
        </a>
      </p>
    </form>
  );
}

const S: Record<string, React.CSSProperties> = {
  form: { position: "relative", maxWidth: 420 },
  label: { display: "block", fontSize: v("--font-size-small"), color: v("--color-text-muted"), marginBottom: space.xs },
  feld: {
    width: "100%",
    boxSizing: "border-box",
    padding: "11px 12px",
    fontSize: v("--font-size-body"),
    fontFamily: "inherit",
    color: v("--color-text-primary"),
    background: v("--color-bg"),
    border: `1px solid ${v("--color-border")}`,
    borderRadius: v("--radius-md"),
    marginBottom: space.md,
  },
  knopf: {
    width: "100%",
    padding: "12px 20px",
    fontSize: v("--font-size-body"),
    fontFamily: "inherit",
    fontWeight: 600,
    color: "#fff",
    background: v("--color-accent"),
    border: "none",
    borderRadius: v("--radius-md"),
    cursor: "pointer",
  },
  falle: { position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 },
  fehler: { fontSize: v("--font-size-small"), color: v("--color-negative"), margin: `0 0 ${space.md}px` },
  zusage: { fontSize: v("--font-size-small"), color: v("--color-text-muted"), lineHeight: 1.5, margin: `${space.md}px 0 0` },
  link: { color: v("--color-accent"), textDecoration: "underline" },
  quittung: {
    maxWidth: 420,
    padding: space.lg,
    border: `1px solid ${v("--color-border")}`,
    borderRadius: v("--radius-md"),
  },
  quittungTitel: { fontSize: v("--font-size-h3"), fontWeight: 700, margin: `0 0 ${space.sm}px` },
  quittungText: { fontSize: v("--font-size-body"), color: v("--color-text-muted"), lineHeight: 1.6, margin: 0 },
};
