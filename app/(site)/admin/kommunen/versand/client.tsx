"use client";

import { useEffect, useState } from "react";
import { v, space, pad } from "../../../../../lib/theme";
import { adminTabelle, adminTh, adminTd, adminZeile } from "../../../../../lib/admin-tabelle";
import type { Auswertung, Versandtag } from "../../../../../lib/kommunen-auswertung";
import AdminSeitenkopf from "../../../../../components/admin/AdminSeitenkopf";
import InfoTooltip from "../../../../../components/InfoTooltip";
import { DatenTabelle } from "../../../../../components/admin/DatenTabelle";
import { KANAELE, KANAL_TEXT, quoteText, type Bilanz, type Veroeffentlichung } from "../../../../../lib/kommunen-veroeffentlichung";

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
type Veroeffentlichungen = {
  bilanz: Bilanz;
  liste: Veroeffentlichung[];
  namen: Record<string, string>;
  jeSchub: { kampagne: string; angeschrieben: number; gemeinden: number }[];
};

export default function VersandAuswertung() {
  const [wirkung, setWirkung] = useState<Wirkung | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [pubs, setPubs] = useState<Veroeffentlichungen | null | undefined>(undefined);
  const offeneSchuebe = (wirkung?.jeKampagne ?? []).filter((k) => k.offen > 0);

  useEffect(() => {
    fetch("/api/admin/kommunen/bilanz")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`Antwort ${r.status}`))))
      .then((j) => {
        setWirkung(j.wirkung ?? null);
        setPubs(j.veroeffentlichungen ?? null);
      })
      .catch((e) => setFehler(e instanceof Error ? e.message : String(e)));
  }, []);

  return (
    <div style={{ fontFamily: v("--font-text"), color: v("--color-text-primary") }}>
      <AdminSeitenkopf titel="Übersicht" />

      {fehler && (
        <p style={{ fontSize: v("--font-size-small"), color: v("--color-negative-text") }}>
          Die Auswertung konnte nicht geladen werden ({fehler}).
        </p>
      )}
      {!wirkung && !fehler && <p style={{ fontSize: v("--font-size-small"), color: v("--color-text-muted") }}>Lädt…</p>}

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

          <p style={{ fontSize: v("--font-size-caption"), color: v("--color-text-muted"), marginBottom: space.lg, maxWidth: 620, lineHeight: 1.4 }}>
            Untergrenzen: Eine Veröffentlichung ohne Link auf uns wird nicht gefunden, und wer sich einträgt, ohne
            das Kästchen „Ich arbeite für die Verwaltung" anzukreuzen, zählt hier als Bürger.
          </p>

          {pubs === null && (
            <p style={{ fontSize: v("--font-size-small"), color: v("--color-negative-text"), marginBottom: space.lg }}>
              Die Liste der Veröffentlichungen konnte nicht geladen werden.
            </p>
          )}
          {pubs && <VeroeffentlichungsBilanz daten={pubs} />}

          {/* NUR EINE TABELLE. Es waren zwei, und sie sagten fast dasselbe:
              Ein Schub IST eine Menge von Versandtagen, also stand jede Zahl
              zweimal da — einmal je Tag und einmal aufsummiert. Das Einzige,
              was die Schub-Tabelle wirklich mehr wusste, ist der OFFENE Rest,
              und der hat kein Datum, weil er noch nicht hinausging. Er steht
              deshalb als Zeile darüber statt als eigene Tabelle. */}
          {offeneSchuebe.length > 0 && (
            <p style={{ fontSize: v("--font-size-small"), fontFamily: v("--font-mono"), marginBottom: space.lg }}>
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
                              background: v("--color-cta"),
                              borderRadius: v("--radius-pill"),
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
              <p style={{ fontSize: v("--font-size-caption"), color: v("--color-text-muted"), marginTop: space.sm, maxWidth: 620, lineHeight: 1.4 }}>
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

/**
 * Die belegten Veröffentlichungen: Quote, Beiträge, Links, wo sie stehen.
 *
 * Eine Zeile je BEITRAG, nicht je Gemeinde — Nidda steht in drei Medien, und
 * „wie viele Links haben wir" beantwortet nur die Beitragsliste. Jede Zeile
 * ist belegt: Jemand hat den Beitrag gesehen (lib/kommunen-veroeffentlichung.ts).
 */
function VeroeffentlichungsBilanz({ daten }: { daten: Veroeffentlichungen }) {
  const b = daten.bilanz;
  return (
    <section style={{ marginBottom: space.xl }}>
      <h2 style={ueberschrift}>
        Veröffentlichungen{" "}
        <InfoTooltip ariaLabel="Was hier zählt" exportNote={false}>
          Nur belegte Beiträge: Jeder wurde selbst angesehen. Die Quote rechnet mit den Briefen ohne bekannten
          Zustellfehler. Gedrucktes und geschlossene Gruppen sieht keine unserer Quellen — alle Zahlen sind
          Untergrenzen.
        </InfoTooltip>
      </h2>
      <div style={{ display: "flex", gap: space.md, flexWrap: "wrap", marginBottom: space.md }}>
        <Kennzahl label="Gemeinden mit Veröffentlichung" wert={b.gemeinden} unten={`${quoteText(b.quote)} von ${b.angeschrieben} angeschriebenen`} gut />
        <Kennzahl label="Beiträge" wert={b.beitraege} />
        <Kennzahl label="davon mit Link" wert={b.mitLink} unten={b.mitLinkOnline < b.mitLink ? `${b.mitLinkOnline} noch erreichbar` : undefined} gut />
        <Kennzahl label="woanders als auf der Gemeindeseite" wert={b.woanders} />
      </div>
      <p style={{ fontSize: v("--font-size-small"), color: v("--color-text-muted"), marginBottom: space.md }}>
        {KANAELE.map((k) => `${KANAL_TEXT[k]} ${b.jeKanal[k]}`).join(" · ")}
        <br />
        {daten.jeSchub.map((s) => `${s.kampagne}: ${s.gemeinden} von ${s.angeschrieben} (${quoteText(s.angeschrieben ? s.gemeinden / s.angeschrieben : 0)})`).join(" · ")}
      </p>
      <DatenTabelle<Veroeffentlichung>
        zeilen={daten.liste}
        schluessel={(p) => `${p.region_id} ${p.url}`}
        nummeriert
        minBreite={640}
        startSortierung={[{ key: "gemeinde", richtung: "auf" }]}
        spalten={[
          {
            key: "gemeinde",
            kopf: "Gemeinde",
            zelle: (p) => daten.namen[p.region_id] ?? p.region_id,
            sortWert: (p) => daten.namen[p.region_id] ?? p.region_id,
          },
          { key: "wo", kopf: "Wo", zelle: (p) => KANAL_TEXT[p.kanal], sortWert: (p) => KANAL_TEXT[p.kanal] },
          {
            key: "link",
            kopf: "Link",
            zelle: (p) => (p.mit_link ? (p.noch_online ? "ja" : "ja, Seite weg") : "nein"),
            sortWert: (p) => (p.mit_link ? (p.noch_online ? 0 : 1) : 2),
          },
          {
            key: "belegt",
            kopf: "belegt ab",
            zelle: (p) => (p.gesehen_ab ? datum(p.gesehen_ab) : "–"),
            sortWert: (p) => p.gesehen_ab ?? "",
          },
          {
            key: "beitrag",
            kopf: "Beitrag",
            zelle: (p) => (
              <a
                href={p.url}
                target="_blank"
                rel="noopener"
                style={{ color: v("--color-accent"), display: "inline-block", maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", verticalAlign: "bottom" }}
              >
                {p.url.replace(/^https?:\/\/(www\.)?/, "")}
              </a>
            ),
            sortWert: (p) => p.url.replace(/^https?:\/\/(www\.)?/, ""),
          },
        ]}
      />
    </section>
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
  fontSize: v("--font-size-small"),
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
      <div style={{ fontSize: v("--font-size-small"), fontWeight: 700, color: v("--color-text-secondary") }}>{label}</div>
      <div
        style={{
          fontSize: v("--font-size-h1"),
          fontWeight: 800,
          fontFamily: v("--font-mono"),
          color: gut && wert > 0 ? v("--color-positive-text") : v("--color-text-primary"),
        }}
      >
        {wert.toLocaleString("de-DE")}
      </div>
      {unten && <div style={{ fontSize: v("--font-size-caption"), color: v("--color-text-muted"), marginTop: 2 }}>{unten}</div>}
    </div>
  );
}

const ueberschrift: React.CSSProperties = {
  fontSize: v("--font-size-body"),
  fontWeight: 700,
  marginBottom: space.sm,
};

// Zahlen rechtsbündig — sonst kann man Spalten nicht übereinander lesen. Der
// Rest kommt aus dem gemeinsamen Tabellen-Aussehen.
const thRechts: React.CSSProperties = { ...adminTh, textAlign: "right" };
const tdRechts: React.CSSProperties = { ...adminTd, textAlign: "right", fontVariantNumeric: "tabular-nums" };
