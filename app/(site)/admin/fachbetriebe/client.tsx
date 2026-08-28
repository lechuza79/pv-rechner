"use client";

import { useCallback, useEffect, useState } from "react";
import { v, space, pad } from "../../../../lib/theme";
import { BUNDESLAENDER } from "../../../../lib/mastr-regions";
import { GEWERKE } from "../../../../lib/fachbetrieb-extrakt";
import { STAENDE, belegteMerkmale, hatKontaktweg } from "../../../../lib/fachbetrieb-stand";

// Ansicht der erhobenen PV-Fachbetriebe.
//
// WOFÜR SIE DA IST, und das begrenzt sie: Bevor irgendetwas mit diesen Adressen
// geschieht, muss geklärt sein, ob ein Betrieb überhaupt mitmachen will — und
// das klärt sich, indem der Betreiber ein paar Betriebe ansieht und anspricht.
// Genau dafür braucht er Filter, die Merkmale nebeneinander, und einen Platz für
// eine Notiz. Alles darüber hinaus wäre Vorrat für einen Versandweg, den es
// bewusst nicht gibt (docs/solarteur-widget-offene-fragen.md).
//
// Tabelle statt Karten: Bei über dreitausend Betrieben ist Vergleichen die
// Hauptarbeit, und dafür müssen gleiche Angaben untereinander stehen. Die
// Kopfzeile benennt jede Spalte, weil eine Zahl wie „3/8" ohne Beschriftung eine
// Behauptung ist.

type Zeile = {
  domain: string;
  firmenname: string | null;
  rechtsform: string | null;
  hr_nummer: string | null;
  hr_gericht: string | null;
  strasse: string | null;
  plz: string | null;
  ort: string | null;
  region_id: string | null;
  kreis_id: string | null;
  kreis_name: string | null;
  kreis_art: string | null;
  bundesland: string | null;
  bundesland_kurz: string | null;
  email: string | null;
  telefon: string | null;
  kontakt_url: string | null;
  kontakt_formular: boolean | null;
  impressum_url: string | null;
  favicon_url: string | null;
  meisterbetrieb: boolean | null;
  innung: string | null;
  handwerkskammer: string | null;
  installateurverzeichnis: boolean | null;
  zertifikate: string[] | null;
  gruendungsjahr: number | null;
  bewertung_wert: number | null;
  bewertung_anzahl: number | null;
  bewertung_quelle: string | null;
  geschaeftsfelder: string[] | null;
  gewerke: string[] | null;
  art: string;
  art_grund: string | null;
  kreise_gesehen: number;
  stand: string;
  notiz: string | null;
  stand_at: string | null;
  profil_fehler: string | null;
};

type Antwort = { zeilen: Zeile[]; gesamt: number; seite: number; proSeite: number };

const FELD_TEXT: Record<string, string> = {
  photovoltaik: "Photovoltaik",
  speicher: "Speicher",
  waermepumpe: "Wärmepumpe",
  wallbox: "Wallbox",
  balkonkraftwerk: "Balkonkraftwerk",
};

const GEWERK_TEXT: Record<string, string> = Object.fromEntries(
  GEWERKE.map((g) => [g.name, g.text]),
);

/** Die Spalten der Kopfzeile. `hilfe` erscheint als „?" mit Erklärung — nur da,
 *  wo die Überschrift allein die Zahl nicht erklärt. */
const SPALTEN: { text: string; breite: string; hilfe?: string; rechts?: boolean }[] = [
  { text: "Betrieb", breite: "1 1 260px" },
  { text: "Ort", breite: "0 1 180px" },
  { text: "Landkreis", breite: "0 1 160px" },
  { text: "Gewerk", breite: "0 1 150px", hilfe: "Welches Handwerk der Betrieb nach eigenen Angaben ausübt — aus Firmenname, Menü und Impressum. Mehrere sind bei Komplettanbietern normal; gemessen tragen zwei Drittel mindestens eines, 40 von 3.117 vier oder mehr. Fehlt die Angabe, sagt die Website es nirgends." },
  { text: "Merkmale", breite: "0 0 auto" },
  {
    text: "belegt",
    breite: "0 0 44px",
    rechts: true,
    hilfe:
      "Wie viele der acht Vertrauensmerkmale wir belegen können — eine Auskunft über unseren Datenstand, keine Bewertung des Betriebs. Wer seinen Meistertitel nicht auf die Website schreibt, bekommt hier weniger Punkte als einer, der es tut.",
  },
  {
    text: "Kontakt",
    breite: "0 0 92px",
    hilfe: "Erreichbar heißt: E-Mail, Telefon oder Kontaktformular. Ein Formular ist ein Weg, aber kein Postfach.",
  },
  { text: "Stand", breite: "0 0 84px" },
];

