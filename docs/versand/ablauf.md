# Ablauf eines Kommunen-Versands

Stand 06.10.2026. Geschrieben nach Charge 1 von `kreise-2026-10`: Der Betreiber
fragte rund zehnmal „ist alles bereit?", geprüft waren nur Links und Texte. Beim
Senden stoppte der Lauf am umbenannten DKIM-Schlüssel; vorher waren schon 31 Briefe
mit „undefined" aufgefallen. Ein halber Tag für etwas, das ein Befehl in zwei
Minuten sagt.

## Die Regel

**„Bereit" sagt nur der Vorflug, nie ein Gefühl.**

```bash
npm run kommunen:versand -- --pruefen --schub=<schub> --charge=<n>
```

Er läuft jede Bremse des echten Versands einmal durch, ohne zu senden, und endet
mit `BEREIT` oder `NICHT BEREIT`:

- Versandtag (Di–Do) und Ferien des Ziel-Bundeslands
- DKIM-Schlüssel veröffentlicht (Selektor aus dem Code, siehe unten)
- Kontaktprüfung je Empfänger: Adresse steht noch auf ihrer Fundstelle
- Brief-Bremsen je Brief: Pflichtangaben, Postfach-Befund, **leere Platzhalter**
  („undefined", „NaN", „[object Object]", …)
- jeder Link im Brief einmal aufgerufen (wärmt zugleich die kalten Seiten)
- Anzahl Briefe mit 3D-Szene, die ohne werden namentlich genannt (Information)

Was der Vorflug NICHT sieht und deshalb vor dem Go einzeln geklärt wird:
- **Inhalt der Szenen** (Windräder ohne Rotor, Startpunkt außerhalb des Ortskerns).
  Das bestätigt die Szenen-Sitzung, nicht der Vorflug.
- **Ob die Briefarten des Schubs stimmen** — die legt der Schub fest, der Vorflug zählt sie.

## Entscheidungen stehen im Code, nicht hier

Was entschieden ist, steht als Prüfung im Code und meldet sich im Vorflug — nicht
als Liste in diesem Dokument und nicht im Gesprächsverlauf (dort ging der Kurzbrief
für Orte ohne Platzierung am 05./06.10.2026 beim Zusammenfassen verloren).

- **Welcher Brief:** mit Platzierung der Pressebrief, ohne Platzierung der
  Kurzbrief (Ortsseite, drei Angebote, Kommunen-Seite, keine Zahl). Welche
  Briefarten ein Schub verschickt, steht am Schub (`briefarten`). Orte, für die
  der Schub keine Briefart festlegt, machen den Vorflug NICHT BEREIT.
- **Textregeln** („kostenfrei" einmal, 3D-Satz nur mit Szene, kein Widget-Link …)
  sind Tests an den Briefvorlagen. Neue Regel = neuer Test, kein neuer Spiegelstrich.
- **Vor einer Rückfrage an den Betreiber:** Code, Schub-Definition und frühere
  Sitzungen durchsuchen. Das ist die Notbremse, nicht das System.

## Vorbereitung am Vortag (seit 14.10.2026)

Am Versandtag wird nur noch gezogen, geprüft und gesendet. Alles, was dauert,
liegt davor:

1. **Szenen auf Vorrat.** Die Szenen-Sitzung baut die nächsten Schübe im Voraus,
   ganze Kreise, und meldet jeden fertigen Kreis. Gezogen wird nur, was eine
   veröffentlichte Szene hat; Orte ohne Szene (Geländelücken, eingemeindete Orte)
   fallen von selbst heraus.
2. **Adressen vorab prüfen:** `npm run kommunen:kontakte-vorab -- <schub>` läuft die
   Kontaktprüfung des Versands für jeden offenen Ort, mit oder ohne Szene. Was
   durchfällt, wird belegt (Impressum, Amtsseite mit Mitgliederliste) und mit
   `scripts/kommunen-handbelege-eintragen.ts` eingetragen. Amtspostfächer brauchen
   den Beleg, dass der Ort zum Amt gehört (verwaltung_domain).
3. **Tageslimit ist `MAX_JE_LAUF` (250), nicht 100.** Ein Schub, der darunter
   bleibt, geht an einem Tag raus.

## Reihenfolge am Versandtag

1. Szenen-Sitzung hat die Szenen der Charge bestätigt; Brieftext ist live.
2. Vorflug. Bei `NICHT BEREIT`: beheben, Vorflug wiederholen.
3. Je eine Probemail pro Briefvariante an den Betreiber (`--test=<adresse> --ags=<schlüssel>`):
   mit und ohne Szene. In Gmail `dkim=pass`, `spf=pass`, `dmarc=pass` nachsehen.
4. Go des Betreibers, dann `--senden`.
5. Zurückgehaltene Orte (z. B. Szene fehlerhaft) in eine Warte-Charge (9)
   verschieben, nicht im Kopf behalten. Zurück in die Charge, sobald behoben.

## Briefarten

- Pressebrief (mit Platzierung), Kurzbrief (ohne Platzierung) und **Sammelbrief**:
  Teilen sich mehrere Orte eines Schubs ein Postfach (Amt, Verbandsgemeinde),
  bildet das Versandpaket daraus EINEN Brief mit allen Orten, ihrer Seite und
  ihrer Platzierung (Betreiber, 14.10.2026). Der Versand markiert alle Orte.
- Ein Ranglisten-Link führt auf die Seite, auf der der Ort steht (ab Platz 201
  Seite 2 usw.).

## Fallen, die schon passiert sind

- **Freigabeliste für Google über 1.000 Orte** (14.10.2026): Die Liste las mit
  einer festen Obergrenze; ab dem 1.001. angeschriebenen Ort blieben zufällige
  Ortsseiten auf noindex. Jetzt seitenweise. Der Versand prüft danach jede
  verlinkte Seite einzeln und meldet, was gesperrt bleibt.
- **Szenen-Sitzung über Nacht stehengeblieben** (13./14.10.2026): Prozessende
  beendete ihre Hintergrundläufe, der Speicher auf dem Server lief voll. Morgens
  zuerst messen, wie viele Orte des Schubs eine Szene haben, nicht der Zusage
  glauben.

- **DKIM-Selektor wird von All-Inkl rotiert** (20.09.2026: `kas202603240809` →
  `kas202609200150`). Der alte Eintrag verschwindet, ein Wildcard-Eintrag antwortet
  trotzdem auf jeden Namen. Neuer Name: KAS → Tools → DNS-Einstellungen →
  solar-check.io, TXT-Eintrag auf `._domainkey`. Oben in `BEKANNTE_DKIM_SELEKTOREN`
  (`lib/outreach-dkim.ts`, gilt für jeden Versandlauf) eintragen.
- **Herkunftswerte, die die Briefvorlage nicht kennt**, wurden als „undefined"
  gerendert (Prozessnamen statt Seitentyp in der Herkunftsspalte). Seitdem fällt der
  Brief auf „Website von …" zurück, und die Platzhalter-Bremse hält jeden Brief mit
  einem Loch zurück.
- **Kontaktprüfung kann zwischen Vorflug und Versand kippen** (06.10.: drei Adressen
  zehn Minuten später „nicht mehr auf der Seite"). Der Versand hält sie dann zurück;
  danach nachsehen, ob die Adresse wirklich weg ist.
- **Commit-Prüfungen laufen unter Last ins Zeitlimit** (Szenen-Tests). Last vorher
  messen; schwere Tests tragen ein eigenes Zeitlimit.
