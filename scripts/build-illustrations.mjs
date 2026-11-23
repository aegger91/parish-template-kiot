#!/usr/bin/env node
// Generates the flat line-art placeholder illustrations in public/images/illustrations.
// Usage: node scripts/build-illustrations.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'images', 'illustrations');

const INK = '#6d1c2d';
const GOLD = '#c29a46';
const GOLD_PALE = '#e6cd8c';
const GOLD_MID = '#d6b468';
const IVORY = '#f8f1e2';
const LIGHT = '#fdfaf3';
const CLOTH = '#f2e2df';

const GROUND = 262;

/* ---------- primitives ---------- */

const r2 = (v) => Math.round(v * 100) / 100;
const pt = (x, y) => `${r2(x)} ${r2(y)}`;
const fill = (c) => `fill="${c}"`;
const sw = (w) => `stroke-width="${w}"`;
const stroke = (c) => `stroke="${c}"`;
const join_ = (...a) => a.filter(Boolean).join(' ');

const path = (d, a = '') => `<path d="${d}" ${a}/>`;
const circle = (cx, cy, r, a = '') => `<circle cx="${r2(cx)}" cy="${r2(cy)}" r="${r2(r)}" ${a}/>`;
const ellipse = (cx, cy, rx, ry, a = '') =>
  `<ellipse cx="${r2(cx)}" cy="${r2(cy)}" rx="${r2(rx)}" ry="${r2(ry)}" ${a}/>`;
const rect = (x, y, w, h, a = '') =>
  `<rect x="${r2(x)}" y="${r2(y)}" width="${r2(w)}" height="${r2(h)}" ${a}/>`;
const line = (x1, y1, x2, y2, a = '') =>
  `<line x1="${r2(x1)}" y1="${r2(y1)}" x2="${r2(x2)}" y2="${r2(y2)}" ${a}/>`;
const g = (inner, a = '') => `<g ${a}>${inner}</g>`;

/** Round-topped arch; `top` is the apex. */
const arch = (x1, x2, top, bottom) => {
  const r = (x2 - x1) / 2;
  const spring = top + r;
  return `M${pt(x1, bottom)}V${r2(spring)}A${r2(r)} ${r2(r)} 0 0 1 ${pt(x2, spring)}V${r2(bottom)}Z`;
};

/** Upright cylinder: side body plus top ellipse; `bulge` rounds the sides (for bread). */
const cylinder = (cx, top, rx, ry, h, a = '', bulge = 0) => {
  const side = (x, dir) =>
    bulge
      ? `C${pt(x + dir * bulge, top + h * 0.3)} ${pt(x + dir * bulge, top + h * 0.8)} ${pt(x - dir * bulge * 0.6, top + h)}`
      : `V${r2(top + h)}`;
  const sideUp = (x, dir) =>
    bulge
      ? `C${pt(x + dir * bulge, top + h * 0.8)} ${pt(x + dir * bulge, top + h * 0.3)} ${pt(x, top)}`
      : `V${r2(top)}`;
  const xl = cx - rx;
  const xr = cx + rx;
  const bl = bulge ? xl + bulge * 0.6 : xl;
  const br = bulge ? xr - bulge * 0.6 : xr;
  return (
    path(`M${pt(xl, top)}${side(xl, -1)}A${r2(br - cx)} ${r2(ry)} 0 0 0 ${pt(br, top + h)}${sideUp(xr, 1)}Z`, a) +
    ellipse(cx, top, rx, ry, a)
  );
};

/** Rounded bowl hanging below a rim ellipse (rim drawn separately). */
const bowlPath = (cx, rimY, rx, ry, depth) =>
  `M${pt(cx - rx, rimY)}C${pt(cx - rx, rimY + depth * 0.75)} ${pt(cx - rx * 0.55, rimY + depth)} ${pt(cx, rimY + depth)}` +
  `C${pt(cx + rx * 0.55, rimY + depth)} ${pt(cx + rx, rimY + depth * 0.75)} ${pt(cx + rx, rimY)}` +
  `A${r2(rx)} ${r2(ry)} 0 0 1 ${pt(cx - rx, rimY)}Z`;

const ground = (x1 = 92, x2 = 308, y = GROUND) => line(x1, y, x2, y, join_(stroke(GOLD_MID), sw(1.5)));

/**
 * Byzantine (Greek) cross: four equal arms flaring toward the ends, each
 * finished with a round bead. `size` is the distance from centre to bead centre.
 * With `outline`, an outline of width `outlineWidth` is drawn around the union.
 */
function byzantineCross(cx, cy, size, color, outline = null, outlineWidth = 2) {
  const a = size * 0.15;
  const b = size * 0.29;
  const r = size * 0.14;
  const L = size - r * 0.85;
  const ctrl = a + (L - a) * 0.62;
  const rot = ([x, y], k) => {
    for (let i = 0; i < k; i++) [x, y] = [-y, x];
    return [cx + x, cy + y];
  };
  let d = `M${pt(...rot([-a, -a], 0))}`;
  for (let k = 0; k < 4; k++) {
    const c1 = rot([-a, -ctrl], k);
    const p1 = rot([-b, -L], k);
    const p2 = rot([b, -L], k);
    const c2 = rot([a, -ctrl], k);
    const p3 = rot([a, -a], k);
    d += `Q${pt(...c1)} ${pt(...p1)}L${pt(...p2)}Q${pt(...c2)} ${pt(...p3)}`;
  }
  d += 'Z';
  const beads = [0, 1, 2, 3].map((k) => rot([0, -size], k));
  const shapes = (a_) => path(d, a_) + beads.map(([x, y]) => circle(x, y, r, a_)).join('');
  if (!outline) return shapes(join_(fill(color), 'stroke="none"'));
  return (
    shapes(join_(fill(outline), stroke(outline), sw(outlineWidth * 2))) +
    shapes(join_(fill(color), 'stroke="none"'))
  );
}

/** Small gold teardrop flame; (cx, by) is the bottom of the flame. */
function flame(cx, by, h = 12) {
  const w = h * 0.34;
  const tear = (hh, ww, yb) =>
    `M${pt(cx, yb - hh)}C${pt(cx + ww * 0.2, yb - hh * 0.62)} ${pt(cx + ww, yb - hh * 0.5)} ${pt(cx + ww, yb - ww)}` +
    `A${r2(ww)} ${r2(ww)} 0 0 1 ${pt(cx - ww, yb - ww)}C${pt(cx - ww, yb - hh * 0.5)} ${pt(cx - ww * 0.2, yb - hh * 0.62)} ${pt(cx, yb - hh)}Z`;
  return (
    circle(cx, by - h * 0.42, h * 0.62, join_(fill(GOLD_PALE), 'fill-opacity="0.22"', 'stroke="none"')) +
    path(tear(h, w, by), join_(fill(GOLD_PALE), stroke(GOLD), sw(1.2))) +
    path(tear(h * 0.5, w * 0.5, by - 1), join_(fill(GOLD_MID), 'stroke="none"'))
  );
}

/** Thin beeswax taper standing with its base at (x, base). */
function taper(x, base, h, { w = 6, lit = true } = {}) {
  const top = base - h;
  let s = path(
    `M${pt(x - w / 2, base)}V${r2(top + 1.5)}Q${pt(x - w / 2, top)} ${pt(x, top)}Q${pt(x + w / 2, top)} ${pt(x + w / 2, top + 1.5)}V${r2(base)}`,
    join_(fill(GOLD_PALE), sw(1.8)),
  );
  s += line(x, top, x, top - 3, sw(1.4));
  if (lit) s += flame(x, top - 2, 12);
  return s;
}

