export const CLASSES = {
  knight: { id: 'knight', key: 'tile:97', hp: 48, atk: 5, family: 'blade', parry: 1.4, critZone: 1, critMult: 3, sweep: 1, rage: 0, blockPenalty: 0 },
  rogue: { id: 'rogue', key: 'tile:112', hp: 37, atk: 6, family: 'blade', parry: 1, critZone: 1.3, critMult: 4, sweep: 1, rage: 0, blockPenalty: 0 },
  wizard: { id: 'wizard', key: 'tile:84', hp: 38, atk: 7, family: 'spell', parry: 1, critZone: 1, critMult: 3, sweep: 1.15, rage: 0, blockPenalty: 0 },
  barbarian: { id: 'barbarian', key: 'tile:87', hp: 54, atk: 6, family: 'blade', parry: 1, critZone: 1, critMult: 3, sweep: 1, rage: 3, blockPenalty: 0.15 },
};

export const CLASS_ORDER = ['knight', 'rogue', 'wizard', 'barbarian'];

export const RAGE_THRESHOLD = 0.4;

export const WEAPONS = {
  stick: { id: 'stick', slot: 'weapon', power: 0, durability: null, key: 'icon:stick', family: 'any', tier: 'basic' },
  sword: { id: 'sword', slot: 'weapon', power: 3, durability: 30, key: 'tile:106', family: 'blade', tier: 'common' },
  axe: { id: 'axe', slot: 'weapon', power: 5, durability: 18, key: 'tile:118', family: 'blade', tier: 'common' },
  daggers: { id: 'daggers', slot: 'weapon', power: 2, durability: 40, key: 'icon:twinDaggers', family: 'blade', tier: 'common', streak: 1 },
  oakStaff: { id: 'oakStaff', slot: 'weapon', power: 3, durability: 30, key: 'tile:129', family: 'spell', tier: 'common', fx: 'bolt' },
  emberStaff: { id: 'emberStaff', slot: 'weapon', power: 5, durability: 18, key: 'icon:fireStaff', family: 'spell', tier: 'common', fx: 'fire' },
  stormStaff: { id: 'stormStaff', slot: 'weapon', power: 2, durability: 40, key: 'icon:stormStaff', family: 'spell', tier: 'common', streak: 1, fx: 'lightning' },
  morningStar: { id: 'morningStar', slot: 'weapon', power: 6, durability: 22, key: 'icon:morningStar', family: 'blade', tier: 'epic' },
  runeStaff: { id: 'runeStaff', slot: 'weapon', power: 6, durability: 22, key: 'icon:runeStaff', family: 'spell', tier: 'epic', fx: 'lightning' },
  spear: { id: 'spear', slot: 'weapon', power: 4, durability: 34, key: 'tile:131', family: 'blade', tier: 'rare' },
  wand: { id: 'wand', slot: 'weapon', power: 4, durability: 34, key: 'tile:130', family: 'spell', tier: 'rare', fx: 'bolt' },
  lightbringer: { id: 'lightbringer', slot: 'weapon', power: 7, durability: 28, key: 'icon:lightbringer', family: 'blade', tier: 'legendary' },
  sunStaff: { id: 'sunStaff', slot: 'weapon', power: 7, durability: 28, key: 'icon:sunStaff', family: 'spell', tier: 'legendary', fx: 'fire' },
};

export const STARTING_WEAPONS = {
  blade: ['sword', 'axe', 'daggers'],
  spell: ['oakStaff', 'emberStaff', 'stormStaff'],
};

const BUCKLER = { absorb: 0.25, parry: 1.3, durability: 24, tier: 'common' };
const KITE = { absorb: 0.4, parry: 1, durability: 20, tier: 'common' };
const TOWER = { absorb: 0.6, parry: 0.7, durability: 16, tier: 'common' };
const AEGIS = { absorb: 0.5, parry: 1.25, durability: 30, tier: 'epic' };
const BASIC_GUARD = { absorb: 0.12, parry: 1, durability: null, tier: 'basic' };

