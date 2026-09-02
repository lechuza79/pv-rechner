// ─── Bausteine: das Inventar der Oberfläche ──────────────────────────────────
//
// Das Designsystem hat drei Ebenen, und diese Datei ist die mittlere:
//
//   1. GRUNDLAGEN   Farben, Schriftgrößen, Abstände, Ecken — lib/theme.ts.
//   2. BAUSTEINE    Diese Datei. Generische Teile, die jede Seite benutzen
//                   darf: ein Dialog, ein Schalter, ein Auswahlfeld. Sie holen
//                   ihre Maße aus den Grundlagen und bestehen ihrerseits aus
//                   anderen Bausteinen (ein Aufklapp-Abschnitt enthält einen
//                   Schalter, ein Feld enthält ein Zahlenfeld).
//   3. ZUSAMMEN-    Die fachlichen Oberflächen: ein Rechner, eine Gemeindeseite,
//      SETZUNGEN    ein Widget. Für die eingebetteten Widgets führt
//                   lib/widget-registry.ts bereits ein eigenes Register.
//
// WARUM ES DIESE DATEI GIBT: Eine Übersichtsseite allein ändert nichts. Die
// Schriftgrößen-Tokens gab es seit Juli 2026, und der Bestand handgetippter
// Größen wuchs in den sechs Wochen danach trotzdem um 35 % — weil niemand sie
// erzwang. Erst die Gegenprobe hält: `gegenprobe` beschreibt, woran man einen
// handgebauten Nachbau erkennt, und lib/__tests__/bausteine-registry.test.ts
// macht den Lauf rot, wenn einer entsteht.
//
// Das Register ist ABSICHTLICH unvollständig. Die Bausteine werden sukzessive
// entwickelt (Betreiber, 01.09.2026); was noch nicht eingeordnet ist, zählt der
// Test aus dem Ordner und weist es als offen aus, statt es zu verschweigen.
// Eine neue Datei kann sich damit nicht verstecken — sie taucht als „noch nicht
// eingeordnet" auf, bis jemand entscheidet.

/**
 * Wie verbindlich ein Baustein ist.
 *
 *  • "verbindlich" — wer das braucht, nimmt DIESEN. Ein Nachbau ist ein Fehler,
 *    und die Gegenprobe fängt ihn. Nur hier darf `gegenprobe` stehen.
 *  • "im-aufbau"   — existiert und wird benutzt, ist aber noch nicht als
 *    einzige Lösung festgeschrieben. Kein Test, keine Sperre.
 *
 * Der Unterschied ist eine Zusage, kein Reifegrad: „verbindlich“ heißt, dass
 * wir eine zweite Fassung ab jetzt als Fehler behandeln.
 */
export type BausteinStand = "verbindlich" | "im-aufbau";

/** Wozu der Baustein da ist — die Gliederung der Übersichtsseite. */
export type BausteinGruppe =
  | "eingabe" // Etwas auswählen, eingeben, umschalten
  | "struktur" // Rahmen der Seite: Kopf, Fuß, Navigation, Gliederung
  | "rueckmeldung" // Was die Seite zurücksagt: Dialog, Hinweis, Fehler, Ladezustand
  | "widget"; // Alles rund um Charts, Teilen und das erzeugte Bild

/**
 * Woran ein handgebauter Nachbau erkennbar ist.
 *
 * Das Muster beschreibt die BAUWEISE, nicht das Aussehen — dieselbe Systematik
 * wie beim Einheiten-Wächter, der nicht die falsche Einheit verbietet, sondern
 * die Zahl mit angeklebter Einheit.
 */
export interface Gegenprobe {
  /** Quelltext eines regulären Ausdrucks, zeilenweise geprüft. */
  muster: string;
  /** Was ein Treffer bedeutet, in Klartext — steht so in der Fehlermeldung. */
  bedeutet: string;
  /** Dateien, die das Muster tragen dürfen. Jede mit ausgeschriebenem Grund. */
  ausser: { datei: string; grund: string }[];
}

/**
 * Welche Ebene des Designsystems.
 *
 *  • "baustein"        — generisch, jede Seite darf ihn nehmen, kennt kein Fach.
 *                        Er gehört in die Galerie und braucht dort ein Beispiel.
 *  • "zusammensetzung" — kennt ein Fach (Förderung, Anlagenregister, ein
 *                        Rechner) und ist damit nicht wiederverwendbar im
 *                        Sinne des Systems. Er steht im Register, damit man
 *                        sieht, woraus er besteht — aber nicht in der Galerie:
 *                        Ein Förder-Detailfenster ohne Förderprogramm zu zeigen
 *                        wäre eine Attrappe.
 *
 * Die Grenze ist die FACHLICHKEIT, nicht die Größe. Ein Auswahlfeld ist ein
 * Baustein, auch wenn es klein ist; ein Fenster mit dem PV-Rechner darin ist
 * eine Zusammensetzung, auch wenn es wenig Code ist.
 */
export type BausteinEbene = "baustein" | "zusammensetzung";

