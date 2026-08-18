import { defineConfig, devices } from "@playwright/test";

// Playwright config for Solar Check end-to-end smoke tests.
// Goals:
//   - One test per main user flow ("does the calc/recommendation/dashboard come up?")
//   - Fast enough to run on every push (target: under 60s total)
//   - Boots its own dev server so contributors don't need to start one manually
//
// We only test against Chromium for now — the app's UI is plain inline-CSS HTML,
// behavior across browsers is dominated by the JS engine and we don't use any
// vendor-prefixed features. Adding Firefox/WebKit triples runtime for marginal value.

// Port is overridable (E2E_PORT): a second checkout — worktree, parallel
// session — otherwise silently REUSES the dev server already listening on the
// default port and tests someone else's code. That failure is invisible: the
// run is green, just not about your changes.
const E2E_PORT = process.env.E2E_PORT || "3045";

export default defineConfig({
  testDir: "./e2e",
  // Alle Adressen einmal nacheinander aufrufen, bevor der erste Test startet.
  // Der Dev-Server übersetzt jede Route erst beim ersten Aufruf; lösen mehrere
  // Arbeiter das gleichzeitig aus, scheitert das serverseitige Rendern
  // ("__webpack_modules__[moduleId] is not a function"). Sichtbar wurde das,
  // als der Rundgang die Zahl der Adressen von 6 auf 33 hob — danach flatterten
  // auch die alten Flow-Tests. Details im Setup selbst.
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? "github" : "list",

  use: {
    baseURL: `http://localhost:${E2E_PORT}`,
    trace: "on-first-retry",
    // Use a deterministic locale so toLocaleString() output matches assertions
    locale: "de-DE",
    timezoneId: "Europe/Berlin",
  },

  // Zwei Projekte, weil die beiden Stufen verschieden teuer sind:
  //
  //   smoke — alles ausser dem Flow-Läufer. Läuft gegen den Dev-Server und ist
  //           in wenigen Minuten durch.
  //   flows — der Flow-Läufer allein (e2e/flows.spec.ts). Er baut je Weg die
  //           Seite neu auf und braucht gegen einen fertigen Build gut eine
  //           Viertelstunde; gegen den Dev-Server ein Vielfaches davon.
  //
  // Vorher lagen beide im selben Lauf. Als der Läufer von einem auf sieben
  // Flows wuchs, riss das die Zeitgrenze des CI-Jobs — und ein abgebrochener
  // Lauf fällt gar kein Urteil, weder rot noch grün. Getrennt kann jede Stufe
  // ihr eigenes Zeitmass bekommen, und ein langer Flow-Lauf hält die schnellen
  // Prüfungen nicht mehr auf.
  projects: [
    { name: "smoke", use: { ...devices["Desktop Chrome"] }, testIgnore: /flows\.spec\.ts/ },
    { name: "flows", use: { ...devices["Desktop Chrome"] }, testMatch: /flows\.spec\.ts/ },
  ],

  webServer: {
    // Dedicated port (3045) so this doesn't fight a manual dev server on 3000/3041
    //
    // E2E_BUILD=1 prüft gegen einen fertigen Build statt gegen den Dev-Server.
    // Nötig für den Flow-Automatismus (e2e/flows.spec.ts): Der ruft je Weg die
    // Seite neu auf, also hunderte Male. Der Dev-Server übersetzt jede Route
    // beim ersten Aufruf neu und ging dabei nach ~15 Minuten in die Knie — der
    // Lauf brach dann mit „nicht erreichbar" ab, was wie ein Testfehler aussah,
    // aber keiner war. Gegen den Build entfällt das Übersetzen komplett.
    command: process.env.E2E_BUILD
      ? `next build && next start -p ${E2E_PORT}`
      : `next dev -p ${E2E_PORT}`,
    url: `http://localhost:${E2E_PORT}`,
    reuseExistingServer: !process.env.CI,
    // 4 Minuten statt 2: In einer Worktree liegen die Abhängigkeiten im
    // Hauptverzeichnis, und der erste Start übersetzt alles neu — die zwei
    // Minuten liefen dort zuverlässig ab, bevor der Server bereit war, und der
    // ganze Lauf brach mit einer Meldung ab, die nach einem Testfehler aussieht.
    timeout: 240_000,
  },
});
