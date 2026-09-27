/**
 * Die „?"-Erklärungen der Ortsseite verhalten sich wie überall sonst auf der
 * Site: Sie gehen beim Überfahren auf, nicht erst beim Klick.
 *
 * WARUM (Betreiber, 23.09.2026, am Ranking von Hamburg beanstandet): Die
 * Seite hatte zwei „?"-Knöpfe in zwei Größen, beide als aufklappbarer Block
 * gebaut — ein umrandeter Kreis, der auf Überfahren nichts tut und den Text
 * erst nach einem Klick zeigt. Der Baustein der übrigen Site (InfoTooltip)
 * macht es andersherum: ein nacktes Zeichen in der leisen Textfarbe, Hilfe-
 * Zeiger, Text beim Überfahren. Zwei Hilfe-Gesten auf einer Seite sind eine
 * zu viel.
 *
 * WARUM TROTZDEM EIN AUFKLAPPBARER BLOCK und nicht der React-Baustein: Die
 * Erklärung im Ranking entsteht im Browser-Skript des Entwurfs, nicht in
 * React — sie dorthin zu heben hieße, den Abschnitt umzubauen. Der Block kann
 * alles, was gebraucht wird, sobald ihn jemand beim Überfahren öffnet; und er
 * bleibt ohne JavaScript bedienbar, was der Baustein nicht ist.
 *
 * KLICK BLEIBT: Auf einem Telefon gibt es kein Überfahren. Das ist die
 * eingebaute Bedienung des Blocks, hier wird nichts daran gehindert.
 */
(() => {
  const AUSWAHL = "details.ranking-ratio-help, details.v3-calculation-help";
  // Kurze Nachlaufzeit, damit der Weg vom Zeichen zum Text nicht schließt —
  // dieselbe Überlegung wie im Baustein der übrigen Site.
  const NACHLAUF_MS = 160;
  const uhren = new WeakMap();

  const auf = (d) => {
    clearTimeout(uhren.get(d));
    // Immer nur eine Erklärung offen: Zwei übereinander verdecken einander.
    for (const andere of document.querySelectorAll(AUSWAHL))
      if (andere !== d && andere.open) andere.open = false;
    d.open = true;
  };
  const zu = (d) => {
    clearTimeout(uhren.get(d));
    uhren.set(
      d,
      setTimeout(() => {
        d.open = false;
      }, NACHLAUF_MS),
    );
  };

  const naechstes = (ziel) => (ziel instanceof Element ? ziel.closest(AUSWAHL) : null);

  document.addEventListener(
    "pointerover",
    (e) => {
      // Nur der Zeiger einer Maus. Ein Finger löst „pointerover" mit aus, und
      // dann ginge die Erklärung beim Antippen auf UND der Klick schlösse sie
      // sofort wieder.
      if (e.pointerType !== "mouse") return;
      const d = naechstes(e.target);
      if (d) auf(d);
    },
    { passive: true },
  );
  document.addEventListener(
    "pointerout",
    (e) => {
      if (e.pointerType !== "mouse") return;
      const d = naechstes(e.target);
      if (d && !d.contains(e.relatedTarget)) zu(d);
    },
    { passive: true },
  );
  // Mit der Tastatur: Der Auslöser ist der Zusammenklapp-Kopf, und der ist
  // fokussierbar. Ohne das bliebe die Erklärung für alle unerreichbar, die
  // nicht mit der Maus arbeiten.
  document.addEventListener("focusin", (e) => {
    const d = naechstes(e.target);
    if (d) auf(d);
  });
  document.addEventListener("focusout", (e) => {
    const d = naechstes(e.target);
    if (d && !d.contains(e.relatedTarget)) zu(d);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    for (const d of document.querySelectorAll(AUSWAHL)) d.open = false;
  });
})();
