"use client";

import { useEffect, useState } from "react";
import { v, space } from "../../lib/theme";
import { trackEvent } from "../../lib/analytics";
import InfoTooltip from "../InfoTooltip";
import Modal, { ModalSticky } from "../Modal";

// „Förderprogramm, Leistung und mehr abonnieren" — eine Zeile im Kopf der
// Gemeindeseite, das Formular erst im Fenster dahinter.
//
// WARUM EIN TEASER UND KEIN FORMULAR AN DIESER STELLE (Betreiber, 31.08.2026):
// Der Kopfbereich beantwortet die Frage, mit der jemand hier ankommt — wie
// steht mein Ort da. Ein Eingabefeld mit Beschriftung, Knopf und Zusage-Zeile
// ist dort ein zweites Anliegen mitten im ersten und schiebt die Zahlen nach
// unten. Als Zeile kostet es zwei Zeilen Platz; wer es will, bekommt das
// Formular im Fenster und dort auch die Zusagen, für die im Fließtext kein
// Raum ist.
//
// Die Erklärung hängt am „?" statt im Teaser: Was genau kommt, wie oft, und
// dass man mit einem Klick wieder herauskommt, ist die Frage VOR dem Klick —
// aber sie ist zu lang für eine Zeile, die neben einer Überschrift steht.
//
// KLEIN GEHALTEN, und das ist eine Performance-Entscheidung: Die Gemeindeseite
// lädt bereits rund zehn Datenbank-Abfragen und stand im Juli 2026 an der
// Notbremse. Diese Komponente lädt NICHTS — kein Abruf beim Rendern, keine
// Zahl, kein Zustand aus der Datenbank.

type Zustand = "bereit" | "sendet" | "fertig" | { fehler: string };

/**
 * Ereignis, mit dem die klebende Aktionsleiste dasselbe Fenster öffnet.
 *
 * Über ein Fenster-Ereignis statt über einen hochgezogenen Zustand: Die Leiste
 * ist eine Geschwister-Komponente auf einer Server-Seite. Den Zustand nach oben
 * zu ziehen machte die halbe Gemeindeseite zur Client-Komponente — genau die
 * Bauform, die der Baustein mit `sekundaer.ereignis` schon vorsieht (dort
 * öffnet der Förder-Check auf demselben Weg).
 */
export const ABO_OEFFNEN = "abo:oeffnen";

