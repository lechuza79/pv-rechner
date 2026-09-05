"use client";

import { useCallback, useEffect, useState } from "react";
import { v, space, pad } from "../../../../lib/theme";
import AdminSeitenkopf from "../../../../components/admin/AdminSeitenkopf";
import { BUNDESLAENDER } from "../../../../lib/mastr-regions";
import { OUTREACH_STATUS, OUTREACH_STATUS_LABEL } from "../../../../lib/outreach-status";
import {
  UTILITY_TYP_LABEL,
  ZUORDNUNG_QUELLE_LABEL,
  ZUORDNUNG_ROLLE_LABEL,
  type Kennzahl,
  type UtilityTyp,
  type ZuordnungQuelle,
  type ZuordnungRolle,
} from "../../../../lib/utilities";
import Modal from "../../../../components/Modal";
import TendTag from "../../../../components/atlas/TendTag";
import VersorgerGebietKarte from "../../../../components/admin/VersorgerGebietKarte";
import SelectField from "../../../../components/SelectField";

// Cockpit für Stadtwerke / Energieversorger.
//
// Tabelle statt Karten: Bei rund 900 Versorgern ist Vergleichen die Hauptarbeit,
// und dafür müssen gleiche Zahlen untereinander stehen. Die Details liegen in
// einer aufklappbaren Zeile darunter — sichtbar wird nur, was man gerade braucht.
//
// Hervorhebungen zeigen NIE eine Zahl allein als „gut", sondern immer ihren
// Bezug (Median der erfassten Versorger). Eine grüne Zahl ohne Vergleichsgröße
// wäre eine Behauptung.

// ─── Typen (Spiegel der API-Antwort) ──────────────────────────────────────────

type Werte = {
  erzeugung: string;
  solar: string;
  dachPrivat: string;
  dachGewerbe: string;
  freiflaeche: string;
  wind: string;
  biomasse: string;
  wasser: string;
  speicher: string;
  zubau: string;
  dachProKopf: string | null;
};

type Versorger = {
  id: string;
  atlasUrl: string | null;
  highlights: { dachProKopf: Kennzahl; buergerAnteil: Kennzahl; zubauAnteil: Kennzahl };
  name: string;
  typ: UtilityTyp;
  typLabel: string;
  website: string | null;
  kontaktEmail: string | null;
  kontaktseiteUrl: string | null;
  sitzGemeindeId: string | null;
  status: string;
  notiz: string | null;
  bundeslandAgs: string | null;
  gemeindeCount: number;
  einwohner: number;
  quellen: Record<ZuordnungQuelle, number>;
  ueberlappend: number;
  ohneDaten: number;
  mehrereBundeslaender: boolean;
  hinweis: string;
  werte: Werte;
  aufhaenger: string;
  aufhaengerHinweis: string;
  mix: { art: string; anzeige: string; anteil: number; prozent: string }[];
  telefon: string | null;
  ort: string | null;
  impressumUrl: string | null;
  verbundDomain: string | null;
  profilGeprueft: boolean;
  kontakt: { adresse: string | null; art: string; brauchbar: boolean };
  verantwortlich: { zeile: string; funktion: string | null; operativ: boolean } | null;
  themen: { thema: string; url: string; begriff: string; label: string }[];
  pruefungAmpel: string | null;
  pruefung: { test: string; ergebnis: string; text: string }[];
};

type Zuordnung = {
  regionId: string;
  name: string;
  rolle: ZuordnungRolle;
  quelle: ZuordnungQuelle;
  einwohner: number | null;
  hatDaten: boolean;
  solar: string | null;
  website: string | null;
  kontaktUrl: string | null;
  atlasUrl: string | null;
};

type Platzierung = {
  kategorie: string;
  rang: number;
  gesamt: number;
  ebene: string;
  groessenklasse: string | null;
  belastbar: boolean;
};

type ErfassungsZeile = {
  regionId: string;
  name: string;
  einwohner: number;
  bundesland: string;
  website: string | null;
  kontaktUrl: string | null;
  versorger: { id: string; name: string }[];
};

/** Farben der Erzeugerarten — dieselbe Semantik wie in den Energie-Charts:
 *  Grün-Töne für Erneuerbare, nach Technologie unterschieden. */
const ERZEUGER_FARBE: Record<string, string> = {
  Solar: v("--color-energy-solar"),
  Wind: v("--color-energy-wind"),
  Biomasse: v("--color-energy-biomass"),
  Wasser: v("--color-energy-hydro"),
};

// ─── Cockpit ──────────────────────────────────────────────────────────────────

