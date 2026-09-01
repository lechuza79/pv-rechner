"use client";

import { useCallback, useEffect, useState } from "react";
import { v, space, pad } from "../../../../lib/theme";
import { BUNDESLAENDER } from "../../../../lib/mastr-regions";
import { GEWERKE } from "../../../../lib/fachbetrieb-extrakt";
import {
  MERKMALE,
  STAENDE,
  belegteMerkmale,
  hatKontaktweg,
} from "../../../../lib/fachbetrieb-stand";
import InfoTooltip from "../../../../components/InfoTooltip";

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

/**
 * Die Spalten der Kopfzeile.
 *
 * ALLES linksbündig, auch die Zahl: In einer Liste, die man von oben nach unten
 * überfliegt, führt eine einzelne rechtsbündige Spalte das Auge aus der Flucht.
 * Die Ziffernbreite hält `tabular-nums` gerade, dafür braucht es keinen
 * Blocksatz.
 *
 * Ort und Landkreis teilen sich EINE Spalte — groß der Ort, klein der Kreis mit
 * seinem Bundesland. Zwei Spalten nebeneinander wiederholen dieselbe Auskunft in
 * zwei Genauigkeiten und kosten die Breite, die der Betriebsname braucht.
 *
 * Der Spaltenkopf IST der Sortierknopf, wie in der Rangliste des Atlas: ein
 * Klick sortiert, ein zweiter dreht die Richtung. Die Erklärung hängt am
 * vorhandenen Hilfe-Baustein des Projekts — Hover auf dem Schreibtisch, Tippen
 * auf dem Telefon, mit Tastatur bedienbar. Eine selbstgebaute Aufklapp-Zeile war
 * die falsche Antwort: Zwei Sorten Hilfetext nebeneinander sind eine zu viel.
 */
const SPALTEN: {
  text: string;
  breite: string;
  /** Sortierschlüssel; fehlt er, ist die Spalte nicht sortierbar. */
  sort?: string;
  hilfe?: React.ReactNode;
}[] = [
  { text: "Betrieb", breite: "1 1 240px", sort: "name" },
  { text: "Ort", breite: "0 1 200px", sort: "ort" },
  {
    text: "Gewerk",
    breite: "0 1 150px",
    hilfe: (
      <>
        Welches Handwerk der Betrieb nach eigenen Angaben ausübt — gelesen aus Firmenname,
        Menü und Impressum. Mehrere sind bei Komplettanbietern normal: Zwei Drittel tragen
        mindestens eines, 40 von 3.117 vier oder mehr. Fehlt die Angabe, sagt die Website es
        nirgends.
      </>
    ),
  },
  { text: "Merkmale", breite: "0 0 210px" },
  {
    text: "belegt",
    breite: "0 0 62px",
    sort: "belegt",
    hilfe: (
      <>
        Wie viele dieser acht Vertrauensmerkmale wir mit einer Fundstelle belegen können:{" "}
        {MERKMALE.map((m) => m.text).join(", ")}.
        <br />
        <br />
        Das misst unseren Datenstand, nicht den Betrieb — wer seinen Meistertitel nicht auf
        die Website schreibt, steht hier niedriger als einer, der es tut. Aufgeklappt steht,
        welche belegt sind.
      </>
    ),
  },
  {
    text: "Kontakt",
    breite: "0 0 92px",
    hilfe: (
      <>
        Erreichbar heißt: E-Mail, Telefon oder Kontaktformular. Ein Formular ist ein Weg,
        aber kein Postfach — aufgeklappt steht, welcher es ist.
      </>
    ),
  },
  { text: "Stand", breite: "0 0 84px" },
];

