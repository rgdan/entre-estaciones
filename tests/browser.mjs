import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import { chromium } from "playwright";
const require = createRequire(import.meta.url);
const base = process.env.TEST_URL || "http://127.0.0.1:4173";
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
});
const context = await browser.newContext({
  locale: "es-CR",
  permissions: ["clipboard-read", "clipboard-write"],
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
await fs.mkdir(".shots", { recursive: true });
const url = `${base}/?from=heredia&to=cartago&date=2026-11-09&time=06:00`;
const loaded = async () => page.locator(".departure-row").first().waitFor();
const layout = async () =>
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
const axe = async () => {
  await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
  const result = await page.evaluate(() =>
    window.axe.run(document, {
      runOnly: {
        type: "tag",
        values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
      },
    }),
  );
  assert.deepEqual(
    result.violations.map((item) => ({
      id: item.id,
      nodes: item.nodes.map((node) => node.target),
    })),
    [],
  );
};
try {
  await page.goto(url);
  await loaded();
  assert.equal(await page.locator("[data-route]").count(), 0);
  assert.equal(await page.locator("#from option").count(), 34);
  assert.equal(await page.locator("#to option").count(), 34);
  assert.equal(await page.locator('input[type="time"]').count(), 0);
  assert.equal(
    await page.locator("#after, #use-now, .search-button").count(),
    0,
  );
  assert.equal(
    await page.locator("#more-departures .departure-row").count(),
    6,
  );
  assert.equal(
    await page.locator("#journey-details").getAttribute("open"),
    null,
  );
  assert.ok(
    await page.evaluate(
      () =>
        document.querySelector(".planner").getBoundingClientRect().bottom <=
        document.querySelector(".departures").getBoundingClientRect().top,
    ),
  );
  assert.ok(
    await page.evaluate(() =>
      Boolean(
        document
          .querySelector(".departures")
          .compareDocumentPosition(document.querySelector(".network-map")) &
        Node.DOCUMENT_POSITION_FOLLOWING,
      ),
    ),
  );
  const firstJourney = await page
    .locator(".departure-row")
    .first()
    .textContent();
  assert.match(firstJourney, /07:28/);
  assert.match(firstJourney, /transbordo/);
  await page.locator(".departure-row").first().click();
  assert.ok(await page.locator(".transfer-stop").isVisible());
  assert.equal(
    await page.evaluate(() => document.activeElement.id),
    "stops-title",
  );
  await page.locator("#full-schedule summary").click();
  await page.locator("#all-departures button").last().click();
  assert.ok(await page.locator("#service-label").textContent());
  await page.locator("#full-schedule summary").click();
  await page.locator("#swap").click();
  assert.equal(await page.locator("#from").inputValue(), "cartago");
  assert.equal(await page.locator("#to").inputValue(), "heredia");
  await page.locator("#from").selectOption("hospital");
  await page.locator("#to").selectOption("ulatina");
  assert.ok(await page.locator(".departure-row").count());
  await page.locator("#to").selectOption("hospital");
  assert.match(await page.locator("#board").textContent(), /dos estaciones/);
  await page.locator("#to").selectOption("cartago");
  await page.locator("#date").fill("2026-11-07");
  assert.match(await page.locator("#board").textContent(), /fin de semana/);
  await page.locator("#board .solid-button").click();
  assert.equal(await page.locator("#date").inputValue(), "2026-11-09");
  await page.goto(
    `${base}/?from=heredia&to=cartago&date=2026-11-09&time=23:59`,
  );
  await loaded();
  assert.equal(
    await page.locator(".departure-row").first().textContent(),
    firstJourney,
  );
  assert.equal(new URL(page.url()).searchParams.has("time"), false);
  await page.locator("#from").selectOption("hospital");
  await page.locator("#share").click();
  await page
    .getByText("Enlace del viaje copiado.", {
      exact: true,
    })
    .waitFor();
  const shared = await page.evaluate(() => navigator.clipboard.readText());
  assert.equal(new URL(shared).searchParams.has("route"), false);
  assert.equal(new URL(shared).searchParams.has("time"), false);
  await page.goto(shared);
  await loaded();
  assert.equal(await page.locator("#from").inputValue(), "hospital");
  assert.ok(await page.locator("#date").inputValue());

  await page.goto(url);
  await loaded();
  await page.locator(".leaflet-marker-icon").last().waitFor({ timeout: 25000 });
  assert.equal(await page.locator(".leaflet-marker-icon").count(), 34);
  assert.equal(await page.locator("#map").isVisible(), true);
  await page.locator('.leaflet-marker-icon[title="Estación Belén"]').click();
  await page
    .getByRole("button", { name: "Usar como origen", exact: true })
    .click();
  assert.equal(await page.locator("#from").inputValue(), "belen");
  await page.locator('.leaflet-marker-icon[title="Estación Cartago"]').click();
  await page
    .locator(".leaflet-popup-content")
    .filter({ hasText: "Estación Cartago" })
    .getByRole("button", { name: "Usar como destino", exact: true })
    .click();
  assert.equal(await page.locator("#to").inputValue(), "cartago");
  assert.ok(await page.locator(".transfer-stop").count());

  for (const theme of ["light", "dark"]) {
    for (const width of [320, 390, 768, 1024, 1440, 1920]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(url);
      await loaded();
      if ((await page.locator("html").getAttribute("data-theme")) !== theme)
        await page.locator(".theme-toggle").click();
      await layout();
      if ([390, 1440].includes(width)) {
        await page
          .locator(".leaflet-marker-icon")
          .last()
          .waitFor({ timeout: 25000 });
        await axe();
        await page.screenshot({
          path: `.shots/network-${theme}-${width}.png`,
          fullPage: true,
        });
      }
    }
    for (const path of ["/fuentes.html", "/404.html"]) {
      await page.goto(`${base}${path}`);
      await layout();
      await axe();
    }
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(url);
  await loaded();
  await page.keyboard.press("Tab");
  assert.equal(
    await page.evaluate(() => document.activeElement.className),
    "skip-link",
  );
  for (let i = 0; i < 15; i++) {
    assert.ok(
      await page.evaluate(
        () => getComputedStyle(document.activeElement).outlineStyle !== "none",
      ),
      await page.evaluate(() => document.activeElement.outerHTML),
    );
    await page.keyboard.press("Tab");
  }
  const failed = await context.newPage();
  await failed.route("https://cdnjs.cloudflare.com/**", (route) =>
    route.abort(),
  );
  await failed.goto(url);
  await failed.locator("#retry-map").waitFor();
  assert.match(await failed.locator("#map-status").textContent(), /No pudimos/);
  assert.ok(await failed.locator(".departure-row").count());
  await failed.locator("#retry-map").click();
  await failed.locator("#retry-map").waitFor();
  await failed.close();
  const failedData = await context.newPage();
  await failedData.route("**/data/schedules.mjs", (route) => route.abort());
  await failedData.goto(base);
  await failedData
    .getByText("No pudimos cargar los horarios.", { exact: false })
    .waitFor();
  await failedData.close();
  assert.deepEqual(errors, []);
  console.log(
    "PASS: automatic cross-line transfers, 34 global stations, no corridor selector, detailed transfer waits, share/reload, all-network map markers and endpoint selection, weekend/late/invalid endpoints, both themes at 320–1920px, axe AA, keyboard, reduced motion, failed-map retry and failed-data fallback.",
  );
} finally {
  await browser.close();
}
