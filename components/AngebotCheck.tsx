"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { v, space, pad } from "../lib/theme";
import { pruefeGroesse, type AngebotsBefund } from "../lib/angebot-check";
import { GEWERKE } from "../lib/angebot-gewerk";

// ─── „Passt mein Angebot?" ────────────────────────────────────────────────────
//
// NOCH NIRGENDS EINGEBAUT. Wer diesen Baustein rendert, setzt im selben Zug den
// Datenschutz-Abschnitt ein — er liegt fertig in docs/legal-oeffentlich/ und
// steht bewusst noch nicht in der Erklärung: Solange niemand hochladen kann,
// beschriebe er eine Verarbeitung, die es nicht gibt.
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
  | { art: "abgelehnt"; grund: string };

/**
 * Wie ein geprüftes Angebot in der Liste heißt.
 *
 * Die Gerätebezeichnung, wenn eine dasteht — daran erkennt der Nutzer sein
 * eigenes Angebot wieder. „Angebot 1" ist nur die Rückfallebene; zwei Angebote
 * mit derselben Nummer und ohne Namen sind für ihn nicht auseinanderzuhalten.
 * Marke plus Anfang der Typenbezeichnung reicht und bleibt in einer Zeile.
 */
function beschriftung(g: Geprueft, i: number): string {
  const roh = g.geraet?.trim();
  if (!roh) return `Angebot ${i + 1}`;
  const kurz = roh.length > 52 ? roh.slice(0, 52).replace(/[\s,;/-]+$/, "") + " …" : roh;
  return `Angebot ${i + 1}: ${kurz}`;
}

/** Ein fertig geprüftes Angebot. Mehrere davon ergeben den Vergleich. */
type Geprueft = {
  befund: AngebotsBefund;
  geraet: string | null;
  gesamtpreisEur: number | null;
};

const euro = (n: number) => n.toLocaleString("de-DE", { maximumFractionDigits: 0 }) + " €";
const proEinheit = (n: number, einheit: string) => Math.round(n).toLocaleString("de-DE") + ` €/${einheit}`;
const prozent = (n: number) => (n >= 0 ? "+" : "−") + Math.abs(Math.round(n * 100)) + " %";

const FEHLERTEXT: Record<string, string> = {
  "keine-einwilligung": "Ohne die Zustimmung können wir das Angebot nicht lesen.",
  "nicht-eingerichtet": "Die Prüfung ist noch nicht freigeschaltet.",
  "zu-viele-anfragen": "Zu viele Prüfungen in kurzer Zeit. Versuch es später noch einmal.",
  "zu-gross": "Die Seiten sind zusammen zu groß (höchstens 30 MB).",
  "zu-viele-seiten": "Höchstens zwölf Seiten auf einmal.",
  "falscher-typ": "Bitte ein PDF oder ein Bild hochladen.",
  "lesen-fehlgeschlagen": "Das Angebot ließ sich nicht auslesen.",
  "keine-datei": "Es kam keine Datei an.",
  "kein-gebaeude": "Für die Prüfung fehlen die Gebäudewerte aus dem Rechner.",
};

function Kasten({ titel, ton, children }: { titel: string; ton: "gut" | "hinweis" | "neutral"; children: React.ReactNode }) {
  const farbe = ton === "gut" ? v("--color-positive") : ton === "hinweis" ? v("--color-negative") : v("--color-border");
  return (
    <div style={{ borderLeft: `3px solid ${farbe}`, paddingLeft: space.md, marginTop: space.lg }}>
      <div style={{ fontWeight: 700, color: v("--color-text-primary"), marginBottom: space.xs }}>{titel}</div>
      <div style={{ fontSize: v("--font-size-body"), lineHeight: 1.6, color: v("--color-text-muted") }}>{children}</div>
    </div>
  );
}

