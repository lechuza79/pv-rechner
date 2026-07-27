"use client";

import { useCallback, useEffect, useState } from "react";
import { v, space, pad } from "../../../../lib/theme";
import { BUNDESLAENDER } from "../../../../lib/mastr-regions";
import { OUTREACH_STATUS, OUTREACH_STATUS_LABEL } from "../../../../lib/outreach-status";
import {
  UTILITY_TYP_LABEL,
  ZUORDNUNG_QUELLE_LABEL,
  ZUORDNUNG_ROLLE_LABEL,
  type UtilityTyp,
  type ZuordnungQuelle,
  type ZuordnungRolle,
} from "../../../../lib/utilities";
import Modal from "../../../../components/Modal";

// Cockpit für Stadtwerke / Energieversorger. Aufbau wie das Kommunen-Cockpit:
// filtern, Status pflegen, Notiz. Zusätzlich die Gebiets-Aggregate und der
// Aufhänger — beide immer mit ihrem Näherungs-Hinweis, nie ohne.

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
  vermutetAnteil: number;
  ueberlappend: number;
  ohneDaten: number;
  mehrereBundeslaender: boolean;
  hinweis: string;
  werte: Werte;
  aufhaenger: string;
  aufhaengerHinweis: string;
  aufhaengerKategorie: string | null;
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

// ─── Cockpit ──────────────────────────────────────────────────────────────────

