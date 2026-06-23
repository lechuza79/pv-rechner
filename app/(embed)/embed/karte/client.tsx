"use client";

import { MastrHeroSection } from "../../../../components/MastrHeroSection";
import { useWidgetTheme } from "../../../../lib/useWidgetTheme";

export default function KarteWidget() {
  useWidgetTheme();
  return (
    <div
      style={{
        background: "var(--widget-bg)",
        color: "var(--widget-fg)",
        borderRadius: "var(--widget-border-radius)",
        fontFamily: "var(--widget-font-family)",
        padding: 16,
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      <MastrHeroSection embedded />
    </div>
  );
}
