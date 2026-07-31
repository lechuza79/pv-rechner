// ─── Norm-Bedarf → realer Verbrauch (Prebound) ──────────────────────────────
//
// EINE Stelle für die Frage: „Wie viel Heizenergie verbraucht dieses Gebäude
// WIRKLICH?" — im Unterschied zu der Frage, die die Norm beantwortet: „Wie viel
// bräuchte es rechnerisch, wenn alle Räume auf 20 °C stünden?"
//
// WARUM DAS MODUL EXISTIERT (Nutzerkritik 31.07.2026, Reddit):
// Der Wärmepumpen-Rechner zeigte einem Altbau-Besitzer 116.000 € Heizkosten über
// 20 Jahre. Er rechnete gegen: selbst großzügig mit dem doppelten Arbeitspreis kam
// er auf 60.000 €. Er hatte recht — und der Fehler steckte nicht im Preis (den
// rechnen wir mit seinen 11 ct/kWh), sondern in der MENGE. Wir unterstellten einem
// unsanierten Haus rund 250 kWh/m²·a Gasverbrauch; real liegen ungedämmte Altbauten
// bei 160–200, der Bestandsschnitt bei ~150.
//
// Ursache: Für die Betriebskosten wurde der NORM-BEDARF eingesetzt (kWh/m²·a nach
// DIN V 18599 / dena). Das ist die falsche Größe. Der Norm-Bedarf beschreibt ein
// vollständig auf Solltemperatur beheiztes Gebäude bei Norm-Klima — die Rechnung,
// die im Energieausweis steht. Was ein Haushalt bezahlt, ist der VERBRAUCH, und der
// liegt im Bestand systematisch darunter: nicht alle Räume werden beheizt, nachts
// und tagsüber wird abgesenkt, Schlafzimmer bleiben kalt.
//
// QUELLE (in dieser Session aufgeschlagen, 31.07.2026):
//   Sunikka-Blank, M. / Galvin, R. (2012): „Introducing the prebound effect: the gap
//   between performance and actual energy consumption", Building Research &
//   Information 40(3), S. 260–273. Auswertung von 3.400 deutschen Wohnungen
//   (ergänzt um Daten aus rund 1 Mio. weiteren Objekten).
//   Kernbefund, zitiert nach der Darstellung der Universität Cambridge (Institution
//   der Erstautorin), https://www.cam.ac.uk/research/news/the-prebound-effect:
//     · im Mittel berechnet 225 kWh/m²a → gemessen ~150 kWh/m²a = 30 % Diskrepanz
//     · die Lücke WÄCHST mit dem berechneten Kennwert:
//         Kennwert 150 kWh/m²a → Verbrauch 17 % darunter
//         Kennwert 300 kWh/m²a → Verbrauch 40 % darunter
//     · für schlechte Altbauten sind 30–35 % typisch
//   Ergänzend derselbe Zusammenhang bei rund 500 kWh/m²a: ~60 % (Building Research &
//   Information, ebd.).
//
// WARUM EINE SCHICHT UND NICHT EINFACH KLEINERE KENNWERTE:
// Die Werte in INSULATION_BESTAND sind als Norm-Bedarf belegt (dena, DIN V 18599) und
// werden auch so beschriftet. Sie stillschweigend abzusenken hieße, eine belegte Zahl
// durch eine unbelegte zu ersetzen und die Quellenangabe daneben falsch werden zu
// lassen. Stattdessen bleibt der Norm-Bedarf, was er ist, und die Umrechnung in den
// Verbrauch steht hier — benannt, begründet, an einer Stelle, mit Test.
//
// WAS HIER BEWUSST NICHT KORRIGIERT WIRD:
//   · Die HEIZLAST (kW). Die Anlage muss das Haus am kältesten Tag warm bekommen,
//     auch wenn seine Bewohner sparsam heizen. Sie ist eine Auslegungsgröße nach
//     DIN EN 12831 und bleibt unangetastet (lib/heatpump-core.ts → calcHeatLoad).
//   · WARMWASSER. Der Prebound-Effekt ist für Raumwärme gemessen; der
//     Warmwasserbedarf hängt an Personen, nicht am Gebäude.
//   · Stufen, deren Kennwert schon ein GEMESSENER Verbrauch ist (INSULATION_BESTAND
//     trägt das je Stufe als `art`). Sie ein zweites Mal zu korrigieren würde sie
//     unter jedes reale Gebäude drücken.
//
// UNTERHALB VON 150 kWh/m²·a WIRD EXTRAPOLIERT — und das steht hier, statt es zu
// verschweigen: Die Studie belegt Stützstellen ab 150 aufwärts. Darunter setzen wir
// die Kurve stetig gegen null fort (bei 75 kWh/m²·a sind es noch ~8 %). Zwei
// Alternativen wurden verworfen: die Korrektur unterhalb der Stützstellen hart
// abzuschneiden, erzeugte einen Sprung mitten in der Skala; sie im Neubau ganz
// wegzulassen (erster Entwurf am 31.07.2026) ließ den Klima-Rechner einen
// VERBRAUCHS-Altbau gegen einen BEDARFS-Neubau stellen — zwei verschiedene Größen
// in derselben Auswahl, genau der Fehler, den dieses Modul beheben soll. Aufgefallen
// ist es einem Test, nicht beim Nachdenken.
//
// RICHTUNG DER WIRKUNG — bewusst zu unseren Ungunsten: Ein kleinerer Wärmebedarf
// senkt die fossilen Kosten UND den Wärmepumpen-Strom. Die ausgewiesene Ersparnis
// wird dadurch kleiner und die Amortisation länger (im Beispiel 130 m² unsaniert:
// 12 statt 9 Jahre). Das ist der Punkt: Die Wärmepumpe sah besser aus, als sie ist.
//
// Festgenagelt von lib/__tests__/heat-consumption.test.ts (Stützstellen + die
// Realitäts-Anker gegen echte Verbrauchsbänder).

