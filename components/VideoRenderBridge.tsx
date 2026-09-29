"use client";

import { useEffect } from "react";

// Lets the server-side renderer (scripts/video-export-worker.ts) run the SAME
// video export a visitor's browser runs: same card, same animation timeline,
// same MP4 encoder. No second chart implementation exists for the server.
//
// Inert unless the page was opened with ?scVideoRender=1 — then it exposes one
// function on window. The export code is loaded only in that case, so normal
// visitors download nothing extra. Opening that address in a normal browser
// is harmless: it renders a video locally, which the menu can do anyway.

declare global {
  interface Window {
    __scVideoRender?: (o: { widgetId: string; filename: string }) => Promise<{ filename: string; width: number; height: number }>;
    __scVideoProgress?: number;
  }
}

export default function VideoRenderBridge() {
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("scVideoRender") !== "1") return;
    window.__scVideoRender = async ({ widgetId, filename }) => {
      const node = document.querySelector<HTMLElement>(`[data-widget-id="${CSS.escape(widgetId)}"]`);
      if (!node) throw new Error(`widget ${widgetId} not on page`);
      const { controlChartAnimation, downloadChartVideo } = await import("../lib/chart-animation-export");
      await controlChartAnimation(node, { mode: "pause" });
      window.__scVideoProgress = 0;
      const rect = node.getBoundingClientRect();
      const file = await downloadChartVideo(node, filename, (p) => { window.__scVideoProgress = p; });
      return { filename: file.filename, width: Math.round(rect.width), height: Math.round(rect.height) };
    };
    document.documentElement.dataset.scVideoBridge = "ready";
  }, []);
  return null;
}
