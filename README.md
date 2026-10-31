# WebCRT

Static browser CRT/cabinet prototype with channel-specific controls and canvas compositing.

Serve this directory with a static server, for example Python 3:

```text
python -m http.server 5500 --bind 127.0.0.1
```

Open `http://127.0.0.1:5500/`; stop with Ctrl+C. No package installation/build is configured. Keep the stylesheet and channel/app scripts under `src/`, with channels loaded first.

From this directory with Node (validated with 24.14.1):

```text
node --check src/channels.js
node --check src/app.js
```

No automated app/build/lint suite is configured. Changes to channel controls, canvas noise/compositing, timer behavior, and keyboard/touch accessibility require separate browser checks. Syntax is not visual acceptance.

`WebCRT.gif` remains untouched pending provenance/external-consumer review. No hosting configuration is supplied; inspect intended delivery inputs separately from ignore rules. See [AGENTS.md](AGENTS.md); optional local docs at `../_docs/README.md` are not runtime dependencies and may be absent in clones.
