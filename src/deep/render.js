import { snap } from '../engine/sprites.js';
import { drawWorld, drawDissolve, actorX } from '../stage/world.js';
import { itemDef } from './engine.js';

export function renderDeep(ctx, game, view, now, realNow) {
  const { k, W, H } = view;
  const { sprites, camera, particles } = game;
  const stage = game.deep.stage;
  ctx.setTransform(k, 0, 0, k, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#181425';
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.translate(snap(camera.state.offsetX, k), snap(camera.state.offsetY, k));
  const lights = stage.drawRoom(ctx, view, sprites, game.background, now, k);
  stage.drawFloorItems(ctx, view, sprites, now, k, (item) => itemDef(item).key);
  drawWorld(ctx, view, game.world, sprites, now, k);
  stage.drawFront(ctx, view, game.world, sprites, now, k, realNow);
  const { hero, foe } = game.world;
  if (hero.visible === true) lights.push({ x: actorX(view, hero), y: view.groundY - 9, radius: 46, strength: 0.92 });
  if (foe.visible === true) lights.push({ x: actorX(view, foe), y: view.groundY + Math.min(0, foe.dy) - (foe.height ?? 16) / 2, radius: foe.height >= 32 ? 60 : 36, strength: 0.75 });
  const fairy = stage.fairyLight(view, hero, now);
  if (fairy !== null) lights.push(fairy);
  game.background.drawLighting(ctx, view, lights, game.lighting.darkness, now);
  game.effects.draw(ctx, k);
  particles.draw(ctx, k);
  stage.drawOverlay(ctx, view, game.world, now, k, realNow);
  ctx.restore();
  camera.drawOverlay(ctx, view, now);
  drawDissolve(ctx, view, game.world);
}
