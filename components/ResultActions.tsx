"use client";
import Link from "next/link";
import { v } from "../lib/theme";
import { IconCheck, IconLink, IconShare, IconWhatsApp, IconArrowRight } from "./Icons";

interface ResultActionsProps {
  copied: boolean;
  canShare: boolean;
  user: { id: string; email?: string } | null;
  saving: boolean;
  saved: boolean;
  savedCalcId: string | null;
  onCopy: () => void;
  onNativeShare: () => void;
  onWhatsApp: () => void;
  onSave: () => void;
  onLoginClick: () => void;
}

export default function ResultActions({
  copied, canShare, user, saving, saved, savedCalcId,
  onCopy, onNativeShare, onWhatsApp, onSave, onLoginClick,
}: ResultActionsProps) {
  const iconBtnStyle = (active?: boolean) => ({
    width: 40, height: 40, borderRadius: v('--radius-md'), cursor: "pointer" as const,
    background: active ? v('--color-accent-dim') : v('--color-bg'),
    border: `1px solid ${active ? v('--color-accent') : v('--color-border-accent')}`,
    color: v('--color-accent'),
    display: "flex" as const, alignItems: "center" as const, justifyContent: "center" as const, flexShrink: 0 as const,
    transition: "all 0.2s",
  });

  return (
    <>
      <div style={{ display: "flex", gap: 5, alignItems: "center", padding: "10px 0", marginBottom: 16 }}>
        <button onClick={onCopy} title={copied ? "Kopiert!" : "Link kopieren"} style={iconBtnStyle(copied)}>
          {copied ? <IconCheck size={16} /> : <IconLink size={16} />}
        </button>
        {canShare && (
          <button onClick={onNativeShare} title="Teilen" style={iconBtnStyle()}>
            <IconShare size={16} />
          </button>
        )}
        <button onClick={onWhatsApp} title="WhatsApp" style={iconBtnStyle()}>
          <IconWhatsApp size={16} />
        </button>
        {user ? (
          <button onClick={onSave} disabled={saving} style={{
            flex: 1, height: 40, borderRadius: v('--radius-md'), fontSize: 14, fontWeight: 700,
            background: saved ? v('--color-accent-dim') : v('--color-accent'),
            border: saved ? `1px solid ${v('--color-accent')}` : "none",
            color: saved ? v('--color-accent') : v('--color-text-on-accent'),
            cursor: saving ? "wait" : "pointer", fontFamily: v('--font-text'), transition: "all 0.2s",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}>
            {saved ? <><IconCheck size={14} /> Gespeichert!</> : saving ? "Speichert..." : "Ergebnis speichern"}
          </button>
        ) : (
          <button onClick={onLoginClick} style={{
            flex: 1, height: 40, borderRadius: v('--radius-md'), fontSize: 14, fontWeight: 700,
            background: v('--color-accent'), border: "none",
            color: v('--color-text-on-accent'), cursor: "pointer", fontFamily: v('--font-text'),
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            Ergebnis speichern
          </button>
        )}
      </div>
      {user && savedCalcId && !saved && (
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <Link href="/dashboard" style={{ fontSize: 12, color: v('--color-text-muted'), textDecoration: "none", borderBottom: `1px dashed ${v('--color-text-faint')}` }}>
            Meine Berechnungen <IconArrowRight size={10} />
          </Link>
        </div>
      )}
    </>
  );
}
