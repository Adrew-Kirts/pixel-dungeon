import { ATLAS } from '../art/atlas.js';
import { snap } from '../engine/sprites.js';

export const DOOR_X = { back: 0.07, on: 0.93, street: 0.6 };

const DOOR_SPAN = 25;

export function propScreenX(view, fraction) {
  return Math.round(DOOR_SPAN + Math.max(0, view.W - 2 * DOOR_SPAN) * fraction);
}

export function roomDoorX(view, door) {
  return Math.round(Math.max(12, Math.min(view.W - 12, door.x * view.W)));
}

function hash(value) {
  let x = (value | 0) ^ 0x9e3779b9;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return (x ^ (x >>> 16)) >>> 0;
}

export function hasIcon(name) {
  return Object.hasOwn(ATLAS.icons, name) === true;
}

const TILE = { bricks: 40, sand: 48, sandSpecks: 49, sandDots: 51, sandShadow: 50, dirt: 0, dirtStones: 12, plank: 37, pillar: 58, tomb: 65, cross: 64, banner: 29, barrel: 94, bookcase: 63, shelf: 75, table: 72, stool: 73 };

export const THEMES = {
  street: { wall: 'bricks', floor: 'sand', darkness: 0.5, light: '#f77622', props: [] },
  archives: {
    wall: 'bricks',
    wallShade: 'rgba(118, 59, 54, 0.35)',
    floor: 'wood',
    wood: ['#5a2a28', '#733e39', '#3f2631'],
    darkness: 0.64,
    props: [
      { icon: 'cobweb', x: 0.13, wall: 66 },
      { icon: 'fileCabinet', x: 0.17 },
      { icon: 'bookshelf', x: 0.31 },
      { icon: 'readingDesk', x: 0.45, candle: true },
      { icon: 'paperPile', x: 0.53, minW: 150 },
      { icon: 'scrollRack', x: 0.61, minW: 150 },
      { icon: 'globe', x: 0.7, minW: 150 },
      { icon: 'bookshelf', x: 0.8, flip: true, minW: 150 },
    ],
  },
  office: {
    wall: 'painted',
    paint: ['#3a4466', '#262b44'],
    floor: 'carpet',
    carpet: ['#262b44', '#3a4466'],
    darkness: 0.36,
    fluorescent: true,
    props: [
      { icon: 'windowNight', x: 0.2, wall: 30 },
      { icon: 'meetingScreen', x: 0.45, wall: 30 },
      { icon: 'whiteboard', x: 0.7, wall: 26, minW: 150 },
      { icon: 'wallClock', x: 0.85, wall: 48 },
      { icon: 'plant', x: 0.14 },
      { icon: 'desk', x: 0.37 },
      { icon: 'officeChair', x: 0.44 },
      { icon: 'printer', x: 0.6, minW: 150 },
      { icon: 'waterCooler', x: 0.84 },
    ],
  },
  manager: {
    wall: 'panels',
    floor: 'carpet',
    carpet: ['#733e39', '#a22633'],
    darkness: 0.42,
    props: [
      { icon: 'motivPoster', x: 0.3, wall: 30 },
      { icon: 'windowNight', x: 0.62, wall: 32, minW: 150 },
      { icon: 'wallCalendar', x: 0.84, wall: 36 },
      { icon: 'managerDesk', x: 0.5 },
      { icon: 'plant', x: 0.17 },
      { icon: 'coatRack', x: 0.83, minW: 150 },
      { icon: 'lightBulb', x: 0.4, ceiling: true },
      { icon: 'lightBulb', x: 0.7, ceiling: true, minW: 150 },
    ],
  },
  server: {
    wall: 'metal',
    floor: 'grid',
    darkness: 0.72,
    props: [
      { icon: 'serverRack', x: 0.19, led: true },
      { icon: 'serverRackOpen', x: 0.31, led: true },
      { icon: 'upsUnit', x: 0.43 },
      { icon: 'serverRack', x: 0.57, led: true, minW: 150 },
      { icon: 'warningSign', x: 0.67, wall: 34 },
      { icon: 'serverRackOpen', x: 0.79, led: true, flip: true },
      { icon: 'fireExtinguisher', x: 0.87 },
      { icon: 'cableBundle', x: 0.5, minW: 150 },
    ],
  },
  breakroom: {
    wall: 'tiles',
    floor: 'checker',
    darkness: 0.45,
    props: [
      { icon: 'vendingMachine', x: 0.17 },
      { icon: 'fridge', x: 0.29 },
      { icon: 'neonBreak', x: 0.5, wall: 44, neon: true },
      { icon: 'noticeBoard', x: 0.68, wall: 26, minW: 150 },
      { tile: TILE.stool, x: 0.45 },
      { tile: TILE.table, x: 0.52 },
      { tile: TILE.stool, x: 0.59 },
      { icon: 'coffeeMachine', x: 0.8, coffee: true },
      { icon: 'bin', x: 0.88 },
    ],
  },
  descent: {
    wall: 'bricks',
    wallShade: 'rgba(24, 20, 37, 0.55)',
    floor: 'dirt',
    darkness: 0.74,
    props: [
      { torch: true, x: 0.16, red: true },
      { icon: 'wallCrack', x: 0.33, wall: 22 },
      { icon: 'cage', x: 0.45, ceiling: true },
      { icon: 'chains', x: 0.6, wall: 40, minW: 150 },
      { torch: true, x: 0.7, red: true },
      { icon: 'skullPile', x: 0.5 },
      { icon: 'bones', x: 0.84 },
    ],
  },
  crypt: {
    wall: 'bricks',
    wallShade: 'rgba(37, 149, 106, 0.18)',
    floor: 'water',
    darkness: 0.7,
    drips: true,
    props: [
      { icon: 'cobweb', x: 0.12, wall: 58 },
      { torch: true, x: 0.27, green: true },
      { icon: 'urn', x: 0.2 },
      { tile: TILE.tomb, x: 0.31 },
      { icon: 'sarcophagus', x: 0.46 },
      { icon: 'candles', x: 0.58, candles: true, minW: 150 },
      { tile: TILE.cross, x: 0.66 },
      { torch: true, x: 0.74, green: true, minW: 150 },
      { icon: 'brokenPillar', x: 0.84 },
    ],
  },
  echoes: {
    wall: 'bricks',
    wallShade: 'rgba(104, 56, 108, 0.35)',
    floor: 'stone',
    darkness: 0.66,
    props: [
      { tile: TILE.pillar, x: 0.17, column: true },
      { icon: 'bannerPurple', x: 0.33, wall: 26 },
      { icon: 'brazier', x: 0.39, brazier: true },
      { icon: 'statue', x: 0.5 },
      { icon: 'brazier', x: 0.61, brazier: true, minW: 150 },
      { icon: 'bannerPurple', x: 0.67, wall: 26, minW: 150 },
      { icon: 'pedestal', x: 0.28, minW: 150 },
      { tile: TILE.pillar, x: 0.84, column: true },
    ],
  },
  lair: {
    wall: 'bricks',
    wallShade: 'rgba(24, 20, 37, 0.62)',
    floor: 'stone',
    darkness: 0.8,
    props: [
      { icon: 'relayPanel', x: 0.16, relay: true },
      { icon: 'vacuumTubes', x: 0.29, tubes: true, minW: 150 },
      { icon: 'cocoon', x: 0.4, ceiling: true },
      { icon: 'lightBulb', x: 0.52, ceiling: true, big: true },
      { icon: 'cocoon', x: 0.64, ceiling: true, minW: 150 },
      { icon: 'logbookStand', x: 0.9 },
      { icon: 'relayPanel', x: 0.8, relay: true, flip: true },
    ],
  },
  den: {
    wall: 'panels',
    floor: 'wood',
    wood: ['#733e39', '#8a4a3f', '#5a2a28'],
    darkness: 0.4,
    props: [
      { icon: 'posterTerminal', x: 0.3, wall: 28 },
      { icon: 'windowNight', x: 0.62, wall: 30, minW: 150 },
      { icon: 'lightBulb', x: 0.48, ceiling: true },
      { icon: 'plant', x: 0.19 },
      { icon: 'rug', x: 0.42, dx: 4 },
      { icon: 'couch', x: 0.42 },
      { icon: 'coffeeTable', x: 0.42, dx: 4 },
      { icon: 'laptopBack', x: 0.42, dx: 8, wall: 7 },
      { icon: 'gameboySmall', x: 0.42, dx: -2, wall: 7 },
      { cat: true, x: 0.7 },
    ],
  },
};

