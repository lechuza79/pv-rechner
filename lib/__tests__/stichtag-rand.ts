// Die zwei Zeitpunkte, zwischen denen ein deutscher Stichtag umschaltet — für
// jeden Test, der eine Stichtags-Auflösung an ihrem Rand prüft.
//
// WARUM DAS EIN EIGENER HELFER IST: Der Fehler, gegen den diese Tests gebaut
// sind, lebt in einem Fenster von ein bis zwei Stunden nach Mitternacht
// deutscher Zeit — und wie breit es ist, hängt an der Sommerzeit. Ein Test, der
// „23:30 UTC am Vortag" fest hinschreibt, prüft im WINTER 00:30 deutscher Zeit
// (richtig) und im SOMMER 01:30 (auch richtig, aber aus Versehen); ein Test, der
// „22:30 UTC" fest hinschreibt, prüft im Sommer 00:30 und im Winter 23:30 —
// also den Vortag, und damit die Gegenrichtung, ohne es zu merken. Die Hälfte
// der Stichtage liegt im Winter (1.1., 1.2.), die andere im Sommer (1.8.).
//
// Deshalb wird der Versatz gemessen statt angenommen, und die Tests prüfen
// zusätzlich mit `berlinUhr()` nach, welche Ortszeit der erzeugte Zeitpunkt
// wirklich trägt. Ohne diese Gegenprobe belegte der Helfer sich selbst.

/** Der Zeitzonen-Versatz Deutschlands an diesem Zeitpunkt, in Minuten. */
function berlinVersatzMinuten(d: Date): number {
  const teile = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Berlin",
    timeZoneName: "longOffset",
  }).formatToParts(d);
  const name = teile.find((t) => t.type === "timeZoneName")?.value ?? "GMT+01:00";
  const m = /GMT([+-])(\d{2}):(\d{2})/.exec(name);
  if (!m) throw new Error(`Zeitzonen-Versatz nicht lesbar: ${name}`);
  return (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3]));
}

/** „2027-02-01 00:30" — Datum und Uhrzeit eines Zeitpunkts in deutscher Ortszeit. */
export function berlinUhr(d: Date): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Berlin",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
    hour12: false,
  }).format(d).replace(",", "");
}

/** Der Kalendertag vor diesem — reine Datumsrechnung über UTC-Mittag. */
export function vortag(tagIso: string): string {
  const d = new Date(`${tagIso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Die beiden Zeitpunkte um Mitternacht deutscher Zeit herum:
 *   • `davor`  = 23:30 Ortszeit am Vortag  → der ALTE Stand muss noch gelten
 *   • `danach` = 00:30 Ortszeit am Stichtag → der NEUE Stand muss schon gelten
 *
 * `danach` ist der eigentliche Prüffall: In der Weltzeit steht dort noch der
 * Vortag. `davor` ist die Gegenprobe gegen eine Umrechnung, die zu weit greift.
 */
export function mitternachtsRand(tagIso: string): { davor: Date; danach: Date } {
  const versatzMin = berlinVersatzMinuten(new Date(`${tagIso}T12:00:00Z`));
  const mitternachtUtc = Date.parse(`${tagIso}T00:00:00Z`) - versatzMin * 60_000;
  return {
    davor: new Date(mitternachtUtc - 30 * 60_000),
    danach: new Date(mitternachtUtc + 30 * 60_000),
  };
}
