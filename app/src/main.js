// Vice City Cover Maker — wires the editor page.
// Pick photos (your own files, read locally, never uploaded), choose a multi-panel
// layout, crop and position each photo by dragging it, edit the caption, pick a
// Vice City grade, and export the cover as a PNG in a post size.
// A `?shot=` query sets up a fixed scene for a screenshot instead (./shots.js).
import { drawCover, defaultState, loadImage, panelCount, panelRects, panelsFor } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');
const state = defaultState();

const SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
};

/** The preview canvas always renders at the chosen export size, CSS scales it. */
function redraw() {
  const [w, h] = SIZES[state.size];
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  drawCover(ctx, w, h, state);
  syncPanelControls();
}

/** Refreshes the panel buttons, photo picker and zoom slider for the selection. */
function syncPanelControls() {
  const panel = state.panels[state.selected];
  document.querySelectorAll('#panels button').forEach((b, i) => {
    b.classList.toggle('active', i === state.selected);
    b.disabled = i >= panelCount(state.layout);
  });
  const picker = document.getElementById('panelPhoto');
  picker.innerHTML = state.photos.map((p, i) => `<option value="${i}">${p.name}</option>`).join('')
    || '<option value="-1">No photo yet</option>';
  picker.value = panel ? String(panel.photo) : '-1';
  picker.disabled = !panel || state.photos.length === 0;
  const zoom = document.getElementById('zoom');
  zoom.value = panel ? Math.round(panel.scale * 100) : 100;
  document.getElementById('zoomLabel').textContent = `${zoom.value}%`;
}

/** Adds loaded photos and gives empty panels something to show. */
function addPhotos(newPhotos) {
  const before = state.photos.length;
  state.photos.push(...newPhotos);
  state.panels = state.panels.map((p, i) => (
    p.photo < 0 && state.photos.length > 0 ? { ...p, photo: (before + i) % state.photos.length } : p
  ));
  if (state.panels.length === 0) state.panels = panelsFor(state.layout, [], state.photos.length);
  redraw();
}

/** Loads the two bundled sample photos (AI-made, free to use) for a quick try. */
async function loadSamples() {
  const names = ['pier', 'boulevard'];
  const loaded = [];
  for (const name of names) {
    try { loaded.push({ img: await loadImage(`samples/${name}.jpg`), name }); } catch { /* skip */ }
  }
  if (loaded.length) {
    status.textContent = `Loaded sample photos: ${loaded.map((p) => p.name).join(', ')}.`;
    addPhotos(loaded);
  }
}

// --- Photo input -------------------------------------------------------------
document.getElementById('photo').addEventListener('change', async (e) => {
  const files = [...e.target.files];
  if (!files.length) return;
  const loaded = [];
  for (const file of files) {
    try { loaded.push({ img: await loadImage(URL.createObjectURL(file)), name: file.name }); } catch {
      status.textContent = `Could not read ${file.name}.`;
    }
  }
  if (loaded.length) {
    status.textContent = `Loaded ${loaded.length} photo${loaded.length > 1 ? 's' : ''} — drag a panel to position it.`;
    addPhotos(loaded);
  }
  e.target.value = '';
});
document.getElementById('samples').addEventListener('click', loadSamples);

// --- Layout and grade --------------------------------------------------------
document.querySelectorAll('#layouts button').forEach((b) => {
  b.addEventListener('click', () => {
    state.layout = b.dataset.layout;
    state.panels = panelsFor(state.layout, state.panels, state.photos.length);
    state.selected = 0;
    document.querySelectorAll('#layouts button').forEach((x) => x.classList.toggle('active', x === b));
    redraw();
  });
});
document.querySelectorAll('#grades button').forEach((b) => {
  b.addEventListener('click', () => {
    state.grade = b.dataset.grade;
    document.querySelectorAll('#grades button').forEach((x) => x.classList.toggle('active', x === b));
    redraw();
  });
});
document.getElementById('size').addEventListener('change', (e) => {
  state.size = e.target.value;
  redraw();
});

