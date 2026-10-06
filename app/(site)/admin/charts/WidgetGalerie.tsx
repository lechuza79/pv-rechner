"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { v } from "../../../../lib/theme";
import WerkstattVorschau, { type VorschauDaten } from "./WerkstattVorschau";
import type { MonitorSchluessel } from "./werkstatt-bestand";

export type Karte = {
  id: string;
  titel: string;
  stand: string;
  unter: string;
  vorschau: { art: "monitor"; schluessel: MonitorSchluessel } | { art: "einbettung"; src: string } | { art: "keine"; grund: string };
};

/** Visible height of a card's preview; the widget keeps its natural width (the card's). */
const HOEHE = 420;

/**
 * A card shows the REAL widget at the card's width (widgets are responsive; a
 * scaled-down copy was unreadable and embeds did not paint at all). It
 * mounts only when the card comes near the viewport, so the gallery never
 * starts all charts, animations and data requests at once.
 */
function Kachel({ karte, daten }: { karte: Karte; daten: VorschauDaten | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const [nah, setNah] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setNah(true), { rootMargin: "300px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  let inhalt: ReactNode = null;
  if (karte.vorschau.art === "keine") inhalt = <p style={{ margin: 0, padding: 16, fontSize: v("--font-size-small"), color: v("--color-text-muted") }}>Keine Vorschau: {karte.vorschau.grund}</p>;
  else if (nah && karte.vorschau.art === "monitor" && daten) inhalt = <WerkstattVorschau schluessel={karte.vorschau.schluessel} daten={daten} aktionen="menu" nackt />;
  else if (nah && karte.vorschau.art === "einbettung") inhalt = <iframe src={karte.vorschau.src} title={`Vorschau: ${karte.titel}`} tabIndex={-1} style={{ width: "100%", height: HOEHE, border: 0, background: "transparent" }} />;
  return (
    <Link href={`/admin/charts/${karte.id}`} style={{ display: "flex", flexDirection: "column", textDecoration: "none", color: "inherit", border: `1px solid ${v("--color-border")}`, borderRadius: 16, overflow: "hidden", background: v("--color-bg") }}>
      <div ref={ref} aria-hidden="true" style={{ position: "relative", height: HOEHE, overflow: "hidden", overflowY: "hidden", background: v("--color-bg-muted"), borderBottom: `1px solid ${v("--color-border")}` }}>
        {karte.vorschau.art === "keine" ? inhalt : (
          <div inert style={{ pointerEvents: "none", padding: karte.vorschau.art === "monitor" ? 8 : 0 }}>{inhalt}</div>
        )}
      </div>
      <div style={{ padding: "12px 14px" }}>
        <div style={{ fontWeight: 700, fontSize: v("--font-size-body"), color: v("--color-text-primary") }}>{karte.titel}</div>
        <div style={{ marginTop: 2, fontSize: v("--font-size-caption"), color: v("--color-text-muted") }}>{karte.stand} · {karte.unter}</div>
      </div>
    </Link>
  );
}

export default function WidgetGalerie({ karten, daten }: { karten: Karte[]; daten: VorschauDaten | null }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 380px), 1fr))", gap: 20 }}>
      {karten.map((k) => <Kachel key={k.id} karte={k} daten={daten} />)}
    </div>
  );
}