function KopierKnopf({ text }: { text: string }) {
  const [kopiert, setKopiert] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setKopiert(true);
          setTimeout(() => setKopiert(false), 2500);
        } catch {
          // Kein Zugriff auf die Zwischenablage (älterer Browser, kein sicherer
          // Kontext) — dann passiert nichts, statt eine Erfolgsmeldung zu zeigen,
          // der nichts entspricht.
        }
      }}
      style={{
        marginTop: space.md, padding: pad("xs", "md"), borderRadius: v("--radius-md"),
        border: `1px solid ${v("--color-accent")}`, background: "transparent",
        color: v("--color-accent"), fontSize: v("--font-size-small"), fontWeight: 600, cursor: "pointer",
      }}
    >
      {kopiert ? "Kopiert" : "Fragen kopieren"}
    </button>
  );
}

export default function AngebotCheck({
  heizlastKw,
  auslegungKw,
  gewerk = "waermepumpe",
  einheit = "kW",
}: {
  /** Norm-Heizlast bzw. gerechnete Anlagengröße. 0 = unbekannt, dann entfällt das Größen-Urteil. */
  heizlastKw?: number;
  auslegungKw?: number;
  /** Welches Gewerk geprüft wird. */
  gewerk?: string;
  /** Einheit der Anlagengröße — für die Beschriftung. */
  einheit?: string;
}) {
  const [zustand, setZustand] = useState<Zustand>({ art: "leer" });
  // Die Einwilligung ist eine bewusste Handlung vor dem Hochladen, kein
  // vorgehaktes Kästchen: Das Dokument verlässt damit die EU, und der Nutzer
  // muss das entschieden haben, bevor er die Datei auswählt.
  const [einwilligung, setEinwilligung] = useState(false);
  // Ein Angebot ist selten eine Datei: vier bis acht abfotografierte Seiten sind
  // der Normalfall. Sie werden gesammelt und zusammen abgeschickt — nicht Seite
  // für Seite, sonst sieht der Meister die Einschränkung auf Seite 4 nicht, die
  // zur Position auf Seite 2 gehört.
  const [seiten, setSeiten] = useState<File[]>([]);
  // Mehrere Angebote nacheinander. Der Vergleich ist der eigentliche Grund, aus
  // dem jemand hier landet: Die Verbraucherzentrale schreibt, das Kernproblem
  // sei nicht der Preis, sondern dass sich zwei Angebote nicht vergleichen
  // lassen. Genau das können wir auflösen, sobald zwei vorliegen.
  const [gepruefte, setGepruefte] = useState<Geprueft[]>([]);

  /**
   * Das Größen-Urteil wird beim ANZEIGEN gerechnet, nicht beim Prüfen.
   *
   * Im eigenständigen Weg kennen wir das Gebäude erst, nachdem der Nutzer es
   * nachgetragen hat — also nach der Prüfung. Das Urteil dann eingefroren zu
   * lassen hieße, ihn nach der Eingabe weiter „wissen wir nicht" lesen zu
   * lassen. Die Rechnung ist rein und kostet nichts; das Dokument muss dafür
   * nicht noch einmal gelesen werden.
   */
  function mitGroesse(befund: AngebotsBefund, aktuelleAuslegung?: number): AngebotsBefund {
    if (!aktuelleAuslegung || befund.groesse.angebotKw == null) return befund;
    const gw = GEWERKE[befund.gewerk.id] ?? befund.gewerk;
    const neu = pruefeGroesse(
      { geraet: null, marke: null, leistungKw: befund.groesse.angebotKw, gesamtpreisEur: null, positionen: [], rueckfragen: [], unsicher: [] },
      { heizlastKw: heizlastKw ?? aktuelleAuslegung, auslegungKw: aktuelleAuslegung },
      gw,
    );
    return { ...befund, groesse: neu };
  }
  const [ueberZone, setUeberZone] = useState(false);
  const dateiFeld = useRef<HTMLInputElement>(null);

  /** Wissen wir, wie groß die Anlage sein sollte? Steuert den Einleitungstext. */
  const kennenGebaeude = !!auslegungKw;

  function seitenAufnehmen(neu: File[]) {
    if (neu.length) setSeiten((alt) => [...alt, ...neu].slice(0, 12));
  }

  function zuruecksetzen() {
    setGepruefte([]);
    setSeiten([]);
    setZustand({ art: "leer" });
  }

  async function pruefen() {
    if (seiten.length === 0) return;
    setZustand({ art: "laeuft" });
    const form = new FormData();
    for (const s of seiten) form.append("datei", s);
    form.set("gewerk", gewerk);
    if (heizlastKw) form.set("heizlastKw", String(heizlastKw));
    if (auslegungKw) form.set("auslegungKw", String(auslegungKw));
    form.set("einwilligung", "ja");
    try {
      const antwort = await fetch("/api/angebot-check", { method: "POST", body: form });
      const daten = await antwort.json();
      if (daten.fehler) return setZustand({ art: "fehler", text: FEHLERTEXT[daten.fehler] ?? "Das hat nicht geklappt." });
      if (daten.art === "kein-angebot" || daten.art === "unlesbar") return setZustand({ art: "abgelehnt", grund: daten.grund });
      setGepruefte((alt) => [...alt, { befund: daten.befund, geraet: daten.geraet, gesamtpreisEur: daten.gesamtpreisEur }]);
      setSeiten([]);
      setZustand({ art: "leer" });
    } catch {
      setZustand({ art: "fehler", text: "Die Verbindung ist abgebrochen." });
    }
  }

  return (
    <div>
      <p style={{ fontSize: v("--font-size-body"), lineHeight: 1.6, color: v("--color-text-muted"), marginTop: 0 }}>
        {gepruefte.length === 0 ? (
          <>
            {kennenGebaeude ? (
              <>Du hast schon ein Angebot? Lade es hoch. Wir halten es gegen die Heizlast, die wir
              für dein Gebäude gerechnet haben, gegen die Positionen, die ein vollständiges Angebot
              nennen sollte, und gegen die Preise vergleichbarer Anlagen.</>
            ) : (
              <>Wir sagen dir, ob die üblichen Positionen drinstehen, wo der Preis im Vergleich
              liegt und was du deinem Handwerker noch fragen solltest.</>
            )}{" "}
            Mehrere Seiten kannst du zusammen auswählen — abfotografiert reicht.{" "}
            <strong>Die Seiten werden nicht gespeichert</strong> — sie werden gelesen und sind
            danach weg.
          </>
        ) : (
          <>Lade ein Vergleichsangebot hoch — ab dem zweiten stellen wir sie nebeneinander,
          Position für Position.</>
        )}
      </p>

      <input
        ref={dateiFeld}
        type="file"
        accept="application/pdf,image/png,image/jpeg,image/webp"
        multiple
        style={{ display: "none" }}
        onChange={(e) => {
          // Anhängen statt ersetzen: Wer die Seiten in zwei Griffen auswählt,
          // soll nicht die erste Hälfte verlieren.
          seitenAufnehmen(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />
      {/* Honigtopf — für Menschen unsichtbar, für Ausfüll-Roboter nicht. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden style={{ position: "absolute", left: -9999, width: 1, height: 1 }} />

      {/* Ablegefeld. Auf Mobilgeräten gibt es kein Ziehen — dort ist der ganze
          Kasten schlicht ein großer Knopf, und der Text nennt nur das Tippen. */}
      <div
        onClick={() => dateiFeld.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setUeberZone(true); }}
        onDragEnter={(e) => { e.preventDefault(); setUeberZone(true); }}
        onDragLeave={() => setUeberZone(false)}
        onDrop={(e) => {
          e.preventDefault();
          setUeberZone(false);
          seitenAufnehmen(Array.from(e.dataTransfer.files ?? []));
        }}
        style={{
          border: `2px dashed ${ueberZone ? v("--color-accent") : v("--color-border")}`,
          borderRadius: v("--radius-md"),
          background: ueberZone ? v("--color-accent-dim") : "transparent",
          padding: pad("lg", "md"),
          textAlign: "center",
          cursor: "pointer",
          fontSize: v("--font-size-body"),
          color: v("--color-text-muted"),
        }}
      >
        <strong style={{ color: v("--color-accent") }}>
          {seiten.length > 0
            ? "Weitere Seite hinzufügen"
            : gepruefte.length > 0
              ? "Vergleichsangebot hochladen"
              : "Seiten auswählen"}
        </strong>
        <div style={{ marginTop: 4, fontSize: v("--font-size-small"), color: v("--color-text-muted") }}>
          oder hierher ziehen · PDF oder Foto · bis zwölf Seiten
        </div>
      </div>

      {seiten.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0, margin: `${space.md}px 0 0`, fontSize: v("--font-size-small") }}>
          {seiten.map((s, i) => (
            <li key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: space.sm, padding: "4px 0", borderBottom: `1px solid ${v("--color-border")}` }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: v("--color-text-secondary") }}>
                {i + 1}. {s.name}
              </span>
              <button
                type="button"
                onClick={() => setSeiten((alt) => alt.filter((_, j) => j !== i))}
                aria-label={`Seite ${i + 1} entfernen`}
                style={{ border: "none", background: "none", cursor: "pointer", color: v("--color-text-muted"), fontSize: v("--font-size-h3"), lineHeight: 1, padding: 4 }}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Die Einwilligung steht direkt vor dem Absenden — nicht vor dem
          Auswählen. Eine Datei auszuwählen überträgt nichts; sie liegt im
          Browser. Erst der Knopf darunter schickt sie weg, und genau dort gehört
          die Entscheidung hin. Vorher gesetzt, blockierte sie ein Feld, das
          aussah, als sei es kaputt. */}
      {seiten.length > 0 && (
        <label style={{ display: "flex", gap: space.sm, alignItems: "flex-start", fontSize: v("--font-size-small"), lineHeight: 1.6, margin: `${space.lg}px 0 ${space.md}px`, color: v("--color-text-muted"), cursor: "pointer" }}>
          <input type="checkbox" checked={einwilligung} onChange={(e) => setEinwilligung(e.target.checked)} style={{ marginTop: 3, flexShrink: 0 }} />
          <span>
            Ich bin damit einverstanden, dass mein Angebot zum Auslesen an unseren Dienstleister
            Anthropic in die USA übermittelt wird. Dort gilt kein dem europäischen gleichwertiges
            Datenschutzniveau; abgesichert ist die Übermittlung durch Standardvertragsklauseln.
            Das Dokument wird nicht gespeichert und nicht zum Training verwendet. Mehr dazu in der{" "}
            <Link href="/datenschutz" style={{ color: v("--color-accent") }}>Datenschutzerklärung</Link>.
          </span>
        </label>
      )}

      {seiten.length > 0 && (
        <button
          type="button"
          onClick={pruefen}
          disabled={zustand.art === "laeuft" || !einwilligung}
          style={{
            padding: pad("sm", "lg"), borderRadius: v("--radius-md"), border: "none",
            background: einwilligung ? v("--color-accent") : v("--color-border"),
            color: einwilligung ? v("--color-text-on-accent") : v("--color-text-muted"),
            fontSize: v("--font-size-body"), fontWeight: 600,
            cursor: einwilligung && zustand.art !== "laeuft" ? "pointer" : "not-allowed",
          }}
        >
          {zustand.art === "laeuft"
            ? "Wird gelesen …"
            : `${seiten.length} ${seiten.length === 1 ? "Seite" : "Seiten"} prüfen`}
        </button>
      )}

      {zustand.art === "fehler" && (
        <p style={{ fontSize: v("--font-size-body"), color: v("--color-negative"), marginTop: space.md }}>{zustand.text}</p>
      )}

      {zustand.art === "abgelehnt" && (
        <p style={{ fontSize: v("--font-size-body"), color: v("--color-text-muted"), marginTop: space.md }}>
          Das sieht nicht nach einem Angebot für dieses Gewerk aus: {zustand.grund}
        </p>
      )}

      {gepruefte.length > 1 && <Vergleich gepruefte={gepruefte} einheit={einheit} />}

      {gepruefte.map((g, i) => (
        <div key={i} style={{ marginTop: space.xl }}>
          <h3 style={{ fontSize: v("--font-size-h3"), fontWeight: 700, color: v("--color-text-primary"), margin: `0 0 ${space.sm}px` }}>
            {beschriftung(g, i)}
          </h3>
          <Befund {...g} befund={mitGroesse(g.befund, auslegungKw)} einheit={einheit} />
        </div>
      ))}

      {(gepruefte.length > 0 || seiten.length > 0) && (
        <button
          type="button"
          onClick={zuruecksetzen}
          style={{
            marginTop: space.xl, padding: pad("xs", "md"), borderRadius: v("--radius-md"),
            border: `1px solid ${v("--color-border")}`, background: "transparent",
            color: v("--color-text-muted"), fontSize: v("--font-size-small"), cursor: "pointer",
          }}
        >
          Von vorn anfangen
        </button>
      )}
    </div>
  );
}

