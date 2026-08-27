# Analytics-Events (Vercel Web Analytics)

Cookiefreie Custom Events über `lib/analytics.ts → trackEvent()`. Alle Events
sind anonym und aggregiert — **keine personenbezogenen Daten, keine PLZ, keine
Freitext-Eingaben.** Datenschutz-Grundlage: Abschnitt 5 in
`app/(site)/datenschutz/page.tsx`.

Daten laufen erst nach Deploy auf Vercel ein (nicht auf localhost — dort nur
Debug-Log in der Browser-Konsole) und nur wenn Web Analytics im Vercel-Dashboard
für das Projekt aktiviert ist.

## Aktive Events

### PV-Rechner-Trichter (`app/(site)/photovoltaik-rechner/rechner.tsx`)
Feuern nur beim Vorwärtsgehen im direkten Flow (Share-/Empfehlungs-Aufrufe
landen per URL direkt auf dem Ergebnis, nicht über `next()`).

| Event | Bedeutung |
|---|---|
| `pv_schritt_speicher` | Schritt „Batteriespeicher" erreicht |
| `pv_schritt_haushalt` | Schritt „Dein Haushalt" erreicht |
| `pv_schritt_verbraucher` | Schritt „Großverbraucher" erreicht |
| `pv_ergebnis` | Ergebnis erreicht (mit Eigenschaften, s. u.) |

Abbruch-Treppe im Dashboard: Seitenaufrufe `/photovoltaik-rechner` (Pages) →
`pv_schritt_speicher` → `_haushalt` → `_verbraucher` → `pv_ergebnis`.

### PV-Rechner-Aktionen
| Event | Auslöser |
|---|---|
| `pv_geteilt` | Ergebnis-Link geteilt (Kopieren / Native Share / WhatsApp) |
| `pv_gespeichert` | Berechnung im Konto gespeichert (nach erfolgreichem Save) |
| `pv_methodik` | „Methodik"-Link aus dem Ergebnis geöffnet |

### Herkunft aus dem Kommunen-Outreach
| Event | Auslöser |
|---|---|
| `brief_aufruf` | Seitenaufruf mit der Herkunftskennung der Outreach-Briefe |

Trägt eine Eigenschaft `weg`: `direkt` (jemand hat in der Mail selbst geklickt —
ein Mail-Klick kommt ohne Verweis an) oder `verweis` (die Gemeinde hat unsere
Meldung veröffentlicht, jemand kam über ihre Website). WELCHE Gemeinde das war,
steht in der gewöhnlichen Verweis-Liste und wird hier bewusst nicht wiederholt.

Warum als eigenes Ereignis und nicht über Vercels Kampagnen-Auswertung: Die ist
ein Zusatzpaket (10 $/Monat auf Pro, Stand 27.08.2026), ohne das Vercel Seiten
ohne Abfrageteil zusammenfasst — der Parameter liefe ins Leere. Kennung,
Rechtslage und die Grenze zu unzulässigen Ausprägungen: `lib/brief-herkunft.ts`.

### Andere Rechner (nur „Ergebnis erreicht")
| Event | Datei |
|---|---|
| `empfehlung_ergebnis` | `app/(site)/pv-bedarf-berechnen/empfehlung.tsx` |
| `waermepumpe_ergebnis` | `app/(site)/waermepumpe-rechner/waermepumpe.tsx` |
| `klima_ergebnis` | `app/(site)/klimaanlage-stromkosten/klimaanlage.tsx` |

## Event-Eigenschaften (Anfrageprofil)

`pv_ergebnis` trägt aktuell **2 Eigenschaften** (anonym, kategorisiert):

| Eigenschaft | Werte |
|---|---|
| `anlage` | `5 kWp` / `8 kWp` / `10 kWp` / `15 kWp` / `custom` |
| `speicher` | `kein` / `5 kWh` / `10 kWh` / `15 kWh` |

**Warum nur 2:** Vercel Web Analytics erlaubt im Pro-Basistarif nur 2
Eigenschaften pro Event.

## Aufgeschoben: volles Anfrageprofil (braucht „Web Analytics Plus", +10 €/Mon)

Das Plus-Add-on hebt das Limit auf **8 Eigenschaften pro Event** und schaltet
kombiniertes Filtern frei („zeig nur Ergebnisse mit 15 kWp → welche
Haushaltsgröße"). Dann `pv_ergebnis` um diese 5 Dimensionen erweitern (alle
kategorisiert, nicht-personenbezogen):

| Eigenschaft | Quelle in `rechner.tsx` | Werte |
|---|---|---|
| `personen` | `personen` | `1` / `2` / `3-4` / `5+` |
| `nutzung` | `nutzung` | Nutzungsprofil (weg / teils zuhause / home / immer) |
| `waermepumpe` | `wp` | `nein` / `geplant` / `vorhanden` |
| `eauto` | `ea` | `nein` / `geplant` / `vorhanden` |
| `klima` | `klima` | `nein` / `geplant` / `vorhanden` |

Verbrauchswerte (kWh) nicht als Rohzahl senden, sondern gebucketed (sonst zu
hohe Kardinalität, im Dashboard unlesbar). Personen/Nutzung decken das Profil
bereits ab.

Beim Aktivieren: Datenschutz Abschnitt 5 ist bereits offen formuliert
(„einzelne gewählte Eckdaten der Berechnung") und deckt die Erweiterung ab.
