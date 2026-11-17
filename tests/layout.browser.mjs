import assert from 'node:assert/strict';

// Optional browser tooling; the static app has no installation requirement.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'msedge', headless: true });
try {
  for (const [width, height] of [[1440, 1080], [1440, 600], [981, 900], [980, 900], [900, 900], [390, 844], [320, 568], [667, 375]]) {
    const page = await browser.newPage({ viewport: { width, height } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(process.env.WEBCRT_TEST_URL || 'http://127.0.0.1:5517/');
    const stationCount = await page.evaluate(() => channels.length);
    for (let channel = 0; channel < stationCount; channel++) {
      await page.locator('#channelKnob').focus();
      await page.keyboard.press('ArrowRight');
      const geometry = await page.evaluate(() => {
        const cabinet = document.querySelector('.tv').getBoundingClientRect();
        const panel = document.querySelector('.control-panel').getBoundingClientRect();
        const screen = document.querySelector('.screen-bay').getBoundingClientRect();
        return { cabinetBottom: cabinet.bottom + scrollY, panelBottom: panel.bottom + scrollY,
          screenTop: screen.top + scrollY, scrollWidth: document.documentElement.scrollWidth,
          pageHeight: document.documentElement.scrollHeight };
      });
      assert.ok(geometry.panelBottom <= geometry.cabinetBottom + 1, JSON.stringify({ width, height, geometry }));
      assert.ok(geometry.cabinetBottom <= geometry.pageHeight + 1);
      assert.ok(geometry.scrollWidth <= width, `Horizontal overflow at ${width}`);
      await page.evaluate(() => scrollTo(0, 0));
      assert.ok(await page.locator('#crt').isVisible());
      assert.ok(geometry.screenTop >= 0, 'Screen must remain reachable at page top');
    }
    await page.locator('#channelKnob').focus();
    await page.keyboard.press('Space');
    assert.equal(await page.locator('#powerState').textContent(), 'OFF');
    await page.keyboard.press('Space');
    assert.equal(await page.locator('#powerState').textContent(), 'ON');
    assert.deepEqual(errors, []);
    console.log(`PASS ${width}x${height}: ${stationCount} channels, cabinet containment, scroll recovery, power`);
    await page.close();
  }
} finally {
  await browser.close();
}
