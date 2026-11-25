// Padang Kilat — input.js
// Keyboard + mouse, distilled into one small object per frame. Movement keys
// stay in `keys`; one-shot actions (E, B, click, P, M, R, Enter) are edges:
// they are true for exactly one frame, then endFrame() clears them, so a
// held key never double-fires an action.
export function attachInput(canvas) {
  const input = {
    keys: {}, // held movement keys, lowercase ('w','arrowup', ...)
    mx: 0,
    my: 0,
    interact: false, // E / Space pressed this frame
    interactHeld: false, // E / Space currently held (for chopping)
    unlock: false, // B pressed this frame
    click: null, // {x, y} in canvas pixels, this frame
    pausePressed: false,
    mutePressed: false,
    restartPressed: false,
    startPressed: false,
    endFrame() {
      input.interact = false;
      input.unlock = false;
      input.click = null;
      input.pausePressed = false;
      input.mutePressed = false;
      input.restartPressed = false;
      input.startPressed = false;
    },
  };
  function toCanvas(e) {
    const r = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * canvas.width,
      y: ((e.clientY - r.top) / r.height) * canvas.height,
    };
  }
  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) {
      e.preventDefault();
    }
    if (k === 'e' || k === ' ') {
      if (!e.repeat) input.interact = true;
      input.interactHeld = true;
      return;
    }
    if (k === 'b' && !e.repeat) input.unlock = true;
    if (k === 'p' && !e.repeat) input.pausePressed = true;
    if (k === 'm' && !e.repeat) input.mutePressed = true;
    if (k === 'r' && !e.repeat) input.restartPressed = true;
    if (k === 'enter' && !e.repeat) input.startPressed = true;
    input.keys[k] = true;
  });
  window.addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'e' || k === ' ') input.interactHeld = false;
    delete input.keys[k];
  });
  canvas.addEventListener('mousemove', (e) => {
    const p = toCanvas(e);
    input.mx = p.x;
    input.my = p.y;
  });
  canvas.addEventListener('click', (e) => {
    const p = toCanvas(e);
    input.click = p;
    input.mx = p.x;
    input.my = p.y;
    if (input.startPressed === false) input.startPressed = true;
  });
  return input;
}
