# Förderkatalog: Vorfälle und Messungen (Stand 08/2026)

Ausgelagert aus `CLAUDE.md` am 24.08.2026. **Die Regeln stehen weiterhin dort** — hier liegen die
Messungen und Vorfälle, aus denen sie entstanden sind. Wer eine Regel ändern will, liest zuerst hier,
warum sie so lautet.

## Das erfundene Prüfdatum (16.08.2026)

`updated_at` diente als Ersatz, wenn `last_verified` leer war. Damit trugen **25 der 38 Programme**
ein Prüfdatum für eine Prüfung, die nie stattgefunden hatte; nur 13 hatten ein echtes. Jeder Resync
frischte das Datum auf. Gemessen an Bonn: `last_verified` leer, `updated_at` 17.06.2026, auf der
Seite stand „Zuletzt geprüft: 17.06.2026".

Dieselbe Fehlerklasse war schon am 28.07.2026 aufgetreten, als ein Lauf über ein einzelnes Programm
allen 36 Programmen das Tagesdatum aufstempelte.

**Regel daraus:** nur `last_verified` speist das Datum. Ohne echtes Prüfdatum steht der redaktionelle
Stand da — die schwächere, aber ehrliche Aussage.

## Die 180-Tage-Frist, zweimal verworfen

Erste Fassung des Beleg-Verfalls: festes Höchstalter von 180 Tagen auf die inhaltliche Prüfung.
Vom Betreiber zurückgewiesen: „da haben wir ein halbes Jahr einen alten Stand auf der Seite."
Die Frist war als Notbremse gedacht und wurde zum Ersatz für die Prüfung.

Dasselbe Argument kippte später ein festes Vierteljahr für die Wiedervorlage im Screening:
„ein Förderprogramm das 89 Tage den falschen Status hat wäre dumm."

**Regel daraus:** Maßgeblich ist nicht das Alter, sondern ob wir den Stand gerade bestätigen können.
Die Uhr läuft nur, wenn wir es NICHT können — und dann zwei Wochen statt sechs Monaten.

## Der Gemeindeschlüssel ohne Aussehen (19.08.2026)

Sechs von 43 neu aufgenommenen Programmen zeigten auf den falschen Ort (Limburgerhof nach Neuhofen,
Poing nach Moosach). Der erste Lauf über den gesamten Katalog fand zusätzlich einen Altbestand:
Bad Homburgs Programm hing an Glashütten — angeboten an 3.000 Einwohner im Taunus, vorenthalten den
57.000 in Bad Homburg.

Niemandem aufgefallen, weil ein Test den falschen Schlüssel festgeschrieben hatte und grün war:
**Er verglich den Fehler mit sich selbst.**

**Regel daraus:** Ein Gemeindeschlüssel lässt sich gegen keinen Testwert absichern, nur gegen das
Melderegister — deshalb der tägliche Abgleich, der rot werden darf.

## Der falsche Nenner unter dem Ortsnamen (19.08.2026)

Fünfstellige Schlüssel gehören einer kreisfreien Stadt ODER einem Landkreis. Aachen, Hannover und
Saarbrücken tragen fünfstellige Schlüssel, die der StädteRegion, der Region und dem Regionalverband
gehören: Die Hannover-Seite zeigte den Bestand von 1,14 Mio. Einwohnern unter dem Namen einer Stadt
mit 522.000 — rund 57.000 statt 11.945 Anlagen. Bei Linsengericht: 30.836 statt 1.121.

Der Fehler fällt niemandem auf, weil die Seite dabei völlig normal aussieht.

## Vergleich auf Gleichheit verfehlt jedes dritte Programm

Gemessen: 2 Programme mit zweistelligem Schlüssel (Land), 35 mit fünf (Kreis), 70 mit acht (Gemeinde).
Die Seiten tragen durchweg acht Stellen. Würzburgs Seite (09663000) fand ihren eigenen Eintrag (09663)
nicht und stand als ungelesene Lücke in der Arbeitsliste.

**Die Richtung ist der Punkt:** Das Fördergebiet enthält die Gemeinde, nie umgekehrt.
Höhr-Grenzhausens Dorfzuschuss (07143032) darf niemals für den ganzen Westerwaldkreis zählen.

## Eine Gemeinde, mehrere Förderseiten (Umbau 19.08.2026)

