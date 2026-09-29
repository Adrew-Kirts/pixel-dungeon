import { crosshairAt } from './engine.js';

const HEAD = { width: 64, height: 48, eyeX: 32, eyeY: 21.6, unit: 30 };
const RING_COLORS = { bullseye: '#fee761', close: '#c0cbdc' };

export function createCloseup() {
  let active = null;

  function layout(view) {
    const k = view.k;
    const short = view.portrait === false && view.vh <= 500;
    const fit = Math.min((view.W * 0.92) / HEAD.width, (view.H * (short === true ? 0.6 : 0.74)) / HEAD.height);
    const scale = Math.max(1, Math.floor(fit * k) / k);
    const width = HEAD.width * scale;
    const height = HEAD.height * scale;
    const left = Math.round((view.W - width) / 2);
    const top = Math.round((view.H - height) / 2 - view.H * 0.04);
    return { scale, left, top, width, height, short, eyeX: left + HEAD.eyeX * scale, eyeY: top + HEAD.eyeY * scale };
  }

  function toScreen(frame, aim, point) {
    const unit = HEAD.unit * frame.scale;
    return { x: frame.eyeX + (point.x - aim.eye.x) * unit, y: frame.eyeY + (point.y - aim.eye.y) * unit };
  }

  function elapsed(now) {
    if (active.frozenMs !== null) return active.frozenMs;
    if (active.startedAt === null) return 0;
    return Math.max(0, now - active.startedAt);
  }

  function drawCrosshair(ctx, x, y, color) {
    ctx.fillStyle = '#181425';
    ctx.fillRect(Math.round(x) - 6, Math.round(y) - 1, 4, 3);
    ctx.fillRect(Math.round(x) + 3, Math.round(y) - 1, 4, 3);
    ctx.fillRect(Math.round(x) - 1, Math.round(y) - 6, 3, 4);
    ctx.fillRect(Math.round(x) - 1, Math.round(y) + 3, 3, 4);
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x) - 5, Math.round(y), 3, 1);
    ctx.fillRect(Math.round(x) + 3, Math.round(y), 3, 1);
    ctx.fillRect(Math.round(x), Math.round(y) - 5, 1, 3);
    ctx.fillRect(Math.round(x), Math.round(y) + 3, 1, 3);
    ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
  }

  return {
    open(aim) {
      active = { aim, startedAt: null, frozenMs: null, ring: null, alpha: 0, flash: 0 };
      return active;
    },
    start(at) {
      if (active === null) return;
      active.startedAt = at;
      active.frozenMs = null;
    },
    freeze(ms, ring) {
      if (active === null) return;
      active.frozenMs = ms === null ? active.aim.timeoutMs : ms;
      active.ring = ring;
    },
    close() {
      active = null;
    },
    isOpen() {
      return active !== null;
    },
    state() {
      return active;
    },
    anchor(view, aim) {
      const frame = layout(view);
      return toScreen(frame, aim, aim.eye);
    },
    draw(ctx, view, sprites, now) {
      if (active === null || active.alpha <= 0) return;
      const frame = layout(view);
      const aim = active.aim;
      ctx.globalAlpha = active.alpha;
      ctx.fillStyle = '#181425';
      ctx.fillRect(-4, -4, view.W + 8, view.H + 8);
      const glow = ctx.createRadialGradient(frame.eyeX, frame.eyeY, 4, frame.eyeX, frame.eyeY, Math.max(view.W, view.H) * 0.7);
      glow.addColorStop(0, 'rgba(228, 59, 68, 0.28)');
      glow.addColorStop(1, 'rgba(24, 20, 37, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, view.W, view.H);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(sprites.icon('monolithFace'), frame.left, frame.top, frame.width, frame.height);
      if (active.flash > 0) {
        ctx.globalAlpha = active.alpha * active.flash;
        ctx.drawImage(sprites.get('icon:monolithFace', 'flash'), frame.left, frame.top, frame.width, frame.height);
        ctx.globalAlpha = active.alpha;
      }
      const unit = HEAD.unit * frame.scale;
      ctx.lineWidth = 1;
      for (const ring of ['close', 'bullseye']) {
        ctx.strokeStyle = RING_COLORS[ring];
        ctx.globalAlpha = active.alpha * (ring === 'bullseye' ? 0.85 : 0.5);
        ctx.setLineDash(ring === 'bullseye' ? [] : [2, 2]);
        ctx.beginPath();
        ctx.arc(frame.eyeX, frame.eyeY, aim.rings[ring] * unit, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.globalAlpha = active.alpha;
      const ms = elapsed(now);
      const point = toScreen(frame, aim, crosshairAt(aim, ms));
      const color = active.ring === 'bullseye' ? '#fee761' : active.ring === 'close' ? '#c0cbdc' : active.ring === null ? '#ffffff' : '#e43b44';
      drawCrosshair(ctx, point.x, point.y, color);
      const barWidth = Math.round(view.W * (view.portrait === true ? 0.6 : 0.46));
      const barLeft = Math.round((view.W - barWidth) / 2);
      const barTop = view.portrait === true || frame.short === true ? frame.top + frame.height + 5 : view.H - 6;
      const left = active.startedAt === null ? 1 : Math.max(0, 1 - ms / aim.timeoutMs);
      ctx.fillStyle = '#262b44';
      ctx.fillRect(barLeft - 1, barTop - 1, barWidth + 2, 5);
      ctx.fillStyle = left > 0.33 ? '#feae34' : '#e43b44';
      ctx.fillRect(barLeft, barTop, Math.round(barWidth * left), 3);
      ctx.globalAlpha = 1;
    },
  };
}