function sampleCubic(p0, p1, p2, p3, n = 240) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    pts.push([
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ]);
  }
  return pts;
}
const sampleLine = (x1, y1, x2, y2) =>
  sampleCubic([x1, y1], [x1 + (x2 - x1) / 3, y1 + (y2 - y1) / 3], [x1 + (2 * (x2 - x1)) / 3, y1 + (2 * (y2 - y1)) / 3], [x2, y2]);

/** Fine metal chain following a sampled polyline. */
function chain(pts, link = 7, color = INK) {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  }
  const total = cum[cum.length - 1];
  const count = Math.max(1, Math.round(total / link));
  const step = total / count;
  let s = '';
  let j = 0;
  for (let k = 0; k < count; k++) {
    const target = (k + 0.5) * step;
    while (j < cum.length - 2 && cum[j + 1] < target) j++;
    const [x1, y1] = pts[j];
    const [x2, y2] = pts[j + 1];
    const t = (target - cum[j]) / (cum[j + 1] - cum[j] || 1);
    const x = x1 + (x2 - x1) * t;
    const y = y1 + (y2 - y1) * t;
    const ang = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
    s +=
      k % 2 === 0
        ? ellipse(x, y, step * 0.62, step * 0.34, join_(`transform="rotate(${r2(ang)} ${pt(x, y)})"`))
        : line(x - step * 0.6, y, x + step * 0.6, y, `transform="rotate(${r2(ang)} ${pt(x, y)})"`);
  }
  return g(s, join_(stroke(color), sw(1.5), 'fill="none"'));
}

const smoke = (d, w = 2, op = 0.42) => path(d, join_(sw(w), `stroke-opacity="${op}"`));

