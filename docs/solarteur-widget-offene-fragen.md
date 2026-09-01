# Solarteur-Widget: was vor dem Bauen entschieden sein muss

**Angelegt 28.08.2026.** Kein Konzept, sondern eine Merkliste — damit die Fragen nicht
beim Bauen nebenbei beantwortet werden. Das Feature ist nicht beauftragt; die Erhebung
der Fachbetriebe (`docs/fachbetriebe-quellen.md`) steht unabhängig davon.

## Das Modell, wie der Betreiber es beschrieben hat (28.08.2026)

Der Nutzer rechnet, **sieht sein Ergebnis**, und kann danach **selbst** eine Anfrage an
einen Fachbetrieb stellen. Der Betrieb bekommt also durchaus einen Lead — aber
**optional und nutzerinitiiert**, nach dem ehrlichen Ergebnis, nicht davor als Preis für
das Ergebnis.

**Das ist die Trennlinie zum ganzen Wettbewerb.** Enpal, Check24 und
solarcheck-deutschland.de verlangen die Adresse, BEVOR sie rechnen; das Ergebnis ist dort
der Köder. Bei uns ist das Ergebnis die Leistung und die Anfrage eine Möglichkeit
danach. Wer das Feature baut, darf diese Reihenfolge unter keinen Umständen umdrehen —
sie ist der Markenkern, nicht ein Detail der Bedienung.

**Was hier NICHT gemeint ist** (Klarstellung, weil es einmal vermischt wurde): Der
Wettbewerbsbefund fragt, ob ein Betrieb unser Widget auf SEINER Seite einbettet. Das ist
die Verteilungsfrage und ein anderer Fall. Hier geht es um den Angebotsteil am Ende
UNSERES Rechners.

## Voraussetzung, die vor dem Livegang erledigt sein muss

**Die Werbeaussage muss geändert werden, bevor der erste Kontakt fließt.**
„Keine Lead-Erfassung · Kein Vertriebskontakt" steht an vierzehn Stellen im Code und in
der Datenschutzerklärung, also als Werbeaussage nach § 5 UWG auf jeder Seite der Site.
Sobald wir Kontaktdaten weiterreichen, ist der Satz falsch — und eine Zusage, die der
eigene Code widerlegt, ist genau die Fehlerklasse, die der Trust-Leisten-Audit vom
17.08.2026 dreimal gefunden hat.

Der Betreiber hat den Zeitpunkt festgelegt (28.08.2026): **zusammen mit den ersten
Kontakten**, nicht vorher auf Verdacht — erst muss ein Solarteur überhaupt bereit sein
mitzumachen.

Vorschlag für die neue Fassung, noch nicht abgenommen: aus „keine Lead-Erfassung" wird
„wir geben nichts weiter, außer du bittest uns darum". Das ist stärker als das alte
Versprechen, weil es die Kontrolle beim Nutzer benennt statt nur eine Abwesenheit zu
behaupten. Betroffen sind neben der Vertrauens-Leiste auch Seitentitel, OG-Untertitel
und Beschreibungen — dort überlebt eine alte Fassung erfahrungsgemäß unbemerkt.

## Die zwei Fragen, die dem Betreiber gehören

Beide am 28.08.2026 gestellt und **bewusst offen gelassen** („das ist nicht mal nebenher
passiert"):

1. **Nehmen wir Geld je Anfrage?** Das entscheidet, ob es Lead-Vermittlung im Wortsinn
   ist — mit allem, was daran hängt: Gewerbe, Umsatzsteuer, und vor allem die Frage, ob
   die Reihenfolge der angezeigten Betriebe dann noch neutral sein kann. Ein bezahlter
   Platz in einer Empfehlungsliste ist kennzeichnungspflichtig (§ 5a Abs. 4 UWG,
   Werbekennzeichnung), und eine Rangfolge nach Provision widerspricht allem, wofür die
   Seite steht.
2. **Darf der Betrieb den Kontakt behalten, wenn nichts daraus wird?** Also: einmalige
   Anfrage oder dauerhafter Datensatz beim Betrieb. Das ist die Frage, die für den
   Nutzer den Unterschied zwischen „eine Anfrage" und „meine Daten sind jetzt im Markt"
   ausmacht — und sie muss beantwortet sein, bevor irgendwo ein Absendeknopf steht.

## Was rechtlich noch dazugehört und noch niemand geprüft hat

- **Einwilligung des Nutzers** zur Weitergabe — ausdrücklich, zweckgebunden, nicht
  vorangekreuzt. Die Datenschutzerklärung kennt diese Verarbeitung heute nicht.
- **Auftragsverarbeitung oder Weitergabe an einen eigenen Verantwortlichen?** Die
  Antwort hängt an Frage 2 oben und bestimmt, welcher Vertrag nötig ist.
- **Die Fachbetriebs-Daten selbst** sind heute rein intern erhoben. Sie öffentlich
  auszuspielen ist eine eigene Frage (Art. 14 DSGVO gegenüber den Betrieben, und bei
  Einzelunternehmern sind es personenbezogene Daten).
- Zwei Legal-Judges, wie bei jeder Rechtsfrage in diesem Projekt — nicht der Betreiber.

## Was die Erhebung dafür schon liefert

3.098 regionale Betriebe mit Gemeindeschlüssel, also zum Standort des Nutzers passend.
Trust-Signale je Betrieb mit Beleg. Kontaktweg bei 85 %. Was fehlt, steht in der
Quellen-Datei; ein Vermittlungsweg ist bewusst nicht gebaut.
