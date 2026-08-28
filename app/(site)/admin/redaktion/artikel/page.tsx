import { redirect } from "next/navigation";
import { isAdminSession } from "../../../../../lib/admin-guard";
import {
  ARTIKELPLAN,
  volumenGesamt,
  aeltesteMessung,
  ZUSTAND_LABEL,
} from "../../../../../lib/artikelplan";
import { v, space } from "../../../../../lib/theme";
import { ArtikelBereich } from "../../../../../components/redaktion/ArtikelBereich";

// Der Artikelteil der Redaktion — Schwester der Social-Ansicht, aber eine
// eigene Seite, weil die Achsen andere sind: ein Post hat einen Wochentag und
// eine Bildform, ein Artikel eine Suchfrage und eine Indexierung.
//
// Die Ansicht LIEST nur. Der Plan lebt im Code (lib/artikelplan.ts), damit ein
// Test ihn prüfen kann — dass jede Zahl ein Erhebungsdatum trägt und jedes
// verworfene Thema einen Grund. Eine Redaktionsansicht, in der man Zahlen
// eintippen kann, hätte genau diese Prüfung nicht.

export const metadata = {
  title: "Redaktion – Artikel",
  robots: { index: false, follow: false },
};

export default async function RedaktionArtikel() {
  if (!(await isAdminSession())) redirect("/login?next=/admin/redaktion/artikel");

  // Volumen einmal auf dem Server rechnen, damit die Tabelle keine Logik trägt.
  const volumen = Object.fromEntries(ARTIKELPLAN.map((v) => [v.thema, volumenGesamt(v)]));

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ fontSize: v("--font-size-h1"), marginBottom: space.sm }}>Artikel</h1>
      <p style={{ color: v("--color-text-secondary"), marginBottom: space.xl, maxWidth: 760 }}>
        Was geschrieben wird, auf welche Suchfrage es zielt, was daraus geworden ist — und was
        gemessen und trotzdem verworfen wurde. Zeile anklicken für die Begründung, Spaltenkopf zum
        Sortieren, Umschalt-Klick sortiert zusätzlich. Älteste Messung im Plan:{" "}
        {new Date(aeltesteMessung()).toLocaleDateString("de-DE")}.
      </p>

      <ArtikelBereich
        vorhaben={ARTIKELPLAN}
        volumen={volumen}
        zustandLabel={ZUSTAND_LABEL}
      />
    </div>
  );
}
