"use client";

/**
 * The municipality page's energy monitor, ported from the approved prototype
 * (scripts/municipality-preview/MunicipalDataPreview.tsx). Everything the
 * prototype read from Höchberg's JSON files comes from the town's package;
 * the live solar output reads the weather the parent page already loads
 * (window.atlasWeather, set by GemeindeSzene) — no second weather request.
 */
import { useEffect, useRef, useState } from "react";
import MonitorComposition from "./MonitorComposition";
import { MonitorAnnualEnergyChart } from "./MonitorAnnualEnergyChart";
import { MonitorMonthlySolarChart } from "./MonitorMonthlySolarChart";
import { MunicipalChart } from "../social/MunicipalChart";
import foundation from "../social/atlas-foundations.module.css";
import chart from "../social/StoryConceptLab.module.css";
import type { StoryConcept } from "../../lib/story-konzepte";
import "./municipal-data.css";
import "../dashboard/dashboard.css";
import { dashboardDate } from "../../lib/dashboard/format";
import { ShareDonut } from "../charts/ShareDonut";
import { WidgetSetting } from "../dashboard/WidgetSetting";
import { WidgetFrame } from "../dashboard/WidgetFrame";
import { KpiOverview } from "../dashboard/KpiOverview";
import type { KpiDefinition, WidgetKind } from "../../lib/dashboard/model";
import { MastrLiveRadial } from "../MastrLiveRadial";
import { MastrMap } from "../MastrMap";
import ZubauChart from "../atlas/ZubauChart";
import type { GemeindePaket } from "../../lib/gemeinde-paket";

/* The package keeps prototype data loosely typed (lib/gemeinde-paket.ts). */
/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any;

const formatDate = dashboardDate;
const monthLabel = (month: string) =>
  new Date(month + "-15T12:00:00").toLocaleDateString("de-DE", { month: "long", year: "numeric" });

function kpiGroups(paket: GemeindePaket) {
  const history = paket.monitorHistory as Any;
  const observations: Any[] = history.observations;
  const current = observations[0];
  const population = paket.register?.own.population ?? 0;
  const metric = (
    id: string,
    label: string,
    value: (row: Any) => number,
    unit?: string,
    digits = 0,
    kind: KpiDefinition["kind"] = "stock",
  ): KpiDefinition => {
    const basis = `${history.method}:${paket.registerStand}:${id}:population-${paket.einwohnerStand ?? ""}`;
    const observation = (row: Any) => ({
      end: row.end,
      value: value(row),
      basis,
      ...(kind === "period-total" ? { start: row.end.slice(0, 4) + "-01-01" } : {}),
    });
    return { id, label, unit, digits, kind, cadence: "month-end", current: observation(current), history: observations.slice(1).map(observation) };
  };
  return [
    {
      title: "Solaranlagen",
      items: [
        metric("solar-count", "Anlagen", (r) => r.solarCount, "Stk.", 0),
        metric("solar-power", "Installierte Leistung", (r) => r.solarKwp / 1000, "MWp", 1),
        // Without a population figure a per-resident value would be invented.
        ...(population > 0 ? [metric("solar-per-resident", "Leistung je Einwohner", (r) => (r.solarKwp * 1000) / population, "Wp")] : []),
        metric("solar-additions", "Neue Anlagen dieses Jahr", (r) => r.solarAdditions, "Stk.", 0, "period-total"),
      ],
    },
    {
      title: "Batteriespeicher",
      items: [
        metric("battery-count", "Speicher", (r) => r.batteryCount, "Stk.", 0),
        metric("battery-capacity", "Kapazität", (r) => r.batteryKwh / 1000, "MWh", 1),
      ],
    },
  ];
}

export function CurrentPower({ installedKwp, compact = false }: { installedKwp: number; compact?: boolean }) {
  const [reading, setReading] = useState<Any>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    let versuche = 0;
    const load = () => {
      const source = (parent as Any).atlasWeather;
      if (!source) {
        // The frame can be up before the page has set its weather source;
        // ask again shortly instead of waiting for the five-minute refresh.
        if (++versuche < 10) setTimeout(() => active && load(), 1000);
        else setFailed(true);
        return;
      }
      source
        .load()
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
  }, []);
  const points = reading?.points?.map((point: Any) => ({ ts: point.time, mw: (installedKwp * point.powerPct) / 100000 })) ?? [];
  const current = points.filter((point: Any) => Date.parse(point.ts) <= Date.now()).at(-1);
  const asOf = reading?.power?.asOf
    ? " · Stand " + new Date(reading.power.asOf).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" }) + " Uhr"
    : "";
  return (
    <WidgetFrame title="Solarleistung heute" kind="radial" context={compact ? undefined : <>Aus dem Wetter am Standort simuliert{asOf}</>}>
      <div className="monitor-native-chart monitor-current-power">
        {failed ? (
          <p>Der Tagesverlauf ist gerade nicht verfügbar.</p>
        ) : !reading ? (
          <p>Wetterdaten werden geladen …</p>
        ) : (
          <MastrLiveRadial
            energietraeger="solar"
            installedKwp={installedKwp}
            injected={points}
            highlightTs={current?.ts}
            secondaryBars
            size={compact ? "compact" : "default"}
            unit="MW"
            className="monitor-live-radial"
            bare
            fuelltBreite
          />
        )}
      </div>
    </WidgetFrame>
  );
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

