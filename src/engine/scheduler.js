export const EASES = {
  linear: (t) => t,
  inQuad: (t) => t * t,
  outQuad: (t) => 1 - (1 - t) * (1 - t),
  inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2),
  inCubic: (t) => t * t * t,
  outCubic: (t) => 1 - (1 - t) ** 3,
  inBack: (t) => 2.70158 * t * t * t - 1.70158 * t * t,
  outBack: (t) => 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2,
  outBounce: (t) => {
    if (t < 1 / 2.75) return 7.5625 * t * t;
    if (t < 2 / 2.75) return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
    if (t < 2.5 / 2.75) return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
    return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
  },
};

const MAX_FRAME_MS = 50;

export function createScheduler() {
  let time = 0;
  let speed = 1;
  let freezeLeft = 0;
  let slowLeft = 0;
  let slowScale = 1;
  let timers = [];
  let tweens = [];

  function advance(realMs) {
    let remaining = Math.min(MAX_FRAME_MS, Math.max(0, realMs));
    if (freezeLeft > 0) {
      const consumed = Math.min(freezeLeft, remaining);
      freezeLeft -= consumed;
      remaining -= consumed;
    }
    if (remaining === 0) return 0;
    let scaled = remaining;
    if (slowLeft > 0) {
      const slowPart = Math.min(slowLeft, remaining);
      slowLeft -= slowPart;
      scaled = slowPart * slowScale + (remaining - slowPart);
    }
    return scaled * speed;
  }

  function runTweens() {
    const active = tweens;
    tweens = [];
    for (const tween of active) {
      const progress = Math.min(1, (time - tween.start) / tween.ms);
      const eased = tween.ease(progress);
      for (const key of Object.keys(tween.to)) {
        tween.target[key] = tween.from[key] + (tween.to[key] - tween.from[key]) * eased;
      }
      if (tween.onUpdate !== undefined) tween.onUpdate(tween.target);
      if (progress >= 1) tween.resolve();
      else tweens.push(tween);
    }
  }

  function runTimers() {
    const due = timers.filter((timer) => timer.due <= time);
    timers = timers.filter((timer) => timer.due > time);
    for (const timer of due) timer.resolve();
  }

  return {
    get time() {
      return time;
    },
    get speed() {
      return speed;
    },
    update(realMs) {
      const gameDt = advance(realMs);
      if (gameDt === 0) return 0;
      time += gameDt;
      runTweens();
      runTimers();
      return gameDt;
    },
    wait(ms) {
      return new Promise((resolve) => {
        timers.push({ due: time + Math.max(0, ms), resolve });
      });
    },
    tween(target, to, ms, ease = 'outQuad', onUpdate = undefined) {
      if (ms <= 0) {
        Object.assign(target, to);
        if (onUpdate !== undefined) onUpdate(target);
        return Promise.resolve();
      }
      const from = {};
      for (const key of Object.keys(to)) from[key] = target[key];
      return new Promise((resolve) => {
        tweens.push({ target, from, to, ms, start: time, ease: EASES[ease], onUpdate, resolve });
      });
    },
    killTweensOf(target, key = null) {
      const killed = tweens.filter((tween) => tween.target === target && (key === null || Object.hasOwn(tween.to, key) === true));
      tweens = tweens.filter((tween) => killed.includes(tween) === false);
      for (const tween of killed) tween.resolve();
    },
    freeze(realMs) {
      freezeLeft = Math.max(freezeLeft, realMs);
    },
    slowmo(scale, realMs) {
      slowScale = scale;
      slowLeft = realMs;
    },
    setSpeed(value) {
      speed = value;
    },
    cancelAll() {
      timers = [];
      tweens = [];
      speed = 1;
      freezeLeft = 0;
      slowLeft = 0;
      slowScale = 1;
    },
    pending() {
      return timers.length + tweens.length;
    },
  };
}
