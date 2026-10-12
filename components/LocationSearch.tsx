"use client";
import { useCallback, useState } from "react";
import ActionButton from "./ActionButton";
import OnsiteSearch, { type OnsiteSearchItem } from "./OnsiteSearch";

export type SearchLocation = { ags: string; name: string; plz: string; kind?: string; context?: string };
export async function searchLocations(query: string, signal: AbortSignal, county?: string): Promise<OnsiteSearchItem[]> {
  const params = new URLSearchParams({ q: query });
  if (county) params.set("kreis", county);
  let response = await fetch(`/api/suche/standorte?${params}`, { signal });
  if (!response.ok && response.status >= 500 && !signal.aborted) response = await fetch(`/api/suche/standorte?${params}`, { signal });
  if (!response.ok) throw new Error("Die Ortssuche ist gerade nicht erreichbar. Bitte erneut versuchen.");
  const data = await response.json() as { hits: SearchLocation[] };
  return data.hits.map(place => ({ id: JSON.stringify(place), label: [place.plz, place.name].filter(Boolean).join(" "), description: [place.kind, place.context].filter(Boolean).join(" · ") }));
}

/** Live simulation field; the shared search owns suggestions and keyboard behavior. */
export default function LocationSearch({ selected, onPick, onClear, onLocate, municipalitiesOnly = false, appearance = "simulation", placeholder }: {
  appearance?: "default" | "simulation";
  placeholder?: string;
  selected: SearchLocation | null; onPick: (place: SearchLocation) => void; onClear: () => void; onLocate?: () => void; municipalitiesOnly?: boolean;
}) {
  const [county, setCounty] = useState<SearchLocation | null>(null);
  const load = useCallback((query: string, signal: AbortSignal) => searchLocations(query, signal, county?.ags), [county]);
  return <div>
    <OnsiteSearch key={county?.ags ?? "all"} appearance={appearance} alwaysOpen align="left"
      selectedLabel={selected ? [selected.plz, selected.name].filter(Boolean).join(" ") : ""}
      onClear={() => { setCounty(null); onClear(); }} onLocate={onLocate}
      minQueryLength={county ? 0 : 2} ariaLabel="Postleitzahl, Ort oder Landkreis"
      placeholder={county ? "Ort im Landkreis suchen" : placeholder ?? "PLZ, Ort oder Landkreis"} loadItems={load}
      onPick={hit => { const place = JSON.parse(hit.id) as SearchLocation; if (municipalitiesOnly && !place.plz) setCounty(place); else onPick(place); }} />
    {county && !selected && <p>Ort im {county.name} wählen. <ActionButton variant="text" onClick={() => setCounty(null)}>Alle Orte suchen</ActionButton></p>}
  </div>;
}
