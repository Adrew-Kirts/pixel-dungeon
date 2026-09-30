export const EVENT_TYPES = ['visit', 'easy.start', 'easy.win', 'easy.lose', 'easy.rank.S', 'easy.rank.A', 'easy.rank.B', 'easy.rank.C', 'lang.en', 'lang.fr'];

export function isEventType(type) {
  return typeof type === 'string' && EVENT_TYPES.includes(type) === true;
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
  if (state.hero.firstName === 'Dave') add('real.daves');
  if (state.hero.legendary === true) add('real.legendary');
  return facts;
}
