"use client";

import { useState } from "react";
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
    router.push(`/?${sp.toString()}`);
  };

  const handleLogout = async () => {
    await signOut();
    router.push("/");
    router.refresh();
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
        <p style={{ fontSize: 13, color: "#666", marginBottom: 24 }}>{userEmail}</p>

        {calculations.length === 0 ? (
          <div style={{
            background: "#151515", borderRadius: 14, padding: "32px 20px",
            border: "1px solid #252525", textAlign: "center",
          }}>
            <div style={{ fontSize: 14, color: "#888", marginBottom: 12 }}>
              Noch keine Berechnungen gespeichert.
            </div>
            <Link href="/" style={{
              display: "inline-block", padding: "10px 20px", borderRadius: 10,
              background: "#22c55e", color: "#000", fontSize: 13, fontWeight: 700,
              textDecoration: "none",
            }}>
              Zum Rechner
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {calculations.map(calc => (
              <div key={calc.id} style={{
                background: "#151515", borderRadius: 14, padding: "16px",
                border: "1px solid #252525",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{calc.name}</div>
                    <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>
                      {formatDate(calc.created_at)}
                    </div>
                  </div>
                  <div style={{
                    fontSize: 18, fontWeight: 800, fontFamily: "'JetBrains Mono',monospace",
                    color: calc.amortisation_jahre ? "#22c55e" : "#ef4444",
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
                  <button onClick={() => handleDelete(calc.id)} disabled={deleting === calc.id} style={{
                    padding: "8px 12px", borderRadius: 10, fontSize: 13, fontWeight: 600,
                    background: "#161616", border: "1px solid #2a2a2a",
                    color: deleting === calc.id ? "#555" : "#888", cursor: "pointer",
                    fontFamily: "'DM Sans',system-ui,sans-serif",
                  }}>
                    {deleting === calc.id ? "..." : "Löschen"}
                  </button>
                </div>
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
