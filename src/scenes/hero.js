import { t, heroName } from '../i18n.js';
import { actorX } from '../stage/world.js';
import { heroRevealPanel } from '../ui/panels.js';
import { heroKey, heroVariant, itemKey, center } from './common.js';

export async function heroScene(game, run) {
  const { world, hud, scheduler, audio, camera, effects } = game;
  const hero = world.hero;
  Object.assign(hero, {
    key: heroKey(run.hero),
    variant: heroVariant(run.hero),
    anchor: 0.26,
    dy: -70,
    dx: 0,
    visible: true,
    idle: true,
    height: 16,
    shadow: 6,
    hold: itemKey(run.hero.item),
  });
  audio.sfx.whoosh();
  await scheduler.tween(hero, { dy: 0 }, 340, 'inQuad');
  hero.sx = 1.35;
  hero.sy = 0.7;
  audio.sfx.thud();
  camera.shake(1.2, 160);
  effects.dust(actorX(game.view, hero), game.view.groundY, 10);
  scheduler.tween(hero, { sx: 1, sy: 1 }, 280, 'outBack');
  if (run.hero.legendary === true) {
    const point = center(game, hero);
    effects.sparkle(point.x, point.y, ['#fee761', '#feae34', '#ffffff'], 30);
    audio.sfx.item();
  }
  hud.showHero(run.hero);
  hud.announce(t('announce.hero', { name: heroName(run.hero), cls: t(`class.${run.hero.cls}`), hp: run.hero.maxHp, atk: run.hero.atk }));
  scheduler.setSpeed(1);
  const reveal = heroRevealPanel(run.hero, game);
  hud.panel(reveal.el);
  await reveal.done;
  audio.sfx.select();
  await hud.closePanel();
}