function frame(name, title, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" role="img" aria-labelledby="${name}-title">
<title id="${name}-title">${title}</title>
<defs><radialGradient id="${name}-bg" cx="50%" cy="45%" r="62%"><stop offset="0" stop-color="${LIGHT}"/><stop offset="1" stop-color="${IVORY}"/></radialGradient></defs>
<rect width="400" height="300" fill="url(#${name}-bg)"/>
${path(arch(66, 334, 16, 286), join_(fill(LIGHT), stroke(GOLD), sw(2)))}
${path(arch(72, 328, 22, 280), join_('fill="none"', stroke(GOLD_PALE), sw(1)))}
<g fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
${body}
</g>
</svg>
`;
}

/* ---------- shared scene pieces ---------- */

function cypress(x, h, base = GROUND) {
  const top = base - h;
  return (
    path(
      `M${pt(x, top)}C${pt(x + 6, top + 14)} ${pt(x + 13, base - h * 0.5)} ${pt(x + 11, base - 12)}Q${pt(x, base - 6)} ${pt(x - 11, base - 12)}C${pt(x - 13, base - h * 0.5)} ${pt(x - 6, top + 14)} ${pt(x, top)}Z`,
      join_(fill(LIGHT), sw(2)),
    ) +
    path(`M${pt(x, top + 16)}V${r2(base - 14)}`, join_(sw(1.2), 'stroke-opacity="0.5"')) +
    line(x, base - 9, x, base, sw(2))
  );
}

/**
 * Orthodox onion (bulbous) dome sitting on a drum base.
 * `h` is tip-to-base height; base width is `2 * dx`.
 */
function onionDome(cx, baseY, dx, h, a = fill(LIGHT)) {
  const tip = baseY - h;
  const bulgeX = dx * 1.22;
  let s = path(
    `M${pt(cx - dx, baseY)}` +
      `C${pt(cx - bulgeX, baseY - h * 0.06)} ${pt(cx - bulgeX, tip + h * 0.52)} ${pt(cx - dx * 0.32, tip + h * 0.2)}` +
      `Q${pt(cx, tip)} ${pt(cx + dx * 0.32, tip + h * 0.2)}` +
      `C${pt(cx + bulgeX, tip + h * 0.52)} ${pt(cx + bulgeX, baseY - h * 0.06)} ${pt(cx + dx, baseY)}Z`,
    a,
  );
  // soft highlight ridges (not a Western steeple silhouette)
  s += path(`M${pt(cx, tip)}Q${pt(cx - dx * 0.55, tip + h * 0.28)} ${pt(cx - dx * 0.72, baseY - h * 0.08)}`, join_(sw(1.5), 'stroke-opacity="0.55"'));
  s += path(`M${pt(cx, tip)}Q${pt(cx + dx * 0.55, tip + h * 0.28)} ${pt(cx + dx * 0.72, baseY - h * 0.08)}`, join_(sw(1.5), 'stroke-opacity="0.55"'));
  return s;
}

/** Onion dome on a drum with arched windows and a Byzantine cross. */
function domeOnDrum(cx, drumTop, drumBottom, drumW, domeH, crossSize = 10) {
  const dx = drumW / 2;
  let s = rect(cx - dx, drumTop, drumW, drumBottom - drumTop, fill(LIGHT));
  const winW = 7;
  const gap = drumW / 4;
  for (const k of [-1, 0, 1]) {
    s += path(arch(cx + k * gap - winW / 2, cx + k * gap + winW / 2, drumTop + 8, drumTop + 28), join_(fill(CLOTH), sw(2)));
  }
  s += line(cx - dx - 5, drumTop, cx + dx + 5, drumTop);
  s += onionDome(cx, drumTop, dx + 1, domeH);
  const tip = drumTop - domeH;
  s += byzantineCross(cx, tip - crossSize - 1, crossSize, INK);
  return s;
}

/** Analogion (lectern) seen from the front, draped with a cloth. */
function analogion(cx, topY, { clothCross = true } = {}) {
  const fw = 52;
  const bw = 36;
  const backY = topY - 30;
  let s = '';
  // legs below cloth
  s += path(`M${pt(cx - 26, 232)}L${pt(cx - 34, GROUND)}M${pt(cx + 26, 232)}L${pt(cx + 34, GROUND)}`);
  s += line(cx, 232, cx, GROUND - 4, sw(2));
  s += line(cx - 30, GROUND - 14, cx + 30, GROUND - 14, sw(2));
  // slanted top surface
  s += path(`M${pt(cx - fw, topY)}L${pt(cx - bw, backY)}H${r2(cx + bw)}L${pt(cx + fw, topY)}Z`, fill(CLOTH));
  // hanging front cloth
  const hem = 236;
  let scallop = '';
  const n = 6;
  const w = (2 * (fw + 2)) / n;
  for (let i = 0; i < n; i++) scallop += `Q${pt(cx + fw + 2 - w * (i + 0.5), hem + 6)} ${pt(cx + fw + 2 - w * (i + 1), hem)}`;
  s += path(`M${pt(cx - fw, topY)}H${r2(cx + fw)}L${pt(cx + fw + 2, hem)}${scallop}Z`, fill(CLOTH));
  s += path(`M${pt(cx - fw + 7, topY + 6)}H${r2(cx + fw - 7)}L${pt(cx + fw - 6, hem - 8)}H${r2(cx - fw + 6)}Z`, join_(stroke(GOLD), sw(1.5)));
  if (clothCross) s += byzantineCross(cx, (topY + hem) / 2 + 2, 15, GOLD_PALE, GOLD, 1);
  for (let i = 0; i <= n; i++) {
    const x = cx + fw + 2 - w * i;
    if (i > 0 && i < n) s += line(x, hem, x, hem + 7, join_(sw(1.5), stroke(GOLD)));
  }
  return s;
}

/** Simple brass candlestick with a lit taper. */
function candlestick(x, h = 70, base = GROUND) {
  let s = path(`M${pt(x - 16, base)}Q${pt(x - 14, base - 8)} ${pt(x - 3, base - 11)}H${r2(x + 3)}Q${pt(x + 14, base - 8)} ${pt(x + 16, base)}Z`, join_(fill(GOLD_PALE), sw(2)));
  s += rect(x - 2.5, base - 38, 5, 28, join_(fill(GOLD_PALE), sw(2)));
  s += ellipse(x, base - 24, 5.5, 3, join_(fill(GOLD_PALE), sw(2)));
  s += path(`M${pt(x - 12, base - 40)}Q${pt(x, base - 34)} ${pt(x + 12, base - 40)}Z`, join_(fill(GOLD_PALE), sw(2)));
  s += taper(x, base - 41, h);
  return s;
}

/** Small round side table with a pedestal. */
function sideTable(cx, topY, rx = 28) {
  let s = path(`M${pt(cx - 20, GROUND)}Q${pt(cx - 6, GROUND - 6)} ${pt(cx - 4, GROUND - 16)}M${pt(cx + 20, GROUND)}Q${pt(cx + 6, GROUND - 6)} ${pt(cx + 4, GROUND - 16)}`, sw(2.5));
  s += rect(cx - 3.5, topY + 6, 7, GROUND - 16 - topY - 6, join_(fill(GOLD_PALE), sw(2)));
  s += path(`M${pt(cx - rx, topY)}V${r2(topY + 5)}A${r2(rx)} 6 0 0 0 ${pt(cx + rx, topY + 5)}V${r2(topY)}Z`, join_(fill(LIGHT), sw(2.5)));
  s += ellipse(cx, topY, rx, 6, join_(fill(LIGHT), sw(2.5)));
  return s;
}

/** Arched icon panel showing only a gold halo. */
function iconPanel(x1, x2, top, bottom) {
  const w = x2 - x1;
  const cx = (x1 + x2) / 2;
  let s = path(arch(x1, x2, top, bottom), fill(GOLD_PALE));
  const inset = Math.max(5, w * 0.09);
  s += path(arch(x1 + inset, x2 - inset, top + inset, bottom - inset), join_(fill(LIGHT), sw(1.5)));
  const hr = w * 0.24;
  const hy = top + inset + (w - 2 * inset) / 2 + hr * 0.15;
  s += circle(cx, hy, hr, join_(fill(GOLD_PALE), stroke(GOLD), sw(1.5)));
  s += circle(cx, hy, hr - 3.5, join_(stroke(GOLD), sw(0.8)));
  return s;
}

/* ---------- subjects ---------- */

const subjects = {};

subjects.church = {
  title: 'Orthodox cross-in-square church with a central onion dome on a drum, two lower side bays and cypress trees',
  body() {
    let s = ground(84, 316);
    s += cypress(96, 74) + cypress(304, 74);
    s += domeOnDrum(200, 102, 160, 56, 34, 11);
    // side bays with lean-to roofs
    s += path(`M114 ${GROUND}V200L152 190V${GROUND}Z`, fill(LIGHT));
    s += path(`M286 ${GROUND}V200L248 190V${GROUND}Z`, fill(LIGHT));
    s += line(107, 201.8, 152, 190) + line(293, 201.8, 248, 190);
    s += path(arch(127, 139, 214, 242), join_(fill(CLOTH), sw(2)));
    s += path(arch(261, 273, 214, 242), join_(fill(CLOTH), sw(2)));
    // central bay with arched gable
    s += path(`M152 ${GROUND}V174A48 26 0 0 1 248 174V${GROUND}Z`, fill(LIGHT));
    s += path('M145 176A55 31 0 0 1 255 176', '');
    s += path(arch(180, 220, 210, GROUND), join_(sw(2)));
    s += path(arch(186, 214, 216, GROUND), join_(fill(CLOTH), sw(2.5)));
    s += line(200, 216, 200, GROUND, sw(1.5));
    s += path(arch(187, 197, 168, 194), join_(fill(CLOTH), sw(2)));
    s += path(arch(203, 213, 168, 194), join_(fill(CLOTH), sw(2)));
    s += line(152, 200, 248, 200, join_(sw(1.5), 'stroke-opacity="0.5"'));
    s += line(114, 206, 152, 206, join_(sw(1.5), 'stroke-opacity="0.5"'));
    s += line(248, 206, 286, 206, join_(sw(1.5), 'stroke-opacity="0.5"'));
    return s;
  },
};

subjects.iconostasis = {
  title: 'Iconostasis with round arches, icon panels showing golden halos, central Royal Doors and a hanging oil lamp',
  body() {
    let s = ground(84, 316);
    s += rect(90, 128, 220, GROUND - 128, fill(LIGHT));
    s += rect(84, 116, 232, 12, fill(GOLD_PALE));
    for (let x = 96; x <= 304; x += 13) s += circle(x, 122, 1.6, join_(fill(INK), 'stroke="none"'));
    const bays = [[90, 132], [132, 174], [226, 268], [268, 310]];
    for (const [xa, xb] of bays) {
      const r = (xb - xa) / 2;
      s += path(`M${xa} 170A${r} ${r} 0 0 1 ${xb} 170`, sw(2));
      s += iconPanel(xa + 6, xb - 6, 155, 236);
      s += rect(xa + 6, 242, xb - xa - 12, 14, join_(sw(1.5)));
    }
    for (const x of [132, 174, 226, 268]) s += line(x, 168, x, GROUND, sw(2));
    // Royal Doors
    s += path('M174 170A26 26 0 0 1 226 170', sw(2));
    s += path(arch(180, 220, 166, GROUND), fill(GOLD_PALE));
    s += line(200, 166, 200, GROUND, sw(2));
    s += path(arch(184.5, 196, 184, 222), join_(fill(LIGHT), sw(1.5)));
    s += path(arch(204, 215.5, 184, 222), join_(fill(LIGHT), sw(1.5)));
    s += rect(184.5, 230, 11.5, 24, join_(fill(LIGHT), sw(1.5)));
    s += rect(204, 230, 11.5, 24, join_(fill(LIGHT), sw(1.5)));
    s += byzantineCross(200, 155, 7, INK);
    // hanging lamp
    s += chain(sampleLine(200, 24, 200, 52), 6);
    s += circle(200, 55, 3, join_(fill(GOLD_PALE), sw(1.5)));
    s += chain(sampleLine(199, 57, 184, 84), 6) + chain(sampleLine(201, 57, 216, 84), 6);
    s += flame(200, 84, 13);
    s += path(bowlPath(200, 84, 17, 4, 15), join_(fill(GOLD_PALE), sw(2)));
    s += ellipse(200, 84, 17, 4, join_(fill(GOLD_PALE), sw(2)));
    s += path('M196 99L200 108L204 99', join_(fill(GOLD_PALE), sw(2)));
    return s;
  },
};

subjects['candle-stand'] = {
  title: 'Orthodox candle stand: a round brass tray of sand on a pedestal holding nine lit beeswax tapers',
  body() {
    let s = ground(130, 270);
    // pedestal
    s += path(`M168 ${GROUND - 1}Q172 248 194 242H206Q228 248 232 ${GROUND - 1}Z`, join_(fill(GOLD_PALE)));
    s += rect(195, 204, 10, 38, join_(fill(GOLD_PALE), sw(2.5)));
    s += ellipse(200, 222, 10, 5, join_(fill(GOLD_PALE), sw(2.5)));
    s += path('M186 188Q200 214 214 188Z', join_(fill(GOLD_PALE), sw(2.5)));
    // tray
    s += path('M126 168L131 180A69 12 0 0 0 269 180L274 168A74 14 0 0 1 126 168Z', fill(GOLD_PALE));
    s += ellipse(200, 168, 74, 14, fill(GOLD_PALE));
    s += ellipse(200, 168, 67, 10.5, join_(fill(IVORY), sw(2)));
    const back = [[164, 60], [188, 86], [212, 78], [236, 56]];
    const front = [[152, 42], [176, 64], [200, 74], [224, 62], [248, 46]];
    for (const [x, h] of back) s += taper(x, 164, h);
    for (const [x, h] of front) s += taper(x, 173, h);
    return s;
  },
};

subjects['bell-tower'] = {
  title: 'Orthodox bell tower with two bells in round arched openings, an onion dome on a drum and a cross (not a Western steeple)',
  body() {
    let s = ground(84, 316);
    s += cypress(116, 64) + cypress(284, 64);
    // lower stage
    s += rect(162, 170, 76, GROUND - 170, fill(LIGHT));
    s += path(arch(186, 214, 220, GROUND), join_(fill(CLOTH), sw(2.5)));
    s += path(arch(194, 206, 186, 208), join_(fill(CLOTH), sw(2)));
    s += rect(156, 162, 88, 8, fill(LIGHT));
    // belfry
    s += rect(166, 102, 68, 60, fill(LIGHT));
    for (const cx of [184, 216]) {
      s += path(arch(cx - 12, cx + 12, 112, 156), join_(fill(CLOTH), sw(2.5)));
      s += line(cx, 112, cx, 119, sw(2));
      s += path(`M${cx - 9} 140C${cx - 9} 128 ${cx - 7} 119 ${cx} 119C${cx + 7} 119 ${cx + 9} 128 ${cx + 9} 140L${cx + 11} 144H${cx - 11}Z`, join_(fill(GOLD_PALE), sw(2)));
      s += circle(cx, 147.5, 2.5, join_(fill(GOLD_PALE), sw(1.5)));
    }
    s += line(166, 156, 234, 156, sw(2));
    s += rect(158, 94, 84, 8, fill(LIGHT));
    // onion cupola on the drum (never a pointed Gothic/Western steeple)
    s += onionDome(200, 94, 30, 32);
    s += byzantineCross(200, 50, 11, INK);
    return s;
  },
};

subjects.prosphora = {
  title: 'Two round prosphora loaves on a cloth; the front loaf bears the IC XC NIKA seal',
  body() {
    let s = '';
    // cloth
    s += path(`M94 ${GROUND}L116 196H284L306 ${GROUND}Z`, join_(fill(CLOTH), sw(2.5)));
    s += path(`M105 ${GROUND - 6}L123 202H277L295 ${GROUND - 6}`, join_(stroke(GOLD), sw(1.5)));
    const loaf = (cx, top, rx, ry, h1, rx2, ry2, h2) =>
      cylinder(cx, top, rx, ry, h1, join_(fill(GOLD_PALE), sw(2.5)), 4) +
      ellipse(cx, top, rx, ry, join_(fill(IVORY), sw(2.5))) +
      cylinder(cx, top - h2, rx2, ry2, h2 - 1, join_(fill(GOLD_PALE), sw(2.5)), 3) +
      ellipse(cx, top - h2, rx2, ry2, join_(fill(LIGHT), sw(2.5)));
    s += loaf(134, 184, 36, 21, 15, 27, 16, 14);
    s += loaf(220, 202, 60, 36, 20, 46, 28, 19);
    // Lamb seal: central cross dividing IC | XC / NI | KA
    const sx = 220;
    const sy = 183;
    const ns = 'vector-effect="non-scaling-stroke"';
    const sealLetter = (t, x, y) =>
      `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" font-family="serif" font-size="9" font-weight="700" fill="${INK}" stroke="none" ${ns}>${t}</text>`;
    s += g(
      rect(-28, -28, 56, 56, join_(fill(IVORY), sw(2), ns)) +
        line(-28, 0, 28, 0, join_(sw(1.8), ns)) +
        line(0, -28, 0, 28, join_(sw(1.8), ns)) +
        // small Greek cross at the centre of the seal
        path('M-3.2 -12H3.2V-3.2H12V3.2H3.2V12H-3.2V3.2H-12V-3.2H-3.2Z', join_(fill(INK), 'stroke="none"')) +
        sealLetter('IC', -14, -14) +
        sealLetter('XC', 14, -14) +
        sealLetter('NI', -14, 14) +
        sealLetter('KA', 14, 14),
      `transform="translate(${sx} ${sy}) scale(1 0.62)"`,
    );
    return s;
  },
};