import type { KennwertArt } from "./constants";

/** Stützstellen der veröffentlichten Prebound-Kurve: berechneter Kennwert
 *  (kWh/m²·a) → Anteil, um den der gemessene Verbrauch darunter liegt.
 *  Der Punkt (0 | 0) ist keine Messung, sondern die konservative Fortsetzung
 *  unterhalb des untersuchten Bereichs: Je besser das Gebäude, desto kleiner die
 *  Lücke — bei einem Gebäude ohne Heizbedarf gibt es nichts zu unterschreiten. */
const PREBOUND_STOPS: ReadonlyArray<{ bedarf: number; anteil: number }> = [
  { bedarf: 0, anteil: 0 },
  { bedarf: 150, anteil: 0.17 },
  { bedarf: 225, anteil: 0.30 },
  { bedarf: 300, anteil: 0.40 },
  { bedarf: 500, anteil: 0.60 },
];

/** Anteil (0..1), um den der gemessene Verbrauch unter dem Norm-Bedarf liegt.
 *  Zwischen den Stützstellen linear interpoliert, oberhalb der obersten konstant. */
export function preboundAnteil(bedarfSpecKwh: number): number {
  const b = Math.max(0, bedarfSpecKwh);
  const last = PREBOUND_STOPS[PREBOUND_STOPS.length - 1];
  if (b >= last.bedarf) return last.anteil;
  for (let i = 1; i < PREBOUND_STOPS.length; i++) {
    const lo = PREBOUND_STOPS[i - 1];
    const hi = PREBOUND_STOPS[i];
    if (b <= hi.bedarf) {
      const t = (b - lo.bedarf) / (hi.bedarf - lo.bedarf);
      return lo.anteil + t * (hi.anteil - lo.anteil);
    }
  }
  return 0;
}

/**
 * Realer Heizwärme-Verbrauchskennwert (kWh/m²·a) aus einem Tabellen-Kennwert.
 * Das ist die Größe, die für KOSTEN gilt — und die ein Nutzer auf seiner
 * Jahresabrechnung wiedererkennt.
 *
 * @param art `verbrauch` = die Stufe ist bereits ein gemessener Wert und wird
 *            NICHT ein zweites Mal korrigiert (siehe INSULATION_BESTAND).
 */
export function verbrauchAusBedarf(specKwh: number, art: KennwertArt = "bedarf"): number {
  if (art === "verbrauch") return specKwh;
  return specKwh * (1 - preboundAnteil(specKwh));
}

/** Endenergie (Brennstoff ab Zähler) aus Heizwärme — für die Gegenprobe mit dem,
 *  was auf der Abrechnung steht. Umkehrung: `waermeAusEndenergie`. */
export function endenergieAusWaerme(waermeKwh: number, kesselWirkungsgrad: number): number {
  return waermeKwh / Math.max(0.5, kesselWirkungsgrad);
}

/** Heizwärme aus abgelesener Endenergie (Gas-/Ölverbrauch laut Abrechnung).
 *  Der Weg, den die Verbrauchseingabe im Rechner nimmt: Was der Zähler zählt, ist
 *  Brennstoff; was das Gebäude braucht, ist das abzüglich der Kesselverluste. */
export function waermeAusEndenergie(endenergieKwh: number, kesselWirkungsgrad: number): number {
  return endenergieKwh * Math.min(1, Math.max(0.5, kesselWirkungsgrad));
}

/** Liter Heizöl → kWh. Unterer Heizwert Heizöl EL: 10 kWh/l (gerundeter
 *  Branchenwert; die Abrechnung nennt Liter, die Rechnung braucht kWh). */
export const OEL_KWH_PRO_LITER = 10;