export interface Baustein {
  /** Pfad ab dem Projektwurzelverzeichnis. */
  datei: string;
  /** Anzeigename — zugleich der Schlüssel in `bestehtAus`. */
  name: string;
  /** Ein Satz: wofür man ihn nimmt. Kein Implementierungsdetail. */
  zweck: string;
  gruppe: BausteinGruppe;
  ebene: BausteinEbene;
  stand: BausteinStand;
  /**
   * Aus welchen anderen Bausteinen er selbst besteht.
   *
   * Hier DEKLARIERT, aber gegen die echten Importe geprüft — in beide
   * Richtungen. Eine Liste, die man von Hand nachziehen muss, wird sonst
   * irgendwann nicht nachgezogen; eine, die niemand liest, hilft niemandem.
   */
  bestehtAus: string[];
  gegenprobe?: Gegenprobe;
  /**
   * Warum es in der Galerie KEIN lebendes Beispiel gibt.
   *
   * Nur für Bausteine, die sich nicht in eine Karte stellen lassen — ein
   * Seitenrahmen, der sich sonst selbst enthielte, oder etwas, das ein
   * Diagramm um sich herum braucht. „Noch nicht gebaut" gehört NICHT hierher:
   * Ein Grund, der jede Lücke deckt, deckt am Ende auch die vermeidbaren.
   */
  keinBeispielWeil?: string;
}