subjects.tapers = {
  title: 'A bundle of beeswax tapers tied with a burgundy ribbon',
  body() {
    let s = ground(130, 270);
    const tie = [200, 186];
    const order = [0, 8, 1, 7, 2, 6, 3, 5, 4];
    for (const i of order) {
      const ang = (i - 4) * 1.8;
      const x = tie[0] + (i - 4) * 6.5;
      const top = 70 + Math.abs(i - 4) * 2;
      const bot = 260;
      s += g(
        path(`M${x - 3.5} ${bot}V${top + 2}Q${x - 3.5} ${top} ${x} ${top}Q${x + 3.5} ${top} ${x + 3.5} ${top + 2}V${bot}Z`, join_(fill(GOLD_PALE), sw(1.8))) +
          line(x, top, x, top - 4, sw(1.4)),
        `transform="rotate(${ang} ${x} ${tie[1]})"`,
      );
    }
    // ribbon
    s += path('M168 180Q200 185 232 180V193Q200 198 168 193Z', join_(fill(INK), sw(2)));
    s += path('M200 188C188 172 168 170 170 182C172 192 190 190 200 188Z', join_(fill(INK), sw(2)));
    s += path('M200 188C212 172 232 170 230 182C228 192 210 190 200 188Z', join_(fill(INK), sw(2)));
    s += path('M198 190L188 222L194 218L197 224L201 192', join_(fill(INK), sw(2)));
    s += path('M202 190L214 220L208 217L206 223L199 192', join_(fill(INK), sw(2)));
    s += ellipse(200, 188, 5, 6, join_(fill(INK), stroke(LIGHT), sw(1)));
    s += path('M176 181Q182 176 190 182', join_(stroke(LIGHT), sw(1)));
    s += path('M224 181Q218 176 210 182', join_(stroke(LIGHT), sw(1)));
    return s;
  },
};

subjects['vigil-lamp'] = {
  title: 'A hanging Greek oil vigil lamp (kandili) on three chains with a small golden flame',
  body() {
    let s = '';
    s += circle(200, 36, 6, sw(2.5));
    s += chain(sampleLine(200, 42, 200, 58), 6);
    s += path('M188 72Q188 60 200 58Q212 60 212 72Z', join_(fill(GOLD_PALE), sw(2.5)));
    s += circle(200, 56, 3, join_(fill(GOLD_PALE), sw(2)));
    const rimY = 176;
    s += chain(sampleLine(200, 74, 200, 162), 7);
    s += chain(sampleLine(192, 73, 152, rimY), 7) + chain(sampleLine(208, 73, 248, rimY), 7);
    s += path(bowlPath(200, rimY, 50, 9, 46), fill(GOLD_PALE));
    s += ellipse(200, rimY, 50, 9, fill(GOLD_PALE));
    s += ellipse(200, rimY, 42, 6, join_(fill(LIGHT), sw(1.5)));
    s += path('M193 176L195 168H205L207 176Z', join_(fill(GOLD_MID), sw(1.6)));
    s += flame(200, 166, 20);
    s += path('M152 186Q200 200 248 186', sw(1.5));
    s += path('M160 210Q200 224 240 210', sw(1.5));
    s += byzantineCross(200, 204, 7, INK);
    s += path('M190 222Q200 226 210 222L203 246Q200 249 197 246Z', join_(fill(GOLD_PALE), sw(2.5)));
    s += circle(200, 253, 4.5, join_(fill(GOLD_PALE), sw(2)));
    for (const x of [152, 248]) s += circle(x, rimY, 3.5, join_(fill(GOLD_MID), sw(1.8)));
    return s;
  },
};

