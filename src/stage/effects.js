import { snap } from '../engine/sprites.js';

const FIRE = ['#fee761', '#feae34', '#f77622', '#e43b44'];
const CONFETTI = ['#feae34', '#fee761', '#43e1b3', '#3aa8ff', '#d176d0', '#e43b44', '#ffffff'];

export function createEffects({ scheduler, particles, camera, audio }) {
  let active = [];

  function add(effect) {
    active.push(effect);
    return effect;
  }

  function pixelLine(ctx, x0, y0, x1, y1, k) {
    const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
    for (let step = 0; step <= steps; step++) {
      const t = step / steps;
      ctx.fillRect(snap(x0 + (x1 - x0) * t, k), snap(y0 + (y1 - y0) * t, k), 1, 1);
    }
  }

  return {
    update(dt) {
      active = active.filter((effect) => effect.update(dt) !== false);
    },
    draw(ctx, k) {
      for (const effect of active) effect.draw(ctx, k);
      ctx.globalAlpha = 1;
    },
    clear() {
      active = [];
    },
    slash(x, y, color = '#ffffff') {
      let age = 0;
      add({
        update(dt) {
          age += dt;
          return age < 220;
        },
        draw(ctx, k) {
          const reveal = Math.min(1, age / 90);
          ctx.globalAlpha = age < 90 ? 1 : Math.max(0, 1 - (age - 90) / 130);
          ctx.fillStyle = color;
          const start = -1.25;
          const end = start + 2.5 * reveal;
          for (let angle = start; angle <= end; angle += 0.07) {
            const px = x - 3 + Math.cos(angle) * 9;
            const py = y + Math.sin(angle) * 9;
            ctx.fillRect(snap(px, k), snap(py, k), 1, 1);
            if (Math.abs(angle) < 0.7) ctx.fillRect(snap(px - 1, k), snap(py, k), 1, 1);
          }
        },
      });
    },
    claws(x, y) {
      let age = 0;
      add({
        update(dt) {
          age += dt;
          return age < 260;
        },
        draw(ctx, k) {
          ctx.globalAlpha = Math.max(0, 1 - age / 260);
          ctx.fillStyle = '#ffffff';
          for (let line = 0; line < 3; line++) {
            const offset = line * 4 - 4;
            const length = Math.min(1, age / 70) * 12;
            pixelLine(ctx, x + offset + 4, y - 7, x + offset + 4 - length * 0.6, y - 7 + length, k);
          }
        },
      });
    },
    sparks(x, y, colors = ['#ffffff', '#fee761'], count = 10, power = 1) {
      particles.burst(x, y, { count, colors, speed: [0.03 * power, 0.11 * power], life: [180, 420], size: [1, 2], drag: 0.004, gravity: 0.0002 });
    },
    critBurst(x, y) {
      particles.burst(x, y, { count: 26, colors: ['#fee761', '#feae34', '#ffffff'], speed: [0.05, 0.16], life: [260, 620], size: [1, 2], drag: 0.004, gravity: 0.0002 });
      let age = 0;
      add({
        update(dt) {
          age += dt;
          return age < 240;
        },
        draw(ctx) {
          const radius = 4 + age / 12;
          ctx.globalAlpha = Math.max(0, 1 - age / 240);
          ctx.strokeStyle = '#fee761';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.stroke();
        },
      });
    },
    dust(x, y, count = 6) {
      particles.burst(x, y, { count, colors: ['#8b9bb4', '#5a6988', '#c0cbdc'], speed: [0.005, 0.03], angle: [Math.PI, Math.PI * 2], life: [260, 520], size: [1, 2], drag: 0.003, spread: 3 });
    },
    poof(x, y) {
      particles.burst(x, y, { count: 22, colors: ['#c0cbdc', '#8b9bb4', '#ffffff', '#5a6988'], speed: [0.01, 0.06], life: [360, 760], size: [2, 3], drag: 0.004, spread: 5, rise: 0.012 });
    },
    coins(x, y, count, groundY) {
      particles.burst(x, y, { count, colors: ['#feae34', '#fee761', '#f77622'], speed: [0.05, 0.12], angle: [Math.PI * 1.15, Math.PI * 1.85], gravity: 0.00045, drag: 0.0008, life: [900, 1500], size: [2, 2], groundY: groundY - 1, bounce: 0.45, fade: true });
      audio.sfx.coin();
    },
    heal(x, y) {
      particles.burst(x, y, { count: 16, colors: ['#43e1b3', '#69ffd4', '#ffffff'], speed: [0.005, 0.025], life: [500, 900], size: [1, 2], rise: 0.03, spread: 6, drag: 0.002 });
    },
    sparkle(x, y, colors = ['#fee761', '#ffffff'], count = 12) {
      particles.burst(x, y, { count, colors, speed: [0.004, 0.02], life: [500, 1000], size: [1, 1], rise: 0.01, spread: 9, drag: 0.001 });
    },
    confetti(view) {
      for (let column = 0; column < 7; column++) {
        particles.burst((view.W / 6) * column, -4, { count: 22, colors: CONFETTI, speed: [0.01, 0.05], angle: [Math.PI * 0.2, Math.PI * 0.8], gravity: 0.00005, drag: 0.001, life: [2400, 3600], kind: 'confetti', spread: 6, fade: true });
      }
    },
    lightning(x, groundY) {
      const points = [];
      let px = x + (Math.random() * 8 - 4);
      for (let py = -4; py < groundY - 6; py += 5) {
        points.push([px, py]);
        px += Math.random() * 6 - 3;
      }
      points.push([x, groundY - 8]);
      let age = 0;
      camera.flash('#75e3ff', 0.35, 200);
      audio.sfx.zap();
      add({
        update(dt) {
          age += dt;
          return age < 260;
        },
        draw(ctx, k) {
          if (Math.floor(age / 45) % 2 === 1 && age > 60) return;
          ctx.globalAlpha = Math.max(0, 1 - age / 260);
          for (let index = 1; index < points.length; index++) {
            const [x0, y0] = points[index - 1];
            const [x1, y1] = points[index];
            ctx.fillStyle = '#75e3ff';
            pixelLine(ctx, x0 - 1, y0, x1 - 1, y1, k);
            pixelLine(ctx, x0 + 1, y0, x1 + 1, y1, k);
            ctx.fillStyle = '#ffffff';
            pixelLine(ctx, x0, y0, x1, y1, k);
          }
        },
      });
      particles.burst(x, groundY - 8, { count: 14, colors: ['#75e3ff', '#ffffff', '#0099db'], speed: [0.03, 0.1], life: [200, 420], size: [1, 2] });
    },
    fireball(fromX, fromY, toX, toY) {
      const ball = { x: fromX, y: fromY, done: false };
      add({
        update() {
          if (ball.done === false) {
            particles.burst(ball.x, ball.y, { count: 2, colors: FIRE, speed: [0.003, 0.015], life: [160, 320], size: [1, 2], kind: 'ember', rise: 0.01 });
          }
          return ball.done === false;
        },
        draw(ctx, k) {
          const x = snap(ball.x, k);
          const y = snap(ball.y, k);
          ctx.fillStyle = '#a22633';
          ctx.fillRect(x - 3, y - 2, 6, 4);
          ctx.fillRect(x - 2, y - 3, 4, 6);
          ctx.fillStyle = '#f77622';
          ctx.fillRect(x - 2, y - 2, 4, 4);
          ctx.fillStyle = '#fee761';
          ctx.fillRect(x - 1, y - 1, 2, 2);
        },
      });
      audio.sfx.fire();
      return scheduler.tween(ball, { x: toX, y: toY }, 280, 'inQuad').then(() => {
        ball.done = true;
        particles.burst(toX, toY, { count: 30, colors: FIRE, speed: [0.03, 0.13], life: [260, 620], size: [1, 3], kind: 'ember', drag: 0.003 });
        audio.sfx.boom();
      });
    },
    breath(fromX, fromY, toX, toY, ms = 620) {
      let age = 0;
      audio.sfx.breath();
      add({
        update(dt) {
          age += dt;
          if (age < ms) {
            const angle = Math.atan2(toY - fromY, toX - fromX);
            particles.burst(fromX, fromY, { count: 4, colors: FIRE, speed: [0.09, 0.16], angle: [angle - 0.18, angle + 0.18], life: [260, 420], size: [2, 3], kind: 'ember', drag: 0.0015 });
          }
          return age < ms;
        },
        draw() {},
      });
      return scheduler.wait(ms * 0.45);
    },
    rays(x, y) {
      const state = { alpha: 0, x, y };
      scheduler.tween(state, { alpha: 1 }, 300, 'outQuad');
      let rotation = 0;
      const effect = add({
        update(dt) {
          rotation += dt * 0.0012;
          return state.alpha > 0.01 || effect.stopped !== true;
        },
        draw(ctx) {
          ctx.save();
          ctx.globalAlpha = state.alpha * 0.2;
          ctx.fillStyle = '#fee761';
          ctx.translate(state.x, state.y);
          ctx.rotate(rotation);
          for (let ray = 0; ray < 8; ray++) {
            ctx.rotate((Math.PI * 2) / 8);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(30, -4);
            ctx.lineTo(30, 4);
            ctx.closePath();
            ctx.fill();
          }
          ctx.restore();
          const glow = ctx.createRadialGradient(state.x, state.y, 0, state.x, state.y, 22);
          glow.addColorStop(0, `rgba(254, 231, 97, ${0.45 * state.alpha})`);
          glow.addColorStop(1, 'rgba(254, 231, 97, 0)');
          ctx.fillStyle = glow;
          ctx.fillRect(state.x - 22, state.y - 22, 44, 44);
        },
      });
      return {
        move(nextX, nextY) {
          state.x = nextX;
          state.y = nextY;
        },
        stop() {
          effect.stopped = true;
          scheduler.tween(state, { alpha: 0 }, 260, 'inQuad');
        },
      };
    },
  };
}
