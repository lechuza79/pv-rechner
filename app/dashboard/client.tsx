"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "../../lib/auth";
import type { CalculationRow } from "../../lib/types";
import { rowToParams, paramsToInitial } from "../../lib/types";

export default function DashboardClient({
  calculations: initialCalcs,
  userEmail,
}: {
  calculations: CalculationRow[];
  userEmail: string;
}) {
  const router = useRouter();
  const [calculations, setCalculations] = useState(initialCalcs);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [pendingSaved, setPendingSaved] = useState(false);

  // Auto-save pending calculation from localStorage (after Magic Link redirect)
  useEffect(() => {
    const pending = localStorage.getItem("pendingSave");
    if (!pending) return;
    localStorage.removeItem("pendingSave");

    try {
      const data = JSON.parse(pending);
      fetch("/api/calculations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
        .then(res => res.json())
        .then(result => {
          if (result.id) {
            setPendingSaved(true);
            // Reload to show the new calculation
            router.refresh();
            setTimeout(() => setPendingSaved(false), 3000);
          }
        });
    } catch { /* invalid JSON, ignore */ }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async (id: string) => {
    if (!confirm("Berechnung löschen?")) return;
    setDeleting(id);
    const res = await fetch(`/api/calculations/${id}`, { method: "DELETE" });
    if (res.ok) {
      setCalculations(prev => prev.filter(c => c.id !== id));
    }
    setDeleting(null);
  };

  const handleLoad = (calc: CalculationRow) => {
    const params = paramsToInitial(rowToParams(calc));
    const sp = new URLSearchParams(params);
    router.push(`/rechner?${sp.toString()}`);
  };

  const handleLogout = async () => {
    await signOut();
    router.push("/");
    router.refresh();
  };

  const startEditing = (calc: CalculationRow) => {
    setEditingId(calc.id);
    setEditName(calc.name);
    setEditDesc(calc.description || "");
  };

  const saveEdit = async () => {
    if (!editingId) return;
    await fetch(`/api/calculations/${editingId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim() || "Meine Berechnung", description: editDesc.trim() || null }),
    });
    setCalculations(prev =>
      prev.map(c => c.id === editingId ? { ...c, name: editName.trim() || "Meine Berechnung", description: editDesc.trim() || null } : c)
    );
    setEditingId(null);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit" });
  };

  return (
    <div style={{
      background: "#0c0c0c", fontFamily: "'DM Sans',system-ui,sans-serif",
      color: "#f0f0f0", minHeight: "100vh", padding: "20px 16px",
    }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <Link href="/" style={{ fontSize: 12, fontWeight: 700, color: "#22c55e", letterSpacing: "0.1em", textTransform: "uppercase", textDecoration: "none" }}>
            ← PV Rechner
          </Link>
          <button onClick={handleLogout} style={{
            background: "none", border: "none", color: "#666", fontSize: 12, cursor: "pointer",
            fontFamily: "'DM Sans',system-ui,sans-serif",
          }}>
            Abmelden
          </button>
        </div>

        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Meine Berechnungen</h1>
        <p style={{ fontSize: 13, color: "#666", marginBottom: 20 }}>{userEmail}</p>

        {/* Neue Berechnung Button */}
        <Link href="/" style={{
          display: "block", width: "100%", padding: "14px", borderRadius: 14,
          fontSize: 14, fontWeight: 700, textAlign: "center",
          background: "#22c55e", color: "#000", textDecoration: "none",
          marginBottom: 20,
        }}>
          + Neue Berechnung
        </Link>

        {/* Pending save notification */}
        {pendingSaved && (
          <div style={{
            background: "rgba(34,197,94,0.1)", borderRadius: 12, padding: "12px 16px",
            border: "1px solid rgba(34,197,94,0.3)", marginBottom: 16,
            fontSize: 13, fontWeight: 600, color: "#22c55e", textAlign: "center",
          }}>
            ✓ Berechnung gespeichert!
          </div>
        )}

        {calculations.length === 0 && !pendingSaved ? (
          <div style={{
            background: "#151515", borderRadius: 14, padding: "32px 20px",
            border: "1px solid #252525", textAlign: "center",
          }}>
            <div style={{ fontSize: 14, color: "#888", marginBottom: 4 }}>
              Noch keine Berechnungen gespeichert.
            </div>
            <div style={{ fontSize: 12, color: "#555" }}>
              Berechne deine PV-Anlage und speichere das Ergebnis.
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {calculations.map(calc => (
              <div key={calc.id} style={{
                background: "#151515", borderRadius: 14, padding: "16px",
                border: editingId === calc.id ? "1px solid rgba(34,197,94,0.4)" : "1px solid #252525",
                transition: "border-color 0.2s",
              }}>
                {editingId === calc.id ? (
                  /* Edit mode */
                  <div>
                    <input
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      placeholder="Name der Berechnung"
                      autoFocus
                      style={{
                        width: "100%", padding: "8px 10px", borderRadius: 8, fontSize: 14, fontWeight: 600,
                        background: "#161616", border: "1px solid #2a2a2a", color: "#f0f0f0",
                        fontFamily: "'DM Sans',system-ui,sans-serif", outline: "none", marginBottom: 8,
                      }}
                      onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditingId(null); }}
                    />
                    <input
                      value={editDesc}
                      onChange={e => setEditDesc(e.target.value)}
                      placeholder="Beschreibung (optional)"
                      style={{
                        width: "100%", padding: "8px 10px", borderRadius: 8, fontSize: 13,
                        background: "#161616", border: "1px solid #2a2a2a", color: "#aaa",
                        fontFamily: "'DM Sans',system-ui,sans-serif", outline: "none", marginBottom: 10,
                      }}
                      onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditingId(null); }}
                    />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={saveEdit} style={{
                        flex: 1, padding: "8px 12px", borderRadius: 10, fontSize: 13, fontWeight: 600,
                        background: "#22c55e", border: "none", color: "#000", cursor: "pointer",
                        fontFamily: "'DM Sans',system-ui,sans-serif",
                      }}>
                        Speichern
                      </button>
                      <button onClick={() => setEditingId(null)} style={{
                        padding: "8px 12px", borderRadius: 10, fontSize: 13, fontWeight: 600,
                        background: "#161616", border: "1px solid #2a2a2a", color: "#888", cursor: "pointer",
                        fontFamily: "'DM Sans',system-ui,sans-serif",
                      }}>
                        Abbrechen
                      </button>
                    </div>
                  </div>
                ) : (
                  /* View mode */
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {calc.name}
                        </div>
                        {calc.description && (
                          <div style={{ fontSize: 12, color: "#777", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {calc.description}
                          </div>
                        )}
                        <div style={{ fontSize: 11, color: "#555", marginTop: 3, display: "flex", alignItems: "center", gap: 6 }}>
                          {formatDate(calc.created_at)}
                          {(calc as any).flow_type === "empfehlung" && (
                            <span style={{ fontSize: 9, fontWeight: 700, color: "#22c55e", background: "rgba(34,197,94,0.1)", padding: "1px 5px", borderRadius: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>Empfohlen</span>
                          )}
                        </div>
                      </div>
                      <div style={{
                        fontSize: 18, fontWeight: 800, fontFamily: "'JetBrains Mono',monospace",
                        color: calc.amortisation_jahre ? "#22c55e" : "#ef4444",
                        flexShrink: 0, marginLeft: 12,
                      }}>
                        {calc.amortisation_jahre ? `${calc.amortisation_jahre} J.` : ">25 J."}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 10, color: "#666", textTransform: "uppercase", letterSpacing: "0.04em" }}>Anlage</div>
                        <div style={{ fontSize: 14, fontWeight: 600, fontFamily: "'JetBrains Mono',monospace" }}>{calc.kwp} kWp</div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 10, color: "#666", textTransform: "uppercase", letterSpacing: "0.04em" }}>Rendite 25J</div>
                        <div style={{ fontSize: 14, fontWeight: 600, fontFamily: "'JetBrains Mono',monospace", color: (calc.rendite_25j ?? 0) > 0 ? "#22c55e" : "#ef4444" }}>
                          {calc.rendite_25j != null ? `${calc.rendite_25j > 0 ? "+" : ""}${calc.rendite_25j.toLocaleString("de-DE")} €` : "—"}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => handleLoad(calc)} style={{
                        flex: 1, padding: "8px 12px", borderRadius: 10, fontSize: 13, fontWeight: 600,
                        background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)",
                        color: "#22c55e", cursor: "pointer", fontFamily: "'DM Sans',system-ui,sans-serif",
                      }}>
                        Laden
                      </button>
                      <button onClick={() => startEditing(calc)} style={{
                        padding: "8px 12px", borderRadius: 10, fontSize: 13, fontWeight: 600,
                        background: "#161616", border: "1px solid #2a2a2a",
                        color: "#888", cursor: "pointer", fontFamily: "'DM Sans',system-ui,sans-serif",
                      }}>
                        ✎
                      </button>
                      <button onClick={() => handleDelete(calc.id)} disabled={deleting === calc.id} style={{
                        padding: "8px 12px", borderRadius: 10, fontSize: 13, fontWeight: 600,
                        background: "#161616", border: "1px solid #2a2a2a",
                        color: deleting === calc.id ? "#555" : "#888", cursor: "pointer",
                        fontFamily: "'DM Sans',system-ui,sans-serif",
                      }}>
                        {deleting === calc.id ? "..." : "✕"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "center", gap: 16, padding: "24px 0 16px" }}>
          <Link href="/methodik" style={{ fontSize: 11, color: "#555", textDecoration: "none" }}>Methodik</Link>
          <Link href="/impressum" style={{ fontSize: 11, color: "#555", textDecoration: "none" }}>Impressum</Link>
          <Link href="/datenschutz" style={{ fontSize: 11, color: "#555", textDecoration: "none" }}>Datenschutz</Link>
        </div>
      </div>
    </div>
  );
}
