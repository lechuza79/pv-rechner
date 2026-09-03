// Signierte Token für Bestätigung und Abmeldung eines Gemeinde-Abos.
//
// AUFBAU: <abo-id>.<zweck>.<signatur>
//   bestätigen    <id>.<ablauf-zeitstempel>.<signatur> — läuft nach 48 h ab
//   abmelden      <id>.unsub.<signatur>                — gilt dauerhaft
//   einstellungen <id>.prefs.<signatur>                — gilt dauerhaft
//
// WARUM EIN TOKEN UND KEIN LOGIN: Wer sich abmelden will, hat kein Konto und
// soll keines anlegen müssen. Ein Abmeldelink, der eine Anmeldung verlangt, ist
// praktisch keiner — und ein Abo, aus dem man nicht mit einem Klick
// herauskommt, ist die Sorte Verteiler, gegen die die Zusage „jederzeit
// abmeldbar" auf dem Anmeldeknopf gerade steht.
//
// WARUM NICHT EINE ZUFALLS-KENNUNG IN DER DATENBANK: Ginge auch, kostet aber
// bei jedem Aufruf einen Datenbank-Zugriff, bevor überhaupt feststeht, ob das
// Token echt ist — also einen Zugriff je Aufruf einer öffentlichen Adresse,
// die jeder kennt. Die Signatur beantwortet das ohne Datenbank; erst ein
// gültiges Token führt zu einem Schreibvorgang.
//
// Die Bauform ist aus dem Schwesterprojekt übernommen, wo dieselbe Sache seit
// Monaten läuft (Gast folgt einer Person, ohne Konto, Bestätigung per Mail).
// Zwei Eigenschaften daraus sind kein Beiwerk und werden hier ausdrücklich
// mitgenommen:
//
//   1. VERGLEICH IN KONSTANTER ZEIT. Ein `===` auf zwei Signaturen bricht beim
//      ersten abweichenden Zeichen ab; über viele Versuche verrät die
//      Antwortzeit, wie weit ein geratenes Token stimmte. Der Unterschied ist
//      winzig und über ein Netz kaum messbar — aber er kostet nichts zu
//      vermeiden, und „kaum messbar" ist keine Sicherheitsaussage.
//   2. TRENNUNG DER ZWECKE ÜBER DAS MITTELSTÜCK. Ein Abmelde-Token darf nie als
//      Bestätigung durchgehen. Beide Prüfungen weisen das Mittelstück des
//      jeweils anderen ab, statt sich auf die Adresse zu verlassen, unter der
//      das Token ankam.

import { createHmac, timingSafeEqual } from "crypto";

/** Gültigkeit eines Bestätigungslinks. */
export const BESTAETIGUNG_GUELTIG_MS = 48 * 60 * 60 * 1000;

/**
 * Das Geheimnis, mit dem signiert wird.
 *
 * EIGENE VARIABLE, NICHT das Cron-Geheimnis mitbenutzt: Dieses hier steht in
 * jedem Link in jeder verschickten Mail und ist damit einem ganz anderen
 * Risiko ausgesetzt als ein Zugang, den nur unsere eigenen Läufe kennen. Wer
 * beide zusammenlegt, macht aus einem Abo-Link ein Stück desselben
 * Schlüsselmaterials, das die Setup-Routen schützt.
 *
 * FEHLT SIE, WIRD GEWORFEN — nicht auf einen festen Ersatzwert
 * zurückgefallen. Ein Standard-Geheimnis wäre öffentlich bekannt, und dann
 * kann jeder jedes Abo bestätigen und abmelden. Dieselbe Entscheidung wie bei
 * der Ausgabenbremse: Ein fehlendes Geheimnis wird nicht durchgewunken.
 */
function geheimnis(): string {
  const s = process.env.ABO_HMAC_SECRET;
  if (!s || s.length < 16) {
    throw new Error(
      "ABO_HMAC_SECRET fehlt oder ist zu kurz (mindestens 16 Zeichen). " +
        "Ohne Geheimnis lassen sich Abo-Links fälschen — der Versand bleibt deshalb aus.",
    );
  }
  return s;
}

function signiere(nutzlast: string): string {
  return createHmac("sha256", geheimnis()).update(nutzlast).digest("hex");
}

/** Signatur prüfen, ohne über die Laufzeit zu verraten, wie weit sie stimmte. */
function signaturStimmt(nutzlast: string, vorgelegt: string): boolean {
  const erwartet = signiere(nutzlast);
  if (erwartet.length !== vorgelegt.length) return false;
  try {
    return timingSafeEqual(Buffer.from(erwartet, "hex"), Buffer.from(vorgelegt, "hex"));
  } catch {
    // Kein gültiges Hex — dann ist es kein Token von uns.
    return false;
  }
}

// ─── Erzeugen ────────────────────────────────────────────────────────────────

export function bestaetigungsToken(aboId: string, jetztMs: number): string {
  const ablauf = jetztMs + BESTAETIGUNG_GUELTIG_MS;
  const nutzlast = `${aboId}.${ablauf}`;
  return `${nutzlast}.${signiere(nutzlast)}`;
}

export function abmeldeToken(aboId: string): string {
  const nutzlast = `${aboId}.unsub`;
  return `${nutzlast}.${signiere(nutzlast)}`;
}

