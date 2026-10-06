# Nachprüfung: Spanien, Finnland, Belgien (Brüssel/Wallonien)

**Stand: 23.09.2026.** Diese Datei holt nach, was in `west-sued.md` und `nord-ost-uk.md` offen
geblieben ist — teils wegen gescheiterter Abrufe, teils weil eine Spur nicht verfolgt wurde.

**Prüfstatus:** Jede Aussage ist mit `GEPRÜFT` (am 23.09.2026 selbst abgerufen, mit dem
gemessenen Ergebnis) oder `UNGEPRÜFT` (nur gelesen, nicht am Original nachgesehen) markiert.
Ein fehlgeschlagener Abruf steht als solcher da und ist **kein** Beleg dafür, dass eine Quelle
nicht existiert. Es wurde kein CAPTCHA gelöst und keine Bot-Prüfung umgangen.

---

## SPANIEN

### Kurzergebnis

**Von 17 Regionen sind jetzt 15 geprüft** (vorher 4). **Einzelanlagen liefern weiterhin genau
zwei** — Katalonien und Comunitat Valenciana. Dazu kommt ein **dritter Teiltreffer**, den vorher
niemand angesehen hatte: **Kanaren** führt rund 9.600 Eigenverbrauchsanlagen als Einzelzeilen mit
Gemeinde und Registrierungsdatum, aber **ohne jede Leistungsangabe**.

