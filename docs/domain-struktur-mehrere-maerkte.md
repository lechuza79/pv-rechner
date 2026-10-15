# Domain-Struktur für mehrere europäische Märkte

**Frage:** Wie adressieren wir Deutschland, Schweiz, Niederlande, Frankreich und Portugal unter
einer Marke — eine Domain mit Länderpfaden, eine Domain mit Subdomains, oder eine Landesdomain je
Markt? **Nicht** Gegenstand: der Name.

**Der Fall, an dem die üblichen Empfehlungen scheitern:** Die Schweiz ist dreisprachig, und ihr
deutschsprachiger Teil braucht trotzdem eigene Inhalte — Förderrecht, Vergütung und Strompreis sind
andere als in Deutschland. Sprache und Markt sind hier nicht dasselbe. Jede Struktur, die nur
Sprachen kennt, kann „Deutsch, aber für die Schweiz" gar nicht ausdrücken.

**Stand:** 27.09.2026. Alle Google-Zitate an diesem Tag im Original gelesen, alle Messungen an
diesem Tag erhoben. Was ungeprüft blieb, steht am Ende unter „Offene Punkte".

**Nachbardokument, am selben Tag aus einer parallelen Sitzung:**
`docs/domain-umzug-was-steht-auf-dem-spiel.md` beantwortet die **Namens**frage — was ein Wechsel
der bestehenden Domain heute kosten würde. Es überschneidet sich mit diesem Papier an zwei
Stellen (Googles Umzugs-Zitate, die Einbettungen) und widerspricht ihm an keiner; wo es misst,
habe ich die Messung unabhängig wiederholt und das Ergebnis hier übernommen.

---

## Empfehlung vorweg

**Eine Domain, Markt als erstes Pfadsegment, Sprache nur dort, wo ein Markt mehrere hat.**

```
solar-check.io/                 → hreflang de-DE   (Bestand, zieht NICHT um)
solar-check.io/ch/de/           → hreflang de-CH
solar-check.io/ch/fr/           → hreflang fr-CH
solar-check.io/ch/it/           → hreflang it-CH   (nur wenn überhaupt, siehe unten)
solar-check.io/nl/              → hreflang nl-NL
solar-check.io/fr/              → hreflang fr-FR
solar-check.io/pt/              → hreflang pt-PT
                                → hreflang x-default auf die Wurzel
```

Drei Gründe, jeder gemessen oder belegt:

1. **Die Länderendung allein bringt nichts — das ist keine Meinung, das ist gemessen.**
   `zonneplan.de` (eigene Landesendung, gleiche Marke wie das erfolgreiche `zonneplan.nl`) hat in
   Deutschland **null** Sichtbarkeit. `1komma5.nl` kommt in den Niederlanden auf 1.937 Besuche im
   Monat, während dieselbe Firma über `1komma5.com/de/` in Deutschland 72.182 erreicht. `otovo.com`
   in Deutschland: 267. `tibber.com/de` in Deutschland: 36.877 — mehr als Otovos deutsche
   Landesdomain (2.957).
2. **Wir sind zu klein zum Aufteilen.** solar-check.io steht bei 110 Keywords und rund 71 Besuchen
   im Monat (gemessen, Deutschland). Was auch immer an Autorität da ist, verträgt keine Verteilung
   auf fünf Domains.
3. **Der Einbettungs-Code trägt die Domain, und er liegt nach der Auslieferung außerhalb unserer
   Reichweite.** Heute ist die Belastung dabei messbar **null** (Abschnitt 5) — was die Frage nicht
   entschärft, sondern datiert: Die Widget-Strategie läuft, die Anschreiben an die Kommunen sind
   draußen, und mit der ersten echten Einbettung wird jede Domainentscheidung teurer. Eine Struktur, die die
   Auslieferungs-Domain nie anfassen muss, nimmt diesen Termindruck ganz heraus.

Die eine ernsthafte Gegenstimme — dass ein späteres Herauslösen eines Marktes auf eine eigene
Domain **kein** Umzugswerkzeug bei Google hat — steht unter „Zusammenlegen und Aufteilen" und
kippt die Entscheidung nicht.

---

## 1. Was Google wirklich sagt

### 1.1 Struktur: Google nennt **keine** bevorzugte Variante

Quelle: *Managing multi-regional and multilingual sites*, Google Search Central
(`developers.google.com/search/docs/specialty/international/managing-multi-regional-sites`,
gelesen 27.09.2026).

Die Seite stellt vier Varianten nebeneinander und bewertet sie mit Vor- und Nachteilen. Sie sagt an
keiner Stelle, welche Google bevorzugt. Wörtlich eingeleitet mit:

> „Consider using a URL structure that makes it easy to geotarget your site, or parts of it, to
> different regions. The following table describes your options"

Die Tabelle im Wortlaut:

