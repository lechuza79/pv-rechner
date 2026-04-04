"use client";

import { v } from "../lib/theme";
import { IconDownload, IconShare, IconWhatsApp, IconTwitter } from "./Icons";

interface ChartExportBarProps {
  onDownload: () => void;
  onShare?: () => void;
  onWhatsApp?: () => void;
  onTwitter?: () => void;
  isExporting: boolean;
  canNativeShare: boolean;
}

const btnBase: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: v('--radius-md'),
  cursor: "pointer",
  background: v('--color-bg'),
  border: `1px solid ${v('--color-border-accent')}`,
  color: v('--color-accent'),
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  transition: "opacity 0.2s",
  padding: 0,
};

export default function ChartExportBar({
  onDownload, onShare, onWhatsApp, onTwitter, isExporting, canNativeShare,
}: ChartExportBarProps) {
  return (
    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", flexShrink: 0 }}>
      <button
        onClick={onDownload}
        disabled={isExporting}
        title="Als Bild herunterladen"
        style={{ ...btnBase, opacity: isExporting ? 0.5 : 1, cursor: isExporting ? "wait" : "pointer" }}
      >
        <IconDownload size={15} />
      </button>
      {canNativeShare && onShare && (
        <button onClick={onShare} disabled={isExporting} title="Teilen" style={{ ...btnBase, opacity: isExporting ? 0.5 : 1 }}>
          <IconShare size={15} />
        </button>
      )}
      {onWhatsApp && (
        <button onClick={onWhatsApp} title="WhatsApp" style={btnBase}>
          <IconWhatsApp size={15} />
        </button>
      )}
      {onTwitter && (
        <button onClick={onTwitter} title="X / Twitter" style={btnBase}>
          <IconTwitter size={15} />
        </button>
      )}
    </div>
  );
}