export default function VersorgerCockpit() {
  const [tab, setTab] = useState<"liste" | "erfassung">("liste");
  const [bl, setBl] = useState("");
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");

  const [rows, setRows] = useState<Versorger[]>([]);
  const [erfasstGesamt, setErfasstGesamt] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [neuOffen, setNeuOffen] = useState(false);
  const [neuSitz, setNeuSitz] = useState<{ regionId: string; name: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (bl) params.set("bl", bl);
    if (status) params.set("status", status);
    if (q) params.set("q", q);
    try {
      const res = await fetch(`/api/admin/utilities?${params.toString()}`);
      if (!res.ok) throw new Error((await res.json()).error ?? `HTTP ${res.status}`);
      const json = await res.json();
      setRows(json.rows);
      setErfasstGesamt(json.erfasstGesamt);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [bl, status, q]);

  useEffect(() => {
    load();
  }, [load]);

  const neuMitSitz = (regionId: string, name: string) => {
    setNeuSitz({ regionId, name });
    setNeuOffen(true);
  };

  return (
    <div style={{ fontFamily: v("--font-text"), color: v("--color-text-primary") }}>
      <div style={{ marginBottom: space.lg }}>
        <div style={labelKicker}>Admin</div>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Stadtwerke &amp; Energieversorger</h1>
        <p style={{ fontSize: 13, color: v("--color-text-muted"), lineHeight: 1.6 }}>
          Versorger erfassen, Gemeinden zuordnen, Gebiets-Kennzahlen ansehen. Die Zuordnung der
          Versorgungsgebiete ist eine Näherung — Netzbetreiber, Grundversorger und Vertrieb haben
          verschiedene Gebiete, und öffentlich dokumentiert ist keines davon.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: space.xs, marginBottom: space.md }}>
        <Tab active={tab === "liste"} label={`Versorger (${erfasstGesamt})`} onClick={() => setTab("liste")} />
        <Tab active={tab === "erfassung"} label="Erfassung" onClick={() => setTab("erfassung")} />
        <button style={{ ...primaryBtn, marginLeft: "auto" }} onClick={() => neuMitSitz("", "")}>
          + Versorger anlegen
        </button>
      </div>

      {tab === "liste" ? (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: space.sm, alignItems: "center", marginBottom: space.md }}>
            <select value={bl} onChange={(e) => setBl(e.target.value)} style={selectStyle} aria-label="Bundesland">
              <option value="">Alle Bundesländer</option>
              {BUNDESLAENDER.map((b) => (
                <option key={b.ags} value={b.ags}>
                  {b.name}
                </option>
              ))}
            </select>
            <select value={status} onChange={(e) => setStatus(e.target.value)} style={selectStyle} aria-label="Status">
              <option value="">Alle Status</option>
              {OUTREACH_STATUS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Versorger suchen…"
              style={inputStyle}
              aria-label="Versorger suchen"
            />
          </div>

          <div style={{ fontSize: 12, color: v("--color-text-muted"), marginBottom: space.sm }}>
            {loading ? "Lädt…" : `${rows.length} Versorger`}
            {error && <span style={{ color: v("--color-negative"), marginLeft: space.sm }}>Fehler: {error}</span>}
          </div>

          <div style={{ display: "grid", gap: space.sm }}>
            {rows.map((u) => (
              <VersorgerKarte key={u.id} u={u} onChanged={load} />
            ))}
            {!loading && rows.length === 0 && (
              <div style={{ ...cardStyle, textAlign: "center", color: v("--color-text-muted") }}>
                Noch kein Versorger für diesen Filter. Über „Erfassung“ die größten Gemeinden durchgehen.
              </div>
            )}
          </div>
        </>
      ) : (
        <Erfassung onAnlegen={neuMitSitz} />
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

// ─── Karte je Versorger ───────────────────────────────────────────────────────

function VersorgerKarte({ u, onChanged }: { u: Versorger; onChanged: () => void }) {
  const [offen, setOffen] = useState(false);
  const [notiz, setNotiz] = useState(u.notiz ?? "");
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
  const land = u.bundeslandAgs ? BUNDESLAENDER.find((b) => b.ags === u.bundeslandAgs)?.name : null;

  return (
    <div style={{ ...cardStyle, opacity: busy ? 0.6 : 1 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: space.sm, alignItems: "baseline" }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>{u.name}</div>
        <span style={badge}>{u.typLabel}</span>
        {land && (
          <span style={{ fontSize: 12, color: v("--color-text-muted") }}>
            {land}
            {u.mehrereBundeslaender && " (Gebiet reicht darüber hinaus)"}
          </span>
        )}
        <select
          value={u.status}
          onChange={(e) => patch({ status: e.target.value })}
          style={{
            ...selectStyle,
            marginLeft: "auto",
            fontWeight: 700,
            color: v(statusMeta.color),
            background: v(statusMeta.bg),
          }}
          aria-label={`Status ${u.name}`}
        >
          {OUTREACH_STATUS.map((s) => (
            <option key={s.key} value={s.key}>
              {OUTREACH_STATUS_LABEL[s.key]}
            </option>
          ))}
        </select>
      </div>

      {/* Aufhänger — die Zeile, die später in die Ansprache geht. */}
      <div style={{ marginTop: space.sm, padding: pad("sm", "md"), background: v("--color-bg-muted"), borderRadius: v("--radius-sm") }}>
        <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.5 }}>{u.aufhaenger}</div>
        <div style={{ fontSize: 11, color: v("--color-text-muted"), marginTop: 4, lineHeight: 1.5 }}>
          {u.aufhaengerHinweis}
        </div>
      </div>

      {/* Gebiets-Kennzahlen */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: space.md, marginTop: space.sm, fontSize: 12 }}>
        <Kennzahl label="Erzeugung gesamt" wert={u.werte.erzeugung} />
        <Kennzahl label="davon Solar" wert={u.werte.solar} />
        <Kennzahl label="Speicher" wert={u.werte.speicher} />
        <Kennzahl label="Zubau letztes Jahr" wert={u.werte.zubau} />
        <Kennzahl label="Einwohner im Gebiet" wert={u.einwohner.toLocaleString("de-DE")} />
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: space.sm, alignItems: "center", marginTop: space.sm }}>
        <button style={secondaryBtn} onClick={() => setOffen(true)}>
          {u.gemeindeCount} {u.gemeindeCount === 1 ? "Gemeinde" : "Gemeinden"} · Details
        </button>
        {u.atlasUrl && (
          <a href={u.atlasUrl} target="_blank" rel="noopener noreferrer" style={linkStyle}>
            Unsere Gemeindeseite ↗
          </a>
        )}
        {u.website ? (
          <a href={u.website} target="_blank" rel="noopener noreferrer" style={linkStyle}>
            Website ↗
          </a>
        ) : (
          <span style={{ fontSize: 12, color: v("--color-text-muted") }}>keine Website hinterlegt</span>
        )}
        {u.kontaktseiteUrl && (
          <a href={u.kontaktseiteUrl} target="_blank" rel="noopener noreferrer" style={linkStyle}>
            Kontaktseite ↗
          </a>
        )}
        {u.kontaktEmail && (
          <a href={`mailto:${u.kontaktEmail}`} style={linkStyle}>
            {u.kontaktEmail}
          </a>
        )}
        <input
          value={notiz}
          onChange={(e) => setNotiz(e.target.value)}
          onBlur={() => notiz !== (u.notiz ?? "") && patch({ notiz })}
          placeholder="Notiz…"
          style={{ ...inputStyle, flex: 1, minWidth: 160 }}
          aria-label={`Notiz ${u.name}`}
        />
      </div>

      <DetailModal open={offen} utility={u} onClose={() => setOffen(false)} onChanged={onChanged} />
    </div>
  );
}

