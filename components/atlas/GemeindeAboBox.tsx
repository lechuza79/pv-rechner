"use client";

import { useEffect, useState } from "react";
import { v, space } from "../../lib/theme";
import { trackEvent } from "../../lib/analytics";
import InfoTooltip from "../InfoTooltip";
import Modal, { ModalSticky } from "../Modal";
import { IconGlocke } from "../Icons";
import { ABO_TECHNIKEN, ABO_TECHNIK_LABEL, type AboTechnik } from "../../lib/abo-technik";
import { HERKUNFT_PARAM, HERKUNFT_WERT } from "../../lib/brief-herkunft";

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
 * Was das Abo verspricht — JE ART verschieden, und das ist keine Kosmetik.
 * Das Bestands-Abo hängt am Anlagenregister, das Förder-Abo an den
 * Programmseiten der Gemeinden. Verschiedene Anlässe, verschiedene Sätze.
 *
 * KEINE ZAHL, NIRGENDS — weder „höchstens eine Mail im Monat" noch eine Rate
 * (Betreiber, 31.08.2026: „wir haben bestimmt mal mehr ideen"). Eine
 * Frequenzzusage ist eine Werbeaussage nach § 5 UWG, die JEDE künftige Meldung
 * binden würde; sie später zu brechen ist teurer, als sie nie gegeben zu haben.
 * Gemessen wäre sie ohnehin nicht: Der Förderverlauf (18.–26.08.2026) zeigt auf
 * 110 Programme 24 echte Änderungen in neun Tagen — für einen EINZELNEN Ort
 * selten, aber der Zeitraum trägt keine Zahl.
 *
 * Was stattdessen zugesagt wird, ist der ANLASS. Und die Aufzählung der
 * Anlässe ist OFFEN, nicht abschließend (Betreiber, 31.08.2026): Ein „und
 * sonst nicht" hinter drei Beispielen macht aus einer Illustration eine
 * Selbstbeschränkung — der vierte Anlass, den wir noch nicht kennen, wäre
 * damit ausgeschlossen. Die Schranke gegen zu viel Post steht deshalb nicht in
 * dieser Liste, sondern in der Zusage über dem Absenden-Knopf und im
 * Hilfetext: Es kommt nur etwas, wenn es etwas zu berichten gibt.
 *
 * NICHT „spannende Fakten" o. Ä.: Ob etwas spannend ist, entscheidet der
 * Leser, nicht wir — und ein Newsletter-Wort in einem Rechner, der mit
 * Nüchternheit wirbt, ist die falsche Stimme. „Das der Rede wert ist" sagt
 * dasselbe und behauptet dabei nichts über die Wirkung.
 */
const TEXTE = {
  gemeinde: {
    intro:
      "Wir schreiben, wenn deine Gemeinde einen Zuschuss auflegt, wenn ein Vergütungsjahrgang ausläuft, wenn die Zahlen fürs Jahr da sind — oder wenn wir sonst etwas über den Ort herausfinden, das der Rede wert ist.",
    teaser: "Förderprogramm, Leistung u.\u00a0v.\u00a0m.",
    hilfe:
      "Es kommt nur etwas, wenn es etwas zu berichten gibt. Abmelden mit einem Klick am Fuß jeder Mail. Deine Adresse geben wir nicht weiter.",
  },
  foerderung: {
    intro:
      "Wir sehen die Programmseiten der Gemeinden täglich durch. Kommt ein Zuschuss dazu, ändern sich die Bedingungen oder ist der Topf leer, schreiben wir dir. Für einen einzelnen Ort passiert das selten.",
    teaser: "Wenn sich an der Förderung etwas ändert",
    hilfe:
      "Wir prüfen täglich, schreiben aber nur bei Änderungen. Für einen Ort ist das selten. Abmelden mit einem Klick am Fuß jeder Mail. Deine Adresse geben wir nicht weiter.",
  },
} as const;

/**
 * Kam dieser Aufruf über ein Kommunen-Anschreiben?
 *
 * Liest denselben Parameter, den die Briefe an ihre Links hängen. Der Wert ist
 * in jedem Brief identisch; er beantwortet „hat der Versand Abos gebracht",
 * nicht „wer hat geklickt".
 */
function ueberBrief(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return new URLSearchParams(window.location.search).get(HERKUNFT_PARAM) === HERKUNFT_WERT;
  } catch {
    return false;
  }
}

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

