# Kreis-Ranglisten: Datenvertrag für die Seitenintegration

Stand 01.10.2026. Datenschicht fertig, Seiten/Komponenten **nicht** gebaut
(Integration läuft separat). Landkreise und kreisfreie Städte werden
untereinander verglichen, je Bundesland und bundesweit.

| Teil | Datei |
|---|---|
| Reine Rechnung | `lib/kreis-ranking.ts` |
| Server-Leser | `lib/kreis-ranking-server.ts` (`server-only`) |
| Tests + Anker | `lib/__tests__/kreis-ranking.test.ts`, Fixture `lib/__tests__/fixtures/kreis-ranking-rp-2026-10.json` |

## Quelle

- Kreise: `mastr_regions` mit `level = 'landkreis'` (404 Zeilen, 401 vergleichbar).
- Werte: **nur** `mastr_region_rollup` — Kreis-Schlüssel (5 Stellen), Land (2),
  Bund (`""`). Nie Summen aus Gemeindezeilen. Gegenprobe gemessen: Summe der 36
  RP-Kreise = Landes-Rollup, auf die Nachkommastelle.
- Einwohner: Spalte `population` der Kreis- bzw. Landeszeile.
- Jeder Abruf ist seitenweise UND nach vollem Schlüssel sortiert; ein
  Lesefehler wirft (keine Teil-Rangliste).

## Landkreis oder kreisfreie Stadt

Strukturell über die amtliche `bezeichnung` der Kreiszeile, nie über den Namen
(„Region Hannover" ist ein Landkreis ohne das Wort, „Kaiserslautern" gibt es
als Stadt 07312 und als Landkreis 07335):

- kreisfrei: `Kreisfreie Stadt`, `Stadtkreis` (BW) — 107
- Landkreis: `Landkreis`, `Kreis` (NRW/SH), `Regionalverband` (Saarbrücken) — 294
- ausgeschlossen: keine Bezeichnung oder keine Einwohner — Altschlüssel
  03152 Göttingen, 03156 Osterode, 16056 Eisenach (kein Rollup, kein Slug).
  Eine unbekannte Bezeichnung wird nicht geraten, sondern ausgeschlossen
  (`ausgeschlossen` im Ergebnis).

Berlin und Hamburg sind kreisfreie Städte und zugleich ihr Land.

## Kennzahlen

Dieselben Objekte wie die Gemeinde-Ranglisten (`AWARD_CATEGORY_BY_KEY`, kein
Nachbau; ein Test prüft die Identität). Die Kreis-Kennzahlen entstehen, indem
`statsAusRollup` aus dem Rollup exakt dieselbe Aggregation wie
`mastr_refresh_gemeinde_award()` baut (Stichtage Ende `ly`, `ly−2`, `ly−4`;
`ly` = deutsches Kalenderjahr − 1).

| Schlüssel | Messgröße | Pressetauglich |
|---|---|---|
| `dach-privat-pk` | private Dach-Solarleistung je Einwohner | ja — sauberste Aussage |
| `balkon-pk` | Balkonkraftwerke je 1.000 Einwohner | ja |
| `speicherquote` | Batteriespeicher je 100 private Dachanlagen | ja; kann > 100, nie als % |
| `batterie-privat-pk` | private Speicherkapazität je Einwohner | ja |
| `tempo-1j/3j/5j` | Zubau privat je Einwohner seit Ende <Jahr> | ja, Zeitraum wörtlich nennen; Mindestwert wie bei Gemeinden (150/300/450 Wp) |
| `kreis-solar-gesamt-pk` | gesamte Solarleistung je Einwohner | **nein** — enthält Solarparks/Gewerbe, misst den Standort; nur Einordnung |

Absolute Kennzahlen gibt es bewusst nicht: zwischen Kreisen ist das eine
Einwohner-Rangliste. `kreis-solar-gesamt-pk` gibt es nur auf Kreisebene (bei
Gemeinden verworfen, siehe `solar-gesamt` in `lib/awards.ts`); es ist dieselbe
Zahl, die die Kreisseite zeigt. Freiflächen-Doppelzählungen werden wie bei
Gemeinden nur in `freiflaecheKwp` abgezogen, nicht in der Gesamtsumme.

## Aufrufe

