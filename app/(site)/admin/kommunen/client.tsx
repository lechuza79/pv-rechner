"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { v, space, pad } from "../../../../lib/theme";
import { BUNDESLAENDER } from "../../../../lib/mastr-regions";
import { OUTREACH_STATUS, OUTREACH_STATUS_LABEL } from "../../../../lib/outreach-status";
import Modal from "../../../../components/Modal";
import ResultSection from "../../../../components/ResultSection";
import { ART_LABEL, liesNotiz } from "../../../../lib/outreach-ruecklauf";
import {
  ASK_LABEL,
  ASK_VARIANTEN,
  VARIANTE_ERKLAERUNG,
  VERTEILUNG_HINWEIS,
  type AskVariante,
  type VariantenVerteilung,
} from "../../../../lib/kommunen-ask";
import { SCHUEBE } from "../../../../lib/kommunen-testballon";

// ─── Typen ──────────────────────────────────────────────────────────────────

type Region = { name: string; bezeichnung: string | null; population: number | null };

type Lead = {
  region_id: string;
  website: string | null;
  email: string | null;
  kontakt_url: string | null;
  outreach_status: string;
  channel: string | null;
  contacted_at: string | null;
  responded_at: string | null;
  notes: string | null;
  draft_subject: string | null;
  draft_body: string | null;
  draft_generated_at: string | null;
  draft_manuell: boolean | null;
  gruene_pct: number | null;
  linke_pct: number | null;
  spd_pct: number | null;
  kampagne: string | null;
  charge: number | null;
  rollen_email: string | null;
  verantwortlich_funktion: string | null;
  verantwortlich_operativ: boolean | null;
  verwaltung_domain: string | null;
  thema_solar_url: string | null;
  thema_klima_url: string | null;
  thema_blatt_url: string | null;
  ask_variante: AskVariante | null;
  variante_manuell: boolean | null;
  versendet_variante: AskVariante | null;
  widget_anfrage: boolean | null;
  ref_token: string | null;
  ref_klicks: number | null;
  atlas_path: string | null;
  mastr_regions: Region | Region[];
};

function region(l: Lead): Region {
  return Array.isArray(l.mastr_regions) ? l.mastr_regions[0] : l.mastr_regions;
}

// ─── Status-Katalog ───────────────────────────────────────────────────────────
// Geteilt mit dem Versorger-Cockpit (lib/outreach-status.ts) — eine Quelle.

const STATUS = OUTREACH_STATUS;
const STATUS_LABEL = OUTREACH_STATUS_LABEL;

// ─── Cockpit ──────────────────────────────────────────────────────────────────

