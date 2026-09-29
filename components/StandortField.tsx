"use client";
import { useEffect, useId, useState } from "react";
import type { SuchErgebnis } from "../lib/suche";
import styles from "./StandortField.module.css";
import { v, iconSizes } from "../lib/theme";
import { IconArrowRight, IconCheck, IconClose } from "./Icons";

// Kompaktes „Standort"-Feld für die Ergebnisseite: PLZ eingeben → standortgenauer
// Ertrag (PVGIS). Geteilt zwischen PV-Rechner (ResultHeroCard) und
// Balkonkraftwerk-Rechner, damit die nachträgliche PLZ-Eingabe überall gleich ist.
interface StandortFieldProps {
  searchPlaces?: boolean;
  checkedPlace?: { plz: string; ags: string; name: string } | null;
  onSearchChange?: () => void;
  onPlaceSelect?: (place: { plz: string; ags: string; name: string }) => void | Promise<void>;
  plz: string;
  onPlzChange: (cleaned: string) => void; // erhält die bereits auf Ziffern reduzierte PLZ
  loading: boolean;
  confirmed: boolean;                      // wurde ein Standort übernommen?
  approximate?: boolean;                   // true = regionaler Näherungswert (~) statt exaktem PVGIS
  onSubmit: () => void;
  label?: string;
  submitLabel?: string;
}