subjects['prayer-rope'] = {
  title: 'A knotted Orthodox prayer rope (komboskini) with a small knotted cross and a tassel',
  body() {
    let s = '';
    const cx = 200;
    const cy = 108;
    const rx = 72;
    const ry = 62;
    s += ellipse(cx, cy, rx, ry, sw(2));
    const slots = 34;
    for (let k = 0; k < slots; k++) {
      if (k === 0) continue;
      const th = Math.PI / 2 + (k * 2 * Math.PI) / slots;
      const x = cx + rx * Math.cos(th);
      const y = cy + ry * Math.sin(th);
      const ang = (Math.atan2(ry * Math.cos(th), -rx * Math.sin(th)) * 180) / Math.PI;
      s += g(
        ellipse(0, 0, 6.6, 5.6, join_(fill(INK), sw(1))) +
          path('M-3.5 -2Q0 -4.5 3.5 -2M-3.5 1.5Q0 -1 3.5 1.5', join_(stroke(LIGHT), sw(1), 'stroke-opacity="0.8"')),
        `transform="translate(${r2(x)} ${r2(y)}) rotate(${r2(ang)})"`,
      );
    }
    s += circle(cx, cy + ry + 2, 5, join_(fill(GOLD_PALE), sw(2)));
    s += byzantineCross(cx, 199, 21, INK);
    s += circle(cx, 199, 2.2, join_(fill(LIGHT), 'stroke="none"'));
    s += circle(cx, 226, 3.5, join_(fill(INK), sw(1)));
    s += path(`M${cx - 4} 230H${cx + 4}L${cx + 13} 262Q${cx} 266 ${cx - 13} 262Z`, join_(fill(INK), sw(1.5)));
    for (const dx of [-6, -2, 2, 6]) s += line(cx + dx * 0.4, 234, cx + dx * 1.4, 261, join_(stroke(LIGHT), sw(0.9), 'stroke-opacity="0.75"'));
    return s;
  },
};

subjects['gospel-book'] = {
  title: 'A closed Gospel book standing upright, its gilded cover bearing a Byzantine cross, corner bosses and clasps',
  body() {
    let s = ground(120, 290);
    s += path('M150 80L162 72H258L246 80Z', join_(fill(IVORY), sw(2.5)));
    s += path(`M246 80L258 72V252L246 260Z`, join_(fill(IVORY), sw(2.5)));
    for (const k of [1, 2, 3]) s += line(246 + k * 3, 80 - k * 2, 246 + k * 3, 260 - k * 2, join_(stroke(GOLD_MID), sw(1)));
    s += rect(150, 80, 96, 180, join_(fill(GOLD_PALE)));
    s += rect(159, 89, 78, 162, join_(sw(1.5)));
    s += circle(198, 170, 30, join_(fill(LIGHT), sw(2)));
    s += byzantineCross(198, 170, 24, GOLD_MID, INK, 2);
    s += circle(198, 170, 3.2, join_(fill(INK), 'stroke="none"'));
    for (const [x, y] of [[170, 101], [226, 101], [170, 239], [226, 239]]) {
      s += circle(x, y, 7, join_(fill(GOLD_MID), sw(2)));
      s += circle(x, y, 2, join_(fill(INK), 'stroke="none"'));
    }
    for (const y of [124, 212]) {
      s += path(`M234 ${y - 5}H258V${y + 4}H234Z`, join_(fill(GOLD_MID), sw(2)));
      s += circle(236, y - 0.5, 2.2, join_(fill(INK), 'stroke="none"'));
    }
    return s;
  },
};

subjects['prayer-book'] = {
  title: 'A small stack of prayer books with gold borders, a cross on the top cover',
  body() {
    let s = ground(96, 304);
    const book = (cx, yb, w, t, d, cover, cross = false) => {
      const x = cx - w / 2;
      let b = path(`M${x} ${yb - t}L${x + 8} ${yb - t - d}H${x + w - 8}L${x + w} ${yb - t}Z`, join_(fill(cover), sw(2.5)));
      b += rect(x, yb - t, w, t, join_(fill(cover), sw(2.5)));
      b += rect(x + 5, yb - t + 3.5, w - 10, t - 7, join_(fill(LIGHT), sw(1.2)));
      for (let k = 1; k < 3; k++) b += line(x + 6, yb - t + 3.5 + ((t - 7) * k) / 3, x + w - 6, yb - t + 3.5 + ((t - 7) * k) / 3, join_(stroke(GOLD_MID), sw(0.8)));
      b += path(`M${x + 12} ${yb - t - 4}L${x + 16} ${yb - t - d + 4}H${x + w - 16}L${x + w - 12} ${yb - t - 4}Z`, join_(stroke(GOLD), sw(1.5)));
      if (cross) b += g(byzantineCross(0, 0, 13, INK), `transform="translate(${cx} ${yb - t - d / 2}) scale(1 0.62)"`);
      return b;
    };
    s += book(198, GROUND, 176, 22, 36, CLOTH);
    s += book(204, GROUND - 26, 154, 19, 34, GOLD_PALE);
    s += book(197, GROUND - 49, 132, 17, 44, CLOTH, true);
    return s;
  },
};

subjects.incense = {
  title: 'An open round tin of incense resin grains with its lid beside it and a thin wisp of smoke',
  body() {
    let s = ground(110, 300);
    const cx = 176;
    s += smoke(`M${cx + 6} 182C${cx - 4} 158 ${cx + 20} 144 ${cx + 10} 120S${cx} 86 ${cx + 16} 64`);
    s += smoke(`M${cx + 14} 182C${cx + 24} 164 ${cx + 8} 152 ${cx + 18} 134S${cx + 26} 108 ${cx + 20} 94`, 1.5, 0.3);
    // tin
    s += cylinder(cx, 198, 44, 12, 52, join_(fill(GOLD_PALE)));
    s += ellipse(cx, 198, 38, 9, join_(fill(IVORY), sw(2)));
    s += path(`M${cx - 44} 212A44 12 0 0 0 ${cx + 44} 212`, sw(1.5));
    s += path(`M${cx - 44} 238A44 12 0 0 0 ${cx + 44} 238`, sw(1.5));
    s += byzantineCross(cx, 233, 8, INK);
    // grains
    s += path(`M${cx - 34} 199Q${cx - 18} 185 ${cx} 187Q${cx + 18} 185 ${cx + 34} 199Q${cx} 209 ${cx - 34} 199Z`, join_(fill(GOLD_PALE), sw(1.8)));
    const grain = (x, y) =>
      path(`M${x - 4} ${y}Q${x - 3} ${y - 4} ${x + 1} ${y - 3.5}Q${x + 4.5} ${y - 1} ${x + 3} ${y + 2}Q${x} ${y + 3.5} ${x - 4} ${y}Z`, join_(fill(GOLD_MID), sw(1.3)));
    for (const [dx, y] of [[-22, 196], [-12, 191], [-2, 193], [8, 189], [18, 193], [26, 197], [-6, 199], [12, 199], [-18, 200]]) s += grain(cx + dx, y);
    // lid lying beside the tin
    const lx = 268;
    s += cylinder(lx, 244, 40, 10, 9, join_(fill(GOLD_PALE)));
    s += ellipse(lx, 244, 30, 7, join_(sw(1.5)));
    s += ellipse(lx, 243, 6, 2.5, join_(fill(GOLD_MID), sw(1.8)));
    for (const [x, y] of [[120, 258], [130, 255], [112, 254]]) s += grain(x, y);
    return s;
  },
};

