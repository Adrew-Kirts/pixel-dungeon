const IGNORED_TARGETS = 'button, a, input, select, textarea, [data-no-tap]';

export function createInput({ root = null, keyTarget = null, now = () => performance.now() } = {}) {
  let waiters = [];
  let idleHandler = null;
  let enabled = true;

  function tap() {
    if (enabled === false) return;
    const at = now();
    const ready = waiters.filter((waiter) => at - waiter.createdAt >= waiter.guardMs);
    if (ready.length === 0) {
      if (idleHandler !== null) idleHandler();
      return;
    }
    waiters = waiters.filter((waiter) => ready.includes(waiter) === false);
    for (const waiter of ready) waiter.resolve(at);
  }

  if (root !== null) {
    root.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      if (event.target instanceof Element && event.target.closest(IGNORED_TARGETS) !== null) return;
      tap();
    });
  }

  if (keyTarget !== null) {
    keyTarget.addEventListener('keydown', (event) => {
      if (event.repeat === true) return;
      if (event.code !== 'Space' && event.code !== 'Enter') return;
      if (event.target instanceof Element && event.target.closest(IGNORED_TARGETS) !== null) return;
      if (enabled === false) return;
      event.preventDefault();
      tap();
    });
  }

  return {
    tap,
    nextTap({ guardMs = 120 } = {}) {
      return new Promise((resolve) => {
        waiters.push({ createdAt: now(), guardMs, resolve });
      });
    },
    onIdleTap(handler) {
      idleHandler = handler;
    },
    setEnabled(value) {
      enabled = value;
    },
    cancelAll() {
      waiters = [];
    },
  };
}