export default function FachbetriebeAnsicht() {
  const [zeilen, setZeilen] = useState<Zeile[]>([]);
  const [gesamt, setGesamt] = useState(0);
  const [seite, setSeite] = useState(0);
  const [laedt, setLaedt] = useState(true);
  const [fehler, setFehler] = useState<string | null>(null);
  const [offen, setOffen] = useState<string | null>(null);
  const [hilfeZu, setHilfeZu] = useState<string | null>(null);

  const [bl, setBl] = useState("");
  const [stand, setStand] = useState("");
  const [art, setArt] = useState("betrieb");
  const [gewerk, setGewerk] = useState("");
  const [suche, setSuche] = useState("");
  const [nurKontakt, setNurKontakt] = useState(false);
  const [nurMeister, setNurMeister] = useState(false);
  const [sortierung, setSortierung] = useState("");

  const laden = useCallback(async () => {
    setLaedt(true);
    setFehler(null);
    const p = new URLSearchParams();
    if (bl) p.set("bl", bl);
    if (stand) p.set("stand", stand);
    if (art) p.set("art", art);
    if (gewerk) p.set("gewerk", gewerk);
    if (suche) p.set("q", suche);
    if (nurKontakt) p.set("kontakt", "1");
    if (nurMeister) p.set("meister", "1");
    if (sortierung) p.set("sort", sortierung);
    p.set("page", String(seite));
    try {
      const r = await fetch(`/api/admin/fachbetriebe?${p.toString()}`);
      if (!r.ok) throw new Error(`Laden fehlgeschlagen (${r.status})`);
      const d = (await r.json()) as Antwort;
      setZeilen(d.zeilen);
      setGesamt(d.gesamt);
    } catch (e) {
      setFehler(e instanceof Error ? e.message : String(e));
    } finally {
      setLaedt(false);
    }
  }, [bl, stand, art, gewerk, suche, nurKontakt, nurMeister, sortierung, seite]);

  useEffect(() => {
    void laden();
  }, [laden]);

  // Jede Filteränderung setzt auf die erste Seite zurück. Ohne das steht man
  // nach dem Filtern auf Seite 12 einer Liste mit vier Treffern und sieht nichts.
  const filterSetzen =
    <T,>(f: (x: T) => void) =>
    (x: T) => {
      setSeite(0);
      f(x);
    };

  async function aendern(domain: string, feld: { stand?: string; notiz?: string | null }) {
    const r = await fetch("/api/admin/fachbetriebe", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain, ...feld }),
    });
    if (!r.ok) {
      setFehler(`Speichern fehlgeschlagen (${r.status})`);
      return;
    }
    const { zeile } = (await r.json()) as { zeile: Zeile };
    setZeilen((alt) => alt.map((z) => (z.domain === zeile.domain ? zeile : z)));
  }

  const seiten = Math.ceil(gesamt / 50);

  return (
    <div style={{ maxWidth: 1320, margin: "0 auto", paddingBottom: space.xxl }}>
      <h1 style={{ fontSize: v("--font-size-h1"), marginBottom: space.xs }}>PV-Fachbetriebe</h1>
      <p
        style={{
          color: v("--color-text-muted"),
          marginBottom: space.lg,
          maxWidth: 720,
          fontSize: v("--font-size-body"),
        }}
      >
        Erhoben über die Ortssuche in allen 400 Landkreisen, angereichert aus Impressum,
        Startseite und Kontaktseite. Jedes Merkmal hat einen Beleg mit Fundstelle. Es gibt
        keinen Versandweg — die Ansicht dient dem Ansehen und Vormerken.
      </p>

      {/* ── Filter ─────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: space.sm,
          alignItems: "center",
          marginBottom: space.md,
          padding: pad("sm", "md"),
          background: v("--color-bg-muted"),
          borderRadius: v("--radius-md"),
        }}
      >
        <input
          value={suche}
          onChange={(e) => filterSetzen(setSuche)(e.target.value)}
          placeholder="Name, Ort oder Adresse"
          style={{ ...eingabeStil, minWidth: 200 }}
        />
        <select value={bl} onChange={(e) => filterSetzen(setBl)(e.target.value)} style={eingabeStil}>
          <option value="">alle Bundesländer</option>
          {BUNDESLAENDER.map((b) => (
            <option key={b.ags} value={b.ags}>
              {b.name}
            </option>
          ))}
        </select>
        <select
          value={gewerk}
          onChange={(e) => filterSetzen(setGewerk)(e.target.value)}
          style={eingabeStil}
        >
          <option value="">jedes Gewerk</option>
          {GEWERKE.map((g) => (
            <option key={g.name} value={g.name}>
              {g.text}
            </option>
          ))}
        </select>
        <select
          value={art}
          onChange={(e) => filterSetzen(setArt)(e.target.value)}
          style={eingabeStil}
        >
          <option value="betrieb">Betriebe</option>
          <option value="unklar">unklar</option>
          <option value="kein-betrieb">kein Betrieb</option>
          <option value="ueberregional">überregional</option>
          <option value="">alle</option>
        </select>
        <select
          value={stand}
          onChange={(e) => filterSetzen(setStand)(e.target.value)}
          style={eingabeStil}
        >
          <option value="">jeder Arbeitsstand</option>
          {STAENDE.map((s) => (
            <option key={s.wert} value={s.wert}>
              {s.text}
            </option>
          ))}
        </select>
        <select
          value={sortierung}
          onChange={(e) => filterSetzen(setSortierung)(e.target.value)}
          style={eingabeStil}
        >
          <option value="">nach Adresse</option>
          <option value="gruendung">ältester Betrieb zuerst</option>
          <option value="streuung">weiteste Verbreitung zuerst</option>
        </select>
        <label style={hakenStil}>
          <input
            type="checkbox"
            checked={nurKontakt}
            onChange={(e) => filterSetzen(setNurKontakt)(e.target.checked)}
          />
          nur erreichbare
        </label>
        <label style={hakenStil}>
          <input
            type="checkbox"
            checked={nurMeister}
            onChange={(e) => filterSetzen(setNurMeister)(e.target.checked)}
          />
          nur Meisterbetriebe
        </label>
      </div>

      <p
        style={{
          color: v("--color-text-muted"),
          marginBottom: space.sm,
          fontSize: v("--font-size-small"),
        }}
      >
        {laedt ? "lädt …" : `${gesamt.toLocaleString("de-DE")} Treffer`}
        {seiten > 1 && !laedt ? ` · Seite ${seite + 1} von ${seiten}` : ""}
      </p>
      {fehler && (
        <p style={{ color: v("--color-negative"), marginBottom: space.sm }}>{fehler}</p>
      )}

      {/* ── Kopfzeile ──────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          gap: space.sm,
          alignItems: "center",
          padding: pad("xs", "md"),
          fontSize: v("--font-size-caption"),
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          color: v("--color-text-secondary"),
          fontWeight: 700,
        }}
      >
        {/* Platzhalter in der Breite des Logos, damit die Spalten fluchten. */}
        <span style={{ flex: "0 0 20px" }} aria-hidden />
        {SPALTEN.map((s) => (
          <span
            key={s.text}
            style={{
              flex: s.breite,
              minWidth: 0,
              textAlign: s.rechts ? "right" : "left",
              display: "flex",
              alignItems: "center",
              gap: 4,
              justifyContent: s.rechts ? "flex-end" : "flex-start",
            }}
          >
            {s.text}
            {s.hilfe && (
              <button
                type="button"
                onClick={() => setHilfeZu(hilfeZu === s.text ? null : s.text)}
                aria-expanded={hilfeZu === s.text}
                aria-label={`Was bedeutet „${s.text}"?`}
                style={hilfeKnopfStil}
              >
                ?
              </button>
            )}
          </span>
        ))}
      </div>
      {hilfeZu && (
        <p
          style={{
            margin: `0 0 ${space.xs}px`,
            padding: pad("xs", "md"),
            background: v("--color-bg-accent"),
            borderRadius: v("--radius-sm"),
            fontSize: v("--font-size-small"),
            color: v("--color-text-secondary"),
          }}
        >
          <strong>{hilfeZu}:</strong> {SPALTEN.find((s) => s.text === hilfeZu)?.hilfe}
        </p>
      )}

      {/* ── Liste ──────────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gap: space.xxs }}>
        {zeilen.map((z) => {
          const auf = offen === z.domain;
          const merkmale = belegteMerkmale(z);
          return (
            <div
              key={z.domain}
              style={{
                background: v("--color-bg-muted"),
                borderRadius: v("--radius-md"),
                border: `1px solid ${v("--color-border")}`,
                overflow: "hidden",
              }}
            >
              <button
                onClick={() => setOffen(auf ? null : z.domain)}
                aria-expanded={auf}
                style={{
                  width: "100%",
                  display: "flex",
                  gap: space.sm,
                  alignItems: "center",
                  padding: pad("sm", "md"),
                  background: "none",
                  border: "none",
                  color: v("--color-text-primary"),
                  textAlign: "left",
                  cursor: "pointer",
                  fontSize: v("--font-size-small"),
                  fontFamily: "inherit",
                }}
              >
                {/* Das Logo ist das Favicon der eigenen Seite — die Adresse wird
                    beim Erheben AUS DEM HTML gelesen, nicht geraten: „/favicon.ico"
                    ist nur eine von mehreren Konventionen, und wer sie rät,
                    bekommt bei vielen nichts und hält das für „hat kein Logo".
                    Geladen ohne Herkunftsangabe, damit der Abruf dem Betrieb
                    nicht verrät, woher er kommt. Fehlt es, bleibt der Platz leer
                    statt ein Ersatzbild zu zeigen, das eine Marke behauptete. */}
                <img
                  src={z.favicon_url ?? `https://${z.domain}/favicon.ico`}
                  alt=""
                  width={16}
                  height={16}
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.style.visibility = "hidden";
                  }}
                  style={{ flex: "0 0 20px", width: 16, height: 16, objectFit: "contain" }}
                />
                <span
                  style={{
                    flex: "1 1 260px",
                    minWidth: 0,
                    fontWeight: 600,
                    fontSize: v("--font-size-body"),
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {z.firmenname ?? z.domain}
                </span>
                <span style={{ ...spaltenStil, flex: "0 1 180px" }}>
                  {z.plz && z.ort ? `${z.plz} ${z.ort}` : "—"}
                </span>
                {/* Landkreis groß, Bundesland klein darunter — eine Spalte, zwei
                    Ebenen: Der Kreis ist die Arbeitsgröße, das Land die
                    Einordnung. */}
                <span style={{ flex: "0 1 160px", minWidth: 0, lineHeight: 1.25 }}>
                  <span
                    style={{
                      display: "block",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {z.kreis_name ?? "—"}
                  </span>
                  {z.bundesland_kurz && (
                    <span
                      style={{
                        display: "block",
                        fontSize: v("--font-size-caption"),
                        color: v("--color-text-muted"),
                      }}
                    >
                      {z.bundesland_kurz}
                    </span>
                  )}
                </span>
                <span style={{ ...spaltenStil, flex: "0 1 150px" }}>
                  {(z.gewerke ?? []).map((g) => GEWERK_TEXT[g] ?? g).join(", ") || "—"}
                </span>
                <span style={{ flex: "0 0 auto", display: "flex", gap: space.xxs }}>
                  {z.meisterbetrieb && <Marke text="Meister" />}
                  {z.handwerkskammer && <Marke text="Kammer" />}
                  {z.installateurverzeichnis && <Marke text="Installateur" />}
                  {z.bewertung_wert && (
                    <Marke text={`${z.bewertung_wert.toLocaleString("de-DE")} ★`} />
                  )}
                  {z.gruendungsjahr && <Marke text={`seit ${z.gruendungsjahr}`} />}
                </span>
                <span
                  style={{
                    flex: "0 0 44px",
                    textAlign: "right",
                    color: v("--color-text-muted"),
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {merkmale}/8
                </span>
                <span
                  style={{
                    flex: "0 0 92px",
                    color: hatKontaktweg(z) ? v("--color-positive") : v("--color-text-muted"),
                  }}
                >
                  {hatKontaktweg(z) ? "erreichbar" : "kein Kontakt"}
                </span>
                <span style={{ flex: "0 0 84px", color: v("--color-text-muted") }}>
                  {z.stand === "offen" ? "" : z.stand}
                </span>
              </button>

              {auf && (
                <div
                  style={{
                    padding: pad("md", "md"),
                    borderTop: `1px solid ${v("--color-border")}`,
                    display: "grid",
                    gap: space.sm,
                    fontSize: v("--font-size-small"),
                  }}
                >
                  <div style={{ display: "flex", flexWrap: "wrap", gap: space.lg }}>
                    <Feld titel="Adresse">
                      {z.strasse ? `${z.strasse}, ` : ""}
                      {z.plz} {z.ort}
                      {z.kreis_name ? ` · ${z.kreis_art} ${z.kreis_name}, ${z.bundesland}` : ""}
                      {z.rechtsform ? ` · ${z.rechtsform}` : ""}
                      {z.hr_nummer
                        ? ` · ${z.hr_nummer}${z.hr_gericht ? ` (${z.hr_gericht})` : ""}`
                        : ""}
                    </Feld>
                    <Feld titel="Kontakt">
                      {z.email ?? "keine Adresse"}
                      {z.telefon ? ` · ${z.telefon}` : ""}
                      {z.kontakt_formular ? " · Formular" : ""}
                    </Feld>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: space.lg }}>
                    <Feld titel="Angebot">
                      {(z.geschaeftsfelder ?? []).map((f) => FELD_TEXT[f] ?? f).join(" · ") || "—"}
                    </Feld>
                    <Feld titel="Merkmale">
                      {[
                        z.meisterbetrieb ? "Meisterbetrieb" : null,
                        z.handwerkskammer,
                        z.innung,
                        z.installateurverzeichnis ? "Installateurverzeichnis" : null,
                        ...(z.zertifikate ?? []),
                        z.gruendungsjahr ? `gegründet ${z.gruendungsjahr}` : null,
                        // Die Herkunft steht AN der Zahl, nicht darunter: Das ist
                        // eine Selbstauskunft der Website, keine Google-Bewertung.
                        z.bewertung_wert
                          ? `${z.bewertung_wert.toLocaleString("de-DE")} von 5 aus ${z.bewertung_anzahl} Bewertungen (Angabe der Website)`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "keine belegt"}
                    </Feld>
                  </div>
                  <Feld titel="Einordnung">
                    {z.art}
                    {/* Der Grund nennt die Streuung meist schon („in 5 Kreisen
                        gesehen"); dann steht sie nicht ein zweites Mal daneben. */}
                    {z.art_grund
                      ? ` — ${z.art_grund}`
                      : ` — in ${z.kreise_gesehen} Kreis${z.kreise_gesehen === 1 ? "" : "en"} der Ortssuche gefunden`}
                    {z.profil_fehler ? ` · ${z.profil_fehler}` : ""}
                  </Feld>

                  <div style={{ display: "flex", gap: space.md, flexWrap: "wrap" }}>
                    <a
                      href={`https://${z.domain}`}
                      target="_blank"
                      rel="noreferrer"
                      style={linkStil}
                    >
                      Website öffnen
                    </a>
                    {z.impressum_url && (
                      <a href={z.impressum_url} target="_blank" rel="noreferrer" style={linkStil}>
                        Impressum
                      </a>
                    )}
                    {z.kontakt_url && (
                      <a href={z.kontakt_url} target="_blank" rel="noreferrer" style={linkStil}>
                        Kontaktseite
                      </a>
                    )}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: space.sm,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    {STAENDE.map((s) => (
                      <button
                        key={s.wert}
                        onClick={() => void aendern(z.domain, { stand: s.wert })}
                        aria-pressed={z.stand === s.wert}
                        title={s.hinweis}
                        style={{
                          padding: pad("xs", "sm"),
                          borderRadius: v("--radius-sm"),
                          border: `1px solid ${
                            z.stand === s.wert ? v("--color-accent") : v("--color-border")
                          }`,
                          background: z.stand === s.wert ? v("--color-accent") : "transparent",
                          color:
                            z.stand === s.wert
                              ? v("--color-text-on-accent")
                              : v("--color-text-primary"),
                          cursor: "pointer",
                          fontSize: v("--font-size-small"),
                          fontFamily: "inherit",
                        }}
                      >
                        {s.text}
                      </button>
                    ))}
                  </div>

                  <textarea
                    defaultValue={z.notiz ?? ""}
                    onBlur={(e) => {
                      if (e.target.value !== (z.notiz ?? "")) {
                        void aendern(z.domain, { notiz: e.target.value });
                      }
                    }}
                    placeholder="Notiz — was ist mit diesem Betrieb besprochen oder aufgefallen?"
                    rows={2}
                    style={{ ...eingabeStil, width: "100%", resize: "vertical" }}
                  />
                </div>
              )}
            </div>
          );
        })}
        {!laedt && zeilen.length === 0 && (
          <p style={{ color: v("--color-text-muted") }}>Keine Treffer für diese Filter.</p>
        )}
      </div>

      {seiten > 1 && (
        <div
          style={{ display: "flex", gap: space.sm, marginTop: space.lg, alignItems: "center" }}
        >
          <button
            onClick={() => setSeite((s) => Math.max(0, s - 1))}
            disabled={seite === 0}
            style={blaetterStil}
          >
            zurück
          </button>
          <span
            style={{ color: v("--color-text-muted"), fontSize: v("--font-size-small") }}
          >
            {seite + 1} / {seiten}
          </span>
          <button
            onClick={() => setSeite((s) => Math.min(seiten - 1, s + 1))}
            disabled={seite >= seiten - 1}
            style={blaetterStil}
          >
            weiter
          </button>
        </div>
      )}
    </div>
  );
}