Die Erfassung hielt an drei Stellen genau eine Adresse je Gemeinde fest. Eine Stadt, die Photovoltaik
auf der einen und Balkonkraftwerke auf einer anderen Seite fördert — der Normalfall —, verlor eine der
beiden: kein Fehler, keine Meldung, die zweite Seite existierte für uns nicht. Damit konnte der Katalog
je Technik gar nicht vollständig werden.

## Vier Fehlgriffe der Suche, seit alle Funde bleiben

Solange je Gemeinde eine Adresse überlebte, verdrängte ein echter Treffer den Müll fast immer.

1. Die Ressort-Liste prüfte Vollwörter statt Stämme: »schule« gegen »schulamt«, »sprache« gegen
   »sprachfoerderung«.
2. **»Beförderung« enthält »Förderung«** und meint Transport.
3. Fremdsprachige Pfad-Präfixe sind Dubletten derselben Seite — `/de/` dagegen ist bei vielen die
   EINZIGE Fassung und darf nicht mitgefiltert werden.
4. Manche Verwaltungen streichen den Umlaut ersatzlos (»forderprogramme« bei Gaimersheim und Kempten
   sind echte Programme). Aufgenommen sind nur die zusammengesetzten Formen: Das nackte »forderung«
   ist ein eigenes Wort, und »Forderungsmanagement« ist das Eintreiben offener Beträge.

## Zwei stille Fehler, die erst beim Messen auffielen

- **Prozentkodierte Umlaute** wurden nie erkannt: die URL-Zerlegung liefert `/f%c3%b6rderrichtlinien`,
  kein Muster passte. Verdeckt durch den Linktext, tödlich in Sitemaps, die keinen haben —
  60 von 2.583 gespeicherten Adressen betroffen.
- **Ein Download ist keine Seite.** Richtlinien-PDFs hinter undurchsichtigen Kennungen kamen über ihren
  Linktext auf volle Punktzahl, wurden dann als Nicht-HTML verworfen — und die Gemeinde galt trotzdem
  als versorgt und kam nie wieder in die Suche. 23 wieder freigegeben.

## Die Trefferquote war die eigentliche Lücke (19.08.2026)

Der Crawl fand auf 9.722 Gemeinde-Websites nur 1.303 Förderseiten (13 %): Er geht zwei Klicks tief und
sieht nur, was im Menü der Startseite verlinkt ist. Eine Förderseite unter „Bauen und Wohnen → Umwelt →
Energie → Förderungen" ist für ihn unsichtbar, für die Volltextsuche der Website ein Treffer.

Gemessen an 150 aufgegebenen Gemeinden: **9 % Ertrag**, 3,0 Abrufe je Gemeinde. Auf den 60 größten
davon 22 von 60 — der Unterschied ist die Verteilung, nicht die Methode.

Die POST-Formulare mitzunehmen (nur Adresse und Feldname übernehmen, dann ein GET schicken) hob die
Formular-Quote von 14/39 auf 92/149.

## Der Screener sortiert vor, er liest nicht

Er meldete eine Seite über Zuschüsse zu Verhütungsmitteln als PV-Treffer, weil das Wort im
Navigationsmenü stand. Behoben, indem Navigation, Kopf- und Fußbereich vor der Bewertung wegfallen.

Gemessen an einem Tag paralleler Prüfung: **grob die Hälfte der Fundstellen ist nichts** —
Beratungsangebote, Dachbegrünung, Zuschüsse für Garagenhöfe, Landes- und Kreisprogramme in
kommunalem Gewand.

## IP-Reputation: derselbe Lauf, andere Adresse (17.08.2026)

Vom Rechner des Betreibers waren 2 Seiten unerreichbar, aus GitHubs Rechenzentrum 5 — dieselben Seiten,
andere IP-Reputation. archive.org antwortet auf Azure-Adressen mit 503/523 auf jedem Weg, von einem
normalen Anschluss mit 200.

Deshalb ruft der Wächter über die eigene Produktion ab. Wirkung im selben Lauf: drei zuvor unerreichbare
Städte kamen durch.

## Bot-Prüfungen sind eine Laune, keine Mauer (16.08.2026, frankfurt.de)

