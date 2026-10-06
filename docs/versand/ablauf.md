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
- **Ob die Charge die richtige Auswahl ist** (z. B. nur Orte mit Platzierung).

## Vorbereitung (Tage vorher)

Was heute einen halben Tag gekostet hat, gehört hier hin — nicht in den Versandtag.

**T−3 oder früher: Auswahl festschreiben**
- Schub in `lib/kommunen-testballon.ts` anlegen (Länder, Kreise, Grund, `abIso`).
- Ferien prüfen, auch den **Ferienbeginn in den nächsten zehn Tagen**
  (`npm run kommunen:luecken -- --tag=<versandtag>`). Wer kurz vor den Ferien
  ankommt, wird nicht mehr gelesen.
- Chargen festlegen und `npm run kommunen:versand -- --liste --schub=… --charge=…`
  ansehen. **Nur Orte mit Platzierung** gehen mit dem Pressebrief; Orte ohne
  Platzierung bekommen einen eigenen, kürzeren Brief (Daten liegen bereit, alles
  auf der Ortsseite, dazu das Kommunen-Angebot). Der ist eine eigene Entscheidung,
  nicht ein Nebenprodukt.

**T−2: Empfänger klären**
- Kontaktsuche für die Charge laufen lassen; Reihenfolge Klimaschutz → Pressekontakt
  → Pressepostfach → allgemeines Postfach. Fachpostfächer (Tourismus, Bauamt, …)
  nur, wenn es gar kein anderes gibt; Sekretariat nur als Rückfall.
- **Anreden mit Namen** nur, wo die Belegseite den Namen nennt; in
  `kommunen_anrede` ablegen (Name gehört gespeichert, nicht im Brief erfunden).
- `--pruefen` einmal laufen lassen: Wer hier schon an der Kontaktprüfung scheitert,
  wird jetzt nachgesucht, nicht am Versandtag.

**T−1: Szenen und Text**
- Gemeindeschlüssel der Charge an die Szenen-Sitzung (`--liste`). Sie meldet
  zurück: live UND im Bild angesehen (Windräder vollständig, Start im Ortskern).
  Orte mit fehlerhafter Szene gehen in die Warte-Charge, nicht mit.
- Brieftext-Änderungen **vor** der Vorschau deployen; die Briefe entstehen in der
  Produktion. Vorschau immer mit ausdrücklichem `--schub`.
- Zwei Beispielbriefe im Chat zeigen (mit und ohne Szene). Dabei selbst lesen: steht
  etwas doppelt, widerspricht der Aufhänger dem Satz darunter, steht ein Loch drin?
  Abgenommene Textregeln (nicht neu aufmachen):
  „kostenfrei" genau einmal · „Datenstories" · kein Widget-Link · „monatlich" nur
  einmal · Überschrift der Meldung darf dem Betreff gleichen · zweisprachige Namen
  im Betreff nur deutsch · kein Kreisname im Betreff (Zeichenbudget) · weitere
  Platzierungen erst ab Gruppen mit zehn Orten · Prozentrang statt schwachem Platz
  („unter den besten 5 %") · 3D-Satz nur bei veröffentlichter Szene.

**T−0: Versandtag** — nur noch Vorflug, Probemails, Go, Senden (unten).

## Reihenfolge am Versandtag

1. Szenen-Sitzung hat bestätigt (siehe T−1); Brieftext ist live.
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
