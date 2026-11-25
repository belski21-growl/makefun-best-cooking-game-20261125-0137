// Padang Kilat — audio.js
// All sound is synthesized live with WebAudio: a Minang-style backing of
// talempong (pentatonic, ~106 BPM), saluang (breathy sine + vibrato) and a
// gong every eight bars — no audio files, no recordings, nothing copyrighted.
// Everything is guarded: no AudioContext, a suspended context, or mute all
// mean silence instead of an exception. The music stops when the kuntilanak
// arrives and resumes when she leaves.
const BPM = 106;
const STEP = 60 / BPM / 4; // one sixteenth note
// Pentatonic ladder (C major pentatonic), two octaves.
const SCALE = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
// Talempong pattern: 2 bars of 16 steps. null = rest, number = SCALE index.
const TALEMPONG = [
  5, null, 7, null, 8, null, 7, null, 6, null, 5, null, 4, null, 5, null,
  7, null, 8, null, 9, null, 8, null, 7, null, 6, null, 5, null, 4, null,
];
// Saluang: one long note per bar, breathing across the phrase.
const SALUANG = [6, 4, 5, 7];

export function createAudio() {
  let ctx = null;
  let master = null;
  let muted = false;
  let horror = false;
  let timer = null;
  let nextTime = 0;
  let step = 0;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
      return true;
    } catch (e) {
      return false;
    }
  }
  function tone(freq, dur, type, gain, when, slideTo) {
    if (!ctx || !master || muted) return;
    try {
      const t = when || ctx.currentTime;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(gain, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g);
      g.connect(master);
      o.start(t);
      o.stop(t + dur + 0.05);
    } catch (e) { /* silence on any audio error */ }
  }
  function noiseBurst(dur, gain, when) {
    if (!ctx || !master || muted) return;
    try {
      const t = when || ctx.currentTime;
      const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource();
      const g = ctx.createGain();
      src.buffer = buf;
      g.gain.value = gain;
      src.connect(g);
      g.connect(master);
      src.start(t);
    } catch (e) { /* silence */ }
  }
  function scheduleStep(s, t) {
    if (horror) return;
    const bar = Math.floor(s / 16);
    const pos = s % 16;
    // Gong every 8 bars, on the first step.
    if (s % 128 === 0) {
      tone(55, 3.5, 'sine', 0.5, t);
      tone(82.41, 3.0, 'sine', 0.25, t);
    }
    // Soft drum thump at the top of every bar.
    if (pos === 0) tone(150, 0.18, 'sine', 0.35, t, 60);
    if (pos === 8) tone(110, 0.12, 'sine', 0.18, t, 70);
    // Talempong: bright triangle, fast decay, on the pattern.
    const degree = TALEMPONG[s % 32];
    if (degree !== null && degree !== undefined) {
      tone(SCALE[degree], 0.45, 'triangle', 0.28, t);
      tone(SCALE[degree] * 2, 0.2, 'sine', 0.08, t);
    }
    // Saluang: one long breathing note per bar, sine with vibrato.
    if (pos === 0) {
      const f = SCALE[SALUANG[bar % SALUANG.length]];
      try {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = f;
        lfo.type = 'sine';
        lfo.frequency.value = 5.5;
        lfoGain.gain.value = 6;
        lfo.connect(lfoGain);
        lfoGain.connect(o.frequency);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.14, t + 0.4);
        g.gain.setValueAtTime(0.14, t + STEP * 12);
        g.gain.linearRampToValueAtTime(0, t + STEP * 16);
        o.connect(g);
        g.connect(master);
        o.start(t);
        o.stop(t + STEP * 16 + 0.05);
        lfo.start(t);
        lfo.stop(t + STEP * 16 + 0.05);
      } catch (e) { /* silence */ }
    }
  }
  function tick() {
    if (!ctx || ctx.state !== 'running') return;
    while (nextTime < ctx.currentTime + 0.25) {
      scheduleStep(step, nextTime);
      step += 1;
      nextTime += STEP;
    }
  }
  return {
    get muted() { return muted; },
    start() {
      if (!ensure()) return;
      try {
        if (ctx.state === 'suspended') ctx.resume();
        if (!timer) {
          nextTime = ctx.currentTime + 0.1;
          step = 0;
          timer = setInterval(tick, 90);
        }
      } catch (e) { /* silence */ }
    },
    stop() {
      if (timer) { clearInterval(timer); timer = null; }
      if (ctx) { try { ctx.suspend(); } catch (e) {} }
    },
    setMuted(m) {
      muted = !!m;
      if (master) master.gain.value = muted ? 0 : 0.5;
    },
    toggleMute() {
      this.setMuted(!muted);
      return muted;
    },
    setHorror(h) {
      horror = !!h;
      if (horror) {
        // The room goes quiet when she arrives; the sting does the talking.
        if (ctx) {
          try { master.gain.setValueAtTime(0.06, ctx.currentTime); } catch (e) {}
        }
      } else if (ctx && !muted) {
        try { master.gain.setValueAtTime(0.5, ctx.currentTime); } catch (e) {}
      }
    },
    sfx: {
      chop() { noiseBurst(0.09, 0.4); tone(180, 0.08, 'square', 0.12); },
      ding() { tone(880, 0.3, 'sine', 0.25); tone(1318.5, 0.4, 'sine', 0.18, ctx ? ctx.currentTime + 0.08 : 0); },
      serve() { tone(659.25, 0.2, 'sine', 0.25); tone(987.77, 0.35, 'sine', 0.25, ctx ? ctx.currentTime + 0.1 : 0); },
      fail() { tone(220, 0.5, 'sawtooth', 0.2, 0, 110); },
      coin() { tone(1318.5, 0.12, 'sine', 0.2); tone(1760, 0.2, 'sine', 0.2, ctx ? ctx.currentTime + 0.07 : 0); },
      click() { tone(1200, 0.06, 'square', 0.12); },
      unlock() { tone(523.25, 0.15, 'triangle', 0.25); tone(783.99, 0.3, 'triangle', 0.25, ctx ? ctx.currentTime + 0.12 : 0); },
      sting() {
        // A dissonant cluster, the sound of her arrival.
        tone(110, 1.4, 'sawtooth', 0.22);
        tone(116.54, 1.4, 'sawtooth', 0.22);
        tone(220, 1.0, 'sine', 0.15);
        noiseBurst(0.5, 0.1);
      },
      laugh() {
        // Three short descending blips, like a laugh in the dark.
        const now = ctx ? ctx.currentTime : 0;
        tone(880, 0.12, 'square', 0.1, now);
        tone(740, 0.12, 'square', 0.1, now + 0.14);
        tone(587, 0.25, 'square', 0.1, now + 0.28);
      },
    },
  };
}