export const BAUSTEINE: Baustein[] = [
  // ─── Eingabe ───────────────────────────────────────────────────────────────
  {
    datei: "components/OptionCard.tsx",
    name: "OptionCard",
    zweck: "Eine Antwortmöglichkeit als Karte, mit Titel und erklärender Unterzeile.",
    gruppe: "eingabe",
    ebene: "baustein",
    stand: "im-aufbau",
    bestehtAus: [],
  },
  {
    datei: "components/TriToggle.tsx",
    name: "TriToggle",
    zweck: "Drei Zustände nebeneinander, von denen genau einer gilt.",
    gruppe: "eingabe",
    ebene: "baustein",
    stand: "im-aufbau",
    bestehtAus: [],
  },
  {
    datei: "components/SelectField.tsx",
    name: "SelectField",
    zweck: "Auswahl aus einer Liste, wenn die Optionen zu viele für Karten sind.",
    gruppe: "eingabe",
    ebene: "baustein",
    stand: "verbindlich",
    bestehtAus: ["Icons"],
    gegenprobe: {
      muster: "<select",
      bedeutet:
        "Hier steht ein nacktes Auswahlfeld. Es sieht in jedem Browser anders aus und trägt weder unseren Pfeil noch unsere Maße — der Unterschied fällt auf, sobald zwei davon nebeneinander stehen.",
      ausser: [
        {
          datei: "app/(site)/admin/komponenten/KomponentenSchau.tsx",
          grund:
            "Die Galerie stellt Baustein und nacktes Feld absichtlich nebeneinander — ohne den Vergleich lässt sich nicht entscheiden, ob der Unterschied gebraucht wird.",
        },
      ],
    },
  },
  {
    datei: "components/PresetNumberInput.tsx",
    name: "PresetNumberInput",
    zweck: "Eine Zahl eingeben, mit den üblichen Werten als Vorschlag daneben.",
    gruppe: "eingabe",
    ebene: "baustein",
    stand: "im-aufbau",
    bestehtAus: [],
  },
  {
    datei: "components/InlineEdit.tsx",
    name: "InlineEdit",
    zweck:
      "Ein Wert im Fließtext, der sich anklicken und überschreiben lässt — die Art, wie im Ergebnis jede Annahme editierbar ist.",
    gruppe: "eingabe",
    ebene: "baustein",
    stand: "verbindlich",
    bestehtAus: [],
  },
  {
    datei: "components/AccordionField.tsx",
    name: "AccordionField",
    zweck: "Eine Frage, die zuklappt, sobald sie beantwortet ist, und ihre Antwort in der Kopfzeile trägt.",
    gruppe: "eingabe",
    ebene: "baustein",
    stand: "im-aufbau",
    bestehtAus: ["Icons"],
  },
  {
    datei: "components/AuswahlSkipper.tsx",
    name: "AuswahlSkipper",
    zweck: "Weiß ich nicht — überspringt eine Frage und sagt, was stattdessen gilt.",
    gruppe: "eingabe",
    ebene: "baustein",
    stand: "im-aufbau",
    bestehtAus: ["SelectField"],
  },
  {
    datei: "components/Switch.tsx",
    name: "Switch",
    zweck: "Ein/Aus für eine Annahme — „rechnet mit“ oder „rechnet nicht mit“.",
    gruppe: "eingabe",
    ebene: "baustein",
    stand: "verbindlich",
    bestehtAus: [],
    gegenprobe: {
      muster: 'role="switch"',
      bedeutet:
        "Hier ist ein Schiebeschalter von Hand gebaut. Ein Schalter, der an zwei Stellen verschieden aussieht oder verschieden reagiert, ist derselbe Fehler wie zwei Formatter für eine Einheit.",
      ausser: [],
    },
  },
  {
    datei: "components/FlowNav.tsx",
    name: "FlowNav",
    zweck:
      "Zurück links, Weiter rechts, Weiter gesperrt bis eine gültige Auswahl da ist — die Schrittführung jedes Frage-Flows.",
    gruppe: "eingabe",
    ebene: "baustein",
    stand: "verbindlich",
    bestehtAus: ["Modal"],
  },
  {
    datei: "components/DachField.tsx",
    name: "DachField",
    zweck: "Die Dach-Frage: Form und Ausrichtung. Steht im Frageweg und noch einmal im Ergebnis.",
    gruppe: "eingabe",
    ebene: "baustein",
    stand: "verbindlich",
    bestehtAus: ["AccordionField", "PresetNumberInput"],
  },
  {
    datei: "components/GebaeudeField.tsx",
    name: "GebaeudeField",
    zweck: "Die Gebäude-Frage: Haustyp, Fläche, Dämmung, Heizung. Ebenfalls an zwei Stellen dieselbe.",
    gruppe: "eingabe",
    ebene: "baustein",
    stand: "verbindlich",
    bestehtAus: ["AccordionField", "PresetNumberInput"],
  },
  {
    datei: "components/StandortField.tsx",
    name: "StandortField",
    zweck: "Die Postleitzahl — der einzige Ort, an dem nach dem Standort gefragt wird.",
    gruppe: "eingabe",
    ebene: "baustein",
    stand: "verbindlich",
    bestehtAus: ["Icons"],
  },

  // ─── Rückmeldung ───────────────────────────────────────────────────────────
  {
    datei: "components/Modal.tsx",
    name: "Modal",
    zweck:
      "Der Dialog: am Rechner mittig, auf schmalen Schirmen von unten einfahrend, mit Fokus-Falle und Escape.",
    gruppe: "rueckmeldung",
    ebene: "baustein",
    stand: "verbindlich",
    bestehtAus: [],
    gegenprobe: {
      muster: 'role="dialog"',
      bedeutet:
        "Hier entsteht ein zweiter Dialog von Hand. Es gab schon einmal drei, und sie unterschieden sich in Fokus-Rückgabe, Tastatur-Falle, Scroll-Sperre und Verhalten auf dem Handy — Unterschiede, die man erst bemerkt, wenn jemand mit der Tastatur navigiert.",
      ausser: [],
    },
  },
  {
    datei: "components/Toast.tsx",
    name: "Toast",
    zweck: "Eine kurze Meldung am Rand — entweder eine Aufforderung oder eine reine Auskunft.",
    gruppe: "rueckmeldung",
    ebene: "baustein",
    stand: "verbindlich",
    bestehtAus: [],
  },
  {
    datei: "components/InfoTooltip.tsx",
    name: "InfoTooltip",
    zweck:
      "Die Erklärung hinter dem Fragezeichen. Trägt sich selbst in den Fuß des erzeugten Bildes ein, weil ein Bild kein Überfahren kennt.",
    gruppe: "rueckmeldung",
    ebene: "baustein",
    stand: "verbindlich",
    bestehtAus: ["Icons", "export-notes"],
  },
  {
    datei: "components/ErrorBoundary.tsx",
    name: "ErrorBoundary",
    zweck: "Fängt den Absturz eines Bauteils ab, damit die übrige Seite stehen bleibt.",
    gruppe: "rueckmeldung",
    ebene: "baustein",
    stand: "im-aufbau",
    bestehtAus: [],
  },
  {
    datei: "components/LoadingDots.tsx",
    name: "LoadingDots",
    zweck: "Der Ladezustand, wo eine Zahl noch unterwegs ist.",
    gruppe: "rueckmeldung",
    ebene: "baustein",
    stand: "im-aufbau",
    bestehtAus: [],
  },

  // ─── Struktur ──────────────────────────────────────────────────────────────
  {
    datei: "components/ResultSection.tsx",
    name: "ResultSection",
    zweck:
      "Der aufklappbare Abschnitt im Ergebnis. Zugeklappt trägt seine Kopfzeile den gewählten Zustand, nicht das Wort Details.",
    gruppe: "struktur",
    ebene: "baustein",
    stand: "verbindlich",
    bestehtAus: ["Icons", "Switch"],
  },
  {
    datei: "components/StickyCta.tsx",
    name: "StickyCta",
    zweck: "Die klebende Aktionsleiste am unteren Rand — erscheint beim Scrollen, verschwindet am Seitenende.",
    gruppe: "struktur",
    ebene: "baustein",
    stand: "verbindlich",
    bestehtAus: [],
    keinBeispielWeil:
      "Klebt am unteren Fensterrand. In einer Karte gezeigt läge sie über der ganzen Seite statt in ihr.",
  },
  {
    datei: "components/Header.tsx",
    name: "Header",
    zweck: "Die Kopfzeile mit Navigation, Sonnenanzeige und Anmeldung.",
    gruppe: "struktur",
    ebene: "baustein",
    stand: "verbindlich",
    bestehtAus: ["Icons", "Logo", "ThemeController"],
    keinBeispielWeil:
      "Der Seitenrahmen selbst — auf dieser Seite steht er bereits oben. Ein zweiter darin wäre kein Beispiel, sondern ein Fehler.",
  },
  {
    datei: "components/Footer.tsx",
    name: "Footer",
    zweck: "Die Fußzeile — neben dem Themen-Einstieg der einzige Ort, an dem alle Bereiche verlinkt sind.",
    gruppe: "struktur",
    ebene: "baustein",
    stand: "verbindlich",
    bestehtAus: ["TrustBar"],
    keinBeispielWeil:
      "Wie die Kopfzeile ein Seitenrahmen; er steht auf jeder Seite genau einmal und enthielte sich hier selbst.",
  },
  {
    datei: "components/TrustBar.tsx",
    name: "TrustBar",
    zweck: "Die vier Zusagen über der Fußzeile. Jede ist eine Werbeaussage und trägt ihren Beleg.",
    gruppe: "struktur",
    ebene: "baustein",
    stand: "verbindlich",
    bestehtAus: ["Icons", "Modal"],
    keinBeispielWeil:
      "Sitzt fest über der Fußzeile und trägt vier Werbeaussagen mit Belegen — ein Beispiel daneben ließe offen, welche der beiden Fassungen gilt.",
  },
  {
    datei: "components/Breadcrumb.tsx",
    name: "Breadcrumb",
    zweck: "Die Krümelspur — nennt das Thema als Elternteil, nie eine Hierarchie, die die Adresse nicht hat.",
    gruppe: "struktur",
    ebene: "baustein",
    stand: "im-aufbau",
    bestehtAus: [],
  },
  {
    datei: "components/BackLink.tsx",
    name: "BackLink",
    zweck: "Ein Weg zurück eine Ebene höher.",
    gruppe: "struktur",
    ebene: "baustein",
    stand: "im-aufbau",
    bestehtAus: [],
  },
  {
    datei: "components/RelatedLinks.tsx",
    name: "RelatedLinks",
    zweck: "Die weiterführenden Verweise am Ende einer Leseseite.",
    gruppe: "struktur",
    ebene: "baustein",
    stand: "im-aufbau",
    bestehtAus: ["Icons"],
  },
  {
    datei: "components/InternalShell.tsx",
    name: "InternalShell",
    zweck: "Rahmen und Navigation der internen Bereiche.",
    gruppe: "struktur",
    ebene: "baustein",
    stand: "im-aufbau",
    bestehtAus: [],
    keinBeispielWeil:
      "Rahmen und Navigation der internen Bereiche — er umgibt diese Seite gerade.",
  },
  {
    datei: "components/Icons.tsx",
    name: "Icons",
    zweck: "Alle Symbole als SVG. In der Oberfläche steht nie ein Zeichen aus dem Zeichensatz als Symbol.",
    gruppe: "struktur",
    ebene: "baustein",
    stand: "verbindlich",
    bestehtAus: [],
  },
  {
    datei: "components/Logo.tsx",
    name: "Logo",
    zweck: "Die Wortmarke — als SVG, damit sie auf jeder Tagesstufe die Textfarbe erbt.",
    gruppe: "struktur",
    ebene: "baustein",
    stand: "verbindlich",
    bestehtAus: [],
  },
  {
    datei: "components/SortPfeil.tsx",
    name: "SortPfeil",
    zweck: "Die Sortierrichtung an einer Tabellen-Spaltenüberschrift.",
    gruppe: "struktur",
    ebene: "baustein",
    stand: "im-aufbau",
    bestehtAus: ["Icons"],
  },

  // ─── Widget, Teilen, Bild ──────────────────────────────────────────────────
  {
    datei: "components/ChartActionBar.tsx",
    name: "ChartActionBar",
    zweck:
      "Teilen, Herunterladen, Zitieren, Einbetten — als Icon-Reihe bei breiten Karten, als Menü bei kleinen.",
    gruppe: "widget",
    ebene: "baustein",
    stand: "verbindlich",
    bestehtAus: ["Icons"],
  },
  {
    datei: "components/ChartExportBar.tsx",
    name: "ChartExportBar",
    zweck: "Die Aktionsleiste über einem Chart, das auf einer eigenen Seite steht.",
    gruppe: "widget",
    ebene: "baustein",
    stand: "im-aufbau",
    bestehtAus: ["Icons"],
  },
  {
    datei: "components/PoweredBy.tsx",
    name: "PoweredBy",
    zweck: "Die Markenzeile unter einem eingebetteten Widget. Nie inline nachgebaut.",
    gruppe: "widget",
    ebene: "baustein",
    stand: "verbindlich",
    bestehtAus: [],
  },
  {
    datei: "components/DataSourceList.tsx",
    name: "DataSourceList",
    zweck:
      "Die Quellenangabe — Lizenzpflicht, deshalb sichtbar auf der Seite UND fest im erzeugten Bild, nie handgetippt.",
    gruppe: "widget",
    ebene: "baustein",
    stand: "verbindlich",
    bestehtAus: ["PoweredBy"],
  },
  {
    datei: "components/WidgetExport.tsx",
    name: "WidgetExport",
    zweck:
      "Was ins Bild gehört und was nicht: Bedienelemente raus, Legende, Skala, gewählter Zustand und Quelle hinein.",
    gruppe: "widget",
    ebene: "baustein",
    stand: "verbindlich",
    bestehtAus: ["ChartActionBar", "CiteModal", "PoweredBy", "export-notes"],
    keinBeispielWeil:
      "Steuert, was in ein erzeugtes Bild kommt und was nicht. Sichtbar wird das erst im Bild, nicht auf dem Bildschirm.",
  },
  {
    datei: "components/CiteModal.tsx",
    name: "CiteModal",
    zweck: "Die Zitierhilfe zu einem Chart.",
    gruppe: "widget",
    ebene: "baustein",
    stand: "im-aufbau",
    bestehtAus: ["Modal"],
  },
  {
    datei: "components/AutoHeightIframe.tsx",
    name: "AutoHeightIframe",
    zweck:
      "Ein eingebettetes Widget auf eigener Seite. Reicht Farbschema, Seitenpfad und Linkziel hinein — ein iframe erbt davon nichts.",
    gruppe: "widget",
    ebene: "baustein",
    stand: "verbindlich",
    bestehtAus: [],
    keinBeispielWeil:
      "Braucht ein eingebettetes Widget um sich herum; für sich allein wäre nur ein leerer Rahmen zu sehen.",
  },
  {
    datei: "components/StandNote.tsx",
    name: "StandNote",
    zweck: "Die Stand-Zeile unter einem Rechner. Nur in Server-Bauteilen — sie zieht sonst sieben Konfigurationen ins Browser-Paket.",
    gruppe: "widget",
    ebene: "baustein",
    stand: "verbindlich",
    bestehtAus: ["StandNoteView"],
    keinBeispielWeil:
      "Läuft ausschließlich auf dem Server — sie zieht sieben Konfigurationen nach sich, die im Browser nichts zu suchen haben. Die Ansicht daneben zeigt dieselbe Zeile.",
  },
  {
    datei: "components/StandNoteView.tsx",
    name: "StandNoteView",
    zweck: "Dieselbe Zeile, aber ohne Konfigurationen im Gepäck — für den Einsatz innerhalb eines Rechners.",
    gruppe: "widget",
    ebene: "baustein",
    stand: "verbindlich",
    bestehtAus: [],
  },
  // ─── Weitere Bausteine ─────────────────────────────────────────────────────
  {
    datei: "components/GlossaryTerm.tsx",
    name: "GlossaryTerm",
    zweck:
      "Ein Fachwort im Fließtext, das seine Erklärung beim Überfahren oder Antippen zeigt.",
    gruppe: "rueckmeldung",
    ebene: "baustein",
    stand: "im-aufbau",
    bestehtAus: [],
  },
  {
    datei: "components/Faq.tsx",
    name: "Faq",
    zweck:
      "Fragen und Antworten als Aufklapp-Liste — sichtbar und zugleich als strukturierte Angabe für Suchmaschinen, beide aus einer Quelle.",
    gruppe: "struktur",
    ebene: "baustein",
    stand: "im-aufbau",
    bestehtAus: ["Icons"],
  },
  {
    datei: "components/ProConLists.tsx",
    name: "ProConLists",
    zweck:
      "Zwei Listen nebeneinander: wann es sich lohnt und wo es eng wird. Bewusst ohne Farbe — Haken und Kreuz tragen die Aussage.",
    gruppe: "struktur",
    ebene: "baustein",
    stand: "im-aufbau",
    bestehtAus: ["Icons"],
  },
  {
    datei: "components/ArticleMeta.tsx",
    name: "ArticleMeta",
    zweck:
      "Die Aktualisierungszeile eines Ratgebers samt maschinenlesbarem Datum — ein Stichtag, kein mitlaufendes Heute.",
    gruppe: "struktur",
    ebene: "baustein",
    stand: "im-aufbau",
    bestehtAus: [],
  },
  {
    datei: "components/ContactPerson.tsx",
    name: "ContactPerson",
    zweck:
      "Hier antwortet ein Mensch: Porträt und Zusage, an jeder Kontaktstelle in derselben Form.",
    gruppe: "struktur",
    ebene: "baustein",
    stand: "im-aufbau",
    bestehtAus: [],
  },
  {
    datei: "components/ObfuscatedEmail.tsx",
    name: "ObfuscatedEmail",
    zweck:
      "Eine Mailadresse, die im ausgelieferten Text nicht als Adresse dasteht und erst im Browser zusammengesetzt wird.",
    gruppe: "struktur",
    ebene: "baustein",
    stand: "im-aufbau",
    bestehtAus: [],
  },
  {
    datei: "components/ScenarioTabs.tsx",
    name: "ScenarioTabs",
    zweck:
      "Der Umschalter zwischen pessimistischer, realistischer und optimistischer Annahme, jeder mit seiner Begründung.",
    gruppe: "eingabe",
    ebene: "baustein",
    stand: "im-aufbau",
    bestehtAus: [],
  },
  {
    datei: "components/SunControl.tsx",
    name: "SunControl",
    zweck:
      "Das eine Bedienelement der Kopfzeile: wie viel Sonnenstrom gerade entsteht, wofür er gemessen wird und wie hell die Seite dadurch ist.",
    gruppe: "struktur",
    ebene: "baustein",
    stand: "im-aufbau",
    bestehtAus: ["Icons"],
    keinBeispielWeil:
      "Zeigt die tatsächliche Sonneneinstrahlung dieses Augenblicks. Mit erfundenen Werten stünde hier eine Zahl, die nichts misst — genau die Sorte Angabe, gegen die dieses Projekt gebaut ist.",
  },
  {
    datei: "components/ThemeController.tsx",
    name: "ThemeController",
    zweck:
      "Entscheidet, wie hell die Seite ist — von der echten Sonneneinstrahlung geführt, vom Besucher übersteuerbar.",
    gruppe: "struktur",
    ebene: "baustein",
    stand: "im-aufbau",
    bestehtAus: ["SunControl"],
    keinBeispielWeil:
      "Steuert die Helligkeit der ganzen Seite. In einer Karte gezeigt würde er die Galerie selbst umschalten.",
  },
  {
    datei: "components/WidgetAutoHeight.tsx",
    name: "WidgetAutoHeight",
    zweck:
      "Meldet die echte Höhe eines eingebetteten Widgets an die Seite, die es einbettet.",
    gruppe: "widget",
    ebene: "baustein",
    stand: "im-aufbau",
    bestehtAus: [],
    keinBeispielWeil:
      "Meldet eine Höhe an die einbettende Seite und zeigt selbst nichts an — sichtbar wird er nur im Rahmen um ihn herum.",
  },
  {
    datei: "components/WebAnalytics.tsx",
    name: "WebAnalytics",
    zweck:
      "Die Reichweitenmessung — ohne den Abfrageteil der Adresse, damit keine Eingabe des Besuchers mitgeht.",
    gruppe: "struktur",
    ebene: "baustein",
    stand: "im-aufbau",
    bestehtAus: [],
    keinBeispielWeil:
      "Zählt Aufrufe und stellt nichts dar. Ein Beispiel davon wäre eine leere Fläche mit einer Nebenwirkung.",
  },
  {
    datei: "components/HerkunftsMelder.tsx",
    name: "HerkunftsMelder",
    zweck:
      "Meldet serverseitig, ob ein Aufruf aus einem Anschreiben kam — ohne den Besucher wiederzuerkennen.",
    gruppe: "struktur",
    ebene: "baustein",
    stand: "im-aufbau",
    bestehtAus: [],
    keinBeispielWeil:
      "Meldet einmal beim Laden und stellt nichts dar; in der Galerie gäbe es nichts zu sehen und nichts zu bedienen.",
  },
  {
    datei: "components/export-notes.tsx",
    name: "export-notes",
    zweck:
      "Die Schicht, über die sich Hilfetexte selbst in den Fuß des erzeugten Bildes eintragen, statt dass jemand daran denken muss.",
    gruppe: "widget",
    ebene: "baustein",
    stand: "im-aufbau",
    bestehtAus: [],
    keinBeispielWeil:
      "Eine Sammelstelle ohne eigene Darstellung — sichtbar wird sie erst im Fuß eines erzeugten Bildes.",
  },

  // ─── Zusammensetzungen: kennen ein Fach, gehören nicht in die Galerie ──────
  {
    datei: "components/ContactForm.tsx",
    name: "ContactForm",
    zweck:
      "Das Kontaktformular mit Thema, Nachricht und den Schranken gegen Maschinen.",
    gruppe: "rueckmeldung",
    ebene: "zusammensetzung",
    stand: "im-aufbau",
    bestehtAus: ["Icons", "Modal", "SelectField"],
  },
  {
    datei: "components/KontaktTeaser.tsx",
    name: "KontaktTeaser",
    zweck:
      "Der Einstieg in den Kontakt: ein Satz, ein Gesicht und ein Link, der das Formular auf derselben Seite öffnet.",
    gruppe: "struktur",
    ebene: "zusammensetzung",
    stand: "im-aufbau",
    bestehtAus: ["ContactForm", "ContactPerson", "Icons", "Modal"],
  },
  {
    datei: "components/PvRechnerModal.tsx",
    name: "PvRechnerModal",
    zweck:
      "Der vollständige Photovoltaik-Rechner in einem Fenster, für Seiten, die zum Rechnen einladen, ohne dass jemand sie verlässt.",
    gruppe: "rueckmeldung",
    ebene: "zusammensetzung",
    stand: "im-aufbau",
    bestehtAus: ["Modal"],
  },
  {
    datei: "components/KlimaDetailModal.tsx",
    name: "KlimaDetailModal",
    zweck:
      "Die Klimaanlage im Detail: Gerätetyp, Raum und Nutzung, gerechnet mit den Kühlgradstunden des Standorts.",
    gruppe: "rueckmeldung",
    ebene: "zusammensetzung",
    stand: "im-aufbau",
    bestehtAus: ["AirconDetailInputs", "Icons", "Modal"],
  },
  {
    datei: "components/EnergyFlowModal.tsx",
    name: "EnergyFlowModal",
    zweck:
      "Erklärt Eigenverbrauch und Autarkie am eigenen Fall — zwei Balken, der Jahresverlauf und Beispieltage.",
    gruppe: "rueckmeldung",
    ebene: "zusammensetzung",
    stand: "im-aufbau",
    bestehtAus: ["DayProfileChart", "Modal"],
  },
  {
    datei: "components/AirconDetailInputs.tsx",
    name: "AirconDetailInputs",
    zweck:
      "Die Detailfragen zur Klimaanlage, aus derselben Quelle wie der Klimaanlagen-Rechner.",
    gruppe: "eingabe",
    ebene: "zusammensetzung",
    stand: "im-aufbau",
    bestehtAus: ["InfoTooltip", "InlineEdit", "OptionCard"],
  },
  {
    datei: "components/DayProfileChart.tsx",
    name: "DayProfileChart",
    zweck:
      "Der Tagesverlauf: die Erzeugungskurve und darunter, woher der Verbrauch jeder Stunde gedeckt wird.",
    gruppe: "widget",
    ebene: "zusammensetzung",
    stand: "im-aufbau",
    bestehtAus: [],
  },
  {
    datei: "components/FoerderCheckStarter.tsx",
    name: "FoerderCheckStarter",
    zweck:
      "Der Einstieg in den Förder-Check aus der Förderkarte heraus.",
    gruppe: "eingabe",
    ebene: "zusammensetzung",
    stand: "im-aufbau",
    bestehtAus: ["FoerderFlow", "Icons", "Modal"],
  },
  {
    datei: "components/FoerderFlow.tsx",
    name: "FoerderFlow",
    zweck:
      "Bekomme ich das überhaupt, und was muss ich wann tun — die Schritte kommen aus den erfassten Bedingungen des Programms.",
    gruppe: "eingabe",
    ebene: "zusammensetzung",
    stand: "im-aufbau",
    bestehtAus: ["FlowNav", "OptionCard"],
  },
  {
    datei: "components/FundingHistory.tsx",
    name: "FundingHistory",
    zweck:
      "Was sich an einem Förderprogramm geändert hat, seit wir es beobachten — und ausdrücklich nur das.",
    gruppe: "struktur",
    ebene: "zusammensetzung",
    stand: "im-aufbau",
    bestehtAus: ["Icons"],
  },
  {
    datei: "components/FundingProgramParts.tsx",
    name: "FundingProgramParts",
    zweck:
      "Die Bausteine eines Förderprogramms — Status, Sätze, Bedingungen — an einer Stelle für alle vier Oberflächen, die sie zeigen.",
    gruppe: "struktur",
    ebene: "zusammensetzung",
    stand: "im-aufbau",
    bestehtAus: ["InfoTooltip"],
  },
  {
    datei: "components/FundingTechnikTabs.tsx",
    name: "FundingTechnikTabs",
    zweck:
      "Filtert die Bedingungen eines Programms nach Technik, weil eine Bedingung am falschen Ort eine falsche Auskunft ist.",
    gruppe: "eingabe",
    ebene: "zusammensetzung",
    stand: "im-aufbau",
    bestehtAus: ["FundingProgramParts"],
  },
  {
    datei: "components/ResultFunding.tsx",
    name: "ResultFunding",
    zweck:
      "Die Förderkarte im Ergebnis: was es am Ort gibt, was davon zählt und was das Detailfenster dazu sagt.",
    gruppe: "rueckmeldung",
    ebene: "zusammensetzung",
    stand: "im-aufbau",
    bestehtAus: ["FundingProgramParts", "Icons", "Modal"],
  },
  {
    datei: "components/KfwFoerderpraxis.tsx",
    name: "KfwFoerderpraxis",
    zweck:
      "Wer die Heizungsförderung wirklich bekommen hat — Zahlen des Förderreports für den eigenen Landkreis.",
    gruppe: "struktur",
    ebene: "zusammensetzung",
    stand: "im-aufbau",
    bestehtAus: [],
  },
  {
    datei: "components/MastrHeroSection.tsx",
    name: "MastrHeroSection",
    zweck:
      "Der Kopfbereich des Anlagenregisters: Karte, Live-Ring und die Kennzahlen einer Region.",
    gruppe: "widget",
    ebene: "zusammensetzung",
    stand: "im-aufbau",
    bestehtAus: ["LoadingDots", "MastrLiveRadial", "MastrMap", "PoweredBy"],
  },
  {
    datei: "components/MastrMap.tsx",
    name: "MastrMap",
    zweck:
      "Die Deutschlandkarte des Anlagenregisters, die sich von Ländern über Kreise bis in die Gemeinden hineinzoomt.",
    gruppe: "widget",
    ebene: "zusammensetzung",
    stand: "im-aufbau",
    bestehtAus: [],
  },
  {
    datei: "components/MastrLiveRadial.tsx",
    name: "MastrLiveRadial",
    zweck:
      "Der Ring mit der aktuellen Auslastung — Schriftgrößen dort sind mit Radien und Strichstärken gepaart.",
    gruppe: "widget",
    ebene: "zusammensetzung",
    stand: "im-aufbau",
    bestehtAus: ["InfoTooltip"],
  },
  {
    datei: "components/RegionAnlagentypWidget.tsx",
    name: "RegionAnlagentypWidget",
    zweck:
      "Installierte Solarleistung nach Anlagentyp je Bundesland, aus echten Registerdaten statt aus einem Modell.",
    gruppe: "widget",
    ebene: "zusammensetzung",
    stand: "im-aufbau",
    bestehtAus: [],
  },
  {
    datei: "components/RegionSolarLive.tsx",
    name: "RegionSolarLive",
    zweck:
      "Die Landesfassung des Solarleistungs-Widgets, aus dem heutigen Bestand hochgerechnet.",
    gruppe: "widget",
    ebene: "zusammensetzung",
    stand: "im-aufbau",
    bestehtAus: ["MastrLiveRadial"],
  },
  {
    datei: "components/ErzeugungWidget.tsx",
    name: "ErzeugungWidget",
    zweck:
      "Die aktuelle Erzeugung als eingebettbares Widget, mit Identität aus dem Widget-Register.",
    gruppe: "widget",
    ebene: "zusammensetzung",
    stand: "im-aufbau",
    bestehtAus: ["MastrLiveRadial", "WidgetExport"],
  },
  {
    datei: "components/SimulationPanel.tsx",
    name: "SimulationPanel",
    zweck:
      "Die Stundensimulation eines Tages mit Erzeugung, Verbrauch und Speicher.",
    gruppe: "widget",
    ebene: "zusammensetzung",
    stand: "im-aufbau",
    bestehtAus: ["ChartExportBar", "Icons", "PoweredBy", "WidgetExport"],
  },
  {
    datei: "components/SolarTrendCard.tsx",
    name: "SolarTrendCard",
    zweck:
      "Ein Monat gegen den Vorjahresmonat, zerlegt in Zubau und Wetter — blätterbar.",
    gruppe: "widget",
    ebene: "zusammensetzung",
    stand: "im-aufbau",
    bestehtAus: ["Icons"],
  },
  {
    datei: "components/SolarTrendSection.tsx",
    name: "SolarTrendSection",
    zweck:
      "Der Solar-Trend als Ganzes: die blätterbare Karte und daneben die crawlbare Tabelle der letzten zwölf Monate.",
    gruppe: "widget",
    ebene: "zusammensetzung",
    stand: "im-aufbau",
    bestehtAus: ["PoweredBy", "SolarTrendCard"],
  },
  {
    datei: "components/ScenarioCards.tsx",
    name: "ScenarioCards",
    zweck:
      "Drei greifbare Fälle als Einstieg — entgangene Photovoltaik, Wärmepumpen-Ersparnis, Balkonkraftwerk.",
    gruppe: "struktur",
    ebene: "zusammensetzung",
    stand: "im-aufbau",
    bestehtAus: ["Icons"],
  },

];

