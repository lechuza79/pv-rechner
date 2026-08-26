import "server-only";

// LinkedIn-Anbindung: Login, Zugangsschlüssel, Posten.
//
// Gepostet wird unter dem persönlichen Profil des Betreibers. Die Berechtigung
// dafür ("Share on LinkedIn") ist selbstbedienbar; das Posten unter der
// Unternehmensseite bräuchte einen Partnerantrag und ist bewusst nicht gebaut.
//
// Geprüft am 25.08.2026 an der Entwicklerdokumentation (Microsoft Learn,
// "Posts API"): Der Schreib-Scope heißt w_member_social, der Absender ist die
// Person-Kennung aus dem Anmelde-Endpunkt, und jede Anfrage braucht zwei
// Kopfzeilen — die Protokollversion und die datierte API-Version.

import { ladeKonto, speichereKonto } from "./social-konten";

const AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization";
const TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
const USERINFO_URL = "https://api.linkedin.com/v2/userinfo";
const POSTS_URL = "https://api.linkedin.com/rest/posts";
const SOCIAL_ACTIONS_URL = "https://api.linkedin.com/rest/socialActions";

/**
 * Kennung unserer Unternehmensseite, für die Erwähnung im Beitragstext.
 *
 * Eine Erwähnung ist ein Link, der INNERHALB von LinkedIn bleibt und die
 * Verbreitung deshalb nicht drückt — anders als ein externer Link im Beitrag.
 * Sie funktioniert nur, wenn der geschriebene Name exakt dem Seitennamen
 * entspricht; sonst erscheint er als gewöhnlicher Text (so steht es in der
 * Entwicklerdokumentation, Abschnitt „Mentions and Hashtags").
 */
const ORG_URN = process.env.LINKEDIN_ORG_URN;
const ORG_NAME = process.env.LINKEDIN_ORG_NAME ?? "Solar Check";

/**
 * Ersetzt den Seitennamen im Text durch eine Erwähnung. Ohne hinterlegte
 * Kennung bleibt der Text unverändert — eine halb gebaute Erwähnung wäre im
 * Beitrag als Klammerausdruck sichtbar.
 */
export function mitErwaehnung(text: string): string {
  if (!ORG_URN) return text;
  return text.replace(ORG_NAME, `@[${ORG_NAME}](${ORG_URN})`);
}

/**
 * Datierte API-Version im Format JJJJMM.
 *
 * Bewusst fest verdrahtet und KEIN mitlaufendes Datum: LinkedIn schaltet alte
 * Versionen ab (die August-2025-Fassung endete am 17.08.2026), und eine
 * automatisch mitlaufende Version würde uns am Monatsersten stillschweigend auf
 * eine Fassung schieben, gegen die niemand geprüft hat. Wer sie anhebt, liest
 * vorher die Migrationsliste.
 */
const API_VERSION = "202608";

/** Berechtigungen: Posten im eigenen Namen + Kennung und Name beim Anmelden. */
export const LINKEDIN_SCOPES = ["w_member_social", "openid", "profile"];

export function linkedinKonfiguriert(): boolean {
  return !!(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET);
}

export function rueckrufAdresse(origin: string): string {
  return `${origin}/api/linkedin/callback`;
}

