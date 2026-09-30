import { t, heroName, formatNumber } from '../../i18n.js';
import { finalScore } from '../engine.js';
import { el, append } from '../../ui/dom.js';
import { renderBoard } from '../../ui/real/board.js';
import { createInitialsEntry } from '../../ui/real/initials.js';
import { sharePanel, shareUrl } from '../../ui/real/share.js';

const REPO_URL = 'https://github.com/Adrew-Kirts/pixel-dungeon';

function button(label, primary = false) {
  const element = el('button', primary === true ? 'btn btn-primary' : 'btn', label);
  element.type = 'button';
  return element;
}

function section(titleKey) {
  const root = el('section', 'results-section');
  const body = el('div', 'results-section-body');
  append(root, el('h3', '', t(titleKey)), body);
  return { root, body };
}

async function countUp(scene, tally, lines, fast) {
  const { scheduler, audio } = scene.game;
  const rows = [];
  for (const line of lines) {
    const value = el('strong', '', '0');
    const row = append(el('li'), el('span', '', t(`real.line.${line.id}`)), value);
    tally.append(row);
    rows.push({ row, value, points: line.points });
  }
  const totalValue = el('strong', '', '0');
  const totalRow = append(el('li', 'tally-total'), el('span', '', t('real.total')), totalValue);
  tally.append(totalRow);
  let total = 0;
  for (const { row, value, points } of rows) {
    row.classList.add('is-counted');
    if (points > 0 && fast.value === false) {
      const counter = { value: 0 };
      let lastTick = 0;
      await scheduler.tween(counter, { value: points }, Math.min(520, 160 + points / 12), 'outQuad', (current) => {
        value.textContent = formatNumber(current.value);
        if (scheduler.time - lastTick > 45) {
          lastTick = scheduler.time;
          audio.sfx.tick();
        }
      });
    }
    value.textContent = formatNumber(points);
    total += points;
    totalValue.textContent = formatNumber(total);
    if (fast.value === false) await scheduler.wait(points > 0 ? 90 : 40);
  }
  totalRow.classList.add('is-counted');
  audio.sfx.coin();
  return { totalValue, totalRow };
}

export async function showResults(scene, { api, runId, body, alive, storage, onAgain, onExit }) {
  const { game, state } = scene;
  const overlay = document.getElementById('results');
  const content = overlay.querySelector('[data-role="content"]');
  const local = finalScore(state);
  const won = state.outcome === 'victory';
  const finish = api.finishRun(runId, body).then(
    (response) => ({ ok: true, response }),
    (error) => ({ ok: false, error }),
  );
  const title = el('h2', won === true ? 'results-title' : 'results-title is-lost', t(won === true ? 'real.victory' : 'real.gameOver'));
  const firstName = state.hero.firstName ?? heroName(state.hero);
  const subtitle = el('p', 'results-subtitle', won === true ? t('real.victoryLine', { name: firstName }) : t('real.killedBy', { name: scene.killerName() }));
  const tally = el('ul', 'tally');
  const status = el('p', 'results-status', '');
  status.hidden = true;
  const entrySlot = el('div', 'results-entry');
  const wall = section('real.leaderboard');
  wall.root.hidden = true;
  const share = section('real.share');
  share.root.hidden = true;
  const again = button(t('real.again'), true);
  const back = button(t('real.back'));
  const actions = append(el('div', 'results-actions'), again, back);
  actions.hidden = true;
  const source = el('a', 'results-link', t('real.source'));
  source.href = REPO_URL;
  source.target = '_blank';
  source.rel = 'noopener';
  append(content, title, subtitle, tally, status, entrySlot, wall.root, share.root, actions, source);
  overlay.hidden = false;
  overlay.scrollTop = 0;
  const fast = { value: false };
  const speedUp = () => {
    fast.value = true;
  };
  overlay.addEventListener('pointerdown', speedUp, { once: true });
  again.addEventListener('click', () => onAgain());
  back.addEventListener('click', () => onExit());

  const { totalValue } = await countUp(scene, tally, local.lines, fast);
  if (alive() === false) return;
  status.hidden = false;
  status.textContent = t('real.checking');
  const outcome = await finish;
  if (alive() === false) return;
  actions.hidden = false;

  async function showWall(you = null, entries = null) {
    let list = entries;
    if (list === null) {
      try {
        list = (await api.leaderboard()).entries;
      } catch {
        list = null;
      }
    }
    if (alive() === false || list === null) return;
    wall.body.replaceChildren(renderBoard(list, you));
    wall.root.hidden = false;
  }

  function showShare(score, shareId, onWall, initials) {
    const url = shareUrl(shareId);
    const points = formatNumber(score);
    let text;
    if (onWall === true) text = t('share.top', { initials, score: points, url });
    else if (won === true) text = t('share.win', { score: points, perfects: state.counts.perfects, url });
    else text = t('share.death', { killer: scene.killerName(), score: points, url });
    share.body.replaceChildren(sharePanel({ text, url, title: document.title }));
    share.root.hidden = false;
  }

  if (outcome.ok === false) {
    status.textContent = t('real.submitFailed', { score: formatNumber(local.total) });
    await showWall();
    again.focus({ preventScroll: true });
    return;
  }
  const response = outcome.response;
  if (response.human === false) {
    status.replaceChildren(el('strong', '', t('real.bot')), el('br'), document.createTextNode(t('real.botText')));
    await showWall();
    again.focus({ preventScroll: true });
    return;
  }
  totalValue.textContent = formatNumber(response.score);
  if (response.qualifies !== true) {
    status.hidden = true;
    showShare(response.score, response.shareId, false, null);
    await showWall();
    again.focus({ preventScroll: true });
    return;
  }
  status.textContent = t('real.qualified');
  status.classList.add('is-qualified');
  game.audio.sfx.fanfare();
  const entry = createInitialsEntry({
    initial: storage.get('initials') ?? 'AAA',
    onTick: () => game.audio.sfx.tick(),
    onSubmit: async (initials) => {
      entry.setBusy(true);
      try {
        const saved = await api.submitInitials(response.shareId, initials);
        if (alive() === false) return;
        storage.set('initials', initials);
        entry.destroy();
        entrySlot.replaceChildren();
        status.textContent = t('real.carved', { initials });
        game.audio.sfx.victory();
        showShare(response.score, response.shareId, true, initials);
        await showWall({ initials, score: response.score }, saved.leaderboard);
        again.focus({ preventScroll: true });
      } catch (error) {
        if (alive() === false) return;
        entry.setBusy(false);
        if (error.status === 422) {
          entry.showError(t('real.initialsTaken'));
          return;
        }
        if (error.status === 0) {
          entry.showError(t('real.initialsFailed'));
          return;
        }
        entry.destroy();
        entrySlot.replaceChildren();
        status.textContent = t('real.initialsLate');
        showShare(response.score, response.shareId, false, null);
        await showWall();
      }
    },
  });
  scene.onCleanup(() => entry.destroy());
  entrySlot.replaceChildren(entry.el);
  showShare(response.score, response.shareId, false, null);
  await showWall();
  entry.el.querySelector('.initials-letter')?.focus({ preventScroll: true });
}
