// Central glossary of PV / heat-pump / energy terms.
//
// Single source of truth for every domain term we explain. Used by:
//   - <GlossaryTerm> (inline tooltip with `short`)
//   - /glossar page (full list with `long`)
//
// Data is fully static — no fetch, no client state beyond the open/close of a
// single tooltip. Keep `short` to one sentence (it renders in a small popover);
// put the deeper explanation in `long`.

export interface GlossaryEntry {
  /** Canonical term, shown as the glossary heading and the default underlined label. */
  term: string;
  /** One-sentence tooltip text. Plain language, no jargon-on-jargon. */
  short: string;
  /** Longer explanation for the /glossar page. Falls back to `short` if absent. */
  long?: string;
  /** Alternative spellings/notations that should resolve to this entry (e.g. "kWh"). */
  aliases?: string[];
}

// Slugs are stable kebab-case keys — used as anchor IDs on /glossar and as the
// lookup key for <GlossaryTerm id="...">. Don't rename a key without updating
// every usage; renaming `term` (the display text) is free.
/**
 * Prüfdatum der DATIERTEN Sachstände in diesem Glossar.
 *
 * Die meisten Einträge altern nicht — was eine Kilowattstunde ist, bleibt. Ein
 * knappes Dutzend trägt aber einen Stand, der kippen kann: der Kapazitätsmarkt,
 * die französische Atomstrom-Regelung, die Netzausfalldauer, der Anteil
 * negativer Börsenpreise, die Volleinspeisungs-Vergütung.
 *
 * Warum das hier steht (Inhalts-Inventur 25.08.2026): Das Glossar hing an
 * keinem Wächter und in keinem Prüfstand. Der Kapazitätsmarkt stand deshalb
 * sechs Wochen lang auf „ab 2028 geplant", obwohl das Gesetz seit dem
 * 22.07.2026 auf das Lieferjahr 2031 zielt — 2028 war einmal ein echter
 * amtlicher Stand und ist es seitdem nicht mehr. Niemandem ist es aufgefallen,
 * weil eine Definition nicht danach aussieht, als könne sie veralten.
 */
export const GLOSSAR_GEPRUEFT_ISO = "2026-08-25";