// --- Caption -----------------------------------------------------------------
document.getElementById('title').addEventListener('input', (e) => { state.title = e.target.value; redraw(); });
document.getElementById('sub').addEventListener('input', (e) => { state.sub = e.target.value; redraw(); });
document.getElementById('titleSize').addEventListener('input', (e) => {
  state.titleSize = Number(e.target.value);
  document.getElementById('titleSizeLabel').textContent = `${state.titleSize}%`;
  redraw();
});
document.getElementById('titlePos').addEventListener('change', (e) => { state.titlePos = e.target.value; redraw(); });
document.getElementById('titleColor').addEventListener('change', (e) => { state.titleColor = e.target.value; redraw(); });

// --- Panel crop: pick a panel, drag to pan, wheel or slider to zoom ----------
document.querySelectorAll('#panels button').forEach((b, i) => {
  b.addEventListener('click', () => { state.selected = i; redraw(); });
});
document.getElementById('panelPhoto').addEventListener('change', (e) => {
  const panel = state.panels[state.selected];
  if (panel) { panel.photo = Number(e.target.value); redraw(); }
});
document.getElementById('zoom').addEventListener('input', (e) => {
  const panel = state.panels[state.selected];
  if (panel) { panel.scale = Number(e.target.value) / 100; redraw(); }
});
document.getElementById('fit').addEventListener('click', () => {
  const panel = state.panels[state.selected];
  if (panel) { panel.scale = 1; panel.ox = 0; panel.oy = 0; redraw(); }
});
document.getElementById('grain').addEventListener('change', (e) => { state.grain = e.target.checked; redraw(); });
document.getElementById('vignette').addEventListener('change', (e) => { state.vignette = e.target.checked; redraw(); });

let drag = null;
function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) / r.width) * canvas.width,
    y: ((e.clientY - r.top) / r.height) * canvas.height,
  };
}
canvas.addEventListener('pointerdown', (e) => {
  const p = canvasPoint(e);
  const [w, h] = SIZES[state.size];
  const hit = panelRects(state.layout, w, h).findIndex((r) => p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h);
  if (hit < 0) return;
  state.selected = hit;
  drag = { x: p.x, y: p.y, rect: panelRects(state.layout, w, h)[hit] };
  canvas.setPointerCapture(e.pointerId);
  redraw();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const p = canvasPoint(e);
  const panel = state.panels[state.selected];
  if (!panel) return;
  panel.ox = Math.max(-0.6, Math.min(0.6, panel.ox + (p.x - drag.x) / drag.rect.w));
  panel.oy = Math.max(-0.6, Math.min(0.6, panel.oy + (p.y - drag.y) / drag.rect.h));
  drag.x = p.x;
  drag.y = p.y;
  redraw();
});
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const panel = state.panels[state.selected];
  if (!panel) return;
  panel.scale = Math.max(1, Math.min(4, panel.scale * (e.deltaY < 0 ? 1.1 : 0.9)));
  redraw();
}, { passive: false });

// --- Export ------------------------------------------------------------------
document.getElementById('export').addEventListener('click', async () => {
  const [w, h] = SIZES[state.size];
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  drawCover(off.getContext('2d'), w, h, state);
  off.toBlob((blob) => {
    if (!blob) { status.textContent = 'Export failed — try again.'; return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-city-cover-${w}x${h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    status.textContent = `Saved vice-city-cover-${w}x${h}.png`;
  }, 'image/png');
});

// --- Boot --------------------------------------------------------------------
state.panels = panelsFor(state.layout, [], 0);
redraw();
document.querySelector('#layouts button[data-layout="split3"]').classList.add('active');
document.querySelector('#grades button[data-grade="sunset"]').classList.add('active');

const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (shot) {
  runShot(shot, query, state, redraw, loadSamples);
} else {
  loadSamples();
}
