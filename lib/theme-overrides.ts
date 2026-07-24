// Admin theming overlay — per-stage, per-token green overrides.
//
// This is a pure, isomorphic module (no DB, no React): types, the editable
// token catalogue, colour validation, and the CSS emitter. It layers ON TOP of
// the design system in lib/theme.ts without touching it — theme.ts stays the
// computed base + the seven brightness stages, and a saved override for
// (stage, token) is injected as one extra CSS block that wins by source order.
//
// Server read + caching lives in lib/theme-overrides-data.ts; the admin UI in
// app/(site)/admin/theme. Persistence: Supabase table `theme_overrides`.

import type { TokenName } from "./theme";
import { STAGE_COUNT, stageDefaults } from "./theme";

// ─── Stages ─────────────────────────────────────────────────────────────────
// s6 = brightest (full sun) … s0 = deep night. Same ids as the data-theme
// attribute set by the boot script. Ordered bright→dark for the admin UI.
export type StageId = `s${number}`;

export interface StageMeta {
  id: StageId;
  /** Human label for the admin UI. */
  label: string;
  /** Short note on when this stage shows. */
  hint: string;
  /** True = light background (dark text); false = dark background. */
  light: boolean;
}

/** Bright → dark, matching how the sun dims the page through the day. */
export const STAGES: StageMeta[] = [
  { id: "s6", label: "Volle Sonne", hint: "Heller Tag, viel Ertrag", light: true },
  { id: "s5", label: "Heller Tag", hint: "Tag, mittlerer Ertrag", light: true },
  { id: "s4", label: "Bedeckter Tag", hint: "Tag, wenig Ertrag", light: true },
  { id: "s3", label: "Trüb", hint: "Bedeckt, hellster dunkler Übergang", light: true },
  { id: "s2", label: "Dämmerung", hint: "Sonne am Horizont", light: false },
  { id: "s1", label: "Späte Dämmerung", hint: "Zwischen Dämmerung und Nacht", light: false },
  { id: "s0", label: "Nacht", hint: "Sonne unter dem Horizont", light: false },
];

/** Stage id → numeric index (s0 → 0 … s6 → 6). */
export function stageIndex(id: StageId): number {
  const n = Number(id.slice(1));
  return Number.isFinite(n) ? Math.max(0, Math.min(STAGE_COUNT - 1, n)) : 0;
}

// ─── Editable signal-colour tokens ───────────────────────────────────────────
// The semantic colour ROLES the audit surfaced. Started with green (positive +
// energy); red (negative) was added so the same per-stage editor tunes the
// negative signal colour too. Every token is editable per stage. `alpha` marks
// tokens whose value is an rgba (needs a text field — the native colour picker
// has no alpha channel).
export type ThemeRole = "positive" | "energy" | "negative";

export interface ThemeToken {
  token: TokenName;
  label: string;
  role: ThemeRole;
  /** Value carries transparency (rgba) rather than a solid hex. */
  alpha?: boolean;
}

export const THEME_TOKENS: ThemeToken[] = [
  // Positiv-Grün — UI-Signalfarbe
  { token: "--color-positive", label: "Positiv-Grün", role: "positive" },
  { token: "--color-highlight", label: "Highlight (Live)", role: "positive" },
  { token: "--color-awareness", label: "Awareness", role: "positive" },
  { token: "--color-chart-positive-bg", label: "Chart-Fläche", role: "positive", alpha: true },
  // Negativ-Rot — UI-Signalfarbe (Kosten, Verluste, Tendenz-Badges „unter Schnitt")
  { token: "--color-negative", label: "Negativ-Rot", role: "negative" },
  { token: "--color-negative-text", label: "Negativ-Text (lesbar)", role: "negative" },
  { token: "--color-chart-negative-bg", label: "Chart-Fläche", role: "negative", alpha: true },
  // Energie-Grün — Datenvisualisierung
  { token: "--color-energy-solar", label: "Solar", role: "energy" },
  { token: "--color-energy-wind", label: "Wind onshore", role: "energy" },
  { token: "--color-energy-wind-offshore", label: "Wind offshore", role: "energy" },
  { token: "--color-energy-hydro", label: "Wasserkraft", role: "energy" },
  { token: "--color-energy-biomass", label: "Biomasse", role: "energy" },
  { token: "--color-energy-geothermal", label: "Geothermie", role: "energy" },
  { token: "--color-energy-cat-renewable", label: "Erneuerbare (Summe)", role: "energy" },
];

const EDITABLE_TOKENS = new Set<string>(THEME_TOKENS.map((g) => g.token));
const VALID_STAGES = new Set<string>(STAGES.map((s) => s.id));

// ─── Overrides shape ─────────────────────────────────────────────────────────
/** { s0: { "--color-positive": "#..." }, s6: { … } } — sparse. */
export type ThemeOverrides = Partial<Record<StageId, Partial<Record<TokenName, string>>>>;

// ─── Validation ──────────────────────────────────────────────────────────────
// These values become raw CSS in <head>. Accept ONLY solid hex and rgb/rgba —
// nothing that could smuggle in a url(), expression, or extra declaration.
const SAFE_COLOR = /^#[0-9a-fA-F]{3,8}$|^rgba?\(\s*[0-9.,\s]+\)$/;

export function isSafeColor(value: string): boolean {
  return typeof value === "string" && SAFE_COLOR.test(value.trim());
}

export function isEditableToken(token: string): token is TokenName {
  return EDITABLE_TOKENS.has(token);
}

/**
 * Strip an incoming overrides object down to known stages, known tokens, and
 * safe colour values. Never trust the request body — this is what gets stored
 * and later emitted as CSS.
 */
export function sanitizeOverrides(input: unknown): ThemeOverrides {
  if (!input || typeof input !== "object") return {};
  const out: ThemeOverrides = {};
  for (const [stage, set] of Object.entries(input as Record<string, unknown>)) {
    if (!VALID_STAGES.has(stage) || !set || typeof set !== "object") continue;
    const clean: Partial<Record<TokenName, string>> = {};
    for (const [token, value] of Object.entries(set as Record<string, unknown>)) {
      if (isEditableToken(token) && typeof value === "string" && isSafeColor(value)) {
        clean[token] = value.trim();
      }
    }
    if (Object.keys(clean).length > 0) out[stage as StageId] = clean;
  }
  return out;
}

// ─── Effective value ─────────────────────────────────────────────────────────
/** The value a token resolves to in a stage: override if set, else the design-system default. */
export function effectiveValue(
  overrides: ThemeOverrides,
  stage: StageId,
  token: TokenName,
): string {
  return overrides[stage]?.[token] ?? stageDefaults(stageIndex(stage))[token];
}

// ─── CSS emitter ─────────────────────────────────────────────────────────────
/**
 * Emit the saved overrides as per-stage CSS blocks, appended AFTER
 * getCssVariables() + getThemeOverrides() in the site <head>. Each block targets
 * :root[data-theme="sN"] so it beats the design-system stage block of the same
 * specificity by source order — including s6, whose base values it overrides.
 */
export function getOverrideCss(overrides: ThemeOverrides): string {
  return STAGES.map(({ id }) => {
    const set = overrides[id];
    if (!set) return "";
    const body = Object.entries(set)
      .filter(([token, value]) => isEditableToken(token) && isSafeColor(value))
      .map(([token, value]) => `  ${token}: ${value};`)
      .join("\n");
    return body ? `:root[data-theme="${id}"] {\n${body}\n}` : "";
  })
    .filter(Boolean)
    .join("\n");
}
