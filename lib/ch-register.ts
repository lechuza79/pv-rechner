/**
 * Das Schweizer Anlagenregister: Schlüssel, Ebenen, Segmente — und die Lücken.
 *
 * QUELLE: Bundesamt für Energie, „Elektrizitätsproduktionsanlagen"
 * (ch.bfe.elektrizitaetsproduktionsanlagen). Freie Nutzung einschließlich
 * kommerzieller Zwecke, Quellenangabe ist Pflicht (opendata.swiss,
 * terms-of-use#terms_by). Verzeichnis und Grenzen siehe `CH_QUELLEN`.
 *
 * DIE GEMEINDE STEHT NICHT IM REGISTER — BLOCKER
 * ----------------------------------------------
 * Jede Anlage nennt einen ORTSCHAFTSNAMEN und eine Postleitzahl, keine
 * Gemeindenummer. Die naheliegende Zuordnung über das amtliche
 * Ortschaftenverzeichnis sieht dabei perfekt aus und ist falsch — gemessen am
 * 07.10.2026:
 *
 *   über (Ortschaft, Postleitzahl) zugeordnet:        99,999 %
 *   davon im Kanton Zürich gegen das Gebäuderegister
 *   geprüft und FALSCH:                                   29 %
 *
 * Der Grund: Eine Postleitzahl reicht über Gemeindegrenzen. 41,6 % aller
 * Anlagen liegen auf Paaren aus Ortschaft und Postleitzahl, die mehrere
 * Gemeinden treffen — Winterthur/8405 gehört zu 99,67 % nach Winterthur und zu
 * 0,33 % nach Schlatt. Ein Wörterbuch über diesen Schlüssel behält stillschweigend
 * die letzte Zeile, und das Ergebnis ist eine plausible Zahl auf der falschen
 * Ortsseite. **Nie nach Namen zuordnen** — dieselbe Lehre, die das Projekt in
 * Deutschland zwei gleichnamige Obergeckler gekostet hat.
 *
 * ZUGEORDNET WIRD ÜBER DIE KOORDINATE, GEGENGEPRÜFT ÜBER DAS GEBÄUDE
 * ------------------------------------------------------------------
 * Beide Wege sind amtlich und voneinander unabhängig. Gemessen über alle
 * 337.455 Photovoltaik-Anlagen:
 *
 *   beide Wege, gleiche Gemeinde     329.491   97,640 %
 *   nur über die Koordinate            5.575    1,652 %
 *   nur über das Gebäude                 562    0,167 %
 *   beide Wege, VERSCHIEDEN                2    0,001 %
 *   keiner von beiden                  1.825    0,541 %
 *
 * Zwei Abweichungen bei 329.493 Vergleichen — das ist der Beleg, nicht die
 * 99,999 % des Namenswegs. Die Koordinate deckt mehr ab (99,29 % gegen 97,81 %)
 * und braucht nur die Gemeindegrenzen (37 MB) statt des vollständigen
 * Gebäuderegisters (1,5 GB über 26 Kantone). Deshalb trägt sie den Monatslauf;
 * das Gebäuderegister bleibt das Prüfmittel und wird nicht routinemäßig geholt.
 *
 * Die 1.825 Anlagen ohne jede Zuordnung (0,54 %) zählen in der Landessumme und
 * auf keiner Ortsseite — dieselbe Behandlung wie die gemeindefreien Gebiete in
 * Deutschland. Sie werden gezählt und genannt, nicht geschätzt.
 */

/** Die vier Quellen, aus denen ein Schweizer Datenlauf liest. */
export const CH_QUELLEN = {
  register:
    "https://data.geo.admin.ch/ch.bfe.elektrizitaetsproduktionsanlagen/csv/2056/ch.bfe.elektrizitaetsproduktionsanlagen.zip",
  /** Amtliches Gemeindeverzeichnis — liefert die Hierarchie ausgeschrieben. */
  verzeichnis: "https://www.agvchapp.bfs.admin.ch/api/communes/snapshot?date=",
  /** Grenzen UND Einwohnerzahl in einer Datei. */
  grenzen:
    "https://data.geo.admin.ch/ch.swisstopo.swissboundaries3d/swissboundaries3d_2026-01/swissboundaries3d_2026-01_2056_5728.gpkg.zip",
  /** Nur für die Gegenprobe, nie im Routinelauf: je Kanton rund 120 MB. */
  gebaeuderegister: "https://public.madd.bfs.admin.ch/",
} as const;

/**
 * DER REGIONSSCHLÜSSEL TRÄGT SEINEN MARKT — BLOCKER.
 *
 * Schweizer Gemeindenummern laufen von 1 bis 6831, deutsche Bundesländer von
 * „01" bis „16": ein nackter Kanton 10 und das Saarland wären derselbe
 * Schlüssel. Das fiele in keinem Test auf, es stünde nur der Bestand des einen
 * Landes unter dem Namen des anderen.
 *
 * Deshalb beginnt jeder Schweizer Schlüssel mit „ch" und trägt einen Buchstaben
 * für seine Ebene; die Nummer wird auf feste Länge aufgefüllt, damit die
 * Schlüssel sortierbar bleiben. Nur Kleinbuchstaben und Ziffern — die
 * Eingangsprüfung der Atlas-Funktionen erlaubt genau das.
 *
 * **Die Stellen tragen hier KEINE Hierarchie**, und das ist der Punkt: `chk01`
 * ist nicht der Anfang von `chg0261`. Seit dem 06.10.2026 kommt die Hierarchie
 * aus dem Verzeichnis, nicht aus dem gemeinsamen Anfang des Schlüssels — genau
 * dafür wurde das umgebaut.
 */
