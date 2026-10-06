# Fehlerkatalog der Kontakt-Erfassung

Jede Fehlerklasse, die bei Gemeinden, Kreisen, Versorgern, Presse, Fachbetrieben
und Windparkbetreibern aufgetreten ist — mit Anlass, Erscheinung und der
**maschinellen** Sicherung, die sie heute verhindert. Stand 06.10.2026.

Gelesen wird dieser Katalog vor jedem neuen Bestand und vor jedem Umbau an der
Erfassung. Der Ablauf, in dem die Sicherungen greifen, steht in
`docs/erhebung/kontakte-neuer-bestand.md`.

**Art der Sicherung:**
- **Verwendung** — ein Test prüft den Schreib- oder Aufrufweg selbst und wurde
  absichtlich kaputtgemacht (rot gesehen, Rückweg grün).
- **Vorflug** — `--vorflug` prüft es vor jedem Lauf (BEREIT / NICHT BEREIT).
- **Laufzeit** — eine Prüfung im Code ohne eigenen Test.
- **Ablauf** — eine Pflicht im Ablauf, die kein Test erzwingen kann (lesen,
  gegenlesen). Steht dort mit dem, was sie auslöst.

Die Tests der Klassen 1–17 stehen gesammelt in
`lib/__tests__/kontakt-engine-sicherungen.test.ts`; Regeln eines Bestands in
seinen eigenen Tests (`windbetreiber.test.ts`, `fachbetrieb-*.test.ts` …).

---

## A. Betrieb und Ablauf

### 1. Bezahlte Suche für eine Massensuche benutzt
- **Anlass:** 28.09.2026 für Gemeinden entschieden („der Suchdienst ist für die
  Backlink-Bewertung da, nicht für einen Dauerlauf"), am 06.10.2026 bei den
  Windbetreibern trotzdem gelaufen: zwei Eichläufe, dann 150 von 2.307
  Anschriften für 0,57 $, bis der Betreiber es bemerkte. Die Entscheidung stand
  nur als Kommentar und als Schalter, den niemand tippen musste.
- **Sicherung (Verwendung):** Jeder Abruf eines Such-Endpunkts in einem
  Erhebungsskript ruft unmittelbar davor — außerhalb jedes `try` —
  `bezahlteSucheFreigabe()` (`scripts/lib/bezahlte-suche.ts`). Die wirft ohne
  `--bezahlte-suche-freigegeben` im selben Befehl. Kein Nachtskript darf den
  Schalter tragen. Bei den Windbetreibern gibt es die Maschinen-Suche gar nicht
  mehr (`--suche` bricht ab). Neun Sabotagen, alle rot.
- **Regel:** Recherche macht Claude selbst — WebSearch, eingebauter Browser,
  parallele Helfer.

### 2. Spalte im Code, aber nicht in der Datenbank
- **Anlass:** 06.10.2026 — die Kontaktspalten der Windbetreiber standen im Code
  und in der DDL, das Setup lief nicht neu; der Kontaktschritt brach nachts nach
  der langen Recherche mit „column does not exist" ab (15 Mal im Protokoll).
  Früher: Spalten, die es nur in der Live-Datenbank gab (Presse, 06.09.), und die
  Schema-Zwischenspeicherung der Schnittstelle (Versorger, 21.09.).
- **Sicherung (Verwendung + Vorflug):** `lib/ddl-spalten.ts`. Code → DDL: jeder
  Schreibweg der Wind-Tabellen läuft durch `nurBekannteSpalten`, ein Test prüft
  jede Schreibstelle und jeden Zeilenbauer. DDL → Datenbank: der Vorflug fragt
  jede DDL-Spalte live ab.

### 3. Schwere Läufe unter Last, gerissene Zeitlimits
- **Anlass:** 22.09.2026 Last 1.000 bei überlappenden Nachtläufen; 06.10.2026
  Last 170–440 aus fremden Builds, Synchronisation und Codex — Pre-commit und
  Lauf scheiterten; der „ruhige" Nachtlauf traf Last 440.
- **Sicherung (Vorflug):** `lastCheck` (Grenze 40, Ein- UND Fünf-Minuten-Mittel).
  Der Nachtlauf beginnt mit dem Vorflug, wartet nur die Last ab (höchstens
  3 × 20 min) und bricht bei jedem anderen offenen Punkt ab.
- **Grenze:** Offline-Schritte (Neubewertung, Auswertung, Bericht) brauchen
  keine Lastprüfung.

### 4. Routinen statt einer Sitzung; ein Stopp, der nicht hielt
- **Anlass:** 06.10.2026 — statt einer Sitzung zwei geplante Aufträge angelegt
  (laufen nur bei offener App, nicht ansprechbar). Nach „beide aus" lief ein
  Rest-Skript einer gestoppten Sitzung weiter und startete die Kontaktsuche
  neu; zwei Sitzungen steuerten einen Lauf.
- **Sicherung (Vorflug):** `paralleleLaeufeCheck` — kein zweiter Prozess
  desselben Bestands darf leben. Hat am selben Abend den verwaisten Lauf
  gemeldet.
- **Regel (Ablauf):** Eine Erhebung führt EINE Sitzung bis zum Ende. Keine
  Routinen. Ein Stopp gilt erst, wenn `ps` keinen Prozess mehr zeigt.

### 5. Veraltete oder fehlende Abhängigkeiten in einer Arbeitskopie
- **Anlass:** 06.10.2026 — Pre-commit scheiterte zweimal an älteren Paketen;
  am Abend fehlte `bluebird` (unter `unzipper`), der Bericht brach ab.
- **Sicherung (Vorflug):** `abhaengigkeitenCheck` vergleicht jede Version mit
  der Sperrdatei und lehnt einen verlinkten `node_modules` ab. Abhilfe immer
  `npm ci`, nie den Ordner des Haupt-Checkouts verlinken.

### 6. Ein Bericht, der mit 0 MW antwortet
- **Anlass:** 06.10.2026 — der Bericht suchte den Registerstand neben dem
  3-GB-Export, den es nur im Haupt-Checkout gibt, und zählte in der Arbeitskopie
  stumm 0 MW.
- **Sicherung (Verwendung):** Der Registerstand wird ohne den Export gefunden;
  ein Bericht ohne Registerstand bricht ab statt 0 MW zu schreiben.

### 7. Ein gescheiterter Abruf wird als Antwort gespeichert
- **Anlass:** 06.10.2026 — Zeitüberschreitung, Serverfehler und leere Antworten
  standen im Impressum-Speicher für immer als „nicht erreichbar" (rund 40
  Domains aus einer Stunde unter Last). Ein 403 auf einen Abruf ohne Browser
  machte die Domain auch für die Handprüfung unlesbar (orsted.de). Früher
  dieselbe Klasse: „Fundstelle nicht lesbar" als „Adresse steht nicht mehr da"
  (Freigabe, 23.09.), ein Suchfehler als „gesucht" abgehakt (Wind, 06.10.).