export const SHIELDS = {
  potLid: { id: 'potLid', slot: 'shield', family: 'blade', key: 'icon:potLid', ...BASIC_GUARD },
  buckler: { id: 'buckler', slot: 'shield', family: 'blade', key: 'icon:buckler', ...BUCKLER },
  kite: { id: 'kite', slot: 'shield', family: 'blade', key: 'icon:kiteShield', ...KITE },
  tower: { id: 'tower', slot: 'shield', family: 'blade', key: 'icon:towerShield', ...TOWER },
  aegis: { id: 'aegis', slot: 'shield', family: 'blade', key: 'icon:aegisShield', ...AEGIS },
  pointyHat: { id: 'pointyHat', slot: 'shield', family: 'spell', key: 'icon:pointyHat', ...BASIC_GUARD },
  manaWard: { id: 'manaWard', slot: 'shield', family: 'spell', key: 'icon:manaWard', ...BUCKLER },
  runeWard: { id: 'runeWard', slot: 'shield', family: 'spell', key: 'icon:runeWard', ...KITE },
  arcaneBarrier: { id: 'arcaneBarrier', slot: 'shield', family: 'spell', key: 'icon:arcaneBarrier', ...TOWER },
  firewall: { id: 'firewall', slot: 'shield', family: 'spell', key: 'icon:firewall', ...AEGIS },
};

export const STARTING_SHIELDS = {
  blade: ['buckler', 'kite', 'tower'],
  spell: ['manaWard', 'runeWard', 'arcaneBarrier'],
};

export const BASIC_SHIELD = { blade: 'potLid', spell: 'pointyHat' };

export const POTIONS = {
  small: { id: 'small', slot: 'potion', heal: 8, key: 'tile:127', tier: 'common' },
  large: { id: 'large', slot: 'potion', heal: 15, key: 'tile:115', tier: 'rare' },
  cola: { id: 'cola', slot: 'potion', heal: 20, key: 'icon:cherryCola', tier: 'epic' },
};

export const KEYCARD = { id: 'keycard', slot: 'key', key: 'icon:keycard', tier: 'epic' };

export const DIFFICULTIES = {
  normal: { id: 'normal', hp: 1, damage: 1, depth: 0, boss: 1, bossDamage: 1, tempo: 1, sweep: 1, wear: { crit: 0, hit: 1, glance: 2 }, shieldWear: 1, potions: 3, parry: 1, block: 1, heal: 1, score: 1 },
  hard: { id: 'hard', hp: 1.12, damage: 1.2, depth: 0.06, boss: 1.05, bossDamage: 1.45, tempo: 0.92, sweep: 0.92, wear: { crit: 1, hit: 1, glance: 3 }, shieldWear: 1, potions: 3, parry: 0.88, block: 0.9, heal: 0.8, score: 1.35 },
  tryhard: { id: 'tryhard', hp: 1.25, damage: 1.4, depth: 0.08, boss: 1.15, bossDamage: 1.8, tempo: 0.85, sweep: 0.85, wear: { crit: 1, hit: 2, glance: 3 }, shieldWear: 2, potions: 2, parry: 0.75, block: 0.85, heal: 0.7, score: 1.8 },
};

export const DIFFICULTY_ORDER = ['normal', 'hard', 'tryhard'];

export const DEPTH = { h1: 0, a1: 1, h2: 1, a2: 2, b1: 2, h3: 2, mb: 3, c1: 3, h4: 3, den: 3, d1: 4, d2: 5, d3: 6, lair: 7 };

export const DEPTH_PIVOT = 3;

export const POTION_THRESHOLD = 0.35;

export const METER = { zones: { crit: 0.055, hit: 0.32 }, sweepFactor: [0.85, 1.15], offset: 0.14, dustedSweep: 0.8 };

export const DEFENSE = { parryMs: 40, blockMs: 180, approachJitter: [0.9, 1.1] };

export const DODGE = { perfectMs: 40, goodMs: 100, damage: 3 };

export const HORDE = { count: 15, firstMs: 1300, intervals: [820, 430], perfectMs: 55, goodMs: 130, bite: 2 };

export const POISON = { firstMs: 7000, stepMs: 900, minMs: 2400, damage: [1, 1, 1, 2, 2, 2, 3] };

export const COFFEE_HEAL = 0.5;

export const CAT_HEAL = 12;

export const RIPOSTE = 1.5;

export const TAP_EXTRA = { defend: 2, dodge: 2, horde: 4 };

export const SCORED_ATTACKS = { monster: 4, elite: 5, midboss: 14, boss: 18 };

export const MULTIPLIERS = { glance: 0.4, hit: 1 };

const bite = (id, beats, damage, approach, extra = {}) => ({ id, beats, damage, approach, heavy: false, ...extra });

