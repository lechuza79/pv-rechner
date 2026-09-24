// Prüfbare Form der Förderbedingungen.
//
// Die Freitexte in `conditions` (lib/funding-programs.ts) bleiben, was sie sind:
// das, was ein Mensch liest. Dieses Modul beantwortet die andere Frage — welche
// davon sich PRÜFEN lassen, also im Förderflow zu einer Frage werden können.
//
// Gemessen am 13.08.2026: 38 Programme, 122 Bedingungen, **keine einzige
// Formulierung kommt zweimal vor**. Verschieden sind aber nur die Wortlaute und
// Werte — die Sorten wiederholen sich (Antragszeitpunkt, wer darf, welches
// Gebäude, welche Anlage, Ausführung, Bindungsdauer). Deshalb kein Flow je
// Programm, sondern ein Flow über wiederkehrende Prüfungen.
//
// **Jede Prüfung trägt den Wortlaut, aus dem sie stammt** (`ausBedingung`). Das
// ist kein Kommentar, sondern der Mechanismus: `funding-conditions.test.ts` hält
// jede `conditions`-Zeile gegen die Belege, die regionsgedeckten und die
// ausdrücklichen Hinweise. Was in keiner dieser Listen auftaucht, ist beim
// Erfassen untergegangen — und lässt den Test fallen, statt still zu fehlen.

import { allFundingPrograms, type FundingProgram } from "./funding-programs";

// ── Wer darf beantragen ──────────────────────────────────────────────────────
export type Antragsteller =
  | "eigentuemer"   // Wohngebäudeeigentümer
  | "mieter"        // ausdrücklich auch Mieter
  | "weg"           // Wohnungseigentümergemeinschaft
  | "verein"        // eingetragene gemeinnützige Vereine
  | "gewerbe";

export type GebaeudeArt = "efh" | "mfh" | "wohn" | "gruendach" | "fassade" | "denkmal";

/**
 * Eine einzelne prüfbare Bedingung.
 *
 * Der Antragszeitpunkt ist bewusst dreiwertig und NICHT als „vorher ja/nein"
 * modelliert: Die verbreitete Regel „immer vor Auftragsvergabe beantragen" ist
 * falsch. Mehrere Programme verlangen den Antrag ausdrücklich **nach**
 * Inbetriebnahme (eines mit Sechs-Monats-Frist danach). Eine pauschale Warnung
 * würde genau diesen Antragstellern die Förderung kosten.
 */
export type Pruefung =
  | {
      art: "antrag-zeitpunkt";
      /** `bescheid-vor-start`: der Antrag allein reicht nicht, der Bescheid muss da sein. */
      zeitpunkt: "vor-auftrag" | "bescheid-vor-start" | "nach-inbetriebnahme";
      /** Nur bei `nach-inbetriebnahme`: Frist in Monaten. */
      fristMonate?: number;
    }
  | { art: "antragsweg"; weg: "online" | "hausbank" | "formular" | "zweistufig"; registrierung?: boolean }
  | { art: "antragsteller"; wer: Antragsteller[] }
  | { art: "gebaeude-bestand"; bauantragVorIso?: string }
  | {
      art: "gebaeude-art";
      nur: GebaeudeArt[];
      /**
       * Bis zu dieser Anlagengröße gilt die Gebäudeart als erfüllt, ohne dass
       * sie geprüft wird — eine VERMUTUNGSREGEL, keine Obergrenze.
       *
       * Gebraucht wird das für den umsatzsteuerlichen Nullsatz: § 12 Abs. 3
       * Nr. 1 Satz 1 UStG verlangt die Anlage an einer Wohnung oder einem dem
       * Gemeinwohl dienenden Gebäude; Satz 2 sagt, die Voraussetzungen des
       * Satzes 1 „gelten als erfüllt", wenn die Bruttoleistung nicht mehr als
       * 30 kW (peak) beträgt. Eine Fiktion wirkt nur in eine Richtung: Sie sagt,
       * wann etwas als erfüllt GILT, nie wann es als nicht erfüllt gilt.
       *
       * Ohne dieses Feld waren beide Sätze als zwei UND-verknüpfte Bedingungen
       * erfasst, und das gab zwei falsche Auskünfte gleichzeitig: 40 kWp auf
       * einem Wohnhaus galten als ausgeschlossen (obwohl Satz 1 unmittelbar
       * erfüllt ist und nur nachgewiesen statt vermutet werden muss), und
       * 8 kWp auf einem Nicht-Wohngebäude ebenso — ausgerechnet der Fall, für
       * den die Vermutung geschaffen wurde. Geprüft am 25.08.2026 im Volltext:
       * § 12 Abs. 3 Nr. 1 UStG sowie UStAE 12.18 Abs. 5 Satz 2 („Vereinfachung
       * für die Prüfung der Gebäudeart") und Abs. 6 Satz 2, der die beiden
       * Wege ausdrücklich mit „entweder … oder" verbindet.
       */
      vermutetBisKwp?: number;
    }
  | { art: "anlage-groesse"; minKwp?: number; maxKwp?: number }
  | {
      art: "anlage-speicher";
      regel: "nur-mit-neuer-pv" | "nicht-gefoerdert" | "min-kwh" | "max-je-kwp";
      wert?: number;
    }
  | { art: "anlage-balkon"; regel: "ausgeschlossen" | "nur-balkon" }
  | { art: "anlage-dachbelegung"; volleBelegung: true }
  | { art: "ausfuehrung"; fachbetriebPflicht?: boolean; eigenleistungAusgeschlossen?: boolean; mietmodellAusgeschlossen?: boolean }
  | { art: "bindung"; jahre: number };

export interface Bedingungspruefung {
  /** Wortlaut aus `conditions` — der Beleg. Muss zeichengleich sein. */
  ausBedingung: string;
  pruefung: Pruefung;
}

export interface FundingChecks {
  /**
   * Programme ohne Antragsverfahren — die Vergünstigung greift von selbst
   * (Steuerregel). Bewusstes Feld statt einer fehlenden Angabe: „hier gibt es
   * keine Frist" ist eine Aussage, „Frist nicht erfasst" wäre eine Lücke, und
   * beides sähe im Code sonst gleich aus.
   */
  ohneAntrag?: { warum: string };
  pruefungen: Bedingungspruefung[];
  /** Bedingungen, welche die Ortsauswahl im Flow bereits erledigt. */
  durchRegion: string[];
  /** Bedingungen, die Hinweis bleiben. `warum` erzwingt die bewusste Entscheidung
   *  statt eines Abladeplatzes für alles Unbequeme. */
  hinweise: { ausBedingung: string; warum: string }[];
}

/**
 * Programme, deren Bedingungen noch nicht erfasst sind. Bewusst als sichtbare,
 * schrumpfende Liste (gleiche Systematik wie die Ausnahmeliste im
 * Einheiten-Wächter): Der Test prüft jedes Programm, das NICHT hier steht, auf
 * Vollständigkeit — die Liste zu verlängern ist damit eine sichtbare
 * Entscheidung, kein Versehen.
 */
