import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';
const require = createRequire(import.meta.url);
const base = process.env.TEST_URL || 'http://127.0.0.1:4173';
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined });
const context = await browser.newContext({ locale: 'es-CR' });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const url = lang => `${base}/?from=heredia&to=cartago&date=2026-11-09&time=23:59&lang=${lang}`;
const loaded = async () => page.locator('.select-journey').first().waitFor();
const axe = async () => {
  await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
  const results = await page.evaluate(() => window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } }));
  assert.deepEqual(results.violations.map(item => ({ id: item.id, nodes: item.nodes.map(node => node.target) })), []);
};
try {
  await fs.mkdir('.shots', { recursive: true });
  const englishBrowser = await browser.newContext({ locale: 'en-US' });
  const firstVisit = await englishBrowser.newPage();
  await firstVisit.goto(`${base}/?date=2026-11-09`);
  await firstVisit.locator('#language').waitFor();
  assert.equal(await firstVisit.locator('html').getAttribute('lang'), 'es');
  await englishBrowser.close();
  await page.goto(url('es'));
  await loaded();
  assert.equal((await page.locator('.wordmark').textContent()).trim(), 'entreestaciones');
  assert.equal(await page.locator('.wordmark span').count(), 0);
  assert.equal(await page.locator('.wordmark').getAttribute('href'), new URL(`${base}/`).pathname);
  assert.equal(await page.locator('#from option:not([disabled])').count(), 34);
  assert.ok(await page.locator('#clear-selection').isVisible());
  await page.locator('#clear-selection').click();
  assert.equal(await page.locator('#from').inputValue(), '');
  assert.equal(await page.locator('#to').inputValue(), '');
  assert.equal(await page.locator('#date').inputValue(), '2026-11-09');
  assert.match(await page.locator('#board').textContent(), /Elija origen y destino/);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'from');
  await page.locator('#from').selectOption('heredia');
  await page.locator('#to').selectOption('cartago');
  assert.equal(await page.locator('input[type="time"], #share, a[href="fuentes.html"]').count(), 0);
  assert.equal(await page.locator('.departure-row').count(), 6);
  assert.equal(await page.locator('#journey-details').count(), 0);
  assert.equal(new URL(page.url()).searchParams.has('time'), false);
  assert.match(await page.locator('.departure-row').first().textContent(), /07:28/);
  await page.locator('.select-journey').first().click();
  assert.equal(await page.locator('.select-journey').first().getAttribute('aria-pressed'), 'true');
  assert.match(await page.locator('.select-journey').first().textContent(), /Seleccionado/);
  assert.ok(await page.locator('.transfer-stop').isVisible());
  assert.equal(await page.evaluate(() => document.activeElement.id), 'stops-title');
  await page.locator('#language').selectOption('en');
  assert.equal(await page.locator('html').getAttribute('lang'), 'en');
  assert.match(await page.locator('.select-journey').first().textContent(), /Selected/);
  assert.match(await page.locator('.transfer-stop').textContent(), /Change at/);
  assert.match(await page.locator('footer').textContent(), /Unofficial timetable/);
  await page.locator('#clear-selection').click();
  assert.equal(await page.locator('#journey-details').count(), 0);
  assert.equal(await page.locator('.select-journey[aria-pressed="true"]').count(), 0);
  assert.equal(await page.locator('#from').inputValue(), '');
  assert.equal(await page.locator('#to').inputValue(), '');
  assert.match(await page.locator('#board').textContent(), /Choose your origin/);
  await axe();
  await page.reload();
  await page.locator('#clear-selection').waitFor();
  assert.equal(await page.locator('#from').inputValue(), '');
  assert.equal(await page.locator('#to').inputValue(), '');
  await page.locator('#from').selectOption('heredia');
  await page.locator('#to').selectOption('cartago');
  assert.equal(await page.locator('#language').inputValue(), 'en');
  await page.locator('#more-trains').click();
  assert.ok(await page.locator('.departure-row').count() > 6);
  await page.locator('#swap').click();
  assert.equal(await page.locator('#from').inputValue(), 'cartago');
  assert.equal(await page.locator('#to').inputValue(), 'heredia');
  assert.equal(await page.locator('#journey-details').count(), 0);
  await page.locator('#to').selectOption('cartago');
  assert.match(await page.locator('#board').textContent(), /two different/);
  await page.locator('#to').selectOption('heredia');
  await page.locator('#date').fill('2026-11-07');
  assert.match(await page.locator('#board').textContent(), /weekends/);
  await page.locator('#board button').click();
  assert.equal(await page.locator('#date').inputValue(), '2026-11-09');
  await page.locator('#date').fill('');
  assert.match(await page.locator('#board').textContent(), /Check/);
  await page.goto(url('en')); await loaded();
  await page.locator('.leaflet-marker-icon').last().waitFor();
  assert.equal(await page.locator('.leaflet-marker-icon').count(), 34);
  await page.locator('.leaflet-marker-icon[title="Belén station"]').click();
  await page.getByRole('button', { name: 'Set as origin', exact: true }).click();
  assert.equal(await page.locator('#from').inputValue(), 'belen');
  await page.locator('#language').selectOption('es');
  await page.locator('.leaflet-marker-icon[title="Estación Cartago"]').click();
  await page.getByRole('button', { name: 'Usar como destino', exact: true }).click();
  assert.equal(await page.locator('#to').inputValue(), 'cartago');

  for (const lang of ['es', 'en']) {
    for (const theme of ['light', 'dark']) {
      for (const width of [320, 390, 768, 1024, 1440, 1920]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.goto(url(lang)); await loaded();
        if (await page.locator('html').getAttribute('data-theme') !== theme) await page.locator('.theme-toggle').click();
        await page.locator('.select-journey').first().click();
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${lang}/${theme}/${width} overflow`);
        assert.ok(await page.locator('#language').evaluate(element => getComputedStyle(element).backgroundColor === getComputedStyle(document.querySelector('#from')).backgroundColor));
        if (width <= 390) {
          const size = await page.locator('#date').boundingBox();
          assert.ok(size.width <= 180 && size.height === 44);
        }
        if ([390, 1440].includes(width)) {
          await page.locator('.leaflet-marker-icon').last().waitFor();
          await axe();
          await page.screenshot({ path: `.shots/vue-${lang}-${theme}-${width}.png`, fullPage: true });
        }
      }
      await page.goto(`${base}/404.html?lang=${lang}`);
      await page.locator('.not-found').waitFor();
      assert.equal(await page.locator('.not-found a').getAttribute('href'), new URL(`${base}/`).pathname);
      await axe();
    }
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(url('es')); await loaded();
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement.className), 'skip-link');
  for (let i = 0; i < 12; i++) {
    assert.ok(await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle !== 'none'));
    await page.keyboard.press('Tab');
  }
  const failed = await context.newPage();
  await failed.route(/\/assets\/map-.*\.js$/, route => route.abort());
  await failed.goto(url('en'));
  await failed.locator('#retry-map').waitFor();
  assert.ok(await failed.locator('.select-journey').count());
  await failed.unroute(/\/assets\/map-.*\.js$/);
  await failed.locator('#retry-map').click();
  await failed.locator('.leaflet-marker-icon').last().waitFor();
  await failed.close();
  await page.goto(`${base}/?from=toString&to=__proto__&date=2026-11-09&lang=en`); await loaded();
  assert.equal(await page.locator('#from').inputValue(), 'heredia');
  assert.equal(await page.locator('#to').inputValue(), 'cartago');
  assert.deepEqual(errors, []);
  console.log('PASS: Vue planner, explicit selection, ES/EN, preferences, transfers, date-only search, map endpoints, 24 responsive layouts, axe AA, keyboard, reduced motion, map failure and URL validation.');
} finally { await browser.close(); }