/**
 * Der Schlüssel zur eigenen Einstellungsseite.
 *
 * EIGENER ZWECK, nicht das Abmelde-Token mitbenutzt — und das ist kein
 * Ordnungssinn. Das Abmelde-Token steht in der Kopfzeile jeder Meldung; ein
 * Postfach oder ein Sicherheitsscanner ruft solche Adressen von sich aus auf.
 * Wäre es dasselbe Token, käme irgendwann jemand über einen vorab abgerufenen
 * Link auf einer Seite an, die abmelden KANN — und ein Zweck, den man an der
 * Adresse ablesen muss statt am Token, ist keiner.
 *
 * DAUERHAFT GÜLTIG, wie die Abmeldung: Ein Link, der abläuft, schickt jemanden
 * mit einer Frage zu seinen Einstellungen in eine Fehlermeldung. Der Preis ist
 * benannt — wer den Link weitergibt, gibt Einblick in die Orte, die diese
 * Adresse abonniert hat; ändern und abmelden kann der Empfänger ohnehin schon
 * über den Abmeldelink derselben Mail.
 */
export function einstellungenToken(aboId: string): string {
  const nutzlast = `${aboId}.prefs`;
  return `${nutzlast}.${signiere(nutzlast)}`;
}

// ─── Prüfen ──────────────────────────────────────────────────────────────────

export type TokenBefund =
  | { ok: true; aboId: string }
  /** Signatur falsch, Form falsch, oder falscher Zweck. */
  | { ok: false; grund: "ungueltig" }
  /** Signatur richtig, aber der Link ist zu alt. */
  | { ok: false; grund: "abgelaufen" };

/**
 * Ein Bestätigungs-Token prüfen.
 *
 * `jetztMs` wird hereingereicht und NICHT aus der Uhr gelesen — dieselbe
 * Systematik wie beim Förder-Verlauf, der keine eigene Uhr hat: Sonst liefert
 * dieselbe Eingabe im Test je nach Ausführungszeitpunkt ein anderes Ergebnis,
 * und die Ablauf-Grenze ist genau das, was ein Test prüfen will.
 */
export function pruefeBestaetigung(token: string, jetztMs: number): TokenBefund {
  const teile = token.split(".");
  if (teile.length !== 3) return { ok: false, grund: "ungueltig" };
  const [aboId, mitte, signatur] = teile;

  // Zweck-Trennung: Ein Abmelde-Token darf hier nie durchkommen.
  //
  // DIESE ZEILE IST REDUNDANZ, NICHT DAS FUNDAMENT — am 31.08.2026 gemessen,
  // indem sie zur Probe entfernt wurde: Die Tests blieben grün. Ein
  // Abmelde-Token scheitert nämlich ohnehin weiter unten daran, dass „unsub"
  // keine Ablaufzeit ist. Wer beim Umbau die Ablauf-Prüfung anfasst, verliert
  // damit womöglich die eigentliche Sperre, ohne dass etwas rot wird — deshalb
  // steht der ausdrückliche Riegel hier, und deshalb steht dieser Absatz
  // daneben.
  if (mitte === "unsub" || mitte === "prefs") return { ok: false, grund: "ungueltig" };

  if (!signaturStimmt(`${aboId}.${mitte}`, signatur)) return { ok: false, grund: "ungueltig" };

  const ablauf = Number.parseInt(mitte, 10);
  if (!Number.isFinite(ablauf)) return { ok: false, grund: "ungueltig" };
  if (jetztMs > ablauf) return { ok: false, grund: "abgelaufen" };

  return { ok: true, aboId };
}

/** Ein Abmelde-Token prüfen. Läuft nie ab — ein Abo muss immer kündbar sein. */
export function pruefeAbmeldung(token: string): TokenBefund {
  return pruefeMitZweck(token, "unsub");
}

/** Ein Einstellungs-Token prüfen. Läuft nie ab, wie die Abmeldung. */
export function pruefeEinstellungen(token: string): TokenBefund {
  return pruefeMitZweck(token, "prefs");
}

/**
 * Die gemeinsame Prüfung der beiden dauerhaften Zwecke.
 *
 * EINE Fassung, nicht zwei: Als der zweite Zweck dazukam, wäre die zweite
 * Kopie der Prüfung entstanden — und in ihr hätte irgendwann eine Härtung
 * gefehlt, die die erste längst hat (der Vergleich in konstanter Zeit zum
 * Beispiel). Der Zweck ist der einzige Unterschied, also ist er der Parameter.
 */
function pruefeMitZweck(token: string, zweck: "unsub" | "prefs"): TokenBefund {
  const teile = token.split(".");
  if (teile.length !== 3) return { ok: false, grund: "ungueltig" };
  const [aboId, mitte, signatur] = teile;

  // Der Riegel gegen den jeweils anderen Zweck. Er hängt am Mittelstück, nicht
  // an der Adresse, unter der das Token ankam: Ein Einstellungs-Token darf die
  // Abmeldung nicht auslösen, auch wenn es an der Abmelde-Adresse abgegeben
  // wird.
  if (mitte !== zweck) return { ok: false, grund: "ungueltig" };
  if (!signaturStimmt(`${aboId}.${mitte}`, signatur)) return { ok: false, grund: "ungueltig" };

  return { ok: true, aboId };
}

// ─── Die fertigen Adressen ───────────────────────────────────────────────────
//
// EINE Stelle, an der aus einem Token ein Link wird. Vorher stand die
// Zusammensetzung an jedem Aufrufer einzeln; mit der zweiten Linkart wären es
// vier Stellen gewesen, und die vierte hätte irgendwann einen anderen Pfad
// getragen als die Seite, die ihn bedient.

export function abmeldeLink(basisUrl: string, aboId: string): string {
  return `${basisUrl}/abo/abmelden?t=${encodeURIComponent(abmeldeToken(aboId))}`;
}

export function einstellungenLink(basisUrl: string, aboId: string): string {
  return `${basisUrl}/abo/einstellungen?t=${encodeURIComponent(einstellungenToken(aboId))}`;
}
