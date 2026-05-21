const {
  adaptiveDefaults,
  channelProfiles,
  channels,
  formatChannelValue,
  handleChannelStateChange,
  renderChannelScene,
  runtimeDefaults,
  stepChannelState
} = window.WebCRTChannels;

const canvas = document.getElementById("crt");
const ctx = canvas.getContext("2d", { alpha: false });
const screenShell = document.getElementById("screenShell");
const powerButton = document.getElementById("powerButton");
const osd = document.getElementById("osd");
const osdHeadline = document.getElementById("osdHeadline");
const osdGrid = document.getElementById("osdGrid");
const channelNumber = document.getElementById("channelNumber");
const channelName = document.getElementById("channelName");
const channelKnob = document.getElementById("channelKnob");
const channelUp = document.getElementById("channelUp");
const channelDown = document.getElementById("channelDown");
const adaptiveTitle = document.getElementById("adaptiveTitle");
const adaptiveState = document.getElementById("adaptiveState");
const adaptiveDialLabel = document.getElementById("adaptiveDialLabel");
const adaptiveDial = document.getElementById("adaptiveDial");
const adaptiveSliderLabel = document.getElementById("adaptiveSliderLabel");
const adaptiveSlider = document.getElementById("adaptiveSlider");
const adaptiveToggleLabel = document.getElementById("adaptiveToggleLabel");
const adaptiveToggle = document.getElementById("adaptiveToggle");
const adaptiveButtonLabel = document.getElementById("adaptiveButtonLabel");
const adaptiveButton = document.getElementById("adaptiveButton");

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

