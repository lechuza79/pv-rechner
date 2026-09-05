"use client";

import { useEffect, useState } from "react";
import Modal from "../Modal";
import { StoryTisch } from "./StoryTisch";
import { IconChevronLeft, IconChevronRight } from "../Icons";
import { v, space, pad } from "../../lib/theme";
import { HAND_STAENDE, FUND_STAND_LABEL } from "../../lib/social-fundstand";
import type { FundStand } from "../../lib/social-fundstand";
import { MUSTER_TAKT, TAKT_LABEL } from "../../lib/social-funde";
import type { Befund as MechanikBefund } from "../../lib/social-mechanik";
import type { SocialPost } from "../../lib/social-posts";

// Der Vorrat zum Stöbern — und bearbeitet wird im FENSTER, wie in der
// Entwicklung.
//
// DIESELBE BEDIENUNG WIE BEI DEN FERTIGEN BEITRÄGEN, und das war eine
// Korrektur: Der erste Anlauf hatte eine eigene Seite je Entwurf, mit eigenen
// Knöpfen und eigener Anordnung. Zwei Oberflächen für dieselbe Arbeit driften —
// und wer im Bucket etwas anderes bedient als in der Entwicklung, lernt zweimal
// dasselbe.
//
// DIE PFEILE SIND DER PUNKT DES FENSTERS. Beim Durchsehen von sechshundert
// Funden will man weiter, nicht schließen und neu öffnen. Der Weg ist dieselbe
// Liste, in der man gerade filtert — also die Reihenfolge auf dem Bildschirm,
// nicht die im Bestand.
//
// EIN FUND IST EIN SATZ, nicht eine Zeile in einer Tabelle. Wer auswählen soll,
// liest den Satz; die Stärke ordnet nur und steht klein.

/** Was die Liste je Fund braucht — der Fund plus sein Entwurf. */
export type FundEintrag = {
  kennung: string;
  muster: keyof typeof MUSTER_TAKT;
  satz: string;
  staerke: number;
  grundlage: string;
  werte: { name: string; wert: number; einheit: string }[];
  evergreen: boolean;
  stand: FundStand;
  /** Wann der Suchlauf ihn zuletzt gefunden hat. */
  zuletztGesehen: string;
  /** Der jüngste Lauf überhaupt — daran misst sich, ob ein Fund veraltet ist. */
  juengsterLauf: string;
  /** Der Entwurf, serverseitig aus dem Fund gerechnet. */
  entwurf: SocialPost & { offen: string[] };
  abdruck: string;
  befunde: MechanikBefund[];
};

/**
 * Hat der jüngste Lauf diesen Fund noch gefunden?
 *
 * Eine Stunde Spielraum, weil ein Lauf selbst Minuten braucht und die Zeilen
 * nicht alle im selben Augenblick geschrieben werden.
 */
function veraltet(f: FundEintrag): boolean {
  const gesehen = Date.parse(f.zuletztGesehen);
  const lauf = Date.parse(f.juengsterLauf);
  if (!Number.isFinite(gesehen) || !Number.isFinite(lauf)) return false;
  return lauf - gesehen > 3_600_000;
}

function standFarbe(stand: FundStand): string {
  if (stand === "vorgemerkt") return v("--color-accent");
  if (stand === "beitrag" || stand === "geplant") return v("--color-positive");
  return v("--color-text-muted");
}

/** Der Knopf sagt, was er TUT, nicht wie der Zustand danach heißt. */
const HANDLUNG: Record<FundStand, string> = {
  offen: "zurücksetzen",
  vorgemerkt: "vormerken",
  verworfen: "verwerfen",
  beitrag: "Beitrag",
  geplant: "geplant",
};

