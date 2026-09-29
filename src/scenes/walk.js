import { actorX } from '../stage/world.js';

export async function walk(game, { enter = [], exit = [], ms = 1100 } = {}) {
  const { world, scheduler, audio, effects } = game;
  const travel = 0.6;
  const distance = travel * game.view.W;
  world.hero.walking = true;
  let walking = true;
  (async () => {
    while (walking === true) {
      audio.sfx.step();
      effects.dust(actorX(game.view, world.hero) - 3, game.view.groundY, 2);
      await scheduler.wait(170);
    }
  })();
  const moves = [scheduler.tween(world, { camX: world.camX + distance }, ms, 'inOutQuad')];
  for (const actor of enter) {
    actor.anchor = actor.targetAnchor + travel;
    actor.visible = true;
    moves.push(scheduler.tween(actor, { anchor: actor.targetAnchor }, ms, 'inOutQuad'));
  }
  for (const actor of exit) {
    moves.push(
      scheduler.tween(actor, { anchor: actor.anchor - travel }, ms, 'inOutQuad').then(() => {
        actor.visible = false;
      }),
    );
  }
  await Promise.all(moves);
  walking = false;
  world.hero.walking = false;
}
