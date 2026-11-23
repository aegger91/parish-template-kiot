// Loads every built page in every language at 360/768/1280 and flags:
// page overflow, visible text with scrollWidth/Height clipping, and overlapping visible text.
import { chromium } from 'playwright';
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const base = (process.argv[2] ?? 'http://127.0.0.1:4328').replace(/\/$/, '');
const widths = [360, 768, 1280];
const dist = new URL('../dist/', import.meta.url).pathname;

function pages(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...pages(p));
    else if (name === 'index.html') out.push('/' + relative(dist, dir).split('\\').join('/') + (dir === dist ? '' : '/'));
  }
  return out;
}

const urls = pages(dist).filter((u) => u !== '/').sort();
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/local/bin/google-chrome' });
const problems = [];
let checked = 0;
let clippedW = 0;
let clippedH = 0;
let overlaps = 0;

async function check(width, list) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  let errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && !m.text().includes('favicon') && errors.push(m.text()));
  for (const u of list) {
    errors = [];
    await page.goto(base + u, { waitUntil: 'networkidle' });
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 800) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 15));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(80);
    const res = await page.evaluate(() => {
      const W = document.documentElement.clientWidth;
      const over = document.documentElement.scrollWidth - W;
      const isVisible = (el) => {
        if (el.closest('.visually-hidden, [hidden], [aria-hidden="true"]')) return false;
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
        // Closed dropdowns / drawers
        if (el.closest('.dropdown') && !el.closest('.nav-item:focus-within, .lang-menu[open], [aria-expanded="true"] + .dropdown, .nav-item:has([aria-expanded="true"]) .dropdown')) {
          const drop = el.closest('.dropdown');
          const dcs = getComputedStyle(drop);
          if (dcs.visibility === 'hidden' || Number(dcs.opacity) === 0 || dcs.pointerEvents === 'none') return false;
        }
        if (el.closest('.drawer') && !el.closest('.drawer.is-open')) return false;
        const r = el.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) return false;
        return true;
      };
      const sel = 'h1, h2, h3, h4, .btn, .nav-link, .chip-btn, .seg-btn, .logo-name, .svc-chip, .ic-title, .ic-title-btn, .feast-name, .sched-label, .panel-title, label, legend';
      const clipped = [];
      const tall = [];
      for (const el of document.querySelectorAll(sel)) {
        if (!isVisible(el)) continue;
        const cs = getComputedStyle(el);
        const text = (el.textContent || '').trim();
        if (!text) continue;
        // Intentionally truncated UI (visually clipped via absolute sr-only style)
        if (cs.position === 'absolute' && (cs.clipPath.includes('inset') || Number(cs.width) <= 1)) continue;
        if (el.scrollWidth > el.clientWidth + 2 && cs.overflowX !== 'visible' && cs.overflow !== 'visible') {
          clipped.push({ text: text.slice(0, 48), tag: el.tagName.toLowerCase() });
        }
        if (el.scrollHeight > el.clientHeight + 3 && (cs.overflowY === 'hidden' || cs.overflow === 'hidden')) {
          tall.push({ text: text.slice(0, 48), tag: el.tagName.toLowerCase() });
        }
      }
      // Overlap: only among primary visible leaf text controls in the header/main first screen
      const candidates = [...document.querySelectorAll('a.nav-link, button.nav-link, .btn, .logo-name, h1, h2')]
        .filter(isVisible)
        .map((el) => ({ el, r: el.getBoundingClientRect(), t: (el.textContent || '').trim().slice(0, 40) }))
        .filter((b) => b.r.top < innerHeight && b.r.bottom > 0 && b.r.width > 4 && b.r.height > 4);
      const overlap = [];
      for (let i = 0; i < candidates.length; i++) {
        for (let j = i + 1; j < candidates.length; j++) {
          const a = candidates[i];
          const b = candidates[j];
          if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
          const x = Math.max(0, Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left));
          const y = Math.max(0, Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top));
          if (x > 8 && y > 8) overlap.push({ a: a.t, b: b.t, area: Math.round(x * y) });
        }
      }
      return { over, clipped: clipped.slice(0, 10), tall: tall.slice(0, 10), overlap: overlap.slice(0, 8) };
    });
    checked++;
    clippedW += res.clipped.length;
    clippedH += res.tall.length;
    overlaps += res.overlap.length;
    if (res.over > 0 || res.clipped.length || res.tall.length || res.overlap.length || errors.length) {
      problems.push({ url: u, width, ...res, errors });
    }
  }
  await page.close();
}

await Promise.all(widths.map((w) => check(w, urls)));
await browser.close();
console.log(`Checked ${checked} page views (${urls.length} pages × ${widths.length} widths).`);
console.log(`Flags: width-clip=${clippedW}, height-clip=${clippedH}, overlap=${overlaps}, problemViews=${problems.length}`);
if (problems.length) {
  console.log(JSON.stringify(problems.slice(0, 30), null, 2));
  process.exit(1);
}
console.log('No overflow, clipped text, overlaps or script errors.');
