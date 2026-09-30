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

  function pixel(ctx, x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
  }

  function drawCrosshair(ctx, x, y, color, now, locked) {
    const cx = Math.round(x);
    const cy = Math.round(y);
    const radius = 9;
    const ringPoints = new Map();
    for (let step = 0; step < 96; step++) {
      const angle = (step / 96) * Math.PI * 2;
      if (Math.abs(Math.sin(angle * 2)) < 0.38) continue;
      const px = cx + Math.round(Math.cos(angle) * radius);
      const py = cy + Math.round(Math.sin(angle) * radius);
      ringPoints.set(`${px},${py}`, [px, py]);
    }
    const outline = new Map();
    for (const [px, py] of ringPoints.values()) {
      for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) outline.set(`${px + ox},${py + oy}`, [px + ox, py + oy]);
    }
    const ticks = [];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      for (let distance = radius - 2; distance <= radius + 5; distance++) ticks.push([cx + dx * distance, cy + dy * distance, dx, dy]);
    }
    for (const [px, py, dx, dy] of ticks) {
      outline.set(`${px + dy},${py + dx}`, [px + dy, py + dx]);
      outline.set(`${px - dy},${py - dx}`, [px - dy, py - dx]);
    }
    for (const [px, py] of outline.values()) pixel(ctx, px, py, '#181425');
    for (const [px, py] of ringPoints.values()) pixel(ctx, px, py, color);
    for (const [px, py] of ticks) pixel(ctx, px, py, '#fee761');
    const spin = locked === true ? 0 : now / 1100;
    for (let corner = 0; corner < 4; corner++) {
      const angle = spin + Math.PI / 4 + corner * (Math.PI / 2);
      const bx = cx + Math.cos(angle) * (radius + 5);
      const by = cy + Math.sin(angle) * (radius + 5);
      for (const side of [0.75, -0.75]) {
        const ax = Math.cos(angle + Math.PI * side);
        const ay = Math.sin(angle + Math.PI * side);
        for (let length = 0; length <= 2; length++) pixel(ctx, bx + ax * length, by + ay * length, '#feae34');
      }
    }
    for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) pixel(ctx, cx + ox, cy + oy, '#181425');
    pixel(ctx, cx, cy, locked === true || Math.floor(now / 220) % 2 === 0 ? '#e43b44' : '#ff706d');
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
      const color = active.ring === 'bullseye' ? '#fee761' : active.ring === 'close' ? '#c0cbdc' : active.ring === null ? '#e4edf9' : '#e43b44';
      drawCrosshair(ctx, point.x, point.y, color, now, active.frozenMs !== null);
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