/** Pfeil an der aktiven Sortierspalte — Muster aus der Rangliste des Atlas. */
function SortPfeil({ an, auf }: { an: boolean; auf: boolean }) {
  return (
    <span
      aria-hidden={!an}
      style={{ fontSize: 8, lineHeight: 1, marginLeft: 3, visibility: an ? "visible" : "hidden" }}
    >
      {auf ? "▲" : "▼"}
    </span>
  );
}

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
  const [gewerk, setGewerk] = useState("");
  const [suche, setSuche] = useState("");
  const [nurKontakt, setNurKontakt] = useState(false);
  const [nurMeister, setNurMeister] = useState(false);
  const [sortSpalte, setSortSpalte] = useState("name");
  const [sortAuf, setSortAuf] = useState(true);

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
    p.set("sort", sortSpalte);
    p.set("auf", sortAuf ? "1" : "0");
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
  }, [bl, stand, art, gewerk, suche, nurKontakt, nurMeister, sortSpalte, sortAuf, seite]);

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

  function sortieren(schluessel: string) {
    setSeite(0);
    if (schluessel === sortSpalte) setSortAuf((x) => !x);
    else {
      setSortSpalte(schluessel);
      setSortAuf(true);
    }
  }

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
      {fehler && <p style={{ color: v("--color-negative"), marginBottom: space.sm }}>{fehler}</p>}

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
        {/* Platzhalter in der Breite des Logo-Kreises, damit die Spalten fluchten. */}
        <span style={{ flex: "0 0 22px" }} aria-hidden />
        {SPALTEN.map((sp) => {
          const aktiv = sp.sort === sortSpalte;
          const inhalt = (
            <>
              {sp.text}
              {sp.sort && <SortPfeil an={aktiv} auf={aktiv && sortAuf} />}
            </>
          );
          return (
            <span
              key={sp.text}
              style={{
                flex: sp.breite,
                minWidth: 0,
                display: "flex",
                alignItems: "center",
                gap: 2,
              }}
            >
              {sp.sort ? (
                <button
                  type="button"
                  onClick={() => sortieren(sp.sort as string)}
                  aria-label={`Nach ${sp.text} sortieren`}
                  style={kopfKnopfStil(aktiv)}
                >
                  {inhalt}
                </button>
              ) : (
                inhalt
              )}
              {sp.hilfe && (
                <InfoTooltip title={sp.text} size={12} exportNote={false}>
                  {sp.hilfe}
                </InfoTooltip>
              )}
            </span>
          );
        })}
      </div>

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
                    ist nur eine von mehreren Konventionen, und wer sie rät, bekommt
                    bei vielen nichts und hält das für „hat kein Logo". Geladen
                    ohne Herkunftsangabe, damit der Abruf dem Betrieb nicht
                    verrät, woher er kommt.

                    Im weißen Kreis, weil viele Logos für hellen Grund gezeichnet
                    sind — auf der dunklen Tagesstufe verschwände ein
                    schwarz-transparentes Icon sonst. Der Kreis steht auch ohne
                    Logo, sonst rutschte die Zeile um zwanzig Pixel und die
                    Spalten flüchteten nicht mehr. */}
                <span
                  style={{
                    flex: "0 0 22px",
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: "#fff",
                    border: `1px solid ${v("--color-border-muted")}`,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                  }}
                >
                  <img
                    src={z.favicon_url ?? `https://${z.domain}/favicon.ico`}
                    alt=""
                    width={14}
                    height={14}
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.style.visibility = "hidden";
                    }}
                    style={{ width: 14, height: 14, objectFit: "contain" }}
                  />
                </span>

                <span
                  style={{
                    ...einzeilig,
                    flex: "1 1 240px",
                    fontWeight: 600,
                    fontSize: v("--font-size-body"),
                  }}
                >
                  {z.firmenname ?? z.domain}
                </span>

                {/* Ort groß, Kreis und Bundesland klein darunter — eine Spalte,
                    zwei Genauigkeiten. */}
                <span style={{ flex: "0 1 200px", minWidth: 0, lineHeight: 1.25 }}>
                  <span style={einzeilig}>{z.plz && z.ort ? `${z.plz} ${z.ort}` : "—"}</span>
                  {z.kreis_name && (
                    <span
                      style={{
                        ...einzeilig,
                        fontSize: v("--font-size-caption"),
                        color: v("--color-text-muted"),
                      }}
                    >
                      {z.kreis_name}
                      {z.bundesland_kurz ? ` · ${z.bundesland_kurz}` : ""}
                    </span>
                  )}
                </span>

                <span style={{ ...einzeilig, flex: "0 1 150px", color: v("--color-text-muted") }}>
                  {(z.gewerke ?? []).map((g) => GEWERK_TEXT[g] ?? g).join(", ") || "—"}
                </span>

                {/* Immer dieselbe Reihenfolge — die aus der Merkmalsliste, nicht
                    die des Fundes. Wechselnde Reihenfolge macht das Überfliegen
                    einer Liste unmöglich: Man sucht dann in jeder Zeile neu. */}
                <span
                  style={{ flex: "0 0 210px", display: "flex", gap: space.xxs, overflow: "hidden" }}
                >
                  {MERKMALE.filter((m) => m.kurz && m.wert(z)).map((m) => (
                    <Marke key={m.name} text={m.kurz!(z)} />
                  ))}
                </span>

                <span
                  style={{
                    flex: "0 0 62px",
                    color: v("--color-text-muted"),
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {merkmale}/{MERKMALE.length}
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
                  {/* Abschnitte durch feine Linien getrennt: Stammdaten,
                      Merkmale, Einordnung, Arbeit. Ohne sie steht alles als ein
                      Block, und man sucht die Grenze zwischen „was wir wissen"
                      und „was wir daraus schließen". */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: space.lg }}>
                    <Feld titel="Adresse">
                      {/* Zusammengesetzt aus dem, was DA ist. Vorher standen die
                          Trennzeichen fest im Text, und bei einem Betrieb ohne
                          Anschrift blieb „· GmbH" stehen — eine Zeile, die
                          aussieht, als fehle ein Stück, statt zu sagen, dass
                          nichts da ist. */}
                      {teileZeile([
                        [z.strasse, z.plz && z.ort ? `${z.plz} ${z.ort}` : null]
                          .filter(Boolean)
                          .join(", ") || null,
                        z.kreis_name ? `${z.kreis_art} ${z.kreis_name}, ${z.bundesland}` : null,
                        z.rechtsform,
                      ])}
                    </Feld>
                    <Feld titel="Kontakt">
                      {teileZeile([z.email, z.telefon, z.kontakt_formular ? "Formular" : null])}
                    </Feld>
                    <Feld titel="Angebot">
                      {teileZeile((z.geschaeftsfelder ?? []).map((f) => FELD_TEXT[f] ?? f))}
                    </Feld>
                  </div>

                  <div style={trennerStil} />
                  <Feld titel={`Merkmale — ${merkmale} von ${MERKMALE.length} belegt`}>
                    {/* Alle acht untereinander, belegte mit Häkchen. So sieht man
                        ohne Umweg, WAS die Acht überhaupt sind — und was bei
                        diesem Betrieb fehlt. Fehlende bekommen KEIN Kreuz: Ein
                        Kreuz läse sich wie ein Mangel des Betriebs, dabei fehlt
                        nur uns die Fundstelle. */}
                    <ul
                      style={{
                        margin: 0,
                        padding: 0,
                        listStyle: "none",
                        columns: 2,
                        columnGap: space.xl,
                      }}
                    >
                      {MERKMALE.map((m) => {
                        const wert = m.wert(z);
                        return (
                          <li
                            key={m.name}
                            style={{
                              display: "flex",
                              gap: space.xs,
                              breakInside: "avoid",
                              color: wert ? v("--color-text-primary") : v("--color-text-faint"),
                            }}
                          >
                            <span
                              aria-hidden
                              style={{
                                flex: "0 0 12px",
                                color: wert ? v("--color-positive") : "transparent",
                              }}
                            >
                              ✓
                            </span>
                            <span>{wert ?? m.text}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </Feld>

                  <div style={trennerStil} />
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

                  <div style={trennerStil} />
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
        <div style={{ display: "flex", gap: space.sm, marginTop: space.lg, alignItems: "center" }}>
          <button
            onClick={() => setSeite((s) => Math.max(0, s - 1))}
            disabled={seite === 0}
            style={blaetterStil}
          >
            zurück
          </button>
          <span style={{ color: v("--color-text-muted"), fontSize: v("--font-size-small") }}>
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

/** Vorhandenes mit „·" verbinden — fehlt alles, steht ein Gedankenstrich. */
function teileZeile(teile: (string | null | undefined)[]): string {
  const da = teile.filter((t): t is string => Boolean(t && t.trim()));
  return da.length ? da.join(" · ") : "—";
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

const trennerStil: React.CSSProperties = {
  borderTop: `1px solid ${v("--color-border-muted")}`,
  margin: `${space.xxs}px 0`,
};

const einzeilig: React.CSSProperties = {
  display: "block",
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

function kopfKnopfStil(aktiv: boolean): React.CSSProperties {
  return {
    background: "none",
    border: "none",
    padding: 0,
    margin: 0,
    font: "inherit",
    letterSpacing: "inherit",
    textTransform: "inherit",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    color: aktiv ? v("--color-accent") : v("--color-text-secondary"),
    fontWeight: 700,
  };
}

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
