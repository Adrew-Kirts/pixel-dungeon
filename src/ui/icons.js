import { ATLAS } from '../art/atlas.js';

const SHEETS = {
  tiles: { url: 'assets/tiles.png', width: 192, height: 176 },
  sprites: { url: 'assets/sprites.png', width: ATLAS.sheet.width, height: ATLAS.sheet.height },
};

export function iconRect(key) {
  if (key === 'dragonHead') {
    const [x, y] = ATLAS.dragon['up-closed'];
    return { sheet: SHEETS.sprites, x: x + 1, y: y + 2, width: 18, height: 18 };
  }
  const [kind, name] = key.split(':');
  if (kind === 'tile') {
    const index = Number(name);
    return { sheet: SHEETS.tiles, x: (index % 12) * 16, y: Math.floor(index / 12) * 16, width: 16, height: 16 };
  }
  const [x, y, width, height] = ATLAS.icons[name];
  return { sheet: SHEETS.sprites, x, y, width, height };
}

export function applyIcon(element, key, scale) {
  const rect = iconRect(key);
  element.style.backgroundImage = `url(${rect.sheet.url})`;
  element.style.backgroundSize = `${rect.sheet.width * scale}px ${rect.sheet.height * scale}px`;
  element.style.backgroundPosition = `${-rect.x * scale}px ${-rect.y * scale}px`;
  element.style.width = `${rect.width * scale}px`;
  element.style.height = `${rect.height * scale}px`;
}

export function clearIcon(element) {
  element.style.backgroundImage = 'none';
}
