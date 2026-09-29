import { actorX, actorY } from '../stage/world.js';

export function heroKey(hero) {
  return `tile:${hero.cls === 'warrior' ? 97 : 84}`;
}

export function heroVariant(hero) {
  return hero.legendary === true ? 'gold' : 'base';
}

export function itemKey(item) {
  return `icon:${item.icon}`;
}

export function center(game, actor, ratio = 0.55) {
  const height = actor.height ?? 16;
  return { x: actorX(game.view, actor), y: actorY(game.view, actor) - height * ratio };
}

export function top(game, actor) {
  const height = actor.height ?? 16;
  return { x: actorX(game.view, actor), y: actorY(game.view, actor) - height - 2 };
}

export function flash(game, actor, ms = 180) {
  actor.flash = 1;
  game.scheduler.tween(actor, { flash: 0 }, ms, 'linear');
}

export function knock(game, actor, distance, ms = 260) {
  game.scheduler.killTweensOf(actor, 'dx');
  actor.dx += distance;
  game.scheduler.tween(actor, { dx: 0 }, ms, 'outQuad');
}

export function vibrate(ms) {
  if (typeof navigator.vibrate === 'function' && navigator.userActivation?.hasBeenActive === true) navigator.vibrate(ms);
}

export function dragonFrames(now, actor) {
  const order = ['up', 'mid', 'down', 'mid'];
  const pose = order[Math.floor(now / actor.flapMs) % order.length];
  return `dragon:${pose}-${actor.mouthOpen === true ? 'open' : 'closed'}`;
}
