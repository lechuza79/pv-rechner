import "server-only";

// Instagram-Anbindung: Login, Zugangsschlüssel, Verlängerung, Posten.
//
// Geprüft am 01.09.2026 an der Entwicklerdokumentation von Meta
// („Instagram API with Instagram Login", „Business Login for Instagram",
// „Publish Content using the Instagram Platform").
//
// DREI UNTERSCHIEDE ZU LINKEDIN, und jeder hat Folgen:
//
// 1. DAS BILD KOMMT ALS ADRESSE, NICHT ALS BYTES. Instagram lädt es selbst von
//    einem öffentlich erreichbaren Server — „Media must be hosted on a publicly
//    accessible server". Es genügt also nicht, ein Bild aufzunehmen; es muss
//    vorher irgendwo liegen, wo Meta es abholen kann.
// 2. NUR JPEG. „JPEG is the only image format supported." Unsere Kartenaufnahme
//    erzeugt PNG — das muss beim Ablegen umgewandelt werden.
// 3. ZWEI SCHRITTE. Erst ein Container mit Bildadresse und Bildunterschrift,
//    dann die Veröffentlichung dieses Containers. Ein Container ohne
//    Veröffentlichung ist kein Beitrag, sondern ein Entwurf, der verfällt.
//
// UND EIN VORTEIL: Der Zugang lässt sich VERLÄNGERN, solange er gültig und
// mindestens einen Tag alt ist. Bei LinkedIn muss der Betreiber alle zwei
// Monate von Hand durch den Browser-Login; hier kann ein Lauf das übernehmen.
// Genutzt wird das erst, wenn ein Lauf dafür steht — die Funktion ist gebaut,
// damit sie da ist, nicht damit sie ungenutzt schön aussieht.

import { ladeKonto, speichereKonto } from "./social-konten";

const AUTH_URL = "https://www.instagram.com/oauth/authorize";
const TOKEN_URL = "https://api.instagram.com/oauth/access_token";
const GRAPH = "https://graph.instagram.com";

/**
 * Berechtigungen: Kennung und Name lesen, Beiträge veröffentlichen.
 *
 * Die Namen sind die SEIT MÄRZ 2026 gültigen. Die alten Kurzformen
 * (`business_basic`, `business_content_publish`) sind abgelöst; wer sie noch
 * schickt, bekommt eine Anmeldung, die aussieht, als hätte sie funktioniert,
 * und einen Schlüssel ohne Schreibrecht.
 */
export const INSTAGRAM_SCOPES = ["instagram_business_basic", "instagram_business_content_publish"];

export function instagramKonfiguriert(): boolean {
  return !!(process.env.INSTAGRAM_APP_ID && process.env.INSTAGRAM_APP_SECRET);
}

/**
 * Die Rückrufadresse — FEST, nicht aus der Anfrage abgeleitet.
 *
 * Sie muss zeichengleich mit der im Meta-Portal hinterlegten sein, und zwar
 * ZWEIMAL: beim Aufruf des Anmeldedialogs und beim Tausch des Codes gegen den
 * Schlüssel. Instagram vergleicht beide und lehnt sonst ab („Please make sure
 * your redirect_uri is identical to the one you used in the OAuth dialog
 * request").
 *
 * Aus der Anfrage abgeleitet hing sie daran, über welche Adresse der Betreiber
 * gerade kam — mit `www.` davor ist es ein anderer Ursprung als ohne, und der
 * Tausch scheiterte, obwohl im Portal alles richtig stand. Eine Adresse, die
 * bei der Registrierung festgelegt wurde, ist eine Konstante und kein
 * Nebenprodukt des Aufrufs.
 *
 * Der Parameter bleibt für die lokale Entwicklung: Ohne gesetzte Adresse in der
 * Umgebung gilt der Ursprung der Anfrage.
 */
export function rueckrufAdresse(origin: string): string {
  const fest = process.env.INSTAGRAM_REDIRECT_URI;
  return fest && fest.trim() ? fest.trim() : `${origin}/api/instagram/callback`;
}

