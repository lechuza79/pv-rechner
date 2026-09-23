/*
 * Ranking section of the municipality page (approved design, 09/2026).
 *
 * The prototype's ranking.js, formatted and made town-independent: every
 * place-specific value comes from window.__GEMEINDE__ (set by the page from
 * the town's package), the district figures from the package instead of a
 * Höchberg JSON file, the national/state lists from the live Atlas route
 * /api/atlas/nachbarn, and the full list of a saved ranking is fetched when
 * the category is opened (/api/gemeinde/rangliste) instead of shipping 3.7 MB
 * of lists with every page. Behaviour and markup are otherwise unchanged.
 */
(async () => {
  const G = window.__GEMEINDE__;
  if (!G) return;
  const data = G.district;
  const classes = [
    ["doerfer", "Dörfer · unter 1.000", 0, 1000],
    ["kleine-gemeinden", "Kleine Gemeinden · 1.000–4.999", 1000, 5000],
    [
      "gemeinden-und-kleinstaedte",
      "Gemeinden & Kleinstädte · 5.000–19.999",
      5000,
      20000,
    ],
    [
      "mittelgrosse-staedte",
      "Mittelgroße Städte · 20.000–99.999",
      20000,
      100000,
    ],
    ["grossstaedte", "Großstädte · ab 100.000", 100000, Infinity],
  ];
  const metrics = [
    {
      id: "count",
      title: "Zahl der Solaranlagen",
      unit: "Anlagen",
      value: (r, o) => r.sums[o].count,
    },
    {
      id: "storage",
      title: "Speicherkapazität je Einwohner",
      unit: "Wh / Einwohner",
      value: (r, o) => (1000 * r.sums[o].speicher) / r.population,
    },
    {
      id: "power",
      title: "Solarleistung je Einwohner",
      unit: "Wp / Einwohner",
      value: (r, o) => (1000 * r.sums[o].kwp) / r.population,
    },
  ];
  const discoveries = G.discoveries;
  metrics.push(
    ...discoveries.map((snapshot, index) => ({
      id: "saved-" + index,
      title: snapshot.label,
      unit: snapshot.unit ?? "",
      snapshot,
    })),
  );
  let discovered = 1;
  // Womit der Abschnitt aufmacht: mit der BESTEN ausgezeichneten Platzierung,
  // wenn es eine gibt. Der Entwurf startete immer auf „Zahl der Solaranlagen" —
  // Quitzdorf eröffnete damit mit Platz 25 von 40, obwohl es im selben Kreis
  // beim Zubau je Einwohner Zweiter ist. Die Reihenfolge der gespeicherten
  // Platzierungen ist bereits die beste zuerst.
  const besteEntdeckung = discoveries.findIndex((d) => d.distinction);
  // Nur für den ersten Aufbau: Danach ist jede Auswahl die des Lesers.
  let ersterAufbau = true;
  let area = G.startArea,
    owner = "alle",
    classId = G.klasse,
    active = besteEntdeckung >= 0 ? "saved-" + besteEntdeckung : "count",
    playing = false,
    visible = false,
    busy = false,
    requestId = 0,
    timer = null,
    remote = null,
    animationId = 0;
  const seen = new Map(),
    listInvitations = new Set();
  const shortScope = (scope) => scope.split(" · ")[0];
  const splitTitle = (title) => {
    title = title.charAt(0).toLocaleUpperCase("de-DE") + title.slice(1);
    const at = title.indexOf(" je ");
    return at < 0 ? [title, ""] : [title.slice(0, at), title.slice(at + 1)];
  };
  const arrow = solarLiveIcons.ArrowRight;
  // Lange Zahlen im Podest kürzen: 562.937 kWp sind 562,9 MWp. Die Einheit
  // folgt dem größten Wert der Ansicht und gilt dann für alle Säulen — sonst
  // stünden drei Balken in drei Einheiten nebeneinander. Dieselben Schwellen
  // wie im Atlas-Formatierer (ab vier Stellen die nächstgrößere Einheit); die
  // Liste im Fenster bleibt in der Grundeinheit, dort zählt die Genauigkeit.
  // Die Pfeile der Seite, nicht die Schriftzeichen ↑↓: gleiche Strichstärke
  // wie überall, und sie skalieren mit der Schrift.
  const PFEIL =
    '<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M8 13V3"/><path d="M3.5 7.5 8 3l4.5 4.5"/></svg>';
  const PFEIL_HOCH = '<span class="ranking-pfeil">' + PFEIL + "</span>";
  const PFEIL_RUNTER =
    '<span class="ranking-pfeil ranking-pfeil-runter">' + PFEIL + "</span>";
  const STUFEN = {
    kWp: [[1e6, "GWp"], [1e3, "MWp"]],
    kWh: [[1e6, "GWh"], [1e3, "MWh"]],
    Anlagen: [[1e6, "Mio. Anlagen"]],
  };
  const skala = (unit, max) => {
    for (const [grenze, name] of STUFEN[unit] ?? [])
      if (max >= grenze) return { teiler: grenze, unit: name, stellen: 1 };
    return { teiler: 1, unit, stellen: 0 };
  };
  const fmt = (n) => Math.round(n).toLocaleString("de-DE"),
    wert = (n, sk) =>
      sk.teiler === 1
        ? fmt(n)
        : (n / sk.teiler).toLocaleString("de-DE", {
            minimumFractionDigits: sk.stellen,
            maximumFractionDigits: sk.stellen,
          }),
    escape = (s) =>
      String(s).replace(
        /[&<>"']/g,
        (c) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          })[c],
      );
  const within = (r) => {
    const c = classes.find((c) => c[0] === classId);
    return r.population >= c[2] && r.population < c[3];
  };
  const ownIncluded = () =>
    within({
      population: data.districtPeers.find((r) => r.region_id === G.ags)
        .population,
    });
  const ownRow = (rows) =>
    ownIncluded() ? rows.find((r) => r.id === G.ags) : null;
  const localRows = (m) =>
    data.districtPeers
      .filter((r) => within(r) && r.population > 0)
      .map((r) => ({
        id: r.region_id,
        name: r.name,
        value: m.value(r, owner),
        href:
          G.kreisBase + r.slug,
      }))
      .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name, "de"))
      .map((r, i, all) => ({
        ...r,
        rank: 1 + all.filter((x) => x.value > r.value).length,
      }));
  function getRows(m) {
    if (m.snapshot)
      return (
        m.snapshot.rows ?? [
          {
            id: G.ags,
            name: G.name,
            rank: m.snapshot.rank,
            value: m.snapshot.value,
          },
        ]
      );
    return area === G.kreisAgs
      ? localRows(m)
      : (remote?.zeilen || [])
          .filter((r) => !r.selbst || ownIncluded())
          .map((r) => ({
            id: r.regionId,
            name: r.name,
            value: r.wert,
            rank: r.platz,
            href: r.href ? "https://solar-check.io" + r.href : null,
          }));
  }
  function mount() {
    const section = document.getElementById("atlas-ranking");
    if (!section) {
      requestAnimationFrame(mount);
      return;
    }
    section.innerHTML = `<div class="atlas-wrap"><div class="atlas-head"><div><h2>Ranking: ${escape(G.name)} im Vergleich</h2></div><p class="ranking-intro"><span class="ranking-intro-copy">Wie steht ${escape(G.name)} da?</span> <button type="button" class="ranking-edit" aria-expanded="false" aria-controls="ranking-settings">Vergleichsgrößen ändern</button> <button type="button" class="ranking-reset" hidden>Zurücksetzen</button></p></div><div class="ranking-settings" id="ranking-settings" hidden><div class="ranking-filters"><label>Vergleichsgebiet<select data-filter="area">${G.kreisAgs ? `<option value="${G.kreisAgs}">${escape(G.kreisLabel)}</option>` : ""}<option value="${G.landAgs}">${escape(G.landLabel)}</option><option value="">Deutschland</option></select></label><label>Ortsgröße<select data-filter="class">${classes.map((c) => `<option value="${c[0]}" ${c[0] === classId ? "selected" : ""}>${c[1]}</option>`).join("")}</select></label><label>Anlagenbereich<select data-filter="owner"><option value="alle">Alle Anlagen</option><option value="privat">Privat</option><option value="gewerbe">Gewerbe / Freifläche</option></select></label></div></div><div class="ranking-playback"><span class="ranking-scope"></span><button type="button" class="ranking-play" hidden></button></div><p class="ranking-availability"></p><p class="ranking-load" role="status"></p><div class="atlas-competition"><div class="atlas-award-card ranking-stage" aria-live="off"></div><aside class="ranking-category-panel"><p class="atlas-kicker">${escape(G.genitiv)} Platzierungen</p><div class="ranking-choices" aria-label="Ranking-Kategorie"></div><button type="button" class="ranking-next">Nächste Platzierung entdecken →</button></aside></div><div class="ranking-share-actions"><button type="button" class="atlas-button" data-ranking-share>Platzierung teilen ↗</button></div><button type="button" class="ranking-open" aria-haspopup="dialog"></button><dialog class="ranking-dialog" aria-labelledby="ranking-dialog-title"><header class="ranking-dialog-head"><div class="ranking-dialog-titel"><h2 id="ranking-dialog-title">Rangliste</h2><p class="ranking-dialog-context"></p></div><button class="ranking-close" type="button" aria-label="Rangliste schließen">×</button></header><p class="ranking-change"></p><div class="ranking-table"></div></dialog><p class="ranking-source">${G.kreisAgs ? "Landkreis" : escape(G.landLabel)}: Registerstand ${new Date(data.dataAsOf).toLocaleDateString("de-DE")} · Einwohner: ${new Date(data.populationAsOf).toLocaleDateString("de-DE")}. ${escape(G.landLabel)} und Deutschland: Datenabruf bei Auswahl.</p></div>`;

    const stage = section.querySelector(".ranking-stage"),
      choices = section.querySelector(".ranking-choices"),
      play = section.querySelector(".ranking-play"),
      status = section.querySelector(".ranking-load"),
      full = section.querySelector(".ranking-dialog"),
      openList = section.querySelector(".ranking-open");
    const footer = document.createElement("footer");
    footer.className = "ranking-footer";
    section.querySelector(".ranking-share-actions").before(footer);
    footer.append(openList, section.querySelector(".ranking-share-actions"));
    section.querySelector(".ranking-share-actions").innerHTML =
      `<button type="button" class="ranking-icon-action" data-ranking-copy aria-label="Link kopieren" title="Link kopieren">${solarLiveIcons.Copy}</button><button type="button" class="ranking-icon-action" data-ranking-share aria-label="Platzierung teilen" title="Platzierung teilen">${solarLiveIcons.Share}</button><span class="ranking-copy-status" role="status"></span>`;
    const panel = section.querySelector(".ranking-category-panel");
    const sizePanel = () =>
      (panel.style.height = stage.getBoundingClientRect().height + "px");
    const stageObserver = new ResizeObserver(() => {
      sizePanel();
      keepActiveVisible(false);
    });
    stageObserver.observe(stage);
    window.addEventListener("pagehide", () => stageObserver.disconnect(), {
      once: true,
    });
    let priorOverflow = "";
    // Die eigene Zeile bleibt beim Scrollen in der Tabelle stehen (weiß,
    // gerundet, mit Schatten). Der Entwurf löste das mit einem gelben Knopf,
    // der unten in der Tabelle schwebte und die Zeile ein zweites Mal
    // nachbaute — mit der klebenden Zeile stand beides gleichzeitig da.
    const scroller = full.querySelector(".ranking-table");
    openList.onclick = async () => {
      pause();
      listInvitations.add(active);
      openList.classList.remove("ranking-list-invite");
      priorOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      full.showModal();
      // Die volle Liste einer gespeicherten Platzierung wird erst hier geholt.
      // Sie hing bisher am Kategorie-Wechsel; öffnet die Seite gleich auf der
      // besten Platzierung, stand im Fenster „undefined" statt der Liste.
      const m = metrics.find((x) => x.id === active);
      const snap = m?.snapshot;
      if (snap && !snap.rows && snap.rowsUrl && !snap.rowsFailed) {
        scroller.innerHTML = "<p>Rangliste wird geladen …</p>";
        try {
          const r = await fetch(snap.rowsUrl);
          if (!r.ok) throw Error("unavailable");
          snap.rows = await r.json();
        } catch {
          snap.rowsFailed = true;
          snap.rowsUnavailableReason = "Die vollständige Liste konnte gerade nicht geladen werden.";
        }
        if (active === m.id) render(true);
      }
    };
    section.querySelector(".ranking-close").onclick = () => full.close();
    full.addEventListener("click", (event) => {
      if (event.target === full) {
        const rect = full.getBoundingClientRect();
        if (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        )
          full.close();
      }
    });
    full.addEventListener("close", () => {
      document.body.style.overflow = priorOverflow;
      openList.focus({ preventScroll: true });
    });
    const settings = section.querySelector(".ranking-settings"),
      edit = section.querySelector(".ranking-edit"),
      reset = section.querySelector(".ranking-reset");
    let settingsMotion = null,
      settingsMotionId = 0;
    edit.onclick = async () => {
      const opening = edit.getAttribute("aria-expanded") !== "true",
        motionId = ++settingsMotionId;
      const fromHeight = settings.hidden
        ? 0
        : settings.getBoundingClientRect().height;
      const fromOpacity = settings.hidden
        ? 0
        : Number(getComputedStyle(settings).opacity);
      settingsMotion?.cancel();
      edit.setAttribute("aria-expanded", String(opening));
      if (opening) pause();
      settings.hidden = false;
      settings.inert = !opening;
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
        settings.hidden = !opening;
        settings.inert = !opening;
        return;
      }
      settings.style.overflow = "hidden";
      settingsMotion = settings.animate(
        [
          { height: fromHeight + "px", opacity: fromOpacity },
          {
            height: (opening ? settings.scrollHeight : 0) + "px",
            opacity: opening ? 1 : 0,
          },
        ],
        { duration: 320, easing: "cubic-bezier(.22,1,.36,1)", fill: "both" },
      );
      await settingsMotion.finished.catch(() => {});
      if (motionId !== settingsMotionId) return;
      settings.hidden = !opening;
      settingsMotion.cancel();
      settingsMotion = null;
      settings.style.overflow = "";
    };
    const updateReset = () => {
      reset.hidden =
        area === G.startArea && owner === "alle" && classId === G.klasse;
    };
    reset.onclick = () => {
      area = G.startArea;
      owner = "alle";
      classId = G.klasse;
      section.querySelector('[data-filter="area"]').value = area;
      section.querySelector('[data-filter="owner"]').value = owner;
      section.querySelector('[data-filter="class"]').value = classId;
      updateReset();
      load();
    };
    function bindTooltip() {
      const trigger = section.querySelector(".ranking-class-help"),
        tip = section.querySelector("#ranking-class-tip");
      if (!trigger) return;
      trigger.onclick = () => {
        const open = trigger.getAttribute("aria-expanded") !== "true";
        trigger.setAttribute("aria-expanded", String(open));
        tip.hidden = !open;
      };
      trigger.onkeydown = (e) => {
        if (e.key === "Escape") {
          tip.hidden = true;
          trigger.setAttribute("aria-expanded", "false");
        }
      };
      trigger.onblur = () => {
        tip.hidden = true;
        trigger.setAttribute("aria-expanded", "false");
      };
    }
    function playLabel() {
      play.textContent = playing ? "Ⅱ Pause" : "▶ Abspielen";
      play.setAttribute(
        "aria-label",
        playing ? "Autowechsel pausieren" : "Autowechsel starten",
      );
      play.setAttribute("aria-pressed", String(playing));
      play.disabled = area !== G.kreisAgs || busy;
    }
    function schedule() {
      clearTimeout(timer);
      playing = false;
      playLabel();
    }
    function pause() {
      playing = false;
      schedule();
    }
    play.onclick = () => {
      playing = !playing;
      schedule();
    };
    let inviteTarget = null,
      inviteDismissed = false,
      inviteReady = false,
      inviteTimer = null;
    function dismissInvite() {
      inviteDismissed = true;
      clearTimeout(inviteTimer);
      updateInvite();
    }
    choices.addEventListener("click", (e) => {
      if (e.target.closest(".ranking-choice:not(:disabled)")) dismissInvite();
    });
    section
      .querySelector(".ranking-next")
      .addEventListener("click", dismissInvite);
    const inviteObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.target === inviteTarget)
            entry.target.classList.toggle(
              "ranking-invite-visible",
              entry.isIntersecting && entry.intersectionRatio >= 0.6,
            );
        }
      },
      { threshold: [0, 0.6], rootMargin: "-65px 0px -90px 0px" },
    );
    function updateInvite() {
      const next =
        inviteDismissed || !inviteReady
          ? null
          : choices.querySelector(
              '.ranking-undiscovered:not([aria-pressed="true"]):not(:disabled)',
            );
      if (next === inviteTarget) return;
      if (inviteTarget) {
        inviteObserver.unobserve(inviteTarget);
        inviteTarget.classList.remove("ranking-invite-visible");
      }
      inviteTarget = next;
      if (next) inviteObserver.observe(next);
    }
    window.addEventListener(
      "pagehide",
      () => {
        clearTimeout(inviteTimer);
        inviteObserver.disconnect();
      },
      { once: true },
    );
    function keepActiveVisible(smooth = true) {
      const item = choices.querySelector('[aria-pressed="true"]');
      if (!item) return;
      const box = item.getBoundingClientRect(),
        view = choices.getBoundingClientRect();
      let top = choices.scrollTop;
      if (box.bottom > view.bottom) top += box.bottom - view.bottom;
      else if (box.top < view.top) top -= view.top - box.top;
      else return;
      choices.scrollTo({
        top,
        behavior:
          smooth && !matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "smooth"
            : "instant",
      });
    }
    async function selectCategory(metric) {
      // Finish the previous discovery if the user skips its animation.
      const prior = metrics.find((item) => item.id === active),
        rows = getRows(prior),
        own = ownRow(rows);
      if (!seen.has(active))
        seen.set(active, {
          rank: own ? fmt(own.rank) : "—",
          denominator: "",
          caption: prior.snapshot
            ? shortScope(prior.snapshot.scope)
            : own
              ? fmt(own.value) + " " + prior.unit
              : "Keine Platzierung",
        });
      pause();
      active = metric.id;
      // A saved ranking's full list is fetched when the category is opened;
      // until then (or if it fails) the stored own position shows alone.
      const snap = metric.snapshot;
      if (snap && !snap.rows && snap.rowsUrl && !snap.rowsFailed) {
        stage.innerHTML = "<p>Rangliste wird geladen …</p>";
        try {
          const r = await fetch(snap.rowsUrl);
          if (!r.ok) throw Error("unavailable");
          snap.rows = await r.json();
        } catch {
          snap.rowsFailed = true;
          snap.rowsUnavailableReason = "Die vollständige Liste konnte gerade nicht geladen werden.";
        }
        if (active !== metric.id) return;
      }
      render(true);
    }
    function render(animate = false) {
      const m = metrics.find((m) => m.id === active),
        rows = getRows(m),
        me = ownRow(rows),
        total =
          m.snapshot?.size ??
          (area === G.kreisAgs ? rows.length : remote?.total || 0);
      const id = ++animationId;
      const sourceText = m.snapshot
        ? "Gespeicherte Rangposition · erfasst am " +
          new Date(m.snapshot.asOf).toLocaleDateString("de-DE", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })
        : (G.kreisAgs ? "Landkreis" : G.landLabel) + ": Datenstand " +
          new Date(data.dataAsOf).toLocaleDateString("de-DE", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }) +
          " · Einwohner: " +
          new Date(data.populationAsOf).toLocaleDateString("de-DE", {
            day: "numeric",
            month: "short",
            year: "numeric",
          });
      const top = rows.slice(0, 3),
        order = top.length === 3 ? [top[1], top[0], top[2]] : top;
      const previous = me ? rows.find((r) => r.rank === me.rank - 1) : null;
      section.dataset.share = JSON.stringify({
        title: m.title,
        rank: me?.rank ?? null,
        total,
        value: me ? fmt(me.value) : null,
        unit: m.unit,
        area: m.snapshot
          ? m.snapshot.scope
          : area === G.kreisAgs
            ? "im " + G.kreisLabel
            : area === G.landAgs
              ? "in " + G.landLabel
              : "in Deutschland",
        classLabel: classes.find((c) => c[0] === classId)[1],
        owner:
          owner === "alle"
            ? "alle Anlagen"
            : owner === "privat"
              ? "private Anlagen"
              : "gewerbliche Anlagen und Freiflächen",
      });
      const sk = skala(
        m.unit,
        Math.max(...[...top.map((r) => r.value), me ? me.value : 0]),
      );
      const html =
        m.snapshot && !m.snapshot.rows
          ? `<p class="atlas-kicker">${escape(m.snapshot.scope)}</p><h3>${escape(m.title)}</h3><div class="ranking-snapshot-result"><strong>${escape(m.snapshot.distinction ?? "Platz " + fmt(m.snapshot.rank))}</strong><p>${escape(G.name)} · Platz ${fmt(m.snapshot.rank)} von ${fmt(total)} Orten</p></div><p class="ranking-detail">Erfasst am ${new Date(m.snapshot.asOf).toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "numeric" })}</p>`
          : top.length
            ? `<p class="atlas-kicker">Die Top ${Math.min(3, top.length)}</p><h3>${m.title}</h3><p class="ranking-detail">${m.snapshot ? escape(shortScope(m.snapshot.scope)) : owner === "alle" ? "Private und gewerbliche Anlagen" : owner === "privat" ? "Private Anlagen" : "Gewerbliche Anlagen und Freiflächen"} · ${sk.unit === "Anlagen" ? "Anzahl" : sk.unit}</p><div class="ranking-podium">${order.map((r) => `<div class="ranking-contender ${r.id === G.ags ? "is-own" : ""}" data-rank="${r.rank}">${r.href ? `<a href="${escape(r.href)}" target="_blank" rel="noopener">${r.id === G.ags && r.rank <= 3 ? `<img class="ranking-badge" src="/gemeinde/rank-badges/${m.id === "storage" || m.snapshot?.key?.startsWith("speicher") ? "battery" : "roof"}-${r.rank}.png" alt="Platz ${r.rank} – ${escape(m.title)}" width="96" height="96">` : ``}${escape(r.name)}</a>` : `<span>${r.id === G.ags && r.rank <= 3 ? `<img class="ranking-badge" src="/gemeinde/rank-badges/${m.id === "storage" || m.snapshot?.key?.startsWith("speicher") ? "battery" : "roof"}-${r.rank}.png" alt="Platz ${r.rank} – ${escape(m.title)}" width="96" height="96">` : ``}${escape(r.name)}</span>`}<strong class="ranking-value" data-value="${r.value}">${wert(r.value, sk)}</strong><span class="ranking-unit" hidden>${sk.unit}</span><div class="ranking-step" style="height:${top[0].value > 0 ? (160 * r.value) / top[0].value : 0}px"></div></div>`).join("")}</div><div class="ranking-own"><span>${escape(G.name)}${me && me.rank <= 3 ? " · auf dem Podest" : ""}</span>${me ? `<strong>Platz ${fmt(me.rank)} <small>von ${fmt(total)}</small></strong><span class="ranking-value">${wert(me.value, sk)} ${sk.unit}</span>` : `<p>${ownIncluded() ? "Keine eigene Platzierung verfügbar." : "Liegt außerhalb der gewählten Größenklasse (" + G.einwohnerLabel + ")."}</p>`}</div><p class="ranking-gap">${me?.rank === 1 ? escape(G.name) + " führt diese Kategorie an." : previous ? `${wert(previous.value - me.value, sk)} ${sk.unit} Abstand zu ${escape(previous.name)} auf Platz ${previous.rank}.` : me && top.length ? `${wert(top[0].value - me.value, sk)} ${sk.unit} Abstand zur Spitze (${escape(top[0].name)}).` : ""}</p>`
            : "<h3>Keine Orte in dieser Vergleichsgruppe</h3><p>Wähle eine andere Ortsgröße oder ein größeres Gebiet.</p>";
      function cancelMotion() {
        stage.getAnimations({ subtree: true }).forEach((a) => a.cancel());
        stage.querySelectorAll("[inert]").forEach((e) => (e.inert = false));
      }
      function decoratePosition(button, metric, known) {
        button.classList.toggle(
          "ranking-undiscovered",
          !known && !button.disabled,
        );
        const position = button.querySelector(".ranking-choice-position");
        position.querySelector(".ranking-list-badge")?.remove();
        position.classList.remove("has-badge");
        const rank = Number(known?.rank?.replaceAll(".", ""));
        const top =
          known && metric.snapshot?.distinction?.match(/^Top (10|25|50|100)$/);
        const family =
          metric.id === "storage" ||
          /^(speicher|batterie)/.test(metric.snapshot?.key ?? "")
            ? "battery"
            : metric.id === "count" || metric.id === "power"
              ? "roof"
              : "rank";
        const src =
          !known && !button.disabled
            ? "rank-mystery.png"
            : top
              ? "top-" + top[1] + ".svg"
              : rank >= 1 && rank <= 3
                ? family + "-" + rank + (family === "rank" ? ".svg" : ".png")
                : null;
        if (src) {
          position.classList.add("has-badge");
          const badge = document.createElement("img");
          badge.className = "ranking-list-badge";
          // Die gemalten Abzeichen liegen freigestellt und verkleinert unter
          // /gemeinde/rank-badges (≈15 KB statt ≈300 KB); die SVG-Abzeichen
          // bleiben, wo sie sind.
          badge.src = (src.endsWith(".svg") ? "/atlas-design-preview/rank-badges/" : "/gemeinde/rank-badges/") + src;
          badge.alt = !known
            ? "Platzierung noch nicht entdeckt"
            : top
              ? metric.snapshot.distinction
              : "Platz " + rank;
          badge.width = 96;
          badge.height = 96;
          position.prepend(badge);
        }
      }
      function revealChoice() {
        if (id !== animationId) return;
        const newlyRevealed = !seen.has(m.id);
        seen.set(m.id, {
          rank: me ? fmt(me.rank) : "—",
          denominator: me ? " / " + fmt(total) : "",
          caption: m.snapshot
            ? shortScope(m.snapshot.scope)
            : me
              ? fmt(me.value) + " " + m.unit
              : ownIncluded()
                ? "Keine Platzierung"
                : "Andere Größenklasse",
        });
        const button = choices.querySelector(`[data-category="${m.id}"]`);
        if (!button) return;
        button.querySelector(".ranking-choice-rank").textContent = me
          ? fmt(me.rank)
          : "—";
        button.querySelector(".ranking-choice-denominator").textContent = me
          ? " / " + fmt(total)
          : "";
        button.querySelector(".ranking-choice-caption").textContent = m.snapshot
          ? shortScope(m.snapshot.scope)
          : me
            ? fmt(me.value) + " " + m.unit
            : ownIncluded()
              ? "Keine Platzierung"
              : "Andere Größenklasse";
        decoratePosition(button, m, seen.get(m.id));
        if (!inviteReady && !inviteDismissed) {
          clearTimeout(inviteTimer);
          const badgeDuration = matchMedia("(prefers-reduced-motion: reduce)")
            .matches
            ? 0
            : 500;
          inviteTimer = setTimeout(() => {
            if (id !== animationId || inviteDismissed) return;
            inviteReady = true;
            updateInvite();
          }, badgeDuration + 500);
        }
        updateInvite();
        requestAnimationFrame(() => keepActiveVisible());
        openList.classList.toggle(
          "ranking-list-invite",
          Boolean(me && me.rank > 3 && !listInvitations.has(active)),
        );
        if (newlyRevealed && me?.rank <= 3)
          window.dispatchEvent(
            new CustomEvent("atlas-ranking-celebrate", {
              detail: {
                target:
                  stage.querySelector(".ranking-contender.is-own") ?? stage,
              },
            }),
          );
        if (
          newlyRevealed &&
          !matchMedia("(prefers-reduced-motion: reduce)").matches
        ) {
          button.querySelector(".ranking-choice-position").animate(
            [
              { opacity: 0, transform: "translateY(10px) scale(.9)" },
              { opacity: 1, transform: "translateY(0) scale(1)" },
            ],
            { duration: 500, easing: "cubic-bezier(.16,1,.3,1)" },
          );
          button.querySelector(".ranking-choice-caption").animate(
            [
              { opacity: 0, transform: "translateY(5px)" },
              { opacity: 1, transform: "translateY(0)" },
            ],
            {
              duration: 400,
              delay: 100,
              fill: "backwards",
              easing: "ease-out",
            },
          );
        }
      }
      async function update() {
        cancelMotion();
        const motion =
          animate &&
          !seen.has(m.id) &&
          !matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (motion)
          await stage
            .animate([{ opacity: 1 }, { opacity: 0 }], {
              duration: 150,
              fill: "forwards",
            })
            .finished.catch(() => {});
        if (id !== animationId) return;
        cancelMotion();
        stage.innerHTML = html;

        const [label, qualifier] = splitTitle(m.title),
          heading = stage.querySelector("h3");
        if (heading) {
          heading.textContent = label;
          const sub = document.createElement("p");
          sub.className = "ranking-stage-subline";
          sub.textContent =
            qualifier || (m.unit === "Anlagen" ? "Anzahl der Anlagen" : m.unit);
          heading.after(sub);
        }
        const kicker = stage.querySelector(".atlas-kicker");
        if (kicker)
          kicker.textContent =
            m.snapshot && !m.snapshot.rows
              ? G.genitiv + " Platzierung"
              : "Top " + Math.min(3, top.length) + " von " + fmt(total);
        const scopeDetail = stage.querySelector(".ranking-detail");
        if (scopeDetail)
          scopeDetail.textContent = m.snapshot
            ? shortScope(m.snapshot.scope)
            : area === G.kreisAgs
              ? G.kreisLabel
              : area === G.landAgs
                ? G.landLabel
                : "Deutschland";
        // Die Speicherquote bringt ihre eigene Erklärung mit; dann entfällt die
        // allgemeine, sonst stehen zwei Fragezeichen nebeneinander.
        const eigeneErklaerung = Boolean(m.snapshot?.key?.startsWith("speicherquote")) && Boolean(scopeDetail);
        if (eigeneErklaerung && scopeDetail) {
          const help = document.createElement("details");
          help.className = "ranking-ratio-help";
          help.innerHTML =
            '<summary aria-label="Kennzahl erklärt">?</summary><p>Angemeldete private Batteriespeicher je 100 private Dachanlagen. Die Bestände werden getrennt gezählt: Das ist nicht der Anteil der Dächer mit Speicher. Werte über 100 sind möglich.</p>';
          scopeDetail.append(help);
        }

        const detail = stage.querySelector(".ranking-detail");
        if (detail && !eigeneErklaerung) {
          const help = document.createElement("button");
          help.type = "button";
          help.className = "v3-metric-help";
          help.textContent = "?";
          help.setAttribute("aria-label", m.title + " erklärt");
          help.setAttribute("aria-expanded", "false");
          help.setAttribute("aria-controls", "ranking-metric-explanation");
          const explanation = document.createElement("span");
          explanation.id = "ranking-metric-explanation";
          explanation.className = "v3-metric-explanation";
          explanation.hidden = true;
          explanation.textContent =
            {
              count:
                "Anzahl der im Marktstammdatenregister als in Betrieb gemeldeten Solaranlagen in der gewählten Anlagengruppe.",
              storage:
                "Installierte Speicherkapazität geteilt durch die Einwohnerzahl. 1.000 Wh entsprechen 1 kWh. Der Wert beschreibt die Kapazität, nicht den aktuellen Ladestand.",
              power:
                "Installierte Nennleistung der Solaranlagen geteilt durch die Einwohnerzahl. Wp steht für Watt Peak – nicht für die aktuelle Stromerzeugung.",
            }[m.id] ??
            "Gespeicherte Rangliste für die angezeigte Vergleichsgruppe.";
          const sourceNote = document.createElement("span");
          sourceNote.className = "ranking-help-source";
          sourceNote.textContent = sourceText;
          explanation.append(sourceNote);
          help.onclick = () => {
            explanation.hidden = !explanation.hidden;
            help.setAttribute("aria-expanded", String(!explanation.hidden));
          };
          help.onkeydown = (e) => {
            if (e.key === "Escape") {
              explanation.hidden = true;
              help.setAttribute("aria-expanded", "false");
            }
          };
          detail.append(" ", help, explanation);
        }

        for (const contender of stage.querySelectorAll(".ranking-contender")) {
          const town =
            contender.querySelector("a") ||
            contender.querySelector(":scope>span");
          town.classList.add("ranking-town");
          const badge = town.querySelector(".ranking-badge");
          if (badge) badge.remove();
          const label = document.createElement("div");
          label.className = "ranking-label";
          contender.prepend(label);
          label.append(town, contender.querySelector(".ranking-value"));
        }

        stage.querySelector(".ranking-own")?.remove();
        stage.querySelector(".ranking-gap")?.remove();
        const own = stage.querySelector(".ranking-own"),
          gap = stage.querySelector(".ranking-gap"),
          contestants = [...stage.querySelectorAll(".ranking-contender")];
        if (!motion) {
          if (
            animate &&
            seen.has(m.id) &&
            !matchMedia("(prefers-reduced-motion: reduce)").matches
          )
            stage.animate([{ opacity: 0 }, { opacity: 1 }], {
              duration: 220,
              easing: "ease-out",
            });
          queueMicrotask(revealChoice);
          return;
        }
        const hide = (node) => {
          if (node) {
            node.style.visibility = "hidden";
            node.inert = true;
          }
        };
        const reveal = async (node) => {
          if (!node || id !== animationId) return;
          node.style.visibility = "visible";
          node.inert = false;
          await node
            .animate(
              [
                {
                  opacity: 0,
                  transform: node.classList.contains("ranking-badge")
                    ? "translate(-50%,8px) scale(.9)"
                    : "translateY(8px) scale(.9)",
                },
                {
                  opacity: 1,
                  transform: node.classList.contains("ranking-badge")
                    ? "translate(-50%,0) scale(1)"
                    : "translateY(0) scale(1)",
                },
              ],
              { duration: 320, easing: "cubic-bezier(.2,1.4,.4,1)" },
            )
            .finished.catch(() => {});
        };
        hide(own);
        hide(gap);
        for (const c of contestants) {
          const label = c.querySelector(".ranking-label");
          label.classList.add("ranking-bubble-pending");
          label.style.transform = `translateY(${c.querySelector(".ranking-step").getBoundingClientRect().height}px)`;
          c.classList.toggle(
            "ranking-own-pending",
            c.classList.contains("is-own"),
          );
          hide(c.querySelector(".ranking-town"));
          hide(c.querySelector(".ranking-value"));
          hide(c.querySelector(".ranking-unit"));
          hide(c.querySelector(".ranking-place"));
          hide(c.querySelector(".ranking-badge"));
          c.querySelector(".ranking-step").style.transform = "scaleY(0)";
        }
        const growthOrder = contestants
          .filter((c) => !c.classList.contains("is-own"))
          .sort((a, b) => Number(b.dataset.rank) - Number(a.dataset.rank));
        const homeBar = contestants.find((c) => c.classList.contains("is-own"));
        if (homeBar) growthOrder.push(homeBar);
        for (const c of growthOrder) {
          if (id !== animationId) return;
          const value = c.querySelector(".ranking-value");
          value.style.visibility = "visible";
          value.inert = false;
          value.textContent = "0";
          const bar = c.querySelector(".ranking-step"),
            label = c.querySelector(".ranking-label"),
            height = parseFloat(bar.style.height);
          const start = performance.now();
          await new Promise((resolve) => {
            function tick(now) {
              if (id !== animationId) {
                resolve();
                return;
              }
              const t = Math.min(1, (now - start) / 850),
                e = 1 - Math.pow(1 - t, 3);
              bar.style.transform = `scaleY(${e})`;
              label.style.transform = `translateY(${height * (1 - e)}px)`;
              value.textContent = fmt(Number(value.dataset.value) * e);
              if (t < 1) requestAnimationFrame(tick);
              else resolve();
            }
            requestAnimationFrame(tick);
          });
        }

        if (id !== animationId) return;
        const revealOrder = contestants
          .filter((c) => !c.classList.contains("is-own"))
          .sort((a, b) => Number(b.dataset.rank) - Number(a.dataset.rank));
        const home = contestants.find((c) => c.classList.contains("is-own"));
        if (home) revealOrder.push(home);
        for (const [index, c] of revealOrder.entries()) {
          await new Promise((resolve) =>
            setTimeout(resolve, index === 0 ? 400 : 750),
          );
          if (id !== animationId) return;
          c.querySelector(".ranking-label").classList.remove(
            "ranking-bubble-pending",
          );
          await new Promise((resolve) => setTimeout(resolve, 180));
          if (id !== animationId) return;
          c.classList.remove("ranking-own-pending");
          await Promise.all([
            reveal(c.querySelector(".ranking-place")),
            reveal(c.querySelector(".ranking-town")),
            reveal(c.querySelector(".ranking-badge")),
          ]);
        }
        if (!home && own) {
          await new Promise((resolve) => setTimeout(resolve, 750));
          if (id !== animationId) return;
        }

        if (id !== animationId) return;
        await reveal(own);
        if (id !== animationId) return;
        await reveal(gap);
        if (id === animationId) {
          revealChoice();
          schedule();
        }
      }

      update();
      const availableMetrics = metrics.filter((metric) =>
        metric.snapshot
          ? area === G.startArea && owner === "alle" && classId === G.klasse
          : area === G.kreisAgs || metric.id === "power",
      );
      const shown = availableMetrics;
      const previousScrollTop = choices.scrollTop;
      choices.innerHTML = "";
      for (const metric of shown) {
        const available = true,
          own = available ? ownRow(getRows(metric)) : null,
          b = document.createElement("button");
        b.type = "button";
        b.className = "atlas-rank-row ranking-choice";
        b.dataset.category = metric.id;
        b.disabled = !available;
        b.setAttribute("aria-pressed", String(active === metric.id));
        const known = seen.get(metric.id),
          [label, subline] = splitTitle(metric.title);
        b.innerHTML = `<span class="ranking-choice-position"><strong class="ranking-choice-rank">${known?.rank ?? "—"}</strong><small class="ranking-choice-denominator">${known?.denominator ?? ""}</small></span><span><strong class="ranking-choice-title">${escape(label)}</strong>${subline ? `<span class="ranking-choice-subline">${escape(subline)}</span>` : ""}<span class="ranking-choice-caption">${known?.caption ?? (available ? "Platzierung entdecken" : "Nur im Landkreis verfügbar")}</span></span><span class="ranking-choice-arrow" aria-hidden="true">${arrow}</span>`;
        b.onclick = () => {
          pause();
          discovered = Math.max(
            discovered,
            availableMetrics.indexOf(metric) + 1,
          );
          selectCategory(metric);
          section
            .querySelector(`[data-category="${metric.id}"]`)
            .focus({ preventScroll: true });
        };
        choices.append(b);
        decoratePosition(b, metric, known);
      }
      choices.scrollTop = previousScrollTop;
      updateInvite();
      const next = section.querySelector(".ranking-next");
      let navigation = section.querySelector(".ranking-navigation");
      if (!navigation) {
        navigation = document.createElement("nav");
        navigation.className = "ranking-navigation";
        navigation.setAttribute("aria-label", "Platzierungen durchblättern");
        next.before(navigation);
        const prev = document.createElement("button");
        prev.type = "button";
        prev.className = "ranking-prev";
        prev.innerHTML = arrow;
        prev.setAttribute("aria-label", "Vorherige Platzierung");
        navigation.append(prev, next);
      }
      const activeIndex = availableMetrics.findIndex(
        (metric) => metric.id === active,
      );
      const selectMetric = (index) => {
        const metric = availableMetrics[index];
        if (!metric) return;
        pause();
        discovered = Math.max(discovered, index + 1);
        selectCategory(metric);
      };
      const prev = navigation.querySelector(".ranking-prev");
      prev.disabled = activeIndex <= 0;
      prev.onclick = () => selectMetric(activeIndex - 1);
      next.hidden = false;
      next.disabled = activeIndex >= availableMetrics.length - 1;
      next.innerHTML =
        "<span>" +
        (!seen.has(availableMetrics[activeIndex + 1]?.id)
          ? "Nächste Platzierung entdecken"
          : "Nächste Platzierung") +
        "</span>" +
        arrow;
      next.onclick = () => selectMetric(activeIndex + 1);
      requestAnimationFrame(() => {
        sizePanel();
        keepActiveVisible(animate);
      });

      const areaLabel = m.snapshot
        ? shortScope(m.snapshot.scope)
        : area === G.kreisAgs
          ? "im " + G.kreisLabel
          : area === G.landAgs
            ? "in " + G.landLabel
            : "in Deutschland";
      const classLabel = classes
        .find((c) => c[0] === classId)[1]
        .split(" · ")[0];
      const ownerLabel =
        owner === "alle"
          ? "private und gewerbliche Anlagen einschließlich Freiflächen"
          : owner === "privat"
            ? "private Anlagen"
            : "gewerbliche Anlagen einschließlich Freiflächen";
      const savedClass = m.snapshot?.scope.split(" · ")[1];
      const cluster = savedClass
        ? savedClass.replace(/\s*\([^)]*\)/g, "")
        : classLabel;
      const classHelp = `<span class="ranking-help-wrap"><button type="button" class="ranking-class-help" aria-expanded="false" aria-describedby="ranking-class-tip">${escape(cluster)}</button><span id="ranking-class-tip" role="tooltip" hidden>${m.snapshot ? escape(savedClass ?? "Alle Ortsgrößen") : classes.map((c) => escape(c[1])).join("<br>")}<br>${escape(G.name)} hat ${G.einwohnerLabel}.</span></span>`;
      section.querySelector(".ranking-intro-copy").innerHTML = m.snapshot
        ? `Wir vergleichen ${fmt(total)} Orte ${escape(m.snapshot.scopePhrase ?? "in " + areaLabel)}${savedClass ? " · " + classHelp : ""}.`
        : `Wir vergleichen ${fmt(total)} Orte ${areaLabel} · ${classHelp}. Berücksichtigt werden ${ownerLabel}.`;
      bindTooltip();
      updateReset();
      section.querySelector(".ranking-scope").textContent = "";

      openList.textContent =
        area === G.kreisAgs
          ? `Alle ${total} Orte in dieser Kategorie ansehen`
          : `Rangliste ansehen · ${total > 100 ? "Top 100 und eigene Position" : total + " Orte"}`;
      section.querySelector(".ranking-table").innerHTML =
        m.snapshot && !m.snapshot.rows
          ? `<p>${escape(m.snapshot.rowsUnavailableReason ?? "Diese Rangliste wird hier gerade geladen.")}</p><a class="ranking-snapshot-link" href="https://solar-check.io${escape(m.snapshot.href)}" target="_blank" rel="noopener">Vollständige Rangliste öffnen ↗</a>`
          : `<table><thead><tr><th>Platz</th><th>Ort</th><th>${m.unit || "Wert"}</th><th title="Rangänderung">Änderung${m.snapshot?.changePeriod ? "<br><small>" + escape(m.snapshot.changePeriod) + "</small>" : ""}</th></tr></thead><tbody>${rows.map((r) => `<tr class="${r.id === G.ags ? "is-own" : ""}"><td>${fmt(r.rank)}</td><th scope="row">${r.href && r.id !== G.ags ? `<a href="${escape(r.href)}">${escape(r.name)}</a>` : escape(r.name)}</th><td>${fmt(r.value)}</td><td>${r.change == null || r.change === 0 ? '<span class="ranking-flat" title="' + (r.change === 0 ? "Platz gehalten" : "Kein vergleichbarer früherer Stand") + '">–</span>' : r.change > 0 ? '<span class="ranking-delta ranking-up" aria-label="' + fmt(r.change) + ' Plätze gestiegen">' + PFEIL_HOCH + fmt(r.change) + "</span>" : '<span class="ranking-delta ranking-down" aria-label="' + fmt(-r.change) + ' Plätze gefallen">' + PFEIL_RUNTER + fmt(-r.change) + "</span>"}</td></tr>`).join("")}</tbody></table>`;
      if (m.snapshot)
        openList.textContent =
          "Alle " + fmt(total) + " Orte in dieser Rangliste ansehen";
      openList.classList.toggle(
        "ranking-list-invite",
        Boolean(
          seen.has(m.id) && me && me.rank > 3 && !listInvitations.has(active),
        ),
      );
      section.querySelector("#ranking-dialog-title").textContent = m.title;
      section.querySelector(".ranking-dialog-context").textContent =
        (m.snapshot ? shortScope(m.snapshot.scope) : areaLabel) +
        " · " +
        fmt(total) +
        " Orte";
      section.querySelector(".ranking-change").hidden = true;
      section.querySelector(".ranking-source").hidden = true;
      if (!animate) schedule();
      else clearTimeout(timer);
    }
    async function load() {
      clearTimeout(inviteTimer);
      inviteReady = false;
      updateInvite();
      delete section.dataset.share;
      seen.clear();
      discovered = 1;
      // Beim Wechsel der Vergleichsgrößen fällt die Auswahl auf eine
      // Live-Kategorie zurück — eine gespeicherte Platzierung gilt nur für
      // ihre eigene Gruppe. Der ERSTE Aufbau ist davon ausgenommen: Dort
      // steht die beste Platzierung des Orts, und die soll stehen bleiben.
      if (active.startsWith("saved-") && !ersterAufbau) active = "count";
      const id = ++requestId;
      pause();
      busy = true;
      animationId++;
      stage.getAnimations({ subtree: true }).forEach((a) => a.cancel());
      remote = null;
      full.close();
      section.querySelector(".ranking-table").innerHTML = "";
      choices.innerHTML = "";
      stage.innerHTML = "<p>Vergleich wird geladen …</p>";
      openList.hidden = true;
      status.textContent = "";
      section.querySelector(".ranking-intro-copy").textContent =
        "Der gewählte Vergleich wird geladen …";
      updateReset();
      section.querySelector(".ranking-scope").textContent = "";
      section.querySelector(".ranking-availability").textContent =
        area === G.kreisAgs
          ? ""
          : "Für " + G.landLabel + " und Deutschland liefert die bestehende Rangliste derzeit Solarleistung je Einwohner." + (G.kreisAgs ? " Weitere Kategorien sind im " + G.kreisLabel + " verfügbar." : "");
      // Ohne Kreisvergleich liefert die Live-Rangliste nur Solarleistung je
      // Einwohner. Das ist für die Auswahl aber die LETZTE Wahl: Berlin steht
      // dort auf Platz 80 von 80 und eröffnete damit seinen Abschnitt, während
      // es bei der Solarleistung insgesamt Erster ist. Gibt es eine
      // ausgezeichnete Platzierung, gilt sie auch hier.
      if (area !== G.kreisAgs && !active.startsWith("saved-")) active = "power";
      playLabel();
      try {
        if (area !== G.kreisAgs) {
          const q = new URLSearchParams({
            gebiet: area,
            owner,
            klasse: classId,
          });
          q.set("region", G.ags);
          q.set("voll", "1");
          const r = await fetch("/api/atlas/nachbarn?" + q);
          if (!r.ok) throw Error("unavailable");
          const j = await r.json();
          if (id !== requestId) return;
          remote = j;
        }
        if (id !== requestId) return;
        busy = false;
        openList.hidden = false;
        render(false);
      } catch (e) {
        if (id !== requestId) return;
        busy = false;
        stage.innerHTML =
          "<h3>Vergleich gerade nicht verfügbar</h3><p>Bitte erneut versuchen oder ${escape(G.startLabel)} wählen.</p>";
        status.textContent = "Die Live-Rangliste konnte nicht geladen werden.";
        const retry = document.createElement("button");
        retry.type = "button";
        retry.textContent = "Erneut versuchen";
        retry.onclick = load;
        stage.append(retry);
        schedule();
      }
    }
    section.querySelectorAll("[data-filter]").forEach(
      (el) =>
        (el.onchange = () => {
          const key = el.dataset.filter;
          if (key === "area") area = el.value;
          if (key === "owner") owner = el.value;
          if (key === "class") classId = el.value;
          load();
        }),
    );
    section.addEventListener("focusin", (e) => {
      if (e.target !== play) pause();
    });
    section.addEventListener("pointerenter", () => clearTimeout(timer));
    section.addEventListener("pointerleave", schedule);
    document.addEventListener("visibilitychange", schedule);
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        schedule();
      },
      { threshold: 0.25 },
    );
    observer.observe(section);
    window.addEventListener(
      "pagehide",
      () => {
        clearTimeout(timer);
        observer.disconnect();
        requestId++;
      },
      { once: true },
    );
    // Towns without a district comparison (kreisfreie Städte, Stadtstaaten,
    // small size classes) start with the state list, which is fetched.
    if (area === G.kreisAgs) render(true);
    else load().finally(() => { ersterAufbau = false; });
  }
  mount();
})().catch((e) => console.error("Ranking could not start", e));