export const CH_MARKT_WURZEL = "ch";

export function chGemeindeSchluessel(bfsNummer: number | string): string {
  return `chg${String(bfsNummer).padStart(4, "0")}`;
}
export function chBezirkSchluessel(nummer: number | string): string {
  return `chb${String(nummer).padStart(4, "0")}`;
}
export function chKantonSchluessel(nummer: number | string): string {
  return `chk${String(nummer).padStart(2, "0")}`;
}

/** Gehört dieser Schlüssel zum Schweizer Markt? */
export function istChSchluessel(key: string): boolean {
  return key === CH_MARKT_WURZEL || /^ch[kbg]\d+$/.test(key);
}

/**
 * Die EBENEN-Werte sind strukturelle Bezeichner und werden je Markt
 * wiederverwendet — sie werden NICHT umbenannt.
 *
 * Gemessen am 07.10.2026: 112 Stellen in 33 Dateien vergleichen eine Ebene
 * gegen einen dieser vier Werte, 36 davon allein gegen „de". Sie
 * marktneutral umzubenennen kostet jede dieser Stellen plus eine Migration der
 * Bestandsdaten und liefert keine einzige richtigere Zahl. Der schlecht
 * gewählte Name der Wurzel („de" für eine Landesebene) bleibt deshalb stehen.
 *
 * Was ein Besucher LIEST, kommt dagegen aus dem Markt: Die erste
 * Untergliederung heißt in Deutschland Bundesland und in der Schweiz Kanton,
 * die zweite Landkreis bzw. Bezirk. Beschriftung und Struktur sind zwei Dinge —
 * dieselbe Trennung wie bei Zahl und Einheit.
 */
export const CH_EBENEN_NAMEN = {
  de: "Schweiz",
  bundesland: "Kanton",
  landkreis: "Bezirk",
  gemeinde: "Gemeinde",
} as const;

/**
 * Die Segmente der Schweiz sind ANDERE — sie werden nicht in die deutschen
 * gepresst.
 *
 * Deutschland trennt nach Nutzung (privates Dach, gewerbliches Dach,
 * Freifläche, Steckersolar), das Schweizer Register nach Bauart. Gemessen am
 * Datenstand 14.09.2026:
 *
 *   angebaut      283.574 Anlagen   7.740.506 kW
 *   integriert     42.205 Anlagen     728.863 kW
 *   ohne Angabe    10.271 Anlagen     301.786 kW
 *   freistehend     1.405 Anlagen      58.053 kW
 *
 * „freistehend" ist NICHT „Freifläche": Darunter fällt auch ein freistehendes
 * Vordach. Wer die vier Schweizer Werte auf die vier deutschen abbildet,
 * behauptet eine Aussage über die Nutzung, die das Register nicht trägt.
 */
export const CH_SEGMENTE: Record<string, string> = {
  plantcat_8: "angebaut",
  plantcat_9: "integriert",
  plantcat_10: "freistehend",
  "": "ohne_angabe",
};

/** Der Energieträger-Schlüssel des Registers → unsere Benennung. */
export const CH_TRAEGER: Record<string, string> = {
  subcat_2: "solar",
  subcat_1: "wasser",
  subcat_3: "wind",
  subcat_4: "biomasse",
};

/**
 * WAS DER SCHWEIZ FEHLT — und auf jeder Seite benannt wird, nicht gefüllt.
 *
 * Beides ist am Datenstand 14.09.2026 gemessen, nicht vermutet. Eine leere
 * Kachel ohne Erklärung liest sich wie „hier gibt es nichts", und das wäre in
 * beiden Fällen falsch: Es gibt die Anlagen, nur nicht in dieser Quelle.
 */
export const CH_LUECKEN = [
  {
    was: "Speicher",
    befund:
      "Das Register führt Elektrizitätsproduktionsanlagen; eine Batterie ist keine. " +
      "Es gibt im ganzen Datensatz kein Feld dafür — anders als in Deutschland, wo " +
      "jeder Speicher eine eigene Zeile hat.",
  },
  {
    was: "Balkonkraftwerke",
    befund:
      "Aufgenommen werden Anlagen über 2 kW sowie Kleinanlagen, die freiwillig für " +
      "Herkunftsnachweise registriert wurden. Nur 586 der 337.455 Anlagen (0,2 %) " +
      "liegen bei 2 kW oder darunter — der Steckersolar-Bestand steht praktisch " +
      "nicht darin.",
  },
] as const;

/**
 * Die historische Kennung des Verzeichnisses ist nur INNERHALB einer Ebene
 * eindeutig — BLOCKER.
 *
 * Gemessen am 07.10.2026: 11 Kennungen sind doppelt vergeben, jeweils einmal an
 * eine Gemeinde und einmal an einen Bezirk. Wer die Elternkette über die
 * Kennung allein auflöst, bekommt Thalwil im Kanton Zürich als Kind von Vionnaz
 * im Wallis — und das Ergebnis sieht wie eine Hierarchie aus. Der Elternteil
 * einer Gemeinde ist immer ein Bezirk, der eines Bezirks immer ein Kanton;
 * nachgeschlagen wird deshalb mit Kennung UND Zielebene.
 */
export function chElternSchluessel(kennung: string, zielEbene: "1" | "2"): string {
  return `${kennung}|${zielEbene}`;
}
