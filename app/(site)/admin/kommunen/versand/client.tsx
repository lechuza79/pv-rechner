"use client";

import { useEffect, useState } from "react";
import { v, space, pad } from "../../../../../lib/theme";
import { adminTabelle, adminTh, adminTd, adminZeile } from "../../../../../lib/admin-tabelle";
import type { Auswertung, Versandtag } from "../../../../../lib/kommunen-auswertung";

// Auswertung des Kommunen-Outreach.
//
// DIE REIHENFOLGE DER VIER ZAHLEN IST DER PUNKT: verschickt ist der Nenner,
// dann die drei Reaktionen in aufsteigender Aussagekraft. Eine Antwort misst
// Höflichkeit. Eine Veröffentlichung ist das Ziel und taucht erst Tage bis
// Wochen später auf, gefunden über die Verweise auf uns. Eine Eintragung aus
// der Verwaltung heißt, dass der Brief die Stelle erreicht hat, die über eine
// Veröffentlichung entscheidet — auch dann, wenn niemand geantwortet hat.
//
// JEDE ZAHL IST EINE UNTERGRENZE, und das steht auf der Seite, nicht in einer
// Fußnote im Code.

type Wirkung = { gesamt: Auswertung; jeKampagne: Auswertung[]; jeTag: Versandtag[] };

