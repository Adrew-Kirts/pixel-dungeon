import { ATLAS } from '../art/atlas.js';

const OUTLINE = [63, 38, 49];
const GOLD_RAMP = ['#be4a2f', '#f77622', '#feae34', '#fee761', '#fff6d0'];
const GRAY_RAMP = ['#262b44', '#3a4466', '#5a6988', '#8b9bb4', '#c0cbdc'];

export const TILE = {
  wizard: 84,
  knight: 97,
  slime: 108,
  giant: 109,
  ghost: 121,
  spider: 122,
  chestClosed: 89,
  chestOpen: 91,
  mimic: 92,
  tombstone: 65,
  bricks: 40,
  bricksWindow: 28,
  banner: 29,
  sand: 48,
  sandSpecks: 49,
  sandDots: 51,
  sandShadow: 50,
  pillar: 58,
};

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load ${url}`));
    image.src = url;
  });
}

function makeCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function hexToRgb(hex) {
  const value = hex.replace('#', '');
  return [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16));
}

function remap(source, transform) {
  const canvas = makeCanvas(source.width, source.height);
  const context = canvas.getContext('2d');
  context.drawImage(source, 0, 0);
  const data = context.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = data.data;
  for (let index = 0; index < pixels.length; index += 4) {
    if (pixels[index + 3] === 0) continue;
    const next = transform(pixels[index], pixels[index + 1], pixels[index + 2]);
    if (next === null) continue;
    pixels[index] = next[0];
    pixels[index + 1] = next[1];
    pixels[index + 2] = next[2];
  }
  context.putImageData(data, 0, 0);
  return canvas;
}

function rampTransform(ramp) {
  const colors = ramp.map(hexToRgb);
  return (red, green, blue) => {
    if (red === OUTLINE[0] && green === OUTLINE[1] && blue === OUTLINE[2]) return null;
    const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
    const step = Math.min(colors.length - 1, Math.floor(luminance * colors.length * 1.05));
    return colors[step];
  };
}

export async function loadSprites() {
  const [tiles, sheet] = await Promise.all([loadImage('assets/tiles.png'), loadImage('assets/sprites.png')]);
  const cache = new Map();

  function crop(image, x, y, width, height) {
    const canvas = makeCanvas(width, height);
    canvas.getContext('2d').drawImage(image, x, y, width, height, 0, 0, width, height);
    return canvas;
  }

  function base(key) {
    const [kind, name] = key.split(':');
    if (kind === 'tile') {
      const index = Number(name);
      return crop(tiles, (index % 12) * 16, Math.floor(index / 12) * 16, 16, 16);
    }
    if (kind === 'icon') {
      const [x, y, width, height] = ATLAS.icons[name];
      return crop(sheet, x, y, width, height);
    }
    const [x, y, width, height] = ATLAS.dragon[name];
    return crop(sheet, x, y, width, height);
  }

  function get(key, variant = 'base') {
    const cacheKey = `${key}|${variant}`;
    if (cache.has(cacheKey)) return cache.get(cacheKey);
    let canvas;
    if (variant === 'base') canvas = base(key);
    else if (variant === 'flash') canvas = remap(get(key), () => [255, 255, 255]);
    else if (variant === 'gold') canvas = remap(get(key), rampTransform(GOLD_RAMP));
    else canvas = remap(get(key), rampTransform(GRAY_RAMP));
    cache.set(cacheKey, canvas);
    return canvas;
  }

  return {
    tiles,
    sheet,
    get,
    tile: (index, variant) => get(`tile:${index}`, variant),
    icon: (name, variant) => get(`icon:${name}`, variant),
    dragon: (frame, variant) => get(`dragon:${frame}`, variant),
  };
}

export function snap(value, k) {
  return Math.round(value * k) / k;
}

export function drawSprite(ctx, canvas, x, y, k, options = {}) {
  const { sx = 1, sy = 1, rot = 0, alpha = 1, flipX = false, pivotY = 0 } = options;
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(snap(x, k), snap(y - pivotY, k));
  if (rot !== 0) ctx.rotate(rot);
  ctx.scale(flipX === true ? -sx : sx, sy);
  ctx.drawImage(canvas, -canvas.width / 2, pivotY - canvas.height);
  ctx.restore();
}
