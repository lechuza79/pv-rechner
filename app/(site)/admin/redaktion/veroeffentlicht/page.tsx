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

  // Der jüngste Livegang entscheidet, wie ernst die Zahlen zu nehmen sind:
  // Eine Seite, die seit zehn Tagen online ist, darf noch nichts erreicht haben.
  const juengster = live
    .map((a) => a.seit)
    .filter(Boolean)
    .sort()
    .at(-1);
  const tageJuengster = juengster
    ? Math.round((Date.now() - new Date(juengster).getTime()) / 86400_000)
    : null;

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto" }}>
      <h1 style={{ fontSize: v("--font-size-h1"), marginBottom: space.sm }}>Veröffentlicht</h1>
      <p style={{ color: v("--color-text-secondary"), marginBottom: space.xl, maxWidth: 780 }}>
        Was online ist und was daraus geworden ist. Zeile aufklappen und „Was ist daraus geworden?"
        holt Einblendungen, Klicks und Besucher der Seite — nur so lässt sich prüfen, ob die
        Schätzung getaugt hat, die den Artikel begründet hat.
        {tageJuengster !== null && tageJuengster < 30 && (
          <>
            {" "}
            Der jüngste Artikel ist erst {tageJuengster} Tage online; bei ihm sagen die Zahlen noch
            wenig.
          </>
        )}
      </p>

      <ArtikelTabelle
        vorhaben={live}
        volumen={volumen}
        zustandLabel={ZUSTAND_LABEL}
        mitDaten
      />
    </div>
  );
}
