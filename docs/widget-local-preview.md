# Local widget preview operation

## Incident findings — 12 October 2026

- The local `dev-reaper` log explicitly records termination of this checkout's
  port-4319 server and launcher at 20:30:46 on 10 October after two hours idle.
  An open page is not a reliable guarantee of an established HMR connection.
- macOS shutdown/reboot records show a restart at 06:12 on 12 October. The former
  detached shell process could not survive it and had no recovery owner.
- The historical server log also contains Next development heap-threshold
  restarts. Next's installed `start-server.js` gates these behind `isDev`.
  The existing 8 GiB heap setting and development webpack memory optimization
  remain in place. This is not proof that every previous stall was a heap issue;
  the 11 October unresponsive process has no definitive retrospective cause.
- A launchd-owned Node process initially waited for macOS Documents-folder
  consent. The user granted that request and the process then started normally.

Additional findings and corrections on 12 October:

- The Documents checkout contained FileProvider attributes and duplicated,
  synchronized webpack cache files. It was moved with `git worktree move` to
  the local worktree directory above; source, Git branch and environment were
  preserved. Before the move a cold Storyview request produced no bytes in
  90 seconds. Afterwards Next started in 2.7 seconds and the first complete
  Storyview response took 11.8 seconds. This is observed improvement, not an
  isolated benchmark of the filesystem alone.
- TypeScript's broad source discovery included 5,893 files from a quarantined
  dependency installation, out of 8,302 files total. `node_modules.*` is now
  excluded, and quarantined caches are ignored by Git.
- Test workers are capped at two to reduce contention with local previews.
- Three short probe timeouts previously caused a restart after approximately
  75 seconds, even while the development compiler was busy. Recovery now also
  requires the continuous failure window described below. Probe durations and
  HTTP status/error classes are recorded for the next incident.
- Warm full-page requests returned HTTP 200 for the layout reference (2.75 s)
  and Storyview (1.66 s), with the same managed child process. HTTP checks do not
  establish visual acceptance in a browser.

These causes concern a local development process. The idle reaper and macOS
login lifetime do not execute in the published application. Production and
development build directories are already separate (`.next` / `.next-dev`).
The live-data preview cache is likewise explicitly development-only.

## Ownership and lifetime

`scripts/local-preview/install.py` installs a single explicitly started service
for this checkout under `~/Library/Application Support/SolarCheckPreviews/managed`.
It copies its small supervisor there so operational code does not depend on a
temporary source location. The application uses the existing worktree, now located at
`/Users/eule/.codex/worktrees/widget-system-recovery/pv-rechner`.
The previous Documents path is only a compatibility symlink. Keep dependency
installs and build caches outside cloud-synchronized folders.

The plist is **outside** `~/Library/LaunchAgents`. There is no login autostart.
An explicit start registers the service for the current login session. It stays
available until stopped, logged out or rebooted. After that, use the starter again.
`RunAtLoad` in that explicitly bootstrapped plist starts it on registration only;
`KeepAlive` recovers its supervisor during that login session.

The supervisor:

- accepts only a loopback health probe (`/icon.svg`), with no live-data dependency;
- waits through a 120-second cold start; after readiness, recovery requires
  at least three failed checks AND 180 seconds of continuous unresponsiveness
  (checks every 20 seconds, 5-second request timeout);
- allows up to 180 seconds for a reported compilation; delayed successful health
  responses in the server log also reset failures, so a busy server is not killed;
- owns and terminates only the child process group it created;
- refuses to take over any already occupied port;
- recovers an orphan from its own previous supervisor only after checking the
  saved PID/start time, actual working directory and separate process group;
- records start, ready, exit/signal, failed probes and recovery with timestamps;
- rotates its server log at 5 MB, keeping two previous files;
- uses a lock against duplicate supervisors and bounded restart backoff.

The idle reaper reads an exact-checkout allowlist at
`~/.config/dev-reaper/persistent-cwds`. Only this checkout was added; unrelated
test cleanup and development servers retain their previous rules. The previous
reaper script is backed up beside the installed service. Uninstall removes this
checkout from the allowlist; the general allowlist support can safely remain.

