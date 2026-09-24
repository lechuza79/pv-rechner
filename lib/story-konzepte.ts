import { MONTH_PEAK_EXAMPLES } from "./story-monatspeak-examples";
/** Editorial design examples, deliberately separate from publication candidates. */
export type StoryConcept = {
 additionsSeries?:import('./story-monthly-additions').AdditionsSeries;
  rankSummary?:import('./story-ranking-month').RankMonthRow[];
  energyYear?: import('./story-energy-year').EnergyYear;
  solarMonth?: import('./story-monthly-solar').SolarMonth;
  countComparison?: {total:number;selected:number;label:string};
  id: string; label: string; town: string; kind: "radial" | "yield" | "facts" | "bars" | "donut" | "rank" | "timeline" | "project" | "columns" | "shares";
  title: string; teaser: string; period: string; evidence: string;
  values: { label: string; value: number; unit?: string }[]; unit: string;
  copy: { heading: string; text: string }[];
  social: string; widget: string; widgetCta: string;
  seo: string; beforeRelease: string;
  eventEnd?: string; highlightedMonths?: string[]; chartSummary?: string; comparisonLabel?: string; event?: { month: string; label: string };
  yieldSeries?: {period:string;value:number;highlight:boolean}[];
  marginalia?: string[]; sourceCaption?: string; sourceDate?: string;
  sources?: { label: string; url: string }[];
  comparison?: { scope: string; limitation: string; windows: { label: string; value: number }[] };
};
export const STORY_CONCEPTS: StoryConcept[] = [
  {
  "id": "grossanlage",
  "label": "Eine große Anlage",
  "town": "Ketzin/Havel",
  "kind": "project",
  "title": "Ein Solarpark verändert die Größenordnung",
  "teaser": "Im November 2025 ging in Ketzin/Havel ein Solarpark mit rund 87 MWp in Betrieb. Seine Leistung ist größer als die aller übrigen für 2025 erfassten neuen Solareinheiten im Ort zusammen.",
  "period": "November 2025 · Rückblick",
  "evidence": "Für die Gestaltung vorbereitet · Projekt und Zeitraum extern bestätigt · Registerstand 9. Sept. 2026",
  "values": [
    {
      "label": "Solarpark",
      "value": 86.919
    },
    {
      "label": "Übrige Solareinheiten des Jahrgangs 2025",
      "value": 0.55987
    }
  ],
  "unit": "MWp installierte Modulleistung",
  "comparisonLabel": "Vergleich: Inbetriebnahmejahr 2025 in Ketzin/Havel",
  "copy": [
    {
      "heading": "Ein Projekt, viel Leistung",
      "text": "Der Solarpark bringt rund 87 MWp installierte Leistung hinzu. Die Stadt meldete seine Einweihung am 11. November 2025; der Projektentwickler bestätigt die Inbetriebnahme im selben Monat."
    },
    {
      "heading": "Was der Vergleich zeigt",
      "text": "Die übrigen 90 Solareinheiten mit Inbetriebnahmejahr 2025 kommen zusammen auf rund 0,56 MWp. Der Vergleich zeigt die unterschiedliche Größenordnung eines Solarparks und kleinerer Anlagen. Er sagt nichts darüber aus, wie viele Haushalte oder Menschen beteiligt sind."
    },
    {
      "heading": "Leistung ist nicht Stromerzeugung",
      "text": "MWp bezeichnet die Nennleistung der Solarmodule. Wie viel Strom die Anlage tatsächlich erzeugt, hängt unter anderem von Wetter und Jahreszeit ab. Der Strom steht nicht automatisch ausschließlich dem Ort zur Verfügung."
    }
  ],
  "social": "Ein Solarpark verändert die Größenordnung in Ketzin/Havel: Seit November 2025 ist dort ein Projekt mit rund 87 MWp in Betrieb.\n\nZum Vergleich: Die übrigen 90 für das Inbetriebnahmejahr 2025 erfassten Solareinheiten im Ort kommen zusammen auf rund 0,56 MWp. Das zeigt, wie unterschiedlich große Projekte und kleinere Anlagen zum Ausbau beitragen.\n\nMWp ist installierte Modulleistung, keine gemessene Strommenge. Grundlage: Marktstammdatenregister, Stand 9. September 2026, heute aktive Einheiten nach Inbetriebnahmejahr; Projektangaben von Stadt und Entwickler.",
  "widget": "Den bestehenden aktuellen Anlagenbestand verlinken. Kein weiteres Widget nötig; die Story hält das Projekt und seinen Zeitpunkt fest.",
  "widgetCta": "Aktuellen Solarbestand ansehen",
  "seo": "Eigenständiger lokaler Projektbeitrag mit benanntem Solarpark und belegtem Zeitpunkt. Dauerhafte Story-Adresse, verlinkt von der Gemeindeseite; kein Versprechen zusätzlichen Suchtraffics.",
  "beforeRelease": "Gestaltung und Text abnehmen. Die Registersumme bezieht sich auf heute aktive Einheiten des Jahrgangs 2025; eine Einheit ist nicht generell ein eigenständiges Projekt. Projektidentität hier durch Stadt und Entwickler plausibilisiert, Einzelregister-ID noch nicht verknüpft.",
  "sources": [
    {
      "label": "Stadt: Einweihung am 11. November 2025",
      "url": "https://www.ketzin.de/news/index.php?news=1159927"
    },
    {
      "label": "Projektentwickler: Betrieb seit November 2025",
      "url": "https://beteiligung.kronos-solar.com/projekte/solarpark_ketzin"
    }
  ]
},
  MONTH_PEAK_EXAMPLES[0].preview,
{
  "id": "foerderstart",
  "label": "Förderung und Zubau",
  "town": "Aulendorf",
  "kind": "timeline",
  "title": "Förderstart und ein starker Juli",
  "teaser": "Seit dem 1. Juli 2025 bezuschusst Aulendorf Balkonkraftwerke mit 150 Euro pro Haushalt. Für denselben Monat sind 23 Anlagen erfasst – der höchste Monatswert des Jahres.",
  "period": "Juli 2025 · Rückblick",
  "evidence": "Programmstart durch Stadt bestätigt · Jahressumme stimmt innerhalb Rundung überein · Monats-Exportdatum noch offen",
  "values": [
    {
      "label": "2025-01",
      "value": 7
    },
    {
      "label": "2025-02",
      "value": 7
    },
    {
      "label": "2025-03",
      "value": 7
    },
    {
      "label": "2025-04",
      "value": 10
    },
    {
      "label": "2025-05",
      "value": 10
    },
    {
      "label": "2025-06",
      "value": 12
    },
    {
      "label": "2025-07",
      "value": 23
    },
    {
      "label": "2025-08",
      "value": 18
    },
    {
      "label": "2025-09",
      "value": 9
    },
    {
      "label": "2025-10",
      "value": 6
    },
    {
      "label": "2025-11",
      "value": 9
    },
    {
      "label": "2025-12",
      "value": 7
    }
  ],
  "unit": "Balkonkraftwerke je Inbetriebnahmemonat",
  "highlightedMonths": [
    "2025-07"
  ],
  "chartSummary": "Juli: 23 Anlagen · Förderstart am 1. Juli",
  "comparisonLabel": "Vergleich: Januar–Dezember 2025 in Aulendorf",
  "event": {
    "month": "2025-07",
    "label": "Förderstart · 1. Juli 2025"
  },
  "copy": [
    {
      "heading": "Zwei Entwicklungen zur selben Zeit",
      "text": "Im Juli startete das kommunale Anreizprogramm. Gleichzeitig erreicht die erfasste Zahl der Balkonkraftwerke mit 23 ihren Jahreshöchstwert. Im Juni waren es 12, im August 18."
    },
    {
      "heading": "Was wir daraus sagen können",
      "text": "Förderstart und Monatsmaximum fallen zusammen. Ob die Förderung den Anstieg ausgelöst hat und wie viele dieser Anlagen tatsächlich gefördert wurden, ist mit den Registerdaten nicht belegt."
    },
    {
      "heading": "Der weitere Verlauf gehört dazu",
      "text": "Nach Juli und August fällt die Zahl wieder niedriger aus. Die Grafik zeigt deshalb das ganze Jahr statt nur den Sprung zum Förderstart. Insgesamt sind 125 heute aktive Einheiten mit Inbetriebnahmejahr 2025 erfasst."
    }
  ],
  "social": "Aulendorf fördert Balkonkraftwerke seit dem 1. Juli 2025 mit 150 Euro pro Haushalt. Im selben Monat erreicht die erfasste Zahl mit 23 Anlagen ihren höchsten Wert des Jahres.\n\nIm Juni waren es 12, im August 18. Danach liegen die Monatswerte wieder niedriger.\n\nDas zeitliche Zusammentreffen ist interessant – es beweist noch keine Förderwirkung. Welche Anlagen den Zuschuss erhalten haben, steht nicht im Marktstammdatenregister. Den Jahresverlauf und die Quellen zeigen wir in der vollständigen Story.",
  "widget": "Zum aktuellen Förderprogramm verlinken, zusätzlich kann der bestehende Zubauverlauf dienen. Kein eigenständiges Wirkungs-Widget aus diesem Befund.",
  "widgetCta": "Fördermöglichkeiten ansehen",
  "seo": "Lokaler Mehrwert durch Verknüpfung von Registerverlauf und belegtem Förderstart. Keine Wirkungsbehauptung; eigenständiger Beitrag statt wiederholter Monatszahlen.",
  "beforeRelease": "Gemeinsamen Exportstand dokumentieren. Nicht als Wirkungsnachweis veröffentlichen; keine ungeprüfte Kontrollgruppe ohne Katalogeintrag. Programmstart und Betrag sind an der Stadtquelle geprüft.",
  "sources": [
    {
      "label": "Stadt Aulendorf: neues Programm ab 1. Juli 2025",
      "url": "https://www.aulendorf.de/wirtschaft-energie/foerdermassnahmen"
    }
  ]
},
{
  "id": "wachstum-gegen-trend",
  "label": "Wachstum im Vergleich",
  "town": "Jena",
  "kind": "bars",
  "title": "Mehr Balkonkraftwerke in Jena",
  "teaser": "Für Januar bis Mai 2026 sind 202 Balkonkraftwerke erfasst – im gleichen Zeitraum 2025 waren es 111. Auch bei kürzeren Vergleichszeiträumen liegt Jena über dem Vorjahr.",
  "period": "Januar–Mai 2026",
  "evidence": "Designkandidat · Richtung in drei Zeitfenstern bestätigt · Monatsdaten zuletzt aktualisiert am 2. Sept. 2026, Exportdatum offen",
  "values": [
    {
      "label": "Januar–Mai 2025",
      "value": 111
    },
    {
      "label": "Januar–Mai 2026",
      "value": 202
    }
  ],
  "unit": "Erfasste Balkonkraftwerke nach Inbetriebnahme",
  "comparisonLabel": "Vergleich: Januar–Mai 2026 mit Januar–Mai 2025",
  "copy": [
    {
      "heading": "91 Anlagen mehr erfasst",
      "text": "In Jena liegt die Zahl für die ersten fünf Monate um rund 82 Prozent über dem Vorjahreswert. Im übrigen Thüringen sinkt sie im gleichen Datenbestand von 5.153 auf 4.675. Das ist ein regionaler Kontext, kein Vergleich ausschließlich ähnlich großer Städte."
    },
    {
      "heading": "Nicht nur ein einzelner Monat",
      "text": "Auch Januar bis März (123 statt 59) und Januar bis April (162 statt 81) liegen über dem Vorjahr. Der Anstieg hängt damit nicht allein daran, dass wir bis Mai zählen."
    },
    {
      "heading": "Was die Zahlen abbilden",
      "text": "Gezählt werden heute aktive Registereinheiten nach ihrem Inbetriebnahmedatum. Nachmeldungen und spätere Korrekturen können die Werte verändern. Warum sich Jena anders entwickelt, lässt sich daraus allein nicht erklären."
    }
  ],
  "social": "In Jena sind für Januar bis Mai 2026 insgesamt 202 Balkonkraftwerke erfasst. Im gleichen Zeitraum 2025 waren es 111 – ein Plus von rund 82 Prozent.\n\nAuch in den Vergleichen bis März und bis April liegt Jena über dem Vorjahr. Im übrigen Thüringen sinkt die erfasste Zahl für Januar bis Mai dagegen.\n\nGrundlage: heute aktive Registereinheiten nach Inbetriebnahme, Monatsdaten zuletzt aktualisiert am 2. September 2026. Vor Veröffentlichung wird der Datenstand abgeglichen.",
  "widget": "Bestehenden aktuellen Zubauverlauf verlinken. Die Story hält den zeitgebundenen Vergleich fest.",
  "widgetCta": "Aktuellen Zubau ansehen",
  "seo": "Konkrete lokale Entwicklung als teilbarer Beitrag. Keine Aussage zu Suchvolumen oder garantiertem Ranking.",
  "beforeRelease": "Monatsreihe aus dem gleichen Export wie die Jahreswerte erzeugen und Zahlen erneut prüfen. Regionaler Kontext ist keine kontrollierte Vergleichsgruppe. Der Aktualisierungstag ist kein Exportdatum."
},
  {
    id: "ortsvergleich", label: "Ortsvergleich", town: "Allmannsweiler", kind: "bars",
    title: "Wie stark wächst Solar in Allmannsweiler?",
    teaser: "126 kWp zusätzliche Leistung: Der Pro-Kopf-Vergleich macht den Zubau sichtbar. Wie fair ist die gewählte Vergleichsgruppe?",
    period: "Seit Ende 2025", evidence: "Vergleichskandidat · Bezugsgruppe noch offen",
    values: [{ label: "Allmannsweiler", value: 396.4 }, { label: "Median bundesweit", value: 41.1 }], unit: "Wp Zubau je Einwohner",
    copy: [
      { heading: "Was die Einwohnerzahl verändert", text: "126 kWp zusätzliche Solarleistung entsprechen im gespeicherten Datenstand rund 396 Wp je Einwohner. Damit lässt sich der Zubau verschieden großer Orte auf denselben Nenner bringen. Über die Zahl der beteiligten Haushalte sagt dieser Wert nichts aus." },
      { heading: "Ein fairer Vergleich braucht ähnliche Orte", text: "Der bundesweite Median berücksichtigt sehr unterschiedliche Gemeinden. Für eine belastbare Einordnung wollen wir zusätzlich Orte ähnlicher Größe heranziehen. Dachflächen, Freiflächen und einzelne große Anlagen können das Ergebnis prägen." },
    ],
    social: "In Allmannsweiler sind im betrachteten Datenstand seit Ende 2025 rund 126 kWp Solarleistung hinzugekommen. Je Einwohner sind das etwa 396 Wp. Für die Einordnung schauen wir als Nächstes auf ähnlich große Gemeinden – ein bundesweiter Vergleich allein erklärt die Unterschiede noch nicht.",
    widget: "Ja: aktueller Ortsvergleich mit klarer Vergleichsgruppe. Das gleiche Vergleichsdiagramm kann im Widget neu gerechnet werden; die Story hält ihren Datenstand fest.",
    widgetCta: "Orte im Vergleich ansehen",
    seo: "Erst als fertige Story ausspielen, wenn eine nachvollziehbare Vergleichsgruppe und echte Einordnung vorliegen. Keine 9,6-fach-Schlagzeile allein aus dem bundesweiten Median.",
    beforeRelease: "Die Werte stammen aus dem gespeicherten Kandidaten. Ähnlich große Gemeinden neu vergleichen und Datenstand ergänzen. Der vorläufige Text benennt diese Lücke bewusst; er ist kein fertiger Veröffentlichungstext.",
  },
  {
    id: "rangbewegung", label: "Auf- und Abstieg", town: "Beispielort", kind: "rank",
    title: "Von Platz 5 auf Platz 3",
    teaser: "Eine neue Platzierung im Vergleich der Gemeinden. Welche Kennzahl dahintersteht und was ein Rangwechsel bedeutet.",
    period: "Zwei monatliche Datenstände", evidence: "Layoutbeispiel · keine echten Ortswerte",
    values: [{ label: "Vorher", value: 5 }, { label: "Jetzt", value: 3 }], unit: "Platz",
    copy: [
      { heading: "Die Platzierung ist eine relative Größe", text: "Der Ort steht im Vergleich weiter vorn. Ob sich zugleich die eigene Solarleistung erhöht hat, muss die zugehörige Kennzahl zeigen. Auch Änderungen in anderen Gemeinden oder Registerkorrekturen können einen Rang verschieben." },
      { heading: "Der Vergleich bleibt derselbe", text: "Eine Bewegungsmeldung setzt dieselbe Kennzahl, Vergleichsgruppe und Berechnung voraus. Für einen Abstieg gilt der gleiche Aufbau: vorheriger Platz, neuer Platz und sachliche Einordnung. Keine beschämende Farb- oder Bildsprache." },
    ],
    social: "Textmuster: {Ort} steht bei {Kennzahl} jetzt auf Platz {neu} von {Anzahl} – zuvor war es Platz {alt}. Verglichen werden dieselben Gemeinden in {Gruppe}. Ergänzung nur bei Beleg: Die eigene Kennzahl hat sich von {Wert_alt} auf {Wert_neu} verändert.",
    widget: "Kein zusätzliches Widget: auf den bestehenden aktuellen Rangbereich verweisen. In der Story zwei datierte Rangmarken, keine Balken, die einen größeren Rang fälschlich als besser darstellen.",
    widgetCta: "Aktuelle Platzierung ansehen",
    seo: "Eine kleine Rangänderung ist vor allem ein Feed-Anlass. Nicht jede Bewegung braucht eine indexierbare Einzelseite. Ein Jahresrückblick mit Verlauf und Kennzahlen bietet meist mehr eigenständigen Inhalt.",
    beforeRelease: "Erst ein echter Rangstand gespeichert. Die Werte 5 und 3 sind ausschließlich Layoutbeispiele. Kennzahl, Gruppe und beide Datenstände müssen im echten Template sichtbar sein.",
  },
  {
    id: "flaechenmix", label: "Solarflächen", town: "Breiholz", kind: "donut",
    title: "Wo Breiholz’ Solarleistung steht",
    teaser: "Die Leistung verteilt sich ungleich auf die erfassten Anlagengruppen. Die Größe der einzelnen Anlagen hilft, das Bild einzuordnen.",
    period: "Stand 9. Sept. 2026", evidence: "Vorhandenes Datenbeispiel · Kategorien sprachlich prüfen",
    values: [{ label: "Als Gewerbedach eingeordnet", value: 63 }, { label: "Als privates Dach eingeordnet", value: 37 }], unit: "% der Solarleistung",
    copy: [
      { heading: "Anteil an Leistung ist nicht Anteil an Anlagen", text: "In der größeren Gruppe stecken 36 von insgesamt 150 erfassten Anlagen. Sie erreichen durchschnittlich 52,1 kWp; bei den übrigen Anlagen sind es 9,8 kWp. Weniger, größere Anlagen können deshalb einen hohen Leistungsanteil stellen." },
      { heading: "Was die Gruppen tatsächlich bedeuten", text: "Die Zuordnung ist teilweise aus der Anlagengröße und weiteren Registerangaben abgeleitet. Sie ist kein verlässlicher Nachweis für Gebäudenutzung oder Eigentum. Die Gruppenbezeichnungen müssen diese Einschränkung berücksichtigen." },
    ],
    social: "Viele kleine Anlagen und wenige größere können sehr unterschiedliche Anteile an der Solarleistung haben. In Breiholz umfasst die leistungsstärkere Gruppe 36 von 150 Anlagen. Entscheidend ist deshalb, ob wir Anlagen zählen oder ihre Leistung vergleichen.",
    widget: "Ja, vorrangig als dauerhaft aktuelles Bestandswidget. Als Story bei Erstvorstellung oder einer relevanten Veränderung im Mix. Keine monatliche Wiederholung desselben Donuts.",
    widgetCta: "Aktuellen Anlagenbestand ansehen",
    seo: "Stärkt vor allem die Gemeindeseite als lokale Bestandsinformation. Eine zusätzliche Story-Seite braucht einen konkreten Anlass oder weitere belegte Einordnung.",
    beforeRelease: "Gewerbedach/private Dächer sind teilweise heuristische Kategorien. Text und Labels dürfen daraus keine gesicherte Eigentümer- oder Nutzungsstruktur ableiten. Nullsegmente im Donut nicht künstlich zeichnen.",
  },
];
