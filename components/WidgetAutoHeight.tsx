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
    const post = () => {
      const h = Math.ceil(document.body.getBoundingClientRect().height);
      if (h > 0) {
        window.parent?.postMessage({ type: "widget:height", height: h }, "*");
      }
    };
    post();
    const ro = new ResizeObserver(post);
    ro.observe(document.body);
    // Fonts/Bilder können nach dem ersten Paint noch nachladen.
    window.addEventListener("load", post);
    // Nach-Meldungen: Client-seitige Layout-Änderungen kurz nach dem Mount (z. B.
    // First-Party-Embeds, die per URL-Flag `onsite` ihre Hülle ausblenden und
    // dadurch schrumpfen) trifft der ResizeObserver-Erstlauf mitunter nicht
    // zuverlässig — ein paar verzögerte Re-Posts fangen die endgültige Höhe ein.
    const timers = [80, 300, 700].map((ms) => window.setTimeout(post, ms));
    return () => {
      ro.disconnect();
      window.removeEventListener("load", post);
      timers.forEach(clearTimeout);
    };
  }, []);
  return null;
}
