/*
 * Copy/share actions of the municipality page (approved design, 09/2026).
 * The prototype's share-ranking.js with the town taken from window.__GEMEINDE__.
 */
(() => {
  const G = window.__GEMEINDE__;
  if (!G) return;
  const url = G.liveUrl;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  function mountPageIcons() {
    const copy = document.querySelector("[data-page-copy]"),
      share = document.querySelector("[data-page-share]");
    if (!copy || !share) return false;
    copy.innerHTML = solarLiveIcons.Copy;
    share.innerHTML = solarLiveIcons.Share;
    return true;
  }
  if (!mountPageIcons()) {
    const observer = new MutationObserver(() => {
      if (mountPageIcons()) observer.disconnect();
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
    window.addEventListener("pagehide", () => observer.disconnect(), {
      once: true,
    });
  }
  document.addEventListener("click", async (event) => {
    const trigger = event.target.closest(
      "[data-ranking-copy],[data-page-copy]",
    );
    if (!trigger) return;
    const status = document.querySelector(
      trigger.hasAttribute("data-page-copy")
        ? ".atlas-page-status"
        : ".ranking-copy-status",
    );
    try {
      await navigator.clipboard.writeText(url);
      status.textContent = "Link kopiert.";
    } catch {
      status.textContent = "Kopieren nicht möglich. Bitte über Teilen öffnen.";
    }
  });
  const dialog = document.createElement("dialog");
  dialog.className = "atlas-dialog";
  dialog.setAttribute("aria-labelledby", "ranking-share-title");
  document.body.append(dialog);
  document.addEventListener("click", (event) => {
    const trigger = event.target.closest(
      "[data-ranking-share],[data-page-share]",
    );
    if (!trigger) return;
    const pageShare = trigger.hasAttribute("data-page-share");
    let data;
    try {
      if (!pageShare)
        data = JSON.parse(
          document.querySelector("#atlas-ranking")?.dataset.share || "null",
        );
    } catch {}
    const headline = data?.rank
      ? `${G.name}: Platz ${data.rank} bei „${data.title}“`
      : "Energiewende " + G.name;
    const text = data?.rank
      ? `${G.name} liegt bei „${data.title}“ auf Platz ${data.rank} von ${data.total} Orten ${data.area}. Verglichen wird die Größenklasse ${data.classLabel}; berücksichtigt werden ${data.owner}. Der Wert für ${G.name} beträgt ${data.value} ${data.unit}.`
      : "Wie entwickelt sich die Energiewende in " + G.name + "? Die Ortsübersicht zeigt erneuerbare Energie, Anlagenbestand, Ausbau und Vergleiche mit anderen Orten.";
    const source =
      "Grundlage: Marktstammdatenregister der Bundesnetzagentur und Einwohnerzahlen von Destatis, dl-de/by-2-0. Datenstand und laufende Übersicht: " +
      url;
    dialog.innerHTML =
      '<button class="atlas-close" aria-label="Schließen">×</button><h2 id="ranking-share-title">' + esc(G.genitiv) + ' Platzierung teilen</h2><div class="atlas-paper"><h3></h3><p></p><a target="_blank" rel="noopener"></a></div><p>Der Link führt zur Ortsseite. Die gewählte Vergleichsgruppe steht in der Meldung; die Filter werden im Link nicht gespeichert.</p><div class="ranking-share-buttons"><button class="atlas-button" data-copy-link>Link kopieren</button><button class="atlas-secondary" data-copy-story>Meldung mit Link kopieren</button></div><p role="status"></p><details><summary>Weitere Möglichkeiten</summary><p><a href="' + esc(G.widgetUrl) + '" target="_blank" rel="noopener">Vorhandene Daten-Widgets ansehen ↗</a></p><p>Download und Einbettung dieser neuen Platzierungsgrafik folgen mit der Umsetzung.</p></details>';
    if (pageShare) {
      dialog.querySelector("#ranking-share-title").textContent =
        "Energiewende " + G.name + " teilen";
      dialog.querySelector(".atlas-paper + p").textContent =
        "Der Link führt zur Energiewende in " + G.name + ".";
    }
    dialog.querySelector("h3").textContent = headline;
    dialog.querySelector(".atlas-paper p").textContent = text;
    const link = dialog.querySelector(".atlas-paper a");
    link.href = url;
    link.textContent = "Energie-Atlas " + G.name + " ↗";
    dialog.querySelector(".atlas-close").onclick = () => dialog.close();
    async function copy(value, message) {
      try {
        await navigator.clipboard.writeText(value);
        dialog.querySelector("[role=status]").textContent = message;
      } catch {
        dialog.querySelector("[role=status]").textContent =
          "Bitte den Text oder Link aus der Vorschau kopieren.";
      }
    }
    dialog.querySelector("[data-copy-link]").onclick = () =>
      copy(url, "Link zur Ortsseite kopiert.");
    dialog.querySelector("[data-copy-story]").onclick = () =>
      copy(
        headline + "\n\n" + text + "\n\n" + source,
        "Meldung mit Ortslink kopiert.",
      );
    dialog.showModal();
  });
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
})();
