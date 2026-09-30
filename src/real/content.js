export const HARD_MONSTERS = [
  { id: 'giant', name: 'Giant', tile: 109, line: 'One eye. Zero manners.' },
  { id: 'slime', name: 'Slime', tile: 108, line: 'It wobbles menacingly.' },
  { id: 'spider', name: 'Giant Spider', tile: 122, line: 'Too many legs. Way too many.' },
  { id: 'ghost', name: 'Ghost', tile: 121, line: 'Boo. It is trying its best.' },
  { id: 'bat', name: 'Bat', tile: 120, line: 'Screams in ultrasound.' },
  { id: 'rat', name: 'Rat', tile: 124, line: 'Chewed through the Wi-Fi cable.' },
  { id: 'crab', name: 'Crab Demon', tile: 110, line: 'Pinches first, asks later.' },
  { id: 'monk', name: 'Dark Monk', tile: 111, line: 'Took a vow of violence.' },
];

export const MONSTER_STATS = { hpFactor: [1.9, 2.3], atk: [2, 3] };

export const MIDBOSS = {
  id: 'scopeCreep',
  kind: 'midboss',
  name: 'SCOPE CREEP',
  title: 'It only gets bigger',
  hpFactor: 4,
  atk: [2, 3],
  growEvery: 2,
};

export const FINAL_BOSS = {
  id: 'monolith',
  kind: 'boss',
  name: 'THE LEGACY MONOLITH',
  title: 'Too big for this screen',
  hpFactor: 10,
  atk: [3, 4],
  enrageBonus: 1,
  perfectsForWeakSpot: 2,
};

export const WEAK_SPOT = {
  eye: { x: 0, y: -0.08 },
  rings: { bullseye: 0.13, close: 0.32 },
  amplitude: [0.85, 1.05],
  periodMs: [1100, 1800],
  timeoutMs: 5000,
  multipliers: { bullseye: 6, close: 3, head: 1, miss: 0 },
};

export const METER = {
  base: { sweepMs: 850, zones: { crit: 0.08, hit: 0.4 } },
  sweepFactor: [0.8, 1.2],
  offset: 0.15,
};

export const DODGE = { arrows: 3, waitMs: [700, 1800], windowMs: 450, damage: 3 };

export const GENIE = { wrongDamage: 3, fastMs: 5000, rewards: ['potion', 'heal', 'atk', 'points'], heal: 6, atk: 1, points: 500 };

export const POISON = { ticks: 4, damage: 1 };

export const POTION_THRESHOLD = 0.35;

export const MAX_POTIONS = 2;

export const SCORE = {
  crit: 600,
  hit: 100,
  glance: 10,
  combo: [1, 2, 3, 4, 5],
  dodge: 200,
  genie: 500,
  genieFast: 250,
  kill: { monster: 250, midboss: 1000, boss: 3000 },
  flawless: 300,
  hpPoint: 20,
  timeBaseSeconds: 150,
  timePoint: 20,
  weakSpot: { bullseye: 2000, close: 500, head: 100, miss: 0 },
};

export const DURATIONS = {
  title: 3500,
  walk: 1100,
  foeIntro: 900,
  strikeResolve: 950,
  counter: 900,
  kill: 900,
  roomClear: 400,
  genieIntro: 1800,
  genieResolve: 1700,
  trapIntro: 1500,
  dodgeResolve: 700,
  potionDrink: 900,
  doubleShot: 1900,
  weakSpotIntro: 1200,
  aimResolve: 1200,
  chest: 3400,
  bossIntro: 3400,
  midbossIntro: 2200,
  enrage: 800,
};

export const SKILLS = [
  'PHP / Symfony',
  'Python / FastAPI',
  'REST APIs',
  'Keycloak / SSO',
  'Docker',
  'Kubernetes',
  'GitHub Actions',
  'Cypress',
  'Claude Code',
  'Vue 3',
  'TypeScript',
  'Stripe',
];

export const QUESTIONS = {
  hire: {
    id: 'hire',
    text: 'Would you hire Ezra as a developer on your team?',
    answer: 'yes',
    shuffle: false,
    choices: [
      { id: 'yes', label: 'Yes, obviously', icon: 'thumbUp' },
      { id: 'no', label: 'No', icon: 'thumbDown' },
    ],
  },
  nationality: {
    id: 'nationality',
    text: "What is Ezra's nationality?",
    answer: 'nl',
    choices: [
      { id: 'nl', label: 'Dutch', icon: 'flagNL' },
      { id: 'be', label: 'Belgian', icon: 'flagBE' },
      { id: 'de', label: 'German', icon: 'flagDE' },
      { id: 'fr', label: 'French', icon: 'flagFR' },
    ],
  },
  drink: {
    id: 'drink',
    text: "What's Ezra's favourite drink?",
    answer: 'cherryCola',
    choices: [
      { id: 'cherryCola', label: 'Cherry Coke', icon: 'cherryCola' },
      { id: 'beer', label: 'Beer', icon: 'beer' },
      { id: 'wine', label: 'Wine', icon: 'wine' },
      { id: 'cocktail', label: 'Cocktail', icon: 'cocktail' },
    ],
  },
  console: {
    id: 'console',
    text: 'Which console does Ezra play the most?',
    answer: 'gameboy',
    choices: [
      { id: 'switch', label: 'Switch', icon: 'consoleSwitch' },
      { id: 'playstation', label: 'PlayStation', icon: 'consolePlay' },
      { id: 'xbox', label: 'Xbox', icon: 'consoleBox' },
      { id: 'gameboy', label: 'Game Boy', icon: 'consoleHandheld' },
    ],
  },
  pet: {
    id: 'pet',
    text: 'What pet does Ezra have?',
    answer: 'cat',
    choices: [
      { id: 'cat', label: 'Cat', icon: 'petCat' },
      { id: 'dog', label: 'Dog', icon: 'petDog' },
      { id: 'dragon', label: 'Dragon', icon: 'petDragon' },
      { id: 'fish', label: 'Fish', icon: 'petFish' },
    ],
  },
  os: {
    id: 'os',
    text: "Ezra's favourite OS?",
    answer: 'linux',
    choices: [
      { id: 'linux', label: 'Linux', icon: 'osPenguin' },
      { id: 'macos', label: 'macOS', icon: 'osApple' },
      { id: 'windows', label: 'Windows', icon: 'osWindow' },
    ],
  },
  skills: {
    id: 'skills',
    text: 'Ezra is proficient in…',
    answer: '*',
    choices: [],
  },
  volunteer: {
    id: 'volunteer',
    text: 'In his spare time, Ezra volunteers as a…',
    answer: 'firefighter',
    choices: [
      { id: 'firefighter', label: 'Firefighter', icon: 'jobFirefighter' },
      { id: 'gendarme', label: 'Gendarme', icon: 'jobGendarme' },
      { id: 'duck', label: 'Rubber-duck lifeguard', icon: 'jobDuck' },
    ],
  },
};

export const RANDOM_QUESTION_IDS = ['nationality', 'drink', 'console', 'pet', 'os', 'skills', 'volunteer'];

export const ROOM_PLAN = ['fight', 'fight', 'genie', 'trap', 'midboss', 'chest', 'fight', 'genie', 'fight', 'genie', 'boss'];