export const GLOSSARY: Record<string, GlossaryEntry> = {
  kwp: {
    term: "kWp",
    aliases: ["Kilowatt-Peak", "Kilowattpeak"],
    short:
      "Kilowatt-Peak — die Nennleistung einer PV-Anlage unter Idealbedingungen. Faustregel: 1 kWp braucht ca. 5 m² Dachfläche.",
    long:
      "kWp (Kilowatt-Peak) ist die Maßeinheit für die Leistung einer Photovoltaikanlage. Sie gibt an, wie viel Leistung die Anlage unter genormten Testbedingungen maximal liefert (1.000 W/m² Einstrahlung im Normspektrum AM 1,5 und 25 °C ZELLtemperatur — nicht Lufttemperatur). Eine 10-kWp-Anlage produziert in Deutschland je nach Standort grob 9.500–11.500 kWh Strom pro Jahr. Als grobe Daumenregel braucht 1 kWp rund 5 m² Dachfläche; was ein Kilowattpeak kostet, steht tagesaktuell im Rechner.",
  },
  kwh: {
    term: "kWh",
    aliases: ["Kilowattstunde", "Kilowattstunden"],
    short:
      "Kilowattstunde — Maßeinheit für Energiemenge. Bei PV: die Strommenge übers Jahr, beim Speicher: dessen Kapazität.",
    long:
      "Die Kilowattstunde (kWh) ist die Maßeinheit für Energiemenge — also wie viel Strom über eine Zeit verbraucht oder produziert wird. Nicht zu verwechseln mit kWp (Leistung): kWp sagt, wie stark die Anlage maximal ist, kWh sagt, wie viel sie tatsächlich liefert oder ein Speicher fassen kann. Ein durchschnittlicher Vierpersonenhaushalt verbraucht etwa 3.800 kWh im Jahr.",
  },
  speicherkapazitaet: {
    term: "Speicherkapazität",
    aliases: ["Batteriekapazität", "Speichergröße"],
    short:
      "Die nutzbare Strommenge (in kWh), die ein Batteriespeicher aufnehmen und später wieder abgeben kann.",
    long:
      "Die Speicherkapazität gibt an, wie viel Strom ein Batteriespeicher fasst — gemessen in Kilowattstunden (kWh). Sie verschiebt überschüssigen Solarstrom vom Mittag in die Abend- und Nachtstunden und erhöht so den Eigenverbrauch. Mehr Kapazität hilft aber nicht unbegrenzt: Ab einer gewissen Größe ist der Speicher im Sommer ohnehin voll und im Winter reicht die Sonne nicht zum Laden. Typisch sind 5–10 kWh für ein Einfamilienhaus.",
  },
  eigenverbrauch: {
    term: "Eigenverbrauch",
    aliases: ["Eigenverbrauchsanteil", "Eigenverbrauchsquote"],
    short:
      "Der Anteil deines Solarstroms, den du selbst nutzt, statt ihn ins Netz einzuspeisen — der wichtigste Hebel für die Rendite.",
    long:
      "Der Eigenverbrauch ist der Anteil des selbst erzeugten Solarstroms, den du direkt im Haushalt nutzt, statt ihn ins öffentliche Netz einzuspeisen. Er ist der wichtigste Faktor für die Wirtschaftlichkeit: Jede selbst verbrauchte Kilowattstunde spart dir den vollen Strompreis (ca. 31 ct), während eingespeister Strom nur die deutlich niedrigere Einspeisevergütung (ca. 8 ct) bringt. Speicher, Wärmepumpe und E-Auto erhöhen den Eigenverbrauch, eine sehr große Anlage relativ zum Verbrauch senkt ihn.",
  },
  autarkie: {
    term: "Autarkie",
    aliases: ["Autarkiegrad", "Autarkiequote", "Unabhängigkeit"],
    short:
      "Der Anteil deines Strombedarfs, den du selbst aus der PV-Anlage deckst — der Rest kommt weiter aus dem Netz.",
    long:
      "Der Autarkiegrad beschreibt, wie unabhängig du vom Stromnetz wirst: Welchen Anteil deines gesamten Jahresverbrauchs deckst du aus eigener Solarproduktion? Autarkie ist nicht dasselbe wie Eigenverbrauch — Eigenverbrauch betrachtet den erzeugten Strom (wie viel davon nutze ich selbst?), Autarkie den verbrauchten Strom (wie viel davon kommt vom eigenen Dach?). Ohne Speicher liegt die Autarkie meist bei 25–35 %, mit Speicher sind 50–70 % erreichbar. Volle Autarkie (100 %) ist mit Hausspeichern praktisch nicht erreichbar, weil im Winter zu wenig Sonne kommt.",
  },
  einspeiseverguetung: {
    term: "Einspeisevergütung",
    aliases: ["EEG-Vergütung", "Einspeisetarif"],
    short:
      "Der gesetzlich festgelegte Betrag, den du pro eingespeister Kilowattstunde Solarstrom bekommst — 20 Jahre lang fix.",
    long:
      "Die Einspeisevergütung ist der nach dem Erneuerbare-Energien-Gesetz (EEG) garantierte Betrag, den du für jede ins Netz eingespeiste Kilowattstunde Solarstrom erhältst. Sie ist ab Inbetriebnahme 20 Jahre lang fest und sinkt für Neuanlagen halbjährlich leicht (Degression). Die Höhe hängt von der Anlagengröße und davon ab, ob du teil- oder volleinspeist. Aktuell liegt sie bei rund 8 ct/kWh (Teileinspeisung) bzw. rund 12 ct/kWh (Volleinspeisung) für kleine Anlagen — deutlich unter dem Strompreis, weshalb hoher Eigenverbrauch sich mehr lohnt als Einspeisen.",
  },
  "marktwert-solar": {
    term: "Marktwert Solar",
    aliases: ["Marktwert", "Solarmarktwert", "Jahresmarktwert Solar"],
    short:
      "Der Durchschnittspreis, den eine Kilowattstunde Solarstrom an der Strombörse tatsächlich erzielt — deutlich weniger als der mittlere Börsenpreis.",
    long:
      "Der Marktwert Solar ist der erzeugungsgewichtete Börsenpreis für Solarstrom: Er zählt jede Kilowattstunde mit dem Preis der Stunde, in der sie anfällt. Genau darin liegt der Unterschied zum mittleren Börsenpreis — Solarstrom entsteht immer dann, wenn viel Solarstrom entsteht, und drückt den Preis in genau diesen Stunden. Die Übertragungsnetzbetreiber veröffentlichen den Wert monatlich und jährlich. Er ist von rund 8 ct/kWh (2023) auf 4,5 ct/kWh (2025) gefallen, und 2025 fiel fast ein Viertel der deutschen Solarerzeugung in Stunden mit negativem Preis. Für die Direktvermarktung ist er die entscheidende Größe: Sie bringt den Marktwert, nicht den Strompreis, den man selbst zahlt.",
  },
  teileinspeisung: {
    term: "Teileinspeisung",
    aliases: ["Überschusseinspeisung"],
    short:
      "Du nutzt den Solarstrom zuerst selbst und speist nur den Überschuss ein — der Normalfall bei Hausanlagen.",
    long:
      "Bei der Teileinspeisung (auch Überschusseinspeisung) verbrauchst du den Solarstrom vorrangig selbst und speist nur den nicht genutzten Überschuss ins Netz ein. Das ist der Regelfall für Haushalte, weil der selbst genutzte Strom (gesparter Strompreis ~31 ct) deutlich mehr wert ist als die Einspeisevergütung (~8 ct). Die Einspeisevergütung ist bei Teileinspeisung niedriger als bei Volleinspeisung, dafür sparst du beim eigenen Verbrauch.",
  },
  volleinspeisung: {
    term: "Volleinspeisung",
    short:
      "Du speist den gesamten Solarstrom ins Netz ein und nutzt nichts selbst — dafür gibt es eine höhere Vergütung.",
    long:
      "Bei der Volleinspeisung wird der komplette Solarstrom ins Netz eingespeist, ohne dass du selbst etwas davon nutzt. Als Ausgleich ist die Einspeisevergütung deutlich höher als bei Teileinspeisung (rund 12 statt 8 ct/kWh bei kleinen Anlagen). Das lohnt sich vor allem bei sehr geringem eigenem Stromverbrauch oder auf einem reinen Investitions-Dach. Für die meisten Haushalte ist Teileinspeisung wirtschaftlicher, weil der gesparte Strompreis höher ist als die Mehrvergütung.",
  },
  amortisation: {
    term: "Amortisation",
    aliases: ["Amortisationszeit", "Amortisationsdauer"],
    short:
      "Der Zeitpunkt, ab dem die Anlage sich bezahlt gemacht hat — die eingesparten Stromkosten haben die Investition wieder eingespielt.",
    long:
      "Die Amortisationszeit ist der Zeitraum, bis die Investition in die Anlage durch eingesparte Stromkosten und Einspeisevergütung wieder hereingeholt ist. Ab diesem Punkt erwirtschaftet die Anlage echten Gewinn. Bei einer typischen PV-Anlage liegt die Amortisation je nach Eigenverbrauch, Strompreis und Kosten bei etwa 9–14 Jahren — bei einer Lebensdauer von 25+ Jahren bleiben also viele Jahre Rendite. Wir rechnen sie über drei Strompreis-Szenarien, weil die künftige Preisentwicklung den Zeitpunkt stark beeinflusst.",
  },
  degradation: {
    term: "Degradation",
    aliases: ["Modul-Degradation", "Leistungsverlust"],
    short:
      "Der altersbedingte Leistungsverlust der Solarmodule — typisch rund 0,5 % pro Jahr.",
    long:
      "Solarmodule verlieren mit den Jahren etwas Leistung — dieser Effekt heißt Degradation. Üblich sind rund 0,5 % pro Jahr, sodass ein Modul nach 25 Jahren noch etwa 85–90 % seiner ursprünglichen Leistung bringt. Hersteller geben darauf meist eine Leistungsgarantie. Wir berücksichtigen die Degradation in der Amortisationsrechnung, weil der jährliche Ertrag dadurch über die Laufzeit leicht sinkt.",
  },
  jaz: {
    term: "JAZ",
    aliases: ["Jahresarbeitszahl"],
    short:
      "Jahresarbeitszahl — wie viel Wärme eine Wärmepumpe pro eingesetzter Kilowattstunde Strom übers Jahr liefert.",
    long:
      "Die Jahresarbeitszahl (JAZ) ist die wichtigste Effizienzkennzahl einer Wärmepumpe: Sie gibt an, wie viele Kilowattstunden Wärme die Pumpe übers ganze Jahr pro eingesetzter Kilowattstunde Strom erzeugt. Eine JAZ von 3,5 bedeutet, aus 1 kWh Strom werden 3,5 kWh Wärme. Je höher die JAZ, desto günstiger die Heizkosten. Sie hängt vor allem von der Vorlauftemperatur (Fußbodenheizung besser als alte Heizkörper) und der Wärmequelle ab (Erdwärme effizienter als Außenluft). Anders als der COP, der nur einen Betriebspunkt misst, ist die JAZ der reale Jahresdurchschnitt.",
  },
  cop: {
    term: "COP",
    aliases: ["Coefficient of Performance", "Leistungszahl"],
    short:
      "Leistungszahl einer Wärmepumpe in einem einzelnen Betriebspunkt — ein Laborwert, die JAZ ist der Jahresdurchschnitt.",
    long:
      "Der COP (Coefficient of Performance) ist das Verhältnis von abgegebener Wärme zu eingesetztem Strom in einem bestimmten Betriebspunkt, gemessen unter Normbedingungen. Ein COP von 4 heißt: 1 kWh Strom ergibt 4 kWh Wärme. Der COP ist ein Momentanwert im Labor — für die tatsächlichen Heizkosten ist die JAZ (Jahresarbeitszahl) aussagekräftiger, weil sie den Durchschnitt über ein ganzes Jahr mit allen Temperaturen abbildet.",
  },
  beg: {
    term: "BEG",
    aliases: ["Bundesförderung für effiziente Gebäude", "BEG-Förderung", "BEG Einzelmaßnahme"],
    short:
      "Bundesförderung für effiziente Gebäude — das staatliche Zuschussprogramm für Heizungstausch und Sanierung, für den Heizungstausch umgesetzt über die KfW.",
    long:
      "Die BEG (Bundesförderung für effiziente Gebäude) ist das zentrale Förderprogramm des Bundes für energetische Maßnahmen an Wohngebäuden. Für den Heizungstausch — etwa den Einbau einer Wärmepumpe im Bestand — gibt es einen Zuschuss über die KfW (Zuschuss 458), der sich aus einer Grundförderung und mehreren Boni zusammensetzt (Klima-Geschwindigkeits-Bonus, Einkommens-Bonus). Daneben fördert die BEG auch Dämmung, Fenster und Anlagentechnik. Die Sätze und Bedingungen ändern sich regelmäßig; verbindlich ist stets die jeweils gültige Richtlinie und die Zusage der KfW.",
  },
  noct: {
    term: "NOCT",
    aliases: ["Nominal Operating Cell Temperature", "Normale Betriebstemperatur"],
    short:
      "Die Zell-Betriebstemperatur eines Solarmoduls unter realistischen Bedingungen — Grundlage, um die echte Momentanleistung zu schätzen.",
    long:
      "NOCT (Nominal Operating Cell Temperature) ist die Temperatur, die eine Solarzelle unter realistischen Betriebsbedingungen erreicht (800 W/m² Einstrahlung, 20 °C Lufttemperatur, 1 m/s Wind, Modul im offenen Gestell bei 45° Neigung) — bei marktüblichen Modulen rund 45 °C, das ist allerdings ein Erfahrungswert aus Datenblättern und kein Normwert. Die Modulnorm hat den Kennwert 2021 durch den NMOT abgelöst, der an der Modulrückseite und im Arbeitspunkt statt im Leerlauf gemessen wird; auf Datenblättern stehen weiterhin beide. Module verlieren bei Hitze an Leistung, deshalb nutzen wir die NOCT zusammen mit dem Temperaturkoeffizienten in der Live-Simulation, um aus aktuellen Wetterdaten die momentane PV-Leistung zu schätzen. An kühlen, sonnigen Tagen liefert eine Anlage daher oft mehr als an heißen.",
  },
  ertrag: {
    term: "Spezifischer Ertrag",
    aliases: ["kWh/kWp", "Ertrag", "Jahresertrag"],
    short:
      "Wie viele Kilowattstunden eine Anlage pro kWp und Jahr liefert — standortabhängig, in Deutschland grob 950–1.150.",
    long:
      "Der spezifische Ertrag (kWh/kWp/Jahr) gibt an, wie viel Strom eine Anlage pro installiertem Kilowatt-Peak und Jahr produziert. Er hängt stark vom Standort, der Dachausrichtung und -neigung ab: In Süddeutschland sind über 1.100 kWh/kWp möglich, an der Nordseeküste eher 950–1.000. Wir holen den ortsgenauen Wert über deine Postleitzahl aus der PVGIS-Datenbank der EU-Kommission. Multipliziert mit der Anlagengröße ergibt sich der Jahresertrag in kWh.",
  },
  degression: {
    term: "Degression",
    short:
      "Das planmäßige, schrittweise Absinken der Einspeisevergütung für neue Anlagen — nicht zu verwechseln mit Degradation.",
    long:
      "Die Degression ist das gesetzlich festgelegte, schrittweise Absinken der Einspeisevergütung für neu in Betrieb genommene Anlagen (aktuell etwa 1 % pro Halbjahr). Wer früher baut, sichert sich einen höheren Satz — der dann aber für die gesamten 20 Jahre fix bleibt. Nicht zu verwechseln mit der Degradation, dem altersbedingten Leistungsverlust der Module.",
  },
  arenh: {
    term: "ARENH",
    aliases: ["Atomstrom-Regulierung Frankreich"],
    short:
      "Französisches Regulierungssystem, das Stromanbietern Zugang zu Atomstrom von EDF zu einem staatlich festgelegten Preis garantierte — Ende 2025 ausgelaufen.",
    long:
      "ARENH war das französische Regulierungssystem, das Energieversorgern Zugang zu Atomstrom von EDF zu einem staatlich festgelegten Preis garantierte. Es lief Ende 2025 aus; seit 1. Januar 2026 gilt keine garantierte Belieferung mehr, sondern eine Abgabe: Der Staat schöpft einen Teil der Erlöse ab, die EDF oberhalb festgelegter Schwellen erzielt. Einen garantierten Preis gibt es damit nicht — greift der Mechanismus in einem Jahr nicht, zahlt EDF nichts. Vorher lag der ARENH-Preis bei 4,2 Ct/kWh.",
  },
  blackout: {
    term: "Blackout",
    aliases: ["Blackouts"],
    short:
      "Ein großflächiger, unkontrollierter Zusammenbruch der Stromversorgung im gesamten Netz — nicht zu verwechseln mit einer kurzen, örtlichen Störung.",
    long:
      "Ein großflächiger, unkontrollierter Zusammenbruch der Stromversorgung im gesamten Netz — nicht zu verwechseln mit einer lokalen, meist kurzen Versorgungsunterbrechung, wie sie z. B. durch Bauarbeiten oder Wetter entsteht. Deutschland hatte bislang keinen flächendeckenden Blackout; die durchschnittliche Versorgungsunterbrechung pro Verbraucher lag 2024 bei 11,7 Minuten im Jahr (Bundesnetzagentur).",
  },
  dunkelflaute: {
    term: "Dunkelflaute",
    aliases: ["Dunkelflauten"],
    short:
      "Ein Zeitraum mit gleichzeitig wenig Wind und wenig Sonne, in dem Wind- und Solaranlagen kaum Strom liefern.",
    long:
      "Ein Zeitraum mit wenig Wind und wenig Sonne gleichzeitig, in dem Wind- und Solaranlagen kaum Strom liefern. Wie viele Tage im Jahr darunterfallen, hängt vollständig davon ab, wo man die Schwelle zieht — eine allgemein anerkannte Definition gibt es nicht. Legt man eine harte Schwelle an (mindestens 48 Stunden unter einem Zehntel der Nennleistung), waren es 2025 in Deutschland vier Phasen. Mehrtägige Dunkelflauten (eine Woche oder länger mit durchgehend schwacher Erzeugung) sind die eigentliche Herausforderung, weil sie die Kapazität heutiger Batteriespeicher übersteigen.",
  },
  grenzkosten: {
    term: "Grenzkosten",
    short:
      "Die Kosten für die nächste erzeugte Kilowattstunde — bei Wind, Solar und Atomkraft niedrig, bei Gaskraftwerken hoch.",
    long:
      "Die Kosten, die ein Kraftwerk für die nächste erzeugte Kilowattstunde hat, vor allem Brennstoffkosten. Wind, Solar und Atomkraft haben niedrige Grenzkosten, Gaskraftwerke hohe.",
  },
  grundlastfaehig: {
    term: "Grundlastfähig",
    aliases: ["Grundlast", "grundlastfähig"],
    short:
      "Ein Kraftwerk ist grundlastfähig, wenn es konstant rund um die Uhr Strom liefern kann — klassisch Kohle- oder Kernkraftwerke.",
    long:
      "Ein Kraftwerk ist grundlastfähig, wenn es konstant und rund um die Uhr Strom liefern kann — klassisch Kohle- oder Kernkraftwerke. Im Erneuerbaren-System wird das zunehmend durch die Residuallast als Planungsgröße abgelöst.",
  },
  kapazitaetsmechanismus: {
    term: "Kapazitätsmechanismus",
    short:
      "Ein Bezahlmodell, bei dem Kraftwerke schon dafür Geld bekommen, dass sie Leistung bereithalten — nicht nur für gelieferten Strom.",
    long:
      "Ein Bezahlmodell, bei dem Kraftwerksbetreiber schon dafür Geld bekommen, dass sie Leistung bereithalten — nicht nur für tatsächlich gelieferten Strom. Soll die Versorgung in Extremzeiten wie Dunkelflauten absichern. In Deutschland auf das Lieferjahr 2031 ausgerichtet; die ersten Ausschreibungen laufen ab Herbst 2026. Die Zuschläge stehen unter dem Vorbehalt der beihilferechtlichen Genehmigung durch die EU-Kommission.",
  },
  "merit-order": {
    term: "Merit-Order",
    short:
      "Das Prinzip, nach dem an der Strombörse das teuerste noch benötigte Kraftwerk den Preis für alle setzt.",
    long:
      "Das Prinzip, nach dem an der Strombörse das jeweils teuerste noch benötigte Kraftwerk den Preis für alle Anbieter setzt. Da oft Gaskraftwerke die letzte Lücke schließen, bestimmt der Gaspreis häufig den gesamten Strompreis — auch wenn der meiste Strom aus günstigeren Quellen stammt.",
  },
  redispatch: {
    term: "Redispatch",
    short:
      "Das kurzfristige An- und Abregeln von Kraftwerken durch die Netzbetreiber, um Engpässe im Stromnetz auszugleichen.",
    long:
      "Das kurzfristige An- und Abregeln von Kraftwerken durch die Netzbetreiber, um Engpässe im Stromnetz auszugleichen. Verursacht Zusatzkosten, die über die Netzentgelte auf den Strompreis umgelegt werden.",
  },
  residuallast: {
    term: "Residuallast",
    aliases: ["Residuallastkurve"],
    short:
      "Der Stromverbrauch, der nach Abzug von Wind- und Solarerzeugung übrig bleibt und anders gedeckt werden muss.",
    long:
      "Der Stromverbrauch, der nach Abzug der Wind- und Solarerzeugung übrig bleibt und durch Speicher, Importe oder andere Kraftwerke gedeckt werden muss.",
  },
  saidi: {
    term: "SAIDI",
    short:
      "Die durchschnittliche Dauer von Stromausfällen pro Verbraucher und Jahr, erhoben von der Bundesnetzagentur.",
    long:
      "Die von der Bundesnetzagentur erhobene durchschnittliche Dauer von Stromausfällen pro Verbraucher und Jahr. 2024 lag der Wert für Deutschland bei 11,7 Minuten, ein international sehr niedriger Wert (zum Vergleich: in den USA rund 130 Minuten, ebenfalls ohne Großereignisse gerechnet — mit Wirbelstürmen und ähnlichen Ereignissen sind es dort ein Vielfaches).",
  },

  // Vokabular des Balkon-Clusters. Die drei Begriffe kommen auf Hub, Rechner und
  // Anmelde-Ratgeber ständig vor und waren bisher nirgends erklärt.
  steckersolar: {
    term: "Steckersolargerät",
    aliases: ["Balkonkraftwerk", "Steckersolar", "Steckersolaranlage", "Mini-PV", "Balkon-PV"],
    short:
      "Eine kleine Solaranlage mit ein bis vier Modulen, die über einen Stecker direkt ins Hausnetz einspeist — der amtliche Name für das, was alle Balkonkraftwerk nennen.",
    long:
      "Ein Steckersolargerät besteht aus ein bis vier Solarmodulen und einem Wechselrichter und wird über einen Stecker direkt an das Hausnetz angeschlossen — ohne Elektriker, ohne Eingriff in die Installation. Der Wechselrichter darf höchstens 800 Voltampere einspeisen, die Module dürfen zusammen bis 2.000 Wattpeak leisten. Wirtschaftlich zählt fast nur der selbst verbrauchte Strom: Eine Einspeisevergütung gibt es dafür nicht. Im Marktstammdatenregister laufen die Geräte als „Steckerfertige Solaranlage“ — das Wort Balkonkraftwerk kommt dort nicht vor.",
  },
  wechselrichter: {
    term: "Wechselrichter",
    aliases: ["Inverter", "Modulwechselrichter", "Mikrowechselrichter"],
    short:
      "Das Gerät, das den Gleichstrom der Solarmodule in haushaltsüblichen Wechselstrom umwandelt — und damit die Obergrenze setzt, wie viel Leistung ankommt.",
    long:
      "Solarmodule liefern Gleichstrom; im Hausnetz fließt Wechselstrom. Diese Umwandlung übernimmt der Wechselrichter. Seine Leistung ist eine andere Zahl als die der Module und wird häufig damit verwechselt: Bei Steckersolargeräten dürfen die Module mehr leisten, als der Wechselrichter durchlässt. Das ist erlaubt und sogar sinnvoll — gekappt wird nur die Mittagsspitze, während morgens und abends spürbar mehr ankommt.",
  },
  marktstammdatenregister: {
    term: "Marktstammdatenregister",
    aliases: ["MaStR", "Marktstammdaten-Register"],
    short:
      "Das amtliche Verzeichnis aller Strom- und Gaserzeugungsanlagen bei der Bundesnetzagentur — dort muss jede Solaranlage eingetragen werden, auch ein Balkonkraftwerk.",
    long:
      "Das Marktstammdatenregister der Bundesnetzagentur führt alle Anlagen, die Strom oder Gas erzeugen. Betreiber müssen ihre Anlage dort innerhalb eines Monats nach Inbetriebnahme registrieren; maßgeblich ist der Tag, an dem die Anlage das erste Mal Strom ins Hausnetz einspeist, nicht der Kauf. Seit dem Solarpaket I im Mai 2024 genügt bei Steckersolargeräten diese eine Registrierung — die zusätzliche Meldung beim Netzbetreiber ist entfallen. Die Eintragung ist kostenlos; wer die Frist verstreichen lässt, handelt grundsätzlich ordnungswidrig.",
  },
};

