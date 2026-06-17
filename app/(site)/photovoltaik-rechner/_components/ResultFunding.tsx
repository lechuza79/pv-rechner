"use client";
import Link from "next/link";
import { v } from "../../../../lib/theme";
import { IconArrowRight } from "../../../../components/Icons";
import type { FundingProgram } from "../../../../lib/funding-programs";

const nf = (n: number) => Math.round(n).toLocaleString("de-DE");

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

          {enabled && (
            <div style={{ display: "flex", flexDirection: "column", gap: 7, fontSize: 13 }}>
              {applied.map(({ program, amount }) => (
                <div key={program.id} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <span style={{ color: v("--color-text-secondary") }}>{program.name}</span>
                  <span style={{ fontFamily: v("--font-mono"), fontWeight: 700, color: v("--color-positive"), whiteSpace: "nowrap" }}>− {nf(amount)} €</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", borderTop: `1px solid ${v("--color-border")}`, paddingTop: 7 }}>
                <span style={{ color: v("--color-text-secondary") }}>Investition nach Förderung</span>
                <span style={{ fontFamily: v("--font-mono"), fontWeight: 700, color: v("--color-text-primary") }}>{nf(effektiv)} €</span>
              </div>
            </div>
          )}
        </>
      ) : (
        <div style={{ fontSize: 12, color: v("--color-text-secondary"), lineHeight: 1.6 }}>
          {regional.length > 0 ? (
            <>
              Für {ortLabel ?? "deinen Ort"} liegt uns ein Programm vor, das sich nicht pauschal
              pro Anlage berechnen lässt{regional[regional.length - 1] ? ` (${regional[regional.length - 1].name})` : ""}.
              Details findest du in der Förder-Übersicht.
            </>
          ) : (
            <>Für deinen Ort kennen wir kein aktives kommunales Förderprogramm. Bundesweit gilt die 0 % Mehrwertsteuer auf PV — die steckt bereits in den Marktpreisen.</>
          )}
        </div>
      )}

      <Link href="/photovoltaik-foerderung" style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 12, fontSize: 12, color: v("--color-accent"), textDecoration: "none" }}>
        Alle Förderprogramme <IconArrowRight size={11} />
      </Link>
    </div>
  );
}
