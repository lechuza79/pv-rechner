"use client";

import Modal from "../Modal";
import { v, space } from "../../lib/theme";

// Welche Länder an diesem Tag Ferien haben.
//
// Das Band im Kalender fasst zusammen („Ferien in 13 von 16 Ländern"), weil
// sechzehn Streifen übereinander in einer Kalenderzeile Brei ergäben. Wer es
// genau wissen will, bekommt es hier — mit dem Zeitraum je Land, denn „Hessen
// hat Ferien" ist eine andere Auskunft als „Hessen hat noch elf Tage Ferien".

export type FerienZeile = { land: string; name: string; von: string; bis: string };

const tag = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("de-DE", { day: "numeric", month: "numeric", timeZone: "UTC" });

export function FerienModal({
  datum,
  zeilen,
  offen,
  onClose,
}: {
  datum: string | null;
  zeilen: FerienZeile[];
  offen: boolean;
  onClose: () => void;
}) {
  const titel = datum
    ? new Date(`${datum}T12:00:00Z`).toLocaleDateString("de-DE", {
        weekday: "long",
        day: "numeric",
        month: "long",
        timeZone: "UTC",
      })
    : "";

  return (
    <Modal open={offen} onClose={onClose} title={titel} maxWidth={520}>
      {zeilen.length === 0 ? (
        <p style={{ fontSize: v("--font-size-small"), color: v("--color-text-muted"), margin: 0 }}>
          An diesem Tag hat kein Land Schulferien.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: space.xs }}>
          {zeilen.map((z) => (
            <div
              key={z.land}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: space.md,
                fontSize: v("--font-size-small"),
                borderBottom: `1px solid ${v("--color-border-muted")}`,
                paddingBottom: space.xs,
              }}
            >
              <span style={{ fontWeight: 600 }}>{z.land}</span>
              <span style={{ color: v("--color-text-secondary"), textAlign: "right" }}>
                {z.name}
                <span style={{ color: v("--color-text-muted") }}>
                  {" "}
                  {tag(z.von)}–{tag(z.bis)}
                </span>
              </span>
            </div>
          ))}
          <p style={{ fontSize: v("--font-size-caption"), color: v("--color-text-muted"), margin: 0 }}>
            {zeilen.length} von 16 Ländern. Quelle: Kultusministerkonferenz.
          </p>
        </div>
      )}
    </Modal>
  );
}