export type GlossarySlug = keyof typeof GLOSSARY;

// Lowercased lookup of every term + alias → slug, for tolerant resolution.
const lookupIndex: Record<string, string> = {};
for (const [slug, entry] of Object.entries(GLOSSARY)) {
  lookupIndex[slug.toLowerCase()] = slug;
  lookupIndex[entry.term.toLowerCase()] = slug;
  for (const alias of entry.aliases ?? []) {
    lookupIndex[alias.toLowerCase()] = slug;
  }
}

/** Resolve a slug, term, or alias (case-insensitive) to its glossary entry. */
export function resolveGlossary(key: string): GlossaryEntry | undefined {
  const slug = lookupIndex[key.toLowerCase()];
  return slug ? GLOSSARY[slug] : undefined;
}

/** Resolve a slug, term, or alias (case-insensitive) to its canonical slug. */
export function resolveGlossarySlug(key: string): string | undefined {
  return lookupIndex[key.toLowerCase()];
}

/** All entries, sorted alphabetically by term — for the /glossar page. */
export function allGlossaryEntries(): Array<{ slug: string; entry: GlossaryEntry }> {
  return Object.entries(GLOSSARY)
    .map(([slug, entry]) => ({ slug, entry }))
    .sort((a, b) => a.entry.term.localeCompare(b.entry.term, "de"));
}