export const NOCH_NICHT_ERFASST: string[] = [
  // VG Kandel, aufgenommen am 23.09.2026. Zwei Gründe, jeder für sich
  // ausreichend. Erstens nimmt die Verbandsgemeinde derzeit gar keine Anträge
  // an („alle verfügbaren Mittel … ausgeschöpft"). Zweitens ist das Verfahren
  // das UMGEKEHRTE, wie bei Fritzlar und Mauer: „Eine Beantragung der
  // Fördermittel vor Kauf, Installation und Registrierung des Balkonkraftwerks
  // ist NICHT möglich." Die vorhandenen Prüfformen bilden die übliche Regel
  // „Antrag vor Kauf" ab; hier verlangten sie vom Nutzer das Gegenteil dessen,
  // was die Richtlinie verlangt. Alle Bedingungen stehen vollständig auf der
  // Karte, die Antragsreihenfolge als erste Zeile nach dem Ausschöpfungs-
  // hinweis. Prüfform mit einer Neuauflage.
  // VG Höhr-Grenzhausen, aufgenommen am 23.09.2026. Dieselbe Lage wie bei
  // Fritzlar, nur eine Stufe schärfer: Die Frist läuft NACH dem Kauf, nicht
  // davor („Der Antrag ist innerhalb von 3 Monaten nach Erwerb des
  // Balkonkraftwerks … zu stellen"), und eine Bewilligung vor dem Kauf ist
  // gar nicht vorgesehen. Die vorhandenen Prüfformen bilden die übliche Regel
  // „Antrag vor Kauf" ab; sie hier anzuwenden verlangte vom Nutzer das
  // Gegenteil dessen, was die Richtlinie verlangt, und verschwiege zugleich
  // die Frist, die ihn wirklich die Förderung kostet. Halb erfasst gibt es
  // hier nicht; bis dahin steht die Frist als erste Bedingung auf der Karte.
  // VG Langenlonsheim-Stromberg, aufgenommen am 24.09.2026. Dieselbe Lage wie
  // bei Kandel und Höhr-Grenzhausen: Das Verfahren ist das UMGEKEHRTE. Die
  // Programmseite sagt „Eine Beantragung der Fördermittel vor Kauf,
  // Installation und Registrierung des Balkonkraftwerks ist NICHT möglich";
  // die vorhandenen Prüfformen bilden die übliche Regel „Antrag vor Kauf" ab
  // und verlangten vom Nutzer damit das Gegenteil dessen, was die
  // Verbandsgemeinde verlangt. Dazu kommt, dass das Kontingent für 2026
  // vergeben ist und neue Anträge nur auf die Warteliste gehen. Alle
  // Bedingungen stehen vollständig auf der Karte, der Kontingent-Hinweis als
  // erste Zeile und die Antragsreihenfolge weiter oben. Prüfform, sobald es
  // eine Prüfform für „Antrag NACH Kauf" gibt.
  // Die drei Klimafonds der Samtgemeinde Artland, aufgenommen am 24.09.2026.
  // Der Antragszeitpunkt ist in den drei Richtlinien VERSCHIEDEN geregelt
  // (Badbergen: vollständiger Antrag vor Auftragsvergabe; Quakenbrück und
  // Menslage: nur kein Auftrag vor Inkrafttreten der Richtlinie), und der Rat
  // der Samtgemeinde „erst nach dem Bescheid kaufen" steht nur auf der Seite.
  // Eine Prüfform „vor-auftrag" gäbe bei zwei von dreien eine Pflicht aus, die
  // die Richtlinie nicht kennt. Alle Bedingungen stehen auf der Karte.
  "quakenbrueck-klimafonds", "menslage-klimafonds", "badbergen-klimafonds",
  // VG Rüdesheim, aufgenommen am 24.09.2026 als BEENDETES Programm; es gibt
  // nichts mehr zu beantragen und damit nichts zu prüfen.
  "vg-ruedesheim-balkonkraftwerke",
  // Stadt Bad Kreuznach, aufgenommen am 24.09.2026. Das Verfahren ist das
  // umgekehrte (Antrag NACH Kauf und Installation, binnen sechs Monaten) —
  // dieselbe Lage wie bei Kandel und Langenlonsheim-Stromberg: Die vorhandenen
  // Prüfformen bilden „Antrag vor Kauf" ab. Alle Bedingungen stehen auf der Karte.
  "bad-kreuznach-balkonkraftwerke",
  "vg-langenlonsheim-stromberg-balkonkraftwerke",
  "vg-hoehr-grenzhausen-balkonkraftwerke",
  "vg-kandel-balkonkraftwerke",
  // VG Leiningerland, aufgenommen am 23.09.2026. Dasselbe wie bei Bremen: Das
  // Programm ist BEENDET (Meldung der Verbandsgemeinde vom 26.06.2025, 400
  // geförderte Anträge), eine Prüfform hielte das Vorhaben eines Nutzers also
  // gegen ein Verfahren, in das er gar nicht mehr hineinkommt. Die Bedingungen
  // stehen vollständig auf der Karte, in der Vergangenheitsform und mit dem
  // Ende als erster Zeile. Wird das Programm je neu aufgelegt, gehört die
  // Prüfform zur Neuauflage — dann aber an der dann geltenden Richtlinie, nicht
  // an dieser von 2024.
  "vg-leiningerland-balkonkraftwerke",
  // Stadt Germersheim, aufgenommen am 23.09.2026. Zwei Gründe, jeder für sich
  // ausreichend. Erstens ist das Programm BEENDET (Antragsfrist am 31.10.2025
  // abgelaufen) -- eine Prüfform hielte das Vorhaben eines Nutzers gegen ein
  // Verfahren, in das er gar nicht mehr hineinkommt. Zweitens ist das
  // Verfahren das UMGEKEHRTE, wie bei Kandel, Fritzlar und Mauer: "Eine
  // Beantragung der Fördermittel vor Kauf, Installation und Registrierung des
  // Balkonkraftwerks ist NICHT möglich." Die vorhandenen Prüfformen bilden die
  // übliche Regel "Antrag vor Kauf" ab; hier verlangten sie vom Nutzer das
  // Gegenteil dessen, was die Stadt verlangte. Die Bedingungen stehen
  // vollständig auf der Karte, in der Vergangenheitsform und mit dem Ende als
  // erster Zeile. Prüfform mit einer Neuauflage -- dann aber an der dann
  // geltenden Richtlinie, nicht an dieser von 2024.
  // Stuhr Solarstromspeicher, aufgenommen am 23.09.2026. Der Jahrestopf 2026 ist
  // seit Ende Juli leer; eine Prüfform hielte das Vorhaben eines Nutzers gegen ein
  // Verfahren, in das er dieses Jahr nicht mehr hineinkommt. Die Bedingungen
  // stehen vollständig auf der Karte. Mit der Neuauflage 2027 gehört die Prüfform
  // dazu — dann aber an der dann geltenden Fassung: Die Untergrenze stieg zum
  // Jahr 2026 von 2,5 auf 5 kWh, und die Erstinstallations-Bedingung ist ebenso
  // neu. Wer die Form aus einer älteren Richtlinie übernimmt, prüft zwei
  // Bedingungen falsch.
  "stuhr-klimaschutz-speicher",
  "germersheim-balkonkraftwerke",
  // Bremen Heizungstausch, aufgenommen am 23.09.2026. Das Programm nimmt seit
  // dem 31.08.2025 keine Anträge mehr an — eine Prüfform hielte das Vorhaben
  // eines Nutzers gegen ein Verfahren, in das er gar nicht mehr hineinkommt.
  // Was es an Bedingungen gab, steht vollständig auf der Karte. Wird das
  // Programm je neu aufgelegt, gehört die Prüfform mit der Neuauflage dazu.
  "bremen-heizungstausch",
  // Kaufungen Sondervermögen, aufgenommen am 23.09.2026. Es ist ein zinsloses
  // DARLEHEN; die Prüfformen bilden Zuschussverfahren ab. Die eine Bedingung,
  // die ein Modell hier tragen könnte — Antrag vor Beginn der Baumaßnahme —
  // steht im Wortlaut auf der Karte, und das zweite Kriterium (Wohngebäude,
  // bei allen übrigen Maßnahmen Fachwerk vor 1950) kennt der Rechner nicht.
  "kaufungen-sondervermoegen",
  // Fritzlar, aufgenommen am 20.09.2026. Richtlinie im Volltext gelesen, jede
  // Bedingung steht am Programm. Die Prüfform fehlt noch und ist hier nicht
  // trivial, weil das Antragsverfahren das UMGEKEHRTE ist: „Es handelt sich um
  // ein nachträgliches Zuschussverfahren, d. h. die Maßnahme bedarf keiner
  // Bewilligung." Die vorhandenen Prüfformen bilden die übliche Regel „Antrag
  // vor Kauf" ab; sie hier anzuwenden würde dem Nutzer eine Bewilligung
  // abverlangen, die es gar nicht gibt. Dazu kommt eine Frist, die das Modell
  // nicht kennt: Die Rechnung darf beim Antrag höchstens drei Monate alt sein
  // — also eine Frist NACH dem Kauf statt davor. Halb erfasst gibt es hier
  // nicht; bis dahin stehen die Bedingungen vollständig auf der Karte.
  "fritzlar-balkonkraftwerke-speicher",
  // Mauer, aufgenommen am 20.09.2026. Amtsseite und Antragsformular im
  // Volltext gelesen. Auch hier ist das Antragsverfahren das nachträgliche
  // (die Rechnungskopie gehört zum Antrag), und die Gemeinde nennt darüber
  // hinaus keine Frist — es gibt damit schlicht kein Antragsverfahren, gegen
  // das eine Prüfform das Vorhaben halten könnte.
  "mauer-balkonkraftwerke",
  // Schwarzenfeld, aufgenommen am 20.09.2026. Förderhinweise vom 01.10.2024 im
  // Volltext gelesen. Dasselbe umgekehrte Verfahren wie bei Mauer: „Der
  // unterschriebene Antrag kann NACH Beschaffung der PV-Anlage eingereicht
  // werden", Rechnungskopie und Zahlungsnachweis gehören dazu. Eine Prüfform
  // hielte das Vorhaben gegen eine Bewilligung, die es hier nicht gibt.
  // Die EINE Frist, die der Markt nennt, ist eine Jahresfrist am Antrag („im
  // Jahr der Rechnungsausstellung") und keine Bedingung an das Vorhaben — sie
  // steht vollständig auf der Karte.
  "schwarzenfeld-balkon-pv",
  // Kumhausen, aufgenommen am 20.09.2026. Förderkriterien 2026 im Volltext
  // gelesen. Hier WÄRE eine Prüfform möglich, und nur deshalb steht der Eintrag
  // hier statt bei den unmöglichen Fällen: Die Gemeinde verlangt den Antrag vor
  // der Installation („Bereits installierte Anlagen sind von der Antragstellung
  // ausgenommen"), also die übliche Regel. Sie ist in diesem Lauf nicht mehr
  // erfasst worden; halb erfasst gibt es nicht, und bis dahin stehen die
  // Bedingungen vollständig auf der Karte.
  "kumhausen-balkon-pv",
  // Mutterstadt, aufgenommen am 20.09.2026. Richtlinie im Volltext auf der
  // Gemeindeseite gelesen. Wieder das nachträgliche Verfahren: „Die
  // Antragstellung erfolgt nach der Umsetzung der Maßnahmen." Es gibt kein
  // Antragsverfahren vor dem Kauf, gegen das eine Prüfform etwas halten könnte.
  "mutterstadt-balkonkraftwerke",
  // Rauschenberg, aufgenommen am 20.09.2026. Amtliche Bekanntmachung im
  // Volltext gelesen. Auch hier wird erst gekauft und dann beantragt, und eine
  // Frist nennt die Richtlinie nicht — es gibt kein Antragsverfahren, gegen das
  // eine Prüfform das Vorhaben halten könnte.
  "rauschenberg-balkon-solaranlagen",
  // Weichering, aufgenommen am 20.09.2026 — und der einzige Eintrag hier, dem
  // eine Prüfform nicht bloß fehlt, sondern für den es keine geben kann: Die
  // Gemeinde bezuschusst die BERATUNG UND PLANUNG, nicht die Anlage. Eine
  // Prüfform hält das Vorhaben des Nutzers gegen die Bedingungen des
  // Programms; hier beschreiben die Bedingungen einen anderen Gegenstand als
  // den, den der Rechner beschreibt. Was zu prüfen wäre — ob jemand eine
  // bezahlte Planung beauftragt hat —, fragt kein Rechner dieses Projekts, und
  // deshalb trägt der Eintrag auch keinen strukturierten Satz und zieht nichts
  // ab. Die Bedingungen stehen vollständig auf der Karte.
  "weichering-solarberatung",
  // Leverkusen, aufgenommen am 20.09.2026 als BEENDETES Programm. Eine Prüfform
  // hält das Vorhaben des Nutzers gegen die Bedingungen eines Programms — bei
  // einem aufgehobenen Programm gibt es nichts mehr zu prüfen, weil es nichts
  // mehr zu beantragen gibt. Die Bedingungen stehen trotzdem vollständig am
  // Eintrag: Sie beschreiben, was bis zum Ratsbeschluss vom 16.12.2024 galt, und
  // sind damit der Vergleichsmaßstab, falls die Stadt neu auflegt.
  "leverkusen-photovoltaik",
  // Florstadt, aufgenommen am 20.09.2026 als beendetes Programm. Dieselbe Lage
  // wie in Leverkusen: Die Richtlinie ist seit dem 30.06.2025 außer Kraft, es
  // gibt nichts mehr zu beantragen und damit nichts, wogegen eine Prüfform ein
  // Vorhaben halten könnte. Die Bedingungen stehen vollständig am Eintrag und
  // sind der Vergleichsmaßstab, falls die Stadt eine neue Fassung beschließt.
  "florstadt-photovoltaik",
  // Ehningen, aufgenommen am 20.09.2026. Richtlinie im Volltext gelesen, jede
  // Bedingung steht am Programm. Die Prüfform fehlt, weil das Programm die Frage
  // gar nicht stellt, die die vorhandenen Formen prüfen: Der Antrag darf „vor
  // oder nach Kauf und Installation" gestellt werden — es gibt also keinen
  // Antragszeitpunkt, gegen den sich ein Vorhaben halten ließe. Was zu prüfen
  // wäre (fünf Jahre Eigentum, Sozialpass, Wechselrichter zwischen 300 und 800
  // Watt), fragt kein Rechner dieses Projekts.
  "ehningen-steckerfertige-pv",
  // Landkreis Erlangen-Höchstadt, sechs Gemeindeprogramme, aufgenommen am
  // 20.09.2026. Jede Richtlinie ist im Volltext gelesen und jede Bedingung steht
  // am Programm — die Prüfformen fehlen noch, und sie sind hier nicht trivial:
  // Fünf der sechs verlangen den Antrag VOR dem Kauf, Eckental dagegen NACH dem
  // Kauf (Rechnung und Foto gehören zum Antrag). Beides zugleich abzubilden ist
  // die eigentliche Arbeit und braucht einen eigenen Durchgang; halb erfasst
  // gibt es hier nicht. Bis dahin stehen die Bedingungen vollständig auf der
  // Karte, sie werden nur nicht gegen das Vorhaben geprüft.
  // Unterföhring, aufgenommen am 20.09.2026. Die Richtlinie ist im Volltext
  // gelesen, jede Bedingung steht am Programm. Die Prüfform fehlt noch und ist
  // hier nicht trivial: Nr. 1.2 verlangt den Antrag vor Beginn, Nr. 4.2
  // zusätzlich den Vorbescheid — die Richtlinie ist an dieser Stelle in sich
  // uneinheitlich, und welche der beiden Fassungen geprüft wird, ist eine
  // Entscheidung, keine Übersetzung.
  "unterfoehring-energiesparfoerderprogramm",
  "buckenhof-klimaschutz", "marloffstein-klimaschutz", "uttenreuth-klimaschutz",
  "roettenbach-erh-pv-speicher", "eckental-balkon", "spardorf-solar",
  // Dazu die beiden Nachträge aus der Gegenprüfung desselben Tages: Röttenbachs
  // zweite Richtlinie (Heizung) und Kalchreuth, dessen Geltung offen ist.
"kalchreuth-regenerative-energien",
  // Zwei nicht mehr antragsfähige Programme im selben Landkreis, aufgenommen am
  // 20.09.2026. Eine Prüfform prüft das Vorhaben gegen ein Antragsverfahren —
  // und genau das gibt es hier nicht: Bubenreuth weist die Mittel als
  // ausgeschöpft aus, Herzogenaurach hat den Antragsstopp auf unbestimmte Zeit
  // verlängert. Die Bedingungen stehen vollständig auf der Karte und
  // informieren; geprüft werden sie erst, wenn wieder jemand beantragen kann.
  "bubenreuth-co2-einsparung", "herzogenaurach-co2-minderung",
  // Aufgenommen am 18.09.2026 aus dem Quellen-Rückstand; Amtsseite und
  // Richtlinie jeweils im Volltext gelesen. Die Prüfformen fehlen noch, und bei
  // Würselen kennt das Modell eine Bedingung gar nicht: Gekauft werden darf erst
  // nach der BEWILLIGUNG, nicht schon nach der Antragstellung — strenger als die
  // übliche Regel „Antrag vor Kauf", die die Prüfform abbildet. Gronau ruht
  // wegen der Haushaltssperre; halb erfasst gibt es hier nicht.
  "wuerselen-balkonkraftwerke", "gronau-klima-umweltfonds", "herzogenrath-klimaschutzinvestitionen", "allendorf-eder-erneuerbare",
  "hiddenhausen-spar-mit-solar", "herzebrock-clarholz-batteriespeicher",
  // Closed municipal rounds: current closure verified, historical terms remain visible.
  // Closed rounds added by the funding watcher on 2026-09-16 (source queue).
  "rheinisch-bergisch-balkonsolar", "burbach-klimaschutz-privat",
  // Exhausted 2026 round: conditions remain explicit information, no application flow.
  "bad-marienberg-erneuerbare-energien",
  // Hansestadt Lüneburg, aufgenommen am 21.09.2026 mit leerem Topf 2026
  // (Neuanträge ab 01.01.2027). Zwei Techniken mit verschiedenen
  // Antragstellern (Balkon nur Mieter, Erdwärme nur Eigentümer) — die
  // Bedingungen stehen je Technik auf der Karte, eine Antragsstrecke gibt es
  // bis zur nächsten Runde nicht.
  "lueneburg-regenerative-energien",
  // Closed since 31 December 2023 (guideline of 13 June 2023, read in full on
  // 17 September 2026). The conditions stay as historical information; there is
  // no application flow left to check them against.
  "bahrenhof-solar",
  // Closed 2023/2024 rounds in the same Amt (guidelines read in full on 19 Sep 2026).
  "wakendorf-i-solar", "weede-mini-solar", "geschendorf-solar",
  // Closed on 31 December 2025 (official page read in full on 20 September
  // 2026). No application flow is left to check the conditions against, and the
  // programme has a shape the check form cannot express anyway: the application
  // came AFTER the purchase (invoice and registry entry are part of it), so the
  // usual "apply before you buy" form would be the wrong test, not a missing one.
  "gaildorf-balkonkraftwerke",
  // Paused county round (no applications for 2026, page read 20 September 2026).
  // There is no application flow to check the conditions against, and the
  // programme has the reversed order anyway: the application follows purchase,
  // mounting and registry entry, so the usual "apply before you buy" form would
  // be the wrong test rather than a missing one.
  "havelland-stecker-solar",
  // Adendorf, aufgenommen am 21.09.2026. Dieselbe umgekehrte Reihenfolge wie
  // Havelland und Eckental: Die Richtlinie verlangt den Antrag NACH dem Kauf,
  // spätestens sechs Monate danach (Nr. 6.2), und die Bewilligung folgt auf
  // Kauf, Installation und Registrierung (Nr. 6.1). Die übliche Prüfform
  // „vor dem Kauf beantragen" wäre hier der falsche Test, nicht ein fehlender.
  "adendorf-steckersolar",
  // Samtgemeinde Ilmenau, aufgenommen am 21.09.2026. Dieselbe umgekehrte
  // Reihenfolge: Antrag nach dem Kauf, spätestens drei Monate danach (Nr. 4 a,
  // 6 b), mit Rechnung, Foto und Anmeldenachweisen.
  "ilmenau-steckersolar",
  // Samtgemeinde Scharnebeck, aufgenommen am 21.09.2026. Die Richtlinie
  // erlaubt den Antrag nach Kauf, Installation und Anmeldung, spätestens sechs
  // Monate nach dem Rechnungsdatum (§ 6 Abs. 1 und 2); das Formular lässt ihn
  // auch vorher zu. „Vor dem Kauf beantragen" als Pflicht wäre der falsche Test.
  "scharnebeck-steckersolar",
  // Verbandsgemeinde Ransbach-Baumbach, aufgenommen am 21.09.2026. Antrag VOR
  // dem Kauf: gefördert werden nur Geräte, die nach der Förderzusage
  // angeschafft werden (Richtlinie § 3 Abs. 1). Die Bedingung steht wörtlich am
  // Programm; die Prüfform folgt mit der nächsten Erfassungsrunde.
  "ransbach-baumbach-balkonkraftwerke",
  // Kreis Pinneberg, aufgenommen am 21.09.2026. Das Vorhaben ist eine
  // Dachbegrünung, nicht eine Photovoltaikanlage — eine Prüfform, die eine
  // Anlage gegen ein Antragsverfahren hält, hat hier nichts zu prüfen. Die
  // Bedingungen stehen vollständig auf der Karte.
  "pinneberg-gruendach-pv",
  // Samtgemeinde Ostheide, aufgenommen am 21.09.2026. Die Richtlinie verlangt
  // den formlosen Antrag VOR der Auftragserteilung und knüpft die Auszahlung an
  // eine Abnahme durch die Samtgemeinde — eine Prüfform dafür gibt es noch
  // nicht; die Bedingungen stehen vollständig auf der Karte.
  "ostheide-solarstrom",
  // Flecken Horneburg und Gemeinde Nottensdorf, aufgenommen am 21.09.2026.
  // Antrag VOR Beginn, Auftrag erst nach der Zusage; dazu ein Deckel, den
  // Richtlinie und Antragsformular verschieden fassen. Eine Prüfform müsste
  // eine der beiden Fassungen wählen — das ist eine Entscheidung, keine
  // Übersetzung. Die Bedingungen stehen vollständig auf der Karte.
  "horneburg-nachhaltige-projekte", "nottensdorf-nachhaltige-projekte",
  "ingelheim-photovoltaik", "verl-nachhaltigkeit", "eschborn-klimaschutz", "bergkamen-balkon", "pfaffenhofen-balkon",
  // Source-reviewed on 2026-09-16. Mixed technology, building and application rules remain explicit card conditions.
  "schwandorf-klimaschutz", "salzkotten-klimaschutz", "wolfratshausen-pv", "luebeck-solargruendach", "minden-klimaplus", "luedinghausen-klimaschutzfonds", "vaterstetten-pv-begleitung", "wendelstein-pv", "wendlingen-energie", "erkelenz-klimaschutz", "haltern-klimafonds-balkon", "idstein-klimaschutz", "kirchlengern-pv-kleinanlagen", "floersheim-photovoltaik", "eppelheim-balkonkraftwerke", "radolfzell-sonnige-zukunft", "meschede-balkon-speicher",
  // Die beiden Landesprogramme für Balkonkraftwerke, aufgenommen am 02.09.2026.
  // Ihre Bedingungen hängen an Mieter/Eigentümer — eine Unterscheidung, die das
  // Modell (privat/gewerblich) nicht kennt. Erfassbar erst, wenn es sie kennt.
  "sachsen-balkon-eeus", "mv-mini-solaranlagen",
  // Schleswig-Holstein state grants (balcony, heat pump, battery), added 21.09.2026 as closed programmes
  // (applications ended 16.11.2023). Nothing left to check against a system.
  "sh-balkon-klimaschutz-bub", "sh-waermepumpe-klimaschutz-bub", "sh-speicher-klimaschutz-bub",
  "berlin-solarplus", "stuttgart-solaroffensive", "karlsruhe-klimabonus",
  "regensburg-effizient", "wuerzburg-klimastadt", "darmstadt-pv",
  "badhomburg-energiespar", "koeln-pv", "duesseldorf-klimafreundlich",
  "hannover-proklima", "bonn-solares", "goettingen-klimafonds",
  "freiburg-stromerzeugung", "heidelberg-rev", "mannheim-solarbonus",
  "muenster-klimafreundlich", "wiesbaden-eswe-speicher", "mainz-kipki-speicher",
  "muenchen-fkg", "bremen-rundumshaus", "potsdam-klimaschutz", "dortmund-pv",
  "essen-solar", "schweinfurt-pv", "osnabrueck-saniert", "memmingen-ee",
  "baden-baden-pvplus", "schwerin-pv", "wolfsburg-pv", "bottrop-solaroffensive",
  "krefeld-klimafreundlich", "rhein-erft-energieoffensive", "viersen-klimaschutz",
  "bergstrasse-speicher", "mayen-koblenz-speicher", "ulm-energiefoerderprogramm",
  // Nach dem Merge von main dazugekommen — der Test hat sie gefunden, statt sie
  // still ungeprüft durchzulassen. Genau dafür ist die Liste da.
  "ludwigshafen-kipki", "waiblingen-klimaschutz", "herne-klimafoerderung",
  // Aus dem Abdeckungs-Screening vom 18.08.2026 — Sätze und Bedingungen sind an
  // der Amtsseite belegt, die Zuordnung zu den Prüfformen steht noch aus.
  "hoehr-grenzhausen-energie", "wietzen-pv", "gaimersheim-energie", "dietmannsried-pv",
  // Zweiter Schwung aus dem Screening (18.08.2026), diesmal überwiegend
  // Balkonkraftwerke. Sätze, Status und Bedingungen sind an der Amtsseite
  // gelesen und belegt; was noch fehlt, ist die Zuordnung zu den Prüfformen —
  // die ist eine eigene Arbeit, und halb erfasst gibt es hier nicht.
  "ennepetal-steckersolar", "wittlich-balkonkraftwerke", "hochheim-klimaschutz",
  "linsengericht-oekologie", "holzgerlingen-erneuerbare", "wernau-balkonkraftwerke",
  "muehlhausen-sulz-pv", "senden-klima",
  // Erste Wärmepumpen-Funde derselben Runde.
  "maintal-klima", "roth-klimaschutz", "wenden-heizungstausch",
  // Von der Prüfmechanik-Session übergeben und hier im Volltext gegengelesen.
  "hohenahr-pv", "leimen-klimaschutz",
  "sandhausen-foerderprogramme", "helmstedt-umwelt-klima", "nottuln-klimaschutz",
  "heddesheim-umwelt", "nittenau-steckersolar", "beratzhausen-effizient",
  "rietheim-weilheim-pv", "forstinning-energiewende", "oftersheim-co2",
  "bad-rothenfelde-klima", "vilshofen-steckersolar",
  // Erste Städte, die überhaupt erst die URL-Suche gefunden hat.
  "neuwied-balkonkraftwerke", "rodgau-balkonsolar", "tuebingen-balkon-pv",
  // Neu aufgenommen am 24.09.2026 (Council 3/3, adversarialer Prüfer und
  // Legal-Judge eingeschlossen). Sätze, Status und Bedingungen sind an der
  // Trägerseite im Volltext gelesen und belegt; die Zuordnung zu den Prüfformen
  // steht noch aus — der Eintrag zieht ohnehin kein Geld ab.
  "tuebingen-pv-speicher",
  "zweibruecken-balkonkraftwerke", "unterhaching-energiesparen",
  "hueckelhoven-balkonkraftwerke", "weinheim-effizienz", "ottobrunn-foerderprogramme",
  "feucht-klimaschutz",
  // Aus dem Parallel-Lesen vom 18.08.2026, Beträge selbst gegengelesen.
  "limburgerhof-balkonkraftwerke", "gernsheim-foerderprogramme", "gudensberg-balkonkraftwerke",
  "poing-energie", "goch-balkonkraftwerke", "herzberg-balkonkraftwerke",
  "herbrechtingen-balkonkraftwerke", "weyhe-klimaschutz", "moormerland-balkonkraftwerke",
  "bad-krozingen-balkon-pv",
  "reichelsheim-steckersolar", "putzbrunn-klimaschutz", "dettelbach-gestaltungssatzung-pv",
  "gailingen-balkonsolar", "hattenhofen-balkonsolar", "gaiberg-steckersolar",
  "karlshuld-balkonkraftwerke", "walddorfhaeslach-steckersolar", "klempau-balkonkraftwerke",
  // Leseliste vom 19.08.2026 — die 42 ungelesenen Fundstellen und die 35 Seiten,
  // die der Screener automatisch als „ausgelaufen" abgetan hatte. Jede Zahl an
  // der Amtsseite bzw. im Richtlinien-PDF selbst gegengelesen.
  "schiltach-pv", "altdorf-bb-balkonkraftwerke", "steffenberg-balkonkraftwerke",
  "tegernheim-stecker-pv", "lohfelden-100-daecher", "schwebheim-batteriespeicher",
  "asbach-balkonkraftwerke", "parkstein-nachhaltigkeitszuschuss",
  "marburg-balkonkraftwerke", "schoenbrunn-balkon-pv",
  "hillscheid-energie", "schlierbach-energiespeicher",
  // Aufgenommen am 03.09.2026, jede Zahl an der Amtsseite im Rohtext gelesen.
  // Die Prüfformen fehlen noch — bei Hamburg und Böblingen hängt die volle
  // Förderhöhe zusätzlich an einer Einkommensprüfung, die das Modell nicht
  // kennt; das ist eine eigene Arbeit und halb erfasst gibt es hier nicht.
  "hamburg-balkon-einkommen", "kiel-solarstadt", "boeblingen-balkonkraftwerke",
  // Aufgenommen am 05.09.2026, Richtlinie und Service-Portal im Volltext
  // gelesen. Die Prüfformen fehlen noch, und eine davon kennt das Modell gar
  // nicht: Die Kumulierungsgrenze deckelt die SUMME aller öffentlichen Mittel
  // auf 50 % der Gesamtkosten, nicht unseren Betrag allein.
  "wetter-ruhr-balkonsolar",
  // Aufgenommen am 06.09.2026, ausgeschöpft — Förderkulisse und Programmseite
  // im Volltext gelesen. Die Prüfformen fehlen noch, und zwei davon kennt das
  // Modell nicht: der Gesamtdeckel von 4.900 € je Liegenschaft über alle
  // Maßnahmen hinweg und der Bonus für Wohngeld-, Bürgergeld-,
  // Grundsicherungs- oder BAföG-Bezug.
  "braunschweig-regenerative-energien",
  // Aufgenommen am 07.09.2026, Förderübersicht der Stadt im Rohtext gelesen.
  // Die Prüfformen fehlen noch: Der Stichtag „vor dem 1. Januar 2024 im
  // Marktstammdatenregister angemeldet" hängt an einer Angabe, die der Rechner
  // nicht erhebt, und die Deckelung auf 100 % des Kaufpreises ist eine Form,
  // die das Modell nicht ausdrückt.
  "gelsenkirchen-steckersolar",
  // Aufgenommen am 09.09.2026, Amtsseite bzw. Richtlinie im Volltext gelesen.
  // Die Prüfformen fehlen noch, und je eine Bedingung kennt das Modell gar
  // nicht: In Konstanz der MONTAGEORT (gefördert wird nur, was am Balkon, an
  // der Fassade oder auf einem Nebengebäude hängt — Dachmontage ist seit 2025
  // ausgeschlossen), im Landkreis Oldenburg der Kaufstichtag „nicht vor dem
  // 1. Januar 2026" und die Nachrangigkeit gegenüber EU-, Bundes- und
  // Landesmitteln. Dass der Zuschuss den Speicher voraussetzt, steht dagegen
  // seit heute IM Modell (`balkonNurMitSpeicher`) und nicht nur im Text.
  "konstanz-breitenfoerderung", "landkreis-oldenburg-steckersolar",
  // Die 47 Programme des 09.09.2026 — der abgearbeitete Arbeitsvorrat des
  // Screenings. Jede Zahl an der Amtsseite gelesen, die Prüfformen fehlen noch.
  // Sie sind hier die größere Arbeit als sonst: Ein Drittel dieser Programme
  // verlangt den Antrag VOR dem Kauf, mehrere kennen zweistufige Verfahren, und
  // vier hängen an Angaben, die das Modell gar nicht führt (Einkommensgrenze,
  // Wohnberechtigungsschein, Zwei-Familien-Haus, Montageort).
  "delbrueck-steckersolar", "denzlingen-klimaschutz", "kenzingen-aktiv-klimaschutz",
  "kirchdorf-amper-mini-pv", "vg-bad-breisig-balkonkraftwerke", "waltrop-steckersolar",
  "straelen-steckerfertige-pv", "kranenburg-steckerfertige-pv", "vg-brohltal-balkonkraftwerke",
  "vg-alzey-land-balkon-speicher", "edewecht-klimabonus", "gerbrunn-stecker-solar",
  "holzmaden-balkonkraftwerke", "vg-nahe-glan-balkonkraftwerke", "taunusstein-balkonsolar",
  "schmelz-solar-balkonkraftwerk", "waldalgesheim-balkon-pv", "recklinghausen-stecker-solar",
  "werne-steckersolar", "gerlingen-balkonmodule", "bissendorf-klimaschutz",
  "kerken-stecker-solar", "gruenwald-umweltschutz", "aulendorf-plugin-solar",
  "amstetten-steckerfertige-pv", "vg-rennerod-klimaschutz", "windhagen-balkonkraftwerke",
  "koenigswinter-steckersolar", "delmenhorst-balkon-solar", "kronberg-klimaschutz",
  "bad-duerkheim-stecker-solar", "sinsheim-balkonkraftwerke", "worms-balkon-pv",
  "reichshof-pv", "bernkastel-wittlich-balkonkraftwerke", "trier-saarburg-balkonkraftwerke",
  "witten-balkon-solarmodule", "neuenrade-stecker-solar", "wassenberg-stecker-solar",
  "roggenburg-pv-kleinstanlagen", "altdorf-landshut-balkonkraftwerk", "feldkirchen-westerham-klimaschutz",
  "roedinghausen-sonnenenergie", "leipzig-stecker-solar", "emsdetten-proklima",
  "westerkappeln-balkonkraftwerke", "sprendlingen-gensingen-balkonsolar",
  // Aufgenommen am 11.09.2026, Amtsseiten und beide Richtlinien der StädteRegion
  // im Volltext gelesen. Die Prüfformen fehlen noch; die tragende Bedingung der
  // Stadt Aachen (nur Mehrfamilienhaus oder Betriebsgebäude) kennt das Modell
  // als GEBÄUDEART bereits, aber nicht als Ausschluss des Einfamilienhauses.
  "aachen-solar", "staedteregion-aachen-ee",
  // Added 23 Sep 2026 as an exhausted county programme (no calculation fields).
  // Its load-bearing condition is an INCOME cap — household net income up to
  // twice the Buergergeld rate — which the model cannot express and the
  // calculator never asks. A check form covering only the application date
  // would suggest the remaining conditions are met once the date fits, for a
  // programme that has no money left. Written out rather than half-captured.
  "gifhorn-kreis-balkonkraftwerke",
  // Added 17 Sep 2026 as a closed historical programme (no calculation fields).
  "mainz-bingen-balkonkraftwerke",
  "mayen-koblenz-balkonkraftwerke",
  // Added 21 Sep 2026 as a closed historical programme (no calculation fields).
  "kaarst-stecker-pv",
  // Added 21 Sep 2026: building-age rule (completed by 31.12.2022), specialist
  // installation and the 80 % combined cap for balcony kits have no test form.
  "niederkruechten-klimaschutz",
  // Added 21 Sep 2026 as a closed historical programme (no calculation fields).
  "nettetal-steckermodule",
  // Added 22 Sep 2026: tenants and condominium residents only (house owners
  // excluded), four-week invoice window and first-come budget have no test form.
  "cremlingen-balkonkraftwerk",
  // Added 22 Sep 2026: purchase only after the receipt confirmation, 400 W module
  // minimum, three-year own use and council budget release have no test form.
  "goedenstorf-stecker-solar",
  // Added 22 Sep 2026: exhausted; two-month main residence, application after
  // installation and three-year operation have no test form.
  "grossheide-balkonmodule",
  // Added 22 Sep 2026: closed; dwelling-unit limit, dealer purchase and the
  // exclusion after a municipal grant have no test form.
  "rhein-kreis-neuss-stecker-pv",
  // Added 22 Sep 2026: closed; five-year own use and the DGS listing of the
  // inverter have no test form.
  "berkenthin-balkon-solar",
  "altenkirchen-balkonkraftwerke",
  "altenkirchen-solarspeicher",
  // Added 23 Sep 2026: Mueden (Aller). Guideline read in full. The usual
  // application-before-purchase rule does apply here, so a test form is possible
  // -- it just has not been written in this run, and half-recorded is not an
  // option. Three further conditions have no test form at all: at most two
  // modules with 600 or 800 W of inverter power per dwelling unit, the five-year
  // use in that same unit, and the factory-new purchase from a specialist
  // dealer. All of them stand in full on the card.
  // Added 23 Sep 2026: Garching b. Muenchen. Guideline read in full (scanned PDF,
  // read as images). No test form in this run, and one condition has none at all:
  // the grant requires that the work is only started AFTER the approval notice,
  // not merely after the application -- stricter than the federal rule and the
  // one condition whose breach costs the whole grant. It stands in full on the
  // card, together with the storage ratio of 0.5 to 2 kWh per kWp, which is the
  // reason the storage part carries no calculation field.
  "garching-energiespar",
  // Added 23 Sep 2026: Petershausen. Closed programme without a rate; the
  // municipal page is four sentences long and names no condition at all, so
  // there is nothing to turn into a test form.
  "petershausen-photovoltaik",
  // Added 23 Sep 2026: Bruehl (Baden). Guideline read in full (28 pages).
  // No test form in this run. Two conditions have none at all: the obligation
  // under section 23 of the Baden-Wuerttemberg climate act, which depends on
  // whether the roof is being renovated, and the 10 kWp threshold above which
  // the roof rate starts. Both stand in full on the card, and the threshold is
  // the reason the roof part carries no calculation field.
  "bruehl-baden-umweltschutz",
  // Added 23 Sep 2026: Wertingen. Exhausted programme, no published guideline;
  // the only figures the town names stand in a retrospective list inside its
  // 2023 climate concept, which is not a rule anyone could be held to. There
  // is nothing to turn into a test form.
  "wertingen-photovoltaik",
  "mueden-aller-balkonsolar",
  // Added 23 Sep 2026: Meinersen. Guideline read as images (scanned, no text
  // layer). No test form, and the reason is the same one that keeps the entry
  // from carrying a calculation field: the published guideline only covers a NEW
  // building on a previously undeveloped plot, while the municipality announces
  // that existing buildings have been eligible since 2022 and that the guideline
  // is being revised. A test form would hold the user's project against a rule
  // the municipality itself says is out of date. The conditions stand in full on
  // the card.
  "meinersen-solar",
  "cochem-zell-solarstromspeicher",
  // Added 19 Sep 2026: discretionary EKM grant without a rate; the committee
  // decision, the start-after-receipt rule and the new-building exclusion have
  // no test form.
  "ekm-altenkirchen",
  // Added 19 Sep 2026: guideline read in full; the one-year application window
  // after installation and the one-per-dwelling limit have no test form.
  "mehren-balkonkraftwerke",
  // Added 19 Sep 2026: income condition (Wohngeld/Bürgergeld), green tariff,
  // one-per-meter and the 3-year operating duty have no test form.
  "holzminden-solarfair",
  // Added 18 Sep 2026: exhausted VG programme, guideline read in full; the
  // test forms (application before contract, 3-/12-month deadlines) are missing.
  "vg-hachenburg-erneuerbare-energien",
  // Added 18 Sep 2026: guideline read in full; building age (25 years) and the
  // 15,000 EUR total-cost floor have no test form and no model field.
  "vg-wallmerod-lange-leben-im-dorf",
  // Added 18 Sep 2026: guideline read in full; owner-only eligibility, crediting of
  // previously funded capacity and the commissioning-before-application order
  // have no test form yet.
  "neustadt-wied-pv-speicher",
  // Added 18 Sep 2026: guidelines read in full; the prior energy check, the
  // existing-building rule and the own-consumption sizing of the roof system have
  // no test form yet (roof system is therefore not computed at all).
  "staudt-energieeffizienz",
];

