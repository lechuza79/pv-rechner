# Trier und Nidda — erste Storyauswahl

Grundlage: vollständiger lokaler Solar-Export vom 10. September 2026, heute aktive Einheiten nach Inbetriebnahmedatum. Zahlen sind Registerauswertungen, keine Förderfallzahlen. Detaildaten: scripts/.cache/bnetza/story-history-2026-09-10/full.json. Nur Stadt Trier, nicht Landkreis Trier-Saarburg. Keine Veröffentlichung oder Nachricht verschickt.

## 1. Trier: Zwei starke Monate rund um die Balkonförderung

August 2024: 118 Balkonkraftwerke. März 2026: 116. Die Stadt bestätigt Förderbeginn Juli 2024 und Ende 31. März 2026. Damit passen zwei auffällige Monate zeitlich zu Beginn und Ende des Programms. Kein isolierter Einzelpeak und kein kausaler Wirkungsnachweis.

Visual: Monatsverlauf mit klar markiertem Förderzeitraum, beide Ausschläge beschriften. Der vollständige historische Verlauf bleibt die Prüfgrundlage; ein verdichteter Ausschnitt rund um die Förderphase muss als solcher benannt werden. Kein willkürlicher 2x-Peakfilter für dieses andere Storymuster.

Gegenvergleich: März 2026 gegenüber März 2025: Trier 116 statt 47 (+147 %), Rheinland-Pfalz ohne Trier 2.614 statt 2.762 (-5,4 %). Juli–September 2024 gegenüber denselben Monaten 2023: Trier 281 statt 68 (+313 %), übriges Rheinland-Pfalz 10.097 statt 4.188 (+141 %). Auch im Land gab es Wachstum; Förderwirkung darf nicht aus Triers Anstieg allein abgeleitet werden. Landesvergleich ist keine passende Kontrollgruppe und kein Signifikanztest.

Quelle: https://www.trier.de/leben-in-trier/klima-umwelt/klimaschutz/erneuerbare-energien/solarenergie/13861.Foerderung-von-Balkonsolaranlagen.html

## 2. Trier: Mehr Balkonkraftwerke als im Vorjahreszeitraum

Januar–Mai 2026: 261; Januar–Mai 2025: 203 (+28,6 %). Übriges Rheinland-Pfalz im identischen Zeitraum: 10.281 statt 12.073 (-14,8 %). Konkrete aktuelle Vergleichsstory, überschneidet sich inhaltlich mit dem Förderphasen-Beitrag. Nicht beide mit derselben Aussage gleichzeitig ausspielen.

Visual: Zwei Jahreslinien über dieselben Kalendermonate oder gepaarte Balken; regionaler Kontext als kleine Ergänzung. Es werden gleiche fünf Monate verglichen, nicht Teiljahr und Gesamtjahr. Die bestehende dreimonatige Karenz reduziert Nachmeldeprobleme, beweist aber keine Vollständigkeit.

## 3. Nidda: Seit 2023 jedes Jahr mehr als 120 Balkonkraftwerke

Inbetriebnahmen 2022: 10; 2023: 122; 2024: 129; 2025: 131. Der starke Wechsel liegt 2023, danach bleibt das Niveau stabil hoch. Die Stadt kündigte zum 1. Februar 2023 die Fortsetzung der Förderung mit aufgestocktem Gesamtbudget und einem Schwerpunkt für Mini-PV an. Nicht als erstmaliger Förderstart beschriften.

Visual: Jahresbalken, 2023–2025 als zusammenhängende Phase; 2022 als Ausgangswert. Aussage über dauerhaft hohes Niveau, nicht erfundener aktueller Rekord. Ergänzung: Gebäudeanlagen 2023: 175, gegenüber 84 im Jahr 2022. Nicht alle als Privathäuser bezeichnen.

Quelle: https://www.nidda.de/news/news-archiv/2023/1-quartal-2023/pv-foerderung/

## Zurückgestellt: Trier, große Freiflächenanlage

Register weist August 2025 eine einzelne Freiflächen-Einheit mit 21.216,44 kWp aus. Sie würde den starken Leistungszubau 2025 erklären (gesamt 25.894,10 kWp). Projektidentität und Standort wurden noch nicht gegen den Einzelregistereintrag geprüft. Die städtischen Projektinformationen reichen dafür bisher nicht. Diese beeindruckende Zahl vorerst nicht als bestätigte Trierer Projektgeschichte präsentieren.

## Empfehlung

Zuerst Trier Förderphase gestalten: lokaler Bezug, zwei klare visuelle Ereignisse und belastbare amtliche Programmdaten. Danach Nidda als anderes übertragbares Muster: ein dauerhaft verändertes Niveau. Vor Versand Abnahme der sichtbaren Story; Förderung bleibt Kontext, nicht automatisch Ursache.

## Implemented local review set

V2 now defaults to Trier, with Nidda and the previous examples separately selectable. Each city has three complete stories: local funding/growth context, annual building additions, and balcony count versus capacity. The last two share data-driven templates across both cities. Each has teaser, feed, detail and social preview. Current regional-growth candidate is kept out to avoid repeating Trier's same balcony development; the unverified large project remains excluded.

Browser checks covered all six stories, modal next navigation, city selection, detail, narrow teaser, wide feed and social rendering. TypeScript and 10 focused regression tests passed. Share/widget actions remain design-preview interactions; no publication, live feed integration or outbound sending occurred.
