import { redirect } from "next/navigation";
import { isAdminSession } from "../../../../../lib/admin-guard";
import {
  liveVorhaben,
  volumenGesamt,
  ZUSTAND_LABEL,
} from "../../../../../lib/artikelplan";
import { v, space } from "../../../../../lib/theme";
import { ArtikelTabelle } from "../../../../../components/redaktion/ArtikelTabelle";

// Die veröffentlichten Artikel als eigener Menüpunkt (Betreiber-Vorgabe
// 29.08.2026).
//
// Warum getrennt und nicht als Filter auf der Warteschlange: Die beiden Listen
// beantworten verschiedene Fragen. Die Warteschlange fragt „was als Nächstes",
// und dafür vergleicht man Suchvolumen. Hier steht die Gegenrichtung — hat die
// Entscheidung von damals getragen? —, und dafür braucht es Spalten, die es
// dort gar nicht geben kann: seit wann online, wann zuletzt geändert.
//
// Der Filter auf der anderen Seite bleibt trotzdem bestehen: Wer beim Planen
// kurz nachsehen will, was schon läuft, soll dafür nicht die Seite wechseln
// müssen.

export const metadata = {
  title: "Redaktion – Veröffentlicht",
  robots: { index: false, follow: false },
};

export default async function RedaktionVeroeffentlicht() {
  if (!(await isAdminSession())) redirect("/login?next=/admin/redaktion/veroeffentlicht");

  const live = liveVorhaben();
  const volumen = Object.fromEntries(live.map((v) => [v.thema, volumenGesamt(v)]));

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto" }}>
      <h1 style={{ fontSize: v("--font-size-h1"), marginBottom: space.xl }}>Veröffentlicht</h1>

      <ArtikelTabelle
        vorhaben={live}
        volumen={volumen}
        zustandLabel={ZUSTAND_LABEL}
        mitDaten
      />
    </div>
  );
}
