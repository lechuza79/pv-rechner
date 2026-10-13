# Newsletter-Messung

Vorhandene Quellen: `aussendungen` für Versandannahmen, Vercel Web Analytics für Website-Ereignisse. Keine zweite Zählertabelle, keine Personenprofile, keine Öffnungspixel und keine Weiterleitungen.

## Versand

Die JSON-Zeilen des vorhandenen `scripts/aussendung.ts` erhalten optional `newsletter: {campaign: "september-2026", variant: "kommunal"}` (oder `allgemein`). Die HTML-Anker für Bild und Ortsbutton werden mit `data-newsletter-link="bild"` bzw. `"ort"` markiert. Der Versandlauf kennzeichnet diese Links, erhält Modal/Monat/Autoplay und schreibt den festen Schub `newsletter:<campaign>:<variant>` ins vorhandene Protokoll. Andere Links bleiben unverändert. Testzielgruppe `test` erzeugt `nl_test=1`; diese Aufrufe zählen nicht. Ohne das optionale Feld bleibt der bisherige Versand unverändert.

Neue Aussendungen werden vorab im festen Katalog `lib/newsletter-metrics.ts` ergänzt. Keine Empfängerkennung oder Ortskennung in diesen Katalog aufnehmen. Unterschiedliche echte Aussendungen benötigen unterschiedliche Katalogeinträge.

## Auswertung

`npm run newsletter:auswertung -- september-2026` liest beide Quellen frisch. Ein fehlender Zugang oder eine kaputte Antwort ist ein Fehler, keine Null. Es werden keine Mailadressen ausgegeben. Testversand zählt nicht zu den Versandannahmen.

- Bild/Button: Ankunft auf der Atlas-Seite, soweit das Messskript geladen wird; kein Beweis für jeden Klick in der Mail.
- Start: Monatswiedergabe im geöffneten Dialog läuft wirklich, mit passendem Monat. Einmal je Seitenladung, nicht bei jedem Frame oder Neustart.
- Versandannahme: Mailserver hat angenommen, nicht nachgewiesene Posteingangszustellung.

Mehrfachaufrufe, Weiterleitungen und automatische Linkprüfungen können die Summen erhöhen; blockierte Messung senkt sie. Keine eindeutigen Personen, keine personenbezogene Conversion, keine nachträgliche Messung alter Testmails.
