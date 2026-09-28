import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../../../lib/supabase-server-component";
import { v } from "../../../../lib/theme";
import { WIDGETS, brandLabel, embedPath, type WidgetDef, type WidgetId } from "../../../../lib/widget-registry";
import { getAncestors, getChildren, getRankingData, getRegionById, type AtlasChild, type AtlasRegion } from "../../../../lib/atlas";
import { getRegionAtlasData } from "../../../../lib/mastr-data";
import { loadDistrictContent, loadRegionContent } from "../../../../lib/district-monitor-server";
import { monitorContentForPreview } from "../../../../lib/monitor-content-preview";
import { districtSolarCells } from "../../../../lib/district-monitor";
import { regionMembers, regionRaceInput } from "../../../../lib/region-race";
import { LEVEL_TEXT } from "../../../../lib/region-level-text";
import { ladeGemeindePaket } from "../../../../lib/gemeinde-paket-server";
import { paketFuer } from "../../../../components/gemeinde/paket-teile";
import { gemeindeGeo } from "../../../../lib/atlas-geo";
import { wetterSkript } from "../../../../components/gemeinde/GemeindeSzene";
import { dashboardDate } from "../../../../lib/dashboard/format";
import InfoTooltip from "../../../../components/InfoTooltip";
import { BEISPIEL_GEBIET, EBENEN, EINBINDUNG_TEXT, WERKSTATT_BESTAND, type Ebene } from "./werkstatt-bestand";
import WerkstattAuswahl, { type Auswahl } from "./WerkstattAuswahl";
import WerkstattVorschau, { type VorschauDaten } from "./WerkstattVorschau";
import Bedienelemente from "./Bedienelemente";

export const metadata = {
  title: "Widget-Werkstatt – Admin",
  robots: { index: false, follow: false },
};

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

// The widget workshop: inventory of the registry (lib/widget-registry.ts) plus
// the workshop's checked observations (werkstatt-bestand.ts), and ONE preview at
// a time — the real widget, fed by the page's own data readers. Nothing here
// computes a value; a selection change is a full navigation, so maps, race
// engine and weather script start fresh and only for the chosen widget.

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

type Such = Record<string, string | string[] | undefined>;
const eins = (x: string | string[] | undefined) => (Array.isArray(x) ? x[0] : x) ?? "";

function sortiert(kinder: AtlasChild[]) {
  return kinder.map((k) => ({ id: k.region_id, name: k.name })).sort((a, b) => a.name.localeCompare(b.name, "de"));
}

/** Resolve land → kreis → gemeinde from the URL, falling back to the example area of each step. */
async function gebietsKette(ebene: Ebene, such: Such) {
  const de = await getRegionById("de");
  if (!de) throw new Error("Region Deutschland fehlt");
  if (ebene === "de") return { region: de, laender: [], kreise: [], gemeinden: [], land: "", kreis: "", gemeinde: "" };
  const laender = sortiert(await getChildren(de));
  const landWunsch = eins(such.land) || BEISPIEL_GEBIET.bundesland;
  const land = laender.some((l) => l.id === landWunsch) ? landWunsch : laender[0].id;
  const landRegion = await getRegionById(land);
  if (!landRegion) throw new Error(`Bundesland ${land} fehlt`);
  if (ebene === "bundesland") return { region: landRegion, laender, kreise: [], gemeinden: [], land, kreis: "", gemeinde: "" };
  const kreise = sortiert(await getChildren(landRegion));
  const kreisWunsch = eins(such.kreis) || BEISPIEL_GEBIET.landkreis;
  const kreis = kreise.some((k) => k.id === kreisWunsch) ? kreisWunsch : kreise[0]?.id ?? "";
  const kreisRegion = kreis ? await getRegionById(kreis) : null;
  if (!kreisRegion) return { region: null, laender, kreise, gemeinden: [], land, kreis, gemeinde: "" };
  if (ebene === "landkreis") return { region: kreisRegion, laender, kreise, gemeinden: [], land, kreis, gemeinde: "" };
  const gemeinden = sortiert(regionMembers(kreisRegion, await getChildren(kreisRegion)));
  const gemeindeWunsch = eins(such.gemeinde) || BEISPIEL_GEBIET.gemeinde;
  const gemeinde = gemeinden.some((g) => g.id === gemeindeWunsch) ? gemeindeWunsch : gemeinden[0]?.id ?? "";
  const gemeindeRegion = gemeinde ? await getRegionById(gemeinde) : null;
  return { region: gemeindeRegion, laender, kreise, gemeinden, land, kreis, gemeinde };
}

async function slugPfad(region: AtlasRegion) {
  const kette = [...(await getAncestors(region)).filter((a) => a.level !== "de"), region].filter((r) => r.level !== "de");
  return `/solar-atlas${kette.map((r) => `/${r.slug}`).join("")}`;
}

