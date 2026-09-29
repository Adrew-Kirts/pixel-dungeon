const TARGET_SHORT_SIDE = { portrait: 100, landscape: 140 };

export function computeView(vw, vh, dpr) {
  const portrait = vh > vw;
  const target = portrait === true ? TARGET_SHORT_SIDE.portrait : TARGET_SHORT_SIDE.landscape;
  const cssScale = Math.min(vw, vh) / target;
  const k = Math.max(2, Math.round(cssScale * dpr));
  const css = k / dpr;
  const W = Math.max(1, Math.ceil(vw / css));
  const H = Math.max(1, Math.ceil(vh / css));
  return {
    vw,
    vh,
    dpr,
    k,
    css,
    W,
    H,
    portrait,
    offsetX: (vw - W * css) / 2,
    offsetY: (vh - H * css) / 2,
    groundY: Math.round(H * (portrait === true ? 0.52 : 0.66)),
  };
}

export function toScreen(view, x, y) {
  return { left: view.offsetX + x * view.css, top: view.offsetY + y * view.css };
}
