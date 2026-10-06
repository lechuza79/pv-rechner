import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminSession } from "../../../../lib/admin-guard";
import { v, space, pad } from "../../../../lib/theme";
import { WIDGETS, embedExamplePath, type WidgetDef, type WidgetId } from "../../../../lib/widget-registry";
import { getRegionById } from "../../../../lib/atlas";
import { EINBINDUNG_TEXT, WERKSTATT_BESTAND, BEISPIEL_GEBIET, type Einbindung } from "./werkstatt-bestand";
import { eins, regionalDaten, type Such } from "./werkstatt-daten";
import WidgetGalerie, { type Karte } from "./WidgetGalerie";
import type { VorschauDaten } from "./WerkstattVorschau";

export const metadata = { title: "Widget-Galerie – Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// The widget gallery: every registered widget as a card with its REAL rendering
// (monitor widgets for Landkreis Würzburg, embed widgets through their route with
// the registry's example place). A card opens the detail page with settings.

const SCHRITTE: { titel: string; text: string }[] = [
  {
    titel: "1. Eintrag ins Register",
    text: "lib/widget-registry.ts: Titel, Art (Werkzeug oder Chart), Teilen-Ziel, Datenquellen, ein nächster Schritt. Daraus kommen später Fußzeile, Bild-Fuß und Galerie — nichts davon wird ein zweites Mal getippt.",
  },
  {
    titel: "2. Karte bauen",
    text: "Das Chart selbst. Alles Interaktive (Umschalter, Knöpfe) bekommt die Markierung „nie im Bild“; Hilfetexte kommen als „?“ und melden sich von selbst am Bild-Fuß an.",
  },
  {
    titel: "3. Was nur das Bild braucht",
    text: "Skala, Legende und der gewählte Zustand (Zeitraum, Region, Variante) werden als „nur im Bild“ ergänzt. Online erklärt das Überfahren, im Bild niemand.",
  },
  {
    titel: "4. Die zwei Fußzeilen",
    text: "Auf der Seite die geteilte Fußzeile (nächster Schritt links, Aktionen rechts, Marke darunter), im Bild den Bild-Fuß (Legende, Fußnoten, Datenquelle links, Marke rechts). Beide bekommen den Register-Eintrag und sind damit automatisch einheitlich.",
  },
  {
    titel: "5. Am Bild prüfen, nicht am Bildschirm",
    text: "Herunterladen klicken und das PNG ansehen: Legende da? Skala da? Gewählter Zustand? Keine toten Knöpfe? Der Test e2e/widget-export.spec.ts prüft genau das automatisch.",
  },
];


const KURZ = { gemeinde: "Gemeinde", landkreis: "Landkreis", bundesland: "Bundesland", de: "Deutschland" } as const;

export default async function WidgetGaleriePage(props: { searchParams: Promise<Such> }) {
  if (!(await isAdminSession())) redirect("/login?next=/admin/charts");
  const such = await props.searchParams;
  const filter = eins(such.stand) as Einbindung | "";
  const ids = (Object.keys(WERKSTATT_BESTAND) as WidgetId[]).filter((id) => !filter || WERKSTATT_BESTAND[id].einbindung === filter);

  // One regional data set serves every monitor card; it is loaded only when such a card is listed.
  let daten: VorschauDaten | null = null;
  if (ids.some((id) => WERKSTATT_BESTAND[id].vorschau.art === "monitor")) {
    const region = await getRegionById(BEISPIEL_GEBIET.landkreis);
    if (region) daten = await regionalDaten(region, true);
  }

  const karten: Karte[] = ids.map((id) => {
    const e = WERKSTATT_BESTAND[id];
    const def = WIDGETS[id] as WidgetDef;
    const vorschau: Karte["vorschau"] = e.vorschau.art === "monitor"
      ? { art: "monitor", schluessel: e.vorschau.schluessel }
      : e.vorschau.art === "einbettung"
        ? { art: "einbettung", src: `${embedExamplePath(def)}${embedExamplePath(def)?.includes("?") ? "&" : "?"}onsite=1` }
        : { art: "keine", grund: e.vorschau.grund };
    return { id, titel: def.title, stand: EINBINDUNG_TEXT[e.einbindung], unter: e.ebenen.map((x) => KURZ[x]).join(", "), vorschau };
  });

  const alle = Object.keys(WERKSTATT_BESTAND) as WidgetId[];
  const reiter: { text: string; wert: Einbindung | ""; zahl: number }[] = [
    { text: "Alle", wert: "", zahl: alle.length },
    ...(["zentral", "teilweise", "separat"] as const).map((s) => ({ text: EINBINDUNG_TEXT[s], wert: s, zahl: alle.filter((id) => WERKSTATT_BESTAND[id].einbindung === s).length })),
  ];

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto" }}>
      <nav aria-label="Filter" style={{ display: "flex", flexWrap: "wrap", gap: space.sm, alignItems: "center", borderBottom: `1px solid ${v("--color-border-muted")}`, paddingBottom: space.lg, marginBottom: space.xl }}>
        {reiter.map((r) => {
          const aktiv = r.wert === filter;
          return (
            <Link key={r.text} href={r.wert ? `/admin/charts?stand=${r.wert}` : "/admin/charts"} aria-current={aktiv ? "page" : undefined}
              style={{ padding: pad("sm", "lg"), borderRadius: v("--radius-md"), border: `1px solid ${aktiv ? v("--color-accent") : v("--color-border")}`, background: aktiv ? v("--color-accent-dim") : v("--color-bg-muted"), color: aktiv ? v("--color-accent") : v("--color-text-secondary"), fontSize: v("--font-size-body"), textDecoration: "none" }}>
              {r.text} <span style={{ opacity: 0.7 }}>{r.zahl}</span>
            </Link>
          );
        })}
        <Link href="/admin/charts/bedienelemente" style={{ marginLeft: "auto", padding: pad("sm", "lg"), borderRadius: v("--radius-md"), border: `1px solid ${v("--color-border")}`, color: v("--color-text-secondary"), fontSize: v("--font-size-body"), textDecoration: "none" }}>
          Gemeinsame Bedienelemente →
        </Link>
      </nav>

      {daten && <p style={{ margin: `0 0 ${space.md}px`, fontSize: v("--font-size-small"), color: v("--color-text-muted") }}>Monitor-Widgets zeigen den {daten.name}, Einbett-Widgets ihren Beispielort. Gebiet, Ebene und Aktionsdarstellung stellst du auf der Detailseite ein.</p>}
      <WidgetGalerie karten={karten} daten={daten} />

      <details style={{ marginTop: 40, maxWidth: 720 }}>
        <summary style={{ cursor: "pointer", fontWeight: 700, color: v("--color-text-primary") }}>So entsteht ein neues Chart</summary>
        <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
          {SCHRITTE.map((s) => (
            <div key={s.titel} style={{ border: `1px solid ${v("--color-border")}`, borderRadius: v("--radius-md"), padding: "12px 14px" }}>
              <div style={{ fontSize: v("--font-size-body"), fontWeight: 700, color: v("--color-text-primary"), marginBottom: 4 }}>{s.titel}</div>
              <div style={{ fontSize: v("--font-size-small"), color: v("--color-text-muted"), lineHeight: 1.6 }}>{s.text}</div>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
