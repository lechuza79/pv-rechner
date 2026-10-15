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

**Lücken im Archiv füllt Copernicus** (seit 08.10.2026). Am 08.10. fehlte im
Archiv der ganze 25.09.2026, obwohl es bis 03.10. reichte
(open-meteo/open-meteo#2183). Fehlt ein ganzer Tag in allen Zellen und ist
`CDSAPI_KEY` gesetzt, holt der Wetterlauf ihn aus dem Copernicus CDS — vorher
vergleicht er einen Nachbartag, den beide haben (gemessen: höchstens 0,025 K
bzw. 0,5 W/m², die Speicherrundung des Archivs). Ohne Schlüssel bricht er wie
bisher ab. Lizenz CC BY 4.0 laut CDS-Katalog. Das Konto gehört dem Betreiber.

## Stand der Umsetzung

- **Register-Import** läuft bereits am 1./3./5. (`.github/workflows/mastr-refresh.yml`,
  `lib/mastr-import-plan.ts`).
- **Monatslauf** (`scripts/gemeinde-monatslauf.ts`) baut heute beides in einem
  Lauf und bricht ab, wenn das Wetter des Vormonats fehlt. Geplanter Auftrag
  `solar-check-gemeinde-monatslauf` (lokal, 8./10./12.) startet ihn.
- **Stufe 1 gebaut (08.10.2026):** `gemeinde-monatslauf.ts --los --stufe=register`
  baut alle Pakete aus dem neuen Export mit dem Wettermonat einen Schritt
  zurück (Story-Vorbereitung über `STORY_WETTER_MONAT`, Pakete über `--monat`).
  Getestet an München: „303 neue Solaranlagen im September“, Monatsdiagramme
  und Euro-Werte bis August. Die Vorbereitung hält nur den Wert des
  Wettermonats; der Wechsel auf Stufe 2 stellt die Zahlen exakt her.
  Eigene Fertig-Zeile („✓ Register-Stufe fertig.“), damit Stufe 2 sich nicht
  für erledigt hält. Auftrag `solar-check-monatslauf-register` (1./3./5.).
- **Offen — Neuigkeiten und Rückblick** hängen an Stufe 1; Abo-Versand nur für
  freigegebene Meldungsarten (`ABO_MAIL_FREIGEGEBEN`).
