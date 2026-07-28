# Wächter-Gate — die gemeinsame Prüfschwelle aller Wächter

**Geltung:** Jeder Wächter (scheduled task) dieses Projekts liest dieses Dokument
vor der ersten Änderung und hält es ein. Es hat Vorrang vor dem eigenen
Task-Prompt, wenn beide auseinandergehen. Die fachlichen Runbooks
(`scripts/*-verify.md`) sagen, **was** geprüft wird — dieses Gate sagt, **wann
eine Änderung selbst gemacht werden darf und wann nicht**.

**Warum es das gibt (27.07.2026):** Die Wächter meldeten Befunde an einen
Menschen, der sie nicht prüft — das sah aus wie ein Sicherheitsnetz und war
keins. Ein Vorschlag, den niemand liest, ist schlechter als eine automatische
Korrektur, weil er Sicherheit vortäuscht. Die Bremse war nie „der Mensch prüft
besser", sondern „hier gibt es mehrere vertretbare Antworten". Das trifft auf
die wenigsten Werte zu. Also: automatisch ändern — aber gegen **Richtigkeit**
abgesichert, nicht gegen Anwälte.

**Die Gefahr, gegen die dieses Gate wirklich schützt,** ist nicht Haftung. Wir
sind ein kostenloser Informationsrechner ohne individuelle Beratung, mit
Stand-Datum und „ohne Gewähr, verbindlich ist die offizielle Quelle" — daraus
entsteht kein Beratungsvertrag. Die Gefahr ist Glaubwürdigkeit: Eine falsche
Zahl zerstört genau das, womit die Seite wirbt (siehe CLAUDE.md, „Zahlen und
Einheiten"). Ein Haftungsausschluss repariert keine falsche Zahl; nur die
richtige Zahl tut das.

---

## Teil 1 — Sieben Regeln gegen „Annahme als Tatsache"

Jede Regel stammt aus einem echten Fehlschlag dieses Projekts. Sie gelten für
alles, was ein Wächter ändert, schreibt oder meldet — auch für den Bericht
selbst.

### 1. Zustand vor Zahl

Jede Aussage trägt ihren **Erkenntniszustand**, und der wird nie stillschweigend
angehoben:

| Zustand | Beispiel | Formulierung |
|---|---|---|
| Gesetz in Kraft | EEG-Vergütungssatz | „gilt seit …" |
| Verkündet, noch nicht in Kraft | GModG nach Bundesgesetzblatt | „tritt am … in Kraft" |
| Beschlossen, nicht verkündet | GModG im Juli 2026 | „beschlossen, Verkündung steht aus" |
| Entwurf / Referentenentwurf | EEG-Reform 2027 | „geplant, noch nicht beschlossen" |
| Annahme einer Studie | Grüngas 100 % bis 2045 | „Annahme der zugrunde liegenden Studie" |
| Messwert / Auswertung | WP-Angebotsmedian | „ausgewertet aus … Angeboten" |
| Marktbeobachtung | gescrapte Modulpreise | „laufend aus Marktdaten" |

**Auto-Fix darf nur den Wert ändern, nicht den Zustand.** Ein Zustandswechsel
(Entwurf wird Gesetz, Annahme wird Regel) ist immer eine eigene Änderung mit
eigener Fundstelle und geht **nie beiläufig** in einem Wert mit.

*Auslöser:* Im Grüngas-Content wurde die Modellannahme eines Instituts („100 %
ab 2045") in drei Texten zur Gesetzesaussage. Sie stand nie im Gesetz.

### 2. Quelle heißt: wer hat gemessen — nicht wer hat veröffentlicht

Im Bericht steht, **wer die Zahl erhoben hat**, mit Erhebungszeitraum und
Stichprobe. „Steht bei X" ist keine Quellenangabe, wenn X nur referiert.

*Auslöser:* Ein Wächter meldete einen Gerätepreis als „tatsächlich getestete
Geräte" einer deutschen Prüforganisation. Die testet diese Geräteklasse seit
Jahren nicht; die Preise stammten von einer Partnerorganisation und wurden nur
wiedergegeben. Die empfohlene Änderung war richtig, ihre Begründung nicht.

### 3. Aussagen über unseren eigenen Code sind unbelegt, bis nachgesehen wurde

Sätze der Form „danach passiert X automatisch" werden **am Code geprüft**, nicht
geglaubt — auch wenn ein früherer Wächter sie geschrieben hat.

*Auslöser:* Ein Monitor schrieb, nach dem Umlegen eines Schalters „füllt sich
die Sitemap automatisch". Für einen der Seitentypen gab es diesen Zweig gar
nicht — die Freischaltung wäre halb wirkungslos live gegangen.

### 4. Eine Kennzahl ist kein Zustand

Aus einer Metrik nicht auf einen Zustand schließen, wenn es eine Abfrage für den
Zustand gibt. Summen ohne Verlauf sind besonders trügerisch.

*Auslöser:* Aus einer 28-Tage-Impressionssumme wurde geschlossen, Seiten liefen
„seit Wochen ohne Nachfrage". Tatsächlich waren es vier Tage mit steigendem
Verlauf — und Impressionen sagen ohnehin nichts über den Indexierungsstatus.

### 5. Kein Handfaktor — die Rechenregel steht im Code

Ein Wert wird aus einer benannten Regel abgeleitet, nicht justiert, bis er
plausibel aussieht. **„Wirkt zu hoch/zu niedrig" ist kein zulässiger Grund für
eine Korrektur.** Wer abweicht, benennt den physikalischen oder methodischen
Effekt, der die Abweichung trägt.

*Auslöser:* Zweimal derselbe Fehlertyp — bei den Geräte-Effizienzen (ein Typ
bekam still einen Ermessens-Abschlag) und bei der Wärmepumpen-Investition (eine
strukturell zu knappe Portal-Quelle hätte einen geratenen Korrekturfaktor
gebraucht).

### 6. Fundstelle erst beschaffen, dann streichen

Eine zitierte Fundstelle, die sich nicht sofort abrufen lässt, wird **besorgt**
(Repo, PDF-Download, Archiv, notfalls Nachfrage) — nicht vorsorglich entfernt.
Ein fehlgeschlagener Abruf ist kein Beleg für „gibt es nicht". Beschaffte
Primärquellen landen als Datei in `docs/quellen/`, damit die Fundstelle beim
nächsten Lauf nachprüfbar ist statt wieder unbelegt.

*Auslöser:* Aus einem Institutsbericht wurden zwei Fundstellen als „unbelegt"
gestrichen. Nach dem Öffnen des PDF war jede davon korrekt.

### 7. Jede automatisch gepflegte Zahl braucht einen Realitäts-Anker

Zu jedem Wert, den ein Wächter selbst ändern darf, existiert ein Test, der ihn
gegen die reale Spanne prüft (Muster: „Marktanker" in den Wärmepumpen-Tests —
Median-Fall, kleinste und größte Anlage gegen echte Angebote). **Diese Tests
dürfen nie aufgeweicht werden, damit ein Wert durchgeht.** Anpassen nur, wenn
die neuen Grenzen direkt aus der neuen Quelle stammen.

*Auslöser:* Der Rechner rechnete ein halbes Jahr lang eine Investition unter dem
günstigsten von 160 realen Angeboten. Aufgefallen ist es an einem
Nutzerkommentar, nicht am Wächter — es fehlte schlicht der Anker gegen die
Wirklichkeit.

---

## Teil 2 — Wann ein Wächter selbst ändern darf

Reihenfolge: **Befund → Council → (bei Rechtsbezug) Legal-Judge → Gate → Fix
oder Vorschlag.**

### Council

`scripts/council-verify.md`: drei unabhängige Verifizierer, einer davon
adversarial (Auftrag: den Befund widerlegen). Kein Konsens → Vorschlag.

### Legal-Judge (neu)

Sobald der Befund eine **rechtliche Aussage** berührt — Gesetzesstand, Frist,
Fördersatz, Pflichtangabe, Lizenzbedingung — bewertet zusätzlich ein
Legal-Judge. Sein Auftrag ist nicht „ist das gefährlich", sondern:

1. **Zustand korrekt?** (Regel 1 — Entwurf/beschlossen/verkündet/in Kraft)
2. **Fundstelle amtlich?** Bundesgesetzblatt, Gesetzestext, Ministerium,
   Förderbank, Verordnung — Presse und Portale nie als Beleg.
3. **Formulierung deckungsgleich mit der Fundstelle?** Keine Verschärfung
   („muss") wo die Quelle „soll" sagt, keine Verallgemeinerung eines Einzelfalls.
4. **Reicht der bestehende Unverbindlichkeits-Hinweis** für die geänderte
   Aussage, oder braucht sie einen eigenen Stand-/Vorbehaltssatz?

Sein Urteil ist bindend: Bei „Zustand unklar" oder „Fundstelle nicht amtlich"
gibt es keinen Auto-Fix, unabhängig vom Council.

### Die fünf Gate-Bedingungen

Ein Auto-Fix passiert nur, wenn **alle** erfüllt sind:

1. **Leitquelle** ist amtlich (Recht) oder eine Auswertung echter Daten
   (Markt) — und enthält **alle** Angaben, die das Modell braucht. Fehlt eine,
   ist der Befund unvollständig, nicht „ungefähr richtig".
2. **Council-Konsens**, adversarialer Prüfer eingeschlossen; bei Rechtsbezug
   zusätzlich freies Legal-Judge-Urteil.
3. **Rechenregel statt Ermessen** (Regel 5), im Code dokumentiert.
4. **Sprunggrenze:** höchstens 30 % Änderung je Feld gegenüber dem hinterlegten
   Wert. Darüber nur Vorschlag — ein größerer Sprung ist eher ein Lesefehler als
   ein Marktereignis.
5. **`npx tsc --noEmit` und `npx vitest run` grün**, inklusive der
   Realitäts-Anker aus Regel 7.

### Selbstkontrolle statt Freigabe

Weil vorher niemand mehr freigibt, muss der Automatismus sich **hinterher**
selbst kontrollieren:

- Jeder Auto-Fix-Commit trägt im Betreff `[auto]` und im Text die Quelle mit
  Erhebungszeitraum und Fundstelle.
- Der **nächste Lauf desselben Wächters prüft zuerst seinen letzten Auto-Fix
  nach.** Lässt sich die Quelle nicht reproduzieren oder trägt sie den Wert
  nicht, wird der Fix zurückgenommen (Revert + Meldung) — bevor irgendetwas
  Neues geprüft wird.
- Der Betreiber bekommt **einen wöchentlichen Bericht „was habe ich selbst
  geändert"** (Sammel-Mail über alle Wächter) — zum Sehen, nicht zum Abnicken.

### Was nie automatisch geht

- **Geld nach außen** und alles, was Nutzer zahlen oder wir einnehmen.
- **Versand nach außen** (Outreach, Newsletter, Kontaktaufnahme).
- **Struktur von Rechtstexten** — Datenschutzerklärung, Impressum,
  Nutzungsbedingungen. Faktische Stände darin (Fristen, Sätze, Namen von
  Gesetzen) darf der Legal-Judge pflegen; ob ein Abschnitt hinzukommt oder
  entfällt, entscheidet ein Mensch.
- **Produktentscheidungen** — was gebaut, gezeigt oder priorisiert wird.
- **Schwellen und Grenzwerte hochsetzen, damit ein Befund verschwindet.** Das
  versteckt, statt zu beheben (gilt seit dem Monitoring-Aufbau, unverändert).

---

## Teil 3 — Befugnis je Wächter

| Wächter | Darf selbst ändern | Bleibt Vorschlag |
|---|---|---|
| Preis-Pipeline (wöchentlich) | Pipeline-Reparatur, Quellen-Umschaltung | neue Preisquelle einführen |
| EEG-Vergütung (halbjährlich) | Vergütungssätze, Degressionsschritt, Reform-Sachstand | Wegfall/Neueinführung einer Vergütungsart |
| CO₂-Preispfad (jährlich + monatlicher Scan) | Preispfad-Stützstellen | Wechsel des Preismechanismus |
| Strommix-Langzeitreihen (monatlicher Scan) | CO₂-Reihen einer neuen UBA-Ausgabe — Council prüft die **Spaltenüberschrift**, nicht die Plausibilität (die Nachbarspalten sind rechnerisch nicht unterscheidbar) | Erzeugungsreihe, geänderte Tabellenstruktur, Wechsel der gelesenen Spalte |
| Wärmepumpe (quartalsweise) | Investition (Basis, Steigung, Heizkörpertausch) | BEG-Sätze, WP-Tarif, Gaspreis |
| Geräte-Config (quartalsweise) | Set-/Gerätepreise, Effizienzen **nach der Systematik** | neue Gerätekategorie, neue Effizienz-Systematik |
| Förderprogramme (täglich + quartalsweise) | Programm abschalten, Sätze senken, Programm einschalten nach Träger-Beleg | neues Programm aufnehmen |
| Grüngas / GModG | Verkündungs-Flag, Stufenwerte nach Gesetzestext | Quotengesetz nach § 42a, neue Stufen |
| Legal (quartalsweise) | faktische Rechtsstände in Texten | Struktur der Rechtstexte |
| Atlas-Index-Wellen | Sitemap-Einreichung, Regressionsbefunde | Welle freischalten |
| Fehler-Triage (täglich) | Function-Region, eindeutige Betriebsfehler | Berechnungslogik, Zahlen, Datenbank |

Neuer Wächter → Zeile hier ergänzen, sonst gilt: nur Vorschlag.
