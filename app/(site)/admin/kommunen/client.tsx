"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { v, space, pad } from "../../../../lib/theme";
import { BUNDESLAENDER } from "../../../../lib/mastr-regions";
import Modal from "../../../../components/Modal";

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
  mastr_regions: Region | Region[];
};

function region(l: Lead): Region {
  return Array.isArray(l.mastr_regions) ? l.mastr_regions[0] : l.mastr_regions;
}

// ─── Status-Katalog ───────────────────────────────────────────────────────────

type Token = Parameters<typeof v>[0];

const STATUS: { key: string; label: string; color: Token; bg: Token }[] = [
  { key: "offen", label: "Offen", color: "--color-text-secondary", bg: "--color-bg-muted" },
  { key: "entwurf", label: "Entwurf", color: "--color-accent", bg: "--color-accent-dim" },
  { key: "kontaktiert", label: "Kontaktiert", color: "--color-accent-dark", bg: "--color-accent-dim" },
  { key: "geantwortet", label: "Geantwortet", color: "--color-positive", bg: "--color-bg-muted" },
  { key: "zu", label: "Zu", color: "--color-text-muted", bg: "--color-bg-muted" },
];
const STATUS_LABEL: Record<string, string> = Object.fromEntries(STATUS.map((s) => [s.key, s.label]));

// ─── Cockpit ──────────────────────────────────────────────────────────────────

export default function KommunenCockpit() {
  const [bl, setBl] = useState("");
  const [status, setStatus] = useState("");
  const [hasLink, setHasLink] = useState(false);
  const [q, setQ] = useState("");
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
  }, [bl, status, hasLink, qDebounced, page]);

  useEffect(() => {
    load();
  }, [load]);

  // Filterwechsel → zurück auf Seite 1.
  useEffect(() => {
    setPage(0);
  }, [bl, status, hasLink, qDebounced]);

  const patchLead = useCallback((updated: Lead) => {
    setRows((prev) => prev.map((r) => (r.region_id === updated.region_id ? updated : r)));
  }, []);

  const maxPage = Math.max(0, Math.ceil(total / pageSize) - 1);

  return (
    <div style={{ fontFamily: v("--font-text"), color: v("--color-text-primary") }}>
      <div style={{ marginBottom: space.lg }}>
        <div style={labelKicker}>Admin</div>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Kommunen-Outreach</h1>
        <p style={{ fontSize: 13, color: v("--color-text-muted") }}>
          Kontaktdaten der ~11.000 Gemeinden. Filtern, Status pflegen, Kontaktseite öffnen.
        </p>
      </div>

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
              {["Gemeinde", "Kontakt", "Status", "Anschreiben", "Notiz"].map((h) => (
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
                <td colSpan={5} style={{ ...tdStyle, textAlign: "center", color: v("--color-text-muted"), padding: space.xl }}>
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
  const savedNotes = useRef(lead.notes ?? "");

  const patch = useCallback(
    async (body: { outreach_status?: string; notes?: string; channel?: string }) => {
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
        <div style={{ fontWeight: 700 }}>{r?.name ?? lead.region_id}</div>
        <div style={{ fontSize: 11, color: v("--color-text-muted") }}>
          {r?.bezeichnung ?? "Gemeinde"}
          {r?.population != null && ` · ${r.population.toLocaleString("de-DE")} Ew.`}
        </div>
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
          {lead.email && (
            <a href={`mailto:${lead.email}`} style={{ ...linkStyle, fontSize: 12 }}>
              {lead.email}
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

      {/* Anschreiben */}
      <td style={tdStyle}>
        <button style={draftBtn} onClick={() => setDraftOpen(true)}>
          {lead.draft_body ? "Anschreiben ✎" : "Anschreiben +"}
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
  const [subject, setSubject] = useState(lead.draft_subject ?? "");
  const [body, setBody] = useState(lead.draft_body ?? "");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const generate = useCallback(async () => {
    setBusy(true);
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
      }
    } finally {
      setBusy(false);
    }
  }, [lead.region_id, onPatched]);

  // Beim Öffnen ohne vorhandenen Entwurf einmal generieren.
  useEffect(() => {
    if (open && !body && !busy) generate();
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
      title={`Anschreiben · ${r?.name ?? lead.region_id}`}
      intro="Aus Vorlage + echten Solar-Zahlen der Gemeinde erzeugt. Vor dem Versenden prüfen und anpassen."
      maxWidth={640}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: space.md }}>
        {lead.kontakt_url && (
          <a href={lead.kontakt_url} target="_blank" rel="noopener noreferrer" style={{ ...linkStyle, fontSize: 13 }}>
            Kontaktseite öffnen ↗
          </a>
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

        <div style={{ display: "flex", flexWrap: "wrap", gap: space.sm, alignItems: "center" }}>
          <button style={primaryBtn} disabled={busy} onClick={() => copy(body, "body")}>
            {copied === "body" ? "Text kopiert ✓" : "Text kopieren"}
          </button>
          <button style={pagerBtn} disabled={busy} onClick={save}>
            Speichern
          </button>
          <button style={pagerBtn} disabled={busy} onClick={generate}>
            {busy ? "…" : "Neu generieren"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Kleinteile ───────────────────────────────────────────────────────────────

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
