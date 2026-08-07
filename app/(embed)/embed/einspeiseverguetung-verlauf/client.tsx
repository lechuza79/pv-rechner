"use client";

import { useState } from "react";
import VerlaufMitMeilensteinen from "../../../(site)/einspeiseverguetung-tabelle/VerlaufMitMeilensteinen";
import type { VerlaufJahr } from "../../../(site)/einspeiseverguetung-tabelle/VerlaufsChart";
import { useWidgetTheme } from "../../../../lib/useWidgetTheme";
import {
  WIDGET_SETTINGS_DEFAULTS,
  type WidgetSettings,
} from "../../../../lib/widget-settings";

/** Themebare Hülle für den Vergütungs-Verlauf im Embed-Kontext — reicht alle
 *  funktionalen Schalter durch (embed/branding/share/onsite), wie beim
 *  Zubau-Embed. */
export default function VerlaufEmbed({ jahre }: { jahre: VerlaufJahr[] }) {
  const [settings, setSettings] = useState<WidgetSettings>(WIDGET_SETTINGS_DEFAULTS);
  useWidgetTheme({
    onSettings: (partial) => setSettings((prev) => ({ ...prev, ...partial })),
  });

  return (
    // Breitengrenze der Konvention: ohne sie füllt der Chart jede angebotene
    // iframe-Breite und die Kurve wirkt flacher, als sie ist.
    <div style={{ maxWidth: 860, marginInline: "auto" }}>
      <VerlaufMitMeilensteinen
        jahre={jahre}
        variant="embed"
        showEmbed={settings.embed}
        branding={settings.branding}
        share={settings.share}
        onsite={settings.onsite}
      />
    </div>
  );
}
