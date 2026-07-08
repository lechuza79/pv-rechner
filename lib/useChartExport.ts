"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import {
  exportChart,
  exportNode,
  canNativeShareImages,
  ExportContext,
} from "./chart-export";

export type { ExportContext, ExportStat, ExportLegendItem } from "./chart-export";

export interface UseChartExportOptions {
  context: ExportContext;
  filename?: string;
  shareText?: string;
  shareUrl?: string;
  onBeforeDownload?: () => boolean;
  /**
   * Export strategy:
   *  • "compose" (default) — re-composes title/stats/legend/footer from
   *    `context` around the inner chart <svg>. For on-site charts whose
   *    surrounding numbers live elsewhere in the DOM.
   *  • "node" — snapshots the referenced node 1:1 (fonts, units, legends and
   *    all). For self-contained widget cards. Put `chartRef` on the whole card
   *    and mark CTAs/switchers with `data-sc-export-ignore`.
   */
  mode?: "compose" | "node";
}

export function useChartExport(options: UseChartExportOptions) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    // No asset preload on mount: exportChart awaits preloadAssets() itself, and
    // eagerly fetching logo + fonts (~70 KB) on every chart-bearing page — incl.
    // embed widgets on third-party sites — wastes bandwidth for the vast
    // majority of visitors who never export.
    setCanShare(canNativeShareImages());
  }, []);

  const mode = options.mode ?? "compose";

  const downloadPng = useCallback(async () => {
    if (!chartRef.current || isExporting) return;
    if (options.onBeforeDownload && options.onBeforeDownload() === false) return;
    setIsExporting(true);
    try {
      if (mode === "node") {
        await exportNode(chartRef.current, {
          filename: options.filename,
          mode: "download",
        });
      } else {
        await exportChart(chartRef.current, {
          context: options.context,
          filename: options.filename,
          mode: "download",
        });
      }
    } finally {
      setIsExporting(false);
    }
  }, [isExporting, mode, options.context, options.filename, options.onBeforeDownload]);

  const sharePng = useCallback(async () => {
    if (!chartRef.current || isExporting) return;
    setIsExporting(true);
    try {
      if (mode === "node") {
        await exportNode(chartRef.current, {
          filename: options.filename,
          mode: "share",
          shareTitle: options.context.title,
          shareText: options.shareText,
        });
      } else {
        await exportChart(chartRef.current, {
          context: options.context,
          filename: options.filename,
          mode: "share",
          shareText: options.shareText,
        });
      }
    } finally {
      setIsExporting(false);
    }
  }, [isExporting, mode, options.context, options.filename, options.shareText]);

  const shareWhatsApp = useCallback(() => {
    const url = options.shareUrl || (typeof window !== "undefined" ? window.location.href : "");
    const text = options.shareText || options.context.title;
    window.open(`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`, "_blank");
  }, [options.shareUrl, options.shareText, options.context.title]);

  const shareTwitter = useCallback(() => {
    const url = options.shareUrl || (typeof window !== "undefined" ? window.location.href : "");
    const text = options.shareText || options.context.title;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, "_blank");
  }, [options.shareUrl, options.shareText, options.context.title]);

  return {
    chartRef,
    downloadPng,
    sharePng,
    shareWhatsApp,
    shareTwitter,
    isExporting,
    canNativeShare: canShare,
  };
}
