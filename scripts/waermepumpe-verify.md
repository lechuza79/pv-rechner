# Wärmepumpen-Werte — Runbook (quartalsweise, Jan/Apr/Jul/Okt)

**Zweck:** Die preis- und förderabhängigen Werte in `lib/heatpump-config.ts`
(`DEFAULT_HEATPUMP_CONFIG`) gegen die offiziellen Quellen prüfen. Sie bestimmen
Investition, Förderung und die 20-Jahres-TCO im Wärmepumpen-Rechner — ein
veralteter Fördersatz oder Investitionspreis verzerrt das Ergebnis spürbar.

**Warum quartalsweise (seit 27.07.2026, vorher jährlich):** Ein Jahr ist zu lang.
Der Rechner stand ein halbes Jahr mit einer Investition live, die unter dem
günstigsten realen Angebot lag — bei jährlichem Takt wäre das bis Januar 2027
so geblieben. Politik (BEG) bewegt sich zum Jahreswechsel, Marktpreise laufen
dagegen dauernd (2025 fiel der Schnitt um rund 4.000 €), und die Leitquelle
erscheint im Sommer. Vier Termine im Jahr treffen beides. Stichtag steht
zusätzlich in `DEFAULT_HEATPUMP_CONFIG.reviewBy`.

**Mid-Year-Sicherheitsnetz:** Förderstopps/-änderungen passieren auch unterjährig
(Topf leer, Haushaltssperre). Der tägliche `foerder-news-waechter` hat
„Wärmepumpe BEG" als Stichwort und fängt solche Ad-hoc-Fälle mit ab.

## Was prüfen (volatil) vs. was nicht (Modell)

**Prüfen (preis-/politikabhängig):**
- `begGrundfoerderung` / `begKlimaBonus` / `begEinkommensStaffel` /
  `begFamilienzuschlag` / `begMaxCap` / `begMaxRate` / `begMaxRateLowIncome` —
  KfW-Merkblatt 458. (Das Merkblatt in der Fassung 07/2026 kennt genau **zwei**
  Boni — Klimageschwindigkeitsbonus und Einkommensbonus; einen Effizienzbonus
  nennt es nicht, und im Code gibt es ihn auch nicht. Die frühere Zeile hier
  verlangte die Prüfung eines Feldes, das gar nicht existiert.)
  **Der ZEITVERLAUF dieser Werte steht seit 26.08.2026 in `BEG_FAHRPLAN`
  (`lib/heatpump-config.ts`) und wird nicht mehr über Fristvermerke verwaltet.**
  Grundfördersatz, Klimageschwindigkeits-Bonus und Höchstbetrag ändern sich zu
  festen, im Voraus feststehenden Stichtagen; der Rechner löst sie zur Laufzeit
  auf, ein Umschalter im Ergebnis stellt den heutigen Stand dem nach dem nächsten
  Stichtag gegenüber. Der frühere Marker `OFFEN (bis 01/2027)` ist damit
  hinfällig. Was der Wächter hier tut: die Stufen **gegen die Quelle abgleichen**,
  nicht fortrechnen — die Schrittweite kann der Gesetzgeber ändern, und
  `lib/__tests__/beg-fahrplan.test.ts` nagelt jede Zelle mit ihrer Fundstelle fest.

  **Leitquelle ist die FÖRDERRICHTLINIE, nicht das Merkblatt** (Volltext:
  `docs/quellen/BEG-EM-Richtlinie_2026-07-17.pdf`). Genau daran hing die Lücke,
  die dieser Wächter monatelang nicht sah: Das Merkblatt 458 (07/2026) nennt die
  Grundförderung schlicht mit „30 %" **ohne den Stichtag** — und die Richtlinie
  halbiert sie zum ersten Quartal 2027 für Wärmepumpen auf 15 % (Nr. 8.4.1
  Buchst. c i. V. m. Nr. 5.3 Buchst. c). Kein Widerspruch, den man auflösen
  müsste: Nr. 9.1 der Richtlinie gibt sich selbst den Vorrang vor
  Programminformationen, und das Merkblatt ist eine solche. **Wer künftig eine
  Abweichung zwischen beiden findet, prüft ZUERST die Richtlinie.**

  **Und: Zum selben Stichtag gibt Nr. 8.4.6 fünfzehn Prozentpunkte zurück**, wenn
  die Wärmepumpe ihren Ursprung in der Union hat — betragsgleich mit der
  Halbierung. Wer nur die Kürzung prüft und meldet, meldet die halbe Sache. Der
  Rechner fragt den Ursprung deshalb ab, statt ihn anzunehmen.