/**
 * Die erfassten Prüfungen je Programm-Id.
 *
 * Erfassungsregel: Ein Programm kommt erst hier hinein, wenn **alle** seine
 * Bedingungen zugeordnet sind — halb erfasst gibt es nicht, sonst entsteht
 * genau die stille Lücke, die der Test verhindern soll.
 */
export const FUNDING_CHECKS: Record<string, FundingChecks> = {
  // Landkreis Erlangen-Höchstadt, Wärmepumpen-Zuschuss (aufgenommen 20.09.2026).
  // Prüfbar ist hier genau EINES: der Antragszeitpunkt. Alles andere sind
  // Geräteeigenschaften (Kältemittel, Effizienzstufe, BAFA-Listung, Heizkreis),
  // die der Rechner nicht kennt — deshalb Hinweis, nicht Prüfung, und deshalb
  // trägt das Programm auch keinen Abzug.
  // Universitätsstadt Tübingen, Sanierungsprämie Modul B II (aufgenommen
  // 24.09.2026). Prüfbar ist auch hier genau EINES: der Antragszeitpunkt. Die
  // eigentliche Hürde — der individuelle Sanierungsfahrplan — ist keine
  // Eigenschaft des Vorhabens, sondern eine bepreiste Vorstufe, die der
  // Rechner nicht erhebt; deshalb Hinweis, nicht Prüfung, und deshalb trägt
  // das Programm auch keinen Abzug.
  "tuebingen-sanierungspraemie-wp": {
    pruefungen: [
      {
        ausBedingung: "Die eingereichte Rechnung darf höchstens sechs Monate alt sein, frühestes Rechnungsdatum ist der 1. Januar 2026; der Antrag wird also nach der Installation gestellt, nicht vorher",
        // Die sechs Monate stehen bewusst NICHT als `fristMonate`: Sie laufen
        // ab dem RECHNUNGSDATUM, nicht ab Inbetriebnahme. Der Zeitpunkt hier,
        // die Frist im Text daneben — dieselbe Trennung wie bei
        // Erlangen-Höchstadt.
        pruefung: { art: "antrag-zeitpunkt", zeitpunkt: "nach-inbetriebnahme" },
      },
    ],
    durchRegion: [
      "Das Gebäude muss im Siedlungsgebiet des Gemeindegebietes Tübingen liegen",
    ],
    hinweise: [
      {
        ausBedingung: "Zwingende Voraussetzung ist ein individueller Sanierungsfahrplan nach der Bundesförderung Energieberatung für Wohngebäude, der höchstens fünf Jahre alt ist und in dem die Wärmepumpe als Maßnahme empfohlen wird — ohne ihn gibt es nichts",
        warum: "Der Rechner erhebt nicht, ob jemand eine geförderte Energieberatung hinter sich hat. Die Bedingung steht als erste auf der Karte, weil sie für den Regelnutzer die praktisch wirksamste ist — und weil sie zugleich der Grund ist, warum dieses Programm nichts abzieht.",
      },
      {
        ausBedingung: "Gefördert wird der Austausch einer fossil betriebenen Heizung (Erdgas, Flüssiggas, Heizöl); hybride Anlagen, die weiterhin mit fossilen Anteilen heizen, werden nicht gefördert",
        warum: "Der Rechner kennt zwar Gas und Öl als alte Heizung, aber keine Prüfform für den Brennstoff der Altanlage — und ob jemand hybrid weiterheizt, weiß er ohnehin nicht.",
      },
      {
        ausBedingung: "Die Anlage muss auf der BAFA-Liste der förderfähigen Wärmepumpen mit Prüf- und Effizienznachweis stehen",
        warum: "Geräteeigenschaft aus einer fremden Liste — der Rechner kennt das Modell nicht.",
      },
      {
        ausBedingung: "Geplante oder erhaltene Mittel aus dem KfW-Zuschuss 458 und der städtische Zuschuss dürfen zusammen 60 % der Investitionskosten für die Wärmepumpe nicht übersteigen; sonst entfällt die städtische Förderung. Achtung: Wer beim Bund über 60 % liegt, kann durch den städtischen Zuschuss dort mehr verlieren, als er hier gewinnt",
        warum: "Zwei verschiedene 60-%-Grenzen mit verschiedenen Bezugsgrößen und verschiedener Rechtsfolge — die der Stadt ist eine Fördervoraussetzung, die des Bundes kürzt im Überschreitungsfall die Bundesmittel. Verrechnen darf man sie nicht, und weil hier nichts abgezogen wird, muss der Satz beim Nutzer stehen.",
      },
      {
        ausBedingung: "Antragsberechtigt sind Privatpersonen, Wohnungseigentümergemeinschaften, Projekte des Mietshäuser Syndikates sowie Mieterinnen und Mieter für ihr Mietobjekt; Mieter brauchen die Zustimmung der Eigentümerseite oder der Eigentümergemeinschaft",
        warum: "Der Wärmepumpen-Rechner erhebt die Wohnform nicht; ausgeschlossen ist hier ohnehin niemand, es geht nur um eine zusätzliche Zustimmung.",
      },
      {
        ausBedingung: "Keine Antragsberechtigung besteht für Sanierungsmaßnahmen, die zur Anrechnung für das Erneuerbare-Wärme-Gesetz des Landes genutzt werden oder anderen gesetzlichen Vorgaben unterliegen",
        warum: "Die schärfste Klausel des Programms und zugleich die, deren Reichweite aus dem Text NICHT zu entscheiden ist: Sie hängt an der tatsächlichen Anrechnung, nicht an der Eignung. Deshalb steht hier der Wortlaut der Stadt und kein Urteil von uns.",
      },
      {
        ausBedingung: "Je Gebäude wird in einem Fünf-Jahres-Zeitraum höchstens einmal eine Sanierungsprämie ausgezahlt; je Gebäude ist nur eines der Module A oder B möglich, die Module B I (Gebäudehülle) und B II (Wärmepumpe) lassen sich kombinieren",
        warum: "Der Rechner kennt die Förderhistorie des Gebäudes nicht und rechnet ohnehin nur die Wärmepumpe.",
      },
      {
        ausBedingung: "Eine Kombination dieses Förderprogramms mit anderen Förderprogrammen der Universitätsstadt Tübingen ist nicht zulässig",
        warum: "Betrifft die beiden anderen Tübinger Einträge. Heute kollidiert nichts, weil keines der drei einen Rechenwert trägt und PV- und Wärmepumpen-Rechner getrennt fragen — der Satz ist die Warnung für den Tag, an dem sich das ändert.",
      },
      {
        ausBedingung: "Der ausgezahlte Betrag kann die tatsächlichen Kosten der Maßnahme nicht übersteigen",
        warum: "Bei einer Pauschale von 500 € theoretisch; der Rechner rechnet ohnehin mit realen Anlagenkosten weit darüber.",
      },
      {
        ausBedingung: "Es handelt sich um eine Freiwilligkeitsleistung: vergeben wird im Windhundprinzip nach Eingang vollständiger Unterlagen und nur, solange Haushaltsmittel da sind; ein Rechtsanspruch besteht nicht, unvollständige Anträge werden abgelehnt und Unterlagen nicht nachgefordert",
        warum: "Haushaltsvorbehalt des Trägers — nicht am Vorhaben des Nutzers prüfbar.",
      },
      {
        ausBedingung: "Die Förderung ist zurückzuzahlen, wenn sie durch unrichtige oder unvollständige Angaben erwirkt wurde",
        warum: "Nachträgliche Rechtsfolge, keine Eigenschaft des Vorhabens.",
      },
    ],
  },

  "erlangen-hoechstadt-waermepumpe": {
    pruefungen: [
      {
        ausBedingung: "Der Antrag muss spätestens zwei Monate nach dem Rechnungsdatum vorliegen — später eingereichte Anträge werden nach dem Antragsformular nicht berücksichtigt",
        // Die Frist steht bewusst NICHT als `fristMonate`: Sie läuft ab dem
        // RECHNUNGSDATUM, nicht ab Inbetriebnahme, und die Rechnung kann vorher
        // liegen. Als Monatsfrist ab Inbetriebnahme gerechnet wäre sie zu
        // großzügig — also die gefährliche Richtung. Der Zeitpunkt hier, die
        // zwei Monate im Text daneben.
        pruefung: { art: "antrag-zeitpunkt", zeitpunkt: "nach-inbetriebnahme" },
      },
    ],
    durchRegion: [
      "Die Wärmepumpe muss in einem Gebäude im Landkreis Erlangen-Höchstadt eingebaut und betrieben werden",
    ],
    hinweise: [
      {
        ausBedingung: "Anders als bei der Bundesförderung wird hier NACH dem Kauf beantragt: Der Kaufbeleg mit dem Wärmepumpen-Modell gehört als Anlage zum Antrag",
        warum: "Die Reihenfolge steht schon als Prüfung; dieser Satz grenzt sie gegen die BEG-Regel „Antrag vor Vorhabenbeginn\" ab, die im selben Ergebnis daneben steht.",
      },
      {
        ausBedingung: "Gefördert wird nur die Neu-Anschaffung — ein gebrauchtes Gerät ist ausgeschlossen",
        warum: "Der Rechner rechnet ohnehin mit einer neuen Anlage; ob jemand ein gebrauchtes Gerät einbaut, weiß er nicht.",
      },
      {
        ausBedingung: "Die Wärmepumpe muss in der Liste der förderfähigen Wärmepumpenanlagen des BAFA stehen und ihre Wärme an einen wassergeführten Heizkreis abgeben",
        warum: "Geräteeigenschaft aus einer fremden Liste — der Rechner kennt weder das Modell noch den Heizkreis.",
      },
      {
        ausBedingung: "Natürliches Kältemittel ohne Halogene — das Antragsformular lässt R290 Propan, R600a Isobutan, R1270 Propen, R717 Ammoniak, R718 Wasser und R744 Kohlendioxid zu. Die marktüblichen Kältemittel R32, R410A und R454C enthalten Fluor und sind damit ausgeschlossen",
        warum: "Geräteeigenschaft; das Kältemittel steht im Datenblatt, nicht in den Angaben des Nutzers.",
      },
      {
        ausBedingung: "Mindest-Effizienz nach der BAFA-Liste, jahreszeitbedingte Leistungszahl (SCOP) für mittleres Klima: Luft/Wasser 3,3 bei 55 °C bzw. 4,6 bei 35 °C (ηs 130 bzw. 180 %), Sole/Wasser 3,7 bzw. 5,3 (ηs 140 bzw. 205 %), Wasser/Wasser 4,2 bzw. 6,2 (ηs 160 bzw. 240 %). Diese Schwellen liegen über denen der Bundesförderung",
        warum: "Geräteeigenschaft, und der genaue Anteil der Geräte, die diese Schwellen halten, ist nicht gemessen — genau deshalb zieht das Programm auch nichts ab.",
      },
      {
        ausBedingung: "Befristet bis 31.12.2026, vorbehaltlich der im Landkreishaushalt 2026 verfügbaren Mittel",
        warum: "Haushaltsvorbehalt des Trägers — nicht am Vorhaben des Nutzers prüfbar.",
      },
    ],
  },

  "bund-nullsteuer": {
    ohneAntrag: {
      warum:
        "Steuerregel nach § 12 Abs. 3 UStG — der Nullsatz wird beim Kauf angewandt, " +
        "es gibt weder Antrag noch Frist noch einen Topf, der leerlaufen kann.",
    },
    pruefungen: [
      {
        ausBedingung:
          "Anlage an einer Wohnung oder einem dem Gemeinwohl dienenden Gebäude — bis 30 kWp ohne Nachweis der Gebäudeart",
        // EINE Bedingung mit zwei Nachweiswegen, nicht zwei Bedingungen: siehe
        // die Begründung an `vermutetBisKwp`. Eine Größenprüfung steht hier
        // bewusst NICHT mehr — der Nullsatz kennt keine Leistungsobergrenze.
        pruefung: { art: "gebaeude-art", nur: ["wohn", "gruendach", "fassade", "denkmal"], vermutetBisKwp: 30 },
      },
    ],
    durchRegion: [],
    hinweise: [],
  },

  "bund-kfw270": {
    pruefungen: [
      {
        ausBedingung: "Antrag vor Vorhabenbeginn über die Hausbank",
        pruefung: { art: "antrag-zeitpunkt", zeitpunkt: "vor-auftrag" },
      },
      {
        ausBedingung: "Antrag vor Vorhabenbeginn über die Hausbank",
        pruefung: { art: "antragsweg", weg: "hausbank" },
      },
    ],
    durchRegion: [],
    hinweise: [],
  },

  "frankfurt-klimabonus": {
    pruefungen: [
      {
        ausBedingung: "Erst nach Zuwendungsbescheid mit der Maßnahme beginnen",
        pruefung: { art: "antrag-zeitpunkt", zeitpunkt: "bescheid-vor-start" },
      },
      {
        ausBedingung: "Online-Antrag mit Registrierung",
        pruefung: { art: "antragsweg", weg: "online", registrierung: true },
      },
      {
        ausBedingung: "Batteriespeicher und Ladesäulen nur in Kombination mit einer neuen PV-Anlage",
        pruefung: { art: "anlage-speicher", regel: "nur-mit-neuer-pv" },
      },
      {
        ausBedingung:
          "Balkonkraftwerke werden seit dem 03.06.2025 nicht mehr gefördert",
        pruefung: { art: "anlage-balkon", regel: "ausgeschlossen" },
      },
    ],
    durchRegion: ["Grundstück im Stadtgebiet Frankfurt"],
    hinweise: [
      {
        ausBedingung: "Pflichtmaßnahmen werden nicht gefördert",
        warum:
          "Ob eine Maßnahme gesetzlich vorgeschrieben ist, hängt am Gebäude und am " +
          "Zeitpunkt — das weiß der Rechner nicht. Für eine neue Dachanlage auf einem " +
          "Bestandsgebäude ist es der Regelfall, dass keine Pflicht besteht; sicher " +
          "sagen kann es nur die Stadt.",
      },
      {
        ausBedingung: "Die Investitionen dürfen nicht zu einer Mieterhöhung führen",
        warum:
          "Betrifft nur, wer vermietet, und ist eine Zusage über die Zukunft — nicht " +
          "aus den Eingaben ableitbar. Für Selbstnutzer ohne Belang.",
      },
    ],
  },

  "nidda-solar": {
    pruefungen: [
      {
        ausBedingung: "Die Anlage muss mindestens 4 kWp leisten — kleinere Dachanlagen werden nicht gefördert",
        pruefung: { art: "anlage-groesse", minKwp: 4 },
      },
      {
        ausBedingung: "Der Antrag wird erst NACH Inbetriebnahme gestellt, und zwar binnen vier Wochen",
        // Die Frist steht bewusst NICHT als `fristMonate` da. Die Richtlinie
        // sagt „binnen vier Wochen"; ein Monat hat 28 bis 31 Tage, und die
        // Rundung ginge in die gefährliche Richtung — wer sich auf einen Monat
        // verlässt, verpasst die Frist um bis zu drei Tage. Lieber der bloße
        // Zeitpunkt hier und die vier Wochen im Text daneben.
        pruefung: { art: "antrag-zeitpunkt", zeitpunkt: "nach-inbetriebnahme" },
      },
      {
        ausBedingung: "Antrag und Nachweise nur digital über das Online-Formular der Stadt",
        pruefung: { art: "antragsweg", weg: "online" },
      },
      {
        // JE TECHNIK GETRENNT seit 17.09.2026: Die PV-Richtlinie nennt zehn
        // Jahre für Anlage und Speicher, die Mini-PV-Richtlinie drei Jahre.
        // Hier stand eine gemeinsame Zeile mit zehn Jahren.
        ausBedingung: "Haltedauer zehn Jahre für Anlage und Speicher, sonst wird der Zuschuss zurückgefordert",
        pruefung: { art: "bindung", jahre: 10 },
      },
      {
        ausBedingung: "Haltedauer drei Jahre im Stadtgebiet, gerechnet ab der Auszahlung",
        pruefung: { art: "bindung", jahre: 3 },
      },
      {
        ausBedingung: "Nicht gefördert: Eigenleistung und gebrauchte Teile",
        pruefung: { art: "ausfuehrung", eigenleistungAusgeschlossen: true },
      },
    ],
    durchRegion: [],
    hinweise: [
      {
        ausBedingung: "Die Anlage muss im Marktstammdatenregister registriert sein",
        warum:
          "Gilt ohnehin für jede Anlage (§ 5 MaStRV) und ist keine zusätzliche Hürde " +
          "dieses Programms — die Stadt macht die Auszahlung nur ausdrücklich davon " +
          "abhängig. Unser Anmelde-Ratgeber führt durch den Vorgang.",
      },
      {
        ausBedingung: "Gefördert wird nur, was im Förderzeitraum durchgeführt wird — er endet am 31. Dezember 2026",
        warum:
          "Der Rechner rechnet keine Inbetriebnahme mit Datum; das Ende des " +
          "Förderzeitraums steht deshalb als `endetIso` am Programm und schaltet " +
          "den Abzug ab. Als Bedingung bleibt es sichtbar, damit niemand im " +
          "Dezember eine Anlage bestellt, die im Januar in Betrieb geht.",
      },
      {
        ausBedingung: "Nicht gefördert werden Anlagen, die aus einer rechtlich bindenden Verpflichtung heraus installiert werden müssen, etwa nach dem Gebäudeenergiegesetz",
        warum:
          "Ob jemand aus einer gesetzlichen Pflicht heraus baut, steht in keiner " +
          "Eingabe des Rechners. Die Klausel steht nur in der PV-Richtlinie — eine " +
          "Pflicht zum Balkonkraftwerk gibt es nicht.",
      },
      {
        ausBedingung: "Je Haushalt wird im Förderzeitraum nur eine Anlage gefördert",
        warum:
          "Ob dieser Haushalt im selben Jahr schon ein Balkonkraftwerk gefördert " +
          "bekommen hat, weiß nur er selbst.",
      },
      {
        ausBedingung: "Kein Ersatzneukauf und keine Erweiterung einer bestehenden Anlage",
        warum:
          "Der Rechner rechnet eine Neuanlage; ob jemand in Wahrheit erweitert oder " +
          "ersetzt, steht in keiner Eingabe. Wer eine bestehende Anlage aufstockt, " +
          "muss es selbst wissen.",
      },
      {
        ausBedingung: "Je Wohngebäude eine Anlage im Förderzeitraum; Anlage und Speicher zusammen zählen als eine",
        warum:
          "Setzt voraus zu wissen, ob für dieses Gebäude im laufenden Jahr schon " +
          "einmal gefördert wurde — eine Auskunft, die nur die Stadt hat.",
      },
      {
        ausBedingung: "Höchstens zwei Module je Haushalt, höchstens 800 W Einspeisung",
        warum:
          "Die 800 W sind seit 2024 ohnehin die gesetzliche Obergrenze für " +
          "Steckersolar und damit im Balkon-Rechner der Normalfall. Die Modulzahl " +
          "steht in keiner Prüfform, weil sie sonst nirgends vorkommt — ein eigenes " +
          "Feld für einen einzigen Fall wäre Zeremonie.",
      },
      {
        ausBedingung: "Freiwillige Leistung ohne Rechtsanspruch, nur solange Mittel vorhanden sind",
        warum:
          "Gilt für praktisch jedes kommunale Programm und ist nicht aus Eingaben " +
          "prüfbar. Dass der Topf leerlaufen kann, trägt bereits `capped: true`.",
      },
      {
        ausBedingung: "Wohneigentum in Nidda ist Voraussetzung",
        warum:
          "Die Prüfform `antragsteller` gilt dem ganzen Programm; hier hängt die " +
          "Berechtigung an der TECHNIK. Seit die Bedingungen je Technik getrennt " +
          "sind, steht der Satz wenigstens nur noch dort, wo er zutrifft — als " +
          "Prüfung ließe er sich erst erfassen, wenn auch die Prüfformen eine " +
          "Technik-Dimension bekommen.",
      },
      {
        ausBedingung: "Hauptwohnsitz in Nidda genügt — Mieterinnen und Mieter sind ausdrücklich antragsberechtigt",
        warum:
          "Dieselbe Grenze wie beim Wohneigentum, nur andersherum: eine Erleichterung " +
          "statt einer Hürde, und genau der Punkt, auf den die Stadt zielt. Sie steht " +
          "im Balkon-Reiter und nirgends sonst.",
      },
    ],
  },
};