export default function VersorgerCockpit() {
  const [tab, setTab] = useState<"liste" | "erfassung">("liste");
  const [bl, setBl] = useState("");
  const [typ, setTyp] = useState("");
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [nurGebiet, setNurGebiet] = useState(true);
  const [ampel, setAmpel] = useState("");
  const [sort, setSort] = useState("gemeinden");
  const [page, setPage] = useState(0);

  const [rows, setRows] = useState<Versorger[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [erfasstGesamt, setErfasstGesamt] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [neuOffen, setNeuOffen] = useState(false);
  const [neuSitz, setNeuSitz] = useState<{ regionId: string; name: string } | null>(null);

  const [qDebounced, setQDebounced] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q), 350);
    return () => clearTimeout(t);
  }, [q]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (bl) params.set("bl", bl);
    if (typ) params.set("typ", typ);
    if (status) params.set("status", status);
    if (qDebounced) params.set("q", qDebounced);
    if (nurGebiet) params.set("gebiet", "1");
    if (ampel) params.set("ampel", ampel);
    params.set("sort", sort);
    params.set("page", String(page));
    try {
      const res = await fetch(`/api/admin/utilities?${params.toString()}`);
      if (!res.ok) throw new Error((await res.json()).error ?? `HTTP ${res.status}`);
      const json = await res.json();
      setRows(json.rows);
      setTotal(json.total);
      setPageSize(json.pageSize);
      setErfasstGesamt(json.erfasstGesamt);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [bl, typ, status, qDebounced, nurGebiet, ampel, sort, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(0);
  }, [bl, typ, status, qDebounced, nurGebiet, ampel, sort]);

  const maxPage = Math.max(0, Math.ceil(total / pageSize) - 1);

  return (
    <div style={{ fontFamily: v("--font-text"), color: v("--color-text-primary") }}>
      <AdminSeitenkopf
        titel="Stadtwerke &amp; Energieversorger"
        hilfe={
          <>
            Die Netzgebiete sind aus den amtlichen Anlagendaten abgeleitet: Jede Anlage hängt an einem
            Netzanschlusspunkt, und der nennt seinen Netzbetreiber. Das ist eine Auszählung mit Beleg —
            aber es ist das <strong>Netz</strong>gebiet, nicht der Vertrieb. Strom verkaufen viele auch
            außerhalb davon, und das steht in keinem Register.
          </>
        }
      />

      <div style={{ display: "flex", gap: space.xs, marginBottom: space.md, alignItems: "center" }}>
        <Tab active={tab === "liste"} label={`Versorger (${erfasstGesamt})`} onClick={() => setTab("liste")} />
        <Tab active={tab === "erfassung"} label="Nacharbeit" onClick={() => setTab("erfassung")} />
      </div>

      {tab === "liste" ? (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: space.sm, alignItems: "center", marginBottom: space.md }}>
            <SelectField value={bl} onChange={(e) => setBl(e.target.value)} ariaLabel="Bundesland" size="sm">
              <option value="">Alle Bundesländer</option>
              {BUNDESLAENDER.map((b) => (
                <option key={b.ags} value={b.ags}>
                  {b.name}
                </option>
              ))}
            </SelectField>
            <SelectField value={typ} onChange={(e) => setTyp(e.target.value)} ariaLabel="Typ" size="sm">
              <option value="">Alle Typen</option>
              {(Object.keys(UTILITY_TYP_LABEL) as UtilityTyp[]).map((t) => (
                <option key={t} value={t}>
                  {UTILITY_TYP_LABEL[t]}
                </option>
              ))}
            </SelectField>
            <SelectField value={status} onChange={(e) => setStatus(e.target.value)} ariaLabel="Status" size="sm">
              <option value="">Alle Status</option>
              {OUTREACH_STATUS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </SelectField>
            <SelectField value={ampel} onChange={(e) => setAmpel(e.target.value)} ariaLabel="Gebiets-Prüfung" size="sm">
              <option value="">Prüfung: alle</option>
              <option value="gruen">bestätigt</option>
              <option value="gelb">teilweise prüfbar</option>
              <option value="rot">widersprüchlich</option>
            </SelectField>
            <SelectField value={sort} onChange={(e) => setSort(e.target.value)} ariaLabel="Sortierung" size="sm">
              <option value="gemeinden">Größtes Gebiet zuerst</option>
              <option value="einwohner">Meiste Einwohner zuerst</option>
              <option value="erzeugung">Meiste Erzeugung zuerst</option>
              <option value="name">Name</option>
            </SelectField>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Versorger suchen…"
              style={inputStyle}
              aria-label="Versorger suchen"
            />
            <label style={{ display: "flex", alignItems: "center", gap: space.xs, fontSize: v("--font-size-small"), cursor: "pointer" }}>
              <input type="checkbox" checked={nurGebiet} onChange={(e) => setNurGebiet(e.target.checked)} />
              nur mit Gebiet
            </label>
          </div>

          <div style={{ fontSize: v("--font-size-small"), color: v("--color-text-muted"), marginBottom: space.sm }}>
            {loading ? "Lädt…" : `${total.toLocaleString("de-DE")} Versorger`}
            {error && <span style={{ color: v("--color-negative"), marginLeft: space.sm }}>Fehler: {error}</span>}
          </div>

          <div style={{ overflowX: "auto", border: `1px solid ${v("--color-border")}`, borderRadius: v("--radius-md") }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: v("--font-size-small"), minWidth: 900 }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, width: 26 }} aria-label="Aufklappen" />
                  <th style={thStyle}>Versorger</th>
                  <th style={thStyle}>Prüfung</th>
                  <th style={thStyle}>Gemeinden</th>
                  <th style={thStyle}>Einwohner</th>
                  <th style={thStyle}>Erzeugung</th>
                  <th style={thStyle}>Dach je Ew.</th>
                  <th style={thStyle}>Bürger-Anteil</th>
                  <th style={thStyle}>Zubau</th>
                  <th style={thStyle}>Themen</th>
                  <th style={thStyle}>Kontakt</th>
                  <th style={thStyle}>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => (
                  <VersorgerZeile key={u.id} u={u} onChanged={load} />
                ))}
                {!loading && rows.length === 0 && (
                  <tr>
                    <td colSpan={12} style={{ ...tdStyle, textAlign: "center", color: v("--color-text-muted"), padding: space.xl }}>
                      Kein Versorger für diesen Filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {total > pageSize && (
            <div style={{ display: "flex", alignItems: "center", gap: space.md, marginTop: space.md, fontSize: v("--font-size-small") }}>
              <button style={secondaryBtn} disabled={page <= 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                ← Zurück
              </button>
              <span style={{ color: v("--color-text-muted") }}>
                Seite {page + 1} / {maxPage + 1}
              </span>
              <button style={secondaryBtn} disabled={page >= maxPage} onClick={() => setPage((p) => Math.min(maxPage, p + 1))}>
                Weiter →
              </button>
            </div>
          )}
        </>
      ) : (
        <Erfassung
          onAnlegen={(regionId, name) => {
            setNeuSitz({ regionId, name });
            setNeuOffen(true);
          }}
        />
      )}

      <NeuModal
        open={neuOffen}
        sitz={neuSitz}
        onClose={() => setNeuOffen(false)}
        onSaved={() => {
          setNeuOffen(false);
          setTab("liste");
          load();
        }}
      />
    </div>
  );
}

