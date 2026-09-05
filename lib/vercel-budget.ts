import { createHmac, timingSafeEqual } from "node:crypto";

// ─── Ausgabenbremse: nur das Filmprojekt, nie die ganze Domain ───────────────
//
// WARUM ES DIESE DATEI GIBT: Vercels eingebaute Notbremse („Pause deployments
// when the limit is reached") kennt nur einen Schalter für das GANZE Team. Sie
// nähme mit dem Filmprojekt auch solar-check.io offline — also ausgerechnet die
// Seite, die Geld verdienen soll, wegen Kosten, die woanders entstehen. Der
// Betreiber hat deshalb entschieden: Pauschal-Abschaltung bleibt AUS, und die
// Bremse wird gezielt gebaut.
//
// WARUM DER EMPFÄNGER IN DIESEM REPO WOHNT und nicht im Filmprojekt: Er soll das
// Filmprojekt pausieren. Läge er dort, nähme er sich mit dem Pausieren selbst
// offline und könnte am Ende des Abrechnungszeitraums nicht mehr entpausen — ein
// Sicherheitsnetz, das genau in dem Moment reißt, in dem es gehalten hat.
// solar-check.io bleibt online, also gehört er hierher.
//
// Diese Datei enthält die ENTSCHEIDUNGEN (Signatur, Schwelle, Ziel) und keine
// Next-Abhängigkeit — sie ist damit ohne laufenden Server prüfbar. Die Route
// darüber ist reine Verkabelung.

/** Das Team, dessen Ausgaben überwacht werden. */
export const VERCEL_TEAM_ID = "team_BaBCnU1MNXhDN7CQFJutbrFm";

/**
 * Das Filmprojekt („life-is-a-binge") — das EINZIGE Projekt, das diese Bremse
 * anfassen darf.
 *
 * Die Kennung steht bewusst als Konstante im Code und NICHT in einer
 * Umgebungsvariablen — BLOCKER. Eine Variable ist im Diff unsichtbar und im
 * Dashboard mit einem Tippfehler gesetzt; sie stünde zwischen einer
 * Kostenmeldung und der Abschaltung des falschen Projekts. Eine Konstante ändert
 * man in einem Commit, den jemand liest, und gegen die ein Test steht.
 */
export const FILMPROJEKT_ID = "prj_oMbzrEAkt0afZulCaQOxpX9QTzGh";

/**
 * solar-check.io. Steht hier NUR als Sperre, nie als Ziel: Diese Seite ist der
 * Grund, warum die Bremse überhaupt gezielt statt pauschal arbeitet. Sie zu
 * pausieren wäre exakt der Schaden, den die ganze Konstruktion verhindert.
 */
export const SOLAR_CHECK_PROJEKT_ID = "prj_O8t2QRE8Ky0qNdPlvwy0k8vI12QJ";

/**
 * Läuft beim Laden des Moduls und wirft, wenn jemand das Ziel je auf
 * solar-check.io umschreibt. Absichtlich eine Funktion mit `string`-Parameter:
 * Ein direkter Vergleich zweier Zeichenketten-Konstanten wäre für TypeScript ein
 * Vergleich ohne Überschneidung und damit ein Übersetzungsfehler — die Prüfung
 * ließe sich dann gar nicht erst hinschreiben.
 */
export function zielGeprueft(ziel: string): string {
  if (ziel === SOLAR_CHECK_PROJEKT_ID) {
    throw new Error(
      "Ausgabenbremse: Ziel ist solar-check.io. Diese Bremse darf ausschließlich das Filmprojekt pausieren.",
    );
  }
  if (!ziel.startsWith("prj_")) {
    throw new Error(`Ausgabenbremse: „${ziel}" ist keine Projekt-Kennung.`);
  }
  return ziel;
}

/** Das Projekt, das pausiert und entpaust wird. Einzige Stelle. */
export const PAUSE_ZIEL = zielGeprueft(FILMPROJEKT_ID);

// ─── Signatur ────────────────────────────────────────────────────────────────

export type SignaturBefund = { ok: true } | { ok: false; grund: string };

/**
 * Prüft den Kopfzeilen-Wert `x-vercel-signature` gegen den rohen Anfragetext.
 * Vercel signiert mit HMAC-SHA1 über den unveränderten Text (Vercel-Doku,
 * „Request headers", am 29.08.2026 gelesen).
 *
 * Der Empfänger ist öffentlich erreichbar — ohne diese Prüfung könnte jeder, der
 * die Adresse kennt, das Filmprojekt abschalten. Deshalb gilt hier
 * ausnahmslos: Im Zweifel ablehnen.
 *
 * FEHLT DAS GEHEIMNIS, WIRD ABGELEHNT — nicht durchgewinkt. Eine fehlende
 * Umgebungsvariable ist der wahrscheinlichste Betriebsfehler, und die bequeme
 * Behandlung („ohne Geheimnis keine Prüfung") verwandelt ihn in einen offenen
 * Schalter, den niemand sieht.
 */