// ── Ableitungen für den Flow ─────────────────────────────────────────────────

export function checksFor(programId: string): FundingChecks | undefined {
  return FUNDING_CHECKS[programId];
}

/** Der Antragszeitpunkt eines Programms — oder undefined, wenn nicht erfasst. */
export function antragsZeitpunkt(programId: string) {
  const found = checksFor(programId)?.pruefungen.find(
    (b): b is Bedingungspruefung & { pruefung: Extract<Pruefung, { art: "antrag-zeitpunkt" }> } =>
      b.pruefung.art === "antrag-zeitpunkt",
  );
  return found?.pruefung;
}

/**
 * Klartext-Satz zum Antragszeitpunkt. Bewusst je Programm aus den Daten und
 * NICHT als allgemeine Warnung — die Richtung stimmt nicht überall.
 */
export function antragsZeitpunktSatz(programId: string): string | null {
  const z = antragsZeitpunkt(programId);
  if (!z) return null;
  switch (z.zeitpunkt) {
    case "vor-auftrag":
      return "Der Antrag muss gestellt sein, bevor du den Auftrag vergibst. Wer zuerst beauftragt, bekommt nichts mehr.";
    case "bescheid-vor-start":
      return "Der Antrag reicht nicht — du musst den Bewilligungsbescheid abwarten und darfst erst danach beauftragen.";
    case "nach-inbetriebnahme":
      return z.fristMonate
        ? `Hier wird umgekehrt beantragt: erst nach Inbetriebnahme, und zwar innerhalb von ${z.fristMonate} Monaten.`
        : "Hier wird umgekehrt beantragt: erst nach der Inbetriebnahme.";
  }
}

/** Programme, deren Antragsfrist mit einer bereits erfolgten Beauftragung verpasst ist. */
export function verpasstDurchBeauftragung(programId: string): boolean {
  const z = antragsZeitpunkt(programId);
  return z?.zeitpunkt === "vor-auftrag" || z?.zeitpunkt === "bescheid-vor-start";
}

/** Alle Programme, die eine Prüfform haben — Grundlage für Tests und Flow. */
export function erfassteProgramme(): FundingProgram[] {
  return allFundingPrograms().filter((p) => FUNDING_CHECKS[p.id]);
}
