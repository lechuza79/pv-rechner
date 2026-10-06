import { tokens } from "../../lib/theme";

/** Keep calculator colours independent of the time-of-day theme. */
export default function CalculatorTheme() {
  return <style data-calculator-theme>{`:root:has([data-calculator-theme]){${Object.entries(tokens).filter(([key]) => key.startsWith("--color-") || key.startsWith("--shadow-")).map(([key, value]) => `${key}:${value}!important`).join(";")}}`}</style>;
}
