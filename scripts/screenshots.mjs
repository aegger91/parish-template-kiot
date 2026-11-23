// Captures desktop (1440) and mobile (390) screenshots of key pages from a running server.
// Usage: node scripts/screenshots.mjs http://127.0.0.1:4328 [outDir]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const [, , base = 'http://127.0.0.1:4328', out = 'screenshots'] = process.argv;
mkdirSync(out, { recursive: true });

const shots = [
  ['home-en', '/en/'],
  ['home-el', '/el/'],
  ['schedule-weekly', '/en/services/'],
  ['schedule-monthly', '/en/services/?view=month'],
  ['donate', '/en/donate/'],
  ['our-parish-clergy', '/en/our-parish/clergy/'],
  ['store', '/en/store/'],
  ['store-product', '/en/store/christ-pantocrator-icon/'],
  ['store-cart', '/en/store/cart/', 'cart'],
  ['store-checkout', '/en/store/checkout/', 'cart'],
  ['request-a-service', '/en/services/request-a-service/'],
  ['zapiski-and-candles', '/en/services/commemorations-and-candles/'],
  ['get-involved-events', '/en/get-involved/events/'],
  ['get-involved-events-calendar', '/en/get-involved/events/?view=calendar'],
  ['get-involved-volunteer', '/en/get-involved/volunteer/'],
];
const sizes = { desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } };

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });
for (const [size, viewport] of Object.entries(sizes)) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: size === 'mobile' ? 2 : 1 });
  const page = await ctx.newPage();
  for (const [name, path, setup] of shots) {
    if (setup === 'cart' && !(await page.evaluate(() => localStorage.getItem('kiot-cart-v1')?.length > 2).catch(() => false))) {
      await page.goto(base + '/en/store/christ-pantocrator-icon/', { waitUntil: 'networkidle' });
      await page.click('[data-add]');
      await page.goto(base + '/en/store/beeswax-tapers/', { waitUntil: 'networkidle' });
      await page.click('[data-add]');
    }
    await page.goto(base + path, { waitUntil: 'networkidle' });
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 400) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 50));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${out}/${name}-${size}.png`, fullPage: true });
    console.log(`${name}-${size}.png`);
  }
  await ctx.close();
}
await browser.close();
