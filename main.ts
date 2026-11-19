// Vice City Cover Maker — the entry program for make.fun's gta6-cover-art-01 bounty.
//
// makefun anchor f4984673832981d8de2de7d0d325c9d4b24a0029 round 34093771
//
// This program (Node 22, standard library only) hands the app in: it copies this
// repository's app/ folder — plain static files a desktop browser loads offline,
// app/index.html plus its ES modules, the Anton font and the sample photos, with no
// network request — and screenshots/ into the output directory, then writes
// /output/dossier.json with buildDossier from the vendored make.fun library
// (vendor/makefun-app.ts, unchanged). The app itself is the multi-panel GTA-style
// cover maker in app/src/: photos cropped and positioned per panel, Vice City
// sunset / neon / duotone grades, bold Anton lettering, PNG export at 1080x1080,
// 1080x1350 and 1920x1080.
//
// Run it locally with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output; in the grader's
// container the program writes to /output. Serve the app with `node serve.ts`,
// then open http://localhost:8080.

import { cpSync, existsSync, mkdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Fail loudly instead of handing in half an entry.
const indexHtml = join(here, 'app', 'index.html');
if (!existsSync(indexHtml) || !statSync(indexHtml).isFile()) {
  throw new Error(`app/index.html is missing beside ${import.meta.url}`);
}

mkdirSync(out, { recursive: true });
// Clear any previous copy first: the program runs twice and both runs must write
// the same bytes, so a file deleted from app/ or screenshots/ since the last run
// must not survive in /output as a stale copy.
rmSync(join(out, 'app'), { recursive: true, force: true });
rmSync(join(out, 'screenshots'), { recursive: true, force: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The scorer's own caps: only text_max_bytes shapes the dossier's bytes; the
// others refuse an entry the scorer would refuse (more than 4 screenshots or one
// over 256 KiB; more than 993 files in app/ or 48 MiB of app files in all, or a
// path under app/ over 1000 bytes — app/ counts beside /output's own 1000-entry
// cap, its screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