export function pruefeSignatur(
  rawBody: string,
  header: string | null | undefined,
  secret: string | undefined,
): SignaturBefund {
  if (!secret) return { ok: false, grund: "Signaturgeheimnis nicht konfiguriert" };
  if (!header) return { ok: false, grund: "Signatur fehlt" };

  const erwartet = createHmac("sha1", secret).update(rawBody, "utf8").digest("hex");

  // Längenvergleich VOR timingSafeEqual: Die Funktion wirft bei ungleicher Länge,
  // und eine geworfene Ausnahme im Prüfpfad sähe aus wie ein Serverfehler statt
  // wie eine abgelehnte Anfrage.
  if (header.length !== erwartet.length) return { ok: false, grund: "Signatur passt nicht" };
  if (!timingSafeEqual(Buffer.from(header), Buffer.from(erwartet))) {
    return { ok: false, grund: "Signatur passt nicht" };
  }
  return { ok: true };
}

// ─── Was die Meldung bedeutet ────────────────────────────────────────────────

export type Aktion =
  /** 100 % erreicht: Filmprojekt abschalten. */
  | "pausieren"
  /** Abrechnungszeitraum vorbei: Filmprojekt wieder freigeben. */
  | "entpausen"
  /** 50 / 75 %: erwartete Zwischenmeldung, nur in die Ablage. */
  | "protokollieren"
  /** Nicht einzuordnen — nichts anfassen, aber melden. */
  | "unklar";

export type Entscheidung = {
  aktion: Aktion;
  /** Klartext für Protokoll und Meldung. */
  grund: string;
  schwelle?: number;
  budget?: number;
  ausgegeben?: number;
};

function zahl(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

/**
 * Ordnet die Nutzdaten einer Aktion zu.
 *
 * Vercel meldet bei 50, 75 und 100 Prozent des Betrags sowie am Ende des
 * Abrechnungszeitraums (Vercel-Doku „Spend Management"). Pausiert wird NUR bei
 * 100 — die früheren Schwellen sind Vorwarnung, keine Notlage.
 *
 * Die Grenze ist `>= 100` und nicht `=== 100`: Führt Vercel je eine höhere
 * Schwelle ein, ist Abschalten die sichere Richtung. Umgekehrt wäre ein
 * exakter Vergleich eine Bremse, die bei 110 Prozent nichts tut.
 */
export function deuteMeldung(nutzdaten: unknown): Entscheidung {
  if (typeof nutzdaten !== "object" || nutzdaten === null) {
    return { aktion: "unklar", grund: "Nutzdaten sind kein Objekt" };
  }
  const p = nutzdaten as Record<string, unknown>;

  // Das Team wird nur geprüft, wenn es dabeisteht. Eine Meldung für ein fremdes
  // Team wäre trotz gültiger Signatur ein Betriebsfehler (Empfänger im falschen
  // Team eingetragen) — und das Filmprojekt wegen fremder Ausgaben abzuschalten
  // ist eine Entscheidung, die niemand getroffen hat.
  const team = typeof p.teamId === "string" ? p.teamId : undefined;
  if (team && team !== VERCEL_TEAM_ID) {
    return { aktion: "unklar", grund: `Meldung gilt einem fremden Team (${team})` };
  }

  if (p.type === "endOfBillingCycle") {
    return { aktion: "entpausen", grund: "Abrechnungszeitraum beendet" };
  }

  const schwelle = zahl(p.thresholdPercent);
  const budget = zahl(p.budgetAmount);
  const ausgegeben = zahl(p.currentSpend);

  if (schwelle === undefined) {
    return { aktion: "unklar", grund: "Weder Schwelle noch Zyklusende in der Meldung" };
  }

  if (schwelle >= 100) {
    return { aktion: "pausieren", grund: `Ausgabengrenze erreicht (${schwelle} %)`, schwelle, budget, ausgegeben };
  }
  return { aktion: "protokollieren", grund: `Vorwarnung bei ${schwelle} %`, schwelle, budget, ausgegeben };
}

// ─── Vercels Schnittstelle ───────────────────────────────────────────────────

/**
 * Adresse zum Pausieren bzw. Entpausen. Die Team-Kennung MUSS mit — ohne sie
 * sucht Vercel das Projekt im persönlichen Konto und antwortet mit 400.
 */
export function projektSchalterUrl(aktion: "pause" | "unpause", projektId = PAUSE_ZIEL): string {
  return `https://api.vercel.com/v1/projects/${zielGeprueft(projektId)}/${aktion}?teamId=${VERCEL_TEAM_ID}`;
}

export type SchaltErgebnis = { ok: boolean; status: number | string; detail?: string };

/**
 * Schaltet das Filmprojekt. Wirft NICHT — der Aufrufer muss auch den
 * Fehlschlag melden können, und eine geworfene Ausnahme im Empfänger führte nur
 * dazu, dass Vercel die Meldung als fehlgeschlagen verbucht und niemand erfährt,
 * warum die Bremse nicht gegriffen hat.
 */
export async function schalteFilmprojekt(
  aktion: "pause" | "unpause",
  token: string | undefined,
  holen: typeof fetch = fetch,
): Promise<SchaltErgebnis> {
  if (!token) {
    return { ok: false, status: "kein Token", detail: "VERCEL_TOKEN ist nicht gesetzt" };
  }
  try {
    const res = await holen(projektSchalterUrl(aktion), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) return { ok: true, status: res.status };
    const detail = await res.text().catch(() => "");
    return { ok: false, status: res.status, detail: detail.slice(0, 400) };
  } catch (err) {
    return { ok: false, status: "Ausnahme", detail: err instanceof Error ? err.message : "unbekannt" };
  }
}
