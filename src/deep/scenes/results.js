import { t, formatNumber, rankLabel } from '../../i18n.js';
import { finalScore } from '../engine.js';
import { el, append } from '../../ui/dom.js';
import { renderBoard } from '../../ui/real/board.js';
import { createInitialsEntry } from '../../ui/real/initials.js';
import { sharePanel, shareUrl } from '../../ui/real/share.js';
import { heroLabel } from './world.js';

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
    const label = line.id === 'difficulty' ? `${t('deep.line.difficulty')} · ${t(`deep.difficulty.${scene.state.difficulty}`)}` : t(`deep.line.${line.id}`);
    const row = append(el('li'), el('span', '', label), value);
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
      await scheduler.tween(counter, { value: points }, Math.min(520, 160 + points / 20), 'outQuad', (current) => {
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
    if (fast.value === false) await scheduler.wait(points > 0 ? 80 : 30);
  }
  totalRow.classList.add('is-counted');
  audio.sfx.coin();
  return { totalValue };
}

export async function showDeepResults(scene, { api, session, body, alive, storage, onAgain, onReplay, onExit }) {
  const { game, state } = scene;
  const overlay = document.getElementById('results');
  const content = overlay.querySelector('[data-role="content"]');
  const local = finalScore(state);
  const won = state.outcome === 'victory';
  const finish =
    session === null
      ? Promise.resolve({ ok: false, offline: true })
      : api.finishRun(session.runId, body).then(
          (response) => ({ ok: true, response }),
          (error) => ({ ok: false, error }),
        );
  const title = el('h2', won === true ? 'results-title' : 'results-title is-lost', t(won === true ? 'deep.results.won' : 'real.gameOver'));
  const name = heroLabel(state.hero);
  const subtitle = el('p', 'results-subtitle', won === true ? t('deep.results.wonLine', { name }) : t('deep.results.lostLine', { name, killer: scene.killerName(), room: t(`deep.room.${state.node}`) }));
  const tally = el('ul', 'tally');
  const status = el('p', 'results-status', '');
  status.hidden = true;
  const entrySlot = el('div', 'results-entry');
  const wall = section('deep.wall');
  wall.root.hidden = true;
  const share = section('real.share');
  share.root.hidden = true;
  const replay = button(t('deep.results.replay'), true);
  const again = button(t('deep.results.again'));
  const back = button(t('real.back'));
  const actions = append(el('div', 'results-actions is-deep'), replay, again, back);
  actions.hidden = true;
  append(content, title, subtitle, tally, status, entrySlot, wall.root, share.root, actions);
  overlay.hidden = false;
  overlay.scrollTop = 0;
  const fast = { value: false };
  overlay.addEventListener('pointerdown', () => (fast.value = true), { once: true });
  replay.addEventListener('click', () => onReplay());
  again.addEventListener('click', () => onAgain());
  back.addEventListener('click', () => onExit());

  const lines = local.lines.filter((line) => line.id !== 'difficulty' || state.difficulty !== 'normal');
  const { totalValue } = await countUp(scene, tally, lines, fast);
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
        list = (await api.leaderboard('deep')).entries;
      } catch {
        list = null;
      }
    }
    if (alive() === false || list === null) return;
    wall.body.replaceChildren(renderBoard(list, you, 'deep'));
    wall.root.hidden = false;
  }

  function showShare(score, shareId, onWall, initials) {
    const url = shareUrl(shareId);
    const points = formatNumber(score);
    let text;
    if (onWall === true) text = t('deep.share.top', { initials, score: points, url });
    else if (won === true) text = t('deep.share.win', { score: points, url });
    else text = t('deep.share.death', { score: points, url });
    share.body.replaceChildren(sharePanel({ text, url, title: document.title }));
    share.root.hidden = false;
  }

  if (outcome.ok === false) {
    status.textContent = outcome.offline === true ? t('deep.results.offline', { score: formatNumber(local.total) }) : t('real.submitFailed', { score: formatNumber(local.total) });
    await showWall();
    replay.focus({ preventScroll: true });
    return;
  }
  const response = outcome.response;
  if (response.human === false) {
    status.replaceChildren(el('strong', '', t('real.bot')), el('br'), document.createTextNode(t('real.botText')));
    await showWall();
    replay.focus({ preventScroll: true });
    return;
  }
  totalValue.textContent = formatNumber(response.score);
  if (response.qualifies !== true) {
    if (Number.isInteger(response.rank) === true) {
      status.textContent = t('deep.results.rankLine', { rank: rankLabel(response.rank) });
      status.classList.add('is-ranked');
    } else status.hidden = true;
    showShare(response.score, response.shareId, false, null);
    await showWall();
    replay.focus({ preventScroll: true });
    return;
  }
  status.textContent = t('deep.results.qualified');
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
        status.textContent = t('deep.results.carved', { initials });
        game.audio.sfx.victory();
        showShare(response.score, response.shareId, true, initials);
        await showWall({ initials, score: response.score }, saved.leaderboard);
        replay.focus({ preventScroll: true });
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
