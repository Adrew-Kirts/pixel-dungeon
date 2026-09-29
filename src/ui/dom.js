export function el(tag, className = '', text = null) {
  const element = document.createElement(tag);
  if (className !== '') element.className = className;
  if (text !== null) element.textContent = text;
  return element;
}

export function append(parent, ...children) {
  for (const child of children) {
    if (child !== null && child !== undefined && child !== false) parent.append(child);
  }
  return parent;
}

export function waitForChoice(root, input, { tapValue = null, guardMs = 350, auto = null } = {}) {
  const buttons = [...root.querySelectorAll('[data-choice]')];
  for (const button of buttons) button.disabled = true;
  const armTimer = setTimeout(() => {
    for (const button of buttons) button.disabled = false;
    const primary = root.querySelector('.btn-primary');
    if (primary !== null && primary.isConnected === true) primary.focus({ preventScroll: true });
  }, guardMs);
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled === true) return;
      settled = true;
      clearTimeout(armTimer);
      resolve(value);
    };
    for (const button of buttons) {
      button.addEventListener('click', () => finish(button.dataset.choice));
    }
    if (tapValue !== null) input.nextTap({ guardMs }).then(() => finish(tapValue));
    if (auto !== null) auto.then(() => finish(tapValue));
  });
}
