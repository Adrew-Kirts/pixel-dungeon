export const EVENT_TYPES = [
  'visit',
  'visit.first',
  'easy.start',
  'easy.chest',
  'easy.boss',
  'easy.win',
  'easy.lose',
  'easy.skip',
  'easy.rank.S',
  'easy.rank.A',
  'easy.rank.B',
  'easy.rank.C',
  'real.quit',
  'treasure.view',
  'click.picto',
  'click.github',
  'click.linkedin',
  'click.repo',
  'click.original',
  'lang.en',
  'lang.fr',
  'fairy.open',
  'fairy.yes',
  'fairy.no',
  'fairy.konami',
  'fairy.name',
  'deep.quit',
  'deep.create',
];

const ROOM_EVENT = /^real\.room\.([1-9]|1[01])$/;
const DEEP_ROOM_EVENT = /^deep\.room\.(h[1-4]|a[12]|mb|b1|c1|d[1-3]|lair|den)$/;

export function isEventType(type) {
  if (typeof type !== 'string') return false;
  return EVENT_TYPES.includes(type) === true || ROOM_EVENT.test(type) === true || DEEP_ROOM_EVENT.test(type) === true;
}

export function deepFacts(events, state, score) {
  const facts = {
    'deep.finished': 1,
    [state.outcome === 'victory' ? 'deep.victory' : 'deep.gameover']: 1,
    'deep.score': score.total,
    'deep.seconds': Math.round(score.seconds),
    'deep.strikes': state.counts.strikes,
    'deep.perfects': state.counts.perfects,
    'deep.parries': state.counts.parries,
    'deep.blocks': state.counts.blocks,
    'deep.hits': state.counts.hits,
    'deep.dodges': state.counts.dodges,
    'deep.broken': state.counts.broken,
    'deep.potions': state.counts.potions,
    [`deep.class.${state.hero.cls}`]: 1,
  };
  const add = (name, value = 1) => {
    facts[name] = (facts[name] ?? 0) + value;
  };
  for (const event of events) {
    if (event.type === 'create') {
      add(`deep.difficulty.${event.difficulty}`);
      add(`deep.weapon.${event.hero.weapon.id}`);
      add(`deep.shield.${event.hero.shield.id}`);
    } else if (event.type === 'hordeStart') add('deep.horde.opened');
    else if (event.type === 'horde' && event.survived === true) add('deep.horde.survived');
    else if (event.type === 'kill' && event.foe.rank === 'midboss') add('deep.manager.killed');
    else if (event.type === 'coffee') add('deep.coffee');
    else if (event.type === 'enter' && event.secret > 0) add('deep.den');
    else if (event.type === 'pet') add('deep.cat');
  }
  if (state.outcome === 'gameover') {
    add(`deep.deathBy.${state.killer}`);
    add(`deep.deathAt.${state.node}`);
  }
  return facts;
}

export function funFacts(events, state, score) {
  const facts = {
    'real.finished': 1,
    [state.outcome === 'victory' ? 'real.victory' : 'real.gameover']: 1,
    'real.score': score.total,
    'real.strikes': state.counts.strikes,
    'real.perfects': state.counts.perfects,
    'real.bullseyes': state.counts.bullseyes,
    'real.dodged': state.counts.dodges,
    'real.seconds': Math.round(score.seconds),
  };
  const add = (name, value = 1) => {
    facts[name] = (facts[name] ?? 0) + value;
  };
  for (const event of events) {
    if (event.type === 'kill') add(`real.kills.${event.kind}`);
    else if (event.type === 'dodge' && event.success === false) add('real.arrowHits');
    else if (event.type === 'genieAnswer') {
      if (event.questionId === 'hire') add(event.choice === 'yes' ? 'real.hire.yes' : 'real.hire.no');
      add(event.correct === true ? 'real.genie.right' : 'real.genie.wrong');
    } else if (event.type === 'potion' && event.choice === 'double') add('real.doubleShots');
    else if (event.type === 'potion' && event.choice === 'drink') add('real.potions');
    else if (event.type === 'poisonTick') add('real.poisonDamage', event.damage);
    else if (event.type === 'chest' && event.loot.mimic === true) add('real.mimics');
  }
  if (state.outcome === 'gameover') add(`real.deathBy.${state.foe !== null ? state.foe.id : 'arrow'}`);

  return facts;
}
