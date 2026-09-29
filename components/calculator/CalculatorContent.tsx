import type { ReactNode } from "react";
import "./calculator-content.css";

/** One alignment boundary for calculator questions, results and supporting content. */
export default function CalculatorContent({ children, inset = false }: { children: ReactNode; inset?: boolean }) {
  return <div className={`sc-calculator-content${inset ? " sc-calculator-content--inset" : ""}`}>{children}</div>;
}
