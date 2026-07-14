"use client";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { v } from "../../../../lib/theme";
import { IconArrowRight } from "../../../../components/Icons";
import { FundingStatusBadge, FundingRates, FundingConditions } from "../../../../components/FundingProgramParts";
import { fundingStandLabel, type FundingProgram } from "../../../../lib/funding-programs";

const nf = (n: number) => Math.round(n).toLocaleString("de-DE");

// Detail-Modal: zeigt alles, was wir zum Programm haben, ohne die Seite zu
// verlassen (Portal + Esc/Klick-außen schließt).
function FundingProgramModal({ program, onClose }: { program: FundingProgram; onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  if (!mounted) return null;
  return createPortal(
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" style={{ background: v("--color-bg"), borderRadius: v("--radius-lg"), maxWidth: 480, width: "100%", maxHeight: "85vh", overflowY: "auto", padding: "20px 18px", boxShadow: v("--shadow-lg"), fontFamily: v("--font-text"), color: v("--color-text-primary") }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 8 }}>
          <span style={{ fontSize: 17, fontWeight: 800, lineHeight: 1.25 }}>{program.name}</span>
          <button onClick={onClose} aria-label="Schließen" style={{ border: "none", background: "transparent", fontSize: 24, lineHeight: 0.8, cursor: "pointer", color: v("--color-text-muted"), padding: 0 }}>×</button>
        </div>
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          <FundingStatusBadge status={program.status} />
          <span style={{ fontSize: 12, color: v("--color-text-secondary") }}>{program.traeger}</span>
        </div>
        <div style={{ fontSize: 13, color: v("--color-text-secondary"), marginBottom: 12 }}>
          Förderfähig: <span style={{ color: v("--color-text-primary") }}>{program.coveredCosts}</span>{program.maxFoerderung ? ` · ${program.maxFoerderung}` : ""}
        </div>
        <div style={{ marginBottom: 14 }}>
          <FundingRates rates={program.rates} bordered />
        </div>
        <div style={{ marginBottom: program.conditions.length > 0 ? 14 : 0 }}>
          <FundingConditions conditions={program.conditions} />
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", fontSize: 12 }}>
          <a href={program.url} target="_blank" rel="noopener noreferrer" style={{ color: v("--color-accent"), textDecoration: "none", fontWeight: 700 }}>Zur offiziellen Quelle ›</a>
          <span style={{ color: v("--color-text-muted") }}>{fundingStandLabel(program)}</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}

interface ResultFundingProps {
  loading: boolean;
  /** PLZ candidates from /api/funding; null = not resolved yet. */
  candidates: { ort: string; ags: string }[] | null;
  chosenAgs: string | null;
  onChooseAgs: (ags: string) => void;
  /** All programs matching the chosen AGS (bund + regional). */
  programs: FundingProgram[];
  /** Programs that yield a concrete, currently-active € grant. */
  applied: { program: FundingProgram; amount: number }[];
  total: number;
  enabled: boolean;
  onToggle: (b: boolean) => void;
  brutto: number;
}

export default function ResultFunding({
  loading, candidates, chosenAgs, onChooseAgs,
  programs, applied, total, enabled, onToggle, brutto,
}: ResultFundingProps) {
  const [modalProgram, setModalProgram] = useState<FundingProgram | null>(null);

  // Programmname als Link → öffnet das Detail-Modal (kein Seitenwechsel).
  const ProgramLink = ({ p, children }: { p: FundingProgram; children?: React.ReactNode }) => (
    <button
      onClick={() => setModalProgram(p)}
      style={{ border: "none", background: "transparent", padding: 0, font: "inherit", color: v("--color-accent"), cursor: "pointer", textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: 2 }}
    >
      {children ?? p.name}
    </button>
  );

  // Nothing to show until a PLZ has been resolved (or a program was pre-armed).
  if (!loading && candidates === null && !chosenAgs) return null;

  const card: React.CSSProperties = {
    background: v("--color-bg"), borderRadius: v("--radius-lg"),
    padding: "16px 16px", marginBottom: 16, border: `1px solid ${v("--color-border")}`,
  };
  const heading = (
    <div style={{ fontSize: 13, fontWeight: 700, color: v("--color-text-primary"), marginBottom: 10 }}>
      Förderung
    </div>
  );

  if (loading && !chosenAgs) {
    return (
      <div style={card}>
        {heading}
        <div style={{ fontSize: 12, color: v("--color-text-muted") }}>Förderprogramme werden geprüft …</div>
      </div>
    );
  }

  // Ambiguous PLZ: ask which municipality the user lives in before computing.
  if (!chosenAgs && candidates && candidates.length > 1) {
    return (
      <div style={card}>
        {heading}
        <div style={{ fontSize: 12, color: v("--color-text-secondary"), marginBottom: 10 }}>
          Diese PLZ deckt mehrere Orte ab — wo wohnst du?
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {candidates.map((c) => (
            <button key={c.ags} onClick={() => onChooseAgs(c.ags)} style={{
              padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer",
              background: v("--color-bg-muted"), color: v("--color-text-primary"),
              border: `1px solid ${v("--color-border")}`, borderRadius: v("--radius-sm"),
            }}>
              {c.ort}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (!chosenAgs) return null;

  // Location label = most specific matched non-bund program, else fall back to
  // the picked candidate's place name.
  const regional = programs.filter((p) => p.level !== "bund");
  const mostSpecific = regional[regional.length - 1];
  const ortLabel = mostSpecific?.region
    ?? candidates?.find((c) => c.ags === chosenAgs)?.ort
    ?? null;

  const hasGrant = applied.length > 0;
  const effektiv = Math.max(0, brutto - (enabled ? total : 0));

  return (
    <div style={{ ...card, borderColor: hasGrant ? v("--color-positive") : v("--color-border") }}>
      {heading}

      {hasGrant ? (
        <>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginBottom: enabled ? 12 : 0 }}>
            <span style={{
              position: "relative", width: 38, height: 22, borderRadius: 999, flexShrink: 0,
              background: enabled ? v("--color-positive") : v("--color-border-muted"), transition: "background 0.15s",
            }}>
              <span style={{
                position: "absolute", top: 2, left: enabled ? 18 : 2, width: 18, height: 18, borderRadius: "50%",
                background: v("--color-bg"), transition: "left 0.15s", boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
              }} />
              <input type="checkbox" checked={enabled} onChange={(e) => onToggle(e.target.checked)} style={{ position: "absolute", opacity: 0, width: "100%", height: "100%", margin: 0, cursor: "pointer" }} />
            </span>
            <span style={{ fontSize: 13, color: v("--color-text-primary"), fontWeight: 600 }}>
              Förderung anrechnen{ortLabel ? ` (${ortLabel})` : ""}
            </span>
          </label>

          {enabled ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 7, fontSize: 13 }}>
              {applied.map(({ program, amount }) => (
                <div key={program.id} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <ProgramLink p={program} />
                  <span style={{ fontFamily: v("--font-mono"), fontWeight: 700, color: v("--color-positive"), whiteSpace: "nowrap" }}>− {nf(amount)} €</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", borderTop: `1px solid ${v("--color-border")}`, paddingTop: 7 }}>
                <span style={{ color: v("--color-text-secondary") }}>Investition nach Förderung</span>
                <span style={{ fontFamily: v("--font-mono"), fontWeight: 700, color: v("--color-text-primary") }}>{nf(effektiv)} €</span>
              </div>
              <p style={{ fontSize: 11, lineHeight: 1.5, color: v("--color-text-faint"), margin: "2px 0 0" }}>
                Fördersätze ohne Gewähr — verbindlich ist die offizielle Quelle des Programms, Budgets können erschöpft sein.
              </p>
            </div>
          ) : mostSpecific ? (
            <div style={{ fontSize: 12, marginTop: 8 }}>
              <ProgramLink p={mostSpecific}>Details zu {mostSpecific.name} ›</ProgramLink>
            </div>
          ) : null}
        </>
      ) : (
        <div style={{ fontSize: 12, color: v("--color-text-secondary"), lineHeight: 1.6 }}>
          {mostSpecific ? (
            <>
              Für {ortLabel ?? "deinen Ort"} liegt uns mit dem{" "}
              <ProgramLink p={mostSpecific} /> ein Programm vor, das sich nicht pauschal
              pro Anlage berechnen lässt. Die Details kannst du dir direkt ansehen.
            </>
          ) : (
            <>Für deinen Ort kennen wir kein aktives kommunales Förderprogramm. Bundesweit gilt die 0 % Mehrwertsteuer auf PV — die steckt bereits in den Marktpreisen.</>
          )}
        </div>
      )}

      <Link href="/photovoltaik-foerderung" style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 12, fontSize: 12, color: v("--color-accent"), textDecoration: "none" }}>
        Alle Förderprogramme <IconArrowRight size={11} />
      </Link>

      {modalProgram && <FundingProgramModal program={modalProgram} onClose={() => setModalProgram(null)} />}
    </div>
  );
}
