# Inhalts-Inventur, 25.08.2026

Einmalige Durchsicht des gesamten Bestands vor dem Beginn regelmäßiger
LinkedIn-Beiträge. Ab da lesen Fachleute und abmahnbefugte Mitbewerber mit.

**Die Frage war nicht Aktualität** — das leisten die Wächter, der Prüfstand war
durchgehend grün — **sondern Beleg:** Hat jede Aussage überhaupt eine Quelle,
und stimmt sie mit ihr überein?

## Der Anlass, und warum er ein guter war

Eine Session meldete am 24.08.2026, über 30 kWp fehle im PV-Rechner die
Umsatzsteuer. Klang plausibel, war falsch: Das Gesetz macht aus der 30-kW-Marke
eine Vermutungsregel, keine Sperre. Aufgefallen ist es nur, weil der Betreiber
nachfragte.

Die Inventur hat den Fehler dann doch gefunden — an einer anderen Stelle. Im
Fördercheck war die Marke tatsächlich als Sperre verbaut, zusätzlich mit der
Gebäudeart UND-verknüpft, obwohl beides Alternativen sind. Zwei falsche
Auskünfte, beide zulasten des Nutzers. Ein Test hielt den Fehler fest, weil er
ihn mit sich selbst verglich.

## Methode

Neun Prüfer parallel, je ein Themengebiet. Jede Rechtsaussage danach von einem
zweiten Prüfer angegriffen, dessen Auftrag lautete zu **widerlegen**, nicht zu
bestätigen.

**Das hat sich gelohnt: acht Befunde haben die Gegenprüfung nicht überlebt** —
knapp ein Fünftel aller Rechtsbefunde.
Der lehrreichste: Ein Prüfer wollte eine Aussage über den Primärenergie-Vergleich
bei Neubauten streichen, weil sie unbelegt sei. Der Gegenprüfer zeigte, dass sie
belastbar und sogar konservativ ist — die Streichung wäre der Fehler gewesen.
Ein anderer meldete zwei Ministeriums-Zitate als nicht auffindbar; sie standen
wörtlich dort, er hatte auf der falschen Seite gesucht und war einer Bot-Sperre
aufgesessen — genau der Falle, vor der die betroffene Datei selbst warnt.

**Ohne Gegenprüfung hätte diese Inventur richtige Aussagen gelöscht.**

## Was gefunden wurde

Geprüft: 303 Rechtsstellen, 78 FAQ-Antworten, 10 Ratgeber, 30 Glossarbegriffe,
13 Datenquellen.

Drei Sorten Fehler, in dieser Reihenfolge nach Schaden:

1. **Falsche Auskunft mit Geldfolge** — die Steuer-Sperre im Fördercheck, die
   fehlende Gas-Etagenheizung beim Klimabonus (16 Prozentpunkte), die zu weite
   Ausnahme vom Einspeisedeckel des Entwurfs.
2. **Aussagen, die der eigene Code oder das eigene Gesetz widerlegt** — „wird
   nirgends gespeichert" auf jeder Seite neben einer Speicherfunktion, „alle
   Werte editierbar" auf zwei Seiten, „kein Limit" neben einer Abrufgrenze, eine
   Registerbehauptung, die ein Klick widerlegt.
3. **Fundstellen aus überholten Fassungen** — die zahlenmäßig größte Gruppe und
   die harmloseste: Paragraf und Seitenzahl stimmten nicht mehr, die Aussage
   schon.

**Bemerkenswert:** Das Projekt hatte 1992 grüne Tests, während all das live
stand. Ein Test prüft nur, was jemand vorher als Frage formuliert hat.

## Der Wächter mit dem lehrreichsten Versagen

Ein bestehender Browser-Test verbot den Satz „Alle Werte im Ergebnis editierbar".
Auf der Seite stand „Alle Werte **sind Näherungen und** im Ergebnis editierbar".
Vier Wörter dazwischen, Muster verfehlt, Test grün, Falschaussage live — und der
Kommentar desselben Tests warnt ausdrücklich davor, auf Wortlaut statt auf
Aussage zu prüfen.

## Was bleibt

