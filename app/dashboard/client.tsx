"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "../../lib/auth";
import type { CalculationRow } from "../../lib/types";
import { rowToParams, paramsToInitial } from "../../lib/types";
import { v } from "../../lib/theme";

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
      background: v('--color-bg'), fontFamily: v('--font-text'),
      color: v('--color-text-primary'), minHeight: "100vh", padding: "20px 16px",
    }}>
      <div style={{ maxWidth: v('--page-max-width'), margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <Link href="/" style={{ fontSize: 12, fontWeight: 700, color: v('--color-accent'), letterSpacing: "0.1em", textTransform: "uppercase", textDecoration: "none" }}>
            ← PV Rechner
          </Link>
          <button onClick={handleLogout} style={{
            background: "none", border: "none", color: v('--color-text-muted'), fontSize: 12, cursor: "pointer",
            fontFamily: v('--font-text'),
          }}>
            Abmelden
          </button>
        </div>

        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Meine Berechnungen</h1>
        <p style={{ fontSize: 13, color: v('--color-text-muted'), marginBottom: 20 }}>{userEmail}</p>

        {/* Neue Berechnung Button */}
        <Link href="/" style={{
          display: "block", width: "100%", padding: "14px", borderRadius: v('--radius-card'),
          fontSize: 14, fontWeight: 700, textAlign: "center",
          background: v('--color-accent'), color: v('--color-text-on-accent'), textDecoration: "none",
          marginBottom: 20,
        }}>
          + Neue Berechnung
        </Link>

        {/* Pending save notification */}
        {pendingSaved && (
          <div style={{
            background: v('--color-accent-dim'), borderRadius: v('--radius-button-lg'), padding: "12px 16px",
            border: `1px solid ${v('--color-accent-border')}`, marginBottom: 16,
            fontSize: 13, fontWeight: 600, color: v('--color-accent'), textAlign: "center",
          }}>
            ✓ Berechnung gespeichert!
          </div>
        )}

        {calculations.length === 0 && !pendingSaved ? (
          <div style={{
            background: v('--color-bg-card'), borderRadius: v('--radius-card'), padding: "32px 20px",
            border: `1px solid ${v('--color-border')}`, textAlign: "center",
          }}>
            <div style={{ fontSize: 14, color: v('--color-text-secondary'), marginBottom: 4 }}>
              Noch keine Berechnungen gespeichert.
            </div>
            <div style={{ fontSize: 12, color: v('--color-text-faint') }}>
              Berechne deine PV-Anlage und speichere das Ergebnis.
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {calculations.map(calc => (
              <div key={calc.id} style={{
                background: v('--color-bg-card'), borderRadius: v('--radius-card'), padding: "16px",
                border: editingId === calc.id ? `1px solid ${v('--color-accent-border-strong')}` : `1px solid ${v('--color-border')}`,
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
                        width: "100%", padding: "8px 10px", borderRadius: v('--radius-pill'), fontSize: 14, fontWeight: 600,
                        background: v('--color-bg-input'), border: `1px solid ${v('--color-border-input')}`, color: v('--color-text-primary'),
                        fontFamily: v('--font-text'), outline: "none", marginBottom: 8,
                      }}
                      onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditingId(null); }}
                    />
                    <input
                      value={editDesc}
                      onChange={e => setEditDesc(e.target.value)}
                      placeholder="Beschreibung (optional)"
                      style={{
                        width: "100%", padding: "8px 10px", borderRadius: v('--radius-pill'), fontSize: 13,
                        background: v('--color-bg-input'), border: `1px solid ${v('--color-border-input')}`, color: v('--color-text-aaa'),
                        fontFamily: v('--font-text'), outline: "none", marginBottom: 10,
                      }}
                      onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditingId(null); }}
                    />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={saveEdit} style={{
                        flex: 1, padding: "8px 12px", borderRadius: v('--radius-button'), fontSize: 13, fontWeight: 600,
                        background: v('--color-accent'), border: "none", color: v('--color-text-on-accent'), cursor: "pointer",
                        fontFamily: v('--font-text'),
                      }}>
                        Speichern
                      </button>
                      <button onClick={() => setEditingId(null)} style={{
                        padding: "8px 12px", borderRadius: v('--radius-button'), fontSize: 13, fontWeight: 600,
                        background: v('--color-bg-input'), border: `1px solid ${v('--color-border-input')}`, color: v('--color-text-secondary'), cursor: "pointer",
                        fontFamily: v('--font-text'),
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
                          <div style={{ fontSize: 12, color: v('--color-text-label'), marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {calc.description}
                          </div>
                        )}
                        <div style={{ fontSize: 11, color: v('--color-text-faint'), marginTop: 3, display: "flex", alignItems: "center", gap: 6 }}>
                          {formatDate(calc.created_at)}
                          {(calc as any).flow_type === "empfehlung" && (
                            <span style={{ fontSize: 9, fontWeight: 700, color: v('--color-accent'), background: v('--color-accent-dim'), padding: "1px 5px", borderRadius: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>Empfohlen</span>
                          )}
                        </div>
                      </div>
                      <div style={{
                        fontSize: 18, fontWeight: 800, fontFamily: v('--font-mono'),
                        color: calc.amortisation_jahre ? v('--color-accent') : v('--color-negative'),
                        flexShrink: 0, marginLeft: 12,
                      }}>
                        {calc.amortisation_jahre ? `${calc.amortisation_jahre} J.` : ">25 J."}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 10, color: v('--color-text-muted'), textTransform: "uppercase", letterSpacing: "0.04em" }}>Anlage</div>
                        <div style={{ fontSize: 14, fontWeight: 600, fontFamily: v('--font-mono') }}>{calc.kwp} kWp</div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 10, color: v('--color-text-muted'), textTransform: "uppercase", letterSpacing: "0.04em" }}>Rendite 25J</div>
                        <div style={{ fontSize: 14, fontWeight: 600, fontFamily: v('--font-mono'), color: (calc.rendite_25j ?? 0) > 0 ? v('--color-positive') : v('--color-negative') }}>
                          {calc.rendite_25j != null ? `${calc.rendite_25j > 0 ? "+" : ""}${calc.rendite_25j.toLocaleString("de-DE")} €` : "—"}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => handleLoad(calc)} style={{
                        flex: 1, padding: "8px 12px", borderRadius: v('--radius-button'), fontSize: 13, fontWeight: 600,
                        background: v('--color-accent-dim'), border: `1px solid ${v('--color-accent-border')}`,
                        color: v('--color-accent'), cursor: "pointer", fontFamily: v('--font-text'),
                      }}>
                        Laden
                      </button>
                      <button onClick={() => startEditing(calc)} style={{
                        padding: "8px 12px", borderRadius: v('--radius-button'), fontSize: 13, fontWeight: 600,
                        background: v('--color-bg-input'), border: `1px solid ${v('--color-border-input')}`,
                        color: v('--color-text-secondary'), cursor: "pointer", fontFamily: v('--font-text'),
                      }}>
                        ✎
                      </button>
                      <button onClick={() => handleDelete(calc.id)} disabled={deleting === calc.id} style={{
                        padding: "8px 12px", borderRadius: v('--radius-button'), fontSize: 13, fontWeight: 600,
                        background: v('--color-bg-input'), border: `1px solid ${v('--color-border-input')}`,
                        color: deleting === calc.id ? v('--color-text-faint') : v('--color-text-secondary'), cursor: "pointer",
                        fontFamily: v('--font-text'),
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
          <Link href="/methodik" style={{ fontSize: 11, color: v('--color-text-faint'), textDecoration: "none" }}>Methodik</Link>
          <Link href="/impressum" style={{ fontSize: 11, color: v('--color-text-faint'), textDecoration: "none" }}>Impressum</Link>
          <Link href="/datenschutz" style={{ fontSize: 11, color: v('--color-text-faint'), textDecoration: "none" }}>Datenschutz</Link>
        </div>
      </div>
    </div>
  );
}
