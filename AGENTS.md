# WebCRT Development

Read [README](README.md) for serving and check limits.

- Preserve channel registry/adaptive control contracts and the app's shared state/compositing order. `src/channels.js` loads before `src/app.js`.
- Runtime inputs are `index.html`, `src/styles.css`, `src/channels.js`, and `src/app.js`. Do not remove `WebCRT.gif` solely because no current script reference was found; external/provenance consumers remain unreviewed.
- Run `node --check src/channels.js` and `node --check src/app.js` from this directory. No package/build/lint or automated app suite is configured; browser/canvas/timer/input checks remain manual.
- Follow applicable parent instructions when present. Optional context at `../_docs/README.md` may be absent in clones; static inputs remain self-contained. Preserve unrelated changes and report unrun checks.