export const MONSTERS = {
  rat: { id: 'rat', key: 'tile:124', hp: 17, armor: 0, sweep: 760, rank: 'monster', moves: [bite('bite', [0, 340], 3, 900)] },
  bat: { id: 'bat', key: 'tile:120', hp: 14, armor: 0, sweep: 680, rank: 'monster', moves: [bite('swoop', [0], 4, 720)] },
  slime: { id: 'slime', key: 'tile:108', hp: 33, armor: 0, sweep: 980, rank: 'monster', moves: [bite('slam', [0], 7, 1400, { heavy: true })] },
  spider: { id: 'spider', key: 'tile:122', hp: 23, armor: 0, sweep: 820, rank: 'monster', moves: [bite('venom', [0], 3, 860, { poison: true })] },
  ghost: { id: 'ghost', key: 'tile:121', hp: 23, armor: 0, sweep: 900, rank: 'monster', fade: true, moves: [bite('wail', [0], 4, 1000), bite('haunt', [0, 420], 3, 1000)] },
  giant: { id: 'giant', key: 'tile:109', hp: 58, armor: 1, sweep: 950, rank: 'elite', moves: [bite('club', [0], 9, 1450, { heavy: true }), bite('stomp', [0, 450], 5, 1150)] },
  crab: { id: 'crab', key: 'tile:110', hp: 32, armor: 3, sweep: 850, rank: 'monster', moves: [bite('pinch', [0, 300], 4, 950)] },
  monk: { id: 'monk', key: 'tile:111', hp: 28, armor: 0, sweep: 880, rank: 'monster', moves: [bite('hex', [0, 330, 660], 3, 1100)] },
  knight: { id: 'knight', key: 'tile:96', variant: 'shadow', hp: 54, armor: 2, sweep: 800, rank: 'elite', moves: [bite('slash', [0], 8, 850), bite('combo', [0, 340, 680], 5, 950)] },
  mimic: { id: 'mimic', key: 'tile:92', hp: 46, armor: 0, sweep: 780, rank: 'elite', ambush: true, moves: [bite('chomp', [0, 300], 6, 820), bite('gulp', [0], 10, 1300, { heavy: true })] },
  glitch: { id: 'glitch', key: 'icon:glitch0', hp: 24, armor: 0, sweep: 820, rank: 'monster', shake: true, moves: [bite('zap', [0, 260], 3, 900), bite('surge', [0], 6, 1150)] },
  bug: { id: 'bug', key: 'icon:bug0', hp: 12, armor: 0, sweep: 700, rank: 'monster', moves: [bite('nip', [0], 3, 760)] },
};

export const MANAGER = {
  id: 'manager',
  rank: 'midboss',
  hp: 210,
  armor: 0,
  sweep: 860,
  rageAt: 0.4,
  rageSpeed: 0.8,
  rageDamage: 1,
  moves: {
    lock: bite('lock', [0], 7, 1000, { line: 'lock', projectile: 'padlock' }),
    lastpass: bite('lastpass', [0, 380, 760], 3, 1100, { line: 'lastpass', projectile: 'stickyNote' }),
    hmpf: bite('hmpf', [0], 10, 1600, { line: 'hmpf', heavy: true }),
    meeting: bite('meeting', [0, 420, 840, 1260], 2, 1200, { line: 'meeting', projectile: 'invite' }),
    seeds: bite('seeds', [0, 300, 600, 900, 1200], 2, 1000, { line: 'seeds', projectile: 'seed' }),
    doliprane: bite('doliprane', [0, 340, 680], 3, 1050, { line: 'doliprane', projectile: 'pill' }),
    euh: bite('euh', [0], 6, 900, { line: 'euh' }),
  },
  calm: ['lock', 'lastpass', 'euh', 'hmpf', 'meeting'],
  rage: ['seeds', 'lock', 'doliprane', 'hmpf', 'lastpass'],
};

export const MOTH = {
  id: 'moth',
  rank: 'boss',
  hp: 330,
  armor: 0,
  sweep: 800,
  spawnAt: 0.6,
  frenzyAt: 0.25,
  enragedSpeed: 0.85,
  enragedDamage: 1,
  adds: ['bug', 'bug'],
  moves: {
    dive: bite('dive', [0], 9, 900),
    flutter: bite('flutter', [0, 380], 6, 950),
    dust: bite('dust', [0, 320, 640], 5, 1050, { dust: true }),
    frenzy: bite('frenzy', [0, 290, 580, 870], 5, 950),
  },
  calm: ['dive', 'flutter', 'dust'],
  frenzy: ['frenzy', 'dive', 'dust', 'flutter'],
};

export const VOLLEYS = {
  street: [1100, 1900, 2500, 3500],
  crypt: [1000, 1400, 2300, 2650, 3400],
};

