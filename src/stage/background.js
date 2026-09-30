import { TILE, snap } from '../engine/sprites.js';

const DECOR_SPACING = 72;
const LIGHT_SCALE = 4;

function hash(value) {
  let x = (value | 0) ^ 0x9e3779b9;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return (x ^ (x >>> 16)) >>> 0;
}

const DECOR_SEQUENCE = ['torch', 'bannerE', 'painting', 'torch', 'graffiti', 'banner', 'torch', 'pictoSign', 'wanted', 'banner'];

function decorFor(index) {
  const length = DECOR_SEQUENCE.length;
  return DECOR_SEQUENCE[((index % length) + length) % length];
}

function drawTile(ctx, tiles, index, x, y, k) {
  ctx.drawImage(tiles, (index % 12) * 16, Math.floor(index / 12) * 16, 16, 16, snap(x, k), snap(y, k), 16, 16);
}

export function createBackground(sprites) {
  const lightCanvas = document.createElement('canvas');
  const lightContext = lightCanvas.getContext('2d');

  function draw(ctx, view, camX, now, k, hiddenRanges = []) {
    const { W, H, groundY } = view;
    const tiles = sprites.tiles;
    const firstColumn = Math.floor(camX / 16) - 1;
    const lastColumn = Math.ceil((camX + W) / 16) + 1;
    for (let column = firstColumn; column <= lastColumn; column++) {
      const x = column * 16 - camX;
      const windowRow = groundY - 64;
      const columnCenter = column * 16 + 8;
      const hasWindow = hash(column * 977) % 9 === 0 && hiddenRanges.some(([from, to]) => columnCenter >= from - 12 && columnCenter <= to + 12) === false;
      for (let y = groundY - 16; y > -16; y -= 16) drawTile(ctx, tiles, hasWindow === true && y === windowRow ? TILE.bricksWindow : TILE.bricks, x, y, k);
      for (let y = groundY; y < H + 16; y += 16) {
        const roll = hash(column * 131 + y * 7) % 9;
        let index = roll === 0 ? TILE.sandSpecks : roll === 1 ? TILE.sandDots : TILE.sand;
        if (y === groundY) index = TILE.sandShadow;
        drawTile(ctx, tiles, index, x, y, k);
      }
    }
    const wallShade = ctx.createLinearGradient(0, 0, 0, groundY);
    wallShade.addColorStop(0, 'rgba(24, 20, 37, 0.92)');
    wallShade.addColorStop(0.55, 'rgba(24, 20, 37, 0.35)');
    wallShade.addColorStop(1, 'rgba(24, 20, 37, 0.1)');
    ctx.fillStyle = wallShade;
    ctx.fillRect(0, 0, W, groundY);
    const floorShade = ctx.createLinearGradient(0, groundY, 0, H);
    floorShade.addColorStop(0, 'rgba(24, 20, 37, 0.35)');
    floorShade.addColorStop(1, 'rgba(24, 20, 37, 0.92)');
    ctx.fillStyle = floorShade;
    ctx.fillRect(0, groundY, W, H - groundY);
    ctx.fillStyle = '#3f2631';
    ctx.fillRect(0, groundY - 1, W, 2);
    ctx.fillStyle = 'rgba(24, 20, 37, 0.5)';
    ctx.fillRect(0, groundY + 1, W, 2);

    const lights = [];
    const firstDecor = Math.floor((camX - 32) / DECOR_SPACING);
    const lastDecor = Math.ceil((camX + W + 32) / DECOR_SPACING);
    for (let index = firstDecor; index <= lastDecor; index++) {
      const worldX = index * DECOR_SPACING + 36;
      if (hiddenRanges.some(([from, to]) => worldX >= from && worldX <= to) === true) continue;
      const x = worldX - camX;
      const kind = decorFor(index);
      const top = groundY - 34;
      if (kind === 'banner') {
        ctx.drawImage(sprites.get(`tile:${TILE.banner}`, 'cutout'), snap(x - 8, k), snap(top - 4, k));
      } else if (kind !== 'torch') {
        const decal = sprites.icon(kind);
        const y = kind === 'graffiti' ? groundY - 37 : kind === 'wanted' ? groundY - 46 : top - 3;
        ctx.drawImage(decal, snap(x - decal.width / 2, k), snap(y, k));
      } else {
        const sconce = sprites.icon('torch');
        ctx.drawImage(sconce, snap(x - 4, k), snap(top + 4, k));
        drawFlame(ctx, x, top + 7, now, index, k);
        const flicker = 0.9 + 0.1 * Math.sin(now / 90 + index * 3) + 0.06 * Math.sin(now / 37 + index);
        lights.push({ x, y: top + 4, radius: 46 * flicker, strength: 0.95, warm: true });
      }
    }
    return lights;
  }

  function drawFlame(ctx, x, y, now, index, k) {
    const frame = Math.floor(now / 110 + index) % 3;
    const sway = frame === 1 ? 1 : 0;
    ctx.fillStyle = '#f77622';
    ctx.fillRect(snap(x - 2 + sway, k), snap(y - 4, k), 3, 4);
    ctx.fillStyle = '#feae34';
    ctx.fillRect(snap(x - 1 + sway, k), snap(y - 5 - (frame === 2 ? 1 : 0), k), 2, 4);
    ctx.fillStyle = '#fee761';
    ctx.fillRect(snap(x - 1 + sway, k), snap(y - 3, k), 1, 2);
    if (frame === 0) {
      ctx.fillStyle = '#e43b44';
      ctx.fillRect(snap(x + 1, k), snap(y - 7, k), 1, 1);
    }
  }

  function drawLighting(ctx, view, lights, darkness, now) {
    const width = view.W * LIGHT_SCALE;
    const height = view.H * LIGHT_SCALE;
    if (lightCanvas.width !== width || lightCanvas.height !== height) {
      lightCanvas.width = width;
      lightCanvas.height = height;
    }
    lightContext.globalCompositeOperation = 'source-over';
    lightContext.clearRect(0, 0, width, height);
    lightContext.fillStyle = `rgba(12, 9, 24, ${darkness})`;
    lightContext.fillRect(0, 0, width, height);
    lightContext.globalCompositeOperation = 'destination-out';
    for (const light of lights) {
      const x = light.x * LIGHT_SCALE;
      const y = light.y * LIGHT_SCALE;
      const radius = light.radius * LIGHT_SCALE;
      const gradient = lightContext.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, `rgba(0, 0, 0, ${light.strength})`);
      gradient.addColorStop(0.55, `rgba(0, 0, 0, ${light.strength * 0.45})`);
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      lightContext.fillStyle = gradient;
      lightContext.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(lightCanvas, 0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.restore();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const light of lights) {
      if (light.warm !== true) continue;
      const gradient = ctx.createRadialGradient(light.x, light.y, 0, light.x, light.y, light.radius * 0.7);
      gradient.addColorStop(0, 'rgba(247, 118, 34, 0.16)');
      gradient.addColorStop(1, 'rgba(247, 118, 34, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(light.x - light.radius, light.y - light.radius, light.radius * 2, light.radius * 2);
    }
    ctx.restore();
  }

  return { draw, drawLighting };
}