const widgetRole = (item: Any) => {
  const titles: Record<string, string> = {
    anteilsdonut: "Installierte Solarleistung nach Anlagentyp",
    "electricity-value": "Wert des Solarstroms",
    "feed-in-value": "Einspeisevergütung",
    verlauf: "Zubau pro Monat",
    radial: "Solarerzeugung im Tagesverlauf",
    "energy-year": "Solar- und Windpotenzial im Jahresverlauf",
  };
  return {
    title:
      titles[item.template] ??
      (item.story.countComparison?.label ? item.story.countComparison.label + ": Anteil an Anzahl und Leistung" : "Anlagenbestand"),
    kind:
      ({ anteilsdonut: "donut", anlagenraster: "composition", verlauf: "time-series", "energy-year": "radial", radial: "radial" } as Record<string, WidgetKind>)[
        item.template
      ] ?? "number",
  };
};

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
        visual: row.label === "Gebäudeanlagen" ? "/brand/rank-house.webp" : "/brand/rank-balcony-modern.webp",
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
  return (
    <WidgetFrame
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
          <MonitorComposition story={compositionStory} />
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
    </WidgetFrame>
  );
}

function AnnualGrowth({ years, stand }: { years: { year: number; count: number }[]; stand: string }) {
  const [range, setRange] = useState("all");
  const end = Number(stand.slice(0, 4));
  return (
    <WidgetFrame
      title="Zubau pro Jahr"
      kind="time-series"
      context={<>Letztes Update: {formatDate(stand)}</>}
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
  const perYear: Record<number, number> = {};
  for (const row of (register?.series ?? []) as Any[]) if (row.energietraeger === "solar") perYear[row.year] = (perYear[row.year] ?? 0) + row.count;
  const years = Object.entries(perYear)
    .map(([year, count]) => ({ year: Number(year), count }))
    .sort((a, b) => a.year - b.year);
  const hasHistory = ((paket.monitorHistory as Any)?.observations ?? []).length > 0;
  const sections = ["Anlagenbestand", "Strom und Wert"];
  const population = paket.einwohnerStand ? formatDate(paket.einwohnerStand) : null;

  return (
    <div ref={root} className={`${foundation.foundation} municipal-data sc-dashboard`} data-story-scheme="dark">
      {hasHistory && (
        <KpiOverview
          groups={kpiGroups(paket)}
          help={
            <>
              <p>Gezählt werden heute erfasste Anlagen nach ihrem Inbetriebnahmedatum. Stillgelegte Anlagen fehlen; Nachmeldungen können frühere Werte verändern.</p>
              {population && <p>Für „je Einwohner“ verwenden wir durchgehend die Einwohnerzahl vom {population}.</p>}
            </>
          }
        />
      )}
      <section aria-label="Aktuelle Solarleistung und Ausbau">
        <div className="sc-widget-grid">
          {installedKwp > 0 && <CurrentPower installedKwp={installedKwp} />}
          {years.length > 0 && <AnnualGrowth years={years} stand={paket.registerStand} />}
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
      <LocalMap paket={paket} />
    </div>
  );
}

/**
 * The compact card in the hero (port of HeroWidgetPreview): one of three
 * monitor readings, switched by the page through postMessage. A click opens
 * the full monitor further down the page.
 */
export function GemeindeKopfMonitor({ paket }: { paket: GemeindePaket }) {
  const charts = paket.charts as Any;
  const [widget, setWidget] = useState(() => {
    const start = typeof location === "undefined" ? null : new URLSearchParams(location.search).get("widget");
    return ["feed-in-value", "live", "radial"].includes(start ?? "") ? (start as string) : "feed-in-value";
  });
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.origin === location.origin && event.source === parent && event.data?.type === "atlas-hero-widget" && ["feed-in-value", "live", "radial"].includes(event.data.widget))
        setWidget(event.data.widget);
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, []);
  const item = (charts?.charts ?? []).find((c: Any) => c.template === widget);
  const installedKwp = ((paket.register?.chartMix as Any)?.values ?? []).reduce((sum: number, row: Any) => sum + row.value, 0);
  const period = item?.story.solarMonth?.month ?? item?.story.period ?? "";
  const month = /^\d{4}-\d{2}/.test(period)
    ? new Intl.DateTimeFormat("de-DE", { month: "long", timeZone: "UTC" }).format(new Date(period.slice(0, 7) + "-15T12:00:00Z"))
    : "";
  useEffect(() => {
    let active = true;
    Promise.all([document.fonts.ready, ...Array.from(document.images).map((image) => image.decode().catch(() => {}))]).then(() => {
      if (active) parent.postMessage({ type: "atlas-hero-ready" }, location.origin);
    });
    return () => {
      active = false;
    };
  }, [widget]);
  return (
    <a
      href="#atlas-data"
      target="_parent"
      onClick={(event) => {
        event.preventDefault();
        parent.postMessage({ type: "atlas-hero-open-monitor" }, location.origin);
      }}
      aria-label="Zum Energiemonitor"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="hero-monitor-link"
    >
      <div className={`${foundation.foundation} municipal-data sc-dashboard monitor-hero`} data-story-scheme="dark">
        {widget === "live" ? (
          installedKwp > 0 ? <CurrentPower installedKwp={installedKwp} compact /> : null
        ) : item ? (
          <article className="hero-story">
            <h3>{(widget === "radial" ? "Solarerzeugung " : "Einspeisevergütung ") + month}</h3>
            <div className="hero-story-visual">
              {item.story.solarMonth ? (
                <MonitorMonthlySolarChart data={item.story.solarMonth} compact autoPlay paused={paused} />
              ) : (
                <MunicipalChart story={item.story as StoryConcept} compact />
              )}
            </div>
          </article>
        ) : null}
      </div>
    </a>
  );
}
