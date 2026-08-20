"use client";

import { useState } from "react";
import { captureNodeToBlob } from "../../../../lib/chart-export";

// TEMPORÄR — nimmt jede Widget-Karte der Prüfseite auf und zeigt das Ergebnis
// als Bild darunter, damit sich das PNG ohne Download ansehen lässt.
export default function Shot() {
  const [bilder, setBilder] = useState<string[]>([]);
  return (
    <div>
      <button
        type="button"
        onClick={async () => {
          try {
            // Die Karte selbst, nicht die Hülle drumherum — sonst nimmt das Bild
            // die volle Seitenbreite auf und die Karte schwimmt darin.
            const karten = [...document.querySelectorAll<HTMLElement>("[data-shot] > div")];
            document.title = `karten:${karten.length}`;
            const urls: string[] = [];
            for (const k of karten) urls.push(URL.createObjectURL(await captureNodeToBlob(k)));
            setBilder(urls);
            document.title = `fertig:${urls.length}`;
          } catch (e) {
            document.title = `fehler:${String(e)}`;
          }
        }}
        style={{ padding: "10px 16px", fontSize: 14 }}
      >
        Bilder erzeugen
      </button>
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 16 }}>
        {bilder.map((u) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={u} src={u} alt="" style={{ width: "100%", border: "1px solid #999" }} />
        ))}
      </div>
    </div>
  );
}
