"use client";
import { v } from "../lib/theme";
import { IconCheck } from "./Icons";

/**
 * The step indicator above every calculator flow: numbered steps with their
 * names, done steps ticked and clickable to go back, the current one marked.
 * One component for all flows — it replaced five identical bar strips.
 *
 * The current step's name doubles as the step heading (an <h2>), unless the
 * step asks a longer question (`frage`), which then follows as its own <h2>.
 * Future steps are not clickable: jumping ahead would skip the check that a
 * step has been answered.
 *
 * On narrow screens the row shows numbers only and the current name moves
 * below it as the heading: a centred name under the last of five steps would
 * run off a phone's edge. Only one of the two headings is ever displayed.
 */
export default function FlowSchritte({ schritte, aktiv, onSprung, frage }: {
  schritte: string[];
  aktiv: number;
  /** Go back to a completed step. Without it the done steps are plain text. */
  onSprung?: (i: number) => void;
  /** The current step's question, when it says more than its short name. */
  frage?: string;
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
                {zustand === "aktiv" && !frage
                  ? <h2 className="sc-fs-name">{name}</h2>
                  : <span className="sc-fs-name">{name}</span>}
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
        {!frage && <h2 className="sc-fs-schmal">{schritte[aktiv]}</h2>}
      </nav>
      {frage && <h2 style={{ marginBottom: 18, color: v("--color-text-primary") }}>{frage}</h2>}
    </>
  );
}

// Plain CSS because the narrow-screen rule needs a media query. Colours and
// sizes come from the theme tokens.
const CSS = `
.sc-fs{margin-bottom:24px}
.sc-fs ol{display:flex;list-style:none;margin:0;padding:0}
.sc-fs li{flex:1;min-width:0;position:relative}
.sc-fs li+li::before{content:"";position:absolute;top:11px;right:calc(50% + 17px);left:calc(-50% + 17px);height:2px;border-radius:var(--radius-pill);background:var(--color-progress-inactive);transition:background .3s}
.sc-fs li[data-zustand=fertig]::before,.sc-fs li[data-zustand=aktiv]::before{background:var(--color-cta)}
.sc-fs li>div,.sc-fs li>button{display:flex;flex-direction:column;align-items:center;gap:6px;width:100%;padding:0;border:0;background:none;font:inherit;color:inherit;text-align:center}
.sc-fs li>button{cursor:pointer}
.sc-fs-punkt{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;box-sizing:border-box;border-radius:50%;border:2px solid var(--color-progress-inactive);font-size:var(--font-size-small);font-weight:600;line-height:1;color:var(--color-text-muted);background:var(--color-bg-page);transition:background .3s,border-color .3s,color .3s}
.sc-fs li[data-zustand=aktiv] .sc-fs-punkt,.sc-fs li[data-zustand=fertig] .sc-fs-punkt{border-color:var(--color-cta);background:var(--color-cta);color:var(--color-cta-ink)}
.sc-fs li[data-zustand=aktiv] .sc-fs-punkt{box-shadow:0 0 0 4px color-mix(in srgb,var(--color-cta) 30%,transparent)}
.sc-fs li>button:hover .sc-fs-punkt{box-shadow:0 0 0 4px color-mix(in srgb,var(--color-cta) 30%,transparent)}
.sc-fs-name{margin:0;font-size:var(--font-size-small);font-weight:500;line-height:1.3;color:var(--color-text-muted);white-space:nowrap}
.sc-fs li[data-zustand=aktiv] .sc-fs-name{color:var(--color-text-primary);font-weight:600}
.sc-fs li>button:hover .sc-fs-name{color:var(--color-text-primary);text-decoration:underline;text-underline-offset:3px}
.sc-fs-schmal{display:none;margin:14px 0 0;font-size:var(--font-size-h3);color:var(--color-text-primary)}
@media(max-width:520px){.sc-fs-name{display:none}.sc-fs-schmal{display:block}.sc-fs li>div,.sc-fs li>button{gap:0}}
`;
