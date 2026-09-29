export function clampCenter(center, width, viewport, margin = 8) {
  if (width + margin * 2 >= viewport) return viewport / 2;
  return Math.min(viewport - margin - width / 2, Math.max(margin + width / 2, center));
}
