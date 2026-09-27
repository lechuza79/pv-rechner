import { tokens } from "../../lib/theme";

/** Keep calculator result colours independent of the time-of-day theme. */
export default function CalculatorTheme() {
  return <style>{`:root:has(.wp-calculator-page){${Object.entries(tokens).filter(([key]) => key.startsWith("--color-") || key.startsWith("--shadow-")).map(([key, value]) => `${key}:${value}!important`).join(";")}}`}</style>;
}
