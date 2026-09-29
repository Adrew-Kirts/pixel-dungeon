import { top } from '../../scenes/common.js';
import { waitForKeyedChoice } from '../../ui/real/panels.js';

export async function keyedChoice(scene, root, guardMs) {
  const choice = waitForKeyedChoice(root, { guardMs });
  const unregister = scene.onCleanup(() => choice.cancel());
  const result = await choice.promise;
  unregister();
  return result;
}

export function addScore(scene, points) {
  if (points <= 0) return;
  scene.score += points;
  scene.game.hud.score.set(scene.score);
}

export function pointsFloat(scene, actor, points, kind = 'points') {
  if (points <= 0) return;
  const head = top(scene.game, { ...actor, height: (actor.height ?? 16) * (actor.baseScale ?? 1) });
  scene.game.hud.floatText(head.x + 8, head.y - 18, `+${points}`, kind);
}