// ─── Tabellenzeile mit aufklappbarem Detail ───────────────────────────────────

function VersorgerZeile({ u, onChanged }: { u: Versorger; onChanged: () => void }) {
  const [offen, setOffen] = useState(false);
  const [busy, setBusy] = useState(false);

  const patch = useCallback(
    async (body: Record<string, string>) => {
      setBusy(true);
      try {
        await fetch("/api/admin/utilities", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: u.id, ...body }),
        });
        onChanged();
      } finally {
        setBusy(false);
      }
    },
    [u.id, onChanged],
  );

  const statusMeta = OUTREACH_STATUS.find((s) => s.key === u.status) ?? OUTREACH_STATUS[0];
  const land = u.bundeslandAgs ? BUNDESLAENDER.find((b) => b.ags === u.bundeslandAgs)?.short : null;

  return (
    <>
      <tr style={{ borderTop: `1px solid ${v("--color-border")}`, opacity: busy ? 0.6 : 1, background: offen ? v("--color-bg-muted") : undefined }}>
        <td style={{ ...tdStyle, textAlign: "center" }}>
          <button
            onClick={() => setOffen((o) => !o)}
            style={{ ...miniBtn, width: 22, padding: 0 }}
            aria-expanded={offen}
            aria-label={`${u.name} ${offen ? "zuklappen" : "aufklappen"}`}
          >
            {offen ? "−" : "+"}
          </button>
        </td>
        <td style={tdStyle}>
          <div style={{ fontWeight: 700 }}>{u.name}</div>
          <div style={{ fontSize: v("--font-size-caption"), color: v("--color-text-muted") }}>
            {u.typLabel}
            {land && ` · ${land}`}
            {u.mehrereBundeslaender && " · länderübergreifend"}
          </div>
        </td>
        <td style={tdStyle}>
          <span style={ampelBadge(u.pruefungAmpel)} title={u.pruefung.map((b) => b.text).join(" ")}>
            {AMPEL_LABEL[u.pruefungAmpel ?? ""] ?? "ungeprüft"}
          </span>
        </td>
        <td style={{ ...tdStyle, fontFamily: v("--font-mono") }}>{u.gemeindeCount.toLocaleString("de-DE")}</td>
        <td style={{ ...tdStyle, fontFamily: v("--font-mono") }}>{u.einwohner.toLocaleString("de-DE")}</td>
        <td style={{ ...tdStyle, fontFamily: v("--font-mono") }}>{u.werte.erzeugung}</td>
        <KennzahlZelle k={u.highlights.dachProKopf} />
        <KennzahlZelle k={u.highlights.buergerAnteil} />
        <KennzahlZelle k={u.highlights.zubauAnteil} />
        <td style={tdStyle}>
          {u.themen.length === 0 ? (
            <span style={{ color: v("--color-text-muted"), fontSize: v("--font-size-caption") }}>{u.profilGeprueft ? "—" : "ungeprüft"}</span>
          ) : (
            <span style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
              {u.themen.slice(0, 3).map((t) => (
                <a
                  key={t.thema}
                  href={t.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={themaChip(t.thema)}
                  title={`Fundstelle: „${t.begriff}"`}
                >
                  {t.label}
                </a>
              ))}
            </span>
          )}
        </td>
        <td style={tdStyle}>
          {u.kontakt.brauchbar && u.kontakt.adresse ? (
            <a href={`mailto:${u.kontakt.adresse}`} style={linkStyle} title={u.kontakt.art}>
              {u.kontakt.adresse}
            </a>
          ) : (
            <span style={{ color: v("--color-text-muted"), fontSize: v("--font-size-caption") }} title={u.kontakt.art}>
              {u.kontakt.adresse ? "nur Fachpostfach" : "keine"}
            </span>
          )}
        </td>
        <td style={tdStyle}>
          <SelectField
            value={u.status}
            onChange={(e) => patch({ status: e.target.value })}
            ariaLabel={`Status ${u.name}`}
            size="sm"
            ampel={{ text: v(statusMeta.color), hintergrund: v(statusMeta.bg) }}
          >
            {OUTREACH_STATUS.map((s) => (
              <option key={s.key} value={s.key}>
                {OUTREACH_STATUS_LABEL[s.key]}
              </option>
            ))}
          </SelectField>
        </td>
      </tr>
      {offen && (
        <tr style={{ background: v("--color-bg-muted") }}>
          <td colSpan={12} style={{ padding: pad("md", "lg"), borderTop: `1px solid ${v("--color-border")}` }}>
            <Detail u={u} onChanged={onChanged} onPatch={patch} />
          </td>
        </tr>
      )}
    </>
  );
}

/** Eine Kennzahl mit ihrer Einordnung.
 *
 *  Die Tendenz zeigt der BESTEHENDE Badge des Solar-Atlas (`TendTag`) — dort ist
 *  bereits entschieden, wie eine Abweichung aussieht: Vorzeichen statt Pfeil
 *  (der Knick der Pfeil-Icons wirkte unruhig), ein Ton je Richtung, Farben aus
 *  den semantischen Tokens. Ein eigenes Zeichen hier wäre eine zweite Antwort
 *  auf dieselbe Frage gewesen. */
