const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ESCAPES[char]);
}

export function shareTitle({ score, outcome, initials, foeName }) {
  const who = initials === null || initials === undefined ? 'A hero' : initials;
  const points = score.toLocaleString('en-US');
  if (outcome === 'victory') return `${who} scored ${points} pts and slew ${foeName}`;
  return `${who} scored ${points} pts before ${foeName} won`;
}

export function renderSharePage({ shareId, score, outcome, initials, foeName, origin = 'https://strikwerda.fr' }) {
  const title = escapeHtml(shareTitle({ score, outcome, initials, foeName }));
  const target = `/?challenge=${encodeURIComponent(shareId)}`;
  const description = escapeHtml(`Can you beat ${score.toLocaleString('en-US')}? A 2-minute pixel dungeon by Ezra.`);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${title}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta property="og:type" content="website">
<meta property="og:url" content="${origin}/r/${encodeURIComponent(shareId)}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:image" content="${origin}/assets/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta http-equiv="refresh" content="0; url=${target}">
</head>
<body style="background:#181425;color:#e4edf9;font-family:system-ui,sans-serif">
<p><a href="${target}" style="color:#feae34">${title} — play now</a></p>
</body>
</html>`;
}
