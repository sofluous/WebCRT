import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const channel = process.env.BROWSER_CHANNEL || 'msedge';
const browser = await chromium.launch({ channel, headless: true });
const output = process.env.WEBCRT_TEST_OUTPUT;
try {
  if (output) await mkdir(output, { recursive: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1080 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(process.env.WEBCRT_TEST_URL || 'http://127.0.0.1:5517/');
  await page.locator('#channelKnob').focus();
  const index = await page.evaluate(() => channels.findIndex(channel => channel.mode === 'archive'));
  for (let i = 0; i < index; i++) await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('#channelNumber').textContent(), '09');
  assert.deepEqual(await page.locator('#stationSelectors button').allTextContents(), ['Card', 'Drift', 'Subtitle', 'Source']);
  for (const [key, expected] of [['archiveCard', '02 / 06'], ['archiveDrift', '29'], ['archiveSource', 'Field']]) {
    await page.locator('[data-key=' + key + ']').click();
    await page.locator('#stationDial').focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('#stationValue').textContent(), expected);
  }
  await page.locator('[data-key=archiveSubtitle]').click();
  await page.locator('#stationDial').focus();
  await page.keyboard.press('ArrowLeft');
  assert.equal(await page.locator('#stationValue').textContent(), 'Off');
  await page.keyboard.press('ArrowRight');
  await page.evaluate(() => { state.runtime.archiveElapsed = 11.99; });
  await page.waitForFunction(() => state.adaptive.archiveCard === 2);
  await page.locator('[data-key=archiveCard]').click();
  await page.locator('#stationDial').focus();
  await page.keyboard.press('ArrowLeft');
  assert.ok(await page.evaluate(() => state.runtime.archiveElapsed < 2));
  assert.equal(await page.locator('#stationValue').textContent(), '02 / 06');
  await page.locator('#channelKnob').focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowLeft');
  assert.equal(await page.locator('#stationLabel').textContent(), 'Card');
  assert.equal(await page.locator('#stationValue').textContent(), '02 / 06');

  const samples = [];
  for (const [width, height] of [[1440, 1080], [390, 844], [320, 568]]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(150);
    const bounds = await page.evaluate(() => {
      const original = sceneCtx.fillText;
      const overflows = [];
      let minimumTextHeight = Infinity;
      let count = 0;
      sceneCtx.fillText = function(text, x, y, ...rest) {
        const transform = this.getTransform();
        const left = transform.a * x + transform.e;
        const right = left + this.measureText(text).width * transform.a;
        const bottom = transform.d * y + transform.f;
        const textHeight = parseFloat(this.font) * transform.d;
        minimumTextHeight = Math.min(minimumTextHeight, textHeight);
        if (left < 0 || right > sceneCanvas.width || bottom > sceneCanvas.height) overflows.push({ text, left, right, bottom });
        count++;
        return original.call(this, text, x, y, ...rest);
      };
      const saved = { ...state.adaptive };
      try {
        for (let source = 0; source < 3; source++) for (let card = 0; card < 6; card++) {
          state.adaptive.archiveSource = source; state.adaptive.archiveCard = card;
          renderChannelScene({ sceneCtx, state, channel: channels[state.channel], width: sceneCanvas.width, height: sceneCanvas.height, time: 1 });
        }
      } finally { sceneCtx.fillText = original; Object.assign(state.adaptive, saved); }
      return { viewport: [innerWidth, innerHeight], canvas: [sceneCanvas.width, sceneCanvas.height], count, minimumTextHeight, overflows,
        horizontalOverflow: document.documentElement.scrollWidth > innerWidth };
    });
    assert.deepEqual(bounds.overflows, []);
    assert.equal(bounds.horizontalOverflow, false);
    if (width < 640) assert.ok(bounds.minimumTextHeight >= 10.9, 'Small-view text retains an 11px minimum');
    samples.push(bounds);
    if (output) {
      await page.waitForTimeout(2300);
      await page.screenshot({ path: path.join(output, `archive-${channel}-${width}.png`), fullPage: true });
    }
  }
  assert.deepEqual(errors, []);
  if (output) await writeFile(path.join(output, `archive-${channel}.json`), JSON.stringify({ channel, version: browser.version(), samples }, null, 2));
  console.log(`PASS ${channel}: Archive controls, auto/manual timing, retained state, all 18 card/source text bounds at three sizes`);
} finally {
  await browser.close();
}