function KennzahlZelle({ k }: { k: Kennzahl }) {
  return (
    <td style={{ ...tdStyle, fontFamily: v("--font-mono") }} title={k.referenz}>
      <div>{k.anzeige}</div>
      {k.abweichung != null && Math.abs(k.abweichung) >= 0.25 && <TendTag dev={k.abweichung} />}
    </td>
  );
}

// ─── Detail ───────────────────────────────────────────────────────────────────

function Detail({
  u,
  onChanged,
  onPatch,
}: {
  u: Versorger;
  onChanged: () => void;
  onPatch: (body: Record<string, string>) => Promise<void>;
}) {
  const [gemeinden, setGemeinden] = useState<Zuordnung[]>([]);
  const [platzierungen, setPlatzierungen] = useState<Platzierung[]>([]);
  const [laden, setLaden] = useState(true);
  const [notiz, setNotiz] = useState(u.notiz ?? "");

  const load = useCallback(async () => {
    setLaden(true);
    try {
      const res = await fetch(`/api/admin/utilities?id=${u.id}`);
      if (res.ok) {
        const json = await res.json();
        setGemeinden(json.gemeinden);
        setPlatzierungen(json.platzierungen);
      }
    } finally {
      setLaden(false);
    }
  }, [u.id]);

  useEffect(() => {
    load();
  }, [load]);

  const entfernen = async (regionId: string) => {
    await fetch(`/api/admin/utilities/zuordnung?utility_id=${u.id}&commune_id=${regionId}`, { method: "DELETE" });
    await load();
    onChanged();
  };

  return (
    <div style={{ display: "grid", gap: space.md, fontSize: v("--font-size-small") }}>
      <div style={{ padding: pad("sm", "md"), background: v("--color-bg"), borderRadius: v("--radius-sm"), border: `1px solid ${v("--color-border")}` }}>
        <div style={{ fontWeight: 700 }}>{u.aufhaenger}</div>
        <div style={{ fontSize: v("--font-size-caption"), color: v("--color-text-muted"), marginTop: 4 }}>{u.aufhaengerHinweis}</div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: space.md, alignItems: "center" }}>
        {u.atlasUrl && (
          <a href={u.atlasUrl} target="_blank" rel="noopener noreferrer" style={linkStyle}>
            Unsere Gemeindeseite ↗
          </a>
        )}
        {u.website ? (
          <a href={u.website} target="_blank" rel="noopener noreferrer" style={linkStyle}>
            {u.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")} ↗
          </a>
        ) : (
          <span style={{ fontSize: v("--font-size-small"), color: v("--color-text-muted") }}>keine Website hinterlegt</span>
        )}
        {u.kontaktEmail && (
          <a href={`mailto:${u.kontaktEmail}`} style={linkStyle}>
            {u.kontaktEmail}
          </a>
        )}
        <input
          value={notiz}
          onChange={(e) => setNotiz(e.target.value)}
          onBlur={() => notiz !== (u.notiz ?? "") && onPatch({ notiz })}
          placeholder="Notiz…"
          style={{ ...inputStyle, flex: 1, minWidth: 200 }}
          aria-label={`Notiz ${u.name}`}
        />
      </div>

      <Abschnitt titel="Kontakt und Themen">
        <div style={{ display: "grid", gap: 3, fontSize: v("--font-size-small") }}>
          {u.kontakt.adresse && u.kontakt.brauchbar ? (
            <div>
              <a href={`mailto:${u.kontakt.adresse}`} style={linkStyle}>
                {u.kontakt.adresse}
              </a>{" "}
              <span style={{ color: v("--color-text-muted") }}>— {u.kontakt.art}</span>
            </div>
          ) : (
            <div style={{ color: v("--color-negative") }}>
              {u.kontakt.adresse ? (
                <>
                  <span style={{ textDecoration: "line-through" }}>{u.kontakt.adresse}</span> — {u.kontakt.art}
                </>
              ) : (
                u.kontakt.art
              )}
            </div>
          )}
          {u.telefon && <div style={{ color: v("--color-text-secondary") }}>{u.telefon}</div>}
          {u.verantwortlich && (
            <div>
              <strong>{u.verantwortlich.funktion ?? "Verantwortlich"}</strong>{" "}
              <span style={{ color: v("--color-text-muted") }}>
                {u.verantwortlich.operativ ? "(operative Stelle)" : "(gesetzliche Vertretung — sagt nicht, wer die Website pflegt)"}
              </span>
              <div style={{ color: v("--color-text-muted"), fontSize: v("--font-size-caption") }}>{u.verantwortlich.zeile}</div>
            </div>
          )}
          {u.verbundDomain && (
            <div style={{ color: v("--color-text-muted") }}>
              Adresse auf fremder Domain: <strong>{u.verbundDomain}</strong> — Hinweis auf Konzernmutter oder
              Dienstleister.
            </div>
          )}
          {u.impressumUrl && (
            <div>
              <a href={u.impressumUrl} target="_blank" rel="noopener noreferrer" style={linkStyle}>
                Impressum ansehen ↗
              </a>
            </div>
          )}
          {u.themen.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
              {u.themen.map((t) => (
                <a key={t.thema} href={t.url} target="_blank" rel="noopener noreferrer" style={themaChip(t.thema)}>
                  {t.label}
                </a>
              ))}
            </div>
          )}
          {u.themen.some((t) => t.thema === "foerderung") && (
            <div style={{ fontSize: v("--font-size-caption"), color: v("--color-text-muted"), lineHeight: 1.5 }}>
              Der Förder-Chip heißt nur: Auf dieser Website steht irgendwo etwas von Förderung. Ob es ein
              Programm gibt, wie hoch es ist und ob es noch läuft, entscheidet die Prüfung an der Quelle.
            </div>
          )}
        </div>
      </Abschnitt>

      <Abschnitt titel="Zusammensetzung der Erzeugungsleistung">
        {u.mix.length === 0 ? (
          <p style={{ color: v("--color-text-muted") }}>Keine Erzeugungsanlagen im Gebiet erfasst.</p>
        ) : (
          <>
            <div style={{ display: "flex", height: 10, borderRadius: 999, overflow: "hidden", border: `1px solid ${v("--color-border")}` }}>
              {u.mix.map((t) => (
                <div
                  key={t.art}
                  style={{ width: `${t.anteil * 100}%`, background: ERZEUGER_FARBE[t.art] ?? v("--color-text-muted") }}
                  title={`${t.art}: ${t.anzeige} (${t.prozent})`}
                />
              ))}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: space.md, marginTop: space.xs, fontSize: v("--font-size-small") }}>
              {u.mix.map((t) => (
                <span key={t.art} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 2, background: ERZEUGER_FARBE[t.art] ?? v("--color-text-muted") }} />
                  {t.art} <strong style={{ fontFamily: v("--font-mono") }}>{t.prozent}</strong>
                  <span style={{ color: v("--color-text-muted") }}>({t.anzeige})</span>
                </span>
              ))}
            </div>
            <p style={{ fontSize: v("--font-size-caption"), color: v("--color-text-muted"), marginTop: 4, lineHeight: 1.5 }}>
              Anteil an der installierten Leistung im Gebiet — nicht am Strommix. Gezählt wird, was
              erneuerbar erzeugt; konventionelle Anlagen wertet unsere Auswertung nicht aus.
            </p>
          </>
        )}
      </Abschnitt>

      <Abschnitt titel="Kennzahlen im Gebiet">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: space.sm }}>
          <Kachel label="Erzeugung gesamt" wert={u.werte.erzeugung} />
          <Kachel label="Solar gesamt" wert={u.werte.solar} />
          <Kachel label="Dach privat" wert={u.werte.dachPrivat} />
          <Kachel label="Dach gewerblich" wert={u.werte.dachGewerbe} />
          <Kachel label="Freifläche" wert={u.werte.freiflaeche} />
          <Kachel label="Wind" wert={u.werte.wind} />
          <Kachel label="Biomasse" wert={u.werte.biomasse} />
          <Kachel label="Wasser" wert={u.werte.wasser} />
          <Kachel label="Speicher" wert={u.werte.speicher} />
          <Kachel label="Zubau letztes Jahr" wert={u.werte.zubau} />
        </div>
        <div style={{ display: "grid", gap: 2, marginTop: space.sm, fontSize: v("--font-size-caption"), color: v("--color-text-muted") }}>
          <div>Dach je Einwohner: {u.highlights.dachProKopf.anzeige} — {u.highlights.dachProKopf.referenz}</div>
          <div>Bürger-Anteil: {u.highlights.buergerAnteil.anzeige} — {u.highlights.buergerAnteil.referenz}</div>
          <div>Zubau: {u.highlights.zubauAnteil.anzeige} — {u.highlights.zubauAnteil.referenz}</div>
          <div>
            „Zubau“ ist das letzte vollständige Kalenderjahr — die Anlagendaten kennen nur das
            Inbetriebnahme-Jahr, kein rollierendes 12-Monats-Fenster.
          </div>
        </div>
      </Abschnitt>

      <Abschnitt titel="Platzierungen">
        {platzierungen.length === 0 ? (
          <p style={{ color: v("--color-text-muted") }}>Keine Platzierung im Spitzenfeld.</p>
        ) : (
          <ul style={{ paddingLeft: 18, margin: 0 }}>
            {platzierungen.map((p, i) => (
              <li key={i} style={{ marginBottom: 2 }}>
                {p.kategorie}: Platz {p.rang} von {p.gesamt} ({p.ebene}
                {p.groessenklasse ? `, ${p.groessenklasse}e Versorger` : ""})
                {!p.belastbar && <span style={{ color: v("--color-text-muted") }}> — zu kleines Feld</span>}
              </li>
            ))}
          </ul>
        )}
      </Abschnitt>

      <Abschnitt titel="Prüfung des Gebiets">
        {u.pruefung.length === 0 ? (
          <p style={{ color: v("--color-text-muted") }}>Noch nicht geprüft.</p>
        ) : (
          <ul style={{ paddingLeft: 18, margin: 0, display: "grid", gap: 2 }}>
            {u.pruefung.map((b, i) => (
              <li
                key={i}
                style={{
                  color:
                    b.ergebnis === "auffaellig"
                      ? v("--color-negative")
                      : b.ergebnis === "ok"
                        ? v("--color-text-primary")
                        : v("--color-text-muted"),
                }}
              >
                {b.text}
              </li>
            ))}
          </ul>
        )}
      </Abschnitt>

      <Abschnitt titel="Gebiet auf der Karte">
        {laden ? (
          <p style={{ color: v("--color-text-muted") }}>Lädt…</p>
        ) : (
          <VersorgerGebietKarte gemeindeIds={gemeinden.map((g) => g.regionId)} name={u.name} />
        )}
      </Abschnitt>

      <Abschnitt titel={`Zugeordnete Gemeinden (${gemeinden.length})`}>
        {laden && <p style={{ color: v("--color-text-muted") }}>Lädt…</p>}
        <div style={{ display: "grid", gap: 2, maxHeight: 320, overflowY: "auto" }}>
          {gemeinden.map((g) => (
            <div
              key={g.regionId}
              style={{ display: "flex", alignItems: "center", gap: space.sm, fontSize: v("--font-size-small"), padding: "3px 0", borderBottom: `1px solid ${v("--color-border")}` }}
            >
              <span style={{ flex: 1, minWidth: 0 }}>
                <strong>{g.name}</strong>
                {g.einwohner != null && (
                  <span style={{ color: v("--color-text-muted") }}> · {g.einwohner.toLocaleString("de-DE")} Ew.</span>
                )}
                {g.solar && <span style={{ color: v("--color-text-muted") }}> · {g.solar} Solar</span>}
              </span>
              {g.atlasUrl && (
                <a href={g.atlasUrl} target="_blank" rel="noopener noreferrer" style={linkStyle}>
                  Gemeindeseite ↗
                </a>
              )}
              {g.website && (
                <a
                  href={g.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ ...linkStyle, color: v("--color-text-secondary") }}
                >
                  Website ↗
                </a>
              )}
              <span style={{ color: v("--color-text-muted") }}>{ZUORDNUNG_ROLLE_LABEL[g.rolle]}</span>
              <span style={quelleBadge(g.quelle)}>{ZUORDNUNG_QUELLE_LABEL[g.quelle]}</span>
              {!g.hatDaten && <span style={{ color: v("--color-negative") }}>keine Anlagendaten</span>}
              <button style={miniBtn} onClick={() => entfernen(g.regionId)} aria-label={`${g.name} entfernen`}>
                ✕
              </button>
            </div>
          ))}
        </div>
        <GemeindeHinzufuegen
          utilityId={u.id}
          onAdded={() => {
            load();
            onChanged();
          }}
        />
      </Abschnitt>
    </div>
  );
}

