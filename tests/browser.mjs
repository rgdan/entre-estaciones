import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { chromium } from "playwright";
import { createRequire } from "node:module";

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
const checkLayout = async () => {
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    `Overflow at ${page.viewportSize().width}px`,
  );
  const controls = await page
    .locator("#journey-form input, #journey-form select, #journey-form button")
    .evaluateAll((elements) =>
      elements.map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          id: element.id || element.className,
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom,
        };
      }),
    );
  for (let i = 0; i < controls.length; i++)
    for (let j = i + 1; j < controls.length; j++) {
      const a = controls[i],
        b = controls[j];
      assert.ok(
        !(
          a.left < b.right &&
          a.right > b.left &&
          a.top < b.bottom &&
          a.bottom > b.top
        ),
        `Overlapping controls: ${a.id}, ${b.id}`,
      );
    }
};
const axe = async () => {
  await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
  const result = await page.evaluate(async () =>
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
  await page.goto(`${base}/?date=2026-11-09&time=06:00`);
  await page.locator(".board-time").first().waitFor();
  assert.equal(
    await page.locator(".board-time").first().textContent(),
    "06:01",
  );
  await page.locator("#more-departures .departure-row").first().click();
  assert.match(await page.locator("#service-label").textContent(), /06:11/);
  await page.locator(".board-button").click();
  assert.match(await page.locator("#service-label").textContent(), /06:01/);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'stops-title');
  await page.locator("#full-schedule summary").click();
  assert.equal(
    await page.locator("#all-departures .departure-row").count(),
    23,
  );
  await page.locator("#all-departures .departure-row").last().click();
  assert.match(await page.locator("#service-label").textContent(), /20:01/);
  await page.locator("#full-schedule summary").click();
  await page.locator("#swap").click();
  assert.equal(await page.locator("#from").inputValue(), "atlantico");
  assert.equal(await page.locator("#to").inputValue(), "heredia");
  await page.locator("#swap").click();
  await page.locator('input[name="endpoint"][value="to"]').check();
  await page.locator("#toggle-stations").click();
  assert.equal(await page.locator("#station-diagram li").count(), 13);
  await page
    .getByRole("button", { name: "Ulatina Sin hora", exact: true })
    .click();
  assert.equal(await page.locator("#to").inputValue(), "ulatina");
  assert.equal(
    await page.locator(".board-time").first().textContent(),
    "06:35",
  );
  await page.locator("#toggle-stations").click();
  assert.equal(await page.locator("#station-diagram li").count(), 8);
  assert.match(
    await page.locator(".board-top").textContent(),
    /Desde las 06:00/,
  );
  await page.locator("#from").selectOption("hospital");
  assert.match(
    await page.locator("#board").textContent(),
    /no tiene un tren directo/,
  );
  await page.locator("#from").selectOption("ulatina");
  assert.match(
    await page.locator("#board").textContent(),
    /dos estaciones distintas/,
  );

  for (const route of ["heredia", "cartago", "belen"]) {
    await page.locator(`[data-route="${route}"]`).click();
    assert.ok(await page.locator(".board-time").count());
    await page.locator("#swap").click();
    assert.ok(await page.locator(".board-time").count());
    await page.locator("#swap").click();
    await page.locator("#date").fill("2026-11-07");
    await page.locator("#journey-form").dispatchEvent("submit");
    assert.match(await page.locator("#board").textContent(), /fin de semana/);
    assert.equal(await page.locator("#more-departures button").count(), 0);
    await page.locator("#board .solid-button").click();
    assert.equal(await page.locator("#date").inputValue(), "2026-11-09");
    assert.equal(await page.locator("#after").inputValue(), "00:00");
    await page.locator("#after").fill("23:59");
    await page.locator(".search-button").click();
    assert.match(await page.locator("#board").textContent(), /último tren/);
    await page.locator("#after").fill("06:00");
    await page.locator(".search-button").click();
  }
  await page.locator('[data-route="heredia"]').click();
  await page.locator("#share").click();
  await page
    .getByText("Enlace del viaje copiado. Incluye estaciones, fecha y hora.", {
      exact: true,
    })
    .waitFor();
  assert.match(await page.locator("#search-status").textContent(), /copiado/);
  const shared = await page.evaluate(() => navigator.clipboard.readText());
  assert.equal(new URL(shared).searchParams.get("route"), "heredia");
  await page.goto(shared);
  await page.locator(".board-time").first().waitFor();
  assert.equal(await page.locator("#from").inputValue(), "heredia");
  await page.locator("#date").fill("");
  await page.locator("#date").dispatchEvent("change");
  assert.match(await page.locator("#board").textContent(), /Revisá la fecha/);
  await page.locator("#use-now").click();
  assert.ok(await page.locator("#date").inputValue());

  for (const theme of ["light", "dark"]) {
    for (const width of [320, 390, 768, 1024, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${base}/?date=2026-11-09&time=06:00`);
      await page.locator(".board-time").first().waitFor();
      if ((await page.locator("html").getAttribute("data-theme")) !== theme)
        await page.locator(".theme-toggle").click();
      await checkLayout();
      if ([390, 1440].includes(width)) {
        await axe();
        await page.screenshot({
          path: `.shots/${theme}-${width}.png`,
          fullPage: true,
        });
        for (const route of ["cartago", "belen"]) {
          await page.locator(`[data-route="${route}"]`).click();
          await checkLayout();
          await axe();
        }
      }
    }
    for (const path of ["/fuentes.html", "/404.html"]) {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`${base}${path}`);
      await checkLayout();
      await axe();
      await page.screenshot({
        path: `.shots/${theme}-${path.slice(1, -5)}.png`,
        fullPage: true,
      });
    }
  }

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`${base}/?date=2026-11-09&time=06:00`);
  await page.locator(".board-time").first().waitFor();
  assert.equal(await page.locator("h1").isVisible(), true);
  await page.keyboard.press("Tab");
  assert.equal(
    await page.evaluate(() => document.activeElement.className),
    "skip-link",
  );
  for (let i = 0; i < 18; i++) {
    assert.ok(
      await page.evaluate(
        () => getComputedStyle(document.activeElement).outlineStyle !== "none",
      ),
      await page.evaluate(() => document.activeElement.outerHTML),
    );
    await page.keyboard.press("Tab");
  }
  assert.equal(
    await page
      .locator('a[href^="#"]')
      .evaluateAll(
        (links) =>
          links.filter((link) => !document.getElementById(link.hash.slice(1)))
            .length,
      ),
    0,
  );
  await page.screenshot({ path: ".shots/reduced-motion.png", fullPage: true });

  const failedMap = await context.newPage();
  await failedMap.route("https://cdnjs.cloudflare.com/**", (route) =>
    route.abort(),
  );
  await failedMap.goto(`${base}/?date=2026-11-09&time=06:00`);
  await failedMap.locator("#geographic-map summary").click();
  await failedMap
    .getByText("No pudimos cargar el mapa.", { exact: false })
    .waitFor();
  assert.equal(
    await failedMap.locator(".board-time").first().textContent(),
    "06:01",
  );
  await failedMap.close();

  const failedData = await context.newPage();
  await failedData.route("**/data/schedules.mjs", (route) => route.abort());
  await failedData.goto(base);
  await failedData
    .getByText("No pudimos cargar los horarios.", { exact: true })
    .waitFor();
  assert.equal(
    await failedData.locator("#departures-section").getAttribute("aria-busy"),
    "false",
  );
  await failedData.close();

  const noScript = await browser.newContext({ javaScriptEnabled: false });
  const plain = await noScript.newPage();
  await plain.goto(`${base}/fuentes.html`);
  assert.equal(await plain.locator(".source-list a").count(), 5);
  await noScript.close();
  assert.deepEqual(errors, []);
  console.log(
    "PASS: all corridors and directions; trip/station selection; full schedules; weekend, late, same-station, no-direct and invalid searches; share/reload; live-time reset; light/dark at 320–1920px; no overlapping form controls; WCAG AA axe checks; keyboard and reduced motion; unavailable map/data; no-JS source page.",
  );
} finally {
  await browser.close();
}
