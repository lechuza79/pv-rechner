"use client";
import { useState } from "react";
import { v } from "../../../lib/theme";
import { DEFAULT_PRICES } from "../../../lib/prices-config";
import { DEFAULT_FEED_IN } from "../../../lib/feedin-config";
import { estimateCost } from "../../../lib/calc";

interface PriceRow {
  id: string;
  pv_price_small: number;
  pv_price_large: number;
  pv_threshold_kwp: number;
  battery_base: number;
  battery_per_kwh: number;
  valid_from: string;
  source: string | null;
  notes: string | null;
  updated_by: string | null;
  created_at: string;
}

const S = {
  page: { background: v("--color-bg"), fontFamily: v("--font-text"), color: v("--color-text-primary"), minHeight: "100vh", padding: "24px 16px" } as const,
  wrap: { maxWidth: 600, margin: "0 auto" } as const,
  h1: { fontSize: 22, fontWeight: 700, marginBottom: 24 } as const,
  h2: { fontSize: 18, fontWeight: 600, marginTop: 32, marginBottom: 12 } as const,
  card: { background: "#fff", border: `1px solid ${v("--color-border")}`, borderRadius: 14, padding: 20, marginBottom: 16 } as const,
  label: { display: "block", fontSize: 13, fontWeight: 600, color: v("--color-text-secondary"), textTransform: "uppercase" as const, letterSpacing: "0.5px", marginBottom: 6 },
  input: { width: "100%", padding: "8px 12px", border: `1px solid ${v("--color-border")}`, borderRadius: 8, fontSize: 15, fontFamily: v("--font-mono"), background: v("--color-bg-muted") } as const,
  row: { display: "flex", gap: 12, marginBottom: 12 } as const,
  btn: { background: v("--color-accent"), color: "#fff", border: "none", borderRadius: 10, padding: "12px 24px", fontSize: 15, fontWeight: 600, cursor: "pointer", width: "100%" } as const,
  btnSecondary: { background: "transparent", color: v("--color-accent"), border: `1px solid ${v("--color-accent")}`, borderRadius: 10, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer" } as const,
  preview: { fontFamily: v("--font-mono"), fontSize: 14, color: v("--color-accent"), marginTop: 12 } as const,
  table: { width: "100%", borderCollapse: "collapse" as const, fontSize: 13 },
  th: { textAlign: "left" as const, padding: "6px 8px", borderBottom: `2px solid ${v("--color-border")}`, fontWeight: 600, color: v("--color-text-secondary") },
  td: { padding: "6px 8px", borderBottom: `1px solid ${v("--color-border")}`, fontFamily: v("--font-mono") },
  muted: { color: v("--color-text-muted"), fontSize: 12 },
  success: { color: v("--color-positive"), fontSize: 14, fontWeight: 600, marginTop: 8 },
  error: { color: v("--color-negative"), fontSize: 14, fontWeight: 600, marginTop: 8 },
  link: { color: v("--color-accent"), textDecoration: "none", fontSize: 13 },
};

interface FeedInRow {
  id: string;
  teil_under_10: number;
  teil_over_10: number;
  voll_under_10: number;
  voll_over_10: number;
  threshold_kwp: number;
  valid_from: string;
  source: string | null;
  notes: string | null;
  updated_by: string | null;
  created_at: string;
}

export default function PricesClient({ history, feedInHistory = [] }: { history: PriceRow[]; feedInHistory?: FeedInRow[] }) {
  const current = history.find(h => h.source !== "SCRAPE_ERROR") || null;

  const [pvSmall, setPvSmall] = useState(current?.pv_price_small ?? DEFAULT_PRICES.pvPriceSmall);
  const [pvLarge, setPvLarge] = useState(current?.pv_price_large ?? DEFAULT_PRICES.pvPriceLarge);
  const [threshold, setThreshold] = useState(current?.pv_threshold_kwp ?? DEFAULT_PRICES.pvThresholdKwp);
  const [battBase, setBattBase] = useState(current?.battery_base ?? DEFAULT_PRICES.batteryBase);
  const [battKwh, setBattKwh] = useState(current?.battery_per_kwh ?? DEFAULT_PRICES.batteryPerKwh);
  const [validFrom, setValidFrom] = useState(new Date().toISOString().split("T")[0]);
  const [source, setSource] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [scrapeStatus, setScrapeStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [scrapeResult, setScrapeResult] = useState("");

  // Live preview
  const previewPrices = { pvPriceSmall: pvSmall, pvPriceLarge: pvLarge, pvThresholdKwp: threshold, batteryBase: battBase, batteryPerKwh: battKwh, validFrom, source: null };
  const preview10 = estimateCost(10, 0, previewPrices);
  const preview10sp = estimateCost(10, 10, previewPrices);
  const preview15 = estimateCost(15, 10, previewPrices);

  const handleSave = async () => {
    setStatus("saving");
    try {
      const res = await fetch("/api/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pvPriceSmall: pvSmall, pvPriceLarge: pvLarge, pvThresholdKwp: threshold,
          batteryBase: battBase, batteryPerKwh: battKwh, validFrom,
          source: source || "Manual (Admin)", notes: notes || null,
        }),
      });
      if (res.ok) {
        setStatus("success");
        setTimeout(() => window.location.reload(), 1500);
      } else {
        const data = await res.json();
        setErrorMsg(data.error || "Fehler beim Speichern");
        setStatus("error");
      }
    } catch {
      setErrorMsg("Netzwerkfehler");
      setStatus("error");
    }
  };

  const handleScrape = async () => {
    setScrapeStatus("running");
    try {
      const res = await fetch("/api/prices/scrape");
      const data = await res.json();
      if (res.ok && data.success) {
        setScrapeResult(`PV: ${data.prices.pvPriceSmall}/${data.prices.pvPriceLarge} €/kWp, Speicher: ${data.prices.batteryPerKwh} €/kWh`);
        setScrapeStatus("done");
        setTimeout(() => window.location.reload(), 2000);
      } else {
        setScrapeResult(data.error || JSON.stringify(data));
        setScrapeStatus("error");
      }
    } catch {
      setScrapeResult("Netzwerkfehler");
      setScrapeStatus("error");
    }
  };

  // Feed-in tariff state
  const currentFeedIn = feedInHistory.length > 0 ? feedInHistory[0] : null;
  const [fiTeilU, setFiTeilU] = useState(currentFeedIn?.teil_under_10 ?? DEFAULT_FEED_IN.teilUnder10);
  const [fiTeilO, setFiTeilO] = useState(currentFeedIn?.teil_over_10 ?? DEFAULT_FEED_IN.teilOver10);
  const [fiVollU, setFiVollU] = useState(currentFeedIn?.voll_under_10 ?? DEFAULT_FEED_IN.vollUnder10);
  const [fiVollO, setFiVollO] = useState(currentFeedIn?.voll_over_10 ?? DEFAULT_FEED_IN.vollOver10);
  const [fiValidFrom, setFiValidFrom] = useState(new Date().toISOString().split("T")[0]);
  const [fiSource, setFiSource] = useState("");
  const [fiNotes, setFiNotes] = useState("");
  const [fiStatus, setFiStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [fiError, setFiError] = useState("");

  const handleFeedInSave = async () => {
    setFiStatus("saving");
    try {
      const res = await fetch("/api/feedin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teilUnder10: fiTeilU, teilOver10: fiTeilO,
          vollUnder10: fiVollU, vollOver10: fiVollO,
          validFrom: fiValidFrom,
          source: fiSource || "Manual (Admin)", notes: fiNotes || null,
        }),
      });
      if (res.ok) {
        setFiStatus("success");
        setTimeout(() => window.location.reload(), 1500);
      } else {
        const data = await res.json();
        setFiError(data.error || "Fehler beim Speichern");
        setFiStatus("error");
      }
    } catch {
      setFiError("Netzwerkfehler");
      setFiStatus("error");
    }
  };

  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <h1 style={S.h1}>Marktpreise verwalten</h1>

        {/* Scrape trigger */}
        <div style={S.card}>
          <span style={S.label}>Automatisches Update</span>
          <p style={{ fontSize: 14, color: v("--color-text-secondary"), margin: "0 0 12px" }}>
            Preise von solaranlagen-portal.com scrapen und in die Datenbank schreiben.
          </p>
          <button style={S.btnSecondary} onClick={handleScrape} disabled={scrapeStatus === "running"}>
            {scrapeStatus === "running" ? "Scraping..." : "Jetzt scrapen"}
          </button>
          {scrapeStatus === "done" && <p style={S.success}>{scrapeResult}</p>}
          {scrapeStatus === "error" && <p style={S.error}>{scrapeResult}</p>}
        </div>

        {/* Manual form */}
        <h2 style={S.h2}>Manuell aktualisieren</h2>
        <div style={S.card}>
          <span style={S.label}>PV-Module + Installation</span>
          <div style={S.row}>
            <div style={{ flex: 1 }}>
              <span style={{ ...S.muted, display: "block", marginBottom: 4 }}>≤ {threshold} kWp (€/kWp)</span>
              <input style={S.input} type="number" value={pvSmall} onChange={e => setPvSmall(Number(e.target.value))} />
            </div>
            <div style={{ flex: 1 }}>
              <span style={{ ...S.muted, display: "block", marginBottom: 4 }}>&gt; {threshold} kWp (€/kWp)</span>
              <input style={S.input} type="number" value={pvLarge} onChange={e => setPvLarge(Number(e.target.value))} />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <span style={{ ...S.muted, display: "block", marginBottom: 4 }}>Schwelle (kWp)</span>
            <input style={{ ...S.input, maxWidth: 100 }} type="number" value={threshold} onChange={e => setThreshold(Number(e.target.value))} />
          </div>

          <span style={S.label}>Batteriespeicher</span>
          <div style={S.row}>
            <div style={{ flex: 1 }}>
              <span style={{ ...S.muted, display: "block", marginBottom: 4 }}>Basis (€)</span>
              <input style={S.input} type="number" value={battBase} onChange={e => setBattBase(Number(e.target.value))} />
            </div>
            <div style={{ flex: 1 }}>
              <span style={{ ...S.muted, display: "block", marginBottom: 4 }}>pro kWh (€)</span>
              <input style={S.input} type="number" value={battKwh} onChange={e => setBattKwh(Number(e.target.value))} />
            </div>
          </div>

          <span style={S.label}>Meta</span>
          <div style={{ marginBottom: 12 }}>
            <span style={{ ...S.muted, display: "block", marginBottom: 4 }}>Gültig ab</span>
            <input style={{ ...S.input, maxWidth: 180 }} type="date" value={validFrom} onChange={e => setValidFrom(e.target.value)} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <span style={{ ...S.muted, display: "block", marginBottom: 4 }}>Quelle</span>
            <input style={S.input} type="text" placeholder="z.B. Solarserver SPINX Q1/2026" value={source} onChange={e => setSource(e.target.value)} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <span style={{ ...S.muted, display: "block", marginBottom: 4 }}>Notizen</span>
            <input style={S.input} type="text" placeholder="Optional" value={notes} onChange={e => setNotes(e.target.value)} />
          </div>

          {/* Preview */}
          <div style={S.preview}>
            10 kWp ohne Speicher = {preview10.toLocaleString("de-DE")} € &nbsp;|&nbsp;
            10 kWp + 10 kWh = {preview10sp.toLocaleString("de-DE")} € &nbsp;|&nbsp;
            15 kWp + 10 kWh = {preview15.toLocaleString("de-DE")} €
          </div>

          <button style={{ ...S.btn, marginTop: 16 }} onClick={handleSave} disabled={status === "saving"}>
            {status === "saving" ? "Speichern..." : "Preise speichern"}
          </button>
          {status === "success" && <p style={S.success}>Gespeichert! Seite lädt neu...</p>}
          {status === "error" && <p style={S.error}>{errorMsg}</p>}
        </div>

        {/* Data sources */}
        <h2 style={S.h2}>Datenquellen</h2>
        <div style={S.card}>
          <ul style={{ margin: 0, padding: "0 0 0 16px", fontSize: 14, lineHeight: 2 }}>
            <li><a href="https://www.solaranlagen-portal.com/photovoltaik/kosten" target="_blank" rel="noopener" style={S.link}>solaranlagen-portal.com</a> — Systempreise (250+ Angebote)</li>
            <li><a href="https://www.solarserver.de/photovoltaik-preis-pv-modul-preisindex/" target="_blank" rel="noopener" style={S.link}>Solarserver SPINX</a> — Modulpreise (monatlich)</li>
            <li><a href="https://www.ise.fraunhofer.de/de/veroeffentlichungen/studien/aktuelle-fakten-zur-photovoltaik-in-deutschland.html" target="_blank" rel="noopener" style={S.link}>Fraunhofer ISE</a> — Aktuelle Fakten (jährlich)</li>
          </ul>
        </div>

        {/* History */}
        <h2 style={S.h2}>Preishistorie</h2>
        {history.length === 0 ? (
          <p style={S.muted}>Noch keine Einträge. Starte den ersten Scrape oder trage Preise manuell ein.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Datum</th>
                  <th style={S.th}>PV ≤/{">"}10</th>
                  <th style={S.th}>Speicher</th>
                  <th style={S.th}>Quelle</th>
                </tr>
              </thead>
              <tbody>
                {history.map(row => (
                  <tr key={row.id} style={row.source === "SCRAPE_ERROR" ? { opacity: 0.5 } : {}}>
                    <td style={S.td}>{row.valid_from}</td>
                    <td style={S.td}>
                      {row.source === "SCRAPE_ERROR" ? "—" : `${row.pv_price_small}/${row.pv_price_large}`}
                    </td>
                    <td style={S.td}>
                      {row.source === "SCRAPE_ERROR" ? "—" : `${row.battery_per_kwh} €/kWh`}
                    </td>
                    <td style={{ ...S.td, fontFamily: v("--font-text"), fontSize: 12, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {row.source === "SCRAPE_ERROR" ? (
                        <span style={{ color: v("--color-negative") }} title={row.notes || ""}>Fehler</span>
                      ) : (
                        <span title={row.notes || ""}>{row.source || row.updated_by || "—"}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {/* ─── Feed-In Tariffs ─── */}
        <h2 style={{ ...S.h2, marginTop: 48 }}>Einspeisevergütung (EEG)</h2>
        <div style={S.card}>
          <span style={S.label}>Teileinspeisung</span>
          <div style={S.row}>
            <div style={{ flex: 1 }}>
              <span style={{ ...S.muted, display: "block", marginBottom: 4 }}>≤ 10 kWp (ct/kWh)</span>
              <input style={S.input} type="number" step="0.01" value={fiTeilU} onChange={e => setFiTeilU(Number(e.target.value))} />
            </div>
            <div style={{ flex: 1 }}>
              <span style={{ ...S.muted, display: "block", marginBottom: 4 }}>&gt; 10 kWp (ct/kWh)</span>
              <input style={S.input} type="number" step="0.01" value={fiTeilO} onChange={e => setFiTeilO(Number(e.target.value))} />
            </div>
          </div>

          <span style={S.label}>Volleinspeisung</span>
          <div style={S.row}>
            <div style={{ flex: 1 }}>
              <span style={{ ...S.muted, display: "block", marginBottom: 4 }}>≤ 10 kWp (ct/kWh)</span>
              <input style={S.input} type="number" step="0.01" value={fiVollU} onChange={e => setFiVollU(Number(e.target.value))} />
            </div>
            <div style={{ flex: 1 }}>
              <span style={{ ...S.muted, display: "block", marginBottom: 4 }}>&gt; 10 kWp (ct/kWh)</span>
              <input style={S.input} type="number" step="0.01" value={fiVollO} onChange={e => setFiVollO(Number(e.target.value))} />
            </div>
          </div>

          <span style={S.label}>Meta</span>
          <div style={{ marginBottom: 12 }}>
            <span style={{ ...S.muted, display: "block", marginBottom: 4 }}>Gültig ab</span>
            <input style={{ ...S.input, maxWidth: 180 }} type="date" value={fiValidFrom} onChange={e => setFiValidFrom(e.target.value)} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <span style={{ ...S.muted, display: "block", marginBottom: 4 }}>Quelle</span>
            <input style={S.input} type="text" placeholder="z.B. Bundesnetzagentur, Feb 2025" value={fiSource} onChange={e => setFiSource(e.target.value)} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <span style={{ ...S.muted, display: "block", marginBottom: 4 }}>Notizen</span>
            <input style={S.input} type="text" placeholder="Optional" value={fiNotes} onChange={e => setFiNotes(e.target.value)} />
          </div>

          <button style={{ ...S.btn, marginTop: 8 }} onClick={handleFeedInSave} disabled={fiStatus === "saving"}>
            {fiStatus === "saving" ? "Speichern..." : "Vergütungssätze speichern"}
          </button>
          {fiStatus === "success" && <p style={S.success}>Gespeichert! Seite lädt neu...</p>}
          {fiStatus === "error" && <p style={S.error}>{fiError}</p>}
        </div>

        {/* Feed-In History */}
        <h2 style={S.h2}>Vergütungshistorie</h2>
        {feedInHistory.length === 0 ? (
          <p style={S.muted}>Noch keine Einträge.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Datum</th>
                  <th style={S.th}>Teil ≤/{">"}10</th>
                  <th style={S.th}>Voll ≤/{">"}10</th>
                  <th style={S.th}>Quelle</th>
                </tr>
              </thead>
              <tbody>
                {feedInHistory.map(row => (
                  <tr key={row.id}>
                    <td style={S.td}>{row.valid_from}</td>
                    <td style={S.td}>{row.teil_under_10}/{row.teil_over_10}</td>
                    <td style={S.td}>{row.voll_under_10}/{row.voll_over_10}</td>
                    <td style={{ ...S.td, fontFamily: v("--font-text"), fontSize: 12, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <span title={row.notes || ""}>{row.source || row.updated_by || "—"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
