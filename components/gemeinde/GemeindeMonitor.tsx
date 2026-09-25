"use client";

/**
 * The municipality page's energy monitor, ported from the approved prototype
 * (scripts/municipality-preview/MunicipalDataPreview.tsx). Everything the
 * prototype read from Höchberg's JSON files comes from the town's package;
 * the live solar output reads the weather the parent page already loads
 * (window.atlasWeather, set by GemeindeSzene) — no second weather request.
 */
import ZubauChart from "../atlas/ZubauChart";
import { useEffect, useRef, useState } from "react";
import {MonitorCompositionChart} from "../charts/CompositionChart";
import { monitorWidgetRole, storyVisualTemplateDef } from "../../lib/story-approved-visual";
import { WIDGETS } from "../../lib/widget-registry";
import { ExportableWidgetFrame } from "../dashboard/ExportableWidgetFrame";
import { MonitorAnnualEnergyChart } from "./MonitorAnnualEnergyChart";
import { MonitorMonthlySolarChart } from "./MonitorMonthlySolarChart";
import { MunicipalChart } from "../social/MunicipalChart";
import foundation from "../social/atlas-foundations.module.css";
import chart from "../social/StoryConceptLab.module.css";
import type { StoryConcept } from "../../lib/story-konzepte";
import "./municipal-data.css";
import "../dashboard/dashboard.css";
import { dashboardDate } from "../../lib/dashboard/format";
import { ShareDonut, solarCategoryVisual } from "../charts/ShareDonut";
import { WidgetSetting } from "../dashboard/WidgetSetting";
import { WidgetFrame } from "../dashboard/WidgetFrame";
import { KpiOverview } from "../dashboard/KpiOverview";
import { MastrLiveRadial } from "../MastrLiveRadial";
import { MastrMap } from "../MastrMap";
import type { GemeindePaket } from "../../lib/gemeinde-paket";
import {monitorKpiGroups} from "../../lib/dashboard/monitor-kpis";

/* The package keeps prototype data loosely typed (lib/gemeinde-paket.ts). */
/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any;

const formatDate = dashboardDate;
const monthLabel = (month: string) =>
  new Date(month + "-15T12:00:00").toLocaleDateString("de-DE", { month: "long", year: "numeric" });


export type SolarWeatherSource = { load: () => Promise<unknown>; tag?: () => Promise<unknown> };

export function CurrentPower({ installedKwp, compact = false, weatherSource, frameless = false, overview = false }: { installedKwp: number; compact?: boolean; weatherSource?: SolarWeatherSource; frameless?: boolean; overview?: boolean }) {
  const [reading, setReading] = useState<Any>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    let versuche = 0;
    const load = () => {
      const source = weatherSource ?? (parent as Any).atlasWeather;
      if (!source) {
        // The frame can be up before the page has set its weather source;
        // ask again shortly instead of waiting for the five-minute refresh.
        if (++versuche < 10) setTimeout(() => active && load(), 1000);
        else setFailed(true);
        return;
      }
      // "Now" comes with the scene's weather, today's curve on its own call
      // (the scene must not wait for the curve).
      Promise.all([source.load(), source.tag ? source.tag() : Promise.resolve(null)])
        .then(([jetzt, tag]: Any[]) => ({ ...jetzt, points: tag?.points ?? jetzt?.points }))
        .then((result: Any) => {
          if (!active) return;
          // "Now" without today's curve would draw an empty dial; say that
          // the curve is missing and ask again in a minute.
          if (!result?.points?.length) {
            setFailed(true);
            if (++versuche < 10) setTimeout(() => active && load(), 60000);
            return;
          }
          setReading(result);
          setFailed(false);
        })
        .catch(() => {
          if (active) setFailed(true);
        });
    };
    load();
    const timer = setInterval(load, 300000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [weatherSource]);
  const points = reading?.points?.map((point: Any) => ({ ts: point.time, mw: ((reading.installedKwp ?? installedKwp) * point.powerPct) / 100000 })) ?? [];
  const current = points.filter((point: Any) => Date.parse(point.ts) <= Date.now()).at(-1);
  const asOf = reading?.power?.asOf
    ? " · Stand " + new Date(reading.power.asOf).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" }) + " Uhr"
    : "";
  const content = (
      <div className="monitor-native-chart monitor-current-power">
        {failed ? (
          <p>Der Tagesverlauf ist gerade nicht verfügbar.</p>
        ) : !reading ? (
          <p>Wetterdaten werden geladen …</p>
        ) : (
          <MastrLiveRadial
            energietraeger="solar"
            installedKwp={reading.installedKwp ?? installedKwp}
            injected={points}
            highlightTs={current?.ts}
            secondaryBars
            size={compact ? "compact" : "default"}
            unit="MW"
            className="monitor-live-radial"
            bare
            fuelltBreite
            kopfKachel={compact && !frameless}
            overview={overview}
          />
        )}
      </div>
  );
  return frameless ? content : <WidgetFrame title="Solarleistung heute" kind="radial" context={compact ? undefined : <>Aus dem Wetter am Standort simuliert{asOf}</>}>{content}</WidgetFrame>;
}