export default function StandortField({
  plz, onPlzChange, loading, confirmed, approximate = false, onSubmit, label = "Standort", submitLabel, searchPlaces, onPlaceSelect, onSearchChange, checkedPlace,
}: StandortFieldProps) {
  if (searchPlaces && onPlaceSelect) return <PlaceField plz={plz} loading={loading} onPick={onPlaceSelect} onSearchChange={onSearchChange} checkedPlace={checkedPlace} submitLabel={submitLabel} />;
  return (
    // flexWrap/rowGap + flexShrink: auf schmalen Schirmen rutscht das Feld lieber in
    // die naechste Zeile, als gequetscht zu werden (Fix aus dem PV-Rechner, beim
    // Zusammenfuehren der beiden PLZ-Felder hierher uebernommen).
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", rowGap: 4 }}>
      <span style={{ color: v('--color-text-secondary') }}>{label}</span>
      <form onSubmit={e => { e.preventDefault(); onSubmit(); }} style={{ display: "inline-flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
        <input
          value={plz}
          placeholder="PLZ"
          aria-label="Postleitzahl eingeben"
          inputMode="numeric"
          maxLength={5}
          className={!confirmed && !loading ? "sc-plz-pulse" : undefined}
          onChange={e => onPlzChange(e.target.value.replace(/\D/g, "").slice(0, 5))}
          style={{
            // fontSize >= 16px prevents iOS Safari auto-zoom on focus. Width must fit
            // five monospace digits at that size — 56px clipped the first digit.
            width: 68, textAlign: "center", fontSize: v("--font-size-lead"), fontWeight: 700,
            fontFamily: v('--font-mono'),
            color: plz.length === 5 ? v('--color-accent') : v('--color-text-secondary'),
            background: plz.length === 5 ? v('--color-accent-dim') : v('--color-bg'),
            border: plz.length === 5 ? `1px solid ${v('--color-border-accent')}` : `1px dashed ${v('--color-text-faint')}`,
            borderRadius: v('--radius-sm'), padding: "3px 4px", outline: "none",
          }}
        />
        {(submitLabel || plz.length === 5) && !loading && !confirmed && (
          <button type="submit" disabled={plz.length !== 5} aria-label={submitLabel ?? "Standort übernehmen"} style={{
            padding: "3px 6px", fontSize: v("--font-size-caption"), fontWeight: 700, lineHeight: 1,
            background: v('--color-cta'), color: v('--color-text-on-accent'),
            border: "none", borderRadius: v("--radius-pill"), cursor: "pointer",
          }}>{submitLabel ?? <IconArrowRight size={iconSizes.sm} color={v('--color-text-on-accent')} />}</button>
        )}
        {loading && <span style={{ color: v('--color-accent'), fontSize: v("--font-size-micro") }}>…</span>}
        {confirmed && <span style={{ fontSize: v("--font-size-micro"), color: v('--color-text-faint') }}>{approximate ? "~" : <IconCheck size={iconSizes.xs} />}</span>}
      </form>
    </div>
  );
}

/** Reuses the site search and its municipality/postcode resolution. */
function PlaceField({ plz, loading, onPick, onSearchChange, checkedPlace, submitLabel = "Förderung prüfen" }: { submitLabel?: string; checkedPlace?: { plz: string; ags: string; name: string } | null; onSearchChange?: () => void; plz: string; loading: boolean; onPick: (place: { plz: string; ags: string; name: string }) => void | Promise<void> }) {
  const id = useId();
  const [query, setQuery] = useState(checkedPlace ? `${checkedPlace.plz} ${checkedPlace.name}` : plz);
  const [hits, setHits] = useState<{ plz: string; ags: string; name: string; context: string }[]>([]);
  const [selected, setSelected] = useState<{ plz: string; ags: string; name: string } | null>(checkedPlace ?? null);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState("");
  const [checked, setChecked] = useState(!!checkedPlace);
  const [checking, setChecking] = useState(false);
  const reset = (value: string) => { onSearchChange?.(); setQuery(value); setSelected(null); setHits([]); setMessage(""); setSearching(false); setChecked(false); };
  useEffect(() => {
    if (checkedPlace || selected?.plz === plz) return;
    setQuery(plz); setSelected(null); setHits([]);
  }, [plz]);
  useEffect(() => {
    if (selected || query.trim().length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(`/api/suche?q=${encodeURIComponent(query.trim())}`, { signal: controller.signal });
        if (!response.ok) throw new Error("Search unavailable");
        const data: SuchErgebnis = await response.json();
        if (controller.signal.aborted) return;
        const places = data.orte.flatMap(place => {
          const link = place.links.find(link => /^\d{5}$/.test(new URL(link.href, window.location.origin).searchParams.get("plz") ?? ""));
          const postcode = link && new URL(link.href, window.location.origin).searchParams.get("plz");
          return postcode ? [{ plz: postcode, ags: place.ags, name: place.name, context: place.kontext }] : [];
        });
        setHits(places);
        setMessage(data.orteNichtVerfuegbar ? "Die Ortssuche ist gerade nicht erreichbar. Bitte erneut versuchen." : places.length ? "" : "Kein passender Ort gefunden.");
      } catch { if (!controller.signal.aborted) setMessage("Die Ortssuche ist gerade nicht erreichbar. Bitte erneut versuchen."); }
      finally { if (!controller.signal.aborted) setSearching(false); }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, selected]);
  return <div className={styles.field}>
    <label htmlFor={id}>Postleitzahl oder Ort</label>
    <form onSubmit={async event => {
      event.preventDefault();
      if (!selected || loading || checking || checked) return;
      setChecking(true);
      try { await onPick(selected); setChecked(true); }
      catch { setMessage("Die Prüfung ist fehlgeschlagen. Bitte erneut versuchen."); }
      finally { setChecking(false); }
    }}>
      <div className={styles.inputWrap}>
      <input id={id} type="text" autoComplete="off" placeholder="z. B. 27793 oder Wildeshausen" value={query}
        readOnly={checked} disabled={checking || loading} onChange={event => reset(event.target.value)} />
      {query && <button className={styles.clear} type="button" aria-label="Standort löschen" disabled={checking || loading} onClick={() => { reset(""); document.getElementById(id)?.focus(); }}><IconClose size={iconSizes.sm} /></button>}
      </div>
      <button type="submit" disabled={!selected || loading || checking || checked}>{checking || loading ? "Wird gespeichert …" : submitLabel}</button>
    </form>
    {searching && <p role="status">Orte werden gesucht …</p>}
    {message && <p role="status">{message}</p>}
    {hits.length > 0 && <ul aria-label="Gefundene Orte">{hits.map(hit => <li key={`${hit.ags}-${hit.plz}`}><button type="button" onClick={() => { onSearchChange?.(); setChecked(false); setSelected(hit); setQuery(`${hit.plz} ${hit.name}`); setHits([]); setMessage(""); }}><strong>{hit.plz} {hit.name}</strong>{hit.context && <span>{hit.context}</span>}</button></li>)}</ul>}
  </div>;
}
