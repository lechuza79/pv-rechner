/**
 * Die Sprungmarken der Ortsseite zeigen, in welchem Abschnitt man gerade
 * liest — und auf schmalen Bildschirmen steht genau dieser Abschnitt im Kopf
 * der Aufklappliste.
 *
 * WARUM (Betreiber, 23.09.2026): Der Entwurf färbt die aktive Marke bereits
 * (`a[aria-current="location"]`), aber es setzte sie niemand — die Regel stand
 * seit dem Übernehmen wirkungslos im Stylesheet. Und auf dem Telefon brachen
 * vier Marken neben Abo-Knopf und zwei Symbolen in eine zweite Zeile; die
 * Leiste klebt oben, also kostete das auf jeder Seite dauerhaft Bildhöhe.
 *
 * GEMESSEN WIRD DIE LESEPOSITION, nicht die Sichtbarkeit: Ein Beobachter, der
 * meldet „Abschnitt ist im Bild", schaltet bei zwei gleichzeitig sichtbaren
 * Abschnitten hin und her. Aktiv ist der letzte, dessen Anfang oberhalb der
 * Lesekante liegt — dieselbe Regel, die ein Leser selbst anwenden würde.
 */
(() => {
  const nav = document.querySelector(".v3-section-nav");
  if (!nav) return;
  const menue = nav.querySelector(".v3-nav-menu");
  const marken = [...nav.querySelectorAll(".v3-nav-links a")];
  const kopf = nav.querySelector(".v3-nav-aktiv");
  if (!marken.length) return;

  // Nach der Reihenfolge IM DOKUMENT, nicht nach der im Menü — gemessen
  // (23.09.2026): Der Förderabschnitt steht auf der Seite VOR dem
  // Energiemonitor, im Menü dahinter. Wer die Menüreihenfolge für die
  // Lesereihenfolge hält, zeigt im Energiemonitor „Förderung" an.
  const abschnitte = marken
    .map((a) => ({ a, ziel: document.querySelector(a.getAttribute("href")) }))
    .filter((x) => x.ziel)
    .sort((x, y) =>
      x.ziel.compareDocumentPosition(y.ziel) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
    );

  let aktiv = null;
  const messen = () => {
    // Ein Abschnitt gilt als der, den man liest, sobald sein Anfang im oberen
    // Drittel des Bildes steht. Gemessen (23.09.2026): Ein Sprung auf einen
    // Anker lässt dessen Oberkante bei rund 145 Pixeln liegen, die klebende
    // Leiste endet bei 67 — an ihrer Unterkante gemessen blieb die Markierung
    // nach JEDEM Sprung einen Abschnitt zurück. Das Drittel deckt beides ab:
    // den Sprung und das gewöhnliche Scrollen.
    const kante = Math.max(nav.getBoundingClientRect().bottom + 8, window.innerHeight * 0.3);
    let treffer = abschnitte[0];
    for (const x of abschnitte) if (x.ziel.getBoundingClientRect().top <= kante) treffer = x;
    // Ganz unten gilt der letzte Abschnitt, auch wenn er kurz ist und seine
    // Oberkante die Lesekante nie erreicht.
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2)
      treffer = abschnitte[abschnitte.length - 1];
    if (treffer === aktiv) return;
    aktiv = treffer;
    for (const x of abschnitte)
      if (x === treffer) x.a.setAttribute("aria-current", "location");
      else x.a.removeAttribute("aria-current");
    if (kopf) kopf.textContent = treffer.a.textContent;
  };

  let angefordert = false;
  const anstossen = () => {
    if (angefordert) return;
    angefordert = true;
    requestAnimationFrame(() => {
      angefordert = false;
      messen();
    });
  };
  addEventListener("scroll", anstossen, { passive: true });
  addEventListener("resize", anstossen, { passive: true });
  messen();

  if (!menue) return;

  // Breit ist der Block offen (und löst sich per Stylesheet zur Reihe auf),
  // schmal ist er ein Menü und startet zu. Der Umschaltpunkt steht hier UND
  // im Stylesheet — zwei Stellen, aber die Alternative wäre, die Breite aus
  // dem Stylesheet zurückzulesen, und das ist die unzuverlässigere von beiden.
  const schmal = matchMedia("(max-width: 860px)");
  const anpassen = () => {
    menue.open = !schmal.matches;
  };
  anpassen();
  schmal.addEventListener("change", anpassen);
  // Eine Wahl schließt die Liste. Ohne das bleibt sie über dem Ziel stehen,
  // auf das sie gerade gesprungen ist.
  menue.addEventListener("click", (e) => {
    if (schmal.matches && e.target.closest("a")) menue.open = false;
  });
  // Daneben getippt: zu. Ein Aufklappblock schließt sich sonst nur über
  // seinen eigenen Kopf, und auf dem Telefon sucht das niemand.
  document.addEventListener("pointerdown", (e) => {
    if (schmal.matches && menue.open && !menue.contains(e.target)) menue.open = false;
  });
  document.addEventListener("keydown", (e) => {
    if (schmal.matches && e.key === "Escape" && menue.open) {
      menue.open = false;
      menue.querySelector("summary")?.focus();
    }
  });
})();
