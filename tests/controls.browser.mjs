import assert from 'node:assert/strict';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'msedge', headless: true });
const url = process.env.WEBCRT_TEST_URL || 'http://127.0.0.1:5517/';
const errors = [];

async function load(options = {}) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1080 }, ...options });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url);
  return page;
}

async function select(page, group, key) {
  await page.locator('#' + group + 'Selectors [data-key=' + key + ']').click();
  assert.equal(await page.locator('#' + group + 'Selectors [data-key=' + key + ']').getAttribute('aria-pressed'), 'true');
}

async function keyStep(page, dial, key, count = 1) {
  await page.locator('#' + dial).focus();
  for (let index = 0; index < count; index++) await page.keyboard.press(key);
}

async function arc(page, selector, degrees) {
  const wrap = page.locator(selector);
  await wrap.scrollIntoViewIfNeeded();
  const rect = await wrap.boundingBox();
  const cx = rect.x + rect.width / 2, cy = rect.y + rect.height / 2;
  await page.mouse.move(cx, cy - 38);
  await page.mouse.down();
  for (let angle = 4; angle <= Math.abs(degrees); angle += 4) {
    const radians = (-90 + Math.sign(degrees) * angle) * Math.PI / 180;
    await page.mouse.move(cx + Math.cos(radians) * 38, cy + Math.sin(radians) * 38);
  }
  await page.mouse.up();
}