Direkter Abruf: 403. Skriptgesteuertes Chromium: landet auf der Cloudflare-Prüfseite, unsichtbar **und**
sichtbar gestartet, löst sich nicht auf. Im echten Chrome erschien zeitweise das „Bestätigen Sie, dass
Sie ein Mensch sind"-Häkchen — derselbe Browser lieferte die Seite eine Stunde später ohne jede Prüfung.

Ein einzelner Versuch ist Glückssache, über mehrere Läufe kommt man durch. Tarnwerkzeuge oder gelöste
Mensch-Prüfungen sind keine Option: zusätzlich brüchig, und ein stillstehender Wächter meldet weiter Grün.

## Der Rauschfilter im Fingerabdruck

wuerzburg.de verwürfelt seine Kontaktadresse als Spamschutz bei jedem Aufruf. Ein zeichengenauer Abdruck
meldete dort täglich eine Änderung — unter der 14-Tage-Regel wäre das Programm auf reines Rauschen hin
dauerhaft aus der Rechnung gefallen.

**Uhrzeiten werden bewusst NICHT gefiltert:** Eine Uhrzeit (09:14) und ein kurzes Datum (14.06.) sind per
Muster nicht zu unterscheiden, und eine verpasste Antragsfrist ist der teurere Fehler.

## Fremde Förder-Listen (Recherche 19.08.2026)

Vollständig in `docs/foerderquellen-recherche.md`. Kern: Bund, Länder und Energieagenturen führen
Programme **für** Kommunen, nicht **von** Kommunen — dieselbe Umkehrung überall, und die Hauptfalle beim
Bewerten solcher Quellen.

Nur zwei private Portale führen kommunale Bürgerprogramme; sie kennen zusammen rund 200 der 11.247
Gemeinden und decken 68 echte Fehlgriffe unserer Suche auf, erreichen den langen Schwanz aber genauso
wenig wie wir.

Zwei Legal-Judges raten übereinstimmend vom Abzug ab: Bei diesen Portalen IST die Auswahl die
vollständige Investition, damit ist die Ortsname-plus-Link-Liste der qualitativ wesentliche Teil
(§ 87b Abs. 1 S. 1 UrhG); wiederkehrende Abgleichläufe lösen zusätzlich Satz 2 aus.

## Der Standort-Ertrag im Verzeichnis war Handarbeit (bis 19.08.2026)

104 von 105 Handwerten lagen **zu niedrig**, im Mittel um 43 kWh/kWp. Dieselbe Fehlerklasse wie der
„Sicherheitspuffer" im bundesweiten Mittelwert, der einen Tag zuvor entfernt wurde: Ein Abschlag gehört
dorthin, wo die Angabe des Nutzers ihn begründet, nicht in den Standortwert.

## Zwei Listen, die synchron bleiben müssten

Herne und Ludwigshafen standen im Verzeichnis, ihre Programme im Katalog — die Seite sagte nichts.
Bremerhaven verpasste ein **aktives** Landesprogramm. Der Seitentitel lief zuletzt noch über das alte
Feld und hätte für ein eingestelltes Programm „Zuschüsse" versprochen.

## Was das Modell nicht ausdrücken kann

Real vorgekommen und bewusst ohne Zahl aufgenommen: an eine Einkommensgrenze gebundene Zuschüsse
(Bad Krozingen 60 % ohne Deckel, Tübingen 75 % mit Sozialkarte), ein Satz nur für Ost- und Westdächer
(Ottobrunn), ein Zuschuss je eingesparter kWh statt je Anlage (Ottobrunn), ein Prozentsatz auf den
SPEICHER-Preis statt auf die Anlage (Schlierbach), ein Sockel plus Satz je kWh (Schwebheim).

Der Prozent-Zweig rechnete bis 18.08.2026 ungedeckelt, obwohl „20 % der Kosten, höchstens 300 €" die
häufigste Bauform kommunaler Zuschüsse ist — ein Drittel der Fundstellen aus dem Screening.

## Durchsatz

Vier bis sechs Prüf-Agenten parallel, je acht Seiten, sind erprobt und brachten an einem Tag
44 Programme. Am 19.08.2026 war die Leseliste erstmals vollständig leer. Der Engpass ist nicht das
Lesen, sondern die Trefferquote der Suche.

Übergabe mit allen Zahlen in den Gedächtnis-Einträgen `project_foerder_abdeckung` und
`project_foerder_suche_tiefe`.
