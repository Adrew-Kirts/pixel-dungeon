const MASTER_VOLUME = 0.3;

export function createAudio(storage, env = globalThis) {
  let context = null;
  let master = null;
  let noiseBuffer = null;
  let muted = storage.get('muted') === '1';

  function playSilentSample() {
    const buffer = context.createBuffer(1, 1, context.sampleRate);
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    source.start(0);
  }

  const STUCK_MS = 1000;
  const clock = typeof env.now === 'function' ? env.now : () => (env.performance !== undefined ? env.performance.now() : Date.now());
  let resumeRequestedAt = null;

  function createContext() {
    const AudioContextClass = env.AudioContext ?? env.webkitAudioContext;
    if (typeof AudioContextClass !== 'function') return false;
    try {
      context = new AudioContextClass();
    } catch {
      context = null;
      return false;
    }
    master = context.createGain();
    master.gain.value = MASTER_VOLUME;
    master.connect(context.destination);
    noiseBuffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
    const channel = noiseBuffer.getChannelData(0);
    for (let index = 0; index < channel.length; index++) channel[index] = Math.random() * 2 - 1;
    return true;
  }

  function resume() {
    const resumed = context.resume();
    if (resumed !== undefined && typeof resumed.catch === 'function') resumed.catch(() => {});
  }

  function unlock() {
    const time = clock();
    if (context !== null && context.state === 'running') {
      resumeRequestedAt = null;
      return;
    }
    if (context !== null && context.state !== 'closed' && (resumeRequestedAt === null || time - resumeRequestedAt < STUCK_MS)) {
      if (resumeRequestedAt === null) resumeRequestedAt = time;
      resume();
      playSilentSample();
      return;
    }
    if (context !== null) {
      const stale = context;
      context = null;
      if (typeof stale.close === 'function' && stale.state !== 'closed') {
        const closing = stale.close();
        if (closing !== undefined && typeof closing.catch === 'function') closing.catch(() => {});
      }
    }
    if (createContext() === false) return;
    playSilentSample();
    resumeRequestedAt = null;
    if (context.state !== 'running') {
      resumeRequestedAt = time;
      resume();
    }
  }

  function ready() {
    return context !== null && context.state === 'running' && muted === false;
  }

  function tone({ type = 'square', from, to = from, ms, vol = 0.2, delay = 0, attack = 5 }) {
    if (ready() === false) return;
    const start = context.currentTime + delay / 1000;
    const end = start + ms / 1000;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(from, start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, to), end);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(vol, start + attack / 1000);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    oscillator.connect(gain).connect(master);
    oscillator.start(start);
    oscillator.stop(end + 0.03);
  }

  function noise({ ms, vol = 0.2, from = 2000, to = from, q = 0.8, type = 'lowpass', delay = 0 }) {
    if (ready() === false) return;
    const start = context.currentTime + delay / 1000;
    const end = start + ms / 1000;
    const source = context.createBufferSource();
    source.buffer = noiseBuffer;
    source.loop = true;
    const filter = context.createBiquadFilter();
    filter.type = type;
    filter.Q.value = q;
    filter.frequency.setValueAtTime(from, start);
    filter.frequency.exponentialRampToValueAtTime(Math.max(20, to), end);
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(vol, start + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    source.connect(filter).connect(gain).connect(master);
    source.start(start, Math.random() * 0.5);
    source.stop(end + 0.03);
  }

  function melody(notes, { type = 'square', vol = 0.12, step = 110, length = 150 } = {}, delay = 0) {
    notes.forEach((frequency, index) => {
      if (frequency > 0) tone({ type, from: frequency, ms: length, vol, delay: delay + index * step });
    });
  }

  const sfx = {
    typing: () => tone({ type: 'square', from: 1300 + Math.random() * 300, ms: 14, vol: 0.025 }),
    glitch: () => {
      noise({ ms: 240, vol: 0.12, from: 6000, to: 800, type: 'bandpass', q: 2 });
      tone({ type: 'sawtooth', from: 80, to: 1200, ms: 200, vol: 0.05 });
    },
    select: () => tone({ type: 'square', from: 660, to: 990, ms: 70, vol: 0.09 }),
    tick: () => tone({ type: 'square', from: 1046, ms: 30, vol: 0.06 }),
    roll: () => tone({ type: 'triangle', from: 520 + Math.random() * 380, ms: 28, vol: 0.12 }),
    step: () => noise({ ms: 45, vol: 0.05, from: 900, to: 300 }),
    whoosh: () => noise({ ms: 130, vol: 0.12, from: 500, to: 2600, type: 'bandpass', q: 1.2 }),
    hit: () => {
      noise({ ms: 110, vol: 0.32, from: 2600, to: 300 });
      tone({ type: 'square', from: 240, to: 80, ms: 100, vol: 0.14 });
    },
    crit: () => {
      noise({ ms: 260, vol: 0.42, from: 5200, to: 200 });
      tone({ type: 'sawtooth', from: 520, to: 55, ms: 260, vol: 0.16 });
      melody([1319, 1568, 2093], { type: 'square', step: 55, length: 110, vol: 0.07 });
    },
    glance: () => {
      noise({ ms: 70, vol: 0.18, from: 900, to: 300 });
      tone({ type: 'triangle', from: 170, to: 120, ms: 80, vol: 0.18 });
    },
    hurt: () => {
      tone({ type: 'square', from: 320, to: 110, ms: 170, vol: 0.13 });
      noise({ ms: 90, vol: 0.18, from: 1400, to: 300 });
    },
    zap: () => {
      noise({ ms: 260, vol: 0.28, from: 7000, to: 1500, type: 'highpass' });
      tone({ type: 'sawtooth', from: 1800, to: 300, ms: 220, vol: 0.08 });
    },
    fire: () => noise({ ms: 320, vol: 0.26, from: 400, to: 2400, type: 'bandpass', q: 0.7 }),
    boom: () => {
      noise({ ms: 420, vol: 0.45, from: 1200, to: 60 });
      tone({ type: 'sine', from: 120, to: 40, ms: 380, vol: 0.35 });
    },
    land: () => {
      noise({ ms: 260, vol: 0.4, from: 420, to: 50 });
      tone({ type: 'sine', from: 95, to: 38, ms: 320, vol: 0.4 });
    },
    thud: () => {
      noise({ ms: 90, vol: 0.18, from: 500, to: 80 });
      tone({ type: 'sine', from: 140, to: 60, ms: 110, vol: 0.2 });
    },
    rumble: () => noise({ ms: 1100, vol: 0.22, from: 160, to: 70, q: 3 }),
    chestShake: () => tone({ type: 'triangle', from: 190, to: 250, ms: 70, vol: 0.14 }),
    chestOpen: () => melody([523, 659, 784, 1047], { step: 65, length: 120, vol: 0.1 }),
    item: () => melody([784, 988, 1175, 1568], { type: 'triangle', step: 60, length: 170, vol: 0.16 }),
    smug: () => melody([392, 0, 330], { type: 'triangle', step: 120, length: 160, vol: 0.14 }),
    potion: () => {
      for (let index = 0; index < 3; index++) tone({ type: 'sine', from: 320 + index * 120, to: 520 + index * 120, ms: 90, vol: 0.16, delay: index * 90 });
    },
    coin: () => {
      tone({ type: 'square', from: 988, ms: 60, vol: 0.07 });
      tone({ type: 'square', from: 1319, ms: 140, vol: 0.07, delay: 60 });
    },
    roar: () => {
      noise({ ms: 1000, vol: 0.4, from: 700, to: 110, q: 5 });
      tone({ type: 'sawtooth', from: 118, to: 52, ms: 950, vol: 0.18 });
      tone({ type: 'sawtooth', from: 124, to: 48, ms: 950, vol: 0.14, delay: 30 });
    },
    breath: () => noise({ ms: 700, vol: 0.3, from: 3400, to: 500, type: 'bandpass', q: 0.6 }),
    victory: () => melody([523, 659, 784, 1047, 0, 784, 1047, 1319], { step: 115, length: 170, vol: 0.12 }),
    defeat: () => melody([392, 370, 349, 262], { type: 'triangle', step: 260, length: 300, vol: 0.18 }),
    magic: () => melody([988, 1319, 1568, 1976, 2637], { type: 'triangle', step: 45, length: 140, vol: 0.1 }),
    laugh: () => melody([523, 0, 494, 0, 466, 0, 440], { type: 'square', step: 70, length: 60, vol: 0.08 }),
    fanfare: () => melody([659, 784, 988, 1319], { type: 'square', step: 80, length: 150, vol: 0.1 }),
    buzz: () => {
      tone({ type: 'sawtooth', from: 110, to: 90, ms: 420, vol: 0.08 });
      noise({ ms: 380, vol: 0.1, from: 900, to: 300, type: 'bandpass', q: 3 });
    },
    alarm: () => melody([1568, 0, 1568], { type: 'square', step: 60, length: 50, vol: 0.09 }),
    arrow: () => noise({ ms: 180, vol: 0.14, from: 3000, to: 900, type: 'bandpass', q: 2 }),
    jump: () => tone({ type: 'square', from: 330, to: 880, ms: 120, vol: 0.08 }),
    dawn: () => {
      melody([131, 196, 262], { type: 'triangle', step: 520, length: 900, vol: 0.14 });
      melody([330, 311], { type: 'sawtooth', step: 260, length: 700, vol: 0.05 }, 1560);
      noise({ ms: 900, vol: 0.2, from: 140, to: 60, q: 2, delay: 2100 });
    },
    charge: () => tone({ type: 'sawtooth', from: 180, to: 1400, ms: 380, vol: 0.05 }),
    laser: () => {
      tone({ type: 'square', from: 1800, to: 220, ms: 260, vol: 0.08 });
      noise({ ms: 260, vol: 0.12, from: 4000, to: 900, type: 'bandpass', q: 1.5 });
    },
    powerDown: () => tone({ type: 'sawtooth', from: 440, to: 40, ms: 1300, vol: 0.07 }),
    voice: () => tone({ type: 'square', from: 140 + Math.random() * 90, ms: 38, vol: 0.05 }),
    grunt: () => tone({ type: 'sawtooth', from: 110 + Math.random() * 30, to: 80, ms: 60, vol: 0.06 }),
    chime: () => melody([1568, 2093, 2637], { type: 'triangle', step: 55, length: 160, vol: 0.06 }),
    pixie: () => tone({ type: 'triangle', from: 1900 + Math.random() * 500, ms: 26, vol: 0.035 }),
    door: () => {
      tone({ type: 'sawtooth', from: 190, to: 120, ms: 420, vol: 0.04 });
      noise({ ms: 380, vol: 0.06, from: 700, to: 300, type: 'bandpass', q: 4 });
    },
    slam: () => {
      noise({ ms: 260, vol: 0.3, from: 400, to: 60, q: 1 });
      tone({ type: 'square', from: 90, to: 50, ms: 220, vol: 0.12 });
    },
    clang: () => {
      tone({ type: 'square', from: 1760, to: 1500, ms: 120, vol: 0.08 });
      tone({ type: 'triangle', from: 2637, ms: 260, vol: 0.07, delay: 10 });
      noise({ ms: 70, vol: 0.12, from: 5000, to: 2000, type: 'highpass', q: 1 });
    },
    block: () => {
      noise({ ms: 110, vol: 0.2, from: 900, to: 200, q: 1 });
      tone({ type: 'square', from: 220, to: 150, ms: 90, vol: 0.08 });
    },
    shatter: () => {
      noise({ ms: 420, vol: 0.22, from: 6000, to: 900, type: 'bandpass', q: 1.5 });
      melody([880, 622, 440], { type: 'square', step: 70, length: 90, vol: 0.06 });
    },
    drum: () => {
      tone({ type: 'sine', from: 150, to: 50, ms: 160, vol: 0.3 });
      noise({ ms: 60, vol: 0.08, from: 2000, to: 800, q: 1 });
    },
    splat: () => {
      noise({ ms: 520, vol: 0.32, from: 1200, to: 120, q: 0.8 });
      tone({ type: 'sine', from: 180, to: 40, ms: 380, vol: 0.2 });
    },
    flutter: () => noise({ ms: 180, vol: 0.08, from: 300, to: 900, type: 'bandpass', q: 3 }),
    beep: () => melody([1319, 1760], { type: 'square', step: 70, length: 60, vol: 0.06 }),
    denied: () => melody([220, 0, 220], { type: 'square', step: 90, length: 80, vol: 0.08 }),
    slurp: () => noise({ ms: 700, vol: 0.12, from: 500, to: 1500, type: 'bandpass', q: 6 }),
  };

  let doomNodes = null;
  const doomTimers = [];

  function clearDoomTimers() {
    for (const timer of doomTimers.splice(0)) clearTimeout(timer);
  }

  const doom = {
    start() {
      if (doomNodes !== null || ready() === false) return;
      const now = context.currentTime;
      const bus = context.createGain();
      bus.gain.setValueAtTime(0.0001, now);
      bus.gain.exponentialRampToValueAtTime(0.55, now + 2.4);
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 300;
      filter.Q.value = 7;
      const lfo = context.createOscillator();
      lfo.frequency.value = 0.11;
      const lfoGain = context.createGain();
      lfoGain.gain.value = 170;
      lfo.connect(lfoGain).connect(filter.frequency);
      const voices = [
        { type: 'sawtooth', frequency: 41.2, vol: 0.1 },
        { type: 'sawtooth', frequency: 43.6, vol: 0.08 },
        { type: 'triangle', frequency: 58.3, vol: 0.06 },
      ].map((voice) => {
        const oscillator = context.createOscillator();
        oscillator.type = voice.type;
        oscillator.frequency.value = voice.frequency;
        const gain = context.createGain();
        gain.gain.value = voice.vol;
        oscillator.connect(gain).connect(filter);
        oscillator.start(now);
        return oscillator;
      });
      filter.connect(bus).connect(master);
      lfo.start(now);
      doomNodes = { bus, oscillators: [...voices, lfo] };
      const knell = () => {
        if (doomNodes === null) return;
        tone({ type: 'sine', from: 311, to: 293, ms: 2600, vol: 0.05, attack: 30 });
        tone({ type: 'sine', from: 440, to: 415, ms: 2800, vol: 0.03, attack: 40, delay: 40 });
        doomTimers.push(setTimeout(knell, 4200 + Math.random() * 2600));
      };
      const heart = () => {
        if (doomNodes === null) return;
        tone({ type: 'sine', from: 70, to: 38, ms: 140, vol: 0.22 });
        tone({ type: 'sine', from: 62, to: 34, ms: 160, vol: 0.16, delay: 210 });
        doomTimers.push(setTimeout(heart, 1500));
      };
      doomTimers.push(setTimeout(knell, 1200), setTimeout(heart, 2200));
    },
    stop() {
      clearDoomTimers();
      if (doomNodes === null || context === null) return;
      const { bus, oscillators } = doomNodes;
      doomNodes = null;
      const now = context.currentTime;
      bus.gain.cancelScheduledValues(now);
      bus.gain.setValueAtTime(Math.max(0.0001, bus.gain.value), now);
      bus.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
      for (const oscillator of oscillators) oscillator.stop(now + 1);
    },
  };

  return {
    unlock,
    sfx,
    doom,
    context: () => context,
    muted: () => muted,
    toggleMute() {
      muted = muted === false;
      storage.set('muted', muted === true ? '1' : '0');
      if (muted === true) doom.stop();
      if (muted === false) unlock();
      return muted;
    },
  };
}
