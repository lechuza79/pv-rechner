"use client";

import { useEffect, useRef, useState } from "react";
import { v, space, pad, iconSizes } from "../lib/theme";
import { IconArrowRight, IconCheck, IconClose } from "./Icons";
import Modal from "./Modal";
import FlowNav from "./FlowNav";

/**
 * Der Rückkanal: Der Nutzer schickt sein fertiges Ergebnis an den Betrieb,
 * von dessen Website er gekommen ist.
 *
 * ── Warum das die Reihenfolge NICHT umdreht ────────────────────────────────
 * Der Nutzer sieht sein Ergebnis zuerst und entscheidet danach selbst, ob er
 * Kontakt aufnimmt. Das ist die Trennlinie zum gesamten Wettbewerb, wo die
 * Adresse der Preis für das Ergebnis ist — und sie wird nie umgedreht.
 *
 * ── Warum ein FLOW und kein langes Formular ────────────────────────────────
 * Als Liste von sieben Feldern sah es aus wie ein Antrag; drei Schritte mit je
 * einer Frage lesen sich wie ein Gespräch. Die Schrittfolge benutzt denselben
 * Baustein wie die Rechner (`FlowNav`) — eine zweite Fassung davon würde sich
 * binnen einer Woche in Knopfstellung und Zurück-Verhalten unterscheiden.
 *
 * ── Warum die ADRESSE zuerst kommt ─────────────────────────────────────────
 * Sie gehört zum Vorhaben, die Kontaktdaten zur Person. Wer als Erstes nach
 * seinem Namen gefragt wird, liest das Fenster als Datenerfassung; wer zuerst
 * nach dem Haus gefragt wird, als Vorbereitung eines Angebots.
 *
 * ── Warum keine Einwilligungs-Checkbox ────────────────────────────────────
 * Tragend ist Art. 6 Abs. 1 lit. b DSGVO — der Nutzer bittet selbst um die
 * Übermittlung, das ist eine vorvertragliche Maßnahme. Pflicht ist stattdessen,
 * dass VOR dem Absenden sichtbar ist, WELCHE Angaben an WEN gehen
 * (Legal-Judges, 01.09.2026). Deshalb steht das im letzten Schritt direkt über
 * dem Knopf — nicht im ersten, wo es niemand mehr erinnert.
 *
 * ── Was der Betrieb bekommt ────────────────────────────────────────────────
 * Den Link auf das Ergebnis, nicht die Zahlen im Text. Der Link trägt den
 * vollständigen Zustand der Rechnung; wer ihn öffnet, sieht dieselbe Seite mit
 * denselben Annahmen und kann sie weiterdrehen.
 */

/** Öffnet den Rückkanal von außen — aus der klebenden Leiste des Ergebnisses. */
export const RUECKKANAL_OEFFNEN = "sc-rueckkanal-oeffnen";

/**
 * Sagt der Umgebung, ob das Fenster offen ist.
 *
 * Ohne diese Meldung bleibt die klebende Leiste hinter dem Fenster sichtbar —
 * ein Knopf, der durch die Abdunkelung schimmert und nicht anklickbar ist.
 */
export const RUECKKANAL_ZUSTAND = "sc-rueckkanal-zustand";

/** Zwei Bilder genügen, und mehr verträgt eine Mail auch nicht. */
const MAX_FOTOS = 2;
/** Je Bild. Ein Handyfoto liegt darunter; alles darüber ist ein Scan oder ein Irrtum. */
const MAX_FOTO_BYTES = 5 * 1024 * 1024;

export type PartnerAngabe = {
  /** Wie der Betrieb heißt — steht im Knopf und in der Bestätigung. */
  name: string;
  /** Die Kennung seiner Seite. Der Server löst daraus die Zieladresse auf. */
  kennung: string;
};

type Foto = { name: string; inhalt: string };

