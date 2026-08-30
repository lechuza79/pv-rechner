import "server-only";
import { unstable_cache } from "next/cache";
import { withDbTimeout, DB_SOFT_READ_TIMEOUT_MS } from "./db-timeout";

/**
 * Welche Gemeinden haben unseren Brief bekommen — und damit einen Link auf ihre
 * eigene Ortsseite?
 *
 * DER AUSLÖSER IST DER VERSAND, NICHT DIE VERÖFFENTLICHUNG. Das war zuerst
 * andersherum gebaut und ist am 29.08.2026 gemessen widerlegt worden:
 *
 *   Wallertheim veröffentlichte am 27.08. in seiner Dorf-App eine eigene Meldung
 *   („232 Solaranlagen, 114 Hausspeicher, Platz 1 von 33 Gemeinden") und
 *   verlinkte darin unsere Ortsseite. Die Seite bekam daraufhin 47 Besucher —
 *   mehr als jede andere Atlas-Seite. Unsere Verweis-Erhebung kannte davon
 *   NICHTS: Verzeichnisse crawlen App-Plattformen nicht, und Klicks aus einer App
 *   tragen meist keinen Verweis-Ursprung. Entdeckt wurde es nur, weil der
 *   Betreiber zufällig in die Besucherstatistik sah.
 *
 * Eine Freigabe, die auf den NACHWEIS einer Veröffentlichung wartet, wartet
 * deshalb in einem Teil der Fälle für immer. Der Brief selbst ist das sichere
 * Signal: Er nennt die Adresse, also kann ab diesem Moment jederzeit jemand
 * darauf verweisen. Eine Seite anzubieten und gleichzeitig für Suchmaschinen zu
 * sperren, ist der einzige Zustand, der sich nicht begründen lässt.
 *
 * WARUM DAS OHNE RELEASEPLAN-ENTSCHEIDUNG GEHT: Dort wird geschätzt — hat dieser
 * Ort Nachfrage, kollidiert er mit einer anderen Seitenfamilie. Hier wird nichts
 * geschätzt; der Versand ist ein Datum in der Datenbank.
 *
 * AUSGENOMMEN BLEIBEN ORTE MIT EIGENER FÖRDERSEITE. Dort stünden zwei eigene
 * Seiten auf denselben Anfragen, und die Förderseite steht teils vorn (gemessen
 * 29.08.2026: auf Bundeslandebene in 4 von 9 Paarungen auf einem reinen
 * Bestands-Wort). Betroffen sind sieben der angeschriebenen Orte.
 *
 * WAS DAS NICHT IST: eine Freigabe der Gemeinde-EBENE. Die übrigen rund 11.000
 * Gemeinden bleiben gesperrt.
 *
 * FEHLERRICHTUNG: Fällt die Datenbank aus, liefert diese Funktion eine leere
 * Menge — die Seiten bleiben dann gesperrt. Im schlimmsten Fall verpufft eine
 * Empfehlung für die Dauer der Störung, statt dass unbeabsichtigt Seiten in den
 * Index geraten.
 */
async function verlinkendeGemeindenUncached(): Promise<string[]> {
  try {
    const { supabase } = await import("./supabase-server");
    if (!supabase) return [];
    // Weiches Zeitbudget: Es gibt einen vollwertigen Rückfall (die Seite bleibt
    // gesperrt), also wäre längeres Warten reine Verzögerung — dieselbe Regel
    // wie bei Marktpreisen und Förderkatalog.
    const { data, error } = await withDbTimeout(
      supabase
        .from("kommunen_kontakt")
        .select("region_id")
        .not("contacted_at", "is", null)
        .neq("outreach_status", "gesperrt")
        .limit(1000),
      "angeschriebeneGemeinden",
      DB_SOFT_READ_TIMEOUT_MS,
    );
    if (error) return [];
    const angeschrieben = ((data ?? []) as { region_id: string }[])
      .map((z) => z.region_id)
      .filter((id) => typeof id === "string" && id.length === 8);

    // Orte mit eigener Förder-Stadtseite fallen raus (Begründung oben). Der
    // Katalog liegt im Code, nicht in der Datenbank — deshalb hier und nicht in
    // der Abfrage.
    const { ATLAS_CITIES } = await import("./atlas-cities");
    const { ortSchluessel } = await import("./release-plan");
    const mitFoerderseite = new Set(ATLAS_CITIES.map((c) => ortSchluessel(c.ags)));
    return angeschrieben.filter((id) => !mitFoerderseite.has(ortSchluessel(id)));
  } catch {
    return [];
  }
}

/**
 * Gecacht, weil jede Gemeindeseite beim Aufbau danach fragt.
 *
 * Eine Stunde Haltbarkeit: Der Status ändert sich höchstens täglich (er kommt
 * aus einem Lauf, nicht aus einer Nutzerinteraktion), und eine Empfehlung, die
 * eine Stunde später wirkt, verliert nichts. Ohne diesen Deckel wäre es ein
 * zusätzlicher Datenbank-Zugriff je Seitenaufbau — bei 11.000 Seiten die Sorte
 * Kosten, vor der die Kostenwache warnt.
 */
export const verlinkendeGemeinden = unstable_cache(verlinkendeGemeindenUncached, ["atlas-outreach-verlinker-v1"], {
  revalidate: 3600,
  tags: ["atlas-outreach-verlinker"],
});
