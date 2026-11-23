#!/usr/bin/env node
/**
 * Build kiot-icon-sheet.png — pictograms (inline SVG) + illustrations.
 * Usage: node scripts/icon-sheet.mjs [baseUrl] [outPng]
 */
import { readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const base = (process.argv[2] || 'http://127.0.0.1:4328').replace(/\/$/, '');
const out = process.argv[3] || join('/opt/cursor/artifacts', 'kiot-icon-sheet.png');

const pictograms = {
  church: `<path d="M12 1.1v2.6M10.7 2.4h2.6" stroke-width="1.35"/><path d="M8.1 9.4A3.9 5.5 0 0 1 15.9 9.4"/><path d="M8.1 9.4v2.6h7.8V9.4"/><path d="M10.2 10.2v1M12 10.2v1M13.8 10.2v1" stroke-width="1.2"/><path d="M4.2 21V13.2q0-1.8 3.9-1.8M19.8 21V13.2q0-1.8-3.9-1.8"/><path d="M8.1 12h7.8"/><path d="M10.1 21v-3a1.9 1.9 0 0 1 3.8 0V21"/><path d="M6.2 16.2v1.5M17.8 16.2v1.5" stroke-width="1.2"/><path d="M2.6 21h18.8"/>`,
  chalice: `<path d="M6.8 3.2h10.4v2.4a5.2 5.2 0 0 1-10.4 0Z"/><path d="M12 10.8v6.2"/><circle cx="12" cy="13.4" r="1.1"/><path d="M8.4 20.6h7.2M9.6 20.6q2.4-3.8 4.8 0"/><path d="M12 4.5v2.8M10.6 5.9h2.8" stroke-width="1.25"/>`,
  censer: `<path d="M8.2 2.4h7.6M8.2 2.4l1.3 8.4M15.8 2.4l-1.3 8.4M12 2.4v5.4"/><path d="M12 7.2v-1.8M11.1 6.3h1.8" stroke-width="1.2"/><path d="M8.4 11.2a3.6 3 0 0 1 7.2 0"/><path d="M6.8 11.2h10.4a5.2 5.2 0 0 1-10.4 0Z"/><path d="M10.2 18.2h3.6l1 2.4H9.2Z"/>`,
  candle: `<path d="M12 2.4c1.7 2 1.7 3.5 0 4.7c-1.7-1.2-1.7-2.7 0-4.7Z" fill="currentColor" fill-opacity="0.18"/><path d="M10.85 8.4h2.3v9.2h-2.3Z"/><path d="M7.6 17.6h8.8M9 17.6v.8a3 1.6 0 0 0 6 0V17.6"/><path d="M12 19.8v1.2M8 21h8"/>`,
  gospel: `<rect x="5" y="2.8" width="14" height="18.4" rx="1.4"/><path d="M12 8.4v7.2M8.4 12h7.2"/><circle cx="7.6" cy="5.4" r=".7" fill="currentColor"/><circle cx="16.4" cy="5.4" r=".7" fill="currentColor"/><circle cx="7.6" cy="18.6" r=".7" fill="currentColor"/><circle cx="16.4" cy="18.6" r=".7" fill="currentColor"/>`,
  'icon-frame': `<path d="M12 1.2v2.4M10.9 2.4h2.2" stroke-width="1.2"/><path d="M4.6 21.4V11a7.4 7.4 0 0 1 14.8 0v10.4Z"/><path d="M7.4 18.8V11.2a4.6 4.6 0 0 1 9.2 0v7.6Z"/><circle cx="12" cy="11.4" r="2.3"/>`,
  bells: `<path d="M12 1.2v1.8M11 2.1h2" stroke-width="1.2"/><path d="M9.2 6.2A2.8 3.2 0 0 1 14.8 6.2"/><path d="M9.2 6.2v1.6h5.6V6.2"/><path d="M3.6 21.2V9.4a8.4 8.4 0 0 1 16.8 0v11.8"/><path d="M12 9.2c-2.4 0-3.4 1.9-3.4 4.3v2.5l-1.2 1.7h9.2l-1.2-1.7v-2.5c0-2.4-1-4.3-3.4-4.3Z"/><circle cx="12" cy="17.6" r=".9"/><path d="M2.4 21.2h19.2"/>`,
  'prayer-rope': (() => {
    const knots = Array.from({ length: 12 }, (_, i) => {
      const a = (i / 12) * Math.PI * 2 + Math.PI / 12;
      return { x: 12 + Math.sin(a) * 6, y: 8.6 - Math.cos(a) * 6 };
    }).filter((k) => k.y < 14);
    return (
      knots.map((k) => `<circle cx="${k.x.toFixed(2)}" cy="${k.y.toFixed(2)}" r="1.05" fill="currentColor" stroke="none"/>`).join('') +
      `<path d="M6.4 11.4Q8 15 12 14.6Q16 15 17.6 11.4" stroke-dasharray="0.1 2.2"/><path d="M12 14.6v4.4M10.4 16.4h3.2"/><path d="M11.2 19.4l-.7 2.4M12 19.4v2.6M12.8 19.4l.7 2.4" stroke-width="1.2"/>`
    );
  })(),
  cross: `<g transform="translate(12 12) scale(.18)" fill="currentColor" stroke="none"><g><path d="M-5.2 -7 L-8.6 -36 Q0 -39.5 8.6 -36 L5.2 -7 Z"/><circle cx="0" cy="-43" r="4.6"/></g><g transform="rotate(90)"><path d="M-5.2 -7 L-8.6 -36 Q0 -39.5 8.6 -36 L5.2 -7 Z"/><circle cx="0" cy="-43" r="4.6"/></g><g transform="rotate(180)"><path d="M-5.2 -7 L-8.6 -36 Q0 -39.5 8.6 -36 L5.2 -7 Z"/><circle cx="0" cy="-43" r="4.6"/></g><g transform="rotate(270)"><path d="M-5.2 -7 L-8.6 -36 Q0 -39.5 8.6 -36 L5.2 -7 Z"/><circle cx="0" cy="-43" r="4.6"/></g><rect x="-7.5" y="-7.5" width="15" height="15"/></g>`,
};

const illDir = join(root, 'public/images/illustrations');
const ill = readdirSync(illDir).filter((f) => f.endsWith('.svg')).sort();

const picHtml = Object.entries(pictograms)
  .map(
    ([name, paths]) => `
  <div class="pic" title="${name}">
    <svg viewBox="0 0 24 24" fill="none" stroke="#561524" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>
    <span>${name}</span>
  </div>`,
  )
  .join('');

const illHtml = ill
  .map(
    (f) => `
  <div class="card">
    <img src="${base}/images/illustrations/${f}" alt="${f}" width="160" height="160" />
    <span>${f.replace(/\.svg$/, '')}</span>
  </div>`,
  )
  .join('');

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/>
<title>Kiot — Orthodox symbols &amp; illustrations</title>
<style>
  body{margin:0;padding:28px 32px 48px;font:14px/1.4 Literata,Georgia,serif;background:#f7f1e6;color:#3a1a22}
  h1{font:600 22px/1.2 "GFS Didot",Georgia,serif;margin:0 0 8px;color:#561524}
  p{margin:0 0 22px;color:#6a4a3a}
  h2{font:600 15px/1.2 "GFS Didot",Georgia,serif;margin:28px 0 12px;color:#561524}
  .row{display:flex;flex-wrap:wrap;gap:14px}
  .pic{display:flex;flex-direction:column;align-items:center;gap:8px;width:88px}
  .pic svg{width:64px;height:64px;padding:12px;background:#fffdf8;border:1px solid #e0d2b8;border-radius:8px;box-sizing:border-box}
  .pic span,.card span{font-size:11px;text-align:center;color:#6a4a3a}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:16px}
  .card{display:flex;flex-direction:column;align-items:center;gap:8px}
  .card img{width:140px;height:140px;object-fit:contain;background:#fffdf8;border:1px solid #e0d2b8;border-radius:8px;padding:8px;box-sizing:border-box}
</style></head><body>
<h1>Kiot — Orthodox symbols &amp; illustrations</h1>
<p>Greek Orthodox forms: rounded Byzantine domes, Greek/Byzantine cross. Pictograms above; illustrations below.</p>
<h2>Pictograms</h2>
<div class="row">${picHtml}</div>
<h2>Illustrations</h2>
<div class="grid">${illHtml}</div>
</body></html>`;

const tmp = '/tmp/kiot-icon-sheet.html';
writeFileSync(tmp, html);
mkdirSync(dirname(out), { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || undefined,
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1280, height: 1600 } });
await page.goto(`file://${tmp}`, { waitUntil: 'networkidle' });
// Wait for illustration images from preview server
await page.waitForFunction(() => [...document.images].every((img) => img.complete && img.naturalWidth > 0), null, { timeout: 20000 });
await page.screenshot({ path: out, fullPage: true });
await browser.close();
console.log(`Wrote ${out}`);
