"use client";

import {useEffect, useState} from "react";
import {MastrLiveRadial} from "../MastrLiveRadial";
import {ExportOnly} from "../WidgetExport";
import {WidgetFrame} from "../dashboard/WidgetFrame";
import "../gemeinde/municipal-data.css";
import "../dashboard/dashboard.css";

// Preserve the existing weather adapter while sharing it across regional surfaces.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

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
      <div className="monitor-native-chart monitor-current-power" data-export-ready={Boolean(reading)&&!failed}>
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
        {reading&&!failed&&<ExportOnly><p style={{padding:"0 var(--widget-padding)",fontSize:"var(--font-size-small)"}}>Modellierter Tagesverlauf{points[0]?.ts?` vom ${new Date(points[0].ts).toLocaleDateString("de-DE",{timeZone:"Europe/Berlin"})}`:""}{reading.power?.asOf?` · Wetterstand: ${new Date(reading.power.asOf).toLocaleString("de-DE",{timeZone:"Europe/Berlin"})} Uhr`:""}.</p></ExportOnly>}
      </div>
  );
  return frameless ? content : <WidgetFrame title="Solarleistung heute" kind="radial" context={compact ? undefined : <>Aus dem Wetter am Standort simuliert{asOf}</>}>{content}</WidgetFrame>;
}
