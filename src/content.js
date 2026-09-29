export const CLASSES = {
  warrior: { id: 'warrior', label: 'Warrior', tile: 97, hp: [34, 38], atk: [5, 7], family: 'weapon' },
  wizard: { id: 'wizard', label: 'Wizard', tile: 84, hp: [32, 36], atk: [6, 8], family: 'spell' },
};

export const ITEMS = {
  woodenStick: {
    id: 'woodenStick',
    name: 'Wooden Stick',
    bonus: 0,
    family: 'weapon',
    icon: 'stick',
    line: 'The chest looks smug.',
  },
  morningStar: {
    id: 'morningStar',
    name: 'Morning Star',
    bonus: 2,
    family: 'weapon',
    icon: 'morningStar',
    line: 'Spiky. Very much a morning person.',
  },
  lightbringer: {
    id: 'lightbringer',
    name: 'Lightbringer',
    bonus: 4,
    family: 'weapon',
    icon: 'lightbringer',
    line: 'Glows. Hums. Probably fine.',
  },
  lightningBolt: {
    id: 'lightningBolt',
    name: 'Lightning Bolt',
    bonus: 2,
    family: 'spell',
    icon: 'stormStaff',
    line: 'Crackles with ambition.',
  },
  fireball: {
    id: 'fireball',
    name: 'Fireball',
    bonus: 5,
    family: 'spell',
    icon: 'fireStaff',
    line: 'Warm to the touch. Very warm.',
  },
};

export const POTIONS = {
  small: { id: 'small', name: 'Small Potion', heal: 4, icon: 'smallPotion' },
  large: { id: 'large', name: 'Large Potion', heal: 7, icon: 'largePotion' },
};

export const CLASS_ITEMS = {
  warrior: ['morningStar', 'lightbringer'],
  wizard: ['lightningBolt', 'fireball'],
};

export const LEGENDARY_ITEM = {
  warrior: 'lightbringer',
  wizard: 'fireball',
};

export const RARITIES = {
  common: { label: 'Common', color: '#8b9bb4' },
  uncommon: { label: 'Uncommon', color: '#43e1b3' },
  rare: { label: 'Rare', color: '#3aa8ff' },
  epic: { label: 'Epic', color: '#d176d0' },
  legendary: { label: 'Legendary', color: '#feae34' },
};

export const MONSTERS = [
  { id: 'giant', name: 'Giant', tile: 109, line: 'One eye. Zero manners.' },
  { id: 'slime', name: 'Slime', tile: 108, line: 'It wobbles menacingly.' },
  { id: 'spider', name: 'Giant Spider', tile: 122, line: 'Too many legs. Way too many.' },
  { id: 'ghost', name: 'Ghost', tile: 121, line: 'Boo. It is trying its best.' },
];

export const FIRST_NAMES = [
  'Sir Davos',
  'Brunhilda',
  'Gerald',
  'Merlina',
  'Bartholomew',
  'Gwendolyn',
  'Percival',
  'Ingrid',
  'Thaddeus',
  'Rowena',
  'Bjorn',
  'Elspeth',
  'Dave',
  'Morwenna',
  'Cedric',
  'Agatha',
];

export const EPITHETS = [
  'the Damp',
  'the Mildly Brave',
  'of No Fixed Abode',
  'the Overcaffeinated',
  'the Unready',
  'the Slightly Lost',
  'the Well-Rested',
  'Who Skipped Leg Day',
  'the Semi-Legendary',
  'of the Snack Pouch',
  'the Easily Startled',
  'the Uninvited',
  'Who Read the Manual',
  'the Optimistic',
  'the Freshly Laundered',
  'the Pretty Sure',
  'the Adequate',
];

export const DRAGON_NAMES = ['Vermithrax', 'Ignaroth', 'Smolderwing', 'Pyraxis', 'Cindermaw', 'Scorchbane', 'Emberfang'];

export const DRAGON_TITLES = [
  'Breaker of Builds',
  'Devourer of Deadlines',
  'Keeper of Legacy Code',
  'the Friday Deploy',
  'Merge Conflict Incarnate',
  'Hoarder of Tech Debt',
  'Scourge of Production',
  'Eater of Semicolons',
  'Scourge of the North',
  'Last of the Ember Kings',
];

export const EPITAPHS = [
  'Here lies {name}. Brought a {item} to a dragon fight.',
  '{name} was toast. Lightly buttered.',
  '{name} fought bravely. The dragon fought better.',
  'Crispy on the outside. {name} on the inside.',
  '{name}: gone, but not forgotten. Well, mostly forgotten.',
  'Here lies {name}. Respawning shortly.',
];

export const RANK_LINES = {
  S: 'Flawless. Bards will sing of this.',
  A: 'Heroic. Mostly unsinged.',
  B: 'Victory! A little crispy.',
  C: 'You won. Somehow.',
};
