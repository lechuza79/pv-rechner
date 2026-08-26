"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import Modal from "./Modal";

/**
 * Der volle PV-Rechner in einem Fenster — für Seiten, die zum Rechnen einladen,
 * ohne dass jemand sie dafür verlassen muss.
 *
 * Dasselbe Muster wie beim Wärmepumpen-Ratgeber (WpRechnerModal): erst laden,
 * wenn das Fenster aufgeht, damit die Seite leicht bleibt, und über den
 * Adress-Anker geöffnet. Der Anker ist der Grund, warum das ohne weitere
 * Verdrahtung funktioniert: Ein schlichter Link — im Fließtext, im Knopf oben,
 * in der klebenden Leiste — kann ihn setzen, ohne von dieser Komponente zu
 * wissen.
 *
 * `sharePfad` ist Pflicht und nicht optional: Der Rechner baut seinen
 * Teilen-Link sonst aus der Adresse der Seite, in deren Fenster er gerade
 * steht — der Empfänger landete auf einer Förder-Stadtseite mit einer Query,
 * die dort niemand liest.
 */
const PVRechner = dynamic(() => import("../app/(site)/photovoltaik-rechner/rechner"), {
  ssr: false,
  loading: () => (
    <div style={{ padding: "48px 0", textAlign: "center", color: "var(--color-text-muted)", fontSize: 14 }}>
      Rechner wird geladen …
    </div>
  ),
});

export const PV_RECHNER_HASH = "#pv-rechner";

export default function PvRechnerModal({
  initialParams,
  sharePfad = "/photovoltaik-rechner",
}: {
  initialParams?: Record<string, string | string[] | undefined>;
  sharePfad?: string;
}) {
  const [offen, setOffen] = useState(false);
  // Einmal geöffnet bleibt der Rechner im Baum: Sein Zustand überlebt das
  // Schließen, und das Ausblenden des Fensters zeigt noch Inhalt statt einer
  // leeren Fläche (Konvention des Modal-Bausteins).
  const [jeGeoeffnet, setJeGeoeffnet] = useState(false);

  useEffect(() => {
    const sync = () => setOffen(window.location.hash === PV_RECHNER_HASH);
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  useEffect(() => {
    if (offen) setJeGeoeffnet(true);
  }, [offen]);

  const schliessen = () => {
    // Den Anker aus der Adresse nehmen, ohne einen Eintrag im Verlauf zu
    // hinterlassen — sonst führt der Zurück-Knopf wieder ins offene Fenster.
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    setOffen(false);
  };

  return (
    <Modal open={offen} onClose={schliessen} title="Photovoltaik-Rechner" maxWidth={860}>
      {jeGeoeffnet ? <PVRechner initialParams={initialParams} sharePfad={sharePfad} /> : null}
    </Modal>
  );
}