export const NODES = {
  h1: { id: 'h1', theme: 'street', area: 'street', x: 0, y: 3, links: ['a1', 'h2'], door: 'a1', steps: [{ type: 'fight', foes: ['rat', 'rat'] }] },
  h2: { id: 'h2', theme: 'street', area: 'street', x: 3, y: 3, links: ['h1', 'b1', 'h3'], door: 'b1', steps: [{ type: 'arrows', volley: 'street' }, { type: 'fight', foes: ['bat'] }] },
  h3: { id: 'h3', theme: 'street', area: 'street', x: 5, y: 3, links: ['h2', 'c1', 'h4'], door: 'c1', steps: [{ type: 'fight', foes: ['giant'] }] },
  h4: { id: 'h4', theme: 'street', area: 'street', x: 7, y: 3, links: ['h3', 'd1'], door: 'd1', locked: 'd1', steps: [{ type: 'fight', foes: ['slime'] }] },
  a1: { id: 'a1', theme: 'archives', area: 'loop', x: 0, y: 2, links: ['h1', 'a2'], portal: { to: 'den', requires: 'keycard' }, steps: [{ type: 'fight', foes: ['ghost', 'bat'] }, { type: 'chest', items: [{ weapon: { blade: 'morningStar', spell: 'runeStaff' } }] }] },
  a2: { id: 'a2', theme: 'office', area: 'loop', x: 0, y: 1, links: ['a1', 'mb'], steps: [{ type: 'fight', foes: ['monk', 'spider', 'rat'] }], floor: [{ potion: 'large' }] },
  mb: { id: 'mb', theme: 'manager', area: 'loop', x: 1.5, y: 1, links: ['a2', 'b1'], steps: [{ type: 'midboss' }, { type: 'drop', items: [{ key: 'keycard' }, { potion: 'small' }] }] },
  b1: { id: 'b1', theme: 'server', area: 'loop', x: 3, y: 2, links: ['mb', 'h2'], steps: [{ type: 'fight', foes: ['glitch', 'crab'] }, { type: 'chest', items: [{ shield: { blade: 'aegis', spell: 'firewall' } }] }] },
  c1: { id: 'c1', theme: 'breakroom', area: 'dead', x: 5, y: 4, links: ['h3'], trapChest: true, steps: [] },
  d1: { id: 'd1', theme: 'descent', area: 'deep', x: 7, y: 4, links: ['h4', 'd2'], steps: [{ type: 'fight', foes: ['knight', 'spider'] }], floor: [{ weapon: { blade: 'spear', spell: 'wand' } }] },
  d2: { id: 'd2', theme: 'crypt', area: 'deep', x: 8, y: 4, links: ['d1', 'd3'], steps: [{ type: 'arrows', volley: 'crypt' }, { type: 'fight', foes: ['slime', 'ghost'] }] },
  d3: { id: 'd3', theme: 'echoes', area: 'deep', x: 9, y: 4, links: ['d2', 'lair'], steps: [{ type: 'fight', foes: ['giant'] }, { type: 'mimic' }, { type: 'drop', items: [{ potion: 'large' }, { potion: 'small' }] }] },
  lair: { id: 'lair', theme: 'lair', area: 'deep', x: 10, y: 4, links: ['d3'], final: true, steps: [{ type: 'boss' }] },
  den: { id: 'den', theme: 'den', area: 'secret', x: 1.5, y: 2, links: ['a1', 'h4'], portalRoom: true, steps: [], floor: [{ potion: 'cola' }] },
};

export const HORDE_REWARD = [{ weapon: { blade: 'lightbringer', spell: 'sunStaff' } }];

export const START_NODE = 'h1';

export const SCORE = {
  crit: 500,
  hit: 100,
  glance: 0,
  combo: [1, 1.5, 2, 2.5, 3],
  parry: 300,
  block: 50,
  dodge: 200,
  dodgePerfect: 300,
  horde: { perfect: 150, good: 50, miss: 0 },
  hordeClear: 2000,
  kill: { monster: 200, elite: 400, midboss: 3000, boss: 6000 },
  flawless: 500,
  explore: 100,
  secret: 1500,
  hpPoint: 30,
  timeBaseSeconds: 480,
  timePoint: 10,
};

export const DURATIONS = {
  intro: 3000,
  create: 1200,
  walk: 1100,
  door: 1700,
  room: 1300,
  foeIntro: 900,
  strikeResolve: 950,
  defendResolve: 500,
  kill: 900,
  roomClear: 500,
  chest: 1800,
  offer: 600,
  take: 500,
  drink: 900,
  coffee: 1600,
  arrowsIntro: 1400,
  dodgeResolve: 500,
  hordeIntro: 2600,
  hordeResolve: 900,
  midbossIntro: 4200,
  line: 1200,
  rage: 2600,
  bossIntro: 7000,
  spawn: 2200,
  frenzy: 1400,
  mimic: 1600,
  victory: 1500,
  portal: 1900,
  pet: 1400,
};
