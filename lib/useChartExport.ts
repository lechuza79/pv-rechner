"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import {
  exportChart,
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

  const downloadPng = useCallback(async () => {
    if (!chartRef.current || isExporting) return;
    if (options.onBeforeDownload && options.onBeforeDownload() === false) return;
    setIsExporting(true);
    try {
      await exportChart(chartRef.current, {
        context: options.context,
        filename: options.filename,
        mode: "download",
      });
    } finally {
      setIsExporting(false);
    }
  }, [isExporting, options.context, options.filename, options.onBeforeDownload]);

  const sharePng = useCallback(async () => {
    if (!chartRef.current || isExporting) return;
    setIsExporting(true);
    try {
      await exportChart(chartRef.current, {
        context: options.context,
        filename: options.filename,
        mode: "share",
        shareText: options.shareText,
      });
    } finally {
      setIsExporting(false);
    }
  }, [isExporting, options.context, options.filename, options.shareText]);

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
