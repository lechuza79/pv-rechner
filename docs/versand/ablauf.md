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

## Reihenfolge am Versandtag

1. Szenen-Sitzung hat die Szenen der Charge bestätigt; Brieftext ist live.
2. Vorflug. Bei `NICHT BEREIT`: beheben, Vorflug wiederholen.
3. Je eine Probemail pro Briefvariante an den Betreiber (`--test=<adresse> --ags=<schlüssel>`):
   mit und ohne Szene. In Gmail `dkim=pass`, `spf=pass`, `dmarc=pass` nachsehen.
4. Go des Betreibers, dann `--senden`.
5. Zurückgehaltene Orte (z. B. Szene fehlerhaft) in eine Warte-Charge (9)
   verschieben, nicht im Kopf behalten. Zurück in die Charge, sobald behoben.

## Fallen, die schon passiert sind

- **DKIM-Selektor wird von All-Inkl rotiert** (20.09.2026: `kas202603240809` →
  `kas202609200150`). Der alte Eintrag verschwindet, ein Wildcard-Eintrag antwortet
  trotzdem auf jeden Namen. Neuer Name: KAS → Tools → DNS-Einstellungen →
  solar-check.io, TXT-Eintrag auf `._domainkey`. Oben in `BEKANNTE_DKIM_SELEKTOREN`
  (Versandskript) eintragen.
- **Herkunftswerte, die die Briefvorlage nicht kennt**, wurden als „undefined"
  gerendert (Prozessnamen statt Seitentyp in der Herkunftsspalte). Seitdem fällt der
  Brief auf „Website von …" zurück, und die Platzhalter-Bremse hält jeden Brief mit
  einem Loch zurück.
- **Kontaktprüfung kann zwischen Vorflug und Versand kippen** (06.10.: drei Adressen
  zehn Minuten später „nicht mehr auf der Seite"). Der Versand hält sie dann zurück;
  danach nachsehen, ob die Adresse wirklich weg ist.
- **Commit-Prüfungen laufen unter Last ins Zeitlimit** (Szenen-Tests). Last vorher
  messen; schwere Tests tragen ein eigenes Zeitlimit.
