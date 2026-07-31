"use client";

import { useState } from "react";
import { MastrHeroSection } from "../../../../components/MastrHeroSection";
import { useWidgetTheme } from "../../../../lib/useWidgetTheme";
import {
  WidgetFooter,
  WidgetSourceEdge,
  useShareOnlyActions,
} from "../../../../components/WidgetExport";
import { WIDGETS, WIDGET_MAX_WIDTH } from "../../../../lib/widget-registry";
import {
  WIDGET_SETTINGS_DEFAULTS,
  type WidgetSettings,
} from "../../../../lib/widget-settings";

// Identität (Titel, Teilen-Ziel, Quellen, nächster Schritt) kommt aus dem
// Register — ein Eintrag speist Fußzeile, Quellen-Kante und Zitat.
const WIDGET = WIDGETS.karte;

export default function KarteWidget() {
  const [settings, setSettings] = useState<WidgetSettings>(WIDGET_SETTINGS_DEFAULTS);

  // Theme + funktionale Schalter (share, branding, embed, onsite) über den
  // geteilten Haken — URL-Parameter und postMessage wirken damit gleich.
  useWidgetTheme({
    onSettings: (partial) => setSettings((prev) => ({ ...prev, ...partial })),
  });

  // Kein Bild-Export: die Karte ist kein aufnehmbares SVG (`exportable: false`
  // im Register). Teilen-Text und -Ziel kommen trotzdem aus dem Register.
  const actions = useShareOnlyActions(WIDGET);

  return (
    <div
      style={{
        position: "relative",
        background: "var(--widget-bg)",
        color: "var(--widget-fg)",
        borderRadius: "var(--widget-border-radius)",
        fontFamily: "var(--widget-font-family)",
        padding: 16,
        paddingRight: 22,
        maxWidth: WIDGET_MAX_WIDTH,
        margin: "0 auto",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      {/* Quelle vertikal an der rechten Kante (geteilter Baustein), nie als
          horizontaler Block. Die Karte selbst zeigt deshalb keinen eigenen
          Credit mehr (showSource={false}) — sonst stünde er zweimal. */}
      <WidgetSourceEdge widget={WIDGET} visible={!settings.onsite} />
      <MastrHeroSection showSource={false} />
      <div style={{ marginTop: 12 }}>
        <div style={{ height: 1, background: "var(--widget-muted)", opacity: 0.2 }} />
        {/* Fußzeile aus dem geteilten Baustein: nächster Schritt, Aktionen
            (inkl. „Zitieren"), Marke. */}
        <WidgetFooter
          widget={WIDGET}
          chartExport={actions}
          share={settings.share}
          branding={settings.branding}
          showEmbed={settings.embed}
          onsite={settings.onsite}
        />
      </div>
    </div>
  );
}