subjects.censer = {
  title: 'An Orthodox censer (thurible) hanging from three chains, its onion-domed lid topped with a cross, with gentle wisps of smoke',
  body() {
    let s = '';
    s += circle(200, 32, 5, sw(2.5));
    s += ellipse(200, 42, 18, 4.5, join_(fill(GOLD_PALE), sw(2.5)));
    const rimY = 182;
    // Side chains to the bowl rim; centre chain to the lid apex (opens the lid)
    s += chain(sampleLine(186, 45, 160, rimY), 7) + chain(sampleLine(200, 46, 200, 122), 7) + chain(sampleLine(214, 45, 240, rimY), 7);
    s += smoke('M180 150C166 138 176 122 162 108S154 86 164 74', 2, 0.38);
    s += smoke('M220 150C234 138 224 122 238 108S246 86 236 74', 2, 0.38);
    // lid: short drum with onion cupola (not a Latin-style lid)
    s += path(`M160 ${rimY}L164 168H236L240 ${rimY}Z`, join_(fill(GOLD_PALE)));
    s += rect(174, 144, 52, 24, join_(fill(GOLD_PALE)));
    for (const x of [186, 200, 214]) s += path(arch(x - 3.5, x + 3.5, 149, 163), join_(fill(LIGHT), sw(1.5)));
    s += line(170, 144, 230, 144);
    s += onionDome(200, 144, 24, 22, join_(fill(GOLD_PALE)));
    s += byzantineCross(200, 110, 10, INK);
    // bowl
    s += path(bowlPath(200, rimY, 42, 6, 38), join_(fill(GOLD_PALE)));
    s += line(156, rimY, 244, rimY);
    s += path(`M166 ${rimY + 14}Q200 ${rimY + 24} 234 ${rimY + 14}`, sw(1.5));
    s += path(`M192 ${rimY + 37}L188 ${rimY + 48}H212L208 ${rimY + 37}`, join_(fill(GOLD_PALE), sw(2.5)));
    s += ellipse(200, rimY + 49, 18, 4, join_(fill(GOLD_PALE), sw(2.5)));
    for (const x of [160, 240]) s += circle(x, rimY, 3.5, join_(fill(GOLD_MID), sw(1.8)));
    return s;
  },
};

subjects['cross-pendant'] = {
  title: 'A golden Orthodox (Byzantine) cross pendant on a fine chain — equal-armed, not a Latin cross',
  body() {
    let s = '';
    s += chain(sampleCubic([146, 36], [150, 84], [176, 108], [197, 114]), 6);
    s += chain(sampleCubic([254, 36], [250, 84], [224, 108], [203, 114]), 6);
    s += circle(200, 116, 5, sw(2.2));
    s += byzantineCross(200, 180, 56, GOLD_PALE, INK, 2.5);
    for (let k = 0; k < 4; k++) {
      for (const d of [20, 33]) {
        const [x, y] = [[0, -d], [d, 0], [0, d], [-d, 0]][k];
        s += circle(200 + x, 180 + y, 1.8, join_(fill(INK), 'stroke="none"'));
      }
      const [bx, by] = [[0, -56], [56, 0], [0, 56], [-56, 0]][k];
      s += circle(200 + bx, 180 + by, 2.4, join_(fill(GOLD_MID), 'stroke="none"'));
    }
    s += circle(200, 180, 8, join_(fill(GOLD_MID), sw(2)));
    s += circle(200, 180, 3, join_(fill(LIGHT), 'stroke="none"'));
    return s;
  },
};

subjects['icon-stand'] = {
  title: 'A small arched icon with a golden halo resting on a wooden stand, with a lit taper beside it',
  body() {
    let s = ground(110, 300);
    const cx = 184;
    s += path(`M${cx} 120L${cx} ${GROUND - 4}`, sw(2.5));
    s += path(`M${cx - 6} 112L${cx - 46} ${GROUND}M${cx + 6} 112L${cx + 46} ${GROUND}`, sw(3.5));
    s += iconPanel(cx - 40, cx + 40, 98, 204);
    s += rect(cx - 50, 204, 100, 8, join_(fill(GOLD_PALE), sw(2.5)));
    s += candlestick(276, 62);
    return s;
  },
};

subjects.baptism = {
  title: 'A baptismal font: a raised round basin of water on a pedestal with three lit tapers on its rim',
  body() {
    let s = ground(110, 290);
    s += path(`M164 ${GROUND - 1}Q168 248 188 242H212Q232 248 236 ${GROUND - 1}Z`, join_(fill(GOLD_PALE)));
    s += path('M188 242L192 214H208L212 242Z', join_(fill(GOLD_PALE)));
    s += ellipse(200, 228, 14, 5, join_(fill(GOLD_PALE), sw(2.5)));
    s += path(bowlPath(200, 168, 78, 16, 52), join_(fill(GOLD_PALE)));
    s += ellipse(200, 168, 78, 16, join_(fill(GOLD_PALE)));
    s += ellipse(200, 168, 70, 12, join_(fill(LIGHT), sw(2)));
    s += path('M150 166Q160 162 170 166T190 166', join_(stroke(GOLD), sw(1.5)));
    s += path('M206 172Q216 168 226 172T246 172', join_(stroke(GOLD), sw(1.5)));
    s += path('M174 176Q184 172 194 176T214 176', join_(stroke(GOLD), sw(1.5)));
    s += taper(200, 151, 54);
    s += path('M130 190Q200 214 270 190', sw(1.5));
    s += byzantineCross(200, 202, 9, INK);
    for (const x of [126, 274]) {
      s += taper(x, 166, 54);
      s += rect(x - 5, 162, 10, 6, join_(fill(GOLD_MID), sw(1.8)));
    }
    s += rect(195, 148, 10, 5, join_(fill(GOLD_MID), sw(1.8)));
    return s;
  },
};

subjects.confession = {
  title: 'An analogion (lectern) draped with a cloth, with a Gospel book and a hand cross lying on it',
  body() {
    let s = ground(120, 280);
    s += analogion(200, 150);
    // Gospel book lying on the slanted top
    s += path('M154 145V150H206V145', join_(fill(IVORY), sw(2)));
    s += path('M154 145L161 125H201L206 145Z', join_(fill(GOLD_PALE), sw(2.5)));
    s += path('M160 142L165 128H197L201 142Z', join_(sw(1.2)));
    s += g(byzantineCross(0, 0, 8, INK), 'transform="translate(181 135) scale(1 0.62)"');
    // hand cross lying beside
    s += g(byzantineCross(0, 0, 12, GOLD_PALE, INK, 1.6), 'transform="translate(226 137) scale(1 0.6)"');
    return s;
  },
};

