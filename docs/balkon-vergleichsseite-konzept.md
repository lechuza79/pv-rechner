# Balkonkraftwerk-Vergleichsseite + Affiliate — Konzept und Sachstand

**Stand: 20.08.2026. Entscheidung des Betreibers: zurückgestellt, nicht verworfen.**
Zuerst kommt der Anmelde-Guide, dann wird gemessen, ob unser Muster überhaupt
greift. Dieses Dokument hält fest, was recherchiert ist — damit die Arbeit beim
Wiederaufnehmen nicht bei null anfängt.

---

## 1. Warum überhaupt: die Suchabsicht ist gemessen, nicht geschätzt

Am 17./18.08.2026 über DataForSEO die echten Suchergebnisseiten (Deutschland,
Top 10 organisch) abgerufen und nach Shop-Anteil und Produktkarussells
klassifiziert. **Das ist der wichtigste Teil dieses Dokuments**, weil ohne diese
Messung zweimal die falsche Seite gebaut worden wäre.

| Art | Keyword | Vol./Monat | KD | Shops in Top 10 | Produktkarussell |
|---|---|---|---|---|---|
| INFO | lohnt sich ein balkonkraftwerk | 1.600 | 6 | 11 % | – |
| INFO | balkonkraftwerk speicher test | 880 | 0 | 11 % | – |
| INFO | lohnt sich ein bkw mit speicher | 720 | 6 | 22 % | – |
| INFO | balkonkraftwerk mit speicher sinnvoll | 390 | 0 | 22 % | – |
| gemischt | balkonkraftwerk rechner | 2.400 | 4 | 30 % | – |
| KAUF | balkonkraftwerk halterung | 3.600 | 0 | 56 % | 3× |
| KAUF | balkonkraftwerk 800 watt | 12.100 | 16 | 70 % | 4× |
| KAUF | balkonkraftwerk | 301.000 | 32 | 67 % | 3× |
| KAUF | balkonkraftwerk mit speicher | 135.000 | 29 | 80 % | 3× |
| INFO | balkonkraftwerk anmelden | 27.100 | 17 | ~0 % | – (aber KI-Antwort) |

**Die Lehre daraus — bitte nicht wiederholen:** „balkonkraftwerk mit speicher"
sieht mit 135.000 Suchen wie der große Preis aus. Die Suchergebnisseite besteht
zu 80 % aus Shops plus drei Produktkarussellen. **Ein Ratgeber kann dort nicht
ranken, egal wie gut er ist.** Die Schwierigkeitszahl (29) misst Backlink-Stärke,
nicht Absichts-Konflikt — sie hätte diesen Fehler nicht verhindert.

Die Vergleichs-Absicht lebt in den INFO-Zeilen: zusammen rund **3.600 Suchen im
Monat bei Schwierigkeit 0–6**, Konkurrenz sind NDR, ADAC, Vattenfall, Stiftung
Warentest und zwei kleine Fachseiten. **Reddit rankt auf drei von vier** — Google
belohnt hier erkennbar echte Erfahrung statt Marketing-Prosa.

**Ebenfalls gemessen (18.08.2026):** Wir ranken für genau zwei Balkon-Keywords,
beide auf Position 102/103, beide über `/photovoltaik-foerderung/hessen`.
Domainweit 45 rankende Keywords. Also praktisch bei null.

---

## 2. Was die Seite können muss, das keine andere kann

Die Shops schreiben Herstellerangaben ab. Stiftung Warentest misst Geräte, sagt
aber nichts über den einzelnen Haushalt. **Unser Alleinstellungsmerkmal ist die
Rechnung dazwischen:**

> Nicht „2,7 kWh Kapazität", sondern: bei 2.800 kWh Jahresverbrauch und Südbalkon
> holt dir dieser Speicher 49 €/Jahr — und amortisiert sich nach 8,3 Jahren, also
> **nicht** innerhalb seiner Lebensdauer.

Das kann `calcBalkon` heute schon. Die Vergleichsseite ist im Kern eine
Produkt-Tabelle, deren Zeilen durch unser Modell laufen.