- **Sicherung (Verwendung):** `abrufWiederholen` — vorübergehende Fehler werden
  bis zu dreimal, eine Stunde auseinander, neu versucht; die Handprüfung holt
  einen Abruf ohne Browser mit Browser nach. Die Neubewertung liest dabei NUR
  den Speicher (sie lief zehn Minuten gegen das Netz, als die Regel sie erreichte).

### 8. Ein teurer Lauf schreibt erst am Ende
- **Anlass:** Versorger 28.07. (22-GB-Registerlesung), Profil-Lauf 27.08.,
  Presse 05.09., Freigabe 23.09. (45 Minuten Lesen verloren).
- **Sicherung (Verwendung):** Registerlesung wird vor dem Schreiben gespeichert;
  die Freigabe schreibt jedes Urteil sofort (`kontakt-freigabe.test.ts`); die
  Kontaktsuche hält Ergebnisse je Website in Dateien.

### 9. Ein hängender Abruf beendet den Lauf „erfolgreich"
- **Anlass:** 19.09. — ein nicht referenzierter Zeitgeber leerte die
  Ereignisschleife, Node endete mit 0 mitten im Lauf; 23.09. — eine Seite blieb
  ewig offen.
- **Sicherung:** Lebenszeichen im Lauf (`laufen()` hält ihn am Leben, Laufzeit);
  harte Frist je Seite (`mitFrist`, Verwendung in `kontakt-freigabe.test.ts`).
  Im Nachtlauf meldet jede Hälfte eines parallelen Schritts ihren Fehler
  (Verwendung).

## B. Datenbank

### 10. Stapelschreiben mit ungleichen Feldern überschreibt mit NULL
- **Anlass:** 29.08.2026 Fachbetriebe — Meisterbetrieb 676 → 167, Photovoltaik
  2.913 → 135, beim zweiten Auftreten.
- **Sicherung (Verwendung):** gruppiertes Schreiben (`upsert-spaltenmenge.test.ts`);
  im Wind-Lauf wirft der Stapelweg bei ungleicher Spaltenmenge.

