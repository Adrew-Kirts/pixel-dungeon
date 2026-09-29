import { t } from '../../i18n.js';
import { el } from '../dom.js';

export function shareUrl(shareId, origin = location.origin) {
  return `${origin}/r/${encodeURIComponent(shareId)}`;
}

export function shareLinks(text, url) {
  return {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(text)}`,
    x: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  };
}

function link(label, href) {
  const anchor = el('a', 'btn', label);
  anchor.href = href;
  anchor.target = '_blank';
  anchor.rel = 'noopener';
  return anchor;
}

async function copyText(text) {
  if (navigator.clipboard !== undefined && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {}
  }
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.append(area);
  area.select();
  let copied = false;
  try {
    copied = document.execCommand('copy') === true;
  } catch {}
  area.remove();
  return copied;
}

export function sharePanel({ text, url, title }) {
  const grid = el('div', 'share-grid');
  if (typeof navigator.share === 'function') {
    const native = el('button', 'btn btn-primary', t('real.shareNative'));
    native.type = 'button';
    native.addEventListener('click', () => {
      navigator.share({ title, text, url }).catch(() => {});
    });
    grid.append(native);
  }
  const links = shareLinks(text, url);
  grid.append(link('WhatsApp', links.whatsapp), link('X', links.x), link('LinkedIn', links.linkedin), link('Facebook', links.facebook));
  const copy = el('button', 'btn', t('real.copy'));
  copy.type = 'button';
  copy.addEventListener('click', async () => {
    const copied = await copyText(text);
    copy.textContent = copied === true ? t('real.copied') : url;
    setTimeout(() => {
      copy.textContent = t('real.copy');
    }, 1800);
  });
  grid.append(copy);
  return grid;
}
