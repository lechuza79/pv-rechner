"use client";

import { useEffect } from "react";

/**
 * Meldet EINMAL je Seitenaufruf, auf welcher fremden Domain dieses Widget
 * eingebettet ist. Zentral im Embed-Layout eingebunden, gilt damit für alle
 * Widgets.
 *
 * Warum das überhaupt gebaut wurde und warum nur die Domain gespeichert wird,
 * steht in lib/embed-herkunft.ts.
 *
 * Drei Dinge, die hier bewusst NICHT passieren:
 *   * Nichts wird im Browser gespeichert oder gelesen — die Zusage
 *     "cookielos, kein Browser-Speicher" an Einbettende bleibt wahr. Der Preis
 *     dafür ist, dass wiederkehrende Aufrufe nicht als "derselbe Besucher"
 *     erkennbar sind. Das ist kein Mangel, sondern der Punkt: Gezählt werden
 *     Aufrufe, nicht Menschen.
 *   * Keine Meldung ohne fremden Rahmen — unsere eigenen Seiten und die
 *     Galerie betten dieselben Widgets ein, und deren Aufrufe würden die
 *     Zahlen ersticken.
 *   * Kein zweiter Versuch bei Fehlschlag. Eine verlorene Zählung ist
 *     folgenlos; ein wiederholender Client wäre es nicht.
 */
export default function WidgetHerkunft() {
  useEffect(() => {
    // Steckt das Dokument überhaupt in einem Rahmen? Ohne Rahmen ist es ein
    // direkter Aufruf unserer eigenen Adresse und keine Einbettung.
    if (window.self === window.top) return;

    // Die einbettende Seite ist der oberste Rahmen. `ancestorOrigins` nennt
    // ihn direkt; wo es das nicht gibt (Firefox), bleibt der Referrer — der
    // trägt bei fremden Einbettungen mindestens den Ursprung, weil Browser
    // ihn seit Jahren standardmäßig auf den Ursprung kürzen. Genau den
    // brauchen wir, den Pfad wollen wir gar nicht.
    const vorfahren = window.location.ancestorOrigins;
    const herkunft = vorfahren?.length
      ? vorfahren[vorfahren.length - 1]
      : document.referrer;
    if (!herkunft) return;

    // /embed/<widget>/… — das erste Segment nach /embed ist die Kennung. Was
    // dort steht, prüft der Server gegen seine Liste; hier wird nur gelesen.
    const widget = window.location.pathname.split("/").filter(Boolean)[1];
    if (!widget) return;

    // `keepalive`, damit die Meldung einen sofortigen Seitenwechsel überlebt —
    // ein Widget, das jemand nur kurz sieht, ist trotzdem eingebaut.
    fetch("/api/embed/herkunft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ host: herkunft, widget }),
      keepalive: true,
    }).catch(() => {
      /* eine verlorene Zählung darf nie im Widget landen */
    });
  }, []);

  return null;
}
