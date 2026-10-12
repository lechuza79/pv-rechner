"use client";

import { useEffect } from "react";

/**
 * Meldet die tatsächliche Content-Höhe des Embed-Widgets an die Host-Seite
 * (postMessage `widget:height`). Der Host (unsere Seiten + Galerie) passt die
 * iframe-Höhe daran an — so entsteht unten kein Leerraum mehr (feste
 * iframe-Höhen waren großzügig gewählt, um den Footer nicht abzuschneiden).
 *
 * Zentral im Embed-Layout eingebunden → gilt automatisch für ALLE Widgets.
 * `document.body` hat im Embed-Layout keine feste Höhe, seine Höhe ist daher
 * exakt die Content-Höhe.
 */
export default function WidgetAutoHeight() {
  useEffect(() => {
    let lastReport="";
    const post = (force=false) => {
      const h = Math.ceil(document.body.getBoundingClientRect().height);
      const ready=!document.querySelector('[data-widget-loading="true"]');
      const report=`${h}:${ready}`;
      if (h > 0 && (force||report!==lastReport)) {
        lastReport=report;
        window.parent?.postMessage({ type: "widget:height", height: h, ready }, "*");
      }
    };
    // The host may remount an already cached document after its initial report.
    const measure = (event: MessageEvent) => {
      if (event.source === window.parent && event.data?.type === "widget:measure") post(true);
    };
    window.addEventListener("message", measure);
    post();
    const loadingObserver=new MutationObserver(()=>post());
    loadingObserver.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['data-widget-loading']});
    const ro = new ResizeObserver(()=>post());
    ro.observe(document.body);
    // Fonts/Bilder können nach dem ersten Paint noch nachladen.
    const onLoad=()=>post();
    window.addEventListener("load", onLoad);
    // Nach-Meldungen: Client-seitige Layout-Änderungen kurz nach dem Mount (z. B.
    // First-Party-Embeds, die per URL-Flag `onsite` ihre Hülle ausblenden und
    // dadurch schrumpfen) trifft der ResizeObserver-Erstlauf mitunter nicht
    // zuverlässig — ein paar verzögerte Re-Posts fangen die endgültige Höhe ein.
    const timers = [80, 300, 700].map((ms) => window.setTimeout(post, ms));
    return () => {
      ro.disconnect();
      loadingObserver.disconnect();
      window.removeEventListener("message", measure);
      window.removeEventListener("load", onLoad);
      timers.forEach(clearTimeout);
    };
  }, []);
  return null;
}
