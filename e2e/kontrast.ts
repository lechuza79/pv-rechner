// Kontrast im Browser messen — die Rechnung, nicht der Test.
//
// Steht getrennt vom Test, damit derselbe Messkopf auch von Hand über eine
// einzelne Seite laufen kann, ohne den ganzen Lauf anzuwerfen.

/**
 * Die Tagesstufe festnageln — BLOCKER für jeden Test, der Farben misst.
 *
 * Das Theme folgt der Sonne: sieben Stufen, und welche gilt, entscheidet die
 * Uhr des Rechners, auf dem der Test läuft. Ein Farbtest ohne diese Zeile
 * misst deshalb morgens etwas anderes als abends — am 23.09.2026 gleich
 * zweimal beobachtet: Ein Pixeltest der Ranglisten-Köpfe lief tagsüber grün
 * und wurde abends rot (ein einziger Bildpunkt, der auf der gedämpften Palette
 * zufällig die Farbe der Platzierungs-Box traf), und dieser Kontrasttest fand
 * lokal am Tag nichts und auf dem Prüfrechner am Abend zwei echte Befunde.
 *
 * Gepinnt wird über die EIGENE Einstellung der Site (hell/dunkel), nicht über
 * einen gesetzten Zustand am Dokument: Damit misst der Test einen Zustand, den
 * es wirklich gibt, und keinen konstruierten.
 */
export type Tagesstufe = "light" | "dark";

/** Als Startskript in die Seite legen, VOR dem ersten Aufruf. */
export function stufePinnen(stufe: Tagesstufe): string {
  return `try{localStorage.setItem('sc-theme-pref',${JSON.stringify(stufe)})}catch(e){}`;
}

/** Ein Textstück, das sich auf seinem Grund nicht ausreichend abhebt. */
export type Kontrastbefund = {
  /** Der gelesene Text, gekürzt — damit ein roter Lauf sagt, WO. */
  text: string;
  /** Gemessener Kontrast nach WCAG 2.1, auf zwei Stellen. */
  kontrast: number;
  /** Vordergrund, nach dem Überblenden halbdurchsichtiger Farben. */
  vordergrund: string;
  /** Der Grund, auf dem der Text wirklich steht (alle Lagen übereinander). */
  grund: string;
  /** Element-Kennung (Tag plus erste Klasse), damit man die Stelle findet. */
  wo: string;
  /** Schriftgröße in Pixeln. */
  px: number;
  /** Fett? Zusammen mit px entscheidet das über die geltende Grenze. */
  fett: boolean;
};

/**
 * Der Messkopf, als Zeichenkette — wird per addScriptTag in die Seite gelegt.
 *
 * Als Text statt als Funktion, weil er im BROWSER laufen muss: page.evaluate
 * serialisiert nur die übergebene Funktion selbst, nicht die Hilfsfunktionen
 * daneben. Ein Skript-Tag bringt alles zusammen hinein.
 *
 * KEIN RÜCKWÄRTS-ANFÜHRUNGSZEICHEN DARIN, auch nicht im Kommentar: Es beendet
 * die Vorlage, und der Fehler liest sich danach wie ein Syntaxfehler irgendwo
 * anders in der Datei.
 */
