import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';

const context = { window: {} };
runInNewContext(readFileSync(new URL('../src/channels.js', import.meta.url), 'utf8'), context);
const { fillPureNoise, adaptiveDefaults, channels, renderChannelScene } = context.window.WebCRTChannels;

function render(overrides = {}, time = 2, width = 96, height = 64) {
  let seed = 42;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  const image = { width, height, data: new Uint8ClampedArray(width * height * 4).fill(171) };
  fillPureNoise(image, { adaptive: { ...adaptiveDefaults, ...overrides }, hue: 168, saturation: 42, noise: 32 }, time, random);
  return image.data;
}

test('pure noise has a separate station and keeps Dead Air', () => {
  assert.equal(channels.find(channel => channel.number === '13').mode, 'snow');
  assert.equal(channels.find(channel => channel.number === '15').mode, 'noise');
});

test('generation is deterministic with supplied time/random, with opaque colored pixels', () => {
  const a = render();
  assert.deepEqual(a, render());
  let colorful = 0;
  for (let i = 0; i < a.length; i += 4) {
    assert.equal(a[i + 3], 255);
    if (Math.max(a[i], a[i + 1], a[i + 2]) - Math.min(a[i], a[i + 1], a[i + 2]) > 30) colorful++;
  }
  assert.ok(colorful > 1000);
  assert.notDeepEqual(a, render({}, 3), 'Streaks change over time');
});

test('mono removes chroma, and zero density plus zero streaks clears previous pixels', () => {
  const mono = render({ noiseColor: 0 });
  for (let i = 0; i < mono.length; i += 4) {
    assert.equal(mono[i], mono[i + 1]);
    assert.equal(mono[i], mono[i + 2]);
  }
  const empty = render({ noiseDensity: 0, noiseStreaks: 0 });
  for (let i = 0; i < empty.length; i += 4) assert.deepEqual([...empty.slice(i, i + 4)], [2, 2, 2, 255]);
});

test('density increases grain coverage and each pattern produces a distinct field', () => {
  const count = pixels => pixels.filter((value, index) => index % 4 === 0 && value > 2).length;
  assert.ok(count(render({ noiseDensity: 100, noiseStreaks: 0 })) > count(render({ noiseDensity: 10, noiseStreaks: 0 })) * 4);
  const snow = render({ noisePattern: 0 });
  const rainbow = render({ noisePattern: 1 });
  const tear = render({ noisePattern: 2 });
  assert.notDeepEqual(snow, rainbow);
  assert.notDeepEqual(rainbow, tear);
  assert.notDeepEqual(render({ noiseStreaks: 0 }), render({ noiseStreaks: 100 }));
});

test('all resolution endpoints are fully written and pure feed uses no authored overlays', () => {
  for (const [width, height] of [[1, 1], [72, 48], [420, 280]]) {
    const pixels = render({}, 1, width, height);
    assert.equal(pixels.length, width * height * 4);
    assert.equal(pixels.at(-1), 255);
  }
  let draws = 0;
  const sceneCtx = { save() {}, restore() {}, drawImage() { draws++; } };
  // Text drawing would fail here; pure noise must only composite its small map.
  renderChannelScene({ channel: { mode: 'noise' }, sceneCtx, noiseCanvas: {}, width: 800, height: 600 });
  assert.equal(draws, 1);
  assert.equal(sceneCtx.imageSmoothingEnabled, false);
});
