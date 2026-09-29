import { el } from '../ui/dom.js';

const COMMAND = '> java -jar Dungeons_and_dragons.jar';
const BANNER = [
  '___________________________________',
  '|       .:.:.:.:.:.:.:.:.:.        |',
  '| Welcome to Dungeons and Dragons! |',
  '|    _.~"~._.~"~._.~"~._.~"~._     |',
  '------------------------------------',
  '          Please choose:',
  '       1. Create character',
  '       2. Select character',
  '          3. Quit',
];
const BAR_STEPS = 14;

export async function boot(game) {
  const { scheduler, audio, input } = game;
  const container = document.getElementById('boot');
  const pre = container.querySelector('pre');
  pre.replaceChildren();
  container.classList.remove('is-glitching');
  container.hidden = false;
  game.world.dissolve = 1;
  let skipped = false;
  const skip = input.nextTap({ guardMs: 0 }).then(() => {
    skipped = true;
  });
  const cursor = el('span', 'cursor');
  const pause = (ms) => Promise.race([scheduler.wait(ms), skip]);

  function keystrokeDelay(text, index) {
    const char = text[index];
    const next = text[index + 1] ?? '';
    if (char === ' ' && next === '-') return 120 + Math.random() * 80;
    if (char === ' ') return 50 + Math.random() * 40;
    if (char === '_' || char === '.') return 25 + Math.random() * 25;
    return 12 + Math.random() * 12;
  }

  async function type(text, className) {
    const line = el('span', className);
    pre.append(line, cursor);
    for (let index = 0; index < text.length; index++) {
      if (skipped === true) return;
      line.textContent += text[index];
      if (text[index] !== ' ') audio.sfx.typing();
      await pause(keystrokeDelay(text, index));
    }
    line.textContent += '\n';
  }

  function print(text, className = '') {
    pre.append(el('span', className, `${text}\n`), cursor);
  }

  async function run() {
    pre.append(cursor);
    await pause(380);
    await type(COMMAND, 'line-prompt');
    if (skipped === true) return;
    await pause(260);
    for (const text of BANNER) {
      if (skipped === true) return;
      print(text);
      audio.sfx.typing();
      await pause(55);
    }
    await pause(420);
    await type('1', 'line-input');
    if (skipped === true) return;
    await pause(320);
    const bar = el('span', 'line-remaster');
    pre.append(bar, cursor);
    for (let step = 0; step <= BAR_STEPS; step++) {
      if (skipped === true) return;
      bar.textContent = `Remastering 2023 → 2026 [${'#'.repeat(step)}${'.'.repeat(BAR_STEPS - step)}] ${Math.round((step / BAR_STEPS) * 100)}%\n`;
      audio.sfx.tick();
      await pause(45);
    }
    await pause(300);
    if (skipped === true) return;
    container.classList.add('is-glitching');
    audio.sfx.glitch();
    await pause(320);
  }

  await run();
  container.hidden = true;
  input.cancelAll();
  await scheduler.tween(game.world, { dissolve: 0 }, skipped === true ? 220 : 460, 'linear');
}
