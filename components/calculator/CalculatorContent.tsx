import type { ReactNode } from "react";
import "./calculator-content.css";

/** One alignment boundary for calculator questions, results and supporting content. */
export default function CalculatorContent({ children, inset = false, boxed = false, state, withOffers = false }: { children: ReactNode; inset?: boolean; boxed?: boolean; state?: "input" | "result"; withOffers?: boolean }) {
  return <div data-calculator-state={state} data-calculator-offers={withOffers || undefined} className={`sc-calculator-content${inset ? " sc-calculator-content--inset" : ""}${boxed ? " sc-calculator-content--boxed" : ""}`}>{children}</div>;
}
