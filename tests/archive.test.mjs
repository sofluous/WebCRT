import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';

const context = { window: {} };
runInNewContext(readFileSync(new URL('../src/channels.js', import.meta.url), 'utf8'), context);
const api = context.window.WebCRTChannels;
const makeState = () => ({ powerOn: true, channel: api.channels.findIndex(channel => channel.mode === 'archive'),
  adaptive: { ...api.adaptiveDefaults }, runtime: { ...api.runtimeDefaults } });

function render(state, time = 1) {
  const texts = [], translations = [];
  const sceneCtx = new Proxy({
    fillText(text) { texts.push(text); }, translate(...args) { translations.push(args); },
    measureText(text) { return { width: text.length * 12 }; }
  }, { get(target, key) { return key in target ? target[key] : () => {}; } });
  api.renderChannelScene({ sceneCtx, state, channel: api.channels[state.channel], width: 960, height: 720, time });
  return { texts, translations };
}

test('station numbers remain unique and ordered, including Archive 09', () => {
  const numbers = api.channels.map(channel => Number(channel.number));
  assert.equal(new Set(numbers).size, numbers.length);
  assert.deepEqual([...numbers], [...numbers].sort((a, b) => a - b));
  assert.equal(api.channels.find(channel => channel.number === '09').mode, 'archive');
});

test('three sources provide eighteen distinct original cards and selectable subtitles', () => {
  const state = makeState(), cards = new Set();
  for (let source = 0; source < 3; source++) for (let card = 0; card < 6; card++) {
    state.adaptive.archiveSource = source; state.adaptive.archiveCard = card;
    const withSubtitles = render(state).texts;
    assert.ok(withSubtitles.some(text => text.includes('REPLAY')));
    cards.add(withSubtitles[2]);
    state.adaptive.archiveSubtitle = 0;
    const withoutSubtitles = render(state).texts;
    assert.equal(withSubtitles.length, withoutSubtitles.length + 1);
    state.adaptive.archiveSubtitle = 1;
  }
  assert.equal(cards.size, 18);
});

test('drift is bounded and zero drift remains stationary', () => {
  const state = makeState();state.adaptive.archiveDrift = 100;
  for (const time of [0, 1, 9, 100]) {
    const [[x, y]] = render(state, time).translations;
    assert.ok(Math.abs(x) <= 7 && Math.abs(y) <= 5);
  }
  state.adaptive.archiveDrift = 0;
  assert.ok(render(state).translations[0].every(value => value === 0));
});

test('replay advances every twelve seconds, wraps and handles a delayed frame', () => {
  const state = makeState();
  api.stepChannelState(state, 11999);
  assert.equal(state.adaptive.archiveCard, 0);
  api.stepChannelState(state, 2);
  assert.equal(state.adaptive.archiveCard, 1);
  api.stepChannelState(state, 12000 * 11);
  assert.equal(state.adaptive.archiveCard, 0);
  assert.ok(state.runtime.archiveElapsed < 12);
});

test('replay pauses when off or untuned, manual card/source changes restart its interval', () => {
  const state = makeState();state.powerOn = false;
  api.stepChannelState(state, 30000);
  assert.equal(state.runtime.archiveElapsed, 0);
  state.powerOn = true;state.channel = 0;
  api.stepChannelState(state, 30000);
  assert.equal(state.runtime.archiveElapsed, 0);
  for (const key of ['archiveCard', 'archiveSource']) {
    state.runtime.archiveElapsed = 11;
    api.handleChannelStateChange(state, key);
    assert.equal(state.runtime.archiveElapsed, 0);
  }
  assert.equal(api.formatChannelValue({ key: 'archiveCard' }, 5, state), '06 / 06');
});