/**
 * Adresse, auf die der Betreiber geschickt wird, um die App zu autorisieren.
 *
 * VON HAND ZUSAMMENGESETZT, und das ist der Punkt. Der übliche Weg über die
 * Parameter-Sammlung kodiert jeden Wert — aus der Rückrufadresse wird
 * `https%3A%2F%2Fsolar-check.io%2F…`. Metas eigene Einbettungs-URL, die das
 * Portal zum Kopieren anbietet, setzt sie dagegen ROH ein, und der Tausch des
 * Codes scheiterte solange mit „redirect_uri is identical to the one you used
 * in the OAuth dialog request", obwohl im Portal zeichengleich dieselbe Adresse
 * stand. Instagram vergleicht offenbar den unveränderten Text.
 *
 * Die Berechtigungen bleiben kodiert (das Komma als %2C) — genau so steht es
 * auch in Metas Vorlage.
 *
 * `force_reauth=true` steht ebenfalls in ihrer Vorlage: Es erzwingt die
 * Anmeldung, statt eine bestehende Sitzung stillschweigend weiterzuverwenden —
 * bei einem Rechner, auf dem mehrere Konten angemeldet sind, sonst die Quelle
 * dafür, dass am Ende das falsche verknüpft ist.
 */
export function anmeldeAdresse(origin: string, state: string): string {
  const teile = [
    "force_reauth=true",
    `client_id=${process.env.INSTAGRAM_APP_ID ?? ""}`,
    `redirect_uri=${rueckrufAdresse(origin)}`,
    "response_type=code",
    `scope=${INSTAGRAM_SCOPES.join("%2C")}`,
    `state=${encodeURIComponent(state)}`,
  ];
  return `${AUTH_URL}?${teile.join("&")}`;
}

type KurzToken = { access_token: string; user_id: string | number; permissions?: string };
type LangToken = { access_token: string; expires_in: number };
type Profil = { id: string; username?: string };

/**
 * Tauscht den Rückruf-Code gegen einen Zugangsschlüssel, verlängert ihn auf
 * sechzig Tage, holt den Kontonamen und legt alles ab.
 *
 * DIE VERLÄNGERUNG GEHÖRT IN DENSELBEN VORGANG. Der Schlüssel aus dem Tausch
 * ist kurzlebig (eine Stunde); wer ihn ablegt, hat einen Zugang, der noch am
 * selben Vormittag still ausläuft — und der Ablauf-Wächter meldet das erst,
 * wenn längst nichts mehr geht.
 */