export default function GemeindeAboBox({ name, ags }: { name: string; ags: string }) {
  const [offen, setOffen] = useState(false);
  const [email, setEmail] = useState("");
  const [falle, setFalle] = useState("");
  const [zustand, setZustand] = useState<Zustand>("bereit");

  // Die klebende Leiste am unteren Rand ruft dasselbe Fenster auf.
  useEffect(() => {
    const auf = () => setOffen(true);
    window.addEventListener(ABO_OEFFNEN, auf);
    return () => window.removeEventListener(ABO_OEFFNEN, auf);
  }, []);

  const sendet = zustand === "sendet";
  const fehler = typeof zustand === "object" ? zustand.fehler : null;

  async function absenden(e: { preventDefault: () => void }) {
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

  return (
    <>
      {/* Knopf links, Erklärtext in derselben Zeile daneben (Betreiber,
          31.08.2026). Auf schmalen Schirmen bricht der Text unter den Knopf —
          nebeneinander bliebe für ihn eine Spalte, in der jedes zweite Wort
          umbricht. Die Ausrichtung steht im Stylesheet (.gemeinde-abo), weil
          eine Medienabfrage sich inline nicht schreiben lässt. */}
      <div className="gemeinde-abo">
        <button type="button" onClick={() => setOffen(true)} style={S.knopfPrimaer}>
          Abonnieren
        </button>
        {/* Der Erklärtext steht NEBEN dem Knopf, nicht darin: Eine Beschriftung
            wie „Förderprogramm, Leistung u. v. m. abonnieren" macht den Knopf so
            breit, dass er die Überschrift darüber erdrückt — und ein Knopf sagt
            ohnehin, was passiert, nicht warum man ihn drückt. */}
        <p style={S.ctaText}>
          Förderprogramm, Leistung u.&nbsp;v.&nbsp;m.{" "}
          <InfoTooltip title={`Meldungen zu ${name}`} ariaLabel="Was das Abo bedeutet" exportNote={false}>
            Wir schreiben, wenn sich hier etwas Nennenswertes tut: ein neuer kommunaler
            Zuschuss, ein Vergütungsjahrgang, der ausläuft, der Zubau eines Jahres.
            Höchstens eine Mail im Monat — und nur, wenn es wirklich etwas zu berichten
            gibt. Kein Spam, keine Werbung, kein Weitergeben der Adresse. Abmelden mit
            einem Klick am Fuß jeder Mail.
          </InfoTooltip>
        </p>
      </div>

      <Modal
        open={offen}
        onClose={() => setOffen(false)}
        title={`Meldungen zu ${name}`}
        intro={
          zustand === "fertig"
            ? undefined
            : "Ein neuer kommunaler Zuschuss, ein auslaufender Vergütungsjahrgang, der Zubau eines Jahres — höchstens eine Mail im Monat, und nur wenn es wirklich etwas zu berichten gibt."
        }
        maxWidth={440}
      >
        {zustand === "fertig" ? (
          <div aria-live="polite">
            <p style={S.fertigTitel}>Fast geschafft</p>
            <p style={S.fertigText}>
              Wir haben eine Mail an {email} geschickt. Ein Klick darin, und du bekommst
              Bescheid, wenn sich in {name} etwas tut. Wenn nichts ankommt, sieh bitte im
              Spam-Ordner nach.
            </p>
          </div>
        ) : (
          <form onSubmit={absenden}>
            <label htmlFor="abo-email" style={S.label}>
              E-Mail-Adresse
            </label>
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

            {/* Unsichtbares Feld gegen Maschinen. Nicht `display:none` — manche
                Ausfüllhilfen überspringen genau das und verraten sich dadurch
                nicht. `aria-hidden` + tabIndex hält es von Screenreadern und
                der Tastaturreihenfolge fern. */}
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

            <p style={S.zusage}>
              Kein Spam, jederzeit abmeldbar. Wir geben die Adresse nicht weiter und
              messen nicht, ob du die Mail öffnest.
            </p>

            <ModalSticky>
              <button type="submit" disabled={sendet || !email} style={S.knopf}>
                {sendet ? "Moment …" : "Abonnieren"}
              </button>
            </ModalSticky>
          </form>
        )}
      </Modal>
    </>
  );
}

const S: Record<string, React.CSSProperties> = {
  // Ein <button>, kein <a>: Er öffnet ein Fenster, führt also nicht zu einer
  // Adresse — ein Link wäre ein Versprechen, das er nicht hält (Mittelklick,
  // „in neuem Tab öffnen").
  knopfPrimaer: {
    display: "inline-block",
    padding: "10px 18px",
    fontSize: v("--font-size-body"),
    fontFamily: "inherit",
    fontWeight: 600,
    color: "#fff",
    background: v("--color-accent"),
    border: "none",
    borderRadius: v("--radius-md"),
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  // Kein eigener Außenabstand: Die Zeile setzt ihre Abstände im Stylesheet,
  // sonst addieren sich zwei Quellen und der Text sitzt nicht mehr auf der
  // Mitte des Knopfes.
  ctaText: {
    margin: 0,
    fontSize: v("--font-size-small"),
    color: v("--color-text-muted"),
    lineHeight: 1.4,
  },
  label: {
    display: "block",
    fontSize: v("--font-size-small"),
    color: v("--color-text-muted"),
    marginBottom: space.xs,
  },
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
  fehler: {
    fontSize: v("--font-size-small"),
    color: v("--color-negative"),
    margin: `${space.md}px 0 0`,
  },
  zusage: {
    fontSize: v("--font-size-small"),
    color: v("--color-text-muted"),
    lineHeight: 1.5,
    margin: `${space.md}px 0 0`,
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
