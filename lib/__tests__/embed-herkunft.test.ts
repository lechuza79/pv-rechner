import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { EMBED_WIDGETS, hostAusHerkunft, istEmbedWidget, widgetAusPfad } from "../embed-herkunft-core";

const WURZEL = join(__dirname, "..", "..");

describe("Einbettungs-Zählung", () => {
  it("kennt genau die Widgets, die es wirklich gibt", () => {
    // Aus dem Dateibaum abgeleitet, nicht aus einer zweiten Liste — sonst ist
    // die Prüfung nur eine Abschrift und ein neues Widget fällt nirgends auf.
    const ordner = readdirSync(join(WURZEL, "app", "(embed)", "embed"), { withFileTypes: true })
      .filter(e => e.isDirectory())
      .map(e => e.name)
      .sort();
    expect([...EMBED_WIDGETS].sort()).toEqual(ordner);
  });

  it("nimmt nur Kennungen aus der Liste", () => {
    expect(istEmbedWidget("strommix")).toBe(true);
    expect(istEmbedWidget("gibt-es-nicht")).toBe(false);
    expect(istEmbedWidget("")).toBe(false);
    expect(istEmbedWidget(null)).toBe(false);
    // Der häufigste Angriff auf ein Textfeld, das in einer Ansicht landet.
    expect(istEmbedWidget("<script>alert(1)</script>")).toBe(false);
  });

  describe("Widget aus der eigenen Adresse", () => {
    it("liest das erste Segment nach /embed", () => {
      expect(widgetAusPfad("/embed/strommix")).toBe("strommix");
      expect(widgetAusPfad("/embed/karte/bayern")).toBe("karte");
    });

    it("verwirft alles andere", () => {
      expect(widgetAusPfad("/embed")).toBeNull();
      expect(widgetAusPfad("/embed/erfunden")).toBeNull();
      expect(widgetAusPfad("/photovoltaik-rechner")).toBeNull();
    });
  });

  describe("Herkunft → Domain", () => {
    it("kürzt einen vollständigen Ursprung auf die Domain", () => {
      expect(hostAusHerkunft("https://www.musterstadt.de")).toBe("www.musterstadt.de");
      // Der Pfad wird nie gespeichert — er wäre eine Aussage darüber, welche
      // Unterseite jemand aufruft, und genau das wollen wir nicht wissen. Der
      // Anfrage-Kopf trägt ihn je nach Einstellung der einbettenden Seite mit.
      expect(hostAusHerkunft("https://musterstadt.de/rathaus/energie")).toBe("musterstadt.de");
    });

    it("verwirft unsere eigenen Seiten", () => {
      // Sonst ersticken die eigene Galerie und die eigenen Seiten die Zahlen —
      // sie betten dieselben Widgets ein.
      expect(hostAusHerkunft("https://solar-check.io/energie-widgets")).toBeNull();
      expect(hostAusHerkunft("https://www.solar-check.io")).toBeNull();
      expect(hostAusHerkunft("http://localhost:3000/pv-simulation")).toBeNull();
    });

    it("verwirft, was keine Domain ist", () => {
      expect(hostAusHerkunft("")).toBeNull();
      expect(hostAusHerkunft(null)).toBeNull();
      expect(hostAusHerkunft("ohne-punkt")).toBeNull();
      expect(hostAusHerkunft("a".repeat(300) + ".de")).toBeNull();
      // Der Anfrage-Kopf kommt aus einem fremden Browser und ist frei wählbar;
      // sein Inhalt landet als Text in einer Admin-Ansicht.
      expect(hostAusHerkunft("<script>alert(1)</script>")).toBeNull();
      expect(hostAusHerkunft("boese.de' or 1=1--")).toBeNull();
    });

    it("normalisiert Schreibweisen, damit eine Domain nicht doppelt gezählt wird", () => {
      expect(hostAusHerkunft("HTTPS://Musterstadt.DE")).toBe("musterstadt.de");
      expect(hostAusHerkunft("  musterstadt.de  ")).toBe("musterstadt.de");
    });
  });

  it("speichert weder IP noch Kennung noch Uhrzeit", () => {
    // Die Datensparsamkeit ist die Bedingung, unter der diese Zählung
    // überhaupt gebaut werden durfte (Zusage an Einbettende: cookielos, kein
    // Browser-Speicher). Sie steht in der Tabellendefinition und ist von außen
    // nicht sichtbar — deshalb hier festgenagelt.
    const quelle = readFileSync(join(WURZEL, "lib", "embed-herkunft.ts"), "utf8");
    const ddl = quelle.slice(quelle.indexOf("EMBED_HERKUNFT_DDL"), quelle.indexOf("primary key"));
    expect(ddl).not.toMatch(/\bip\b|adresse|user_agent|besucher|session|cookie/i);
    // Der Kalendertag ist bewusst ein `date`, kein `timestamp`: Mit einer
    // Uhrzeit wäre eine Zeile wieder einem einzelnen Aufruf zuzuordnen.
    expect(ddl).toMatch(/tag\s+date\s+not null/);
    expect(ddl).not.toMatch(/timestamptz|timestamp\b/);
  });

  it("hält die Zähl-Funktion von den öffentlichen Rollen fern", () => {
    // Ein SECURITY DEFINER ohne Rechte-Entzug ist genau die Lücke, die im Juli
    // 2026 bei exec_sql gefunden wurde: Ein Entzug an PUBLIC allein reicht in
    // Supabase nicht, anon und authenticated tragen eigene Grants.
    const quelle = readFileSync(join(WURZEL, "lib", "embed-herkunft.ts"), "utf8");
    expect(quelle).toMatch(/security definer/);
    expect(quelle).toMatch(/set search_path\s*=\s*public/);
    for (const rolle of ["public", "anon", "authenticated"]) {
      expect(quelle).toMatch(new RegExp(`revoke all on function sc_embed_herkunft_zaehlen\\(text, text\\) from ${rolle}`));
    }
  });

  it("liest die Herkunft NUR aus dem Anfrage-Kopf, nie im Browser — BLOCKER", () => {
    // Der Kern der Rechtsfrage. Die erste Fassung (25.08.2026, wenige Stunden
    // live) lieferte JavaScript aus, das den Browser anwies, die Herkunft zu
    // senden — nach den EDSA-Leitlinien 2/2023 Rn. 33, 53 und 63 ein Zugriff
    // auf die Endeinrichtung, der eine Einwilligung verlangt hätte. Wer diesen
    // Weg wieder aufmacht, macht die Zählung einwilligungspflichtig, ohne dass
    // es irgendwo auffällt.
    const middleware = readFileSync(join(WURZEL, "middleware.ts"), "utf8");
    expect(middleware).toMatch(/headers\.get\("referer"\)/);

    for (const datei of ["embed-herkunft-core.ts", "embed-herkunft.ts"]) {
      const quelle = readFileSync(join(WURZEL, "lib", datei), "utf8");
      expect(quelle).not.toMatch(/ancestorOrigins|document\.referrer/);
      expect(quelle).not.toMatch(/localStorage|sessionStorage|document\.cookie/);
    }

    // Und es darf keinen offenen Eingang mehr geben, über den ein Browser eine
    // Herkunft melden könnte.
    let routeDa = true;
    try {
      readFileSync(join(WURZEL, "app", "api", "embed", "herkunft", "route.ts"), "utf8");
    } catch {
      routeDa = false;
    }
    expect(routeDa, "die offene Melde-Route ist wieder da").toBe(false);
  });

  it("wird dort beschrieben, wo wir sie zusagen", () => {
    // Die gefährlichsten absoluten Aussagen stehen in der Datenschutzerklärung
    // selbst — sie liest sich wie eine Bestandsaufnahme und ist ein Versprechen.
    // „Kein Tracking" ist ein Wort, das jeder anders auslegt; eine reine
    // Domain-Zählung wäre streng gelesen ein Verstoß dagegen, obwohl niemand
    // wiedererkannt wird. Beide Stellen sagen deshalb, was wir wirklich nicht
    // tun, und beide nennen die Zählung.
    const stellen = [
      join(WURZEL, "app", "(site)", "datenschutz", "page.tsx"),
      // Dieser Text wird von Einbettenden in IHRE Erklärung übernommen — eine
      // Falschaussage hier wird zur Falschaussage einer Gemeinde.
      join(WURZEL, "app", "(site)", "energie-widgets", "client.tsx"),
    ];
    for (const pfad of stellen) {
      // Bewusst UNGEFILTERT geprüft, Kommentare eingeschlossen. Ein Versuch,
      // Kommentare vorher wegzuschneiden, hat in der Galerie-Datei quer durch
      // echten Code gegriffen und ausgerechnet den Textabschnitt gelöscht, um
      // den es hier geht — die Prüfung wäre grün gewesen, ohne irgendetwas
      // gesehen zu haben. Der Preis: Auch ein Kommentar darf die alte Formel
      // nicht wörtlich zitieren. Das ist der günstigere der beiden Fehler.
      const text = readFileSync(pfad, "utf8");
      expect(text).not.toMatch(/kein\s+Tracking/i);
      // Und keine zweite Absolutformel an ihre Stelle setzen. „Zweck ist
      // ausschließlich …" stand am 25.08.2026 einen CI-Lauf lang in dieser
      // Erklärung und hat einen bestehenden Browser-Test umgeworfen, der die
      // Formel seitenweit verbietet — zu Recht: Sie war schon beim Schreiben
      // unwahr, weil dieselbe Ansicht auch zeigt, welches Widget wo läuft.
      expect(text).not.toMatch(/Zweck ist ausschließlich/);
      expect(text).toMatch(/nicht wiedererkannt|nicht wieder\b|erkennt einzelne Besucher nicht/i);
      expect(text).toMatch(/Kalendertag/);
    }
  });
});
