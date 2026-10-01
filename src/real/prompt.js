const RESTART = Symbol('restart');
const ABORT = Symbol('abort');

function whenVisible() {
  if (document.hidden === false) return Promise.resolve();
  return new Promise((resolve) => {
    const onChange = () => {
      if (document.hidden === true) return;
      document.removeEventListener('visibilitychange', onChange);
      resolve();
    };
    document.addEventListener('visibilitychange', onChange);
  });
}

export async function restartable(scene, attempt, { canRestart = () => true } = {}) {
  const { game } = scene;
  let cleanups = [];
  let aborted = false;
  let abort = () => {};
  const aborting = new Promise((resolve) => {
    abort = () => resolve(ABORT);
  });
  const unregister = scene.onCleanup(() => {
    aborted = true;
    for (const cleanup of cleanups) cleanup();
    cleanups = [];
    abort();
  });
  for (;;) {
    const visible = await Promise.race([whenVisible(), aborting]);
    if (visible === ABORT || aborted === true) return new Promise(() => {});
    cleanups = [];
    const attemptState = {
      onCancel(fn) {
        cleanups.push(fn);
      },
    };
    let stopWatching = () => {};
    const hidden = new Promise((resolve) => {
      const onChange = () => {
        if (document.hidden === true && canRestart() === true) resolve(RESTART);
      };
      document.addEventListener('visibilitychange', onChange);
      stopWatching = () => document.removeEventListener('visibilitychange', onChange);
    });
    const result = await Promise.race([attempt(attemptState), hidden, aborting]);
    stopWatching();
    if (result === ABORT || aborted === true) return new Promise(() => {});
    if (result !== RESTART) {
      unregister();
      return result;
    }
    game.input.cancelAll();
    for (const cleanup of cleanups) cleanup();
  }
}

export function realDelay(ms) {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
}

export function tapOrTimeout(game, { guardMs = 120, timeoutMs, attempt = null }) {
  return new Promise((resolve) => {
    let settled = false;
    if (attempt !== null) {
      attempt.onCancel(() => {
        settled = true;
        clearTimeout(timer);
      });
    }
    const timer = setTimeout(() => {
      if (settled === true) return;
      settled = true;
      game.input.cancelAll();
      resolve(null);
    }, timeoutMs);
    game.input.nextTap({ guardMs }).then((at) => {
      if (settled === true) return;
      settled = true;
      clearTimeout(timer);
      resolve(at);
    });
  });
}
