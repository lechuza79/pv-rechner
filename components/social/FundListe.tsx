"use client";

import { useState } from "react";
import Link from "next/link";
import { v, space, pad } from "../../lib/theme";
import type { VorratsFund, FundStand } from "../../lib/social-fundvorrat";
import { MUSTER_TAKT, TAKT_LABEL } from "../../lib/social-funde";

// Der Vorrat zum Stöbern.
//
// EIN FUND IST EIN SATZ, NICHT EINE ZEILE IN EINER TABELLE. Wer auswählen soll,
// welche Geschichte einen Post wert ist, liest den Satz — nicht eine Kennzahl
// daneben. Die Stärke ordnet nur die Reihenfolge und steht klein; sie ist eine
// Rangzahl ohne Einheit, und größer gesetzt läse sie sich wie ein Messwert.
//
// Die Grundlage klappt auf, statt danebenzustehen: Sie ist der wichtigste Teil
// (dort steht, was die Zahl NICHT hergibt), aber beim Durchblättern von
// hundert Funden im Weg.

function standFarbe(stand: FundStand): string {
  if (stand === "vorgemerkt") return v("--color-accent");
  if (stand === "gepostet") return v("--color-positive");
  return v("--color-text-muted");
}

export function FundListe({
  funde,
  onStandAction,
}: {
  funde: VorratsFund[];
  onStandAction: (kennung: string, stand: FundStand) => Promise<void>;
}) {
  const [offen, setOffen] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState<string | null>(null);
  const [kopiert, setKopiert] = useState<string | null>(null);
  // Der Stand wird sofort gezeigt und nicht erst nach dem Neuladen: Wer
  // fünfzig Funde durchsieht, klickt schneller, als eine Seite neu baut.
  const [staende, setStaende] = useState<Record<string, FundStand>>({});

  const standVon = (f: VorratsFund) => staende[f.kennung] ?? f.stand;

  async function setzen(f: VorratsFund, stand: FundStand) {
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
      <p style={{ color: v("--color-text-muted"), fontSize: 14 }}>
        Kein Fund in dieser Auswahl. Der Suchlauf füllt den Vorrat.
      </p>
    );
  }

  return (
    // LESEBREITE, nicht Arbeitsbreite. Der Adminbereich ist 1440 Pixel breit,
    // weil dort Tabellen mit vielen Spalten stehen — ein Fund ist aber ein
    // SATZ, und ein Satz über 1400 Pixel ist nicht schneller zu lesen, sondern
    // langsamer: Das Auge verliert beim Zeilensprung den Anfang.
    <ul
      style={{
        listStyle: "none",
        margin: 0,
        padding: 0,
        display: "grid",
        gap: space.sm,
        maxWidth: 820,
      }}
    >
      {funde.map((f, i) => {
        const stand = standVon(f);
        const auf = offen === f.kennung;
        // Die Stärke bedeutet je Muster etwas anderes (Prozentpunkte hier,
        // Faktoren dort). Die Trennlinie sagt, wo eine Skala endet und die
        // nächste beginnt — ohne sie liest man die Liste als eine Rangfolge.
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
                  fontSize: 11,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: v("--color-text-muted"),
                }}
              >
                {f.muster}
              </p>
            )}
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.45 }}>{f.satz}</p>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: space.sm,
                marginTop: space.sm,
                fontSize: 12,
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

              <span>{f.muster}</span>
              <span aria-hidden>·</span>
              {/* Zwei verschiedene Aussagen, deshalb zwei Angaben: Wie lange
                  DIESER Fund trägt, und wie oft das MUSTER Nachschub liefert. */}
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
              <span style={{ color: standFarbe(stand) }}>{stand}</span>

              <span style={{ flex: 1 }} />

              <button
                type="button"
                onClick={() => setOffen(auf ? null : f.kennung)}
                aria-expanded={auf}
                style={knopf(false)}
              >
                {auf ? "Grundlage zu" : "Grundlage"}
              </button>
              {/* Der Weg zum Entwurf steht an JEDEM Fund, nicht nur an den
                  vorgemerkten: Man sieht dem Satz allein nicht an, ob er als
                  Beitrag trägt — das entscheidet sich am Bild daneben. */}
              <Link
                href={`/admin/redaktion/bucket/${encodeURIComponent(f.kennung)}`}
                style={{ ...knopf(false), textDecoration: "none" }}
              >
                Entwurf
              </Link>
              {(["vorgemerkt", "verworfen", "offen"] as FundStand[])
                .filter((z) => z !== stand)
                .map((z) => (
                  <button
                    key={z}
                    type="button"
                    disabled={laeuft === f.kennung}
                    onClick={() => void setzen(f, z)}
                    style={knopf(z === "vorgemerkt")}
                  >
                    {z === "offen" ? "zurücksetzen" : z}
                  </button>
                ))}
            </div>

            {auf && (
              <div
                style={{
                  marginTop: space.sm,
                  paddingTop: space.sm,
                  borderTop: `1px solid ${v("--color-border")}`,
                  fontSize: 13,
                  lineHeight: 1.5,
                  color: v("--color-text-muted"),
                }}
              >
                <p style={{ margin: 0 }}>{f.grundlage}</p>
                {f.werte.length > 0 && (
                  <ul style={{ margin: `${space.sm}px 0 0`, paddingLeft: space.lg }}>
                    {f.werte.map((w, i) => (
                      <li key={i}>
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
  );
}

function knopf(betont: boolean): React.CSSProperties {
  return {
    font: "inherit",
    background: betont ? v("--color-accent") : "transparent",
    color: betont ? v("--color-text-on-accent") : v("--color-text-muted"),
    border: `1px solid ${betont ? "transparent" : v("--color-border")}`,
    borderRadius: v("--radius-sm"),
    padding: pad("xs", "sm"),
    cursor: "pointer",
  };
}
