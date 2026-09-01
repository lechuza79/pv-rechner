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
| `brief_aufruf_direkt` | Aufruf mit Herkunftskennung, ohne Verweis — jemand hat in der Mail selbst geklickt |
| `brief_aufruf_verweis` | Aufruf mit Herkunftskennung, mit Verweis — die Gemeinde hat unsere Meldung veröffentlicht |

Zwei Namen statt einer Eigenschaft, weil Ereignisse hier keine Eigenschaften
tragen (siehe unten). WELCHE Gemeinde veröffentlicht hat, steht in der
gewöhnlichen Verweis-Liste und wird bewusst nicht ins Ereignis wiederholt.

Warum als eigenes Ereignis und nicht über Vercels Kampagnen-Auswertung: Die ist
ein Zusatzpaket (10 $/Monat auf Pro, Stand 27.08.2026), ohne das Vercel Seiten
ohne Abfrageteil zusammenfasst — der Parameter liefe ins Leere. Kennung,
Rechtslage und die Grenze zu unzulässigen Ausprägungen: `lib/brief-herkunft.ts`.

### Gemeinde-Abo
| Event | Auslöser |
|---|---|
| `abo_anmeldung` | Anmeldeformular auf einer Gemeindeseite erfolgreich abgeschickt |

**Gezählt wird der ABGESCHICKTE VERSUCH, nicht die Bestätigung.** Der Klick auf
den Bestätigungslink passiert in einem anderen Postfach, oft auf einem anderen
Gerät — ein Ereignis auf der Bestätigungsseite wäre eine Zählung, die sich der
vorherigen Anmeldung zuordnen ließe, und damit genau die Verknüpfung, die die
Messung einwilligungspflichtig machte. Wie viele Anmeldungen bestätigt werden,
beantwortet die eigene Ablage, nicht die Reichweitenmessung.

WELCHER Ort abonniert wurde, steht bewusst nicht im Ereignis. Es stünde über
den Seitenaufruf ohnehin schon zu viel daneben.

### Andere Rechner (nur „Ergebnis erreicht")
| Event | Datei |
|---|---|
| `empfehlung_ergebnis` | `app/(site)/pv-bedarf-berechnen/empfehlung.tsx` |
| `waermepumpe_ergebnis` | `app/(site)/waermepumpe-rechner/waermepumpe.tsx` |
| `klima_ergebnis` | `app/(site)/klimaanlage-stromkosten/klimaanlage.tsx` |
| `balkon_ergebnis` | `app/(site)/balkonkraftwerk/rechner/balkon.tsx` |

## Ereignisse tragen keine Eigenschaften — BLOCKER

`trackEvent` nimmt nur einen Namen entgegen. Das ist keine Sparsamkeit, sondern
die Grenze, an der die **Einwilligungsfreiheit der ganzen Messung** hängt.

Die Messung läuft ohne Zustimmungsfenster. Tragfähig ist das nur, solange sie
eine ZÄHLUNG ist und keine Analyse. Die Datenschutzkonferenz zieht die Linie
genau hier: Sie nennt als Kipppunkt ausdrücklich „benutzerdefinierte Variablen"
und „Informationen über Besuchende" (Orientierungshilfe für Anbieter:innen
digitaler Dienste, 20.11.2024, Rn. 88) und stellt in Rn. 89 klar, dass eine
einmal bejahte enge Einordnung verfällt, sobald „ein weiteres
Auswertungsergebnis hinzukommt".

**Bis zum 27.08.2026 trug `pv_ergebnis` Anlagen- und Speichergröße**, und an
dieser Stelle stand ein ausgearbeiteter Plan, das auf fünf weitere Dimensionen
auszubauen (Haushaltsgröße, Nutzungsprofil, Wärmepumpe, E-Auto, Klimaanlage) —
samt der Feststellung, die Datenschutzerklärung sei „bereits offen formuliert"
und decke die Erweiterung ab. Genau dieser Ausbau hätte die Messung
einwilligungspflichtig gemacht. Der Plan ist damit erledigt, nicht verschoben.

**Was das kostet und was nicht:** Die Frage „welche Anlagengrößen rechnen die
Leute" ist nicht mehr beantwortbar. Der Trichter bleibt vollständig — welcher
Schritt erreicht und wo abgebrochen wird, ist die Auswertung, für die es die
Messung gibt, und sie kommt ohne jede Angabe über den Nutzer aus.

**Wer eine Unterscheidung braucht, gibt ihr einen eigenen Ereignisnamen**
(Muster: `brief_aufruf_direkt` / `brief_aufruf_verweis`). Der Name darf sagen,
WAS passiert ist, nie mit welchen Werten — `pv_ergebnis_10kwp` wäre die
Eigenschaft durch die Hintertür und wird vom Test abgewiesen.

Erzwungen von `lib/__tests__/analytics-ereignisse.test.ts` (Signatur, kein
Aufruf am Wrapper vorbei, keine Zahlen im Namen, Katalog vollständig) und
`lib/__tests__/analytics-ohne-query.test.ts` (der Abfrageteil der Adresse, in
dem die Postleitzahl steht, erreicht die Messung nicht).
