import { snap } from '../engine/sprites.js';
import { actorX } from '../stage/world.js';
import { NODES } from './content.js';
import { createRooms, drawDoor, hasIcon, DOOR_X, THEMES, roomDoorX, propScreenX } from './rooms.js';

export const STREET_ORDER = ['h1', 'h2', 'h3', 'h4'];

const RING_START = 34;
const FLOOR_ANCHORS = [0.44, 0.5, 0.56, 0.38, 0.62, 0.33];
const FLOOR_SPOTS = { a2: [0.53], den: [0.58] };
const RING_FADE = { normal: 0, hard: 0.6, tryhard: 0.9 };

export function floorItemX(view, node, index) {
  const spots = FLOOR_SPOTS[node];
  if (spots !== undefined && index < spots.length) return propScreenX(view, spots[index]);
  return view.W * FLOOR_ANCHORS[index % FLOOR_ANCHORS.length];
}
export const PORTAL_X = 0.56;
const RING_END = 9;

function doorKind(node, to) {
  if (NODES[node].locked === to) return 'iron';
  return 'wood';
}

function streetDecor(index) {
  const slot = ((index % 4) + 4) % 4;
  if (slot === 0) return 'torch';
  if (slot === 2 && ((index % 8) + 8) % 8 === 2) return 'banner';
  return null;
}

const STREET_PROPS = [
  { segment: 0, icon: 'streetSign', x: 0.16, wall: 20 },
  { segment: 0, icon: 'crates', x: 0.86 },
  { segment: 1, icon: 'noticeArrows', x: 0.3, wall: 8 },
  { segment: 1, icon: 'noticeArrows', x: 0.84, wall: 18 },
  { segment: 1, icon: 'bones', x: 0.44 },
  { segment: 2, icon: 'chains', x: 0.2, wall: 38 },
  { segment: 2, icon: 'coffeeCup', x: 0.6, wall: 36, glow: true },
  { segment: 2, icon: 'paperPile', x: 0.8 },
  { segment: 3, icon: 'cage', x: 0.3, ceiling: true },
  { segment: 3, icon: 'skullPile', x: 0.44 },
  { segment: 3, icon: 'endArch', right: 17, minW: 150 },
];

function drawStreetProps(ctx, view, sprites, camX, now, k, lights) {
  for (const prop of STREET_PROPS) {
    if (hasIcon(prop.icon) === false) continue;
    if (prop.minW !== undefined && view.W < prop.minW) continue;
    const image = sprites.icon(prop.icon);
    const x = prop.right !== undefined ? (prop.segment + 1) * view.W - prop.right - camX : (prop.segment + prop.x) * view.W - camX;
    if (x < -image.width || x > view.W + image.width) continue;
    let y = view.groundY - image.height;
    if (prop.wall !== undefined) y = view.groundY - prop.wall - image.height;
    if (prop.ceiling === true) y = -2;
    ctx.drawImage(image, snap(x - image.width / 2, k), snap(y, k));
    if (prop.glow === true) lights.push({ x, y: y + image.height / 2, radius: 22, strength: 0.5, warm: true });
  }
}

