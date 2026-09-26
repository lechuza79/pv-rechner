"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import InfoTooltip from "./InfoTooltip";

/** Adapts legacy markup to the same tooltip used by React widgets. */
export default function InfoTooltipBindings() {
  const [targets, setTargets] = useState<HTMLElement[]>([]);
  useEffect(() => {
    const sync = () => {
      const next = Array.from(document.querySelectorAll<HTMLElement>("[data-info-tooltip]"));
      setTargets(previous => previous.length === next.length && previous.every((node, index) => node === next[index]) ? previous : next);
    };
    sync();
    const observer = new MutationObserver(records => {
      const changed = records.some(record => [...record.addedNodes, ...record.removedNodes].some(node =>
        node instanceof Element && (node.matches("[data-info-tooltip]") || node.querySelector("[data-info-tooltip]"))
      ));
      if (changed) sync();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  return targets.map((target, index) => {
    const label = target.querySelector("[data-tooltip-label]")?.textContent ?? "Mehr Infos";
    const content = target.querySelector("[data-tooltip-content]");
    // Read text only; never execute HTML supplied by a legacy script.
    const lines = Array.from(content?.childNodes ?? []).map(node => node.nodeName === "BR" ? "\n" : node.textContent).join("");
    return createPortal(<InfoTooltip label={label} ariaLabel={label} exportNote={false}><span style={{ whiteSpace: "pre-line" }}>{lines}</span></InfoTooltip>, target, String(index));
  });
}