/** Adresse, auf die der Betreiber geschickt wird, um die App zu autorisieren. */
export function anmeldeAdresse(origin: string, state: string): string {
  const url = new URL(AUTH_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", process.env.LINKEDIN_CLIENT_ID ?? "");
  url.searchParams.set("redirect_uri", rueckrufAdresse(origin));
  url.searchParams.set("state", state);
  url.searchParams.set("scope", LINKEDIN_SCOPES.join(" "));
  return url.toString();
}

type TokenAntwort = { access_token: string; expires_in: number; scope?: string };
type UserInfo = { sub: string; name?: string };

/**
 * Tauscht den Rückruf-Code gegen einen Zugangsschlüssel, holt die Kennung des
 * Kontos und legt beides ab. Gibt den Anzeigenamen zur Kontrolle zurück.
 */
export async function loginAbschliessen(code: string, origin: string): Promise<{ name: string; gueltigBis: string }> {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("LinkedIn-Zugangsdaten fehlen in der Umgebung");

  const tokenRes = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: rueckrufAdresse(origin),
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  if (!tokenRes.ok) {
    throw new Error(`LinkedIn-Schlüsseltausch fehlgeschlagen (${tokenRes.status}): ${await tokenRes.text()}`);
  }
  const token = (await tokenRes.json()) as TokenAntwort;

  const meRes = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  if (!meRes.ok) {
    throw new Error(`LinkedIn-Kontoabfrage fehlgeschlagen (${meRes.status}): ${await meRes.text()}`);
  }
  const me = (await meRes.json()) as UserInfo;

  const gueltigBis = new Date(Date.now() + token.expires_in * 1000).toISOString();
  await speichereKonto({
    plattform: "linkedin",
    konto_id: `urn:li:person:${me.sub}`,
    anzeigename: me.name ?? null,
    access_token: token.access_token,
    gueltig_bis: gueltigBis,
    scopes: token.scope ? token.scope.split(/[ ,]+/).filter(Boolean) : LINKEDIN_SCOPES,
    // Frischer Zugang: die Warnkette beginnt von vorn.
    gewarnt_bei_stufe: null,
  });

  return { name: me.name ?? me.sub, gueltigBis };
}

export type PostErgebnis = { id: string; url: string };

/**
 * Setzt einen Kommentar unter einen eigenen Beitrag.
 *
 * Dafür gibt es genau einen Zweck: den Link auf unsere Seite. Im Beitrag selbst
 * drückt ein externer Link die Verbreitung, im ersten Kommentar nicht. Die
 * Schreibberechtigung deckt Kommentare mit ab.
 */
export async function kommentiere(postUrn: string, text: string): Promise<void> {
  const konto = await ladeKonto("linkedin");
  if (!konto) throw new Error("Kein LinkedIn-Konto hinterlegt.");
  const res = await fetch(`${SOCIAL_ACTIONS_URL}/${encodeURIComponent(postUrn)}/comments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${konto.access_token}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
      "LinkedIn-Version": API_VERSION,
    },
    body: JSON.stringify({ actor: konto.konto_id, object: postUrn, message: { text } }),
  });
  if (!res.ok) {
    throw new Error(`LinkedIn-Kommentar fehlgeschlagen (${res.status}): ${await res.text()}`);
  }
}

/**
 * Veröffentlicht einen Textbeitrag unter dem hinterlegten Konto.
 *
 * Bilder folgen als eigener Schritt (sie brauchen erst einen Upload und dann
 * eine Bild-Kennung im Beitrag) — ein Textbeitrag ist der Beweis, dass die
 * Kette Login → Schlüssel → Veröffentlichung steht.
 */
export async function posteText(text: string, ersterKommentar?: string): Promise<PostErgebnis> {
  const konto = await ladeKonto("linkedin");
  if (!konto) throw new Error("Kein LinkedIn-Konto hinterlegt — erst anmelden.");
  if (new Date(konto.gueltig_bis).getTime() < Date.now()) {
    throw new Error("Der LinkedIn-Zugang ist abgelaufen — bitte neu anmelden.");
  }

  const res = await fetch(POSTS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${konto.access_token}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
      "LinkedIn-Version": API_VERSION,
    },
    body: JSON.stringify({
      author: konto.konto_id,
      commentary: mitErwaehnung(text),
      visibility: "PUBLIC",
      distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    }),
  });
  if (!res.ok) {
    throw new Error(`LinkedIn-Veröffentlichung fehlgeschlagen (${res.status}): ${await res.text()}`);
  }
  // Die Kennung des Beitrags steht nur in der Kopfzeile, nicht im Körper.
  const id = res.headers.get("x-restli-id") ?? "";

  // Der Kommentar darf den Beitrag nicht mitreißen: Er ist schon
  // veröffentlicht, und ein Fehlschlag hier heißt „Link fehlt", nicht „Post
  // fehlgeschlagen". Ein Wurf würde den Aufrufer glauben lassen, es sei nichts
  // rausgegangen — und ein zweiter Versuch veröffentlichte dann doppelt.
  if (ersterKommentar && id) {
    await kommentiere(id, ersterKommentar).catch((e) => {
      console.error("Erster Kommentar konnte nicht gesetzt werden:", (e as Error).message);
    });
  }

  return { id, url: id ? `https://www.linkedin.com/feed/update/${id}/` : "" };
}
