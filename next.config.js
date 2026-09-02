/** @type {import('next').NextConfig} */
const nextConfig = {
  // Dev server uses .next-dev/, build uses .next/ (Vercel-compatible)
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
  env: {
    NEXT_PUBLIC_BASE_URL: "https://solar-check.io",
  },
  async headers() {
    return [
      {
        // PLZ→Koordinaten-Lookup ist ein statischer, versionierter Datensatz —
        // ändert sich praktisch nie. Aggressiv & unveränderlich cachen, damit der
        // Browser ihn nicht bei jedem Rechner-/Simulations-Aufruf neu lädt.
        source: "/plz.json",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        // PLZ→AGS-Zuordnung — gleicher statischer, versionierter Datensatz
        // wie plz.json, gleiches Caching.
        source: "/plz-ags.json",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        // BKG-VG250-Geometrien für die Gemeinde-Karte (bis ~628 kB pro Datei,
        // ~11 MB gesamt) — statisch und versioniert, ohne diesen Header
        // revalidiert der Browser sie bei jedem Wiederbesuch.
        source: "/geo/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        // Harmlose Basis-Header global — MIME-Sniffing aus, Referrer sparsam.
        // Absichtlich KEIN X-Frame-Options hier: die /embed/*-Widgets müssen
        // fremd-einbettbar bleiben. Framing-Schutz sitzt gezielt auf den
        // sensiblen Seiten unten. HSTS setzt Vercel automatisch.
        // "/(.*)" ist Next.js' kanonische "alle Routen"-Form (matcht auch "/").
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      // Clickjacking-Schutz für die authentifizierten Bereiche — die dürfen
      // niemals in einem fremden iframe landen (Login/Admin-Aktionen). Je ein
      // Eintrag für den nackten Pfad und die Unterseiten.
      { source: "/dashboard", headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
      ] },
      { source: "/dashboard/(.*)", headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
      ] },
      { source: "/admin/(.*)", headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
      ] },
    ];
  },
  async redirects() {
    return [
      {
        source: "/",
        has: [{ type: "query", key: "a" }],
        destination: "/photovoltaik-rechner",
        permanent: false,
      },
      // Keyword-optimierte Slugs (Juni 2026) — alte Pfade dauerhaft umleiten,
      // damit geteilte Links (Query-Parameter werden automatisch durchgereicht)
      // und Google-Index nicht brechen.
      { source: "/rechner", destination: "/photovoltaik-rechner", permanent: true },
      // Balkon-Cluster (August 2026): Der Rechner ist unter /balkonkraftwerk
      // eingehängt worden, damit Rechner, Anmelde-Ratgeber und Themen-Einstieg
      // ein gemeinsames Präfix haben. EINE Zeile für den ganzen Bereich — genau
      // die Asymmetrie, wegen der die Entscheidung so gefallen ist: Die
      // Förderseiten unter uns haben dieselbe Umstellung 109 Zeilen gekostet,
      // weil dort jede Seite einzeln umziehen musste.
      { source: "/balkonkraftwerk-rechner", destination: "/balkonkraftwerk/rechner", permanent: true },
      // Ratgeber des Balkon-Bereichs bekommen eine eigene Ebene (19.08.2026).
      // Grund ist NICHT das Ranking — Verzeichnistiefe zaehlt dort nicht —,
      // sondern Steuerung und Auswertung: Nur mit gemeinsamem Pfadstueck laesst
      // sich eine Kategorie einzeln freischalten, auf noindex setzen und in der
      // Search Console gegen die Werkzeuge vergleichen. Flach gibt es genau eine
      // Steuerungseinheit fuer den ganzen Bereich.
      // Bewusst JETZT, einen Tag nach dem Livegang: Die Adressen sind gerade erst
      // zur Indexierung eingereicht, eine Weiterleitung darauf ist der billigste
      // Moment ueberhaupt. Es ist EINE Zeile — spaeter waere es eine je Artikel.
      { source: "/balkonkraftwerk/anmelden", destination: "/balkonkraftwerk/ratgeber/anmelden", permanent: true },
      { source: "/waermepumpe", destination: "/waermepumpe-rechner", permanent: true },
      { source: "/energie", destination: "/strommix-deutschland", permanent: true },
      { source: "/empfehlung", destination: "/pv-bedarf-berechnen", permanent: true },
      { source: "/simulation", destination: "/pv-simulation", permanent: true },
      { source: "/embed-demo", destination: "/energie-widgets", permanent: true },
      // Ratgeber unter /ratgeber/ gebündelt (Slug-Umstellung Juli 2026) — alte flache Pfade dauerhaft umleiten
      { source: "/lohnt-sich-pv-mit-speicher", destination: "/ratgeber/lohnt-sich-pv-mit-speicher", permanent: true },
      { source: "/lohnt-sich-pv-ohne-einspeiseverguetung", destination: "/ratgeber/lohnt-sich-pv-ohne-einspeiseverguetung", permanent: true },
      // Jahreszahl aus der Adresse (26.08.2026). Beide alten Pfade zeigen direkt
      // auf das ENDZIEL, nicht aufeinander: Der erste Eintrag zeigte bis dahin auf
      // `/ratgeber/waermepumpe-foerderung-2026` und wurde umgebogen. Wer ihn stehen
      // lässt und die zweite Weiterleitung danebenhängt, baut eine Kette aus zwei
      // Sprüngen — Google folgt ihr zwar, überträgt die Signale aber über den
      // Umweg, und jeder weitere Umzug verlängert sie.
      { source: "/waermepumpe-foerderung-2026", destination: "/ratgeber/waermepumpe-foerderung", permanent: true },
      { source: "/ratgeber/waermepumpe-foerderung-2026", destination: "/ratgeber/waermepumpe-foerderung", permanent: true },
      // Förder-Stadtseiten: flache Slugs → Hierarchie Bundesland/Kommune.
      // Feste historische Zuordnung (alte URLs wachsen nicht mehr) — bei neuer
      // Stadt hier ergänzen (Quelle: lib/atlas-cities.ts).
      { source: "/photovoltaik-foerderung/stuttgart", destination: "/photovoltaik-foerderung/baden-wuerttemberg/stuttgart", permanent: true },
      { source: "/photovoltaik-foerderung/karlsruhe", destination: "/photovoltaik-foerderung/baden-wuerttemberg/karlsruhe", permanent: true },
      { source: "/photovoltaik-foerderung/regensburg", destination: "/photovoltaik-foerderung/bayern/regensburg", permanent: true },
      { source: "/photovoltaik-foerderung/wuerzburg", destination: "/photovoltaik-foerderung/bayern/wuerzburg", permanent: true },
      { source: "/photovoltaik-foerderung/frankfurt", destination: "/photovoltaik-foerderung/hessen/frankfurt", permanent: true },
      { source: "/photovoltaik-foerderung/darmstadt", destination: "/photovoltaik-foerderung/hessen/darmstadt", permanent: true },
      { source: "/photovoltaik-foerderung/koeln", destination: "/photovoltaik-foerderung/nordrhein-westfalen/koeln", permanent: true },
      { source: "/photovoltaik-foerderung/duesseldorf", destination: "/photovoltaik-foerderung/nordrhein-westfalen/duesseldorf", permanent: true },
      { source: "/photovoltaik-foerderung/muenchen", destination: "/photovoltaik-foerderung/bayern/muenchen", permanent: true },
      { source: "/photovoltaik-foerderung/nuernberg", destination: "/photovoltaik-foerderung/bayern/nuernberg", permanent: true },
      { source: "/photovoltaik-foerderung/freiburg", destination: "/photovoltaik-foerderung/baden-wuerttemberg/freiburg", permanent: true },
      { source: "/photovoltaik-foerderung/heidelberg", destination: "/photovoltaik-foerderung/baden-wuerttemberg/heidelberg", permanent: true },
      { source: "/photovoltaik-foerderung/mannheim", destination: "/photovoltaik-foerderung/baden-wuerttemberg/mannheim", permanent: true },
      { source: "/photovoltaik-foerderung/muenster", destination: "/photovoltaik-foerderung/nordrhein-westfalen/muenster", permanent: true },
      { source: "/photovoltaik-foerderung/aachen", destination: "/photovoltaik-foerderung/nordrhein-westfalen/aachen", permanent: true },
      { source: "/photovoltaik-foerderung/wiesbaden", destination: "/photovoltaik-foerderung/hessen/wiesbaden", permanent: true },
      { source: "/photovoltaik-foerderung/mainz", destination: "/photovoltaik-foerderung/rheinland-pfalz/mainz", permanent: true },
      { source: "/photovoltaik-foerderung/leipzig", destination: "/photovoltaik-foerderung/sachsen/leipzig", permanent: true },
      { source: "/photovoltaik-foerderung/hannover", destination: "/photovoltaik-foerderung/niedersachsen/hannover", permanent: true },
      { source: "/photovoltaik-foerderung/dresden", destination: "/photovoltaik-foerderung/sachsen/dresden", permanent: true },
      { source: "/photovoltaik-foerderung/dortmund", destination: "/photovoltaik-foerderung/nordrhein-westfalen/dortmund", permanent: true },
      { source: "/photovoltaik-foerderung/essen", destination: "/photovoltaik-foerderung/nordrhein-westfalen/essen", permanent: true },
      { source: "/photovoltaik-foerderung/bonn", destination: "/photovoltaik-foerderung/nordrhein-westfalen/bonn", permanent: true },
      { source: "/photovoltaik-foerderung/kiel", destination: "/photovoltaik-foerderung/schleswig-holstein/kiel", permanent: true },
      { source: "/photovoltaik-foerderung/erfurt", destination: "/photovoltaik-foerderung/thueringen/erfurt", permanent: true },
      { source: "/photovoltaik-foerderung/magdeburg", destination: "/photovoltaik-foerderung/sachsen-anhalt/magdeburg", permanent: true },
      { source: "/photovoltaik-foerderung/potsdam", destination: "/photovoltaik-foerderung/brandenburg/potsdam", permanent: true },
      { source: "/photovoltaik-foerderung/rostock", destination: "/photovoltaik-foerderung/mecklenburg-vorpommern/rostock", permanent: true },
      { source: "/photovoltaik-foerderung/saarbruecken", destination: "/photovoltaik-foerderung/saarland/saarbruecken", permanent: true },
      { source: "/photovoltaik-foerderung/augsburg", destination: "/photovoltaik-foerderung/bayern/augsburg", permanent: true },
      { source: "/photovoltaik-foerderung/kassel", destination: "/photovoltaik-foerderung/hessen/kassel", permanent: true },
      { source: "/photovoltaik-foerderung/luebeck", destination: "/photovoltaik-foerderung/schleswig-holstein/luebeck", permanent: true },
      { source: "/photovoltaik-foerderung/halle", destination: "/photovoltaik-foerderung/sachsen-anhalt/halle", permanent: true },
      { source: "/photovoltaik-foerderung/amberg", destination: "/photovoltaik-foerderung/bayern/amberg", permanent: true },
      { source: "/photovoltaik-foerderung/ansbach", destination: "/photovoltaik-foerderung/bayern/ansbach", permanent: true },
      { source: "/photovoltaik-foerderung/aschaffenburg", destination: "/photovoltaik-foerderung/bayern/aschaffenburg", permanent: true },
      { source: "/photovoltaik-foerderung/baden-baden", destination: "/photovoltaik-foerderung/baden-wuerttemberg/baden-baden", permanent: true },
      { source: "/photovoltaik-foerderung/bamberg", destination: "/photovoltaik-foerderung/bayern/bamberg", permanent: true },
      { source: "/photovoltaik-foerderung/bayreuth", destination: "/photovoltaik-foerderung/bayern/bayreuth", permanent: true },
      { source: "/photovoltaik-foerderung/bielefeld", destination: "/photovoltaik-foerderung/nordrhein-westfalen/bielefeld", permanent: true },
      { source: "/photovoltaik-foerderung/bochum", destination: "/photovoltaik-foerderung/nordrhein-westfalen/bochum", permanent: true },
      { source: "/photovoltaik-foerderung/bottrop", destination: "/photovoltaik-foerderung/nordrhein-westfalen/bottrop", permanent: true },
      { source: "/photovoltaik-foerderung/brandenburg-havel", destination: "/photovoltaik-foerderung/brandenburg/brandenburg-havel", permanent: true },
      { source: "/photovoltaik-foerderung/braunschweig", destination: "/photovoltaik-foerderung/niedersachsen/braunschweig", permanent: true },
      { source: "/photovoltaik-foerderung/bremerhaven", destination: "/photovoltaik-foerderung/bremen/bremerhaven", permanent: true },
      { source: "/photovoltaik-foerderung/chemnitz", destination: "/photovoltaik-foerderung/sachsen/chemnitz", permanent: true },
      { source: "/photovoltaik-foerderung/coburg", destination: "/photovoltaik-foerderung/bayern/coburg", permanent: true },
      { source: "/photovoltaik-foerderung/cottbus", destination: "/photovoltaik-foerderung/brandenburg/cottbus", permanent: true },
      { source: "/photovoltaik-foerderung/delmenhorst", destination: "/photovoltaik-foerderung/niedersachsen/delmenhorst", permanent: true },
      { source: "/photovoltaik-foerderung/dessau-rosslau", destination: "/photovoltaik-foerderung/sachsen-anhalt/dessau-rosslau", permanent: true },
      { source: "/photovoltaik-foerderung/duisburg", destination: "/photovoltaik-foerderung/nordrhein-westfalen/duisburg", permanent: true },
      { source: "/photovoltaik-foerderung/emden", destination: "/photovoltaik-foerderung/niedersachsen/emden", permanent: true },
      { source: "/photovoltaik-foerderung/erlangen", destination: "/photovoltaik-foerderung/bayern/erlangen", permanent: true },
      { source: "/photovoltaik-foerderung/flensburg", destination: "/photovoltaik-foerderung/schleswig-holstein/flensburg", permanent: true },
      { source: "/photovoltaik-foerderung/frankenthal", destination: "/photovoltaik-foerderung/rheinland-pfalz/frankenthal", permanent: true },
      { source: "/photovoltaik-foerderung/frankfurt-oder", destination: "/photovoltaik-foerderung/brandenburg/frankfurt-oder", permanent: true },
      { source: "/photovoltaik-foerderung/fuerth", destination: "/photovoltaik-foerderung/bayern/fuerth", permanent: true },
      { source: "/photovoltaik-foerderung/gelsenkirchen", destination: "/photovoltaik-foerderung/nordrhein-westfalen/gelsenkirchen", permanent: true },
      { source: "/photovoltaik-foerderung/gera", destination: "/photovoltaik-foerderung/thueringen/gera", permanent: true },
      { source: "/photovoltaik-foerderung/hagen", destination: "/photovoltaik-foerderung/nordrhein-westfalen/hagen", permanent: true },
      { source: "/photovoltaik-foerderung/hamm", destination: "/photovoltaik-foerderung/nordrhein-westfalen/hamm", permanent: true },
      { source: "/photovoltaik-foerderung/heilbronn", destination: "/photovoltaik-foerderung/baden-wuerttemberg/heilbronn", permanent: true },
      { source: "/photovoltaik-foerderung/herne", destination: "/photovoltaik-foerderung/nordrhein-westfalen/herne", permanent: true },
      { source: "/photovoltaik-foerderung/hof", destination: "/photovoltaik-foerderung/bayern/hof", permanent: true },
      { source: "/photovoltaik-foerderung/ingolstadt", destination: "/photovoltaik-foerderung/bayern/ingolstadt", permanent: true },
      { source: "/photovoltaik-foerderung/jena", destination: "/photovoltaik-foerderung/thueringen/jena", permanent: true },
      { source: "/photovoltaik-foerderung/kaiserslautern", destination: "/photovoltaik-foerderung/rheinland-pfalz/kaiserslautern", permanent: true },
      { source: "/photovoltaik-foerderung/kaufbeuren", destination: "/photovoltaik-foerderung/bayern/kaufbeuren", permanent: true },
      { source: "/photovoltaik-foerderung/kempten", destination: "/photovoltaik-foerderung/bayern/kempten", permanent: true },
      { source: "/photovoltaik-foerderung/koblenz", destination: "/photovoltaik-foerderung/rheinland-pfalz/koblenz", permanent: true },
      { source: "/photovoltaik-foerderung/krefeld", destination: "/photovoltaik-foerderung/nordrhein-westfalen/krefeld", permanent: true },
      { source: "/photovoltaik-foerderung/landau", destination: "/photovoltaik-foerderung/rheinland-pfalz/landau", permanent: true },
      { source: "/photovoltaik-foerderung/landshut", destination: "/photovoltaik-foerderung/bayern/landshut", permanent: true },
      { source: "/photovoltaik-foerderung/leverkusen", destination: "/photovoltaik-foerderung/nordrhein-westfalen/leverkusen", permanent: true },
      { source: "/photovoltaik-foerderung/ludwigshafen", destination: "/photovoltaik-foerderung/rheinland-pfalz/ludwigshafen", permanent: true },
      { source: "/photovoltaik-foerderung/memmingen", destination: "/photovoltaik-foerderung/bayern/memmingen", permanent: true },
      { source: "/photovoltaik-foerderung/moenchengladbach", destination: "/photovoltaik-foerderung/nordrhein-westfalen/moenchengladbach", permanent: true },
      { source: "/photovoltaik-foerderung/muelheim", destination: "/photovoltaik-foerderung/nordrhein-westfalen/muelheim", permanent: true },
      { source: "/photovoltaik-foerderung/neumuenster", destination: "/photovoltaik-foerderung/schleswig-holstein/neumuenster", permanent: true },
      { source: "/photovoltaik-foerderung/neustadt-weinstrasse", destination: "/photovoltaik-foerderung/rheinland-pfalz/neustadt-weinstrasse", permanent: true },
      { source: "/photovoltaik-foerderung/oberhausen", destination: "/photovoltaik-foerderung/nordrhein-westfalen/oberhausen", permanent: true },
      { source: "/photovoltaik-foerderung/offenbach", destination: "/photovoltaik-foerderung/hessen/offenbach", permanent: true },
      { source: "/photovoltaik-foerderung/oldenburg", destination: "/photovoltaik-foerderung/niedersachsen/oldenburg", permanent: true },
      { source: "/photovoltaik-foerderung/osnabrueck", destination: "/photovoltaik-foerderung/niedersachsen/osnabrueck", permanent: true },
      { source: "/photovoltaik-foerderung/passau", destination: "/photovoltaik-foerderung/bayern/passau", permanent: true },
      { source: "/photovoltaik-foerderung/pforzheim", destination: "/photovoltaik-foerderung/baden-wuerttemberg/pforzheim", permanent: true },
      { source: "/photovoltaik-foerderung/pirmasens", destination: "/photovoltaik-foerderung/rheinland-pfalz/pirmasens", permanent: true },
      { source: "/photovoltaik-foerderung/remscheid", destination: "/photovoltaik-foerderung/nordrhein-westfalen/remscheid", permanent: true },
      { source: "/photovoltaik-foerderung/rosenheim", destination: "/photovoltaik-foerderung/bayern/rosenheim", permanent: true },
      { source: "/photovoltaik-foerderung/salzgitter", destination: "/photovoltaik-foerderung/niedersachsen/salzgitter", permanent: true },
      { source: "/photovoltaik-foerderung/schwabach", destination: "/photovoltaik-foerderung/bayern/schwabach", permanent: true },
      { source: "/photovoltaik-foerderung/schweinfurt", destination: "/photovoltaik-foerderung/bayern/schweinfurt", permanent: true },
      { source: "/photovoltaik-foerderung/schwerin", destination: "/photovoltaik-foerderung/mecklenburg-vorpommern/schwerin", permanent: true },
      { source: "/photovoltaik-foerderung/solingen", destination: "/photovoltaik-foerderung/nordrhein-westfalen/solingen", permanent: true },
      { source: "/photovoltaik-foerderung/speyer", destination: "/photovoltaik-foerderung/rheinland-pfalz/speyer", permanent: true },
      { source: "/photovoltaik-foerderung/straubing", destination: "/photovoltaik-foerderung/bayern/straubing", permanent: true },
      { source: "/photovoltaik-foerderung/suhl", destination: "/photovoltaik-foerderung/thueringen/suhl", permanent: true },
      { source: "/photovoltaik-foerderung/trier", destination: "/photovoltaik-foerderung/rheinland-pfalz/trier", permanent: true },
      { source: "/photovoltaik-foerderung/ulm", destination: "/photovoltaik-foerderung/baden-wuerttemberg/ulm", permanent: true },
      { source: "/photovoltaik-foerderung/weiden", destination: "/photovoltaik-foerderung/bayern/weiden", permanent: true },
      { source: "/photovoltaik-foerderung/wilhelmshaven", destination: "/photovoltaik-foerderung/niedersachsen/wilhelmshaven", permanent: true },
      { source: "/photovoltaik-foerderung/wolfsburg", destination: "/photovoltaik-foerderung/niedersachsen/wolfsburg", permanent: true },
      { source: "/photovoltaik-foerderung/worms", destination: "/photovoltaik-foerderung/rheinland-pfalz/worms", permanent: true },
      { source: "/photovoltaik-foerderung/wuppertal", destination: "/photovoltaik-foerderung/nordrhein-westfalen/wuppertal", permanent: true },
      { source: "/photovoltaik-foerderung/zweibruecken", destination: "/photovoltaik-foerderung/rheinland-pfalz/zweibruecken", permanent: true },
      { source: "/photovoltaik-foerderung/rhein-erft-kreis", destination: "/photovoltaik-foerderung/nordrhein-westfalen/rhein-erft-kreis", permanent: true },
      { source: "/photovoltaik-foerderung/kreis-viersen", destination: "/photovoltaik-foerderung/nordrhein-westfalen/kreis-viersen", permanent: true },
      { source: "/photovoltaik-foerderung/kreis-bergstrasse", destination: "/photovoltaik-foerderung/hessen/kreis-bergstrasse", permanent: true },
      { source: "/photovoltaik-foerderung/mayen-koblenz", destination: "/photovoltaik-foerderung/rheinland-pfalz/mayen-koblenz", permanent: true },
      { source: "/photovoltaik-foerderung/nidda", destination: "/photovoltaik-foerderung/hessen/nidda", permanent: true },
      // Flache Alt-URLs der Gemeindeseiten (19.08.2026). Die Seiten sind neu und
      // hatten nie eine flache Adresse — der Eintrag hält nur die Regel ganz,
      // dass JEDE Stadtseite unter beiden Formen erreichbar ist, statt eine
      // Ausnahmeliste einzuführen, die niemand pflegt.
      { source: "/photovoltaik-foerderung/klempau", destination: "/photovoltaik-foerderung/schleswig-holstein/klempau", permanent: true },
      { source: "/photovoltaik-foerderung/helmstedt", destination: "/photovoltaik-foerderung/niedersachsen/helmstedt", permanent: true },
      { source: "/photovoltaik-foerderung/goettingen", destination: "/photovoltaik-foerderung/niedersachsen/goettingen", permanent: true },
      { source: "/photovoltaik-foerderung/herzberg-am-harz", destination: "/photovoltaik-foerderung/niedersachsen/herzberg-am-harz", permanent: true },
      { source: "/photovoltaik-foerderung/weyhe", destination: "/photovoltaik-foerderung/niedersachsen/weyhe", permanent: true },
      { source: "/photovoltaik-foerderung/wietzen", destination: "/photovoltaik-foerderung/niedersachsen/wietzen", permanent: true },
      { source: "/photovoltaik-foerderung/moormerland", destination: "/photovoltaik-foerderung/niedersachsen/moormerland", permanent: true },
      { source: "/photovoltaik-foerderung/bad-rothenfelde", destination: "/photovoltaik-foerderung/niedersachsen/bad-rothenfelde", permanent: true },
      { source: "/photovoltaik-foerderung/goch", destination: "/photovoltaik-foerderung/nordrhein-westfalen/goch", permanent: true },
      { source: "/photovoltaik-foerderung/hueckelhoven", destination: "/photovoltaik-foerderung/nordrhein-westfalen/hueckelhoven", permanent: true },
      { source: "/photovoltaik-foerderung/nottuln", destination: "/photovoltaik-foerderung/nordrhein-westfalen/nottuln", permanent: true },
      { source: "/photovoltaik-foerderung/senden", destination: "/photovoltaik-foerderung/nordrhein-westfalen/senden", permanent: true },
      { source: "/photovoltaik-foerderung/ennepetal", destination: "/photovoltaik-foerderung/nordrhein-westfalen/ennepetal", permanent: true },
      { source: "/photovoltaik-foerderung/wenden", destination: "/photovoltaik-foerderung/nordrhein-westfalen/wenden", permanent: true },
      { source: "/photovoltaik-foerderung/gernsheim", destination: "/photovoltaik-foerderung/hessen/gernsheim", permanent: true },
      { source: "/photovoltaik-foerderung/bad-homburg", destination: "/photovoltaik-foerderung/hessen/bad-homburg", permanent: true },
      { source: "/photovoltaik-foerderung/linsengericht", destination: "/photovoltaik-foerderung/hessen/linsengericht", permanent: true },
      { source: "/photovoltaik-foerderung/maintal", destination: "/photovoltaik-foerderung/hessen/maintal", permanent: true },
      { source: "/photovoltaik-foerderung/hochheim", destination: "/photovoltaik-foerderung/hessen/hochheim", permanent: true },
      { source: "/photovoltaik-foerderung/reichelsheim", destination: "/photovoltaik-foerderung/hessen/reichelsheim", permanent: true },
      { source: "/photovoltaik-foerderung/rodgau", destination: "/photovoltaik-foerderung/hessen/rodgau", permanent: true },
      { source: "/photovoltaik-foerderung/hohenahr", destination: "/photovoltaik-foerderung/hessen/hohenahr", permanent: true },
      { source: "/photovoltaik-foerderung/gudensberg", destination: "/photovoltaik-foerderung/hessen/gudensberg", permanent: true },
      { source: "/photovoltaik-foerderung/neuwied", destination: "/photovoltaik-foerderung/rheinland-pfalz/neuwied", permanent: true },
      { source: "/photovoltaik-foerderung/hillscheid", destination: "/photovoltaik-foerderung/rheinland-pfalz/hillscheid", permanent: true },
      { source: "/photovoltaik-foerderung/hoehr-grenzhausen", destination: "/photovoltaik-foerderung/rheinland-pfalz/hoehr-grenzhausen", permanent: true },
      { source: "/photovoltaik-foerderung/wittlich", destination: "/photovoltaik-foerderung/rheinland-pfalz/wittlich", permanent: true },
      { source: "/photovoltaik-foerderung/limburgerhof", destination: "/photovoltaik-foerderung/rheinland-pfalz/limburgerhof", permanent: true },
      { source: "/photovoltaik-foerderung/boeblingen", destination: "/photovoltaik-foerderung/baden-wuerttemberg/boeblingen", permanent: true },
      { source: "/photovoltaik-foerderung/holzgerlingen", destination: "/photovoltaik-foerderung/baden-wuerttemberg/holzgerlingen", permanent: true },
      { source: "/photovoltaik-foerderung/wernau", destination: "/photovoltaik-foerderung/baden-wuerttemberg/wernau", permanent: true },
      { source: "/photovoltaik-foerderung/hattenhofen", destination: "/photovoltaik-foerderung/baden-wuerttemberg/hattenhofen", permanent: true },
      { source: "/photovoltaik-foerderung/schlierbach", destination: "/photovoltaik-foerderung/baden-wuerttemberg/schlierbach", permanent: true },
      { source: "/photovoltaik-foerderung/waiblingen", destination: "/photovoltaik-foerderung/baden-wuerttemberg/waiblingen", permanent: true },
      { source: "/photovoltaik-foerderung/herbrechtingen", destination: "/photovoltaik-foerderung/baden-wuerttemberg/herbrechtingen", permanent: true },
      { source: "/photovoltaik-foerderung/gaiberg", destination: "/photovoltaik-foerderung/baden-wuerttemberg/gaiberg", permanent: true },
      { source: "/photovoltaik-foerderung/heddesheim", destination: "/photovoltaik-foerderung/baden-wuerttemberg/heddesheim", permanent: true },
      { source: "/photovoltaik-foerderung/leimen", destination: "/photovoltaik-foerderung/baden-wuerttemberg/leimen", permanent: true },
      { source: "/photovoltaik-foerderung/oftersheim", destination: "/photovoltaik-foerderung/baden-wuerttemberg/oftersheim", permanent: true },
      { source: "/photovoltaik-foerderung/sandhausen", destination: "/photovoltaik-foerderung/baden-wuerttemberg/sandhausen", permanent: true },
      { source: "/photovoltaik-foerderung/weinheim", destination: "/photovoltaik-foerderung/baden-wuerttemberg/weinheim", permanent: true },
      { source: "/photovoltaik-foerderung/bad-krozingen", destination: "/photovoltaik-foerderung/baden-wuerttemberg/bad-krozingen", permanent: true },
      { source: "/photovoltaik-foerderung/rietheim-weilheim", destination: "/photovoltaik-foerderung/baden-wuerttemberg/rietheim-weilheim", permanent: true },
      { source: "/photovoltaik-foerderung/gailingen", destination: "/photovoltaik-foerderung/baden-wuerttemberg/gailingen", permanent: true },
      { source: "/photovoltaik-foerderung/walddorfhaeslach", destination: "/photovoltaik-foerderung/baden-wuerttemberg/walddorfhaeslach", permanent: true },
      { source: "/photovoltaik-foerderung/tuebingen", destination: "/photovoltaik-foerderung/baden-wuerttemberg/tuebingen", permanent: true },
      { source: "/photovoltaik-foerderung/forstinning", destination: "/photovoltaik-foerderung/bayern/forstinning", permanent: true },
      { source: "/photovoltaik-foerderung/poing", destination: "/photovoltaik-foerderung/bayern/poing", permanent: true },
      { source: "/photovoltaik-foerderung/gaimersheim", destination: "/photovoltaik-foerderung/bayern/gaimersheim", permanent: true },
      { source: "/photovoltaik-foerderung/ottobrunn", destination: "/photovoltaik-foerderung/bayern/ottobrunn", permanent: true },
      { source: "/photovoltaik-foerderung/putzbrunn", destination: "/photovoltaik-foerderung/bayern/putzbrunn", permanent: true },
      { source: "/photovoltaik-foerderung/unterhaching", destination: "/photovoltaik-foerderung/bayern/unterhaching", permanent: true },
      { source: "/photovoltaik-foerderung/karlshuld", destination: "/photovoltaik-foerderung/bayern/karlshuld", permanent: true },
      { source: "/photovoltaik-foerderung/vilshofen", destination: "/photovoltaik-foerderung/bayern/vilshofen", permanent: true },
      { source: "/photovoltaik-foerderung/muehlhausen", destination: "/photovoltaik-foerderung/bayern/muehlhausen", permanent: true },
      { source: "/photovoltaik-foerderung/beratzhausen", destination: "/photovoltaik-foerderung/bayern/beratzhausen", permanent: true },
      { source: "/photovoltaik-foerderung/nittenau", destination: "/photovoltaik-foerderung/bayern/nittenau", permanent: true },
      { source: "/photovoltaik-foerderung/feucht", destination: "/photovoltaik-foerderung/bayern/feucht", permanent: true },
      { source: "/photovoltaik-foerderung/roth", destination: "/photovoltaik-foerderung/bayern/roth", permanent: true },
      { source: "/photovoltaik-foerderung/dettelbach", destination: "/photovoltaik-foerderung/bayern/dettelbach", permanent: true },
      { source: "/photovoltaik-foerderung/dietmannsried", destination: "/photovoltaik-foerderung/bayern/dietmannsried", permanent: true },
      { source: "/photovoltaik-foerderung/schiltach", destination: "/photovoltaik-foerderung/baden-wuerttemberg/schiltach", permanent: true },
      { source: "/photovoltaik-foerderung/altdorf", destination: "/photovoltaik-foerderung/baden-wuerttemberg/altdorf", permanent: true },
      { source: "/photovoltaik-foerderung/steffenberg", destination: "/photovoltaik-foerderung/hessen/steffenberg", permanent: true },
      { source: "/photovoltaik-foerderung/tegernheim", destination: "/photovoltaik-foerderung/bayern/tegernheim", permanent: true },
      { source: "/photovoltaik-foerderung/lohfelden", destination: "/photovoltaik-foerderung/hessen/lohfelden", permanent: true },
      { source: "/photovoltaik-foerderung/schwebheim", destination: "/photovoltaik-foerderung/bayern/schwebheim", permanent: true },
      { source: "/photovoltaik-foerderung/asbach", destination: "/photovoltaik-foerderung/rheinland-pfalz/asbach", permanent: true },
      { source: "/photovoltaik-foerderung/parkstein", destination: "/photovoltaik-foerderung/bayern/parkstein", permanent: true },
      { source: "/photovoltaik-foerderung/marburg", destination: "/photovoltaik-foerderung/hessen/marburg", permanent: true },
      { source: "/photovoltaik-foerderung/schoenbrunn", destination: "/photovoltaik-foerderung/baden-wuerttemberg/schoenbrunn", permanent: true },
      // Hamburg/Bremen: Stadtstaaten — flacher Slug = Bundesland-Slug, daher KEIN
      // Redirect (würde die Bundesland-Seite abfangen). Stadt-Seite liegt unter
      // /hamburg/hamburg bzw. /bremen/bremen, erreichbar über die Bundesland-Seite.
      // Legacy Vercel preview host → production (handled by Next before middleware
      // so it doesn't consume middleware invocations)
      {
        source: "/:path*",
        has: [{ type: "host", value: "pv-rechner-alpha.vercel.app" }],
        destination: "https://solar-check.io/:path*",
        permanent: true,
      },
    ];
  },
}

module.exports = nextConfig
