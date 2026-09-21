"use client";
import { v } from "../lib/theme";
import { IconCheck } from "./Icons";

/**
 * The step indicator above every calculator flow: numbered steps with a
 * one-word name to the right, done steps ticked (neutral) and clickable to go
 * back, the current one filled. One component for all flows — it replaced
 * five identical bar strips.
 *
 * The row carries short names ("Haus", "Dämmung"); the step's full title
 * (`titel`) follows below as its <h2>. Future steps are not clickable: jumping
 * ahead would skip the check that a step has been answered.
 *
 * On narrow screens only the current step keeps its name next to the number,
 * so five steps still fit a phone.
 */
export default function FlowSchritte({ schritte, aktiv, titel, onSprung }: {
  /** One word per step, in order. */
  schritte: string[];
  aktiv: number;
  /** Heading of the current step. */
  titel: string;
  /** Go back to a completed step. Without it the done steps are plain text. */
  onSprung?: (i: number) => void;
}) {
  return (
    <>
      <style>{CSS}</style>
      <nav aria-label="Fortschritt" className="sc-fs">
        <ol>
          {schritte.map((name, i) => {
            const zustand = i < aktiv ? "fertig" : i === aktiv ? "aktiv" : "offen";
            const inhalt = (
              <>
                <span className="sc-fs-punkt" aria-hidden="true">
                  {zustand === "fertig" ? <IconCheck size={12} /> : i + 1}
                </span>
                <span className="sc-fs-name">{name}</span>
              </>
            );
            return (
              <li key={name} data-zustand={zustand} aria-current={zustand === "aktiv" ? "step" : undefined}>
                {zustand === "fertig" && onSprung
                  ? <button type="button" onClick={() => onSprung(i)} aria-label={`Zurück zu Schritt ${i + 1}: ${name}`}>{inhalt}</button>
                  : <div>{inhalt}</div>}
              </li>
            );
          })}
        </ol>
      </nav>
      <h2 style={{ marginBottom: 18, color: v("--color-text-primary") }}>{titel}</h2>
    </>
  );
}

// Plain CSS because the narrow-screen rule needs a media query. Colours and
// sizes come from the theme tokens; the lines and done steps stay neutral,
// only the current step carries the accent. Its inner ring is translucent ink,
// so it separates the fill from any background stage (light or dark).
const CSS = `
.sc-fs{margin-bottom:20px}
.sc-fs ol{display:flex;align-items:center;list-style:none;margin:0;padding:0}
.sc-fs li{display:flex;align-items:center;flex:1 1 auto;min-width:0}
.sc-fs li:not(:last-child)::after{content:"";flex:1 1 12px;min-width:8px;height:2px;margin:0 8px;border-radius:var(--radius-pill);background:var(--color-border)}
.sc-fs li:last-child{flex:0 0 auto}
.sc-fs li>div,.sc-fs li>button{display:flex;align-items:center;gap:8px;flex:none;padding:0;border:0;background:none;font:inherit;color:inherit;text-align:left}
.sc-fs li>button{cursor:pointer}
.sc-fs-punkt{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;flex:none;box-sizing:border-box;border-radius:50%;border:2px solid var(--color-border);font-size:var(--font-size-small);font-weight:600;line-height:1;color:var(--color-text-muted);transition:background .3s,border-color .3s,color .3s}
.sc-fs li[data-zustand=fertig] .sc-fs-punkt{border-color:transparent;background:color-mix(in srgb,var(--color-text-primary) 10%,transparent);color:var(--color-text-secondary)}
.sc-fs li[data-zustand=aktiv] .sc-fs-punkt{border:0;background:var(--color-cta);color:var(--color-cta-ink);box-shadow:inset 0 0 0 1.5px color-mix(in srgb,var(--color-cta-ink) 22%,transparent)}
.sc-fs li>button:hover .sc-fs-punkt{background:color-mix(in srgb,var(--color-text-primary) 18%,transparent)}
.sc-fs-name{font-size:var(--font-size-small);font-weight:500;line-height:1.3;color:var(--color-text-muted);white-space:nowrap}
.sc-fs li[data-zustand=aktiv] .sc-fs-name{color:var(--color-text-primary);font-weight:600}
.sc-fs li>button:hover .sc-fs-name{color:var(--color-text-primary);text-decoration:underline;text-underline-offset:3px}
@media(max-width:520px){.sc-fs li:not([data-zustand=aktiv]) .sc-fs-name{display:none}}
`;
