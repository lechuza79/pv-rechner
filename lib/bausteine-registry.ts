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

export interface Baustein {
  /** Pfad ab dem Projektwurzelverzeichnis. */
  datei: string;
  /** Anzeigename — zugleich der Schlüssel in `bestehtAus`. */
  name: string;
  /** Ein Satz: wofür man ihn nimmt. Kein Implementierungsdetail. */
  zweck: string;
  gruppe: BausteinGruppe;
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
    stand: "im-aufbau",
    bestehtAus: [],
  },
  {
    datei: "components/TriToggle.tsx",
    name: "TriToggle",
    zweck: "Drei Zustände nebeneinander, von denen genau einer gilt.",
    gruppe: "eingabe",
    stand: "im-aufbau",
    bestehtAus: [],
  },
  {
    datei: "components/SelectField.tsx",
    name: "SelectField",
    zweck: "Auswahl aus einer Liste, wenn die Optionen zu viele für Karten sind.",
    gruppe: "eingabe",
    stand: "verbindlich",
    bestehtAus: ["Icons"],
    gegenprobe: {
      muster: "<select",
      bedeutet:
        "Hier steht ein nacktes Auswahlfeld. Es sieht in jedem Browser anders aus und trägt weder unseren Pfeil noch unsere Maße — der Unterschied fällt auf, sobald zwei davon nebeneinander stehen.",
      ausser: [
        {
          datei: "app/(site)/waermepumpe-rechner/waermepumpe.tsx",
          grund:
            "Fünf gewachsene Felder auf einer öffentlichen Oberfläche. Die Umstellung ist sichtbar und braucht die Abnahme des Betreibers — sie steht aus, ist aber vorgesehen.",
        },
        {
          datei: "components/ContactForm.tsx",
          grund: "Themenwahl im Kontaktformular, ebenfalls sichtbar und noch nicht abgenommen.",
        },
        {
          datei: "app/(site)/admin/versorger/client.tsx",
          grund: "Interne Tabellenfilter ohne Publikum — sie ziehen mit, wenn diese Ansicht ohnehin angefasst wird.",
        },
        {
          datei: "app/(site)/admin/fachbetriebe/client.tsx",
          grund: "Interner Tabellenfilter, wie bei den Versorgern.",
        },
        {
          datei: "app/(site)/admin/awards/client.tsx",
          grund: "Interne Auswahl ohne Publikum, wie bei den Versorgern.",
        },
        {
          datei: "app/(site)/admin/awards/anschreiben/client.tsx",
          grund: "Interne Auswahl ohne Publikum, wie bei den Versorgern.",
        },
        {
          datei: "app/(site)/admin/kommunen/client.tsx",
          grund: "Wird gerade von einer anderen Sitzung umgebaut; Typografie und Bausteine folgen danach.",
        },
      ],
    },
  },
  {
    datei: "components/PresetNumberInput.tsx",
    name: "PresetNumberInput",
    zweck: "Eine Zahl eingeben, mit den üblichen Werten als Vorschlag daneben.",
    gruppe: "eingabe",
    stand: "im-aufbau",
    bestehtAus: [],
  },
  {
    datei: "components/InlineEdit.tsx",
    name: "InlineEdit",
    zweck:
      "Ein Wert im Fließtext, der sich anklicken und überschreiben lässt — die Art, wie im Ergebnis jede Annahme editierbar ist.",
    gruppe: "eingabe",
    stand: "verbindlich",
    bestehtAus: [],
  },
  {
    datei: "components/AccordionField.tsx",
    name: "AccordionField",
    zweck: "Eine Frage, die zuklappt, sobald sie beantwortet ist, und ihre Antwort in der Kopfzeile trägt.",
    gruppe: "eingabe",
    stand: "im-aufbau",
    bestehtAus: ["Icons"],
  },
  {
    datei: "components/AuswahlSkipper.tsx",
    name: "AuswahlSkipper",
    zweck: "Weiß ich nicht — überspringt eine Frage und sagt, was stattdessen gilt.",
    gruppe: "eingabe",
    stand: "im-aufbau",
    bestehtAus: ["SelectField"],
  },
  {
    datei: "components/Switch.tsx",
    name: "Switch",
    zweck: "Ein/Aus für eine Annahme — „rechnet mit“ oder „rechnet nicht mit“.",
    gruppe: "eingabe",
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
    stand: "verbindlich",
    bestehtAus: ["Modal"],
  },
  {
    datei: "components/DachField.tsx",
    name: "DachField",
    zweck: "Die Dach-Frage: Form und Ausrichtung. Steht im Frageweg und noch einmal im Ergebnis.",
    gruppe: "eingabe",
    stand: "verbindlich",
    bestehtAus: ["AccordionField", "PresetNumberInput"],
  },
  {
    datei: "components/GebaeudeField.tsx",
    name: "GebaeudeField",
    zweck: "Die Gebäude-Frage: Haustyp, Fläche, Dämmung, Heizung. Ebenfalls an zwei Stellen dieselbe.",
    gruppe: "eingabe",
    stand: "verbindlich",
    bestehtAus: ["AccordionField", "PresetNumberInput"],
  },
  {
    datei: "components/StandortField.tsx",
    name: "StandortField",
    zweck: "Die Postleitzahl — der einzige Ort, an dem nach dem Standort gefragt wird.",
    gruppe: "eingabe",
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
    stand: "verbindlich",
    bestehtAus: [],
  },
  {
    datei: "components/InfoTooltip.tsx",
    name: "InfoTooltip",
    zweck:
      "Die Erklärung hinter dem Fragezeichen. Trägt sich selbst in den Fuß des erzeugten Bildes ein, weil ein Bild kein Überfahren kennt.",
    gruppe: "rueckmeldung",
    stand: "verbindlich",
    bestehtAus: ["Icons"],
  },
  {
    datei: "components/ErrorBoundary.tsx",
    name: "ErrorBoundary",
    zweck: "Fängt den Absturz eines Bauteils ab, damit die übrige Seite stehen bleibt.",
    gruppe: "rueckmeldung",
    stand: "im-aufbau",
    bestehtAus: [],
  },
  {
    datei: "components/LoadingDots.tsx",
    name: "LoadingDots",
    zweck: "Der Ladezustand, wo eine Zahl noch unterwegs ist.",
    gruppe: "rueckmeldung",
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
    stand: "verbindlich",
    bestehtAus: ["Icons", "Switch"],
  },
  {
    datei: "components/StickyCta.tsx",
    name: "StickyCta",
    zweck: "Die klebende Aktionsleiste am unteren Rand — erscheint beim Scrollen, verschwindet am Seitenende.",
    gruppe: "struktur",
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
    stand: "verbindlich",
    bestehtAus: ["Icons", "Logo"],
    keinBeispielWeil:
      "Der Seitenrahmen selbst — auf dieser Seite steht er bereits oben. Ein zweiter darin wäre kein Beispiel, sondern ein Fehler.",
  },
  {
    datei: "components/Footer.tsx",
    name: "Footer",
    zweck: "Die Fußzeile — neben dem Themen-Einstieg der einzige Ort, an dem alle Bereiche verlinkt sind.",
    gruppe: "struktur",
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
    stand: "im-aufbau",
    bestehtAus: [],
  },
  {
    datei: "components/BackLink.tsx",
    name: "BackLink",
    zweck: "Ein Weg zurück eine Ebene höher.",
    gruppe: "struktur",
    stand: "im-aufbau",
    bestehtAus: [],
  },
  {
    datei: "components/RelatedLinks.tsx",
    name: "RelatedLinks",
    zweck: "Die weiterführenden Verweise am Ende einer Leseseite.",
    gruppe: "struktur",
    stand: "im-aufbau",
    bestehtAus: ["Icons"],
  },
  {
    datei: "components/InternalShell.tsx",
    name: "InternalShell",
    zweck: "Rahmen und Navigation der internen Bereiche.",
    gruppe: "struktur",
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
    stand: "verbindlich",
    bestehtAus: [],
  },
  {
    datei: "components/Logo.tsx",
    name: "Logo",
    zweck: "Die Wortmarke — als SVG, damit sie auf jeder Tagesstufe die Textfarbe erbt.",
    gruppe: "struktur",
    stand: "verbindlich",
    bestehtAus: [],
  },
  {
    datei: "components/SortPfeil.tsx",
    name: "SortPfeil",
    zweck: "Die Sortierrichtung an einer Tabellen-Spaltenüberschrift.",
    gruppe: "struktur",
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
    stand: "verbindlich",
    bestehtAus: ["Icons"],
  },
  {
    datei: "components/ChartExportBar.tsx",
    name: "ChartExportBar",
    zweck: "Die Aktionsleiste über einem Chart, das auf einer eigenen Seite steht.",
    gruppe: "widget",
    stand: "im-aufbau",
    bestehtAus: ["Icons"],
  },
  {
    datei: "components/PoweredBy.tsx",
    name: "PoweredBy",
    zweck: "Die Markenzeile unter einem eingebetteten Widget. Nie inline nachgebaut.",
    gruppe: "widget",
    stand: "verbindlich",
    bestehtAus: [],
  },
  {
    datei: "components/DataSourceList.tsx",
    name: "DataSourceList",
    zweck:
      "Die Quellenangabe — Lizenzpflicht, deshalb sichtbar auf der Seite UND fest im erzeugten Bild, nie handgetippt.",
    gruppe: "widget",
    stand: "verbindlich",
    bestehtAus: ["PoweredBy"],
  },
  {
    datei: "components/WidgetExport.tsx",
    name: "WidgetExport",
    zweck:
      "Was ins Bild gehört und was nicht: Bedienelemente raus, Legende, Skala, gewählter Zustand und Quelle hinein.",
    gruppe: "widget",
    stand: "verbindlich",
    bestehtAus: ["ChartActionBar", "CiteModal", "PoweredBy"],
    keinBeispielWeil:
      "Steuert, was in ein erzeugtes Bild kommt und was nicht. Sichtbar wird das erst im Bild, nicht auf dem Bildschirm.",
  },
  {
    datei: "components/CiteModal.tsx",
    name: "CiteModal",
    zweck: "Die Zitierhilfe zu einem Chart.",
    gruppe: "widget",
    stand: "im-aufbau",
    bestehtAus: ["Modal"],
  },
  {
    datei: "components/AutoHeightIframe.tsx",
    name: "AutoHeightIframe",
    zweck:
      "Ein eingebettetes Widget auf eigener Seite. Reicht Farbschema, Seitenpfad und Linkziel hinein — ein iframe erbt davon nichts.",
    gruppe: "widget",
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
    stand: "verbindlich",
    bestehtAus: [],
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
export const NOCH_NICHT_EINGEORDNET: string[] = [
  "AirconDetailInputs",
  "ArticleMeta",
  "ContactForm",
  "ContactPerson",
  "DayProfileChart",
  "EnergyFlowModal",
  "ErzeugungWidget",
  "Faq",
  "FoerderCheckStarter",
  "FoerderFlow",
  "FundingHistory",
  "FundingProgramParts",
  "FundingTechnikTabs",
  "GlossaryTerm",
  "HerkunftsMelder",
  "KlimaDetailModal",
  "KontaktTeaser",
  "MastrHeroSection",
  "MastrLiveRadial",
  "MastrMap",
  "ObfuscatedEmail",
  "ProConLists",
  "PvRechnerModal",
  "RegionAnlagentypWidget",
  "RegionSolarLive",
  "ResultFunding",
  "ScenarioCards",
  "ScenarioTabs",
  "SimulationPanel",
  "SolarTrendCard",
  "SolarTrendSection",
  "SunControl",
  "ThemeController",
  "WebAnalytics",
  "WidgetAutoHeight",
  "export-notes",
];

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