function Marke({ text }: { text: string }) {
  return (
    <span
      style={{
        fontSize: v("--font-size-caption"),
        padding: pad("xxs", "xs"),
        borderRadius: v("--radius-sm"),
        background: v("--color-bg"),
        color: v("--color-text-muted"),
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  );
}

function Feld({ titel, children }: { titel: string; children: React.ReactNode }) {
  return (
    <div style={{ minWidth: 240, flex: "1 1 300px" }}>
      <div
        style={{
          fontSize: v("--font-size-caption"),
          color: v("--color-text-muted"),
          marginBottom: 2,
        }}
      >
        {titel}
      </div>
      <div style={{ fontSize: v("--font-size-small") }}>{children}</div>
    </div>
  );
}

const spaltenStil: React.CSSProperties = {
  minWidth: 0,
  color: v("--color-text-muted"),
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  textAlign: "left",
};

const eingabeStil: React.CSSProperties = {
  padding: pad("xs", "sm"),
  borderRadius: v("--radius-sm"),
  border: `1px solid ${v("--color-border")}`,
  background: v("--color-bg"),
  color: v("--color-text-primary"),
  fontSize: v("--font-size-small"),
  fontFamily: "inherit",
};

const hakenStil: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: space.xxs,
  color: v("--color-text-primary"),
  fontSize: v("--font-size-small"),
  cursor: "pointer",
};

const hilfeKnopfStil: React.CSSProperties = {
  width: 14,
  height: 14,
  borderRadius: "50%",
  border: `1px solid ${v("--color-border")}`,
  background: "transparent",
  color: v("--color-text-muted"),
  fontSize: 10,
  lineHeight: 1,
  cursor: "pointer",
  padding: 0,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flex: "0 0 auto",
};

const linkStil: React.CSSProperties = {
  color: v("--color-accent"),
  fontSize: v("--font-size-small"),
};

const blaetterStil: React.CSSProperties = {
  padding: pad("xs", "sm"),
  borderRadius: v("--radius-sm"),
  border: `1px solid ${v("--color-border")}`,
  background: "transparent",
  color: v("--color-text-primary"),
  cursor: "pointer",
  fontSize: v("--font-size-small"),
  fontFamily: "inherit",
};