subjects.chrismation = {
  title: 'An ornate flask of holy myrrh with a domed lid and cross, and a thin brush beside it',
  body() {
    let s = ground(110, 300);
    const cx = 184;
    s += ellipse(cx, 254, 28, 6, join_(fill(GOLD_PALE), sw(2.5)));
    s += path(`M${cx - 10} 252L${cx - 7} 236H${cx + 7}L${cx + 10} 252`, join_(fill(GOLD_PALE), sw(2.5)));
    s += path(`M${cx - 10} 134C${cx - 12} 156 ${cx - 50} 170 ${cx - 48} 202C${cx - 46} 226 ${cx - 22} 236 ${cx} 237C${cx + 22} 236 ${cx + 46} 226 ${cx + 48} 202C${cx + 50} 170 ${cx + 12} 156 ${cx + 10} 134Z`, fill(GOLD_PALE));
    s += path(`M${cx - 42} 184Q${cx} 196 ${cx + 42} 184`, sw(1.5));
    s += path(`M${cx - 44} 220Q${cx} 232 ${cx + 44} 220`, sw(1.5));
    s += byzantineCross(cx, 206, 12, LIGHT, INK, 1.5);
    s += path(`M${cx - 20} 168Q${cx} 160 ${cx + 20} 168`, sw(1.5));
    s += ellipse(cx, 132, 15, 4, join_(fill(GOLD_PALE), sw(2.5)));
    s += path(`M${cx - 13} 128C${cx - 13} 112 ${cx - 6} 106 ${cx} 106C${cx + 6} 106 ${cx + 13} 112 ${cx + 13} 128Z`, join_(fill(GOLD_PALE), sw(2.5)));
    s += circle(cx, 103, 3, join_(fill(GOLD_MID), sw(2)));
    s += byzantineCross(cx, 90, 9, INK);
    // brush on a small dish
    s += ellipse(272, 254, 26, 6, join_(fill(LIGHT), sw(2.5)));
    s += g(
      rect(0, -2.5, 52, 5, join_(fill(GOLD_PALE), sw(1.8))) +
        circle(54, 0, 3, join_(fill(GOLD_MID), sw(1.6))) +
        rect(-8, -3.5, 8, 7, join_(fill(GOLD_MID), sw(1.6))) +
        path('M-8 -3.5Q-16 -3 -24 0Q-16 3 -8 3.5Z', join_(fill(LIGHT), sw(1.6))) +
        line(-10, 0, -20, 0, sw(0.8)),
      'transform="translate(256 246) rotate(-16)"',
    );
    return s;
  },
};

subjects.wedding = {
  title: 'Two Greek wedding crowns (stefana) of flowers joined by a ribbon, resting on a cloth',
  body() {
    let s = '';
    s += path(`M94 ${GROUND}L114 160H286L306 ${GROUND}Z`, join_(fill(CLOTH), sw(2.5)));
    s += path(`M104 ${GROUND - 6}L121 166H279L296 ${GROUND - 6}`, join_(stroke(GOLD), sw(1.5)));
    // satin ribbon joining the crowns at their backs
    s += path('M158 197C172 184 186 180 200 180C214 180 228 184 242 197L238 202C226 190 213 186 200 186C187 186 174 190 162 202Z', join_(fill(LIGHT), sw(2)));
    const crown = (cx, cy) => {
      let c = ellipse(cx, cy, 44, 24, join_(stroke(GOLD_PALE), sw(10)));
      c += ellipse(cx, cy, 49, 29, sw(2)) + ellipse(cx, cy, 39, 19, sw(2));
      const n = 14;
      for (let k = 0; k < n; k++) {
        const th = (k * 2 * Math.PI) / n + 0.1;
        const x = cx + 44 * Math.cos(th);
        const y = cy + 24 * Math.sin(th);
        let f = '';
        for (let p = 0; p < 5; p++) {
          const a = (p * 2 * Math.PI) / 5 - Math.PI / 2;
          f += circle(x + 3.3 * Math.cos(a), y + 3.3 * Math.sin(a), 2.6, join_(fill(LIGHT), sw(1.2)));
        }
        f += circle(x, y, 1.8, join_(fill(GOLD_MID), 'stroke="none"'));
        c += f;
      }
      return c;
    };
    s += crown(144, 218);
    s += crown(256, 218);
    return s;
  },
};

subjects.unction = {
  title: 'A shallow bowl of wheat with seven thin lit tapers standing in it, and a small vessel of oil beside it',
  body() {
    let s = ground(100, 310);
    const cx = 182;
    s += path(`M${cx - 22} ${GROUND - 1}Q${cx - 18} 250 ${cx - 6} 246H${cx + 6}Q${cx + 18} 250 ${cx + 22} ${GROUND - 1}Z`, join_(fill(GOLD_PALE), sw(2.5)));
    s += path(bowlPath(cx, 204, 72, 14, 42), join_(fill(GOLD_PALE)));
    s += ellipse(cx, 204, 72, 14, join_(fill(GOLD_PALE)));
    s += path(`M${cx - 64} 204Q${cx} 178 ${cx + 64} 204A64 10 0 0 1 ${cx - 64} 204Z`, join_(fill(IVORY), sw(2)));
    for (let i = 0; i < 26; i++) {
      const x = cx - 52 + ((i * 37) % 104);
      const y = 200 - ((i * 13) % 12) + Math.abs(x - cx) * 0.08;
      s += ellipse(x, y, 2.4, 1.4, join_(fill(GOLD_MID), 'stroke="none"', `transform="rotate(${(i * 47) % 180} ${r2(x)} ${r2(y)})"`));
    }
    // seven tapers set in a ring in the wheat, back ones first
    const ring = Array.from({ length: 7 }, (_, k) => -Math.PI / 2 + (k * 2 * Math.PI) / 7)
      .map((th) => [cx + 46 * Math.cos(th), 199 + 8 * Math.sin(th)])
      .sort((a, b) => a[1] - b[1]);
    for (const [x, base] of ring) s += taper(x, base, 70, { w: 5 });
    // oil vessel
    const ox = 282;
    s += path(`M${ox - 14} ${GROUND - 1}H${ox + 14}L${ox + 10} ${GROUND - 6}H${ox - 10}Z`, join_(fill(GOLD_PALE), sw(2)));
    s += path(`M${ox - 5} 204C${ox - 6} 214 ${ox - 22} 220 ${ox - 22} 236C${ox - 22} 250 ${ox - 12} 256 ${ox} 256C${ox + 12} 256 ${ox + 22} 250 ${ox + 22} 236C${ox + 22} 220 ${ox + 6} 214 ${ox + 5} 204Z`, join_(fill(GOLD_PALE), sw(2.5)));
    s += path(`M${ox - 19} 232Q${ox} 240 ${ox + 19} 232`, sw(1.5));
    s += ellipse(ox, 202, 8, 2.5, join_(fill(GOLD_PALE), sw(2.5)));
    s += path(`M${ox - 4} 200V192Q${ox} 188 ${ox + 4} 192V200`, join_(fill(GOLD_MID), sw(2)));
    return s;
  },
};

