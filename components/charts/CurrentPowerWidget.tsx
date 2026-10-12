"use client";

import {useEffect, useState} from "react";
import {useWidgetResource} from "../dashboard/WidgetData";
import {MastrLiveRadial} from "../MastrLiveRadial";
import {ExportOnly} from "../WidgetExport";
import {useWidgetPresentation} from "../dashboard/WidgetPresentationContext";
import styles from "./CurrentPowerWidget.module.css";
import SecondaryButton from "../SecondaryButton";
import {WidgetFrame} from "../dashboard/WidgetFrame";
import "../gemeinde/municipal-data.css";
import "../dashboard/dashboard.css";

// Preserve the existing weather adapter while sharing it across regional surfaces.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

export type SolarWeatherSource = { endpoint?: string; load: () => Promise<unknown>; tag?: () => Promise<unknown> };

export function CurrentPower({ installedKwp, compact = false, weatherSource, frameless = false, overview = false }: { installedKwp: number; compact?: boolean; weatherSource?: SolarWeatherSource; frameless?: boolean; overview?: boolean }) {
  const allocated = useWidgetPresentation().layout === "allocated";
  const [localReading, setReading] = useState<Any>(null);
  const [localObservedAt, setLocalObservedAt] = useState(0);
  const resource=useWidgetResource<Any>(weatherSource?.endpoint??null,null);
  const reading=weatherSource?.endpoint?resource.data:localReading;
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if(weatherSource?.endpoint)return;
    let active = true;
    let versuche = 0;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let loading = false;
    const retry = () => {
      clearTimeout(retryTimer);
      if (active) retryTimer = setTimeout(load, ++versuche <= 3 ? 5000 : 60000);
    };
    const load = () => {
      if (!active || loading) return;
      clearTimeout(retryTimer);
      const source = weatherSource ?? (parent as Any).atlasWeather;
      if (!source) {
        // The frame can be up before the page has set its weather source;
        // ask again shortly instead of waiting for the five-minute refresh.
        setFailed(true);
        retry();
        return;
      }
      // "Now" comes with the scene's weather, today's curve on its own call
      // (the scene must not wait for the curve).
      loading = true;
      Promise.all([source.load(), source.tag ? source.tag() : Promise.resolve(null)])
        .then(([jetzt, tag]: Any[]) => ({ ...jetzt, points: tag?.points ?? jetzt?.points }))
        .then((result: Any) => {
          if (!active) return;
          // "Now" without today's curve would draw an empty dial; say that
          // the curve is missing and ask again in a minute.
          if (!result?.points?.length) {
            setFailed(true);
            retry();
            return;
          }
          versuche = 0;
          setReading(result);
          setLocalObservedAt(Date.now());
          setFailed(false);
        })
        .catch(() => {
          if (active) { setFailed(true); retry(); }
        })
        .finally(() => { loading = false; });
    };
    const onVisible = () => { if (!document.hidden) load(); };
    window.addEventListener("online", load);
    document.addEventListener("visibilitychange", onVisible);
    load();
    const timer = setInterval(load, 300000);
    return () => {
      active = false;
      clearInterval(timer);
      clearTimeout(retryTimer);
      window.removeEventListener("online", load);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [weatherSource, attempt]);
  const points = reading?.points?.map((point: Any) => ({ ts: point.time, mw: ((reading.installedKwp ?? installedKwp) * point.powerPct) / 100000 })) ?? [];
  // Use the observation clock on both server and client, including delayed hydration.
  const observedAt = weatherSource?.endpoint ? resource.fetchedAt : localObservedAt;
  const current = points.filter((point: Any) => Date.parse(point.ts) <= observedAt).at(-1);
  const asOf = reading?.power?.asOf
    ? " · Stand " + new Date(reading.power.asOf).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" }) + " Uhr"
    : "";
  const content = (
      <div className={`monitor-native-chart monitor-current-power ${allocated ? styles.allocated : ""}`} data-export-ready={Boolean(reading)&&!failed}>
        {(weatherSource?.endpoint?resource.error&&!reading:failed) ? (
          <div role="status"><p>Der Tagesverlauf ist gerade nicht verfügbar.</p><SecondaryButton onClick={() => { setFailed(false); setAttempt(value => value + 1); resource.refetch(); }}>Erneut versuchen</SecondaryButton></div>
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
        {reading&&!failed&&<ExportOnly><p style={{padding:"0 var(--widget-padding)",fontSize:"var(--font-size-small)"}}>Modellierter Tagesverlauf{points[0]?.ts?` vom ${new Date(points[0].ts).toLocaleDateString("de-DE",{timeZone:"Europe/Berlin"})}`:""}{reading.power?.asOf?` · Wetterstand: ${new Date(reading.power.asOf).toLocaleString("de-DE",{timeZone:"Europe/Berlin"})} Uhr`:""}.</p></ExportOnly>}
      </div>
  );
  return frameless ? content : <WidgetFrame title="Solarleistung heute" kind="radial" context={compact ? undefined : <>Aus dem Wetter am Standort simuliert{asOf}</>}>{content}</WidgetFrame>;
}
