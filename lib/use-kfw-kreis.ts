"use client";
import { useEffect, useState } from "react";

/**
 * Die Zusagen der Bundes-Heizungsförderung im Landkreis des Nutzers.
 *
 * Hängt am Gemeindeschlüssel, den der Fördercheck ohnehin schon aufgelöst hat —
 * es wird also keine zweite Ortsfrage gestellt. Ohne Ort passiert nichts, und
 * bei einem Fehlschlag bleibt es bei `null`: Die Zeile ist eine Einordnung, ihr
 * Fehlen kostet nichts.
 */

export type KfwKreis = { name: string; zusagen: number | null } | null;

export function useKfwKreis(ags: string | null): KfwKreis {
  const [kreis, setKreis] = useState<KfwKreis>(null);

  useEffect(() => {
    if (!ags) {
      setKreis(null);
      return;
    }
    let aktuell = true;
    fetch(`/api/kfw/kreis?ags=${encodeURIComponent(ags)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { kreis?: string | null; zusagen?: number | null } | null) => {
        if (!aktuell) return;
        setKreis(d?.kreis ? { name: d.kreis, zusagen: d.zusagen ?? null } : null);
      })
      .catch(() => {
        if (aktuell) setKreis(null);
      });
    return () => {
      aktuell = false;
    };
  }, [ags]);

  return kreis;
}