export function FundListe({
  funde,
  onStandAction,
}: {
  funde: FundEintrag[];
  onStandAction: (kennung: string, stand: FundStand) => Promise<void>;
}) {
  const [offen, setOffen] = useState<string | null>(null);
  const [aufgeklappt, setAufgeklappt] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState<string | null>(null);
  const [kopiert, setKopiert] = useState<string | null>(null);
  // Der Stand wird sofort gezeigt und nicht erst nach dem Neuladen: Wer
  // fünfzig Funde durchsieht, klickt schneller, als eine Seite neu baut.
  const [staende, setStaende] = useState<Record<string, FundStand>>({});

  const standVon = (f: FundEintrag) => staende[f.kennung] ?? f.stand;
  const stelle = funde.findIndex((f) => f.kennung === offen);
  const aktiv = stelle >= 0 ? funde[stelle] : null;

  // Mit den Pfeiltasten weiter — beim Durchsehen greift niemand zur Maus.
  useEffect(() => {
    if (!aktiv) return;
    const taste = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" && stelle < funde.length - 1) {
        setOffen(funde[stelle + 1].kennung);
      }
      if (e.key === "ArrowLeft" && stelle > 0) setOffen(funde[stelle - 1].kennung);
    };
    document.addEventListener("keydown", taste);
    return () => document.removeEventListener("keydown", taste);
  }, [aktiv, stelle, funde]);

  async function setzen(f: FundEintrag, stand: FundStand) {
    setLaeuft(f.kennung);
    try {
      await onStandAction(f.kennung, stand);
      setStaende((s) => ({ ...s, [f.kennung]: stand }));
    } finally {
      setLaeuft(null);
    }
  }

  if (funde.length === 0) {
    return (
      <p style={{ color: v("--color-text-muted"), fontSize: v("--font-size-body") }}>
        Kein Fund in dieser Auswahl. Der Suchlauf füllt den Vorrat.
      </p>
    );
  }

  return (
    <>
      <ul
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "grid",
          gap: space.sm,
          // LESEBREITE, nicht Arbeitsbreite: Ein Satz über 1400 Pixel ist nicht
          // schneller zu lesen, sondern langsamer — das Auge verliert beim
          // Zeilensprung den Anfang.
          maxWidth: 820,
        }}
      >
        {funde.map((f, i) => {
          const stand = standVon(f);
          const auf = aufgeklappt === f.kennung;
          // Die Stärke bedeutet je Muster etwas anderes (Prozentpunkte hier,
          // Faktoren dort). Die Zwischenzeile sagt, wo eine Skala endet.
          const neuesMuster = i === 0 || funde[i - 1].muster !== f.muster;
          return (
            <li
              key={f.kennung}
              style={{
                border: `1px solid ${v("--color-border")}`,
                borderRadius: v("--radius-md"),
                padding: pad("md", "md"),
                background: v("--color-bg"),
                opacity: stand === "verworfen" ? 0.5 : 1,
              }}
            >
              {neuesMuster && (
                <p
                  style={{
                    margin: `0 0 ${space.xs}px`,
                    fontSize: v("--font-size-caption"),
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: v("--color-text-muted"),
                  }}
                >
                  {f.muster}
                </p>
              )}

              {/* Der Satz ist das Klickziel: Er ist die Sache, um die es geht,
                  und ein Extraknopf daneben wäre ein zweiter Weg zum selben
                  Fenster. */}
              <button
                type="button"
                onClick={() => setOffen(f.kennung)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  font: "inherit",
                  fontSize: v("--font-size-body"),
                  lineHeight: 1.45,
                  background: "transparent",
                  border: "none",
                  padding: 0,
                  color: v("--color-text-primary"),
                  cursor: "pointer",
                }}
              >
                {f.satz}
              </button>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: space.sm,
                  marginTop: space.sm,
                  fontSize: v("--font-size-small"),
                  color: v("--color-text-muted"),
                }}
              >
                {/* Die Kennung ist das, was man zurufen kann — deshalb steht sie
                    sichtbar da und lässt sich mit einem Klick kopieren. */}
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard?.writeText(f.kennung);
                    setKopiert(f.kennung);
                    setTimeout(() => setKopiert(null), 1500);
                  }}
                  title="Kennung kopieren"
                  style={{
                    font: "inherit",
                    fontFamily: "ui-monospace, monospace",
                    background: v("--color-bg-muted"),
                    border: `1px solid ${v("--color-border")}`,
                    borderRadius: v("--radius-sm"),
                    padding: pad("xs", "sm"),
                    cursor: "pointer",
                    color: "inherit",
                  }}
                >
                  {kopiert === f.kennung ? "kopiert" : f.kennung}
                </button>

                {/* Zwei verschiedene Aussagen: Wie lange DIESER Fund trägt, und
                    wie oft das MUSTER Nachschub liefert. */}
                <span
                  title={
                    f.evergreen
                      ? "Trägt über Jahre — kann jederzeit raus"
                      : "An ein Zeitfenster gebunden — wird kalt"
                  }
                  style={{ color: f.evergreen ? v("--color-positive") : v("--color-text-muted") }}
                >
                  {f.evergreen ? "Evergreen" : "zeitnah"}
                </span>
                <span aria-hidden>·</span>
                <span title="Wie oft dieses Muster Nachschub liefert">
                  {TAKT_LABEL[MUSTER_TAKT[f.muster]]}
                </span>
                <span aria-hidden>·</span>
                <span title="Rangzahl, ordnet nur die Liste">
                  Stärke {f.staerke.toLocaleString("de-DE", { maximumFractionDigits: 1 })}
                </span>
                <span aria-hidden>·</span>
                <span style={{ color: standFarbe(stand) }}>{FUND_STAND_LABEL[stand]}</span>
                {/* EIN FUND, DEN DER LETZTE LAUF NICHT MEHR FAND, IST NICHT MEHR
                    WAHR. Er wird nicht gelöscht — die Vormerkung soll nicht
                    verschwinden —, aber er darf auch nicht wie ein frischer
                    aussehen: Die Daten haben sich bewegt, und der Satz steht auf
                    Zahlen von damals. */}
                {veraltet(f) && (
                  <>
                    <span aria-hidden>·</span>
                    <span
                      title={`Zuletzt gefunden am ${new Date(f.zuletztGesehen).toLocaleDateString("de-DE")} — der jüngste Lauf kennt ihn nicht mehr.`}
                      style={{ color: v("--color-negative") }}
                    >
                      veraltet
                    </span>
                  </>
                )}

                <span style={{ flex: 1 }} />

                <button
                  type="button"
                  onClick={() => setAufgeklappt(auf ? null : f.kennung)}
                  aria-expanded={auf}
                  style={knopf(false)}
                >
                  {auf ? "Grundlage zu" : "Worauf beruht das?"}
                </button>
                {/* Nur die Stände, die ein Mensch selbst setzt — und beschriftet
                    als HANDLUNG. „vorgemerkt" auf einem Knopf sagt, wie der
                    Zustand danach heißt, nicht was der Klick tut; genau daran
                    ist die erste Fassung unverständlich geblieben. */}
                {HAND_STAENDE.filter((z) => z !== stand).map((z) => (
                  <button
                    key={z}
                    type="button"
                    disabled={laeuft === f.kennung}
                    onClick={() => void setzen(f, z)}
                    style={knopf(z === "vorgemerkt")}
                  >
                    {HANDLUNG[z]}
                  </button>
                ))}
              </div>

              {auf && (
                <div
                  style={{
                    marginTop: space.sm,
                    paddingTop: space.sm,
                    borderTop: `1px solid ${v("--color-border")}`,
                    fontSize: v("--font-size-small"),
                    lineHeight: 1.5,
                    color: v("--color-text-muted"),
                  }}
                >
                  <p style={{ margin: 0 }}>{f.grundlage}</p>
                  {f.werte.length > 0 && (
                    <ul style={{ margin: `${space.sm}px 0 0`, paddingLeft: space.lg }}>
                      {f.werte.map((w, n) => (
                        <li key={n}>
                          {w.name}: {w.wert.toLocaleString("de-DE", { maximumFractionDigits: 2 })}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {/* `open` statt bedingtem Rendern: Der Baustein blendet beim Schließen
          aus, und wer ihn aus dem Baum nimmt, killt genau diese Bewegung. */}
      <Modal
        open={!!aktiv}
        onClose={() => setOffen(null)}
        title={aktiv?.entwurf.titel ?? ""}
        maxWidth={1180}
      >
        {aktiv && (
          <>
            {/* Die Pfeile stehen OBEN: Wer durchsieht, sucht sie dort, nicht
                nach dem Scrollen durch einen ganzen Tisch. Sie folgen der
                Reihenfolge auf dem Bildschirm — also der gefilterten Liste. */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: space.sm,
                marginBottom: space.md,
                fontSize: v("--font-size-small"),
                color: v("--color-text-muted"),
              }}
            >
              <button
                type="button"
                onClick={() => stelle > 0 && setOffen(funde[stelle - 1].kennung)}
                disabled={stelle <= 0}
                aria-label="Voriger Fund"
                style={{ ...knopf(false), opacity: stelle <= 0 ? 0.4 : 1 }}
              >
                <IconChevronLeft size={12} />
              </button>
              <button
                type="button"
                onClick={() =>
                  stelle < funde.length - 1 && setOffen(funde[stelle + 1].kennung)
                }
                disabled={stelle >= funde.length - 1}
                aria-label="Nächster Fund"
                style={{ ...knopf(false), opacity: stelle >= funde.length - 1 ? 0.4 : 1 }}
              >
                <IconChevronRight size={12} />
              </button>
              <span>
                {stelle + 1} von {funde.length}
              </span>
              <span aria-hidden>·</span>
              <span style={{ fontFamily: "ui-monospace, monospace" }}>{aktiv.kennung}</span>

              <span style={{ flex: 1 }} />

              {/* Vormerken und verwerfen gehören AUCH ins Fenster: Wer den
                  Entwurf gerade gesehen hat, entscheidet dort — nicht nachdem
                  er geschlossen und die Zeile wiedergefunden hat. */}
              {HAND_STAENDE.filter((z) => z !== standVon(aktiv)).map((z) => (
                <button
                  key={z}
                  type="button"
                  disabled={laeuft === aktiv.kennung}
                  onClick={() => void setzen(aktiv, z)}
                  style={knopf(z === "vorgemerkt")}
                >
                  {HANDLUNG[z]}
                </button>
              ))}
            </div>

            {/* Was noch fehlt, ÜBER dem Tisch: Darunter läse es niemand, der
                den Entwurf gerade für fertig hält. */}
            <ul
              style={{
                margin: `0 0 ${space.md}px`,
                padding: pad("sm", "md"),
                listStyle: "none",
                border: `1px solid ${v("--color-border-accent")}`,
                borderRadius: v("--radius-md"),
                background: v("--color-bg-accent"),
                fontSize: v("--font-size-small"),
              }}
            >
              <li style={{ fontWeight: 600, marginBottom: space.xxs }}>Was noch fehlt</li>
              {aktiv.entwurf.offen.map((o, n) => (
                <li key={n} style={{ color: v("--color-text-secondary") }}>
                  · {o}
                </li>
              ))}
            </ul>

            {/* Derselbe Tisch wie bei den fertigen Beiträgen. `key`: Wechselt
                der Fund, muss er seinen inneren Zustand neu setzen — sonst
                trüge er die Einstellungen des vorigen. */}
            <StoryTisch
              key={aktiv.kennung}
              post={aktiv.entwurf}
              pruefungen={[]}
              abdruck={aktiv.abdruck}
              befunde={aktiv.befunde}
              gesendetAm={{}}
              ohneTitel
            />
          </>
        )}
      </Modal>
    </>
  );
}

/** Nur damit der Baustein nicht in jeder Zeile denselben Stil neu tippt. */
function knopf(betont: boolean): React.CSSProperties {
  return {
    font: "inherit",
    fontSize: v("--font-size-small"),
    background: betont ? v("--color-accent") : "transparent",
    color: betont ? v("--color-text-on-accent") : v("--color-text-muted"),
    border: `1px solid ${betont ? "transparent" : v("--color-border")}`,
    borderRadius: v("--radius-sm"),
    padding: pad("xs", "sm"),
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
  };
}
