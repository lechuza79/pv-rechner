"use client";

import { useState } from "react";
import { v, space } from "../../lib/theme";
import { trackEvent } from "../../lib/analytics";

// „Sag mir Bescheid, wenn sich hier etwas tut."
//
// WO SIE STEHT UND WARUM NICHT IM KOMMUNEN-KASTEN: Der Kasten darunter beginnt
// mit „Sie arbeiten für die Gemeinde X?" und spricht ausdrücklich eine
// Verwaltung an. Das Abo richtet sich an beide — an das Rathaus UND an
// jemanden, der hier wohnt. Es in den Verwaltungs-Kasten zu legen hieße, die
// Hälfte der Zielgruppe auszuladen, bevor sie den Satz zu Ende gelesen hat.
//
// Der Platz ist deshalb direkt unter den Zahlen: Wer sie gerade gelesen hat,
// ist genau in dem Moment, in dem „sag mir Bescheid, wenn sich das ändert"
// eine naheliegende Frage ist.
//
// KLEIN GEHALTEN, und das ist eine Performance-Entscheidung: Die Gemeindeseite
// lädt bereits rund zehn Datenbank-Abfragen und stand im Juli 2026 an der
// Notbremse. Diese Komponente lädt NICHTS — kein Abruf beim Rendern, keine
// Zahl, kein Zustand aus der Datenbank. Sie ist ein Formular und sonst nichts.

type Zustand = "bereit" | "sendet" | "fertig" | { fehler: string };

export default function GemeindeAboBox({ name, ags }: { name: string; ags: string }) {
  const [email, setEmail] = useState("");
  const [falle, setFalle] = useState("");
  const [zustand, setZustand] = useState<Zustand>("bereit");

  const sendet = zustand === "sendet";
  const fehler = typeof zustand === "object" ? zustand.fehler : null;

  async function absenden(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (sendet) return;
    setZustand("sendet");
    try {
      const antwort = await fetch("/api/abo/anmelden", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ags, email, website: falle }),
      });
      if (!antwort.ok) {
        const daten = (await antwort.json().catch(() => ({}))) as { error?: string };
        setZustand({ fehler: daten.error ?? "Das hat gerade nicht geklappt. Bitte später erneut." });
        return;
      }
      trackEvent("abo_anmeldung");
      setZustand("fertig");
    } catch {
      setZustand({ fehler: "Keine Verbindung. Bitte später erneut." });
    }
  }

  if (zustand === "fertig") {
    return (
      <section style={S.karte} aria-live="polite">
        <p style={S.fertigTitel}>Fast geschafft</p>
        <p style={S.fertigText}>
          Wir haben eine Mail geschickt. Ein Klick darin, und du bekommst Bescheid, wenn sich in{" "}
          {name} etwas tut. Wenn nichts ankommt, sieh bitte im Spam-Ordner nach.
        </p>
      </section>
    );
  }

  return (
    <section style={S.karte}>
      <h2 style={S.h2}>Bescheid bekommen, wenn sich in {name} etwas tut</h2>
      <p style={S.sub}>
        Ein neues Förderprogramm, ein auslaufender Vergütungsjahrgang, der Zubau eines Jahres —
        höchstens eine Mail im Monat, und nur wenn es wirklich etwas zu berichten gibt.
      </p>

      <form onSubmit={absenden} style={S.form}>
        <label htmlFor="abo-email" style={S.label}>
          E-Mail-Adresse
        </label>
        <div style={S.reihe}>
          <input
            id="abo-email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            placeholder="name@beispiel.de"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={sendet}
            style={S.feld}
          />
          <button type="submit" disabled={sendet || !email} style={S.knopf}>
            {sendet ? "Moment …" : "Anmelden"}
          </button>
        </div>

        {/* Unsichtbares Feld gegen Maschinen. Nicht `display:none` — manche
            Ausfüllhilfen überspringen genau das und verraten sich dadurch
            nicht. `aria-hidden` + tabIndex hält es von Screenreadern und der
            Tastaturreihenfolge fern. */}
        <input
          type="text"
          name="website"
          value={falle}
          onChange={(e) => setFalle(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          style={S.falle}
        />

        {fehler && (
          <p role="alert" style={S.fehler}>
            {fehler}
          </p>
        )}

        <p style={S.zusage}>Kein Spam, jederzeit abmeldbar.</p>
      </form>
    </section>
  );
}

const S: Record<string, React.CSSProperties> = {
  karte: {
    background: v("--color-bg-muted"),
    border: `1px solid ${v("--color-border")}`,
    borderRadius: v("--radius-lg"),
    padding: space.xl,
    marginTop: space.xxl,
  },
  h2: {
    fontSize: v("--font-size-h3"),
    fontWeight: 700,
    color: v("--color-text-primary"),
    margin: `0 0 ${space.sm}px`,
    lineHeight: 1.3,
  },
  sub: {
    fontSize: v("--font-size-body"),
    color: v("--color-text-muted"),
    lineHeight: 1.6,
    margin: `0 0 ${space.lg}px`,
  },
  form: { margin: 0 },
  label: {
    display: "block",
    fontSize: v("--font-size-small"),
    color: v("--color-text-muted"),
    marginBottom: space.xs,
  },
  reihe: { display: "flex", gap: space.sm, flexWrap: "wrap" },
  feld: {
    flex: "1 1 220px",
    minWidth: 0,
    padding: "11px 12px",
    fontSize: v("--font-size-body"),
    fontFamily: "inherit",
    color: v("--color-text-primary"),
    background: v("--color-bg"),
    border: `1px solid ${v("--color-border")}`,
    borderRadius: v("--radius-md"),
  },
  knopf: {
    flex: "0 0 auto",
    padding: "11px 20px",
    fontSize: v("--font-size-body"),
    fontFamily: "inherit",
    fontWeight: 600,
    color: "#fff",
    background: v("--color-accent"),
    border: "none",
    borderRadius: v("--radius-md"),
    cursor: "pointer",
  },
  falle: {
    position: "absolute",
    left: "-9999px",
    width: 1,
    height: 1,
    opacity: 0,
  },
  fehler: {
    fontSize: v("--font-size-small"),
    color: v("--color-negative"),
    margin: `${space.sm}px 0 0`,
  },
  zusage: {
    fontSize: v("--font-size-small"),
    color: v("--color-text-muted"),
    margin: `${space.sm}px 0 0`,
  },
  fertigTitel: {
    fontSize: v("--font-size-h3"),
    fontWeight: 700,
    color: v("--color-text-primary"),
    margin: `0 0 ${space.sm}px`,
  },
  fertigText: {
    fontSize: v("--font-size-body"),
    color: v("--color-text-muted"),
    lineHeight: 1.6,
    margin: 0,
  },
};