export default function VersandAuswertung() {
  const [wirkung, setWirkung] = useState<Wirkung | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const offeneSchuebe = (wirkung?.jeKampagne ?? []).filter((k) => k.offen > 0);

  useEffect(() => {
    fetch("/api/admin/kommunen/bilanz")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`Antwort ${r.status}`))))
      .then((j) => setWirkung(j.wirkung ?? null))
      .catch((e) => setFehler(e instanceof Error ? e.message : String(e)));
  }, []);

  return (
    <div style={{ fontFamily: v("--font-text"), color: v("--color-text-primary") }}>
      <div style={{ marginBottom: space.lg }}>
        <div style={labelKicker}>Kommunen-Outreach</div>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>Übersicht</h1>
      </div>

      {fehler && (
        <p style={{ fontSize: 13, color: v("--color-negative") }}>
          Die Auswertung konnte nicht geladen werden ({fehler}).
        </p>
      )}
      {!wirkung && !fehler && <p style={{ fontSize: 13, color: v("--color-text-muted") }}>Lädt…</p>}

      {wirkung && (
        <>
          {/* Was noch aussteht. Ohne diese Zeile liest sich „0 Antworten" wie
              ein Ergebnis, obwohl der halbe Schub noch gar nicht raus ist. */}
          <div style={{ display: "flex", gap: space.md, flexWrap: "wrap", marginBottom: space.md }}>
            <Kennzahl label="verschickt" wert={wirkung.gesamt.verschickt} />
            <Kennzahl label="Antworten" wert={wirkung.gesamt.antworten} />
            <Kennzahl label="Veröffentlichungen" wert={wirkung.gesamt.veroeffentlicht} gut />
            <Kennzahl
              label="Eintragungen ins Abo"
              wert={wirkung.gesamt.abos}
              unten={
                wirkung.gesamt.abos ? `davon ${wirkung.gesamt.abosMitAngabeVerwaltung} mit Angabe Verwaltung` : undefined
              }
              gut={wirkung.gesamt.abosMitAngabeVerwaltung > 0}
            />
          </div>

          <p style={{ fontSize: 11, color: v("--color-text-muted"), marginBottom: space.lg, maxWidth: 620, lineHeight: 1.4 }}>
            Untergrenzen: Eine Veröffentlichung ohne Link auf uns wird nicht gefunden, und wer sich einträgt, ohne
            das Kästchen „Ich arbeite für die Verwaltung" anzukreuzen, zählt hier als Bürger.
          </p>

          {/* NUR EINE TABELLE. Es waren zwei, und sie sagten fast dasselbe:
              Ein Schub IST eine Menge von Versandtagen, also stand jede Zahl
              zweimal da — einmal je Tag und einmal aufsummiert. Das Einzige,
              was die Schub-Tabelle wirklich mehr wusste, ist der OFFENE Rest,
              und der hat kein Datum, weil er noch nicht hinausging. Er steht
              deshalb als Zeile darüber statt als eigene Tabelle. */}
          {offeneSchuebe.length > 0 && (
            <p style={{ fontSize: 12, fontFamily: v("--font-mono"), marginBottom: space.lg }}>
              <span style={{ color: v("--color-text-muted") }}>Noch offen: </span>
              {offeneSchuebe.map((k, i) => (
                <span key={k.kampagne}>
                  {i > 0 && <span style={{ color: v("--color-text-muted") }}> · </span>}
                  <a
                    href={`/admin/kommunen?kampagne=${encodeURIComponent(k.kampagne)}`}
                    style={{ color: v("--color-accent"), textDecoration: "none", fontWeight: 600 }}
                  >
                    {k.kampagne}
                  </a>{" "}
                  {k.offen}
                  {k.kampagne.endsWith("-geparkt") && (
                    <span style={{ color: v("--color-text-muted") }}> (geparkt)</span>
                  )}
                </span>
              ))}
            </p>
          )}

          {/* JE VERSANDTAG — ohne diese Aufteilung ist „lief der größere Schub so
              gut wie der kleine?" nicht zu beantworten: Über alles gemittelt
              verschwindet jeder Unterschied zwischen den Tagen. */}
          {(wirkung.jeTag?.length ?? 0) > 0 && (
            <section>
              <h2 style={ueberschrift}>Versandtage</h2>
              <table style={{ ...adminTabelle, maxWidth: 760 }}>
                <thead>
                  <tr>
                    <th style={adminTh}>Tag</th>
                    <th style={adminTh}>Schub</th>
                    <th style={adminTh} colSpan={2}>
                      verschickt
                    </th>
                    <th style={thRechts}>Antworten</th>
                    <th style={thRechts}>veröffentlicht</th>
                    <th style={thRechts}>Abos</th>
                    <th style={thRechts} />
                  </tr>
                </thead>
                <tbody>
                  {wirkung.jeTag.map((t) => {
                    const groesster = Math.max(...wirkung.jeTag.map((x) => x.verschickt));
                    return (
                      <tr key={t.tag} style={adminZeile}>
                        <td style={{ ...adminTd, whiteSpace: "nowrap" }}>{datum(t.tag)}</td>
                        <td style={{ ...adminTd, color: v("--color-text-muted") }}>{t.schuebe.join(", ")}</td>
                        <td style={{ ...tdRechts, width: 40 }}>{t.verschickt}</td>
                        <td style={{ ...adminTd, width: 160 }}>
                          {/* Der Balken macht die Menge je Tag auf einen Blick
                              vergleichbar; die Zahl daneben bleibt die Auskunft,
                              der Balken ist nur ihre Form. */}
                          <div
                            aria-hidden
                            style={{
                              height: 8,
                              width: `${Math.round((100 * t.verschickt) / (groesster || 1))}%`,
                              minWidth: 3,
                              background: v("--color-accent"),
                              borderRadius: v("--radius-sm"),
                            }}
                          />
                        </td>
                        <td style={tdRechts}>{t.antworten}</td>
                        <td style={tdRechts}>{t.veroeffentlicht}</td>
                        <td style={tdRechts}>
                          {t.abos}
                          {t.abosMitAngabeVerwaltung > 0 && ` (${t.abosMitAngabeVerwaltung} Verw.)`}
                        </td>
                        {/* Ein Datum beantwortet „50 verschickt" nur bis zur
                            nächsten Frage: welche 50. Der Knopf öffnet genau
                            diesen Batch in der Gemeindeliste — nach dem TAG
                            gefiltert, nicht nach dem Schub: An einem Tag können
                            mehrere Chargen desselben Schubs hinausgegangen sein,
                            und „welche 50" meint die des Tages. */}
                        <td style={{ ...adminTd, textAlign: "right" }}>
                          <a href={`/admin/kommunen?tag=${t.tag}`} style={knopf}>
                            Batch aufrufen
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p style={{ fontSize: 11, color: v("--color-text-muted"), marginTop: space.sm, maxWidth: 620, lineHeight: 1.4 }}>
                Die Reaktionen zählen zum Versandtag, nicht zum Tag der Reaktion — eine Antwort gehört zu dem Schub,
                der sie ausgelöst hat, auch wenn sie zwei Wochen später kommt. Frische Tage haben deshalb
                zwangsläufig weniger Reaktionen und sind mit älteren erst nach ein paar Wochen vergleichbar.
              </p>
            </section>
          )}
        </>
      )}
    </div>
  );
}

const knopf: React.CSSProperties = {
  display: "inline-block",
  padding: pad("xs", "sm"),
  borderRadius: v("--radius-sm"),
  border: `1px solid ${v("--color-border")}`,
  background: v("--color-bg"),
  color: v("--color-accent"),
  textDecoration: "none",
  fontSize: 12,
  fontWeight: 600,
  whiteSpace: "nowrap",
};

/** Versandtag im deutschen Format — einmal, nicht je Zelle. */
function datum(iso: string): string {
  return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/**
 * Eine Kennzahl.
 *
 * `gut` färbt grün — bewusst nur dort, wo eine Zahl über null wirklich ein
 * Erfolg ist. Alles grün zu färben nimmt der Farbe ihre Aussage; „177
 * verschickt" ist eine Menge, kein Ergebnis.
 */
function Kennzahl({ label, wert, unten, gut }: { label: string; wert: number; unten?: string; gut?: boolean }) {
  return (
    <div
      style={{
        border: `1px solid ${v("--color-border")}`,
        borderRadius: v("--radius-md"),
        padding: pad("sm", "md"),
        minWidth: 160,
        background: v("--color-bg-muted"),
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 700, color: v("--color-text-secondary") }}>{label}</div>
      <div
        style={{
          fontSize: 26,
          fontWeight: 800,
          fontFamily: v("--font-mono"),
          color: gut && wert > 0 ? v("--color-positive") : v("--color-text-primary"),
        }}
      >
        {wert.toLocaleString("de-DE")}
      </div>
      {unten && <div style={{ fontSize: 11, color: v("--color-text-muted"), marginTop: 2 }}>{unten}</div>}
    </div>
  );
}

const labelKicker: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: v("--color-text-muted"),
  marginBottom: 4,
};

const ueberschrift: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  marginBottom: space.sm,
};

// Zahlen rechtsbündig — sonst kann man Spalten nicht übereinander lesen. Der
// Rest kommt aus dem gemeinsamen Tabellen-Aussehen.
const thRechts: React.CSSProperties = { ...adminTh, textAlign: "right" };
const tdRechts: React.CSSProperties = { ...adminTd, textAlign: "right", fontVariantNumeric: "tabular-nums" };
