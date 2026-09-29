import { drawSprite, snap } from '../engine/sprites.js';

export function createActor(overrides = {}) {
  return {
    key: null,
    variant: 'base',
    anchor: 0.5,
    dx: 0,
    dy: 0,
    sx: 1,
    sy: 1,
    rot: 0,
    alpha: 1,
    flash: 0,
    visible: false,
    hold: null,
    holdRot: -0.35,
    holdX: 6,
    holdY: 3,
    holdAlpha: 1,
    idle: true,
    walking: false,
    shadow: 7,
    phase: Math.random() * 10,
    pivotY: 0,
    ...overrides,
  };
}

export function createWorld() {
  return {
    camX: 0,
    dissolve: 0,
    hero: createActor({ anchor: 0.26 }),
    foe: createActor({ anchor: 0.72 }),
    chest: createActor({ anchor: 0.7, shadow: 7, idle: false }),
    prop: createActor({ anchor: 0.26, idle: false, shadow: 6 }),
    dice: createActor({ anchor: 0.7, idle: false, shadow: 0 }),
    loot: createActor({ anchor: 0.7, idle: false, shadow: 0 }),
  };
}

export function resetWorld(world) {
  const fresh = createWorld();
  for (const name of ['hero', 'foe', 'chest', 'prop', 'dice', 'loot']) Object.assign(world[name], fresh[name]);
  world.dissolve = 0;
}

export function actorX(view, actor) {
  return view.W * actor.anchor + actor.dx;
}

export function actorY(view, actor) {
  return view.groundY + actor.dy;
}

export function actorCenter(view, actor, sprites) {
  const canvas = spriteFor(actor, sprites, performance.now());
  const height = canvas === null ? 16 : canvas.height;
  return { x: actorX(view, actor), y: actorY(view, actor) - height / 2 };
}

function spriteFor(actor, sprites, now) {
  if (actor.key === null) return null;
  const key = typeof actor.key === 'function' ? actor.key(now, actor) : actor.key;
  return sprites.get(key, actor.variant);
}

function drawShadow(ctx, view, actor, width, k) {
  if (actor.shadow <= 0) return;
  const lift = Math.max(0, -actor.dy);
  const scale = Math.max(0.35, 1 - lift / 50);
  const half = Math.round(actor.shadow * scale);
  const x = snap(actorX(view, actor), k);
  const y = view.groundY;
  ctx.globalAlpha = 0.42 * actor.alpha * Math.min(1, scale + 0.2);
  ctx.fillStyle = '#181425';
  ctx.fillRect(x - half + 1, y - 1, half * 2 - 2, 1);
  ctx.fillRect(x - half, y, half * 2, 1);
  ctx.fillRect(x - half + 2, y + 1, half * 2 - 4, 1);
  ctx.globalAlpha = 1;
  return width;
}

export function drawActor(ctx, view, actor, sprites, now, k) {
  if (actor.visible === false) return;
  const canvas = spriteFor(actor, sprites, now);
  if (canvas === null) return;
  let x = actorX(view, actor);
  let y = actorY(view, actor);
  let sx = actor.sx;
  let sy = actor.sy;
  if (actor.walking === true) {
    const step = Math.sin((now + actor.phase * 100) / 85);
    y -= Math.abs(step) * 1.6;
    sy *= 1 + step * 0.04;
  } else if (actor.idle === true) {
    y -= Math.floor((now / 420 + actor.phase) % 2);
  }
  drawShadow(ctx, view, actor, canvas.width, k);
  const options = { sx, sy, rot: actor.rot, alpha: actor.alpha, pivotY: actor.pivotY };
  drawSprite(ctx, canvas, x, y, k, options);
  if (actor.flash > 0) {
    const key = typeof actor.key === 'function' ? actor.key(now, actor) : actor.key;
    drawSprite(ctx, sprites.get(key, 'flash'), x, y, k, { ...options, alpha: actor.flash * actor.alpha });
  }
  if (actor.hold !== null && actor.holdAlpha > 0) {
    const item = sprites.get(actor.hold, actor.variant === 'gray' ? 'gray' : 'base');
    drawSprite(ctx, item, x + actor.holdX * sx, y - actor.holdY, k, {
      rot: actor.holdRot + actor.rot,
      alpha: actor.alpha * actor.holdAlpha,
      pivotY: 3,
    });
  }
}

export function drawWorld(ctx, view, world, sprites, now, k) {
  for (const name of ['prop', 'chest', 'foe', 'hero', 'loot', 'dice']) {
    drawActor(ctx, view, world[name], sprites, now, k);
  }
}

export function drawDissolve(ctx, view, world) {
  if (world.dissolve <= 0) return;
  const cell = 8;
  ctx.fillStyle = '#181425';
  for (let y = 0; y < view.H; y += cell) {
    for (let x = 0; x < view.W; x += cell) {
      const noise = ((x * 73856093) ^ (y * 19349663)) >>> 0;
      if ((noise % 1000) / 1000 < world.dissolve) ctx.fillRect(x, y, cell, cell);
    }
  }
}