subjects['house-blessing'] = {
  title: 'A simple house with a cross above its door, and a bowl of holy water with a sprig of basil in front',
  body() {
    let s = ground(96, 304);
    const cx = 178;
    const base = GROUND;
    s += rect(cx - 62, 164, 124, base - 164, fill(LIGHT));
    s += path(`M${cx - 76} 168L${cx} 104L${cx + 76} 168`, '');
    s += path(`M${cx - 62} 164V156L${cx} 110L${cx + 62} 156V164`, fill(LIGHT));
    s += path(`M${cx - 76} 168L${cx} 104L${cx + 76} 168`, '');
    s += rect(cx + 30, 112, 14, 30, fill(LIGHT));
    s += path(arch(cx - 13, cx + 13, 212, base), join_(fill(CLOTH), sw(2.5)));
    s += circle(cx + 7, 240, 1.6, join_(fill(INK), 'stroke="none"'));
    s += byzantineCross(cx, 194, 9, INK);
    for (const x of [cx - 40, cx + 40]) {
      s += path(arch(x - 12, x + 12, 188, 226), join_(fill(CLOTH), sw(2)));
      s += line(x, 188, x, 226, sw(1.5)) + line(x - 12, 210, x + 12, 210, sw(1.5));
    }
    s += circle(cx, 140, 8, join_(fill(CLOTH), sw(2)));
    // bowl with basil
    const bx = 272;
    s += path(`M${bx - 12} ${base - 1}H${bx + 12}L${bx + 8} ${base - 6}H${bx - 8}Z`, join_(fill(GOLD_PALE), sw(2)));
    s += path(bowlPath(bx, 236, 28, 6, 22), join_(fill(GOLD_PALE), sw(2.5)));
    s += line(bx + 4, 236, bx + 22, 172, sw(2));
    const leaf = (x, y, ang) =>
      path(`M0 0Q5 -6 13 0Q5 6 0 0Z`, join_(fill(LIGHT), sw(1.6), `transform="translate(${r2(x)} ${r2(y)}) rotate(${ang})"`));
    for (const [t, side] of [[0.25, 1], [0.38, -1], [0.52, 1], [0.66, -1], [0.8, 1]]) {
      const x = bx + 4 + 18 * t;
      const y = 236 - 64 * t;
      s += leaf(x, y, side > 0 ? -20 : -160);
    }
    s += leaf(bx + 22, 172, -75);
    s += ellipse(bx, 236, 28, 6, join_(fill(LIGHT), sw(2.5)));
    s += path(`M${bx - 16} 236Q${bx - 8} 233 ${bx} 236`, join_(stroke(GOLD), sw(1.2)));
    s += line(bx + 4, 236, bx + 7, 225, sw(2));
    return s;
  },
};

subjects.memorial = {
  title: 'A bowl of kollyva shaped into a mound and decorated with a cross, with one lit taper beside it',
  body() {
    let s = ground(100, 310);
    const cx = 182;
    s += path(`M${cx - 26} ${GROUND - 1}Q${cx - 22} 248 ${cx - 8} 244H${cx + 8}Q${cx + 22} 248 ${cx + 26} ${GROUND - 1}Z`, join_(fill(GOLD_PALE), sw(2.5)));
    s += path(bowlPath(cx, 210, 76, 15, 36), join_(fill(GOLD_PALE)));
    s += ellipse(cx, 210, 76, 15, join_(fill(GOLD_PALE)));
    s += path(`M${cx - 68} 210C${cx - 62} 182 ${cx - 40} 166 ${cx} 166C${cx + 40} 166 ${cx + 62} 182 ${cx + 68} 210A68 11 0 0 1 ${cx - 68} 210Z`, join_(fill(IVORY), sw(2.5)));
    for (let i = 0; i < 40; i++) {
      const x = cx - 54 + ((i * 41) % 108);
      const top = 210 - 40 * Math.sqrt(Math.max(0, 1 - ((x - cx) / 66) ** 2));
      const y = top + 6 + ((i * 17) % 30) * ((206 - top - 6) / 30);
      s += circle(x, y, 0.9, join_(fill(GOLD_MID), 'stroke="none"'));
    }
    s += g(byzantineCross(0, 0, 20, GOLD_PALE, INK, 1.6), `transform="translate(${cx} 188) scale(1 0.62)"`);
    for (let k = 0; k < 11; k++) {
      const x = cx - 55 + k * 11;
      const y = 211 - 4 * Math.sin((k / 10) * Math.PI);
      s += ellipse(x, y, 4, 2.3, join_(fill(GOLD_MID), sw(1.2)));
    }
    s += candlestick(282, 64);
    return s;
  },
};

subjects.counseling = {
  title: 'Two chairs turned toward each other beside a small table with a lit taper, a quiet place to talk',
  body() {
    let s = ground(84, 316);
    const chair = () => {
      let c = '';
      // far legs and back post (depth offset)
      c += line(120, 206, 118, GROUND - 6, join_(sw(2.5), 'stroke-opacity="0.75"'));
      c += line(170, 206, 172, GROUND - 6, join_(sw(2.5), 'stroke-opacity="0.75"'));
      c += path('M119 206L116 136', join_(sw(2.5)));
      // back panel
      c += path('M107 144L116 136L119 200L110 210Z', join_(fill(CLOTH), sw(2.5)));
      c += path('M104 140Q110 134 119 132', sw(2.5));
      // seat
      c += path('M110 212L120 204H172L162 212Z', join_(fill(CLOTH), sw(2.5)));
      c += rect(110, 212, 52, 7, join_(fill(LIGHT), sw(2.5)));
      // near legs
      c += line(112, 219, 110, GROUND) + line(160, 219, 162, GROUND);
      c += path('M107 144L110 212', sw(3));
      return c;
    };
    s += chair();
    s += g(chair(), 'transform="translate(400 0) scale(-1 1)"');
    s += sideTable(200, 198, 26);
    s += taper(200, 192, 44, { w: 6 });
    s += path('M190 197Q200 190 210 197', join_(fill(GOLD_PALE), sw(2)));
    return s;
  },
};

subjects.moleben = {
  title: 'An icon with a golden halo on an analogion, a lit taper on a candlestick and a small bowl of water on a table',
  body() {
    let s = ground(88, 312);
    const cx = 200;
    s += analogion(cx, 160, { clothCross: false });
    s += iconPanel(cx - 30, cx + 30, 72, 152);
    s += candlestick(118, 66);
    s += sideTable(282, 216, 22);
    s += path(bowlPath(282, 204, 16, 4, 11), join_(fill(GOLD_PALE), sw(2.2)));
    s += ellipse(282, 204, 16, 4, join_(fill(LIGHT), sw(2.2)));
    s += path('M276 214L274 216H290L288 214', sw(2));
    return s;
  },
};

subjects['commemoration-note'] = {
  title: 'A commemoration note: a slip of paper with a small Byzantine cross and ruled lines, with a pen beside it',
  body() {
    let s = '';
    const paper = (dx = 0, dy = 0) => `M${142 + dx} ${66 + dy}H${256 + dx}V${246 + dy}H${142 + dx}Z`;
    s += path(paper(5, 5), join_(fill(GOLD_PALE), 'fill-opacity="0.45"', 'stroke="none"', 'transform="rotate(-5 200 156)"'));
    let inner = path(paper(), join_(fill('#fffdf8'), sw(2.5)));
    inner += byzantineCross(199, 94, 11, INK);
    for (let k = 0; k < 5; k++) inner += line(158, 128 + k * 22, 240, 128 + k * 22, join_(sw(1.5), 'stroke-opacity="0.55"'));
    s += g(inner, 'transform="rotate(-5 200 156)"');
    // pen
    s += g(
      path('M0 0L6 -10H14V-110H-14V-10H-6Z', 'stroke="none"') +
        path('M-6 -10L0 0L6 -10', join_(fill(GOLD_MID), sw(2))) +
        rect(-6, -112, 12, 102, join_(fill(LIGHT), sw(2.5))) +
        rect(-6, -36, 12, 10, join_(fill(GOLD_PALE), sw(2))) +
        path('M-3 -104V-60', join_(stroke(GOLD), sw(1.5))),
      'transform="translate(268 254) rotate(16)"',
    );
    return s;
  },
};

/* ---------- write ---------- */

mkdirSync(OUT, { recursive: true });
for (const [name, { title, body }] of Object.entries(subjects)) {
  writeFileSync(join(OUT, `${name}.svg`), frame(name, title, body()));
}
writeFileSync(
  join(OUT, 'README.txt'),
  'Original placeholder drawings generated by scripts/build-illustrations.mjs (run: node scripts/build-illustrations.mjs).\n' +
    'They are free to use and free to replace with your parish\'s own photographs or artwork.\n',
);
console.log(`Wrote ${Object.keys(subjects).length} illustrations to ${OUT}`);
