// Padang Kilat — synthesised WebAudio sounds. No audio files, no network: every
// sound is built from oscillators and filtered noise at run time.
export function createAudio() {
  let ctx = null;
  let sizzleNodes = null;
  let muted = false;
  // Backsound: an ORIGINAL Minang-flavoured loop, all synth, no recordings.
  let musicTimer = null;
  let musicGain = null;
  let musicStep = 0;
  let nextNoteTime = 0;

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

  // Pentatonic talempong melody (A minor pentatonic: A C D E G), 64 eighth
  // steps = 8 bars. 0 = rest. Composed for this game — no existing tune.
  const SCALE = { A4: 440, C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880, E4: 329.63, D4: 293.66 };
  const MELODY = [
    'E5', 0, 'G5', 0, 'A5', 0, 'G5', 'E5',
    'D5', 0, 'E5', 0, 'G5', 0, 'E5', 0,
    'E5', 0, 'G5', 0, 'A5', 'G5', 'E5', 'D5',
    'C5', 0, 'D5', 'E5', 0, 0, 'D5', 0,
    'E5', 0, 'G5', 0, 'A5', 0, 'G5', 'E5',
    'A5', 0, 'G5', 'E5', 'D5', 0, 'E5', 0,
    'D5', 'C5', 'D5', 0, 'E5', 0, 'D5', 'C5',
    'A4', 0, 'C5', 'D5', 'E5', 0, 'D5', 0,
  ];
  // Saluang (flute): one long breath per two bars, root notes of the phrase.
  const SALUANG = ['A4', 'E5', 'A4', 'D5'];
  const GONG_FREQ = 55;

  function musicNote(freq, t0, dur, type, vol) {
    if (!ctx || !musicGain) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(musicGain);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function scheduleMusicStep(step, t0, eighth) {
    // Talempong: bright triangle, fast decay — the plucked metallophone.
    const m = MELODY[step % 64];
    if (m) musicNote(SCALE[m], t0, eighth * 1.8, 'triangle', 0.055);
    // Soft drum pulse on every bar start.
    if (step % 8 === 0) musicNote(98, t0, 0.16, 'sine', 0.05);
    // Saluang: long sine with vibrato, one breath per two bars.
    if (step % 16 === 0) {
      const f = SCALE[SALUANG[(step / 16) % 4]];
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t0);
      lfo.frequency.value = 5.5;
      lfoGain.gain.value = 5;
      lfo.connect(lfoGain).connect(osc.frequency);
      const dur = eighth * 16;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.038, t0 + 0.5);
      gain.gain.setValueAtTime(0.038, t0 + dur - 0.6);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain).connect(musicGain);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
      lfo.start(t0);
      lfo.stop(t0 + dur + 0.05);
    }
    // Gong: low sine, long decay, once per 8-bar loop.
    if (step % 64 === 0) {
      musicNote(GONG_FREQ, t0, 3.5, 'sine', 0.11);
      musicNote(GONG_FREQ * 2, t0, 2.2, 'sine', 0.045);
    }
  }

  return {
    unlock() { ensure(); },
    toggleMute() {
      muted = !muted;
      if (musicGain) {
        try { musicGain.gain.value = muted ? 0 : 0.9; } catch { /* node gone */ }
      }
      return muted;
    },
    // ---- backsound: talempong + saluang + gong, ~106 BPM, 8-bar loop ----
    startMusic() {
      try {
        const c = ensure();
        if (!c || muted || musicTimer) return;
        if (c.state !== 'running') return; // headless/suspended: never throw, never pile up
        if (!musicGain) {
          musicGain = c.createGain();
          musicGain.gain.value = 0.9;
          musicGain.connect(c.destination);
        }
        musicStep = 0;
        nextNoteTime = c.currentTime + 0.08;
        musicTimer = setInterval(() => {
          try {
            if (!ctx || ctx.state !== 'running' || muted) return;
            if (nextNoteTime < ctx.currentTime - 0.1) nextNoteTime = ctx.currentTime + 0.05;
            const eighth = 60 / 106 / 2; // ~106 BPM, 8th notes
            while (nextNoteTime < ctx.currentTime + 0.35) {
              scheduleMusicStep(musicStep, nextNoteTime, eighth);
              nextNoteTime += eighth;
              musicStep = (musicStep + 1) % 64; // 8 bars × 8 eighths
            }
          } catch { /* scheduler must never throw */ }
        }, 90);
      } catch { /* audio unavailable: the game plays silent */ }
    },
    stopMusic() {
      if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
    },
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