| Variante | Pros | Cons |
|---|---|---|
| **Country-specific domain** `example.de` | „Clear geotargeting" · „Server location irrelevant" · „Easy separation of sites" | „Expensive (can have limited availability)" · „Requires more infrastructure" · „Strict ccTLD requirements (sometimes)" · „Can only target a single country" |
| **Subdomains with gTLD** `de.example.com` | „Easy to set up" · „Allows different server locations" · „Easy separation of sites" | „Users might not recognize geotargeting from the URL alone (is »de« the language or country?)" |
| **Subdirectories with gTLD** `example.com/de/` | „Easy to set up" · „Low maintenance (same host)" | „Users might not recognize geotargeting from the URL alone" · „Single server location" · „Separation of sites harder" |
| **URL parameters** `site.com?loc=de` | — („Not recommended.") | „URL-based segmentation difficult" · „Users might not recognize geotargeting from the URL alone" |

**Die einzige Vorgabe, die Google hier wirklich macht, betrifft nicht die Struktur, sondern die
Trennung überhaupt:**

> „Google recommends using different URLs for each language version of a page rather than using
> cookies or browser settings to adjust the content language on the page."

und, ausdrücklich gegen die Erkennung per IP:

> „Don't use IP analysis to adapt your content. IP location analysis is difficult and generally not
> reliable. Furthermore, Google may not be able to crawl variations of your site properly. Most,
> but not all, Google crawls originate from the US, and we don't attempt to vary the location to
> detect site variations."

**Für uns heißt das:** Wer „Schweiz" per IP-Erkennung auf derselben Adresse ausliefert, hat für
Google keine Schweizer Seite gebaut. Die Schweizer Inhalte brauchen eigene Adressen — in jeder der
drei Varianten.

Und eine dritte Vorgabe, die unseren Sprachumschalter betrifft:

> „Avoid automatically redirecting users from one language version of a site to a different
> language version of a site. For example, don't redirect based on what you think the user's
> language may be. These redirections could prevent users (and search engines) from viewing all the
> versions of your site."

### 1.2 Sprache UND Region gleichzeitig: `hreflang`

Quelle: *Tell Google about localized versions of your page*
(`developers.google.com/search/docs/specialty/international/localized-versions`, gelesen
27.09.2026).

> „The `hreflang` attribute's value is comprised of one or optionally two values, separated by a
> dash. For example, `en-US`. The first code of the `hreflang` attribute is the language code (in
> ISO 639-1 format) followed by an optional second code that represents the region code (in ISO
> 3166-1 Alpha 2 format) of an alternate URL."

**Der wichtigste Satz für uns steht in einem Warnkasten:**

> „**Warning:** You can't specify the country code by itself. The first code stands for the
> language and Google doesn't automatically derive the language from a country code."

Es gibt also **keine** Möglichkeit, „Schweiz" auszuzeichnen. Nur „Deutsch für die Schweiz"
(`de-CH`), „Französisch für die Schweiz" (`fr-CH`), „Italienisch für die Schweiz" (`it-CH`).

**Google dokumentiert Länder mit mehreren Amtssprachen ausdrücklich — an Belgien:**

> „To target different language speakers in Belgium, you might use the following language and
> region codes:
> - Good (German for users in Belgium): `de-BE`
> - Good (Dutch for users in Belgium): `nl-BE`
> - Good (French for users in Belgium): `fr-BE`
> - Bad because the first code is for language (`be` is the Belarusian language code): `be`"

**Und der Schweizer Fall steht sogar als Beispiel in derselben Seite** — das Sitemap-Beispiel von
Google zeigt genau unsere Konstellation, Deutsch weltweit gegen Deutsch für die Schweiz:

> - `www.example.com/english/page.html` targeted at English speakers.
> - `www.example.de/deutsch/page.html` targeted at German speakers.
> - `www.example.de/schweiz-deutsch/page.html` targeted at German speakers in Switzerland.

ausgezeichnet als `en`, `de` und `de-CH`. Bemerkenswert daran: Google setzt die deutsch-schweizer
Seite in diesem Beispiel **als Pfad unter die deutsche Domain**, nicht auf eine .ch-Domain. Das ist
kein Ratschlag, aber es zeigt, dass Google die Konstruktion als normal ansieht.

Dazu, weil es unsere Frage direkt berührt:

> „Alternate URLs do not need to be in the same domain."

**Die dokumentierten Fallstricke, vollständig:**

- **Fehlende Rückverweise.** „If page X links to page Y, page Y must link back to page X. If this
  is not the case for all pages that use `hreflang` annotations, those annotations may be ignored
  or not interpreted correctly." Und: „If two pages don't both point to each other, the tags will
  be ignored. This is so that someone on another site can't arbitrarily create a tag naming itself
  as an alternative version of one of your pages."
- **Jede Fassung muss sich selbst mitnennen.** „Each language version must list itself as well as
  all other language versions."
- **Absolute Adressen.** „Alternate URLs must be fully-qualified, including the transport method
  (http/https)".
- **Falsche Sprachcodes.** „Specifying the region alone is not valid."
- **Falsche Regionscodes.** „If you use codes that are listed as reserved for something else,
  Google Search ignores that part of the annotation (for example, using `EU`, `UN`, or `UK` in
  `hreflang` annotations doesn't have an effect on Google Search)." — Großbritannien heißt `GB`.
- **Ein Sammel-Eintrag für die Sprache ohne Region wird empfohlen**, wenn es mehrere Regionen
  derselben Sprache gibt: „if you have specific URLs for English speakers in Ireland (`en-IE`),
  Canada (`en-CA`), and Australia (`en-AU`), provide a generic English (`en`) page for searchers in
  the US, UK, and all other English-speaking locations."
- **`x-default`** für alles Unpassende: „The reserved `x-default` value is used when no other
  language/region matches the user's browser setting."
- **Drei Wege, kein Vorteil aus mehreren:** „The three methods are equivalent from Google's
  perspective … While you can use all three methods at the same time, there's no benefit in Search
  (in fact, it maybe be much harder to manage three implementations instead of just picking one)."

**Was `hreflang` NICHT tut** — und das ist die häufigste Zuspitzung:

> „Google doesn't use `hreflang` or the HTML `lang` attribute to detect the language of a page;
> instead, we use algorithms to determine the language."

`hreflang` ist ein Zuordnungs-, kein Rangsignal. Es sorgt dafür, dass der richtige der eigenen
Treffer ausgespielt wird — es bringt keinen Treffer, den es sonst nicht gäbe.

**Konsequenz für unser Vorhaben:** Wir müssen die Sprache der Schweizer Seiten **sichtbar** machen,
nicht nur auszeichnen. Google bestimmt sie aus dem Text.

### 1.3 Ist die Länderendung noch ein Rangsignal?

**Was Google sagt** (dieselbe Multi-Regional-Seite, Abschnitt „How does Google determine a target
locale?"):

> „**Country-code top-level domain names (ccTLDs).** These are tied to a specific country (for
> example .de for Germany, .cn for China), and therefore provide a strong signal to both users and
> search engines that your site is explicitly intended for a certain country."

Danach, in absteigender Nennung: `hreflang`-Angaben, Server-Standort, und „Other signals … local
addresses and phone numbers on the pages, the use of local language and currency, links from other
local sites".

**Zur Stärke sagt Google genau einen Satz, und er ist ein Tausch, kein Zugewinn:**

> „You can target your website or parts of it to users in a single specific country that speaks a
> specific language. This can improve your page rankings in the target country, but at the expense
> of results in other locales or languages."

**Was Google ausdrücklich NICHT tut:**

> „Google ignores locational meta tags (like `geo.position` or `distribution`) or geotargeting HTML
> attributes."

> „Google crawls the web from different locations around the world. We do not attempt to vary the
> crawler source used for a single site in order to find any possible variations in a page."

**Und der Punkt, der uns unmittelbar betrifft: `.io` ist bei Google keine Länderendung.** Dieselbe
Seite führt eine Liste von Endungen, die Google trotz Ländercode als generisch behandelt:

> „**Generic Country Code Top Level Domains (ccTLDs):** Google treats some ccTLDs (such as .tv and
> .me) as gTLDs, as we've found that users and website owners frequently see these more generic
> than country-targeted."

Die Liste lautet: `.ad .ai .as .bz .cc .cd .co .dj .fm .io .la .me .ms .nu .sc .sr .su .tv .tk .ws`
— **`.io` steht darin.**

**Daraus folgt eine Tatsache, die die ganze Debatte entschärft:** solar-check.io hat heute
**überhaupt kein** Länder-Signal aus der Domain. Unsere deutsche Sichtbarkeit steht allein auf
Sprache, Inhalt, eingehenden Verweisen und dem Server-Standort (`fra1`). Die Sorge, wir könnten
durch das Öffnen für weitere Märkte ein deutsches Geotargeting verlieren, ist gegenstandslos — wir
haben nie eines gehabt.

**Und die zweite Stelle, an der man es hätte setzen können, gibt es nicht mehr.** Die
Länder-Einstellung in der Search Console ist abgeschaltet. Google Search Central Blog, *Thanks,
2022* (gelesen 27.09.2026):

> „the team cleaned up some legacy tools that had little impact on Google Search, such as the URL
> Parameter Tool and the International Targeting report."

Die zugehörige Hilfeseite (`support.google.com/webmasters/answer/6058502`) antwortet heute: „This
page doesn't exist in Search Console Help. It may be deleted because the feature doesn't exist
anymore." Passend dazu nennt die aktuelle Multi-Regional-Seite als Wege zum Geotargeting nur noch
zwei: „Page or site level: Use locale-specific URLs" und „Page level: Use `hreflang` or sitemaps".

**Das verschiebt die Lage gegenüber jedem älteren Ratgeber:** Für eine generische Endung mit
Länderpfaden war die Search-Console-Einstellung früher der ausdrückliche Ersatz für die
Länderendung. Den gibt es nicht mehr. Übrig bleibt `hreflang` — und genau deshalb ist `hreflang`
bei Variante A und B keine Kür, sondern die tragende Konstruktion.

### 1.4 Zusammenlegen und Aufteilen

**Zusammenlegen** (Search Console Help, *Change of Address tool*, gelesen 27.09.2026):

> „**Try not to combine multiple moves to a single location.** Moving sites A, B, and C all to new
> location D can cause some confusion and traffic loss. You might want to move sites one at a time
> to the new, combined location and wait till traffic stabilizes before moving the next site."

> „**Don't chain site moves.** If you submit a change of address to redirect traffic from site A to
> site B, you can't immediately submit another change of address from site B to site C."

Dauer je Umzug: „These actions continue for 180 days after you start migration in Search Console."
Und: „After the 180 day period, Google does not recognize any relationship between the old and new
sites, and treats the old site as an unrelated site, if still present and crawlable."

**Aufteilen — und hier liegt die Asymmetrie, die man kennen muss:**

> „The Change of Address tool can be used only on properties at the domain level: that is, you can
> move `example.com`, `m.example.com`, or `http://example.com`. **You cannot move properties at the
> path level**, such as `http://example.com/petstore/`"

Umgekehrt ist es erlaubt:

> „you can use the tool to migrate your site from one domain to a path within another domain. For
> instance, from `example.com` to `example3.com/new/location/`."

**Also: Landesdomain → Unterverzeichnis wird vom Umzugswerkzeug unterstützt. Unterverzeichnis →
eigene Landesdomain nicht.** Das ist ein echtes Argument für Variante C, und es wäre unredlich, es
wegzulassen.

**Warum es die Entscheidung trotzdem nicht kippt:** Das Werkzeug ist ein Beschleuniger, keine
Voraussetzung. Google zu Weiterleitungen (*How to move a site*, gelesen 27.09.2026):

> „**Don't worry about link credit.** 301 and other permanent redirects don't cause a loss in
> PageRank."

> „Keep the redirects for as long as possible, generally at least 1 year. This timeframe allows
> Google to transfer all signals to the new URLs, including recrawling and reassigning links on
> other sites that point to your old URLs. From users' perspective, consider keeping redirects
> indefinitely."

Ein späteres Herauslösen kostet also 301-Weiterleitungen und Geduld, nicht die Verweise. Dagegen
steht ein Aufteilen von Tag eins, dessen Preis oben gemessen ist. Und ein Markt, der groß genug
geworden ist, um eine eigene Domain zu rechtfertigen, trägt den Umzug dann selbst.

Zwei weitere Sätze aus dem Umzugs-Leitfaden, die für jede Variante gelten:

> „**Change only one thing at a time.** Plan your changes to your site one after the other, not
> everything at the same time."

> „When moving a site, keeping the same site architecture in the new location helps to pass the
> signals more directly to the new site. If you combine a site move with a redesign of the site's
> content and URL structure in the new location, you will probably see some traffic loss".

### 1.5 Doppelte Inhalte zwischen Deutschland und der Deutschschweiz

Google benennt genau unsere Konstellation:

> „If you provide similar or duplicate content on different URLs in the same language as part of a
> multi-regional site (for instance, if both `example.de/` and `example.com/de/` show similar
> German language content), pick a preferred version and use the `rel="canonical"` element and
> `hreflang` tags to make sure that the correct language or regional URL is served to searchers."

Und, wichtig für die Frage, ob unsere Schweizer Seiten überhaupt als Dubletten gelten:

> „Localized versions of a page are only considered duplicates if the main content of the page
> remains untranslated."

**Für uns:** `/` und `/ch/de/` sind beide deutsch und sehen sich ähnlich. Was sie trennt, sind die
Zahlen — Einspeisevergütung, Förderrecht, Strompreis. Solange die Zahlen und die daraus gerechneten
Aussagen wirklich andere sind, ist es kein Dublettenfall, sondern der dokumentierte Normalfall
„small regional variations with similar content, in a single language". Solange sie es **nicht**
sind, bauen wir eine Dublette und sollten die Seite gar nicht erst veröffentlichen. Das ist
zugleich die inhaltliche Messlatte für den Schweizer Start.

### 1.6 Ein Nebeneffekt, der nur eine Domain betrifft

Google Search Central, *A Guide to Google Search Ranking Systems*, Abschnitt „Site diversity
system" (gelesen 27.09.2026):

> „Our site diversity system works so that we generally won't show more than two web page listings
> from the same site in our top results … **Site diversity generally treats subdomains as part of a
> root domain.** IE: listings from a subdomain (`subdomain.example.com`) and the root domain
> (`example.com`) will all be considered from the same single site. However, sometimes subdomains
> are treated as separate sites for diversity purposes when deemed relevant to do so."

Zwei Folgerungen:

- **Subdomains kaufen keine Trennung.** Wer Variante B wählt, um sich von der Zwei-Treffer-Grenze
  zu befreien, bekommt sie nicht.
- **Für uns kostet die Grenze nichts.** Sie greift nur, wo zwei eigene Seiten auf **derselben**
  Anfrage stehen. Über Ländergrenzen hinweg passiert das praktisch nicht — andere Sprache, andere
  Orte. Das deckt sich mit unserer eigenen Grundregel „keine Eigenkannibalisierung"
  (`lib/seo-grundregeln.ts`), die denselben Absatz als Beleg führt.

### 1.7 Was bei Google NICHT steht — und deshalb nicht als Google-Aussage zitiert werden darf

Dieses Projekt hat sich schon einmal an einer weitergetragenen Behauptung verbrannt (siehe
CLAUDE.md, Absatz zur Verzeichnistiefe). Deshalb ausdrücklich:

1. **„Unterverzeichnisse erben die Autorität der Domain, Subdomains nicht."** In keiner aktuellen
   Search-Central-Seite zu finden. Was dokumentiert ist, ist die Pro/Contra-Tabelle und der
   Site-Diversity-Satz oben — und der sagt das Gegenteil der zweiten Hälfte (Subdomains zählen
   dort als dieselbe Site). Die kursierende Fassung stammt aus Aussagen einzelner Google-Mitarbeiter
   in Videos und Kurznachrichten, nicht aus der Dokumentation. **Wer sie braucht, beschafft zuerst
   die Fundstelle.**
2. **„Eine Länderendung rankt in ihrem Land besser."** Google sagt „strong signal" für das
   *Geotargeting* und nennt als Wirkung einen Tausch („at the expense of results in other locales
   or languages"), keinen Zugewinn. Unsere Messung unten zeigt, dass der Tausch ohne Inhalt und
   Verweise gar nichts einbringt.
3. **„`hreflang` ist ein Rankingfaktor."** Widerlegt durch Googles eigenen Satz, dass `hreflang`
   für die Spracherkennung nicht benutzt wird.
4. **„Das Land stellt man in der Search Console ein."** Gibt es seit 2022 nicht mehr.
5. **„Man kann mit `hreflang=\"ch\"` die Schweiz ansprechen."** Ausdrücklich falsch, siehe
   Warnkasten.

---

## 2. Wie es echte Mehrmarkt-Angebote wirklich machen

Alle Seiten am 27.09.2026 selbst abgerufen (Endadresse, `html lang`, `canonical`, alle
`link rel="alternate"`-Auszeichnungen).

| # | Anbieter | Was es ist | Struktur | Sprachauszeichnung |
|---|---|---|---|---|
| 1 | **Otovo** | Solar-Rechner + Marktplatz, 13+ Länder | **Eine Landesdomain je Markt**: otovo.de, otovo.fr, otovo.es, otovo.pt, otovo.ch, otovo.at, otovo.be, otovo.no; otovo.com als englische Dachseite. Innerhalb der Landesdomain ein Gebietskürzel als Pfad: `otovo.ch/de-ch`, `otovo.be/nl-be` | **Keine.** Null `hreflang` auf allen geprüften Seiten — obwohl otovo.de und otovo.ch/de-ch beide deutsch sind, also genau der Fall, für den Google `rel=canonical` + `hreflang` verlangt |
| 2 | **Tibber** | Energieanbieter, mehrere Länder | **Eine generische Domain mit Länderpfaden**: tibber.com/de, /nl, /no | Nur ein selbstbezüglicher Eintrag (`de-DE` → sich selbst). Da es keine Rückverweise auf die anderen Fassungen gibt, ist das nach Googles Regel wirkungslos |
| 3 | **Zonneplan** | Solaranbieter NL + DE | **Zwei Landesdomains**: zonneplan.nl, zonneplan.de | Keine |
| 4 | **Viessmann** | Heiztechnik, ~46 Länder | **Eine Landesdomain je Markt, Sprache als Pfad darin**: viessmann.ch/ (de) + /it.html + /fr-Pfad; viessmann.be/ (nl) + /fr.html; viessmann.lu/ (fr) + /de.html | **Vollständiges Netz über alle 46 Domains.** Mehrsprachige Länder sauber als Sprache-Region: `de-CH`, `it-CH`, `nl-BE`, `fr-BE`, `de-LU`, `fr-LU`. Einsprachige Länder oft nur mit blankem Sprachcode (`pl`, `cs`, `da`) |
| 5 | **Vaillant** | Heiztechnik | **Landesdomain + Sprachpfade**: vaillant.ch/privatkunden/ und /particuliers/ | `de-CH`/`fr-CH` vorhanden — aber **fehlerhaft**: `de-CH` steht zweimal mit **zwei verschiedenen Zielen**, dazu dieselben Codes klein geschrieben. Da Google die Werte ausdrücklich ohne Rücksicht auf Groß-/Kleinschreibung liest, sind das widersprüchliche Angaben für denselben Schlüssel |
| 6 | **moneyland.ch** | Vergleichsportal Schweiz, mehrsprachig | **Eine Landesdomain, Sprache als Pfad**: /de, /fr, /en | Keine |
| 7 | **comparis.ch** | größtes Schweizer Vergleichsportal | **Eine Domain.** `fr.`, `it.` und `en.comparis.ch` existieren im DNS, sind aber Aliasse auf denselben Host wie `www.` | Nicht lesbar — die Seite weist Abrufe von hier aus mit HTTP 403 ab (Bot-Schutz). **Teilweise ungeprüft** |
| 8 | **energiefranken.ch** | **Schweizer Förderdatenbank — unser direktes Gegenstück** | **Eine eigene Domain je Sprache**: energiefranken.ch/de, francsenergie.ch/fr, franchienergia.ch/it | `hreflang` `de`/`fr`/`it` — **blanke Sprachcodes ohne Region** |
| 9 | **EnergieSchweiz** (Bund) | Energieportal des Bundes | **Eine eigene Domain je Sprache**: energieschweiz.ch, suisseenergie.ch, svizzeraenergia.ch | `de`/`fr`/`it`, ebenfalls ohne Region |
| 10 | **Pronovo** | Schweizer Vergütungsstelle | **Eine Domain, Sprache als Pfad**: pronovo.ch, /fr/, /it/ | `de`/`fr`/`it`, ohne Region |
| 11 | **1KOMMA5°** | Solaranbieter, mehrere Länder | **Mischform**: 1komma5.com/de/, /en/, /es/, /cat/, /dk/, /fi/, /se/, /au/ — **aber** 1komma5.nl als eigene Landesdomain | `x-default` → /de/; Spanien mit zwei Sprachen als `es-ES` und `ca-ES` — dieselbe Bauform wie unser Schweizer Fall |
| 12 | **Selectra** | Energie-Vergleichsportal, viele Länder | **Eine eigene Domain je Land, verschiedene Endungen**: selectra.info (FR), selectra.net (IT) … | Nur selbstbezüglich |
| 13 | **Statista** | Datenportal | **Sprach-Subdomain**: de.statista.com neben www.statista.com | Nur `en` → www; die früheren fr./es.-Subdomains leiten heute auf Pfade unter www |

**Drei Beobachtungen, die man nicht erwartet:**

- **Die Hälfte dieser Anbieter verzichtet ganz auf `hreflang`** (Otovo, Zonneplan, moneyland) oder
  setzt es wirkungslos ein (Tibber, Selectra). Das ist keine Empfehlung — es zeigt nur, dass die
  Auszeichnung in der Praxis oft fehlt und die betroffenen Seiten trotzdem ranken. Sie ist ein
  Zuordnungs-, kein Rangsignal, genau wie Google sagt.
- **Sauber gemacht wird es dort, wo ein Land mehrere Sprachen hat** — Viessmann und Vaillant, also
  genau die beiden mit Schweiz, Belgien und Luxemburg im Portfolio. Das ist die Konstellation, in
  der es ohne Auszeichnung nicht geht.
- **Die Schweizer Anbieter selbst benutzen fast nie `de-CH`, sondern blankes `de`.** Bei ihnen
  trägt die `.ch`-Endung das Land, die Auszeichnung nur noch die Sprache. **Diese Abkürzung steht
  uns nicht offen**: Auf einer generischen Domain gibt es nichts, was das Land trägt. Ein blankes
  `de` auf `/ch/de/` hieße „Deutsch, unabhängig von der Region" und stünde damit in direkter
  Konkurrenz zu unserer deutschen Startseite. Für uns ist `de-CH` nicht Feinschliff, sondern die
  einzige Möglichkeit, die beiden Fassungen überhaupt auseinanderzuhalten.

### 2.1 Und wie erfolgreich sind sie?

Gemessen 27.09.2026 mit DataForSEO (`dataforseo_labs/google/domain_rank_overview/live`,
Kosten des ganzen Laufs 1,23 $). „Traffic/Monat" ist der geschätzte organische Wert des Dienstes
(ETV), keine gemessene Besucherzahl — brauchbar für **Größenordnungen und Vergleiche**, nicht als
absolute Zahl.

**Wichtige Einschränkung, die man beim Lesen nicht vergessen darf:** Bei den Schweizer Zeilen ist
`de`/`fr`/`it` die **Sprache der Suchoberfläche**, nicht die Sprache der gefundenen Seite. Dieselbe
Seite kann in allen drei Abfragen auftauchen. **Die drei Schweizer Zahlen einer Domain dürfen
deshalb nicht addiert werden.** (Die getrennten Sprachdomänen — energiefranken/francsenergie/
franchienergia, energieschweiz/suisseenergie/svizzeraenergia — sind davon ausgenommen: dort ist die
Sprache die Domain.)

| Domain | Markt | Keywords | Traffic/Monat |
|---|---|---|---|
| **Landesdomain je Markt** | | | |
| otovo.fr | Frankreich | 2.518 | 13.293 |
| otovo.pt | Portugal | 300 | 4.875 |
| otovo.de | Deutschland | 1.570 | 2.957 |
| otovo.es | Spanien | 528 | 2.392 |
| otovo.no | Norwegen | 299 | 3.156 |
| otovo.ch | Schweiz | 288 | 449 |
| otovo.com | Deutschland | 38 | 267 |
| zonneplan.nl | Niederlande | 5.814 | 89.919 |
| **zonneplan.de** | **Deutschland** | **0** | **0** |
| 1komma5.nl | Niederlande | 642 | 1.937 |
| selectra.info | Frankreich | 127.404 | 2.330.898 |
| selectra.net | Italien | 49.748 | 776.264 |
| viessmann.de | Deutschland | 24.774 | 641.995 |
| viessmann.fr | Frankreich | 5.659 | 77.247 |
| octopusenergy.de | Deutschland | 5.347 | 167.699 |
| **Eine Domain mit Länderpfaden** | | | |
| tibber.com | Deutschland | 1.986 | 36.877 |
| tibber.com | Niederlande | 927 | 9.313 |
| tibber.com | Norwegen | 2.067 | 20.145 |
| 1komma5.com | Deutschland | 11.308 | 72.182 |
| **Subdomain** | | | |
| de.statista.com | Deutschland | 141.890 | 3.291.438 |
| www.statista.com | Deutschland | 19.465 | 72.438 |
| statista.com (gesamt) | Deutschland | 161.623 | 3.367.309 |
| **Zum Vergleich** | | | |
| solar-check.io | Deutschland | 110 | 71 |

**Was daraus folgt — drei Vergleiche innerhalb derselben Marke, also ohne den üblichen
Marken-Störfaktor:**

1. **Zonneplan:** `.nl` = 89.919, `.de` = **0**. Eine Landesendung ohne Inhalt und Verweise ist ein
   leeres Versprechen. Die Endung hat für den deutschen Markt exakt nichts bewirkt.
2. **1KOMMA5°:** `.com/de/` = 72.182, eigene `.nl`-Landesdomain = 1.937. Der Markt, der auf der
   Hauptdomain liegt, ist um den Faktor 37 sichtbarer als der ausgelagerte.
3. **Otovo vs. Tibber, gleicher Markt:** Otovos deutsche Landesdomain 2.957, Tibbers Pfad auf einer
   generischen Domain 36.877. In Norwegen dasselbe Bild (otovo.no 3.156, tibber.com 20.145).

**Und Statista zeigt, dass Subdomains funktionieren:** `de.statista.com` trägt 98 % des deutschen
Traffics der Marke. Der Abruf ist subdomain-genau (Summe der Teile ≈ Gesamtdomain), das ist
geprüft.

**Der ehrliche Gegenbefund:** Otovo rankt in **jedem** seiner Märkte, Selectra in großem Maßstab —
die Landesdomain-Strategie funktioniert also, wenn man sie mit Inhalt füllt. Die Messung widerlegt
nicht, dass Variante C tragen kann; sie widerlegt, dass die Endung **von sich aus** etwas beiträgt.
Wer fünf Domains füllen kann, darf fünf Domains haben. Wir können es nicht.

---

## 3. Der Schweizer Sonderfall, gemessen

Gemessen 27.09.2026 an derselben Quelle, zusätzlich mit einer Auswertung nach **Pfad-Präfix** der
tatsächlich rankenden Adressen (`ranked_keywords`, bis zu 1.000 Treffer je Domain, sortiert nach
Traffic, Schweizer Suche mit Oberflächensprache Französisch). Damit lässt sich zum ersten Mal
trennen, was die Domain-Zahl oben nicht trennt: **Wie viel der Schweizer Sichtbarkeit sitzt
wirklich auf den französischen Seiten?**

### Eine Domain, Sprache als Pfad

| Domain | französische Seiten | deutsche Seiten | sonstige |
|---|---|---|---|
| **moneyland.ch** | `/fr/` — 472 Keywords, 186.308 Traffic | `/de/` — 367 / 50.382 | `/en/` — 161 / 43.232 |
| **pronovo.ch** | `/fr/` — 54 / 1.808 | `/de/` — 47 / 622 | Wurzel 184 / 705 · `/it/` — 1 / 1 |
| **viessmann.ch** | fr-Pfade — 207 / 9.562 | 351 / 14.170 | `/it` — 16 / 307 |
| **vaillant.ch** | fr-Pfade — 185 / 4.555 | (Rest) 229 / 4.982 | — |

Bei allen vier trägt die französische Fassung einen erheblichen, bei moneyland und pronovo sogar
den **größten** Teil der französischsprachigen Schweizer Sichtbarkeit. Die Sprache im Pfad
funktioniert.

### Eine eigene Domain je Sprache

| Produkt | Deutsch | Französisch | Italienisch |
|---|---|---|---|
| **Förderdatenbank** | energiefranken.ch — 207 Keywords / **801** | francsenergie.ch — 73 / **394** | franchienergia.ch — 3 / **5** |
| **Bundesportal** | energieschweiz.ch — 2.203 / **34.328** | suisseenergie.ch — 586 / **21.884** | svizzeraenergia.ch — 68 / **2.541** |

**Der Befund:** Die italienische Fassung bricht in beiden Fällen weg — auf 0,6 % bzw. 7 % der
deutschen. Bei der Förderdatenbank ist die italienische Domain mit 3 Keywords faktisch nicht
vorhanden.

**Wie belastbar ist das?** Der Vergleich ist nicht sauber kontrolliert: Die getrennten Domains
gehören zu kleineren Angeboten als moneyland oder comparis, und die italienische Schweiz ist
schlicht ein kleinerer Markt (rund 8 % der Bevölkerung). Ein Teil des Abstands ist Marktgröße, kein
Struktureffekt. **Was sich trotzdem sagen lässt:** Keine der vier Ein-Domain-Lösungen zeigt einen
derartigen Einbruch bei der Zweitsprache, und beide Mehr-Domain-Lösungen zeigen ihn. Wer eine
Minderheitensprache auf eine eigene Domain stellt, muss sie von null aufbauen — jede Domain sammelt
ihre Verweise selbst.

**Zwei Folgerungen für uns:**

1. **Die drei Schweizer Sprachen gehören unter dieselbe Domain wie alles andere.** Eine eigene
   Domain je Sprache ist die einzige Variante mit einem gemessenen Ausfall.
2. **Italienisch ist beim Start verzichtbar und sollte ausdrücklich zurückgestellt werden.** Selbst
   das Bundesportal mit Amtsauftrag kommt italienisch auf 7 % seiner deutschen Reichweite. Die
   Struktur muss `/ch/it/` **können**; gebaut wird es, wenn Deutsch und Französisch stehen. (Das
   ist keine Freigabeempfehlung — dafür gilt unverändert der Freigabe-Nachweis aus
   `lib/atlas-index.ts`.)

---

## 4. Was jede Variante bei uns kostet

Bestandszahlen am 27.09.2026 im Repo gemessen:

- **79** Seiten-Routen unter `app/(site)`, dazu die Gemeinde-Route mit über **11.000** Ortsseiten
- **276** Weiterleitungen in `next.config.js`
- **250** Einträge in `ATLAS_CITIES`, gut **110** Förderprogramme
- **23** Embed-Routen, **32** Einträge im Widget-Register
- **294** Vorkommen von `solar-check.io` in **173** Code-Dateien (ohne Tests, Docs, node_modules);
  `BASE_URL` ist an mindestens vier Stellen einzeln definiert, jeweils mit derselben fest
  verdrahteten Rückfallebene
- **kein** i18n-Framework, **keine** einzige selbst ausgelieferte `hreflang`-Auszeichnung
  (`lib/funding-navigation.ts` liest fremde, erzeugt keine eigenen)

### Variante A — eine Domain, Marktpfade

| Posten | Aufwand |
|---|---|
| Domains | 0 € zusätzlich (solar-check.io, 69,90 €/Jahr, läuft) |
| Zertifikate | 0 — ein Host, Vercel stellt automatisch aus |
| Search Console | **1** Property. Auswertung je Markt über den Regex-Filter auf der Seiten-Dimension — dieselbe Technik, die unsere SEO-Grundregel 3 schon als Beleg nennt |
| Weiterleitungen | **keine.** Der Bestand zieht nicht um |
| Bauzeit | ein Build, ein Deploy, ein `next.config.js` |
| Code | neues erstes Pfadsegment; die 294 Domain-Vorkommen bleiben gültig. Neu zu bauen: `hreflang`-Erzeugung, Markt-Auflösung, Sprachumschalter, Sitemap je Markt |
| Widgets | **unberührt** |
| Passt zur vorhandenen Mechanik | **ja** — CLAUDE.md: „Ein Präfix ist die einzige Steuerungseinheit, die die Plattform kennt — Header, Middleware-Matcher, robots, gestaffelte Index-Freischaltung arbeiten alle darauf." Ein Marktpräfix ist genau das |

### Variante B — eine Domain, Länder-Subdomains

| Posten | Aufwand |
|---|---|
| Domains | 0 € zusätzlich |
| Zertifikate | 0 — Vercel stellt je Subdomain automatisch aus |
| Search Console | 1 Domain-Property (`sc-domain:`) deckt alle Subdomains ab |
| Weiterleitungen | keine, wenn der Bestand auf der Wurzel bleibt |
| Bauzeit | wie A, plus host-basierte statt pfadbasierter Wegfindung |
| Code | **mehr** als A: unsere gesamte Steuerung (Middleware-Matcher, robots, Index-Staffelung, Cache-Pflichtliste, Sitemap-Tests) arbeitet auf Pfaden, nicht auf Hosts |
| Widgets | unberührt, solange die Widgets auf der Wurzel bleiben |
| Nutzen gegenüber A | **keiner, den ich belegen kann.** Googles Tabelle nennt als einzigen Vorteil gegenüber dem Unterverzeichnis „Allows different server locations" (brauchen wir nicht) und „Easy separation of sites" — letzteres wird durch die Site-Diversity-Aussage relativiert, die Subdomains als dieselbe Site behandelt |

### Variante C — eine Landesdomain je Markt

| Posten | Aufwand |
|---|---|
| Domains | `.ch` 29,90 € · `.nl` 34,90 € · `.fr` 34,90 € je Jahr (All-Inkl-Preisliste, gelesen 27.09.2026, inkl. USt). `.pt` dort nicht gelistet — **ungeprüft**. Zusammen rund **100–150 €/Jahr** plus die bestehende `.io`. Geld ist hier nicht das Argument |
| Zertifikate | 0 — mehrere Domains auf einem Vercel-Projekt, automatische Ausstellung |
| Search Console | **4–5 Properties** mit je eigener Sitemap, eigenem Index-Bericht, eigener Abdeckung. Unser GSC-Helfer (`lib/gsc-site.ts`) wählt heute **eine** Property fest nach `solar-check.io` aus; Gesundheitscheck, Sitemap-Tests und Index-Status-Abfragen brauchen alle eine Markt-Dimension |
| Weiterleitungen | Tag eins keine. Bei einer späteren Zusammenlegung **eine Adressänderung je Domain, nacheinander, je 180 Tage** — nach Googles eigener Warnung nicht gleichzeitig |
| Bauzeit | ein Vercel-Projekt reicht; teuer ist nicht der Build, sondern die vervielfachte Betriebsoberfläche |
| Code | Host-basierte Wegfindung wie B, plus markt-spezifische Kanonisierung, plus fünf robots/Sitemaps |
| Widgets | unberührt, solange solar-check.io die deutsche Domain bleibt. Ein Wechsel **auch** der deutschen Domain wäre der teure Fall (siehe Abschnitt 5) |
| Zulassung | **`.fr`: erlaubt.** AFNIC Naming Policy vom 05.05.2025, Art. 5.1 Nr. 90: „The registration or renewal of a domain name can be requested by any natural person residing and any legal person having its registered office or main establishment: in one of the European Union member states; or in one of the following countries: Iceland, Liechtenstein, Norway or Switzerland." · **`.nl`: erlaubt.** SIDN, General Terms and Conditions for Registrants, 1.1: „Anyone, living or based anywhere in the world, may apply to us through a registrar to register a .nl domain name." · **`.ch`: erlaubt, mit einer Auflage.** Die AGB von Switch sehen vor, dass die Registerbetreiberin „auf Verlangen einer im Rahmen ihrer Zuständigkeit intervenierenden Schweizer Behörde" von Haltern „ohne gültige Schweizer Korrespondenzadresse" verlangt, binnen 30 Tagen eine zu benennen — sonst wird die Domain widerrufen · **`.pt`:** die Registrierungsregeln 2026 im Volltext gelesen, **keine** Wohnsitz- oder Sitzvoraussetzung gefunden (negativer Befund, kein Zitat) |
| Autorität | **von Tag eins geteilt.** Das ist der gemessene Preis aus Abschnitt 2.1 |
| Der eine echte Vorteil | Ein späteres Zusammenlegen ist vom Umzugswerkzeug gedeckt, der umgekehrte Weg nicht (Abschnitt 1.4) |

---

## 5. Die Widget-Frage: was ein Domainwechsel mit ausgelieferten Einbettungen macht

**Zuerst die Zahl, damit die Größenordnung stimmt: Es gibt heute keine einzige echte fremde
Einbettung.** Eigene Messung 27.09.2026 in `embed_herkunft` (die Tabelle, die genau das zählt) —
alle 14 Zeilen gelesen, drei Hosts: `192.168.178.134` (eigener Rechner, 547 Aufrufe),
`www.sebastianschaeder.de` (Website des Betreibers, 22) und ein einzelner Abruf von `bing.com`
(Suchmaschinen-Vorschau). **Fremde Einbettungen: 0. GEPRÜFT.** Derselbe Befund steht unabhängig
erhoben in `docs/domain-umzug-was-steht-auf-dem-spiel.md`, Abschnitt 3.4.

**Das entschärft die Frage nicht, es datiert sie.** Heute kostet ein Domainwechsel an dieser Stelle
nichts. Sobald die erste Kommune das Widget wirklich einbaut, gilt alles Folgende — und dann ist es
nicht mehr rückgängig zu machen. Wer die Struktur jetzt so wählt, dass die Auslieferungs-Domain
nie wechseln muss, muss diesen Termin nie wieder beachten.

**Warum es dann irreversibel wird.** `lib/embed-code.ts` baut den Code, den Dritte auf
ihre Seiten kopieren, und schreibt die Domain **zweimal absolut** hinein: in `src` des Rahmens und
in die Adresse des Textlinks darunter. Dieser Textlink ist laut dem Kommentar in derselben Datei
„der eigentliche Rückverweis" — ein Rahmen zählt bei Suchmaschinen nicht als Verweis der
einbettenden Seite, der Textlink schon. Wir können beide nach der Auslieferung nicht mehr ändern.

**Was bei einem Domainwechsel passiert:**

1. **Der Textlink überlebt.** Eine dauerhafte Weiterleitung führt den Besucher weiter, und Google
   führt den Verweis mit: „301 and other permanent redirects don't cause a loss in PageRank."
2. **Der Rahmen überlebt meistens** — der Browser folgt der Weiterleitung und zeigt das Widget.
3. **Der Rahmen überlebt NICHT, wenn die einbettende Seite eine Content-Security-Policy hat, die
   unseren Host namentlich erlaubt.** Das ist der Punkt, den Ratgeber übersehen, und er ist in der
   Spezifikation eindeutig.

   W3C *Content Security Policy Level 3*, § 6.7.2.8 „Does url match expression in origin with
   redirect count?" (gelesen 27.09.2026). Die Host-Prüfung ist **unbedingt**:

   > „If expression's host-part does not host-part match url's host, return »Does Not Match«."

   Nur die **Pfad**-Prüfung wird nach einer Weiterleitung übersprungen:

   > „If expression contains a non-empty path-part, **and redirect count is 0**, then: … If
   > expression's path-part does not path-part match path, return »Does Not Match«."

   Eine Regel `frame-src https://solar-check.io` auf der Seite eines Einbettenden blockt das Ziel
   der Weiterleitung also, obwohl die Weiterleitung technisch korrekt ist. Betroffen sind genau die
   Einbettenden, die wir umwerben: kommunale Seiten mit strenger Sicherheitsrichtlinie. Sichtbar
   ist der Ausfall nur auf deren Seite — bei uns sieht alles normal aus.

4. **Die Weiterleitung müsste dauerhaft bleiben, nicht ein Jahr.** Google empfiehlt „generally at
   least 1 year" und „consider keeping redirects indefinitely". Bei Einbettungen ist „unbefristet"
   die einzige ehrliche Antwort — wir erfahren nie, wann die letzte verschwunden ist.

**Daraus zwei Dinge:**

- **Für die Strukturentscheidung:** Jede Variante, die solar-check.io als Auslieferungs-Host der
  Widgets behält, ist unproblematisch. Das gilt für A und B ohne Einschränkung und für C, solange
  die deutsche Seite auf solar-check.io bleibt. Nur ein Wechsel **der deutschen Domain** trifft die
  Einbettungen.
- **Die Messung dafür steht schon:** `embed_herkunft` zählt Einbettungen je Host. Wer je die Domain
  wechselt, kann damit **messen**, wie viele Einbettungen noch den alten Host aufrufen, statt zu
  raten. Eine Weiterleitung abzuschalten, ohne diese Zahl zu kennen, wäre dieselbe Fehlerklasse wie
  ein Prüfdatum ohne Prüfung. Was die Zählung **nicht** sieht: eine Einbettung, die nie aufgerufen
  wird, und eine, die an einer Sicherheitsrichtlinie scheitert — der geblockte Rahmen erzeugt
  keinen Aufruf bei uns. Gerade der Ausfall, um den es hier geht, ist also unsichtbar.

---

## 6. Empfehlung im Einzelnen

**Variante A: eine Domain, Markt als erstes Pfadsegment, Sprache nur in mehrsprachigen Märkten.**

### Die Adressform

```
/                    Deutschland   hreflang de-DE   + x-default
/ch/de/              Deutschschweiz              de-CH
/ch/fr/              Westschweiz                 fr-CH
/ch/it/              Tessin                      it-CH    (zurückgestellt)
/nl/                 Niederlande                 nl-NL
/fr/                 Frankreich                  fr-FR
/pt/                 Portugal                    pt-PT
```

**Warum Deutschland auf der Wurzel bleibt und nicht nach `/de/` zieht.** Das wäre ein Umzug von über
11.000 Seiten samt dem einzigen gewachsenen Ranking, das wir haben — für einen rein kosmetischen
Gewinn an Symmetrie. Google verlangt nur „different URLs for each language version"; die Wurzel
**ist** eine andere Adresse als `/nl/`. Es widerspräche zudem unserer eigenen Regel, dass Bestand
mit gewachsenem Ranking nicht umzieht, und Googles „Change only one thing at a time".

**Warum der Markt vor der Sprache steht.** Der Markt ist bei uns die Steuerungseinheit: Er bestimmt
Förderrecht, Vergütung, Datenquelle und Index-Freischaltung. Ein Präfix je Markt lässt sich mit
genau der Mechanik bedienen, die das Repo schon hat. Die Sprache bekommt nur dort eine eigene Ebene,
wo ein Markt mehrere hat — das ist dieselbe Unterscheidung nach Gattung, die wir bei den
Themen-Clustern treffen, und dieselbe Bauform, die Otovo (`otovo.ch/de-ch`), Viessmann
(`viessmann.ch/it.html`) und 1KOMMA5° (`es` neben `ca-ES`) in der Praxis verwenden.

**Eine Unschönheit, die benannt gehört:** `fr` bedeutet in `/fr/` einen Markt und in `/ch/fr/` eine
Sprache. Googles Tabelle nennt genau diese Verwechslungsgefahr als Nachteil jeder
Nicht-Landesendung („is »de« the language or country?"). Das ist ein Lesbarkeitsmangel, kein
Fehler — behoben wird er durch den sichtbaren Markt- und Sprachumschalter, nicht durch die Adresse.

### Was gebaut werden muss

1. **`hreflang` an jeder mehrfach vorhandenen Seite**, wechselseitig, absolut, jede Fassung nennt
   sich selbst mit, plus `x-default` auf die Wurzel. Wir liefern heute **keine einzige** aus — das
   ist der eigentliche Neubau. Google hält alle drei Wege für gleichwertig; für uns ist die
   **Sitemap** der naheliegende, weil wir die Sitemap ohnehin zentral erzeugen und die
   Rückverweis-Pflicht dort an einer Stelle erfüllt und testbar ist, statt in jedem Seitenkopf.
2. **Ein Test, der die Wechselseitigkeit erzwingt.** Die Regel „wenn X auf Y zeigt, muss Y auf X
   zeigen" ist genau die Sorte Bedingung, die im Browser unsichtbar bricht — dieselbe Fehlerklasse
   wie unsere Menü-Markierung. Vaillant zeigt live, wie es schiefgeht: derselbe Schlüssel zweimal
   mit zwei Zielen.
3. **Markt und Sprache als Dimension im Bestand** — Förderkatalog, Anlagenregister, Ortsseiten,
   Prüfstand, Freigabe-Nachweis. Das ist die eigentliche Arbeit; die Adressform ist der kleinere
   Teil.
4. **Kein automatisches Umleiten nach Sprache oder IP**, nur ein sichtbarer Umschalter (Googles
   ausdrückliche Vorgabe).
5. **Search Console bleibt eine Property**; die Auswertung je Markt läuft über den Regex-Filter auf
   der Seiten-Dimension.

### Wann diese Entscheidung neu aufzumachen wäre

Nur mit einem dieser Auslöser, nicht mit einer neuen Stichprobe:

- Ein Markt erreicht eine Größe, bei der eine eigene Domain sich selbst trägt — dann ist der Umzug
  eine Investition dieses Marktes und nicht mehr eine Vorabbelastung aller.
- Google nimmt eine Präferenz in die Dokumentation auf oder führt die Länder-Einstellung wieder ein.
- Ein Markt verlangt aus rechtlichen Gründen eine eigene Landesdomain. Für unsere vier ist mir
  nichts dergleichen bekannt — **ungeprüft**, weil es eine Rechtsfrage je Land ist und nicht
  Gegenstand dieser Recherche war.

---

## 7. Offene Punkte

| Punkt | Zustand |
|---|---|
| Struktur von comparis.ch (Sprachpfade oder Subdomains) | **ungeprüft** — HTTP 403 (Bot-Schutz) bei jedem Abrufversuch; im DNS existieren `fr.`/`it.`/`en.`-Aliasse auf denselben Host |
| `.pt`-Preis bei unserem Registrar | **ungeprüft** — in der All-Inkl-Preisliste nicht geführt |
| `.pt`-Zulassungsvoraussetzungen | **negativer Befund**: Registrierungsregeln 2026 im Volltext gelesen, keine Wohnsitz-/Sitzregel gefunden. Kein Zitat, weil es keine Klausel gibt, die man zitieren könnte |
| Obergrenze für Domains je Vercel-Projekt | **ungeprüft** — in der durchsuchten Vercel-Dokumentation keine Zahl gefunden. Für 5 Domains mit Sicherheit unkritisch, vor einer größeren Zahl nachzusehen |
| Rechtliche Pflicht zu einer Landesdomain in CH/NL/FR/PT | **ungeprüft**, nicht Gegenstand dieser Recherche |
| Ob Google Subdomains anders bewertet als Unterverzeichnisse | **nicht belegbar** — in keiner aktuellen Search-Central-Seite zu finden. Nicht als Google-Aussage weitertragen |
| Die Traffic-Zahlen oben | Schätzwerte eines Dienstes (DataForSEO ETV), keine gemessenen Besuche. Belastbar sind die Verhältnisse, nicht die absoluten Zahlen |
| Schweizer Sprachzeilen der Domain-Tabelle | Die Sprache ist die **Oberflächensprache der Suche**, nicht die der Seite. Die drei Zahlen einer Domain nicht addieren |

---

## Quellen

**Google Search Central** (alle am 27.09.2026 im Original gelesen)

- *Managing multi-regional and multilingual sites* — `developers.google.com/search/docs/specialty/international/managing-multi-regional-sites`
- *Tell Google about localized versions of your page* — `developers.google.com/search/docs/specialty/international/localized-versions`
- *How to move a site (with URL changes)* — `developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes`
- *A Guide to Google Search Ranking Systems* — `developers.google.com/search/docs/appearance/ranking-systems-guide`
- *Thanks, 2022* (Abschaltung des International-Targeting-Berichts) — `developers.google.com/search/blog/2022/12/thanks-2022`
- Search Console Help, *Change of Address tool* — `support.google.com/webmasters/answer/9370220`
- Search Console Help, `answer/6058502` (International Targeting) — antwortet mit „This page doesn't exist … the feature doesn't exist anymore"

**Weitere Primärquellen**

- W3C, *Content Security Policy Level 3*, § 6.7.2.8 — `www.w3.org/TR/CSP3/`
- AFNIC, *Naming Policy*, Fassung vom 05.05.2025, Art. 5.1
- SIDN, *General Terms and Conditions for .nl Registrants*, Ziff. 1.1
- Switch, *Allgemeine Geschäftsbedingungen* für `.ch` — `nic.ch/de/terms/agb/`
- .PT, *Registration Rules 2026*
- All-Inkl, Domain-Preisliste

**Messungen** (27.09.2026, DataForSEO, Gesamtkosten 1,23 $)

- `dataforseo_labs/google/domain_rank_overview/live` — 40 Domain/Markt-Paare
- `dataforseo_labs/google/ranked_keywords/live` — Pfad-Auswertung für moneyland.ch, pronovo.ch,
  viessmann.ch, vaillant.ch, comparis.ch
- Eigene Abrufe der 13 Beispielseiten (Endadresse, `html lang`, `canonical`, `link rel="alternate"`)
- Repo-Inventur: Routen, Weiterleitungen, Widgets, Domain-Vorkommen
- Direkte Abfrage von `embed_herkunft` über den Dienstschlüssel (14 Zeilen, drei Hosts)
