"use client";

import { useState } from "react";
import { MastrHeroSection } from "../../../../components/MastrHeroSection";
import { useWidgetTheme } from "../../../../lib/useWidgetTheme";
import ChartActionBar from "../../../../components/ChartActionBar";
import { PoweredBy } from "../../../../components/PoweredBy";

// Where the share buttons point — the canonical live page for this widget.
const SHARE_URL = "https://solar-check.io/";
const SHARE_TEXT = "PV-Anlagen in Deutschland – Solar Check";

export default function KarteWidget() {
  const [showEmbed, setShowEmbed] = useState(true);
  const [showBranding, setShowBranding] = useState(true);

  // Theme via URL params + same-origin postMessage (shared hook). Also picks up
  // the embed flag (embed=0 on the gallery hides the "Einbetten" action) and the
  // branding flag (branding=0 hides the "Powered by" mark).
  useWidgetTheme({
    onSettings: (s) => {
      if (typeof s.embed === "boolean") setShowEmbed(s.embed);
      if (typeof s.branding === "boolean") setShowBranding(s.branding);
    },
  });

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
      <MastrHeroSection />
      <div style={{ marginTop: 12 }}>
        <div
          style={{
            height: 1,
            background: "var(--widget-muted)",
            opacity: 0.2,
            marginBottom: 8,
          }}
        />
        <div
          style={{
            fontSize: 10.5,
            color: "var(--widget-muted)",
            display: "flex",
            justifyContent: showBranding ? "space-between" : "flex-start",
            alignItems: "center",
            gap: 8,
          }}
        >
          <ChartActionBar
            variant="bar"
            showDownload={false}
            onDownload={() => {}}
            onCopyLink={() =>
              navigator.clipboard?.writeText(`${SHARE_TEXT}\n${SHARE_URL}`).catch(() => {})
            }
            onWhatsApp={() =>
              window.open(
                `https://wa.me/?text=${encodeURIComponent(`${SHARE_TEXT}\n${SHARE_URL}`)}`,
                "_blank",
              )
            }
            onTwitter={() =>
              window.open(
                `https://twitter.com/intent/tweet?text=${encodeURIComponent(SHARE_TEXT)}&url=${encodeURIComponent(SHARE_URL)}`,
                "_blank",
              )
            }
            onEmbed={
              showEmbed
                ? () => window.open("/energie-widgets#karte", "_blank", "noopener")
                : undefined
            }
            isExporting={false}
            canNativeShare={false}
            size={30}
          />
          {showBranding && <PoweredBy />}
        </div>
      </div>
    </div>
  );
}

