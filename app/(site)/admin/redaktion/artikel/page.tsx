import { redirect } from "next/navigation";
import { isAdminSession } from "../../../../../lib/admin-guard";
import {
  offeneVorhaben,
  verworfeneVorhaben,
  volumenGesamt,
  aeltesteMessung,
  ZUSTAND_LABEL,
  type ArtikelVorhaben,
} from "../../../../../lib/artikelplan";
import { v, space } from "../../../../../lib/theme";
import { ArtikelTabelle } from "../../../../../components/redaktion/ArtikelTabelle";

// Der Artikelteil der Redaktion — Schwester der Social-Ansicht, aber eine
// eigene Seite, weil die Achsen andere sind: ein Post hat einen Wochentag und
// eine Bildform, ein Artikel eine Suchfrage und eine Indexierung.
//
// Die Ansicht LIEST nur. Der Plan lebt im Code (lib/artikelplan.ts), damit ein
// Test ihn prüfen kann — dass jede Zahl ein Erhebungsdatum trägt und jedes
// verworfene Thema einen Grund. Eine Redaktionsansicht, in der man Zahlen
// eintippen kann, hätte genau diese Prüfung nicht.
//
// Der untere Teil ist der wichtigere: Was gemessen und abgelehnt wurde, samt
// Grund. Ohne ihn schlägt in ein paar Monaten jemand dieselben Themen wieder
// vor, und die Messung war umsonst.

export const metadata = {
  title: "Redaktion – Artikel",
  robots: { index: false, follow: false },
};

/** Volumen einmal auf dem Server rechnen, damit die Tabelle keine Logik trägt. */
function volumenKarte(liste: ArtikelVorhaben[]): Record<string, number> {
  return Object.fromEntries(liste.map((v) => [v.thema, volumenGesamt(v)]));
}

export default async function RedaktionArtikel() {
  if (!(await isAdminSession())) redirect("/login?next=/admin/redaktion/artikel");

  const offen = offeneVorhaben();
  const verworfen = verworfeneVorhaben();

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ fontSize: v("--font-size-h1"), marginBottom: space.sm }}>Artikel</h1>
      <p style={{ color: v("--color-text-secondary"), marginBottom: space.huge, maxWidth: 760 }}>
        Was als Nächstes geschrieben wird, auf welche Suchfrage es zielt — und darunter, was
        gemessen und trotzdem verworfen wurde. Zeile anklicken für die Begründung. Älteste Messung
        im Plan: {new Date(aeltesteMessung()).toLocaleDateString("de-DE")}.
      </p>

      <h2 style={{ fontSize: v("--font-size-h2"), marginBottom: space.md }}>
        Warteschlange ({offen.length})
      </h2>
      <div style={{ marginBottom: space.huge }}>
        <ArtikelTabelle
          vorhaben={offen}
          volumen={volumenKarte(offen)}
          zustandLabel={ZUSTAND_LABEL}
        />
      </div>

      <h2 style={{ fontSize: v("--font-size-h2"), marginBottom: space.sm }}>
        Gemessen und verworfen ({verworfen.length})
      </h2>
      <p style={{ color: v("--color-text-secondary"), marginBottom: space.md, maxWidth: 760 }}>
        Nicht vergessen, sondern entschieden. Wer eines davon wieder aufmachen will, braucht einen
        neuen Grund — nicht die alte Zahl.
      </p>
      <ArtikelTabelle
        vorhaben={verworfen}
        volumen={volumenKarte(verworfen)}
        zustandLabel={ZUSTAND_LABEL}
        verworfen
      />
    </div>
  );
}