try {
  const page = await load();
  // Force the supported capture fallback; the native lock case is checked separately.
  await page.evaluate(() => { Element.prototype.requestPointerLock = () => Promise.reject(new Error('Test lock denial')); });
  assert.equal(await page.locator('.rotary-face').count(), 3);
  assert.equal(await page.locator('.rotor, .power-button, .adaptive-slider').count(), 0);
  await select(page, 'picture', 'hue');
  await keyStep(page, 'pictureDial', 'ArrowLeft', 35);
  assert.equal(await page.locator('#pictureValue').textContent(), '140');
  await keyStep(page, 'pictureDial', 'ArrowRight', 100);
  assert.equal(await page.locator('#pictureValue').textContent(), '210');
  await arc(page, '[data-group=picture]', 96);
  assert.equal(await page.locator('#pictureValue').textContent(), '210');
  await arc(page, '[data-group=picture]', -24);
  assert.ok(Number(await page.locator('#pictureValue').textContent()) < 210, 'Reversal must respond at a property limit');
  await select(page, 'picture', 'noiseResolution');
  await keyStep(page, 'pictureDial', 'ArrowRight', 10);
  assert.equal(await page.locator('#pictureValue').textContent(), '420 x 280');
  assert.deepEqual(await page.evaluate(() => [noiseCanvas.width, noiseCanvas.height]), [420, 280]);

  const expected = await page.evaluate(() => [...channels.slice(1), channels[0]].map(channel => channel.number));
  const stationCount = expected.length;
  for (const number of expected) {
    await keyStep(page, 'channelKnob', 'ArrowRight');
    assert.equal(await page.locator('#channelNumber').textContent(), number);
    const profile = await page.evaluate(() => channelProfiles[channels[state.channel].mode]);
    for (const control of Object.values(profile).filter(control => control && typeof control === 'object')) {
      await select(page, 'station', control.key);
      const before = await page.evaluate(key => state.adaptive[key], control.key);
      await keyStep(page, 'stationDial', 'ArrowRight');
      const max = control.max ?? (control.options ? control.options.length - 1 : 1);
      assert.equal(await page.evaluate(key => state.adaptive[key], control.key), Math.min(max, before + (control.step || 1)));
    }
  }
  await select(page, 'station', 'signalSweep');
  const saved = await page.locator('#stationValue').textContent();
  await keyStep(page, 'channelKnob', 'ArrowRight', stationCount);
  assert.equal(await page.locator('#stationLabel').textContent(), 'Sweep');
  assert.equal(await page.locator('#stationValue').textContent(), saved);
  await page.locator('#stationDial').click();
  assert.equal(await page.locator('#stationValue').textContent(), saved, 'Unassigned push does not change values');

  // Circular tuning must not double as push/power. Full cycles have no hard stop.
  await arc(page, '[data-group=channel]', 364);
  assert.equal(await page.locator('#powerState').textContent(), 'ON');
  await page.locator('#channelKnob').click();
  assert.equal(await page.locator('#powerState').textContent(), 'OFF');
  await page.waitForFunction(() => state.powerLevel < .025);
  const pixels = await page.evaluate(() => [...ctx.getImageData(canvas.width / 2, canvas.height / 2, 1, 1).data]);
  assert.ok(Math.max(...pixels.slice(0, 3)) < 5, 'Off screen is black');
  const tuner = await page.locator('#channelKnob').boundingBox();
  await page.mouse.move(tuner.x + tuner.width / 2, tuner.y + tuner.height / 2);
  await page.mouse.down();
  await page.mouse.move(tuner.x + tuner.width / 2, tuner.y + tuner.height / 2 - 22, { steps: 6 });
  await page.mouse.up();
  assert.equal(await page.locator('#powerState').textContent(), 'ON');
  await keyStep(page, 'channelKnob', 'ArrowLeft', stationCount);
  await page.locator('#channelKnob').focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('Space');
  assert.equal(await page.locator('#powerState').textContent(), 'ON');

  // Actual timer controls still call the existing runtime contract.
  await page.reload();
  await page.evaluate(() => { state.channel = channels.findIndex(channel => channel.mode === 'timer'); controls.refresh(); });
  await select(page, 'station', 'timerMinutes');
  await keyStep(page, 'stationDial', 'ArrowRight');
  assert.equal(await page.evaluate(() => state.runtime.timerRemaining), 1800);
  await select(page, 'station', 'timerRun');
  await keyStep(page, 'stationDial', 'ArrowRight');
  await page.waitForTimeout(180);
  assert.ok(await page.evaluate(() => state.runtime.timerRemaining < 1800));
  await keyStep(page, 'stationDial', 'ArrowLeft');
  const remaining = await page.evaluate(() => state.runtime.timerRemaining);
  await page.waitForTimeout(120);
  assert.equal(await page.evaluate(() => state.runtime.timerRemaining), remaining);
  await page.evaluate(() => { state.runtime.timerRemaining = .01; state.adaptive.timerMode = 2; });
  await keyStep(page, 'stationDial', 'ArrowRight');
  await page.waitForTimeout(100);
  assert.ok(await page.evaluate(() => state.runtime.timerRemaining > 1700));
  console.log('PASS fallback mouse: all channel controls, retained state, bounds/reversal, noise map, circular tuning, push/pull, keyboard, timer run/hold/loop');

  const native = await load();
  await native.locator('#pictureDial').scrollIntoViewIfNeeded();
  const rect = await native.locator('#pictureDial').boundingBox();
  await native.mouse.move(rect.x + rect.width / 2, rect.y + 12);
  await native.mouse.down();
  await native.waitForFunction(() => document.pointerLockElement || document.querySelector('.control-panel').dataset.pointerMode === 'capture');
  const locked = await native.evaluate(() => Boolean(document.pointerLockElement));
  await native.mouse.move(rect.x + rect.width + 180, rect.y + rect.height / 2, { steps: 15 });
  const cursor = await native.locator('[data-group=picture]').evaluate(wrap => ({
    x: parseFloat(wrap.style.getPropertyValue('--cursor-x')), y: parseFloat(wrap.style.getPropertyValue('--cursor-y')),
    size: wrap.getBoundingClientRect().width
  }));
  assert.ok(Math.hypot(cursor.x - cursor.size / 2, cursor.y - cursor.size / 2) <= cursor.size / 2 - 8);
  await native.keyboard.press('Escape');
  await native.mouse.up();
  assert.equal(await native.locator('.is-held').count(), 0);
  assert.equal(await native.evaluate(() => document.pointerLockElement), null);
  await native.mouse.move(rect.x + rect.width / 2, rect.y + 12);
  await native.mouse.down();
  await native.waitForFunction(() => document.pointerLockElement || document.querySelector('.control-panel').dataset.pointerMode === 'capture');
  await native.mouse.up();
  await native.waitForFunction(() => !document.pointerLockElement);
  assert.equal(await native.locator('.is-held').count(), 0);
  console.log('PASS native mouse: pointer mode=' + (locked ? 'locked' : 'capture fallback') + ', bounded marker, Escape cleanup');

  const touch = await load({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  await select(touch, 'picture', 'noise');
  await touch.locator('#pictureDial').scrollIntoViewIfNeeded();
  const tr = await touch.locator('#pictureDial').boundingBox();
  const cdp = await touch.context().newCDPSession(touch);
  const tx = tr.x + tr.width / 2, ty = tr.y + tr.height / 2;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: tx, y: ty - 35 }] });
  for (let degrees = 5; degrees <= 90; degrees += 5) {
    const angle = (-90 + degrees) * Math.PI / 180;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: tx + Math.cos(angle) * 35, y: ty + Math.sin(angle) * 35 }] });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  assert.ok(Number(await touch.locator('#pictureValue').textContent()) > 32);
  assert.equal(await touch.locator('.is-held').count(), 0);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: tx, y: ty - 35 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  assert.equal(await touch.locator('.is-held').count(), 0);
  assert.equal(await touch.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  console.log('PASS emulated touch: circular adjustment, release, coarse targets and no horizontal overflow');
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
