# Monatsupdate: zwei Stufen, 1. und 8. des Monats

Entschieden mit dem Betreiber am 06.10.2026. Das Monatsupdate ist der feste
Termin, an dem künftig auch Neuigkeiten (Abo-Meldungen, Social) und ein
Monatsrückblick hängen. Es läuft in zwei Stufen, weil die beiden Datenquellen
verschieden schnell sind.

| Stufe | Termin | Braucht | Liefert |
|---|---|---|---|
| 1 — Register | 1. (Ersatz 2./3.) | Gesamtdatenexport des 1. | Zubau des Vormonats, Bestand, Ranglisten, Förderstand — alles ohne Wetter; Anlass für Neuigkeiten und Rückblick |
| 2 — Wetter | 8. (Ersatz 10./12.) | ERA5 des Vormonats vollständig | Monatsdiagramme Sonnenstrom/Ertrag/Stromwert des Vormonats |

## Warum nicht alles am 1.

Das ERA5-Archiv liegt rund fünf Tage zurück. Am 06.10.2026 fehlten noch die
letzten Septemberstunden (Block ohne Werte, `era5:sync --month=2026-09` brach ab).

**Gemessen und verworfen: ICON-D2 als schnellere Quelle** (06.10.2026, 25 Orte,
Tagessummen der Globalstrahlung, ICON-D2 direkt+diffus gegen ERA5 shortwave,
beide aus dem offenen Open-Meteo-Archiv):

| Monat | Abweichung Monatssumme, Mittel | Spanne je Ort | Tagesabweichung typisch |
|---|---|---|---|
| 2026-02 | −8,4 % | −18,3 … +0,8 % | 18–46 % |
| 2026-06 | −3,2 % | −7,2 … +3,5 % | 12–22 % |
| 2026-08 | −3,2 % | −6,2 … +2,8 % | 11–20 % |

Die Abweichung schwankt nach Jahreszeit und Ort und lässt sich nicht mit einem
festen Faktor herausrechnen. Ein Monat aus anderer Quelle als alle früheren
wäre im Diagramm ein Methodenbruch, den man dem Bild nicht ansieht.

**Selbst aufzeichnen hilft nicht:** Unsere stündlichen Wetter-Schnappschüsse
stammen aus genau diesem ICON-D2-Modell (und werden überschrieben, nicht
archiviert). Echte Messungen gäbe es an DWD-Stationen (Folgetag), aber nur
punktuell; je Gemeinde müsste interpoliert werden — ungeprüft, wieder eine
andere Methode.

## Stand der Umsetzung

- **Register-Import** läuft bereits am 1./3./5. (`.github/workflows/mastr-refresh.yml`,
  `lib/mastr-import-plan.ts`).
- **Monatslauf** (`scripts/gemeinde-monatslauf.ts`) baut heute beides in einem
  Lauf und bricht ab, wenn das Wetter des Vormonats fehlt. Geplanter Auftrag
  `solar-check-gemeinde-monatslauf` (lokal, 8./10./12.) startet ihn.
- **Offen — Stufe 1 als eigener Lauf.** Hürde: Die Euro-Bewertung der Pakete
  (`baseline.values[LETZTER_MONAT]` in `scripts/gemeinde-paket.ts`) hängt am
  Wetter des jüngsten Monats. Ohne Wetter fiele sie für ALLE Monate weg — ein
  Paket der Stufe 1 wäre schlechter als das des Vormonats. Stufe 1 muss deshalb
  entweder die Monitor-Zeiträume des bisherigen Pakets übernehmen oder die
  Bewertung vom jüngsten Monat entkoppeln.
- **Offen — Neuigkeiten und Rückblick** hängen an Stufe 1; Abo-Versand nur für
  freigegebene Meldungsarten (`ABO_MAIL_FREIGEGEBEN`).