**Der zweite Hebel ist der Wirkungsgrad.** Alle Vergleichsseiten übernehmen das
Datenblatt („bis zu 96 %"). Real sind es rund **82,5 %** — belegt über die
HTW-Messreihe, hinterlegt als `storageRoundtrip` in `lib/balkon-config.ts`
(Herleitung im Kommentar dort). Eine Tabelle, die damit rechnet, kommt bei
mehreren Geräten zu einem **anderen Ergebnis als jede andere Seite im Netz**.
Das ist der Grund, warum die Seite existieren darf.

**Wortwahl — BLOCKER:** Es ist ein **Vergleich**, kein **Test**. Wir messen keine
Geräte. „Test" wäre irreführend (§ 5 UWG) und zerstört genau das, womit die Seite
wirbt. Priwatt macht das übrigens — ein Shop mit einem „Test"-Artikel, in dem
nichts getestet wurde.

---

## 3. Seitenmuster (Vorbild des Betreibers: happycoffee.org)

Referenz: `happycoffee.org/de-de/e/philips-lattego-2300-3200-3300`. Struktur von
oben nach unten, am Original abgelesen:

1. Brotkrumen, Produktbild, Titel
2. **Varianten-Auswahl + Bestpreis** (ein Dropdown statt eigener URLs je Variante)
3. Kurz-Einschätzung mit Autor
4. Ausstattung in Stichpunkten
5. **Preisvergleichs-Tabelle** je Variante/Farbe, mit Händleranzahl
6. Stärken & Schwächen
7. **Kaufentscheidungs-Guide**: vier Szenarien mit Modellempfehlung und Aufpreis
8. Technische Daten (identische vs. unterschiedliche Merkmale getrennt)
9. Stimmen aus Tests und Rezensionen, mit Quelllinks
10. Community-Fragen
11. Alternativen-Karussell

**Was wir übernehmen:** 2, 5, 6, 7, 8, 11. Besonders 7 — die Szenarien sind bei
uns keine Redaktionsmeinung, sondern gerechnet.

**Was wir ersetzen:** Statt „Kurz-Einschätzung" (3) unser gerechnetes Ergebnis
für den eingegebenen Haushalt. Das ist der Platz, an dem wir besser sind.

**Was wir weglassen:** Sterne-Bewertungen. Wir haben nichts getestet.

**Alle Varianten auf EINER URL** (Selector statt Einzelseiten) — verhindert
Thin-Content-Seiten, die sich nur in einer Zahl unterscheiden.

---

## 4. Affiliate: Partner und Konditionen (Stand 20.08.2026)

**Zwei Vorgaben des Betreibers (19./20.08.2026), die alles andere steuern:**

1. **Nur führende Set-Händler, keine Einzelhersteller.** Wechselrichter- und
   Speicherhersteller (Hoymiles, Zendure, SENEC, Renogy) gehören nicht in eine
   Tabelle, die über Komplettsets urteilt. Ebenso raus: Anbieter ohne nennenswerte
   Marktstellung, auch wenn ihr Programm bequem erreichbar ist.
2. **Die Reihenfolge richtet sich nach dem Preis für den Nutzer, nicht nach
   unserer Provision.** Der Satz gehört sichtbar auf die Seite, sonst ist er nur
   eine Behauptung im Code.

### Wer führend ist — gemessen, nicht geschätzt

Organische Sichtbarkeit in Deutschland, am 19.08.2026 über DataForSEO für alle
Kandidaten gleich erhoben:

| Händler | Besuche/Monat | Keywords | Top-3 | Netzwerk |
|---|---|---|---|---|
| solago.de | 207.700 | 3.760 | 923 | affiliate-marketing.de |
| kleineskraftwerk.de | 164.100 | 4.523 | 779 | **unbekannt** |
| yuma.de | 161.600 | 3.772 | 318 | eigenes Programm |
| solakon.de | 161.400 | 4.322 | 842 | **Awin** |
| priwatt.de | 123.000 | 12.219 | 1.195 | – |
| solarmars.de (ergofino) | 8.700 | 878 | 56 | Awin |
| myvoltaics.de | 6.500 | 1.074 | 45 | affiliate-marketing.de |
| indevolt.de | **0** | 0 | 0 | Awin |

**Die oberen fünf liegen innerhalb eines Faktors 1,7 — das ist eine Gruppe, keine
Rangfolge.** Tragend ist der Abstand nach unten: Platz sechs hat ein Vierzehntel
der Reichweite. Daraus folgt die Auswahl: die fünf oben ja, alles darunter nein.
**Indevolt fliegt trotz Awin-Mitgliedschaft raus** — er stand nur deshalb je auf
der Liste, weil er bequem erreichbar war, und genau diese Logik hat der Betreiber
zurückgewiesen.

*Vorbehalt:* Das misst Reichweite über Google, nicht Umsatz. Ein Shop kann groß
sein, ohne organisch zu ranken (Anzeigen, Marktplätze). Für die Unterscheidung
„führend oder Nischenshop" trägt die Zahl, für eine Reihenfolge innerhalb der
Top fünf nicht.

### Von den fünf Führenden ist genau einer bei Awin

Am 20.08.2026 im öffentlichen Advertiser-Verzeichnis geprüft (`awin.com/de/search/advertiser-directory`,
Volltextsuche ohne Login): **Solakon ja.** Solago, Kleines Kraftwerk, Yuma,
priwatt, myvoltaics und EPP: **nein.** Die Vergleichsseite kommt also mit einem
Netzwerk nicht aus. Das ist normal und kein Konstruktionsfehler, bedeutet aber
mehrere Anmeldungen und später mehrere Preisquellen.

Awin-Publisher-ID: **3047037** (Segment „redaktionelle Seite"). Kein Geheimnis —
sie steht als `awinaffid` in jedem Affiliate-Link und darf in den Code.

### Kleines Kraftwerk: Konditionen belegt, Netzwerk nicht auffindbar

Am 20.08.2026 im Original nachgelesen (`100partnerprogramme.de/p/kleineskraftwerk-de/`),
weil eine Suchmaschine zwischendurch eine falsche Cookie-Laufzeit lieferte:

- **6,00 bis 10,00 % Pay per Sale** (die Vergütungstabelle nennt die Spanne; die
  oft zitierten „bis zu 10 %" sind der Spitzenwert). Bei 920 € Warenkorb also
  **55 bis 92 € je Verkauf** — planen sollte man mit der kleineren Zahl.
- **90 Tage Cookie-Tracking**, Reklamationsquote unter 1 %, SEA eingeschränkt erlaubt.
- **Keine Produktdaten-Feeds.** Ihre Preise wären also von Hand zu pflegen, egal
  über welches Netzwerk wir hereinkommen. Sie taugen als starke Einzelempfehlung
  mit hoher Provision, nicht als Datenlieferant für eine automatisch aktuelle Tabelle.

**Über welches Netzwerk das Programm läuft, ist öffentlich nirgends dokumentiert.**
Erfolglos geprüft: Awin-Verzeichnis, vier naheliegende Partnerprogramm-Adressen auf
der Website (alle 404), Netzwerk-Skripte im Quelltext der Startseite, die komplette
Datenschutzerklärung (über 60.000 Zeichen, das Wort „Affiliate" kommt nicht vor),
Partner- und Affiliate-Subdomains, die Pfade der gängigen Shopify-Partnerprogramm-Apps.
Der Knopf „Beim Netzwerk direkt verfügbar" im Verzeichnis ist **kein Link**, sondern
ein abgeschaltetes `<span>` ohne Ziel; auch ein Konto dort führt nicht weiter.

**Am 20.08.2026 Anfrage an `kundenservice@kleineskraftwerk.de` verschickt.** Falls
nach rund einer Woche nichts kommt: anrufen (04202 5079110), nicht nachmailen.

**Der Händler selbst ist geprüft und unauffällig:** Kleines Kraftwerk DE GmbH,
Achim, Amtsgericht Walsrode HRB 210570, Stammkapital 27.000 €, Geschäftsführer
Markus Struck, Status aktiv, seit 2019 im Register (zunächst als Mellon Services
GmbH). Trusted Shops mit 14.342 Bewertungen, Trustpilot 4,6. Was undurchsichtig
wirkte, war die Verzeichnisseite, nicht der Laden. Ihre eigenen Marketingzahlen
(„über 100.000 Kunden", „130 Mio. kWh") sind **nicht** unabhängig belegt und
gehören nicht in unsere Texte.

### 100partnerprogramme.de ist kein Netzwerk

Betrieben von der Internet Allstars GmbH, Selbstbeschreibung: „die größte
Suchmaschine für Partnerprogramme des DACH-Markts". Also ein **Verzeichnis** —
es misst nichts, zahlt nichts aus und wickelt nichts ab. Ein Konto dort verdient
kein Geld; es ist ein Nachschlagewerk. Nicht mit einem Netzwerk verwechseln, die
frühere Fassung dieser Tabelle tat das.

### Amazon — am Original geprüft

Die Programmrichtlinien (`partnernet.amazon.de/help/operating/policies`) sagen
in Abschnitt 2b der Teilnahmevoraussetzungen:

> „Da sich Preise und Verfügbarkeit der auf Ihrer Website aufgeführten Produkte
> ändern können, dürfen Sie auf Ihrer Website nur Angaben zu Preisen und
> Verfügbarkeit machen, wenn: (a) wir den Link in dem die Angaben zu Preisen und
> Verfügbarkeit dargestellt sind bedienen oder (b) Sie Daten zu Preisen und
> Verfügbarkeit über die Creators API und die PA API abrufen"

Abschnitt 2i verlangt bei seltener als stündlicher Aktualisierung einen
**Datumsstempel**, Beispiel aus der Richtlinie:

> „Preis auf [Amazon-Website]: EUR 32,77 (Stand 07.01.2008 14:11 Uhr [Zeitzone])"

**Korrektur eines Irrtums vom 18.08.2026:** In der Erörterung stand zuerst,
gespeicherte Preise seien verboten und Amazon könne deshalb erst später
mitspielen. **Das ist falsch** — sie sind ausdrücklich erlaubt, sofern
gestempelt. Und der Zeitstempel ist ohnehin unsere Hausart. Das Vorbild
happycoffee macht es genau so („Amazon Deutschland · Zuletzt geprüft vor 4 h").

**Unverifiziert (nur Fachquellen, kein Amazon-Dokument gelesen):** Zugang zur
PA-API erfordert 3 qualifizierte Verkäufe in 180 Tagen, Erhalt danach 10 Verkäufe
je 30 Tage. Cookie-Laufzeit 24 Stunden. Elektronik-Provision 3–4 %.
**Vor dem Bau am Original nachlesen.**

**Entscheidung des Betreibers (18.08.2026): Amazon ohne Preis wird nicht
angezeigt.** Also entweder mit Preis (setzt API-Zugang voraus) oder gar nicht.
Der zwischenzeitliche Vorschlag „Link ohne Preis von Tag eins" ist damit vom
Tisch.

**Risiko fürs Design:** Fällt der API-Zugang wegen zu weniger Verkäufe weg,
frieren die Amazon-Preise ein. Für uns wäre das schlimmer als kein Preis.
Deshalb muss die Tabelle **ohne Amazon vollständig bleiben** — Amazon ist eine
Zusatzspalte, keine tragende.

---

## 5. Affiliate jenseits Balkon: die anderen Flächen

Am 20.08.2026 im Awin-Verzeichnis erhoben, weil die Frage aufkam, wo sich eine
Anmeldung sonst noch lohnt. Sichtbarkeitszahlen wie oben über DataForSEO.

**Wärmepumpe — gute Lage, aber ein Haken.** Die zwei führenden Heizungs-Onlineshops
sind beide bei Awin: **Heima24** (286.400 Besuche/Monat) und **Heizungsdiscount24**
(241.600). Selfio (126.900) und unidomo (80.700) sind ebenfalls groß, aber nicht
dort; RALEO (17.000) und Heizbude (6.200) sind klein.
**Der Haken ist nicht das Angebot, sondern was der Leser danach tut:** Eine
Wärmepumpe kauft niemand ohne Handwerker. Nach unserem Rechner geht er Angebote
einholen, nicht ein Gerät in den Warenkorb legen. Was an dieser Stelle wirklich
konvertieren würde, ist eine Angebotsvermittlung — **und das ist genau der
Lead-Funnel, gegen den die Seite positioniert ist.** Ungelöster Zielkonflikt, er
gehört dem Betreiber. Der Ausweg ohne Positionswechsel: Zubehör und Nachrüstung
(Heizkörper, Pufferspeicher, Thermostate) sind Online-Käufe. Der Rechner behandelt
den **Heizkörpertausch** ohnehin als eigene Option mit eigenen Kosten und besserer
Jahresarbeitszahl — das ist die ehrliche Fläche, und mit ihr wurde am 20.08.2026
bei beiden Shops geworben.

**Klimaanlage — Awin taugt dafür nicht.** Dort stehen nur Pro Breeze und Bauknecht;
„Klimagerät" und „mobile Klimaanlage" ergeben null Treffer. Für den Impulskauf
eines mobilen Splitgeräts (Vorstellung des Betreibers) bräuchte es ein anderes
Netzwerk. Das ist zugleich der Fall, in dem Amazon inhaltlich am besten passen
würde — mit dem bekannten Vorbehalt, dass ohne Preis nichts angezeigt wird.

**Wallbox** — Elli (VW), Energielösung, SENEC sind bei Awin. Die Fläche muss erst
gebaut werden, vorher keine Bewerbung.

**Finanzierung — inhaltlich naheliegend, rechtlich der heikelste Fall.** Bei Awin
sind CHECK24, smava, Verivox, Sparkassen S-Kredit-per-Klick, DKB und swk-bank.
Unsere Rechner nennen Investitionssummen zwischen 5.000 und 30.000 €, der Anschluss
liegt also auf der Hand. **BLOCKER vor jedem Bau:** Werbung mit Kreditzahlen
verlangt nach § 6a PAngV das repräsentative Beispiel samt effektivem Jahreszins —
das schlägt genau bei Sätzen wie „schon ab 89 € im Monat" zu. Dazu die Abgrenzung
zwischen Werbung und erlaubnispflichtiger Vermittlung (§ 34c GewO). Beides gehört
in den Legal-Judge-Durchgang nach `scripts/council-verify.md`, nicht in eine
Einschätzung nebenbei.

**Ökostrom** — vorhanden und gut besetzt (Tibber, LichtBlick, NaturStrom, Ostrom,
entega, Rabot Energy), vom Betreiber am 20.08.2026 **verworfen**: Wir sind keine
Tarifvergleichsseite, es gäbe keine Fläche, an der ein solcher Link Sinn ergäbe.

**Grundsatz, der aus dieser Runde entstanden ist:** Sich bei einem Programm zu
bewerben, für das es keine Fläche gibt, ist nicht folgenlos. Händler werfen
inaktive Publisher wieder heraus, und beim zweiten Anlauf ist man der, der schon
einmal nichts geliefert hat. **Erst die Fläche, dann die Bewerbung.**

---

## 6. Was der Wiederaufnahme im Weg steht

1. **Anmeldung bei mindestens einem Programm** (Empfehlung: Awin + Kleines
   Kraftwerk). Gehört dem Betreiber, da Vertragsbindung.
2. **Datenfeed prüfen:** Enthält er Wechselrichter-Leistung, Modul-Wattpeak und
   nutzbare Speicherkapazität? Ohne diese drei Felder kann unser Modell nicht
   rechnen, und die Seite wäre eine Spezifikationstabelle wie jede andere.
3. **Wächter-Runbook** für die Preis-/Produktpflege, analog `scripts/balkon-verify.md`.
   Ohne das rotten die Daten — und veraltete Preise sind die eine Fehlerklasse,
   die dieser Seite die Existenzberechtigung nimmt.
4. **Legal-Checkliste #9** (`CLAUDE.md`): Erste Bezahlfunktion ⇒ Open-Meteo auf
   API-Abo umstellen (Free-Tier ist nicht-kommerziell), Widget-Nutzungsbedingungen
   zu AGB ausbauen, Impressum auf Rechtsform prüfen. **Vor Launch, nicht danach.**
5. **Kennzeichnung** nach § 5a UWG. Vorbild-Formulierung von happycoffee:
   „Bei einem Klick auf »Zum Angebot« verlässt du solar-check.io. Wir erhalten
   beim Kauf ggf. eine Provision — für dich ändert sich am Preis nichts."
   Position: direkt unter der Preistabelle, nicht im Footer.

---

## 7. Reihenfolge, auf die wir uns geeinigt haben

1. **Anmelde-Guide** (27.100/Monat, echte Info-Absicht) — **live seit 19.08.2026**
   unter `/balkonkraftwerk/anmelden`.
2. **Hub** `/balkonkraftwerk` — **live seit 19.08.2026**, zusammen mit dem Umzug des
   Rechners nach `/balkonkraftwerk/rechner`. Die Reihenfolge ist damit gegenüber der
   ursprünglichen Planung getauscht: Der Cluster stand vor der Messung, weil ab der
   dritten Seite eines Themas ohnehin verschachtelt wird (siehe CLAUDE.md,
   Routen-Schema) und ein späterer Umzug teurer gewesen wäre.
3. **Messen**, 2–3 Wochen ab Livegang: landet der Cluster? Vorher wissen wir nicht,
   ob unser Muster überhaupt greift. Sitemap am 19.08.2026 bei der Search Console
   nachgereicht.
4. **Vergleichsseite** auf die INFO-Keywords ausgerichtet, mit gerechnetem Ranking.
   Wartet auf einen freigeschalteten Partner und die Datenfeed-Frage.

Der Positionierungs-Konflikt ist geklärt: Der Betreiber hat am 17.08.2026
entschieden, dass Werbefreiheit **nicht** das Versprechen ist — sondern
barrierefreier Zugang zu Information. Eine konkrete Kaufempfehlung gilt als
nächster logischer Serviceschritt, wenn der Bedarf geklärt ist.

---

## 8. Sachstand 20.08.2026 — was auf wen wartet

**Beim Händler:**

- **Solakon** (Awin) — Bewerbung raus. Text im Gesprächsverlauf, Kern: Platzierung
  am Ende des Rechners, Vergleichsseite als Ausblick, Reihenfolge nach Nutzerpreis.
- **Heima24** und **Heizungsdiscount24** (Awin) — Bewerbung raus, mit dem
  Heizkörpertausch als benannter Fläche.
- **Kleines Kraftwerk** — Anfrage per Mail raus, offen ist allein die Frage, über
  welches Netzwerk sie laufen.

**Beim Betreiber (Entscheidungen, die niemand sonst treffen kann):**

- Der **Wärmepumpen-Zielkonflikt** aus Abschnitt 5: Zubehör verlinken oder die
  Positionierung gegen Lead-Funnel überdenken.
- Ob **Solago, Yuma und priwatt** einzeln angemeldet werden. Sie sind führend, aber
  jeder braucht ein eigenes Konto in einem eigenen Netzwerk.

**Bei mir, sobald es gebraucht wird:**

- **Legal-Durchgang Finanzierung** (§ 6a PAngV, § 34c GewO) — kann jederzeit laufen,
  hängt an keiner Antwort von außen.
- **Datenfeed-Prüfung**, sobald der erste Partner freigeschaltet ist. Das ist die
  Frage, an der das Format der Seite hängt: gerechneter Vergleich oder kuratierte
  Empfehlung von Hand.
- **Wächter-Runbook** für die Preispflege, vor dem Livegang der Vergleichsseite.