Neu und wichtiger als jede weitere Region: **Der Zahlenwiderspruch ist aufgelöst, und zwar mit
einer eigenen Messung** (Abschnitt „Der Zahlenwiderspruch"), und es gibt einen **CAPTCHA-freien
nationalen Weg** — er reicht allerdings nur bis zur Region, nicht bis zur Gemeinde.

---

### 1. Andalusien — die stärkste Region, und für uns verschlossen

**Das Datenportal der Junta antwortet, hat aber nichts** (`GEPRÜFT`). Die CKAN-Schnittstelle
<https://www.juntadeandalucia.es/datosabiertos/portal/api/3/action/package_search> liefert
HTTP 200. Gemessen über fünf Suchwörter:

| Suchwort | Treffer | davon zu PV-Anlagen |
|---|---|---|
| `autoconsumo` | 0 | – |
| `fotovoltaica` | 0 | – |
| `solar` | 7 | 0 (alles Einstrahlungs- und Klimakarten) |
| `renovable` | 1 | 0 (Energieausweis-Register) |
| `energía` | 14 | 0 |

Kein Anlagenregister, keine Gemeindestatistik zu Photovoltaik. `GEPRÜFT`.

**Die Energieagentur ist von hier aus nicht erreichbar — das ist ein gescheiterter Abruf, kein
Befund.** `www.agenciaandaluzadelaenergia.es` löst auf `ws203.juntadeandalucia.es` /
`217.12.21.238` auf und lehnt jede Verbindung ab: `curl` über HTTPS und HTTP, mit und ohne
erzwungenes IPv4, mit Browser-Kennung — jedes Mal Zeitüberschreitung bzw.
`connect ECONNREFUSED 217.12.21.238:443`. Zweiter Weg (Fetch über einen anderen Netzweg):
dieselbe Ablehnung. `GEPRÜFT, dass wir nicht hinkommen` — **nicht** geprüft, was dort liegt.

Was dort nach Sekundärquellen liegt (alles `UNGEPRÜFT`):

- **MIEA — Mapa de Infraestructuras Energéticas de Andalucía**, mit WMS
  (`https://www.agenciaandaluzadelaenergia.es/mapwms/wms?`) und **WFS**
  (`https://www.agenciaandaluzadelaenergia.es/mapwms/wfs?`); laut IDEAndalucía 21 Layer,
  Stand 31.12.2025, „eigene Datenbank mit über 8.000 Installationen". Katalogeintrag:
  <http://www.ideandalucia.es/catalogo/inspire/srv/api/records/a8b7d9ba-9a97-46af-9b3e-d7abb3ec9b5b>
  (diese Katalogseite ist erreichbar, HTTP 200, `GEPRÜFT` — der Dienst selbst nicht).
- **8.000 Anlagen sind ohnehin die falsche Größenordnung.** MIEA ist ein Infrastruktur-Kataster
  (Netz, Kraftwerke, Gasleitungen), kein Eigenverbrauchs-Register; Andalusien hat nach der
  amtlichen Statistik 1.365 MW Eigenverbrauch (siehe unten), das sind Zehntausende Anlagen.
  Selbst wenn der WFS erreichbar wäre, wäre das nicht der gesuchte Bestand.
- **Der Weg über die Region ist der Registrierungsweg „PUES"** für Niederspannungs-Eigenverbrauch
  bis 500 kW — ein Verwaltungsverfahren, keine offene Datenquelle. `UNGEPRÜFT`.

**Statistikamt geprüft, ebenfalls nichts** (`GEPRÜFT`): Das multiterritoriale System **SIMA**
(<https://www.juntadeandalucia.es/institutodeestadisticaycartografia/sima/index2.htm>, HTTP 200,
CC BY 4.0) und die Statistikdatenbank **BADEA** antworten, führen aber keine Photovoltaik-Größe
je Gemeinde; der Datensatz-Eintrag zu SIMA wurde zuletzt 01.03.2024 geändert und listet als
einzige Ressource einen CSV-Verweis auf die Produktseite.

**Fazit Andalusien:** Kein offenes Register, keine Gemeindestatistik zu Photovoltaik auf den
erreichbaren Portalen. Der einzige noch nicht geprüfte Weg ist der WFS der Energieagentur — er
ist von hier aus netzseitig gesperrt und würde nach Aktenlage ohnehin die falsche Anlagenklasse
liefern. **Wer es erneut versucht, versucht es aus einem spanischen Netz.**

---

### 2. Baskenland — jetzt erreichbar, und definitiv leer

Der frühere Befund („antwortete auf allen Wegen mit Fehlern") gilt nicht mehr:
<https://opendata.euskadi.eus/catalogo-datos/> antwortet HTTP 200 (`GEPRÜFT`).

**Der vollständige Katalog wurde heruntergeladen und durchsucht** — nicht gesucht, sondern
gezählt: `https://opendata.euskadi.eus/contenidos/ds_general/catalogo_datos_opendata/opendata/datasets.json`,
11,5 MB, **4.969 Datensätze** (`GEPRÜFT`). Lizenz des Katalogs: „Reconocimiento CC BY".

Treffer auf `fotovolt|autoconsum|energía solar` in Titel oder Beschreibung: **genau einer** —
„Sensibilidad renovables. Energía eólica y Energía Fotovoltaica.", zwei Karten zur
Umweltempfindlichkeit für den Bau von Anlagen, CC BY, Stand 02.03.2023. Das ist eine
Planungskarte, kein Bestand.

Datensätze mit „energ" im Titel: 31 — davon 29 **Auftragsvergabe-Register** (unter anderem des
Ente Vasco de la Energía, EVE), dazu die genannte Sensibilitätskarte und drei
Meinungsumfragen zu Klima und Energiewende. `GEPRÜFT`.

**EVE selbst veröffentlicht keinen Anlagenbestand**, sondern Förderprogramme für
Eigenverbrauch (`UNGEPRÜFT` im Detail, aber im gesamten Katalog des Landes ist kein
Bestandsdatensatz von EVE enthalten — und EVE federiert dorthin, siehe die 29
Vergabe-Datensätze). Ebenfalls geprüft und ohne Treffer: das kommunale Indikatorsystem
(nur `UDALPLAN`, Flächennutzungsplanung).

**Fazit Baskenland: negativ, und diesmal belastbar** — nicht „nicht gefunden", sondern der
vollständige Katalog gegengelesen.

---

### 3. Die neun bisher ungeprüften Regionen

| Region | Portal / Weg | Ergebnis |
|---|---|---|
| **Galicien** | `abertos.xunta.gal` (Portal HTTP 200); CKAN-API unter `/api/3/action`, `/catalogo/api/...`, `/c/api/...` → 404/403; national über datos.gob.es | **Kein Autoconsumo-Register.** Im nationalen Harvester nur „Mapas do atlas de radiación solar de Galicia" (18.09.2026). `GEPRÜFT` über den Harvester, `Abruf der eigenen API gescheitert` |
| **Aragonien** | `opendata.aragon.es` CKAN, HTTP 200 | **Nur Großanlagen.** Datensatz „Energías renovables en Aragón", CC BY 4.0, geändert 17.03.2026. Ressource „Plantas fotovoltaicas en funcionamiento" heruntergeladen: **340 Zeilen**, Spalten `objectid, nombre, promotor, potencia_placas_mwp, potencia_inversior_mwp, shape` — **keine Gemeinde, kein Inbetriebnahmedatum**, Leistungen in MWp. Aufdachanlagen kommen darin nicht vor. `GEPRÜFT` |
| **Castilla-La Mancha** | `datosabiertos.castillalamancha.es` (DKAN), Suche „fotovoltaica" | „No se han encontrado resultados." `GEPRÜFT` |
| **Murcia** | `datosabiertos.regiondemurcia.es` CKAN, HTTP 200 | 9 bzw. 18 Volltext-Treffer, **alle** Vergabe- und Vereinsregister (das Wort steht in Vertragsgegenständen). Kein Anlagendatensatz. `GEPRÜFT` |
| **Extremadura** | `opendata.juntaex.es`, `datosabiertos.gobex.es`, `www.juntaex.es/datosabiertos` → DNS-Fehler bzw. 404 | **Abruf gescheitert.** Über den nationalen Harvester kein Autoconsumo-Datensatz; unter „solar" nur Potenzialkarten der Stadt Cáceres (2019). `GEPRÜFT` über den Harvester |
| **Kanaren** | `datos.canarias.es` CKAN, HTTP 200 | **Teiltreffer — siehe eigener Abschnitt unten.** `GEPRÜFT` |
| **Asturien** | `risp.asturias.es`, `www.asturias.es/risp`, `transparencia.asturias.es` → kein Verbindungsaufbau bzw. 404 | **Abruf gescheitert.** Im nationalen Harvester kein Treffer. `GEPRÜFT` über den Harvester |
| **Kantabrien** | `datosabiertos.cantabria.es`, `datos.cantabria.es`, `icane.es` → kein Verbindungsaufbau bzw. 404 | **Abruf gescheitert.** Im nationalen Harvester kein Treffer. `GEPRÜFT` über den Harvester |
| **La Rioja** | `web.larioja.org/dat/catalogo` → 404-Seite des Landesportals | **Abruf gescheitert.** Im nationalen Harvester kein Treffer. `GEPRÜFT` über den Harvester |

**Zusätzlich mitgeprüft, weil der Harvester sie ausspielte** (`GEPRÜFT`):

- **Madrid** (`datos.comunidad.madrid`, CKAN, HTTP 200): 71 Energie-Datensätze, davon **kein
  einziger** mit Anlagenbestand — nur Energiebilanz-Aggregate („Autoabastecimiento generación
  eléctrica", „Generación de energía") auf Landesebene.
- **Navarra** (`datosabiertos.navarra.es`, CKAN, HTTP 200): „Plantas solares fotovoltaicas en
  servicio" / „en tramitación", CC BY 4.0, Stand 15.04. bzw. 01.06.2026 — Shapefiles von
  **Großanlagen** (Flächen-PV), keine Aufdachanlagen.
- **Balearen**: zwei Datensätze des Instituto Balear de Energía zu **geteiltem Eigenverbrauch
  des Landes selbst** (eigene Anlagen), kein Bestand.
- **Castilla y León**: provinzweise Aggregate „Potencia instalada (kW) acumulada y número de
  instalaciones acumulado por provincias de energía solar fotovoltaica" — **Provinz, nicht
  Gemeinde**.

**Methodischer Hinweis zur Grundgesamtheit:** Der nationale Harvester datos.gob.es wurde über
die Titel-Schnittstelle mit `autoconsumo`, `autoconsum`, `fotovoltaica`, `solar`, `potencia
instalada`, `registro de instalaciones`, `instalaciones de produccion`, `energia electrica` und
`produccion electrica` abgefragt. Dass er Navarra, Kanaren, Castilla y León, die Balearen, das
Baskenland, Katalonien und Valencia ausspielt, belegt, dass diese Regionen tatsächlich
federieren — die Abwesenheit eines Autoconsumo-Datensatzes für die übrigen ist damit ein
Befund und nicht nur eine Lücke im Harvester.

---

### 4. Kanaren — ein Teiltreffer, und die Beschreibung widerspricht den Daten

**Datensatz:** „Instalaciones eléctricas de baja tensión de Canarias",
`instalaciones-baja-tension-canarias`,
<https://datos.canarias.es/catalogos/general/dataset/b0123b00-7ecb-44d5-aedd-5e4470fa5e04>,
**geändert am 23.09.2026** (also am Prüftag selbst). `GEPRÜFT`.

**Lizenz:** `gobcan-aviso-legal` — „Aviso Legal del Gobierno de Canarias",
<https://datos.canarias.es/portal/aviso-legal-y-condiciones-de-uso>. **Keine Creative-Commons-
Lizenz**; die Bedingungen wurden nicht im Volltext gelesen (`UNGEPRÜFT`) und wären vor einer
Nutzung zu klären.

**Die Beschreibung sagt, Eigenverbrauch sei ausgenommen — die Daten enthalten ihn.** Wörtlich
aus den Metadaten: „Instalaciones eléctricas de baja tensión en servicio en la Comunidad
Autónoma de Canarias, **excluidas las instalaciones de autoconsumo**." Gemessen in der
heruntergeladenen Datei (42,3 MB, **177.461 Zeilen**):

- **9.618 Zeilen** tragen den Typ `20: Instalación de generación asociada a autoconsumo con
  excedentes`.
- **11.950 Zeilen** tragen diesen Typ **oder** nennen im Feld `instalacion_uso` Photovoltaik,
  Solar oder Eigenverbrauch (z. B. „INSTALACIÓN FOTOVOLTÁICA AUTOCONSUMO", „Instalación
  fotovoltaica para vivienda conectada a red acogida a compensación de excedentes").
- Verteilung auf **88 der 89 enthaltenen Gemeinden**; Spitzenreiter Las Palmas de Gran Canaria
  (838), La Oliva (625), San Cristóbal de La Laguna (601).
- Zeitachse über `fecha_registro`: 2021 → 1.817, 2022 → 3.094, 2023 → 3.053, 2024 → 1.685,
  2025 → 1.417, 2026 → 875.

**Was fehlt, und es ist das Entscheidende: die Leistung.** Die Beschreibung verspricht
„información sobre su número de expediente, tipo, municipio, isla, **potencia** y estado" — die
ausgelieferte Datei hat **elf** Spalten, und weder `potencia` noch `estado` ist darunter:
`expediente_inicio, expediente_inicio_modificacion, numero_registro, fecha_registro,
direccion_domicilio, direccion_municipio, direccion_isla, direccion_provincia,
referencia_catastral, instalacion_uso, instalacion_tipo`. `GEPRÜFT` am Datendiktionär und an
der Datei.

**Bewertung:** Für „wie viele Anlagen sind in meiner Gemeinde dazugekommen" reicht das; für
„wie viel kWp" nicht. Und die Vollständigkeit ist zweifelhaft: Den 9.618 Zeilen des Typs
„Eigenverbrauch mit Überschuss" stehen **245,84 MW** gegenüber, die die amtliche Bundesstatistik
für die Kanaren 2024 ausweist — rechnerisch 25,6 kW je Anlage. Das ist weit über einem
Hausdach und spricht dafür, dass die Datei nur einen Teil des Bestands führt (oder eine
bestimmte Verfahrensart). **Nachrechnen lässt es sich nicht, weil die Leistung fehlt — und
genau das ist der Punkt.** Kein Ersatz für ein Register.

Ein eigener Eigenverbrauchs-Datensatz existiert im kanarischen Katalog nicht; die 396
Datensätze zu „energia" sind ganz überwiegend ISTAC-Klassifikationen und Verbrauchsstatistiken
je Insel. `GEPRÜFT`.

---

### 5. Der Zahlenwiderspruch — aufgelöst, mit eigener Messung

**Die Frage war:** Warum nennt die akademische Auswertung für 2024 rund 246.000 Anlagen für ganz
Spanien, während Katalonien und Valencia zusammen mehr haben?

**Die Antwort: Das nationale Register bekommt von den Regionen fast nichts.** Drei unabhängige
Messungen, alle am 23.09.2026 selbst erhoben:

**(a) Die beiden Regionalregister übertreffen die genannte Bundeszahl allein.** `GEPRÜFT`:

| | Zeilen | Stand | Gemeinden |
|---|---|---|---|
| Katalonien (RAC, Socrata `2b4s-skfm`) | **138.769** | jüngste Inbetriebnahme 31.12.2025; Datei zuletzt 01.06.2026 geschrieben | 937 |
| Comunitat Valenciana (CSV, 69,8 MB) | **133.538** (davon 133.508 Photovoltaik, 133.408 im Status `ALTA`) | Registrierungen bis einschließlich 2026 (14.056 allein 2026) | **542 — alle** |
| **zusammen** | **272.307** | | |

**(b) Der direkte Beleg: Valencia führt die nationale Registernummer mit — und sie ist fast
immer leer.** Die valencianische Datei hat eine Spalte `codigo_radne` (die Kennung im nationalen
Eigenverbrauchsregister RADNE). Gemessen: **583 von 133.538 Zeilen tragen sie, das sind
0,4 Prozent.** `GEPRÜFT`. (Zurückhaltung: Es ist nicht auszuschließen, dass die Spalte im
veröffentlichten Auszug schlicht nicht gepflegt wird — dann wäre sie kein Beleg für den
Meldestand, sondern nur für die Veröffentlichung. Zusammen mit (c) ist die Richtung trotzdem
eindeutig.)

**(c) Die amtliche Bundesstatistik und die Regionalregister gehen für dasselbe Jahr weit
auseinander — und zwar in BEIDE Richtungen.** Das ist der eigentliche Befund, und er ist
schlimmer als ein einseitiger Meldeverzug. Alles selbst gerechnet (`GEPRÜFT`), Bezugsjahr 2024:

| Region | Regionalregister, Bestand Ende 2024 | MITECO 2024 | Abweichung |
|---|---|---|---|
| **Comunitat Valenciana** | 99.037 Anlagen · **1.044,5 MW** (Wechselrichter) bzw. **1.276,0 MW** (Modul) | **721,30 MW** | Bund **31–44 % niedriger** |
| **Cataluña** | 123.873 Anlagen · **1.583,8 MW** | **1.756,66 MW** | Bund **11 % höher** |

Gesamtbestände zum Messzeitpunkt: Katalonien 138.769 Anlagen / **1.815,70 MW** (kleinste Anlage
0,236 kW, größte 9.756 kW, 138.701 davon Photovoltaik); Valencia 133.408 Anlagen im Status
`ALTA` / 1.546,6 MW AC bzw. 1.818,1 MW Peak.

**Zwei Vorbehalte, die dazugehören.** Erstens fußt die Bundeszahl auf „la información disponible
a fecha 3 de diciembre de 2025" — ein Teil der Valencia-Lücke sind Nachmeldungen. Zweitens
datieren die beiden Register verschieden: Katalonien führt die **Inbetriebnahme**
(`data_de_posada_en_servei`), Valencia die **Registrierung** (`fecha_inscripcion`); eine
Eingrenzung „bis Ende 2024" meint also nicht ganz dasselbe. Beides erklärt Abweichungen von
einigen Prozent, nicht von 40.

**Was bleibt: Die Bundeszahl ist mit keinem der beiden Register in Übereinstimmung zu bringen,
und sie irrt nicht einmal in eine einheitliche Richtung.** Für Valencia liegt sie deutlich
darunter, für Katalonien darüber. Als Bestandsangabe je Region ist sie damit nicht belastbar;
als grober Anker über Spanien insgesamt (8.255,62 MW für 2024 gegen 9.590 MW der Branche für
Ende 2025) ist sie plausibel.

**(d) Die Branche sagt dasselbe, und zwar wörtlich.** Der Jahresbericht Autoconsumo 2025 von
APPA Renovables: „España sigue sin contar con un Registro Nacional de Autoconsumo plenamente
operativo, homogéneo y actualizado". Zahlen der Verbände für Ende 2025: **9.590 MW** kumuliert
(APPA) bzw. 9,3 GW (UNEF), **71.609 Anlagen allein im Jahr 2025**. `UNGEPRÜFT` (über
Sekundärberichte gelesen, nicht im Originalbericht).

**Schlussfolgerung:** Die Bundeszahl ist kein Bestand, sondern ein Meldestand — und ein
uneinheitlicher. Wer für Spanien etwas Flächendeckendes bauen will, kann sich auf das nationale
Register **nicht** stützen, weder auf RADNE selbst noch auf eine daraus abgeleitete
Gemeindeauswertung. Umgekehrt heißt das: Eine aus RADNE abgeleitete Gemeindezahl ist auch dann
nicht brauchbar, wenn sie methodisch sauber gerechnet ist — der Fehler steckt in der Quelle.

*Nicht geprüft:* Der Zenodo-Datensatz der UAM (<https://zenodo.org/records/18434094>,
„3.2. Número de instalaciones nuevas de autoconsumos cada año (2020-2024)", Ibai de Juan,
**CC BY 4.0**, veröffentlicht 30.01.2026, 5 ZIP-Archive, 16 MB, XLSX + Shapefile) konnte nicht
heruntergeladen werden: Zenodo antwortet unserem Netz mit **HTTP 403, „Access to this resource
has been restricted due to unusual traffic from your network"**. Die Metadaten wurden über die
Datensatzseite gelesen; sie nennen **keine** aggregierte Anlagenzahl. Die Zahl „246.284" ist
damit weiterhin **UNGEPRÜFT** — sie stammt nicht aus der Beschreibung.

---

### 6. Ein CAPTCHA-freier Weg an nationale Daten — ja, aber nur bis zur Region

**Das Register selbst bleibt zu.** `https://energia.serviciosmin.gob.es/Radne/` antwortet
HTTP 200 und führt genau zwei Wege: „Control de Acceso" (Zertifikat oder Benutzer/Passwort) und
„Registro Público" — und der öffentliche Weg verlangt „repita los caracteres de la imagen".
`/Radne/Informes` und `/Radne/Estadisticas` existieren nicht (beide fallen auf die
Zugangsseite zurück). `GEPRÜFT`. Kein Export, keine Schnittstelle, keine Statistikseite.

**Bemerkenswert am Rande, und neu:** Der datos.gob.es-Eintrag zum „Registro de Autoconsumo"
(Herausgeber MITECO, geändert 29.05.2026) trägt als Lizenz **CC BY 4.0**
(`http://publications.europa.eu/resource/authority/licence/CC_BY_4_0`) — die einzige
Verteilung ist aber die CAPTCHA-Seite. **Die Lizenzfrage für RADNE ist damit beantwortet, die
Zugangsfrage nicht.** `GEPRÜFT`.

**Der CAPTCHA-freie Weg, den es wirklich gibt:**

> **Estadística Anual de Autoconsumo y Almacenamiento Energético**, Secretaría de Estado de
> Energía / S.G. de Prospectiva y Estadísticas Energéticas.
> Seite: <https://www.miteco.gob.es/es/energia/estrategia-normativa/balances/publicaciones/estadistica-de-autoconsumo-y-almacenamiento-energetico-anual.html>
> Datei (ODS, 66 KB, selbst heruntergeladen und geöffnet):
> `…/Documents/autoconsumo-y-almacenamiento-2024/Estadistica Anual Autoconsumo y Almacenamiento_2024.ods`
> dazu dieselbe Tabelle als PDF und ein methodischer Bericht.

Gemessener Inhalt (`GEPRÜFT`): Jahrgang **2024**, „elaborada a partir de la información
disponible a fecha 3 de diciembre de 2025". Photovoltaik-Eigenverbrauch als **kumulierte
Leistung je Comunidad Autónoma**, Spanien gesamt **8.255,62 MW** und 11.127 GWh. Je Region
z. B. Cataluña 1.756,66 · Andalucía 1.364,67 · Madrid 787,17 · Castilla-La Mancha 728,34 ·
Comunitat Valenciana 721,30 · Murcia 566,03 · País Vasco 445,42 MW.

**Und die Grenze steht in der Datei selbst:** „Debido al reducido número de unidades de
autoconsumo eólico y fotovoltaico, solo se publican datos nacionales" bzw. „La generación neta
de autoconsumo se reporta solo a nivel nacional." Es gibt also **keine** Provinz- und erst recht
keine Gemeindeebene, **keine Anlagenzahlen**, nur Megawatt je Region und Jahr.

**Korrektur zum zweiten offenen Bund-Download: Die EXCEL-Variante hat mehr als die CSV.** Das
war in `west-sued.md` falsch notiert („genau fünf Spalten — keine Leistung, kein
Gemeindeschlüssel, kein Datum"). Das gilt für die CSV, nicht für die Excel-Datei. Beide selbst
heruntergeladen und geöffnet (`GEPRÜFT`):

- `…/Electra/descargarCSVProduccion.aspx` → 4,2 MB, **71.727 Datenzeilen**, fünf Spalten:
  `AUTOID; INSTALACIONID; REGIMEN; INSTALACION; AUTONOMIA`. Bestätigt wertlos.
- `…/Electra/descargarExcelProduccion.aspx` → 5,3 MB, **zwei Blätter**:
  - *Instalaciones* — 71.727 Zeilen, vier Spalten (`IdInstalacion, regimen, Instalacion,
    Autonomia`); `regimen`: 70.646 ESPECIAL, 1.081 ORDINARIO.
  - ***Fases* — 72.554 Zeilen, elf Spalten:** `INSTALACION, **POTENCIANETA**, **POTENCIABRUTA**,
    **FECHAPUESTASERVICIO**, FECHAALTAINSTALACION, FECHABAJA, FECHAALTAPROVISIONAL,
    ALTAREGISTROOPENDATA, NumeroFase, NumeroRegistro, Autonomia`. Gemessen: **72.381 Zeilen mit
    Leistung**, **64.692 mit Inbetriebnahmedatum**, 19 Regionen.

**Es ist trotzdem der falsche Bestand, und das ist am Datum abzulesen.** Die Jahresverteilung
der Inbetriebnahmen: 2006 → 4.192, 2007 → 9.773, **2008 → 31.255**, 2009 → 1.151, danach
absteigend, 2019–2025 zwischen 240 und 701 pro Jahr. Das ist das alte Einspeise-Register
(„régimen especial", RAIPRE/PRETOR) mit dem spanischen Boom von 2008 — **Eigenverbrauch steckt
darin nicht**. Dazu fehlt weiterhin jeder Ortsbezug unterhalb der Region.

**Der Befund bleibt also derselbe, die Begründung ist eine andere:** nicht „keine Leistung, kein
Datum", sondern „falsches Register, kein Gemeindebezug". Wer die alte Notiz weiterträgt,
verwirft die Datei aus einem Grund, der nicht stimmt.

**Fazit zu 5.:** Ja, es gibt einen Weg ohne CAPTCHA. Er liefert 19 Zeilen im Jahr. Für
Gemeindeseiten ist er nichts, als Plausibilitätsanker gegen Regionaldaten ist er nützlich —
genau dafür wurde er oben unter (c) benutzt.

---

### 7. Spanien — Gesamtstand nach Regionen

| Region | geprüft? | Einzelanlagen | Gemeindebezug | Leistung | Zeitachse | Lizenz |
|---|---|---|---|---|---|---|
| **Cataluña** | ja | **138.769** | INE-Schlüssel, 937 Gem. | ja | taggenau, endet 31.12.2025 | unscharf (`SEE_TERMS_OF_USE`) |
| **Comunitat Valenciana** | ja | **133.538** | INE-Schlüssel, **542 = alle** | ja (AC + Peak) | taggenau, bis 2026 | **CC BY** |
| **Canarias** | ja | ~9.600–11.950 (Teilbestand) | Gemeindename, 88 Gem. | **nein** | Registrierungsdatum, 2021–2026 | Aviso Legal (nicht CC) |
| Andalucía | Portal ja, Agentur **nicht erreichbar** | – | – | – | – | – |
| País Vasco | ja (4.969 Datensätze gegengelesen) | – | – | – | – | – |
| Aragón | ja | nur Großanlagen (340) | nein | MWp | nein | CC BY 4.0 |
| Navarra | ja | nur Großanlagen | Shapefile | ja | nein | CC BY 4.0 |
| Illes Balears | ja | nur eigene Anlagen des Landes | ja | ja | – | – |
| Castilla y León | ja | nein, Provinz-Aggregate | Provinz | ja | Jahresreihe | – |
| Madrid | ja | nein, Landes-Aggregate | nein | ja | Jahresreihe | – |
| Murcia | ja | – | – | – | – | – |
| Castilla-La Mancha | ja | – | – | – | – | – |
| Galicia | nur über Harvester | – | – | – | – | – |
| Extremadura | nur über Harvester | – | – | – | – | – |
| Asturias | nur über Harvester | – | – | – | – | – |
| Cantabria | nur über Harvester | – | – | – | – | – |
| La Rioja | nur über Harvester | – | – | – | – | – |
| **Bund (MITECO-Statistik)** | ja | nein | **nur Region** | ja (MW) | Jahr | keine Angabe an der Datei |
| **Bund (RADNE)** | Zugang geprüft | – | – | – | – | CC BY 4.0 laut Katalog, Zugang per CAPTCHA |
| **Bund (Electra/PRETOR, Excel)** | ja | 71.727, aber **Einspeise-Register, nicht Eigenverbrauch** | **nur Region** | ja (netto/brutto) | ja, Inbetriebnahme (64.692 Zeilen) | keine Angabe an der Datei |

---

## FINNLAND

### Kurzergebnis

**Der frühere Befund hält, und er ist jetzt belegt statt vermutet: Es gibt in Finnland keine
einzige Quelle mit Solar-Bezug auf Gemeindeebene.** Die feinste Auflösung im ganzen Land ist die
**Verteilnetzgesellschaft** (77 Stück). Die Lizenzfrage bei Fingrid ist geklärt: **CC BY 4.0,
kommerzielle Nutzung erlaubt** — die „nicht kommerziell"-Aussage ließ sich am Original nicht
bestätigen.

---

### 1. Statistikamt Tilastokeskus — vollständig durchgesehen, kein Treffer

Nicht gesucht, sondern **aufgezählt** (`GEPRÜFT`): Die PxWeb-Schnittstelle
<https://pxdata.stat.fi/PxWeb/api/v1/fi/StatFin/> liefert **135 Themen**. Energiebezogen sind
sieben: `asen` (Wohnen), `ehk` (Energieaufkommen und -verbrauch), `ehi` (Energiepreise), `entp`
(Energiekonten), `khki` (Treibhausgase), `salatuo` (Strom- und Wärmeerzeugung), `tene`
(Industrie-Energieverbrauch).

Alle Tabellen dieser Themen wurden aufgelistet: **19 + 2 + 1 + 3 + 4 + 7 = 36 Tabellen.**
Ergebnis:

- **Keine einzige Tabelle mit Solar als eigener Größe auf regionaler Ebene.** `salatuo` führt
  sieben Tabellen zu Strom- und Wärmeerzeugung, alle national.
- **Die feinste Geografie im gesamten Energiebestand ist die `maakunta`** (Landschaft, 19
  Stück), und zwar nur in zwei Tabellen zum **Industrie**-Energieverbrauch (`tene/12bu`,
  `tene/12bw`). Kein `kunta`, nirgends.
- Die neuere Such-Schnittstelle (`/api/v2beta/tables?query=…`) existiert bei Tilastokeskus nicht
  (HTTP 404 auf `pxdata.stat.fi` und `statfin.stat.fi`), deshalb die vollständige Aufzählung.

**Fazit:** Nein, es gibt keine Solar-Tabelle je Gemeinde. `GEPRÜFT`, und zwar erschöpfend.

---

### 2. Energiebehörde Energiavirasto — die eigentliche Quelle, und ihre Auflösung

**So wird erhoben** (`GEPRÜFT`, an der Behördenmeldung gelesen): „Energiavirasto kerää
vuosittain sähkön jakeluverkkoyhtiöiltä tiedot" — die Behörde sammelt **jährlich** bei den
**Verteilnetzgesellschaften**, Stichtag Jahresende, Grenze **unter 1 MW**. Die nach
Netzgesellschaft aufgeschlüsselten Zahlen erscheinen „alkusyksyllä" (im Frühherbst).

**Die Datei wurde heruntergeladen und geöffnet** (`GEPRÜFT`):
`Sähköverkkotoiminnan tekniset tunnusluvut 2024.xlsx`, 98 KB, über
<https://energiavirasto.fi/verkkotoiminnan-julkaisut>. Blätter: „Sähkön jakeluverkko",
„Sähkön kantaverkko", „Suurjännitteinen jakeluverkko", plus zwei Gasblätter.

Darin die Kennzahl **„(2.16) Verkkoon liitetty pientuotanto tuotantomuodoittain, kW"** mit der
Unterzeile **„a) Aurinko, nimellisteho yhteensä, kW"** — **eine Solar-Zahl je
Verteilnetzgesellschaft.** Gemessen: **77 Gesellschaften**, jede mit einem Wert; Summe
**1.113.234 kW**.

**Gegenprobe, die die Spalte bestätigt:** Die Behörde meldet für Ende 2025 1.251 MW
netzgekoppelte Kleinerzeugung bei einem Zuwachs von 138 MW im Jahr 2025 — 1.251 − 138 = 1.113 MW
für Ende 2024, auf das Megawatt genau der Summe der 77 Werte. `GEPRÜFT`.

**Was das für Gemeindeseiten bedeutet:** Ein finnisches Verteilnetzgebiet umfasst in der Regel
viele Gemeinden; Caruna Oy allein trägt 60,8 MW, Elenia Verkko Oyj 247,1 MW. Eine Zuordnung auf
die Gemeinde ist daraus **nicht** ableitbar. Nur bei den wenigen stadteigenen Netzen fällt
Netzgebiet und Gemeinde praktisch zusammen — das ist eine Handvoll Städte, kein Bestand.

Daneben die zweite, rein nationale Datei: `Tilastotietoja-sähköverkoista-sv-eng.xlsx` (51 KB,
drei Blätter, 167 Textbausteine) mit „Pientuotanto kW (nimellisteholtaan alle 1 MW
tuotantoyksiköt)" und „Aurinko" — Landeszahlen. `GEPRÜFT`.

---

### 3. Fingrid, Datahub und die Lizenzfrage

**Die Lizenzfrage ist beantwortet: CC BY 4.0, kommerziell erlaubt.** Auf der Seite
<https://data.fingrid.fi/en/about> steht die Lizenz „Creative Commons Attribution 4.0
International (CC BY 4.0)" mit der Quellenangabe-Vorgabe **„Source Fingrid / data.fingrid.fi,
license CC 4.0 BY"**; wörtlich zitiert: „Creative Commons 4.0 Attribution license requires that
you attribute the work in the manner specified by the author of the data." Die Datensatzseite
(<https://data.fingrid.fi/en/datasets/267>) nennt dieselbe Lizenz mit Link auf
`https://creativecommons.org/licenses/by/4.0/`. `GEPRÜFT`.

**Eine Einschränkung auf nicht-kommerzielle Nutzung wurde am Original nicht gefunden.** Fingrid
selbst wirbt damit, dass Ergebnisse „either as free or commercial products" veröffentlicht
werden dürfen (`UNGEPRÜFT`, über Sekundärquelle). Die in der Vorrecherche vermutete
„nicht kommerziell"-Klausel ließ sich **nicht bestätigen**; die verlinkten Rechtsbedingungen
(<https://www.fingrid.fi/en/legal-terms/>) wurden nicht im Volltext gelesen (`UNGEPRÜFT`).
**Vorsichtige Formulierung für den Bericht: CC BY 4.0 ist belegt, ein Widerspruch dazu nicht.**

**Granularität: national.** `GEPRÜFT` an der Datensatzseite 267 („Sähkön pientuotannon ylijäämä
Suomen jakeluverkoissa…"): Summen für ganz Finnland, stündlich, nach Erzeugungsart getrennt
(Solar = AV06). **Einzelne Entnahme-/Einspeisestellen und einzelne Netzgebiete sind
ausdrücklich nicht enthalten.** Die API verlangt einen kostenlosen Zugangsschlüssel
(`https://data.fingrid.fi/api/datasets/267` ohne Schlüssel: HTTP 401, „Access denied due to
missing subscription key" — `GEPRÜFT`).

**Datahub (von Fingrid betrieben) liefert daraus keine Gemeindeauswertung.** Was aus dem
Datahub öffentlich wird, ist genau die oben genannte nationale Stundenreihe. `GEPRÜFT` über die
Datensatzbeschreibung; eine gemeindescharfe öffentliche Auswertung existiert nicht.

---

### 4. Netzbetreiber — geprüft, und der eine Treffer trägt nicht

- **Elenia** wirbt mit einer Karte, auf der sich Anlagen „je Gemeinde" suchen lassen. Am
  Original gelesen (`GEPRÜFT`,
  <https://www.elenia.fi/tulevaisuuden-energia/sahkontuotanto-ja-kulutus/aurinkosahko>):
  „Kartalta näet kokonaisnäkymän Elenian verkkoon liitetyistä **vähintään 1MW:n**
  aurinkovoimalaitoksista. Kartan tiedot päivitetään muutaman kerran vuodessa." — **nur
  Anlagen ab 1 MW**, also Freiflächen, keine Aufdachanlagen. Die Seite nennt daneben eine
  Gesamtzahl für das eigene Netz: 173.595 kW zum 10.07.2025.
- **Caruna** veröffentlicht **Pressemitteilungen** mit einer Top-10-Liste der solarstärksten
  Gemeinden seines Netzgebiets (Espoo, Salo, Kaarina bzw. Lohja) und nennt 30.000
  Kleinerzeuger, davon über 20.000 auf Einfamilienhausdächern. Das ist eine Meldung, kein
  Datensatz. `UNGEPRÜFT` im Original, über Sekundärberichte gelesen.
- **Helen Sähköverkko, Vantaan Energia:** keine offene Anlagenstatistik gefunden
  (`UNGEPRÜFT` — nicht einzeln abgerufen).

**Das ist der bemerkenswerte Punkt:** Caruna *hat* die Gemeindezuordnung und gibt sie als
Schlagzeile heraus, nicht als Daten. Die Information existiert bei den Netzbetreibern, sie wird
nur nicht veröffentlicht.

---

### 5. Motiva und SYKE — beide geprüft, beide negativ

- **Motiva** betreibt zusammen mit Energiavirasto eine Karte „Aurinkosähkövoimalat kartalla" —
  erneut nur **Großanlagen ab 1 MW** (geplant, im Bau, in Betrieb). Keine Gemeindestatistik zur
  Kleinerzeugung. `UNGEPRÜFT` im Original, über Sekundärberichte.
- **SYKE (Finnisches Umweltinstitut)** rechnet mit dem ALas-Modell die Treibhausgasbilanz
  **jeder** finnischen Gemeinde. Das klingt nach der Lösung und ist keine: Im Szenario-Werkzeug
  (<https://skenaario.hiilineutraalisuomi.fi/data2020/>, `GEPRÜFT`) steht wörtlich
  **„Arvioi … verkkoon kytkettyjen aurinkopaneelien teho"** — die Gemeinde wird aufgefordert,
  ihre angeschlossene Solarleistung **zu schätzen** und einzutippen. Es ist ein Eingabefeld,
  keine Datengrundlage.

---

### 6. Finnland — Gesamtstand

| Quelle | Ebene | Kleinanlagen | Zeitachse | Aktualität | Lizenz |
|---|---|---|---|---|---|
| **Energiavirasto, tekniset tunnusluvut** | **77 Verteilnetzgesellschaften** | ja (< 1 MW) | Jahreswerte je Datei | Datei 2024 (Stichtag 31.12.2024), 2025er „im Frühherbst" | nicht ermittelt (`UNGEPRÜFT`) |
| Energiavirasto, Tilastotietoja sähköverkoista | Finnland | ja | Jahresreihe | dieselbe Datei-Familie | nicht ermittelt |
| Fingrid Open Data (267/362) | Finnland | ja | stündlich, ~4 Tage Verzug | laufend | **CC BY 4.0**, Zugangsschlüssel kostenlos |
| Tilastokeskus (36 Energietabellen) | max. `maakunta`, Solar nirgends | – | – | 2024 | – |
| Elenia-Karte / Motiva-Karte | Einzelanlage | **nein, erst ab 1 MW** | – | mehrmals im Jahr | – |
| SYKE ALas | Gemeinde | – | – | – | – (Solar ist Eingabefeld) |

**Für einen Solar-Atlas ist Finnland unbrauchbar** — daran ändert die Nachprüfung nichts. Was
sie ändert: Es ist jetzt ausgeschlossen statt vermutet, und die Lizenz der einzigen brauchbaren
offenen Quelle ist geklärt.

---

## BELGIEN

### 1. Brüssel — die Lizenz ist gefunden, und sie trägt nicht

**Die Daten gibt es, und sie sind besser als gedacht.** Auf der Indikatorseite „Énergie
d'origine renouvelable"
(<https://environnement.brussels/citoyen/outils-et-donnees/etat-des-lieux-de-lenvironnement/energie-dorigine-renouvelable>,
`GEPRÜFT`, HTTP 200) stehen alle **19 Brüsseler Gemeinden** mit **Potenzial (kW) und
installierter Leistung (kW)** samt Anteil — Beispiel Anderlecht: „potentiel de 266.653 kW dont
15,5 % (41.452 kW) installés". Aktualisierung **Dezember 2025**, Grundlage die Energiebilanz
2023 der Region, erstellt von Bruxelles Environnement und APERe. Dateien:
`DATA_EE25_EnR_électricité_FRNL.xls`, `DATA_EE25_EnR_chaleur_FRNL.xls` und
`bilan-energetique_v.2023.1.2.dev_.1.xlsx` (1990–2023).

**Die Lizenz — im Wortlaut, selbst gelesen** (<https://environnement.brussels/citoyen/mentions-legales>,
`GEPRÜFT`):

> „Conformément aux dispositions de la loi du 30 juin 1994 relative au droit d'auteur et aux
> droits voisins, vous avez le droit de télécharger et de reproduire les informations figurant
> sur ce site **pour votre usage personnel**."
>
> „**Bruxelles Environnement se réserve tous les droits de propriété intellectuelle** sur le
> site ainsi que sur les informations qui y sont mises à disposition, notamment les
> photographies et les cartes."

**Das ist die Antwort, und es ist ein Nein:** keine offene Lizenz, kein Creative Commons,
ausdrücklich nur **persönliche** Nutzung, alle Rechte vorbehalten. Eine kommerzielle
Weiterverwendung ist davon nicht gedeckt. Wer Brüssel einbauen will, braucht eine ausdrückliche
Erlaubnis von Bruxelles Environnement.

**Nebenbefund, der einen Irrtum ausräumt:** Der vielzitierte „Baromètre bruxellois des panneaux
solaires" hat zwar eine Gemeindeauswertung, aber sie ist eine **Potenzialschätzung**
(„estimation du potentiel en terme de puissance installable par commune"), Stand 26.05.2022, und
enthält keine Download-Dateien. Wer die Barometer-Seite für den Bestand hält, hält eine
Dachflächenrechnung für eine Messung. `GEPRÜFT`.

*Nicht abgeschlossen:* Das regionale Datenportal **datastore.brussels** ist eine
JavaScript-Anwendung; seine Schnittstelle (`/rest/…`, `backend.datastore.brussels/rest/…`)
beantwortet keine der probierten Suchadressen (durchweg HTTP 404), und die Oberfläche rendert im
Prüf-Browser nur die Navigation. **Abruf gescheitert** — ob dort derselbe Bestand unter anderer
Lizenz liegt, ist offen. Ebenso ungeprüft: **BRUGEL**, der Brüsseler Regulierer, der die
PV-Daten tatsächlich erhebt und jährliche Studien („ETUDE DU PARC PHOTOVOLTAÏQUE EN RÉGION DE
BRUXELLES-CAPITALE") als PDF veröffentlicht. **Das ist der aussichtsreichste offene Faden für
Brüssel.**

---

### 2. Wallonien — RESA veröffentlicht nichts, aber der Regulierer deckt das ganze Land ab

**RESA hat kein offenes Datenangebot** (`GEPRÜFT`). Drei Adressen probiert:
`https://www.resa.be/opendata/` und `https://www.resa.be/fr/open-data/` antworten HTTP 200 —
aber im Browser geöffnet ist beides die **Startseite**; die Seite trägt keinerlei Datenkatalog,
und die Fußzeile kennt keinen Open-Data-Eintrag. `opendata.resa.be` existiert nicht. Auf dem
wallonischen Portal ODWB ist RESA ebenfalls nicht vertreten: Die Volltextsuche nach „RESA"
liefert **0 Treffer** über 1.281 Datensätze (`GEPRÜFT`).

**Wie groß die Lücke wirklich ist — gemessen statt geschätzt.** Die beiden ORES-Datensätze auf
ODWB (beide **CC0**) decken:

| Datensatz | Zeilen | Jahre | Gemeinden |
|---|---|---|---|
| `023 — Nombre de clients avec production(s) décentralisée(s) par localité` | 12.277 | **2020–2025** | **202** |
| `024 — Puissance des productions décentralisées par localité` | 13.849 | **2020–2025** | **204** |

Wallonien hat 262 Gemeinden. **Gemessen fehlen rund 58–60**, darunter Lüttich, Seraing und
Herstal (jeweils 0 Zeilen in beiden Datensätzen; Verviers dagegen ist enthalten). Die Daten sind
nach Technik (`Photovoltaïque`) und Leistungsklasse (`P ≤ 10 kVA` / `P > 10 kVA`) getrennt und
tragen Postleitzahl, Gemeinde, Ortschaft, Provinz, Bezirk und Koordinate. Zuletzt geändert
13.08.2026 bzw. 24.03.2026. `GEPRÜFT`.

**Die flächendeckende Quelle ist die CWaPE — und sie ist eine Anwendung, keine Datei.** Der
wallonische Regulierer veröffentlicht unter <https://www.cwape.be/statistiques> → „Réseaux de
gaz et d'électricité" (`/node/6468`) einen **eingebetteten Power-BI-Bericht** mit zehn Seiten,
darunter „**Taux de pénétration du photovoltaïque <=10kVA**". Im Browser geöffnet und selbst
angesehen (`GEPRÜFT`):

- Karte **aller wallonischen Gemeinden**, also einschließlich des RESA-Gebiets,
- Auswahl der **Jahre 2022 und 2023**,
- Gesamtzahl auf der Seite: **322.633 Photovoltaikanlagen zum 31.12.**,
- Definition am Bild: „Le taux de pénétration est le résultat de la division du nombre
  d'installations photovoltaïques <=10kVA par le nombre total d'EAN pour la commune considérée",
- Stand des Berichts: „Dernière mise à jour : 14-08-2026".

**Die Einschränkungen sind gravierend:** gezeigt wird ein **Prozentsatz**, nicht die Anlagenzahl
und nicht die Leistung; die Jahre enden **2023**, während ORES bis 2025 reicht; es gibt **keine
Download-Datei** und **keine Lizenzangabe** — die Zahlen stecken in einem Power-BI-Bericht auf
`app.powerbi.com`.

**Fazit Wallonien:** Für 202 von 262 Gemeinden gibt es saubere offene Daten (ORES, CC0,
2020–2025, mit Leistung und Leistungsklasse). Für die restlichen rund 60 — die Lütticher Ecke —
gibt es **keine** offene Datei, sondern nur den Prozentsatz im Power-BI-Bericht der CWaPE bis
2023. **Eine flächendeckende Wallonien-Karte aus offenen Dateien ist damit heute nicht möglich;
sie wäre es, wenn RESA seine Zahlen wie ORES veröffentlichte.**

---

## Was aus der Nachprüfung folgt

1. **Spanien bleibt bei zwei Regionen — aber die Begründung ist jetzt eine andere.** Vorher hieß
   es „in den übrigen 15 nichts gefunden". Jetzt ist in 13 von ihnen nachgesehen, und der
   Grund ist strukturell: Spanien hat schlicht kein funktionierendes nationales
   Eigenverbrauchsregister, und nur zwei Regionen veröffentlichen ihres. Die
   0,4-Prozent-Messung an der RADNE-Spalte ist der härteste Beleg dafür, den diese Recherche
   hat.
2. **Valencia ist der bessere der beiden spanischen Bestände, nicht Katalonien.** Alle 542
   Gemeinden, tagesaktuell (heute geschrieben), CC BY ausdrücklich, Modul- **und**
   Wechselrichterleistung, Status- und Ablehnungsfelder. Katalonien ist größer beim
   Inbetriebnahmedatum, steht aber inhaltlich seit dem 31.12.2025 still und hat eine unscharfe
   Lizenz.
3. **Kanaren ist ein halber Treffer und sollte als solcher notiert bleiben** — Einzelanlagen mit
   Gemeinde und Datum, aber ohne Leistung und erkennbar unvollständig. Die Datensatz-
   Beschreibung widerspricht der Datei in zwei Punkten (Eigenverbrauch angeblich ausgeschlossen;
   Leistungsspalte angekündigt, aber nicht vorhanden). **Wer sie verwendet, misst sie zuerst
   selbst.**
4. **Finnland ist abgeschlossen.** 135 Themen, 36 Energietabellen, feinste Auflösung
   `maakunta` — Solar je Gemeinde existiert nicht, und die Netzbetreiber, die es wüssten,
   geben es als Pressemeldung heraus statt als Daten.
5. **Brüssel scheitert nicht an den Daten, sondern am Recht.** Die Gemeindewerte sind da,
   aktuell und gut; die Nutzungsbedingungen erlauben ausdrücklich nur den persönlichen
   Gebrauch. Der nächste Schritt ist BRUGEL, nicht ein weiterer Datei-Fund.
6. **Wallonien hat ein Loch mit Namen: RESA.** Es ist nicht mehr „unklar, ob die Abdeckung
   reicht", sondern gemessen — 202 von 262 Gemeinden, und die fehlenden sind Lüttich und
   Umgebung.

---

## Nicht abgeschlossene Fäden (für eine spätere Sitzung)

| Faden | Warum offen | Nächster Schritt |
|---|---|---|
| Andalusien, WFS der Energieagentur | Host lehnt Verbindungen aus unserem Netz ab (ECONNREFUSED / Timeout, vier Varianten) | Aus einem spanischen Netz abrufen; erwartbar aber Infrastruktur, nicht Eigenverbrauch |
| Zenodo-Datensatz der UAM | Zenodo antwortet unserem Netz HTTP 403 („unusual traffic from your network") | Später erneut versuchen; nur nötig, wenn die Zahl 246.284 belegt werden soll |
| Extremadura, Asturien, Kantabrien, La Rioja, Galicien | eigene Portale nicht erreichbar (DNS / 404); nur über den nationalen Harvester geprüft | Portal-Adressen neu ermitteln; Erwartung gering, da der Harvester diese Regionen sonst ausspielt |
| datastore.brussels | SPA rendert nicht, REST-Adressen alle 404 | Suchweg über die Oberfläche finden oder data.europa.eu abfragen |
| **BRUGEL (Brüssel)** | nicht abgerufen | **Der aussichtsreichste offene Faden**: der Regulierer erhebt die Brüsseler PV-Daten und veröffentlicht Jahresstudien mit Gemeindeaufschlüsselung |
| Fingrid, `legal-terms` im Volltext | nur die Lizenzaussage auf der Datenportal-Seite gelesen | Volltext lesen, falls die Quelle je genutzt werden soll |
| Kanaren, „Aviso Legal" im Volltext | Lizenz-Kennung gelesen, Bedingungen nicht | Volltext lesen, bevor die Datei verwendet wird |
