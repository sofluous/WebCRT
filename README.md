# WebCRT

Static browser CRT/cabinet prototype with channel-specific controls and canvas compositing.

Serve this directory with a static server, for example Python 3:

```text
python -m http.server 5500 --bind 127.0.0.1
```

Open `http://127.0.0.1:5500/`; stop with Ctrl+C. No package installation/build is configured. Styles are `src/styles.css` and `src/controls.css`; load `src/channels.js`, `src/controls.js`, then `src/app.js`.

From this directory with Node (validated with 24.14.1):

```text
node --check src/channels.js
node --check src/controls.js
node --check src/app.js
```

There is no package/build/lint gate. Optional browser regressions cover controls, timer integration and layout; physical-device and cross-browser checks remain separate. Syntax is not visual acceptance.

Optional responsive regression: with Playwright available, serve the app above and run `node tests/layout.browser.mjs` with `WEBCRT_TEST_URL=http://127.0.0.1:5500/`. `PLAYWRIGHT_MODULE` may point to an installed Playwright module file URL; `BROWSER_CHANNEL` defaults to installed Microsoft Edge. The test checks all seven channels, cabinet containment, horizontal overflow, return scrolling, and power at eight viewport sizes. It does not replace timer, touch-device, or rendering acceptance.

With the same environment, run `node tests/controls.browser.mjs` for rotary adjustment, value limits/reversal, all station properties, retained selections/values, noise-map sizing, power, timer run/hold/loop, Pointer Lock/fallback, Escape cleanup and emulated touch. The static app itself requires no dependencies. Tests require an existing Playwright installation and installed browser; they do not install either automatically.

Pure-noise checks: `node --test tests/noise.test.mjs` needs only Node. `node tests/noise.browser.mjs` uses the browser-test environment above for actual controls, color/mono output, patterns, map reuse, animation, text-free feed, Dead Air preservation, power and mobile layout. Set `WEBCRT_TEST_OUTPUT` to an optional evidence directory to save screenshots and CPU measurements; ordinary runs do not save artifacts. Measurements compare small-map refresh and canvas submission cost, not guaranteed GPU/device frame rates.

Channel 15 PURE NOISE provides Density (grain coverage), Streaks (interference bands/dashes), Color (Mono/RGB), and Pattern (Snow/Rainbow/Tear). Snow omits streak bands; Rainbow uses broken colored bands; Tear offsets groups of rows. No authored text/ghost or permanent NO SIGNAL card is drawn into that feed. The ordinary temporary control OSD remains. Channel 13 DEAD AIR retains its original scene and controls. Picture / signal Static sets the shared small-map resolution; higher values give finer grain. Noise adjusts grain intensity; Hue and Sat affect the colored palette.

Channel tuning wraps continuously through seven stations. Push the tuner to turn off; pull its center upward to turn on. Click or Enter/Space provides an accessible power alternative. Picture/signal and station settings use compact selectors and separate mark-free encoders: hold and move around a knob, use arrow keys or wheel to adjust. Values stop at their own limits; the encoders have no stops. Their pushes are unassigned. Escape, release, cancellation, blur and resize end a held gesture. Mouse Pointer Lock is used when permitted; otherwise the visual marker stays bounded with pointer capture. The fallback cannot physically confine the operating-system cursor. Touch uses captured circular gestures.

The desktop cabinet fills the viewport when space permits. Narrow layouts stack the screen and controls and scroll vertically; short desktop windows may also scroll to keep the controls reachable.

`WebCRT.gif` remains untouched pending provenance/external-consumer review. No hosting configuration is supplied; inspect intended delivery inputs separately from ignore rules. See [AGENTS.md](AGENTS.md); optional local docs at `../_docs/README.md` are not runtime dependencies and may be absent in clones.
