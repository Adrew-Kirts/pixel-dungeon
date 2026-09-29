const between = (range) => (Array.isArray(range) ? range[0] + Math.random() * (range[1] - range[0]) : range);

export function createParticles() {
  let list = [];

  return {
    burst(x, y, options) {
      const {
        count = 8,
        colors = ['#ffffff'],
        speed = [0.02, 0.08],
        angle = [0, Math.PI * 2],
        gravity = 0,
        drag = 0.002,
        life = [300, 600],
        size = [1, 2],
        groundY = null,
        bounce = 0.4,
        spread = 0,
        kind = 'rect',
        fade = true,
        rise = 0,
      } = options;
      for (let index = 0; index < count; index++) {
        const direction = between(angle);
        const velocity = between(speed);
        const lifetime = between(life);
        list.push({
          x: x + (Math.random() * 2 - 1) * spread,
          y: y + (Math.random() * 2 - 1) * spread,
          vx: Math.cos(direction) * velocity,
          vy: Math.sin(direction) * velocity - rise,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: Math.round(between(size)),
          gravity,
          drag,
          life: lifetime,
          max: lifetime,
          groundY,
          bounce,
          kind,
          fade,
          spin: Math.random() * Math.PI * 2,
        });
      }
    },
    update(dt) {
      if (dt === 0) return;
      const alive = [];
      for (const particle of list) {
        particle.life -= dt;
        if (particle.life <= 0) continue;
        particle.vy += particle.gravity * dt;
        const damping = Math.max(0, 1 - particle.drag * dt);
        particle.vx *= damping;
        particle.vy *= damping;
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.spin += dt * 0.012;
        if (particle.groundY !== null && particle.y > particle.groundY) {
          particle.y = particle.groundY;
          particle.vy = -Math.abs(particle.vy) * particle.bounce;
          particle.vx *= 0.7;
        }
        alive.push(particle);
      }
      list = alive;
    },
    draw(ctx, k) {
      for (const particle of list) {
        const ratio = particle.life / particle.max;
        ctx.globalAlpha = particle.fade === true ? Math.min(1, ratio * 1.6) : 1;
        ctx.fillStyle = particle.color;
        const x = Math.round(particle.x * k) / k;
        const y = Math.round(particle.y * k) / k;
        if (particle.kind === 'confetti') {
          const width = Math.max(0.34, Math.abs(Math.cos(particle.spin)) * 2);
          ctx.fillRect(x - width / 2, y, width, 1);
        } else if (particle.kind === 'ember') {
          const size = particle.size * Math.max(0.35, ratio);
          ctx.fillRect(x - size / 2, y - size / 2, size, size);
        } else {
          ctx.fillRect(x, y, particle.size, particle.size);
        }
      }
      ctx.globalAlpha = 1;
    },
    clear() {
      list = [];
    },
    count() {
      return list.length;
    },
  };
}
