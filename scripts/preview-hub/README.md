# Local preview catalog

The authenticated admin page at `/admin/vorschauen` reads
`lib/design-previews.json`. The local launcher on `http://localhost:4299`
starts only the explicitly registered services when a preview is opened.
It never replaces another process occupying a port.

Install or update on the Mac containing the preview sources:

```sh
python3 scripts/preview-hub/install.py
```

The installer copies the launcher and catalog into
`~/Library/Application Support/SolarCheckPreviews` and registers the login
agent `io.solar-check.preview-hub`. The launcher restarts automatically;
individual preview servers start on demand. Logs live in
`~/Library/Logs/SolarCheckPreviews`.

For new previews, add a catalog entry and, if needed, a fixed service in
`server.py`, then rerun the installer. This is an explicit registry, not
automatic discovery of future sessions. The catalog preserves references,
not snapshots of every source: registered source folders/worktrees must
remain available. Archive a source and update its service path before
removing its worktree. The product animation needs its iCloud files
downloaded before installation can copy them.

The admin page can be published independently, but local preview links
only work on the Mac with this launcher and the source files installed.

Tests:

```sh
PYTHONDONTWRITEBYTECODE=1 python3 scripts/preview-hub/test_server.py
```

To uninstall the login agent (preview source files remain):

```sh
launchctl bootout gui/$(id -u)/io.solar-check.preview-hub
rm ~/Library/LaunchAgents/io.solar-check.preview-hub.plist
```

Thumbnail images are stored in `public/preview-thumbnails` as 800×450 WebP
files. They are saved browser views, not live embeds, and remain visible
without starting preview servers. Refresh them after significant design
changes and reinstall the launcher to update its copy. A null `thumbnail`
shows the explanatory `thumbnailNote` instead of a broken image.
