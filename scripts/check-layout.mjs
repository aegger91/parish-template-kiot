// Loads every built page in every language at five widths and reports horizontal overflow and script errors.
// Usage: npm run build && npm run preview -- --port 4328 & node scripts/check-layout.mjs http://127.0.0.1:4328
import { chromium } from 'playwright';
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const base = (process.argv[2] ?? 'http://127.0.0.1:4328').replace(/\/$/, '');
const widths = [360, 390, 768, 1280, 1440];
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
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
const problems = [];
let checked = 0;

async function check(width, list) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  let errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  for (const u of list) {
    errors = [];
    await page.goto(base + u, { waitUntil: 'networkidle' });
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 700) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 25));
      }
    });
    await page.waitForTimeout(150);
    const res = await page.evaluate(() => {
      const W = document.documentElement.clientWidth;
      const over = document.documentElement.scrollWidth - W;
      const clipped = [];
      for (const el of document.querySelectorAll('h1, h2, h3, .btn, .nav-link, .chip-btn, .seg-btn, .logo-name, label')) {
        if (el.offsetParent && !el.closest('.visually-hidden') && el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflow !== 'visible') clipped.push(el.textContent.trim().slice(0, 40));
      }
      return { over, clipped };
    });
    checked++;
    if (res.over > 0 || res.clipped.length || errors.length) problems.push({ url: u, width, ...res, errors });
  }
  await page.close();
}

await Promise.all(widths.map((w) => check(w, urls)));
await browser.close();
console.log(`Checked ${checked} page views (${urls.length} pages x ${widths.length} widths).`);
if (problems.length) {
  console.log(JSON.stringify(problems, null, 2));
  process.exit(1);
}
console.log('No horizontal overflow, clipped labels or script errors.');
