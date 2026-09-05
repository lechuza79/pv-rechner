> **RECHERCHE, NICHT KATALOG.** Kein Wert aus dieser Datei steht in
> `lib/funding-programs.ts`. Wer ihn dort einträgt, prüft ihn vorher wie eine
> Neuaufnahme (`scripts/waechter-gate.md` → „Ein Förderprogramm neu aufnehmen"):
> Fundstelle selbst aufgeschlagen, nicht aus dieser Zusammenfassung übernommen.
>
> **Erhoben am 01.09.2026** von neun parallelen Läufen, zusammengesetzt aus
> ihren Einzelberichten. Die sechs Muster unter „Was beim Einpflegen zu beachten
> ist" sind der eigentliche Ertrag — sie entscheiden, ob aus einem belegten
> Datum später eine richtige oder eine falsche Aussage wird.
>
> **Ein Befund dieser Recherche war falsch und ist geprüft:** Der Abschnitt
> „Widersprüche zum Katalog" führt Köln als „nimmt seit 27.08.2024 keine Anträge
> mehr an". Am selben Tag im Rohtext beider Kölner Seiten nachgelesen: Der Satz
> steht unter der Überschrift „Ausgelaufene Förderprogramme" und gilt den
> Vorgängern von 2018; das laufende Programm führt seine Staffel unverändert
> (2–5 kWp 1.500 € … über 14 kWp 2.500 €), zellgleich mit dem Katalog. Köln
> bleibt aktiv. Die Adresse im Katalog zeigt seitdem auf die Programmseite statt
> auf die Sammelseite, damit die Falle nicht ein zweites Mal zuschnappt.
>
> Die übrigen drei dort genannten Widersprüche (Düsseldorf, die
> Selbstwidersprüche von Nidda/Dietmannsried/Nottuln, Schweinfurts
> Platzhalterbild) sind **ungeprüft** — sie bewegen kein Geld, stehen aber
> weiter auf der Liste.

# Laufzeiten der kommunalen Förderprogramme

Stand der Erhebung: 2026-09-01 · Grundmenge: alle 108 Programme mit `level !== "bund"` aus `lib/funding-programs.ts`.

## Auszählung

| | Anzahl | von 108 |
|---|---:|---:|
| **abgerufen** (Quelle angesehen) | 108 | 100 % |
| **nie angesehen** | 0 | 0 % |
| davon abgerufen, aber Quelle gesperrt/tot | 0 | 0 % |
| **mit Startdatum** | 81 | 75 % |
| **mit Enddatum** | 23 | 21 % |
| **mit Beschlussdatum** | 36 | 33 % |
| mit Vorgänger-Hinweis | 49 | 45 % |
| abgerufen, nichts belegbar | 15 | 14 % |

**„Abgerufen, nichts belegbar" und „nie angesehen" sind zwei verschiedene Befunde** — die Abschnitte unten halten sie getrennt. Eine leere Zeile in der Tabelle heißt nie „geprüft und nichts da"; das steht ausschließlich im Abschnitt „abgerufen, nichts belegbar".

## Was beim Einpflegen zu beachten ist

Sechs Muster sind in mehreren Läufen unabhängig aufgetreten. Sie entscheiden darüber, ob aus einem
belegten Datum später eine richtige oder eine falsche Aussage wird.

**1. Eine Befristung ist kein Programmende.** 23 Einträge tragen einen Wert in `endet`, aber nur
etwa die Hälfte beschreibt ein echtes Programmende (klar belegt u. a. Essen, Köln, Ludwigshafen,
München, Senden). Die übrigen sind Außerkrafttretens-Klauseln der laufenden Fassung — allein der
31.12.2026 kommt fünfmal vor —, Mittelerschöpfungen oder ausdrücklich vorübergehende Annahmestopps
(Bad Homburg, Dortmund). Die Einordnung steht in der Klammer hinter jedem Wert und darf beim
Übernehmen nicht wegfallen; ohne sie wird aus einer Jahresbefristung ein eingestelltes Programm.

**2. „Ausgeschöpft" heißt meist Geldmangel — aber nicht immer.** Bestätigt in beide Richtungen:
Memmingen, Höhr-Grenzhausen, Wietzen, Forstinning und Beratzhausen betrifft es nur das laufende
Haushaltsjahr; bei Ludwigshafen, Dortmund, Krefeld, Rhein-Erft und Wittlich sagt die Amtsseite
dagegen ausdrücklich, dass ab dem Ausschöpfungstag keine Anträge mehr möglich sind. Dort ist das
Datum erfasst, mit dem Vermerk, dass es die Mittelerschöpfung war und keine gesetzte Frist.

**3. Fassungsdatum ist nicht Programmstart.** Der häufigste Fallstrick, gemessen: Mindestens zwölf
Programme laufen in Jahres- oder Mehrjahresauflagen (Heidelberg, Mannheim, Münster, München, Potsdam,
Freiburg, Memmingen, Baden-Baden, Schwerin, Waiblingen, Weinheim, Gailingen). Ihr belegtes `beginnt`
ist der Start der **laufenden Auflage**. Münster sagt es selbst: seit 1997 jährlich neu aufgesetzt.
Wo das zutrifft, steht es in der Klammer hinter dem Wert.

**4. Beschluss, Inkrafttreten und Antragsstart fallen auseinander.** Musterfall Hohenahr: Beschluss
20.07.2023, Beginn rückwirkend zum 01.01.2023 — wer nur das Beschlussdatum nimmt, verliert ein halbes
Jahr. Ludwigshafen trennt Richtlinie (10.09.2024) und Antragsstart (16.09.2024). Maintal trägt zwei
Beschlussdaten im selben Dokument (Stadtverordnetenversammlung 04.11.2024, Ausfertigung 03.03.2026).

**5. Ein Datum im Dateinamen ist kein Beleg — und Linsengericht ist der Beweis.** Die Datei heißt
`20250202-rl-photovoltaik.pdf`, das Dokument datiert durchgängig auf den **02.02.2026**. Wer den
Dateinamen übernimmt, legt das Programm ein volles Jahr zu früh an.

**6. Ein HTTP 200 ist kein gelesenes Dokument.** Zwei Klassen, beide sehen wie ein Erfolg aus:
Scan-PDFs ohne Textebene (Weinheim, Feucht, Poing, Herbrechtingen, Steffenberg, Tegernheim,
Linsengericht, Rhein-Erft-Kreis) geben bei `pdftotext` wortlos nichts zurück — `pdffonts` ist die
Gegenprobe in einer Sekunde. Und Schweinfurt liefert unter beiden Dokumentadressen jeweils dasselbe
4,5-kB-Platzhalterbild statt eines PDF.

**Widersprüche zum Katalog, die auffielen** (nicht geändert, nur vermerkt): Köln steht als „aktiv",
nimmt aber seit 27.08.2024 keine neuen Anträge mehr an. Düsseldorf steht als „pausiert", was sich an
der Stadtrechtssammlung nicht belegen lässt. Niddas eigene Seite widerspricht sich um ein Jahr,
Dietmannsried um einen Tag, Nottuln zwischen Richtlinie und Programmseite. Schönbrunns Adresse im
Katalog trägt einen falschen Slug (antwortet trotzdem mit 200 und der richtigen Seite).

## Tabelle

Vorgänger ist hier nur mit „ja“ vermerkt; der Wortlaut steht unten bei den Zitaten.
Die Quelle ist auf den Host gekürzt — die vollständige Adresse trägt jeder Zitat-Block.

| id | Ort / Träger | Status | beginnt | endet | beschlossen | Vorg. | Herkunft | Snapshot | Quelle |
|---|---|---|---|---|---|---|---|---|---|
| `berlin-solarplus` | IBB / Land Berlin | aktiv | 2026-01-08 | — | — | ja | pdf (+ live) | — | ibb.de |
| `stuttgart-solaroffensive` | Landeshauptstadt Stuttgart | aktiv | 2026-05-01 (aktuelle Fassung; Vo… | — | — | ja | pdf (+ live) | — | stuttgart.de |
| `karlsruhe-klimabonus` | Stadt Karlsruhe | ausgeschoepft | 2022-12-21 (geltende Fassung; Vo… | — | — | ja | pdf (+ live) | — | karlsruhe.de |
| `regensburg-effizient` | Stadt Regensburg | aktiv | 2026-01-01 (geltende PV-Richtlin… | — | — | ja | pdf | — | regensburg.de |
| `wuerzburg-klimastadt` | Stadt Würzburg | aktiv | 2026-04-01 (Richtlinie KlimaStad… | — | — | ja | pdf | — | wuerzburg.de |
| `frankfurt-klimabonus` | Stadt Frankfurt am Main | aktiv | — | — | — | ja | pdf (+ live) | — | frankfurt.de |
| `darmstadt-pv` | Wissenschaftsstadt Darmstadt | aktiv | 2022-06-29 (Förderfähigkeit ab A… | — | — | ja | pdf (+ live) | — | darmstadt.de |
| `badhomburg-energiespar` | Stadt Bad Homburg | pausiert | 2022-08-17 | 2026-08-10 (Annahmesto… | — | — | live | — | bad-homburg.de |
| `nidda-solar` | Stadt Nidda | aktiv | 2022 (erstmalige Solar-/Speicher… | 2026-12-31 (Ende des l… | 2026 (Fortsetzung für … | ja | live + pdf | — | nidda.de |
| `koeln-pv` | Stadt Köln | aktiv | 2023-10-02 (Programm "Photovolta… | 2024-08-27 (seitdem ke… | 2023-09-07 (Rat der St… | ja | pdf (+ live) | — | stadt-koeln.de |
| `duesseldorf-klimafreundlich` | Stadt Düsseldorf | pausiert | 2025-01-01 | — | — | — | live (amtliche Stadtrechtssammlung, Ziffer 19.303) | — | duesseldorf.de |
| `hannover-proklima` | Region Hannover | aktiv | 2026-01-01 (Förderprogramm 2026;… | 2026-10-31 (Höchstlauf… | — | ja | pdf (+ live) | — | proklima-hannover.de |
| `bonn-solares` | Bundesstadt Bonn | ausgeschoepft | — | — | — | — | live | — | bonn.de |
| `goettingen-klimafonds` | Stadt Göttingen | ausgeschoepft | — | — | — | — | live | — | nachhaltigkeit.goettingen.de |
| `freiburg-stromerzeugung` | Stadt Freiburg im Breisgau | ausgeschoepft | — | — | — | — | pdf | — | freiburg.de |
| `heidelberg-rev` | Stadt Heidelberg | aktiv | — | — | 2025-12-18 (Beschluss,… | ja | pdf | — | heidelberg.de |
| `mannheim-solarbonus` | Stadt Mannheim / Klimaschutzagentur | aktiv | — | — | 2026-03-11 (Gemeindera… | ja | pdf | — | api.klima-ma.de |
| `muenster-klimafreundlich` | Stadt Münster | eingestellt | 2024-01-01 (Inkrafttreten der ak… | — | — | ja | pdf | — | stadt-muenster.de |
| `wiesbaden-eswe-speicher` | ESWE Versorgungs AG / Klimaschutzagentur Wiesbaden | aktiv | — | — | — | — | pdf | — | ksa-wiesbaden.de |
| `mainz-kipki-speicher` | Mainzer Stiftung für Klimaschutz / Stadt Mainz | ausgeschoepft | — | ja, aber ohne Datum de… | — | — | live + pdf | — | mainzer-stiftung.de |
| `muenchen-fkg` | Landeshauptstadt München | eingestellt | 2022-10-04 (Inkrafttreten der FK… | 2024-12-18 (ab diesem … | 2022-06-29 und 2023-07… | ja | live + pdf | — | stadt.muenchen.de |
| `bremen-rundumshaus` | BAB Bremer Aufbau-Bank (Land Bremen) | aktiv | — | — | — | — | live + pdf | — | bab-bremen.de |
| `potsdam-klimaschutz` | Landeshauptstadt Potsdam | aktiv | 2026-04-01 (Inkrafttreten der ak… | — | — | ja | pdf + live | — | potsdam.de |
| `dortmund-pv` | Stadt Dortmund | ausgeschoepft | 2025-06-23 (Inkrafttreten der Ri… | 2026-06-05 (Antragssto… | — | — | pdf + live | — | dortmund.de |
| `essen-solar` | Stadt Essen | eingestellt | — | 2025-07-03 | — | ja | live + pdf | — | essen.de |
| `schweinfurt-pv` | Stadt Schweinfurt | eingestellt | — | — | — | — | — | — | schweinfurt.de |
| `osnabrueck-saniert` | Stadt Osnabrück | aktiv | 2020 | — | — | ja | live + pdf | — | bauen.osnabrueck.de |
| `memmingen-ee` | Stadt Memmingen | ausgeschoepft | 2026-06-10 | — | — | ja | live + pdf | — | memmingen.de |
| `baden-baden-pvplus` | Stadtwerke Baden-Baden | aktiv | 2026-01-01 | — | — | ja | pdf | — | stadtwerke-baden-baden.de |
| `schwerin-pv` | Stadtwerke Schwerin | aktiv | 2026-01-01 | — | — | ja | pdf | — | stadtwerke-schwerin.de |
| `hoehr-grenzhausen-energie` | Stadt Höhr-Grenzhausen | ausgeschoepft | 2024-01-01 | — | 2024-02-19 | — | live | — | hoehr-grenzhausen.de |
| `wietzen-pv` | Gemeinde Wietzen | ausgeschoepft | 2022-07-05 | — | — | — | live + pdf | — | weser-aue.de |
| `gaimersheim-energie` | Markt Gaimersheim | aktiv | 2026-01-01 | — | — | — | live | — | gaimersheim.de |
| `dietmannsried-pv` | Markt Dietmannsried | aktiv | 2023-09-28 | — | 2023-09-29 | — | live + pdf | — | dietmannsried.de |
| `ludwigshafen-kipki` | Stadt Ludwigshafen am Rhein | eingestellt | 2024-09-16 | 2026-03 | — | — | live | — | ludwigshafen.de |
| `waiblingen-klimaschutz` | Stadt Waiblingen | pausiert | — | 2026-06-24 | — | ja | live | — | waiblingen.de |
| `herne-klimafoerderung` | Stadt Herne | pausiert | 2023-06-19 | 2023-12-31 | — | ja | archiv | 2024-05-28 16:23:53 | web.archive.org |
| `wolfsburg-pv` | Stadt Wolfsburg | pausiert | 2026-05-14 | 2026-06-14 | — | — | pdf | — | wolfsburg.de |
| `bottrop-solaroffensive` | Stadt Bottrop | ausgeschoepft | 2025-11-01 | — | — | ja | pdf | — | bottrop.de |
| `krefeld-klimafreundlich` | Stadt Krefeld | ausgeschoepft | 2024-12-04 | 2024-12-04 (VORBEHALT:… | — | — | live | — | krefeld.de |
| `rhein-erft-energieoffensive` | Rhein-Erft-Kreis | ausgeschoepft | — | 2026-03-18 | — | ja | live | — | rhein-erft-kreis.de |
| `viersen-klimaschutz` | Kreis Viersen | eingestellt | 2023-11 (erstes Foerderfenster d… | 2024-11 (letztes Foerd… | 2024-06-13 (Kreistagsb… | ja | pdf | — | kreis-viersen.de |
| `bergstrasse-speicher` | Kreis Bergstraße | ausgeschoepft | 2024 (Tag nicht belegbar — die A… | 2024-07-30 (faktisches… | — | ja | archiv | 2024-08-28 23:42:45 | web.archive.org |
| `mayen-koblenz-speicher` | Landkreis Mayen-Koblenz | eingestellt | 2024-03 (Inkrafttreten der Richt… | 2024-09-30 (Antragsfri… | 2023-03-27 (Kreistag M… | ja | archiv | PDF 2024-05-24 13:19:13, Programmseite 2024-04-13 11:12:55 | web.archive.org |
| `ennepetal-steckersolar` | Stadt Ennepetal | aktiv | 2026-06-01 | 2026-12-31 (Geltungsen… | — | — | pdf | — | ennepetal.de |
| `wittlich-balkonkraftwerke` | Stadt Wittlich | ausgeschoepft | 2024-01-01 | — | — | — | pdf | — | wittlich.de |
| `hochheim-klimaschutz` | Stadt Hochheim am Main | aktiv | 2025-09-04 | — | 2025-09-04 (Stadtveror… | — | pdf | — | serviceportal.hochheim.de |
| `linsengericht-oekologie` | Gemeinde Linsengericht | aktiv | 2026-02-02 (Inkrafttreten der ak… | 2026-12-31 | — | ja | pdf | — | linsengericht.de |
| `holzgerlingen-erneuerbare` | Stadt Holzgerlingen | aktiv | 2023-04-25 (Datum der Richtlinie… | — | — | ja | pdf | — | holzgerlingen.de |
| `wernau-balkonkraftwerke` | Stadt Wernau (Neckar) | aktiv | 2025-03-21 | — | 2024-07-22 (Gemeinderat) | — | live | — | wernau.de |
| `muehlhausen-sulz-pv` | Gemeinde Mühlhausen an der Sulz | aktiv | 2022-05-01 | — | — | — | live | — | muehlhausen-sulz.de |
| `senden-klima` | Gemeinde Senden (Westfalen) | eingestellt | 2021 | 2025 (ab dem Jahr 2025… | 2021 (Auflegung im Kli… | ja | live | — | senden-westfalen.de |
| `maintal-klima` | Stadt Maintal | ausgeschoepft | 2026-04-07 (Inkrafttreten der de… | — | 2024-11-04 (Stadtveror… | ja | pdf | — | daten2.verwaltungsportal.de |
| `roth-klimaschutz` | Stadt Roth | aktiv | 2024-04-01 | — | — | — | live | — | stadt-roth.de |
| `wenden-heizungstausch` | Gemeinde Wenden | ausgeschoepft | 2022-10-01 | — | 2022-09-07 (Ratsbeschl… | — | pdf | — | wenden.de |
| `hohenahr-pv` | Gemeinde Hohenahr | aktiv | 2023-01-01 (rückwirkend; der Bes… | — | 2023-07-20 (Gemeindeve… | — | live | — | hohenahr.de |
| `leimen-klimaschutz` | Stadt Leimen | aktiv | 2026 (nur als Förderjahr belegt:… | — | — | ja | live | — | leimen.de |
| `sandhausen-foerderprogramme` | Gemeinde Sandhausen | aktiv | 2023-04 (Balkonsolaranlagen; die… | — | 2023-06-26 (Gemeindera… | ja | pdf | — | sandhausen.de |
| `helmstedt-umwelt-klima` | Stadt Helmstedt | aktiv | 2025-01-13 (auf die Uhrzeit gena… | — | — | — | pdf | — | stadt-helmstedt.de |
| `nottuln-klimaschutz` | Gemeinde Nottuln | aktiv | 2022-07-11 (Inkrafttreten der Ri… | — | — | ja | pdf | — | nottuln.de |
| `heddesheim-umwelt` | Gemeinde Heddesheim | aktiv | — | — | — | — | live | — | heddesheim.de |
| `nittenau-steckersolar` | Stadt Nittenau | aktiv | 2023-04-01 | — | 2023-05-23 | — | pdf | — | nittenau.de |
| `beratzhausen-effizient` | Markt Beratzhausen | aktiv | — | — | — | — | pdf | — | beratzhausen.com |
| `rietheim-weilheim-pv` | Gemeinde Rietheim-Weilheim | aktiv | — | — | — | ja | live | — | rietheim-weilheim.de |
| `forstinning-energiewende` | Gemeinde Forstinning | ausgeschoepft | 2023-05-01 | — | 2023-04-25 | — | pdf | — | forstinning.de |
| `oftersheim-co2` | Gemeinde Oftersheim | aktiv | 2023-04-01 | — | — | ja | pdf | — | oftersheim.de |
| `bad-rothenfelde-klima` | Gemeinde Bad Rothenfelde | aktiv | — | — | 2023-06-29 | ja | live | — | gemeinde.bad-rothenfelde.de |
| `vilshofen-steckersolar` | Stadt Vilshofen an der Donau | aktiv | 2026-05-01 | — | 2026-04-30 | ja | pdf | — | vilshofen.de |
| `neuwied-balkonkraftwerke` | Stadt Neuwied | aktiv | 2026-04-30 | — | — | — | pdf | — | neuwied.de |
| `rodgau-balkonsolar` | Stadt Rodgau | aktiv | 2024-01-01 | — | — | ja | live | — | rodgau.de |
| `tuebingen-balkon-pv` | Universitätsstadt Tübingen | aktiv | 2026-06-22 | — | — | — | live | — | tuebingen.de |
| `zweibruecken-balkonkraftwerke` | Stadt Zweibrücken | aktiv | 2024-07-01 | — | 2026-01-28 | — | pdf | — | zweibruecken.de |
| `unterhaching-energiesparen` | Gemeinde Unterhaching | aktiv | 2023-01-01 | — | 2023-10-25 | ja | pdf | — | unterhaching.de |
| `hueckelhoven-balkonkraftwerke` | Stadt Hückelhoven | aktiv | 2024-01-01 | — | — | ja | pdf | — | hueckelhoven.de |
| `weinheim-effizienz` | Stadt Weinheim | aktiv | 2026-01-01 (Geltungsbeginn der a… | 2026-12-31 (Außerkraft… | — | ja | pdf | — | weinheim.de |
| `ottobrunn-foerderprogramme` | Gemeinde Ottobrunn | aktiv | 2014-01-01 | — | — | ja | pdf | — | ottobrunn.de |
| `feucht-klimaschutz` | Markt Feucht | ausgeschoepft | 2025-10-01 | — | — | — | pdf | — | feucht.de |
| `limburgerhof-balkonkraftwerke` | Gemeinde Limburgerhof | aktiv | 2024-03-01 | 2026-12-31 (bereits fe… | — | — | pdf | — | limburgerhof.de |
| `gernsheim-foerderprogramme` | Stadt Gernsheim | aktiv | 2022-04-01 (frühester förderfähi… | — | 2021-12-09 | — | live | — | gernsheim.de |
| `gudensberg-balkonkraftwerke` | Stadt Gudensberg | aktiv | 2025-10-15 | — | 2025-09-18 (Magistrats… | — | pdf | — | gudensberg.de |
| `poing-energie` | Gemeinde Poing | aktiv | 2023-02 (Mini-PV/Balkonkraftwerk… | — | 2026-03-26 (jüngster v… | ja | pdf | — | poing.de |
| `goch-balkonkraftwerke` | Stadt Goch | aktiv | 2024-07-01 | — | — | — | pdf | — | goch.de |
| `herzberg-balkonkraftwerke` | Stadt Herzberg am Harz | aktiv | — | — | 2025-09-17 (Rat der St… | — | live | — | herzberg.de |
| `herbrechtingen-balkonkraftwerke` | Stadt Herbrechtingen | aktiv | 2024-01-01 (frühester förderfähi… | — | — | — | pdf | — | herbrechtingen.de |
| `weyhe-klimaschutz` | Gemeinde Weyhe | ausgeschoepft | 2021 | — | — | — | live + pdf | — | weyhe.de |
| `moormerland-balkonkraftwerke` | Gemeinde Moormerland | unsicher | 2023-08-28 | 2023-10-25 (Schluss de… | — | — | live | — | moormerland.de |
| `bad-krozingen-balkon-pv` | Große Kreisstadt Bad Krozingen | aktiv | 2023-09-04 | — | — | — | pdf | — | bad-krozingen.de |
| `reichelsheim-steckersolar` | Gemeinde Reichelsheim (Odenwald) | aktiv | 2023 (nur jahresgenau) | — | 2023-02-23 | — | live | — | reichelsheim.de |
| `putzbrunn-klimaschutz` | Gemeinde Putzbrunn | pausiert | — | — | 2023-12-19 (Auflage 20… | ja | live | — | putzbrunn.de |
| `dettelbach-gestaltungssatzung-pv` | Stadt Dettelbach | aktiv | — | — | 2025-12-15 | — | pdf | — | dettelbach.de |
| `gailingen-balkonsolar` | Gemeinde Gailingen am Hochrhein | aktiv | — | — | 2023-12-21 | — | pdf | — | gailingen.de |
| `hattenhofen-balkonsolar` | Gemeinde Hattenhofen | aktiv | 2023-05-24 | — | 2023-05-24 | — | archiv (Ursprungsfassung) + live (Verlängerung) | 2024-02-25 | web.archive.org |
| `gaiberg-steckersolar` | Gemeinde Gaiberg | aktiv | 2023 (nur jahresgenau) | — | — | ja | archiv (erste Auflage) + pdf (laufende Auflage 2026) | 2024-03-04 | web.archive.org |
| `karlshuld-balkonkraftwerke` | Gemeinde Karlshuld | aktiv | 2023-11-01 | — | — | — | live + pdf | — | karlshuld.de |
| `walddorfhaeslach-steckersolar` | Gemeinde Walddorfhäslach | aktiv | 2023-07-01 | — | 2023-06-29 | — | live | — | walddorfhaeslach.com |
| `klempau-balkonkraftwerke` | Gemeinde Klempau | aktiv | — | — | 2024-07-11 | — | live | — | gemeinde-klempau.de |
| `hillscheid-energie` | Ortsgemeinde Hillscheid | aktiv | 2024-01-01 | — | 2024-01-31 | — | pdf (+ live) | — | hoehr-grenzhausen.de |
| `schlierbach-energiespeicher` | Gemeinde Schlierbach | aktiv | 2026 (nur die laufende Jahresauf… | — | — | ja | live (+ pdf) | — | schlierbach.de |
| `schiltach-pv` | Stadt Schiltach | aktiv | 2022-08-01 | — | — | — | live | — | schiltach.de |
| `altdorf-bb-balkonkraftwerke` | Gemeinde Altdorf (Landkreis Böblingen) | aktiv | — | — | — | — | pdf (+ live) | — | altdorf-boeblingen.de |
| `steffenberg-balkonkraftwerke` | Gemeinde Steffenberg | aktiv | — | — | — | — | live | — | steffenberg.de |
| `tegernheim-stecker-pv` | Gemeinde Tegernheim | aktiv | — | — | — | ja | live | — | tegernheim.de |
| `lohfelden-100-daecher` | Gemeinde Lohfelden | aktiv | 2023-12-01 | — | 2023-11-16 | — | pdf (+ live) | — | lohfelden.de |
| `schwebheim-batteriespeicher` | Gemeinde Schwebheim | aktiv | 2026-01-26 | — | — | — | live | — | schwebheim.de |
| `asbach-balkonkraftwerke` | Ortsgemeinde Asbach | aktiv | 2026-01-01 | — | 2025-11-20 | ja | pdf (+ live) | — | vg-asbach.de |
| `parkstein-nachhaltigkeitszuschuss` | Markt Parkstein | aktiv | — | — | — | — | live (+ pdf) | — | parkstein.de |
| `marburg-balkonkraftwerke` | Universitätsstadt Marburg | aktiv | — | — | — | — | live (+ pdf) | — | marburg.de |
| `schoenbrunn-balkon-pv` | Gemeinde Schönbrunn | aktiv | 2023-07-01 | — | — | — | pdf (+ live) | — | daten2.verwaltungsportal.de |

## Wörtliche Zitate

Je Programm der vollständige Fundbericht des Laufs — Zitate, Quelle und was versucht wurde.

## berlin-solarplus — Land Berlin / IBB Business Team
- status_katalog: aktiv
- beginnt: 2026-01-08
- endet: - (aktuelle Richtlinie tritt zum 2026-12-31 außer Kraft — Befristung, kein Programmende)
- beschlossen: - (Richtlinie unterzeichnet Berlin, den 13.03.2026 — Ausfertigungsdatum, kein Ratsbeschluss)
- vorgaenger: Ja — vorherige SolarPLUS-Auflage; Anträge dort bis einschließlich 2025-10-31 möglich, danach Neustrukturierung in SolarPLUS S / SolarPLUS L
- herkunft: pdf (+ live)
- quelle: https://www.ibb.de/media/dokumente/foerderprogramme/immobilienfoerderung/solarplus/richtlinie_solarplus.pdf (Abschnitt 4 Geltungsdauer, S. 22); ergänzend https://www.berlin.de/solarcity/solarcity-berlin/im-fokus/foerderprogramm-solarplus/
- snapshot: -
- zitat_beginnt: "Die Förderrichtlinie am 08. Januar 2026 in Kraft und tritt zum 31.12.2026 außer Kraft." (Richtlinien-PDF, Nr. 4 Geltungsdauer) / "Ab dem 8. Januar 2026 startet das Programm SolarPLUS mit einer neuen Struktur" (berlin.de/solarcity)
- zitat_endet: "Die Förderrichtlinie am 08. Januar 2026 in Kraft und tritt zum 31.12.2026 außer Kraft."
- zitat_beschlossen: "Berlin, den 13.03.2026 Senatsverwaltung für Wirtschaft, Energie und Betriebe" (Ausfertigung, kein Beschlussdatum)
- zitat_vorgaenger: "Alle Anträge, die bis einschließlich 31. Oktober 2025 bei der IBT eingegangen sind, werden selbstverständlich weiterbearbeitet." (berlin.de/solarcity)
- versucht: berlin.de/solarcity (200, nur Navigation) -> Unterseite /solarcity-berlin/im-fokus/foerderprogramm-solarplus/ (200, Struktur-Umstellung + Stichtag 31.10.2025) -> ibb.de/de/foerderprogramme/solarplus.html (200, verweist auf Richtlinie) -> Richtlinien-PDF (200, Geltungsdauer belegt). Ein Beschlussdatum eines Gremiums ist an keiner dieser Trägerquellen genannt.
- ergebnis: BELEGT

## stuttgart-solaroffensive — Landeshauptstadt Stuttgart
- status_katalog: aktiv
- beginnt: 2026-05-01 (aktuelle Fassung; Vorgängerfassung ab 2023-08-31)
- endet: - (läuft; Fördermittel 2026 ausgeschöpft, Anträge weiter möglich)
- beschlossen: - (Richtlinie ist "Anlage 1 zu 229/2026 BV", also Anlage einer Beschlussvorlage; ein Gemeinderats-Beschlussdatum steht im PDF nicht)
- vorgaenger: Ja — Förderrichtlinie vom 31. August 2023 (Amtsblatt Nr. 35/36 vom 31. August 2023; Stadtrecht 6/20), gültig bis 2026-04-30
- herkunft: pdf (+ live)
- quelle: https://www.stuttgart.de/medien/ibs/foerderrichtlinie_solaroffensive_gueltig_ab_01.05_2026.pdf (Nr. 8 Inkrafttreten/Geltungsdauer, S. 5); ergänzend https://www.stuttgart.de/solaroffensive
- snapshot: -
- zitat_beginnt: "Diese Richtlinie tritt am 1. Mai 2026 in Kraft und gilt für alle formal gestellten Anträge, die ab diesem Zeitpunkt bei der Bewilligungsstelle eingehen."
- zitat_endet: "Die Fördermittel für das Jahr 2026 sind ausgeschöpft. Sie können Ihren Förderantrag trotzdem einreichen und nach erfolgreicher Umsetzung die Auszahlung beantragen. Weitere Fördermittel können ab 2027 wieder ausgezahlt werden." (stuttgart.de/solaroffensive, Stand: 06.08.2026) — kein Programmende
- zitat_beschlossen: "Anlage 1 zu 229/2026 BV" (Kopfzeile des Richtlinien-PDF)
- zitat_vorgaenger: "Gleichzeitig tritt die bis dahin gültige Förderrichtlinie vom 31. August 2023 (Amtsblatt Nr. 35/36 vom 31. August 2023; Stadtrecht 6/20) außer Kraft."
- versucht: stuttgart.de/solaroffensive (200) -> PDF-Links extrahiert -> Richtlinien-PDF (200), Inkrafttreten und Vorgängerfassung belegt. Auf der Seite zusätzlich "Ausgelaufene Förderrichtlinie Solaroffensive (gültig bis 30.04.2026)". Kein Gremienbeschlussdatum an der Trägerquelle.
- ergebnis: BELEGT

## karlsruhe-klimabonus — Stadt Karlsruhe
- status_katalog: ausgeschoepft
- beginnt: 2022-12-21 (geltende Fassung; Vorgängerfassung ab 2021-04-21)
- endet: - (kein Programmende belegt; nur Haushaltsmittel 2026 ausgeschöpft, Programm "für dieses Jahr geschlossen")
- beschlossen: - (kein Beschlussdatum zur Richtlinie; belegt ist nur der Gemeinderatsbeschluss zum übergeordneten Klimaschutzkonzept 2030 am 2020-04-28)
- vorgaenger: Ja — Richtlinien in der Fassung vom 21.04.2021; davor laut Richtlinie ein "bisheriges Bonusprogramm" ohne Datum
- herkunft: pdf (+ live)
- quelle: https://www.karlsruhe.de/fileadmin/user_upload/05_Mobilitaet_Stadtbild/058_Wohnen/Foerderrichtlinien_KlimaBonus_Karlsruhe.pdf (Nr. 9 Inkrafttreten und Übergangsregelung, S. 7); ergänzend https://www.karlsruhe.de/mobilitaet-stadtbild/bauen-und-immobilien/wohnen
- snapshot: -
- zitat_beginnt: "Diese Richtlinien treten ab 21.12.2022 in Kraft. ... Für Anträge, die ab dem 21.12.2022 eingehen, sind die Richtlinien in der vorliegenden Fassung maßgebend."
- zitat_endet: "Das Förderprogramm ist für dieses Jahr geschlossen. Die Haushaltsmittel für den KlimaBonus Karlsruhe sind für 2026 ausgeschöpft." (karlsruhe.de, Seite Wohnen) — Mittelstopp, kein Programmende
- zitat_beschlossen: "Der Gemeinderat der Stadt Karlsruhe hat das Konzept in seiner Sitzung am 28. April 2020 mit großer Mehrheit verabschiedet." (bezieht sich auf das Klimaschutzkonzept 2030, nicht auf die Förderrichtlinie)
- zitat_vorgaenger: "Gleichzeitig verlieren die Richtlinien in der Fassung vom 21.04.2021 ihre Gültigkeit." / "Dieses Förderprogramm ist Teil des Klimaschutzkonzepts 2030 und löst das bisherige Bonusprogramm ab."
- versucht: /umwelt-klima/klimaschutz/klimabonus-karlsruhe (404), Suchadresse (404). Katalog-URL /mobilitaet-stadtbild/bauen-und-immobilien/wohnen (200) enthält Status und PDF-Link -> Richtlinien-PDF (200), Inkrafttreten belegt.
- ergebnis: BELEGT

## regensburg-effizient — Stadt Regensburg
- status_katalog: aktiv
- beginnt: 2026-01-01 (geltende PV-Richtlinie)
- endet: -
- beschlossen: -
- vorgaenger: Ja — "vorherige Richtlinie zur Förderung der Photovoltaik", außer Kraft mit Ablauf des 2025-12-31 (kein Startdatum genannt)
- herkunft: pdf
- quelle: https://www.regensburg.de/sixcms/media.php/RBG_SIXTUS_1A64.a.578.de/r_upload/20260101_Richtlinie_Photovoltaik.pdf (Nr. 12 Inkrafttreten der Richtlinie, S. 7)
- snapshot: -
- zitat_beginnt: "Die vorstehende Richtlinie tritt am 1. Januar 2026 in Kraft."
- zitat_endet: -
- zitat_beschlossen: - (im PDF kein Stadtrats-/Ausschussbeschluss genannt; Suche nach "beschluss|stadtrat|ausschuss" ohne Treffer)
- zitat_vorgaenger: "Die vorherige Richtlinie zur Förderung der Photovoltaik tritt mit Ablauf des 31. Dezember 2025 außer Kraft."
- versucht: Katalog-URL greendeal/mitmachen/staedtische-foerderungen-zum-klimaschutz (200) -> PDF-Liste -> Richtlinie Photovoltaik (200), Inkrafttreten belegt. Beschlussdatum weder auf der Seite noch im PDF.
- ergebnis: BELEGT

## wuerzburg-klimastadt — Stadt Würzburg
- status_katalog: aktiv
- beginnt: 2026-04-01 (Richtlinie KlimaStadt Würzburg; PV-Vorgängerrichtlinie ab 2022-04-15)
- endet: -
- beschlossen: - (kein Stadtratsbeschluss zur Richtlinie belegt; Richtlinie unterzeichnet "Würzburg, 12.03.2026, Martin Heilig, Oberbürgermeister". Der genannte Stadtratsbeschluss vom 2022-01-20 betrifft das integrierte Klimaschutzkonzept, nicht das Förderprogramm)
- vorgaenger: Ja — "Richtlinie zum Förderprogramm klimaneutrales Wohnen für Energieberatung und den Ausbau der Photovoltaik vom 15.04.2022" (und Richtlinie Stadtgrün & Klimaanpassung vom 15.06.2022), beide außer Kraft mit 2026-04-01
- herkunft: pdf
- quelle: https://www.wuerzburg.de/media/www.wuerzburg.de/org/med_517114/597409_foerderrichtlinie_klimastadt_wuerzburg.pdf (Nr. 9 Inkrafttreten, S. 6)
- snapshot: -
- zitat_beginnt: "Diese Richtlinie tritt am 01.04.2026 in Kraft."
- zitat_endet: -
- zitat_beschlossen: "Am 20.01.2022 hat der Stadtrat das integrierte Klimaschutzkonzept (iKK) beschlossen." (betrifft das Konzept, nicht die Förderrichtlinie) / "Würzburg, 12.03.2026 Martin Heilig, Oberbürgermeister"
- zitat_vorgaenger: "Gleichzeitig treten die Richtlinie zum Förderprogramm Stadtgrün & Klimaanpassung vom 15.06.2022 und die Richtlinie zum Förderprogramm klimaneutrales Wohnen für Energieberatung und den Ausbau der Photovoltaik vom 15.04.2022 außer Kraft."
- versucht: Katalog-URL .../foerderungen-und-beratungen/photovoltaik (200, nur Bausteine, keine Daten) -> Bausteinseite "Gemeinschaftliche Gebäudeversorgung" (200) mit PDF-Link -> Richtlinie KlimaStadt Würzburg (200), Inkrafttreten + Vorgänger belegt.
- ergebnis: BELEGT

## frankfurt-klimabonus — Stadt Frankfurt am Main
- status_katalog: aktiv
- beginnt: - (Richtlinie nennt kein Datum, sondern knüpft an einen Beschluss an, dessen Datum sie nicht angibt)
- endet: - (läuft; Teil-Fördergegenstand "Mini-PV-Anlage" seit 2025-06-03 mangels Mitteln nicht mehr beantragbar)
- beschlossen: - (kein Datum belegt; PARLIS-Suche nach "Klimabonus" ohne Treffer. Der im PDF genannte Beschluss "Klimaneutrales Frankfurt 2035" (§ 1650 vom 12.05.2022) ist der Grundsatzbeschluss, NICHT die Förderrichtlinie)
- vorgaenger: Ja — Richtlinie "Frankfurt frischt auf"; der Klimabonus ist deren Erweiterung
- herkunft: pdf (+ live)
- quelle: https://frankfurt.de/-/media/frankfurtde/frankfurt-themen/klima-und-energie/pdf/klimareferat/klimabonus/foerderrichtlinie-klimabonus.pdf (Nr. 5.4 Geltungsdauer und Inkrafttreten, S. 10); ergänzend https://frankfurt.de/themen/klima-und-energie/stadtklima/klimabonus
- snapshot: -
- zitat_beginnt: "Diese Richtlinie tritt am Tag nach der Beschlussfassung durch die Stadtverordnetenversammlung in Kraft und gilt solange, bis eine neue Richtlinie in Kraft tritt bzw. sie durch Beschluss der Stadtverordnetenversammlung außer Kraft gesetzt wird." — kein Datum genannt
- zitat_endet: "Das Förderprogramm läuft voraussichtlich bis mindestens Ende 2026." (FAQ auf frankfurt.de) / "03.06.2025: Die Mittel für den Fördergegenstand 'Mini-PV-Anlage' sind ausgeschöpft. Eine Antragsstellung ist für diese somit nicht weiter möglich."
- zitat_beschlossen: "Hierfür hat sich die Stadt in ihrem weitreichenden Beschluss 'Klimaneutrales Frankfurt 2035': Grundsatzbeschlüsse (§ 1650 vom 12.05.2022) unter anderem das Ziel gesetzt, bis zum Jahr 2035 klimaneutral zu werden." (Grundsatzbeschluss, nicht die Richtlinie)
- zitat_vorgaenger: "Die 'Richtlinie zur Förderung von Klimaschutz- und Klimaanpassungsmaßnahmen in Frankfurt am Main (Klimabonus)' ist eine Erweiterung der Richtlinie 'Frankfurt frischt auf'." (frankfurt.de)
- versucht: frankfurt.de-Seite per curl 403 -> über Browser gelesen (Titel "Klimabonus | Stadt Frankfurt am Main" gegengeprüft), PDF-Links ausgelesen. Richtlinien-PDF per curl zunächst 403 (mit ?dmc=1), ohne Query-Parameter und mit vollen Browser-Headern 200 -> gelesen. PARLIS-Suche (stvv.frankfurt.de) nach "Klimabonus": "Mit diesen Suchbegriffen wurde kein Treffer erzielt".
- ergebnis: ABGERUFEN_NICHTS_GEFUNDEN (Start-, End- und Beschlussdatum an Trägerquellen nicht belegbar; nur Vorgänger belegt)

## darmstadt-pv — Wissenschaftsstadt Darmstadt
- status_katalog: aktiv
- beginnt: 2022-06-29 (Förderfähigkeit ab Anschaffung nach dem 28.06.2022; Vorgängerrichtlinie ab 2021-07-15)
- endet: - (läuft; für 2026 ausdrücklich fortgeführt)
- beschlossen: -
- vorgaenger: Ja — Förderrichtlinie für Anlagen mit Anschaffung zwischen 15.07.2021 und 28.06.2022, ausgelaufen zum Jahreswechsel 2022/2023
- herkunft: pdf (+ live)
- quelle: https://www.darmstadt.de/fileadmin/Dateistruktur2024/01_LEBEN/04_Umwelt/08_Förderprogramme/Downloads_Photovoltaik/69-100_Informationsblatt_Förderprogramm_Photovoltaik.pdf (Abschnitt 3 Anforderungen); ergänzend https://www.darmstadt.de/leben/umwelt/foerderprogramme
- snapshot: -
- zitat_beginnt: "Förderungen können nur für Photovoltaikanlagen bewilligt werden, die nach dem 28.06.2022 angeschafft wurden. Entscheidend ist das Datum der Rechnung, auf welcher die Photovoltaikmodule aufgeführt sind." / "Antragsberechtigt sind für Anlagen mit Rechnungsdatum ab 29.06.2022 Privatpersonen, Wohneigentümergemeinschaften (WEG), kleine und mittlere Unternehmen, Vereine und andere Organisationen." (darmstadt.de)
- zitat_endet: "Die städtischen Förderprogramme für Photovoltaik und Zisternen werden auch im Jahr 2026 fortgeführt. Anträge werden weiterhin entgegengenommen und bearbeitet." (darmstadt.de)
- zitat_beschlossen: -
- zitat_vorgaenger: "Die Förderrichtlinie für Anlagen, die zwischen dem 15.07.2021 und dem 28.06.2022 angeschafft wurden ist mit dem Jahreswechsel 2022/2023 ausgelaufen. Anträge für die Förderung dieser Anlagen können nicht mehr bewilligt werden." / "Seit dem Sommer 2021 hat die Wissenschaftsstadt Darmstadt über 3000 Photovoltaikanlagen im ganzen Stadtgebiet gefördert." (darmstadt.de)
- versucht: darmstadt.de/leben/umwelt/foerderprogramme (200, Stichtage im Text) -> Informationsblatt-PDF 69-100 (200), Stichtag und Vorgängerrichtlinie belegt. Ein Magistrats-/Stadtverordnetenbeschluss ist an keiner der beiden Stellen genannt.
- ergebnis: BELEGT

## badhomburg-energiespar — Stadt Bad Homburg v. d. Höhe
- status_katalog: pausiert
- beginnt: 2022-08-17
- endet: 2026-08-10 (Annahmestopp für NEUE Anträge, ausdrücklich vorübergehend — kein Programmende)
- beschlossen: -
- vorgaenger: -
- herkunft: live
- quelle: https://www.bad-homburg.de/de/stadt/umwelt-und-klima/umwelt-und-klimaschutz/energieberatung
- snapshot: -
- zitat_beginnt: "Seit dem 17.08.2022 gibt es die Förderrichtlinie für Energiesparmaßnahmen an Gebäuden in Bad Homburg."
- zitat_endet: "Hinweis: Antragsstopp ab dem 10.08.2026 — Zum 10.08.2026 wird die Annahme neuer Förderanträge im Rahmen des kommunalen Förderprogramms vorübergehend gestoppt. ... Vollständige Anträge, die vor dem 10.08.2026 eingegangen sind, werden regulär weiterbearbeitet."
- zitat_beschlossen: -
- versucht: Katalog-URL (200) trägt Startdatum und Antragsstopp im Klartext. Auf der Seite ist kein Richtlinien-PDF verlinkt (Suche nach .pdf-Links ohne Treffer), daher kein Inkrafttretens-Paragraf und kein Beschlussdatum prüfbar.
- ergebnis: BELEGT

## nidda-solar — Stadt Nidda
- status_katalog: aktiv
- beginnt: 2022 (erstmalige Solar-/Speicher-/Balkon-PV-Förderung); aktueller Förderzeitraum 2026-01-01 bis 2026-12-31
- endet: 2026-12-31 (Ende des laufenden Förderzeitraums, jährlich fortgeschrieben — kein Programmende)
- beschlossen: 2026 (Fortsetzung für 2026 durch die Stadtverordnetenversammlung; kein Tagesdatum genannt. Für die Geräteförderung heißt es zusätzlich "Ende Juni" ohne Jahresangabe im Satz)
- vorgaenger: Ja — seit September 2014 Förderprogramm für Energieeffizienzmaßnahmen (anfangs Heizungsoptimierung), ab 2016 Haushaltsgeräte; PV kam 2022 hinzu. Jährlich neue Richtlinienfassung (Förderzeitraum je Kalenderjahr)
- herkunft: live + pdf
- quelle: https://www.nidda.de/leben/infrastruktur/klima-umwelt-wasser/klima/foerderprogramme/foerderung-stadt-nidda/ und https://www.nidda.de/leben/infrastruktur/klima-umwelt-wasser/klima/foerderprogramme/foerderung-stadt-nidda/26-rl-pv.pdf (Kopf, Stand 14.08.2025)
- snapshot: -
- zitat_beginnt: "Im Rahmen der städtischen Förderung wurden in 2022 neben hocheffizienten Haushaltsgeräten erstmals auch die Errichtung von Solaranlagen mit Speichern, die Nachrüstung von Stromspeichern bei bestehenden Anlagen sowie die Installation von Balkon-PV unterstützt." / Richtlinien-PDF: "Förderzeitraum: 01.01. - 31.12.2026"
- zitat_endet: "Förderzeitraum: 01.01. - 31.12.2026" (Richtlinien-PDF, Kopf S. 1)
- zitat_beschlossen: "Fortführung der Solarförderung für 2026 beschlossen — Die Stadtverordnetenversammlung der Stadt Nidda hat die Richtlinien für die Fortsetzung der Förderprogramme für PV-Anlagen im Jahr 2026 beschlossen." (ohne Datum) / "Die Förderung der höchsteffizienten Haushaltsgeräte wird ebenfalls in 2026 fortgeführt. Der Beschluss hierzu ist Ende Juni gefasst worden."
- zitat_vorgaenger: "Seit September 2014 unterstützt die Stadt Nidda ihre Bürger mit einem kleinem Förderprogramm für Energieeffizienzmaßnahmen. ... Ab 2016 gibt es einen Zuschuss zum Kauf von Haushaltsgeräten mit der höchsten Energieeffizienzklasse."
- versucht: Katalog-URL (200, ausführlicher Text) -> Richtlinien-PDF 26-rl-pv.pdf (200), Förderzeitraum belegt. ACHTUNG Widerspruch auf der Amtsseite: derselbe Absatz sagt "für PV-Anlagen im Jahr 2026 beschlossen", nennt aber "startet am 01.01.2025" — offenbar ein stehengebliebener Satz der Vorjahresfassung; maßgeblich ist der Förderzeitraum im PDF (2026).
- ergebnis: BELEGT

## koeln-pv — Stadt Köln
- status_katalog: aktiv  ← WIDERSPRUCH: die Amtsseite führt die Programme als ausgelaufen
- beginnt: 2023-10-02 (Programm "Photovoltaik – klimafreundliches Wohnen"; Vorgängerrichtlinie ab 2022-04-01; städtische Förderung insgesamt seit 2018)
- endet: 2024-08-27 (seitdem keine neuen Anträge; in der Richtlinie war eine Laufzeit bis 2025-12-31 vorgesehen)
- beschlossen: 2023-09-07 (Rat der Stadt Köln)
- vorgaenger: Ja — Richtlinie "Gebäudesanierung und Erneuerbare Energien – klimafreundliches Wohnen" vom 01.04.2022 (Programm laut Amtsseite am 03.04.2022 ausgelaufen); übergreifend: "Seit 2018 unterstützen wir engagierte Bürger*innen ..."
- herkunft: pdf (+ live)
- quelle: https://www.stadt-koeln.de/mediaasset/content/pdf57/altbausanierung/sk_326_23_förderrichtlinien_photovoltaik_klimafreundliches_wohnen_amt_57_barrierefrei.pdf (Geltungsbereich S. 5 und Nr. 5 Inkrafttreten S. 13); ergänzend https://www.stadt-koeln.de/klimafreundliches-wohnen-und-arbeiten
- snapshot: -
- zitat_beginnt: "Das Förderprogramm 'Photovoltaik – klimafreundliches Wohnen' wurde vom Rat der Stadt Köln am 07.09.2023 beschlossen und tritt am 02.10.2023 in Kraft mit einer Laufzeit bis zum 31.12.2025" / "Die Förderrichtlinie tritt am 2. Oktober 2023 in Kraft ... Sie gilt für eingegangene Förderanträge ab dem 2. Oktober 2023."
- zitat_endet: "Seit 27. August 2024 nehmen wir in diesem Programm keine neuen Anträge an." (Abschnitt Photovoltaik – klimafreundliches Wohnen) / "Seit 27. August 2024 können in diesem Programm keine neuen Anträge gestellt werden." (Photovoltaik – klimafreundliches Arbeiten) / "Die untenstehenden Förderprogramme sind bereits ausgelaufen."
- zitat_beschlossen: "wurde vom Rat der Stadt Köln am 07.09.2023 beschlossen"
- zitat_vorgaenger: "Die Förderrichtlinie tritt am 2. Oktober 2023 in Kraft und ersetzt die Richtlinie 'Gebäudesanierung und Erneuerbare Energien – klimafreundliches Wohnen' vom 1. April 2022." / "Das Förderprogramm ist am 3. April 2022 ausgelaufen." (Amtsseite, zum Vorgängerprogramm) / "Seit 2018 unterstützen wir engagierte Bürger*innen mit einem finanziellen Zuschuss ..."
- versucht: stadt-koeln.de/klimafreundliches-wohnen-und-arbeiten (200; nennt Antragsstopp 27.08.2024) -> Richtlinien-PDF Photovoltaik klimafreundliches Wohnen (200): Beschlussdatum, Inkrafttreten, vorgesehene Laufzeit und Vorgängerrichtlinie alle im Volltext belegt.
- ergebnis: BELEGT

## duesseldorf-klimafreundlich — Landeshauptstadt Düsseldorf
- status_katalog: pausiert (Pause an der Trägerquelle NICHT belegt — siehe versucht)
- beginnt: 2025-01-01
- endet: -
- beschlossen: - (kein Beschlussdatum; belegt ist nur das Datum der Richtlinie 12.12.2024 und die Veröffentlichung im Amtsblatt am 28.12.2024)
- vorgaenger: - (die geltende Fassung heißt "Richtlinie 2024", eine ältere Fassung wird im Text aber nicht benannt)
- herkunft: live (amtliche Stadtrechtssammlung, Ziffer 19.303)
- quelle: https://www.duesseldorf.de/stadtrecht/1/19/19-303
- snapshot: -
- zitat_beginnt: "10. Inkrafttreten und Anwendbarkeit der Förderrichtlinie — Diese Förderrichtlinie tritt am 01.01.2025 in Kraft. Sie ist für die ab dem 01.01.2025 eingegangenen Anträge anzuwenden."
- zitat_endet: -
- zitat_beschlossen: "Förderprogramm 'Klimafreundliches Wohnen und Arbeiten in Düsseldorf': Richtlinie 2024 vom 12.12.2024 — www.duesseldorf.de/bekanntmachungen veröffentlicht 28.12.2024 - Nachrichtlich Düsseldorfer Amtsblatt Nummer 51/52 vom 28.12.2024" / "Änderungen können jederzeit durch den Rat der Landeshauptstadt Düsseldorf beschlossen werden."
- versucht: Stadtrecht 19-303 (200), Inkrafttreten und Bekanntmachungsdatum belegt. Zwei Versuche, die Programmseite mit einem Hinweis auf die Pause zu finden (/umweltamt/umweltthemen-a-z/klimaschutz/foerderprogramm-... und /klimaschutz/foerderprogramm), beide HTTP 404. Der Status "pausiert" ist damit an der Trägerquelle nicht bestätigt.
- ergebnis: BELEGT (Start belegt; Pausierung nicht belegbar)

## hannover-proklima — proKlima (enercity-Fonds), Region Hannover
- status_katalog: aktiv
- beginnt: 2026-01-01 (Förderprogramm 2026; das Programm wird jährlich neu aufgelegt)
- endet: 2026-10-31 (Höchstlaufzeit der laufenden Auflage, "bis auf Widerruf" — kein Programmende)
- beschlossen: - (kein Datum; die Richtlinie erwähnt lediglich ohne Datum "einen Ratsbeschluss der Landeshauptstadt Hannover" als Anlass eines einzelnen Bonusbausteins)
- vorgaenger: Ja implizit — jährliche Auflage ("proKlima Förderprogramm 2026", Version 1.4); eine konkrete Vorgängerfassung wird im Dokument nicht benannt
- herkunft: pdf (+ live)
- quelle: https://www.proklima-hannover.de/downloads/foerderangebote/proKlima_Richtlinie_2026.pdf (Abschnitt "Wie lange läuft das Förderprogramm?", S. 51); ergänzend https://www.proklima-hannover.de/wohngebaeude/foerderangebote/solarstrom/dachvolltoll/
- snapshot: -
- zitat_beginnt: "Das proKlima-Förderprogramm tritt am 1. Januar 2026 in Kraft. Es gilt bis auf Widerruf, längstens jedoch bis zum 31. Oktober 2026."
- zitat_endet: "Es gilt bis auf Widerruf, längstens jedoch bis zum 31. Oktober 2026."
- zitat_beschlossen: "Dieser Bonus wurde anlässlich eines Ratsbeschlusses der Landeshauptstadt Hannover aufgelegt." (ohne Datum, und nur zum Bonus Wärmepumpe+)
- versucht: DachVollToll-Seite (200) -> Link auf proKlima_Richtlinie_2026.pdf (200), Laufzeit im Volltext belegt. Die Richtlinie gilt für Hannover, Hemmingen, Laatzen, Langenhagen, Ronnenberg und Seelze. Kein datierter Gremienbeschluss im Dokument.
- ergebnis: BELEGT

## heidelberg-rev — Stadt Heidelberg
- status_katalog: aktiv
- beginnt: - (Programmstart nicht belegt — das Programm ist älter als jede veröffentlichte Fassung; belegt ist nur die Fassungskette, siehe zitat_beginnt)
- endet: -
- beschlossen: 2025-12-18 (Beschluss, mit dem die Förderung auf erneuerbare Energien / Photovoltaik ausgerichtet wurde — trägt die heutige, PV-fokussierte Auflage; NICHT der Beschluss über das Programm insgesamt)
- vorgaenger: ja — die Stadt stellt die früheren Auflagen selbst zum Download bereit (Fassung gültig ab 01.01.2021, Fassung ab 01.09.2022, Fassung ab 01.03.2024, Fassung Juni 2025, aktuelle Fassung ab 01.07.2026), jeweils mit eigenen Nebenbestimmungen. Älteste dort veröffentlichte Fassung: "Förderprogramm Rationelle Energieverwendung - gültig ab 01. Januar 2021 -"
- herkunft: pdf
- quelle: https://www.heidelberg.de/site/Heidelberg2021/get/documents_E-1333003641/heidelberg/Objektdatenbank/31/PDF/Energie%20und%20Klimaschutz/Foerderprogramm%20Rationelle%20Energieverwendung/31_pdf_2026_F%C3%B6Pro_RatEn_ab-01-07-2026.pdf — verlinkt auf der Richtlinienseite https://www.heidelberg.de/hd/HD/Leben/foerderrichtlinien.html
- snapshot: -
- zitat_beginnt: aktuelle Auflage, "§ 6 Inkrafttreten": "Diese Auflage des Förderprogramms gilt für Anträge, die nach dem 30.06.2026 eingehen." (= Antragsstart der aktuellen Auflage 01.07.2026, nicht des Programms) · älteste veröffentlichte Auflage, Titelzeile: "Förderprogramm Rationelle Energieverwendung - gültig ab 01. Januar 2021 -"
- zitat_endet: -
- zitat_beschlossen: "Gemäß Gemeinderatsbeschluss vom 18. Dezember 2025 soll die Förderung auf den Ausbau und die Nutzung erneuerbarer Energien im Gebäudebereich fokussiert werden. Ziel der Förderung soll es sein, insbesondere Photovoltaikanlagen zu unterstützen, welche über die Anforderungen der Photovoltaik-Pflicht-Verordnung (PVPf-VO) des Landes Baden-Württemberg hinaus gehen." (Präambel der Fassung ab 01.07.2026)
- versucht: PV-Bausteinseite (HTTP 200) — kein Datum, nur ein Dachbegrünungs-Leitfaden als PDF. Richtlinienseite /HD/Leben/foerderrichtlinien.html (HTTP 200) — dort zehn PDFs mit der vollständigen Fassungskette 2021/2022/2024/2025/2026. Aktuelle Fassung (ab 01.07.2026) und älteste Fassung (ab 01.01.2021) per curl geholt und mit pdftotext gelesen; die 2021er Fassung nennt weder eine Inkrafttretens-Klausel im Text noch einen Vorgänger, nur das Gültigkeitsdatum in der Titelzeile.
- ergebnis: BELEGT

## mannheim-solarbonus — Stadt Mannheim / Klimaschutzagentur Mannheim
- status_katalog: aktiv
- beginnt: - (Programmstart nicht belegt; die aktuelle Auflage gilt seit dem Ratsbeschluss vom 11.03.2026, die unmittelbare Vorgängerfassung trat am 01.04.2025 in Kraft)
- endet: -
- beschlossen: 2026-03-11 (Gemeinderatsbeschluss, mit dem die aktuelle Richtlinie erlassen wurde)
- vorgaenger: ja — die aktuelle Richtlinie ersetzt ausdrücklich eine am 01.04.2025 in Kraft getretene Vorgängerfassung. Das Programm läuft jährlich in Auflagen ("SolarBonus 2026 der Stadt Mannheim").
- herkunft: pdf
- quelle: https://api.klima-ma.de/api/subsidy-downloads/20260311-forderrichtlinie-solarbonus-2026.pdf ("Richtlinie der Stadt Mannheim zur Förderung von Photovoltaikanlagen (SolarBonus)", Kopfzeile "Förderrichtlinie zum SolarBonus der Stadt Mannheim 2026 (Stand 11.03.2026)"), verlinkt aus dem SolarBonus-Aufklappfenster auf https://www.klima-ma.de/foerderprogramme
- snapshot: -
- zitat_beginnt: Abschnitt "8 Inkrafttreten": "Diese Richtlinie wurde durch Beschluss des Gemeinderats der Stadt Mannheim vom 11.03.2026 erlassen und ersetzt die am 01.04.2025 in Kraft getretene Version."
- zitat_endet: - (nur die allgemeine Haushaltsklausel: "Die Gewährung der Zuschüsse ist eine freiwillige Leistung der Stadt Mannheim, auf deren Bewilligung kein Rechtsanspruch besteht. Sie erfolgt im Rahmen der im Haushaltsplan bereitgestellten Mittel. Ist der Rahmen dieser bereitgestellten Mittel erschöpft, kann keine Förderung mehr gewährt werden." — Bedingung, kein Antragsstopp)
- zitat_beschlossen: "Diese Richtlinie wurde durch Beschluss des Gemeinderats der Stadt Mannheim vom 11.03.2026 erlassen und ersetzt die am 01.04.2025 in Kraft getretene Version."
- versucht: https://www.klima-ma.de/foerderprogramme per curl (HTTP 200) — Inhalt wird per JavaScript nachgeladen, im Quelltext kein PDF und kein SolarBonus-Link. /foerderprogramme/solarbonus -> HTTP 500, /foerderprogramme-auf-einen-blick -> HTTP 404. Daher im eigenen Browser-Tab (tab-4) geöffnet, Programmkarte SolarBonus aufgeklappt und die dort verlinkte Richtlinien-Adresse ausgelesen; das PDF selbst dann per curl + pdftotext gelesen. Seitenkopf gegengeprüft ("Klimaschutzagentur Mannheim").
- ergebnis: BELEGT

## muenster-klimafreundlich — Stadt Münster
- status_katalog: eingestellt
- beginnt: 2024-01-01 (Inkrafttreten der aktuell veröffentlichten Richtlinie; das Förderprogramm selbst läuft nach eigener Darstellung seit 1997 in jährlichen Auflagen)
- endet: -
- beschlossen: - (die Richtlinie ist als "Anlage 1 zu V/0574/2023" gekennzeichnet, also einer Ratsvorlage von 2023 — ein Sitzungs-/Beschlussdatum steht nirgends)
- vorgaenger: ja — "ersetzt die Richtlinie vom 01.01.2023"; darüber hinaus: "Seit 1997 investiert die Stadt Münster in die energetische Gebäudesanierung und hat für die Bürgerinnen und Bürger einen Fördertopf bereitgestellt. Seitdem wurde das Förderprogramm jährlich neu aufgesetzt und kontinuierlich erweitert."
- herkunft: pdf
- quelle: https://www.stadt-muenster.de/fileadmin/user_upload/stadt-muenster/67_klima/pdf/Foerderrichtlinie_Foerderprogramm_klimafreundliche_Wohngebaeude_2024.pdf ("Richtlinie des städtischen Förderprogramms Klimafreundliche Wohngebäude für Münster"), verlinkt als "Förderrichtlinien 2024" auf https://www.stadt-muenster.de/klima/foerderprogramm
- snapshot: -
- zitat_beginnt: Abschnitt "A.13 In Krafttreten": "Die Richtlinie tritt am 01.01.2024 in Kraft und ersetzt die Richtlinie vom 01.01.2023."
- zitat_endet: - (kein Datum, ab dem Photovoltaik herausfiel; belegt ist nur der Zustand: das Wort "Photovoltaik" und "Solar" kommen in der Richtlinie 2024 an keiner Stelle vor, gefördert werden Energetische Sanierung und Dachbegrünung)
- zitat_beschlossen: - (nur die Vorlagenkennung in der Kopfzeile: "Anlage 1 zu V/0574/2023")
- versucht: Programmseite (HTTP 200) — nennt die Programmhistorie seit 1997 und verlinkt die Richtlinie 2024; Richtlinien-PDF per curl + pdftotext gelesen, Inkrafttretens-Klausel A.13 gefunden. Ratsinformationssystem: sessionnet-Vorlagenaufruf mit geratener Kennung -> Fehlerseite, Recherche-Adresse recherche.php?suchbegriffe=V/0574/2023 (HTTP 200) liefert keine Treffer im ausgelieferten HTML (Suche vermutlich per Formular/POST). Beschlussdatum daher nicht belegt.
- ergebnis: BELEGT

## mainz-kipki-speicher — Mainzer Stiftung für Klimaschutz und Energieeffizienz / Stadt Mainz
- status_katalog: ausgeschoepft
- beginnt: - (kein Antragsstart belegt; die Richtlinie trägt nur "Stand: 01.01.2025", das ist ein Fassungsstand. Belegt ist der Förderzeitraum der ANLAGE, nicht der Antragsstart: die Batteriespeicheranlage muss "im Zeitraum vom 01.01. – 31.12.2025 neu errichtet werden")
- endet: ja, aber ohne Datum des Antragsstopps — "Die Fördermittel sind ausgeschöpft. Es werden keine Neuanträge angenommen!" (Zeitpunkt, ab dem das gilt, steht nicht dabei). Datiert sind nur die Nachlauffristen: Einreichungsfrist Auszahlung verlängert auf 2026-02-28, weitere genannte Einreichungsfrist 2026-01-26 [wörtlich: 31.01.2026]; die Richtlinie selbst nannte ursprünglich 2025-12-31.
- beschlossen: -
- vorgaenger: -
- herkunft: live + pdf
- quelle: https://www.mainzer-stiftung.de/foerderprogramme/photovoltaik-batteriespeicher/ und das dort verlinkte https://www.mainzer-stiftung.de/assets/2024/12/2025_01_01_Richtlinie_PV-Speicher-Foerderung_2stufig.pdf
- snapshot: -
- zitat_beginnt: Programmseite: "Die förderfähige Batteriespeicheranlage muss in Verbindung mit einer PV-Anlage im Zeitraum vom 01.01. – 31.12.2025 neu errichtet werden. Entscheidend ist das Datum der Schlussrechnung." · Richtlinie, Fußzeile: "Stand: 01.01.2025"
- zitat_endet: "Die Fördermittel sind ausgeschöpft. Es werden keine Neuanträge angenommen! Die Einreichungsfrist für Auszahlungen ist auf den 28.02.2026 verlängert worden." · weiter unten auf derselben Seite: "Die Grundlage für eine Förderung bildet die Richtlinie zu diesem Förderprogramm (siehe Download). Die Einreichungsfrist ist auf den 31.01.2026 verlängert worden." · Richtlinie Nr. 6.5: "Der Fördermittelabruf mittels Auszahlungsantrag muss bis zum 31.12.2025 erfolgen."
- zitat_beschlossen: -
- versucht: Programmseite (HTTP 200) — trägt den Antragsstopp im Klartext und zwei (untereinander abweichende) verlängerte Einreichungsfristen. Richtlinien-PDF per curl + pdftotext vollständig gelesen (3 Seiten): keine Inkrafttretens-Klausel, nur "Stand: 01.01.2025" und die ursprüngliche Auszahlungsfrist 31.12.2025. Hinweis: Das Programm läuft im Rahmen des Landesprogramms KIPKI Rheinland-Pfalz; ein Beschluss eines Mainzer Gremiums ist an keiner der beiden Quellen genannt.
- ergebnis: BELEGT

## muenchen-fkg — Landeshauptstadt München
- status_katalog: eingestellt
- beginnt: 2022-10-04 (Inkrafttreten der FKG-Förderrichtlinie insgesamt; die zuletzt gültige Ausgabe trat am 25.07.2024 in Kraft, das Richtlinienheft selbst gilt ab 02.09.2024)
- endet: 2024-12-18 (ab diesem Tag keine neuen PV-Anträge mehr)
- beschlossen: 2022-06-29 und 2023-07-26 (Stadtratsbeschlüsse, auf denen die Richtlinie beruht); zusätzlich Stadtratsbeschluss 2024-07-24 für die ab 25.07.2024 geltende Ausgabe
- vorgaenger: ja — das FKG ersetzt das "Münchner Förderprogramm Energieeinsparung (FES)", dessen Richtlinie seit 01.04.2019 galt und am 04.10.2022 außer Kraft trat. Innerhalb des FKG gab es mehrere Ausgabestände (u. a. 01.01.2024, 07.05.2024, 25.07.2024, 02.09.2024).
- herkunft: live + pdf
- quelle: https://stadt.muenchen.de/service/info/sachgebiet-forderprogramm-klimaneutrale-gebaude/10414150/ und das dort verlinkte Richtlinienheft https://stadt.muenchen.de/dam/Home/Stadtverwaltung/Referat-fuer-Klima-und-Umweltschutz/Dokumente/FES-und-FKG/FKG-2024/FKG-RiLi_2024-09-02.pdf
- snapshot: -
- zitat_beginnt: Richtlinienheft, Abschnitt "Inkrafttreten Förderrichtlinie": "Die FKG-Förderrichtlinie trat vollumfänglich am 04.10.2022 in Kraft. Diese Ausgabe der Förderrichtlinie tritt am 25.07.2024 in Kraft und ersetzt die FKG-Förderrichtlinie mit dem Stand vom 07.05.2024 und alle vorhergehenden Ausgabestände." · Titelblatt: "Richtlinienheft gültig ab 02.09.2024"
- zitat_endet: Programmseite, Seitentitel und Überschrift: "Förderung von Photovoltaikanlagen (Anträge bis zum 18. Dezember 2024)" · im Text: "Seit dem 18. Dezember 2024 können keine neue Anträgen für Photovoltaikanlagen gestellt werden. Bereits gestellte Anträge behalten ihre Gültigkeit." · in den FAQ: "Ist die Förderung von PV Anlagen noch möglich? Nein, die Antragstellung für die Förderung von Photovoltaikanlagen ist nicht mehr möglich."
- zitat_beschlossen: Titelblatt: "Richtlinie auf der Basis der Beschlüsse des Stadtrats vom 29.06.2022 und 26.07.2023" · im Text mehrfach: "Gem. des Stadtratsbeschlusses vom 24.07.2024 besteht ab 25.07.2024 für die ..."
- versucht: Programmseite (HTTP 200) — trägt das Antragsende im Titel, im Fließtext und in den FAQ und verlinkt neun Dokumente. Richtlinienheft (73 Seiten) per curl + pdftotext gelesen; Inkrafttretens- und Außerkrafttretens-Abschnitte auf S. 64 gefunden, Beschlussdaten auf dem Titelblatt.
- ergebnis: BELEGT

## potsdam-klimaschutz — Landeshauptstadt Potsdam
- status_katalog: aktiv
- beginnt: 2026-04-01 (Inkrafttreten der aktuellen Fassung der Klimaschutzförderrichtlinie); Antragstellung nach einer Unterbrechung wieder möglich ab 2026-05-18
- endet: - (Programm läuft; für das laufende Jahr gilt aber eine Antragsfrist bis 2026-10-31)
- beschlossen: - (die Richtlinie ist vom Geschäftsbereichsleiter unterzeichnet, "Potsdam, den 26. März 2026"; als Grundlage nennt sie den Klimanotstandbeschluss 19/SVV/0543 vom 14.08.2019 und die begleitenden Haushaltsbeschlüsse 25/SVV/0078-102 vom 02.04.2025 und 26/SVV/0090 vom 25.03.2026 — das sind Grundlagen- und Haushaltsbeschlüsse, kein Beschluss über diese Richtlinie)
- vorgaenger: ja, ohne Datum — "Die Förderrichtlinie verstetigt und erweitert das bisherige Angebot an alle Bürgerinnen und Bürger der Stadt"; die Richtlinie selbst nennt sich "diese aktualisierte Förderrichtlinie"
- herkunft: pdf + live
- quelle: https://www.potsdam.de/system/files/document/Schlussfassung%20Potsdamer%20Klimaschutzf%C3%B6rderrichtlinie%20%20vom%2026.03.2026_1.pdf ("Förderrichtlinie zur Aktivierung von Klimaschutz- und Klimaanpassungsmaßnahmen in der Landeshauptstadt Potsdam (Klimaschutzförderrichtlinie – PKSchuFRL) in der Fassung ab dem 01.04.2026"), verlinkt auf https://www.potsdam.de/de/beantragung-einer-zuwendung-aus-dem-klimaschutzfoerderprogramm-der-landeshauptstadt-potsdam
- snapshot: -
- zitat_beginnt: Richtlinie, "10 Inkrafttreten und Veröffentlichung": "Diese Förderrichtlinie tritt am 01.04.2026 in Kraft. Sie gilt für förderfähige Maßnahmen, die die Bedingungen dieser Förderrichtlinie erfüllen." · Programmseite: "Ab dem 18.05.2026 ist wieder die Antragstellung auf Zuschüsse für die Umsetzung von Klimaschutz- und Klimaanpassungsmaßnahmen möglich."
- zitat_endet: Programmseite (laufende Antragsfrist, kein Programmende): "die Bearbeitung Ihrer Anträge, Anfragen sowie die Übermittlung von Antragseingangsbestätigungen erfolgt wieder ab dem 16.09.2026, in Reihenfolge des E-Mail-Eingangsdatums. Fördermittelanträge können noch bis zum 31.10.2026 per E-Mail unter klimaschutzfoerderprogramm@rathaus.Potsdam.de gestellt werden." · Für eine Zielgruppe ist es aber vorbei: "Die Förderung von Vereinen ist in diesem Jahr leider nicht mehr möglich."
- zitat_beschlossen: Richtlinie, Einleitung: "mit dem Klimanotstandbeschluss vom 14.08.2019 (19/SVV/0543) in Verbindung mit dem begleitenden Haushaltsbeschlüssen 25/SVV/0078-102 vom 02.04.2025 und 26/SVV/0090 vom 25.03.2026" · Unterschriftszeile: "Potsdam, den 26. März 2026 / Im Auftrag / Gez. Bernd Rubelt / Geschäftsbereichsleiter für Stadtentwicklung, Bauen, Wirtschaft und Umwelt"
- versucht: Programmseite (HTTP 200) — trägt Antragsstart, Antragsfrist und Bearbeitungspause im Laufband und verlinkt acht PDFs. Richtlinien-PDF (20 Seiten) per curl + pdftotext gelesen; Inkrafttretens-Abschnitt 10 auf der letzten Seite gefunden, Beschluss-Fundstellen in der Einleitung.
- ergebnis: BELEGT

## dortmund-pv — Stadt Dortmund
- status_katalog: ausgeschoepft
- beginnt: 2025-06-23 (Inkrafttreten der Richtlinie in der Fassung vom 23.06.2025)
- endet: 2026-06-05 (Antragsstopp mit Wirkung zu diesem Tag, vorläufig)
- beschlossen: -
- vorgaenger: - (die Richtlinie trägt die Bezeichnung "In der Fassung vom 23.06.2025", nennt aber keine ersetzte Vorgängerfassung; sie regelt nur den umgekehrten Fall für die Zukunft: "sofern nicht eine diese vorliegende Richtlinie ersetzende Richtlinie in Kraft tritt")
- herkunft: pdf + live
- quelle: https://www.dortmund.de/dortmund/projekte/rathaus/verwaltung/umweltamt/downloads/services/foerderrichtlinie-pv-privat-23.06.25.pdf ("Richtlinie der Stadt Dortmund zur Förderung der Nutzung von Photovoltaikanlagen für Privathaushalte, In der Fassung vom 23.06.2025") und https://www.dortmund.de/services/foerderung-von-photovoltaikanlagen-auf-ein-und-zweifamilienhaeusern.html
- snapshot: -
- zitat_beginnt: Richtlinie, "12. Inkrafttreten": "Diese Richtlinie tritt am 23.06.2025 in Kraft. Die Richtlinie ist gültig, solange entsprechende Fördermittel zur Verfügung stehen und sofern nicht eine diese vorliegende Richtlinie ersetzende Richtlinie in Kraft tritt."
- zitat_endet: Programmseite, Abschnitt "Antragsstopp": "Aufgrund der hohen Anzahl eingegangener Anträge wurde das Förderprogramm mit Wirkung zum 05.06.2026 vorläufig gestoppt. Nach aktuellem Stand ist der zur Verfügung stehende Fördermittelrahmen durch die bereits vorliegenden Anträge voraussichtlich vollständig ausgeschöpft. Neue Anträge können daher bis auf Weiteres nicht berücksichtigt werden." · in der Formularliste steht statt des Antragslinks: "Antragstellung nicht möglich."
- zitat_beschlossen: -
- versucht: Programmseite (HTTP 200) — Inhalt im <main>-Bereich extrahiert (die Seite trägt ein sehr großes Navigations-JSON); Antragsstopp im Klartext, zwei PDFs verlinkt. Richtlinien-PDF (5 Seiten) per curl + pdftotext gelesen, Inkrafttretens-Abschnitt 12 auf der letzten Seite. Ein Beschlussdatum eines Ratsgremiums steht weder auf der Seite noch in der Richtlinie.
- ergebnis: BELEGT

## essen-solar — Stadt Essen
- status_katalog: eingestellt
- beginnt: -
- endet: 2025-07-03
- beschlossen: -
- vorgaenger: ja, mindestens eine frühere Fassung — die Richtlinie vom 1. April 2025 setzt "vorherige Förderrichtlinien" außer Kraft; deren Datum ist an der Quelle nicht genannt
- herkunft: live + pdf
- quelle: https://www.essen.de/leben/umwelt/klima/klimaschutz/solarfoederung.de.html und https://media.essen.de/media/wwwessende/aemter/gha/2025_dokumente/A1-_Foerderrichtlinie_Solar.pdf
- snapshot: -
- zitat_beginnt: (kein Beleg für den Programmstart; die Richtlinie belegt nur die aktuelle Fassung: "Das Förderprogramm tritt in der aktuellen Fassung zum 1. April 2025 in Kraft, vorherige Förderrichtlinien treten außer Kraft." — das ist ein Fassungsdatum, nicht der Antragsstart)
- zitat_endet: "Davon betroffen ist auch das Förderprogramm für Photovoltaik, das zum 03.07.2025 gestoppt wird. … Anträge, die noch nicht bewilligt wurden oder ab dem 03.07.2025 (00:00 Uhr) eingehen, können nicht mehr berücksichtigt werden."
- zitat_beschlossen: -
- versucht: Programmseite essen.de/solarfoederung (HTTP 200) — enthält den Förderstopp im Wortlaut; der einzige verlinkte Richtlinien-PDF (media.essen.de/.../A1-_Foerderrichtlinie_Solar.pdf, HTTP 200) nennt Inkrafttreten der aktuellen Fassung (01.04.2025) und ein geplantes Programmende 14.01.2026, aber keinen ursprünglichen Antragsstart und keinen Ratsbeschluss.
- ergebnis: BELEGT

## osnabrueck-saniert — Stadt Osnabrück
- status_katalog: aktiv
- beginnt: 2020
- endet: -
- beschlossen: -
- vorgaenger: ja — erste Auflage 2020; die aktuelle Fassung ist die "Förderrichtlinie 2025" (Stand Mai 2025), in Kraft seit 01.07.2025, befristet bis 31.12.2027
- herkunft: live + pdf
- quelle: https://bauen.osnabrueck.de/de/sanieren-modernisieren/osnabrueck-saniert/ und https://bauen.osnabrueck.de/fileadmin/bauen_wohnen/Foerderrichtlinie_Sanierungsprogramm__StUA_Juni_2025.pdf
- snapshot: -
- zitat_beginnt: "Seit der ersten Auflage des Programms im Jahr 2020 haben sich die gesellschaftlichen und politischen Rahmenbedingungen stark verändert." und "Seit dem Start im Jahr 2020 sind rund 1.500 Anträge bearbeitet worden."
- zitat_endet: (kein Ende — laufend; die aktuelle Fassung ist befristet: "Die Förderrichtlinie tritt nach Beschluss des Rates der Stadt Osnabrück am 01.07.2025 in Kraft und ist zunächst befristet bis zum 31.12.2027.")
- zitat_beschlossen: (kein Beschlussdatum belegt — die Richtlinie nennt nur das Inkrafttreten: "Die Förderrichtlinie tritt nach Beschluss des Rates der Stadt Osnabrück am 01.07.2025 in Kraft"; das Datum bezieht sich auf das Inkrafttreten, nicht erkennbar auf den Ratsbeschluss)
- versucht: Programmseite bauen.osnabrueck.de (HTTP 200) nennt Programmstart 2020 zweimal im Fließtext; verlinkte Förderrichtlinie (fileadmin/bauen_wohnen/Foerderrichtlinie_Sanierungsprogramm__StUA_Juni_2025.pdf, HTTP 200) liefert im Schlussabschnitt "Inkrafttreten" die Befristung bis 31.12.2027. Ein taggenaues Startdatum 2020 und ein separates Ratsbeschluss-Datum stehen an beiden Quellen nicht.
- ergebnis: BELEGT

## memmingen-ee — Stadt Memmingen
- status_katalog: ausgeschoepft
- beginnt: 2026-06-10
- endet: -
- beschlossen: -
- vorgaenger: sehr wahrscheinlich jährliche Auflagen — die Richtlinie ist ausdrücklich die "für das Jahr 2026"; eine frühere Auflage wird an der Quelle aber nicht benannt
- herkunft: live + pdf
- quelle: https://www.memmingen.de/hier-leben/umwelt-klimaschutz/foerderung.html und https://www.memmingen.de/fileadmin/Allgemeine_Dateiverwaltung/Bereich_Amt56_Umwelt-Klima/Foerderung/2026_Foerderrichtlinie_Klimaschutz.pdf
- snapshot: -
- zitat_beginnt: "Das Förderprogramm tritt am 10.06.2026 in Kraft." (Richtlinie, Abschnitt 9 Inkrafttreten; Titel: "Förderrichtlinie zum Förderprogramm „Klimaschutz“ in der Stadt Memmingen für das Jahr 2026")
- zitat_endet: (kein Programmende — nur Mittelerschöpfung, was nach Methode kein Ende ist: "Fördertopf für 2026 für das Förderprogramm Klimaschutz ist ausgeschöpft. Bitte stellen Sie keine Anträge mehr.")
- zitat_beschlossen: -
- versucht: Programmseite memmingen.de/…/foerderung.html (HTTP 200) — trägt den Ausschöpfungshinweis; verlinkte Richtlinie 2026_Foerderrichtlinie_Klimaschutz.pdf (HTTP 200) nennt das Inkrafttreten. Suche nach Vorjahresfassung, Außerkrafttretens- oder Beschlussklausel im PDF: keine Treffer.
- ergebnis: BELEGT

## baden-baden-pvplus — Stadtwerke Baden-Baden
- status_katalog: aktiv
- beginnt: 2026-01-01
- endet: -
- beschlossen: -
- vorgaenger: jährliche Auflagen — die Bedingungen sind ausdrücklich das "Förderprogramm 2026"; das Ende ist auch an das Inkrafttreten einer Nachfolgefassung geknüpft ("endet bei deren Ausschöpfung bzw. durch das Inkrafttreten eines anderen"). Eine konkrete frühere Auflage wird nicht datiert.
- herkunft: pdf
- quelle: https://www.stadtwerke-baden-baden.de/media/docs/bauherren-und-planer/foerderprogramme/Foerderbedingungen.pdf (verlinkt von https://www.stadtwerke-baden-baden.de/de/bauherren-planer/foerderprogramme/photovoltaikanlage.php)
- snapshot: -
- zitat_beginnt: "Das Förderprogramm tritt am 01.01.2026 in Kraft und hat Gültigkeit bis zum 31.12.2026."
- zitat_endet: (kein Ende — laufend; die aktuelle Auflage ist befristet bis 31.12.2026, siehe Zitat oben)
- zitat_beschlossen: -
- versucht: Programmseite photovoltaikanlage.php (HTTP 200) nennt keine Fristen, verlinkt aber zwei PDFs. "Foerderbedingungen.pdf" (HTTP 200, Stand April 2026) trägt gleich im Kopf die Geltungsklausel. Ein Gremienbeschluss ist bei einem Stadtwerke-Programm dort nicht ausgewiesen.
- ergebnis: BELEGT

## schwerin-pv — Stadtwerke Schwerin
- status_katalog: aktiv
- beginnt: 2026-01-01
- endet: -
- beschlossen: -
- vorgaenger: jährliche Auflagen erkennbar (Richtlinie und Antrag tragen durchgehend die Jahreszahl 2026, Kontingent "im Jahr 2026 insgesamt maximal 10 Photovoltaik-Anlagen"); eine frühere Auflage wird nicht datiert
- herkunft: pdf
- quelle: https://www.stadtwerke-schwerin.de/sites/default/files/2026-01/SWS-Foerderantrag_und_-richtlinie_fuer_PV-Anlagen_DSGVO_2026_beschreibbar.pdf (verlinkt von https://www.stadtwerke-schwerin.de/service/foerderprogramme)
- snapshot: -
- zitat_beginnt: "4 Laufzeit des Förderprogramms — Das Förderprogramm der SWS für Photovoltaik-Anlagen läuft vom 01.01.2026 bis 31.12.2026." (dazu im Kopf des Antrags: "Gültig ab 01.01.2026 bis 31.12.2026")
- zitat_endet: (kein Ende — laufende Auflage; befristet bis 31.12.2026, dazu: "Es werden im Jahr 2026 insgesamt maximal 10 Photovoltaik-Anlagen gefördert. Sollte dieses Kontingent bereits vor Ablauf der Frist (31.12.2026) erreicht sein, endet das Förderprogramm vorzeitig.")
- zitat_beschlossen: -
- versucht: Übersichtsseite stadtwerke-schwerin.de/service/foerderprogramme (HTTP 200) enthält keine Fristen im Fließtext, verlinkt aber die kombinierte Antrags- und Richtliniendatei. Diese (HTTP 200) trägt die Laufzeit an drei Stellen. Ein Gremienbeschluss ist bei einem Stadtwerke-Programm dort nicht ausgewiesen.
- ergebnis: BELEGT

## hoehr-grenzhausen-energie — Stadt Höhr-Grenzhausen
- status_katalog: ausgeschoepft
- beginnt: 2024-01-01
- endet: -
- beschlossen: 2024-02-19
- vorgaenger: - (keine Außerkraft-, Ersetzungs- oder Neufassungsklausel im Richtlinientext)
- herkunft: live
- quelle: https://www.hoehr-grenzhausen.de/themen-die-uns-bewegen/foerderung-privater-energiegewinnung/foerderrichtlinie-der-stadt-hoehr-grenzhausen/
- snapshot: -
- zitat_beginnt: "VI. Inkrafttreten — Die Richtlinie tritt zum 01.01.2024 in Kraft. Höhr-Grenzhausen, den 20.02.2024 gez. Michael Thiesen Stadtbürgermeister"
- zitat_endet: (kein Ende — nur Mittelerschöpfung, nach Methode kein Programmende: "Für das Haushaltsjahr 2026 sind alle Fördermittel ausgeschöpft. Es können keine weiteren Anträge bewilligt werden.")
- zitat_beschlossen: "Der Stadtrat der Stadt Höhr-Grenzhausen hat in der Sitzung vom 19.02.2024 folgende Richtlinie beschlossen"
- versucht: Richtlinienseite hoehr-grenzhausen.de (HTTP 200) trägt den vollständigen Richtlinientext im HTML — Beschluss (19.02.2024), rückwirkendes Inkrafttreten (01.01.2024) und Ausfertigungsdatum (20.02.2024) stehen dort getrennt nebeneinander. Ein PDF war deshalb nicht nötig.
- ergebnis: BELEGT

## wietzen-pv — Gemeinde Wietzen (Samtgemeinde Weser-Aue)
- status_katalog: ausgeschoepft
- beginnt: 2022-07-05
- endet: -
- beschlossen: -
- vorgaenger: - (keine frühere Auflage genannt; die Richtlinie ist die erstmalige Auflegung: "legt daher … ab dem 5.7.2022 ein kommunales Förderprogramm … auf")
- herkunft: live + pdf
- quelle: https://www.weser-aue.de/rathaus-politik/foerderprogramme/ und das dort verlinkte PDF "Förderrichtlinie Gemeinde Wietzen" (https://www.weser-aue.de/downloads/datei/YjY1ZWI3OTQ3ODQ2OGVmOHZhcC9pUmJveEMrY0dFelhtUzNpQ2FNNUtJQVhqV292U3JuVzF4Zm1SV0J6QlVTV2F3TGRjcE5lSHg5amVKUnFoMWdnYmRkeE16bzdneWoxRFg0Q0NDUmo2aFl4cTYxU3BzZll2SWJGOUhjbTlJcVc3QVF0MmQ2dDBsRzFZTTFHc2d5Z2ZBcUZHbUpEQUgrRTNnTTU4UT09)
- snapshot: -
- zitat_beginnt: "9. Inkrafttreten — Die Richtlinie gilt mit Wirkung ab dem 5.7.2022 und gilt für alle Maßnahmen, die ab diesem Zeitpunkt beantragt werden." (dazu Ziffer 1: "Die Gemeinde Wietzen legt daher im Rahmen der Haushaltsmittel ab dem 5.7.2022 ein kommunales Förderprogramm … auf")
- zitat_endet: (kein Ende — nur Mittelerschöpfung des laufenden Jahres: "Leider stehen aktuell keine weiteren Fördermittel für 2026 mehr zur Verfügung!"; die Richtlinie selbst ist unbefristet mit jährlichem Vorbehalt: "Da es eine freiwillige Leistung ist, wird jedes Jahr über die Weiterführung entschieden.")
- zitat_beschlossen: -
- versucht: Übersichtsseite weser-aue.de/rathaus-politik/foerderprogramme/ (HTTP 200) trägt Ausschöpfungshinweis und den Satz zur Befristung "vorerst bis zum 31.12.2026"; die Richtlinie liegt hinter einem kodierten Download-Link (HTTP 200, echtes PDF) und nennt in Ziffer 9 das Inkrafttreten samt Ausfertigungsdatum. Ein Ratsbeschlussdatum steht in beiden Quellen nicht — die Richtlinie ist nur von Gemeindedirektor und Bürgermeister gezeichnet.
- ergebnis: BELEGT

## gaimersheim-energie — Markt Gaimersheim
- status_katalog: aktiv
- beginnt: 2026-01-01
- endet: -
- beschlossen: -
- vorgaenger: - (an der Quelle nicht benannt; das "ab dem 01.01.2026" der aktuellen Konditionen legt eine frühere Fassung nahe, belegt ist sie nicht)
- herkunft: live
- quelle: https://gaimersheim.de/forderprogramme/
- snapshot: -
- zitat_beginnt: "Ab dem 01.01.2026 wird die Installation von Photovoltaikanlagen bis 30 KWp mit 20 % der Anschaffungskosten (maximal 300,– EUR) und die Installation eines Batteriespeichers, unabhängig von der Leistung, ebenfalls mit 20 % der Anschaffungskosten (maximal 500,– EUR) gefördert." — Vorbehalt: der Satz datiert die aktuellen Konditionen, nicht zwingend die erste Auflage des Programms.
- zitat_endet: -
- zitat_beschlossen: -
- versucht: Förderprogrammseite gaimersheim.de/forderprogramme/ (HTTP 200) — der PV-Abschnitt nennt das Datum, aber weder Richtlinie noch Marktgemeinderatsbeschluss. Das einzige verlinkte Programmdokument ist das reine Antragsformular (…/2026/03/Antrag-Foerderung_ab-2026.pdf, HTTP 200) und enthält gar keine Datumsangaben. Eine Richtlinie als eigenes Dokument ist auf der Seite nicht verlinkt.
- ergebnis: BELEGT

## dietmannsried-pv — Markt Dietmannsried
- status_katalog: aktiv
- beginnt: 2023-09-28
- endet: -
- beschlossen: 2023-09-29
- vorgaenger: -
- herkunft: live + pdf
- quelle: https://www.dietmannsried.de/rathaus/aktuelles-bekanntmachungen/foerderprogramm-pv-anlagen.html und https://www.dietmannsried.de/fileadmin/user_upload/rathaus/bauamt/Richtlinie1.pdf
- snapshot: -
- zitat_beginnt: "E. Inkrafttreten — Diese Richtlinie gilt mit Wirkung ab dem 28.09.2023." (Richtlinien-PDF, letzter Abschnitt). Die Programmseite ergänzt ohne Datum: "Das Förderprogramm tritt mit sofortiger Wirkung in Kraft."
- zitat_endet: -
- zitat_beschlossen: "Der Marktgemeinderat beschließt am 29.09.2023 Kommunales Förderprogramm für Photovoltaikanlagen."
- versucht: Programmseite dietmannsried.de/…/foerderprogramm-pv-anlagen.html (HTTP 200) nennt den Marktgemeinderatsbeschluss; das dort als "Richtlinien zum Förderprogramm" verlinkte PDF (…/bauamt/Richtlinie1.pdf, HTTP 200) trägt das Inkrafttreten. Hinweis: Beschlussdatum (29.09.) und Wirkungsdatum der Richtlinie (28.09.) weichen an den beiden Trägerquellen um einen Tag ab — beide sind hier wörtlich so wiedergegeben, nicht harmonisiert.
- ergebnis: BELEGT

## ludwigshafen-kipki — Stadt Ludwigshafen am Rhein
- status_katalog: eingestellt
- beginnt: 2024-09-16
- endet: 2026-03
- beschlossen: -
- vorgaenger: -
- herkunft: live
- quelle: https://ludwigshafen.de/standort-mit-zukunft/klima/foerderprogramme
- snapshot: -
- zitat_beginnt: "Seit Montag, 16. September 2024, konnten Bürger*innen mit Hauptwohnsitz in Ludwigshafen einen Antrag auf Förderung für selbstgenutzte Balkonkraftwerke stellen." — davon getrennt das Inkrafttreten der Richtlinie: "ab dem Datum des Inkrafttretens der Ludwigshafener Förderrichtlinie „Private Photovoltaik-Balkon-Anlagen“ (10. September 2024)"
- zitat_endet: "Die Fördermittel sind nun - Mitte März 2026 - ausgeschöpft. Das heißt, dass keine neuen Anträge mehr gestellt werden können." (Seitentitel: "Förderprogramme für Bürger*innen beendet"). Hier ist die Ausschöpfung ausdrücklich mit dem Antragsstopp verknüpft, deshalb als Ende gewertet; taggenau ist sie nicht.
- zitat_beschlossen: -
- versucht: Programmseite ludwigshafen.de/…/klima/foerderprogramme (HTTP 200) trägt sowohl den Rückblick mit Antragsstart und Richtlinien-Inkrafttreten als auch den Ausschöpfungs-/Beendigungshinweis. Ein Stadtratsbeschlussdatum steht dort nicht; ein Richtlinien-PDF ist nicht verlinkt.
- ergebnis: BELEGT

## waiblingen-klimaschutz — Stadt Waiblingen
- status_katalog: pausiert
- beginnt: -
- endet: 2026-06-24
- beschlossen: -
- vorgaenger: sehr wahrscheinlich jährliche Auflagen (die Seite spricht durchgehend vom "Städtischen Förderprogramm Klimaschutz 2026"); eine frühere Auflage wird nicht datiert
- herkunft: live
- quelle: https://www.waiblingen.de/de/Die-Stadt/Unsere-Stadt/Nachhaltigkeit-Umwelt/Energie-Klimaschutz/Foerderprogramm-Klimaschutz
- snapshot: -
- zitat_beginnt: -
- zitat_endet: "Der Gemeinderat hat die Schließung des Förderprogramm Klimaschutz 2026 zum 24. Juni 2026 beschlossen. … Alle Förderanträge, die nach dem 24. Juni 2026 eingehen, können nicht angenommen werden." Dazu der Hinweis auf die Pause: "Über eine Fortführung des Förderprogramm Klimaschutz wird im Rahmen des Haushaltsplanverfahrens beraten."
- zitat_beschlossen: (kein Datum — die Quelle nennt nur, DASS der Gemeinderat die Schließung beschlossen hat, und den Stichtag der Schließung, nicht den Sitzungstag)
- versucht: Programmseite waiblingen.de/…/Foerderprogramm-Klimaschutz (HTTP 200) trägt den Schließungshinweis vollständig. Auf der Seite ist kein Richtlinien-PDF verlinkt — die fünf Dokument-Links führen zu Antragsformular, Flyer, Zeitungsartikel und Bundesförderungs-Info. Web-Archiv derselben Adresse (Stand 2022) für ein Startdatum: HTTP 429 bzw. 503, also nicht erreichbar.
- ergebnis: BELEGT (nur Ende; Startdatum nicht auffindbar)

## herne-klimafoerderung — Stadt Herne
- status_katalog: pausiert
- beginnt: 2023-06-19
- endet: 2023-12-31
- beschlossen: -
- vorgaenger: Richtlinie vom 06.06.2022 (die 2023er Fassung "ersetzt somit die alte Richtlinie vom 06.06.2022"); die Seite nennt zusaetzlich eine Fassung vom 14.03.2022
- herkunft: archiv
- quelle: http://web.archive.org/web/20240528162353if_/https://www.herne.de/PDF/Klima/richtlinie_foerderung_photovoltaik_plus_speicher.pdf (Richtlinie "Foerderung Photovoltaik + Speicher", verlinkt von https://www.herne.de/Stadt-und-Leben/Klima/Foerderprogramme/)
- snapshot: 2024-05-28 16:23:53
- zitat_beginnt: "Die Richtlinie tritt am 19.06.2023 in Kraft und ersetzt somit die alte Richtlinie vom 06.06.2022."
- zitat_endet: "Nicht foerderungsfaehig sind: ... b) Antraege, welche nach dem 31.12.2023 eingereicht werden,"
- zitat_beschlossen: -
- versucht: Live-Seite https://www.herne.de/Stadt-und-Leben/Klima/Foerderprogramme/ (200) — nennt nur "Die Foerderungen wechseln jedes Jahr je nach verfuegbaren Mitteln und Nachfrage. Im Jahr 2026 planen wir Stecker-PV-Geraete und Speicher zu foerdern.", keine Richtlinien-PDFs mehr verlinkt, keine Daten. Live-URL des PV-Speicher-PDF liefert inzwischen eine HTML-Fehlerseite. Ueber Wayback-Snapshot 2024-05-28 die damals verlinkten Richtlinien-PDFs gefunden und das PV+Speicher-PDF gelesen.
- ergebnis: BELEGT

## wolfsburg-pv — Stadt Wolfsburg
- status_katalog: pausiert
- beginnt: 2026-05-14
- endet: 2026-06-14
- beschlossen: -
- vorgaenger: - (Richtlinie traegt "Stand: 16.03.2026"; die Seite spricht von "dem jeweiligen Foerderjahr", nennt aber keine frueheren Runden mit Datum)
- herkunft: pdf
- quelle: https://www.wolfsburg.de/-/media/wolfsburg/statistik_daten_fakten/umwelt/klimaschutz/foerderbedingungen_pv_anlagen.pdf (verlinkt von https://www.wolfsburg.de/umweltnaturschutz/klimaschutz/erneuerbare_energien)
- snapshot: -
- zitat_beginnt: "Der Zeitpunkt der Antragstellung beginnt vorbehaltlich des Vorhandenseins entsprechender Haushaltmittel mit Freischaltung des Antragsformulars am 14.05.2026 und endet mit Ablauf des 14.06.2026."
- zitat_endet: "Das Zeitfenster fuer die Antragstellung zur Foerderung von Investitionen zur Solarstromerzeugung ist am 14.06.2026 um 24 Uhr abgelaufen." (Programmseite) — deckungsgleich mit Punkt 7.1 der Foerderbedingungen
- zitat_beschlossen: -
- versucht: Programmseite (200) gelesen — nennt das abgelaufene Antragsfenster; von dort das PDF "foerderbedingungen_pv_anlagen.pdf" (200) geholt und Punkt 7.1 gelesen. Ein Ratsbeschlussdatum steht in keiner der beiden Quellen; Punkt 11 sagt nur "Diese Richtlinie gilt ab Veroeffentlichung auf der Internetseite der Stadt Wolfsburg."
- ergebnis: BELEGT

## bottrop-solaroffensive — Stadt Bottrop
- status_katalog: ausgeschoepft
- beginnt: 2025-11-01
- endet: -
- beschlossen: -
- vorgaenger: ja, mehrfach: erstmals 2019 initiiert; die aktuelle Richtlinie loest die "Richtlinie zur Foerderung von Photovoltaik-Anlagen im Stadtgebiet Bottrop vom 01.01.2023" ab
- herkunft: pdf
- quelle: https://www.bottrop.de/downloads/umwelt/Photovoltaik-Anlagen_Richtlinie_2025_2026.pdf (verlinkt von https://www.bottrop.de/klima-umwelt-natur/solarenergie-foerderung/solaroffensive/solaroffensive.php)
- snapshot: -
- zitat_beginnt: "10. Inkrafttreten — Die Richtlinie tritt am 01.11.2025 in Kraft. Durch diese Richtlinie tritt die Richtlinie zur Foerderung von Photovoltaik-Anlagen im Stadtgebiet Bottrop vom 01.01.2023 ausser Kraft."
- zitat_endet: kein Enddatum belegt — die Programmseite sagt nur "Der Foerdertopf fuer die Solaroffensive ist ausgeschoepft" (Mittel alle, kein Fristende)
- zitat_beschlossen: -
- zitat_vorgaenger: "Die Stadt setzt damit ein Foerderprogramm fort, das 2019 erstmals initiiert wurde."
- versucht: Programmseite (200) gelesen; von dort beide Richtlinien-PDFs gefunden und das PV-PDF (200) vollstaendig gelesen. Die Richtlinie enthaelt keine Befristung und kein Ratsbeschlussdatum; nur Punkt 10 "Inkrafttreten".
- ergebnis: BELEGT

## krefeld-klimafreundlich — Stadt Krefeld
- status_katalog: ausgeschoepft
- beginnt: 2024-12-04
- endet: 2024-12-04 (VORBEHALT: das ist der Tag der Ausschoepfung, an dem die Antragstellung deaktiviert wurde, keine gesetzte Frist)
- beschlossen: -
- vorgaenger: - (die Seite nennt keine fruehere Auflage mit Datum; ein verlinktes Formular heisst "Auszahlungsantrag_2022_neu.pdf", das ist aber kein Beleg fuer eine Auflage)
- herkunft: live
- quelle: https://www.krefeld.de/de/umwelt/foerderprogramm-klimafreundliches-wohnen-in-krefeld/ (Seitenstand "25.03.2026")
- snapshot: -
- zitat_beginnt: "Der Foerderantrag wird ueber ein Online-Antragsformular uebermittelt, welches erst ab Beginn des Foerderprogrammes (ab dem 04.12.24) auf dieser Seite freigeschaltet wird."
- zitat_endet: "Das Budget fuer die allgemeine Foerderung ist am 04.12.2024 bereits nach kurzer Zeit vollstaendig ausgeschoepft. Aus diesem Grund ist es nicht mehr moeglich, Antraege fuer die allgemeine Foerderung ueber unser Online-Antragsformular zu stellen."
- zitat_beschlossen: -
- versucht: Programmseite (200) vollstaendig gelesen — nennt Programmbeginn und Ausschoepfungstag im Klartext. Die Seite verweist auf eine "Foerderrichtlinie ... welche sie im Downloadbereich finden", verlinkt dort aber nur Auszahlungsantrag und Datenschutz-Einwilligung; kein Richtlinien-PDF und kein Ratsbeschluss auffindbar.
- ergebnis: BELEGT

## rhein-erft-energieoffensive — Rhein-Erft-Kreis
- status_katalog: ausgeschoepft
- beginnt: -
- endet: 2026-03-18
- beschlossen: -
- vorgaenger: ja — "Das Foerderprogramm laeuft bereits im vierten Jahr"; ausdruecklich genannt sind die Auflagen 2024 und 2025 ("Das Foerderprogramm 2024 und 2025 ist ausserordentlich gut angenommen worden", Landrat Frank Rock)
- herkunft: live
- quelle: https://www.rhein-erft-kreis.de/infrastruktur/energieoffensive.php
- snapshot: -
- zitat_beginnt: kein Antragsstart belegt — die Seite nennt nur "Fuer das Jahr 2026 stellt der Rhein-Erft-Kreis insgesamt 1 Million Euro zur Verfuegung", ohne Startdatum
- zitat_endet: "Seit dem 18. Maerz steht die Foerderampel auf 'Rot' - Antraege koennen nicht mehr gestellt werden; das Foerderprogramm wurde geschlossen." (Jahr aus dem Abschnittstitel "Energieoffensive 2026 ... Foerdermittel ausgeschoepft" und der direkt darunter datierten eigenen Pressemitteilung "18. Maerz 2026 ... Solarfoerderprogramm des Rhein-Erft-Kreises geschlossen")
- zitat_beschlossen: -
- versucht: Programmseite (200) gelesen. Einziges verlinktes PDF ist "2025-Solarfoerderrichtlinie-Rhein-Erft-Kreis.pdf" (200, 2,98 MB) — ein reines Scan-PDF ohne Textebene (pdftotext liefert 6 Byte), daher nicht auswertbar. Kein Kreistagsbeschluss auf der Seite.
- ergebnis: BELEGT (nur Enddatum; Start und Beschluss nicht belegbar)

## viersen-klimaschutz — Kreis Viersen
- status_katalog: eingestellt
- beginnt: 2023-11 (erstes Foerderfenster des Programms); die hier gelesene Dach-PV-Richtlinie der zweiten Auflage trat am 2024-06-13 in Kraft
- endet: 2024-11 (letztes Foerderfenster; das Programm ist beendet, die Seite nennt fuer das Ende keinen Tag, sondern nur den Informationsstand 13.04.2026)
- beschlossen: 2024-06-13 (Kreistagsbeschluss zur Richtlinie); Grundlage davor: Kreistagsbeschluss vom 2022-12-08 zur Fortschreibung des Klimaschutzkonzepts
- vorgaenger: ja — drei Foerderfenster: November 2023, August 2024, November 2024; eigene "Foerderrichtlinien Solarenergie 2023" als Vorgaengerfassung verlinkt
- herkunft: pdf
- quelle: https://www.kreis-viersen.de/system/files/dokumente/F%C3%B6rderrichtlinie%20Dach-PV%202024.pdf und https://www.kreis-viersen.de/themen/klima/klimaschutz/foerderprogramm-klimaschutz
- snapshot: -
- zitat_beginnt: "Der Kreis Viersen hat im Rahmen des Foerderprogramms Klimaschutz im November 2023, August 2024 und November 2024 Foerderfenster mit einem Budget von insgesamt circa 700.000EUR geoeffnet." (Programmseite) — dazu aus der Richtlinie: "Diese Richtlinie tritt zum 13.06.2024 in Kraft."
- zitat_endet: "Das Foerderprogramm Klimaschutz wurde beendet. Eine Antragstellung ist nicht mehr moeglich. Es ist kein neuer Foerderaufruf geplant." (Programmseite, "Bitte beachten Sie die aktuellen Informationen vom 13.04.2026") — ein Tag des Endes wird nicht genannt; die Richtlinie sagt nur "Der Zeitraum fuer die Antragstellung fuer das zweite Foerderfenster endet, sobald abzusehen ist, dass das noch zur Verfuegung stehende Budget ausgeschoepft ist."
- zitat_beschlossen: "Es wird auf Grundlage des Beschlusses zur Fortschreibung des Integrierten Klimaschutzkonzeptes durch den Kreistag vom 08.12.2022 eingefuehrt. Die folgende Richtlinie ergeht auf Grundlage des Beschlusses des Kreistages vom 13.06.2024."
- versucht: Programmseite (200) gelesen — nennt Historie mit drei Foerderfenstern und das Programmende; von dort die Dach-PV-Richtlinie 2024 (200) geholt und Beschluss-, Inkrafttretens- und Foerderfenster-Abschnitte gelesen. Die 2023er Solarenergie-Richtlinie wurde aus Budgetgruenden nicht zusaetzlich geoeffnet.
- ergebnis: BELEGT

## bergstrasse-speicher — Kreis Bergstrasse
- status_katalog: ausgeschoepft
- beginnt: 2024 (Tag nicht belegbar — die Ankuendigung sagt nur "ab sofort", und die Pressemitteilung traegt auf der archivierten Seite kein auslesbares Datum)
- endet: 2024-07-30 (faktisches Ende durch Ausschoepfung, ausdruecklich "Es werden keine weiteren Antraege mehr angenommen"); gesetzte Frist waere der 2024-12-31 gewesen
- beschlossen: -
- vorgaenger: ja — die Navigation derselben Seite fuehrt "2023: PV-Plus-Pioneers-Wettbewerb", "2023: Energiespeicher" und "2022: Balkon-Photovoltaikanlagen" als eigene Foerderprogramme des Kreises
- herkunft: archiv
- quelle: http://web.archive.org/web/20240828234245/https://www.kreis-bergstrasse.de/themen-projekte/nachhaltigkeit/foerderprogramme/2024-pv-stromspeicher/ sowie http://web.archive.org/web/20240828234245/https://www.kreis-bergstrasse.de/aktuelles-veroeffentlichungen/pressemitteilungen/pressemitteilungen-jahrgang-2024/157-pv-stromspeicherfoerderprogramm/
- snapshot: 2024-08-28 23:42:45
- zitat_beginnt: "Antraege koennen ab sofort bis 31. Dezember 2024 gestellt werden, solange die Foerdermittel noch nicht ausgeschoepft sind." (eigene Pressemitteilung Nr. 157/2024)
- zitat_endet: "Der Foerdertopf ist am 30.07.2024 am Vormittag ausgeschoepft worden. ... Es werden keine weiteren Antraege mehr angenommen." (Programmseite) — dazu die Frist aus der Richtlinie: "Antraege muessen spaetestens bis einschliesslich 31.12.2024 ... eingegangen sein."
- zitat_beschlossen: -
- versucht: Live-Klimaschutzseite (200) — das Programm hat dort keine eigene Seite mehr, nur die Bilanz-Pressemitteilung Nr. 080/2026 (200), die "seines 2024er Foerderprogramms" sagt, aber keine Fristen nennt. Ueber den Wayback-Stand 2024-08-28 die eigene Programmseite "2024: PV-Stromspeicher" und die Startpressemitteilung Nr. 157/2024 gelesen. Ein Kreistags-/Kreisausschussbeschluss wird in keiner der vier Quellen genannt.
- ergebnis: BELEGT

## mayen-koblenz-speicher — Landkreis Mayen-Koblenz
- status_katalog: eingestellt
- beginnt: 2024-03 (Inkrafttreten der Richtlinie des 5. Antragsfensters; die Richtlinie traegt "Stand: 03/ 2024 | Version: 1.2" und nennt als Startpunkt "ab Inkrafttreten dieser Richtlinie", ohne Tag)
- endet: 2024-09-30 (Antragsfrist des 5. und letzten Antragsfensters)
- beschlossen: 2023-03-27 (Kreistag Mayen-Koblenz)
- vorgaenger: ja — die Richtlinie bezeichnet sich selbst als "5. Antragsfenster - 2024", es gab also vier fruehere Runden (Jahre nicht einzeln belegt)
- herkunft: archiv
- quelle: http://web.archive.org/web/20240524131913if_/https://www.kvmyk.de/themen/klima/klimaschutzmassnahmen/solarspeicher-foerderprogramm/richtlinie-solarspeicher-myk-2024.pdf und http://web.archive.org/web/20240413111255/https://www.kvmyk.de/themen/klima/klimaschutzmassnahmen/solarspeicher-foerderprogramm/
- snapshot: PDF 2024-05-24 13:19:13, Programmseite 2024-04-13 11:12:55
- zitat_beginnt: "Die schriftliche Antragstellung ist fuer das Jahr 2024 bei der Bewilligungsbehoerde ab Inkrafttreten dieser Richtlinie bis einschliesslich 30. September moeglich." — dazu "Die Richtlinie tritt nach Beschluss & Veroeffentlichung ... in Kraft." und "Stand: 03/ 2024 | Version: 1.2"
- zitat_endet: "... bis einschliesslich 30. September moeglich." (Nr. 11 der Richtlinie); die Programmseite meldet dazu "+++ Antragsstellung fuer das Solarspeicher-Foerderprogramm 2024 nicht mehr moeglich. +++"
- zitat_beschlossen: "Richtlinie des Landkreises Mayen-Koblenz zur Foerderung von Solarspeichern — 5. Antragsfenster - 2024 — auf Grundlage des Beschlusses des Kreistages Mayen-Koblenz vom 27. Maerz 2023"
- versucht: Live-Seite Klimaschutzmassnahmen (200) fuehrt das Solarspeicher-Programm nicht mehr, nur noch ein beendetes Balkonkraftwerk-Zuschussprogramm (200, KIPKI-finanziert, eigenes Programm). Ueber den Wayback-Stand 2023 die alte Programmadresse gefunden, deren Snapshot 2024-04-13 gelesen und von dort das Richtlinien-PDF (Snapshot 2024-05-24) geholt.
- ergebnis: BELEGT

## ennepetal-steckersolar — Stadt Ennepetal
- status_katalog: aktiv
- beginnt: 2026-06-01
- endet: 2026-12-31 (Geltungsende der Richtlinie — das Programm laeuft noch, die Frist steht aber fest)
- beschlossen: -
- vorgaenger: - (die Richtlinie nennt keine Vorgaengerfassung; die Meldung ist neu vom 12.06.2026)
- herkunft: pdf
- quelle: https://www.ennepetal.de/downloads/datei/MTVhN2UwMWRjMTY1YzZiYThlTFZsRVdqRkdhRjRRcll4eFlHYXJVMUk3SUFQcHBSN3ZPMFdNN2R4aGI3YVRaMVBlNFFYTGpwWmQrZG50OUwyRmY2RCtsbkZVNWNXYzBLViszMHYwWWUveXpNL2RvanhtWmY2dkF3VVRYRXRmSWJrTC9SenlsNEFYVnFHUEZTSkZBdVVpZVZLcTdUT0JWamg3YWVXdz09 ("Foerderrichtlinie Steckersolar", verlinkt von https://www.ennepetal.de/portal/meldungen/foerderung-von-steckersolargeraeten-900000863-37420.html)
- snapshot: -
- zitat_beginnt: "12. Inkrafttreten — Die Foerderrichtlinie tritt am 01.06.2026 in Kraft und gilt bis zum 31.12.2026."
- zitat_endet: dieselbe Klausel ("... und gilt bis zum 31.12.2026")
- zitat_beschlossen: -
- versucht: Uebersichtsseite Klimafoerderprogramme (200), von dort die Meldung "Foerderung von Steckersolargeraeten" (200, "Meldung vom 12.06.2026, Letzte Aktualisierung: 31.07.2026") und daraus das Richtlinien-PDF ueber den verschluesselten Download-Link (200, 3 Seiten). Ein Ratsbeschlussdatum steht in keiner der drei Quellen; das Ratsinformationssystem wurde nicht durchsucht.
- ergebnis: BELEGT

## wittlich-balkonkraftwerke — Stadt Wittlich
- status_katalog: ausgeschoepft
- beginnt: 2024-01-01
- endet: - (kein Datum belegt; die Antragstellung endete mit der Ausschoepfung, die Seite nennt dafuer keinen Tag)
- beschlossen: -
- vorgaenger: - (keine fruehere Auflage genannt; Programm aus KIPKI-Landesmitteln finanziert)
- herkunft: pdf
- quelle: https://www.wittlich.de/de/planung-umwelt-und-mobilitaet/klima-landwirtschaft-und-forsten/klimaschutz/foerderprogramm-balkonkraftwerke/foerderrichtlinie-balkonkraftwerke-fuer-privathaushalte-pdf.pdf und https://www.wittlich.de/de/planung-umwelt-und-mobilitaet/klima-landwirtschaft-und-forsten/klimaschutz/foerderprogramm-balkonkraftwerke/
- snapshot: -
- zitat_beginnt: "Foerderrichtlinie der Stadt Wittlich zum kommunalen Foerderprogramm 'Balkonkraftwerke fuer Privathaushalte' — Gueltig ab 01. Januar 2024"; dazu die Programmseite: "Gefoerdert werden ausschliesslich Balkonkraftwerke, die ab dem 1.1.2024 (Rechnungsdatum) angeschafft wurden."
- zitat_endet: "+ + + KEINE ANTRAGSTELLUNG MEHR MOEGLICH + + + Der Foerdertopf fuer die Foerderung von Balkonkraftwerken ist aufgebraucht. Es koennen keine weiteren Foerderantraege gestellt oder bewilligt werden. Insgesamt wurden 200 Balkonkraftwerke in der Stadt Wittlich gefoerdert." — ohne Tagesangabe
- zitat_beschlossen: -
- versucht: Programmseite (200) vollstaendig gelesen; von dort das Richtlinien-PDF (200) geholt und Kopf, Fristen und Schlussabschnitte gelesen. Die Richtlinie hat keinen Inkrafttretens-Paragrafen, sondern nur den Kopfvermerk "Gueltig ab", und nennt weder Befristung noch Stadtratsbeschluss. Die Seite datiert ihre Erstellung auf 2023-07-10 und ihre letzte Aenderung auf 2026-08-10 — beides keine Programmdaten.
- ergebnis: BELEGT (Start belegt, Ende ohne Datum)

## hochheim-klimaschutz — Stadt Hochheim am Main
- status_katalog: aktiv
- beginnt: 2025-09-04
- endet: -
- beschlossen: 2025-09-04 (Stadtverordnetenversammlung)
- vorgaenger: -
- herkunft: pdf
- quelle: https://serviceportal.hochheim.de/medien/dokumente/foederrichtlinie_balkonkraftwerk.pdf (Foerderrichtlinie Balkonkraftwerk, verlinkt vom Service-Portal-Eintrag https://serviceportal.hochheim.de/buergerservice/dienstleistungen/staedtisches-foerderprogramm-fuer-klimaschutz-und-klimaanpassung-900000573-0.html, dieser wiederum von https://www.hochheim.de/unsere-stadt/klimaschutz/staedtisches-foerderprogramm)
- snapshot: -
- zitat_beginnt: "7. Inkrafttreten — Diese Richtlinie tritt am 04.09.2025 in Kraft."
- zitat_endet: kein Enddatum — die Richtlinie ist unbefristet; das Portal sagt nur "Sollten die Haushaltsmittel fuer ein Haushaltsjahr ausgeschoepft sein, ist eine Antragstellung ueber das Service-Portal nicht mehr moeglich"
- zitat_beschlossen: "Mit dem staedtischen Foerderprogramm 'Balkonkraftwerk', das von der Stadtverordnetenversammlung am 04.09.2025 beschlossen wurde, moechte die Stadt Hochheim am Main die Hochheimer Buergerinnen ..." — dazu die Unterzeichnung "Hochheim, den 04.09.2025 / DER MAGISTRAT / Gez. Dirk Westedt, Buergermeister"
- versucht: Programmseite (200) verweist auf das Service-Portal; dort (200) die fuenf Teilrichtlinien gefunden und die Balkonkraftwerk-Richtlinie (200) gelesen. Beschluss- und Inkrafttretensdatum fallen hier ausnahmsweise auf denselben Tag, beide stehen woertlich im Dokument. Die uebrigen vier Teilrichtlinien (Baumpflanzung, Dach-/Fassadenbegruenung, Entsiegelung) betreffen kein PV und wurden nicht geoeffnet.
- ergebnis: BELEGT

## linsengericht-oekologie — Gemeinde Linsengericht
- status_katalog: aktiv
- beginnt: 2026-02-02 (Inkrafttreten der aktuellen Fassung Version 3.0 "mit sofortiger Wirkung"; das Programm selbst laeuft seit 2022, siehe vorgaenger)
- endet: 2026-12-31
- beschlossen: - (kein Gemeindevertretungs-Beschluss genannt; die Richtlinie ist vom Gemeindevorstand unterzeichnet, "Linsengericht, 02.02.2026, Der Vorstand der Gemeinde Linsengericht, Albert Ungermann, Buergermeister")
- vorgaenger: ja, luecken los dokumentiert im Versionsnachweis der Richtlinie: 0.1 Entwurf 20.05.2022 · 1.0 Version 1 am 24.05.2022 · 2.0 am 30.11.2022 (Zusammenschluss verschiedener Foerderrichtlinien zum "Foerderprogramm Oekologie") · 2.1 am 20.02.2023 · 2.2 am 02.04.2024 · 3.0 am 02.02.2026
- herkunft: pdf
- quelle: https://www.linsengericht.de/pdfs/satzungen/20250202-rl-photovoltaik.pdf (Foerderrichtlinie "Foerderprogramm Oekologie - Photovoltaik- und Balkonanlagen", Version 3.0; verlinkt von https://www.linsengericht.de/bauen-verkehr/klima-energie/foerderprogramme-oekologie/)
- snapshot: -
- zitat_beginnt: "Diese Richtlinie tritt mit sofortiger Wirkung in Kraft. — Linsengericht, 02.02.2026"
- zitat_endet: "10. Bedingungen und Auflagen ... e. Dieses Foerderprogramm ist bis zum 31.12.2026 befristet." — dazu Nr. 7 c: "Foerderantraege koennen bis spaetestens 31.12.2026 (Eingangsdatum) gestellt werden."
- zitat_beschlossen: -
- versucht: Programmseite (200) gelesen, von dort das Richtlinien-PDF (200, 2,8 MB) geholt. Das PDF ist ein Scan ohne Textebene (pdftotext liefert 9 Byte); ausgewertet wurde es daher seitenweise als Bild — Versionsnachweis auf Seite 2, Antrags- und Befristungsregeln auf Seite 5/6. Hinweis: Der Dateiname traegt "20250202", das Dokument selbst datiert dagegen durchgehend auf den 02.02.2026 (Version 3.0) — der Dateiname ist hier kein Beleg und offenbar ein Vertipper.
- ergebnis: BELEGT

## holzgerlingen-erneuerbare — Stadt Holzgerlingen
- status_katalog: aktiv
- beginnt: 2023-04-25 (Datum der Richtlinie selbst; ein eigener Satz "Anträge ab …" fehlt)
- endet: -
- beschlossen: -
- vorgaenger: Ja — Vorläufer-Förderprogramme seit 2002, die aktuelle Fassung wird ausdrücklich "Neuauflage" genannt; Solarthermie-Förderung wurde aus dem Vorgängerprogramm fortgeführt
- herkunft: pdf
- quelle: https://www.holzgerlingen.de/de-wAssets/docs/a_die-stadt/Klima-Energie/Foerderprogramm-Solare-Energienutzung/Foerderrichtlinie_Solare-Energienutzung_06.05.2024.pdf
- snapshot: -
- zitat_beginnt: "Förderrichtlinie „Solare Energienutzung“ vom 25.04.2023, zuletzt geändert am 06.05.2024"
- zitat_endet: -
- zitat_beschlossen: -
- zitat_vorgaenger: "bietet die Stadt Holzgerlingen seit dem Jahr 2002 Förderprogramme zur erneuerbaren Energieerzeugung für die Einwohnerschaft von Holzgerlingen an. In der Neuauflage des aktuellen Förderprogramms „Solare Energieerzeugung“ wird die bisherige Förderung von Solarthermieanlagen weitergeführt."
- versucht: Programmseite (HTTP 200) enthielt im Textteil keine Datumsformel, nur Navigation; PDF-Links extrahiert, Richtlinien-PDF (114 kB) geladen und vollständig durchsucht — keine Inkrafttretens-Klausel, kein Beschlussdatum, nur der Kopfvermerk mit den zwei Fassungsdaten.
- ergebnis: BELEGT

## wernau-balkonkraftwerke — Stadt Wernau (Neckar)
- status_katalog: aktiv
- beginnt: 2025-03-21
- endet: -
- beschlossen: 2024-07-22 (Gemeinderat)
- vorgaenger: nein — die Seite bezeichnet das Programm ausdrücklich als erstmalig
- herkunft: live
- quelle: https://www.wernau.de/wirtschaft-bauen/klimaschutz-und-nachhaltige-stadt/foerderprogramm-fuer-balkonkraftwerke
- snapshot: -
- zitat_beginnt: "Die Stadt Wernau (Neckar) unterstützt interessierte Bürger*innen seit dem 21.03.2025 mit einem Investitionszuschuss von 100 € pro Förderantrag bei der Installation von Photovoltaik-Anlagen auf Balkonen, Terrassen oder vergleichbaren Flächen."
- zitat_endet: -
- zitat_beschlossen: "Grundlage für dieses Förderprogramm ist der Beschluss des Gemeinderats vom 22.07.2024."
- zitat_vorgaenger: "Förderprogramm für Balkonkraftwerke in Wernau startet erstmalig"
- versucht: Programmseite direkt abgerufen (HTTP 200), Fließtext enthält Antragsstart und Gemeinderatsbeschluss wörtlich. Kein weiterer Abruf nötig.
- ergebnis: BELEGT

## muehlhausen-sulz-pv — Gemeinde Mühlhausen an der Sulz
- status_katalog: aktiv
- beginnt: 2022-05-01
- endet: -
- beschlossen: -
- vorgaenger: nein — "ruft ... ins Leben" beschreibt eine Neueinführung; kein Hinweis auf eine frühere Auflage. Die zugrunde liegende Richtlinie trägt den "Stand März 2022".
- herkunft: live
- quelle: https://www.muehlhausen-sulz.de/leben-and-soziales/bauen-and-wohnen/foerderprogramm-pv-anlage-mit-speicher-und-balkonkraftwerke
- snapshot: -
- zitat_beginnt: "Ab dem 1. Mai 2022 ruft die Gemeinde Mühlhausen ein gemeindliches Förderprogramm für Photovoltaikanlagen und Balkonkraftwerke im Gemeindegebiet ins Leben."
- zitat_endet: -
- zitat_beschlossen: -
- zitat_vorgaenger: "Die Förderung erfolgt nach der Förderrichtlinie – Stand März 2022."
- versucht: Programmseite abgerufen (HTTP 200), vollständiger Fließtext gelesen. Keine PDF-Links auf der Seite, kein Beschlussdatum und kein Enddatum genannt; die Richtlinie selbst ist nicht verlinkt.
- ergebnis: BELEGT

## senden-klima — Gemeinde Senden (Westfalen)
- status_katalog: eingestellt
- beginnt: 2021
- endet: 2025 (ab dem Jahr 2025 gibt es kein gemeindliches Programm mehr; die letzte Auflage lief 2024, ihr Budget war am 16.09.2024 ausgeschöpft — Ausschöpfung ist aber nicht das Programmende)
- beschlossen: 2021 (Auflegung im Klimaschutzkonzept 2021 beschlossen; Tagesdatum nicht genannt)
- vorgaenger: Ja — jährliche Auflagen 2021, 2022, 2023 und 2024 mit wechselnden Förderschwerpunkten; 2023 wurden die Programme von 2022 ausdrücklich fortgesetzt
- herkunft: live
- quelle: https://www.senden-westfalen.de/klima-programme
- snapshot: -
- zitat_beginnt: "Von 2021 bis 2024 wurden insgesamt 255.000 € für die Förderung von Dachbegrünungen, Bohrungen für Erdwärmesonden, unterirdische Zisternen, Stecker-Solar-Anlagen, Speicher für Solaranlagen und für Aufdach-Solaranlagen von der Gemeinde zur Verfügung gestellt"
- zitat_endet: "Aktuell (2025) sind keine gemeindlichen Förderprogramme vorgesehen."
- zitat_beschlossen: "Mit dem Klimaschutzkonzept 2021 der Gemeinde Senden ist die Auflegung mehrerer Förderprogramme für unterschiedliche Zielgruppe beschlossen worden."
- zitat_vorgaenger: "In 2023 wurden die mit großer Begeisterung in 2022 genutzten drei Förderprogramme fortgesetzt."
- versucht: Programmseite abgerufen (HTTP 200) und den Abschnitt "Bisherige Förderprogramme der Gemeinde Senden" vollständig gelesen — er führt die Jahre 2024 bis 2022 einzeln auf. Kein Richtlinien-PDF verlinkt, kein Tagesdatum für den Beschluss.
- ergebnis: BELEGT

## maintal-klima — Stadt Maintal
- status_katalog: ausgeschoepft
- beginnt: 2026-04-07 (Inkrafttreten der derzeit veröffentlichten Fassung; die Vorgängerfassung trat am selben Tag außer Kraft)
- endet: -
- beschlossen: 2024-11-04 (Stadtverordnetenversammlung — so im Kopf der Richtlinie; die Ausfertigung durch den Magistrat trägt dagegen den 03.03.2026, beide Daten stehen unverändert nebeneinander im selben Dokument)
- vorgaenger: Ja — eine frühere "Klima-Förderrichtlinie der Stadt Maintal zur Bezuschussung von Maßnahmen für Klimaschutz und Klimaanpassung" tritt mit der neuen Fassung außer Kraft; deren eigener Beginn ist hier nicht genannt
- herkunft: pdf
- quelle: https://daten2.verwaltungsportal.de/dateien/seitengenerator/8f74b2a02acb46276bfde4edaf30666b99276/Klima-Foerderrichtlinie_der_Stadt_Maintal.pdf (verlinkt von https://www.maintal.de/klima-f%C3%B6rderrichtlinie)
- snapshot: -
- zitat_beginnt: "§ 11 Inkrafttreten — Diese Richtlinie tritt am 07.04.2026 in Kraft. Gleichzeitig tritt die bisher geltende „Klima-Förderrichtlinie der Stadt Maintal zur Bezuschussung von Maßnahmen für Klimaschutz und Klimaanpassung“ außer Kraft."
- zitat_endet: -
- zitat_beschlossen: "Die Stadtverordnetenversammlung der Stadt Maintal hat in seiner Sitzung am 04.11.2024 die nachstehende Klima-Förderrichtlinie beschlossen:" / "Maintal, den 03.03.2026 DER MAGISTRAT der Stadt Maintal"
- zitat_vorgaenger: siehe zitat_beginnt
- versucht: Programmseite abgerufen (HTTP 200) — der Fließtext nennt nur den Haushaltsvorbehalt ("Förderanträge können nur bewilligt werden, solange die notwendigen Haushaltsmittel vorhanden sind"), kein Datum und kein "ausgeschöpft". Richtlinien-PDF geladen und gelesen; Inkrafttreten steht in § 11, Beschluss im Kopf.
- ergebnis: BELEGT

## roth-klimaschutz — Stadt Roth
- status_katalog: aktiv
- beginnt: 2024-04-01
- endet: -
- beschlossen: -
- vorgaenger: -
- herkunft: live
- quelle: https://www.stadt-roth.de/umwelt-mobilitaet/klimaschutz/klimaschutzfoerderprogramm
- snapshot: -
- zitat_beginnt: "Inkrafttreten — Diese Richtlinie tritt am 01.04.2024 in Kraft."
- zitat_endet: -
- zitat_beschlossen: -
- zitat_vorgaenger: -
- versucht: Programmseite abgerufen (HTTP 200); die vollständige Richtlinie steht direkt im Seitentext, der Inkrafttretens-Satz ist der vorletzte Absatz. Suche nach "außer Kraft", "Fassung", "Stand:", "Stadtrat" im Seitentext blieb ohne Treffer — kein Beschlussdatum, kein Hinweis auf eine Vorgängerfassung. Verlinkt sind nur Antragsformulare (PDF), keine Richtlinien-PDF.
- ergebnis: BELEGT

## wenden-heizungstausch — Gemeinde Wenden
- status_katalog: ausgeschoepft
- beginnt: 2022-10-01
- endet: -
- beschlossen: 2022-09-07 (Ratsbeschluss über die Bereitstellung von 50.000 € für dieses Programm; ein gesonderter Beschluss über die Richtlinie selbst ist nicht datiert)
- vorgaenger: -
- herkunft: pdf
- quelle: https://www.wenden.de/fileadmin/user_upload/Dokumente/Redaktion/Fachdienst_10/Kommunales/Ortsrecht/Foerderrichtlinie_Heizungstausch.pdf (verlinkt von https://www.wenden.de/wirtschaft-umwelt-verkehr/klima-umwelt/foerderprogramme)
- snapshot: -
- zitat_beginnt: "Diese Richtlinie tritt zum 01.10.2022 in Kraft und gilt für alle Maßnahmen, die ab diesem Zeitpunkt beantragt werden. Die Richtlinie ist gültig, solange Haushaltsmittel hierfür zur Verfügung stehen und der Umweltausschuss keine Änderung der Inhalte beschließt."
- zitat_endet: -
- zitat_beschlossen: "Der Rat der Gemeinde Wenden hat am 7. September 2022 insgesamt 50.000 € für dieses Förderprogramm bereitgestellt."
- zitat_vorgaenger: -
- versucht: Programmseite abgerufen (HTTP 200) — Fließtext ohne Datum, nennt nur allgemein "Der Rat der Gemeinde Wenden hat verschiedene Förderprogramme beschlossen". Verlinktes Richtlinien-PDF geladen und vollständig durchsucht: Inkrafttreten in Ziffer 10, Ratsbeschluss in Ziffer 7.2. Kein Enddatum, keine Aussage zur Ausschöpfung im Dokument.
- ergebnis: BELEGT

## hohenahr-pv — Gemeinde Hohenahr
- status_katalog: aktiv
- beginnt: 2023-01-01 (rückwirkend; der Beschluss fiel erst am 20.07.2023)
- endet: -
- beschlossen: 2023-07-20 (Gemeindevertretung)
- vorgaenger: -
- herkunft: live
- quelle: https://www.hohenahr.de/bauen-umwelt/energie-umwelt/foerderprogramm-pv-anlagen/
- snapshot: -
- zitat_beginnt: "Die Förderrichtlinie tritt rückwirkend zum 01. Januar 2023 in Kraft."
- zitat_endet: -
- zitat_beschlossen: "Die Gemeindevertretung der Gemeinde Hohenahr hat in ihrer Sitzung am 20. Juli 2023 eine Förderrichtlinie für Zuschüsse zur Förderung von Photovoltaikanlagen beschlossen."
- zitat_vorgaenger: -
- versucht: Programmseite abgerufen (HTTP 200); Beschluss- und Inkrafttretensdatum stehen wörtlich im Einleitungsabsatz. Ein Richtlinien-PDF ist verlinkt, wurde wegen der eindeutigen Belege auf der Seite nicht zusätzlich geladen. Kein Enddatum, kein Hinweis auf eine Vorgängerfassung.
- ergebnis: BELEGT

## leimen-klimaschutz — Stadt Leimen
- status_katalog: aktiv
- beginnt: 2026 (nur als Förderjahr belegt: die laufende Auflage gilt für Käufe im "Förderzeitraum 2026"; ein Tagesdatum nennt die Seite nicht)
- endet: -
- beschlossen: -
- vorgaenger: Ja — die Formulierung "Auch für das Jahr 2026" belegt mindestens eine frühere Jahresauflage; deren Jahr und Beginn sind auf der Seite nicht genannt
- herkunft: live
- quelle: https://www.leimen.de/leben-wohnen/klimaschutz-und-umwelt/klimaschutzfoerderungen
- snapshot: -
- zitat_beginnt: "Ein Förderantrag wird nur bewilligt, wenn der Kauf der Stecker-Solaranlage im Förderzeitraum 2026 erfolgt ist und alle Voraussetzungen der Förderung erfüllt werden."
- zitat_endet: -
- zitat_beschlossen: -
- zitat_vorgaenger: "Auch für das Jahr 2026 werden Stecker-Solaranlagen durch die Stadt Leimen bezuschusst."
- versucht: Programmseite abgerufen (HTTP 200), Richtlinientext steht vollständig auf der Seite — kein Inkrafttretens-Satz, kein Gemeinderatsbeschluss, kein PDF verlinkt (Formulare liegen im Bürgerserviceportal). Ein Griff ins Web-Archiv, um die erste Auflage zu datieren, scheiterte an HTTP 429 (Ratenbegrenzung des Archivs).
- ergebnis: BELEGT

## sandhausen-foerderprogramme — Gemeinde Sandhausen
- status_katalog: aktiv
- beginnt: 2023-04 (Balkonsolaranlagen; die Ausweitung auf größere PV-Anlagen und Batteriespeicher folgte im Juni 2023). Die Richtlinie selbst nennt kein Datum, sondern "am Tag ihrer öffentlichen Bekanntmachung".
- endet: -
- beschlossen: 2023-06-26 (Gemeinderat, Ursprungsrichtlinie), angepasst am 2024-02-26
- vorgaenger: Ja — die Solarförderung selbst läuft seit 2023; daneben fördert die Gemeinde nach eigener Angabe "seit Jahren" Hoftorantriebe und den Umstieg von fossilen Energieträgern (Hoftorantriebe per Gemeinderatsbeschluss vom 30.01.2017), das sind aber andere Programme
- herkunft: pdf
- quelle: https://www.sandhausen.de/ceasy/resource/?id=1991&download=1 (Richtlinie zur Förderung von Solarenergie, verlinkt von https://www.sandhausen.de/de/Wirtschaft-Bauen/(Um)Bauen/Foerderprogramme)
- snapshot: -
- zitat_beginnt: "Die Gemeinde Sandhausen fördert daher schon seit April 2023 so genannte „Balkonsolaranlagen“." / "Das Förderprogramm wurde im Juni 2023 ausgeweitet, um auch größere Photovoltaik-Anlagen und Batteriespeicher zu fördern." (beide von der Programmseite) — in der Richtlinie dagegen nur: "Die Richtlinie tritt am Tag ihrer öffentlichen Bekanntmachung in Kraft."
- zitat_endet: -
- zitat_beschlossen: "Der Gemeinderat der Gemeinde Sandhausen hat am 26.06.2023 folgende Richtlinie beschlossen. Sie wurde mit Beschluss vom 26.02.2024 angepasst."
- zitat_vorgaenger: "Die Gemeinde Sandhausen fördert seit 2023 die Nutzung von Solarenergie. Daneben fördert sie seit Jahren sowohl den Einbau von elektrischen Hoftorantrieben ... als auch den Umstieg von fossilen Energieträgern auf erneuerbare Energien"
- versucht: Programmseite abgerufen (HTTP 200) — nennt Beginn im Monat und die Ausweitung; Richtlinie ist kein .pdf-Link, sondern eine Download-Adresse, über den Linktitel gefunden und als PDF geladen. Beschlussdaten stehen im Kopf der Richtlinie, das Inkrafttreten ist dort bewusst undatiert an die Bekanntmachung gekoppelt.
- ergebnis: BELEGT

## helmstedt-umwelt-klima — Stadt Helmstedt
- status_katalog: aktiv
- beginnt: 2025-01-13 (auf die Uhrzeit genau: 09:00 Uhr — die Richtlinie arbeitet mit Eingangsreihenfolge nach Datum und Uhrzeit)
- endet: -
- beschlossen: -
- vorgaenger: -
- herkunft: pdf
- quelle: https://www.stadt-helmstedt.de/fileadmin/user_upload/04_Wirtschaft/Klimaschutz_und_Umwelt/Foerderrichtlinie.pdf (verlinkt von https://www.stadt-helmstedt.de/wirtschaft-bauen/klimaschutz-und-umwelt/foerderrichtlinie-fuer-umwelt-und-klimaschutzmassnahmen.html)
- snapshot: -
- zitat_beginnt: "10. Inkrafttreten — Diese Richtlinie tritt am 13.01.2025 um 09:00 Uhr in Kraft und gilt für alle Maßnahmen, die ab diesem Zeitpunkt beantragt werden."
- zitat_endet: -
- zitat_beschlossen: -
- zitat_vorgaenger: -
- versucht: Programmseite abgerufen (HTTP 200) — nennt kein Datum, nur das Verfahren. Richtlinien-PDF geladen und durchsucht: Inkrafttreten in Ziffer 10, unterschrieben vom Bürgermeister ohne Datum. Der Rat wird nur mit einem strategischen Ziel erwähnt, nicht mit einem Beschlussdatum zur Richtlinie. Jährlich wiederkehrende Antragsfrist (31. August) ist eine laufende Frist, kein Programmende.
- ergebnis: BELEGT

## nottuln-klimaschutz — Gemeinde Nottuln
- status_katalog: aktiv
- beginnt: 2022-07-11 (Inkrafttreten der Richtlinie, die laut Programmseite "weiterhin" gilt)
- endet: - (Achtung: die Richtlinie befristet sich selbst auf den 31.12.2022, die Programmseite erklärt sie aber ausdrücklich für weiterhin geltend und die Steckersolar-Förderung für fortgesetzt. Ein Programmende ist damit NICHT belegt, der Widerspruch bleibt offen.)
- beschlossen: - (Der einzige Ratsbeschluss im Dokument, "Im Dezember 2021 hat der Rat der Gemeinde Nottuln die Umsetzung beschlossen", betrifft die Klimaneutralitäts-Strategie 2030, nicht die Förderrichtlinie — nicht als Programmbeschluss verwendbar.)
- vorgaenger: Ja im Sinne einer Unterbrechung: Die Steckersolar-Förderung lag mangels Mitteln zwischenzeitlich still und wurde aus Windenergie-Einnahmen (§ 6 EEG 2023, 4.000 €) wieder aufgenommen; Anträge für Käufe ab dem 01. Januar "dieses Jahres" (Jahr auf der Seite nicht ausgeschrieben). Die Energieberatungs-Förderung ist ausgesetzt.
- herkunft: pdf
- quelle: https://www.nottuln.de/fileadmin/media/PDF/Fachbereich_3/Klimaschutz/Richtlinie_Foerderprogramm_Klimaschutz_Gemeinde_Nottuln_08072022.pdf (verlinkt von https://www.nottuln.de/leben-in-nottuln/klimaschutz-energie-umwelt/foerderprogramm-klimaschutz)
- snapshot: -
- zitat_beginnt: "10 Inkrafttreten und Veröffentlichung — Diese Richtlinie tritt zum 11.7.2022 in Kraft." / "Nottuln, 11.07.2022"
- zitat_endet: "Die Richtlinie ist bis zum 31.12.2022 bzw. bis die bereit gestellten Mittel verbraucht sind gültig." — dagegen die Programmseite: "Die ausführlichen Richtlinien des Förderprogrammes Klimaschutz ... gelten für die o. g. Förderbereiche weiterhin"
- zitat_beschlossen: "Im Dezember 2021 hat der Rat der Gemeinde Nottuln die Umsetzung beschlossen." (bezieht sich auf die Klimaneutralitäts-Strategie, nicht auf die Richtlinie)
- zitat_vorgaenger: "Für die Förderung von Steckersolargeräten standen zwischenzeitlich keine Mittel mehr zur Verfügung. Dank Windenergie kann diese Förderung nun fortgesetzt werden."
- versucht: Programmseite abgerufen (HTTP 200), Inhaltsbereich vollständig gelesen; einziges verlinktes Richtlinien-PDF (Stand 08072022 im Dateinamen) geladen und durchsucht — Inkrafttreten und Selbstbefristung in Ziffer 10, Ausfertigungsdatum am Ende, kein Beschlussdatum zur Richtlinie.
- ergebnis: BELEGT

## nittenau-steckersolar — Stadt Nittenau
- status_katalog: aktiv
- beginnt: 2023-04-01
- endet: -
- beschlossen: 2023-05-23
- vorgaenger: -
- herkunft: pdf
- quelle: https://www.nittenau.de/fileadmin/Dateien/Website/Dateien/News_und_Bekanntmachungen/Richtlinie_Nittenau_neu_800_WP_19.08.2024.pdf
- snapshot: -
- zitat_beginnt: "Die Antragsstellung ist ab dem 01.04.2023 fuer Anschaffungen ab dem 01.04.2023 moeglich. Fuer die Jahre 2024 – 2027 ist eine Antragsstellung bereits ab dem 01.01. des jeweiligen Jahres moeglich. Foerderantraege muessen bis spaetestens 31.12. des jeweiligen Jahres eingereicht werden."
- zitat_endet: -
- zitat_beschlossen: "Beschluss des Stadtrates vom 23.05.2023" (Kopfzeile jeder Seite der Richtlinie; sie datiert die 800-Wp-Fassung, liegt also NACH dem Antragsstart 01.04.2023)
- versucht: Programmseite (HTTP 200) genannt "schaffte die Stadt Nittenau in 2023 einen finanziellen Anreiz"; von dort die verlinkte Richtlinie als PDF geholt (HTTP 200, 519 kB) und in § 6 die Antragsfrist sowie in der Kopfzeile den Stadtratsbeschluss gelesen. Kein Enddatum in der Richtlinie; die Jahresliste "2024 – 2027" ist eine Antragsfrist-Regel, kein Programmende.
- ergebnis: BELEGT

## rietheim-weilheim-pv — Gemeinde Rietheim-Weilheim
- status_katalog: aktiv
- beginnt: -
- endet: -
- beschlossen: -
- vorgaenger: Die Programmseite nennt fruehere Auflagen ohne Jahr: "Nachdem in den letzten Jahren bereits Programme zur Foerderung von Photovoltaikanlagen oder auch die Anlage von Regenwasserzisternen aufgelegt wurden, soll es nun auch die Foerderung von Streuobstwiesenbaeumen geben." Das laufende Programm heisst im Antragsformular "Umweltfoerderprogramm 2026 der Gemeinde Rietheim-Weilheim", ist also eine Jahresauflage.
- herkunft: live
- quelle: http://www.rietheim-weilheim.de/rathaus-service/aktuelles/kommunale-foerderprogramme
- snapshot: -
- zitat_beginnt: -
- zitat_endet: -
- zitat_beschlossen: -
- versucht: Programmseite abgerufen (HTTP 200, 150 kB): Antragsstart nur als "Antraege zur Foerderung von Photovoltaikanlagen/Balkonkraftwerke koennen ab sofort gestellt werden" — ohne Datum. Verlinktes Antrags-PDF (HTTP 200, 194 kB) enthaelt ausser der Jahreszahl im Programmnamen keine Datumsformel, keine Inkrafttretens-Klausel, keinen Gemeinderatsbeschluss. Eine Richtlinie als eigenes Dokument ist auf der Seite nicht verlinkt.
- ergebnis: ABGERUFEN_NICHTS_GEFUNDEN

## forstinning-energiewende — Gemeinde Forstinning
- status_katalog: ausgeschoepft
- beginnt: 2023-05-01
- endet: -
- beschlossen: 2023-04-25
- vorgaenger: Keine fruehere Auflage genannt. Die laufende Fassung ist eine Verlaengerung: "Der Gemeinderat beschloss in seiner Sitzung am 18.11.2025 die Verlaengerung der Foerderrichtlinie 'Energiewende und Klimaschutz' der Gemeinde Forstinning. Die Richtlinie tritt mit Wirkung zum 01.01.2026 in Kraft und ist vorerst bis zum 31.12.2028 gueltig." (Programmseite)
- herkunft: pdf
- quelle: https://www.forstinning.de/fileadmin/Dateien/Dateien/Wirtschaft___Energie/Foerderung_ErneuerbareEnergie_-_Richtlinie_25042023_-_FINAL.pdf
- snapshot: -
- zitat_beginnt: "Diese Richtlinie tritt mit Wirkung zum 01.05.2023 in Kraft und ist bis zum 31.12.2025 gueltig. Fuer alle Foerderantraege, die in diesem Zeitrahmen bei der Gemeinde eingehen, ist diese Foerderrichtlinie gueltig."
- zitat_endet: - (kein Programmende; der Katalog-Status "ausgeschoepft" entspricht dem Hinweis der Gemeinde: "die Foerdersumme fuer die kommunale Foerderrichtlinie 'Energiewende und Klimaschutz' in Hoehe von 40.000 € fuer das Jahr 2026 nunmehr ausgeschoepft ist. Fuer das Jahr 2026 koennen somit keine Foerderantraege mehr bewilligt werden." — Geld alle, Programm laeuft laut Verlaengerung bis 31.12.2028)
- zitat_beschlossen: "Grundlage ist der Beschluss vom 25.04.2023 durch den Gemeinderat Forstinning."
- versucht: Programmseite abgerufen (HTTP 200) — dort der Verlaengerungsbeschluss vom 18.11.2025 und die aktuelle Geltung 01.01.2026 bis 31.12.2028; das verlinkte Richtlinien-PDF (HTTP 200, 342 kB) liefert im Abschnitt 4 INKRAFTTRETEN den urspruenglichen Beginn und den Gemeinderatsbeschluss.
- ergebnis: BELEGT

## oftersheim-co2 — Gemeinde Oftersheim
- status_katalog: aktiv
- beginnt: 2023-04-01
- endet: -
- beschlossen: -
- vorgaenger: Die vorliegende Fassung ist eine Neufassung des Programms von 2023; Titelzeile: "Foerderprogramm der Gemeinde Oftersheim zur Reduzierung der CO2-Emissionen / gueltig ab 01.01.2024" — die Inkrafttretens-Klausel derselben Datei nennt weiterhin den 01.04.2023.
- herkunft: pdf
- quelle: https://www.oftersheim.de/site/Oftersheim/get/documents_E-1452176986/oftersheim/Dateien/Bauamt/Klimaschutz%20Vordrucke/F%C3%B6rderprogramm%20Reduzierung%20der%20CO2-Emissionen/F%C3%B6rderprogramm%20der%20Gemeinde%20Oftersheim%20zur%20Reduzierung%20der%20CO2%20Emissionen.pdf
- snapshot: -
- zitat_beginnt: "Inkrafttreten — Das Foerderprogramm der Gemeinde Oftersheim tritt ab dem 01.04.2023 in Kraft. Oftersheim, 03.04.2023"
- zitat_endet: -
- zitat_beschlossen: - (kein Beschlussdatum im Dokument; nur der Zustaendigkeitssatz "Ueber einen Neuerlass entscheidet der Gemeinderat der Gemeinde Oftersheim.")
- versucht: Programmseite /3187645 abgerufen (HTTP 200, 40 kB), von dort das Programm-PDF (HTTP 200, 482 kB) vollstaendig gelesen — Inkrafttretens-Klausel am Ende, Fassungsdatum in der Titelzeile. Ein Gemeinderatsbeschluss ist weder auf der Seite noch im PDF datiert; das Unterschriftsdatum 03.04.2023 ist die Ausfertigung, nicht der Beschluss.
- ergebnis: BELEGT

## bad-rothenfelde-klima — Gemeinde Bad Rothenfelde
- status_katalog: aktiv
- beginnt: -
- endet: -
- beschlossen: 2023-06-29
- vorgaenger: Das Balkonkraftwerk-Modul ist eine Erweiterung der aelteren "Aktion Klimabaum": "Der Gemeinderat hat in der Sitzung vom 29. Juni 2023 beschlossen, die Foerderung fuer die Aktion Klimabaum auf unbestimmte Zeit zu verlaengern und zusaetzlich zwei weitere Massnahmen in das Programm aufzunehmen."
- herkunft: live
- quelle: https://gemeinde.bad-rothenfelde.de/nachricht/1910.html
- snapshot: -
- zitat_beginnt: -
- zitat_endet: -
- zitat_beschlossen: "Der Gemeinderat hat in der Sitzung vom 29. Juni 2023 beschlossen, die Foerderung fuer die Aktion Klimabaum auf unbestimmte Zeit zu verlaengern und zusaetzlich zwei weitere Massnahmen in das Programm aufzunehmen."
- versucht: Nachrichtenseite 1910.html abgerufen (HTTP 200, 105 kB) — traegt den Gemeinderatsbeschluss, sonst kein Datum; zusaetzlich das dort verlinkte PDF "Balkonkraftwerke und Dachbegruenungen 02.2025.pdf" (HTTP 200, 208 kB, 2 Seiten) geholt: es ist die gleichlautende Pressemitteilung der Gemeinde, ohne Antragsstart und ohne Inkrafttretens-Klausel. Ein Antragsstartdatum nennt keine der beiden Traegerquellen; "02.2025/SLF" ist das Fassungskuerzel der Mitteilung.
- ergebnis: BELEGT

## vilshofen-steckersolar — Stadt Vilshofen an der Donau
- status_katalog: aktiv
- beginnt: 2026-05-01
- endet: -
- beschlossen: 2026-04-30
- vorgaenger: Die Praeambel deutet eine fruehere Auflage an, ohne sie zu datieren: "Um den Buergerinnen und Buergern der Stadt Vilshofen an der Donau den Einstieg in eine regenerative Energieversorgung weiterhin zu erleichtern, hat der Stadtrat am 30.04.2026 beschlossen, das Foerderprogramm fuer sogenannte Balkonkraftwerke aufzulegen und nun gezielt Mieter von selbstgenutztem Wohnraum bei der Anschaffung einer solchen Anlage zu unterstuetzen." — "weiterhin" und die Ausweitung auf Mieter deuten auf eine Vorgaengerfassung; belegt ist sie nicht.
- herkunft: pdf
- quelle: https://www.vilshofen.de/fileadmin/Gemeinde/Allgemein/Foerderungen/Foerderrichtlinie_der_Stadt_Vilshofen_an_der_Donau_fuer_Steckersolargeraete__sog._Balkonkraftwerke__Stand_30.04.2026.pdf
- snapshot: -
- zitat_beginnt: "§ 5 Inkrafttreten der Foerderrichtlinien — Die vorstehenden Richtlinien treten am 01.05.2026 in Kraft."
- zitat_endet: -
- zitat_beschlossen: "hat der Stadtrat am 30.04.2026 beschlossen, das Foerderprogramm fuer sogenannte Balkonkraftwerke aufzulegen"
- versucht: Uebersichtsseite der Foerderprogramme abgerufen (HTTP 200, 257 kB) und von dort die Foerderrichtlinie als PDF (HTTP 200, 608 kB) ganz gelesen — Beschluss in der Praeambel, Inkrafttreten in § 5. Beide Daten gelten der aktuellen Fassung. Ein Griff ins Web-Archiv nach einer aelteren Fassung scheiterte an HTTP 429 des Archivs.
- ergebnis: BELEGT

## neuwied-balkonkraftwerke — Stadt Neuwied
- status_katalog: aktiv
- beginnt: 2026-04-30
- endet: -
- beschlossen: -
- vorgaenger: - (die Richtlinie nennt keine fruehere Auflage; der Dateiname traegt die Jahreszahl 2026, was laut Methode kein Beleg ist)
- herkunft: pdf
- quelle: https://www.neuwied.de/fileadmin/4_Dokumente/100_Rechtliches/Satzungen_AGBs/Foerderrichtlinien_Balkonkraftwerke_2026.pdf
- snapshot: -
- zitat_beginnt: "14. Inkrafttreten — Diese Foerderrichtlinie tritt am 30.04.26 in Kraft. Die Richtlinie ist gueltig, solange entsprechende Foerdermittel hierfuer zur Verfuegung stehen, spaetestens bis zum 31.05.2027." (Titelzeile ebenso: "Gueltig ab 30.04.2026")
- zitat_endet: - (kein Ende erreicht; die Richtlinie nennt als Aussenfrist "spaetestens bis zum 31.05.2027" — ein geplantes Ende, kein eingetretenes)
- zitat_beschlossen: -
- versucht: Klimaschutz-Foerderseite abgerufen (HTTP 200, 70 kB) — ohne Datumsangabe im Fliesstext; die dort verlinkte Foerderrichtlinie als PDF (HTTP 200, 312 kB) ganz gelesen: Inkrafttreten in Nr. 14, Ausfertigung "Neuwied, 02.04.2026 / Oberbuergermeister Jan Einig". Ein Stadtratsbeschluss ist in keiner der beiden Quellen datiert.
- ergebnis: BELEGT

## rodgau-balkonsolar — Stadt Rodgau
- status_katalog: aktiv
- beginnt: 2024-01-01
- endet: -
- beschlossen: -
- vorgaenger: Die Seite spricht von der "aktualisierten Richtlinie" ab 01.01.2024 und macht aeltere Kaeufe foerderfaehig: "Balkonsolar-Anlagen, die ab 2023 gekauft wurden, sind auch in 2024 foerderfaehig." Eine Vorgaengerfassung vor 2024 ist damit angedeutet, aber nicht datiert.
- herkunft: live
- quelle: https://www.rodgau.de/de/leben/stadtplanung-umwelt-mobiltaet/umwelt/foerderung-von-balkon-solaranlagen/
- snapshot: -
- zitat_beginnt: "Seit dem 1. Januar 2024 ist die aktualisierte Richtlinie zur Foerderung von Balkon-Solaranlagen fuer 3 Jahre bis zum 31.12.2026 in Kraft."
- zitat_endet: - (kein eingetretenes Ende; die Richtlinie ist nach eigener Aussage bis 31.12.2026 befristet, dazu die jaehrliche Antragsfrist: "Antragsfrist ist der 31.12. des jeweiligen Foerderjahres.")
- zitat_beschlossen: -
- versucht: Programmseite abgerufen (HTTP 200, 121 kB) — traegt Beginn und Befristung im Fliesstext. Kein Richtlinien-PDF auf der Seite verlinkt (nur Online-Antrag und ein auf Anforderung erhaeltlicher Vordruck), kein datiertes Gremienvotum genannt.
- ergebnis: BELEGT

## tuebingen-balkon-pv — Universitaetsstadt Tuebingen
- status_katalog: aktiv
- beginnt: 2026-06-22
- endet: -
- beschlossen: -
- vorgaenger: - (die Pressemitteilung stellt das Programm als neu vor; eine fruehere Auflage wird nicht erwaehnt. Es ist "ein Baustein der staedtischen Klimaschutzkampagne 'Tuebingen macht blau'".)
- herkunft: live
- quelle: https://tuebingen.de/1620/47436.html
- snapshot: -
- zitat_beginnt: "Pressemitteilung vom 22.06.2026 … Die Stadtverwaltung foerdert diese Anlagen ab sofort mit bis zu 75 Prozent. … Die Antragstellung ist ab sofort moeglich." (eigene Pressemitteilung der Stadt; "ab sofort" am Tag der Mitteilung)
- zitat_endet: -
- zitat_beschlossen: -
- versucht: Pressemitteilung der Stadt (HTTP 200) gelesen — Datum und "ab sofort". Zusaetzlich die in der Mitteilung genannte Programmseite www.tuebingen-macht-blau.de/balkon-pv abgerufen (HTTP 200, 9 kB): Die Foerderrichtlinien stehen dort nur in Ausklapp-Abschnitten, die per Skript nachgeladen werden und im ausgelieferten HTML fehlen; sichtbar ist allein das Fassungsdatum "Stand 13. August 2026" — ein spaeteres Fassungsdatum, kein Beginn. Ein Richtlinien-PDF ist auf keiner der beiden Seiten verlinkt; ein Gemeinderatsbeschluss wird nirgends datiert.
- ergebnis: BELEGT

## zweibruecken-balkonkraftwerke — Stadt Zweibruecken
- status_katalog: aktiv
- beginnt: 2024-07-01
- endet: -
- beschlossen: 2026-01-28
- vorgaenger: - (keine fruehere Auflage genannt; das Programm laeuft im Rahmen des Landesprogramms KIPKI. Die vorliegende Fassung ist eine Laufzeitverlaengerung derselben Richtlinie von 2024, nicht eine neue Auflage.)
- herkunft: pdf
- quelle: https://www.zweibruecken.de/de/verwaltung/aemter/stadtbauamt/klimaschutz-und-klimaanpassung/klimaschutz/balkonkraftwerke-foerderung/foerderrichtlinie-zw-laufzeitverlaengerung.pdf?cid=1z3y
- snapshot: -
- zitat_beginnt: "12. Foerderzeitraum — Der Foerderzeitraum beginnt am 01.07.2024 und endet nach dem Beschluss des Stadtrats vom 28.01.2026 spaetestens am 28.02.2027." sowie "13. Inkrafttreten — Die Richtlinie tritt am 01.07.2024 in Kraft." (Titelzeile: "Gueltig ab 01. Juli 2024")
- zitat_endet: - (kein eingetretenes Ende; geplantes Aussenende "spaetestens am 28.02.2027", zusaetzlich der Mittelvorbehalt: "Das Foerderprogramm ist mit 126.000,00€ ausgestattet. Sobald diese Summe ausgeschoepft ist, koennen keine weiteren Foerderungen bewilligt werden.")
- zitat_beschlossen: "endet nach dem Beschluss des Stadtrats vom 28.01.2026 spaetestens am 28.02.2027" (Beschluss ueber die Laufzeitverlaengerung; der Beschluss zur Auflegung 2024 ist nicht datiert)
- versucht: Programmseite abgerufen (HTTP 200, 218 kB), von dort das einzige verlinkte PDF "foerderrichtlinie-zw-laufzeitverlaengerung.pdf" (HTTP 200, 437 kB) ganz gelesen — Foerderzeitraum in Nr. 12, Inkrafttreten in Nr. 13.
- ergebnis: BELEGT

## unterhaching-energiesparen — Gemeinde Unterhaching
- status_katalog: aktiv
- beginnt: 2023-01-01
- endet: -
- beschlossen: 2023-10-25
- vorgaenger: Förderprogramm zur Energieeinsparung und kommunalem Klimaschutz vom 01.10.2020; Altanträge bis 31.12.2022 nach dieser Fassung, Fördersummen laut Gemeinderatsbeschluss vom 15.02.2023 um 30 % reduziert
- herkunft: pdf
- quelle: https://www.unterhaching.de/ceasy/resource/?id=1976&download=1 (Förderrichtlinie, Stand 09/2024; verlinkt von https://www.unterhaching.de/klimaschutz/foerderprogramm-energiesparen-klimaschutz)
- snapshot: -
- zitat_beginnt: "Diese Richtlinie tritt auf Grundlage der Gemeinderatsbeschlüsse vom 25.10.2023 mit Wirkung zum 01.01.2023 in Kraft. Die Förderrichtlinie ist damit für alle Förderanträge, die ab diesem Zeitpunkt bei der Gemeinde Unterhaching eingehen bzw. eingegangen sind, gültig."
- zitat_endet: -
- zitat_beschlossen: "Diese Richtlinie tritt auf Grundlage der Gemeinderatsbeschlüsse vom 25.10.2023 mit Wirkung zum 01.01.2023 in Kraft."
- versucht: Programmseite unterhaching.de/klimaschutz/foerderprogramm-energiesparen-klimaschutz (HTTP 200, nennt kein Datum); von dort der einzige Datei-Link ceasy/resource/?id=1976 = Förderrichtlinie-PDF (HTTP 200, 2,8 MB), Inkrafttretens-Kapitel 10 gelesen.
- ergebnis: BELEGT

## hueckelhoven-balkonkraftwerke — Stadt Hückelhoven
- status_katalog: aktiv
- beginnt: 2024-01-01
- endet: -
- beschlossen: -
- vorgaenger: Ursprungsfassung der Richtlinie vom 01.01.2024, zum 14.05.2024 ausgelaufen; seit 15.05.2024 gilt die "1. Anpassung" (aktuelle Fassung)
- herkunft: pdf
- quelle: https://www.hueckelhoven.de/wp-content/uploads/2025/11/Foerderung-steckerfertige-Photovoltaikanlagen.pdf (verlinkt von https://www.hueckelhoven.de/klimaschutz-mobilitaet/foerdermoeglichkeiten/steckfertige-photovoltaikanlagen/)
- snapshot: -
- zitat_beginnt: "Die Richtlinie der Stadt Hückelhoven zur Förderung von steckerfertigen Photovoltaikanlagen trat am 01.01.2024 in Kraft. Aufgrund von gesetzlichen Änderungen läuft die Richtlinie zum 14.05.2024 aus und die 1. Anpassung der Richtlinie der Stadt Hückelhoven zur Förderung von steckerfertigen Photovoltaikanlagen tritt zum 15.05.2024 in Kraft."
- zitat_endet: -
- zitat_beschlossen: -
- versucht: Meldung /erfolgreiche-foerderprogramme-gehen-weiter/ (HTTP 200, "Seit 2024 werden auch sogenannte Balkonkraftwerke ... gefördert", nur Jahreszahl); Programmseite /klimaschutz-mobilitaet/foerdermoeglichkeiten/steckfertige-photovoltaikanlagen/ (200) → Richtlinien-PDF, erster Abruf HTTP 403, mit Referer HTTP 200. Das PDF ist als "Anlage 1" einer Ratsvorlage formatiert, nennt aber kein Beschlussdatum.
- ergebnis: BELEGT

## weinheim-effizienz — Stadt Weinheim
- status_katalog: aktiv
- beginnt: 2026-01-01 (Geltungsbeginn der aktuellen Jahres-Richtlinie; Programmbeginn selbst nicht belegt)
- endet: 2026-12-31 (Außerkrafttreten der aktuellen Richtlinie, nicht Programmende — Richtlinie wird jährlich neu erlassen)
- beschlossen: -
- vorgaenger: nicht ausdrücklich genannt. Indiz für eine Vorgängerfassung: die Richtlinie setzt voraus, "dass der Antrag auf BEG-Förderung erst ab dem 01.01.2024 gestellt wurde" — das ist eine Förderbedingung, kein Startdatum. Die Datei heißt "...Gebaeude-Effizienz_2026", die Stadt verlinkt daneben weitere "Förderrichtlinie 2026"-Fassungen anderer Programme.
- herkunft: pdf
- quelle: https://www.weinheim.de/site/WeinheimRoot/get/documents_E-1686604058/weinheim/Dateien/PDF-Dateien/60/Foerderprojekte/II-01_Foerderrichtlinie_Gebaeude-Effizienz_2026.pdf (verlinkt von https://www.weinheim.de/startseite/stadtthemen/foerderung.html)
- snapshot: -
- zitat_beginnt: "9. Inkrafttreten — Diese Richtlinie tritt rückwirkend zum 01.01.2026 in Kraft und am 31.12.2026 außer Kraft." (unterzeichnet "Weinheim, den 26/01/2026", Manuel Just, Oberbürgermeister)
- zitat_endet: "Diese Richtlinie tritt rückwirkend zum 01.01.2026 in Kraft und am 31.12.2026 außer Kraft."
- zitat_beschlossen: -
- versucht: Übersichtsseite /startseite/stadtthemen/foerderung.html (HTTP 200) → PDF II-01_Foerderrichtlinie_Gebaeude-Effizienz_2026.pdf (HTTP 200, 425 KB). Das PDF ist ein Scan ohne Textebene (pdftotext liefert nichts), daher als Bild gelesen. Kein Gemeinderatsbeschluss-Datum im Dokument; es nennt nur "Unter dem Vorbehalt der Genehmigung durch den Gemeinderat und der Rechtskraft des Haushalts ... für das Haushaltsjahr 2026".
- ergebnis: BELEGT

## ottobrunn-foerderprogramme — Gemeinde Ottobrunn
- status_katalog: aktiv
- beginnt: 2014-01-01
- endet: -
- beschlossen: -
- vorgaenger: ja — die geltende Fassung ist die "5. Neuauflage"; sie löst die Richtlinien in der Fassung vom 01.01.2000 ab
- herkunft: pdf
- quelle: https://www.ottobrunn.de/fileadmin/Dateien/Energie-Klimaschutz/Richtlinien_Ottobrunner_Energiesparfoerderprogramm_2014.pdf (verlinkt von https://www.ottobrunn.de/online-rathaus/buergerservice/foerderprogramme)
- snapshot: -
- zitat_beginnt: "Die Bestimmungen treten am 01.01.2014 in Kraft und lösen die Richtlinien in der Fassung vom 01.01.2000 ab." — Titelblatt: "Förderprogramm zur Energieeinsparung in der Gemeinde Ottobrunn (5. Neuauflage, gültig ab 1.1.2014)"
- zitat_endet: -
- zitat_beschlossen: -
- versucht: Programmseite /online-rathaus/buergerservice/foerderprogramme (HTTP 200, nennt kein Datum im Fließtext); zwei PDF-Links, davon das einschlägige Richtlinien_Ottobrunner_Energiesparfoerderprogramm_2014.pdf (HTTP 200, 246 KB) gelesen — Kapitel V Inkrafttreten und Titelblatt. Kein Gemeinderatsbeschluss-Datum im Dokument.
- ergebnis: BELEGT

## feucht-klimaschutz — Markt Feucht
- status_katalog: ausgeschoepft
- beginnt: 2025-10-01
- endet: - (kein Programmende belegt; die Antragstellung ruht nur wegen erschöpfter Jahresmittel — "Die für dieses Jahr zur Verfügung stehenden Fördermittel sind voraussichtlich vollständig ausgeschöpft. Eine Antragstellung ist daher zurzeit nicht mehr möglich. (Stand: 13.04.2026)")
- beschlossen: - (Richtlinie unterzeichnet "Feucht, 25.08.2025", Erster Bürgermeister Jörg Kotzur — Unterzeichnung, kein ausgewiesenes Marktgemeinderats-Beschlussdatum)
- vorgaenger: - (die Richtlinie erwähnt keine Vorfassung)
- herkunft: pdf
- quelle: https://www.feucht.de/fileadmin/Dateien/Dateien/Bauen_Wirtschaft_Umwelt/Klimaschutz/Richtlinie_zum_Klimaschutzprogramm_mit_Anlage.pdf (verlinkt von https://www.feucht.de/bauen-wirtschaft-umwelt/klimaschutz-foerderprogramme/foerderprogramme)
- snapshot: -
- zitat_beginnt: "7. Inkrafttreten — Diese Richtlinie tritt ab 01.10.2025 in Kraft." (Programmseite bestätigt: "Richtlinie zum Klimaschutzprogramm des Marktes Feucht - ab 01.10.2025 in Kraft")
- zitat_endet: "Die für dieses Jahr zur Verfügung stehenden Fördermittel sind voraussichtlich vollständig ausgeschöpft. Eine Antragstellung ist daher zurzeit nicht mehr möglich. (Stand: 13.04.2026)"
- zitat_beschlossen: -
- versucht: Programmseite (HTTP 200) nennt Inkrafttreten und Ausschöpfungs-Hinweis; Richtlinien-PDF (HTTP 200, 366 KB) ist ein Scan ohne Textebene, daher als Bild gelesen (5 Seiten), Kapitel 7 Inkrafttreten und Unterschriftsdatum entnommen.
- ergebnis: BELEGT

## limburgerhof-balkonkraftwerke — Gemeinde Limburgerhof
- status_katalog: aktiv
- beginnt: 2024-03-01
- endet: 2026-12-31 (bereits festgelegtes Außerkrafttreten; Anträge nach diesem Tag sind ausgeschlossen)
- beschlossen: - (Richtlinie unterzeichnet "Limburgerhof, den 22.02.2024, gez. Poignée, Bürgermeister"; kein Gemeinderats-Beschlussdatum genannt)
- vorgaenger: -
- herkunft: pdf
- quelle: https://www.limburgerhof.de/service/aktionen-und-kampagnen/foerderung-von-balkonkraftwerken/foerderprogramm-balkonkraftwerke-j-foerderrichtlinie.pdf?cid=m9j (verlinkt von https://www.limburgerhof.de/service/aktionen-und-kampagnen/foerderung-von-balkonkraftwerken/)
- snapshot: -
- zitat_beginnt: "Gefördert wird ab 01.03.2024 bis zum 31.12.2026 die Neuanschaffung von Balkonkraftwerken" / "Die Richtlinie tritt zum 01.03.2024 in Kraft und am 31.12.2026 außer Kraft."
- zitat_endet: "Die Richtlinie tritt zum 01.03.2024 in Kraft und am 31.12.2026 außer Kraft." — ausgeschlossen sind "Anträge, die nach dem 31.12.2026 eingereicht wurden"
- zitat_beschlossen: -
- versucht: Programmseite (HTTP 200; strukturierte Daten nennen datePublished 2024-02-24) → Richtlinien-PDF (HTTP 200, 120 KB, Textebene vorhanden), Ziffern 2, 3 und 6 b sowie Unterschriftszeile gelesen.
- ergebnis: BELEGT

## gernsheim-foerderprogramme — Stadt (Schöfferstadt) Gernsheim
- status_katalog: aktiv
- beginnt: 2022-04-01 (frühester förderfähiger Stichtag; ein ausdrückliches Inkrafttretens- oder Antragsstart-Datum nennt die Richtlinie nicht)
- endet: -
- beschlossen: 2021-12-09
- vorgaenger: -
- herkunft: live
- quelle: https://www.gernsheim.de/klima-naturschutz/foerderprogramme-der-stadt-gernsheim/ (Richtlinientext ist dort im Volltext abgedruckt)
- snapshot: -
- zitat_beginnt: "Förderfähig sind alle Dach-Photovoltaikanlagen privater Eigentümer, welche auf den eigenen Gebäuden errichtet werden. Maßgeblicher Stichtag ist der Tag der Auftragserteilung zur Errichtung der Anlage. Dieser darf nicht vor dem 01.04.2022 liegen."
- zitat_endet: -
- zitat_beschlossen: "Die Schöfferstadt Gernsheim erlässt auf Grund des Beschlusses der Stadtverordnetenversammlung vom 09.12.2021 folgendes kommunales Förderprogramm:"
- versucht: Programmseite (HTTP 200) enthält die Förderrichtlinie im Volltext, daher kein PDF nötig; die beiden PDF-Links der Seite sind Antragsformulare. Für die Mini-Balkon-Förderung (50 € pauschal) nennt die Seite keinerlei Datum — dafür ist kein eigener Wert belegt.
- ergebnis: BELEGT

## gudensberg-balkonkraftwerke — Stadt Gudensberg
- status_katalog: aktiv
- beginnt: 2025-10-15
- endet: - (kein Datum; das Programm endet mengenbedingt nach 60 geförderten Anlagen)
- beschlossen: 2025-09-18 (Magistratsbeschluss)
- vorgaenger: -
- herkunft: pdf
- quelle: https://www.gudensberg.de/wirtschaft-und-stadtentwicklung/klimaschutz/privatfoerderung/balkonkraftwerke/richtlinie-balkonkraftwerk.pdf?cid=77n (verlinkt von https://www.gudensberg.de/wirtschaft-und-stadtentwicklung/klimaschutz/privatfoerderung/balkonkraftwerke/)
- snapshot: -
- zitat_beginnt: "9. Inkrafttreten — Diese Förderrichtlinie tritt am 15.10.2025 in Kraft und gilt für alle Anträge, die ab diesem Zeitpunkt bei der Stadt Gudensberg eingereicht werden."
- zitat_endet: "Sobald dieses Kontingent ausgeschöpft ist, endet das Förderprogramm automatisch, ohne dass es eines gesonderten Widerrufs oder weiterer Mitteilungen bedarf." (Programmseite: "Das Förderprogramm ist auf 60 Anlagen begrenzt. Sobald dieses Kontingent ausgeschöpft ist, endet das Programm automatisch")
- zitat_beschlossen: "Um diesen dezentralen Beitrag zur Energiewende zu fördern, hat der Magistrat am 18. September 2025 die Einführung eines Förderprogramms für Balkonkraftwerke beschlossen."
- versucht: Programmseite (HTTP 200, datePublished 2025-10-29) → Richtlinien-PDF (HTTP 200, 255 KB, Textebene vorhanden, "Stand: Oktober 2025"), Abschnitte 1 und 9 gelesen.
- ergebnis: BELEGT

## poing-energie — Gemeinde Poing
- status_katalog: aktiv
- beginnt: 2023-02 (Mini-PV/Balkonkraftwerke, Ursprungsprogramm) · 2026-04-01 (aktuelle Fassung, erstmals auch Dach- und Fassaden-PV)
- endet: -
- beschlossen: 2026-03-26 (jüngster von drei Gemeinderatsbeschlüssen; die beiden früheren: 2023-01-19 und 2024-10-17)
- vorgaenger: ja — Gemeinderatsbeschluss 19.01.2023 (Start Mini-PV und Lastenräder ab Februar 2023), Erweiterung um Lastenanhänger ab November 2024 (Beschluss 17.10.2024). Daneben besteht eine getrennte "Förderrichtlinie zur rationellen Energienutzung" — laut Programmseite "besteht seit 1997; sie wurde im Jahr 2021 überarbeitet und aktualisiert".
- herkunft: pdf
- quelle: https://www.poing.de/fileadmin/eigene_dateien/02_Rathaus_Politik/Bekanntmachungen/Bekanntmachungen_26/Förderanträge_PV_26/2026-04-01_Förderrichtlinie_PV-Anlage_Mini-PV-Anlage_Lastenrad_26.pdf (verlinkt von https://www.poing.de/bauen-umwelt/energie-klima/foerderrichtlinien)
- snapshot: -
- zitat_beginnt: PDF: "Diese Richtlinie tritt mit Wirkung zum 01.04.2026 in Kraft. Für alle Förderanträge, die ab diesem Zeitpunkt bei der Gemeinde Poing eingehen, ist diese Förderrichtlinie gültig." — Programmseite: "Seit Februar 2023 fördert die Gemeinde Poing aufgrund eines Gemeinderatsbeschlusses die Anschaffung von Lastenrädern und Lastenpedelecs sowie von Balkonkraftwerken (Mini-PV-Anlagen). Zusätzlich werden seit November 2024 Lastenanhänger gefördert. Seit April 2026 werden auch PV-Anlagen auf Dächern und Fassaden bezuschusst."
- zitat_endet: -
- zitat_beschlossen: "Grundlage sind die Beschlüsse vom 19.01.2023, 17.10.2024 und 26.03.2026 durch den Gemeinderat Poing." (unterzeichnet "Poing, den 26.03.2026", Thomas Stark, Erster Bürgermeister)
- versucht: Programmseite (HTTP 200) mit Zeitangaben im Fließtext; Richtlinien-PDF 2026-04-01 (HTTP 200, 903 KB) ist ein Scan ohne Textebene, daher als Bild gelesen (Seiten 1, 2 und 4) — Inkrafttretens- und Beschlussklausel am Ende von Kapitel 5.1.
- ergebnis: BELEGT

## goch-balkonkraftwerke — Stadt Goch
- status_katalog: aktiv
- beginnt: 2024-07-01
- endet: -
- beschlossen: -
- vorgaenger: - (die Richtlinie nennt keine Vorfassung; sie ist unter dem Dateinamen "2025 Richtlinien PV-Anlagen.pdf" abgelegt, trägt inhaltlich aber das Inkrafttreten 01.07.2024 — der Dateiname ist kein Beleg)
- herkunft: pdf
- quelle: https://www.goch.de/system/files/2025-03/2025%20Richtlinien%20PV-Anlagen.pdf (verlinkt von https://www.goch.de/bauen-wohnen/buergerfoerderungen/balkonkraftwerke)
- snapshot: -
- zitat_beginnt: "7. Inkrafttreten — Diese Richtlinie tritt am 01.07.2024 in Kraft."
- zitat_endet: -
- zitat_beschlossen: -
- versucht: Programmseite (HTTP 200) sagt nur "Eine Antragsstellung für das Jahr 2026 ist ab sofort online ... möglich" (jahresweise Antragsrunden, kein Datum) → Richtlinien-PDF (HTTP 200, 379 KB, Textebene vorhanden), Abschnitt 7 gelesen. Kein Ratsbeschluss-Datum im Dokument.
- ergebnis: BELEGT

## herzberg-balkonkraftwerke — Stadt Herzberg am Harz
- status_katalog: aktiv
- beginnt: - (kein Antragsstart und kein Inkrafttreten belegt; nur das Ratsbeschluss-Datum)
- endet: -
- beschlossen: 2025-09-17 (Rat der Stadt)
- vorgaenger: -
- herkunft: live
- quelle: https://www.herzberg.de/service/themen/klima-und-umwelt/klimaschutz/foerderung-balkonkraftwerke/
- snapshot: -
- zitat_beginnt: -
- zitat_endet: -
- zitat_beschlossen: "Der Rat der Stadt Herzberg am Harz beschloss am 17.09.2025 ein Förderprogramm für Balkonkraftwerke zur Umsetzung der Klimaschutzziele des integrierten Klimaschutzkonzeptes."
- versucht: Programmseite (HTTP 200, 507 KB) — die Richtlinie steht dort im Volltext (Abschnitte 1 bis 4.7) und enthält KEINE Inkrafttretens-, Geltungs- oder Befristungsklausel; einziges Datum ist der Ratsbeschluss. Keine PDF-Links auf der Seite (Antragsformular ist ein Web-Formular).
- ergebnis: ABGERUFEN_NICHTS_GEFUNDEN (Beschlussdatum belegt, Start-/Enddatum nicht)

## herbrechtingen-balkonkraftwerke — Stadt Herbrechtingen
- status_katalog: aktiv
- beginnt: 2024-01-01 (frühester förderfähiger Installationszeitpunkt; ein Inkrafttretens- oder Antragsstart-Datum nennt das Programm nicht)
- endet: -
- beschlossen: -
- vorgaenger: - (nicht belegt. Die Datei heißt "Zuschussprogramm_Balkonkraftwerke_ab_2026.pdf", was auf eine Vorfassung hindeutet — ein Datum im Dateinamen ist aber kein Beleg, und das Dokument selbst nennt keine Vorfassung.)
- herkunft: pdf
- quelle: https://www.herbrechtingen.de/site/Herbrechtingen/get/documents_E-933899695/herbrechtingen/Mediathek_Herbrechtingen/Stadt%20%26%20B%C3%BCrger/F%C3%B6rderprogramme/Zuschussprogramm_Balkonkraftwerke_ab_2026.pdf (verlinkt von https://www.herbrechtingen.de/Startseite/stadt+_+buerger/foerderprogramm+balkonkraftwerke.html)
- snapshot: -
- zitat_beginnt: "Bezuschusst werden Fotovoltaikanlagen, die nach dem 1.1.2024 installiert wurden."
- zitat_endet: -
- zitat_beschlossen: -
- versucht: Programmseite (HTTP 200, leitet auf https um) — der Fließtext ist skriptgeladen und im HTML leer, verlinkt aber zwei PDFs; das Programm-PDF (HTTP 200, 205 KB) ist ein einseitiger Scan ohne Textebene, daher als Bild gelesen: nur der Stichtag 1.1.2024, kein Inkrafttreten, kein Gemeinderatsbeschluss. Archiv-Abfrage (archive.org/wayback/available) zweimal mit HTTP 429 "Too Many Requests" abgewiesen — nicht weiterverfolgt.
- ergebnis: BELEGT

## weyhe-klimaschutz — Gemeinde Weyhe
- status_katalog: ausgeschoepft
- beginnt: 2021
- endet: -
- beschlossen: -
- vorgaenger: - (das langjährige Programm „Mehr Bäume für Weyhe" ist ein eigenes Baumprogramm, kein Vorläufer der PV-Förderung)
- herkunft: live + pdf
- quelle: https://www.weyhe.de/wohnen-bauen/klima-und-umweltschutz/klimaschutz-foerderung/ · PDF „Richtlinie 2026 zur Förderung von Maßnahmen des Klimaschutzes": https://www.weyhe.de/downloads/datei/M2I3YmFkYjEwYWRjYzIzOXpQMFYvWDlxeEhSSWllYWZzbjU3ZFU2WDVHSEtlWHJCLzdSZGN3UittZWk4YVhZMlVGczg4RTBGeEJFdFBYdHA5THhkODFzQnFEMzhOYWhWRHR0S3RndUtiRnpPZFlSRDRhZnBBcVJXQnMxNDBnekpWOFhybUlOSlVmZ2xIT1ZYZzM5N2FDS0NzNVFUUE9xYjVIdk80QT09
- snapshot: -
- zitat_beginnt: "Ergänzend zum bereits langjährig bestehenden Förderprogramm „Mehr Bäume für Weyhe" ist seit dem Jahr 2021 ein zweites Förderprogramm in Kraft getreten, das insbesondere private Maßnahmen im Bereich der Mobilität, der Haustechnik, der Dachbegrünung und der Photovoltaik unterstützt." (Programmseite)
- zitat_endet: -
- zitat_beschlossen: -
- zitat_laufende_auflage_2026 (nicht Programmstart): "Diese Richtlinie tritt am 11.03.2026, 8 Uhr in Kraft. Der Förderzeitraum beginnt mit dem Inkrafttreten dieser Richtlinie und endet am 31. Dezember 2026." — Richtlinie 2026, Abschnitt 7 „Inkrafttreten und Förderzeitraum"; ausgefertigt "Weyhe, 04.03.2026 / gez. Frank Seidel / Bürgermeister". Die Programmseite deckungsgleich: "Ab Mittwoch, 11. März 2026, ab 8:00 Uhr können die Mittel über ein digitales Formular beantragt werden."
- zitat_ausschoepfung (ohne Tag): "Aufgrund der großen Nachfrage sind bereits alle Fördermittel vergeben. Eine Antragstellung ist nicht mehr möglich!!!" (Programmseite)
- versucht: Programmseite live geholt (HTTP 200) und Richtlinien-PDF nachgeholt — das war die Lücke des ersten Laufs. Die PDF-Ausfertigung 04.03.2026 ist die Unterschrift des Bürgermeisters, kein Ratsbeschluss; ein Beschlussdatum steht weder auf der Seite noch in der Richtlinie. `endet` bleibt leer: die Ausschöpfung nennt keinen Tag, und der 31.12.2026 ist das Ende des laufenden Jahresförderzeitraums, nicht des Programms.
- ergebnis: BELEGT

## moormerland-balkonkraftwerke — Gemeinde Moormerland
- status_katalog: unsicher
- beginnt: 2023-08-28
- endet: 2023-10-25 (Schluss des zweiten und letzten angekündigten Antragsfensters; die Seite erklärt das Programm nicht ausdrücklich für beendet — wer streng liest, setzt hier nichts)
- beschlossen: -
- vorgaenger: -
- herkunft: live
- quelle: https://www.moormerland.de/bauen-wohnen/foerderungen/balkonkraftwerke
- snapshot: -
- zitat_beginnt: "Hier können Sie dann in der Zeit vom vom 28.08.23 ab 10 Uhr bis zum 04.09.23 bis 10 Uhr einen Antrag einreichen." (1. Förderrunde)
- zitat_endet: "Hier können Sie dann in der Zeit vom 18.10.2023 ab 10 Uhr bis zum 25.10.2023 bis 10 Uhr einen Antrag einreichen." (2. Förderaufruf) · Kontext: "Nach dem ersten Förderzeitraum im September 2023 stehen noch Mittel zur Verfügung. Die Gemeinde Moormerland startet nun einen 2. Förderaufruf."
- zitat_beschlossen: - (nur die Existenzaussage: "Die Gemeinde Moormerland hat für 2023 insgesamt 30.000 € an Haushaltsmitteln für die Bezuschussung von Balkonkraftwerken bereitgestellt und eine entsprechende Richtlinie … beschlossen.")
- versucht: Programmseite live gelesen (Vorlauf). Ein Beschlussdatum steht nicht auf der Seite; die Richtlinie ist nur als PDF verlinkt und war im ersten Anlauf nicht lesbar — sie stand in der Nachlauf-Liste nicht als aussichtsreich, deshalb hier kein weiterer Abruf.
- ergebnis: BELEGT

## bad-krozingen-balkon-pv — Große Kreisstadt Bad Krozingen
- status_katalog: aktiv
- beginnt: 2023-09-04
- endet: -
- beschlossen: -
- vorgaenger: -
- herkunft: pdf
- quelle: https://www.bad-krozingen.de/resources/01%20Website/Unterseiten/Bauen%20%26%20Umwelt/Photovoltaik/F%C3%B6rderrichtlinien%20Balkon%20Photovoltaik%20Gro%C3%9Fe%20Kreisstadt%20Bad%20Krozingen.pdf (verlinkt von https://www.bad-krozingen.de/Solar)
- snapshot: -
- zitat_beginnt: "Diese Förderrichtlinie tritt am 04.09.2023 in Kraft." (Kap. 6 „Inkrafttreten und Anwendbarkeit der Förderrichtlinien"; Titel des Dokuments: "Förderprogramm „Balkon Photovoltaik" der Stadt Bad Krozingen: Richtlinie 2023")
- zitat_endet: - (nur eine Bedingung ohne Datum: "Ist der jährliche Fördergesamtbetrag des Haushaltsplans der Stadt Bad Krozingen ausgeschöpft endet das Förderprogramm, danach eingehende Anträge können nicht berücksichtigt werden.")
- zitat_beschlossen: -
- versucht: Programmseite geholt (HTTP 200), drei PDF-Links gefunden, das Richtlinien-PDF geladen und mit pdftotext gelesen — genau die Lücke des ersten Laufs, jetzt geschlossen. Kein Gemeinderatsdatum in der Richtlinie; die Seite selbst nennt weiterhin kein Datum. Antragsformulare tragen die Jahreszahl 2026 im Dateinamen (kein Beleg, nicht übernommen).
- ergebnis: BELEGT

## reichelsheim-steckersolar — Gemeinde Reichelsheim (Odenwald)
- status_katalog: aktiv
- beginnt: 2023 (nur jahresgenau)
- endet: -
- beschlossen: 2023-02-23
- vorgaenger: -
- herkunft: live
- quelle: https://www.reichelsheim.de/leben-in-reichelsheim/bauen-wohnen/foerderung-von-stecker-solaranlagen/
- snapshot: -
- zitat_beginnt: "Die Anträge auf Förderung können ab sofort bei der Gemeinde Reichelsheim im Odenwald gestellt werden." — „ab sofort" bezieht sich auf die Veröffentlichung dieser Mitteilung; ein Antragsstart-Tag steht nicht da.
- zitat_endet: -
- zitat_beschlossen: "Die Gemeindevertretung der Gemeinde Reichelsheim hat in ihrer Sitzung am 23.02.2023 eine Richtlinie zur Förderung von Stecker-Solaranlagen auf den Weg gebracht."
- versucht: Programmseite live gelesen (Vorlauf). Richtlinie und Antrag nur als PDF; ein Inkrafttretensdatum steht nicht im Seitentext. Der 23.02.2023 ist ausdrücklich der Beschluss, nicht der Antragsstart — beides bleibt getrennt.
- ergebnis: BELEGT

## putzbrunn-klimaschutz — Gemeinde Putzbrunn
- status_katalog: pausiert
- beginnt: -
- endet: -
- beschlossen: 2023-12-19 (Auflage 2024)
- vorgaenger: ja, ohne Jahresangabe — belegt allein durch das Wort „erneut"
- herkunft: live
- quelle: https://www.putzbrunn.de/klimaschutz/zuschuesse
- snapshot: -
- zitat_beginnt: -
- zitat_endet: - (nur eine Pause ohne Datum: "Eine Antragstellung wird mit Freigabe des Haushaltes durch das Landratsamt möglich sein.")
- zitat_beschlossen: "Die Gemeinde Putzbrunn hatte für das Jahr 2024 erneut ein Förderprogramm entwickelt, welches am 19.12.2023 vom Gemeinderat angenommen wurde." · Fortführung unter der Überschrift „Förderprogramm 2026": "Am 27. Januar wurde im Gemeinderat die Fortführung des Förderprogrammes mit einem Volumen von 50.000 Euro beschlossen."
- versucht: Programmseite live gelesen (Vorlauf). Die Seite datiert nur einzelne Jahresauflagen, nie den erstmaligen Start. Der Fortführungsbeschluss „am 27. Januar" trägt keine Jahreszahl im Fließtext — nur aus der Überschrift ableitbar, deshalb nicht als Datum ausgegeben. Nebenbefund: Die Seite widerspricht sich beim Volumen 2026 (einmal 100.000 €, einmal 50.000 €).
- ergebnis: BELEGT

## dettelbach-gestaltungssatzung-pv — Stadt Dettelbach
- status_katalog: aktiv
- beginnt: - (siehe versucht — die Geltungsklausel verweist auf die Gestaltungssatzung von 2019 und ist damit als Programmstart nicht brauchbar)
- endet: - ("auf unbestimmte Zeit")
- beschlossen: 2025-12-15
- vorgaenger: -
- herkunft: pdf
- quelle: https://www.dettelbach.de/wp-content/uploads/2026/01/2026-01-13_Richtlinie-zur-Foerderung-von-PV-Anlagen-mit-hohen-Gestaltungsanforderungen_final.pdf (verlinkt von http://www.dettelbach.de/kommunale-foerderprogramme/) · Gestaltungssatzung: https://www.dettelbach.de/wp-content/uploads/2025/12/2025-11-24_GHB_Altstadt_Dettelbach-Satzung.pdf
- snapshot: -
- zitat_beginnt: "Dieses Programm gilt ab Inkrafttreten der Gestaltungssatzung der Stadt Dettelbach und auf unbestimmte Zeit." (Abschnitt 10 „Zeitlicher Geltungsbereich") · dazu in der Satzung: "Der Stadtrat der Stadt Dettelbach hat in seiner Sitzung am 22.07.2019 die Gestaltungssatzung beschlossen. Mit Bekanntmachung vom 02.08.2019 ist die Satzung in Kraft getreten."
- zitat_endet: -
- zitat_beschlossen: "Der Stadtrat der Stadt Dettelbach hat am 15.12.2025 ein kommunales Förderprogramm für Anlagen mit höchsten Gestaltungsanforderungen an die Gebäudeintegration, Farbigkeit, Oberflächengestaltung und den Zuschnitt der Module beschlossen."
- zitat_rueckwirkung (kein Antragsstart): "Für das Jahr 2025 kann der Zuschussantrag rückwirkend bei einer Inbetriebnahme/Ausführung der Maßnahme ab dem 01.01.2025 gestellt werden. Ab dem Jahr 2026 muss vor Inbetriebnahme/Ausführung der Maßnahme ein Zuschussantrag gestellt werden."
- versucht: Programmseite geholt, PDF-Liste ausgewertet. Statt der beiden vom Vorlauf benannten Dateien gibt es eine eigene, neuere PV-Richtlinie ("2026-01-13_Richtlinie-zur-Foerderung-von-PV-Anlagen-mit-hohen-Gestaltungsanforderungen_final.pdf") — sie ist die einschlägige Quelle und wurde gelesen; das Datum im Dateinamen ist nicht übernommen. **`beginnt` bewusst leer**: Die Geltungsklausel datiert das Programm auf das Inkrafttreten der Gestaltungssatzung (02.08.2019), also über sechs Jahre vor seinen eigenen Beschluss — das kann kein Antragsstart sein. Belastbar ist nur der Stadtratsbeschluss 15.12.2025; die Rückwirkung auf den 01.01.2025 ist eine Förderfähigkeitsgrenze, kein Antragsstart.
- ergebnis: BELEGT

## gailingen-balkonsolar — Gemeinde Gailingen am Hochrhein
- status_katalog: aktiv
- beginnt: - (nur der Förderzeitraum der laufenden Auflage 2026 ist belegt, nicht der erstmalige Start)
- endet: -
- beschlossen: 2023-12-21
- vorgaenger: - (kein Beleg; der Beschluss von 2023 legt eine Auflage 2024 nahe, die Quelle sagt es aber nicht)
- herkunft: pdf
- quelle: https://www.gailingen.de/fileadmin/Website/Dateien/Klimschutz/Foerderprogramm_Balkon-Solaranlagen_2026_-_Richtlinie_der_Gemein.pdf (verlinkt von https://www.gailingen.de/infrastruktur-bauen/energie-klimaschutz/ziele-massnahmen-und-foerderungen)
- snapshot: -
- zitat_beginnt: laufende Auflage: "Die Förderung wird im Förderzeitraum (01.01.2026 – 31.12.2026) beantragt" · Ausschluss: "Geräte, welche vor dem 01.01.2026 gekauft wurden." / "Anträge, die nach dem 31.12.2026 eingereicht werden." (Dokumenttitel: „Förderprogramm Balkon-Solaranlagen 2026")
- zitat_endet: -
- zitat_beschlossen: "Beraten und beschlossen durch den Gemeinderat am 21.12.2023." (Schlusszeile der Richtlinie)
- versucht: Programmseite geholt, Richtlinien-PDF geladen und gelesen — die Lücke des ersten Laufs ist geschlossen, das Beschlussdatum 21.12.2023 ist jetzt belegt. Der Archiv-Griff auf die Programmseite (Stand 2024) scheiterte an "429 Too Many Requests" der Wayback-Schnittstelle; nicht wiederholt. **`beginnt` bleibt leer**: Die vorliegende Fassung ist die Auflage 2026 und datiert nur deren Förderzeitraum; das Beschlussdatum 21.12.2023 ist der Beschluss, nicht der Antragsstart.
- ergebnis: BELEGT

## hattenhofen-balkonsolar — Gemeinde Hattenhofen
- status_katalog: aktiv
- beginnt: 2023-05-24
- endet: - ("bis 31.12.2026" ist eine Befristung der verlängerten Fassung, kein Auslaufen)
- beschlossen: 2023-05-24
- vorgaenger: -
- herkunft: archiv (Ursprungsfassung) + live (Verlängerung)
- quelle: https://web.archive.org/web/20240225124342/https://www.hattenhofen.de/de/umwelt/energie-klima/foerderprogramm-balkonsolarkraftwerk · live: https://www.hattenhofen.de/de/umwelt/energie-klima/foerderprogramm-balkonsolarkraftwerk
- snapshot: 2024-02-25
- zitat_beginnt: "Diese Richtlinie tritt am 24. Mai 2023 nach dem Beschluss des Gemeinderates der Gemeinde Hattenhofen in Kraft. / Hattenhofen, 24. Mai 2023 / Jochen Reutter / Bürgermeister" (Archiv-Stand 25.02.2024)
- zitat_endet: -
- zitat_beschlossen: dasselbe Zitat — Inkrafttreten und Gemeinderatsbeschluss fallen hier auf denselben Tag
- zitat_verlaengerung (live): "Diese Richtlinie wird nach dem Beschluss des Gemeinderates der Gemeinde Hattenhofen bis 31.12.2026 verlängert. / Hattenhofen, 22. Januar 2026" · förderfähiger Zeitraum der laufenden Auflage (kein Antragsstart): "Gefördert werden Anlagen rückwirkend ab dem Rechnungsdatum 01.01.2025 und bis zum Rechnungsdatum 31.12.2026."
- versucht: Live-Seite zeigt nur noch die Verlängerung (22.01.2026); das Startdatum stammt aus dem Archiv-Stand, in dem die Ursprungsfassung der Richtlinie noch abgedruckt war (Vorlauf). Kein weiterer Abruf nötig — beide Werte sind wörtlich belegt.
- ergebnis: BELEGT

## gaiberg-steckersolar — Gemeinde Gaiberg
- status_katalog: aktiv
- beginnt: 2023 (nur jahresgenau)
- endet: -
- beschlossen: -
- vorgaenger: 2023 (erste Auflage mit 20 Zuschüssen)
- herkunft: archiv (erste Auflage) + pdf (laufende Auflage 2026)
- quelle: https://web.archive.org/web/20240304191752/https://www.gaiberg.de/gemeinde-info/klimaschutz/foerderprogramm-stecker-solaranlagen · Richtlinie: https://www.gaiberg.de/fileadmin/Dateien/Website/Bilder/1_Gemeinde_Info/Richtlinie_zur_F%C3%B6rderung_Stecker-Solaranlagen_Gaiberg.pdf
- snapshot: 2024-03-04
- zitat_beginnt: "Insgesamt vergibt die Gemeinde Gaiberg im Jahr 2023 20 Zuschüsse in Höhe von je 150 € für neue Anlagen. Das Kaufdatum der Anlage muss nach dem 31.05.2023 liegen." (Archiv-Stand 04.03.2024) — der 31.05.2023 ist eine Förderfähigkeitsgrenze (Kaufdatum), kein belegter Antragsstart
- zitat_endet: - (nur eine Bedingung ohne Datum, siehe unten)
- zitat_beschlossen: - (nur die Existenzaussage in der Richtlinie: "Der Gemeinderat der Gemeinde Gaiberg hat eine Förderung von Stecker-Solaranlagen beschlossen." — ohne Sitzungsdatum)
- zitat_laufende_auflage_2026: "Die Richtlinie tritt zum 01.01.2026 in Kraft und endet mit Ausschöpfung des Budgets i.H.v. 1.500 € bzw. 10 Förderungen à 150 €." (Abschnitt 9 „Inkrafttreten")
- versucht: Richtlinien-PDF nachgeholt und gelesen (im ersten Lauf nicht lesbar). Ergebnis: Es ist die Fassung 2026, sie datiert nur die laufende Auflage und nennt den Gemeinderatsbeschluss ohne Datum. `beschlossen` bleibt deshalb leer, `beginnt` bleibt beim jahresgenauen Wert aus dem Archiv.
- ergebnis: BELEGT

## karlshuld-balkonkraftwerke — Gemeinde Karlshuld
- status_katalog: aktiv
- beginnt: 2023-11-01
- endet: -
- beschlossen: -
- vorgaenger: - ("Auflage eines neuen Förderprogrammes der Gemeinde Karlshuld")
- herkunft: live + pdf
- quelle: https://www.karlshuld.de/neues-foerderprogramm-fuer-balkonkraftwerke-mini-pv-anlagen · Richtlinie: https://www.karlshuld.de/foerderrichtlinien-mini-pv-anlagen-balkonkraftwerke-der-gemeinde-karlshuld (liefert unter dieser Adresse direkt ein PDF aus)
- snapshot: -
- zitat_beginnt: "Das Förderprogramm startet ab dem 01.11.2023. Anträge können ab diesem Zeitpunkt gestellt werden." (Richtlinie, erster Absatz) · bestätigend: "Antragstellung ab 01.11.2023 / Einreichung notwendiger Unterlagen"
- zitat_endet: -
- zitat_beschlossen: -
- versucht: Programmseite geholt; die verlinkte Richtlinie hat keine `.pdf`-Endung in der Adresse, wird aber als PDF ausgeliefert — geladen und mit pdftotext vollständig gelesen (Kopf und Schluss). Sie enthält **kein** Gemeinderatsdatum und keine Inkrafttretens-Klausel außer dem Startsatz; `beschlossen` bleibt deshalb leer. Der Startwert 01.11.2023 ist jetzt zusätzlich in der Richtlinie selbst belegt, nicht nur in der Mitteilung.
- ergebnis: BELEGT

## walddorfhaeslach-steckersolar — Gemeinde Walddorfhäslach
- status_katalog: aktiv
- beginnt: 2023-07-01
- endet: -
- beschlossen: 2023-06-29
- vorgaenger: - (die 1. Änderung 2024 ist eine Anpassung derselben Richtlinie, kein neues Programm)
- herkunft: live
- quelle: https://www.walddorfhaeslach.com/unsere-gemeinde/aktuelles/foerderprogramme.html
- snapshot: -
- zitat_beginnt: "Die Richtlinie zur Förderung von Balkonkraftwerken der Gemeinde Walddorfhäslach, welche seit dem 01.07.2023 in Kraft ist, wird nun an das Solarpaket I hinsichtlich der Leistungsfähigkeit der Balkonkraftwerke von 600 W auf 800 W angepasst."
- zitat_endet: -
- zitat_beschlossen: "Der Gemeinderat der Gemeinde Walddorfhäslach hat in öffentlicher Sitzung am 29.06.2023 die Richtlinie zur Förderung von ‚Balkonkraftwerken' (Stecker-Solargeräte) in Walddorfhäslach beschlossen."
- zitat_aenderung_2024: Beschluss: "Der Gemeinderat der Gemeinde Walddorfhäslach hat in öffentlicher Sitzung am 27.07.2024 die 1. Änderung der Richtlinie … beschlossen." · Inkrafttreten: "Die Richtlinie tritt ab dem 01.08.2024 mit der öffentlichen Bekanntmachung in Kraft. / Ausgefertigt: Walddorfhäslach, den 25.07.2024" · Rückwirkung: "Die Förderung von Balkonkraftwerken mit einer Leistungsfähigkeit von bis zu 800 W erfolgt rückwirkend auf den 16.05.2024 (= Datum Rechtskraft Solarpaket I)."
- versucht: Programmseite live gelesen (Vorlauf); sie druckt beide Fassungen im Volltext ab und trennt Beschluss, Inkrafttreten und Änderung sauber. Kein weiterer Abruf nötig — der ergiebigste Eintrag des Stapels.
- ergebnis: BELEGT

## klempau-balkonkraftwerke — Gemeinde Klempau
- status_katalog: aktiv
- beginnt: -
- endet: -
- beschlossen: 2024-07-11
- vorgaenger: -
- herkunft: live
- quelle: https://gemeinde-klempau.de/foerderung-von-balkonkraftwerken/
- snapshot: -
- zitat_beginnt: -
- zitat_endet: -
- zitat_beschlossen: "Die Gemeindevertretung hat auf der Sitzung am 11.07.2024 beschlossen, Balkonkraftwerke in Klempau zu fördern." · Umfang: "Dafür ist ein Zuschuss von 200 € pro Haushalt vorgesehen. Insgesamt stehen 2.000 € zur Verfügung, es können also zehn Anlagen gefördert werden."
- versucht: Programmseite live gelesen (Vorlauf). Kein Antragsstart und kein Inkrafttreten auf der Seite, nur der Beschluss. Der Beitrag trägt oben das Veröffentlichungsdatum „6. Februar 2025" — das ist das Datum des Artikels, nicht des Programmstarts, und wurde nicht übernommen. Eine Richtlinie ist nicht verlinkt (nur Antragsformular und Verwendungsnachweis), es gibt hier also kein PDF nachzuholen.
- ergebnis: BELEGT

## hillscheid-energie — Ortsgemeinde Hillscheid (VG Höhr-Grenzhausen)
- status_katalog: aktiv
- beginnt: 2024-01-01
- endet: -
- beschlossen: 2024-01-31
- vorgaenger: -
- herkunft: pdf (+ live)
- quelle: https://www.hoehr-grenzhausen.de/themen-die-uns-bewegen/foerderung-privater-energiegewinnung/foerderrichtlinie-der-ortsgemeinde-hillscheid/foerderrichtlinie-private-energiegewinnung-hillscheid.pdf?cid=147d ; ergänzend die Programmseite https://www.hoehr-grenzhausen.de/themen-die-uns-bewegen/foerderung-privater-energiegewinnung/foerderrichtlinie-der-ortsgemeinde-hillscheid/
- snapshot: -
- zitat_beginnt: "VI. Inkrafttreten — Die Richtlinie tritt zum 01.01.2024 in Kraft." (Richtlinien-PDF, letzter Abschnitt)
- zitat_endet: -
- zitat_beschlossen: "Der Gemeinderat Hillscheid hat in der Sitzung vom 31.01.2024 folgende Richtlinie beschlossen:" (Programmseite, Richtlinientext)
- zitat_vorgaenger: -
- versucht: Programmseite (HTTP 200, 424 kB) enthält den Richtlinientext im Volltext samt Beschlusssatz; PDF-Link von dort geholt (HTTP 200), Inkrafttretens-Klausel im letzten Paragrafen. Unterzeichnet "Hillscheid, den 01.02.2024" — Ausfertigung, nicht als Start gewertet. Ein eigener Antragsstart-Termin wird nirgends genannt.
- ergebnis: BELEGT

## schlierbach-energiespeicher — Gemeinde Schlierbach
- status_katalog: aktiv
- beginnt: 2026 (nur die laufende Jahresauflage belegt — das Programm selbst ist älter)
- endet: -
- beschlossen: - (Gemeinderatsbeschluss erwähnt, ohne Datum)
- vorgaenger: Ja — Vorjahresauflage; die Quelle sagt "wie letztes Jahr auch für 2026", nennt aber weder Jahr noch Beginn der ersten Auflage
- herkunft: live (+ pdf)
- quelle: https://www.schlierbach.de/freizeit-kultur/energie-klimaschutz/foerderung-von-energiespeichern ; gleichlautend das Antrags-PDF https://www.schlierbach.de/fileadmin/Dateien/Website/Dateien/Rathaus_Service/Formulare/Ausfuellbar/Antrag_Energiespeicher_2026.pdf
- snapshot: -
- zitat_beginnt: "Die Förderung ist auf 30 Anlagen für das Jahr 2026 begrenzt. Insgesamt stellt die Gemeinde somit ein Fördervolumen von 6.000 € für Energiespeicher im Jahr 2026 zur Verfügung."
- zitat_endet: -
- zitat_beschlossen: "Der Gemeinderat hat wie letztes Jahr auch für 2026 eine pauschale Förderung von Energiespeichern für Photovoltaikanlagen beschlossen." (kein Sitzungsdatum genannt)
- zitat_vorgaenger: "Der Gemeinderat hat wie letztes Jahr auch für 2026 eine pauschale Förderung von Energiespeichern ... beschlossen."
- versucht: Programmseite (HTTP 200) — vollständiger Programmtext, das einzige Datum ist das Förderjahr 2026. Antrags-PDF "Antrag_Energiespeicher_2026.pdf" (HTTP 200) trägt denselben Text, keine Richtlinie mit Inkrafttretens-Klausel, kein Sitzungsdatum. Web-Archiv-Abfrage lief in HTTP 429 (rate limit), nicht wiederholt.
- ergebnis: ABGERUFEN_NICHTS_GEFUNDEN (nur Förderjahr belegt, kein Beschluss-/Startdatum)

## schiltach-pv — Stadt Schiltach
- status_katalog: aktiv
- beginnt: 2022-08-01
- endet: -
- beschlossen: -
- vorgaenger: -
- herkunft: live
- quelle: https://www.schiltach.de/de/Rathaus/Buergerservice-A-Z/Foerderung-von-Photovoltail-Anlagen
- snapshot: -
- zitat_beginnt: "Gefördert werden kann ab 01.08.2022 die Neuerrichtung von fest installierten, mit dem Stromnetz des Netzbetreibers verbundenen Photovoltaikanlagen zur Stromerzeugung sowie Batteriespeicher, die mit der Photovoltaikanlage gekoppelt sind, je Kilowatt peak (kWp) bzw. Kilowattstunde (kWh)."
- zitat_endet: -
- zitat_beschlossen: -
- zitat_vorgaenger: -
- versucht: Programmseite (HTTP 200) trägt den Volltext des Programms; Startdatum dort als Stichtag der förderfähigen Maßnahmen genannt. Verlinktes Förderprogramm-PDF (ceasy/resource/?id=16824, HTTP 200, 1,3 MB) ist ein reiner Scan — pdftotext liefert keinen Text, damit kein Zitat daraus. Ein Sitzungs-/Beschlussdatum steht auf der Seite nicht.
- ergebnis: BELEGT (Start belegt, Beschlussdatum nicht auffindbar)

## tegernheim-stecker-pv — Gemeinde Tegernheim
- status_katalog: aktiv
- beginnt: -
- endet: -
- beschlossen: - (die Richtlinie nimmt auf eine Beschlussfassung Bezug, nennt aber kein Datum)
- vorgaenger: Hinweis, kein Beleg — die verlinkte Richtlinie heißt "foerderrichtlinie-verlaengerung.pdf", was auf eine verlängerte Vorauflage deutet; der Dateiname ist laut Methode kein Beleg, und das PDF selbst hat keine Textebene.
- herkunft: live
- quelle: https://www.tegernheim.de/bauen-und-gewerbe/gemeindliche-foerderungen/
- snapshot: -
- zitat_beginnt: -
- zitat_endet: -
- zitat_beschlossen: - (nur mittelbar: "Nicht förderfähig sind: - Geräte, welche vor Beschlussfassung dieser Richtlinie angeschafft wurden." — ohne Datum)
- zitat_vorgaenger: -
- versucht: Programmseite (HTTP 200, 149 kB) trägt den Richtlinientext im Volltext — kein einziges Datum, keine Inkrafttretens- oder Geltungsklausel. Richtlinien-PDF /media/69341/foerderrichtlinie-verlaengerung.pdf (HTTP 200, 1,8 MB) ist ein Scan ohne Textebene (pdffonts: keine Schriften). Antrags-PDF /media/69342/2026-01-21-antrag-pv-formular.pdf (HTTP 200) hat Text, enthält aber keine Datumsangabe; die Datumsziffern stehen nur im Dateinamen.
- ergebnis: ABGERUFEN_NICHTS_GEFUNDEN

## lohfelden-100-daecher — Gemeinde Lohfelden
- status_katalog: aktiv
- beginnt: 2023-12-01
- endet: - (Gültigkeit der Richtlinien bis 2026-12-31 — Befristung der Fassung, kein Programmende)
- beschlossen: 2023-11-16
- vorgaenger: -
- herkunft: pdf (+ live)
- quelle: https://www.lohfelden.de/de/pdfs/rathaus/verwaltung/satzungen/or-511-richtlinien-photovoltaik-foerderprogramm.pdf?cid=9tv ; ergänzend https://www.lohfelden.de/de/klima-und-umwelt/klima-energie/angebote-foerderungen/
- snapshot: -
- zitat_beginnt: "8. Inkrafttreten — Diese Richtlinien treten am 01.12.2023 in Kraft und haben Gültigkeit bis zum 31.12.2026." (Richtlinien-PDF) / "Seit 01.12.23 besteht das Photovoltaik-Förderprogramm „100 Dächer für Lohfelden“." (Programmseite)
- zitat_endet: "Diese Richtlinien treten am 01.12.2023 in Kraft und haben Gültigkeit bis zum 31.12.2026."
- zitat_beschlossen: "Die Gemeindevertretung der Gemeinde Lohfelden hat in ihrer Sitzung am 16.11.2023 folgende [Richtlinien beschlossen]" (Richtlinien-PDF, Präambel); Ausfertigung "Lohfelden, den 17.11.2023"
- zitat_vorgaenger: -
- versucht: Programmseite (HTTP 200) nennt den Programmbeginn im Fließtext; Richtlinien-PDF (Ortsrecht Nr. 511, HTTP 200) liefert Beschlussdatum, Inkrafttreten und Befristung getrennt. Zusatzbefund: gefördert werden Anlagen mit Inbetriebnahme "ab dem 28.04.2023" — Stichtag der förderfähigen Anlagen, nicht Antragsstart, deshalb nicht als "beginnt" gesetzt.
- ergebnis: BELEGT

## schwebheim-batteriespeicher — Gemeinde Schwebheim
- status_katalog: aktiv
- beginnt: 2026-01-26
- endet: - (automatisches Außerkrafttreten zum 2026-12-31, sofern nicht verlängert — Befristung, kein Programmende)
- beschlossen: - (kein Sitzungsdatum genannt; die Richtlinie ist am 26.01.2026 vom Bürgermeister ausgefertigt)
- vorgaenger: -
- herkunft: live
- quelle: https://www.schwebheim.de/foerderung-eines-batteriespeichersystems
- snapshot: -
- zitat_beginnt: "9. Inkrafttreten — Die Richtlinie tritt mit Wirkung zum 26.01.2026 in Kraft." / "Die Gemeinde Schwebheim legt daher im Rahmen der Haushaltsmittel ab dem 26.01.2026 ein kommunales Förderprogramm mit einer gesamten Fördersumme von 25.000,00 € pro Haushaltsjahr für die Anschaffung von Batteriespeichersystemen im Privatbereich auf."
- zitat_endet: "Soweit die Richtlinie nicht bis 31.12.2026 mittels eines Gemeinderatsbeschlusses verlängert wird tritt diese automatisch am 31.12.2026 außer Kraft." / "Das Förderprogramm ist vorbehaltlich der Haushaltslage vorerst bis zum 31.12.2026 aufgelegt."
- zitat_beschlossen: - (nur die Ausfertigung: "Gemeinde Schwebheim — Schwebheim, 26.01.2026 — Dr. Volker Karb – 1. Bürgermeister")
- zitat_vorgaenger: -
- versucht: Programmseite (HTTP 200) trägt die Richtlinie im Volltext einschließlich Abschnitt 9 "Inkrafttreten" — Start und Befristung dort wörtlich. Keine PDF-Anhänge auf der Seite; Antragstellung läuft über ein Onlineformular. Ein Gemeinderatsbeschluss wird nur als künftige Verlängerungsvoraussetzung erwähnt, ohne zurückliegendes Sitzungsdatum.
- ergebnis: BELEGT

## asbach-balkonkraftwerke — Ortsgemeinde Asbach (VG Asbach)
- status_katalog: aktiv
- beginnt: 2026-01-01
- endet: - (Antragstellung nur bis 2026-12-31 möglich — Befristung der laufenden Auflage, kein Programmende)
- beschlossen: 2025-11-20
- vorgaenger: Ja — frühere Auflage; die Quelle spricht davon, Balkonkraftwerke "auch in 2026" zu fördern, nennt aber weder Jahr noch Zeitraum der Vorauflage
- herkunft: pdf (+ live)
- quelle: https://www.vg-asbach.de/klima-umweltschutz/foerderungen/pv-foerderprogramm-der-ortsgemeinde-asbach/anlage-1-oga-balkonkraftwerk-foerderrichtlinie-2026.pdf?cid=19p7 ; ergänzend https://www.vg-asbach.de/klima-umweltschutz/foerderungen/pv-foerderprogramm-der-ortsgemeinde-asbach/
- snapshot: -
- zitat_beginnt: "10. Inkrafttreten / Außerkrafttreten — Diese Förderrichtlinie tritt am 01.01.2026 in Kraft. Die Richtlinie ist gültig, solange entsprechende Fördermittel hierfür zur Verfügung stehen, spätestens bis zum 31.12.2026"
- zitat_endet: "Die Antragstellung ist ausschließlich bis 31.12.2026 möglich. Sofern der Fördertopf bereits vor dem 31.12.2026 ausgeschöpft ist, kann eine Förderung nicht mehr bewilligt [werden]"
- zitat_beschlossen: "Förderrichtlinie der Ortsgemeinde Asbach zur Förderung von privaten Balkonkraftwerken 2026 (nach Ratsbeschluss am 20.11.2025)" (PDF-Kopf) / "Die Ortsgemeinde Asbach hat am 20.11.2025 beschlossen sogenannte Balkonkraftwerke auch in 2026 pauschal mit 150 € zu fördern." (Programmseite)
- zitat_vorgaenger: "Die Ortsgemeinde Asbach hat am 20.11.2025 beschlossen sogenannte Balkonkraftwerke auch in 2026 pauschal mit 150 € zu fördern."
- versucht: Programmseite (HTTP 200) nennt den Ratsbeschluss samt Datum; verlinktes Richtlinien-PDF (HTTP 200) trägt Beschlussdatum im Kopf, Antragsfrist in Abschnitt 5 und die Inkrafttretens-Klausel in Abschnitt 10. Ausfertigung "Asbach, den 11.12.2025" — dritter Tag, nicht als Start gewertet.
- ergebnis: BELEGT

## schoenbrunn-balkon-pv — Gemeinde Schönbrunn
- status_katalog: aktiv
- beginnt: 2023-07-01
- endet: - (Außerkrafttreten der Richtlinie zum 2026-12-31 — Befristung, das Programm läuft bis dahin)
- beschlossen: -
- vorgaenger: -
- herkunft: pdf (+ live)
- quelle: https://daten2.verwaltungsportal.de/dateien/seitengenerator/bab36892e31c4cdaf1f2744d602bd4ad221669/foerderrichtlinie_balkon_pv_anlage.pdf (verlinkt von https://www.gemeinde-schoenbrunn.de/seite/593686/förderung-von-balkon-pv-anlagen.html)
- snapshot: -
- zitat_beginnt: "9. Inkrafttreten — Diese Richtlinie tritt am 01.07.2023 in Kraft und am 31.12.2026 außer Kraft."
- zitat_endet: "Diese Richtlinie tritt am 01.07.2023 in Kraft und am 31.12.2026 außer Kraft." (dazu: "Für die Haushaltsjahre 2023 bis 2026 stehen jährlich 3.000 EUR für die Bezuschussung zur Verfügung.")
- zitat_beschlossen: -
- zitat_vorgaenger: -
- versucht: Die Katalog-Adresse (/seite/593686/terminbuchungen.html) liefert HTTP 200, trägt aber den Titel "Förderung von Balkon PV-Anlagen" — dieselbe Seiten-ID unter falschem Slug; die kanonische Adresse ist /seite/593686/förderung-von-balkon-pv-anlagen.html. Von dort das Richtlinien-PDF (HTTP 200) geholt: Abschnitt 9 nennt Inkrafttreten und Außerkrafttreten, Abschnitt 1 die Haushaltsjahre. Ein Gemeinderatsbeschluss ist in der Richtlinie nicht datiert.
- ergebnis: BELEGT

## Abgerufen, nichts belegbar

Diese Quellen wurden angesehen; **kein** Start-, End- oder Beschlussdatum ließ sich an einer Trägerquelle belegen. Was versucht wurde, steht dabei.

Die Zeile „Ergebnis" ist das Selbsturteil des Laufs und sagt gelegentlich „BELEGT", wo etwas anderes belegt wurde als ein Datum — bei Freiburg etwa das Ende zweier Teilbausteine bei weiterlaufendem Gesamtprogramm. Maßgeblich für diesen Abschnitt ist der Befund, nicht das Etikett.

### `frankfurt-klimabonus` — Stadt Frankfurt am Main

- Status: aktiv
- Quelle: https://frankfurt.de/-/media/frankfurtde/frankfurt-themen/klima-und-energie/pdf/klimareferat/klimabonus/foerderrichtlinie-klimabonus.pdf (Nr. 5.4 Geltungsdauer und Inkrafttreten, S. 10); ergänzend https://frankfurt.de/themen/klima-und-energie/stadtklima/klimabonus
- Ergebnis: ABGERUFEN_NICHTS_GEFUNDEN (Start-, End- und Beschlussdatum an Trägerquellen nicht belegbar; nur Vorgänger belegt)
- Versucht: frankfurt.de-Seite per curl 403 -> über Browser gelesen (Titel "Klimabonus | Stadt Frankfurt am Main" gegengeprüft), PDF-Links ausgelesen. Richtlinien-PDF per curl zunächst 403 (mit ?dmc=1), ohne Query-Parameter und mit vollen Browser-Headern 200 -> gelesen. PARLIS-Suche (stvv.frankfurt.de) nach "Klimabonus": "Mit diesen Suchbegriffen wurde kein Treffer erzielt".

### `bonn-solares` — Bundesstadt Bonn

- Status: ausgeschoepft
- Quelle: https://www.bonn.de/themen-entdecken/klima/klima-foerderprogramme/foerderrichtlinie-solares-bonn-ab-1-august.php
- Ergebnis: ABGERUFEN_NICHTS_GEFUNDEN
- Versucht: Programmseite (HTTP 200) — kein Start-/Enddatum, nur Modulhinweis "Stecker-Solargeräte auf Hausdächern werden daher seit dem 1. April 2023 bei Neuanträgen nicht mehr gefördert" (Änderung eines Fördermoduls, kein Programmende). Richtlinienseite (HTTP 200) — nennt nur die Fassung ab 01.08.2025, keine Inkrafttretens-/Beschlussklausel, kein Richtlinien-PDF verlinkt (nur zwei Formular-PDFs). Wayback-CDX für die Programmseite: frühester Snapshot 2024-05-18, also kein Beleg für den Programmstart. Kein Hinweis auf Ausschöpfung/Antragstopp auf der Live-Seite.

### `goettingen-klimafonds` — Stadt Göttingen

- Status: ausgeschoepft
- Quelle: https://nachhaltigkeit.goettingen.de/portal/seiten/foerderung-solaranlagen-900000937-25480.html
- Ergebnis: ABGERUFEN_NICHTS_GEFUNDEN
- Versucht: Programmseite Solaranlagen (HTTP 200, 268 kB) — kein Start-, End- oder Beschlussdatum, kein Richtlinien-PDF und kein Richtlinien-Link im HTML (nur Bild-Dateien). KlimaFonds-Übersichtsseite (HTTP 200) — reine Navigationsseite ohne Inhalt. Stadt-Suche https://www.goettingen.de/suche/?q=KlimaFonds+Richtlinie -> HTTP 404. Wayback-CDX für beide Seitenvarianten: frühester Snapshot 2024-10-30, also kein Beleg für den Programmstart.

### `freiburg-stromerzeugung` — Stadt Freiburg im Breisgau

- Status: ausgeschoepft
- Quelle: https://www.freiburg.de/pb/site/Freiburg/get/params_E396118745/2143396/2026_07_06_Foerderrichtlinie_Baustein_3_Strom.pdf ("Richtlinie zum Förderprogramm Klimafreundlich Wohnen der Stadt Freiburg im Breisgau — Baustein 3: Stromerzeugung erneuerbar"), verlinkt auf https://www.freiburg.de/pb/232441.html
- Ergebnis: BELEGT
- Versucht: Programmseite https://www.freiburg.de/pb/232441.html (HTTP 200) — Inhalt weitgehend skriptgeneriert, im Quelltext kein Start-/Enddatum, aber drei Richtlinien-PDFs verlinkt. Baustein-3-PDF (Strom) per curl geholt und mit pdftotext gelesen: Inhaltsverzeichnis führt "10. Inkrafttreten", Klausel im letzten Abschnitt gelesen. Kein Hinweis auf Ausschöpfung/Antragstopp gefunden.

### `wiesbaden-eswe-speicher` — ESWE Versorgungs AG / Klimaschutzagentur Wiesbaden

- Status: aktiv
- Quelle: https://ksa-wiesbaden.de/media/2024_03_01_eswe-solar-batterie-richtlinie.pdf ("Förderrichtlinien zum Förderprogramm „Solar-Speicherbatterie“"), verlinkt auf https://ksa-wiesbaden.de/foerderung/eswe-solar-speicherbatterie/
- Ergebnis: ABGERUFEN_NICHTS_GEFUNDEN
- Versucht: Programmseite (HTTP 200, 9 kB) — kein Datum, verlinkt genau ein PDF. Richtlinien-PDF per curl + pdftotext vollständig gelesen (6 Seiten, davon 2 Seiten Datenschutzhinweise): keine Inkrafttretens-, Geltungs- oder Befristungsklausel, nur die Seiten-Fußzeile "Stand: 01.03.2024".

### `bremen-rundumshaus` — BAB Bremer Aufbau-Bank (Land Bremen)

- Status: aktiv
- Quelle: https://www.bab-bremen.de/de/page/programm/rund-ums-haus sowie das Dokumentenverzeichnis zum Programmbaustein "PV nach Plan" (https://www.bab-bremen.de/de/page/dokumentenverzeichnis?funding=75751&program=80227) und das dort verlinkte Eckdatenblatt https://www.bab-bremen.de/sixcms/media.php/163/74903/Eckdatenblatt%20RuH%20-%20WEG%20250613.pdf
- Ergebnis: ABGERUFEN_NICHTS_GEFUNDEN
- Versucht: Programmseite (HTTP 200) — kein Start-/Enddatum, keine PDFs direkt verlinkt, stattdessen sieben Dokumentenverzeichnisse je Programmbaustein. Verzeichnis zu "Altersgerecht Umbauen" (75757) und zu "PV nach Plan" (80227) abgerufen (je HTTP 200): beide führen dieselben allgemeinen Unterlagen, keine Förderrichtlinie. Eckdatenblatt per curl + pdftotext gelesen — enthält nur "Stand Juni 2025", keine Inkrafttretens- oder Befristungsklausel.

### `schweinfurt-pv` — Stadt Schweinfurt

- Status: eingestellt
- Quelle: https://www.schweinfurt.de/umweltverkehr/umwelt--natur/klimaschutz (erreichbar, aber ohne das Programm)
- Ergebnis: ABGERUFEN_NICHTS_GEFUNDEN
- Versucht: Katalog-URL (HTTP 200) enthält nur Klimaschutzkonzept und Solarkataster, kein Förderprogramm. Site-Suche über /suche.html?q=… lieferte keine Programmtreffer. Die beiden amtlichen Dokument-Adressen (…/47893_230328_rili_pv_und_batteriespeicher.pdf und …/49529_antrag_photovoltaik.pdf) liefern zwar HTTP 200, aber jeweils dasselbe 4,5-kB-JPEG-Platzhalterbild statt eines PDF — die Dokumente sind offenbar entfernt. Web-Archiv derselben Richtlinien-Adresse: HTTP 404. Ein Datum im Dateinamen ("230328") gilt nach Methode nicht als Beleg.

### `heddesheim-umwelt` — Gemeinde Heddesheim

- Status: aktiv
- Quelle: https://www.heddesheim.de/Umweltfoerderprogramm
- Ergebnis: ABGERUFEN_NICHTS_GEFUNDEN
- Versucht: Programmseite abgerufen (HTTP 200, 72 kB) — vollstaendiger Fliesstext ohne jede Datumsformel (kein "in Kraft", kein Gemeinderatsbeschluss, kein Antragsstart). Die verlinkte Richtlinie liegt als DOCX hinter einem Download-Handler (ceasy/resource/?id=8916), der mit und ohne Referer HTTP 404 (JSON-Fehler) liefert. Der Dateiname nennt "Stand Maerz 2026" — laut Methode ein Fassungsdatum im Dateinamen und damit kein Beleg fuer den Beginn.

### `beratzhausen-effizient` — Markt Beratzhausen

- Status: aktiv
- Quelle: https://beratzhausen.com/wp-content/uploads/2026/01/Foerderrichtlinie.pdf
- Ergebnis: ABGERUFEN_NICHTS_GEFUNDEN
- Versucht: Uebersichtsseite /foerderprogramme/ (HTTP 200) und Programmseite /beratzhausen-effizient/ (HTTP 200) abgerufen, beide ohne Datumsangabe; von dort die Foerderrichtlinie als PDF (HTTP 200, 528 kB) vollstaendig gelesen. Die Inkrafttretens-Klausel Nr. 11 nennt bewusst kein Datum: "Die vorstehenden Richtlinien treten mit am Tag der Bekanntgabe in Kraft." Der Tag der Bekanntgabe ist an keiner der drei Quellen genannt; kein Marktratsbeschluss datiert. Der Jahrespfad 2026 im PDF-Link ist laut Methode kein Beleg. Hinweis am Rand: "Achtung! Foerderbudget 2026 ist ausgeschoepft!" — Geld alle, kein Programmende.

### `rietheim-weilheim-pv` — Gemeinde Rietheim-Weilheim

- Status: aktiv
- Quelle: http://www.rietheim-weilheim.de/rathaus-service/aktuelles/kommunale-foerderprogramme
- Ergebnis: ABGERUFEN_NICHTS_GEFUNDEN
- Versucht: Programmseite abgerufen (HTTP 200, 150 kB): Antragsstart nur als "Antraege zur Foerderung von Photovoltaikanlagen/Balkonkraftwerke koennen ab sofort gestellt werden" — ohne Datum. Verlinktes Antrags-PDF (HTTP 200, 194 kB) enthaelt ausser der Jahreszahl im Programmnamen keine Datumsformel, keine Inkrafttretens-Klausel, keinen Gemeinderatsbeschluss. Eine Richtlinie als eigenes Dokument ist auf der Seite nicht verlinkt.

### `altdorf-bb-balkonkraftwerke` — Gemeinde Altdorf (Landkreis Böblingen)

- Status: aktiv
- Quelle: https://www.altdorf-boeblingen.de/de-wAssets/docs/Altdorf_Foerderrichtlinie-Solare-Energienutzung-Altdorf.pdf ; Programmseite https://www.altdorf-boeblingen.de/de/wirtschaft-bauen/foerderprogramm-solare-energienutzung-balkonkraftwerke/index.php
- Ergebnis: ABGERUFEN_NICHTS_GEFUNDEN
- Versucht: Programmseite (HTTP 200) — Fließtext ohne jedes Datum, kein Jahres- oder Tagesdatum im ganzen Dokument. Richtlinien-PDF (HTTP 200) vollständig gelesen (Kopf bis letzter Abschnitt "Nutzungsdauer"): keine Inkrafttretens-Klausel, kein Gemeinderatsbeschluss, keine Befristung — nur das Fassungsdatum im Titel, das laut Methode nicht als Start gilt.

### `steffenberg-balkonkraftwerke` — Gemeinde Steffenberg

- Status: aktiv
- Quelle: https://www.steffenberg.de/rathaus-politik-buergerservice/buergerservice/foerderung-von-balkonkraftwerken.html
- Ergebnis: ABGERUFEN_NICHTS_GEFUNDEN
- Versucht: Programmseite (HTTP 200) — Pressetext ohne ein einziges Datum, auch kein datePublished in den strukturierten Daten. Richtlinien-PDF (neu_04072025_foerderrichtlinie-...pdf, HTTP 200, 962 kB) ist ein Scan ohne Textebene, pdftotext liefert nichts. Antragsformular-PDF (HTTP 200) hat Text, enthält aber keine Jahreszahl und keine Datumsangabe. Der Datumsteil "04072025" steckt nur im Dateinamen — laut Methode kein Beleg.

### `tegernheim-stecker-pv` — Gemeinde Tegernheim

- Status: aktiv
- Quelle: https://www.tegernheim.de/bauen-und-gewerbe/gemeindliche-foerderungen/
- Ergebnis: ABGERUFEN_NICHTS_GEFUNDEN
- Versucht: Programmseite (HTTP 200, 149 kB) trägt den Richtlinientext im Volltext — kein einziges Datum, keine Inkrafttretens- oder Geltungsklausel. Richtlinien-PDF /media/69341/foerderrichtlinie-verlaengerung.pdf (HTTP 200, 1,8 MB) ist ein Scan ohne Textebene (pdffonts: keine Schriften). Antrags-PDF /media/69342/2026-01-21-antrag-pv-formular.pdf (HTTP 200) hat Text, enthält aber keine Datumsangabe; die Datumsziffern stehen nur im Dateinamen.

### `parkstein-nachhaltigkeitszuschuss` — Markt Parkstein

- Status: aktiv
- Quelle: https://www.parkstein.de/zuschuesse ; Formulare https://www.parkstein.de/wp-content/uploads/sites/32/2023/07/Ankuendigung_Parksteiner_Solarfoerderung_neuBalkon.pdf und .../AntragParksteiner_Solarfoerderung_neuBalkon.pdf
- Ergebnis: ABGERUFEN_NICHTS_GEFUNDEN
- Versucht: Programmseite /zuschuesse (HTTP 200) — Fließtext ohne Datum, kein Richtlinientext, nur zwei Formular-Links. Beide Formular-PDFs (HTTP 200) haben Textebene, enthalten aber außer "Stand: 01.08.2022" keinerlei Datum und keinen Verweis auf eine datierte Richtlinie. Sitesuche https://www.parkstein.de/?s=Nachhaltigkeitszuschuss (HTTP 200) liefert keine weitere Seite und kein PDF. Eine Förderrichtlinie ist auf der Amtsseite nicht veröffentlicht.

### `marburg-balkonkraftwerke` — Universitätsstadt Marburg

- Status: aktiv
- Quelle: https://www.marburg.de/leben-in-marburg/umwelt-und-klima/klimaschutz-und-klimaanpassung/foerderprogramme/balkonkraftwerke/ ; Übersichtsseite .../foerderprogramme/ ; Antragsformular https://www.marburg.de/downloads/datei/YTc2NTUzYzZmNjc0MDVlNWpzaG1lVFVtVkEvL3djY1Yxb0hZSFcxSlRIZ2tCOXdlUktPK25pZFZ4VFBCRzdkWUY3VkRtS3ZTNk10NWNmRXZIMWF1ZkpFRGloeWtIaSs5dEdsVGxET2tUcjdDTXoxZW9PcE9DekUzNy94Y2NQeU4xK3c2dXRmTktuYmNWNU5L
- Ergebnis: ABGERUFEN_NICHTS_GEFUNDEN
- Versucht: Programmseite (HTTP 200, 266 kB) — vollständiger Programmtext samt FAQ, kein einziges Datum, kein Richtlinien-Link. Antragsformular-PDF (HTTP 200, Textebene vorhanden) enthält keine Datumsangabe. Übersichtsseite der Förderprogramme (HTTP 200) datiert nur den Klimanotstand-Beschluss (Juni 2019) und eine Antragsfrist zum 31.08.2025 — beides gehört NICHT zu diesem Programm (die Frist betrifft das ausgesetzte Programm "Klimafreundlich Wohnen"), deshalb nicht übernommen. Eine Förderrichtlinie ist auf der Amtsseite nicht veröffentlicht; die Antragstellung läuft über die Stadtwerke.

## Nie angesehen

Keine — alle 108 Programme wurden abgerufen.