```ts
const d = await loadKreisRankingDaten();            // { kreise, ausgeschlossen, scopeStats, ly }
kreisRangliste(d.kreise, "dach-privat-pk", { ebene: "bundesland", landId: "07" }, "landkreise");
kreisPlatzierungen(d.kreise, "07335", d.scopeStats); // alle Plätze eines Kreises
```

Vergleichsgruppen: `"landkreise"` (nur Landkreise) und `"alle"` (inkl.
kreisfreier Städte). Eine kreisfreie Stadt bekommt nur `"alle"`.

**`KreisRangliste`**: `zeilen[]` mit `regionId, name, art, population, rank,
geteilt, value, valueText, menge, basisText`; dazu `gruppeGroesse` (Kreise der
Gruppe, auch ohne Wert) und `unplausibel` (von der Plausibilitätsprüfung der
Kategorie entfernt — auf Kreisebene bisher nie, aber sichtbar statt still).
Kreise ohne Wert (0) werden nicht gerankt; „von N" ist `zeilen.length`.

**`KreisPlatzierung`**: `kategorie, scope, gruppe, rank, von, geteilt, value,
valueText, scopeWert, scopeWertText, menge, aufhaengerTauglich, hinweise[]`.
`scopeWert` ist der Wert des Landes bzw. Deutschlands aus dessen eigenem
Rollup über ALLE Kreise inkl. Städte — für beide Gruppen derselbe. Fehlt der
Landes-Rollup, ist er `null` (kein Rückfall auf eine Kreissumme).

`valueText`/`scopeWertText` kommen aus `formatAwardValue` → `lib/atlas-format.ts`.
Für große Zahlen in Kacheln die `…Teile()`-Formatter verwenden (Zahl und
Einheit getrennt), nicht den String zerlegen.

## Gleichstand

Wie die öffentliche Gemeinde-Rangliste (`rankGemeinden`): absteigend, Name als
Entscheider der Reihenfolge, **Sportrang** — gleicher Wert, gleicher Platz, der
nächste überspringt (1, 1, 3). `geteilt: true` heißt: „gemeinsam mit …"
schreiben. Verglichen wird der ungerundete Wert; zwei Kreise mit gleicher
Anzeige („863 Wp") können verschiedene Plätze haben.

## Wann ein Platz einen Pressetext trägt

`aufhaengerTauglich` ist falsch, wenn einer dieser Hinweise greift:
- Kennzahl misst den Standort (`kreis-solar-gesamt-pk`);
- einziger Kreis der Gruppe (Selbstvergleich, z. B. Berlin, Hamburg auf Landesebene);
- Stadtstaat auf Landesebene;
- weniger als 5 Anlagen hinter der Zahl (`MIN_MENGE_FUER_AUFHAENGER`);
- Zubau-Wert unter der Gemeinde-Mindestgrenze (`MIN_WERT_FUER_AUFHAENGER`).

Ein geteilter Platz bleibt tauglich, nur mit Hinweis. Kleine Gruppen (Bremen:
2 Kreise, Saarland: 6) bleiben tauglich — `von` steht immer im Satz.

## Regressionsanker (01.10.2026, Rheinland-Pfalz)

Landkreis Kaiserslautern (07335, 106.343 Ew.): private Dächer 863 Wp je
Einwohner, Platz 3 von 24 Landkreisen (Südwestpfalz 905, Vulkaneifel 887),
Landeswert 573 Wp (alle 36 Kreise); gesamt 1.935 Wp, Platz 10 von 36. Ändert
der Monatsimport die Zahlen, Fixture neu messen und ersetzen — nie die
Prüfungen lockern.

## Betrieb — für die Integration wichtig

- Der Leser holt alle Rollup-Zeilen der Kreis-, Landes- und Bundesebene; gemessen **~9 s** (einmal, lokal gegen die Produktions-Datenbank).
  Prozess-Memo 1 h. **Nicht in einen Seitenaufbau hängen** (Notbremse 8 s,
  Kaltstart zahlt voll — Lehre der Auszeichnungs-Liste). Für Seiten das
  Ergebnis im Monatslauf vorberechnen (eigene Tabelle oder in das Kreis-/
  Landespaket von `lib/region-package.ts`) und nur die eine Zeile lesen.
- Für Pressemeldungen/Skripte ist der direkte Aufruf in Ordnung
  (`tsx --conditions=react-server`).
- Nicht angefasst: Outreach- und Pressetexte, Seiten, Komponenten.
