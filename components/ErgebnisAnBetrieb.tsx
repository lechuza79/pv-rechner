"use client";

import { useEffect, useState } from "react";
import { v, space, pad, iconSizes } from "../lib/theme";
import { IconArrowRight, IconCheck } from "./Icons";
import Modal, { ModalSticky } from "./Modal";

/**
 * Der Rückkanal: Der Nutzer schickt sein fertiges Ergebnis an den Betrieb,
 * von dessen Website er gekommen ist.
 *
 * ── Warum das die Reihenfolge NICHT umdreht ────────────────────────────────
 * Der Nutzer sieht sein Ergebnis zuerst und entscheidet danach selbst, ob er
 * Kontakt aufnimmt. Das ist die Trennlinie zum gesamten Wettbewerb, wo die
 * Adresse der Preis für das Ergebnis ist — und sie wird nie umgedreht.
 *
 * ── Warum keine Einwilligungs-Checkbox ────────────────────────────────────
 * Tragend ist Art. 6 Abs. 1 lit. b DSGVO — der Nutzer bittet selbst um die
 * Übermittlung, das ist eine vorvertragliche Maßnahme. Eine Einwilligung wäre
 * der schwächere Weg (widerruflich, nachweispflichtig) und ein
 * vorangekreuztes Kästchen ohnehin unwirksam. Pflicht ist stattdessen, dass
 * VOR dem Absenden sichtbar ist, WELCHE Angaben an WEN gehen (Legal-Judges,
 * 01.09.2026).
 *
 * ── Was der Betrieb bekommt ────────────────────────────────────────────────
 * Den Link auf das Ergebnis, nicht die Zahlen im Text. Der Link trägt den
 * vollständigen Zustand der Rechnung; wer ihn öffnet, sieht dieselbe Seite mit
 * denselben Annahmen und kann sie weiterdrehen. Zahlen in eine Mail zu tippen
 * hieße, sie ein zweites Mal zu pflegen — dieselbe Fehlerklasse wie überall
 * sonst im Projekt.
 */

/** Öffnet den Rückkanal von außen — aus der klebenden Leiste des Ergebnisses. */
export const RUECKKANAL_OEFFNEN = "sc-rueckkanal-oeffnen";

/**
 * Sagt der Umgebung, ob das Fenster offen ist.
 *
 * Ohne diese Meldung bleibt die klebende Leiste hinter dem Fenster sichtbar —
 * ein Knopf, der durch die Abdunkelung schimmert und nicht anklickbar ist. Der
 * Rechner kennt den Zustand des Fensters nicht; er hört ihn hier.
 */
export const RUECKKANAL_ZUSTAND = "sc-rueckkanal-zustand";

export type PartnerAngabe = {
  /** Wie der Betrieb heißt — steht im Knopf und in der Bestätigung. */
  name: string;
  /** Die Kennung seiner Seite. Der Server löst daraus die Zieladresse auf. */
  kennung: string;
};