`lib/rechtsbelege.ts` führt jede Vorschrift, die ein Nutzer zu sehen bekommt:
Fundstelle mit Absatz, Tag der Lesung im Original, Pfad zum Volltext.
`lib/__tests__/rechtsbelege.test.ts` macht daraus eine Pflicht — er wird rot bei
einer unbelegten Vorschrift, bei einem Paragrafen ohne sein Gesetz, bei einem
Volltext-Pfad, der ins Leere zeigt, bei einem Entwurf ohne Vorbehalt und bei
einer abgelaufenen Belegschuld.

**Der Test wurde absichtlich kaputtgemacht, um ihn zu prüfen** — und fand dabei
einen echten Konstruktionsfehler in sich selbst: Weil das Register unter `lib/`
liegt, zählten seine eigenen Einträge als Nennung; er belegte sich selbst.

Neun Vorschriften stehen offen als Belegschuld mit Frist statt stillschweigend zu
fehlen. Die EEG-2009-Fundstellen sind derzeit nicht beschaffbar — das Gesetz ist
nicht mehr abrufbar und liegt nicht im Repo.

Damit stimmt der Satz „ab jetzt nur noch Aktualität und Neues" — vorher wäre der
ungeprüfte Bestand einfach weitergewachsen.

## Offene Entscheidungen (gehören dem Betreiber)

- **Speicher-Empfehlung gegen FAQ:** Die FAQ nennt „5–10 kWh typisch für ein
  Einfamilienhaus", das Empfehlungs-Werkzeug gibt demselben Haushalt 0 kWh, weil
  es den Speicher an den Jahresverbrauch koppelt. Eines von beidem muss weichen.
- **Der Bußgeldrahmen im Balkon-Ratgeber:** Das Projekt hat die Zahl bewusst aus
  dem Kurzsatz verbannt, im ausführlichen Absatz steht sie mit Einordnung. Der
  Test schützt nur die eine Stelle. Regel ausweiten oder bewusst zweiteilen.
- **Ein kommunales Förderprogramm** (Potsdam, 2.000 € pauschal für Wärmepumpen)
  fehlt im Katalog. Der Betrag wäre rechenbar, seine Bedingungen (Ökostrom-
  Pflicht, Erstwohnsitz, Beratung vorab, Jahresdeckel) kann das Modell nicht
  ausdrücken.


## Die widerlegten Befunde, weil sie am meisten lehren

Acht Befunde hielten der Gegenprüfung nicht stand. Vier davon hätte ich ohne sie
„korrigiert" — und dabei richtige Angaben durch falsche ersetzt:

1. **Primärenergie-Vergleich im Neubau.** Als unbelegt gemeldet, tatsächlich
   belastbar und sogar konservativ formuliert.
2. **Der Anteil negativer Börsenpreise.** Als überzeichnet gemeldet („eher 16 %").
   Die 24 % stimmen — die 16 % entstehen nur mit verschobenem Nenner, und die
   Herleitung stand zwei Bildschirmseiten über der beanstandeten Zahl.
3. **Die Autarkie-Spanne.** Der Prüfer rechnete mit einem günstigen Fall und
   hielt ihn für den typischen. Der Nachbarsatz traf die Simulation punktgenau —
   beide stammen erkennbar aus derselben Betrachtung.
4. **Der Vergleich der Netzausfallzeiten.** Hier wäre die „Korrektur" der
   schlimmere Fehler gewesen: Der vorgeschlagene Ersatzwert misst mit
   Wirbelstürmen, unser deutscher Wert ohne höhere Gewalt. Faktor 57 statt der
   ehrlichen 11.
5. **Zwei Ministeriums-Zitate**, als nicht auffindbar gemeldet. Sie standen
   wörtlich dort; der Prüfer hatte auf der falschen Seite gesucht und war einer
   Bot-Sperre aufgesessen — genau der Falle, vor der die betroffene Datei in
   ihrem eigenen Kommentar warnt.

**Das Muster:** Ein Prüfer, der viele echte Fehler findet, wird beim nächsten
Befund mutiger, nicht vorsichtiger. Und beim Bestätigen sieht er weniger genau
hin als beim Beanstanden — mehrere Fehler fand erst der Gegenprüfer in dem, was
der erste abgehakt hatte.
