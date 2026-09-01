// Was hat der Outreach bewirkt? Die Zählregel an EINER Stelle.
//
// WOZU EIN EIGENES MODUL: Die Auswertung im Cockpit zählte bisher nur die
// Verteilung der beiden Anschreiben-Fassungen, und zwar für EINE fest
// eingetragene Kampagne. Die gibt es längst nicht mehr — die Kachelreihe war
// deshalb dauerhaft leer, ohne dass das wie ein Fehler aussah. Eine Auswertung,
// die schweigt, ist von einer ohne Ergebnisse nicht zu unterscheiden.
//
// DIE VIER ZAHLEN, IN DIESER REIHENFOLGE, und die Reihenfolge ist der Punkt:
//
//   verschickt        — was hinausging. Der Nenner für alles Weitere.
//   Antworten         — misst Höflichkeit. Die schwächste der drei Reaktionen,
//                       aber die einzige, die sofort da ist.
//   Veröffentlichungen— das eigentliche Ziel. Kommt Tage bis Wochen später und
//                       wird über die Verweise auf uns gefunden, nicht über
//                       eine Rückmeldung.
//   Eintragungen      — wer sich nach dem Brief für seine Gemeinde eingetragen
//                       hat, und wie viele davon angegeben haben, für die
//                       Verwaltung zu arbeiten.
//
// JEDE ZAHL IST EINE UNTERGRENZE, und das gehört an die Anzeige, nicht in eine
// Fußnote: Eine Meldung ohne Link auf uns zählt nicht mit (Mitteilungsblatt auf
// Papier), und wer beim Eintragen das Kästchen nicht ankreuzt, zählt als
// Bürger. Wer diese Zahlen als Vollerhebung liest, liest sie falsch.

export type OutreachZeile = {
  kampagne: string | null;
  contacted_at: string | null;
  responded_at: string | null;
  outreach_status: string;
  widget_anfrage?: boolean | null;
};

export type Auswertung = {
  kampagne: string;
  verschickt: number;
  offen: number;
  antworten: number;
  veroeffentlicht: number;
  widgetAnfragen: number;
  /** Bestätigte Eintragungen der Gemeinden dieser Kampagne. */
  abos: number;
  /** Davon mit Angabe Verwaltung — nie „aus der Verwaltung", siehe
   *  lib/kommunen-abo-spiegel.ts. */
  abosMitAngabeVerwaltung: number;
};

/**
 * Je Kampagne auswerten, plus eine Zeile „alles zusammen".
 *
 * Reine Funktion: Der Aufrufer holt beide Bestände und reicht sie herein. Die
 * Abo-Zahlen kommen als fertige Summen je Gemeinde, nicht als Eintragungen —
 * dieses Modul sieht keine Adressen.
 */
export function werteAus(
  zeilen: (OutreachZeile & { region_id: string })[],
  abosJeOrt: Map<string, { bestaetigt: number; mitAngabeVerwaltung: number }>,
): { gesamt: Auswertung; jeKampagne: Auswertung[] } {
  const leer = (k: string): Auswertung => ({
    kampagne: k,
    verschickt: 0,
    offen: 0,
    antworten: 0,
    veroeffentlicht: 0,
    widgetAnfragen: 0,
    abos: 0,
    abosMitAngabeVerwaltung: 0,
  });

  const je = new Map<string, Auswertung>();
  const gesamt = leer("gesamt");

  for (const z of zeilen) {
    const k = z.kampagne ?? "ohne Kampagne";
    const a = je.get(k) ?? leer(k);
    for (const ziel of [a, gesamt]) {
      if (z.contacted_at) ziel.verschickt++;
      else ziel.offen++;
      // Der Status trägt die Reaktion, nicht das Antwortdatum: Eine
      // Veröffentlichung wird über die Verweise gefunden und setzt kein
      // Antwortdatum. Beides über dasselbe Feld zu zählen verlöre sie.
      if (z.responded_at || z.outreach_status === "geantwortet") ziel.antworten++;
      if (z.outreach_status === "veroeffentlicht") ziel.veroeffentlicht++;
      if (z.widget_anfrage) ziel.widgetAnfragen++;
      const abo = abosJeOrt.get(z.region_id);
      if (abo) {
        ziel.abos += abo.bestaetigt;
        ziel.abosMitAngabeVerwaltung += abo.mitAngabeVerwaltung;
      }
    }
    je.set(k, a);
  }

  // Geparkte Schübe stehen mit ihrer Null in der Liste und werden nicht
  // versteckt: Ein Schub, der bewusst wartet, ist ein anderer Zustand als
  // einer, der nicht funktioniert hat.
  const jeKampagne = [...je.values()].sort((a, b) => b.verschickt - a.verschickt || a.kampagne.localeCompare(b.kampagne));
  return { gesamt, jeKampagne };
}