/** Mounts its children only once the placeholder comes within reach of the
 *  viewport — the district map brings ≈170 KB of geometry nobody at the top
 *  of the page needs. */

function WennNah({ children, hoehe }: { children: React.ReactNode; hoehe: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [nah, setNah] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setNah(true), { rootMargin: "800px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return nah ? <>{children}</> : <div ref={ref} style={{ minHeight: hoehe }} />;
}

function LocalMap({ paket }: { paket: GemeindePaket }) {
  const [selected, setSelected] = useState(paket.ags);
  const peers = paket.district.districtPeers as Any[];
  const place = peers.find((row) => row.region_id === selected);
  // A kreisfreie Stadt or a Stadtstaat has no district to map.
  if (peers.length < 2) return null;
  return (
    <section aria-label="Karte">
      <h3>Solaranlagen im Landkreis</h3>
      <article className="monitor-map monitor-widget">
        <p>Tippen Sie auf einen Ort für Anlagenzahl und installierte Leistung. Stand {formatDate(paket.rangStand)}</p>
        <WidgetSetting label="Ort" value={selected} onChange={setSelected} options={peers.map((row) => ({ value: row.region_id, label: row.name }))} />
        <MastrMap
          level="landkreis"
          parentAgs={paket.kreis.ags}
          selectedAgs={selected}
          selectionStyle="pin"
          values={peers.map((row) => ({ ags: row.region_id, value: row.sums.alle.count }))}
          // Die Karte steht hier in einer Reihe mit den übrigen Kacheln; mit
          // der vollen Höhe wuchs ihre Box auf über 800 px und hing unten aus
          // dem Rahmen (Betreiber, 23.09.2026).
          maxHeight={420}
          valueLabel="Solaranlagen"
          onSelect={setSelected}
        />
        <p aria-live="polite">
          {place
            ? `${place.name}: ${place.sums.alle.count.toLocaleString("de-DE")} Solaranlagen · ${(place.sums.alle.kwp / 1000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} MWp`
            : "Für diesen Ort liegen hier keine Werte vor."}
        </p>
      </article>
    </section>
  );
}

const widgetRole = (item: Any) => monitorWidgetRole(item.template, item.story);

export function MonitorWidget({ item, paket }: { item: Any; paket: GemeindePaket }) {
  const history = paket.monitorHistory as Any;
  const periods = paket.monitorPeriods as Any;
  const role = widgetRole(item);
  const [period, setPeriod] = useState("current");
  const isDonut = item.template === "anteilsdonut";
  const isComposition = item.template === "anlagenraster";
  const hasStockPeriod = isDonut || isComposition;
  const isValuation = ["electricity-value", "feed-in-value"].includes(item.template);
  const valuePeriods: Any[] = periods.monthly.filter((row: Any) => row.value);
  const chosenValue = valuePeriods.find((row) => row.month === period) ?? valuePeriods[0];
  const renderedStory =
    isValuation && chosenValue?.value
      ? {
          ...item.story,
          title: (item.template === "electricity-value" ? "Wert des Solarstroms" : "Einspeisevergütung") + " · " + monthLabel(chosenValue.month),
          period: chosenValue.month,
          values: [{ ...item.story.values[0], value: item.template === "electricity-value" ? chosenValue.value.euro : chosenValue.value.feedInEuro }],
        }
      : item.story;
  const selected = history.observations.find((row: Any) => row.end === period);
  const values = isDonut
    ? (selected?.solarMix ?? item.story.values).map((row: Any) => ({
        ...row,
        visual: solarCategoryVisual(row.label),
      }))
    : [];
  const segment = /balkon|stecker/i.test(item.story.countComparison?.label ?? "") ? "steckersolar" : "gebaeude";
  const mixRow = selected?.solarMix?.find((row: Any) => row.label === (segment === "gebaeude" ? "Gebäudeanlagen" : "Balkonkraftwerke"));
  const compositionStory =
    isComposition && selected
      ? {
          ...item.story,
          countComparison: { ...item.story.countComparison, total: selected.solarCount, selected: selected.solarCounts[segment] },
          values: [item.story.values[0], { ...item.story.values[1], value: selected.solarKwp && mixRow ? (mixRow.value / selected.solarKwp) * 100 : 0 }],
        }
      : item.story;
  const assumptionDate = periods.valuationAssumptionDate ? formatDate(periods.valuationAssumptionDate) : null;
  // Visuals migrated to the shared export pipeline name their registry entry in the template catalog.
  const exportKey = storyVisualTemplateDef(item.template)?.widget;
  const periodLabel = period === "current" ? "Heute" : new Date(period + "T12:00:00").toLocaleDateString("de-DE", { month: "long", year: "numeric" });
  const Frame = (exportKey ? ExportableWidgetFrame : WidgetFrame) as typeof WidgetFrame;
  const exportProps = exportKey
    ? {
        widget: WIDGETS[exportKey],
        place: paket.name,
        // Stock widgets: the chosen month end; others: the story's own data date.
        stand: formatDate(hasStockPeriod ? (selected?.end ?? paket.registerStand) : (item.story.sourceDate ?? paket.registerStand)),
        // Charts with their own selectors print their state themselves.
        stateLabel: hasStockPeriod ? `Anlagenbestand: ${periodLabel}` : undefined,
        filename: `solar-check-${item.template}-${paket.ags}`,
      }
    : {};
  return (
    <Frame
      {...exportProps}
      title={role.title}
      kind={role.kind}
      className={chart.visualTheme}
      data-story-scheme="dark"
      settingsPlacement={hasStockPeriod || isValuation ? "below-title" : "header"}
      context={
        isDonut || ["energy-year", "radial", "electricity-value", "feed-in-value", "anlagenraster"].includes(item.template) ? undefined : (
          <>
            Letztes Update: {formatDate(item.story.sourceDate ?? paket.registerStand)} · {item.story.period}
          </>
        )
      }
      settings={
        hasStockPeriod ? (
          <WidgetSetting
            label="Zeitraum des Anlagenbestands"
            stepper
            hideLabel
            size="md"
            value={period}
            onChange={setPeriod}
            options={[
              { value: "current", label: "Heute" },
              ...history.observations.slice(0, 13).map((row: Any) => ({
                value: row.end,
                label: new Date(row.end + "T12:00:00").toLocaleDateString("de-DE", { month: "long", year: "numeric" }),
              })),
            ]}
          />
        ) : isValuation && chosenValue ? (
          <WidgetSetting
            label="Monat der Berechnung"
            hideLabel
            stepper
            value={chosenValue.month}
            onChange={setPeriod}
            options={valuePeriods.map((row) => ({ value: row.month, label: monthLabel(row.month) }))}
          />
        ) : undefined
      }
      help={
        hasStockPeriod ? (
          <p>Frühere Monatswerte zeigen die heute erfassten Anlagen nach ihrem Inbetriebnahmedatum. Nachmeldungen können frühere Werte verändern.</p>
        ) : isValuation ? (
          <p>
            Wetter und Inbetriebnahmen des gewählten Monats, bewertet mit den gespeicherten Preis- und Eigenverbrauchsannahmen
            {assumptionDate ? ` vom ${assumptionDate}` : ""}. Nur vollständig berechenbare Monate sind auswählbar. Modellwerte, keine
            tatsächlichen Einnahmen.
          </p>
        ) : ["radial", "energy-year"].includes(item.template) ? (
          <p>
            Die Auswahl enthält nur vollständig vorhandene Wetterzeiträume. Jahresprofile verwenden den zum Jahresende rekonstruierten heutigen
            Anlagenbestand; stillgelegte Anlagen fehlen. Modellierte Erzeugung, keine Messung.
          </p>
        ) : undefined
      }
    >
      {isDonut ? (
        <ShareDonut values={values} />
      ) : isComposition ? (
        <div className="monitor-widget-body">
          <MonitorCompositionChart story={compositionStory} />
        </div>
      ) : (
        <div className="monitor-widget-body">
          {item.story.energyYear ? (
            <MonitorAnnualEnergyChart data={item.story.energyYear} datasets={periods.annual} />
          ) : item.story.solarMonth ? (
            <MonitorMonthlySolarChart data={item.story.solarMonth} datasets={periods.monthly.map((row: Any) => row.solar)} />
          ) : (
            <MunicipalChart story={renderedStory as StoryConcept} />
          )}
        </div>
      )}
    </Frame>
  );
}

export function AnnualGrowth({ years, stand }: { years: { year: number; count: number }[]; stand: string }) {
  const [range, setRange] = useState("all");
  const end = Number(stand.slice(0, 4));
  return (
    <WidgetFrame
      title="Zubau pro Jahr"
      kind="time-series"
      help={<p>Solaranlagen nach Inbetriebnahmejahr. Das laufende Jahr ist noch nicht vollständig. Registerstand: {formatDate(stand)}.</p>}
      settings={
        <WidgetSetting
          label="Zeitraum des Zubaus"
          hideLabel
          value={range}
          onChange={setRange}
          options={[
            { value: "all", label: "Seit 2014" },
            { value: "10", label: "Letzte 10 Jahre" },
            { value: "5", label: "Letzte 5 Jahre" },
          ]}
        />
      }
    >
      <div className="monitor-native-chart">
        <ZubauChart years={years} from={range === "all" ? 2014 : end - Number(range) + 1} asOfYear={end} />
      </div>
    </WidgetFrame>
  );
}

export default function GemeindeMonitor({ paket }: { paket: GemeindePaket }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Only in a frame: there the body is ours, and the parent needs the
    // height. Inline on the page the body belongs to the page.
    if (window.parent === window) return;
    // Shared tooltip portals live on body, outside the embedded theme root.
    const properties = ["--color-bg", "--color-text-primary", "--color-text-secondary", "--color-text-muted", "--color-border", "--font-text", "--font-size-small"];
    const computed = getComputedStyle(root.current!);
    const previous = properties.map((property) => [property, document.body.style.getPropertyValue(property)]);
    properties.forEach((property) => document.body.style.setProperty(property, computed.getPropertyValue(property)));
    const notify = () => parent.postMessage({ type: "municipal-data-layout", height: root.current?.scrollHeight }, location.origin);
    const observer = new ResizeObserver(notify);
    observer.observe(root.current!);
    notify();
    return () => {
      observer.disconnect();
      previous.forEach(([property, value]) => {
        if (value) document.body.style.setProperty(property, value);
        else document.body.style.removeProperty(property);
      });
    };
  }, []);

  const register = paket.register;
  const charts = paket.charts as Any;
  const installedKwp = ((register?.chartMix as Any)?.values ?? []).reduce((sum: number, row: Any) => sum + row.value, 0);
  const hasHistory = ((paket.monitorHistory as Any)?.observations ?? []).length > 0;
  const sections = ["Anlagenbestand", "Strom und Wert"];
  const population = paket.einwohnerStand ? formatDate(paket.einwohnerStand) : null;

  return (
    <div ref={root} className={`${foundation.foundation} municipal-data sc-dashboard`} data-story-scheme="dark">
      {hasHistory && (
        <KpiOverview
          groups={monitorKpiGroups({history:paket.monitorHistory!,population:paket.register?.own.population??0,registerStand:paket.registerStand,populationStand:paket.einwohnerStand})}
          help={
            <>
              <p>Gezählt werden heute erfasste Anlagen nach ihrem Inbetriebnahmedatum. Stillgelegte Anlagen fehlen; Nachmeldungen können frühere Werte verändern.</p>
              {population && <p>Für „je Einwohner“ verwenden wir durchgehend die Einwohnerzahl vom {population}.</p>}
            </>
          }
        />
      )}
      <section aria-label="Aktuelle Solarleistung">
        <div className="sc-widget-grid">
          {installedKwp > 0 && <CurrentPower installedKwp={installedKwp} />}
        </div>
      </section>
      {sections.map((section) => {
        const items = (charts?.charts ?? []).filter((item: Any) => item.section === section && item.template !== "verlauf");
        const missing = (charts?.availability ?? []).some((item: Any) => item.status === "missing");
        if (!items.length && !(section === "Strom und Wert" && missing)) return null;
        return (
          <section key={section} aria-label={section}>
            <h3>{section}</h3>
            <div className="sc-widget-grid">
              {items.map((item: Any) => (
                <MonitorWidget key={item.story.id} item={item} paket={paket} />
              ))}
            </div>
            {section === "Strom und Wert" && missing && (
              <p className="municipal-data-missing">
                Für die Monats- und Jahreserzeugung sowie Stromwert und Einspeisevergütung fehlen noch vollständige örtliche Wetterdaten. Diese
                Diagramme erscheinen, sobald die Berechnung vollständig vorliegt.
              </p>
            )}
          </section>
        );
      })}
      {(paket.district.districtPeers as Any[]).length >= 2 && (
        <WennNah hoehe={640}>
          <LocalMap paket={paket} />
        </WennNah>
      )}
    </div>
  );
}