/** The same data path as the regional page (LandkreisSeite + RegionMonitorSection). */
async function regionalDaten(region: AtlasRegion, mitRennen: boolean): Promise<VorschauDaten> {
  const level = region.level === "bundesland" || region.level === "de" ? region.level : "landkreis";
  const [atlas, children, ranking] = await Promise.all([getRegionAtlasData(region.region_id), getChildren(region), getRankingData(region)]);
  const stand = atlas.data_as_of;
  const towns = regionMembers(region, children);
  const townIds = new Set(towns.map((t) => t.region_id));
  const content = await monitorContentForPreview(
    level === "landkreis"
      ? loadDistrictContent(region.region_id, towns.map((t) => t.region_id), stand)
      : loadRegionContent(region.region_id, children.map((c) => c.region_id), stand),
  );
  return {
    art: "region",
    name: region.name,
    stand,
    prepared: content.prepared,
    monitor: {
      regionId: region.region_id,
      name: region.name,
      population: region.population,
      populationStand: region.population_as_of,
      cells: districtSolarCells(ranking.cells.filter((c) => townIds.has(c.region_id))),
      stand,
      monitor: content.monitor,
    },
    race: mitRennen && towns.length > 1
      ? { wording: LEVEL_TEXT[level].race, ...regionRaceInput({ towns, ranking, stand, basePath: await slugPfad(region) }) }
      : null,
  };
}

