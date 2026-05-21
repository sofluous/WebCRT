window.WebCRTChannels = (() => {
  const weatherRegions = [
    { name: "NORTH COAST", temp: 58, condition: "RAIN", accent: "#7fd3e6" },
    { name: "DESERT MESA", temp: 87, condition: "CLEAR", accent: "#f0c36d" },
    { name: "PINE RANGE", temp: 41, condition: "WIND", accent: "#9ed0b6" },
    { name: "HARBOR CITY", temp: 64, condition: "FOG", accent: "#b4d3de" }
  ];

  const channels = [
    { number: "02", label: "AUX FEED", mode: "signal" },
    { number: "04", label: "DIAGNOSTIC", mode: "diag" },
    { number: "07", label: "COLOR BARS", mode: "bars" },
    { number: "11", label: "WEATHERSCAN", mode: "weather" },
    { number: "13", label: "DEAD AIR", mode: "snow" },
    { number: "17", label: "FOCUS TIMER", mode: "timer" }
  ];

  const channelProfiles = {
    signal: {
      title: "AUX PANEL",
      status: "SIGNAL",
      dial: { key: "signalSweep", label: "Sweep", min: 0, max: 100, step: 1 },
      slider: { key: "signalGrid", label: "Grid", min: 0, max: 100, step: 1 },
      toggle: { key: "signalBloom", label: "Bloom", offLabel: "Off", onLabel: "On" },
      button: { key: "signalFrame", label: "Frame", options: ["Wide", "Tall", "Tight"] }
    },
    diag: {
      title: "SERVICE CTRL",
      status: "DIAG",
      dial: { key: "diagScroll", label: "Scroll", min: 0, max: 100, step: 1 },
      slider: { key: "diagDensity", label: "Density", min: 0, max: 100, step: 1 },
      toggle: { key: "diagScramble", label: "Scramble", offLabel: "Calm", onLabel: "Chaos" },
      button: { key: "diagPage", label: "Page", options: ["Sys", "Mem", "Net"] }
    },
    bars: {
      title: "CAL PANEL",
      status: "BARS",
      dial: { key: "barsPhase", label: "Phase", min: 0, max: 100, step: 1 },
      slider: { key: "barsLevel", label: "Level", min: 0, max: 100, step: 1 },
      toggle: { key: "barsMono", label: "Mono", offLabel: "RGB", onLabel: "Mono" },
      button: { key: "barsMode", label: "Mode", options: ["SMPTE", "PAL", "Split"] }
    },
    snow: {
      title: "DEAD AIR",
      status: "STATIC",
      dial: { key: "snowDrift", label: "Drift", min: 0, max: 100, step: 1 },
      slider: { key: "snowHiss", label: "Hiss", min: 0, max: 100, step: 1 },
      toggle: { key: "snowGhost", label: "Ghost", offLabel: "Off", onLabel: "On" },
      button: { key: "snowBurst", label: "Burst", options: ["Low", "Mid", "High"] }
    },
    weather: {
      title: "WEATHER CTRL",
      status: "WX",
      dial: { key: "weatherHour", label: "Hour", min: 0, max: 23, step: 1 },
      slider: { key: "weatherRadar", label: "Radar", min: 0, max: 100, step: 1 },
      toggle: { key: "weatherAlert", label: "Alert", offLabel: "Quiet", onLabel: "Alert" },
      button: { key: "weatherRegion", label: "Region", options: weatherRegions.map((region) => region.name) }
    },
    timer: {
      title: "TIMER CTRL",
      status: "FOCUS",
      dial: { key: "timerMinutes", label: "Minutes", min: 5, max: 60, step: 5 },
      slider: { key: "timerGlow", label: "Glow", min: 0, max: 100, step: 1 },
      toggle: { key: "timerRun", label: "Run", offLabel: "Hold", onLabel: "Run" },
      button: { key: "timerMode", label: "Mode", options: ["Focus", "Break", "Loop"] }
    }
  };

  const adaptiveDefaults = {
    signalSweep: 54,
    signalGrid: 58,
    signalBloom: 1,
    signalFrame: 0,
    diagScroll: 44,
    diagDensity: 52,
    diagScramble: 1,
    diagPage: 0,
    barsPhase: 32,
    barsLevel: 64,
    barsMono: 0,
    barsMode: 0,
    weatherHour: 6,
    weatherRadar: 62,
    weatherAlert: 1,
    weatherRegion: 0,
    snowDrift: 48,
    snowHiss: 72,
    snowGhost: 1,
    snowBurst: 1,
    timerMinutes: 25,
    timerGlow: 44,
    timerRun: 0,
    timerMode: 0
  };

  const runtimeDefaults = {
    timerRemaining: 25 * 60,
    timerLastMinutes: 25
  };

  function drawSignalFeed(env) {
    const { sceneCtx, state, width, height, time } = env;
    const sweep = state.adaptive.signalSweep / 100;
    const grid = state.adaptive.signalGrid / 100;
    const bloomOn = state.adaptive.signalBloom > 0;
    const frameMode = state.adaptive.signalFrame;
    const hue = state.hue;
    const sat = 10 + state.saturation * 0.45;
    const tintBoost = state.tint * 0.12;

    sceneCtx.fillStyle = "hsl(" + hue + " " + sat + "% 8%)";
    sceneCtx.fillRect(0, 0, width, height);

    const gridGradient = sceneCtx.createRadialGradient(
      width * 0.5,
      height * 0.42,
      width * 0.08,
      width * 0.5,
      height * 0.5,
      width * 0.75
    );
    gridGradient.addColorStop(0, "hsla(" + hue + ", " + (28 + sat * 0.28) + "%, " + (19 + tintBoost) + "%, 0.92)");
    gridGradient.addColorStop(1, "hsla(" + hue + ", 28%, 6%, 1)");
    sceneCtx.fillStyle = gridGradient;
    sceneCtx.fillRect(0, 0, width, height);

    sceneCtx.strokeStyle = "rgba(176, 224, 233," + (0.04 + grid * 0.08) + ")";
    sceneCtx.lineWidth = 1;
    for (let x = 0; x < width; x += Math.max(18, Math.round(width / (14 + grid * 18)))) {
      sceneCtx.beginPath();
      sceneCtx.moveTo(x, 0);
      sceneCtx.lineTo(x, height);
      sceneCtx.stroke();
    }
    for (let y = 0; y < height; y += Math.max(18, Math.round(height / (10 + grid * 16)))) {
      sceneCtx.beginPath();
      sceneCtx.moveTo(0, y);
      sceneCtx.lineTo(width, y);
      sceneCtx.stroke();
    }

    sceneCtx.strokeStyle = "rgba(209, 239, 245, 0.72)";
    sceneCtx.lineWidth = Math.max(2, width * 0.0028);
    sceneCtx.beginPath();
    for (let x = 0; x <= width; x += 8) {
      const bandA = Math.sin((x / width) * (6 + sweep * 8) + time * (1.1 + sweep * 2.4)) * height * (0.05 + sweep * 0.07);
      const bandB = Math.sin((x / width) * (14 + sweep * 18) - time * (1.4 + sweep * 2.8)) * height * 0.03;
      const y = height * 0.52 + bandA + bandB;
      if (x === 0) {
        sceneCtx.moveTo(x, y);
      } else {
        sceneCtx.lineTo(x, y);
      }
    }
    sceneCtx.stroke();

    sceneCtx.fillStyle = "rgba(214, 241, 246, 0.88)";
    sceneCtx.font = Math.max(14, width * 0.028) + 'px "Consolas", monospace';
    sceneCtx.fillText("WEBCRT AUX FEED", width * 0.06, height * 0.14);
    sceneCtx.font = Math.max(11, width * 0.016) + 'px "Consolas", monospace';
    sceneCtx.fillStyle = "rgba(188, 224, 232, 0.76)";
    sceneCtx.fillText("THICK GLASS RESPONSE", width * 0.06, height * 0.18);

    const barY = height * 0.82;
    const barH = height * 0.04;
    sceneCtx.fillStyle = "rgba(210, 233, 238, 0.12)";
    sceneCtx.fillRect(width * 0.06, barY, width * 0.88, barH);
    sceneCtx.fillStyle = "rgba(214, 239, 245, 0.46)";
    sceneCtx.fillRect(width * 0.06, barY, width * (0.25 + (Math.sin(time * 0.9) + 1) * 0.18), barH);

    if (!bloomOn) {
      sceneCtx.fillStyle = "rgba(4, 10, 12, 0.22)";
      sceneCtx.fillRect(0, 0, width, height);
    }

    if (frameMode === 1) {
      sceneCtx.clearRect(width * 0.82, 0, width * 0.18, height);
    } else if (frameMode === 2) {
      sceneCtx.clearRect(0, height * 0.84, width, height * 0.16);
    }
  }

  function drawDiagnosticFeed(env) {
    const { sceneCtx, state, channels: stationMap, width, height, time } = env;
    const scroll = state.adaptive.diagScroll / 100;
    const density = state.adaptive.diagDensity / 100;
    const scrambleOn = state.adaptive.diagScramble > 0;
    const page = state.adaptive.diagPage;
    sceneCtx.fillStyle = "hsl(" + state.hue + " 22% 7%)";
    sceneCtx.fillRect(0, 0, width, height);
    sceneCtx.fillStyle = "rgba(198, 234, 243, 0.88)";
    sceneCtx.font = Math.max(12, width * 0.018) + 'px "Consolas", monospace';

    const pages = [
      [
        "SYSTEM TIME  " + new Date().toLocaleTimeString(),
        "CHANNEL      " + stationMap[state.channel].number + " / " + stationMap[state.channel].label,
        "TINT         " + String(state.tint).padStart(3, "0"),
        "HUE          " + String(state.hue).padStart(3, "0"),
        "SATURATION   " + String(state.saturation).padStart(3, "0")
      ],
      [
        "BRIGHTNESS   " + String(state.brightness).padStart(3, "0"),
        "WARP         " + String(state.warp).padStart(3, "0"),
        "NOISE        " + String(state.noise).padStart(3, "0"),
        "STATIC MAP   " + String(state.noiseResolution).padStart(3, "0"),
        "FRAME        " + state.fps.toFixed(1) + " FPS"
      ],
      [
        "SWEEP        " + String(state.adaptive.signalSweep).padStart(3, "0"),
        "GRID         " + String(state.adaptive.signalGrid).padStart(3, "0"),
        "DRIFT        " + String(state.adaptive.snowDrift).padStart(3, "0"),
        "HISS         " + String(state.adaptive.snowHiss).padStart(3, "0")
      ]
    ];

    const lines = pages[page] || pages[0];

    lines.forEach((line, index) => {
      const scramble = scrambleOn && Math.random() < (0.03 + density * 0.08)
        ? line.replace(/[A-Z0-9]/g, (char) => (Math.random() < 0.25 ? "*" : char))
        : line;
      sceneCtx.fillText(scramble, width * 0.08, height * (0.16 + index * (0.09 - density * 0.02)));
    });

    sceneCtx.strokeStyle = "rgba(168, 223, 235, 0.58)";
    sceneCtx.lineWidth = 2;
    sceneCtx.beginPath();
    for (let x = 0; x <= width; x += 6) {
      const y = height * 0.78 + Math.sin(x * (0.02 + scroll * 0.03) + time * (1.2 + scroll * 3.4)) * height * (0.03 + density * 0.05);
      if (x === 0) {
        sceneCtx.moveTo(x, y);
      } else {
        sceneCtx.lineTo(x, y);
      }
    }
    sceneCtx.stroke();
  }

  function drawColorBars(env) {
    const { sceneCtx, state, width, height, time } = env;
    const phase = state.adaptive.barsPhase / 100;
    const level = state.adaptive.barsLevel / 100;
    const mono = state.adaptive.barsMono > 0;
    const mode = state.adaptive.barsMode;
    let colors = [
      "#f4f4f4",
      "#f2e457",
      "#52e3e3",
      "#5ad85f",
      "#db64e2",
      "#d74646",
      "#3d67ef"
    ];
    if (mono) {
      colors = ["#f2f2f2", "#dcdcdc", "#c2c2c2", "#aaaaaa", "#8d8d8d", "#737373", "#595959"];
    }
    if (mode === 1) {
      colors = colors.slice().reverse();
    } else if (mode === 2) {
      colors = colors.map((color, index) => index % 2 === 0 ? "#111111" : color);
    }
    const barWidth = width / colors.length;
    colors.forEach((color, index) => {
      sceneCtx.fillStyle = color;
      sceneCtx.fillRect(index * barWidth, 0, Math.ceil(barWidth), height * 0.62);
    });

    sceneCtx.fillStyle = "#141414";
    sceneCtx.fillRect(0, height * 0.62, width, height * 0.38);
    sceneCtx.fillStyle = "rgba(211, 240, 246, 0.92)";
    sceneCtx.font = Math.max(16, width * 0.03) + 'px "Consolas", monospace';
    sceneCtx.fillText("COLOR CALIBRATION", width * 0.06, height * 0.77);
    sceneCtx.font = Math.max(12, width * 0.016) + 'px "Consolas", monospace';
    sceneCtx.fillText("HUE " + state.hue + " | SAT " + state.saturation + " | TINT " + state.tint, width * 0.06, height * 0.84);

    const pulse = (Math.sin(time * 3) + 1) * 0.5;
    sceneCtx.fillStyle = "rgba(255,255,255," + (0.12 + pulse * 0.12) + ")";
    sceneCtx.fillRect(width * 0.06, height * 0.88, width * (0.42 + level * 0.46), height * (0.03 + phase * 0.03));
  }

  function drawSnowFeed(env) {
    const { sceneCtx, state, width, height, time } = env;
    const driftRate = 0.4 + state.adaptive.snowDrift / 40;
    const ghostOn = state.adaptive.snowGhost > 0;
    const burst = [0.05, 0.09, 0.14][state.adaptive.snowBurst] || 0.09;
    const gradient = sceneCtx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "hsl(" + state.hue + " 22% 7%)");
    gradient.addColorStop(1, "#020302");
    sceneCtx.fillStyle = gradient;
    sceneCtx.fillRect(0, 0, width, height);

    sceneCtx.fillStyle = "rgba(211, 236, 240, 0.28)";
    sceneCtx.font = Math.max(24, width * 0.042) + 'px "Consolas", monospace';
    sceneCtx.fillText("NO SIGNAL", width * 0.33, height * 0.47);
    sceneCtx.font = Math.max(12, width * 0.015) + 'px "Consolas", monospace';
    sceneCtx.fillStyle = "rgba(209, 233, 240, 0.18)";
    sceneCtx.fillText("TUNE CHANNEL DIAL", width * 0.39, height * 0.53);

    sceneCtx.fillStyle = "rgba(255,255,255,0.06)";
    const drift = (time * 90 * driftRate) % height;
    sceneCtx.fillRect(0, drift - height * 0.16, width, height * burst);
    sceneCtx.fillRect(0, drift + height * 0.36, width, height * (burst * 0.7));

    if (ghostOn && Math.sin(time * 2.1) > 0.72) {
      sceneCtx.fillStyle = "rgba(206, 238, 243, 0.1)";
      sceneCtx.fillText("...HELLO?... ", width * 0.42, height * 0.26);
    }
  }

  function drawWeatherFeed(env) {
    const { sceneCtx, state, width, height, time } = env;
    const region = weatherRegions[state.adaptive.weatherRegion] || weatherRegions[0];
    const radar = state.adaptive.weatherRadar / 100;
    const hour = state.adaptive.weatherHour;
    const alertOn = state.adaptive.weatherAlert > 0;
    const accent = region.accent;

    const skyGradient = sceneCtx.createLinearGradient(0, 0, 0, height);
    skyGradient.addColorStop(0, "#0a1a1f");
    skyGradient.addColorStop(1, "#04080a");
    sceneCtx.fillStyle = skyGradient;
    sceneCtx.fillRect(0, 0, width, height);

    sceneCtx.fillStyle = "rgba(195, 229, 238, 0.9)";
    sceneCtx.font = Math.max(20, width * 0.034) + 'px "Consolas", monospace';
    sceneCtx.fillText("WEATHERSCAN", width * 0.06, height * 0.13);
    sceneCtx.font = Math.max(12, width * 0.016) + 'px "Consolas", monospace';
    sceneCtx.fillStyle = "rgba(175, 220, 230, 0.78)";
    sceneCtx.fillText(region.name + "  +" + String(hour).padStart(2, "0") + "HR", width * 0.06, height * 0.18);

    sceneCtx.strokeStyle = "rgba(120, 205, 222, 0.16)";
    sceneCtx.lineWidth = 1;
    for (let x = width * 0.08; x < width * 0.92; x += width * 0.08) {
      sceneCtx.beginPath();
      sceneCtx.moveTo(x, height * 0.24);
      sceneCtx.lineTo(x, height * 0.82);
      sceneCtx.stroke();
    }
    for (let y = height * 0.24; y < height * 0.82; y += height * 0.1) {
      sceneCtx.beginPath();
      sceneCtx.moveTo(width * 0.08, y);
      sceneCtx.lineTo(width * 0.92, y);
      sceneCtx.stroke();
    }

    sceneCtx.fillStyle = "rgba(8, 19, 24, 0.42)";
    sceneCtx.fillRect(width * 0.08, height * 0.24, width * 0.84, height * 0.44);

    const cells = 4 + Math.round(radar * 4);
    for (let i = 0; i < cells; i += 1) {
      const pulse = (Math.sin(time * (0.8 + i * 0.12) + i * 1.6) + 1) * 0.5;
      const blobX = width * (0.2 + ((i * 19) % 53) / 80);
      const blobY = height * (0.3 + ((i * 17) % 37) / 100);
      const radius = width * (0.06 + pulse * 0.04 + radar * 0.03);
      const blob = sceneCtx.createRadialGradient(blobX, blobY, radius * 0.1, blobX, blobY, radius);
      blob.addColorStop(0, accent + "dd");
      blob.addColorStop(0.45, accent + "88");
      blob.addColorStop(1, "rgba(0,0,0,0)");
      sceneCtx.fillStyle = blob;
      sceneCtx.beginPath();
      sceneCtx.arc(blobX, blobY, radius, 0, Math.PI * 2);
      sceneCtx.fill();
    }

    sceneCtx.fillStyle = "rgba(198, 234, 243, 0.9)";
    sceneCtx.font = Math.max(34, width * 0.072) + 'px "Consolas", monospace';
    sceneCtx.fillText(String(region.temp) + "°", width * 0.1, height * 0.79);
    sceneCtx.font = Math.max(16, width * 0.024) + 'px "Consolas", monospace';
    sceneCtx.fillStyle = "rgba(184, 224, 232, 0.82)";
    sceneCtx.fillText(region.condition, width * 0.1, height * 0.85);

    sceneCtx.fillStyle = "rgba(211, 239, 245, 0.18)";
    sceneCtx.fillRect(width * 0.58, height * 0.74, width * 0.28, height * 0.026);
    sceneCtx.fillStyle = "rgba(211, 239, 245, 0.6)";
    sceneCtx.fillRect(width * 0.58, height * 0.74, width * (0.12 + radar * 0.16), height * 0.026);

    if (alertOn) {
      sceneCtx.fillStyle = "rgba(239, 152, 109, 0.92)";
      sceneCtx.fillRect(width * 0.58, height * 0.18, width * 0.26, height * 0.05);
      sceneCtx.fillStyle = "rgba(45, 20, 8, 0.95)";
      sceneCtx.font = Math.max(12, width * 0.016) + 'px "Consolas", monospace';
      sceneCtx.fillText("WIND ADVISORY", width * 0.605, height * 0.213);
    }
  }

  function drawTimerFeed(env) {
    const { sceneCtx, state, width, height, time } = env;
    const remaining = Math.max(0, Math.ceil(state.runtime.timerRemaining));
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    const glow = state.adaptive.timerGlow / 100;
    const mode = state.adaptive.timerMode;
    const running = state.adaptive.timerRun > 0;
    const total = Math.max(1, state.adaptive.timerMinutes * 60);
    const progress = 1 - remaining / total;
    const accent = mode === 1 ? "#8dcfd8" : mode === 2 ? "#d6c06f" : "#c9efe8";

    sceneCtx.fillStyle = "#05090b";
    sceneCtx.fillRect(0, 0, width, height);

    const aura = sceneCtx.createRadialGradient(width * 0.5, height * 0.42, width * 0.05, width * 0.5, height * 0.42, width * 0.52);
    aura.addColorStop(0, "rgba(145, 225, 239," + (0.18 + glow * 0.18) + ")");
    aura.addColorStop(1, "rgba(0,0,0,0)");
    sceneCtx.fillStyle = aura;
    sceneCtx.fillRect(0, 0, width, height);

    sceneCtx.strokeStyle = "rgba(175, 221, 231, 0.14)";
    sceneCtx.lineWidth = 1;
    for (let y = height * 0.18; y <= height * 0.82; y += height * 0.1) {
      sceneCtx.beginPath();
      sceneCtx.moveTo(width * 0.14, y);
      sceneCtx.lineTo(width * 0.86, y);
      sceneCtx.stroke();
    }

    sceneCtx.fillStyle = "rgba(201, 237, 244, 0.9)";
    sceneCtx.font = Math.max(18, width * 0.03) + 'px "Consolas", monospace';
    sceneCtx.fillText("FOCUS TIMER", width * 0.06, height * 0.14);
    sceneCtx.font = Math.max(12, width * 0.016) + 'px "Consolas", monospace';
    sceneCtx.fillStyle = "rgba(178, 219, 228, 0.76)";
    sceneCtx.fillText(channelProfiles.timer.button.options[mode] + " SESSION", width * 0.06, height * 0.19);

    sceneCtx.beginPath();
    sceneCtx.arc(width * 0.5, height * 0.5, width * 0.22, -Math.PI / 2, Math.PI * 1.5);
    sceneCtx.strokeStyle = "rgba(198, 234, 241, 0.12)";
    sceneCtx.lineWidth = Math.max(8, width * 0.012);
    sceneCtx.stroke();

    sceneCtx.beginPath();
    sceneCtx.arc(width * 0.5, height * 0.5, width * 0.22, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
    sceneCtx.strokeStyle = accent;
    sceneCtx.lineCap = "round";
    sceneCtx.lineWidth = Math.max(8, width * 0.012);
    sceneCtx.stroke();
    sceneCtx.lineCap = "butt";

    sceneCtx.fillStyle = "rgba(226, 247, 250, 0.96)";
    sceneCtx.font = Math.max(40, width * 0.092) + 'px "Consolas", monospace';
    sceneCtx.fillText(String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0"), width * 0.31, height * 0.54);

    sceneCtx.font = Math.max(12, width * 0.016) + 'px "Consolas", monospace';
    sceneCtx.fillStyle = running ? "rgba(139, 232, 188, 0.86)" : "rgba(228, 208, 152, 0.84)";
    sceneCtx.fillText(running ? "RUNNING" : "HOLD", width * 0.44, height * 0.63);

    sceneCtx.fillStyle = "rgba(211, 239, 245, 0.16)";
    sceneCtx.fillRect(width * 0.18, height * 0.78, width * 0.64, height * 0.028);
    sceneCtx.fillStyle = accent;
    sceneCtx.fillRect(width * 0.18, height * 0.78, width * 0.64 * Math.max(0, progress), height * 0.028);
    sceneCtx.fillStyle = "rgba(191, 229, 236, 0.78)";
    sceneCtx.fillText(String(state.adaptive.timerMinutes).padStart(2, "0") + " MIN PRESET", width * 0.34, height * 0.86);

    if (mode === 2) {
      const blink = Math.sin(time * 2.8) > 0 ? 0.82 : 0.28;
      sceneCtx.fillStyle = "rgba(226, 201, 115," + blink + ")";
      sceneCtx.fillText("AUTO LOOP", width * 0.65, height * 0.14);
    }
  }

  function stepChannelState(state, deltaMs) {
    if (!state.runtime) {
      state.runtime = { ...runtimeDefaults };
    }

    if (state.adaptive.timerRun > 0) {
      state.runtime.timerRemaining = Math.max(0, state.runtime.timerRemaining - deltaMs * 0.001);
      if (state.runtime.timerRemaining <= 0) {
        if (state.adaptive.timerMode === 2) {
          state.runtime.timerRemaining = state.adaptive.timerMinutes * 60;
        } else {
          state.adaptive.timerRun = 0;
          state.runtime.timerRemaining = 0;
        }
      }
    }
  }

  function handleChannelStateChange(state, key) {
    if (!state.runtime) {
      state.runtime = { ...runtimeDefaults };
    }

    if (key === "timerMinutes") {
      state.runtime.timerLastMinutes = state.adaptive.timerMinutes;
      if (state.adaptive.timerRun === 0) {
        state.runtime.timerRemaining = state.adaptive.timerMinutes * 60;
      } else if (state.runtime.timerRemaining > state.adaptive.timerMinutes * 60) {
        state.runtime.timerRemaining = state.adaptive.timerMinutes * 60;
      }
    }

    if (key === "timerRun" && state.adaptive.timerRun > 0 && state.runtime.timerRemaining <= 0) {
      state.runtime.timerRemaining = state.adaptive.timerMinutes * 60;
    }
  }

  function formatChannelValue(control, value, state) {
    const key = control?.key;
    if (Array.isArray(control?.options)) {
      return control.options[value] || control.options[0];
    }
    if (control?.offLabel && control?.onLabel) {
      return value ? control.onLabel : control.offLabel;
    }
    if (key === "weatherHour") {
      return "+" + String(value).padStart(2, "0") + "H";
    }
    if (key === "weatherRadar") {
      return String(value) + "%";
    }
    if (key === "timerMinutes") {
      return String(value) + "M";
    }
    if (key === "timerGlow") {
      return String(value) + "%";
    }
    return String(value);
  }

  function renderChannelScene(env) {
    switch (env.channel.mode) {
      case "diag":
        drawDiagnosticFeed(env);
        break;
      case "bars":
        drawColorBars(env);
        break;
      case "weather":
        drawWeatherFeed(env);
        break;
      case "snow":
        drawSnowFeed(env);
        break;
      case "timer":
        drawTimerFeed(env);
        break;
      default:
        drawSignalFeed(env);
        break;
    }
  }

  return {
    adaptiveDefaults,
    channelProfiles,
    channels,
    formatChannelValue,
    handleChannelStateChange,
    renderChannelScene,
    runtimeDefaults,
    stepChannelState
  };
})();
