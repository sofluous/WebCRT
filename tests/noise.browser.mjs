import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'msedge', headless: true });
const output = process.env.WEBCRT_TEST_OUTPUT;
const results = [];
try {
  if (output) await mkdir(output, { recursive: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1080 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(process.env.WEBCRT_TEST_URL || 'http://127.0.0.1:5517/');
  await page.locator('#channelKnob').focus();
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('#channelNumber').textContent(), '15');
  assert.equal(await page.locator('#stationTitle').textContent(), 'PURE NOISE');
  assert.deepEqual(await page.locator('#stationSelectors button').allTextContents(), ['Density', 'Streaks', 'Color', 'Pattern']);
  assert.ok(await page.evaluate(() => { const before = noiseImageData; refreshNoise(); return before === noiseImageData; }), 'Noise storage is reused');
  const sample = () => page.evaluate(() => [...noiseCtx.getImageData(0, 0, 25, 25).data]);
  const before = await sample();
  await page.waitForTimeout(220);
  assert.notDeepEqual(await sample(), before, 'Noise refreshes while tuned');

  await page.locator('[data-key=noiseColor]').click();
  await page.locator('#stationDial').focus();
  await page.keyboard.press('ArrowLeft');
  assert.equal(await page.locator('#stationValue').textContent(), 'Mono');
  const pixels = await sample();
  for (let i = 0; i < pixels.length; i += 4) assert.ok(pixels[i] === pixels[i + 1] && pixels[i] === pixels[i + 2]);
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('#stationValue').textContent(), 'RGB');
  for (const [key, number] of [['noiseDensity', 73], ['noiseStreaks', 69]]) {
    await page.locator('[data-key=' + key + ']').click();
    await page.locator('#stationDial').focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(Number(await page.locator('#stationValue').textContent()), number);
  }
  await page.locator('[data-key=noisePattern]').click();
  await page.locator('#stationDial').focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('#stationValue').textContent(), 'Tear');
  await page.keyboard.press('ArrowLeft');
  assert.equal(await page.locator('#stationValue').textContent(), 'Rainbow');

  const texts = await page.evaluate(() => {
    const original = sceneCtx.fillText;
    const texts = [];
    sceneCtx.fillText = text => texts.push(text);
    try { drawScene(1); } finally { sceneCtx.fillText = original; }
    return texts;
  });
  assert.deepEqual(texts, [], 'No text/ghost/NO SIGNAL card is drawn into the pure-noise feed');
  if (output) {
    await page.waitForTimeout(2300);
    await page.screenshot({ path: path.join(output, 'pure-noise-desktop.png') });
    await page.locator('#screenShell').screenshot({ path: path.join(output, 'pure-noise-screen.png') });
  }

  // Compare CPU work in this same browser; display frame cost is reported separately.
  results.push(await page.evaluate(() => {
    const saved = { channel: state.channel, resolution: state.noiseResolution, pattern: state.adaptive.noisePattern };
    const results = [];
    const summarize = samples => { samples.sort((a, b) => a - b); return { samples: samples.length, medianMs: samples[Math.floor(samples.length * .5)], p95Ms: samples[Math.floor(samples.length * .95)] }; };
    try {
      for (const resolution of [2, 4]) {
        state.noiseResolution = resolution;
        updateNoiseCanvasSize();
        for (const mode of ['snow', 'noise']) {
          state.channel = channels.findIndex(channel => channel.mode === mode);
          const patterns = mode === 'noise' ? [0, 1, 2] : [0];
          for (const pattern of patterns) {
            state.adaptive.noisePattern = pattern;
            for (let i = 0; i < 20; i++) refreshNoise();
            const samples = [];
            for (let i = 0; i < 100; i++) {
              const t = performance.now(); refreshNoise(); samples.push(performance.now() - t);
            }
            const frames = [];
            for (let i = 0; i < 30; i++) {
              const t = performance.now(); drawScene(i * .09); drawPoweredFrame(i * .09); frames.push(performance.now() - t);
            }
            results.push({ mode, pattern, size: [noiseCanvas.width, noiseCanvas.height], refresh: summarize(samples), frameSubmission: summarize(frames) });
          }
        }
      }
    } finally {
      state.channel = saved.channel; state.noiseResolution = saved.resolution; state.adaptive.noisePattern = saved.pattern;
      updateNoiseCanvasSize(); refreshNoise(); controls.refresh();
    }
    return { viewport: [innerWidth, innerHeight], results, note: 'CPU timings only; canvas calls may submit asynchronous GPU work. Not a device FPS guarantee.' };
  }));

  await page.locator('#channelKnob').focus();
  await page.keyboard.press('ArrowLeft');
  assert.equal(await page.locator('#channelNumber').textContent(), '13');
  assert.deepEqual(await page.locator('#stationSelectors button').allTextContents(), ['Drift', 'Hiss', 'Ghost', 'Burst']);
  const deadAirTexts = await page.evaluate(() => {
    const original = sceneCtx.fillText;
    const texts = [];
    sceneCtx.fillText = text => texts.push(text);
    try { drawScene(1); } finally { sceneCtx.fillText = original; }
    return texts;
  });
  assert.ok(deadAirTexts.includes('NO SIGNAL'), 'Original Dead Air remains intact');
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('#stationLabel').textContent(), 'Pattern');
  assert.equal(await page.locator('#stationValue').textContent(), 'Rainbow');

  await page.keyboard.press('Space');
  await page.waitForFunction(() => state.powerLevel < .025);
  assert.ok(await page.evaluate(() => [...ctx.getImageData(canvas.width / 2, canvas.height / 2, 1, 1).data].slice(0, 3).every(value => value < 5)));
  await page.keyboard.press('Space');
  assert.equal(await page.locator('#powerState').textContent(), 'ON');
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  if (output) {
    await page.waitForTimeout(2300);
    await page.screenshot({ path: path.join(output, 'pure-noise-mobile.png'), fullPage: true });
    await writeFile(path.join(output, 'performance.json'), JSON.stringify(results, null, 2));
  }
  assert.deepEqual(errors, []);
  console.log('PASS pure noise: actual controls, color/mono, patterns, cached storage, animation, text-free feed, retained settings, original Dead Air, power and mobile geometry');
  console.log(JSON.stringify(results));
} finally {
  await browser.close();
}
