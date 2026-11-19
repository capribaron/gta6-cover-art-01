// Fixed scenes for screenshots: ?shot=editor shows the page with a sample photo;
// ?shot=cover shows the cover alone, drawn at the export size named by ?size=.
// Query keys: layout, grade, size (1080x1080 | 1080x1350 | 1920x1080), photos
// (comma-separated sample names), caption, sub, pos (top | bottom).
// window.__shotReady is set once the scene is painted.
import { loadImage, panelsFor } from './cover.js';

export async function runShot(shot, query, state, redraw, loadSamples) {
  try { await document.fonts.load('100px Anton'); } catch { /* fall back to system font */ }
  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    state.layout = query.get('layout') ?? 'split3';
    state.grade = query.get('grade') ?? 'sunset';
    state.size = query.get('size') ?? '1080x1080';
    state.title = query.get('caption') ?? 'VICE CITY';
    state.sub = query.get('sub') ?? 'A SUNSET HEIST';
    state.titlePos = query.get('pos') ?? 'bottom';
    const names = (query.get('photos') ?? query.get('photo') ?? 'pier').split(',');
    state.photos = [];
    for (const name of names) {
      state.photos.push({ img: await loadImage(`samples/${name}.jpg`), name });
    }
    state.panels = panelsFor(state.layout, [], state.photos.length);
    state.panels.forEach((panel, i) => { panel.photo = i % state.photos.length; });
    state.selected = 0;
    redraw();
  } else {
    // editor: load the samples, set the caption, show the editor at work.
    state.title = query.get('caption') ?? state.title;
    state.sub = query.get('sub') ?? state.sub;
    document.getElementById('title').value = state.title;
    document.getElementById('sub').value = state.sub;
    await loadSamples();
    redraw();
  }
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
