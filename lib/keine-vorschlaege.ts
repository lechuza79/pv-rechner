/**
 * Attributes for input fields that take numbers or a place (kWp, m², PLZ,
 * consumption): no autofill, no autocorrect, no capitalisation, no spellcheck.
 *
 * Without them Safari opens its suggestion bar or contact autofill above a
 * field that can only ever hold a number. Fields for personal data (name,
 * email, address) do NOT get this — there autofill is help, not noise.
 *
 * Spread it AFTER any own autoComplete on the input.
 */
export const KEINE_VORSCHLAEGE = {
  autoComplete: "off",
  autoCorrect: "off",
  autoCapitalize: "off",
  spellCheck: false,
} as const;