export default function ErgebnisAnBetrieb({
  partner,
  ergebnisUrl,
  plz: plzAusRechner,
}: {
  partner: PartnerAngabe;
  /** Der Teilen-Link der aktuellen Rechnung. */
  ergebnisUrl: string;
  /** Die Postleitzahl, die der Rechner ohnehin kennt — als Vorbelegung. */
  plz?: string;
}) {
  const [offen, setOffen] = useState(false);
  const [name, setName] = useState("");
  const [kontakt, setKontakt] = useState("");
  const [nachricht, setNachricht] = useState("");
  // Die Anschrift ist OPTIONAL. Pflicht wäre eine Hürde vor dem Absenden — wer
  // nur eine Rückfrage stellen will, hat noch kein Vorhaben und bricht ab. Die
  // Postleitzahl kommt aus dem Rechner: Sie ein zweites Mal eintippen zu lassen
  // wäre eine Frage, deren Antwort wir schon haben.
  const [strasse, setStrasse] = useState("");
  const [plz, setPlz] = useState(plzAusRechner ?? "");
  const [ort, setOrt] = useState("");
  const [sendet, setSendet] = useState(false);
  const [gesendet, setGesendet] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  // Die klebende Leiste am unteren Rand ruft dasselbe Formular auf. Sie liegt
  // im Rechner (der alle drei Aktionen kennt), nicht hier — deshalb ein
  // Ereignis statt einer hochgezogenen Zustandsvariablen. Dasselbe Muster
  // benutzt die klebende Leiste der Ratgeber für den Förder-Check.
  useEffect(() => {
    const auf = () => setOffen(true);
    window.addEventListener(RUECKKANAL_OEFFNEN, auf);
    return () => window.removeEventListener(RUECKKANAL_OEFFNEN, auf);
  }, []);

  // Zustand nach außen melden, damit die klebende Leiste sich wegnimmt, solange
  // das Fenster offen ist.
  useEffect(() => {
    window.dispatchEvent(new CustomEvent(RUECKKANAL_ZUSTAND, { detail: { offen: offen && !gesendet } }));
  }, [offen, gesendet]);

  // Ein Kontaktweg genügt — wer nur anrufen lassen will, soll keine
  // Mailadresse erfinden müssen. Der Name ist Pflicht, weil eine Anfrage ohne
  // Absender für den Betrieb wertlos ist.
  const gueltig = name.trim().length >= 2 && kontakt.trim().length >= 5;

  async function senden(e: React.FormEvent) {
    e.preventDefault();
    if (!gueltig || sendet) return;
    setSendet(true);
    setFehler(null);
    try {
      const res = await fetch("/api/fachbetrieb/anfrage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kennung: partner.kennung,
          name: name.trim(),
          kontakt: kontakt.trim(),
          nachricht: nachricht.trim(),
          strasse: strasse.trim(),
          plz: plz.trim(),
          ort: ort.trim(),
          ergebnisUrl,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setGesendet(true);
    } catch {
      setFehler("Das hat gerade nicht geklappt. Bitte später noch einmal versuchen.");
    }
    setSendet(false);
  }

  const knopf = (
    <button type="button" onClick={() => setOffen(true)} style={S.aufmachen}>
      <span style={S.aufmachenInner}>
        Ergebnis an {partner.name} schicken
        <IconArrowRight size={iconSizes.md} />
      </span>
    </button>
  );

  return (
    <>
      {/* Im Seitenfluss steht nur der Knopf. Das Formular gehört ins Fenster:
          Es ist eine abgeschlossene Handlung, kein weiterer Abschnitt des
          Ergebnisses — und im Fenster klebt der Absende-Knopf am unteren Rand,
          statt auf flachen Displays weggescrollt zu sein. */}
      {gesendet ? (
        <div style={S.fertig}>
          <IconCheck size={iconSizes.md} color={v("--color-positive")} />
          <div>
            <strong style={S.fertigStark}>Ihre Anfrage ist unterwegs an {partner.name}.</strong>
            <div style={S.fertigText}>
              Mitgeschickt haben wir Ihre Angaben und einen Link auf genau diese
              Rechnung. Sie können die Seite jetzt schließen.
            </div>
          </div>
        </div>
      ) : (
        knopf
      )}

      {/* `open` statt bedingtem Rendern: Sonst nimmt das Ausblenden keine Zeit
          und das Fenster verschwindet schlagartig. */}
      <Modal
        open={offen && !gesendet}
        onClose={() => setOffen(false)}
        title={`Ergebnis an ${partner.name} schicken`}
      >
        <form onSubmit={senden} style={S.karte}>
          {/* Vor dem Absenden sichtbar, WAS an WEN geht. Das ersetzt die
              Einwilligungs-Checkbox und ist die eigentliche Auflage. */}
          <p style={S.was}>
            {partner.name} bekommt Ihren Namen, Ihren Kontaktweg, Ihre Nachricht,
            die Adresse — soweit Sie sie angeben — und einen Link auf diese
            Rechnung. Sonst nichts, und niemand sonst bekommt etwas davon.
          </p>

          {/* Die Anschrift steht VOR den Kontaktdaten: Sie gehört zum Vorhaben,
              die Kontaktdaten zur Person. Wer erst nach seinem Namen gefragt
              wird, liest das Formular als Datenerfassung; wer erst nach dem Haus
              gefragt wird, als Vorbereitung eines Angebots. */}
          <div style={S.gruppe}>
            <div style={S.gruppeTitel}>
              Wo steht das Haus? <span style={S.optional}>(optional)</span>
            </div>
            <p style={S.gruppeText}>
              Mit der Adresse kann {partner.name} das Dach schon vorab ansehen und
              die nutzbare Fläche einschätzen — das spart beim ersten Gespräch die
              Rückfragen.
            </p>
            <label style={S.label}>
              Straße und Hausnummer
              <input
                value={strasse}
                onChange={(e) => setStrasse(e.target.value)}
                style={S.feld}
                autoComplete="street-address"
              />
            </label>
            <div style={S.zeile}>
              <label style={{ ...S.label, width: 110, flexShrink: 0 }}>
                PLZ
                <input
                  value={plz}
                  onChange={(e) => setPlz(e.target.value)}
                  style={S.feld}
                  autoComplete="postal-code"
                  inputMode="numeric"
                />
              </label>
              <label style={{ ...S.label, flex: 1 }}>
                Ort
                <input
                  value={ort}
                  onChange={(e) => setOrt(e.target.value)}
                  style={S.feld}
                  autoComplete="address-level2"
                />
              </label>
            </div>
          </div>

          <label style={S.label}>
            Ihr Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={S.feld}
              autoComplete="name"
              required
            />
          </label>

          <label style={S.label}>
            E-Mail oder Telefon
            <input
              value={kontakt}
              onChange={(e) => setKontakt(e.target.value)}
              style={S.feld}
              autoComplete="email"
              required
            />
          </label>

          <label style={S.label}>
            Nachricht <span style={S.optional}>(optional)</span>
            <textarea
              value={nachricht}
              onChange={(e) => setNachricht(e.target.value)}
              rows={3}
              style={{ ...S.feld, resize: "vertical" as const }}
            />
          </label>

          {fehler && <div style={S.fehler}>{fehler}</div>}

          <p style={S.klein}>
            Wie wir mit Ihren Angaben umgehen, steht in unserer{" "}
            <a href="/datenschutz" style={S.link}>
              Datenschutzerklärung
            </a>
            .
          </p>

          {/* Klebt am unteren Rand des Fensters: Auf flachen Displays und bei
              eingeblendeter Tastatur wäre er sonst weggescrollt, und ein Schritt
              ohne sichtbaren Abschluss sieht aus wie einer ohne Fortsetzung. */}
          <ModalSticky>
            <button type="submit" disabled={!gueltig || sendet} style={S.senden(gueltig && !sendet)}>
              {sendet ? "Wird gesendet …" : `An ${partner.name} schicken`}
            </button>
          </ModalSticky>
        </form>
      </Modal>
    </>
  );
}

const S = {
  aufmachen: {
    width: "100%",
    padding: pad("md", "lg"),
    borderRadius: v("--radius-md"),
    border: "none",
    background: v("--color-accent"),
    color: "#fff",
    fontSize: v("--font-size-body"),
    fontWeight: 700,
    cursor: "pointer",
    marginBottom: space.md,
  },
  aufmachenInner: {
    display: "inline-flex",
    alignItems: "center",
    gap: space.sm,
  },
  karte: {
    border: `1px solid ${v("--color-border")}`,
    borderRadius: v("--radius-md"),
    background: v("--color-bg-muted"),
    padding: pad("lg", "lg"),
    marginBottom: space.md,
    display: "flex",
    flexDirection: "column" as const,
    gap: space.sm,
  },
  titel: {
    fontSize: v("--font-size-h3"),
    fontWeight: 700,
    color: v("--color-text-primary"),
  },
  was: {
    fontSize: v("--font-size-small"),
    color: v("--color-text-muted"),
    lineHeight: 1.6,
    margin: 0,
  },
  gruppe: {
    display: "flex",
    flexDirection: "column" as const,
    gap: space.sm,
    padding: pad("md", "md"),
    borderRadius: v("--radius-md"),
    background: v("--color-bg"),
    border: `1px solid ${v("--color-border-muted")}`,
  },
  gruppeTitel: {
    fontSize: v("--font-size-small"),
    fontWeight: 700,
    color: v("--color-text-secondary"),
  },
  gruppeText: {
    fontSize: v("--font-size-caption"),
    color: v("--color-text-muted"),
    lineHeight: 1.5,
    margin: 0,
  },
  zeile: {
    display: "flex",
    gap: space.sm,
  },
  label: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 4,
    fontSize: v("--font-size-small"),
    fontWeight: 600,
    color: v("--color-text-secondary"),
  },
  optional: { fontWeight: 400, color: v("--color-text-faint") },
  feld: {
    padding: pad("sm", "sm"),
    borderRadius: v("--radius-sm"),
    border: `1px solid ${v("--color-border")}`,
    background: v("--color-bg"),
    color: v("--color-text-primary"),
    fontSize: v("--font-size-body"),
    fontFamily: "inherit",
    width: "100%",
    boxSizing: "border-box" as const,
  },
  senden: (aktiv: boolean) => ({
    padding: pad("md", "lg"),
    borderRadius: v("--radius-md"),
    border: "none",
    background: aktiv ? v("--color-accent") : v("--color-border"),
    color: aktiv ? "#fff" : v("--color-text-faint"),
    fontSize: v("--font-size-body"),
    fontWeight: 700,
    cursor: aktiv ? "pointer" : "not-allowed",
    marginTop: space.xs,
  }),
  fehler: {
    fontSize: v("--font-size-small"),
    color: v("--color-negative"),
  },
  klein: {
    fontSize: v("--font-size-caption"),
    color: v("--color-text-faint"),
    margin: 0,
    lineHeight: 1.5,
  },
  link: { color: v("--color-accent"), textDecoration: "none" },
  fertig: {
    display: "flex",
    gap: space.sm,
    alignItems: "flex-start",
    border: `1px solid ${v("--color-border")}`,
    borderRadius: v("--radius-md"),
    background: v("--color-bg-muted"),
    padding: pad("md", "lg"),
    marginBottom: space.md,
  },
  fertigStark: {
    fontSize: v("--font-size-body"),
    fontWeight: 700,
    color: v("--color-text-primary"),
  },
  fertigText: {
    fontSize: v("--font-size-small"),
    color: v("--color-text-muted"),
    lineHeight: 1.6,
    marginTop: 2,
  },
};
