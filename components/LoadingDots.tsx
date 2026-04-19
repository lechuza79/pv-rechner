"use client";
import { v } from "../lib/theme";

// Inline value-placeholder: three bouncing dots. Used anywhere a numeric
// value is still loading but the surrounding label + layout is already known.
// Matches the BouncingDots pattern originally defined in app/energie/client.tsx.

export function LoadingDots({
  size = 4,
  color,
  gap = 3,
  baseline = true,
}: {
  size?: number;
  color?: string;
  gap?: number;
  /** If true, align with text baseline. If false, center vertically. */
  baseline?: boolean;
}) {
  const dotColor = color ?? v("--color-text-muted");
  const dot = (delay: number) => ({
    width: size,
    height: size,
    borderRadius: "50%",
    background: dotColor,
    animation: `sc-dots 1.2s ease-in-out ${delay}s infinite`,
    display: "inline-block",
  });
  return (
    <span
      role="status"
      aria-label="Lade"
      style={{
        display: "inline-flex",
        gap,
        alignItems: baseline ? "baseline" : "center",
        verticalAlign: baseline ? "baseline" : "middle",
      }}
    >
      <span style={dot(0)} />
      <span style={dot(0.15)} />
      <span style={dot(0.3)} />
    </span>
  );
}
