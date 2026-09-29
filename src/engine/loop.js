export function startLoop({ update, render }) {
  let last = performance.now();
  let frameId = 0;
  let running = true;

  function frame(now) {
    const elapsed = now - last;
    last = now;
    update(elapsed, now);
    render(now);
    if (running === true) frameId = requestAnimationFrame(frame);
  }

  function onVisibility() {
    if (document.hidden === true) {
      cancelAnimationFrame(frameId);
      return;
    }
    last = performance.now();
    if (running === true) frameId = requestAnimationFrame(frame);
  }

  document.addEventListener('visibilitychange', onVisibility);
  frameId = requestAnimationFrame(frame);

  return {
    stop() {
      running = false;
      cancelAnimationFrame(frameId);
      document.removeEventListener('visibilitychange', onVisibility);
    },
  };
}