export default function GemeindeAboBox({
  name,
  ags,
  quelle = "gemeinde",
}: {
  name: string;
  ags: string;
  /** Auf welcher Seitengattung steht der Knopf. Steuert nur die Auswertung. */
  quelle?: "gemeinde" | "foerderung";
}) {
  const [offen, setOffen] = useState(false);
  const [email, setEmail] = useState("");
  const [falle, setFalle] = useState("");
  const [zustand, setZustand] = useState<Zustand>("bereit");
  /**
   * Wofür interessiert sich der Anmeldende? NUR auf der Förderseite gefragt —
   * auf der Atlas-Seite geht es um den Bestand des Orts, und der kennt keine
   * Technik-Wahl.
   *
   * ALLE DREI VORAUSGEWÄHLT: Wer ein Förder-Abo abschließt, will erst einmal
   * jedes Geld sehen, das für ihn gilt; abwählen ist leichter als anwählen.
   * Das ist keine Vorauswahl im Sinne der Flow-Regel (die gilt Fragen mit einer
   * Antwort) — es ist der Ausgangszustand einer Ein/Aus-Angabe.
   */
  const [gewaehlt, setGewaehlt] = useState<AboTechnik[]>([...ABO_TECHNIKEN]);
  /**
   * Arbeitet die Person für die Verwaltung? NUR beim Bestands-Abo gefragt
   * (Betreiber, 31.08.2026) — spiegelbildlich zur Technik-Frage, die es nur
   * beim Förder-Abo gibt. Jede Gattung stellt genau eine Zusatzfrage.
   *
   * Der Grund liegt am Inhalt: Bestandszahlen sind für eine Verwaltung ein
   * anderer Gegenstand als für einen Hausbesitzer — sie kann sie
   * veröffentlichen, er kann sich daran messen. Die Förderprogramme des
   * eigenen Orts kennt eine Verwaltung dagegen bereits; dort wäre die Frage
   * eine Angabe ohne Verwendung, und eine solche zu erheben ist die
   * Datensammlung, die wir überall sonst ablehnen.
   *
   * NICHT VORAUSGEWÄHLT, und das ist die einzig mögliche Richtung: Die weit
   * überwiegende Mehrheit arbeitet nicht dort. Ein gesetzter Haken wäre eine
   * Angabe, die wir dem Anmeldenden untergeschoben haben.
   */
  const [ausVerwaltung, setAusVerwaltung] = useState(false);

  const umschalten = (t: AboTechnik) =>
    setGewaehlt((alt) => (alt.includes(t) ? alt.filter((x) => x !== t) : [...alt, t]));

  // Die klebende Leiste am unteren Rand ruft dasselbe Fenster auf.
  useEffect(() => {
    const auf = () => setOffen(true);
    window.addEventListener(ABO_OEFFNEN, auf);
    return () => window.removeEventListener(ABO_OEFFNEN, auf);
  }, []);

  const texte = TEXTE[quelle];
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
        // Kam der Aufruf über ein Kommunen-Anschreiben? Die Kennung steht als
        // Parameter in der Adresse und ist in JEDEM Brief dieselbe — sie sagt
        // „über ein Anschreiben", nicht welche Gemeinde. Gelesen wird sie erst
        // beim Absenden, nicht beim Rendern: Sonst wäre die Komponente von der
        // Adresse abhängig und müsste bei jeder Navigation neu denken.
        body: JSON.stringify({
          ags,
          email,
          website: falle,
          quelle,
          ueberBrief: ueberBrief(),
          // Nur beim Förder-Abo eine Aussage; sonst der volle Satz.
          techniken: quelle === "foerderung" ? gewaehlt : ABO_TECHNIKEN,
          // Nur das Bestands-Abo fragt danach; von der Förderseite kommt hier
          // immer false, nicht der Zustand eines Kästchens, das dort gar nicht
          // steht.
          ausVerwaltung: quelle === "gemeinde" ? ausVerwaltung : false,
        }),
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
      {/* Knopf oben, Erklärtext darunter — beides rechtsbündig, damit der
          Block neben der Überschrift als eine Einheit liest. */}
      <div className="gemeinde-abo">
        {/* DER ORTSNAME STEHT IM KNOPF, obwohl die Überschrift daneben ihn
            schon trägt (Betreiber, 31.08.2026). Der doppelte Name ist der
            kleinere Preis: In der klebenden Leiste am Seitenende ist die
            Überschrift weggescrollt, und dort steht der Knopf neben „Für dein
            Haus durchrechnen" — ein nacktes „Abonnieren" ließe dann offen,
            was man abonniert.

            Der Name steht in einem eigenen Element, damit er GEKÜRZT werden
            kann und „abonnieren" stehen bleibt: Bei „Alt Zauche-Wußwerk/Stara
            Niwa-Wózwjerch" (39 Zeichen) wäre sonst entweder der Knopf breiter
            als die Seite oder die Handlung abgeschnitten. Gekürzt wird per
            Stylesheet, nicht im Code — so wird genau so viel weggenommen, wie
            der vorhandene Platz verlangt, statt nach einer geratenen
            Zeichenzahl. */}
        <button type="button" onClick={() => setOffen(true)} className="sc-glocke" style={S.knopfPrimaer}>
          <IconGlocke size={16} />
          <span className="gemeinde-abo-ort">{name}</span> abonnieren
        </button>
        <p style={S.ctaText}>
          {texte.teaser}{" "}
          <InfoTooltip title={`Meldungen zu ${name}`} ariaLabel="Was das Abo bedeutet" exportNote={false}>
            {texte.hilfe}
          </InfoTooltip>
        </p>
      </div>

      <Modal
        open={offen}
        onClose={() => setOffen(false)}
        title={`Meldungen zu ${name}`}
        intro={zustand === "fertig" ? undefined : texte.intro}
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

            {quelle === "foerderung" && (
              <fieldset style={S.feld_gruppe}>
                <legend style={S.legende}>Wofür interessierst du dich?</legend>
                <div style={S.haken_reihe}>
                  {ABO_TECHNIKEN.map((t) => (
                    <label key={t} style={S.haken}>
                      <input
                        type="checkbox"
                        checked={gewaehlt.includes(t)}
                        onChange={() => umschalten(t)}
                        style={S.box}
                      />
                      {ABO_TECHNIK_LABEL[t]}
                    </label>
                  ))}
                </div>
                {gewaehlt.length === 0 && (
                  <p style={S.hinweis}>
                    Ohne Auswahl bekommst du alles, was in {name} gefördert wird.
                  </p>
                )}
              </fieldset>
            )}

            {/* EINE Selbstauskunft, kein Pflichtfeld und keine Hürde — und nur
                hier, beim Bestands-Abo. Sie sagt nicht, WAS jemand bekommt
                (das tut die Technik-Frage auf der Förderseite), sondern WIE es
                formuliert wird. Der Erklärsatz nennt den Grund und verspricht
                dabei keinen Inhalt: Was eine Verwaltung zusätzlich bekommt,
                ist noch nicht gebaut, und eine Zusage darauf wäre eine
                Werbeaussage ohne Deckung. */}
            {quelle === "gemeinde" && (
            <label style={S.rolle}>
              <input
                type="checkbox"
                checked={ausVerwaltung}
                onChange={(e) => setAusVerwaltung(e.target.checked)}
                disabled={sendet}
                style={S.box}
              />
              <span>
                Ich arbeite für die Stadt- oder Gemeindeverwaltung
                <span style={S.rolleGrund}>
                  Dann formulieren wir die Meldung für euch, nicht für Hausbesitzer.
                </span>
              </span>
            </label>
            )}

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
    // Flex, damit der gekürzte Ortsname und das feste „abonnieren"
    // nebeneinander bleiben und nur der Name schrumpft.
    display: "inline-flex",
    alignItems: "baseline",
    gap: "0.3em",
    maxWidth: "100%",
    padding: "10px 18px",
    fontSize: v("--font-size-body"),
    fontFamily: "inherit",
    fontWeight: 600,
    color: "#fff",
    background: v("--color-accent"),
    border: "none",
    borderRadius: v("--radius-md"),
    cursor: "pointer",
    // Einzeilig — der Ortsname darin wird gekürzt statt umgebrochen.
    whiteSpace: "nowrap",
  },
  // Kein eigener Außenabstand: Die Zeile setzt ihre Abstände im Stylesheet,
  // sonst addieren sich zwei Quellen und der Text sitzt nicht mehr auf der
  // Mitte des Knopfes.
  ctaText: {
    margin: `${space.xs}px 0 0`,
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
  feld_gruppe: { border: "none", padding: 0, margin: `${space.lg}px 0 0` },
  legende: {
    padding: 0,
    fontSize: v("--font-size-small"),
    color: v("--color-text-muted"),
    marginBottom: space.sm,
  },
  haken_reihe: { display: "flex", flexDirection: "column", gap: space.sm },
  haken: {
    display: "flex",
    alignItems: "center",
    gap: space.sm,
    fontSize: v("--font-size-body"),
    color: v("--color-text-primary"),
    cursor: "pointer",
  },
  box: { width: 17, height: 17, accentColor: v("--color-accent"), cursor: "pointer" },
  // Oben ausgerichtet, nicht mittig: Das Kästchen steht neben ZWEI Zeilen
  // (Frage und Grund). Mittig gesetzt rutschte es in den Zwischenraum und
  // sähe aus, als gehöre es zu keiner von beiden.
  rolle: {
    display: "flex",
    alignItems: "flex-start",
    gap: space.sm,
    marginTop: space.lg,
    fontSize: v("--font-size-body"),
    color: v("--color-text-primary"),
    lineHeight: 1.4,
    cursor: "pointer",
  },
  rolleGrund: {
    display: "block",
    fontSize: v("--font-size-small"),
    color: v("--color-text-muted"),
    marginTop: 2,
  },
  hinweis: {
    fontSize: v("--font-size-small"),
    color: v("--color-text-muted"),
    margin: `${space.sm}px 0 0`,
  },
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
