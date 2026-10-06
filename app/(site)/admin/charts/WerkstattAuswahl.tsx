"use client";

import SelectField from "../../../../components/SelectField";
import { v } from "../../../../lib/theme";
import type { Ebene } from "./werkstatt-bestand";

type Option = { id: string; name: string };

export type Auswahl = {
  w: string;
  ebene: Ebene;
  ebenen: { id: Ebene; label: string; moeglich: boolean }[];
  laender: Option[];
  kreise: Option[];
  gemeinden: Option[];
  land: string;
  kreis: string;
  gemeinde: string;
  /** null where the widget does not use the shared actions (no choice to offer). */
  aktionen: "menu" | "primary" | null;
  /** Embed previews: on our own page (onsite) or as an external embed. */
  kontext: "eigen" | "extern" | null;
  zeigtGebiet: boolean;
};

/**
 * Selection for the one preview. Every change is a full navigation: the race
 * engine, maps and the town weather script start fresh, and nothing of the
 * previous area keeps running in the background.
 */
export default function WerkstattAuswahl({ auswahl }: { auswahl: Auswahl }) {
  const gehe = (aenderung: Partial<Record<string, string>>) => {
    const params = new URLSearchParams({
      ebene: auswahl.ebene,
      ...(auswahl.land && { land: auswahl.land }),
      ...(auswahl.kreis && { kreis: auswahl.kreis }),
      ...(auswahl.gemeinde && { gemeinde: auswahl.gemeinde }),
      ...(auswahl.aktionen && { aktionen: auswahl.aktionen }),
      ...(auswahl.kontext && { kontext: auswahl.kontext }),
    });
    for (const [k, wert] of Object.entries(aenderung)) {
      if (wert) params.set(k, wert);
      else params.delete(k);
    }
    window.location.assign(`/admin/charts/${auswahl.w}?${params}`);
  };
  const feld = (label: string, inhalt: React.ReactNode) => (
    <label style={{ display: "grid", gap: 4, fontSize: v("--font-size-caption"), color: v("--color-text-muted") }}>
      {label}
      {inhalt}
    </label>
  );
  const e = auswahl.ebene;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "end" }}>
      {auswahl.zeigtGebiet && feld("Ebene", (
        <SelectField ariaLabel="Ebene" value={e} onChange={(ev) => gehe({ ebene: ev.target.value })} maxWidth={220}>
          {auswahl.ebenen.map((x) => <option key={x.id} value={x.id} disabled={!x.moeglich}>{x.label}{x.moeglich ? "" : " (nicht unterstützt)"}</option>)}
        </SelectField>
      ))}
      {auswahl.zeigtGebiet && e !== "de" && auswahl.laender.length > 0 && feld("Bundesland", (
        <SelectField ariaLabel="Bundesland" value={auswahl.land} onChange={(ev) => gehe({ land: ev.target.value, kreis: "", gemeinde: "" })} maxWidth={240}>
          {auswahl.laender.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </SelectField>
      ))}
      {auswahl.zeigtGebiet && (e === "landkreis" || e === "gemeinde") && feld("Landkreis", auswahl.kreise.length ? (
        <SelectField ariaLabel="Landkreis" value={auswahl.kreis} onChange={(ev) => gehe({ kreis: ev.target.value, gemeinde: "" })} maxWidth={280}>
          {auswahl.kreise.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </SelectField>
      ) : <span>keine Kreise im Register</span>)}
      {auswahl.zeigtGebiet && e === "gemeinde" && feld("Gemeinde", auswahl.gemeinden.length ? (
        <SelectField ariaLabel="Gemeinde" value={auswahl.gemeinde} onChange={(ev) => gehe({ gemeinde: ev.target.value })} maxWidth={280}>
          {auswahl.gemeinden.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </SelectField>
      ) : <span>keine Gemeinden im Register</span>)}
      {auswahl.aktionen && feld("Aktionen", (
        <SelectField ariaLabel="Aktionsdarstellung" value={auswahl.aktionen} onChange={(ev) => gehe({ aktionen: ev.target.value })} maxWidth={260}>
          <option value="menu">Kompaktes Optionsmenü</option>
          <option value="primary">Sichtbare Aktionsfußleiste</option>
        </SelectField>
      ))}
      {auswahl.kontext && feld("Einbettung", (
        <SelectField ariaLabel="Einbettkontext" value={auswahl.kontext} onChange={(ev) => gehe({ kontext: ev.target.value })} maxWidth={260}>
          <option value="eigen">Auf eigener Seite (onsite)</option>
          <option value="extern">Fremde Seite (mit Marke)</option>
        </SelectField>
      ))}
    </div>
  );
}