- `investLwwpBase` / `investLwwpPerKw` / `investSwwpBase` / `investSwwpPerKw` /
  `heizkoerperTauschKosten` — **Leitquelle: die jährliche Auswertung echter
  Wärmepumpen-Angebote der Verbraucherzentrale Rheinland-Pfalz.** Beide Jahrgänge
  liegen im Repo: `docs/quellen/VZ-RLP_Auswertung-160-Waermepumpen-Angebote_2025-06.pdf`
  und `…_2026-07.pdf` (zweiter Check, veröffentlicht 02.07.2026). Sie ist die
  einzige uns bekannte Quelle mit echten Angebotspreisen inkl. Leistungsverteilung
  und Kostenkategorien. Abgleich in dieser Reihenfolge:
    1. **Median-Gesamtkosten** bei **Median-Leistung** (2025: 34.979 € bei 10 kW;
       2026: 34.898 €, häufigste Leistungsklasse 10–12 kW)
       → muss `investLwwpBase + investLwwpPerKw × 10` treffen (±10 %).
    2. **Summe der leistungsunabhängigen Kategorien** (Montage/Lohn, Elektro,
       Fundament, hydraulischer Abgleich, Warmwasser, Puffer; 2025: 16.652 €,
       2026: 15.868 € als Summe der Mittelwerte, Tabelle 5)
       → das ist `investLwwpBase`.
    3. **Heizkörpertausch**: Ø-Preis je Heizkörper × ~6 kritische Heizkörper.
       **Die 2026er Auswertung beziffert ihn nicht** — sie nennt nur die Häufigkeit
       (36 von 160 Angeboten, 23 %). Der hinterlegte Wert bleibt deshalb auf der
       2025er Grundlage; das ist ein Befund, kein Versäumnis.

  **Stand des Laufs vom 17.08.2026 (erster Lauf dieses Wächters überhaupt):**
  Median 34.898 € gegen unsere 35.000 € im 10-kW-Fall = 0,3 % — bestätigt, kein
  Wert geändert. Die Kategorien-Summe liegt 3,8 % unter `investLwwpBase`; das ist
  innerhalb der Streuung zweier Erhebungen und war kein Anlass zu ändern. Wer beim
  nächsten Lauf doch nachzieht, muss BEIDE Größen zusammen bewegen (Basis runter →
  Steigung rauf), sonst verfehlt der Median-Fall seinen Anker.
  **Kein Scraping mehr** (2026-07 abgeschaltet): Die frühere Ableitung aus einer
  Portal-Kostenübersicht bezifferte den Einbau mit 3.000–7.500 € und ergab für ein
  kleines Haus 15.020 € — weniger als das **günstigste** von 160 echten Angeboten.
  Ein Korrekturfaktor darauf wäre geraten gewesen; deshalb Config + dieser Wächter.
  Angebotsportale/Herstellerseiten taugen als Gegenprobe, nie als Leitquelle.
- `wpTarif` — Wärmepumpen-Stromtarif (§ 14a EnWG, BDEW)
- **Gas-/Öl-Preis + CO2-Faktor:** liegen an EINER Stelle — `FUEL_PRICE` in
  `lib/constants.ts` (Single Source of Truth). `heatpump-config`
  (`gasPriceCtPerKwh`/`gasCo2PerKwh`), `FUEL` und `WP_FUEL_OPTIONS` leiten daraus
  ab. **Preis-/CO2-Änderung nur in `FUEL_PRICE`** pflegen → wirkt überall.
- `fixCostPerYear` / `gasInvestNeubau` — WP-spezifisch, bleiben in
  `heatpump-config` (BDEW); der Kessel-Wirkungsgrad ebenfalls (pro Variante).
  **`fixCostPerYear` ist je Energieträger getrennt:** Gas trägt den Grund-/
  Zählerpreis des Netzanschlusses, Heizöl trägt **0** — beim Öltank hängt an
  keinem Anschluss eine laufende Gebühr. Das ist keine Preisfrage, sondern eine
  Strukturfrage: Der Öl-Wert bleibt 0, auch wenn der Gas-Grundpreis steigt.
  (Bis 28.07.2026 bekam die Ölheizung den Gas-Grundpreis aufgeschlagen — 3.600 €
  über 20 Jahre zugunsten der Wärmepumpe. Gefunden hat das ein Forumsnutzer.)
