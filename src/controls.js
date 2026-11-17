/* Grouped rotary hardware; channel rendering and its state remain app-owned. */
window.WebCRTControls = {
  mount({ state, channels, channelProfiles, formatValue, noisePresets, onChange }) {
    const root = document.querySelector('.control-panel');
    const pictureControls = [
      { key: 'brightness', label: 'Bright', min: 0, max: 100, step: 1 },
      { key: 'tint', label: 'Tint', min: 0, max: 100, step: 1 },
      { key: 'hue', label: 'Hue', min: 140, max: 210, step: 1 },
      { key: 'saturation', label: 'Sat', min: 0, max: 100, step: 1 },
      { key: 'warp', label: 'Warp', min: 0, max: 100, step: 1 },
      { key: 'noise', label: 'Noise', min: 0, max: 100, step: 1 },
      { key: 'noiseResolution', label: 'Static', min: 0, max: noisePresets.length - 1, step: 1,
        options: noisePresets.map(preset => preset.label) }
    ];
    const selected = { picture: 'brightness', station: {} };
    const dials = new Map();
    let gesture = null;
    let lastSignature = '';
    let mountedMode = null;
    const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
    const valueOf = control => Object.hasOwn(state, control.key) ? state[control.key] : state.adaptive[control.key];

    function stationControls() {
      const profile = channelProfiles[channels[state.channel].mode];
      return [profile.dial, profile.slider,
        { ...profile.toggle, min: 0, max: 1, step: 1 },
        { ...profile.button, min: 0, max: profile.button.options.length - 1, step: 1 }];
    }

    function activeControl(group) {
      if (group === 'picture') return pictureControls.find(control => control.key === selected.picture);
      const mode = channels[state.channel].mode;
      return stationControls().find(control => control.key === selected.station[mode]) || stationControls()[0];
    }

    function announce(message) {
      document.getElementById('controlStatus').textContent = message;
    }

    function makeSelectors(group, controls) {
      const target = document.getElementById(group + 'Selectors');
      target.replaceChildren(...controls.map(control => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'setting-selector';
        button.dataset.key = control.key;
        button.textContent = control.label;
        button.addEventListener('click', () => {
          if (group === 'picture') selected.picture = control.key;
          else selected.station[channels[state.channel].mode] = control.key;
          refresh();
          announce(control.label + ' selected');
        });
        return button;
      }));
    }

    function refresh() {
      const mode = channels[state.channel].mode;
      const signature = [state.powerOn, state.channel, selected.picture, selected.station[mode],
        ...pictureControls.map(valueOf), ...stationControls().map(valueOf)].join('|');
      if (signature === lastSignature) return;
      lastSignature = signature;
      if (mountedMode !== mode) {
        if (gesture && gesture.group === 'station') finish(false);
        makeSelectors('station', stationControls());
        mountedMode = mode;
      }
      document.getElementById('channelNumber').textContent = channels[state.channel].number;
      document.getElementById('channelName').textContent = channels[state.channel].label;
      document.getElementById('powerState').textContent = state.powerOn ? 'ON' : 'OFF';
      document.getElementById('stationTitle').textContent = channels[state.channel].label;
      const tuner = dials.get('channel');
      tuner.wrap.dataset.power = state.powerOn ? 'on' : 'off';
      tuner.button.setAttribute('aria-pressed', String(!state.powerOn));
      tuner.button.setAttribute('aria-label', 'Channel ' + channels[state.channel].number + ', ' + channels[state.channel].label +
        (state.powerOn ? '. Push to turn off; rotate to tune.' : '. Pull out to turn on; rotate to tune.'));
      tuner.button.querySelector('.dial-grip').textContent = state.powerOn ? '' : 'PULL';
      for (const group of ['picture', 'station']) {
        const control = activeControl(group);
        const value = formatValue(control, valueOf(control), state);
        document.getElementById(group + 'Label').textContent = control.label;
        document.getElementById(group + 'Value').textContent = value;
        root.querySelectorAll('#' + group + 'Selectors button').forEach(button => {
          button.setAttribute('aria-pressed', String(button.dataset.key === control.key));
        });
        dials.get(group).button.setAttribute('aria-label', control.label + ': ' + value + '. Rotate to adjust; press for push.');
      }
    }

    function adjust(group, steps) {
      if (group === 'channel') {
        state.channel = ((state.channel + steps) % channels.length + channels.length) % channels.length;
        state.magnetForce = 1;
        onChange('channel');
      } else {
        const control = activeControl(group);
        const next = clamp(valueOf(control) + steps * control.step, control.min, control.max);
        if (Object.hasOwn(state, control.key)) state[control.key] = next;
        else state.adaptive[control.key] = next;
        onChange(control.key);
      }
      refresh();
    }

    function power(on) {
      state.powerOn = on;
      state.magnetForce = on ? 1.2 : 0;
      onChange('power');
      refresh();
      announce(on ? 'Power on. Tuner pulled out.' : 'Power off. Tuner pushed in.');
    }

    function push(group) {
      if (group === 'channel') power(!state.powerOn);
      else announce(activeControl(group).label + ': no push action assigned.');
    }

    function position() {
      if (!gesture) return;
      const { wrap, x, y, radius } = gesture;
      const size = wrap.getBoundingClientRect().width;
      wrap.style.setProperty('--cursor-x', (size / 2 + x) + 'px');
      wrap.style.setProperty('--cursor-y', (size / 2 + y) + 'px');
      wrap.style.setProperty('--gesture-angle', (Math.atan2(y, x) * 180 / Math.PI + 90) + 'deg');
      wrap.classList.toggle('at-rim', Math.hypot(x, y) >= radius - 3);
    }

    function finish(activate) {
      if (!gesture) return;
      const previous = gesture;
      gesture = null;
      previous.wrap.classList.remove('is-held', 'at-rim');
      delete root.dataset.gesture;
      if (document.pointerLockElement === previous.button) document.exitPointerLock();
      if (previous.button.hasPointerCapture(previous.id)) previous.button.releasePointerCapture(previous.id);
      if (activate && !previous.moved && !previous.pulled) push(previous.group);
    }

    function requestLock(current) {
      if (!current.button.requestPointerLock) {
        root.dataset.pointerMode = 'capture';
        return;
      }
      current.pendingLock = true;
      try {
        Promise.resolve(current.button.requestPointerLock()).then(() => {
          current.pendingLock = false;
          if (gesture !== current && document.pointerLockElement === current.button) document.exitPointerLock();
        }).catch(() => {
          current.pendingLock = false;
          root.dataset.pointerMode = 'capture';
        });
      } catch {
        current.pendingLock = false;
        root.dataset.pointerMode = 'capture';
      }
    }

    function start(event, group, wrap, button) {
      if (event.button !== 0 || gesture) return;
      event.preventDefault();
      button.focus({ preventScroll: true });
      const rect = wrap.getBoundingClientRect();
      const x = event.clientX - rect.left - rect.width / 2;
      const y = event.clientY - rect.top - rect.height / 2;
      gesture = { group, wrap, button, id: event.pointerId, x, y, startX: x, startY: y,
        lastAngle: Math.atan2(y, x), travel: 0, remainder: 0, radius: rect.width / 2 - 9,
        moved: false, pulled: false, locked: false, pendingLock: false,
        pulling: group === 'channel' && !state.powerOn && Math.hypot(x, y) < 27 };
      button.setPointerCapture(event.pointerId);
      wrap.classList.add('is-held');
      root.dataset.gesture = 'active';
      position();
      if (event.pointerType === 'mouse' && !gesture.pulling) requestLock(gesture);
    }

    function move(event) {
      const current = gesture;
      if (!current) return;
      const locked = document.pointerLockElement === current.button;
      if (!locked && event.pointerId !== current.id) return;
      const rect = current.wrap.getBoundingClientRect();
      let x = locked ? current.x + event.movementX : event.clientX - rect.left - rect.width / 2;
      let y = locked ? current.y + event.movementY : event.clientY - rect.top - rect.height / 2;
      const distance = Math.hypot(x, y);
      current.travel += Math.hypot(x - current.x, y - current.y);
      if (current.travel > 6) current.moved = true;
      if (current.pulling) {
        if (!current.pulled && current.startY - y > 14 && Math.abs(x - current.startX) < 35) {
          current.pulled = true;
          power(true);
        }
      } else {
        const previousRadius = Math.hypot(current.x, current.y);
        const angle = Math.atan2(y, x);
        // Unwrap the crossing at +/-180 degrees; ignore crossings through the center.
        const delta = ((angle - current.lastAngle + Math.PI * 3) % (Math.PI * 2) - Math.PI) * 180 / Math.PI;
        current.lastAngle = angle;
        if (distance > 20 && previousRadius > 20 && current.moved) {
          // Discard fractional overtravel when reversing so a clamped value responds immediately.
          if (Math.sign(delta) !== Math.sign(current.remainder)) current.remainder = 0;
          current.remainder += delta;
          const degreesPerStep = current.group === 'channel' ? 30 : 6;
          const steps = Math.trunc(current.remainder / degreesPerStep);
          if (steps) {
            current.remainder -= steps * degreesPerStep;
            adjust(current.group, steps);
          }
        }
      }
      if (distance > current.radius) {
        x = x / distance * current.radius;
        y = y / distance * current.radius;
      }
      current.x = x;
      current.y = y;
      position();
    }

    for (const wrap of root.querySelectorAll('.rotary')) {
      const group = wrap.dataset.group;
      const button = wrap.querySelector('button');
      dials.set(group, { wrap, button });
      button.addEventListener('pointerdown', event => start(event, group, wrap, button));
      button.addEventListener('pointercancel', () => finish(false));
      button.addEventListener('lostpointercapture', () => {
        if (gesture && !gesture.pendingLock && document.pointerLockElement !== button) finish(false);
      });
      button.addEventListener('click', event => { if (event.detail === 0) push(group); });
      button.addEventListener('keydown', event => {
        const direction = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 }[event.key];
        if (direction) {
          event.preventDefault();
          if (gesture) finish(false);
          adjust(group, direction);
        }
      });
      button.addEventListener('wheel', event => {
        if (!event.deltaY || gesture) return;
        event.preventDefault();
        adjust(group, event.deltaY < 0 ? 1 : -1);
      }, { passive: false });
    }
    document.addEventListener('pointermove', event => { if (!document.pointerLockElement) move(event); });
    document.addEventListener('mousemove', event => { if (document.pointerLockElement) move(event); });
    document.addEventListener('pointerup', event => {
      if (gesture && event.pointerId === gesture.id && !document.pointerLockElement) finish(true);
    });
    document.addEventListener('mouseup', () => { if (document.pointerLockElement) finish(true); });
    document.addEventListener('pointerlockchange', () => {
      if (!gesture) return;
      if (document.pointerLockElement === gesture.button) {
        gesture.locked = true;
        root.dataset.pointerMode = 'locked';
      } else if (gesture.locked) finish(false);
    });
    document.addEventListener('keydown', event => { if (event.key === 'Escape') finish(false); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) finish(false); });
    window.addEventListener('blur', () => finish(false));
    window.addEventListener('resize', () => finish(false));
    makeSelectors('picture', pictureControls);
    refresh();
    return { refresh };
  }
};
