import { snap } from '../engine/sprites.js';
import { createActor, drawActor, actorX } from '../stage/world.js';

const OUTLINE = '#262b44';
const STONE_DARK = '#3a4466';
const SLAB = '#181425';
const SLAB_FACE = '#262b44';
const SLAB_EDGE = '#8b9bb4';
const SLAB_SHEEN = '#3a4466';
const CRACK_GLOW = '#feae34';
const VEIN = '#a22633';
const PULSE = '#ff706d';
const LED_COLORS = ['#43e1b3', '#feae34', '#43e1b3', '#e43b44', '#43e1b3', '#0099db'];
const TENTACLES = [
  { root: [2, 0], length: 44, base: -2.1, amp: 0.3, speed: 560, phase: 0, band: '#e43b44', width: 3.4 },
  { root: [12, 0], length: 30, base: -1.85, amp: 0.4, speed: 640, phase: 1.7, band: '#feae34', width: 2.8 },
  { root: [26, 0], length: 24, base: -1.5, amp: 0.46, speed: 500, phase: 3.1, band: '#0099db', width: 2.4 },
  { root: [4, -34], length: 26, base: 2.5, amp: 0.36, speed: 700, phase: 0.8, band: '#43e1b3', width: 2.4 },
  { root: [44, -18], length: 22, base: 2.2, amp: 0.4, speed: 580, phase: 2.4, band: '#e43b44', width: 2.2 },
];
const SEGMENTS = 16;
const PANEL = { width: 28, height: 46, lensX: 14, lensY: 20.6 };

function veins(geometry) {
  const { eyeX, eyeY } = geometry;
  const panelLeft = eyeX - PANEL.lensX;
  const panelRight = panelLeft + PANEL.width;
  return [
    [[panelRight, eyeY - 12], [panelRight + 14, eyeY - 12], [panelRight + 14, eyeY - 30], [panelRight + 40, eyeY - 30], [panelRight + 40, eyeY - 80]],
    [[panelRight, eyeY + 6], [panelRight + 24, eyeY + 6], [panelRight + 24, eyeY + 34], [panelRight + 60, eyeY + 34]],
    [[panelLeft, eyeY + 14], [panelLeft - 6, eyeY + 14], [panelLeft - 6, eyeY + 44]],
    [[panelLeft + 8, eyeY - 21], [panelLeft + 8, eyeY - 60]],
  ];
}

function pointOnPath(path, ratio) {
  const lengths = path.slice(1).map((point, index) => Math.hypot(point[0] - path[index][0], point[1] - path[index][1]));
  let remaining = ratio * lengths.reduce((sum, length) => sum + length, 0);
  for (let index = 0; index < lengths.length; index++) {
    if (remaining <= lengths[index]) {
      const t = lengths[index] === 0 ? 0 : remaining / lengths[index];
      return [path[index][0] + (path[index + 1][0] - path[index][0]) * t, path[index][1] + (path[index + 1][1] - path[index][1]) * t];
    }
    remaining -= lengths[index];
  }
  return path[path.length - 1];
}

function genieFrame(now) {
  return Math.floor(now / 320) % 2 === 0 ? 'icon:genie0' : 'icon:genie1';
}