export default function KommunenCockpit() {
  const [bl, setBl] = useState("");
  const [status, setStatus] = useState("");
  const [hasLink, setHasLink] = useState(false);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("");
  const [charge, setCharge] = useState("");
  const [kampagne, setKampagne] = useState("");
  const [page, setPage] = useState(0);

  const [rows, setRows] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Suche entprellen, damit nicht jeder Tastendruck eine Abfrage auslöst.
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
    if (status) params.set("status", status);
    if (hasLink) params.set("hasLink", "1");
    if (qDebounced) params.set("q", qDebounced);
    if (sort) params.set("sort", sort);
    if (kampagne) params.set("kampagne", kampagne);
    if (kampagne && charge) params.set("charge", charge);
    params.set("page", String(page));
    try {
      const res = await fetch(`/api/admin/kommunen?${params.toString()}`);
      if (!res.ok) throw new Error((await res.json()).error ?? `HTTP ${res.status}`);
      const json = await res.json();
      setRows(json.rows);
      setTotal(json.total);
      setPageSize(json.pageSize);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [bl, status, hasLink, qDebounced, sort, kampagne, charge, page]);

  useEffect(() => {
    load();
  }, [load]);

  // Filterwechsel → zurück auf Seite 1.
  useEffect(() => {
    setPage(0);
  }, [bl, status, hasLink, qDebounced, sort, kampagne, charge]);

  const patchLead = useCallback((updated: Lead) => {
    setRows((prev) => prev.map((r) => (r.region_id === updated.region_id ? updated : r)));
  }, []);

  const maxPage = Math.max(0, Math.ceil(total / pageSize) - 1);

  const [verteilung, setVerteilung] = useState<VariantenVerteilung[] | null>(null);
  const [offen, setOffen] = useState<{ nochNichtVersendet: number } | null>(null);
  useEffect(() => {
    fetch("/api/admin/kommunen/bilanz")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j) {
          setVerteilung(j.verteilung);
          setOffen(j.offen);
        }
      })
      .catch(() => undefined);
  }, [rows]);

  return (
    <div style={{ fontFamily: v("--font-text"), color: v("--color-text-primary") }}>
      <div style={{ marginBottom: space.lg }}>
        <div style={labelKicker}>Admin</div>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Kommunen-Outreach</h1>
        <p style={{ fontSize: 13, color: v("--color-text-muted") }}>
          Kontaktdaten der ~11.000 Gemeinden. Filtern, Status pflegen, Kontaktseite öffnen.
        </p>
        <p style={{ fontSize: 13, color: v("--color-text-muted"), marginTop: 4, maxWidth: 720, lineHeight: 1.5 }}>
          {/* Der Text steht in lib/kommunen-ask.ts. Er sagt, wie die Variante
              ZUSTANDE KOMMT, und das ist eine Aussage über das Verfahren — an
              der Oberfläche ist ein falscher Satz darüber nicht zu erkennen.
              Hier stand bis zum 20.08.2026, beide Fassungen seien „sonst
              identisch, sonst wüssten wir hinterher nicht, woran eine Reaktion
              lag": die Beschreibung eines Versuchsaufbaus, den es nie gab. */}
          {VARIANTE_ERKLAERUNG}
        </p>
      </div>

      {/* Verteilung je Ask-Variante — wie viele Briefe welcher Fassung raus
          sind. Kein Vergleich, Begründung in lib/kommunen-ask.ts. */}
      {verteilung && verteilung.some((b) => b.versendet > 0) && (
        <div style={{ display: "flex", gap: space.md, flexWrap: "wrap", marginBottom: space.md }}>
          {verteilung.map((b) => (
            <div
              key={b.variante}
              style={{
                border: `1px solid ${v("--color-border")}`,
                borderRadius: v("--radius-md"),
                padding: pad("sm", "md"),
                minWidth: 200,
                background: v("--color-bg-muted"),
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: v("--color-text-secondary") }}>{ASK_LABEL[b.variante]}</div>
              {/* KEINE KLICKZAHLEN MEHR. Der Brief trägt keinen zählenden
                  Link, „0 mit Klick" war deshalb kein Messergebnis, sondern
                  eine leere Spalte, die wie eines aussah. */}
              <div style={{ fontSize: 13, marginTop: 4, fontFamily: v("--font-mono") }}>
                {b.versendet} versendet
                <div style={{ color: v("--color-text-muted"), fontSize: 12 }}>
                  {b.antworten} Antworten · {b.widgetAnfragen} Widget-Anfragen
                </div>
              </div>
            </div>
          ))}
          <div style={{ fontSize: 11, color: v("--color-text-muted"), alignSelf: "center", maxWidth: 300, lineHeight: 1.4 }}>
            {VERTEILUNG_HINWEIS}
            {offen ? ` ${offen.nochNichtVersendet} noch nicht versendet.` : ""}
          </div>
        </div>
      )}

      {/* Filterleiste */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: space.sm, alignItems: "center", marginBottom: space.md }}>
        <select value={bl} onChange={(e) => setBl(e.target.value)} style={selectStyle} aria-label="Bundesland">
          <option value="">Alle Bundesländer</option>
          {BUNDESLAENDER.map((b) => (
            <option key={b.ags} value={b.ags}>
              {b.name}
            </option>
          ))}
        </select>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Gemeinde suchen…"
          style={inputStyle}
          aria-label="Gemeinde suchen"
        />
        <label style={{ display: "flex", alignItems: "center", gap: space.xs, fontSize: 13, color: v("--color-text-secondary"), cursor: "pointer" }}>
          <input type="checkbox" checked={hasLink} onChange={(e) => setHasLink(e.target.checked)} />
          nur mit Kontaktlink
        </label>
        {/* Die Schübe kommen aus lib/kommunen-testballon.ts. Vorher standen hier
            zwei feste Zeilen mit dem Namen der ersten Kampagne und ihrer
            Größe — nach der zweiten Kampagne zeigte der Filter auf eine
            Auswahl, die es unter diesem Namen nicht mehr gab. */}
        <select value={kampagne} onChange={(e) => setKampagne(e.target.value)} style={selectStyle} aria-label="Schub">
          <option value="">Alle Gemeinden</option>
          {Object.keys(SCHUEBE).map((k) => (
            <option key={k} value={k}>
              Schub: {k}
            </option>
          ))}
        </select>
        <select
          value={charge}
          onChange={(e) => setCharge(e.target.value)}
          style={selectStyle}
          aria-label="Charge"
          disabled={!kampagne}
        >
          <option value="">Alle Chargen</option>
          {[1, 2, 3, 4, 5].map((c) => (
            <option key={c} value={String(c)}>
              Charge {c}
            </option>
          ))}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} style={selectStyle} aria-label="Sortierung">
          <option value="">Sortierung: Standard</option>
          <option value="gruen">Grün-affin zuerst</option>
          <option value="links">Links-affin zuerst</option>
        </select>
      </div>

      {/* Status-Tabs */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: space.xs, marginBottom: space.md }}>
        <StatusTab active={status === ""} label="Alle" onClick={() => setStatus("")} />
        {STATUS.map((s) => (
          <StatusTab key={s.key} active={status === s.key} label={s.label} onClick={() => setStatus(s.key)} />
        ))}
      </div>

      {/* Ergebniszeile */}
      <div style={{ fontSize: 12, color: v("--color-text-muted"), marginBottom: space.sm }}>
        {loading ? "Lädt…" : `${total.toLocaleString("de-DE")} Gemeinden`}
        {error && <span style={{ color: v("--color-negative"), marginLeft: space.sm }}>Fehler: {error}</span>}
      </div>

      {/* Tabelle */}
      <div style={{ overflowX: "auto", border: `1px solid ${v("--color-border")}`, borderRadius: v("--radius-md") }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 720 }}>
          <thead>
            <tr>
              {["Gemeinde", "Website-Themen", "Variante", "Kontakt", "Status", "Korrespondenz", "Notiz"].map((h) => (
                <th key={h} style={thStyle}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((l) => (
              <LeadRow key={l.region_id} lead={l} onPatched={patchLead} />
            ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={7} style={{ ...tdStyle, textAlign: "center", color: v("--color-text-muted"), padding: space.xl }}>
                  Keine Gemeinden für diesen Filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > pageSize && (
        <div style={{ display: "flex", alignItems: "center", gap: space.md, marginTop: space.md, fontSize: 13 }}>
          <button style={pagerBtn} disabled={page <= 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
            ← Zurück
          </button>
          <span style={{ color: v("--color-text-muted") }}>
            Seite {page + 1} / {maxPage + 1}
          </span>
          <button style={pagerBtn} disabled={page >= maxPage} onClick={() => setPage((p) => Math.min(maxPage, p + 1))}>
            Weiter →
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Zeile ──────────────────────────────────────────────────────────────────

function LeadRow({ lead, onPatched }: { lead: Lead; onPatched: (l: Lead) => void }) {
  const r = region(lead);
  const [notes, setNotes] = useState(lead.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [draftOpen, setDraftOpen] = useState(false);
  // Aus derselben Notiz gelesen wie der Verlauf im Fenster — eine zweite
  // Zählung hier hieße zwei Wahrheiten über dieselbe Zeile.
  const rueckläufe = liesNotiz(lead.notes).verlauf.length;
  const savedNotes = useRef(lead.notes ?? "");

  const patch = useCallback(
    async (body: {
      outreach_status?: string;
      notes?: string;
      channel?: string;
      ask_variante?: string;
      widget_anfrage?: boolean;
    }) => {
      setBusy(true);
      try {
        const res = await fetch("/api/admin/kommunen", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ region_id: lead.region_id, ...body }),
        });
        if (res.ok) {
          const json = await res.json();
          onPatched(json.row);
          if (body.notes !== undefined) savedNotes.current = body.notes;
        }
      } finally {
        setBusy(false);
      }
    },
    [lead.region_id, onPatched],
  );

  const statusMeta = STATUS.find((s) => s.key === lead.outreach_status) ?? STATUS[0];

  return (
    <tr style={{ borderTop: `1px solid ${v("--color-border")}`, opacity: busy ? 0.6 : 1 }}>
      {/* Gemeinde */}
      <td style={tdStyle}>
        <div style={{ fontWeight: 700 }}>
          {lead.atlas_path ? (
            <a href={lead.atlas_path} target="_blank" rel="noopener noreferrer" style={{ color: v("--color-accent"), textDecoration: "none" }}>
              {r?.name ?? lead.region_id} ↗
            </a>
          ) : (
            (r?.name ?? lead.region_id)
          )}
        </div>
        <div style={{ fontSize: 11, color: v("--color-text-muted") }}>
          {r?.bezeichnung ?? "Gemeinde"}
          {r?.population != null && ` · ${r.population.toLocaleString("de-DE")} Ew.`}
          {lead.charge != null && ` · Charge ${lead.charge}`}
        </div>
      </td>

      {/* WEBSITE-THEMEN, NICHT DER AUFHÄNGER DES BRIEFES.
          Die Spalte hieß „Aufhänger" und zeigte, ob die Gemeinde eine Solar-
          oder Klimaseite hat — gefunden vom Kontakt-Sammler. Der Aufhänger des
          Anschreibens ist etwas völlig anderes (bei Riedstadt „private
          Speicherkapazität") und kommt aus dem Award-Rechenkern. Zwei Dinge
          unter einem Namen: Wer die Spalte las, hielt sie für die Aussage des
          Briefes. */}
      <td style={tdStyle}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 3 }}>
          {lead.thema_solar_url && <Merkmal label="Solar" href={lead.thema_solar_url} stark />}
          {lead.thema_klima_url && <Merkmal label="Klima" href={lead.thema_klima_url} />}
          {lead.thema_blatt_url && <Merkmal label="Blatt" href={lead.thema_blatt_url} />}
          {!lead.thema_solar_url && !lead.thema_klima_url && !lead.thema_blatt_url && (
            <span style={{ fontSize: 11, color: v("--color-text-muted") }}>keine Themenseite</span>
          )}
        </div>
        {lead.verantwortlich_funktion && (
          <div style={{ fontSize: 11, color: lead.verantwortlich_operativ ? v("--color-positive") : v("--color-text-muted") }}>
            {lead.verantwortlich_operativ ? "zuständig: " : "nur Vertretung: "}
            {lead.verantwortlich_funktion}
          </div>
        )}
        {lead.verwaltung_domain && (
          <div style={{ fontSize: 11, color: v("--color-negative") }} title="Gemeinsame Verwaltung laut Impressum">
            Verbund: {lead.verwaltung_domain}
          </div>
        )}
      </td>

      {/* Ask-Variante + Klickzählung — nur für Zeilen in einer Kampagne.
          Ohne Versandliste hat die Spalte nichts zu sagen: ein leeres Auswahlfeld
          und ein Häkchen „Widget angefragt" auf 11.000 Gemeinden sind Rauschen,
          keine Information. */}
      <td style={tdStyle}>
        {!lead.kampagne ? (
          <span style={{ fontSize: 11, color: v("--color-text-muted") }}>nicht in Versandliste</span>
        ) : (
        <>
        <select
          value={lead.ask_variante ?? ""}
          onChange={(e) => patch({ ask_variante: e.target.value })}
          style={{ ...selectStyle, fontSize: 12, maxWidth: 150 }}
          aria-label="Ask-Variante"
        >
          <option value="" disabled>
            —
          </option>
          {ASK_VARIANTEN.map((a) => (
            <option key={a} value={a}>
              {ASK_LABEL[a]}
            </option>
          ))}
        </select>
        <div style={{ fontSize: 11, color: v("--color-text-muted"), marginTop: 3 }}>
          {lead.variante_manuell ? "von Hand · " : ""}
          {/* DIE ZÄHLUNG MISST HIER NICHTS.
              Der Brief trägt seit dem 31.07.2026 keinen zählenden Link mehr
              (Entscheidung des Betreibers): Eine kryptische Weiterleitung in
              einer Mail ans Rathaus kostet Vertrauen, und der Link in der
              Meldung ist genau der, den die Gemeinde VERÖFFENTLICHEN soll —
              eine Weiterleitung stünde danach dauerhaft auf einer fremden
              Website. „keine Klicks" las sich wie ein Messergebnis; es ist
              keines. */}
          {lead.ref_klicks ? `${lead.ref_klicks} Klicks` : "Klicks werden nicht gezählt"}
        </div>
        {lead.versendet_variante && (
          <div style={{ fontSize: 10, color: v("--color-text-muted") }}>versendet als {ASK_LABEL[lead.versendet_variante]}</div>
        )}
        <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, marginTop: 3, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={!!lead.widget_anfrage}
            onChange={(e) => patch({ widget_anfrage: e.target.checked })}
          />
          Widget angefragt
        </label>
        </>
        )}
      </td>

      {/* Kontakt */}
      <td style={tdStyle}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {lead.kontakt_url ? (
            <a href={lead.kontakt_url} target="_blank" rel="noopener noreferrer" style={linkStyle}>
              Kontaktseite öffnen ↗
            </a>
          ) : (
            <span style={{ color: v("--color-text-muted"), fontSize: 12 }}>kein Kontaktlink</span>
          )}
          {(lead.rollen_email || lead.email) && (
            <a href={`mailto:${lead.rollen_email ?? lead.email}`} style={{ ...linkStyle, fontSize: 12 }}>
              {lead.rollen_email ?? lead.email}
            </a>
          )}
          {lead.website && (
            <a href={lead.website} target="_blank" rel="noopener noreferrer" style={{ ...linkStyle, fontSize: 11, color: v("--color-text-muted") }}>
              {lead.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
            </a>
          )}
        </div>
      </td>

      {/* Status */}
      <td style={tdStyle}>
        <select
          value={lead.outreach_status}
          onChange={(e) => patch({ outreach_status: e.target.value })}
          style={{
            ...selectStyle,
            fontWeight: 700,
            color: v(statusMeta.color),
            background: v(statusMeta.bg),
            borderColor: v("--color-border"),
          }}
          aria-label={`Status ${r?.name ?? ""}`}
        >
          {STATUS.map((s) => (
            <option key={s.key} value={s.key}>
              {STATUS_LABEL[s.key]}
            </option>
          ))}
        </select>
        {lead.contacted_at && (
          <div style={{ fontSize: 10, color: v("--color-text-muted"), marginTop: 2 }}>
            {new Date(lead.contacted_at).toLocaleDateString("de-DE")}
          </div>
        )}
      </td>

      {/* KORRESPONDENZ — der Knopf sagt, was er öffnet.
          „Anschreiben ✎" versprach ein Entwurfsfeld, auch wo längst
          verschickt war und das Fenster ein Protokoll zeigt. Bei einer
          angeschriebenen Gemeinde steht deshalb die Zahl der Rückläufe daneben:
          Ob etwas zurückkam, ist die eigentliche Frage an dieser Zeile, und
          man sollte sie beantwortet bekommen, ohne zu klicken. */}
      <td style={tdStyle}>
        <button style={draftBtn} onClick={() => setDraftOpen(true)}>
          {lead.contacted_at
            ? rueckläufe > 0
              ? `Verlauf (${rueckläufe})`
              : "Verlauf"
            : lead.draft_body
              ? "Entwurf ✎"
              : "Entwurf +"}
        </button>
        <DraftModal open={draftOpen} lead={lead} onClose={() => setDraftOpen(false)} onPatched={onPatched} />
      </td>

      {/* Notiz */}
      <td style={tdStyle}>
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => {
            if (notes !== savedNotes.current) patch({ notes });
          }}
          placeholder="Notiz…"
          style={{ ...inputStyle, width: "100%", minWidth: 120, fontSize: 12 }}
          aria-label="Notiz"
        />
      </td>
    </tr>
  );
}

// ─── Anschreiben-Modal ────────────────────────────────────────────────────────

function DraftModal({
  open,
  lead,
  onClose,
  onPatched,
}: {
  open: boolean;
  lead: Lead;
  onClose: () => void;
  onPatched: (l: Lead) => void;
}) {
  const r = region(lead);
  const blocked = lead.outreach_status === "gesperrt";
  // Angeschrieben = das Fenster zeigt den Verlauf, nicht den Entwurf. Der
  // Zeitstempel entscheidet, nicht der Status: Ein Widerspruch setzt den Status
  // auf „gesperrt", der Brief ist trotzdem hinausgegangen und gehört gezeigt.
  const kontaktiert = !!lead.contacted_at;
  const [subject, setSubject] = useState(lead.draft_subject ?? "");
  const [body, setBody] = useState(lead.draft_body ?? "");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  // Vorbelegt mit dem Weg, den diese Gemeinde überhaupt hat — ein Rollen-
  // Postfach ist der Regelfall, sonst bleibt das Kontaktformular.
  const [kanal, setKanal] = useState(lead.rollen_email ? "mail" : lead.kontakt_url ? "formular" : "mail");

  const generate = useCallback(async () => {
    setBusy(true);
    setGenError(null);
    try {
      const res = await fetch("/api/admin/kommunen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ region_id: lead.region_id }),
      });
      if (res.ok) {
        const { row, draft } = await res.json();
        setSubject(draft.subject);
        setBody(draft.body);
        onPatched(row);
      } else {
        setGenError((await res.json()).error ?? `HTTP ${res.status}`);
      }
    } finally {
      setBusy(false);
    }
  }, [lead.region_id, onPatched]);

  // Status setzen (z. B. „als kontaktiert markieren" für den schnellen Durchlauf).
  //
  // MIT KANAL: „Kontaktiert" ohne die Angabe, WORÜBER, ist in der Auswertung
  // wertlos — genau die Frage, die der Versand beantworten soll (trägt der
  // Mail-Weg?), lässt sich aus einem leeren Kanal-Feld nicht beantworten. Das
  // Versand-Skript setzt ihn seit jeher selbst; von Hand markierte Gemeinden
  // fielen aus jeder Statistik heraus.
  const setStatus = useCallback(
    async (outreach_status: string, channel?: string) => {
      setBusy(true);
      try {
        const res = await fetch("/api/admin/kommunen", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ region_id: lead.region_id, outreach_status, ...(channel ? { channel } : {}) }),
        });
        if (res.ok) {
          onPatched((await res.json()).row);
          onClose();
        }
      } finally {
        setBusy(false);
      }
    },
    [lead.region_id, onPatched, onClose],
  );

  // Beim Öffnen IMMER neu erzeugen — außer der Entwurf wurde von Hand
  // bearbeitet oder die Gemeinde ist gesperrt.
  //
  // Vorher wurde ein gespeicherter Entwurf einfach angezeigt. Folge: Nach jeder
  // Textänderung an der Vorlage zeigte das Modal weiter die alte Fassung, und
  // zwar ohne jeden Hinweis — zweimal hintereinander als „der Text doppelt sich
  // immer noch" gemeldet, obwohl der Generator längst korrekt war. Ein
  // erzeugter Entwurf ist ein Zwischenstand, kein Dokument.
  useEffect(() => {
    if (open && !busy && !blocked && !kontaktiert && !lead.draft_manuell) generate();
    // Nur beim Öffnen — generate/body absichtlich nicht in den Deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const save = useCallback(async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/kommunen", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ region_id: lead.region_id, draft_subject: subject, draft_body: body }),
      });
      if (res.ok) onPatched((await res.json()).row);
    } finally {
      setBusy(false);
    }
  }, [lead.region_id, subject, body, onPatched]);

  const copy = useCallback(async (text: string, which: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(null), 1500);
  }, []);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${kontaktiert ? "Verlauf" : "Anschreiben"} · ${r?.name ?? lead.region_id}`}
      intro={
        kontaktiert
          ? "Was rausgegangen ist und was zurückkam."
          : "Aus Vorlage + echten Solar-Zahlen der Gemeinde erzeugt. Vor dem Versenden prüfen und anpassen."
      }
      maxWidth={640}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: space.md }}>
        {/* Die Sperre ist ein HINWEIS, kein Ersatz für den Verlauf. Eine
            Gemeinde, die widersprochen hat, ist angeschrieben worden — gerade
            dort will man sehen, was rausging und was zurückkam. Vorher verdeckte
            der Sperr-Kasten beides. */}
        {blocked && (
          <div style={{ background: v("--color-bg-muted"), border: `1px solid ${v("--color-negative")}`, borderRadius: v("--radius-sm"), padding: pad("md", "md"), fontSize: 13, color: v("--color-text-secondary") }}>
            Diese Gemeinde ist <strong style={{ color: v("--color-negative") }}>gesperrt</strong> — es wird kein weiteres
            Anschreiben erzeugt oder versendet. Um die Sperre aufzuheben, den Status in der Tabelle ändern.
          </div>
        )}
        {blocked && !kontaktiert ? null : kontaktiert ? (
          <Verlauf lead={lead} onStatus={setStatus} busy={busy} />
        ) : (
          <>
            {/* Erstkontakt bevorzugt über das Kontaktformular (dann ist die Folge-Mail angefordert). */}
            <div style={{ background: v("--color-accent-dim"), borderRadius: v("--radius-sm"), padding: pad("sm", "md"), fontSize: 12.5, color: v("--color-text-secondary"), lineHeight: 1.5 }}>
              Erstkontakt am besten über das <strong>Kontaktformular</strong> der Gemeinde — dann ist die Folge-Mail
              angefordert (rechtlich sauber). Text unten kopieren, Formular öffnen, einfügen.
            </div>
            <div style={{ display: "flex", gap: space.sm, flexWrap: "wrap" }}>
              {lead.kontakt_url ? (
                <a href={lead.kontakt_url} target="_blank" rel="noopener noreferrer" style={{ ...primaryBtn, textDecoration: "none", display: "inline-block" }}>
                  Kontaktformular öffnen ↗
                </a>
              ) : (
                <span style={{ fontSize: 12, color: v("--color-text-muted") }}>Kein Kontaktformular hinterlegt.</span>
              )}
              {lead.email && (
                <a
                  href={`mailto:${lead.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`}
                  style={{ ...pagerBtn, textDecoration: "none", display: "inline-block" }}
                >
                  Als Mail öffnen (Fallback)
                </a>
              )}
            </div>

            {lead.draft_manuell && lead.draft_generated_at && (
              <div style={{ fontSize: 11, color: v("--color-negative") }}>
                Von Hand bearbeitet am {new Date(lead.draft_generated_at).toLocaleString("de-DE")} — wird nicht automatisch
                aktualisiert. „Neu generieren" verwirft die Änderungen.
              </div>
            )}
            <label style={fieldLabel}>Betreff</label>
            <div style={{ display: "flex", gap: space.xs }}>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} style={{ ...inputStyle, flex: 1 }} aria-label="Betreff" />
              <button style={miniBtn} onClick={() => copy(subject, "subject")}>
                {copied === "subject" ? "kopiert ✓" : "kopieren"}
              </button>
            </div>

            <label style={fieldLabel}>Nachricht</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={14}
              style={{ ...inputStyle, width: "100%", resize: "vertical", lineHeight: 1.5, fontFamily: v("--font-text") }}
              aria-label="Nachricht"
            />

            {genError && <div style={{ color: v("--color-negative"), fontSize: 12 }}>Fehler: {genError}</div>}

            <div style={{ display: "flex", flexWrap: "wrap", gap: space.sm, alignItems: "center" }}>
              <button style={primaryBtn} disabled={busy} onClick={() => copy(body, "body")}>
                {copied === "body" ? "Text kopiert ✓" : "Text kopieren"}
              </button>
              <button style={pagerBtn} disabled={busy} onClick={save}>
                Speichern
              </button>
              {/* Nach dem Versand kommt dieser Zweig gar nicht mehr zum Zug —
                  dann zeigt das Fenster den Verlauf. Die Route verweigert das
                  Neuerzeugen zusätzlich, denn eine Oberfläche kann man umgehen. */}
              <button style={pagerBtn} disabled={busy} onClick={generate}>
                {busy ? "…" : "Neu generieren"}
              </button>
              <div style={{ display: "flex", gap: space.xs, alignItems: "center", marginLeft: "auto" }}>
                <label style={{ fontSize: 11, color: v("--color-text-muted") }} htmlFor="kanal-wahl">
                  über
                </label>
                <select
                  id="kanal-wahl"
                  value={kanal}
                  onChange={(e) => setKanal(e.target.value)}
                  style={{ ...inputStyle, fontSize: 12, padding: pad("xs", "sm") }}
                >
                  <option value="mail">Mail</option>
                  <option value="formular">Kontaktformular</option>
                  <option value="post">Post</option>
                  <option value="telefon">Telefon</option>
                </select>
                <button
                  style={{ ...pagerBtn, color: v("--color-positive"), fontWeight: 700 }}
                  disabled={busy}
                  onClick={() => setStatus("kontaktiert", kanal)}
                >
                  Als kontaktiert markieren →
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

// ─── Verlauf einer angeschriebenen Gemeinde ──────────────────────────────────
//
// Was hier steht, ist ein PROTOKOLL und kein Entwurfsfeld. Solange das Fenster
// nur den Brief zeigte, war der Verlauf über zwei Stellen verstreut: der
// Versand als Datum in der Tabelle, die Rückläufe als angehängte Zeilen im
// Notizfeld — lesbar nur, wenn man das Feld aufzog und selbst sortierte.
//
// Der Brief bleibt sichtbar, aber eingeklappt und nicht mehr änderbar: Es ist
// die verschickte Fassung, und daran gibt es nichts mehr zu bearbeiten.

function Verlauf({
  lead,
  onStatus,
  busy,
}: {
  lead: Lead;
  onStatus: (status: string) => void;
  busy: boolean;
}) {
  const { verlauf, freitext } = liesNotiz(lead.notes);
  const versendet = lead.contacted_at ? new Date(lead.contacted_at) : null;
  const fassung = lead.versendet_variante ?? lead.ask_variante;
  const [copied, setCopied] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: space.md }}>
      <div style={{ display: "flex", flexDirection: "column", gap: space.xs }}>
        {versendet && (
          <VerlaufsZeileView
            datum={versendet.toLocaleDateString("de-DE")}
            was="Verschickt"
            detail={[lead.channel === "mail" ? "per Mail" : lead.channel, lead.email ?? lead.rollen_email]
              .filter(Boolean)
              .join(" an ")}
            zusatz={fassung ? `Fassung: ${ASK_LABEL[fassung]}` : null}
            ton="accent"
          />
        )}
        {verlauf.map((z, i) => (
          <VerlaufsZeileView
            key={`${z.datum}-${i}`}
            datum={new Date(z.datum).toLocaleDateString("de-DE")}
            was={ART_LABEL[z.art] ?? z.art}
            detail={z.betreff}
            zusatz={z.von}
            ton={z.art === "widerspruch" || z.art === "unzustellbar" ? "negativ" : "neutral"}
          />
        ))}
        {!verlauf.length && (
          <div style={{ fontSize: 12, color: v("--color-text-muted"), paddingLeft: 2 }}>
            {/* „Noch nichts" ist eine Auskunft, kein leerer Bildschirm. */}
            Noch nichts zurückgekommen. Rückläufe trägt der Postfach-Lauf hier ein.
          </div>
        )}
      </div>

      {freitext.length > 0 && (
        <div>
          <label style={fieldLabel}>Notizen</label>
          <div style={{ fontSize: 12.5, color: v("--color-text-secondary"), lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
            {freitext.join("\n")}
          </div>
        </div>
      )}

      <ResultSection title="Verschickter Brief" summary={lead.draft_subject ?? "kein Text gespeichert"}>
        <div style={{ display: "flex", flexDirection: "column", gap: space.sm }}>
          <div style={{ fontSize: 12.5, lineHeight: 1.6, whiteSpace: "pre-wrap", color: v("--color-text-secondary") }}>
            {lead.draft_body ?? "Für diese Gemeinde ist kein Text gespeichert — sie wurde vor dem 20.08.2026 oder von Hand angeschrieben."}
          </div>
          {lead.draft_body && (
            <button
              style={pagerBtn}
              onClick={async () => {
                await navigator.clipboard.writeText(lead.draft_body ?? "");
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              {copied ? "kopiert ✓" : "Text kopieren"}
            </button>
          )}
        </div>
      </ResultSection>

      <div style={{ display: "flex", gap: space.sm, flexWrap: "wrap", alignItems: "center" }}>
        {(lead.email ?? lead.rollen_email) && (
          <a
            href={`mailto:${lead.email ?? lead.rollen_email}?subject=${encodeURIComponent(`Re: ${lead.draft_subject ?? ""}`)}`}
            style={{ ...pagerBtn, textDecoration: "none", display: "inline-block" }}
          >
            Antworten ↗
          </a>
        )}
        {/* Der eine Ausgang, auf den alles zielt. Ohne eigenen Knopf müsste man
            ihn in der Tabelle suchen — und eine Veröffentlichung sieht man
            genau hier, wenn man gerade die Antwort liest. */}
        {lead.outreach_status !== "veroeffentlicht" && (
          <button
            style={{ ...pagerBtn, color: v("--color-positive"), fontWeight: 700 }}
            disabled={busy}
            onClick={() => onStatus("veroeffentlicht")}
          >
            Hat veröffentlicht →
          </button>
        )}
      </div>
    </div>
  );
}

function VerlaufsZeileView({
  datum,
  was,
  detail,
  zusatz,
  ton,
}: {
  datum: string;
  was: string;
  detail?: string | null;
  zusatz?: string | null;
  ton: "accent" | "neutral" | "negativ";
}) {
  const farbe = ton === "accent" ? v("--color-accent") : ton === "negativ" ? v("--color-negative") : v("--color-text-secondary");
  return (
    <div style={{ display: "flex", gap: space.sm, alignItems: "baseline", fontSize: 12.5, lineHeight: 1.5 }}>
      <span style={{ fontFamily: v("--font-mono"), fontSize: 11.5, color: v("--color-text-muted"), whiteSpace: "nowrap" }}>
        {datum}
      </span>
      <span style={{ fontWeight: 700, color: farbe, whiteSpace: "nowrap" }}>{was}</span>
      <span style={{ color: v("--color-text-secondary"), minWidth: 0, overflowWrap: "anywhere" }}>
        {detail}
        {zusatz && <span style={{ color: v("--color-text-muted") }}> · {zusatz}</span>}
      </span>
    </div>
  );
}

// ─── Kleinteile ───────────────────────────────────────────────────────────────

function Merkmal({ label, href, stark }: { label: string; href: string; stark?: boolean }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={href}
      style={{
        fontSize: 11,
        fontWeight: 700,
        textDecoration: "none",
        padding: "1px 6px",
        borderRadius: 999,
        color: stark ? v("--color-text-on-accent") : v("--color-accent-dark"),
        background: stark ? v("--color-accent") : v("--color-accent-dim"),
      }}
    >
      {label}
    </a>
  );
}

function StatusTab({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontSize: 13,
        fontWeight: active ? 700 : 600,
        color: active ? v("--color-text-on-accent") : v("--color-text-secondary"),
        background: active ? v("--color-accent") : v("--color-bg-muted"),
        border: `1px solid ${active ? v("--color-accent") : v("--color-border")}`,
        borderRadius: 999,
        padding: pad("xs", "md"),
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

const labelKicker: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: v("--color-accent"),
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  marginBottom: 6,
};

const selectStyle: React.CSSProperties = {
  fontSize: 13,
  padding: pad("xs", "sm"),
  borderRadius: v("--radius-sm"),
  border: `1px solid ${v("--color-border")}`,
  background: v("--color-bg"),
  color: v("--color-text-primary"),
  fontFamily: v("--font-text"),
};

const inputStyle: React.CSSProperties = {
  fontSize: 13,
  padding: pad("xs", "sm"),
  borderRadius: v("--radius-sm"),
  border: `1px solid ${v("--color-border")}`,
  background: v("--color-bg"),
  color: v("--color-text-primary"),
  fontFamily: v("--font-text"),
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: v("--color-text-muted"),
  padding: pad("sm", "md"),
  background: v("--color-bg-muted"),
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: pad("sm", "md"),
  verticalAlign: "top",
};

const linkStyle: React.CSSProperties = {
  color: v("--color-accent"),
  textDecoration: "none",
  fontSize: 13,
  fontWeight: 600,
};

const pagerBtn: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  padding: pad("xs", "md"),
  borderRadius: v("--radius-sm"),
  border: `1px solid ${v("--color-border")}`,
  background: v("--color-bg"),
  color: v("--color-text-primary"),
  cursor: "pointer",
};

const draftBtn: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  padding: pad("xs", "sm"),
  borderRadius: v("--radius-sm"),
  border: `1px solid ${v("--color-border")}`,
  background: v("--color-bg"),
  color: v("--color-accent"),
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const primaryBtn: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  padding: pad("sm", "md"),
  borderRadius: v("--radius-sm"),
  border: `1px solid ${v("--color-accent")}`,
  background: v("--color-accent"),
  color: v("--color-text-on-accent"),
  cursor: "pointer",
};

const miniBtn: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  padding: pad("xs", "sm"),
  borderRadius: v("--radius-sm"),
  border: `1px solid ${v("--color-border")}`,
  background: v("--color-bg-muted"),
  color: v("--color-text-secondary"),
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const fieldLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: v("--color-text-muted"),
};
