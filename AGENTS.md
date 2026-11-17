# WebCRT Development

Read [README](README.md) for serving and check limits.

- Preserve the channel registry/profile keys and shared state/compositing order. Scripts load `src/channels.js`, `src/controls.js`, then `src/app.js`. Profiles describe property semantics; their legacy dial/slider/toggle/button keys no longer require dedicated hardware surfaces.
- Runtime inputs are `index.html`, `src/styles.css`, `src/controls.css`, `src/channels.js`, `src/controls.js`, and `src/app.js`. Do not remove `WebCRT.gif` solely because no current script reference was found; external/provenance consumers remain unreviewed.
- Run `node --check` on all three runtime JS files. Run optional `tests/controls.browser.mjs` for control changes and `tests/layout.browser.mjs` for layout changes, using the README setup. No package/build/lint gate is configured; physical-device and cross-browser acceptance remain separate.
- Follow applicable parent instructions when present. Optional context at `../_docs/README.md` may be absent in clones; static inputs remain self-contained. Preserve unrelated changes and report unrun checks.

- Responsive layout changes also run the optional `tests/layout.browser.mjs` check described in README. No default package installation is required for the static app.
- Noise generation changes run `node --test tests/noise.test.mjs` and optional `tests/noise.browser.mjs`. Keep generation on the cached small map at the existing 90ms cadence; preserve Dead Air separately from channel 15's text-free feed and keep ordinary CRT compositing order.
