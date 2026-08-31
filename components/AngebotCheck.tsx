"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { v, space, pad } from "../lib/theme";
import type { AngebotsBefund } from "../lib/angebot-check";
import { ANGEBOT_REFERENZ_STAND, GESAMTKOSTEN, SPEZ_KOSTEN } from "../lib/angebot-check-config";

// ─── „Passt mein Angebot?" ────────────────────────────────────────────────────
//
// Der Nutzer lädt sein Angebot vom Heizungsbauer hoch, ein Meister-Agent liest es,
// und wir halten es gegen drei Maßstäbe: unsere eigene Heizlastrechnung, die
// Positionsliste, die die Verbraucherzentrale von den Innungen fordert, und die
// Preisverteilung aus 160 ausgewerteten Angeboten.
//
// ZWEI DINGE, DIE HIER NIE STEHEN DÜRFEN:
//  1. Ein Urteil über den BETRIEB. „Im Angebot fehlt der Zählerschrank-Umbau" ist
//     eine Auskunft über ein Dokument; „dein Heizungsbauer verschweigt Kosten"
//     wäre die Herabsetzung eines Wettbewerbers.
//  2. Der Onlinepreis des Geräts neben dem Gesamtpreis des Angebots. Im Angebot
//     stecken Planung, Montage, Inbetriebnahme und Gewährleistung — die Differenz
//     sieht aus wie eine Ersparnis und ist keine.

type Zustand =
  | { art: "leer" }
  | { art: "laeuft" }
  | { art: "fehler"; text: string }
  | { art: "abgelehnt"; grund: string }
  | { art: "fertig"; befund: AngebotsBefund; geraet: string | null; gesamtpreisEur: number | null };

const euro = (n: number) => n.toLocaleString("de-DE", { maximumFractionDigits: 0 }) + " €";
const proKw = (n: number) => Math.round(n).toLocaleString("de-DE") + " €/kW";
const prozent = (n: number) => (n >= 0 ? "+" : "−") + Math.abs(Math.round(n * 100)) + " %";

const FEHLERTEXT: Record<string, string> = {
  "keine-einwilligung": "Ohne die Zustimmung können wir das Angebot nicht lesen.",
  "nicht-eingerichtet": "Die Prüfung ist noch nicht freigeschaltet.",
  "zu-viele-anfragen": "Zu viele Prüfungen in kurzer Zeit. Versuch es später noch einmal.",
  "zu-gross": "Die Datei ist größer als 12 MB.",
  "falscher-typ": "Bitte ein PDF oder ein Bild hochladen.",
  "lesen-fehlgeschlagen": "Das Angebot ließ sich nicht auslesen.",
  "keine-datei": "Es kam keine Datei an.",
  "kein-gebaeude": "Für die Prüfung fehlen die Gebäudewerte aus dem Rechner.",
};

function Kasten({ titel, ton, children }: { titel: string; ton: "gut" | "hinweis" | "neutral"; children: React.ReactNode }) {
  const farbe = ton === "gut" ? v("--color-positive") : ton === "hinweis" ? v("--color-negative") : v("--color-border");
  return (
    <div style={{ borderLeft: `3px solid ${farbe}`, paddingLeft: space.md, marginTop: space.lg }}>
      <div style={{ fontWeight: 600, marginBottom: space.xs }}>{titel}</div>
      <div style={{ fontSize: 14, lineHeight: 1.6, color: v("--color-text-secondary") }}>{children}</div>
    </div>
  );
}