export const MESSKOPF = String.raw`
window.__kontrastMessen = function () {
  // FARBEN WERDEN NICHT VON HAND ZERLEGT. getComputedStyle liefert je nach
  // Browser und Eingabe rgb(), rgba(), color(srgb …) und color(display-p3 …);
  // color() trägt Anteile von 0..1, rgb() Werte von 0..255. Ein gemeinsamer
  // Zahlenleser darüber machte am 23.09.2026 aus einem hellen Grund ein fast
  // schwarzes rgb(1,1,1) und erfand damit zehn Befunde. Die Leinwand
  // normalisiert jede Schreibweise auf dieselben vier Zahlen.
  var mess = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  var cache = new Map();
  function parse(c) {
    if (cache.has(c)) return cache.get(c);
    var out = { r: 0, g: 0, b: 0, a: 1 };
    try {
      mess.fillStyle = "#000";
      mess.fillStyle = c;
      mess.globalCompositeOperation = "copy";
      mess.fillRect(0, 0, 1, 1);
      var d = mess.getImageData(0, 0, 1, 1).data;
      out = { r: d[0], g: d[1], b: d[2], a: d[3] / 255 };
    } catch (e) { /* unlesbare Farbe — bleibt schwarz und undurchsichtig */ }
    cache.set(c, out);
    return out;
  }
  function ueber(f, b) {
    return { r: f.r * f.a + b.r * (1 - f.a), g: f.g * f.a + b.g * (1 - f.a), b: f.b * f.a + b.b * (1 - f.a), a: 1 };
  }
  function lum(c) {
    function f(v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  }
  function kontrast(a, b) {
    var l1 = lum(a), l2 = lum(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  }
  function zeig(c) { return "rgb(" + Math.round(c.r) + "," + Math.round(c.g) + "," + Math.round(c.b) + ")"; }

  // Der Grund ist die SUMME aller Lagen darüber, nicht die nächste gefüllte:
  // Ein halbdurchsichtiger Kasten auf einem anderen ergibt eine dritte Farbe,
  // und genau die sieht der Leser.
  function grundVon(el) {
    var stapel = [], cur = el;
    while (cur && cur !== document.documentElement) {
      var bg = parse(getComputedStyle(cur).backgroundColor);
      if (bg.a > 0) { stapel.push(bg); if (bg.a >= 0.999) break; }
      cur = cur.parentElement;
    }
    var grund = { r: 255, g: 255, b: 255, a: 1 };
    var wurzel = parse(getComputedStyle(document.documentElement).backgroundColor);
    if (wurzel.a > 0) grund = ueber(wurzel, grund);
    for (var i = stapel.length - 1; i >= 0; i--) grund = ueber(stapel[i], grund);
    return grund;
  }

  var befunde = [];
  var gesehen = new Set();
  var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  var n;
  while ((n = walker.nextNode())) {
    if (!(n.nodeValue || "").trim()) continue;
    var el = n.parentElement;
    if (!el || gesehen.has(el)) continue;
    gesehen.add(el);
    // Ausdrücklich Unsichtbares zählt nicht: Es ist kein Kontrastproblem,
    // sondern Absicht (Bild-Fußzeilen, eingeklappte Stellen, Vorlese-Texte).
    if (el.closest("[data-sc-export-only],[hidden],[aria-hidden='true']")) continue;
    var s = getComputedStyle(el);
    if (s.visibility === "hidden" || s.display === "none" || parseFloat(s.opacity) < 0.1) continue;
    // Verlaufstext wird über den Hintergrund gemalt, nicht über die Textfarbe —
    // seine color sagt dann nichts über das, was man sieht.
    if (s.webkitTextFillColor === "rgba(0, 0, 0, 0)") continue;
    var r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    var grund = grundVon(el);
    // TEXT IN EINEM DIAGRAMM BLEIBT AUSSEN VOR — und das ist eine Grenze der
    // Messung, keine Entwarnung. Zwei Gruende, beide gemessen am 23.09.2026:
    //
    //  1. SVG-Text wird mit "fill" gemalt, nicht mit "color", und "color" steht
    //     dort auf seinem Anfangswert Schwarz. Wer das verwechselt, meldet auf
    //     einer einzigen Seite 53 Beschriftungen als unlesbar, die es nicht
    //     sind.
    //  2. Selbst richtig gelesen stimmt der GRUND nicht: In gestapelten
    //     Flaechen, Balken und Ringen sitzt die Beschriftung auf einer
    //     gezeichneten Form, und die hat keinen CSS-Hintergrund. Diese Messung
    //     sieht dort den Seitengrund und faellt ein Urteil ueber eine Farbe,
    //     die den Leser nie erreicht — in beide Richtungen falsch.
    //
    // OFFEN (bis 12/2026): die Beschriftungen der Diagramme mit einer
    // Messung am BILD pruefen. Beim Bau schon gesehen und nicht behoben: Die
    // End-Beschriftungen des Liniendiagramms tragen die Farbe ihrer Reihe und
    // kommen damit auf 2,0 bis 2,7:1 ("Kernenergie", "Erdgas", "Erneuerbare",
    // "Braunkohle"). Sie zu entfaerben nimmt ihnen die Zuordnung zur Linie —
    // das ist eine Gestaltungsfrage, keine Korrektur nebenbei.
    if (el.namespaceURI === "http://www.w3.org/2000/svg") continue;
    var vg = ueber(parse(s.color), grund);
    var px = parseFloat(s.fontSize);
    var fett = parseInt(s.fontWeight, 10) >= 700;
    befunde.push({
      text: (n.nodeValue || "").trim().slice(0, 48),
      kontrast: Math.round(kontrast(vg, grund) * 100) / 100,
      vordergrund: zeig(vg),
      grund: zeig(grund),
      wo: el.tagName.toLowerCase() + (typeof el.className === "string" && el.className ? "." + el.className.trim().split(/\s+/)[0] : ""),
      px: Math.round(px),
      fett: fett,
    });
  }
  return befunde;
};
`;

/**
 * Die Grenze, unter der ein Text als unlesbar gilt.
 *
 * NICHT die AA-Schwelle (4,5:1 bzw. 3:1 für große Schrift), sondern die
 * Hälfte davon — und das ist eine Entscheidung, keine Nachlässigkeit. Zum
 * Zeitpunkt des Baus (23.09.2026) lagen rund hundert Stellen der Site
 * zwischen 3 und 4,5 — Grautöne, die zwar unter AA liegen, aber lesbar sind.
 * Ein Wächter, der beim ersten Lauf hundertfach rot wird, wird abgeschaltet
 * oder weggefiltert; dann fängt er auch den Fall nicht mehr, für den es ihn
 * gibt: Text, der gar nicht mehr zu sehen ist.
 *
 * Diese Grenze trifft genau den: 1,1:1 (weiße Einheiten auf der Lime-Platte),
 * 1,3:1 (Ortsname auf dem dunklen Block), 1,8:1 (Flächengrün als Zahl).
 *
 * OFFEN (bis 12/2026): die Grenze auf AA anheben, sobald die Stellen zwischen
 * 3 und 4,5 nachgezogen sind.
 */
export const UNLESBAR_UNTER = 3;

/** Für große/fette Schrift gilt ein Drittel weniger — wie bei WCAG selbst. */
export function grenzeFuer(b: Kontrastbefund): number {
  const gross = b.px >= 24 || (b.px >= 18.66 && b.fett);
  return gross ? UNLESBAR_UNTER * (3 / 4.5) : UNLESBAR_UNTER;
}

/** Eine Zeile je Befund, kurz genug für eine Fehlermeldung. */
export function zeile(b: Kontrastbefund): string {
  return `${b.kontrast}:1 · ${b.px}px ${b.wo} · "${b.text}" · ${b.vordergrund} auf ${b.grund}`;
}