## Operator actions

The handoff folder contains `Widget-Vorschau-starten.command` and
`Widget-Vorschau-stoppen.command`. Starting an already running service is safe.
The URL remains `http://127.0.0.1:4319/widget-galerie/layout-referenz`.

The installed `control.py` accepts `start`, `stop`, `status` and `uninstall`.
After finishing the widget migration, use `uninstall` before removing the own
worktree. It stops the process group, removes its service registration/plist and
idle exception, and retains source code and logs. A sleeping or powered-off Mac
cannot serve this local URL; it is not a public hosting service.

## Verification

- Twelve behavioral tests cover a real child exit, an unresponsive HTTP process,
  foreign listener protection, releasing the owned port, and an idempotent
  narrowly scoped reaper patch, plus owned orphan recovery and refusal of a
  mismatched process identity, temporary probe timeouts without restarts, and
  the bounded recovery window. Run:
  `python3 -m unittest discover -s scripts/local-preview -p 'test_*.py' -v`.
- The actual managed Next worker was deliberately paused with SIGSTOP. The
  supervisor reported three failed probes, replaced the owned process group,
  and the reference page returned HTTP 200 with a 2,956,200-byte response.
- An additional SIGKILL of the supervisor initially exposed an orphaned Next
  launcher. After adding ownership recovery, the repeated real test recovered
  automatically and returned HTTP 200 with a 2,955,573-byte reference response.
- The generated plist no longer exists in `~/Library/LaunchAgents`.
- The installed reaper branch was checked with the actual allowlist: this
  checkout is skipped while an unrelated checkout still reaches the idle check.
- Public page/embed probes were intercepted by Vercel's security challenge
  (HTTP 429, `x-vercel-mitigated: challenge`). They are not production acceptance
  evidence. The old browser tab had remained on a local error document.
- After relocation and the successful production build, a fresh normal HTTP
  tab in the same in-app browser rendered Storyview with data, navigated to
  the layout reference and survived an actual reload. Screenshots were saved
  in the handoff proof folder as `server-storyview-recovered.png` and
  `server-layout-widgets-recovered.png`. The managed child stayed unchanged
  while the full commit test suite was running. This checks local availability,
  not every widget variant or production deployment.

## Current grid allocation, checked against the implementation

The reference page uses `WidgetDashboard` → `ResponsiveWidgetComposition` →
`resolveComposition`; it does not currently use GridStack's fixed row slots.

1. `lib/widget-registry.ts` declares each supported presentation's minimum width,
   minimum allocated height, optional narrow-width height rules and whether its
   height follows content or a supplied rectangle.
2. The host describes row/column groups or an automatic grid. Extra width is
   shared according to `grow` (default: equal shares **after** minimum widths).
   Children stack when their combined minima plus 24 px gaps no longer fit.
3. Allocated siblings in a row share the largest required height. A column sums
   child heights and gaps. Intrinsic content remains natural-height and avoids
   stretching its neighbors into an assumed universal aspect ratio.
4. Example: two compact trade widgets need `336 + 24 + 336 = 696` px. An allocated
   chart beside that stack receives the same 696 px. Their whole group only sits
   next to the ranking when their combined width requirements fit.
5. The renderer reserves heading/controls space and gives the remainder to the
   plot. Round plots keep their own geometry; the outer card need not be square.

The separate grid demo/size picker still uses explicit named slot sizes with
12 columns, 48 px rows and 24 px gaps. `gridSizes` governs eligible options there.
`preferredWidth` and `maxWidth` are not inputs of the reference allocator;
allocated cards explicitly fill their slot. Nor does the current reference
automatically switch full/compact variants: the selected variant is explicit.
These distinctions remain relevant to a future consolidated layout editor.

The composition arithmetic tests cover 320–1600 px widths. The unsupported
trade-totals hero URL has been removed from the advertised contract. The
incomplete-catalog test now supplies prepared data and verifies a visible
missing-widget fallback instead of a blank card.