function drawTile(ctx, tiles, index, x, y, k) {
  ctx.drawImage(tiles, (index % 12) * 16, Math.floor(index / 12) * 16, 16, 16, snap(x, k), snap(y, k), 16, 16);
}

function drawWall(ctx, view, theme, sprites, now, k) {
  const { W, groundY } = view;
  const tiles = sprites.tiles;
  if (theme.wall === 'bricks') {
    for (let x = 0; x < W + 16; x += 16) for (let y = groundY - 16; y > -16; y -= 16) drawTile(ctx, tiles, TILE.bricks, x, y, k);
    if (theme.wallShade !== undefined) {
      ctx.fillStyle = theme.wallShade;
      ctx.fillRect(0, 0, W, groundY);
    }
    return;
  }
  if (theme.wall === 'painted') {
    ctx.fillStyle = theme.paint[0];
    ctx.fillRect(0, 0, W, groundY);
    ctx.fillStyle = theme.paint[1];
    for (let x = 0; x < W; x += 24) ctx.fillRect(x, 0, 1, groundY);
    ctx.fillStyle = '#5a6988';
    ctx.fillRect(0, groundY - 5, W, 2);
    ctx.fillStyle = '#181425';
    ctx.fillRect(0, groundY - 3, W, 3);
    return;
  }
  if (theme.wall === 'panels') {
    ctx.fillStyle = '#733e39';
    ctx.fillRect(0, 0, W, groundY);
    for (let x = 0; x < W; x += 12) {
      ctx.fillStyle = hash(x) % 3 === 0 ? '#763b36' : '#8a4a3f';
      ctx.fillRect(x + 1, 0, 10, groundY - 20);
      ctx.fillStyle = '#3f2631';
      ctx.fillRect(x, 0, 1, groundY);
    }
    ctx.fillStyle = '#3f2631';
    ctx.fillRect(0, groundY - 22, W, 2);
    ctx.fillStyle = '#b86f50';
    ctx.fillRect(0, groundY - 20, W, 1);
    ctx.fillStyle = '#5a2a28';
    ctx.fillRect(0, groundY - 19, W, 19);
    return;
  }
  if (theme.wall === 'metal') {
    ctx.fillStyle = '#181425';
    ctx.fillRect(0, 0, W, groundY);
    for (let x = 0; x < W; x += 20) {
      for (let y = groundY - 20; y > -20; y -= 20) {
        ctx.fillStyle = '#262b44';
        ctx.fillRect(x + 1, y + 1, 18, 18);
        ctx.fillStyle = '#3a4466';
        ctx.fillRect(x + 1, y + 1, 18, 1);
        ctx.fillRect(x + 2, y + 3, 1, 1);
        ctx.fillRect(x + 17, y + 3, 1, 1);
      }
    }
    return;
  }
  if (theme.wall === 'tiles') {
    ctx.fillStyle = '#c0cbdc';
    ctx.fillRect(0, 0, W, groundY);
    ctx.fillStyle = '#8b9bb4';
    for (let x = 0; x < W; x += 8) ctx.fillRect(x, 0, 1, groundY);
    for (let y = groundY; y > 0; y -= 8) ctx.fillRect(0, y, W, 1);
    ctx.fillStyle = '#e43b44';
    ctx.fillRect(0, groundY - 26, W, 3);
    ctx.fillStyle = 'rgba(24, 20, 37, 0.35)';
    ctx.fillRect(0, 0, W, groundY);
  }
}

