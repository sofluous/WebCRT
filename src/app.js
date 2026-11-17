const {
  adaptiveDefaults,
  channelProfiles,
  channels,
  formatChannelValue,
  fillPureNoise,
  handleChannelStateChange,
  renderChannelScene,
  runtimeDefaults,
  stepChannelState
} = window.WebCRTChannels;

const canvas = document.getElementById("crt");
const ctx = canvas.getContext("2d", { alpha: false });
const screenShell = document.getElementById("screenShell");
const osd = document.getElementById("osd");
const osdHeadline = document.getElementById("osdHeadline");
const osdGrid = document.getElementById("osdGrid");
const state = {
  powerOn: true,
  channel: 0,
  tint: 24,
  hue: 168,
  saturation: 42,
  brightness: 62,
  warp: 22,
  noise: 32,
  noiseResolution: 2,
  lastTime: performance.now(),
  fps: 0,
  powerLevel: 1,
  sweepPhase: 0,
  osdTimer: 0,
  adaptive: { ...adaptiveDefaults },
  runtime: { ...runtimeDefaults },
  magnetX: 0.5,
  magnetY: 0.5,
  magnetForce: 0
};

const noiseCanvas = document.createElement("canvas");
const noiseCtx = noiseCanvas.getContext("2d", { alpha: false });
let lastNoiseRefresh = 0;
let noiseImageData = null;

const noisePresets = [
  { width: 72, height: 48, label: "72 x 48" },
  { width: 120, height: 80, label: "120 x 80" },
  { width: 180, height: 120, label: "180 x 120" },
  { width: 280, height: 186, label: "280 x 186" },
  { width: 420, height: 280, label: "420 x 280" }
];

const sceneCanvas = document.createElement("canvas");
const sceneCtx = sceneCanvas.getContext("2d", { alpha: false });

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function setCanvasSize() {
  const rect = screenShell.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 1.6);
  const width = Math.max(1, Math.round(rect.width * dpr));
  const height = Math.max(1, Math.round(rect.height * dpr));

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  if (sceneCanvas.width !== width || sceneCanvas.height !== height) {
    sceneCanvas.width = width;
    sceneCanvas.height = height;
  }
}

function updateNoiseCanvasSize() {
  const preset = noisePresets[state.noiseResolution];
  if (!preset) {
    return;
  }
  if (noiseCanvas.width !== preset.width || noiseCanvas.height !== preset.height) {
    noiseCanvas.width = preset.width;
    noiseCanvas.height = preset.height;
  }
}

function refreshNoise(time = performance.now() * .001) {
  if (!noiseImageData || noiseImageData.width !== noiseCanvas.width || noiseImageData.height !== noiseCanvas.height) {
    noiseImageData = noiseCtx.createImageData(noiseCanvas.width, noiseCanvas.height);
  }
  const imageData = noiseImageData;
  if (channels[state.channel].mode === 'noise') {
    fillPureNoise(imageData, state, time);
    noiseCtx.putImageData(imageData, 0, 0);
    return;
  }
  const pixels = imageData.data;
  const cyanLift = 12 + state.tint * 0.35;

  for (let i = 0; i < pixels.length; i += 4) {
    const value = Math.random() * 120 + 20;
    pixels[i] = value * 0.36;
    pixels[i + 1] = value * 0.72 + cyanLift;
    pixels[i + 2] = value * 0.82 + cyanLift * 0.5;
    pixels[i + 3] = 255;
  }

  noiseCtx.putImageData(imageData, 0, 0);
}

function getActiveProfile() {
  return channelProfiles[channels[state.channel].mode] || channelProfiles.signal;
}

function getControlValue(key) {
  if (Object.prototype.hasOwnProperty.call(state, key)) {
    return state[key];
  }
  return state.adaptive[key];
}

function formatAdaptiveValue(control, value) {
  if (!control) {
    return "--";
  }
  return formatChannelValue(control, value, state);
}

function showOsd() {
  state.osdTimer = performance.now() + 2200;
  osd.dataset.visible = "true";
}

function renderOsd() {
  const channel = channels[state.channel];
  const profile = getActiveProfile();
  const preset = noisePresets[state.noiseResolution];
  osdHeadline.textContent = "CH " + channel.number + "  " + channel.label;
  osdGrid.innerHTML = [
    ["Power", state.powerOn ? "On" : "Off"],
    ["Tint", String(state.tint)],
    ["Hue", String(state.hue)],
    ["Sat", String(state.saturation)],
    ["Bright", String(state.brightness)],
    [profile.dial.label, formatAdaptiveValue(profile.dial, getControlValue(profile.dial.key))],
    [profile.slider.label, formatAdaptiveValue(profile.slider, getControlValue(profile.slider.key))],
    [profile.toggle.label, formatAdaptiveValue(profile.toggle, getControlValue(profile.toggle.key))],
    [profile.button.label, formatAdaptiveValue(profile.button, getControlValue(profile.button.key))],
    ["Map", preset.label]
  ].map((row) => "<div>" + row[0] + "</div><div class=\"osd-value\">" + row[1] + "</div>").join("");
}

