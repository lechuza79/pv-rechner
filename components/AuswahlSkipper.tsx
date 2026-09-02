// Kein "use client": Der Skipper wird aus Client-Komponenten heraus gerendert,
// die die Grenze schon gezogen haben. Als eigener Einstiegspunkt müsste jede
// Eigenschaft über die Grenze serialisierbar sein — der Rückkanal für die Wahl
// ist eine Funktion und wäre es nicht.

import SelectField from "./SelectField";
import { v, space } from "../lib/theme";

// Auswahl plus Blättern: ein Aufklappfeld für den gezielten Sprung, zwei Pfeile
// für den Weg durch die Reihe.
//
// Beide Teile gab es im Haus, aber nie zusammen: das Aufklappfeld als
// `SelectField`, die Pfeile inline in der Ereignis-Zeitleiste. Wer eine Reihe
// durchsehen will, ohne jedes Mal aufzuklappen, brauchte bisher an jeder Stelle
// eine eigene Kopie — und die zweite Kopie sieht immer ein bisschen anders aus
// als die erste.
//
// Die Pfeile sind KEINE Zierde neben dem Feld. Sie beantworten eine andere
// Frage: Das Feld dient dem Sprung zu einem bekannten Eintrag, die Pfeile dem
// Durchsehen, wenn man noch nicht weiß, wohin. Deshalb enden sie am Rand und
// laufen nicht um — wer am Ende ankommt, soll das merken, statt unbemerkt von
// vorne anzufangen.

export type SkipperEintrag = {
  wert: string;
  /** Was im Feld steht. */
  text: string;
  /** Zusatz hinter dem Namen, etwa eine Anzahl. Optional. */
  zusatz?: string;
};

export function AuswahlSkipper({
  eintraege,
  wert,
  onWaehle,
  ariaLabel,
  maxWidth = 320,
}: {
  eintraege: SkipperEintrag[];
  wert: string;
  onWaehle: (wert: string) => void;
  ariaLabel: string;
  maxWidth?: number;
}) {
  const index = eintraege.findIndex((e) => e.wert === wert);
  const gehe = (richtung: -1 | 1) => {
    const ziel = index + richtung;
    if (ziel < 0 || ziel >= eintraege.length) return;
    onWaehle(eintraege[ziel].wert);
  };

  const pfeil = (richtung: -1 | 1, zeichen: string, label: string) => {
    const gesperrt = index + richtung < 0 || index + richtung >= eintraege.length;
    return (
      <button
        type="button"
        onClick={() => gehe(richtung)}
        disabled={gesperrt}
        aria-label={label}
        style={{
          width: 38,
          height: 38,
          flex: "0 0 auto",
          borderRadius: v("--radius-md"),
          border: `1px solid ${v("--color-border")}`,
          background: v("--color-bg-muted"),
          color: v("--color-text-secondary"),
          fontSize: v("--font-size-h3"),
          lineHeight: 1,
          cursor: gesperrt ? "default" : "pointer",
          opacity: gesperrt ? 0.4 : 1,
        }}
      >
        {zeichen}
      </button>
    );
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: space.xs, maxWidth: maxWidth + 84 }}>
      <SelectField
        value={wert}
        onChange={(e) => onWaehle(e.target.value)}
        ariaLabel={ariaLabel}
        maxWidth={maxWidth}
      >
        {eintraege.map((e) => (
          <option key={e.wert} value={e.wert}>
            {e.zusatz ? `${e.text} · ${e.zusatz}` : e.text}
          </option>
        ))}
      </SelectField>
      {pfeil(-1, "‹", `Vorheriges: ${ariaLabel}`)}
      {pfeil(1, "›", `Nächstes: ${ariaLabel}`)}
    </div>
  );
}