export async function loginAbschliessen(
  rohCode: string,
  origin: string,
): Promise<{ name: string; gueltigBis: string }> {
  // Instagram hängt an die Rückrufadresse ein `#_` an. Als Fragment erreicht es
  // den Server normalerweise nicht — aber die Dokumentation sagt ausdrücklich,
  // es gehöre nicht zum Code und sei abzuschneiden. Zwei Zeichen zu entfernen,
  // die nie da sind, kostet nichts; ein Code mit angehängtem Anker ist ein
  // ungültiger Code, und der Fehler dafür sähe aus wie jeder andere.
  const code = rohCode.replace(/#_$/, "");
  const appId = process.env.INSTAGRAM_APP_ID;
  const appSecret = process.env.INSTAGRAM_APP_SECRET;
  if (!appId || !appSecret) throw new Error("Instagram-Zugangsdaten fehlen in der Umgebung");

  // MULTIPART, nicht URL-kodiert — und das ist keine Geschmacksfrage. Metas
  // eigenes Beispiel für diesen Aufruf verwendet durchgehend `-F`, also
  // multipart/form-data. Dort stehen die Werte roh im Körper; im URL-kodierten
  // Format wird die Rückrufadresse zu `https%3A%2F%2F…`, und Instagram
  // vergleicht sie offenbar unverändert mit der aus dem Anmeldedialog. Der
  // Tausch scheiterte deshalb stundenlang mit „redirect_uri is identical to the
  // one you used in the OAuth dialog request", obwohl im Portal, in der
  // Anmeldeadresse und hier zeichengleich dieselbe Adresse stand.
  //
  // Den Trennstrich der multipart-Grenze setzt fetch selbst — deshalb hier KEIN
  // Content-Type von Hand: Ein selbst gesetzter Kopf ohne Grenzangabe macht den
  // Körper unlesbar.
  const formular = new FormData();
  formular.set("client_id", appId);
  formular.set("client_secret", appSecret);
  formular.set("grant_type", "authorization_code");
  formular.set("redirect_uri", rueckrufAdresse(origin));
  formular.set("code", code);

  const tokenRes = await fetch(TOKEN_URL, { method: "POST", body: formular });
  if (!tokenRes.ok) {
    throw new Error(`Instagram-Schlüsseltausch fehlgeschlagen (${tokenRes.status}): ${await tokenRes.text()}`);
  }
  const kurz = (await tokenRes.json()) as KurzToken;

  const langUrl = new URL(`${GRAPH}/access_token`);
  langUrl.searchParams.set("grant_type", "ig_exchange_token");
  langUrl.searchParams.set("client_secret", appSecret);
  langUrl.searchParams.set("access_token", kurz.access_token);
  const langRes = await fetch(langUrl);
  if (!langRes.ok) {
    throw new Error(`Instagram-Verlängerung fehlgeschlagen (${langRes.status}): ${await langRes.text()}`);
  }
  const lang = (await langRes.json()) as LangToken;

  const profil = await ladeProfil(lang.access_token);
  const gueltigBis = new Date(Date.now() + lang.expires_in * 1000).toISOString();

  await speichereKonto({
    plattform: "instagram",
    konto_id: String(kurz.user_id),
    anzeigename: profil.username ?? null,
    access_token: lang.access_token,
    gueltig_bis: gueltigBis,
    scopes: kurz.permissions ? kurz.permissions.split(/[ ,]+/).filter(Boolean) : INSTAGRAM_SCOPES,
    // Frischer Zugang: die Warnkette beginnt von vorn.
    gewarnt_bei_stufe: null,
  });

  return { name: profil.username ?? String(kurz.user_id), gueltigBis };
}

async function ladeProfil(token: string): Promise<Profil> {
  const url = new URL(`${GRAPH}/me`);
  url.searchParams.set("fields", "id,username");
  url.searchParams.set("access_token", token);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Instagram-Kontoabfrage fehlgeschlagen (${res.status}): ${await res.text()}`);
  return (await res.json()) as Profil;
}

/**
 * Verlängert den hinterlegten Zugang um weitere sechzig Tage.
 *
 * ZWEI BEDINGUNGEN aus der Dokumentation, und beide werden hier geprüft statt
 * dem Aufrufer überlassen: Der Schlüssel muss noch gültig und mindestens einen
 * Tag alt sein. Ein Aufruf, der eine davon verletzt, scheitert mit einer
 * Meldung, die nach einem kaputten Zugang aussieht — dabei ist er in Ordnung.
 */
export async function verlaengere(jetzt = new Date()): Promise<{ gueltigBis: string } | { grund: string }> {
  const konto = await ladeKonto("instagram");
  if (!konto) return { grund: "Kein Instagram-Konto hinterlegt." };
  if (new Date(konto.gueltig_bis).getTime() < jetzt.getTime()) {
    return { grund: "Der Zugang ist abgelaufen — er lässt sich nicht mehr verlängern, nur neu anmelden." };
  }
  if (jetzt.getTime() - new Date(konto.aktualisiert_am).getTime() < 24 * 60 * 60 * 1000) {
    return { grund: "Der Zugang ist noch keinen Tag alt — Instagram verlängert ihn dann nicht." };
  }

  const url = new URL(`${GRAPH}/refresh_access_token`);
  url.searchParams.set("grant_type", "ig_refresh_token");
  url.searchParams.set("access_token", konto.access_token);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Instagram-Verlängerung fehlgeschlagen (${res.status}): ${await res.text()}`);
  }
  const lang = (await res.json()) as LangToken;
  const gueltigBis = new Date(jetzt.getTime() + lang.expires_in * 1000).toISOString();
  await speichereKonto({
    ...konto,
    access_token: lang.access_token,
    gueltig_bis: gueltigBis,
    gewarnt_bei_stufe: null,
  });
  return { gueltigBis };
}