- **Bioheizöl-Preispfad — beobachtet der TÄGLICHE Wächter, nicht dieser hier.**
  § 43 Abs. 1 GModG nennt Heizöl gleichrangig neben Gas, aber wir rechnen die
  Beimischung nur für Gas (kein belastbarer Bioheizöl-Preis, Begründung und
  sichtbarer Hinweis siehe `waermepumpe.tsx`). Ein Quartalsrhythmus wäre dafür zu
  träge: Sobald eine Regelung steht, muss sie sofort in die Rechnung und ist
  zugleich ein Anlass, den Rechner zu zeigen. Der Punkt liegt deshalb im
  `foerder-news-waechter` (täglich), Runbook `scripts/gruengas-verify.md`
  Schritt 4 — dort wird ohnehin das Quotengesetz nach § 42a verfolgt, das bis zum
  1. Dezember 2026 vorzulegen ist und Heizöl ausdrücklich einschließt. **Hier
  nichts doppelt prüfen** — zwei Wächter auf derselben Frage erzeugen
  widersprüchliche Befunde.
- **OFFEN (bis 04/2027): Wartungskosten der Wärmepumpe.** Hinterlegt sind 250 €/a
  aus der Beispielrechnung der Verbraucherzentrale RLP (02.06.2025) — dieselbe
  Quelle, aus der die fossilen 300 €/a stammen, damit der Vergleich symmetrisch
  bleibt. Die Angebots-Auswertung derselben Verbraucherzentrale nennt am
  02.07.2026 rund **360 € je Wartung** (22 Angebote, Median 360 €, Mittelwert
  356 €, Tabelle 8). Das sind **zwei verschiedene Größen**: hier ein
  Beratungs-Rechenwert für ein Jahr, dort der Preis, den Installateure je Termin
  anbieten. **Nicht einseitig nachziehen** — 110 €/a nur auf der WP-Seite sind
  über 20 Jahre 2.200 € gegen die Wärmepumpe, und die fossile Seite hinge weiter
  an der alten Quelle. Beim nächsten Lauf beide Seiten aus derselben Quelle neu
  belegen oder den Befund als Entscheidung vorlegen.
