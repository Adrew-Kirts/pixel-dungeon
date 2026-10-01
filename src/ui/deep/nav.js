import { t } from '../../i18n.js';
import { el, append } from '../dom.js';
import { applyIcon } from '../icons.js';
import { NODES, WEAPONS, SHIELDS, POTIONS, COFFEE_HEAL, CAT_HEAL, DIFFICULTIES } from '../../deep/content.js';
import { healAmount } from '../../deep/engine.js';

const SVG = 'http://www.w3.org/2000/svg';
const CELL = 22;
const BOX = 14;

function svg(tag, attributes = {}) {
  const node = document.createElementNS(SVG, tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, String(value));
  return node;
}

export function nodeName(id, visited) {
  if (visited.includes(id) === false) return t('deep.room.unknown');
  return t(`deep.room.${id}`);
}

function minimap(state) {
  const known = new Set(state.visited);
  if (state.difficulty === 'normal') for (const id of state.visited) for (const link of NODES[id].links) known.add(link);
  const nodes = Object.values(NODES).filter((node) => known.has(node.id));
  const xs = nodes.map((node) => node.x);
  const ys = nodes.map((node) => node.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const width = (Math.max(...xs) - minX) * CELL + BOX + 8;
  const height = (Math.max(...ys) - minY) * CELL + BOX + 8;
  const root = svg('svg', { viewBox: `0 0 ${width} ${height}`, width: width * 2, height: height * 2, class: 'minimap', role: 'img', 'aria-label': t('deep.map') });
  const position = (node) => ({ x: (node.x - minX) * CELL + 4, y: (node.y - minY) * CELL + 4 });
  const drawn = new Set();
  for (const node of nodes) {
    for (const link of node.links) {
      if (known.has(link) === false) continue;
      const key = [node.id, link].sort().join('-');
      if (drawn.has(key) === true) continue;
      drawn.add(key);
      const a = position(node);
      const b = position(NODES[link]);
      const visitedEdge = state.visited.includes(node.id) === true && state.visited.includes(link) === true;
      const portal = node.portalRoom === true || NODES[link].portalRoom === true;
      root.append(svg('line', { x1: a.x + BOX / 2, y1: a.y + BOX / 2, x2: b.x + BOX / 2, y2: b.y + BOX / 2, class: portal === true ? 'map-edge is-portal' : visitedEdge === true ? 'map-edge is-walked' : 'map-edge' }));
    }
  }
  for (const node of nodes) {
    const p = position(node);
    const visited = state.visited.includes(node.id);
    const classes = ['map-node', `area-${node.area}`];
    if (visited === true) classes.push('is-visited');
    if (state.cleared.includes(node.id) === true) classes.push('is-cleared');
    if (node.id === state.node) classes.push('is-here');
    root.append(svg('rect', { x: p.x, y: p.y, width: BOX, height: BOX, class: classes.join(' ') }));
    if (visited === false) {
      const danger = node.final === true;
      const mark = svg('text', { x: p.x + BOX / 2, y: p.y + BOX - 3, class: danger === true ? 'map-mark is-danger' : 'map-mark' });
      mark.textContent = danger === true ? '!' : '?';
      root.append(mark);
    }
    const floor = state.floor[node.id] ?? [];
    if (visited === true && floor.length > 0) root.append(svg('rect', { x: p.x + BOX - 5, y: p.y + 1, width: 4, height: 4, class: 'map-loot' }));
    if (node.locked !== undefined && state.hero.keycard === false && visited === true) root.append(svg('rect', { x: p.x + BOX / 2 - 2, y: p.y + BOX - 1, width: 4, height: 4, class: 'map-lock' }));
    if (node.id === 'c1' && visited === true && state.coffee === 'ready') root.append(svg('rect', { x: p.x + 1, y: p.y + 1, width: 4, height: 4, class: 'map-coffee' }));
  }
  return root;
}

function itemDef(item) {
  if (item.slot === 'weapon') return WEAPONS[item.id];
  if (item.slot === 'shield') return SHIELDS[item.id];
  return POTIONS[item.id];
}

export function itemDetail(item, state = null) {
  const def = itemDef(item);
  if (item.slot === 'weapon') return t('deep.detail.weapon', { power: def.power, uses: item.dur ?? '∞', max: def.durability ?? '∞' });
  if (item.slot === 'shield') return t('deep.detail.shield', { absorb: Math.round(def.absorb * 100), uses: item.dur ?? '∞', max: def.durability ?? '∞' });
  return t('deep.detail.potion', { heal: state === null ? def.heal : healAmount(state, def.heal) });
}

function option(label, detail, choice, key, { primary = false, disabled = false, icon = null, tone = '' } = {}) {
  const button = el('button', `btn nav-option${primary === true ? ' btn-primary' : ''}${tone === '' ? '' : ` ${tone}`}`);
  button.type = 'button';
  button.dataset.choice = choice;
  if (key <= 9) button.dataset.key = String(key);
  if (disabled === true) {
    button.dataset.locked = 'true';
    button.setAttribute('aria-disabled', 'true');
  }
  if (icon !== null) {
    const image = el('span', 'px-icon');
    applyIcon(image, icon, 2);
    button.append(image);
  }
  append(button, append(el('span', 'nav-text'), el('span', 'nav-label', label), detail === null ? null : el('small', '', detail)), key <= 9 ? el('kbd', '', String(key)) : null);
  return button;
}

function goLabel(state, to, portal = false) {
  const here = NODES[state.node];
  const target = NODES[to];
  const name = nodeName(to, state.visited);
  if (portal === true) return { label: t('deep.nav.portal'), detail: t('deep.nav.portalTo', { room: name }), forward: false, portal: true };
  if (here.area === 'street' && target.area === 'street') {
    const order = ['h1', 'h2', 'h3', 'h4'];
    const forward = order.indexOf(to) > order.indexOf(state.node);
    return { label: t(forward === true ? 'deep.nav.moveOn' : 'deep.nav.goBack'), detail: state.visited.includes(to) === true ? t('deep.nav.cleared') : t('deep.nav.unexplored'), forward };
  }
  if (here.area === 'street') return { label: t('deep.nav.enterDoor'), detail: name, forward: true, door: true };
  if (target.area === 'street') return { label: t('deep.nav.exitDoor'), detail: t('deep.room.street'), forward: to !== state.from };
  const forward = to !== state.from;
  if (target.final === true) return { label: t('deep.nav.goOn'), detail: t('deep.nav.noReturn'), forward, danger: true };
  return { label: t(forward === true ? 'deep.nav.goOn' : 'deep.nav.backTo'), detail: name, forward };
}

export function navPanel(state, need) {
  const card = el('div', 'panel-card nav-card');
  const title = el('h2', 'panel-title nav-title', t(`deep.room.${state.node}`));
  const flavor = el('p', 'nav-flavor', t(`deep.room.${state.node}.line`));
  const map = el('div', 'nav-map');
  map.append(minimap(state));
  const list = el('div', 'nav-options');
  let key = 1;
  const goOptions = need.options.filter((entry) => entry.action === 'go');
  const others = need.options.filter((entry) => entry.action !== 'go');
  const labels = goOptions.map((entry) => ({ entry, ...goLabel(state, entry.to, entry.portal === true) }));
  const primary = labels.find((entry) => entry.forward === true && entry.entry.locked === false && entry.danger !== true) ?? labels.find((entry) => entry.entry.locked === false);
  const rank = { open: 0, pet: 1, coffee: 2, drink: 3, take: 4 };
  const ordered = [...labels].sort((a, b) => Number(b.forward) - Number(a.forward));
  const extras = [...others].sort((a, b) => rank[a.action] - rank[b.action]);
  for (const entry of extras.filter((candidate) => candidate.action === 'open')) list.append(option(t('deep.nav.open'), t('deep.nav.openDetail'), 'open', key++, { icon: 'tile:89', tone: 'is-gold' }));
  for (const entry of ordered) {
    const locked = entry.entry.locked === true;
    list.append(
      option(locked === true ? t('deep.nav.locked') : entry.label, locked === true ? t('deep.nav.needKeycard') : entry.detail, `go:${entry.entry.to}`, key++, {
        primary: entry === primary,
        disabled: locked,
        tone: entry.danger === true ? 'is-danger' : entry.portal === true ? 'is-portal' : '',
      }),
    );
  }
  for (const entry of extras) {
    if (entry.action === 'pet') list.append(option(t('deep.nav.pet'), t('deep.nav.petDetail', { heal: healAmount(state, CAT_HEAL) }), 'pet', key++, { icon: 'icon:cat', tone: 'is-heal' }));
    else if (entry.action === 'coffee') list.append(option(t('deep.nav.coffee'), t('deep.nav.coffeeDetail', { heal: healAmount(state, state.hero.maxHp * COFFEE_HEAL) }), 'coffee', key++, { icon: 'icon:coffeeCup', tone: 'is-heal' }));
    else if (entry.action === 'take') {
      const def = itemDef(entry.item);
      list.append(option(t('deep.nav.take', { item: t(`deep.item.${entry.item.id}`) }), entry.canTake === true ? itemDetail(entry.item, state) : t('deep.nav.bagFull', { max: DIFFICULTIES[state.difficulty].potions }), `take:${entry.index}`, key++, { icon: def.key, disabled: entry.canTake === false }));
    } else if (entry.action === 'drink') list.append(option(t('deep.nav.drink', { potion: t(`deep.item.${entry.potion}`) }), t(state.poison !== null ? 'deep.detail.potionCure' : 'deep.detail.potion', { heal: healAmount(state, POTIONS[entry.potion].heal) }), `drink:${entry.potion}`, key++, { icon: POTIONS[entry.potion].key, tone: 'is-heal' }));
  }
  append(card, el('p', 'eyebrow', t('deep.nav.eyebrow')), title, flavor, map, list);
  return card;
}

export function parseNavChoice(choice) {
  const [action, value] = choice.split(':');
  if (action === 'go') return { type: 'nav', action: 'go', to: value };
  if (action === 'take') return { type: 'nav', action: 'take', index: Number(value) };
  if (action === 'drink') return { type: 'nav', action: 'drink', potion: value };
  return { type: 'nav', action };
}