### 11. Seitenweises Lesen ohne Sortierung, stumme 1.000-Zeilen-Grenze
- **Anlass:** Versorger 28.07. („1.000 Zuordnungen" von 11.407), Story-Bucket
  06.09. (derselbe Ort mit 35, 64, 39 Anlagen), KfW 597 von 1.597 Zeilen.
- **Sicherung (Verwendung):** Jeder `.range(` eines Erhebungsskripts trägt eine
  Sortierung; Presse liest über einen Sortierschlüssel je Tabelle. Beim Bau
  fünf Stellen ohne Sortierung gefunden und behoben.

### 12. Dieselbe Organisation in zwei Beständen
- **Anlass:** 06.10.2026 — 110 von 3.115 „Fachbetrieben" waren Stadtwerke,
  Zeitungen, Kreisportale.
- **Sicherung (Verwendung + Vorflug):** `lib/bestand-abgleich.ts` in jedem
  Schreibweg; offene Konflikte blockieren den Vorflug.

### 13. Eine Verbund-Domain trägt mehrere Organisationen
- **Anlass:** 06.10.2026 — drei Fraunhofer-Institute betreiben Windräder, ihre
  Websites liegen unter fraunhofer.de; zusammengezogen kollidierten sie mit der
  Pressequelle Fraunhofer ISE. Gleiche Klasse: geteiltes Hosting (jimdo, wix),
  Landesdomains (bayern.de).
- **Sicherung (Verwendung):** Verbund-Domains behalten den Host
  (`organisationsDomain`, nur gemessene Fälle); Kandidaten unter einer alten
  Domain-Regel entfernt die Neubewertung.

## C. Messen und Berichten

### 14. Treffer gezählt, nicht gelesen — überhöhte Zahlen
- **Anlass:** 06.10.2026 — „3.044 Betriebe nur über die Streuung" gemeldet,
  gemessen waren 110; Versorger „6 mit eigenem Rechner", es waren 0; eigene
  34 % später 12 %.
- **Sicherung (Ablauf, Werkzeug):** `--mode=stichprobe` (Kontakte) und die
  Gegenlese-Pflicht: 20 Treffer, 10 Ablehnungen, 10 ohne Ergebnis von Hand,
  bevor eine Zahl gemeldet wird. Zahlen kommen nur aus `--stand` bzw.
  `--mode=summary`, und die zählen nur noch belegte Websites.

### 15. Abdeckung gemeldet, ohne die Lücken zu lesen
- **Anlass:** Kreise 30.09. — 169, 178, 182 gemeldet, nach Lesen der Lücken 214.
  Wind 06.10. — die Lückenprobe fand drei Regeln (Impressum der Website-Prüfung
  ungenutzt, Postfach im eigenen Impressum nicht anerkannt, neue Spur ohne
  zweiten Anlauf): 388 → 275 Websites ohne Kontakt.
- **Sicherung (Ablauf):** Die Stichprobe zeigt immer auch zehn Lücken; jede
  gefundene Ursache wird eine Regel mit Test.

### 16. „Nichts gefunden" gleich „nie angesehen"
- **Anlass:** Fachbetriebe (758 doppelt geprüft), Gemeinden (`luecke_at`),
  Wind: die bezahlte Suche setzte „gesucht" für 779 Betreiber, deren
  Registerangaben nie alle geprüft waren.
- **Sicherung (Verwendung):** Bei den Windbetreibern zählt nur der Vermerk der
  Handprüfung („von Hand geprüft:", Notiz ≥ 40 Zeichen) als abgeschlossen; jede
  Maschinenprüfung nimmt alle anderen wieder auf. `--stand` meldet erst
  VOLLSTÄNDIG, wenn kein Betreiber ohne Website ohne diesen Vermerk ist.

### 17. Wächter, die nichts sehen
- **Anlass:** 06.10.2026 — ein Testbeispiel ohne den gesuchten Fall blieb grün,
  ein Test hielt eine Typangabe für eine Schreibstelle, ein erfundener
  Profilname ging still durch; Fachbetriebe: das „e.V."-Muster traf nie.
- **Sicherung (Ablauf):** Jede neue Sicherung wird absichtlich kaputtgemacht —
  **nachdem der Stand gesichert ist** (am 06.10. verwarf der Rückweg per
  `git checkout` eine ungesicherte Regel). Am selben Tag blieb eine von neun
  Sabotagen grün und wurde nachgeschärft.

## D. Identität: gehört die Website dem Betreiber?

### 18. Register- oder Personenpostfach als Website-Beleg
- **Anlass:** 115 Sehestedter Gesellschaften mit dem Postfach einer
  Wirtschaftsprüferin (Mazars).
- **Sicherung (Verwendung):** Nur ein Funktionspostfach im Register belegt
  (`funktionsPostfach`); Personenpostfächer schlagen nur einen Kandidaten vor.

### 19. Ort oder Gattungswort als Marke
- **Anlass:** „Windfeld Thüringer Becken" → Thüringer Allgemeine; Cirrus GmbH →
  Flugzeugbauer; ein Park mit Ortsnamen → Stadtportal.
- **Sicherung (Verwendung):** Gattungsliste, Ortswörter aus dem
  Gemeindeverzeichnis, Marke nur auf einer Energieseite.

### 20. Referenzliste eines Dienstleisters belegt einen Namen
- **Anlass:** 06.10.2026 — „Windpark Reher" auf der Startseite eines
  Planungsbüros (Referenzliste); sechs weitere auf Entwickler- und
  Finanzierungsseiten.
- **Sicherung (Verwendung):** Ein Name auf einer Startseite oder Belegseite
  belegt nur, wenn er ein Wort trägt, das weder Gattung noch Ort ist, und die
  Seite keine Parkliste ist (`identifizierend`, `parkListe`).

### 21. Fremdes Impressum gelesen
- **Anlass:** 06.10.2026 — 81 von 1.766 gespeicherten Impressen lagen auf
  anderer Domain: Aliase (windpunx.com → .de), aber auch eine Cisco-Datenschutz-
  seite (orsted.com) und Hoster-Platzhalter (inwx, ionos, goneo), die als
  „Website existiert" gezählt wurden.
- **Sicherung (Verwendung):** `impressumHerkunft` — Hoster-Platzhalter gelten
  als geparkt, ein fremdes Impressum belegt nur über Name oder Anschrift.

### 22. Normalisierung nur auf einer Seite, Schreibvarianten
- **Anlass:** „Straße" nur im Register vereinheitlicht; Hausnummern mit
  Bindestrich; dreibuchstabige Marken; englische Rechtsseiten; Namen an
  Buchstaben statt Wörtern gekürzt; abgelaufene Zertifikate.
- **Sicherung (Verwendung):** `windbetreiber.test.ts` („Fehlerklassen der ersten
  Stichprobe").

### 23. Eine Regeländerung lässt alte Urteile stehen
- **Sicherung (Verwendung):** `--neu-bewerten` als erster Schritt; die
  Kontaktübernahme weist Ergebnisse unter alten Regeln ab („erst
  --mode=evaluate").

## E. Kontakte

### 24. Kontakt überlebt seine Website
- **Anlass:** 06.10.2026 bei der Durchsicht — eine gewechselte oder
  zurückgenommene Website ließ den alten Kontakt stehen; eine Website ohne
  Kontakt behielt den vorigen.
- **Sicherung (Verwendung):** Website-Wechsel und -Rücknahme leeren den Kontakt;
  die Übernahme schreibt für jede bewertete Website, auch „kein Kontakt".

### 25. Kontakt nicht von der eigenen belegten Website
- **Sicherung (Verwendung):** Die Freigabe der Windbetreiber verlangt eine
  Fundstelle auf der belegten Website, bevor sie die Seite liest; `--stand`
  meldet jeden Kontakt, dessen Fundstelle woanders liegt. Registerpostfächer
  bleiben Daten und werden nie freigegeben.

### 26. Das Impressum der Website-Prüfung bleibt ungenutzt
- **Anlass:** 06.10.2026 — bei per Skript gebauten Websites las die
  Kontaktsuche nur die Startseite, obwohl die Website-Prüfung das Impressum
  (teils mit Browser) schon hatte; ein Eintrag mit einer gelesenen Seite blieb
  für immer „final".
- **Sicherung (Laufzeit):** Das gespeicherte Impressum geht als Seite und als
  Spur in die Kontaktsuche; eine neue Spur öffnet einen abgeschlossenen Eintrag.

### 27. Das Pflichtpostfach des Impressums nicht erkannt
- **Anlass:** 06.10.2026 — „socialmedia@…" im Impressum, das Gmail-Postfach eines
  Bürgerwindparks im eigenen Impressum.
- **Sicherung (Verwendung):** `allgemeinAuf` / `gratisPostfachAuf` je Bestand;
  bei Verwaltungen bewusst nicht gesetzt.

## F. Aus der Fachbetriebs-Bereinigung und der ersten Handprüfung (06.10.2026)

### 28. Ein späterer Lauf hebt eine Entscheidung von Hand auf
- **Anlass:** Fachbetriebe — die Kreissuche schrieb bei jedem Lauf wieder
  „Betrieb" und hob jede Rückstufung am Impressum auf. Bei den Windbetreibern
  hätte die Neubewertung eine von Hand über eine andere Belegseite gefundene
  Website zurückgenommen (sie urteilt nur aus dem Impressum-Speicher).
- **Sicherung (Verwendung):** Die Neubewertung überspringt Kandidaten der
  Handprüfung und jeden Betreiber mit einem Hand-Vermerk („von Hand geprüft:" /
  „von Hand gefunden"); urteilt die Maschine heute anders, meldet sie das
  („bitte ansehen") und ändert nichts. Die Impressum-Prüfung nimmt nur
  Betreiber ohne Website und ohne Hand-Vermerk. Geändert wird eine
  Handentscheidung nur durch eine neue Handentscheidung. Am selben Abend
  meldete die Regel 31 WIND-projekt-Gesellschaften, die eine neue Regel jetzt
  belegt — sie gingen zurück an die Handprüfung statt still umgeschrieben.

### 29. Falsch eingeordnet heißt übergeben, nicht nur markieren
- **Anlass:** 74 Versorger und 6 Medien standen als Fachbetriebe. Bei den
  Windbetreibern 19 Stadtwerke-Websites, die der Versorger-Bestand nicht
  kannte (dort stehen meist nur die Netzgesellschaften).
- **Sicherung (Verwendung):** `--uebergeben` misst, mit `--schreiben` übergibt
  es als Kandidat (`herkunft = 'suche'`) — nur starke Fälle (Versorger im
  Namen, keine Bürgergesellschaft), wiederholbar ohne Doppel. Der
  Windbetreiber-Eintrag bleibt: wer Windräder betreibt, ist Betreiber.

### 30. Treffer aus einem fremden Abschnitt des Impressums
- **Anlass:** Fachbetriebe — „Anbieter: Ergo Versicherung … Versicherungs-
  ombudsmann e.V., 10006 Berlin". Windbetreiber: von 3.680 Impressum-Belegen
  lagen 178 außerhalb des Anbieterblocks; Anschriften und Marken dort waren
  Niederlassungen und Konzerne, Namen dort teils Referenz- und Navigationslisten.
- **Sicherung (Verwendung):** Ein Name außerhalb des Anbieterblocks
  (`lib/impressum-anbieter.ts`) belegt nur, wenn er die Organisation
  identifiziert oder samt Rechtsform wörtlich dasteht und der Text keine
  Parkliste ist. Ein leerer Block heißt „nicht gelesen", nie „kein Treffer".

### 31. Eine Regel, die nie greift
- **Anlass:** Fachbetriebe — „e\.V\.\b" trifft vor einem Leerzeichen nie.
- **Sicherung (Verwendung):** `lib/__tests__/regex-punkt-wortgrenze.test.ts`
  repo-weit; jede neue Regel dieser Erhebung wurde gesichert ausgebaut und rot
  gesehen (am 06.10. 24 Regeln, eine blieb grün und wurde geschärft).

### 32. Schwacher Beleg macht einen falschen Treffer
- **Anlass:** Fachbetriebe — Stadtportale und ein Ministerium als Betriebe.
- **Sicherung:** Nur Name (vollständig), Registeranschrift, Marke auf einer
  Energieseite, eigene Registerangabe oder Funktionspostfach belegen; im
  Zweifel bleibt der Betreiber offen und geht in die Handprüfung.

### 33. Was der erste Handprüfungs-Block an Lücken fand
- Marke als ein Wort mit Bindestrich aus Gattungswörtern („WIND-projekt" auf
  wind-projekt.de, 33 Gesellschaften); Hausnummer „0" im Register heißt „keine
  Nummer"; der volle Firmenname mit Rechtsform auf einer Projektseite
  („Betreiber des Parks ist die Amrum-Offshore West GmbH") identifiziert auch
  aus Ortswörtern; Projektname ohne Gattungs-Schluss und ohne ausländische
  Rechtsform („Borkum Riffgrund 2", „P/S"); eine App-Hülle (200, kein Text)
  wird im Browser gelesen statt als Seite gezählt.
- **Sicherung (Verwendung):** je ein Test in `windbetreiber.test.ts`
  („Befunde der ersten Handprüfung"), alle sechs gesichert ausgebaut und rot.

### 34. „Nicht erreichbar" als Abschluss
- **Anlass:** Fachbetriebe — 141 Einträge kamen am Ende eines Messlaufs als
  unerreichbar zurück, 42 zu Unrecht.
- **Sicherung:** Bei den Windbetreibern schließt nur der Hand-Vermerk ab;
  unerreichbare Kandidaten bleiben offen, werden wiederholt (7) und landen in
  der Handprüfung, die mit Browser nachholt.

### 35. Ein einzelner Lesefehler wirft einen Kontakt aus dem Versand
- **Anlass:** Outreach 06.10.2026 — Vorflug und Versand kamen am selben Tag für
  dieselben Gemeinden zu verschiedenen Ergebnissen; die Amtsseite war zeitweise
  langsam oder zeigte eine Bot-Prüfung.
- **Sicherung (Verwendung):** `freigabeUrteil` — sofort gesperrt wird nur, wenn
  die Adresse nicht mehr auf der Seite steht oder die Seite weg ist (404/410);
  ein Lesefehler wird beim ersten Mal vermerkt („1. Fehlversuch") und sperrt
  erst beim zweiten in Folge. Gilt für die Windbetreiber-Freigabe; der
  Gemeinde-Versand prüft über einen eigenen Weg und baut das dort nach.

### 36. Sabotage im geteilten Helfer beweist nichts
- **Anlass:** Register-Recherche 06.10.2026 — eine absichtlich verbogene
  Summierfunktion blieb grün, weil BEIDE Seiten des Vergleichs sie benutzten.
- **Regel (Ablauf):** Eine Sabotage gehört auf EINE Seite des Vergleichs, nie in
  das, was beide teilen. Dieselbe Klasse wie „der Test vergleicht den Fehler mit
  sich selbst".

### 37. Ein zu breites Muster sammelt Unbeteiligte ein
- **Anlass:** Register-Recherche — ein Wächter über „die ersten Zeichen
  abschneiden" fand dreißig Module ohne Bezug; eine geschätzte Trägerliste lag
  bei zehn, gemessen waren es sechzehn.
- **Regel (Ablauf):** Wächter am Bezeichner festmachen, nicht an der
  Operation; die Liste der Betroffenen messen, nie schätzen.

### 38. Eine Bestandsregel in der geteilten Maschine hält den Versand eines anderen Bestands an
- **Anlass:** 06.10.2026 — eine Wind-Regel (Impressum-Postfach) stand zuerst in
  der gemeinsamen Kontaktmaschine. Deren Dateien gehen in die Regelversion der
  Gemeinden ein; beim Zusammenführen hätte jedes Gemeinde-Ergebnis als „unter
  alten Regeln" gegolten und der Versand (am nächsten Morgen) jeden Brief
  angehalten, bis alles neu ausgewertet ist. Bemerkt vor dem Zusammenführen.
- **Sicherung (Verwendung):** Wind-Regeln wirken über die Haken des Laufs
  (`ergebnisForm`, `htmlVorbereiten` mit eigener Kennung im Seiten-Speicher)
  im Bestandsskript; ein Test verbietet Wind-Begriffe in den versionierten
  Dateien der Gemeinden und verlangt eine eigene Regelversion für Wind.
- **Regel (Ablauf):** Wer eine Datei aus der Liste der Gemeinde-Regeldateien
  ändert, fragt vorher die Versand-Sitzung und lässt danach die
  Gemeinde-Auswertung neu laufen.

### 39. Lücken der Kontakt-Handprüfung — und eine zu weite Reparatur
- **Anlass:** 06.10.2026, drei Kontakt-Blöcke: ein Konflikt auf einer
  Nebenseite (Wix-Platzhalter, Tippfehler-Variante) sperrte das saubere
  Impressum-Postfach; „contact@", „mentions légales"; Adressen als
  „name(at)domain", Cloudflare-verschlüsselt, nur im Browser sichtbar;
  29 Websites leiten auf eine andere Domain derselben Firma weiter
  (windmanager.de, ewe.dk mit 165/160 Betreibern) und standen als „kein
  Kontakt". Die erste Reparatur nahm JEDE verlinkte Impressum-Domain als
  dieselbe Website — und übernahm so Postfächer einer Webagentur und einer Bank.
- **Sicherung (Verwendung):** Impressum-Postfach als allgemeiner Kontakt, wenn
  es dort sauber steht; Klammer- und Cloudflare-Adressen werden entschlüsselt;
  die Handspur rendert die Seite im Browser; als dieselbe Website gelten nur
  die Weiterleitung der STARTSEITE und derselbe Name unter anderer Endung.
  Jede Regel gesichert ausgebaut und rot gesehen.

### 40. Der volle Datenträger
- **Anlass:** 06.10.2026 abends — 124 MB frei, jeder Befehl jeder Sitzung
  scheiterte; ein Helfer ließ 21 Betreiber offen.
- **Sicherung (Vorflug):** `platzCheck` — unter 5 GB frei ist der Lauf NICHT
  BEREIT. Platz schaffen nur mit Freigabe, nie in fremden Dateien.

### 41. Dieselbe Frage, verschieden beantwortet
- **Anlass:** 06.10.2026 — eine Bank-Website wurde in einem Block
  zurückgenommen, während acht andere Bank-verwaltete Bürgerwindparks über
  dieselbe Anschriftsregel belegt waren.
- **Regel (Ablauf):** Die Grenze steht im Auftrag der Helfer: Ein Verwalter
  (Bank, Betriebsführer, Projektierer), unter dessen Anschrift der Betreiber im
  Register sitzt, ist der richtige Weg; zurückgenommen wird nur, was mit dem
  Betreiber nachweislich nichts zu tun hat.

### 42. Inhalt in Attributen von Web-Komponenten
- **Anlass:** 06.10.2026 — E.DIS schreibt Impressum und Kontakt als
  verschlüsseltes HTML in ein Attribut einer Web-Komponente; gelesen wurden
  313 Zeichen Hülle.
- **Sicherung (Verwendung):** `lib/web-komponenten.ts` packt solche Attribute
  aus — im Browser-Lesen, in der Website-Prüfung und in der Wind-Kontaktsuche.

### 43. Eine Seite antwortet mit Serverfehler und liefert trotzdem alles
- **Anlass:** solarparc.de — jede Seite mit Status 500, voller Inhalt.
- **Sicherung (Verwendung):** Die Website-Prüfung nimmt den Inhalt eines
  5xx, wenn er eine echte Seite ist (mehr als 2.000 Zeichen Text).

### 44. Hausnummer nur als Anfang verglichen
- **Anlass:** 06.10.2026, gefunden beim Bau einer anderen Regel — Hausnummer
  „1" im Register passte auf „12" im Impressum, seit dem ersten Tag. Die erste
  Korrektur war zu streng und warf Spannen wie „12–16" hinaus (20 Zuordnungen,
  sofort an der Neubewertung sichtbar).
- **Sicherung (Verwendung):** Zifferngruppen tragen eine Grenze („12|16"); eine
  Nummer muss dort enden, wo die des Registers endet. Ein Impressum ganz ohne
  Hausnummer direkt vor der Postleitzahl belegt die Anschrift
  („Windmühlenberg, 24814 Sehestedt").

### 45. Eine Kanzlei als Postanschrift
- **Anlass:** 06.10.2026 — 42 Gesellschaften standen auf der Website einer
  Husumer Steuerberatung, weitere auf Wirtschaftsprüfern; eine Kanzlei führte je
  Windpark ein eigenes Postfach im Register.
- **Sicherung (Verwendung):** Auf der Seite eines Beraters (Steuerberater,
  Wirtschaftsprüfer, Anwalt, Notar, Treuhand — im Anbieterblock oder im
  Seitentitel) belegen weder Anschrift noch Registerpostfach; nur der eigene
  Name des Betreibers. 55 Zuordnungen zurückgenommen, in die Handprüfung.

### 46. Projektgesellschaften ohne eigene Spur
- **Anlass:** 06.10.2026 — Gesellschaften derselben Gruppe teilen Registeranschrift
  und Registerpostfach; eine davon ist belegt, die anderen nennt kein Impressum
  einzeln (ERG, ENERTRAG, EB-SIM, RWE). Die Handprüfung lehnte sie deshalb ab.
- **Sicherung (Verwendung):** Ein Schwesterbetreiber trägt die Website mit, wenn
  Registerpostfach UND Registeranschrift gleich sind und das Postfach auf genau
  der belegten Website liegt — nie über eine Schwester, die selbst nur über eine
  Schwester belegt ist. Entfällt der Beleg der Schwester, nimmt die Neubewertung
  zurück. Von Hand entschiedene Fälle werden einzeln ausgegeben, nicht gezählt.

### 47. Ein Postfach, das niemand als allgemein erkennt
- **Anlass:** 06.10.2026, Kontakt-Restliste — 14 Websites mit sichtbarem
  Postfach blieben ohne Kontakt: cs@, kundenservice@, info.berlin@, und ein
  Gratispostfach im eigenen Impressum (die Rohbewertung nennt es „fremd").
- **Sicherung (Verwendung):** Kundenservice- und Orts-Infopostfächer zählen als
  allgemein (nie ein Personenname); ein Gratispostfach im eigenen Impressum zählt
  als eigenes. Beides nur im Bestand, nicht in der geteilten Kontaktsuche
  (Klasse 38).

### 48. Ein Ort ohne Hausnummer, ein vertippter Umlaut
- **Anlass:** 06.10.2026 — das Register schreibt „Luymühle" ohne Nummer, das
  Impressum „Luyműhle 1"; fünf Gesellschaften blieben ohne Website.
- **Sicherung (Verwendung):** „ű/ő" falten wie „ü/ö"; eine Registeranschrift ohne
  Nummer passt auf die nummerierte im Impressum nur, wenn sie ein ORT ist (keine
  Straßen-Endung wie -straße, -weg, -platz) — eine Straße ohne Nummer passte auf
  jedes Haus darin.

### 49. Ein Wort, das zählt oder nennt, als Marke
- **Anlass:** 06.10.2026, Handprüfung — „Vierte Volkswind" fand die eigene
  Website nicht, weil „vierte" als Marke galt (nur erste bis dritte waren
  Gattungswörter); „Green City Energy" belegte die Seite des Green City e.V.,
  einer anderen Rechtsperson, über das Wort „city" in der Navigation.
- **Sicherung (Verwendung):** Ordnungszahlen jeder Form sind nie Marke; „city"
  ist ein Gattungswort. Vier Zuordnungen zurückgenommen, eine neu belegt.

### 50. Eine Himmelsrichtung als bloße Gattung abgeschnitten
- **Anlass:** 06.10.2026 — „Windpark Kattrepel-Nord" wurde über eine Seite zu
  „Kattrepel Erweiterung II" belegt, einem anderen Park: Beim Kürzen des Namens
  fiel das „Nord" als Gattungswort weg.
- **Sicherung (Verwendung):** Eine Himmelsrichtung am Namensende bleibt im
  Namenskern; als Marke bleibt sie Gattung.

### 51. Ausländische Postleitzahlen
- **Anlass:** 06.10.2026 — dänische, österreichische und Schweizer Betreiber
  haben vierstellige Postleitzahlen; die Anschriftsprüfung verlangte fünf und
  prüfte sie nie.
- **Sicherung (Verwendung):** Vier oder fünf Stellen, weiterhin nur direkt hinter
  Straße und Hausnummer.

### 52. Eine Handentscheidung, die nach einer Regeländerung niemand mehr ansieht
- **Anlass:** 06.10.2026 — die Neubewertung ließ von Hand übernommene Websites
  aus, um keine Entscheidung zu überschreiben. Damit blieben Fehlübernahmen
  (Klassen 49, 50) stehen, und niemand erfuhr davon. Ein erster Versuch über die
  gespeicherte Belegstelle meldete 70 Fehlalarme: Die Stelle ist ein Ausschnitt,
  bei Anschriften oft der falsche.
- **Sicherung (Verwendung):** Die Seite, auf der ein Mensch den Beleg fand, wird
  gespeichert; die Neubewertung hält die Handfälle mit derselben Regel dagegen
  und MELDET Abweichungen, ändert aber nichts. Fehlt die Seite, sagt sie „nicht
  nachprüfbar" mit Zahl.

### 53. Der Verwalter, den nur die Registerangaben verraten
- **Anlass:** 06.10.2026, fünf Prüfblöcke nacheinander — Windinvest, EFI Wind,
  Terrawatt, Brecht & Hanle, Cimbergy: Das Registerpostfach liegt auf der
  Domain, das Registertelefon steht in deren Impressum, aber das Impressum nennt
  weder Gesellschaft noch Anschrift.
- **Sicherung (Verwendung):** Postfach auf der Domain UND Telefon im eigenen
  Impressum belegen die Website — als eigene, schwächere Belegart, nur auf einer
  Seite mit Energiebezug, nie auf einer Beraterseite. Der erste Lauf zeigte drei
  Fehlgriffe, alle jetzt gesperrt: die branchenfremde Firma des Eigentümers
  (Spedition, IT, Personalberatung), und sechs Betreiber, deren Namens- oder
  Anschriftsbeleg verdrängt wurde — die neue Art steht deshalb im Rang unter
  jedem Beleg, der den Betreiber selbst nennt.

### 54. Hausnummernbereiche und Landschaftsnamen
- **Anlass:** 06.10.2026 — „Gartenstr. 28-30" im Impressum, „Gartenstraße 30"
  im Register; „Mittelholstein" als Marke belegte die Seite eines Anlagevermittlers.
- **Sicherung (Verwendung):** Ein Bereich bis 20 Nummern deckt die
  Einzelnummer, nur mit Postleitzahl dahinter; Landschaftsnamen sind keine Marke.

### 55. Eine Handübernahme überschreibt eine andere
- **Anlass:** 06.10.2026 — ein Sammellauf über die Domain eines Betriebsführers
  ersetzte die eigene Website eines Bürgerwindparks, die ein Prüfer Minuten
  vorher belegt hatte; ein erfolgloser Zweitversuch überschrieb den gespeicherten
  Beleg einer stehenden Website (Waabs, in der Vollständigkeitsprüfung als
  Verstoß aufgefallen).
- **Sicherung (Verwendung):** Eine belegte andere Website wird nur mit
  ausdrücklichem Ersetzen-Schalter ersetzt; ein erfolgloser Versuch auf die
  schon belegte Website ändert nichts. Nach einer Regeländerung zieht die
  Neubewertung auch eine geänderte Belegart auf derselben Website nach.

### 56. Durchwahl gegen Zentrale
- **Anlass:** 06.10.2026 — Register „04841 9813321", Impressum „04841 9813-0":
  dieselbe Firma, die Telefonregel (Klasse 53) verlangte die gleiche Nummer.
- **Sicherung (Verwendung):** Eine Nummer, die im Impressum ausdrücklich als
  Zentrale („-0") steht, deckt ihre Durchwahlen; eine bloß ähnliche Nummer nicht.

### 57. Eine Anschrift im Gewerbehof
- **Anlass:** 06.10.2026 — „Windkraft Rühenfeld" stand über die Anschrift auf der
  Seite eines Kunststoff-Spritzgießers, eines von sechs Unternehmen unter
  derselben Adresse.
- **Sicherung:** keine Maschinenregel — gemessen: Eine Sperre „Anschrift auf
  Seite ohne Energiebezug" träfe 121 Belege, die meisten echte Verwalter
  (Fondsgesellschaften, Banken, Ämter, Familienbetriebe). Stattdessen werden
  genau diese 121 von Hand gegengelesen; die Liste erzeugt eine Messung, die bei
  jedem Lauf wiederholbar ist (Anleitung, Schritt Gegenlesen).

### 58. Ein Beleg auf einer Unterdomain speichert die Hauptdomain
- **Anlass:** 06.10.2026 — Fahrengreth war über das Impressum von
  `buergerwindpark.suederdeich.de` belegt; gespeichert wurde `suederdeich.de`,
  und die leitet auf das Amt weiter. Die Kontaktsuche hätte die Gemeinde
  angeschrieben.
- **Sicherung (Verwendung):** Der Handbefehl übernimmt nicht, wenn die Belegseite
  auf einem anderen Host liegt als die gespeicherte Domain; nur mit einer
  ausdrücklichen Bestätigung, dass beide dieselbe Organisation sind (Konzern-
  Unterdomains wie `ee.thuega.de`). Test im Ablauf-Test, absichtlich
  ausgebaut und rot gesehen. Bestand gemessen: 43 Belege auf Unterdomains,
  zwei falsch (Fahrengreth), zurückgenommen.

### 59. Ein gewöhnliches Wort als Marke
- **Anlass:** 06.10.2026 — „Elements Betriebsgesellschaft" (Bassum) war über die
  Marke auf `elements.green` belegt, einer Frankfurter Gruppe ohne Bezug.
- **Sicherung:** keine Maschinenregel — eine Sperre gegen gewöhnliche Wörter
  bräuchte ein Wörterbuch, und gemessen sind von 42 Marken ohne Rückhalt über
  Registerpostfach oder Postleitzahl alle echte Firmengruppen. Stattdessen
  listet ein eigener Befehl genau diese Marken zum Gegenlesen (Anleitung,
  Schritt Gegenlesen); Elements ist zurückgenommen.

### Weitere, in ihren Beständen gesichert
Falsche Rollen (Ratsmitglieder, Hausmeister, Gebäudeverwaltung als Klimaschutz),
verschleierte Adressen, Adressen der Schlichtungsstelle oder Webagentur,
untaugliche Postfächer, Verwaltungen als Medien, ein Wert aus einem älteren
Lauf neben einem geprüften, kaputte Bytes in einem Stapel,
`decodeURIComponent` ohne Schutz — jeweils mit Tests in den Beständen
(`contact-municipal-judge`, `kreise-kontakte`, `kontakt-tauglichkeit`,
`presse-*`, `fachbetrieb-extrakt`, `adress-dekodierung-waechter`).
