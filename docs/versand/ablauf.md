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

## Reihenfolge

1. Szenen-Sitzung bekommt die Gemeindeschlüssel der Charge **am Vortag**
   (`--liste`), damit Szenen live sind, bevor die Briefe gebaut werden.
2. Briefänderungen deployen. Die Briefe entstehen in der Produktion — ein Fix, der
   nicht live ist, steht nicht im Brief.
3. Vorflug. Bei `NICHT BEREIT`: beheben, Vorflug wiederholen.
4. Je eine Probemail pro Briefvariante an den Betreiber (`--test=<adresse> --ags=<schlüssel>`):
   mit und ohne Szene. In Gmail `dkim=pass`, `spf=pass`, `dmarc=pass` nachsehen.
5. Go des Betreibers, dann `--senden`.
6. Zurückgehaltene Orte (z. B. Szene fehlerhaft) in eine Warte-Charge (9)
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