const SCHRITTE = ["Wo steht das Haus?", "Fotos vom Dach", "Wie erreicht man Sie?"];

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
  const [schritt, setSchritt] = useState(0);

  const [strasse, setStrasse] = useState("");
  const [plz, setPlz] = useState(plzAusRechner ?? "");
  const [ort, setOrt] = useState("");
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [name, setName] = useState("");
  const [kontakt, setKontakt] = useState("");
  const [nachricht, setNachricht] = useState("");

  const [sendet, setSendet] = useState(false);
  const [gesendet, setGesendet] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const dateiRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const auf = () => setOffen(true);
    window.addEventListener(RUECKKANAL_OEFFNEN, auf);
    return () => window.removeEventListener(RUECKKANAL_OEFFNEN, auf);
  }, []);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent(RUECKKANAL_ZUSTAND, { detail: { offen: offen && !gesendet } }),
    );
  }, [offen, gesendet]);

  // Ein Kontaktweg genügt — wer nur anrufen lassen will, soll keine Mailadresse
  // erfinden müssen. Der Name ist Pflicht: Eine Anfrage ohne Absender ist für
  // den Betrieb wertlos.
  const kontaktOk = name.trim().length >= 2 && kontakt.trim().length >= 5;

  // Adresse und Fotos sind FREIWILLIG. Pflicht wäre eine Hürde vor dem
  // Absenden — wer nur eine Rückfrage stellen will, hat noch kein Vorhaben.
  // Deshalb ist „Weiter" in den ersten beiden Schritten immer frei.
  const weiterAktiv = schritt < 2 ? true : kontaktOk && !sendet;

  async function dateienNehmen(liste: FileList | null): Promise<void> {
    if (!liste) return;
    setFehler(null);
    const neu: Foto[] = [];
    for (const datei of Array.from(liste).slice(0, MAX_FOTOS - fotos.length)) {
      if (!datei.type.startsWith("image/")) {
        setFehler("Bitte nur Bilder auswählen.");
        continue;
      }
      if (datei.size > MAX_FOTO_BYTES) {
        setFehler(`„${datei.name}" ist größer als 5 MB.`);
        continue;
      }
      const inhalt = await new Promise<string>((fertig) => {
        const leser = new FileReader();
        leser.onload = () => fertig(String(leser.result).split(",")[1] ?? "");
        leser.readAsDataURL(datei);
      });
      neu.push({ name: datei.name, inhalt });
    }
    setFotos((alt) => [...alt, ...neu].slice(0, MAX_FOTOS));
    if (dateiRef.current) dateiRef.current.value = "";
  }

  async function senden(): Promise<void> {
    if (!kontaktOk || sendet) return;
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
          fotos,
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

  const anschriftText = [strasse.trim(), [plz.trim(), ort.trim()].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");

  return (
    <>
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
        <button type="button" onClick={() => setOffen(true)} style={S.aufmachen}>
          <span style={S.aufmachenInner}>
            Ergebnis an {partner.name} schicken
            <IconArrowRight size={iconSizes.md} />
          </span>
        </button>
      )}

      {/* `open` statt bedingtem Rendern: Sonst nimmt das Ausblenden keine Zeit
          und das Fenster verschwindet schlagartig. */}
      <Modal open={offen && !gesendet} onClose={() => setOffen(false)} title={SCHRITTE[schritt]}>
        {/* Fortschritt wie im Rechner: drei Balken, die erledigten gefüllt. */}
        <div style={S.fortschritt}>
          {SCHRITTE.map((_, i) => (
            <div key={i} style={balken(i <= schritt)} />
          ))}
        </div>

        {schritt === 0 && (
          <>
            <p style={S.hinweis}>
              Mit der Adresse kann {partner.name} das Dach vorab ansehen und die
              nutzbare Fläche einschätzen. Freiwillig — Sie können den Schritt
              überspringen.
            </p>
            <label htmlFor="rk-strasse" style={S.label}>
              Straße und Hausnummer
            </label>
            <input
              id="rk-strasse"
              value={strasse}
              onChange={(e) => setStrasse(e.target.value)}
              style={S.feld}
              autoComplete="street-address"
              placeholder="Musterweg 12"
            />
            <div style={S.zeile}>
              <div style={{ width: 120, flexShrink: 0 }}>
                <label htmlFor="rk-plz" style={S.label}>
                  PLZ
                </label>
                <input
                  id="rk-plz"
                  value={plz}
                  onChange={(e) => setPlz(e.target.value)}
                  style={S.feld}
                  autoComplete="postal-code"
                  inputMode="numeric"
                />
              </div>
              <div style={{ flex: 1 }}>
                <label htmlFor="rk-ort" style={S.label}>
                  Ort
                </label>
                <input
                  id="rk-ort"
                  value={ort}
                  onChange={(e) => setOrt(e.target.value)}
                  style={S.feld}
                  autoComplete="address-level2"
                />
              </div>
            </div>
          </>
        )}

        {schritt === 1 && (
          <>
            <p style={S.hinweis}>
              Zwei Bilder ersparen viele Rückfragen: das <strong>Dach von außen</strong> und
              der <strong>geöffnete Zählerschrank</strong>. Daran sieht {partner.name}{" "}
              sofort, was an Montage und Elektrik nötig ist. Freiwillig.
            </p>

            {fotos.length > 0 && (
              <div style={S.fotoListe}>
                {fotos.map((f, i) => (
                  <div key={i} style={S.fotoZeile}>
                    {/* Vorschau aus dem eingelesenen Bild — kein Abruf nach außen. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`data:image/*;base64,${f.inhalt}`} alt="" style={S.fotoBild} />
                    <span style={S.fotoName}>{f.name}</span>
                    <button
                      type="button"
                      onClick={() => setFotos((a) => a.filter((_, j) => j !== i))}
                      aria-label={`${f.name} entfernen`}
                      style={S.fotoWeg}
                    >
                      <IconClose size={iconSizes.sm} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {fotos.length < MAX_FOTOS && (
              <>
                <button type="button" onClick={() => dateiRef.current?.click()} style={S.fotoWaehlen}>
                  {fotos.length === 0 ? "Bilder auswählen" : "Noch ein Bild"}
                </button>
                <input
                  ref={dateiRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => void dateienNehmen(e.target.files)}
                  style={{ display: "none" }}
                />
              </>
            )}
          </>
        )}

        {schritt === 2 && (
          <>
            <label htmlFor="rk-name" style={S.label}>
              Ihr Name
            </label>
            <input
              id="rk-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={S.feld}
              autoComplete="name"
            />

            <label htmlFor="rk-kontakt" style={{ ...S.label, marginTop: space.lg }}>
              E-Mail oder Telefon
            </label>
            <input
              id="rk-kontakt"
              value={kontakt}
              onChange={(e) => setKontakt(e.target.value)}
              style={S.feld}
              autoComplete="email"
              placeholder="damit man Sie erreichen kann"
            />

            <label htmlFor="rk-nachricht" style={{ ...S.label, marginTop: space.lg }}>
              Nachricht <span style={S.optional}>(optional)</span>
            </label>
            <textarea
              id="rk-nachricht"
              value={nachricht}
              onChange={(e) => setNachricht(e.target.value)}
              rows={3}
              style={{ ...S.feld, resize: "vertical" }}
            />

            {/* Die Auflage: Vor dem Absenden sichtbar, WAS an WEN geht — und
                zwar hier, wo es der letzte Blick vor dem Knopf ist. */}
            <div style={S.was}>
              <strong style={S.wasStark}>{partner.name} bekommt:</strong> Ihren Namen,
              Ihren Kontaktweg
              {anschriftText ? `, die Adresse (${anschriftText})` : ""}
              {fotos.length ? `, ${fotos.length === 1 ? "ein Bild" : `${fotos.length} Bilder`}` : ""}
              {nachricht.trim() ? ", Ihre Nachricht" : ""} und einen Link auf diese
              Rechnung. Sonst nichts, und niemand sonst bekommt etwas davon.
            </div>

            <p style={S.klein}>
              Wie wir mit Ihren Angaben umgehen, steht in unserer{" "}
              <a href="/datenschutz" style={S.link}>
                Datenschutzerklärung
              </a>
              .
            </p>
          </>
        )}

        {fehler && <div style={S.fehler}>{fehler}</div>}

        {/* FlowNav meldet sich bei ModalSticky selbst an — der Knopf klebt damit
            am unteren Rand des Fensters, auch bei eingeblendeter Tastatur. */}
        <FlowNav
          weiterAktiv={weiterAktiv}
          weiterLabel={
            schritt < 2 ? "Weiter" : sendet ? "Wird gesendet …" : `An ${partner.name} schicken`
          }
          inaktivHinweis="Bitte Name und Kontaktweg angeben."
          onWeiter={() => {
            if (schritt < 2) setSchritt(schritt + 1);
            else void senden();
          }}
          onZurueck={schritt > 0 ? () => setSchritt(schritt - 1) : undefined}
          zurueckSichtbar={schritt > 0}
        />
      </Modal>
    </>
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

const balken = (an: boolean): React.CSSProperties => ({
  flex: 1,
  height: 3,
  borderRadius: 2,
  background: an ? v("--color-accent") : v("--color-progress-inactive"),
  transition: "background 0.3s",
});

const S: Record<string, React.CSSProperties> = {
  aufmachen: {
    width: "100%",
    padding: pad("md", "lg"),
    borderRadius: v("--radius-md"),
    border: "none",
    background: v("--color-accent"),
    color: v("--color-text-on-accent"),
    fontSize: v("--font-size-body"),
    fontWeight: 700,
    cursor: "pointer",
    marginBottom: space.md,
  },
  aufmachenInner: { display: "inline-flex", alignItems: "center", gap: space.sm },
  fortschritt: { display: "flex", gap: 4, marginBottom: space.xl },
  hinweis: {
    fontSize: v("--font-size-small"),
    color: v("--color-text-muted"),
    lineHeight: 1.6,
    margin: `0 0 ${space.lg}px`,
  },
  label: {
    display: "block",
    fontSize: v("--font-size-small"),
    fontWeight: 600,
    color: v("--color-text-secondary"),
    marginBottom: space.md,
  },
  optional: { fontWeight: 400, color: v("--color-text-faint") },
  feld: {
    ...feldBasis,
    background: v("--color-bg-muted"),
    border: `1px solid ${v("--color-border")}`,
    color: v("--color-text-primary"),
  },
  zeile: { display: "flex", gap: space.lg, marginTop: space.lg },
  fotoWaehlen: {
    ...feldBasis,
    fontWeight: 600,
    background: v("--color-bg"),
    border: `1px dashed ${v("--color-border-accent")}`,
    color: v("--color-accent"),
    cursor: "pointer",
  },
  fotoListe: { display: "flex", flexDirection: "column", gap: space.sm, marginBottom: space.lg },
  fotoZeile: {
    display: "flex",
    alignItems: "center",
    gap: space.md,
    padding: pad("sm", "md"),
    borderRadius: v("--radius-md"),
    background: v("--color-bg-muted"),
    border: `1px solid ${v("--color-border")}`,
  },
  fotoBild: {
    width: 40,
    height: 40,
    objectFit: "cover",
    borderRadius: v("--radius-sm"),
    flexShrink: 0,
  },
  fotoName: {
    flex: 1,
    minWidth: 0,
    fontSize: v("--font-size-small"),
    color: v("--color-text-secondary"),
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  fotoWeg: {
    border: "none",
    background: "transparent",
    color: v("--color-text-faint"),
    cursor: "pointer",
    padding: 4,
    display: "flex",
    flexShrink: 0,
  },
  was: {
    marginTop: space.xl,
    padding: pad("md", "md"),
    borderRadius: v("--radius-md"),
    background: v("--color-bg-muted"),
    fontSize: v("--font-size-small"),
    color: v("--color-text-muted"),
    lineHeight: 1.6,
  },
  wasStark: { color: v("--color-text-secondary"), fontWeight: 700 },
  klein: {
    fontSize: v("--font-size-caption"),
    color: v("--color-text-faint"),
    margin: `${space.md}px 0 0`,
    lineHeight: 1.5,
  },
  link: { color: v("--color-accent"), textDecoration: "none" },
  fehler: { fontSize: v("--font-size-small"), color: v("--color-negative"), marginTop: space.md },
  fertig: {
    display: "flex",
    gap: space.md,
    alignItems: "flex-start",
    border: `1px solid ${v("--color-border")}`,
    borderRadius: v("--radius-md"),
    background: v("--color-bg-muted"),
    padding: pad("lg", "lg"),
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