function Kennzahl({ label, wert }: { label: string; wert: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", color: v("--color-text-muted") }}>
        {label}
      </div>
      <div style={{ fontFamily: v("--font-mono"), fontWeight: 700, fontSize: 14 }}>{wert}</div>
    </div>
  );
}

// ─── Detail: Gemeinden + Platzierungen ────────────────────────────────────────

function DetailModal({
  open,
  utility,
  onClose,
  onChanged,
}: {
  open: boolean;
  utility: Versorger;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [gemeinden, setGemeinden] = useState<Zuordnung[]>([]);
  const [platzierungen, setPlatzierungen] = useState<Platzierung[]>([]);
  const [laden, setLaden] = useState(false);

  const load = useCallback(async () => {
    setLaden(true);
    try {
      const res = await fetch(`/api/admin/utilities?id=${utility.id}`);
      if (res.ok) {
        const json = await res.json();
        setGemeinden(json.gemeinden);
        setPlatzierungen(json.platzierungen);
      }
    } finally {
      setLaden(false);
    }
  }, [utility.id]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const entfernen = async (regionId: string) => {
    await fetch(`/api/admin/utilities/zuordnung?utility_id=${utility.id}&commune_id=${regionId}`, {
      method: "DELETE",
    });
    await load();
    onChanged();
  };

  return (
    <Modal open={open} onClose={onClose} title={utility.name} maxWidth={640}>
      <div style={{ fontSize: 13, lineHeight: 1.6 }}>
        <div style={{ padding: pad("sm", "md"), background: v("--color-bg-muted"), borderRadius: v("--radius-sm"), marginBottom: space.md }}>
          <strong>{utility.aufhaenger}</strong>
          <div style={{ fontSize: 11, color: v("--color-text-muted"), marginTop: 4 }}>{utility.aufhaengerHinweis}</div>
        </div>

        <Abschnitt titel="Kennzahlen im Gebiet">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: space.sm }}>
            <Kennzahl label="Erzeugung gesamt" wert={utility.werte.erzeugung} />
            <Kennzahl label="Solar gesamt" wert={utility.werte.solar} />
            <Kennzahl label="Dach privat" wert={utility.werte.dachPrivat} />
            <Kennzahl label="Dach gewerblich" wert={utility.werte.dachGewerbe} />
            <Kennzahl label="Freifläche" wert={utility.werte.freiflaeche} />
            <Kennzahl label="Wind" wert={utility.werte.wind} />
            <Kennzahl label="Biomasse" wert={utility.werte.biomasse} />
            <Kennzahl label="Wasser" wert={utility.werte.wasser} />
            <Kennzahl label="Speicher" wert={utility.werte.speicher} />
            <Kennzahl label="Zubau letztes Jahr" wert={utility.werte.zubau} />
            {utility.werte.dachProKopf && <Kennzahl label="Dach privat je Ew." wert={utility.werte.dachProKopf} />}
          </div>
          <p style={{ fontSize: 11, color: v("--color-text-muted"), marginTop: space.sm }}>
            Summe über die zugeordneten Gemeinden. „Zubau“ ist das letzte vollständige Kalenderjahr — die
            amtlichen Anlagendaten kennen nur das Inbetriebnahme-Jahr, kein rollierendes 12-Monats-Fenster.
          </p>
        </Abschnitt>

        <Abschnitt titel="Platzierungen">
          {platzierungen.length === 0 ? (
            <p style={{ color: v("--color-text-muted") }}>
              Noch keine Platzierung im Spitzenfeld — oder zu wenige Versorger erfasst.
            </p>
          ) : (
            <ul style={{ paddingLeft: 18, margin: 0 }}>
              {platzierungen.map((p, i) => (
                <li key={i} style={{ marginBottom: 4 }}>
                  {p.kategorie}: Platz {p.rang} von {p.gesamt} ({p.ebene}
                  {p.groessenklasse ? `, ${p.groessenklasse}e Versorger` : ""})
                  {!p.belastbar && (
                    <span style={{ color: v("--color-text-muted") }}> — zu kleines Feld, nicht als Aufhänger nutzbar</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Abschnitt>

        <Abschnitt titel={`Zugeordnete Gemeinden (${gemeinden.length})`}>
          {laden && <p style={{ color: v("--color-text-muted") }}>Lädt…</p>}
          <div style={{ display: "grid", gap: space.xs }}>
            {gemeinden.map((g) => (
              <div
                key={g.regionId}
                style={{ fontSize: 12, padding: "6px 0", borderBottom: `1px solid ${v("--color-border")}` }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: space.sm }}>
                  <span style={{ fontWeight: 700, flex: 1 }}>
                    {g.name}
                    {g.einwohner != null && (
                      <span style={{ fontWeight: 400, color: v("--color-text-muted") }}>
                        {" "}
                        · {g.einwohner.toLocaleString("de-DE")} Ew.
                      </span>
                    )}
                    {g.solar && <span style={{ fontWeight: 400, color: v("--color-text-muted") }}> · {g.solar} Solar</span>}
                  </span>
                  <span style={{ color: v("--color-text-muted") }}>{ZUORDNUNG_ROLLE_LABEL[g.rolle]}</span>
                  <span style={{ ...quelleBadge(g.quelle) }}>{ZUORDNUNG_QUELLE_LABEL[g.quelle]}</span>
                  <button style={miniBtn} onClick={() => entfernen(g.regionId)} aria-label={`${g.name} entfernen`}>
                    ✕
                  </button>
                </div>
                {/* Zwei Wege nach draußen: die Gemeinde-Website zum Nachsehen,
                    wer dort versorgt — und unsere Atlas-Seite, die man dem
                    Versorger später zeigt. */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: space.sm, marginTop: 2 }}>
                  {g.atlasUrl && (
                    <a href={g.atlasUrl} target="_blank" rel="noopener noreferrer" style={linkStyle}>
                      Unsere Gemeindeseite ↗
                    </a>
                  )}
                  {g.website && (
                    <a href={g.website} target="_blank" rel="noopener noreferrer" style={{ ...linkStyle, color: v("--color-text-secondary") }}>
                      {g.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")} ↗
                    </a>
                  )}
                  {g.kontaktUrl && (
                    <a href={g.kontaktUrl} target="_blank" rel="noopener noreferrer" style={{ ...linkStyle, color: v("--color-text-secondary") }}>
                      Kontaktseite ↗
                    </a>
                  )}
                  {!g.hatDaten && <span style={{ color: v("--color-negative") }}>keine Anlagendaten</span>}
                </div>
              </div>
            ))}
          </div>
          <GemeindeHinzufuegen utilityId={utility.id} onAdded={() => { load(); onChanged(); }} />
        </Abschnitt>
      </div>
    </Modal>
  );
}

function Abschnitt({ titel, children }: { titel: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: space.lg }}>
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
    <div style={{ marginTop: space.md }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: space.xs, marginBottom: space.xs }}>
        <select value={rolle} onChange={(e) => setRolle(e.target.value as ZuordnungRolle)} style={selectStyle} aria-label="Rolle">
          {(Object.keys(ZUORDNUNG_ROLLE_LABEL) as ZuordnungRolle[]).map((r) => (
            <option key={r} value={r}>
              {ZUORDNUNG_ROLLE_LABEL[r]}
            </option>
          ))}
        </select>
        <select value={quelle} onChange={(e) => setQuelle(e.target.value as ZuordnungQuelle)} style={selectStyle} aria-label="Herkunft der Zuordnung">
          {(Object.keys(ZUORDNUNG_QUELLE_LABEL) as ZuordnungQuelle[]).map((qk) => (
            <option key={qk} value={qk}>
              Herkunft: {ZUORDNUNG_QUELLE_LABEL[qk]}
            </option>
          ))}
        </select>
      </div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Gemeinde suchen und zuordnen…"
        style={{ ...inputStyle, width: "100%" }}
        aria-label="Gemeinde suchen"
      />
      {treffer.length > 0 && (
        <div style={{ border: `1px solid ${v("--color-border")}`, borderRadius: v("--radius-sm"), marginTop: 4, maxHeight: 200, overflowY: "auto" }}>
          {treffer.map((t) => (
            <button
              key={t.regionId}
              onClick={() => zuordnen(t.regionId)}
              style={{
                display: "block", width: "100%", textAlign: "left", border: "none", background: "transparent",
                padding: pad("xs", "sm"), fontSize: 12, cursor: "pointer", color: v("--color-text-primary"),
                fontFamily: v("--font-text"),
              }}
            >
              <strong>{t.name}</strong>{" "}
              <span style={{ color: v("--color-text-muted") }}>
                {t.bezeichnung} · {t.einwohner.toLocaleString("de-DE")} Ew.
              </span>
            </button>
          ))}
        </div>
      )}
      <p style={{ fontSize: 11, color: v("--color-text-muted"), marginTop: 4, lineHeight: 1.5 }}>
        „Herkunft“ ehrlich setzen: <em>verlinkt</em> nur, wenn die Zuordnung auf der Gemeinde- oder
        Versorger-Website steht. Sie entscheidet, wie belastbar das Aggregat später ausgewiesen wird.
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
      <p style={{ fontSize: 13, color: v("--color-text-muted"), marginBottom: space.sm, lineHeight: 1.6 }}>
        Die größten Gemeinden zuerst. Das zuständige Stadtwerk steht meist auf der Gemeinde-Website
        verlinkt — von dort Name und Kontakt übernehmen und den Versorger anlegen.
      </p>
      <div style={{ display: "flex", gap: space.sm, alignItems: "center", marginBottom: space.md }}>
        <select value={limit} onChange={(e) => setLimit(Number(e.target.value))} style={selectStyle} aria-label="Anzahl">
          {[50, 100, 200].map((n) => (
            <option key={n} value={n}>
              Top {n}
            </option>
          ))}
        </select>
        <label style={{ display: "flex", alignItems: "center", gap: space.xs, fontSize: 13, cursor: "pointer" }}>
          <input type="checkbox" checked={nurOffene} onChange={(e) => setNurOffene(e.target.checked)} />
          nur ohne Versorger
        </label>
        {laden && <span style={{ fontSize: 12, color: v("--color-text-muted") }}>Lädt…</span>}
      </div>

      <div style={{ overflowX: "auto", border: `1px solid ${v("--color-border")}`, borderRadius: v("--radius-md") }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 640 }}>
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
                  <span style={{ color: v("--color-text-muted"), fontSize: 11 }}>{r.bundesland}</span>
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
          ? `Sitz: ${sitz.name}. Die Sitzgemeinde wird gleich als Versorgungsgebiet zugeordnet; weitere Gemeinden danach im Detail.`
          : "Ohne Sitzgemeinde anlegen — Gemeinden danach im Detail zuordnen."
      }
      maxWidth={480}
    >
      <div style={{ display: "grid", gap: space.sm }}>
        <Feld label="Name">
          <input value={name} onChange={(e) => setName(e.target.value)} style={{ ...inputStyle, width: "100%" }} />
        </Feld>
        <Feld label="Typ">
          <select value={typ} onChange={(e) => setTyp(e.target.value as UtilityTyp)} style={{ ...selectStyle, width: "100%" }}>
            {(Object.keys(UTILITY_TYP_LABEL) as UtilityTyp[]).map((t) => (
              <option key={t} value={t}>
                {UTILITY_TYP_LABEL[t]}
              </option>
            ))}
          </select>
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
        {fehler && <div style={{ color: v("--color-negative"), fontSize: 12 }}>{fehler}</div>}
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

// ─── Bausteine ────────────────────────────────────────────────────────────────

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
  fontSize: 11,
  fontWeight: 700,
  color: v("--color-accent"),
  letterSpacing: "0.1em",
  textTransform: "uppercase",
};

const cardStyle: React.CSSProperties = {
  background: v("--color-bg"),
  border: `1px solid ${v("--color-border")}`,
  borderRadius: v("--radius-md"),
  padding: pad("md", "lg"),
};

const inputStyle: React.CSSProperties = {
  padding: pad("xs", "sm"),
  fontSize: 13,
  fontFamily: v("--font-text"),
  color: v("--color-text-primary"),
  background: v("--color-bg-muted"),
  border: `1px solid ${v("--color-border")}`,
  borderRadius: v("--radius-sm"),
};

const selectStyle: React.CSSProperties = { ...inputStyle, cursor: "pointer" };

const secondaryBtn: React.CSSProperties = {
  ...inputStyle,
  cursor: "pointer",
  background: v("--color-bg-muted"),
};

const primaryBtn: React.CSSProperties = {
  ...inputStyle,
  cursor: "pointer",
  fontWeight: 700,
  color: v("--color-text-on-accent"),
  background: v("--color-accent"),
  borderColor: v("--color-accent"),
};

const miniBtn: React.CSSProperties = {
  ...secondaryBtn,
  padding: "2px 6px",
  fontSize: 11,
  lineHeight: 1,
};

const miniPrimary: React.CSSProperties = { ...primaryBtn, padding: "4px 8px", fontSize: 12 };

const badge: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  padding: "2px 8px",
  borderRadius: 999,
  background: v("--color-bg-muted"),
  color: v("--color-text-secondary"),
};

/** Herkunft der Zuordnung farblich: vermutet muss ins Auge fallen. */
function quelleBadge(q: ZuordnungQuelle): React.CSSProperties {
  return {
    ...badge,
    color: q === "vermutet" ? v("--color-negative") : q === "verlinkt" ? v("--color-positive") : v("--color-text-secondary"),
  };
}

const linkStyle: React.CSSProperties = {
  color: v("--color-accent"),
  textDecoration: "none",
  fontSize: 12,
  fontWeight: 600,
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: pad("xs", "sm"),
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: v("--color-text-muted"),
  background: v("--color-bg-muted"),
};

const tdStyle: React.CSSProperties = { padding: pad("xs", "sm"), verticalAlign: "top" };