export type PostErgebnis = { id: string; url: string };

/**
 * Veröffentlicht ein Bild mit Bildunterschrift.
 *
 * DAS BILD IST PFLICHT, und das ist keine Vereinfachung: Instagram kennt keinen
 * reinen Textbeitrag. Wer hier nur Text hätte, hätte keinen Beitrag.
 *
 * Der Alternativtext ist es ebenso — ein Diagramm ohne ihn ist für Menschen mit
 * Screenreader eine leere Fläche, und für sie ist die Zahl genauso interessant.
 * Dieselbe Regel gilt beim LinkedIn-Versand.
 */
export async function posteBild(
  bildUrl: string,
  text: string,
  opts: { bildAlt: string } & { ersterKommentar?: string },
): Promise<PostErgebnis> {
  const konto = await ladeKonto("instagram");
  if (!konto) throw new Error("Kein Instagram-Konto hinterlegt — erst anmelden.");
  if (new Date(konto.gueltig_bis).getTime() < Date.now()) {
    throw new Error("Der Instagram-Zugang ist abgelaufen — bitte neu anmelden.");
  }

  const container = new URL(`${GRAPH}/${konto.konto_id}/media`);
  container.searchParams.set("image_url", bildUrl);
  container.searchParams.set("caption", text);
  container.searchParams.set("alt_text", opts.bildAlt);
  container.searchParams.set("access_token", konto.access_token);
  const cRes = await fetch(container, { method: "POST" });
  if (!cRes.ok) {
    throw new Error(`Instagram-Container fehlgeschlagen (${cRes.status}): ${await cRes.text()}`);
  }
  const { id: creationId } = (await cRes.json()) as { id: string };

  const publish = new URL(`${GRAPH}/${konto.konto_id}/media_publish`);
  publish.searchParams.set("creation_id", creationId);
  publish.searchParams.set("access_token", konto.access_token);
  const pRes = await fetch(publish, { method: "POST" });
  if (!pRes.ok) {
    // Der Container steht, der Beitrag nicht. Das ist der Zustand, in dem ein
    // erneuter Versuch NICHT doppelt veröffentlicht — deshalb sagt die Meldung
    // die Container-Kennung mit an.
    throw new Error(
      `Instagram-Veröffentlichung fehlgeschlagen (${pRes.status}, Container ${creationId}): ${await pRes.text()}`,
    );
  }
  const { id } = (await pRes.json()) as { id: string };
  return { id, url: id ? `https://www.instagram.com/p/${id}/` : "" };
}

/**
 * Wie viele Beiträge im laufenden Tagesfenster schon über die Schnittstelle
 * veröffentlicht wurden. Die Grenze liegt bei hundert in vierundzwanzig
 * Stunden — für drei Beiträge die Woche weit weg, aber die Auskunft kostet
 * nichts und beantwortet im Zweifel die Frage, warum nichts mehr geht.
 */
export async function veroeffentlichungsGrenze(): Promise<{ genutzt: number; grenze: number } | null> {
  const konto = await ladeKonto("instagram");
  if (!konto) return null;
  const url = new URL(`${GRAPH}/${konto.konto_id}/content_publishing_limit`);
  url.searchParams.set("access_token", konto.access_token);
  const res = await fetch(url);
  if (!res.ok) return null;
  const j = (await res.json()) as { data?: { quota_usage?: number; config?: { quota_total?: number } }[] };
  const eintrag = j.data?.[0];
  if (!eintrag) return null;
  return { genutzt: eintrag.quota_usage ?? 0, grenze: eintrag.config?.quota_total ?? 100 };
}