function Kachel({ label, wert }: { label: string; wert: string }) {
  return (
    <div>
      <div style={{ fontSize: v("--font-size-micro"), textTransform: "uppercase", letterSpacing: "0.06em", color: v("--color-text-muted") }}>
        {label}
      </div>
      <div style={{ fontFamily: v("--font-mono"), fontWeight: 700, fontSize: v("--font-size-body") }}>{wert}</div>
    </div>
  );
}

function Abschnitt({ titel, children }: { titel: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ ...labelKicker, marginBottom: space.xs }}>{titel}</div>
      {children}
    </div>
  );
}

// ─── Gemeinde zuordnen ────────────────────────────────────────────────────────

function GemeindeHinzufuegen({ utilityId, onAdded }: { utilityId: string; onAdded: () => void }) {
  const [q, setQ] = useState("");
  const [treffer, setTreffer] = useState<{ regionId: string; name: string; bezeichnung: string; einwohner: number }[]>([]);
  const [rolle, setRolle] = useState<ZuordnungRolle>("versorgungsgebiet");
  const [quelle, setQuelle] = useState<ZuordnungQuelle>("recherchiert");

  useEffect(() => {
    if (q.trim().length < 2) {
      setTreffer([]);
      return;
    }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/admin/utilities/zuordnung?q=${encodeURIComponent(q)}`);
      if (res.ok) setTreffer((await res.json()).rows);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const zuordnen = async (regionId: string) => {
    await fetch("/api/admin/utilities/zuordnung", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ utility_id: utilityId, commune_id: regionId, rolle, zuordnung_quelle: quelle }),
    });
    setQ("");
    setTreffer([]);
    onAdded();
  };

  return (
    <div style={{ marginTop: space.sm }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: space.xs }}>
        <SelectField value={rolle} onChange={(e) => setRolle(e.target.value as ZuordnungRolle)} ariaLabel="Rolle" size="sm">
          {(Object.keys(ZUORDNUNG_ROLLE_LABEL) as ZuordnungRolle[]).map((r) => (
            <option key={r} value={r}>
              {ZUORDNUNG_ROLLE_LABEL[r]}
            </option>
          ))}
        </SelectField>
        <SelectField
          value={quelle}
          onChange={(e) => setQuelle(e.target.value as ZuordnungQuelle)}
          ariaLabel="Herkunft der Zuordnung" size="sm">
          {(["verlinkt", "recherchiert", "vermutet"] as ZuordnungQuelle[]).map((qk) => (
            <option key={qk} value={qk}>
              Herkunft: {ZUORDNUNG_QUELLE_LABEL[qk]}
            </option>
          ))}
        </SelectField>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Gemeinde suchen und zuordnen…"
          style={{ ...inputStyle, flex: 1, minWidth: 200 }}
          aria-label="Gemeinde suchen"
        />
      </div>
      {treffer.length > 0 && (
        <div style={{ border: `1px solid ${v("--color-border")}`, borderRadius: v("--radius-sm"), marginTop: 4, maxHeight: 200, overflowY: "auto", background: v("--color-bg") }}>
          {treffer.map((t) => (
            <button
              key={t.regionId}
              onClick={() => zuordnen(t.regionId)}
              style={{
                display: "block", width: "100%", textAlign: "left", border: "none", background: "transparent",
                padding: pad("xs", "sm"), fontSize: v("--font-size-small"), cursor: "pointer", color: v("--color-text-primary"),
                fontFamily: v("--font-text"),
              }}
            >
              <strong>{t.name}</strong>{" "}
              <span style={{ color: v("--color-text-muted") }}>
                {t.bezeichnung} · {t.einwohner?.toLocaleString("de-DE")} Ew.
              </span>
            </button>
          ))}
        </div>
      )}
      <p style={{ fontSize: v("--font-size-caption"), color: v("--color-text-muted"), marginTop: 4, lineHeight: 1.5 }}>
        Von Hand ergänzte Zuordnungen überleben den nächsten Registerlauf — überschrieben wird nur, was
        als <em>gemessen</em> markiert ist.
      </p>
    </div>
  );
}

// ─── Erfassung ────────────────────────────────────────────────────────────────

function Erfassung({ onAnlegen }: { onAnlegen: (regionId: string, name: string) => void }) {
  const [rows, setRows] = useState<ErfassungsZeile[]>([]);
  const [limit, setLimit] = useState(50);
  const [nurOffene, setNurOffene] = useState(false);
  const [laden, setLaden] = useState(true);

  useEffect(() => {
    let aktiv = true;
    setLaden(true);
    fetch(`/api/admin/utilities/erfassung?limit=${limit}${nurOffene ? "&offen=1" : ""}`)
      .then((r) => r.json())
      .then((json) => {
        if (aktiv) setRows(json.rows ?? []);
      })
      .finally(() => aktiv && setLaden(false));
    return () => {
      aktiv = false;
    };
  }, [limit, nurOffene]);

  return (
    <div>
      <p style={{ fontSize: v("--font-size-small"), color: v("--color-text-muted"), marginBottom: space.sm, lineHeight: 1.6, maxWidth: 760 }}>
        Die größten Gemeinden zuerst — zum Nacharbeiten dort, wo die Messung nichts gefunden hat oder
        ein zweiter Versorger fehlt.
      </p>
      <div style={{ display: "flex", gap: space.sm, alignItems: "center", marginBottom: space.md }}>
        <SelectField value={limit} onChange={(e) => setLimit(Number(e.target.value))} ariaLabel="Anzahl" size="sm">
          {[50, 100, 200].map((n) => (
            <option key={n} value={n}>
              Top {n}
            </option>
          ))}
        </SelectField>
        <label style={{ display: "flex", alignItems: "center", gap: space.xs, fontSize: v("--font-size-small"), cursor: "pointer" }}>
          <input type="checkbox" checked={nurOffene} onChange={(e) => setNurOffene(e.target.checked)} />
          nur ohne Versorger
        </label>
        {laden && <span style={{ fontSize: v("--font-size-small"), color: v("--color-text-muted") }}>Lädt…</span>}
      </div>

      <div style={{ overflowX: "auto", border: `1px solid ${v("--color-border")}`, borderRadius: v("--radius-md") }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: v("--font-size-small"), minWidth: 640 }}>
          <thead>
            <tr>
              {["Gemeinde", "Einwohner", "Website", "Versorger"].map((h) => (
                <th key={h} style={thStyle}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.regionId} style={{ borderTop: `1px solid ${v("--color-border")}` }}>
                <td style={tdStyle}>
                  <strong>{r.name}</strong>{" "}
                  <span style={{ color: v("--color-text-muted"), fontSize: v("--font-size-caption") }}>{r.bundesland}</span>
                </td>
                <td style={{ ...tdStyle, fontFamily: v("--font-mono") }}>
                  {r.einwohner > 0 ? r.einwohner.toLocaleString("de-DE") : "—"}
                </td>
                <td style={tdStyle}>
                  {r.website ? (
                    <a href={r.website} target="_blank" rel="noopener noreferrer" style={linkStyle}>
                      {r.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")} ↗
                    </a>
                  ) : (
                    <span style={{ color: v("--color-text-muted") }}>—</span>
                  )}
                </td>
                <td style={tdStyle}>
                  {r.versorger.length > 0 ? (
                    <span>{r.versorger.map((u) => u.name).join(", ")}</span>
                  ) : (
                    <button style={miniPrimary} onClick={() => onAnlegen(r.regionId, r.name)}>
                      Versorger anlegen
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Anlegen ──────────────────────────────────────────────────────────────────

function NeuModal({
  open,
  sitz,
  onClose,
  onSaved,
}: {
  open: boolean;
  sitz: { regionId: string; name: string } | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [typ, setTyp] = useState<UtilityTyp>("stadtwerk");
  const [website, setWebsite] = useState("");
  const [email, setEmail] = useState("");
  const [kontaktseite, setKontaktseite] = useState("");
  const [busy, setBusy] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(sitz?.name ? `Stadtwerke ${sitz.name}` : "");
      setTyp("stadtwerk");
      setWebsite("");
      setEmail("");
      setKontaktseite("");
      setFehler(null);
    }
  }, [open, sitz]);

  const speichern = async () => {
    setBusy(true);
    setFehler(null);
    try {
      const res = await fetch("/api/admin/utilities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          typ,
          website,
          kontakt_email: email,
          kontaktseite_url: kontaktseite,
          sitz_gemeinde_id: sitz?.regionId || undefined,
          zuordnung_quelle: "verlinkt",
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? `HTTP ${res.status}`);
      onSaved();
    } catch (e) {
      setFehler((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Versorger anlegen"
      intro={
        sitz?.name
          ? `Sitz: ${sitz.name}. Die Sitzgemeinde wird gleich als Versorgungsgebiet zugeordnet.`
          : "Ohne Sitzgemeinde anlegen — Gemeinden danach im Detail zuordnen."
      }
      maxWidth={480}
    >
      <div style={{ display: "grid", gap: space.sm }}>
        <Feld label="Name">
          <input value={name} onChange={(e) => setName(e.target.value)} style={{ ...inputStyle, width: "100%" }} />
        </Feld>
        <Feld label="Typ">
          <SelectField value={typ} onChange={(e) => setTyp(e.target.value as UtilityTyp)} ariaLabel="Auswahl" size="sm">
            {(Object.keys(UTILITY_TYP_LABEL) as UtilityTyp[]).map((t) => (
              <option key={t} value={t}>
                {UTILITY_TYP_LABEL[t]}
              </option>
            ))}
          </SelectField>
        </Feld>
        <Feld label="Website">
          <input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://…" style={{ ...inputStyle, width: "100%" }} />
        </Feld>
        <Feld label="Kontakt-E-Mail">
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="info@…" style={{ ...inputStyle, width: "100%" }} />
        </Feld>
        <Feld label="Kontaktseite">
          <input value={kontaktseite} onChange={(e) => setKontaktseite(e.target.value)} placeholder="https://…/kontakt" style={{ ...inputStyle, width: "100%" }} />
        </Feld>
        {fehler && <div style={{ color: v("--color-negative"), fontSize: v("--font-size-small") }}>{fehler}</div>}
        <button style={primaryBtn} disabled={busy || !name.trim()} onClick={speichern}>
          {busy ? "Speichert…" : "Anlegen"}
        </button>
      </div>
    </Modal>
  );
}

function Feld({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block" }}>
      <div style={{ ...labelKicker, marginBottom: 4 }}>{label}</div>
      {children}
    </label>
  );
}

function Tab({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        ...secondaryBtn,
        fontWeight: 700,
        color: active ? v("--color-text-on-accent") : v("--color-text-secondary"),
        background: active ? v("--color-accent") : v("--color-bg-muted"),
        borderColor: active ? v("--color-accent") : v("--color-border"),
      }}
    >
      {label}
    </button>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const labelKicker: React.CSSProperties = {
  fontSize: v("--font-size-caption"),
  fontWeight: 700,
  color: v("--color-accent"),
  letterSpacing: "0.1em",
  textTransform: "uppercase",
};

const inputStyle: React.CSSProperties = {
  padding: pad("xs", "sm"),
  fontSize: v("--font-size-small"),
  fontFamily: v("--font-text"),
  color: v("--color-text-primary"),
  background: v("--color-bg-muted"),
  border: `1px solid ${v("--color-border")}`,
  borderRadius: v("--radius-sm"),
};

const secondaryBtn: React.CSSProperties = { ...inputStyle, cursor: "pointer" };

const primaryBtn: React.CSSProperties = {
  ...inputStyle,
  cursor: "pointer",
  fontWeight: 700,
  color: v("--color-text-on-accent"),
  background: v("--color-accent"),
  borderColor: v("--color-accent"),
};

const miniBtn: React.CSSProperties = { ...secondaryBtn, padding: "2px 6px", fontSize: v("--font-size-caption"), lineHeight: 1 };
const miniPrimary: React.CSSProperties = { ...primaryBtn, padding: "4px 8px", fontSize: v("--font-size-small") };

const badge: React.CSSProperties = {
  fontSize: v("--font-size-caption"),
  fontWeight: 700,
  padding: "1px 7px",
  borderRadius: 999,
  background: v("--color-bg"),
  color: v("--color-text-secondary"),
  whiteSpace: "nowrap",
};

/** Herkunft der Zuordnung farblich: „gemessen" ist belegt, „vermutet" muss
 *  auffallen. Die beiden mittleren bleiben neutral. */
function quelleBadge(q: ZuordnungQuelle): React.CSSProperties {
  return {
    ...badge,
    color:
      q === "vermutet"
        ? v("--color-negative")
        : q === "gemessen"
          ? v("--color-positive")
          : q === "verlinkt"
            ? v("--color-accent")
            : v("--color-text-secondary"),
  };
}

/** Themen-Chip. „Förderung" faellt bewusst auf: ein Versorger, der selbst
 *  foerdert, investiert schon in unser Thema — der waermste Einstieg. Der Chip
 *  fuehrt auf die Fundstelle; er behauptet NICHT, dass es ein Programm gibt. */
function themaChip(thema: string): React.CSSProperties {
  const foerder = thema === "foerderung";
  return {
    fontSize: v("--font-size-micro"),
    fontWeight: 700,
    padding: "1px 6px",
    borderRadius: 999,
    textDecoration: "none",
    whiteSpace: "nowrap",
    color: foerder ? v("--color-text-on-accent") : v("--color-text-secondary"),
    background: foerder ? v("--color-accent") : v("--color-bg"),
    border: `1px solid ${foerder ? v("--color-accent") : v("--color-border")}`,
  };
}

const AMPEL_LABEL: Record<string, string> = {
  gruen: "bestätigt",
  gelb: "teilweise",
  rot: "widersprüchlich",
};

/** Ergebnis der systematischen Gebiets-Prüfung. Rot heißt „hier stimmt etwas
 *  nicht" — nicht „diese Zuordnung ist falsch". Der Grund steht im Titel und
 *  ausgeschrieben im Detail. */
function ampelBadge(ampel: string | null): React.CSSProperties {
  const farbe =
    ampel === "gruen" ? v("--color-positive") : ampel === "rot" ? v("--color-negative") : v("--color-text-muted");
  return {
    fontSize: v("--font-size-micro"),
    fontWeight: 700,
    padding: "1px 6px",
    borderRadius: 999,
    whiteSpace: "nowrap",
    color: farbe,
    border: `1px solid ${farbe}`,
    background: `color-mix(in srgb, ${farbe} 10%, transparent)`,
  };
}

const linkStyle: React.CSSProperties = {
  color: v("--color-accent"),
  textDecoration: "none",
  fontSize: v("--font-size-small"),
  fontWeight: 600,
  whiteSpace: "nowrap",
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: pad("xs", "sm"),
  fontSize: v("--font-size-caption"),
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: v("--color-text-muted"),
  background: v("--color-bg-muted"),
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = { padding: pad("xs", "sm"), verticalAlign: "middle" };
