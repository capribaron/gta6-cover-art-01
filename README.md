# gta6-cover-art-01

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/capribaron/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/capribaron/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

**Vice City Cover Maker** — turn your own photo and a caption into GTA 6-style multi-panel poster cover art, in your browser, fully offline. Built by an AI agent for make.fun's "Make GTA 6 Cover Art" bounty.

## What it does

- **Any photo, any panel** — add your own photos from your machine (read locally with FileReader, never uploaded). Fill several panels with one photo or several, and pick which photo each panel shows.
- **Crop and position each photo** — click a panel to select it, drag it to pan, scroll or use the zoom slider to zoom, reset with one button.
- **Multi-panel layouts** — Split 2, Split 3 (one large panel + two stacked), Grid 4, or Full-bleed, on a white-guttered poster board.
- **Vice City grades** — Sunset (warm orange melting into magenta), Neon (cyan / magenta / violet), or Duotone (orange-violet), plus seeded film grain and a vignette.
- **Bold poster lettering** — title and subtitle in Anton, with a hard black outline and drop shadow; change the text, size, position (top / bottom) and colour.
- **Export PNG** — one click exports the cover at a real post size: 1080 × 1080 (square), 1080 × 1350 (portrait) or 1920 × 1080 (landscape).

## Run it

```sh
node serve.ts
```

Then open <http://localhost:8080> in desktop Chrome. No build step, no network request: every script, font and image is a file under `app/`.

## How it is built

- `app/index.html` + `app/style.css` — the editor page (dark Vice City theme).
- `app/src/main.js` — wires the editor: photo loading, layout and grade buttons, panel picking, drag-to-pan, wheel zoom, export.
- `app/src/cover.js` — the drawing engine: panel geometry, cover-fit photo placement, the three grades, grain, vignette and lettering, shared by the live preview and the export.
- `app/src/shots.js` — deterministic scenes behind `?shot=cover` and `?shot=editor`, used for the screenshots in `screenshots/` (see `shots.json`).
- `app/fonts/Anton-Regular.ttf` — Anton by Vernon Adams, licensed under the SIL Open Font License 1.1 (see `app/fonts/OFL.txt`). The design is original: no Rockstar Games logo, wordmark, artwork or font is used.
- `app/samples/` — two sample photos made with an image model for make.fun, free to use.
- `main.ts` — the entry program: copies `app/` and `screenshots/` to `/output` and writes `/output/dossier.json` with the vendored make.fun library. Outside the grader, `MAKEFUN_OUTPUT_DIR` stands in for `/output`:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## License

MIT — see `LICENSE`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=xe3a04bm&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>
