import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isAdminSession } from "../../../../../lib/admin-guard";
import { v, space } from "../../../../../lib/theme";
import { WIDGETS, brandLabel, embedPath, type WidgetDef, type WidgetId } from "../../../../../lib/widget-registry";
import { ladeGemeindePaket } from "../../../../../lib/gemeinde-paket-server";
import { paketFuer } from "../../../../../components/gemeinde/paket-teile";
import { gemeindeGeo } from "../../../../../lib/atlas-geo";
import { wetterSkript } from "../../../../../components/gemeinde/GemeindeSzene";
import { dashboardDate } from "../../../../../lib/dashboard/format";
import InfoTooltip from "../../../../../components/InfoTooltip";
import { EBENEN, EINBINDUNG_TEXT, WERKSTATT_BESTAND, type Ebene } from "../werkstatt-bestand";
import { eins, gebietsKette, regionalDaten, type Such } from "../werkstatt-daten";
import WerkstattAuswahl, { type Auswahl } from "../WerkstattAuswahl";
import WerkstattVorschau, { type VorschauDaten } from "../WerkstattVorschau";

export const metadata = { title: "Widget – Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// One widget: its settings (area, level, action presentation), the real widget
// large, and its profile beside it. Every setting change is a full navigation,
// so engines and weather scripts start fresh for the chosen area only.
export default async function WidgetDetail(props: { params: Promise<{ id: string }>; searchParams: Promise<Such> }) {
  const { id } = await props.params;
  if (!(await isAdminSession())) redirect(`/login?next=/admin/charts/${id}`);
  if (!(id in WERKSTATT_BESTAND)) notFound();
  const gewaehlt = id as WidgetId;
  const such = await props.searchParams;
    const eintrag = WERKSTATT_BESTAND[gewaehlt];
    const def = WIDGETS[gewaehlt] as WidgetDef;
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



  const zeile = (titel: string, inhalt: React.ReactNode) => (
    <div style={{ padding: "10px 0", borderTop: `1px solid ${v("--color-border")}` }}>
      <dt style={{ margin: "0 0 2px", fontSize: v("--font-size-caption"), fontWeight: 700, color: v("--color-text-muted") }}>{titel}</dt>
      <dd style={{ margin: 0, fontSize: v("--font-size-small"), color: v("--color-text-secondary"), lineHeight: 1.5 }}>{inhalt}</dd>
    </div>
  );

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto" }}>
      {wetter && <script dangerouslySetInnerHTML={{ __html: wetter }} />}
      <p style={{ fontSize: v("--font-size-small"), marginBottom: space.md }}>
        <Link href="/admin/charts" style={{ color: v("--color-accent") }}>← Widget-Galerie</Link>
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "4px 12px", marginBottom: 4 }}>
        <h1 style={{ fontSize: v("--font-size-h2"), color: v("--color-text-primary"), margin: 0 }}>{def.title}</h1>
        <span style={standStil(eintrag.einbindung)}>{EINBINDUNG_TEXT[eintrag.einbindung]}</span>
      </div>
      <p style={{ margin: "0 0 20px", color: v("--color-text-muted"), fontSize: v("--font-size-body") }}>{eintrag.zweck}</p>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(240px, 300px)", gap: 32, alignItems: "start" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ padding: 16, borderRadius: 16, border: `1px solid ${v("--color-border")}`, background: v("--color-bg-muted"), marginBottom: 16 }}>
            <WerkstattAuswahl auswahl={auswahl} />
            {daten && <p style={{ fontSize: v("--font-size-caption"), color: v("--color-text-muted"), margin: "12px 0 0" }}>
              {daten.name} · Registerstand {dashboardDate(daten.stand)}
              {daten.art === "region" && <> · Vorbereitete Auswertung: {preparedText(daten.prepared)}</>}
              {" "}<InfoTooltip title="Zeitraum und Datenstand">Zeiträume wählt jedes Widget selbst (Monat, Jahr, Zeitraum des Zubaus) — die Bedienelemente im Widget sind dieselben wie auf der Seite. Einen älteren Datenstand gibt es nicht zur Auswahl: gespeichert ist je Gebiet nur die aktuelle Auswertung.</InfoTooltip>
            </p>}
            {!auswahl.zeigtGebiet && !auswahl.aktionen && !auswahl.kontext && <p style={{ margin: 0, fontSize: v("--font-size-small"), color: v("--color-text-muted") }}>Dieses Widget hat keine Einstellungen.</p>}
          </div>
          {ebeneAbgelehnt && <p role="status" style={hinweisStil}>{def.title} unterstützt die Ebene „{ebeneAbgelehnt}“ nicht; gezeigt wird {EBENEN.find((e) => e.id === ebene)?.label}.</p>}
          {hinweis && <p role="status" style={hinweisStil}>{hinweis}</p>}
          {daten && vorschau.art === "monitor" && <WerkstattVorschau key={`${gewaehlt}-${daten.name}-${aktionen}`} schluessel={vorschau.schluessel} daten={daten} aktionen={aktionen} />}
          {einbettSrc && <EinbettVorschau src={einbettSrc} titel={def.title} />}
          {vorschau.art === "keine" && <p role="status" style={hinweisStil}>Keine Vorschau: {vorschau.grund}</p>}
        </div>
        <aside aria-label="Steckbrief">
          <h2 style={{ fontSize: v("--font-size-body"), margin: "0 0 4px", color: v("--color-text-primary") }}>Steckbrief</h2>
          <dl style={{ margin: 0 }}>
            {zeile("Ebenen", eintrag.ebenen.map((x) => EBENEN.find((b) => b.id === x)?.label).join(", "))}
            {zeile("Einsatzorte", eintrag.einsatzorte.length ? eintrag.einsatzorte.map((o) => <div key={o.datei + o.wo}>{o.wo}</div>) : "keine Verwendung im Code")}
            {zeile("Funktionen", eintrag.funktionen.join(" · "))}
            {zeile("Lücken", eintrag.luecken.length ? <ul style={{ margin: 0, paddingLeft: 16 }}>{eintrag.luecken.map((l) => <li key={l}>{l}</li>)}</ul> : "keine bekannt")}
            {zeile("Abnahme", eintrag.abnahme ? `${eintrag.abnahme.was} (${eintrag.abnahme.beleg})` : "nicht belegt")}
            {zeile("Register", <>{def.kind === "tool" ? "Werkzeug" : "Chart"} · Bildzeile „{brandLabel(def.kind)}“ · Quelle: {def.sources.map((q) => q.name).join(" · ")} · Nächster Schritt: {def.cta?.label ?? "—"} · {def.exportable === false ? "kein Bild" : "Bild herunterladbar"} · {embedPath(def) ?? "keine Einbett-Route"}</>)}
            {zeile("Komponente", <code style={{ fontSize: v("--font-size-caption"), wordBreak: "break-all" }}>{eintrag.komponente}</code>)}
          </dl>
        </aside>
      </div>
    </div>
  );
}

function standStil(stand: keyof typeof EINBINDUNG_TEXT): React.CSSProperties {
  return { fontSize: v("--font-size-caption"), fontWeight: 700, padding: "2px 8px", borderRadius: 999, border: `1px solid ${v("--color-border")}`, color: stand === "zentral" ? v("--color-text-primary") : v("--color-text-muted") };
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
      <iframe src={src} title={`Vorschau: ${titel}`} loading="lazy" style={{ width: "100%", maxWidth: 1100, height: 720, border: `1px solid ${v("--color-border")}`, borderRadius: 12, background: v("--color-bg") }} />
    </div>
  );
}
