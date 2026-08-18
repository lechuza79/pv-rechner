# Marktpreise prüfen (monatlich)

**Was hier geprüft wird:** die Anschaffungspreise für PV-Anlagen und Speicher sowie
der Haushaltsstrompreis — also die Zahlen, mit denen jeder Rechner das Geld
ausrechnet. Sie stehen in Supabase (`market_prices`) und werden monatlich
gescrapt; `lib/prices-config.ts` hält nur den Rückfall-Schnappschuss, falls die
Datenbank nicht erreichbar ist.

**Warum es dieses Runbook gibt:** Bis zum 18.08.2026 war der Preis-Wächter der
einzige, dessen Auftrag ausschließlich außerhalb des Repos lag. Damit stand er in
keiner Übersicht, sein Rhythmus war nirgends nachlesbar, und im Prüfstand
(`lib/pruefstand.ts`) fehlte er — auf dem PV-Rechner zeigte die Liste „Was wann
geprüft wird" deshalb nichts über die Preise, mit denen genau diese Seite
rechnet. Aufgefallen in einem Audit.

## Vor dem Gate

Es gilt `scripts/waechter-gate.md`. Die fünf Bedingungen und die Regel „Zustand
vor Zahl" gelten hier wie überall.

## Ablauf

1. **Stand feststellen.** Aktuelle Zeile aus `market_prices` lesen (`validFrom`,
   `source`). Wie alt ist sie? Ab 45 Tagen ohne Bewegung stimmt etwas mit dem
   Scrape nicht — das ist die Grenze, die auch im Prüfstand steht.
2. **Leitquelle abrufen.** taptaphome.com (vormals solaranlagen-portal.com, DAA
   GmbH) für die Anlagen- und Speicherpreise. **Eine Portal-Kostenseite ist keine
   Preisquelle für Gewerke** — die Lehre aus dem abgeschalteten
   Wärmepumpen-Scrape gilt hier sinngemäß: Für Hardware-Richtpreise ist das
   Portal brauchbar, für Handwerksleistungen nicht.
3. **Strompreis gegenprüfen** am BNetzA-Strompreismonitor und bei Fraunhofer ISE.
4. **Sprunggrenze.** Mehr als 30 % Änderung in einem Feld ist kein Marktereignis,
   sondern ein Scrape-Fehler. Nicht übernehmen, sondern melden.
5. **Prüfdatum nachziehen** — bei jedem Lauf, der die Quellen erreicht hat, auch
   wenn sich kein Wert geändert hat. „Geprüft und unverändert" ist das
   Normalergebnis. Ein Lauf, der an Paywall, 404 oder Bot-Prüfung gescheitert
   ist, lässt es stehen.

## Befugnis

Preisänderungen innerhalb der Sprunggrenze darf der Lauf **selbst übernehmen**
(Marktdaten, eine richtige Antwort, Leitquelle vorhanden). Alles darüber, ein
Quellenwechsel und jede Änderung an der Rechenlogik sind **Vorschlag an den
Menschen**.

## Was NICHT hierher gehört

Der Wärmepumpen-Preis (`lib/heatpump-config.ts`, an 160 echten Angeboten
kalibriert, eigener Wächter) und die Balkon-Set-Preise
(`lib/balkon-config.ts`). Beide haben ihr eigenes Runbook.
