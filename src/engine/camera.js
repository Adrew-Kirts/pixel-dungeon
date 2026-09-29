export function createCamera({ reducedMotion }) {
  const state = {
    shakeAmp: 0,
    shakeLeft: 0,
    shakeTotal: 1,
    flashColor: '#ffffff',
    flashAlpha: 0,
    flashDecay: 0.006,
    darkness: 0,
    tintColor: '#e43b44',
    tintAlpha: 0,
    tintPulse: false,
    offsetX: 0,
    offsetY: 0,
  };

  return {
    state,
    shake(amp, ms) {
      if (reducedMotion === true) return;
      if (amp >= state.shakeAmp * (state.shakeLeft / state.shakeTotal)) {
        state.shakeAmp = amp;
        state.shakeLeft = ms;
        state.shakeTotal = ms;
      }
    },
    flash(color, alpha = 0.8, ms = 160) {
      if (reducedMotion === true) return;
      state.flashColor = color;
      state.flashAlpha = alpha;
      state.flashDecay = alpha / ms;
    },
    setTint(color, alpha, pulse = false) {
      state.tintColor = color;
      state.tintAlpha = alpha;
      state.tintPulse = pulse;
    },
    update(realMs) {
      if (state.shakeLeft > 0) {
        state.shakeLeft = Math.max(0, state.shakeLeft - realMs);
        const strength = state.shakeAmp * (state.shakeLeft / state.shakeTotal);
        state.offsetX = (Math.random() * 2 - 1) * strength;
        state.offsetY = (Math.random() * 2 - 1) * strength;
      } else {
        state.offsetX = 0;
        state.offsetY = 0;
      }
      if (state.flashAlpha > 0) state.flashAlpha = Math.max(0, state.flashAlpha - state.flashDecay * realMs);
    },
    drawOverlay(ctx, view, now) {
      if (state.tintAlpha > 0) {
        const pulse = state.tintPulse === true ? 0.75 + 0.25 * Math.sin(now / 260) : 1;
        ctx.globalAlpha = state.tintAlpha * pulse;
        ctx.fillStyle = state.tintColor;
        ctx.fillRect(-4, -4, view.W + 8, view.H + 8);
      }
      if (state.flashAlpha > 0) {
        ctx.globalAlpha = state.flashAlpha;
        ctx.fillStyle = state.flashColor;
        ctx.fillRect(-4, -4, view.W + 8, view.H + 8);
      }
      ctx.globalAlpha = 1;
    },
    reset() {
      state.shakeLeft = 0;
      state.flashAlpha = 0;
      state.tintAlpha = 0;
      state.darkness = 0;
    },
  };
}