function refreshNoise() {
  const imageData = noiseCtx.createImageData(noiseCanvas.width, noiseCanvas.height);
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

function setKnobRotation(knob, min, max, value) {
  const ratio = max === min ? 0 : (value - min) / (max - min);
  const degrees = -135 + ratio * 270;
  knob.style.setProperty("--rotation", degrees + "deg");
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

function setControlValue(key, nextValue) {
  if (Object.prototype.hasOwnProperty.call(state, key)) {
    state[key] = nextValue;
  } else {
    state.adaptive[key] = nextValue;
  }
}

function formatAdaptiveValue(control, value) {
  if (!control) {
    return "--";
  }
  return formatChannelValue(control, value, state);
}

function renderAdaptivePanel() {
  const profile = getActiveProfile();
  const dialValue = getControlValue(profile.dial.key);
  const sliderValue = getControlValue(profile.slider.key);
  const toggleValue = getControlValue(profile.toggle.key);
  const buttonValue = getControlValue(profile.button.key);

  adaptiveTitle.textContent = profile.title;
  adaptiveState.textContent = "CH " + channels[state.channel].number + " / " + profile.status;

  adaptiveDialLabel.textContent = profile.dial.label;
  adaptiveDial.dataset.control = profile.dial.key;
  adaptiveDial.dataset.min = String(profile.dial.min);
  adaptiveDial.dataset.max = String(profile.dial.max);
  adaptiveDial.dataset.step = String(profile.dial.step);
  setKnobRotation(adaptiveDial, profile.dial.min, profile.dial.max, dialValue);

  adaptiveSliderLabel.textContent = profile.slider.label;
  adaptiveSlider.min = String(profile.slider.min);
  adaptiveSlider.max = String(profile.slider.max);
  adaptiveSlider.step = String(profile.slider.step);
  adaptiveSlider.value = String(sliderValue);

  adaptiveToggleLabel.textContent = profile.toggle.label;
  adaptiveToggle.textContent = formatAdaptiveValue(profile.toggle, toggleValue);
  adaptiveToggle.dataset.state = toggleValue ? "on" : "off";

  adaptiveButtonLabel.textContent = profile.button.label;
  adaptiveButton.textContent = formatAdaptiveValue(profile.button, buttonValue);

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

function updateControlReadouts() {
  powerButton.dataset.on = String(state.powerOn);
  powerButton.setAttribute("aria-pressed", String(state.powerOn));

  const channel = channels[state.channel];
  channelNumber.textContent = channel.number;
  channelName.textContent = channel.label;
  updateNoiseCanvasSize();
  renderAdaptivePanel();
  renderOsd();

  const knobElements = document.querySelectorAll(".knob[data-control]");
  knobElements.forEach((knob) => {
    const key = knob.dataset.control;
    const min = Number(knob.dataset.min);
    const max = Number(knob.dataset.max);
    setKnobRotation(knob, min, max, getControlValue(key));
  });
}

function setChannel(index) {
  const maxIndex = channels.length - 1;
  state.channel = ((index % channels.length) + channels.length) % channels.length;
  setKnobRotation(channelKnob, 0, maxIndex, state.channel);
  updateControlReadouts();
  showOsd();
}

function nudgeChannel(delta) {
  setChannel(state.channel + delta);
  state.magnetForce = 1;
}

function adjustControl(key, nextValue) {
  const knob = document.querySelector('.knob[data-control="' + key + '"]');
  if (!knob) {
    return;
  }

  if (key === "noiseResolution") {
    setNoiseResolution(nextValue);
    setKnobRotation(knob, 0, noisePresets.length - 1, state.noiseResolution);
    showOsd();
    return;
  }

  const min = Number(knob.dataset.min);
  const max = Number(knob.dataset.max);
  const step = Number(knob.dataset.step);
  const snapped = Math.round(nextValue / step) * step;
  if (Object.prototype.hasOwnProperty.call(state, key)) {
    state[key] = clamp(snapped, min, max);
  } else {
    state.adaptive[key] = clamp(snapped, min, max);
  }
  handleChannelStateChange(state, key);
  setKnobRotation(knob, min, max, getControlValue(key));
  updateControlReadouts();
  showOsd();
}

function setAdaptiveSliderValue(nextValue) {
  const profile = getActiveProfile();
  const control = profile.slider;
  const snapped = Math.round(nextValue / control.step) * control.step;
  setControlValue(control.key, clamp(snapped, control.min, control.max));
  handleChannelStateChange(state, control.key);
  updateControlReadouts();
  showOsd();
}

function toggleAdaptiveValue() {
  const profile = getActiveProfile();
  const control = profile.toggle;
  setControlValue(control.key, getControlValue(control.key) ? 0 : 1);
  handleChannelStateChange(state, control.key);
  updateControlReadouts();
  showOsd();
}

function cycleAdaptiveButton() {
  const profile = getActiveProfile();
  const control = profile.button;
  const count = Array.isArray(control.options) ? control.options.length : 0;
  if (!count) {
    return;
  }
  const nextIndex = (getControlValue(control.key) + 1) % count;
  setControlValue(control.key, nextIndex);
  handleChannelStateChange(state, control.key);
  updateControlReadouts();
  showOsd();
}

function setNoiseResolution(index) {
  state.noiseResolution = clamp(Math.round(index), 0, noisePresets.length - 1);
  updateNoiseCanvasSize();
  refreshNoise();
  renderOsd();
}

function togglePower() {
  state.powerOn = !state.powerOn;
  if (state.powerOn) {
    state.magnetForce = 1.2;
  } else {
    state.magnetForce = 0;
  }
  updateControlReadouts();
  showOsd();
}

function drawScene(time) {
  const width = sceneCanvas.width;
  const height = sceneCanvas.height;
  const channel = channels[state.channel];

  sceneCtx.clearRect(0, 0, width, height);
  renderChannelScene({ channels, channel, height, sceneCtx, state, time, width });

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

function bindKnob(knob) {
  const key = knob.dataset.control;
  const min = Number(knob.dataset.min);
  const max = Number(knob.dataset.max);
  const step = Number(knob.dataset.step);
  const sensitivity = key === "channel" ? 0.035 : 0.28;

  let startY = 0;
  let startValue = 0;

  const onMove = (event) => {
    const delta = startY - event.clientY;
    const nextValue = startValue + delta * sensitivity * step;
    if (key === "channel") {
      setChannel(Math.round(nextValue));
    } else {
      adjustControl(key, nextValue);
    }
  };

  const onUp = () => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
  };

  knob.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    startY = event.clientY;
    startValue = getControlValue(key);
    knob.setPointerCapture(event.pointerId);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  });

  knob.addEventListener("wheel", (event) => {
    event.preventDefault();
    const direction = event.deltaY > 0 ? -1 : 1;
    if (key === "channel") {
      nudgeChannel(direction);
    } else if (key === "noiseResolution") {
      setNoiseResolution(state.noiseResolution + direction);
      showOsd();
    } else {
      adjustControl(key, getControlValue(key) + direction * step);
    }
  });
}

powerButton.addEventListener("click", togglePower);
channelUp.addEventListener("click", () => nudgeChannel(1));
channelDown.addEventListener("click", () => nudgeChannel(-1));
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

document.querySelectorAll(".knob[data-control]").forEach(bindKnob);
adaptiveSlider.addEventListener("input", () => {
  setAdaptiveSliderValue(Number(adaptiveSlider.value));
});
adaptiveToggle.addEventListener("click", toggleAdaptiveValue);
adaptiveButton.addEventListener("click", cycleAdaptiveButton);

window.addEventListener("resize", setCanvasSize);

updateNoiseCanvasSize();
refreshNoise();
updateControlReadouts();
setChannel(0);
showOsd();
requestAnimationFrame(render);