/**
 * Zwei oder mehr Angebote nebeneinander.
 *
 * Der Vergleich ist die eigentliche Leistung: Die Verbraucherzentrale schreibt,
 * das Kernproblem sei nicht der Preis, sondern dass Angebote unterschiedlich
 * geschnitten sind und sich deshalb nicht vergleichen lassen. Wir lösen genau
 * das auf — jede Zeile ist eine Position, jede Spalte ein Angebot, und man sieht
 * auf einen Blick, wo eines etwas enthält, das dem anderen fehlt.
 *
 * KEIN GESAMTURTEIL, keine Empfehlung, welches das bessere ist. Das hängt an
 * Dingen, die in keinem der beiden Dokumente stehen — Termin, Erreichbarkeit,
 * wer schon vor Ort war.
 */
function Vergleich({ gepruefte, einheit }: { gepruefte: Geprueft[]; einheit: string }) {
  // Alle Positionen, die in irgendeinem der Angebote vorkommen oder gefordert
  // sind — sonst verschwindet eine Position, die nur eines von beiden nennt,
  // und das ist der interessanteste Fall.
  const positionen = gepruefte[0].befund.gewerk.positionen;

  const zustandVon = (g: Geprueft, id: string): string => {
    const v = g.befund.vollstaendigkeit;
    if (v.fehlend.some((f) => f.position.id === id)) return "fehlt";
    if (v.moeglicherweiseNoetig.some((f) => f.position.id === id)) return "fehlt";
    if (v.ohnePreis.some((f) => f.position.id === id)) return "im Paket";
    return "drin";
  };

  const farbe = (z: string) =>
    z === "fehlt" ? v("--color-negative") : z === "im Paket" ? v("--color-text-muted") : v("--color-positive");

  return (
    <div style={{ marginTop: space.xl }}>
      <h3 style={{ fontSize: v("--font-size-h2"), fontWeight: 700, color: v("--color-text-primary"), margin: `0 0 ${space.sm}px` }}>Die Angebote nebeneinander</h3>
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", fontSize: v("--font-size-body"), color: v("--color-text-primary"), minWidth: 320, width: "100%" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "6px 8px 6px 0", fontWeight: 600 }}></th>
              {gepruefte.map((_, i) => (
                <th key={i} style={{ textAlign: "left", padding: "6px 8px", fontWeight: 600 }}>Angebot {i + 1}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: "6px 8px 6px 0", color: v("--color-text-secondary") }}>Gesamtpreis</td>
              {gepruefte.map((g, i) => (
                <td key={i} style={{ padding: "6px 8px", fontWeight: 600 }}>
                  {g.gesamtpreisEur != null ? euro(g.gesamtpreisEur) : "—"}
                </td>
              ))}
            </tr>
            <tr>
              <td style={{ padding: "6px 8px 6px 0", color: v("--color-text-secondary") }}>Größe</td>
              {gepruefte.map((g, i) => (
                <td key={i} style={{ padding: "6px 8px" }}>
                  {g.befund.groesse.angebotKw != null ? `${g.befund.groesse.angebotKw} ${einheit}` : "—"}
                </td>
              ))}
            </tr>
            <tr>
              <td style={{ padding: "6px 8px 6px 0", color: v("--color-text-secondary") }}>je {einheit}</td>
              {gepruefte.map((g, i) => (
                <td key={i} style={{ padding: "6px 8px" }}>
                  {g.befund.preis.spezKostenEurProKw != null ? proEinheit(g.befund.preis.spezKostenEurProKw, einheit) : "—"}
                </td>
              ))}
            </tr>
            {positionen.map((p) => (
              <tr key={p.id} style={{ borderTop: `1px solid ${v("--color-border")}` }}>
                <td style={{ padding: "6px 8px 6px 0", color: v("--color-text-secondary") }}>{p.name}</td>
                {gepruefte.map((g, i) => {
                  const z = zustandVon(g, p.id);
                  return <td key={i} style={{ padding: "6px 8px", color: farbe(z) }}>{z}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: v("--font-size-small"), color: v("--color-text-muted"), lineHeight: 1.6, marginTop: space.md }}>
        „Im Paket" heißt: die Leistung ist enthalten, aber ohne eigenen Preis — dann lässt sich
        genau dieser Posten nicht vergleichen. Welches Angebot das bessere ist, sagen wir nicht;
        das hängt auch an Dingen, die in keinem der Dokumente stehen.
      </p>
    </div>
  );
}

/**
 * Die Rückfragen als fertiger Text zum Weitergeben.
 *
 * BEWUSST ZUM KOPIEREN, NICHT ZUM VERSENDEN. Eine Mail von uns an den Betrieb
 * machte uns zum Absender in einem fremden Vertragsverhältnis — wir bräuchten
 * seine Adresse (die der Meister absichtlich nicht zurückgibt), und der
 * Handwerker bekäme Post von einer Seite, die sein Angebot gerade bewertet hat.
 * Wer die Fragen stellen will, hat den Mailverlauf mit seinem Betrieb ohnehin
 * offen.
 *
 * Die Zahlen der Referenz bleiben DRAUSSEN: Im Gespräch mit dem eigenen
 * Handwerker ist „das fehlt in 32 % der Angebote" kein Argument, sondern eine
 * Belehrung. Der Text stellt Fragen, er führt keinen Beweis.
 */
function alsText(befund: AngebotsBefund, geraet: string | null): string {
  const kopf = geraet
    ? `zu Ihrem Angebot über ${geraet} habe ich noch ein paar Fragen:`
    : "zu Ihrem Angebot habe ich noch ein paar Fragen:";
  const fragen = befund.rueckfragen.map((f, i) => `${i + 1}. ${f.text}`).join("\n\n");
  return `Guten Tag,\n\n${kopf}\n\n${fragen}\n\nVielen Dank!`;
}

function Befund({ befund, geraet, gesamtpreisEur, einheit }: { befund: AngebotsBefund; geraet: string | null; gesamtpreisEur: number | null; einheit: string }) {
  const { groesse, vollstaendigkeit, preis, unsicher } = befund;

  return (
    <div style={{ marginTop: space.lg }}>
      {geraet && (
        <p style={{ fontSize: v("--font-size-body"), color: v("--color-text-muted"), marginTop: 0 }}>
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
            {groesse.erwartetKw.toLocaleString("de-DE", { maximumFractionDigits: 1 })} {einheit} Auslegungsleistung.
            Angeboten sind {groesse.angebotKw!.toLocaleString("de-DE", { maximumFractionDigits: 1 })} {einheit}
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
        ton={preis.urteil === "darueber" ? "hinweis" : preis.urteil === "unbekannt" || preis.urteil === "nur-gesamt" ? "neutral" : "gut"}
      >
        {preis.urteil === "unbekannt" ? (
          <>Im Angebot steht kein Gesamtpreis, den wir sicher lesen konnten.</>
        ) : preis.urteil === "nur-gesamt" ? (
          <>
            Die Leistung der Anlage steht nicht im Angebot — deshalb können wir den Preis nicht je{" "}
            {einheit} einordnen, wohl aber als Ganzes. Vergleichbare Angebote liegen zwischen{" "}
            {euro(preis.gesamtLage!.min)} und {euro(preis.gesamtLage!.max)}, in der Mitte bei{" "}
            {euro(preis.gesamtLage!.median)}. Deins liegt{" "}
            {preis.gesamtLage!.anteil < 0.33 ? <>im unteren Drittel</>
              : preis.gesamtLage!.anteil > 0.66 ? <>im oberen Drittel</>
              : <>im mittleren Drittel</>} dieser Spanne.
            <br /><br />
            <em>Das ist die gröbere Auskunft: Ohne die Leistung wissen wir nicht, ob eine große
            Anlage günstig oder eine kleine teuer ist. Frag nach der Heizleistung — sie steht oft
            nur in der Typenbezeichnung.</em>
          </>
        ) : (
          <>
            Dein Angebot liegt bei {proEinheit(preis.spezKostenEurProKw!, einheit)}. Bei Anlagen von{" "}
            {preis.band!.beschriftung} liegen die meisten ausgewerteten Angebote zwischen{" "}
            {euro(preis.band!.von)} und {euro(preis.band!.bis)} je {einheit}.{" "}
            {preis.urteil === "im-band" && <>Damit liegst du im üblichen Bereich.</>}
            {preis.urteil === "darunter" && <>Damit liegst du darunter. Prüf gegen, ob wirklich alles enthalten ist — ein günstiges Angebot ist oft ein unvollständiges.</>}
            {preis.urteil === "darueber" && <>Damit liegst du darüber. Ein zweites Angebot lohnt sich.</>}
            <br /><br />
            <em>Große Anlagen kosten je {einheit} weniger als kleine, weil ein großer Teil der Kosten
            gar nicht an der Größe hängt. Deshalb vergleichen wir innerhalb deiner Größenklasse
            {preis.medianAlle != null && <> und nicht gegen den Gesamtdurchschnitt von {proEinheit(preis.medianAlle, einheit)}</>}.</em>
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
                    {/* Der Name muss dabeistehen: Frage und Zahl können
                        verschiedene Positionen meinen. */}
                    {f.bezugName && <>{f.bezugName}: </>}
                    {f.anteilEnthalten != null && <>enthalten in {Math.round(f.anteilEnthalten * 100)} % der ausgewerteten Angebote</>}
                    {f.anteilEnthalten != null && f.medianKosten != null && <> · </>}
                    {f.medianKosten != null && <>wo ausgewiesen im Mittel {euro(f.medianKosten)} (aus {f.medianBasis} Angeboten)</>}
                  </div>
                )}
              </li>
            ))}
          </ul>
          <KopierKnopf text={alsText(befund, geraet)} />

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

      <p style={{ fontSize: v("--font-size-caption"), color: v("--color-text-muted"), marginTop: space.lg, lineHeight: 1.6 }}>
        Vergleichsgruppe: {befund.gewerk.vergleichsgruppe} ({befund.gewerk.stand.quelleKurz}).
        Eine Stichprobe lässt sich nicht ohne Weiteres auf den Gesamtmarkt übertragen. Diese Prüfung
        ersetzt keine Beratung und beurteilt keinen Betrieb — sie liest ein Dokument. Ohne Gewähr.
      </p>
    </div>
  );
}
