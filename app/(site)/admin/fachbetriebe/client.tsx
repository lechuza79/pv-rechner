"use client";

import { useCallback, useEffect, useState } from "react";
import { v, space, pad } from "../../../../lib/theme";
import { BUNDESLAENDER } from "../../../../lib/mastr-regions";
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
// Hauptarbeit, und dafür müssen gleiche Angaben untereinander stehen.

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
  email: string | null;
  telefon: string | null;
  kontakt_url: string | null;
  kontakt_formular: boolean | null;
  impressum_url: string | null;
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

export default function FachbetriebeAnsicht() {
  const [zeilen, setZeilen] = useState<Zeile[]>([]);
  const [gesamt, setGesamt] = useState(0);
  const [seite, setSeite] = useState(0);
  const [laedt, setLaedt] = useState(true);
  const [fehler, setFehler] = useState<string | null>(null);
  const [offen, setOffen] = useState<string | null>(null);

  const [bl, setBl] = useState("");
  const [stand, setStand] = useState("");
  const [art, setArt] = useState("betrieb");
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
  }, [bl, stand, art, suche, nurKontakt, nurMeister, sortierung, seite]);

  useEffect(() => {
    void laden();
  }, [laden]);

  // Jede Filteränderung setzt auf die erste Seite zurück. Ohne das steht man
  // nach dem Filtern auf Seite 12 einer Liste mit vier Treffern und sieht nichts.
  const filterSetzen = <T,>(f: (x: T) => void) => (x: T) => {
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
    <div style={{ maxWidth: 1240, margin: "0 auto", paddingBottom: space.xxl }}>
      <h1 style={{ fontSize: 24, marginBottom: space.xs }}>PV-Fachbetriebe</h1>
      <p style={{ color: v("--color-text-muted"), marginBottom: space.lg, maxWidth: 720 }}>
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
          style={{
            padding: pad("xs", "sm"),
            borderRadius: v("--radius-sm"),
            border: `1px solid ${v("--color-border")}`,
            background: v("--color-bg"),
            color: v("--color-text-primary"),
            minWidth: 220,
          }}
        />
        <select value={bl} onChange={(e) => filterSetzen(setBl)(e.target.value)} style={wahlStil}>
          <option value="">alle Bundesländer</option>
          {BUNDESLAENDER.map((b) => (
            <option key={b.ags} value={b.ags}>
              {b.name}
            </option>
          ))}
        </select>
        <select value={art} onChange={(e) => filterSetzen(setArt)(e.target.value)} style={wahlStil}>
          <option value="betrieb">Betriebe</option>
          <option value="unklar">unklar</option>
          <option value="kein-betrieb">kein Betrieb</option>
          <option value="ueberregional">überregional</option>
          <option value="">alle</option>
        </select>
        <select
          value={stand}
          onChange={(e) => filterSetzen(setStand)(e.target.value)}
          style={wahlStil}
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
          style={wahlStil}
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

      <p style={{ color: v("--color-text-muted"), marginBottom: space.sm }}>
        {laedt ? "lädt …" : `${gesamt.toLocaleString("de-DE")} Treffer`}
        {seiten > 1 && !laedt ? ` · Seite ${seite + 1} von ${seiten}` : ""}
      </p>
      {fehler && (
        <p style={{ color: v("--color-negative"), marginBottom: space.sm }}>{fehler}</p>
      )}

      {/* ── Liste ──────────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gap: space.xs }}>
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
                  alignItems: "baseline",
                  padding: pad("sm", "md"),
                  background: "none",
                  border: "none",
                  color: v("--color-text-primary"),
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <span style={{ fontWeight: 600, flex: "1 1 300px", minWidth: 0 }}>
                  {z.firmenname ?? z.domain}
                </span>
                <span style={{ color: v("--color-text-muted"), flex: "0 1 200px", minWidth: 0 }}>
                  {z.plz && z.ort ? `${z.plz} ${z.ort}` : "— keine Anschrift"}
                </span>
                <span style={{ flex: "0 0 auto", display: "flex", gap: space.xs }}>
                  {z.meisterbetrieb && <Marke text="Meister" />}
                  {z.handwerkskammer && <Marke text="Kammer" />}
                  {z.installateurverzeichnis && <Marke text="Installateur" />}
                  {z.gruendungsjahr && <Marke text={`seit ${z.gruendungsjahr}`} />}
                </span>
                <span
                  style={{ color: v("--color-text-muted"), flex: "0 0 auto", fontSize: 13 }}
                  title="belegte Vertrauensmerkmale — eine Auskunft über unseren Datenstand, keine Bewertung des Betriebs"
                >
                  {merkmale}/8
                </span>
                <span
                  style={{
                    flex: "0 0 auto",
                    fontSize: 13,
                    color: hatKontaktweg(z) ? v("--color-positive") : v("--color-text-muted"),
                  }}
                >
                  {hatKontaktweg(z) ? "erreichbar" : "kein Kontakt"}
                </span>
                {z.stand !== "offen" && <Marke text={z.stand} />}
              </button>

              {auf && (
                <div
                  style={{
                    padding: pad("md", "md"),
                    borderTop: `1px solid ${v("--color-border")}`,
                    display: "grid",
                    gap: space.sm,
                  }}
                >
                  <div style={{ display: "flex", flexWrap: "wrap", gap: space.lg }}>
                    <Feld titel="Adresse">
                      {z.strasse ? `${z.strasse}, ` : ""}
                      {z.plz} {z.ort}
                      {z.rechtsform ? ` · ${z.rechtsform}` : ""}
                      {z.hr_nummer ? ` · ${z.hr_nummer}${z.hr_gericht ? ` (${z.hr_gericht})` : ""}` : ""}
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
                        // eine Selbstauskunft der Website, keine erhobene Bewertung.
                        z.bewertung_wert
                          ? `${z.bewertung_wert} von 5 aus ${z.bewertung_anzahl} Bewertungen (Angabe der Website)`
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
                    <a href={`https://${z.domain}`} target="_blank" rel="noreferrer" style={linkStil}>
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

                  <div style={{ display: "flex", gap: space.sm, flexWrap: "wrap", alignItems: "center" }}>
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
                          color: z.stand === s.wert ? v("--color-text-on-accent") : v("--color-text-primary"),
                          cursor: "pointer",
                          fontSize: 13,
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
                    style={{
                      width: "100%",
                      padding: pad("xs", "sm"),
                      borderRadius: v("--radius-sm"),
                      border: `1px solid ${v("--color-border")}`,
                      background: v("--color-bg"),
                      color: v("--color-text-primary"),
                      fontFamily: "inherit",
                      resize: "vertical",
                    }}
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
        <div style={{ display: "flex", gap: space.sm, marginTop: space.lg, alignItems: "center" }}>
          <button onClick={() => setSeite((s) => Math.max(0, s - 1))} disabled={seite === 0} style={blaetterStil}>
            zurück
          </button>
          <span style={{ color: v("--color-text-muted") }}>
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
        fontSize: 12,
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
      <div style={{ fontSize: 12, color: v("--color-text-muted"), marginBottom: 2 }}>{titel}</div>
      <div style={{ fontSize: 14 }}>{children}</div>
    </div>
  );
}

const wahlStil: React.CSSProperties = {
  padding: pad("xs", "sm"),
  borderRadius: v("--radius-sm"),
  border: `1px solid ${v("--color-border")}`,
  background: v("--color-bg"),
  color: v("--color-text-primary"),
};

const hakenStil: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: space.xxs,
  color: v("--color-text-primary"),
  fontSize: 14,
  cursor: "pointer",
};

const linkStil: React.CSSProperties = {
  color: v("--color-accent"),
  fontSize: 14,
};

const blaetterStil: React.CSSProperties = {
  padding: pad("xs", "sm"),
  borderRadius: v("--radius-sm"),
  border: `1px solid ${v("--color-border")}`,
  background: "transparent",
  color: v("--color-text-primary"),
  cursor: "pointer",
};