export function createDeepStage() {
  const rooms = createRooms();
  const state = {
    active: false,
    node: null,
    from: null,
    street: true,
    camSeg: 0,
    doors: [],
    streetDoors: [],
    coffee: 'locked',
    fairy: { visible: false, x: 0, y: 0, dx: 0, dy: 0, alpha: 1, scale: 1, sad: false, follow: true, glow: 1 },
    rings: [],
    projectiles: [],
    arrowResults: [],
    minions: [],
    floorItems: [],
    cues: [],
    riposte: false,
    slit: false,
    ringFade: 0,
    emergency: false,
    catAwake: false,
    blackout: 0,
    shake: 0,
  };

  function segmentOf(node) {
    return STREET_ORDER.indexOf(node);
  }

  function streetDoors(keycard) {
    return STREET_ORDER.map((node, index) => {
      const to = NODES[node].door;
      const kind = doorKind(node, to);
      return { node, to, kind, open: false, locked: kind === 'iron' && keycard === false, index };
    });
  }

  function roomDoors(node, from, keycard) {
    const def = NODES[node];
    const links = def.links;
    const back = from !== null && links.includes(from) === true ? from : links[0];
    const on = links.filter((link) => link !== back);
    const kind = def.portalRoom === true ? 'portal' : 'wood';
    const doors = [{ to: back, x: DOOR_X.back, kind, open: false, side: 'back' }];
    if (on.length > 0) doors.push({ to: on[0], x: DOOR_X.on, kind, open: false, side: 'on', glow: on[0] === 'lair' ? 'rgba(228, 59, 68, ALPHA)' : undefined });
    if (def.portal !== undefined && keycard === true) doors.push({ to: def.portal.to, x: PORTAL_X, kind: 'portal', open: false, side: 'portal' });
    return doors;
  }

  function streetDoorX(view, segment) {
    return (segment + DOOR_X.street) * view.W;
  }

  return {
    state,
    enterNode(node, from, keycard) {
      state.active = true;
      state.node = node;
      state.from = from;
      state.street = NODES[node].area === 'street';
      if (state.street === true) {
        if (state.streetDoors.length === 0) state.streetDoors = streetDoors(keycard);
        state.camSeg = segmentOf(node);
        state.doors = [];
      } else {
        state.doors = roomDoors(node, from, keycard);
      }
    },
    setKeycard(keycard) {
      for (const door of state.streetDoors) if (door.kind === 'iron') door.locked = keycard === false;
    },
    theme() {
      return state.street === true ? 'street' : NODES[state.node].theme;
    },
    darkness() {
      return THEMES[this.theme()].darkness;
    },
    camX(view) {
      return state.street === true ? state.camSeg * view.W : 0;
    },
    doorScreenX(view, to) {
      if (state.street === true) {
        const door = state.streetDoors.find((candidate) => candidate.to === to);
        return door === undefined ? null : streetDoorX(view, door.index) - this.camX(view);
      }
      const door = state.doors.find((candidate) => candidate.to === to);
      return door === undefined ? null : roomDoorX(view, door);
    },
    streetDoorFor(node) {
      return state.streetDoors.find((door) => door.node === node) ?? null;
    },
    setDoorOpen(to, open) {
      const list = state.street === true ? state.streetDoors : state.doors;
      for (const door of list) if (door.to === to) door.open = open;
    },
    hiddenRanges(view) {
      if (state.street === false) return [];
      return state.streetDoors.map((door) => {
        const x = streetDoorX(view, door.index);
        return [x - 30, x + 30];
      });
    },
    drawRoom(ctx, view, sprites, background, now, k) {
      if (state.street === true) {
        const camX = this.camX(view);
        const lights = background.draw(ctx, view, camX, now, k, this.hiddenRanges(view), { decor: streetDecor, windows: false });
        drawStreetProps(ctx, view, sprites, camX, now, k, lights);
        for (const door of state.streetDoors) {
          const x = streetDoorX(view, door.index);
          const glow = door.kind === 'iron' ? (door.locked === true ? 'rgba(228, 59, 68, ALPHA)' : 'rgba(67, 225, 179, ALPHA)') : undefined;
          drawDoor(ctx, view, { x, kind: door.kind, open: door.open, glow }, sprites, now, k, camX);
          if (door.kind === 'iron' && x - camX > -40 && x - camX < view.W + 40) lights.push({ x: x - camX + 9, y: view.groundY - 16, radius: 14, strength: 0.5 });
        }
        const endX = STREET_ORDER.length * view.W - camX;
        if (endX < view.W + 40 && hasIcon('endArch') === false) {
          ctx.fillStyle = '#181425';
          ctx.fillRect(snap(endX - 6, k), 0, view.W, view.H);
        }
        if (camX < 40) {
          ctx.fillStyle = '#181425';
          ctx.fillRect(snap(-camX - view.W, k), 0, view.W, view.H);
        }
        return lights;
      }
      return rooms.draw(ctx, view, sprites, { theme: NODES[state.node].theme, doors: state.doors, coffee: state.coffee, catAwake: state.catAwake }, now, k);
    },
    drawFloorItems(ctx, view, sprites, now, k, keyOf) {
      const items = state.floorItems ?? [];
      items.forEach((item, index) => {
        const key = keyOf(item);
        const image = sprites.get(key);
        const x = floorItemX(view, state.node, index);
        const bob = Math.floor(now / 500 + index) % 2;
        ctx.globalAlpha = 0.45;
        ctx.fillStyle = '#181425';
        ctx.fillRect(snap(x - 5, k), view.groundY, 10, 1);
        ctx.globalAlpha = 1;
        if (item.slot === 'weapon') {
          ctx.save();
          ctx.translate(snap(x, k), snap(view.groundY - 3 - bob, k));
          ctx.rotate(-1.15);
          ctx.drawImage(image, -image.width / 2, -image.height / 2);
          ctx.restore();
        } else ctx.drawImage(image, snap(x - image.width / 2, k), snap(view.groundY - image.height - 1 - bob, k));
        if (Math.floor(now / 240 + index * 3) % 5 === 0) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(snap(x + 3, k), snap(view.groundY - 13 - bob, k), 1, 1);
        }
      });
    },
    fairyPosition(view, hero, now) {
      const fairy = state.fairy;
      const bob = Math.sin(now / 380) * 3 + Math.sin(now / 910) * 1.5;
      const baseX = fairy.follow === true ? actorX(view, hero) - 14 : fairy.x;
      const baseY = fairy.follow === true ? view.groundY - 28 : fairy.y;
      return { x: baseX + fairy.dx + Math.sin(now / 1300) * 4, y: baseY + fairy.dy + bob };
    },
    drawFront(ctx, view, world, sprites, now, k, realNow) {
      for (const minion of state.minions) {
        if (minion.visible === false) continue;
        const t = Math.max(0, Math.min(1, (realNow - minion.startAt) / (minion.arriveAt - minion.startAt)));
        const heroX = actorX(view, world.hero);
        const edge = minion.side === 'left' ? -12 : view.W + 12;
        const target = minion.side === 'left' ? heroX - 9 : heroX + 11;
        let x = edge + (target - edge) * t;
        let y = view.groundY - Math.abs(Math.sin(t * 12)) * 2;
        let alpha = 1;
        if (minion.dead !== null) {
          const d = Math.min(1, (realNow - minion.dead) / 260);
          alpha = 1 - d;
          y -= d * 10;
          x += (minion.side === 'left' ? -1 : 1) * d * 14;
        }
        const image = minion.icon !== undefined && hasIcon(minion.icon) === true ? sprites.icon(minion.icon) : sprites.tile(minion.tile);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(snap(x, k), snap(y, k));
        if (minion.side === 'left') ctx.scale(-1, 1);
        ctx.drawImage(image, -8, -16);
        ctx.restore();
      }
      for (const projectile of state.projectiles) {
        const t = (realNow - projectile.startAt) / (projectile.arriveAt - projectile.startAt);
        if (t < 0 || projectile.done === true) continue;
        const clamped = Math.min(1, t);
        let x = projectile.fromX + (projectile.toX - projectile.fromX) * clamped;
        if (projectile.heroX !== undefined && x <= projectile.heroX) {
          const outcome = state.arrowResults[projectile.beatIndex];
          if (outcome === undefined) x = projectile.heroX;
          else if (outcome.grade === 'miss') {
            const age = realNow - outcome.at;
            if (age > 220) {
              projectile.done = true;
              continue;
            }
            x = projectile.heroX;
            ctx.save();
            ctx.globalAlpha = 1 - age / 220;
            ctx.fillStyle = '#ffffff';
            for (let spark = 0; spark < 6; spark++) {
              const angle = spark * 1.05 + age / 60;
              const distance = 3 + age / 22;
              ctx.fillRect(snap(x + Math.cos(angle) * distance, k), snap(projectile.fromY + Math.sin(angle) * distance, k), 1, 1);
            }
            ctx.restore();
            ctx.globalAlpha = 1 - age / 220;
          }
        }
        if (t >= 1 && projectile.heroX !== undefined) {
          projectile.done = true;
          continue;
        }
        const arc = projectile.arc ?? 12;
        const y = projectile.fromY + (projectile.toY - projectile.fromY) * clamped - Math.sin(clamped * Math.PI) * arc;
        if (projectile.icon === 'arrow') {
          const arrow = sprites.icon('arrow');
          ctx.save();
          ctx.globalAlpha = 0.45;
          ctx.fillStyle = '#fff6d0';
          ctx.fillRect(snap(x + arrow.width, k), snap(y - 1, k), 14, 1);
          ctx.globalAlpha = 0.25;
          ctx.fillRect(snap(x + arrow.width + 4, k), snap(y + 2, k), 18, 1);
          ctx.fillRect(snap(x + arrow.width + 2, k), snap(y - 4, k), 10, 1);
          ctx.globalAlpha = 0.3;
          ctx.fillStyle = '#181425';
          ctx.fillRect(snap(x - arrow.width, k), snap(view.groundY - 1, k), arrow.width * 2, 1);
          ctx.restore();
          ctx.save();
          ctx.translate(snap(x, k), snap(y, k));
          ctx.scale(-2, 2);
          ctx.drawImage(arrow, -arrow.width / 2, -arrow.height / 2);
          ctx.restore();
          ctx.globalAlpha = 1;
          continue;
        }
        if (hasIcon(projectile.icon) === false) {
          ctx.fillStyle = '#fee761';
          ctx.fillRect(snap(x - 2, k), snap(y - 2, k), 4, 4);
          continue;
        }
        const image = sprites.icon(projectile.icon);
        ctx.save();
        ctx.translate(snap(x, k), snap(y, k));
        ctx.rotate((realNow - projectile.startAt) / 90 * (projectile.spin ?? 0));
        ctx.drawImage(image, -Math.round(image.width / 2), -Math.round(image.height / 2));
        ctx.restore();
      }
      const fairy = state.fairy;
      if (fairy.visible === true && fairy.alpha > 0) {
        const point = this.fairyPosition(view, world.hero, now);
        const frame = Math.floor(now / 120) % 2;
        const name = fairy.sad === true ? `fairyMiniSad${frame}` : `fairyMini${frame}`;
        if (hasIcon(name) === true) {
          const image = sprites.icon(name);
          const halo = ctx.createRadialGradient(point.x, point.y, 1, point.x, point.y, 12 * fairy.scale);
          halo.addColorStop(0, fairy.sad === true ? 'rgba(117, 227, 255, 0.22)' : 'rgba(254, 231, 97, 0.24)');
          halo.addColorStop(1, 'rgba(254, 231, 97, 0)');
          ctx.save();
          ctx.globalAlpha = fairy.alpha * (0.85 + 0.15 * Math.sin(now / 420));
          ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = halo;
          ctx.fillRect(point.x - 13 * fairy.scale, point.y - 13 * fairy.scale, 26 * fairy.scale, 26 * fairy.scale);
          ctx.restore();
          ctx.save();
          ctx.globalAlpha = fairy.alpha;
          ctx.translate(snap(point.x, k), snap(point.y, k));
          ctx.scale(fairy.scale, fairy.scale);
          ctx.drawImage(image, -Math.round(image.width / 2), -Math.round(image.height / 2));
          ctx.restore();
        } else {
          ctx.fillStyle = '#fee761';
          ctx.fillRect(snap(point.x - 2, k), snap(point.y - 2, k), 4, 4);
        }
        if (Math.floor(now / 200) % 3 === 0) {
          ctx.fillStyle = '#fff6d0';
          ctx.fillRect(snap(point.x - 6 + (Math.floor(now / 200) % 5) * 3, k), snap(point.y + 6, k), 1, 1);
        }
      }
    },
    fairyLight(view, hero, now) {
      if (state.fairy.visible === false || state.fairy.alpha <= 0) return null;
      const point = this.fairyPosition(view, hero, now);
      return { x: point.x, y: point.y, radius: 26 * state.fairy.glow, strength: 0.7 * state.fairy.alpha };
    },
    drawOverlay(ctx, view, world, now, k, realNow) {
      const hero = world.hero;
      if (state.blackout > 0) {
        ctx.fillStyle = `rgba(12, 9, 24, ${state.blackout})`;
        ctx.fillRect(-4, -4, view.W + 8, view.H + 8);
      }
      if (state.emergency === true) {
        const on = Math.floor(now / 700) % 2 === 0;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (const fx of [0.15, 0.85]) {
          const x = view.W * fx;
          const glow = ctx.createRadialGradient(x, 6, 0, x, 6, 60);
          glow.addColorStop(0, `rgba(228, 59, 68, ${on === true ? 0.35 : 0.12})`);
          glow.addColorStop(1, 'rgba(228, 59, 68, 0)');
          ctx.fillStyle = glow;
          ctx.fillRect(x - 60, -10, 120, 90);
          ctx.fillStyle = on === true ? '#ff706d' : '#a22633';
          ctx.fillRect(snap(x - 2, k), 3, 4, 2);
        }
        ctx.restore();
      }
      if (state.rings.length > 0 && state.blackout > 0.3) {
        const cx = actorX(view, hero);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const glow = ctx.createRadialGradient(cx, view.groundY - 8, 0, cx, view.groundY - 8, 30);
        glow.addColorStop(0, 'rgba(254, 231, 97, 0.18)');
        glow.addColorStop(1, 'rgba(254, 231, 97, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(cx - 32, view.groundY - 40, 64, 64);
        ctx.restore();
      }
      if (state.riposte === true && hero.visible === true) {
        const cx = actorX(view, hero);
        const pulse = 0.5 + 0.3 * Math.sin(now / 110);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const glow = ctx.createRadialGradient(cx, view.groundY - 8, 0, cx, view.groundY - 8, 16);
        glow.addColorStop(0, `rgba(254, 231, 97, ${0.35 * pulse})`);
        glow.addColorStop(1, 'rgba(254, 174, 52, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(cx - 18, view.groundY - 26, 36, 36);
        ctx.restore();
        if (Math.floor(now / 90) % 4 === 0) {
          ctx.fillStyle = '#fee761';
          ctx.fillRect(snap(cx - 7 + (Math.floor(now / 90) % 15), k), snap(view.groundY - 18 - (Math.floor(now / 60) % 8), k), 1, 1);
        }
      }
      for (const cue of state.cues) {
        const elapsed = realNow - cue.t0;
        if (elapsed < cue.beat - 700 || elapsed > cue.beat + 40) continue;
        const heroX = actorX(view, hero) + 8;
        const slitX = view.W - 12;
        const y = snap(view.groundY - 9, k);
        const strength = Math.min(1, (elapsed - cue.beat + 700) / 500);
        if (elapsed < cue.beat - 300) {
          const pulse = 0.5 + 0.5 * Math.sin(realNow / 45);
          const glow = ctx.createRadialGradient(slitX + 4, view.groundY - 9, 1, slitX + 4, view.groundY - 9, 18);
          glow.addColorStop(0, `rgba(228, 59, 68, ${0.35 + 0.45 * strength * pulse})`);
          glow.addColorStop(1, 'rgba(228, 59, 68, 0)');
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = glow;
          ctx.fillRect(slitX - 16, view.groundY - 29, 40, 40);
          ctx.restore();
        }
        ctx.globalAlpha = 0.25 + 0.6 * strength;
        ctx.fillStyle = '#e43b44';
        const dash = Math.floor(realNow / 70) % 6;
        for (let dx = slitX - dash; dx > heroX; dx -= 6) ctx.fillRect(snap(dx - 3, k), y, 3, 1);
        ctx.globalAlpha = 1;
        if (elapsed > cue.beat - 620 && Math.floor(realNow / 90) % 2 === 0) {
          const ax = snap(slitX - 2, k);
          const ay = snap(view.groundY - 38, k);
          ctx.fillStyle = '#181425';
          ctx.fillRect(ax - 4, ay - 2, 8, 20);
          ctx.fillStyle = '#e43b44';
          ctx.fillRect(ax - 2, ay, 4, 11);
          ctx.fillRect(ax - 2, ay + 13, 4, 3);
          ctx.fillStyle = '#feae34';
          ctx.fillRect(ax - 1, ay + 1, 1, 9);
        }
      }
      if (state.slit === true) {
        const x = snap(view.W - 8, k);
        const y = snap(view.groundY - 9, k);
        ctx.fillStyle = '#262b44';
        ctx.fillRect(x - 5, y - 4, 10, 8);
        ctx.fillStyle = '#0c0918';
        ctx.fillRect(x - 4, y - 3, 8, 6);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const alarm = ctx.createRadialGradient(x, y, 0, x, y, 14);
        alarm.addColorStop(0, `rgba(255, 112, 109, ${0.5 + 0.3 * Math.sin(now / 150)})`);
        alarm.addColorStop(1, 'rgba(228, 59, 68, 0)');
        ctx.fillStyle = alarm;
        ctx.fillRect(x - 16, y - 16, 32, 32);
        ctx.restore();
      }
      if (state.rings.length > 0) {
        const cx = actorX(view, hero);
        const cy = view.groundY - 8;
        ctx.save();
        ctx.globalAlpha = 0.5 + 0.2 * Math.sin(now / 120);
        ctx.strokeStyle = '#e4edf9';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, RING_END, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        const next = state.rings.find((candidate) => candidate.result === null);
        for (const ring of state.rings) {
          const elapsed = realNow - ring.t0;
          const startAt = ring.beat - ring.approach;
          if (elapsed < startAt - 60) continue;
          if (ring.result !== null) {
            const age = realNow - ring.resultAt;
            if (age > 360) continue;
            const color = ring.result === 'perfect' ? '#fee761' : ring.result === 'good' ? '#75e3ff' : '#e43b44';
            ctx.save();
            ctx.globalAlpha = 1 - age / 360;
            ctx.strokeStyle = color;
            ctx.lineWidth = ring.result === 'perfect' ? 3 : 2;
            ctx.beginPath();
            ctx.arc(cx, cy, RING_END + age / 18, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
            continue;
          }
          const t = Math.max(0, Math.min(1.15, (elapsed - startAt) / ring.approach));
          const radius = Math.max(3, RING_START + (RING_END - RING_START) * t);
          const active = ring === next;
          ctx.save();
          const close = Math.max(0, Math.min(1, (t - 0.5) / 0.4));
          const fade = 1 - state.ringFade * close * close * (3 - 2 * close);
          ctx.globalAlpha = Math.min(1, (elapsed - startAt + 60) / 160) * (active === true ? 1 : 0.4) * fade;
          ctx.strokeStyle = ring.heavy === true ? '#e43b44' : active === true ? '#feae34' : '#fee761';
          ctx.lineWidth = active === true ? (ring.heavy === true ? 3 : 2.5) : 1;
          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }
    },
    addMarkers(beats, t0) {
      state.rings = [];
      state.cues = beats.map((beat) => ({ beat, t0 }));
    },
    addRings(beats, approach, t0, heavy = false) {
      state.rings = beats.map((beat, index) => ({ beat, approach, t0, heavy, index, result: null, resultAt: 0 }));
      return state.rings;
    },
    resolveRing(index, result, at) {
      const ring = state.rings[index];
      if (ring === undefined || ring.result !== null) return;
      ring.result = result;
      ring.resultAt = at;
    },
    setDifficulty(id) {
      state.ringFade = RING_FADE[id] ?? 0;
    },
    clearRings() {
      state.rings = [];
      state.cues = [];
    },
    addProjectile(projectile) {
      state.projectiles.push({ done: false, spin: 0, ...projectile });
    },
    clearProjectiles() {
      state.projectiles = [];
      state.arrowResults = [];
    },
    resolveArrow(index, grade, at) {
      if (state.arrowResults[index] === undefined) state.arrowResults[index] = { grade, at };
    },
    addMinion(minion) {
      state.minions.push({ visible: true, dead: null, ...minion });
    },
    clearMinions() {
      state.minions = [];
    },
    reset() {
      state.active = false;
      state.node = null;
      state.from = null;
      state.street = true;
      state.camSeg = 0;
      state.doors = [];
      state.streetDoors = [];
      state.coffee = 'locked';
      state.rings = [];
      state.projectiles = [];
      state.minions = [];
      state.floorItems = [];
      state.cues = [];
      state.riposte = false;
      state.ringFade = 0;
      state.slit = false;
      state.emergency = false;
      state.blackout = 0;
      Object.assign(state.fairy, { visible: false, dx: 0, dy: 0, alpha: 1, scale: 1, sad: false, follow: true, glow: 1 });
    },
  };
}