- **ABGESCHLOSSEN (19.08.2026) — Nutzungsgrad einer NEU eingebauten Ölheizung.**
  **Keine Frist mehr. Das ist eine Modellprämisse, kein liegengebliebener Punkt.**
  Drei adversariale Prüfungen an einem Tag, drei Widerlegungen — und alle drei aus
  demselben strukturellen Grund: Ein PRÄZISER Marktwert für diesen Kessel gibt es
  nicht als eine Zahl. Er hängt an der Systemtemperatur (ein Ölkessel kondensiert
  an alten Heizkörpern kaum, an einer Fußbodenheizung voll), und die Norm, die das
  sauber auflöst, ist kostenpflichtig. Jeder Versuch, die Lücke mit einer einzelnen
  Zahl zu schließen, endete bei einem Handfaktor.
  **Deshalb steht bewusst die belegte UNTERGRENZE (0,92) statt einer geschätzten
  Mitte** — dasselbe Prinzip wie beim Bioheizöl: lieber eine Zahl, die nachweislich
  zu vorsichtig ist und deren Richtung dransteht, als eine, die genauer aussieht
  und es nicht ist. Der verbleibende Fehler ist **benannt und begrenzt**: höchstens
  rund sechs Prozentpunkte, immer zugunsten der Wärmepumpe, in einem einzelnen
  Zweig des Rechners.
  **Wieder aufgemacht wird das nur mit einem echten Auslöser**, nicht mit einem
  Kalendertag: wenn DIN V 18599-5 im Repo liegt, oder wenn der Rechner ohnehin auf
  temperaturabhängige Kesselwirkungsgrade umgebaut wird. Dann gilt: **Gas muss
  mitwandern** (die amtlichen Aufwandszahlen trennen nicht nach Brennstoff — wer nur
  Öl anfasst, stellt die beiden auf verschiedene Quellen), und die vorbereitete
  Grundlage steht unten in der Historie.

  **Historie (Stand der Umsetzung):**
  **Gesetzt ist jetzt 0,92**: der gesetzliche Mindestwert der Ökodesign-Verordnung
  (86 % jahreszeitbedingte Raumheizungs-Energieeffizienz, Brennwert-Basis), auf die
  Heizwert-Skala unseres Ölpreises umgerechnet (× 1,066). Dazu ein eigener
  Bestands-Eintrag „Vorhandene Ölheizung" (0,85) — damit rutscht ein Öl-Haushalt
  bei „Anschaffung 0" nicht mehr still auf Gas.
  **Vorbereitet für einen späteren Umbau (KEINE Frist):** der Marktwert statt der
  Untergrenze, gestaffelt nach Heizsystem. Reale Öl-Brennwertkessel liegen laut
  Herstellerdatenblättern bei 92–93 % (Brennwert) — aber diese Zahl wird zu 85 %
  bei 30 °C Rücklauf gemessen, also unter Fußbodenheizungs-Bedingungen; an alten
  Heizkörpern (55 °C) kondensiert ein Ölkessel kaum, weil sein Abgas-Taupunkt bei
  ~47 °C liegt. Genau diese Staffelung kennt der Rechner schon (`hk_alt` /
  `hk_neu` / `fbh`), und die BAnz-Tabelle 5 liefert sie auf der richtigen
  Bezugsgröße (70/55 °C → ~0,94 · 55/45 °C → ~1,01). **Wer das umsetzt, muss Gas
  mitnehmen** — sonst stünden die beiden Brennstoffe wieder auf verschiedenen
  Quellen. Bis dahin rechnen wir die Ölheizung weiterhin etwas zu schlecht, also
  zugunsten der Wärmepumpe; die Richtung ist im Code benannt.

  **Historie der drei Anläufe** (damit niemand einen davon wiederholt): Für Gas
  trennt `WP_FUEL_OPTIONS` drei Fälle (neu 0,95 · vorhanden 0,90 · alt 0,80), für
  Öl gibt es nur eine Zahl — **0,85** —, und die beschreibt laut `lib/calc.ts`
  ausdrücklich die *vorhandene* Anlage. Sie steht damit an der neu eingebauten:
  Der Rechner verbrennt in der fossilen Referenz mehr Öl, als ein heute
  eingebauter Brennwertkessel bräuchte, und das geht **zugunsten der Wärmepumpe**
  (Council 18.08.2026: rund 3.500 € über 20 Jahre, 140 m² teilsaniert). Deshalb
  fehlt auch der Bestands-Eintrag für Öl — ein zweiter Eintrag mit derselben Zahl
  wäre eine Dublette, kein zweiter Fall; Folge: Wer die Anschaffung auf 0 setzt,
  rutscht von Öl auf Gas.
  **Eine Sackgasse ist geprüft und dokumentiert — nicht noch einmal gehen.** Der
  Council-Lauf vom 18.08.2026 wollte den Wert aus IWU Darmstadt, „Energetische
  Kenngrößen für Heizungsanlagen im Bestand", Tab. 3 ableiten (Volltext liegt im
  Repo: `docs/quellen/IWU_Energetische-Kenngroessen-Heizungsanlagen-Bestand.pdf`).
  Ein adversarialer Prüfer hat die Herleitung zerlegt, jeder Punkt am Dokument
  nachgesehen und bestätigt:
  - **Die Spalten sind Baujahre** (70er / 80er / 90er Jahre), keine Gerätevarianten.
    Die vermeintliche „Öl-Brennwert 0,94" ist der Kessel der **80er Jahre**; für
    einen 2026 eingebauten gibt es dort überhaupt keine Spalte. Das Dokument ist
    vom **1. November 2002** und handelt ausdrücklich vom Bestand 1970–1999.
  - **Die Größe ist eine andere:** Tab. 3 nennt den 30 %-**Teillast**wirkungsgrad
    bei der jeweiligen mittleren Kesseltemperatur (Brennwert: 30 °C, also
    Fußbodenheizung). Unser Modell braucht den Jahresnutzungsgrad, und die
    Referenzheizung im Bestand hängt meist an alten Heizkörpern (~50 °C) —
    nach dem Modell im Anhang des Dokuments rund 3 Punkte Unterschied.
  - **Die Bezugsgröße passt nicht zusammen:** Tab. 3 rechnet auf Heizwert (Hi;
    nur so ist Gas-Brennwert 1,01 möglich), unser Gaspreis ist ein
    Abrechnungspreis auf Brennwert (Hs), Heizöl läuft dagegen üblicherweise auf Hi.
  - **Und die angebliche Regel „Quelle minus 0,02" gibt es nicht:** `0.95` steht
    seit dem ersten Wärmepumpen-Commit (74b34c9, 14.04.2026) im Code, vier Monate
    bevor diese Quelle im Repo lag; auf den Altkessel-Wert 0,80 wäre der Abschlag
    ohnehin nie angewandt worden. Das war ein Handfaktor mit nachgereichter
    Begründung — genau das, was Regel 5 des Gates verbietet.
  **Zweite geprüfte Sackgasse (19.08.2026) — die amtliche Bekanntmachung zur
  Datenaufnahme im Wohngebäudebestand** (BAnz AT 04.12.2020 B1). Sie sieht auf den
  ersten Blick wie die Lösung aus, trägt den Wert aber nicht:
  - **Tabelle 7** nennt für Brennwertkessel „Norm-Nutzungsgrade ηK zwischen 102 %
    und 108 % (bezogen auf Heizwert Hi)" und ausdrücklich „Öl **oder** Gas" — das
    ist aber **Spalte 6**, und Nummer 4.4 der Bekanntmachung sagt wörtlich, wozu
    Spalte 6 dient: „zusätzliche[n] Information … um … anhand einfacher Merkmale
    eine … abweichende Technik festzustellen". Die Zahl steht dort neben
    „Erkennungsmerkmal: Kondensatablauf" — sie ist eine Wiedererkennungshilfe für
    den Aufnehmer vor Ort, kein Rechenwert. Der Rechenwert liegt laut Spalte 5 in
    **DIN V 18599-5, Abschnitt 6.5.4.3** — und die haben wir nicht.
  - **Tabelle 5** hat die richtige Größenart (Erzeuger-Aufwandszahlen, nach
    Systemtemperatur getrennt, Bezugsgröße in Nummer 4.1 ausdrücklich „Endenergie
    (unterer Heizwert)"): Brennwertkessel ab 1995 bei 70/55 °C → 1,07, also rund
    **0,94**; „Brennwert verbessert" bei 55/45 °C → 0,99, also rund **1,01**.
    Auch hier **keine Trennung nach Brennstoff**. Verwendbar wäre sie trotzdem
    nicht ohne Weiteres: Baualtersklassen des BESTANDS, Verfahren nach der
    abgelösten DIN V 4701-10, Anwendungsbereich sind Energieausweise für
    bestehende Wohngebäude.
  - **Der Umkehrschluss ist die eigentliche Warnung:** Wendet man Tabelle 5
    konsequent an, käme für unseren Gas-Wert auf Brennwert-Basis 0,84 heraus, nicht
    0,95. Wer also die Öl-Zahl aus dieser Quelle holt, muss die Gas-Zahl mitnehmen —
    sonst entsteht die nächste Inkohärenz.
  **Dritte Prüfung (19.08.2026) — Ökodesign-Verordnung (EU) 813/2013, Volltext im
  Repo** (`docs/quellen/CELEX%3A32013R0813%3ADE%3ATXT.pdf`, vom Betreiber beschafft,
  weil EUR-Lex automatisierte Abrufe leer beantwortet). Sie ist die **richtige
  Quellenklasse** und bringt den Punkt zum ersten Mal wirklich voran:
  - **Die Größe stimmt:** „jahreszeitbedingte Raumheizungs-Energieeffizienz" (ηs),
    Artikel 2 Nummer 20 — Quotient aus gedecktem Raumheizwärmebedarf und dem
    **jährlichen** Energieverbrauch. Also Jahresbetrieb inklusive Teillast und
    Bereitschaft, nicht Prüfstand. Das war der Bruch der beiden Vorgänger-Quellen.
  - **Die Bezugsgröße steht fest:** Nummer 30 definiert den jährlichen
    Energieverbrauch „angegeben in kWh **als Brennwert**". ηs ist damit eine
    Brennwert-Größe.
  - **Anhang II:** Seit dem 26.09.2015 dürfen Raumheizgeräte mit Brennstoffheizkessel
    bis 70 kW eine ηs von **86 %** nicht unterschreiten — **ohne Unterscheidung
    zwischen Öl und Gas** (nur Typ-B1-Kessel bis 10 kW dürfen auf 75 %).
  - **Was daraus schon folgt:** Unsere **0,85 für einen NEU eingebauten Ölkessel
    liegt unter dem gesetzlichen Mindestwert** — auf der Brennwert-Skala ohnehin,
    und auf der Heizwert-Skala, auf der unser Ölpreis steht, erst recht (dort läge
    die Untergrenze noch höher). Der Wert beschreibt ein Gerät, das heute gar nicht
    verkauft werden dürfte. Die Richtung des Fehlers ist damit belegt: zugunsten
    der Wärmepumpe.
  - **Was die Verordnung NICHT hergibt:** einen typischen ηs-Wert je Brennstoff.
    Sie setzt eine Untergrenze, keinen Marktwert.

  **Es fehlt genau noch EIN Datum** — dann ist der Punkt zu, und zwar für beide
  Brennstoffe in einem Zug: das **Verhältnis Brennwert zu Heizwert für Heizöl EL**
  (für Erdgas liegt es amtlich vor: AG Energiebilanzen, „Heizwerte der Energieträger",
  Fußnote 3 — Faktor 0,9024, also Brennwert/Heizwert = 1,108). Alternativ ein
  belegter typischer ηs je Brennstoff aus Herstellerdatenblättern. Geprüft und
  erfolglos: das UBA-Papier „Emissionsfaktoren Brennstoffe" (Link tot, 404). Die
  AGEB-Tabelle nennt für Heizöl leicht nur den Heizwert (42 816 kJ/kg) — was
  immerhin unsere Preisskala bestätigt: 42 816 kJ/kg bei 0,86 kg/l sind rund
  10,2 kWh je Liter, und unsere 0,10 €/kWh entsprechen damit gut 102 € je 100 l,
  also einem **Heizwert**-Preis.

  **Frühere Notiz, überholt durch die Prüfung oben:** die Ökodesign-Verordnung (EU) 813/2013 mit
  der jahreszeitbedingten Raumheizungs-Energieeffizienz ηs. Sie hat die drei
  Eigenschaften, die den bisherigen Quellen fehlen: Sie gilt **neu in Verkehr
  gebrachten** Geräten, sie ist eine **Jahres**größe (Teillast und
  Bereitschaftsverluste eingerechnet), und Öl und Gas stehen getrennt in den
  Herstellerdatenblättern. **Zuerst zu klären: ihre Bezugsgröße** (vermutlich
  Brennwert) — für Öl müsste sie dann auf den Heizwert zurückgerechnet werden, für
  Gas käme sie direkt auf die Skala unseres Gaspreises. EUR-Lex liefert an
  automatisierte Abrufe nichts aus (leere Antwort über alle Wege, 19.08.2026); der
  Text ist im Browser frei zugänglich, also beim Betreiber anfragen oder in einer
  Sitzung mit Browser holen.

  **Was der nächste Lauf wirklich braucht:** einen **Jahresnutzungsgrad bzw. eine
  Erzeugeraufwandszahl** für einen heute neu eingebauten Öl-Brennwertkessel, auf
  derselben Bezugsgröße wie unser Ölpreis, möglichst nach Auslegungstemperatur
  getrennt. Erste Adresse ist **DIN V 18599-5** (die Norm, auf die das GEG verweist;
  DIN V 4701-10 ist abgelöst), hilfsweise Normnutzungsgrade nach DIN 4702-8 /
  EN 15502 aus Herstellerunterlagen oder BDH. Kommst du an keine heran: melden,
  nicht schätzen. Und **bei der Gelegenheit die Bezugsgröße je Brennstoff dort
  dokumentieren, wo `FUEL_PRICE` steht** — solange Gas auf Hs und Öl auf Hi
  gerechnet wird, ist jeder gemeinsame Auf- oder Abschlag über beide hinweg falsch.
- **OFFEN (bis 01/2027): Wartungskosten Heizöl.** `gasMaintenance` gilt aktuell
  für Gas UND Öl. Der Lauf vom 17.08.2026 hat auch in der neuen VZ-Auswertung
  keine getrennten Öl-Wartungskosten gefunden — die Gleichsetzung bleibt, der
  Punkt bleibt offen. Dass eine Ölheizung mit Tankprüfung und zusätzlichen
  Schornsteinfeger-Terminen real teurer in der Wartung ist, ist plausibel — uns
  fehlt dafür aber eine belastbare Quelle (Kostenportale zählen nicht, siehe die
  Investitions-Lehre oben). Beim nächsten Lauf: Träger-/Verbraucherzentralen-
  Quelle mit echten Wartungsverträgen suchen. Findet sich keine, bleibt die
  Gleichsetzung — dann diesen Punkt mit dem Befund „keine Quelle gefunden"
  bestätigen, statt eine Zahl zu schätzen.

**Nicht prüfen (Modell-/Bauphysik-Konstanten, ändern sich nicht jährlich):**
- `specDemandBestand` / `specDemandNeubau` (dena Gebäudereport, DIN V 18599;
  die Stufe „vollsaniert" zusätzlich aus der dena-Verbrauchsstudie). Sie werden
  **aus `INSULATION_BESTAND`/`INSULATION_NEUBAU` in `lib/constants.ts`
  abgeleitet** — falls hier doch einmal etwas zu ändern ist, dort ändern, nie in
  der Config (sonst driften UI-Auswahl und Rechnung auseinander).
- `jazLwwp` / `jazSwwp` / Vorlauftemperaturen (Fraunhofer ISE WPsmart)
- `gasCo2PerKwh` (physikalischer Emissionsfaktor), Inflationsannahmen (Konvention)

## Schritt 0: Gibt es einen neuen Jahrgang des KfW-Förderreports?

**Nur im Quartalslauf Januar interessant** — dann erscheint der Jahrgang des
Vorjahres. In den übrigen drei Quartalen ist „unverändert" das erwartete
Ergebnis und genau die Auskunft, für die das Prüfdatum da ist.

Der Bericht speist zwei Oberflächen: den Abschnitt „Wer bekommt die Förderung
wirklich?" im Ergebnis dieses Rechners und denselben Block im Förder-Ratgeber.
Ablauf, Fallen und Befugnisse stehen vollständig in `scripts/kfw-report-verify.md`;
hier steht nur, DASS dieser Lauf zuständig ist — das Prüfdatum
(`KFW_REPORT_STAND.geprueftIso`) hängt an ihm.

Ein eigener Auftrag dafür wäre einer, der elf Monate im Jahr nichts findet.

**Findet der Januar-Lauf noch keinen neuen Jahrgang, wird im Februar erneut
nachgesehen — NICHT erst im April.** Das ist die einzige Terminfrage, die hier
wirklich Geld kostet: Zu spät zu prüfen kostet Tage, zu früh zu prüfen kostet
ein Quartal, weil der nächste reguläre Termin drei Monate entfernt ist. Der
einzige Messpunkt, den wir haben: Der Jahrgang 2025 trug als Erstellungsdatum
den 8. Januar 2026, der Lauf am 20. Januar hätte ihn also erwischt. Ein
Messpunkt ist kein Fahrplan — deshalb die Wiedervorlage statt eines früheren
Termins.

## So wird die Routine ausgelöst

Dem Assistenten sagen: **„Lauf die Wärmepumpen-Prüfung."**

## Agent-Prompt (Vorlage)

> Du prüfst die preis- und förderabhängigen Annahmen des Wärmepumpen-Rechners
> von solar-check.io gegen offizielle Quellen. Heute ist {DATUM}.
>
> Hinterlegt (aus lib/heatpump-config.ts): BEG-Sätze {beg…}, Cap {begMaxCap}/
> {begMaxRate}; Investition LWWP {investLwwpBase}+{investLwwpPerKw}/kW, SWWP
> {investSwwpBase}+{investSwwpPerKw}/kW, HK-Tausch {heizkoerperTauschKosten};
> WP-Tarif {wpTarif}; Gas {gasPriceCtPerKwh} ct/kWh.
>
> Vorgehen (WebSearch + WebFetch):
> 1. BEG Heizungsförderung: aktuelle Sätze + Förderhöchstgrenze + ob das Programm
>    Anträge annimmt. Primärquelle BAFA/KfW (Bundesförderung effiziente Gebäude).
> 2. Investitionskosten Wärmepumpe: neueste Angebotsauswertung der
>    Verbraucherzentrale (Suchbegriff „Verbraucherzentrale Auswertung Angebote
>    Luft-Wasser-Wärmepumpe"). Gebraucht werden Median UND Mittelwert der
>    Gesamtkosten, die Median-Leistung in kW und die Kostenkategorien-Tabelle.
>    Melde Abweichungen nur mit diesen vier Angaben — eine Gesamtsumme ohne
>    zugehörige Leistung ist wertlos, weil unser Modell an kW hängt.
> 3. WP-Stromtarif (§ 14a EnWG) + Gaspreis Haushalt: BDEW, Verivox/Check24 als
>    Sekundärquelle.
> 4. Vergleiche mit den hinterlegten Werten.
>
> Gib NUR dieses Format zurück:
> ```
> STATUS: ok | abweichung
> BEG: <Sätze + Cap> (hinterlegt: <…>) — Programm aktiv? ja/nein
> INVESTITION: <Median/Mittelwert + Median-kW + Kategorien-Summe> (hinterlegt: <…>)
> WP-TARIF / GAS: <Werte> (hinterlegt: <…>)
> QUELLEN: <URLs, BAFA/KfW/Verbraucherzentrale/BDEW zuerst>
> ```

## Nach der Prüfung

- **Bei `abweichung`:** immer zuerst das **Council** laufen lassen
  (`scripts/council-verify.md`, 3 unabhängige Verifizierer + 1 adversarialer).
  Was danach passiert, hängt vom Feld ab:

### Investition — Auto-Fix erlaubt (seit 27.07.2026)

Betrifft `investLwwpBase`, `investLwwpPerKw`, `investSwwpBase`, `investSwwpPerKw`,
`heizkoerperTauschKosten`. Der Fix wird selbst committet und deployt, **wenn ALLE
fünf Bedingungen erfüllt sind**:

1. **Leitquelle ist eine Auswertung echter Angebote** einer Verbraucherschutz-
   oder Trägerorganisation (Standard: Verbraucherzentrale Rheinland-Pfalz), mit
   **Median-Gesamtkosten**, **Median-Leistung in kW** und der
   **Kostenkategorien-Tabelle**. Fehlt eine der drei Angaben → Vorschlag, kein
   Fix: Eine Gesamtsumme ohne zugehörige Leistung ist für ein Modell wertlos,
   das an der Heizlast hängt. Portale, Hersteller- und Vergleichsseiten sind
   **nie** Leitquelle (sie haben den Fehler von Juli 2026 verursacht) — nur
   Gegenprobe.
2. **Council-Konsens**, adversarialer Prüfer eingeschlossen.
3. **Rechenregel eingehalten** (nicht frei geschätzt): Basis = Summe der
   leistungsunabhängigen Kategorien (Montage/Lohn, Elektro, Fundament,
   hydraulischer Abgleich, Warmwasser, Puffer); Steigung so, dass
   `Basis + Steigung × Median-kW` den Median-Preis trifft. Ein Handfaktor
   („wirkt zu hoch/zu niedrig") ist kein zulässiger Fix.
4. **Sprung ≤ 30 %** je Feld gegenüber dem hinterlegten Wert. Darüber nur
   Vorschlag — ein größerer Sprung ist eher ein Lesefehler als ein Marktereignis.
5. **`npx tsc --noEmit` und `npx vitest run` grün.** Die Marktanker in
   `lib/__tests__/heatpump.test.ts` („Marktanker gegen echte Angebote") sind der
   harte Filter: Median-Fall ±10 %, kleinste Anlage über dem günstigsten realen
   Angebot, größte unter dem teuersten. **Diese Tests dürfen im selben Lauf nur
   angepasst werden, wenn die neuen Grenzen direkt aus der neuen Auswertung
   stammen** — nie, damit ein Wert „durchgeht".

  Ablauf: Worktree → Änderung inkl. `validFrom`/`source` → Tests → Commit mit
  Quellenangabe (Median, Median-kW, Erhebungszeitraum) → Push auf `main` → Mail
  mit dem Diff und den neuen Beispielwerten (4 / 10 / 18 kW). Neue Auswertung als
  PDF in `docs/quellen/` ablegen, damit die Fundstelle nachprüfbar bleibt.

### Förderung, Tarife, Gaspreis — Vorschlag, kein Auto-Fix

`begGrundfoerderung`, `begKlimaBonus`, `begEinkommensStaffel`, `begMaxCap`,
`begMaxRate`, `wpTarif`, `gasPriceCtPerKwh` (letzterer liegt in `FUEL_PRICE` und
wirkt auch im PV-Rechner). Hier hängen Rechtsfolgen und Ermessen dran
(„Programm aktiv vs. Topf ausgeschöpft", Übergangsfristen) — bestätigten
Vorschlag mailen, ändern nach Freigabe. Invarianten beachten (Bonus-Summe > Cap,
SWWP-Invest > LWWP-Invest).

- **Bei `ok`:** `geprueftIso` + `reviewBy` auf den nächsten Termin setzen,
  `validFrom` unverändert lassen.
- **Die zwei Prüfdaten in jedem Fall nachziehen** (Gate-Regel 9) — je nachdem,
  welche Quelle dieser Lauf wirklich gelesen hat:
  - `geprueftIso` ← Angebotsauswertung und BDEW-Tarife gelesen,
  - `geprueftFoerderungIso` ← KfW-Merkblatt gelesen.

  Beide auch bei „alles bestätigt, nichts geändert" — das ist das
  Normalergebnis. **Nur das Datum der Quelle setzen, die dieser Lauf tatsächlich
  aufgeschlagen hat:** Der Lauf vom 08.08.2026 hat allein das Merkblatt geprüft;
  hätte er beide Daten gesetzt, stünde für die Marktwerte eine Prüfung da, die
  nicht stattfand. Sie stehen getrennt unter dem Rechner („Anschaffung und
  Tarife geprüft am …, BEG-Förderung am …", `lib/stand.ts`), das jüngere von
  beiden ist das `lastmod` der Seite. Ein Lauf, der an einer Quelle gescheitert
  ist, lässt ihr Datum stehen; `validFrom` bewegt sich nur mit einem Wert.