const controls = window.WebCRTControls.mount({
  state, channels, channelProfiles, noisePresets, formatValue: formatChannelValue,
  onChange(key) {
    handleChannelStateChange(state, key);
    if (key === 'noiseResolution') {
      updateNoiseCanvasSize();
    }
    // Refresh on retuning as well, so color noise never leaks into other feeds.
    refreshNoise();
    renderOsd();
    showOsd();
  }
});

function drawScene(time) {
  const width = sceneCanvas.width;
  const height = sceneCanvas.height;
  const channel = channels[state.channel];

  sceneCtx.clearRect(0, 0, width, height);
  renderChannelScene({ channels, channel, height, sceneCtx, state, time, width, noiseCanvas });

  // Pure noise is already the complete feed; omit the shared tinted overlay
  // and authored scan-bar decorations used by the other stations.
  if (channel.mode === 'noise') return;

  const detailBoost = state.noiseResolution / (noisePresets.length - 1);
  const snowBoost = channel.mode === "snow" ? (0.8 + state.adaptive.snowHiss / 55) : 1;
  const noiseAlpha = (0.04 + state.noise / 220 + detailBoost * 0.05) * snowBoost;
  sceneCtx.save();
  sceneCtx.globalAlpha = noiseAlpha;
  sceneCtx.imageSmoothingEnabled = false;
  sceneCtx.drawImage(noiseCanvas, 0, 0, width, height);
  sceneCtx.restore();

  sceneCtx.fillStyle = "rgba(123, 198, 214, 0.03)";
  for (let y = 0; y < height; y += Math.max(22, Math.round(height / 18))) {
    sceneCtx.fillRect(width * 0.06, y, width * 0.16, 2);
  }
}

function drawPoweredFrame(time) {
  const width = canvas.width;
  const height = canvas.height;
  const warpAmount = state.warp / 100;
  const activeHeight = height * (0.02 + state.powerLevel * 0.98);
  const visibleY = (height - activeHeight) * 0.5;

  ctx.fillStyle = "#010201";
  ctx.fillRect(0, 0, width, height);

  if (state.powerLevel < 0.025) {
    return;
  }

  const sliceHeight = Math.max(3, Math.round(height / 96));
  const centerX = width * state.magnetX;
  const centerY = height * state.magnetY;

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(0, visibleY, width, activeHeight, Math.max(18, width * 0.03));
  ctx.clip();

  for (let y = 0; y < height; y += sliceHeight) {
    const normalizedY = y / height - 0.5;
    const barrel = normalizedY * normalizedY * width * (0.006 + warpAmount * 0.014);
    const magnetDX = ((centerY - y) / height) * state.magnetForce * (centerX - width * 0.5) * 0.085;
    const offsetX = (normalizedY < 0 ? barrel : -barrel) + magnetDX;
    const destY = visibleY + (y / height) * activeHeight;
    ctx.drawImage(
      sceneCanvas,
      0,
      y,
      width,
      Math.min(sliceHeight, height - y),
      offsetX,
      destY,
      width,
      Math.ceil(activeHeight / height * Math.min(sliceHeight, height - y))
    );
  }

  const bloom = ctx.createRadialGradient(width * 0.5, height * 0.48, width * 0.1, width * 0.5, height * 0.5, width * 0.66);
  bloom.addColorStop(0, "rgba(162,226,238,0.12)");
  bloom.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = bloom;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

function render(now) {
  setCanvasSize();

  const delta = now - state.lastTime;
  state.lastTime = now;
  state.fps = 1000 / Math.max(16, delta);
  stepChannelState(state, delta);
  controls.refresh();
  renderOsd();

  const time = now * 0.001;
  state.powerLevel += ((state.powerOn ? 1 : 0) - state.powerLevel) * (state.powerOn ? 0.18 : 0.34);
  state.magnetForce *= 0.94;
  state.sweepPhase += delta * 0.001;

  if (now > state.osdTimer) {
    osd.dataset.visible = "false";
  }

  document.documentElement.style.setProperty("--power-level", state.powerLevel.toFixed(3));
  document.documentElement.style.setProperty("--screen-brightness", (state.brightness / 100).toFixed(3));

  if (now - lastNoiseRefresh > 90) {
    refreshNoise();
    lastNoiseRefresh = now;
  }

  drawScene(time);
  drawPoweredFrame(time);
  requestAnimationFrame(render);
}

canvas.addEventListener("pointerdown", (event) => {
  const rect = canvas.getBoundingClientRect();
  state.magnetX = clamp((event.clientX - rect.left) / rect.width, 0, 1);
  state.magnetY = clamp((event.clientY - rect.top) / rect.height, 0, 1);
  state.magnetForce = 1;
});

canvas.addEventListener("pointermove", (event) => {
  if ((event.buttons & 1) === 0) {
    return;
  }
  const rect = canvas.getBoundingClientRect();
  state.magnetX = clamp((event.clientX - rect.left) / rect.width, 0, 1);
  state.magnetY = clamp((event.clientY - rect.top) / rect.height, 0, 1);
  state.magnetForce = 1;
});

window.addEventListener("resize", setCanvasSize);

updateNoiseCanvasSize();
refreshNoise();
controls.refresh();
showOsd();
requestAnimationFrame(render);

