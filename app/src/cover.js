// Vice City Cover Maker — the drawing engine.
// Draws a multi-panel poster cover: photos in white-guttered panels, a Vice City
// sunset / neon / duotone grade, film grain, a vignette, and bold Anton lettering.
// Everything here is original: no Rockstar logo, artwork or font is used anywhere.
// Anton (app/fonts/Anton-Regular.ttf) is licensed under the SIL Open Font License 1.1.

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

/** Layout names in the order the editor offers them. */
export const LAYOUTS = ['split2', 'split3', 'grid4', 'full'];

/** How many panels a layout has. */
export function panelCount(layout) {
  return { split2: 2, split3: 3, grid4: 4, full: 1 }[layout] ?? 1;
}

/**
 * Panel rectangles for a layout, in canvas pixels. Panels sit on a white
 * poster board with gutters between them, like a comic-book cover.
 */
export function panelRects(layout, w, h) {
  const g = Math.max(4, Math.round(w * 0.012)); // gutter
  const half = (w - g) / 2;
  const third = (h - g) / 2;
  switch (layout) {
    case 'split2':
      return [
        { x: 0, y: 0, w: half, h },
        { x: half + g, y: 0, w: half, h },
      ];
    case 'split3': {
      const left = Math.round(w * 0.55);
      return [
        { x: 0, y: 0, w: left, h },
        { x: left + g, y: 0, w: w - left - g, h: third },
        { x: left + g, y: third + g, w: w - left - g, h: third },
      ];
    }
    case 'grid4':
      return [
        { x: 0, y: 0, w: half, h: third },
        { x: half + g, y: 0, w: half, h: third },
        { x: 0, y: third + g, w: half, h: third },
        { x: half + g, y: third + g, w: half, h: third },
      ];
    case 'full':
    default:
      return [{ x: 0, y: 0, w, h }];
  }
}

/** A fresh cover state: layout, grade, caption and one panel setting per panel. */
export function defaultState() {
  return {
    layout: 'split3',
    grade: 'sunset',
    size: '1080x1080',
    title: 'VICE CITY',
    sub: 'A SUNSET HEIST',
    titleSize: 100, // percent of the default lettering size
    titlePos: 'bottom',
    titleColor: '#ffffff',
    grain: true,
    vignette: true,
    photos: [], // { img, name } — loaded on the user's own machine, never uploaded
    panels: [], // { photo, scale, ox, oy } per panel; photo is an index into photos
    selected: 0,
  };
}

/** Panel settings for a layout, keeping any settings the panels already had. */
export function panelsFor(layout, oldPanels, photoCount) {
  const n = panelCount(layout);
  const out = [];
  for (let i = 0; i < n; i++) {
    const old = oldPanels[i] ?? oldPanels[0];
    out.push(old ? { ...old } : { photo: photoCount > 0 ? 0 : -1, scale: 1, ox: 0, oy: 0 });
  }
  return out;
}

// Seeded random, so the film grain is identical on every render of a cover.
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Draws one photo into a panel rect, cover-fit, with the panel's zoom and pan. */
function drawPhotoInPanel(ctx, rect, img, panel) {
  const base = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight);
  const scale = base * (panel.scale || 1);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const dx = rect.x + (rect.w - dw) / 2 + (panel.ox || 0) * rect.w;
  const dy = rect.y + (rect.h - dh) / 2 + (panel.oy || 0) * rect.h;
  ctx.drawImage(img, dx, dy, dw, dh);
}