/**
 * Geteilte Bauteile, die noch keinen Eintrag haben.
 *
 * Hier DEKLARIERT und nicht zur Laufzeit aus dem Ordner gezählt: Auf der
 * Produktion liegt der Quellordner gar nicht mehr vor — eine Seite, die ihn
 * dort liest, stürzt ab, und zwar nur dort. Gegen die Wirklichkeit gehalten
 * wird die Liste im Test, in BEIDE Richtungen: Ein neues Bauteil, das hier
 * fehlt, macht ihn rot; ein eingeordnetes, das hier stehen bleibt, ebenso.
 *
 * Die Liste soll schrumpfen. Sie ist der Arbeitsvorrat, nicht ein Mangel —
 * die Bausteine werden sukzessive entwickelt (Betreiber, 01.09.2026).
 */
export const NOCH_NICHT_EINGEORDNET: string[] = [];

/** Nachschlagen über den Anzeigenamen. */
export function baustein(name: string): Baustein | undefined {
  return BAUSTEINE.find((b) => b.name === name);
}

/**
 * Wer benutzt diesen Baustein? Die Gegenrichtung zu `bestehtAus` — für die
 * Frage „was geht kaputt, wenn ich ihn ändere“.
 */
export function verwendetVon(name: string): Baustein[] {
  return BAUSTEINE.filter((b) => b.bestehtAus.includes(name));
}

/** Die Gliederung der Übersichtsseite, in dieser Reihenfolge. */
export const GRUPPEN: { schluessel: BausteinGruppe; titel: string; text: string }[] = [
  {
    schluessel: "eingabe",
    titel: "Eingabe",
    text: "Etwas auswählen, eingeben oder umschalten.",
  },
  {
    schluessel: "rueckmeldung",
    titel: "Rückmeldung",
    text: "Was die Seite zurücksagt: Dialog, Hinweis, Fehler, Ladezustand.",
  },
  {
    schluessel: "struktur",
    titel: "Struktur",
    text: "Der Rahmen: Kopf, Fuß, Gliederung, Symbole.",
  },
  {
    schluessel: "widget",
    titel: "Widget, Teilen, Bild",
    text: "Alles rund um Charts, Quellenangabe und das erzeugte Bild.",
  },
];