export default async function WidgetWerkstattPage(props: { searchParams: Promise<Such> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !ADMIN_EMAILS.includes(user.email?.toLowerCase() || "")) redirect("/");

  const such = await props.searchParams;
  const ids = Object.keys(WERKSTATT_BESTAND) as WidgetId[];
  const gewaehlt = ids.find((id) => id === eins(such.w)) ?? null;

  let detail: React.ReactNode = null;
  if (gewaehlt) {
    const eintrag = WERKSTATT_BESTAND[gewaehlt];
    const def = WIDGETS[gewaehlt];
    const ebeneWunsch = eins(such.ebene) as Ebene;
    const ebene: Ebene = eintrag.ebenen.includes(ebeneWunsch) ? ebeneWunsch : eintrag.ebenen[0];
    const ebeneAbgelehnt = ebeneWunsch && ebeneWunsch !== ebene ? EBENEN.find((e) => e.id === ebeneWunsch)?.label ?? null : null;
    const aktionen = eins(such.aktionen) === "primary" ? "primary" : "menu";
    const extern = eins(such.kontext) === "extern";
    const vorschau = eintrag.vorschau;
    const brauchtGebiet = vorschau.art === "monitor" || (vorschau.art === "einbettung" && !!vorschau.param);
    const kette = brauchtGebiet ? await gebietsKette(ebene, such) : null;
    const region = kette?.region ?? null;

    let daten: VorschauDaten | null = null;
    let hinweis: string | null = null;
    let wetter: string | null = null;
    if (vorschau.art === "monitor") {
      if (!region) hinweis = "Für diese Auswahl ist kein Gebiet im Register hinterlegt.";
      else if (ebene === "gemeinde") {
        const [paket, geo] = await Promise.all([ladeGemeindePaket(region.region_id), gemeindeGeo(region.region_id)]);
        if (!paket) hinweis = `Für ${region.name} gibt es kein vorbereitetes Gemeindepaket. Ohne Paket zeigt auch die Gemeindeseite keinen Monitor.`;
        else {
          daten = { art: "gemeinde", name: region.name, stand: paket.registerStand, paket: paketFuer("monitor", paket) };
          // The page's weather source for current power (GemeindeSzene); a full reload runs it per town.
          wetter = wetterSkript(geo?.plz ?? null);
          if (!geo?.plz) hinweis = `Für ${region.name} ist keine Postleitzahl hinterlegt; „Solarleistung heute“ kann kein Wetter laden.`;
        }
      } else daten = await regionalDaten(region, vorschau.schluessel === "race");
    }

    const auswahl: Auswahl = {
      w: gewaehlt,
      ebene,
      ebenen: EBENEN.map((e) => ({ ...e, moeglich: eintrag.ebenen.includes(e.id) })),
      laender: kette?.laender ?? [],
      kreise: kette?.kreise ?? [],
      gemeinden: kette?.gemeinden ?? [],
      land: kette?.land ?? "",
      kreis: kette?.kreis ?? "",
      gemeinde: kette?.gemeinde ?? "",
      aktionen: vorschau.art === "monitor" ? aktionen : null,
      kontext: vorschau.art === "einbettung" ? (extern ? "extern" : "eigen") : null,
      zeigtGebiet: brauchtGebiet,
    };

    let einbettSrc: string | null = null;
    if (vorschau.art === "einbettung") {
      const pfad = embedPath(def);
      const params = new URLSearchParams();
      if (vorschau.param && region) params.set(vorschau.param, vorschau.param === "bl" ? region.region_id.slice(0, 2) : region.region_id);
      if (!extern) params.set("onsite", "1");
      einbettSrc = pfad ? `${pfad}${params.size ? `?${params}` : ""}` : null;
      if (!pfad) hinweis = "Keine Einbett-Route im Register.";
    }

    detail = (
      <section aria-labelledby="werkstatt-detail" style={{ marginTop: 32, borderTop: `1px solid ${v("--color-border")}`, paddingTop: 24 }}>
        {wetter && <script dangerouslySetInnerHTML={{ __html: wetter }} />}
        <h2 id="werkstatt-detail" style={{ fontSize: v("--font-size-lead"), color: v("--color-text-primary"), margin: "0 0 4px" }}>{def.title}</h2>
        <p style={{ margin: "0 0 12px", color: v("--color-text-muted"), fontSize: v("--font-size-small") }}>
          {eintrag.zweck} · {EINBINDUNG_TEXT[eintrag.einbindung]} · Bildzeile „{brandLabel(def.kind)}“
        </p>
        <WerkstattAuswahl auswahl={auswahl} />
        {ebeneAbgelehnt && <p role="status" style={hinweisStil}>{def.title} unterstützt die Ebene „{ebeneAbgelehnt}“ nicht; gezeigt wird {EBENEN.find((e) => e.id === ebene)?.label}.</p>}
        {hinweis && <p role="status" style={hinweisStil}>{hinweis}</p>}
        {daten && <p style={{ fontSize: v("--font-size-small"), color: v("--color-text-muted"), margin: "8px 0" }}>
          Gebiet: {daten.name} · Registerstand {dashboardDate(daten.stand)}
          {daten.art === "region" && <> · Vorbereitete Auswertung: {preparedText(daten.prepared)}</>}
          {" "}<InfoTooltip title="Zeitraum und Datenstand">Zeiträume wählt jedes Widget selbst (Monat, Jahr, Zeitraum des Zubaus) — die Bedienelemente im Widget sind dieselben wie auf der Seite. Einen älteren Datenstand gibt es nicht zur Auswahl: gespeichert ist je Gebiet nur die aktuelle Auswertung.</InfoTooltip>
        </p>}
        {daten && vorschau.art === "monitor" && <WerkstattVorschau key={`${gewaehlt}-${daten.name}-${aktionen}`} schluessel={vorschau.schluessel} daten={daten} aktionen={aktionen} />}
        {einbettSrc && <EinbettVorschau src={einbettSrc} titel={def.title} />}
        {vorschau.art === "keine" && <p role="status" style={hinweisStil}>Keine Vorschau: {vorschau.grund}</p>}
      </section>
    );
  }

  const th: React.CSSProperties = { textAlign: "left", fontSize: v("--font-size-caption"), fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: v("--color-text-muted"), padding: "8px 10px", borderBottom: `1px solid ${v("--color-border")}`, whiteSpace: "nowrap" };
  const td: React.CSSProperties = { fontSize: v("--font-size-small"), color: v("--color-text-secondary"), padding: "10px", borderBottom: `1px solid ${v("--color-border")}`, verticalAlign: "top" };
  const anzahl = (e: keyof typeof EINBINDUNG_TEXT) => ids.filter((id) => WERKSTATT_BESTAND[id].einbindung === e).length;

  return (
    <div style={{ maxWidth: 1200 }}>
      <p style={{ margin: "0 0 12px", fontSize: v("--font-size-small"), color: v("--color-text-muted") }}>
        {ids.length} Widgets im Register: {anzahl("zentral")} zentral eingebunden, {anzahl("teilweise")} teilweise vereinheitlicht, {anzahl("separat")} separat.{" "}
        <InfoTooltip title="Was die Stände heißen">
          Zentral: gemeinsamer Widget-Rahmen mit Optionsmenü oder Aktionsfußleiste. Teilweise: gemeinsame Quellen- und Bildfußzeile, aber die ältere Aktionsleiste. Separat: eigene Umsetzung oder gar kein Widget im Code. Der Stand sagt nichts über eine visuelle Abnahme — die steht nur dort, wo sie belegt ist.
        </InfoTooltip>
      </p>
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 1180 }}>
          <thead>
            <tr>
              <th style={th}>Widget</th>
              <th style={th}>Stand</th>
              <th style={th}>Register</th>
              <th style={th}>Komponente</th>
              <th style={th}>Einsatzorte</th>
              <th style={th}>Ebenen</th>
              <th style={th}>Funktionen und Lücken</th>
              <th style={th}>Abnahme</th>
            </tr>
          </thead>
          <tbody>
            {ids.map((id) => {
              const e = WERKSTATT_BESTAND[id];
              const aktiv = id === gewaehlt;
              return (
                <tr key={id} style={aktiv ? { background: v("--color-bg-raised") } : undefined}>
                  <td style={{ ...td, color: v("--color-text-primary"), fontWeight: 600, minWidth: 180 }}>
                    <Link href={`/admin/charts?w=${id}#werkstatt-detail`} style={{ color: v("--color-accent"), textDecoration: "none" }}>{WIDGETS[id].title}</Link>
                    <div style={{ fontSize: v("--font-size-caption"), fontWeight: 400, color: v("--color-text-muted"), marginTop: 2 }}>{e.zweck}</div>
                    <div style={{ fontSize: v("--font-size-caption"), fontWeight: 400, color: v("--color-text-faint"), marginTop: 2 }}>
                      {e.vorschau.art === "keine" ? "keine Vorschau" : e.vorschau.art === "monitor" ? "Vorschau: echtes Monitor-Widget" : "Vorschau: Einbett-Route"}
                    </div>
                  </td>
                  <td style={td}>{EINBINDUNG_TEXT[e.einbindung]}</td>
                  <td style={{ ...td, minWidth: 200 }}>
                    <div>{WIDGETS[id].kind === "tool" ? "Werkzeug" : "Chart"} · „{brandLabel(WIDGETS[id].kind)}“</div>
                    <div>Quelle: {WIDGETS[id].sources.map((q) => q.name).join(" · ")}</div>
                    <div>Nächster Schritt: {(WIDGETS[id] as WidgetDef).cta?.label ?? "—"}</div>
                    <div>{(WIDGETS[id] as WidgetDef).exportable === false ? "kein Bild" : "Bild herunterladbar"} · {embedPath(WIDGETS[id]) ?? "keine Einbett-Route"}</div>
                  </td>
                  <td style={{ ...td, fontFamily: "monospace", fontSize: v("--font-size-caption") }}>{e.komponente}</td>
                  <td style={td}>{e.einsatzorte.length ? e.einsatzorte.map((o) => <div key={o.datei + o.wo}>{o.wo}</div>) : <span style={{ color: v("--color-text-faint") }}>keine Verwendung im Code</span>}</td>
                  <td style={td}>{e.ebenen.map((x) => EBENEN.find((b) => b.id === x)?.label).join(", ")}</td>
                  <td style={{ ...td, minWidth: 260 }}>
                    <div>{e.funktionen.join(" · ")}</div>
                    {e.luecken.length > 0 && <ul style={{ margin: "6px 0 0", paddingLeft: 16, color: v("--color-text-muted") }}>{e.luecken.map((l) => <li key={l}>{l}</li>)}</ul>}
                  </td>
                  <td style={td}>{e.abnahme ? <>{e.abnahme.was}<div style={{ fontSize: v("--font-size-caption"), color: v("--color-text-muted") }}>{e.abnahme.beleg}</div></> : <span style={{ color: v("--color-text-faint") }}>nicht belegt</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {detail ?? <p style={{ marginTop: 24, color: v("--color-text-muted") }}>Wähle ein Widget in der Tabelle, um es mit echten Daten anzusehen. Es lädt immer nur das gewählte.</p>}

      <Bedienelemente />

      <details style={{ marginTop: 32, maxWidth: 720 }}>
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

const hinweisStil: React.CSSProperties = { margin: "8px 0", padding: "10px 12px", borderRadius: 10, border: `1px solid ${v("--color-border")}`, fontSize: v("--font-size-small"), color: v("--color-text-secondary") };

function preparedText(p: { state: string; reason?: string; editions?: string[] }) {
  if (p.state === "current") return "aktuell";
  if (p.state === "older-edition") return `älterer Registerstand (${p.editions?.length ? dashboardDate(p.editions[p.editions.length - 1]) : "unbekannt"})`;
  return p.reason === "read-error" ? "konnte nicht geladen werden" : "nicht verfügbar";
}

/** The real embed route, loaded only for the chosen widget and only when it scrolls into view. */
function EinbettVorschau({ src, titel }: { src: string; titel: string }) {
  return (
    <div style={{ marginTop: 12 }}>
      <p style={{ fontSize: v("--font-size-caption"), color: v("--color-text-muted"), margin: "0 0 6px", fontFamily: "monospace" }}>{src}</p>
      <iframe src={src} title={`Vorschau: ${titel}`} loading="lazy" style={{ width: "100%", maxWidth: 900, height: 720, border: `1px solid ${v("--color-border")}`, borderRadius: 12, background: v("--color-bg") }} />
    </div>
  );
}