/** Placeholder gradient for a panel with no photo yet, with its panel number. */
function drawEmptyPanel(ctx, rect, index, w) {
  const grad = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
  grad.addColorStop(0, '#3b1d52');
  grad.addColorStop(1, '#12081f');
  ctx.fillStyle = grad;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = `${Math.round(w * 0.05)}px Anton, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`PANEL ${index + 1}`, rect.x + rect.w / 2, rect.y + rect.h / 2);
  ctx.textBaseline = 'alphabetic';
}

/** The colour grade washed over the whole poster after the photos are drawn. */
function applyGrade(ctx, w, h, grade) {
  ctx.save();
  if (grade === 'neon') {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, 'rgba(0, 229, 255, 0.30)');
    g.addColorStop(0.55, 'rgba(255, 0, 128, 0.22)');
    g.addColorStop(1, 'rgba(123, 47, 247, 0.30)');
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  } else if (grade === 'duotone') {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#ff7a18');
    g.addColorStop(1, '#7b2ff7');
    ctx.globalCompositeOperation = 'color';
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'soft-light';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
  } else {
    // sunset: warm orange sky melting into magenta at the foot of the poster.
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(255, 122, 24, 0.16)');
    g.addColorStop(0.6, 'rgba(255, 60, 90, 0.14)');
    g.addColorStop(1, 'rgba(200, 20, 130, 0.34)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    const sun = ctx.createRadialGradient(w * 0.5, h * 0.42, 0, w * 0.5, h * 0.42, w * 0.55);
    sun.addColorStop(0, 'rgba(255, 190, 90, 0.20)');
    sun.addColorStop(1, 'rgba(255, 190, 90, 0)');
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.restore();
}

/** Speckled film grain, seeded so the same cover always renders the same. */
function applyGrain(ctx, w, h) {
  const rnd = mulberry32(1337 + w * 31 + h * 7);
  const count = Math.round((w * h) / 260);
  ctx.save();
  for (let i = 0; i < count; i++) {
    const v = rnd() > 0.5 ? 255 : 0;
    ctx.fillStyle = `rgba(${v},${v},${v},${0.05 + rnd() * 0.05})`;
    ctx.fillRect(rnd() * w, rnd() * h, 1.4, 1.4);
  }
  ctx.restore();
}

/** Darkened corners that pull the eye to the middle of the poster. */
function applyVignette(ctx, w, h) {
  const g = ctx.createRadialGradient(
    w / 2, h / 2, Math.min(w, h) * 0.42,
    w / 2, h / 2, Math.max(w, h) * 0.75,
  );
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(10,2,16,0.48)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/** Bold poster lettering: title with a hard black outline, subtitle letterspaced. */
function drawLettering(ctx, w, h, state) {
  const title = state.title.trim().toUpperCase();
  const sub = state.sub.trim().toUpperCase();
  if (!title && !sub) return;
  const bottom = state.titlePos === 'bottom';
  ctx.save();
  ctx.textAlign = 'center';
  if (title) {
    let size = h * 0.13 * (state.titleSize / 100);
    ctx.font = `${size}px Anton, sans-serif`;
    while (ctx.measureText(title).width > w * 0.92 && size > 10) {
      size -= 2;
      ctx.font = `${size}px Anton, sans-serif`;
    }
    const baseline = bottom ? h - h * 0.045 : size * 1.05;
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(3, size * 0.14);
    ctx.strokeStyle = '#0d0212';
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = size * 0.18;
    ctx.shadowOffsetY = size * 0.04;
    ctx.strokeText(title, w / 2, baseline);
    ctx.fillStyle = state.titleColor;
    ctx.fillText(title, w / 2, baseline);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    if (sub) {
      const subSize = Math.max(11, size * 0.24);
      ctx.font = `bold ${subSize}px system-ui, sans-serif`;
      try { ctx.letterSpacing = `${Math.max(2, subSize * 0.22)}px`; } catch { /* older canvas */ }
      ctx.lineWidth = Math.max(2, subSize * 0.16);
      const subY = bottom ? baseline - size * 1.02 : baseline + subSize * 1.6;
      ctx.strokeText(sub, w / 2, subY);
      ctx.fillStyle = '#ffd319';
      ctx.fillText(sub, w / 2, subY);
      try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }
    }
  } else if (sub) {
    const subSize = Math.max(12, h * 0.035);
    ctx.font = `bold ${subSize}px system-ui, sans-serif`;
    ctx.fillStyle = '#ffd319';
    const y = bottom ? h - h * 0.06 : h * 0.08;
    ctx.fillText(sub, w / 2, y);
  }
  ctx.restore();
}

/**
 * Draws the whole cover onto `ctx` at its own canvas size.
 * `state` is a defaultState() object with photos and panel settings filled in.
 */
export function drawCover(ctx, w, h, state) {
  ctx.save();
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#ffffff'; // the white poster board the gutters show
  ctx.fillRect(0, 0, w, h);
  const rects = panelRects(state.layout, w, h);
  rects.forEach((rect, i) => {
    const panel = state.panels[i] ?? { photo: -1, scale: 1, ox: 0, oy: 0 };
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();
    const photo = panel.photo >= 0 ? state.photos[panel.photo] : null;
    if (photo) drawPhotoInPanel(ctx, rect, photo.img, panel);
    else drawEmptyPanel(ctx, rect, i, w);
    ctx.restore();
  });
  applyGrade(ctx, w, h, state.grade);
  if (state.vignette) applyVignette(ctx, w, h);
  if (state.grain) applyGrain(ctx, w, h);
  drawLettering(ctx, w, h, state);
  ctx.restore();
}