export default function AngebotCheck({ heizlastKw, auslegungKw }: { heizlastKw: number; auslegungKw: number }) {
  const [zustand, setZustand] = useState<Zustand>({ art: "leer" });
  // Die Einwilligung ist eine bewusste Handlung vor dem Hochladen, kein
  // vorgehaktes Kästchen: Das Dokument verlässt damit die EU, und der Nutzer
  // muss das entschieden haben, bevor er die Datei auswählt.
  const [einwilligung, setEinwilligung] = useState(false);
  const dateiFeld = useRef<HTMLInputElement>(null);

  async function pruefen(datei: File) {
    setZustand({ art: "laeuft" });
    const form = new FormData();
    form.set("datei", datei);
    form.set("heizlastKw", String(heizlastKw));
    form.set("auslegungKw", String(auslegungKw));
    form.set("einwilligung", "ja");
    try {
      const antwort = await fetch("/api/angebot-check", { method: "POST", body: form });
      const daten = await antwort.json();
      if (daten.fehler) return setZustand({ art: "fehler", text: FEHLERTEXT[daten.fehler] ?? "Das hat nicht geklappt." });
      if (daten.art === "kein-angebot" || daten.art === "unlesbar") return setZustand({ art: "abgelehnt", grund: daten.grund });
      setZustand({ art: "fertig", befund: daten.befund, geraet: daten.geraet, gesamtpreisEur: daten.gesamtpreisEur });
    } catch {
      setZustand({ art: "fehler", text: "Die Verbindung ist abgebrochen." });
    }
  }

  return (
    <div>
      <p style={{ fontSize: 14, lineHeight: 1.6, color: v("--color-text-secondary"), marginTop: 0 }}>
        Du hast schon ein Angebot? Lade es hoch. Wir halten es gegen die Heizlast, die wir für dein
        Gebäude gerechnet haben, gegen die Positionen, die ein vollständiges Angebot nennen sollte,
        und gegen die Preise von {SPEZ_KOSTEN.anzahl} ausgewerteten Angeboten. <strong>Das Dokument
        wird nicht gespeichert</strong> — es wird gelesen und ist danach weg.
      </p>

      <input
        ref={dateiFeld}
        type="file"
        accept="application/pdf,image/png,image/jpeg,image/webp"
        style={{ display: "none" }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) pruefen(f); }}
      />
      {/* Honigtopf — für Menschen unsichtbar, für Ausfüll-Roboter nicht. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden style={{ position: "absolute", left: -9999, width: 1, height: 1 }} />

      <label style={{ display: "flex", gap: space.sm, alignItems: "flex-start", fontSize: 13, lineHeight: 1.6, marginBottom: space.md, color: v("--color-text-secondary"), cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={einwilligung}
          onChange={(e) => setEinwilligung(e.target.checked)}
          style={{ marginTop: 3, flexShrink: 0 }}
        />
        <span>
          Ich bin damit einverstanden, dass mein Angebot zum Auslesen an unseren Dienstleister
          Anthropic in die USA übermittelt wird. Dort gilt kein dem europäischen gleichwertiges
          Datenschutzniveau; abgesichert ist die Übermittlung durch Standardvertragsklauseln.
          Das Dokument wird nicht gespeichert und nicht zum Training verwendet. Die Zustimmung
          gilt für diesen einen Vorgang. Mehr dazu in der{" "}
          <Link href="/datenschutz" style={{ color: v("--color-accent") }}>Datenschutzerklärung</Link>.
        </span>
      </label>

      <button
        type="button"
        onClick={() => dateiFeld.current?.click()}
        disabled={zustand.art === "laeuft" || !einwilligung}
        style={{
          padding: pad("sm", "lg"), borderRadius: v("--radius-md"),
          border: `1px solid ${einwilligung ? v("--color-accent") : v("--color-border")}`,
          background: "transparent",
          color: einwilligung ? v("--color-accent") : v("--color-text-muted"),
          fontSize: 15, fontWeight: 600,
          cursor: einwilligung && zustand.art !== "laeuft" ? "pointer" : "not-allowed",
        }}
      >
        {zustand.art === "laeuft" ? "Wird gelesen …" : "Angebot hochladen"}
      </button>

      {zustand.art === "fehler" && (
        <p style={{ fontSize: 14, color: v("--color-negative"), marginTop: space.md }}>{zustand.text}</p>
      )}

      {zustand.art === "abgelehnt" && (
        <p style={{ fontSize: 14, color: v("--color-text-secondary"), marginTop: space.md }}>
          Das sieht nicht nach einem Heizungsangebot aus: {zustand.grund}
        </p>
      )}

      {zustand.art === "fertig" && <Befund {...zustand} />}
    </div>
  );
}

function Befund({ befund, geraet, gesamtpreisEur }: { befund: AngebotsBefund; geraet: string | null; gesamtpreisEur: number | null }) {
  const { groesse, vollstaendigkeit, preis, unsicher } = befund;

  return (
    <div style={{ marginTop: space.lg }}>
      {geraet && (
        <p style={{ fontSize: 14, color: v("--color-text-muted"), marginTop: 0 }}>
          Gelesen: {geraet}{gesamtpreisEur != null ? ` · ${euro(gesamtpreisEur)}` : ""}
        </p>
      )}

      {/* ── Größe ──────────────────────────────────────────────────────────── */}
      <Kasten
        titel="Passt die Größe?"
        ton={groesse.urteil === "passend" ? "gut" : groesse.urteil === "unbekannt" ? "neutral" : "hinweis"}
      >
        {groesse.urteil === "unbekannt" ? (
          <>Im Angebot steht keine Heizleistung, die wir sicher lesen konnten. Frag nach — ohne sie
          lässt sich nicht beurteilen, ob die Anlage zu deinem Haus passt.</>
        ) : (
          <>
            Für dein Gebäude rechnen wir mit einer Heizlast von{" "}
            {groesse.erwartetKw.toLocaleString("de-DE", { maximumFractionDigits: 1 })} kW Auslegungsleistung.
            Angeboten sind {groesse.angebotKw!.toLocaleString("de-DE", { maximumFractionDigits: 1 })} kW
            {groesse.abweichung != null && Math.abs(groesse.abweichung) >= 0.05 ? ` (${prozent(groesse.abweichung)})` : ""}.
            {" "}
            {groesse.urteil === "passend" && <>Das passt.</>}
            {groesse.urteil === "reichlich" && <>Das ist reichlich. Eine zu große Wärmepumpe taktet häufiger und arbeitet dadurch weniger sparsam.</>}
            {groesse.urteil === "deutlich-groesser" && <>Das ist deutlich mehr, als wir für dein Haus rechnen — frag nach der Heizlastberechnung, auf der das Angebot beruht.</>}
            {groesse.urteil === "knapp" && <>Das ist knapp bemessen. Frag nach, wie die kältesten Tage gedeckt werden.</>}
            <br /><br />
            <em>Unsere Heizlast ist aus Baujahr, Fläche, Dämmzustand und Heizsystem geschätzt. Wer vor
            Ort war, weiß mehr — etwa über Sperrzeiten des Netzbetreibers oder eine geplante
            Erweiterung. Die Abweichung ist ein Anlass zur Rückfrage, kein Fehler.</em>
          </>
        )}
      </Kasten>

      {/* ── Vollständigkeit ────────────────────────────────────────────────── */}
      <Kasten
        titel="Ist alles drin?"
        ton={vollstaendigkeit.fehlend.length === 0 ? "gut" : "hinweis"}
      >
        {vollstaendigkeit.fehlend.length === 0 ? (
          <>Alle Positionen, die ein vollständiges Angebot nennen sollte, sind mit Preis ausgewiesen.</>
        ) : (
          <>
            <p style={{ margin: `0 0 ${space.sm}px` }}>
              {vollstaendigkeit.ausgewiesen} von {vollstaendigkeit.gefordert} Positionen sind mit
              eigenem Preis ausgewiesen. Das fehlt:
            </p>
            <ul style={{ margin: 0, paddingLeft: space.lg }}>
              {vollstaendigkeit.fehlend.map(({ position }) => (
                <li key={position.id} style={{ marginBottom: space.xs }}>
                  <strong>{position.name}</strong>
                  {position.anteilEnthalten != null && (
                    <> — enthalten in {Math.round(position.anteilEnthalten * 100)} % der ausgewerteten Angebote</>
                  )}
                  {position.medianKosten != null && (
                    <>, wo ausgewiesen im Mittel {euro(position.medianKosten)}</>
                  )}
                  {position.folge && <><br /><span style={{ color: v("--color-text-muted") }}>{position.folge}</span></>}
                </li>
              ))}
            </ul>
          </>
        )}

        {vollstaendigkeit.ohnePreis.length > 0 && (
          <p style={{ marginTop: space.md, marginBottom: 0 }}>
            Im Pauschalpreis enthalten, aber ohne eigenen Betrag:{" "}
            {vollstaendigkeit.ohnePreis.map((f) => f.position.name).join(", ")}. Das ist kein Mangel —
            es macht nur den Vergleich mit einem zweiten Angebot unmöglich.
          </p>
        )}

        {vollstaendigkeit.moeglicherweiseNoetig.length > 0 && (
          <p style={{ marginTop: space.md, marginBottom: 0 }}>
            Nicht erwähnt, je nach Haus aber nötig:{" "}
            {vollstaendigkeit.moeglicherweiseNoetig.map((f) => f.position.name).join(", ")}.
          </p>
        )}
      </Kasten>

      {/* ── Preis ──────────────────────────────────────────────────────────── */}
      <Kasten
        titel="Wie liegt der Preis?"
        ton={preis.urteil === "darueber" ? "hinweis" : preis.urteil === "unbekannt" ? "neutral" : "gut"}
      >
        {preis.urteil === "unbekannt" ? (
          <>Ohne Gesamtpreis und Leistung lässt sich der Preis nicht einordnen.</>
        ) : (
          <>
            Dein Angebot liegt bei {proKw(preis.spezKostenEurProKw!)}. Bei Anlagen von{" "}
            {preis.band!.beschriftung} liegen die meisten ausgewerteten Angebote zwischen{" "}
            {euro(preis.band!.von)} und {euro(preis.band!.bis)} je Kilowatt.{" "}
            {preis.urteil === "im-band" && <>Damit liegst du im üblichen Bereich.</>}
            {preis.urteil === "darunter" && <>Damit liegst du darunter. Prüf gegen, ob wirklich alles enthalten ist — ein günstiges Angebot ist oft ein unvollständiges.</>}
            {preis.urteil === "darueber" && <>Damit liegst du darüber. Ein zweites Angebot lohnt sich.</>}
            <br /><br />
            <em>Große Anlagen kosten je Kilowatt weniger als kleine, weil ein großer Teil der Kosten
            gar nicht an der Leistung hängt. Deshalb vergleichen wir innerhalb deiner Größenklasse und
            nicht gegen den Gesamtdurchschnitt von {proKw(SPEZ_KOSTEN.median)}.</em>
          </>
        )}
      </Kasten>

      {befund.rueckfragen.length > 0 && (
        <Kasten titel="Das würde ich nachfragen" ton="neutral">
          <ul style={{ margin: 0, paddingLeft: space.lg }}>
            {befund.rueckfragen.map((f, i) => (
              <li key={i} style={{ marginBottom: space.sm }}>
                {f.text}
                {/* Die Zahlen kommen aus der Referenz, nie aus der Formulierung —
                    deshalb stehen sie hier und nicht im Satz darüber. */}
                {(f.anteilEnthalten != null || f.medianKosten != null) && (
                  <div style={{ color: v("--color-text-muted"), marginTop: 2 }}>
                    {f.anteilEnthalten != null && <>Enthalten in {Math.round(f.anteilEnthalten * 100)} % der ausgewerteten Angebote</>}
                    {f.anteilEnthalten != null && f.medianKosten != null && <> · </>}
                    {f.medianKosten != null && <>wo ausgewiesen im Mittel {euro(f.medianKosten)} (aus {f.medianBasis} Angeboten)</>}
                  </div>
                )}
              </li>
            ))}
          </ul>
          <p style={{ marginTop: space.md, marginBottom: 0 }}>
            Und eine Frage, die sich immer lohnt: <strong>ob du das Material selbst bestellen
            kannst.</strong> Viele Betriebe lassen das zu. Was das Gerät im Onlinehandel kostet,
            steht offen im Netz — die Arbeit bleibt beim Fachbetrieb, und die ist bei einer
            Wärmepumpe der größere Posten.
          </p>
        </Kasten>
      )}

      {unsicher.length > 0 && (
        <Kasten titel="Was wir nicht sicher lesen konnten" ton="neutral">
          <ul style={{ margin: 0, paddingLeft: space.lg }}>
            {unsicher.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </Kasten>
      )}

      <p style={{ fontSize: 12, color: v("--color-text-muted"), marginTop: space.lg, lineHeight: 1.6 }}>
        Vergleichsgruppe: {GESAMTKOSTEN.anzahl} Angebote für Ein- und Zweifamilienhäuser aus
        Rheinland-Pfalz, eingereicht bei der Verbraucherzentrale.{" "}
        {ANGEBOT_REFERENZ_STAND.quelleKurz}. Die Verbraucherzentrale weist selbst darauf hin, dass
        sich diese Stichprobe nicht ohne Weiteres auf den Gesamtmarkt übertragen lässt. Diese Prüfung
        ersetzt keine Beratung und beurteilt keinen Betrieb — sie liest ein Dokument. Ohne Gewähr.
      </p>
    </div>
  );
}