function drawFloor(ctx, view, theme, sprites, now, k) {
  const { W, H, groundY } = view;
  const tiles = sprites.tiles;
  const floor = theme.floor;
  if (floor === 'sand' || floor === 'stone') {
    for (let column = 0; column * 16 < W + 16; column++) {
      for (let y = groundY; y < H + 16; y += 16) {
        const roll = hash(column * 131 + y * 7) % 9;
        let index = TILE.sand;
        if (floor === 'sand') index = y === groundY ? TILE.sandShadow : roll === 0 ? TILE.sandSpecks : roll === 1 ? TILE.sandDots : TILE.sand;
        else index = 42;
        drawTile(ctx, tiles, index, column * 16, y, k);
      }
    }
    if (floor === 'stone') {
      ctx.fillStyle = 'rgba(58, 68, 102, 0.55)';
      ctx.fillRect(0, groundY, W, H - groundY);
    }
    return;
  }
  if (floor === 'dirt') {
    ctx.fillStyle = '#4a2a2c';
    ctx.fillRect(0, groundY, W, H - groundY);
    for (let y = groundY + 1; y < H; y += 2) {
      for (let x = 0; x < W; x += 3) {
        const roll = hash(x * 31 + y * 17) % 23;
        if (roll === 0) {
          ctx.fillStyle = '#733e39';
          ctx.fillRect(x, y, 2, 1);
        } else if (roll === 1) {
          ctx.fillStyle = '#2b1a22';
          ctx.fillRect(x, y, 1, 1);
        } else if (roll === 2 && y > groundY + 4) {
          ctx.fillStyle = '#8b9bb4';
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
    return;
  }
  if (floor === 'wood') {
    const [base, light, gap] = theme.wood;
    ctx.fillStyle = base;
    ctx.fillRect(0, groundY, W, H - groundY);
    for (let y = groundY, row = 0; y < H; y += 5, row++) {
      ctx.fillStyle = gap;
      ctx.fillRect(0, y, W, 1);
      ctx.fillStyle = light;
      ctx.fillRect(0, y + 1, W, 1);
      ctx.fillStyle = gap;
      for (let x = (row % 2) * 13 + (hash(row) % 7); x < W; x += 26) ctx.fillRect(x, y + 1, 1, 4);
    }
    return;
  }
  if (floor === 'carpet') {
    ctx.fillStyle = theme.carpet[0];
    ctx.fillRect(0, groundY, W, H - groundY);
    ctx.fillStyle = theme.carpet[1];
    for (let y = groundY + 2; y < H; y += 6) for (let x = (y / 6) % 2 === 0 ? 0 : 3; x < W; x += 6) ctx.fillRect(x, y, 2, 1);
    return;
  }
  if (floor === 'grid') {
    ctx.fillStyle = '#262b44';
    ctx.fillRect(0, groundY, W, H - groundY);
    ctx.fillStyle = '#3a4466';
    for (let x = 0; x < W; x += 8) ctx.fillRect(x, groundY, 1, H - groundY);
    for (let y = groundY; y < H; y += 8) ctx.fillRect(0, y, W, 1);
    return;
  }
  if (floor === 'checker') {
    for (let y = groundY; y < H; y += 8) {
      for (let x = 0; x < W; x += 8) {
        ctx.fillStyle = ((x + y) / 8) % 2 === 0 ? '#e4edf9' : '#3a4466';
        ctx.fillRect(x, y, 8, 8);
      }
    }
    return;
  }
  if (floor === 'water') {
    ctx.fillStyle = '#193c3e';
    ctx.fillRect(0, groundY, W, H - groundY);
    ctx.fillStyle = '#265c42';
    for (let y = groundY + 3; y < H; y += 5) {
      const shift = Math.floor(now / 140 + y) % 12;
      for (let x = -12 + shift; x < W; x += 12) ctx.fillRect(x, y, 5, 1);
    }
    ctx.fillStyle = 'rgba(117, 227, 255, 0.25)';
    const wave = Math.floor(now / 90) % 24;
    for (let x = -24 + wave; x < W; x += 24) ctx.fillRect(x, groundY + 1, 7, 1);
  }
}

function drawFlame(ctx, x, y, now, seed, k, colors) {
  const frame = Math.floor(now / 110 + seed) % 3;
  const sway = frame === 1 ? 1 : 0;
  ctx.fillStyle = colors[0];
  ctx.fillRect(snap(x - 2 + sway, k), snap(y - 4, k), 3, 4);
  ctx.fillStyle = colors[1];
  ctx.fillRect(snap(x - 1 + sway, k), snap(y - 5 - (frame === 2 ? 1 : 0), k), 2, 4);
  ctx.fillStyle = colors[2];
  ctx.fillRect(snap(x - 1 + sway, k), snap(y - 3, k), 1, 2);
}

const FLAMES = {
  warm: ['#f77622', '#feae34', '#fee761'],
  red: ['#a22633', '#e43b44', '#ff706d'],
  green: ['#25956a', '#43e1b3', '#b5f1ff'],
  purple: ['#68386c', '#d176d0', '#f6757a'],
};

function propImage(sprites, prop) {
  if (prop.tile !== undefined) return sprites.get(`tile:${prop.tile}`, prop.tile === TILE.banner ? 'cutout' : prop.variant ?? 'base');
  if (hasIcon(prop.icon) === false) return null;
  return sprites.get(`icon:${prop.icon}`, prop.variant ?? 'base');
}

function drawProp(ctx, view, prop, sprites, now, k, lights, index, state) {
  const { W, groundY } = view;
  if (prop.minW !== undefined && W < prop.minW) return;
  const x = propScreenX(view, prop.x) + (prop.dx ?? 0);
  if (prop.cat === true) {
    const name = state.catAwake === true ? 'catAwake' : 'cat';
    if (state.catGone === true || hasIcon(name) === false) return;
    const image = sprites.icon(name);
    const breathe = state.catAwake === true ? 0 : Math.floor(now / 900) % 2;
    ctx.drawImage(image, snap(x - image.width / 2, k), snap(groundY - image.height - breathe * 0, k));
    if (state.catAwake !== true && Math.floor(now / 1400) % 3 === 0) {
      ctx.fillStyle = '#c0cbdc';
      ctx.fillRect(snap(x + 5, k), snap(groundY - image.height - 4 - (Math.floor(now / 300) % 3), k), 2, 1);
    }
    return;
  }
  if (prop.torch === true) {
    const top = groundY - 34;
    if (hasIcon('torch') === true) ctx.drawImage(sprites.icon('torch'), snap(x - 4, k), snap(top + 4, k));
    const colors = prop.red === true ? FLAMES.red : prop.green === true ? FLAMES.green : FLAMES.warm;
    drawFlame(ctx, x, top + 7, now, index, k, colors);
    const flicker = 0.9 + 0.1 * Math.sin(now / 90 + index * 3);
    lights.push({ x, y: top + 4, radius: 44 * flicker, strength: 0.9, warm: prop.green !== true, color: colors[1] });
    return;
  }
  const image = propImage(sprites, prop);
  if (image === null) return;
  let y;
  if (prop.ceiling === true) y = prop.big === true ? 0 : -2;
  else if (prop.wall !== undefined) y = groundY - prop.wall - image.height;
  else y = groundY - image.height + (prop.column === true ? 0 : 1);
  ctx.save();
  if (prop.flip === true) {
    ctx.translate(snap(x, k), 0);
    ctx.scale(-1, 1);
    ctx.drawImage(image, -Math.round(image.width / 2), snap(y, k));
  } else {
    ctx.drawImage(image, snap(x - image.width / 2, k), snap(y, k));
  }
  ctx.restore();
  if (prop.column === true) {
    for (let stack = y - 16; stack > -16; stack -= 16) ctx.drawImage(image, snap(x - 8, k), snap(stack, k));
  }
  if (prop.led === true) {
    for (let row = 0; row < 9; row++) {
      for (let column = 0; column < 2; column++) {
        const on = (Math.floor(now / (180 + row * 37 + column * 53)) + row + column + index) % 4 !== 0;
        if (on === false) continue;
        ctx.fillStyle = (row + column + index) % 5 === 0 ? '#feae34' : (row + index) % 3 === 0 ? '#0099db' : '#43e1b3';
        ctx.fillRect(snap(x - 6 + column * 11, k), snap(y + 4 + row * 4, k), 1, 1);
      }
    }
    lights.push({ x, y: y + 20, radius: 26, strength: 0.35, color: '#0099db' });
  }
  if (prop.relay === true) {
    for (let row = 0; row < 5; row++) {
      const glow = 0.4 + 0.6 * Math.abs(Math.sin(now / 400 + row + index));
      ctx.globalAlpha = glow;
      ctx.fillStyle = '#feae34';
      ctx.fillRect(snap(x - 7 + (row % 3) * 6, k), snap(y + 6 + row * 6, k), 2, 2);
      ctx.globalAlpha = 1;
    }
    lights.push({ x, y: y + 18, radius: 22, strength: 0.4, warm: true });
  }
  if (prop.neon === true) {
    const on = Math.floor(now / 90) % 37 !== 0 && Math.floor(now / 70) % 53 !== 3;
    if (on === false) {
      ctx.fillStyle = 'rgba(24, 20, 37, 0.7)';
      ctx.fillRect(snap(x - image.width / 2, k), snap(y, k), image.width, image.height);
    } else lights.push({ x, y: y + 5, radius: 40, strength: 0.6, color: '#f6757a' });
  }
  if (prop.brazier === true) {
    const frame = Math.floor(now / 100 + index) % 3;
    const colors = FLAMES.purple;
    const cx = snap(x, k);
    const base = snap(y + 3, k);
    ctx.fillStyle = colors[0];
    ctx.fillRect(cx - 4, base - 4, 8, 4);
    ctx.fillRect(cx - 3, base - 7 - (frame === 1 ? 1 : 0), 6, 3);
    ctx.fillStyle = colors[1];
    ctx.fillRect(cx - 2, base - 6, 4, 5);
    ctx.fillRect(cx - 1 + (frame === 2 ? 1 : 0), base - 10, 2, 4);
    ctx.fillStyle = colors[2];
    ctx.fillRect(cx - 1, base - 4, 2, 3);
    lights.push({ x, y: y - 2, radius: 46, strength: 0.85, color: '#d176d0' });
  }
  if (prop.coffee === true && state.coffee !== 'used') {
    const blink = Math.floor(now / 500) % 2 === 0;
    ctx.fillStyle = state.coffee === 'ready' ? (blink === true ? '#43e1b3' : '#25956a') : '#e43b44';
    ctx.fillRect(snap(x + 3, k), snap(y + 4, k), 2, 2);
    if (state.coffee === 'ready') lights.push({ x, y: y + 6, radius: 18, strength: 0.4 });
  }
  if (prop.candle === true) {
    const flicker = Math.floor(now / 120 + index) % 3;
    ctx.fillStyle = '#feae34';
    ctx.fillRect(snap(x + 7, k), snap(y - 2 - (flicker === 1 ? 1 : 0), k), 1, 2);
    ctx.fillStyle = '#fee761';
    ctx.fillRect(snap(x + 7, k), snap(y - 1, k), 1, 1);
    lights.push({ x: x + 7, y: y - 2, radius: 34 + flicker, strength: 0.7, warm: true });
  }
  if (prop.candles === true) {
    for (const dx of [-4, 0, 3]) {
      const flicker = Math.floor(now / 110 + dx) % 3;
      ctx.fillStyle = flicker === 0 ? '#fee761' : '#feae34';
      ctx.fillRect(snap(x + dx, k), snap(y - 2 - (flicker === 2 ? 1 : 0), k), 1, 2);
    }
    lights.push({ x, y: y - 2, radius: 30, strength: 0.6, warm: true });
  }
  if (prop.tubes === true) {
    const glow = 0.5 + 0.3 * Math.sin(now / 300 + index);
    lights.push({ x, y: y + 8, radius: 26, strength: 0.5 * glow, warm: true });
  }
  if (prop.ceiling === true && prop.icon === 'lightBulb') {
    lights.push({ x, y: y + image.height - 4, radius: prop.big === true ? 70 : 40, strength: prop.big === true ? 0.95 : 0.7, warm: true });
  }
}

function drawPortal(ctx, view, x, sprites, now, k) {
  const frame = Math.floor(now / 160) % 2 === 0 ? 'portal' : 'portal2';
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const pulse = 0.6 + 0.25 * Math.sin(now / 220);
  const glow = ctx.createRadialGradient(x, view.groundY - 16, 0, x, view.groundY - 16, 34);
  glow.addColorStop(0, `rgba(209, 118, 208, ${0.45 * pulse})`);
  glow.addColorStop(0.6, `rgba(117, 227, 255, ${0.18 * pulse})`);
  glow.addColorStop(1, 'rgba(117, 227, 255, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(x - 36, view.groundY - 52, 72, 72);
  ctx.restore();
  if (hasIcon(frame) === true) {
    const image = sprites.icon(frame);
    ctx.drawImage(image, snap(x - image.width / 2, k), snap(view.groundY - image.height, k));
  } else {
    ctx.fillStyle = '#9b4ca3';
    ctx.fillRect(snap(x - 9, k), snap(view.groundY - 30, k), 18, 30);
  }
  for (let spark = 0; spark < 4; spark++) {
    const angle = now / 300 + spark * 1.57;
    ctx.fillStyle = spark % 2 === 0 ? '#75e3ff' : '#f6757a';
    ctx.fillRect(snap(x + Math.cos(angle) * 12, k), snap(view.groundY - 16 + Math.sin(angle) * 16, k), 1, 1);
  }
}

export function drawDoor(ctx, view, door, sprites, now, k, camX = 0) {
  const x = door.x - camX;
  if (x < -30 || x > view.W + 30) return;
  if (door.kind === 'portal') {
    drawPortal(ctx, view, x, sprites, now, k);
    return;
  }
  const name = door.kind === 'iron' ? (door.open === true ? 'doorIronOpen' : 'doorIron') : door.open === true ? 'doorWoodOpen' : 'doorWood';
  if (hasIcon(name) === true) {
    const image = sprites.icon(name);
    ctx.drawImage(image, snap(x - image.width / 2, k), snap(view.groundY - image.height, k));
  } else {
    ctx.fillStyle = door.open === true ? '#181425' : '#733e39';
    ctx.fillRect(snap(x - 10, k), snap(view.groundY - 28, k), 20, 28);
  }
  if (door.glow !== undefined) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const pulse = 0.55 + 0.25 * Math.sin(now / 260);
    const gradient = ctx.createRadialGradient(x, view.groundY - 14, 0, x, view.groundY - 14, 26);
    gradient.addColorStop(0, door.glow.replace('ALPHA', String(0.45 * pulse)));
    gradient.addColorStop(1, door.glow.replace('ALPHA', '0'));
    ctx.fillStyle = gradient;
    ctx.fillRect(x - 28, view.groundY - 42, 56, 56);
    ctx.restore();
  }
}

export function createRooms() {
  function draw(ctx, view, sprites, room, now, k) {
    const theme = THEMES[room.theme];
    const lights = [];
    drawWall(ctx, view, theme, sprites, now, k);
    const shade = ctx.createLinearGradient(0, 0, 0, view.groundY);
    shade.addColorStop(0, 'rgba(24, 20, 37, 0.85)');
    shade.addColorStop(0.5, 'rgba(24, 20, 37, 0.3)');
    shade.addColorStop(1, 'rgba(24, 20, 37, 0.08)');
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, view.W, view.groundY);
    drawFloor(ctx, view, theme, sprites, now, k);
    const floorShade = ctx.createLinearGradient(0, view.groundY, 0, view.H);
    floorShade.addColorStop(0, 'rgba(24, 20, 37, 0.25)');
    floorShade.addColorStop(1, 'rgba(24, 20, 37, 0.9)');
    ctx.fillStyle = floorShade;
    ctx.fillRect(0, view.groundY, view.W, view.H - view.groundY);
    ctx.fillStyle = 'rgba(24, 20, 37, 0.6)';
    ctx.fillRect(0, view.groundY - 1, view.W, 2);
    theme.props.forEach((prop, index) => drawProp(ctx, view, prop, sprites, now, k, lights, index, room));
    for (const door of room.doors) {
      const x = roomDoorX(view, door);
      drawDoor(ctx, view, { ...door, x }, sprites, now, k);
      if (door.kind === 'portal') lights.push({ x, y: view.groundY - 16, radius: 40, strength: 0.75 });
    }
    if (theme.fluorescent === true) {
      const flicker = Math.floor(now / 60) % 71 === 0 ? 0.2 : 1;
      for (const fx of [0.25, 0.5, 0.75]) {
        ctx.fillStyle = `rgba(228, 237, 249, ${0.9 * flicker})`;
        ctx.fillRect(snap(view.W * fx - 10, k), 2, 20, 2);
        lights.push({ x: view.W * fx, y: 6, radius: 70, strength: 0.55 * flicker });
      }
    }
    if (theme.drips === true) {
      for (let drip = 0; drip < 4; drip++) {
        const period = 1400 + drip * 370;
        const t = ((now + drip * 611) % period) / period;
        const x = view.W * (0.18 + drip * 0.21);
        const y = t * view.groundY;
        ctx.fillStyle = '#75e3ff';
        ctx.fillRect(snap(x, k), snap(y, k), 1, 2);
      }
    }
    return lights;
  }
  return { draw };
}
