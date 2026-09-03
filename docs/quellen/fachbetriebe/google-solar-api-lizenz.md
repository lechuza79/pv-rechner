# Google Solar API — Lizenzprüfung (03.09.2026)

Zwei Legal-Judges, der zweite mit dem Auftrag, den ersten zu widerlegen. Beide
haben die Vertragsdokumente per `curl` im **Volltext** gelesen — WebFetch kürzt
sie ab und liefert dabei stumm einen unvollständigen Text.

## Ergebnis

**Der Rechner UND die Weitergabe an einen Fachbetrieb sind gedeckt.** Der erste
Judge hielt die Weitergabe für offen; der zweite hat das korrigiert, und seine
Begründung trägt: § 21.1 der dienstspezifischen Bedingungen erlaubt die Nutzung
für „the **preparation and** delivery of a commercial proposal … requested by a
user for a particular address", und § 21.2 nimmt Solar-Daten, die in „fixed
media (e.g., … commercial proposal)" eingegangen sind, dauerhaft von der
Löschpflicht aus. Ein Angebot, das dauerhaft bestehen darf, aber niemandem
übergeben werden dürfte, ergibt keinen Sinn — und **vorbereitet** wird ein
PV-Angebot vom Fachbetrieb, nicht von uns.

## Drei Bedingungen, jede aus dem Wortlaut

1. **Der Nutzer stößt die Weitergabe selbst an, für seine eigene Adresse.**
   Ohne konkreten Wunsch (Verzeichnis, automatisches Ausspielen, Adressvorrat)
   ist es nicht gedeckt — § 21.1 sagt „only" und knüpft jeden Zweck an eine
   Adresse.
2. **Nur ABGELEITETE Werte weitergeben, nie die rohe Antwort der
   Schnittstelle und keine Bildebenen.** Das ist die eigentliche Trennlinie —
   nicht „an den Nutzer" gegen „an den Betrieb". Rohdaten fielen unter das
   Verbot des „reshare … outside of the Services" (§ 3.3.2(a)) und des
   Weiterverteilens der Dienste (§ 3.3.1(b)). Abgeleitete Werte sind nach
   Googles eigener Dokumentation „entirely new content".
3. **Attribution wandert mit dem Inhalt.** Rohdaten/Bilder: „Source: Includes
   solar data from Google". Abgeleitete Werte: **„Includes data from Google
   Maps"** — also auch im Dokument, das an den Fachbetrieb geht.

## Was VOR dem Livegang zu erledigen ist

- **§ 3.2.2:** Unsere Nutzungsbedingungen müssen (A) auf die enthaltenen
  Google-Maps-Inhalte hinweisen und (B) auf Googles Endnutzerbedingungen und
  Datenschutzerklärung verlinken. Fehlt heute vollständig.
- Beide Attributionsstrings (siehe oben).
- **30-Tage-Löschung als echte Löschung**, nicht nur als Ablaufzeit im Code
  (§ 21.2 Satz 1). Ein Zwischenspeicher nach dem Muster des Standort-Ertrags
  braucht einen Löschlauf.
- **§ 4.2:** Keine personenbezogenen Daten an Google. Adresse und Koordinaten
  sind Normalbetrieb (§ 4.4); ein mitgesendeter Name, eine Nutzerkennung oder
  ein Freitext wäre ein Verstoß.
- Außerhalb des Google-Vertrags: die datenschutzrechtliche Grundlage für die
  Weitergabe von Adresse und Dachanalyse an den Fachbetrieb — steht in unserer
  Datenschutzerklärung heute nicht.

## Vier Irrtümer, die NICHT zurückkommen dürfen

1. **„Die Sperrklausel für Verzeichnisdienste gilt auch hier."** Sie steht in
   den **Nicht-EWR**-Bedingungen (§ 3.2.3(d)(iii)); unsere Fassung gilt ab
   deutscher **Rechnungsadresse**, und dort sind die Buchstaben (d) bis (f)
   ersatzlos gestrichen (DMA-Bereinigung). Volltextsuche nach „directory",
   „listing service", „re-creat", „substantially similar": kein Treffer.
2. **„Der Hauptvertrag geht den dienstspezifischen Bedingungen vor."**
   Widerlegt. § 16.15 ist zirkulär — „Agreement" ist definiert als der
   Vertrag **einschließlich** der URL-Terms, ein Dokument kann sich nicht
   selbst vorgehen. Die einzige echte Rangfolge steht in der Definition der
   URL-Terms und setzt die dienstspezifischen Bedingungen an **erste** Stelle.
   Die Klausel, die eine Über-/Unterordnung ausdrückt (§ 17.2), ist eine
   Reseller-Klausel und gilt uns nicht.
3. **„§ 21 fehlt das Ausnahmevokabular, also greift er nicht."** Widerlegt an
   vier Gegenbeispielen: Pollen, Places Aggregate, Weather und **sämtliche**
   Caching-Erlaubnisse der dienstspezifischen Bedingungen sind ohne dieses
   Vokabular formuliert. Wäre der Umkehrschluss richtig, wäre jede davon
   unwirksam. Der Hauptvertrag verweist in § 3.3.2(b) sogar ausdrücklich auf
   die dienstspezifischen Bedingungen als Ort für Freigaben.
4. **„Ohne Rückfrage bei Google geht es nicht."** Die vom ersten Judge
   formulierte Frage entsteht nur durch seine eigene Verengung auf das Wort
   „delivery"; die Norm sagt „preparation **and** delivery".

## Verschattung — was Google liefert