export function createRealStage() {
  const state = {
    decor: [],
    alarm: false,
    monolith: false,
    boss: { power: 1, charge: 0, lash: 0, laser: null, enraged: false },
    target: null,
    lamp: createActor({ key: 'icon:lamp', anchor: 0.68, idle: false, shadow: 6, height: 9 }),
    genie: createActor({ key: genieFrame, anchor: 0.68, idle: true, shadow: 0, height: 26, alpha: 0 }),
    arrow: createActor({ key: 'icon:arrow', idle: false, shadow: 0, height: 5 }),
    poisoned: false,
  };

  function monolithGeometry(view, foe) {
    const x = actorX(view, foe);
    const ground = view.groundY;
    const left = Math.round(x - 14);
    return { x, ground, left, right: Math.max(view.W + 12, left + 90), sink: foe.dy, eyeX: left + 26, eyeY: ground - 58 + foe.dy };
  }

  function tentaclePoints(view, geometry, tentacle, index, now, target) {
    const points = [];
    let px = geometry.left + tentacle.root[0];
    let py = geometry.ground + geometry.sink + tentacle.root[1];
    const step = tentacle.length / SEGMENTS;
    const start = { x: px, y: py };
    points.push(start);
    for (let segment = 1; segment <= SEGMENTS; segment++) {
      const along = segment / SEGMENTS;
      const curl = tentacle.root[1] < 0 ? 0.7 : -0.9;
      const angle = tentacle.base + tentacle.amp * Math.sin(now / tentacle.speed + tentacle.phase + segment * 0.45) * along + curl * along * along;
      px += Math.cos(angle) * step;
      py += Math.sin(angle) * step;
      points.push({ x: px, y: py });
    }
    if (index === 0 && state.boss.lash > 0 && target !== null) {
      const lash = state.boss.lash;
      for (let segment = 1; segment <= SEGMENTS; segment++) {
        const along = segment / SEGMENTS;
        const straightX = start.x + (target.x - start.x) * along;
        const straightY = start.y + (target.y - start.y) * along - Math.sin(along * Math.PI) * 10;
        points[segment] = { x: points[segment].x + (straightX - points[segment].x) * lash, y: points[segment].y + (straightY - points[segment].y) * lash };
      }
    }
    return points;
  }

  function drawTentacle(ctx, points, tentacle, flash, k) {
    for (const pass of ['outline', 'body']) {
      points.forEach((point, segment) => {
        const radius = Math.max(1, tentacle.width * (1 - 0.45 * (segment / SEGMENTS)));
        const size = pass === 'outline' ? radius * 2 + 2 : radius * 2;
        if (pass === 'outline') ctx.fillStyle = SLAB;
        else ctx.fillStyle = segment % 4 === 2 ? tentacle.band : flash > 0.5 ? '#ffffff' : STONE_DARK;
        ctx.fillRect(snap(point.x - size / 2, k), snap(point.y - size / 2, k), Math.round(size), Math.round(size));
        if (pass === 'body' && segment % 4 !== 2) {
          ctx.fillStyle = SLAB_EDGE;
          ctx.fillRect(snap(point.x - radius / 2, k), snap(point.y - radius, k), 1, 1);
        }
      });
    }
    const tip = points[points.length - 1];
    ctx.fillStyle = SLAB;
    ctx.fillRect(snap(tip.x - 3, k), snap(tip.y - 3, k), 6, 6);
    ctx.fillStyle = '#feae34';
    ctx.fillRect(snap(tip.x - 2, k), snap(tip.y - 2, k), 4, 4);
    ctx.fillStyle = '#c0cbdc';
    ctx.fillRect(snap(tip.x - 2, k), snap(tip.y - 4, k), 1, 2);
    ctx.fillRect(snap(tip.x + 1, k), snap(tip.y - 4, k), 1, 2);
  }

  function drawMonolith(ctx, view, foe, sprites, now, k, target) {
    if (state.monolith === false || foe.visible === false) return;
    const geometry = monolithGeometry(view, foe);
    const { left, right, ground, sink } = geometry;
    ctx.save();
    ctx.beginPath();
    ctx.rect(-20, -40, view.W + 60, ground + 41);
    ctx.clip();
    const top = -20 + sink;
    const bottom = ground + sink;
    ctx.fillStyle = SLAB;
    ctx.fillRect(left - 2, top, right - left + 2, bottom - top + 1);
    ctx.fillStyle = SLAB_FACE;
    ctx.fillRect(left + 1, top, right - left, bottom - top);
    ctx.fillStyle = SLAB_EDGE;
    ctx.fillRect(left, top, 1, bottom - top);
    ctx.fillStyle = '#5a6988';
    ctx.fillRect(left + 1, top, 1, bottom - top);
    ctx.fillStyle = SLAB_SHEEN;
    ctx.fillRect(left + 4, top, 3, bottom - top);
    ctx.fillRect(left + 9, top, 1, bottom - top);
    ctx.fillStyle = SLAB;
    ctx.fillRect(left + 48, top, 1, bottom - top);
    for (let y = bottom - 24; y > top; y -= 30) ctx.fillRect(left + 2, snap(y, k), right - left, 1);
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(left + 1, bottom - 3, right - left, 3);
    ctx.fillStyle = VEIN;
    for (const path of veins(geometry)) {
      for (let index = 1; index < path.length; index++) {
        const [ax, ay] = path[index - 1];
        const [bx, by] = path[index];
        ctx.fillRect(snap(Math.min(ax, bx), k), snap(Math.min(ay, by), k), Math.max(1, Math.abs(bx - ax)), Math.max(1, Math.abs(by - ay)));
      }
    }
    const panel = sprites.icon('monolithPanel');
    ctx.fillStyle = SLAB;
    ctx.fillRect(snap(geometry.eyeX - PANEL.lensX - 1, k), snap(geometry.eyeY - PANEL.lensY - 1, k), PANEL.width + 2, PANEL.height + 2);
    ctx.drawImage(panel, snap(geometry.eyeX - PANEL.lensX, k), snap(geometry.eyeY - PANEL.lensY, k));
    if (foe.flash > 0) {
      ctx.globalAlpha = foe.flash * 0.8;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(left, top, right - left, bottom - top);
      ctx.globalAlpha = 1;
    }
    TENTACLES.forEach((tentacle, index) => drawTentacle(ctx, tentaclePoints(view, geometry, tentacle, index, now, target), tentacle, foe.flash, k));
    ctx.restore();
  }

  function drawMonolithGlow(ctx, view, foe, now, k) {
    if (state.monolith === false || foe.visible === false) return;
    const geometry = monolithGeometry(view, foe);
    const { left, right, ground, sink } = geometry;
    const bottom = ground + sink;
    const slabTop = -20 + sink;
    ctx.save();
    ctx.beginPath();
    ctx.rect(-20, slabTop, view.W + 60, Math.max(0, ground + 1 - slabTop));
    ctx.clip();
    for (let index = 0; index * 7 + 4 < bottom + 20; index++) {
      const y = bottom - 8 - index * 7;
      const on = Math.floor(now / 260 + index * 1.7) % 3 !== 0;
      if (on === false) continue;
      ctx.fillStyle = LED_COLORS[index % LED_COLORS.length];
      ctx.fillRect(left + 9, snap(y, k), 1, 1);
    }
    ctx.fillStyle = PULSE;
    veins(geometry).forEach((path, index) => {
      for (let pulse = 0; pulse < 2; pulse++) {
        const ratio = 1 - (((now / (1300 - index * 120)) + index * 0.37 + pulse * 0.5) % 1);
        const [x, y] = pointOnPath(path, ratio);
        ctx.globalAlpha = 0.9 * Math.max(0.15, state.boss.power);
        ctx.fillRect(snap(x - 1, k), snap(y - 1, k), 2, 2);
      }
    });
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = '#25956a';
    for (let column = left + 56; column < right; column += 5) {
      const speed = 0.012 + ((column * 7) % 5) * 0.003;
      const offset = (now * speed + column * 13) % 30;
      for (let y = bottom - 4 - offset; y > -20; y -= 30) ctx.fillRect(column, snap(y, k), 1, 3);
    }
    ctx.globalAlpha = 1;
    if (state.boss.enraged === true) {
      ctx.globalAlpha = 0.6 + 0.35 * Math.sin(now / 120);
      ctx.fillStyle = CRACK_GLOW;
      const cracks = [
        [left + 14, bottom - 40, 1, 7], [left + 15, bottom - 33, 2, 1], [left + 17, bottom - 33, 1, 6],
        [left + 33, bottom - 70, 1, 6], [left + 34, bottom - 64, 1, 5], [left + 35, bottom - 59, 2, 1],
        [left + 52, bottom - 30, 1, 8], [left + 53, bottom - 22, 3, 1],
      ];
      for (const [x, y, width, height] of cracks) ctx.fillRect(snap(x, k), snap(y, k), width, height);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    const power = state.boss.power;
    if (power > 0) {
      const pulse = 0.85 + 0.15 * Math.sin(now / (state.boss.enraged === true ? 90 : 320));
      const radius = (18 + state.boss.charge * 26) * pulse;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const glow = ctx.createRadialGradient(geometry.eyeX, geometry.eyeY, 0, geometry.eyeX, geometry.eyeY, radius);
      glow.addColorStop(0, `rgba(254, 231, 97, ${0.55 * power})`);
      glow.addColorStop(0.25, `rgba(228, 59, 68, ${0.5 * power})`);
      glow.addColorStop(1, 'rgba(228, 59, 68, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(geometry.eyeX - radius, geometry.eyeY - radius, radius * 2, radius * 2);
      ctx.restore();
    } else {
      ctx.globalAlpha = 0.75;
      ctx.fillStyle = SLAB;
      ctx.fillRect(snap(geometry.eyeX - 6, k), snap(geometry.eyeY - 6, k), 12, 12);
      ctx.globalAlpha = 1;
    }
    const laser = state.boss.laser;
    if (laser !== null && laser.alpha > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      for (const [width, color] of [[5, `rgba(228, 59, 68, ${0.55 * laser.alpha})`], [2.5, `rgba(255, 112, 109, ${0.9 * laser.alpha})`], [1, `rgba(254, 231, 97, ${laser.alpha})`]]) {
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(geometry.eyeX, geometry.eyeY);
        ctx.lineTo(laser.x, laser.y);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  function drawDecor(ctx, view, camX, sprites, k) {
    for (const item of state.decor) {
      const x = item.worldX - camX;
      if (x < -60 || x > view.W + 60) continue;
      if (item.kind === 'poster') {
        const poster = sprites.icon('poster');
        ctx.drawImage(poster, snap(x - poster.width / 2, k), snap(view.groundY - poster.height - 12, k));
      } else if (item.kind === 'slit') {
        const left = snap(x, k);
        const y = snap(view.groundY - 9, k);
        ctx.fillStyle = OUTLINE;
        ctx.fillRect(left - 5, y - 4, 10, 8);
        ctx.fillStyle = '#0c0918';
        ctx.fillRect(left - 4, y - 3, 8, 6);
        ctx.fillStyle = STONE_DARK;
        ctx.fillRect(left - 5, y + 4, 10, 1);
      }
    }
  }

  function lastSlit() {
    for (let index = state.decor.length - 1; index >= 0; index--) {
      if (state.decor[index].kind === 'slit') return state.decor[index];
    }
    return null;
  }

  return {
    state,
    hiddenRanges() {
      return state.decor.filter((item) => item.kind === 'poster').map((item) => [item.worldX - 44, item.worldX + 44]);
    },
    addDecor(kind, worldX) {
      state.decor.push({ kind, worldX });
    },
    closeSlits(camX) {
      const closed = state.decor.filter((item) => item.kind === 'slit').map((item) => item.worldX - camX);
      state.decor = state.decor.filter((item) => item.kind !== 'slit');
      return closed;
    },
    pruneDecor(camX) {
      state.decor = state.decor.filter((item) => item.worldX > camX - 80);
    },
    slitScreenX(view, camX) {
      const slit = lastSlit();
      return slit === null ? view.W - 10 : slit.worldX - camX;
    },
    drawBack(ctx, view, world, sprites, now, k) {
      drawDecor(ctx, view, world.camX, sprites, k);
      drawMonolith(ctx, view, world.foe, sprites, now, k, state.target);
      drawActor(ctx, view, state.lamp, sprites, now, k);
      drawActor(ctx, view, state.genie, sprites, now, k);
    },
    drawFront(ctx, view, sprites, now, k) {
      if (state.arrow.visible === true) {
        const arrow = sprites.icon('arrow');
        ctx.save();
        ctx.translate(snap(state.arrow.x, k), snap(state.arrow.y, k));
        ctx.scale(-1, 1);
        ctx.drawImage(arrow, -arrow.width / 2, -arrow.height / 2);
        ctx.restore();
      }
    },
    drawOverlay(ctx, view, world, now, k) {
      const slit = lastSlit();
      if (state.alarm === true && slit !== null) {
        const x = snap(slit.worldX - world.camX, k);
        const y = snap(view.groundY - 30 - (Math.floor(now / 80) % 2), k);
        ctx.fillStyle = OUTLINE;
        ctx.fillRect(x - 3, y - 1, 6, 14);
        ctx.fillStyle = '#e43b44';
        ctx.fillRect(x - 2, y, 4, 8);
        ctx.fillRect(x - 2, y + 10, 4, 2);
        ctx.fillStyle = '#ff706d';
        ctx.fillRect(x - 2, y, 1, 8);
      }
      drawMonolithGlow(ctx, view, world.foe, now, k);
      if (state.poisoned === true) {
        ctx.globalAlpha = 0.08 + 0.04 * Math.sin(now / 180);
        ctx.fillStyle = '#b55088';
        ctx.fillRect(-4, -4, view.W + 8, view.H + 8);
        ctx.globalAlpha = 1;
      }
    },
    lights(view, world) {
      const lights = [];
      if (state.genie.visible === true && state.genie.alpha > 0) lights.push({ x: actorX(view, state.genie), y: view.groundY + state.genie.dy - 14, radius: 46, strength: 0.8 * state.genie.alpha });
      if (state.lamp.visible === true) lights.push({ x: actorX(view, state.lamp), y: view.groundY - 4, radius: 22, strength: 0.5 });
      if (state.monolith === true && world.foe.visible === true) {
        const geometry = monolithGeometry(view, world.foe);
        lights.push({ x: geometry.eyeX, y: geometry.eyeY, radius: 70 + state.boss.charge * 30, strength: 0.85 * Math.max(0.2, state.boss.power) });
        lights.push({ x: geometry.left + 14, y: geometry.ground - 14, radius: 48, strength: 0.6 });
        lights.push({ x: geometry.left + 30, y: geometry.eyeY + 50, radius: 50, strength: 0.4 });
      }
      if (state.arrow.visible === true) lights.push({ x: state.arrow.x, y: state.arrow.y, radius: 16, strength: 0.6 });
      return lights;
    },
    monolith(view, foe) {
      return monolithGeometry(view, foe);
    },
    reset() {
      state.decor = [];
      state.alarm = false;
      state.monolith = false;
      state.poisoned = false;
      state.target = null;
      Object.assign(state.boss, { power: 1, charge: 0, lash: 0, laser: null, enraged: false });
      for (const actor of [state.lamp, state.genie, state.arrow]) {
        actor.visible = false;
        actor.dx = 0;
        actor.dy = 0;
        actor.flash = 0;
      }
      state.genie.alpha = 0;
    },
  };
}
