"use client";
import type { ReactNode } from "react";
import InfoTooltip from "../InfoTooltip";
import { v, iconSizes } from "../../lib/theme";

/** Shared result metric: numeric value and visually subordinate unit. */
export default function ResultStatCard({ label, value, unit, positive, help, helpTitle, helpAriaLabel }: { label: string; value: string; unit?: string; positive?: boolean; help?: ReactNode; helpTitle?: string; helpAriaLabel?: string }) {
  return (
    <div style={{ padding: "14px 12px", borderRadius: v('--radius-md'), background: v('--color-bg'), border: `1px solid ${v('--color-border')}`, textAlign: "center" }}>
      <div style={{ fontSize: v("--font-size-micro"), fontWeight: 700, color: v('--color-text-muted'), textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 3 }}>
        {label}
        {help && <InfoTooltip title={helpTitle} ariaLabel={helpAriaLabel ?? "Mehr Infos"} size={iconSizes.sm}>{help}</InfoTooltip>}
      </div>
      <div style={{ fontSize: v("--font-size-h3"), fontWeight: 800, fontFamily: v('--font-mono'), color: positive ? v('--color-positive') : v('--color-text-primary') }}>{value}{unit && <> <span className="wp-stat-unit">{unit}</span></>}</div>
    </div>
  );
}