Wörtlich in der Beschreibung der Ertragsberechnung: „Shading from trees, other
buildings, and other parts of the roof are taken into account." Gauben,
Schornsteine und Kamine fallen unter das Letzte. Zusätzlich gibt es eine
Datenebene mit dem Schattenverlauf über 24 Stunden. **Nicht dokumentiert:**
Herkunft und Alter der Luftbilder — ein seither gewachsener oder gefällter
Baum steht nicht im Modell.

## Was ungeprüft blieb

- Wirksamkeit der Rechtswahl (kalifornisches Recht, Gerichtsstand Santa Clara
  County) gegenüber einem deutschen Unternehmer, und eine mögliche
  AGB-Inhaltskontrolle nach §§ 305 ff. BGB. Eigener Prüfauftrag.
- Frühere Fassungen der Dokumente (gelesen: Bedingungen vom 26.08.2026,
  dienstspezifische Bedingungen vom 10.06.2026).
- Ob Google die Klausel intern anders auslegt — eine veröffentlichte
  Auslegungshilfe zu § 21 gibt es nicht.

## Zum Vergleich: syte.ms scheidet aus

Nutzung „ausschließlich für Ihre eigenen Geschäftszwecke" — die Weitergabe an
einen Fachbetrieb ist damit ungeklärt; keine Verschattung; vierstellige
Monatskosten.

---

# NACHTRAG 03.09.2026: gemessen und VERWORFEN — nicht neu erheben

Die Lizenzprüfung oben gilt weiter. Die Dachanalyse wurde trotzdem **nicht**
eingebaut: Sie scheitert nicht am Recht und nicht am Code, sondern an einer
Eigenschaft der Quelle, die sich nicht wegprogrammieren lässt.

## Der Befund

**Google kennt keine Grundstücksgrenzen.** Die Antwort beschreibt ein
*Gebäude* im Sinne des Höhenmodells — bei Reihen- und Doppelhäusern ist das
die ganze Zeile. Am Referenzfall (Reihenhaus, Höchberg) meldete die
Schnittstelle 141 m² Dachfläche für ein Haus mit rund 60 m², und die
vorgeschlagene Modulbelegung lief quer über zwei Häuser hinweg. Der Betreiber
zum Bild: „das layout ist so auch unmöglich — das wäre eher peinlich es einem
solateur so zu schicken".

Weitere gemessene Fälle: Bornholmer Straße Berlin — 69 m lange Zeile, 785 m²,
80 kWp als ein „Gebäude". Christaweg Freiburg — 1.648 m² für eine
Wohnadresse.

**Es gibt keine Angabe in der Antwort, an der sich das eigene Haus erkennen
ließe.** Ein Umkreisfilter um den Adresspunkt greift zu kurz: Bei 60 echten
Anschriften lag der Adresspunkt in der Hälfte der Fälle unter 7 m vom
Gebäudemittelpunkt, bei 20 % über 20 m, im schlechtesten Fall 63 m. Die
Lösung wäre, den Nutzer seine Dachfläche auf dem Luftbild einzeichnen zu
lassen — also Solateur-Software in einem Rechner, der in vier Fragen ein
Ergebnis liefern soll.

## Was TROTZDEM gemessen wurde und stimmt

- **Der Zugang steht.** Schlüssel angelegt, auf die Solar-Schnittstelle
  beschränkt, in Produktion und lokal hinterlegt. Kostet nichts, solange
  niemand ihn benutzt (10.000 Gebäudeabfragen im Monat frei; die Bildebenen
  1.000, danach 7,5 Cent je Abruf).
- **Die Abdeckung ist gut.** Von 60 echten Anschriften lieferte die
  Schnittstelle in 60 Fällen eine Antwort. Luftbilder zwischen 2015 und 2025.
- **Geokodierung braucht kein Google.** Zwei kostenlose Dienste (Photon,
  Nominatim) fanden 39 von 40 Anschriften und lieferten dieselbe Koordinate.
  Die früher vermutete Ausfallquote von 40 % lag an erfundenen Testadressen,
  nicht an den Diensten.
- **Verschattung liefert Google wirklich.** Wörtlich: „Shading from trees,
  other buildings, and other parts of the roof are taken into account."
  Innerhalb desselben Gebäudes lagen zwischen der schlechtesten und besten
  Dachfläche 430–450 Sonnenstunden im Jahr.
- **Googles Ertrag ist NICHT unser Ertrag** (861–927 kWh/kWp in der
  Stichprobe — das ist der Wert vor dem Wechselrichter). Wer das je einbaut:
  Google liefert die Geometrie, der Ertrag bleibt bei der bisherigen Quelle.
  Zwei Ertragsquellen nebeneinander wären zwei Wahrheiten für dieselbe Zahl.

## Die Lehre, die über diesen Fall hinausgeht

**Eine schematische Darstellung taugt nicht zur Bestätigung.** Der erste
Versuch zeichnete die Dachflächen als Umriss-Grafik ohne Luftbild — Urteil
des Betreibers: „ich checke auf den grafiken garnix". Erst das Luftbild mit
den eingezeichneten Flächen machte den Fehler in einer Sekunde sichtbar. Wer
eine automatische Erkennung bestätigen lassen will, zeigt das Original, nicht
eine Ableitung davon.

**Und: Das Bild allein reicht nicht, wenn niemand die Gegend kennt.** Ich
habe die beiden Reihenhäuser auf dem Luftbild für einen Garten gehalten und
den Befund entsprechend falsch berichtet. Bestätigen kann nur, wer den Ort
kennt — das ist der Nutzer, nie wir.

## Wann es sich lohnen würde, wieder hinzusehen

Nur, wenn Google je eine Angabe liefert, die eine Adresse einer einzelnen
Dachfläche zuordnet. Bis dahin nicht erneut prüfen — die Rechtslage ist
geklärt, die Datenqualität gemessen, das Ergebnis liegt hier.
