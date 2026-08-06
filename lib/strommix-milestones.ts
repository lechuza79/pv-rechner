// Jahres-Marken für die Strommix-Seite: was ein Jahr im deutschen Stromsystem
// geprägt hat. Wird unter dem Chart gezeigt, wenn ein einzelnes Jahr oder die
// Max-Ansicht gewählt ist — als Einordnung neben den nackten Kurven.
//
// DREI Prüf-Ebenen, alle am 06.08.2026 durchlaufen (2 Rechercheure + 1
// adversarialer Prüfer, der gezielt widerlegen sollte — Council-Muster):
// 1. Primärquellen (Fraunhofer-ISE-Jahresauswertungen auf energy-charts.info
//    bzw. ISE-Presseinformationen; Atomausstieg zusätzlich BASE):
//      2020: Stromerzeugung_2020_1.pdf („erstmals über 50%"; ISE nennt keinen
//            Nachkommawert — 50,5 ist Sekundärpresse und wird nicht verwendet)
//      2021: Stromerzeugung_2021.pdf (Wind −12 %, witterungsbedingt)
//      2022: ISE-PI 03.01.2023 (Verwerfungen nach Ukraine-Angriff, „Ausfall der
//            Hälfte des französischen Atomkraftwerk-Parks", Exportsaldo nach
//            Frankreich 15,3 TWh im geplanten Stromhandel)
//      2023: ISE-PI 02.01.2024 (Abschaltung 15.04.2023; Braunkohle −27 %,
//            Steinkohle −35 %, Brutto-Niveau von 1963 bzw. 1955)
//      2024: ISE-PI 02.01.2025 (Rekordanteil, „Strommix so sauber wie nie")
//      2025: ISE-PI 01.01.2026 („Wind und Solar erstmals als Doppelspitze";
//            PV +21 %, überholte erstmals die Braunkohle; KEIN neuer
//            EE-Anteilsrekord — der steht weiter bei 2024)
// 2. Kohärenz mit den EIGENEN Kacheln darüber: Die Kacheln rechnen aus den
//    Energy-Charts-Rohdaten dieser Seite und liegen je nach Jahr 2–3 Punkte
//    unter den ISE-Jahresbilanzen (andere Abgrenzung von Pumpspeicher/Sonstige,
//    Datenrevisionen). DESHALB tragen die Marken KEINE Anteils-Prozentwerte —
//    eine Marke „62,7 %" neben einer Kachel „60 %" wäre ein sichtbarer
//    Widerspruch. Relative Aussagen (Höchststand, −12 %, überholt) sind gegen
//    unsere eigene Jahresreihe 2015–2025 nachgerechnet und stimmen in beiden
//    Zählungen. Historische Fakten, bewusst hartkodiert (passieren nur einmal).

export interface StrommixMilestone {
  year: number;
  /** Kurz-Titel, taugt als Badge neben der Jahreszahl. */
  title: string;
  /** Ein bis zwei ganze Sätze Einordnung. */
  text: string;
}

export const STROMMIX_MILESTONES: StrommixMilestone[] = [
  {
    year: 2020,
    title: "Erneuerbare erstmals vorn",
    text: "Ein windstarkes Jahr und der pandemiebedingt gesunkene Stromverbrauch hoben den Erneuerbaren-Anteil auf den bis dahin höchsten Stand — in der Jahresbilanz des Fraunhofer ISE lieferten Wind, Solar, Wasser und Biomasse erstmals mehr als die Hälfte der öffentlichen Nettostromerzeugung.",
  },
  {
    year: 2021,
    title: "Windschwaches Jahr",
    text: "Die Windenergie lieferte witterungsbedingt rund 12 Prozent weniger als im starken Vorjahr, der Erneuerbaren-Anteil ging spürbar zurück. Gute und schwache Wetterjahre gehören zum System.",
  },
  {
    year: 2022,
    title: "Energiekrise",
    text: "Der russische Angriff auf die Ukraine führte zu extremen Energiepreisen, zugleich stand etwa die Hälfte des französischen Atomkraftwerk-Parks still. Deutschland exportierte in diesem Jahr per Saldo rund 15 Terawattstunden Strom nach Frankreich.",
  },
  {
    year: 2023,
    title: "Atomausstieg",
    text: "Am 15. April 2023 gingen die letzten drei deutschen Kernkraftwerke (Isar 2, Emsland, Neckarwestheim 2) endgültig vom Netz. Seitdem taucht Kernenergie im Chart nur noch als rechnerischer Import auf.",
  },
  {
    year: 2023,
    title: "Kohle auf historischem Tief",
    text: "Die Braunkohleverstromung sank um gut ein Viertel, Steinkohle um mehr als ein Drittel — laut Fraunhofer ISE zurück auf das Niveau von 1963 beziehungsweise 1955. Der Erneuerbaren-Anteil sprang auf einen neuen Höchststand.",
  },
  {
    year: 2024,
    title: "Sauberster Strommix bisher",
    text: "Der Anteil der Erneuerbaren an der Stromerzeugung erreichte einen neuen Rekord — der deutsche Strommix war so sauber wie in keinem Jahr zuvor.",
  },
  {
    year: 2025,
    title: "Wind und Solar als Doppelspitze",
    text: "Erstmals waren Windkraft und Photovoltaik die beiden größten Stromerzeuger des Landes. Die Solarerzeugung legte um rund ein Fünftel zu und überholte dabei erstmals die Braunkohle.",
  },
];

/** Marken für ein einzelnes Jahr (Jahres-Ansicht). */
export function milestonesForYear(year: number): StrommixMilestone[] {
  return STROMMIX_MILESTONES.filter((m) => m.year === year);
}
