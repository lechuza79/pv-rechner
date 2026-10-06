"use client";

import { useLayoutEffect, useState, type CSSProperties, type RefObject } from "react";
import { KLEBELEISTE_VAR } from "../../lib/theme";
import { useInModal } from "../Modal";

/** Fixed page actions are centered on their shell and capped at the result-column width. */
export function usePageActionLayout(anchor: RefObject<HTMLElement | null>) {
  const inModal = useInModal();
  const [layout, setLayout] = useState<{ style: CSSProperties; className: string; calculator: boolean } | null>(null);
  useLayoutEffect(() => {
    const element = anchor.current;
    if (!element || inModal) return;
    let shell = element.closest<HTMLElement>(".sc-calculator-content");
    // Calculator notices can be siblings of the content shell (the recommendation flow).
    shell ??= element.closest(".wp-calculator-page")?.querySelector<HTMLElement>(":scope > .sc-calculator-content") ?? null;
    for (let parent = shell?.parentElement?.closest<HTMLElement>(".sc-calculator-content"); parent; parent = parent.parentElement?.closest<HTMLElement>(".sc-calculator-content")) shell = parent;
    const calculator = !!shell;
    shell ??= element.closest<HTMLElement>("[data-page-content]") ?? element.parentElement?.querySelector<HTMLElement>("[data-page-content]") ?? null;
    const update = () => {
      const inherited = getComputedStyle(element);
      const variables: Record<string, string> = {};
      for (let index = 0; index < inherited.length; index++) {
        const name = inherited[index];
        if (name.startsWith("--") && name !== KLEBELEISTE_VAR) variables[name] = inherited.getPropertyValue(name);
      }
      const rect = shell?.getBoundingClientRect();
      const width = rect ? Math.min(rect.width, 820) : undefined;
      const next: { style: CSSProperties; className: string; calculator: boolean } = {
        calculator,
        style: { ...variables, ...(rect ? { left: rect.left + (rect.width - width!) / 2, right: "auto", width, boxSizing: "border-box" } : {}) },
        className: element.closest(".wp-input-page") ? "wp-input-page" : element.closest(".wp-result-page") ? "wp-result-page" : "",
      };
      setLayout(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
    };
    update();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    if (shell) observer?.observe(shell);
    window.addEventListener("resize", update);
    return () => { observer?.disconnect(); window.removeEventListener("resize", update); };
  }, [anchor, inModal]);
  return inModal ? null : layout;
}
