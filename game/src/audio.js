// Padang Kilat — synthesised WebAudio sounds. No audio files, no network: every
// sound is built from oscillators and filtered noise at run time.
export function createAudio() {
  let ctx = null;
  let sizzleNodes = null;
  let muted = false;

  function ensure() {
    if (!ctx) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        ctx = new AC();
      } catch { ctx = null; }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }

  function tone(freq, dur, type, vol, when = 0, slideTo = 0) {
    const c = ensure();
    if (!c || muted) return;
    const t0 = c.currentTime + when;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function noiseBurst(dur, vol, filterFreq) {
    const c = ensure();
    if (!c || muted) return;
    const t0 = c.currentTime;
    const len = Math.max(1, Math.floor(c.sampleRate * dur));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource();
    src.buffer = buf;
    const filter = c.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    const gain = c.createGain();
    gain.gain.value = vol;
    src.connect(filter).connect(gain).connect(c.destination);
    src.start(t0);
  }

  return {
    unlock() { ensure(); },
    toggleMute() { muted = !muted; return muted; },
    chop() { noiseBurst(0.09, 0.5, 900); tone(180, 0.08, 'triangle', 0.25, 0, 90); },
    pickup() { tone(520, 0.07, 'sine', 0.18); },
    drop() { tone(300, 0.08, 'sine', 0.2, 0, 180); },
    ding() { tone(880, 0.35, 'sine', 0.22); tone(1320, 0.3, 'sine', 0.12, 0.02); },
    serve() { tone(523, 0.12, 'triangle', 0.22); tone(659, 0.12, 'triangle', 0.22, 0.09); tone(784, 0.22, 'triangle', 0.24, 0.18); },
    fail() { tone(220, 0.25, 'sawtooth', 0.12, 0, 110); },
    // Horror sting: a dissonant minor-2nd cluster over a low drone.
    sting() {
      tone(110, 1.4, 'sawtooth', 0.14, 0, 55);
      tone(116.5, 1.4, 'sawtooth', 0.14, 0.05);
      tone(233, 0.9, 'sine', 0.16, 0.1, 116);
      noiseBurst(0.5, 0.12, 400);
    },
    // Kuntilanak laugh: high, descending, a little too cheerful.
    laugh() {
      tone(1240, 0.09, 'sine', 0.14, 0);
      tone(1108, 0.09, 'sine', 0.14, 0.11);
      tone(988, 0.09, 'sine', 0.14, 0.22);
      tone(1240, 0.09, 'sine', 0.14, 0.33);
      tone(1108, 0.12, 'sine', 0.14, 0.44);
      tone(880, 0.2, 'sine', 0.12, 0.56, 660);
    },
    plate() { tone(1046, 0.1, 'triangle', 0.22); tone(1568, 0.18, 'triangle', 0.18, 0.07); },
    stage() { tone(392, 0.14, 'triangle', 0.2); tone(523, 0.14, 'triangle', 0.2, 0.12); tone(659, 0.24, 'triangle', 0.22, 0.24); },
    rush() { tone(392, 0.14, 'square', 0.1); tone(523, 0.14, 'square', 0.1, 0.13); tone(659, 0.2, 'square', 0.1, 0.26); },
    click() { tone(700, 0.05, 'sine', 0.15); },
    startSizzle() {
      const c = ensure();
      if (!c || muted || sizzleNodes) return;
      const len = c.sampleRate;
      const buf = c.createBuffer(1, len, c.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
      const src = c.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const filter = c.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 3000;
      const gain = c.createGain();
      gain.gain.value = 0.045;
      src.connect(filter).connect(gain).connect(c.destination);
      src.start();
      sizzleNodes = { src, gain };
    },
    stopSizzle() {
      if (!sizzleNodes) return;
      try { sizzleNodes.src.stop(); } catch { /* already stopped */ }
      sizzleNodes = null;
    },
  };
}