/**
 * The compact card in the hero (port of HeroWidgetPreview): one of three
 * monitor readings, chosen by the hero stack. Rendered inline on the page,
 * not in a frame, so it shows as soon as the page is interactive.
 */
export function GemeindeKopfMonitor({ paket, widget, paused, onFertig, weatherSource }: { paket: GemeindePaket; widget: string; paused: boolean; onFertig?: () => void; weatherSource?: SolarWeatherSource }) {
  // Welcher Tag gerade gezeichnet wird — steht als zweite Zeile im Kopf.
  const [tag, setTag] = useState<string | null>(null);
  const charts = paket.charts as Any;
  const item = (charts?.charts ?? []).find((c: Any) => c.template === widget);
  const installedKwp = ((paket.register?.chartMix as Any)?.values ?? []).reduce((sum: number, row: Any) => sum + row.value, 0);
  // The feed-in story names its month only as text ("Aug. 2026"); both cards
  // show the last complete month, which the solar curve carries as a date.
  // (The prototype typed "2026-08" in here.)
  const radial = (charts?.charts ?? []).find((c: Any) => c.template === "radial");
  const period = item?.story.solarMonth?.month ?? radial?.story.solarMonth?.month ?? "";
  const month = /^\d{4}-\d{2}/.test(period)
    ? new Intl.DateTimeFormat("de-DE", { month: "long", timeZone: "UTC" }).format(new Date(period.slice(0, 7) + "-15T12:00:00Z"))
    : "";
  return (
    <div className={`${foundation.foundation} municipal-data sc-dashboard monitor-hero`} data-story-scheme="dark">
      {widget === "live" ? (
        installedKwp > 0 ? <CurrentPower installedKwp={installedKwp} compact weatherSource={weatherSource} /> : null
      ) : item ? (
        <article className="hero-story">
          <h3>{(widget === "radial" ? "Solarerzeugung " : "Einspeisevergütung ") + month}</h3>
          {widget === "radial" && (
            <p className="hero-story-tag">
              {tag
                ? new Date(tag + "T12:00:00Z").toLocaleDateString("de-DE", { day: "numeric", month: "long", timeZone: "UTC" })
                : "Alle Tage des Monats"}
            </p>
          )}
          <div className="hero-story-visual">
            {item.story.solarMonth ? (
              <MonitorMonthlySolarChart data={item.story.solarMonth} compact autoPlay paused={paused} startDelayMs={900} onFinished={onFertig} onTag={setTag} />
            ) : (
              <MunicipalChart story={item.story as StoryConcept} compact />
            )}
          </div>
        </article>
      ) : null}
    </div>
  );
}
