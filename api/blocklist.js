const BLOCKED = new Set([
  'ASS', 'FUK', 'FUC', 'FCK', 'FUQ', 'SEX', 'CUM', 'NIG', 'NGR', 'FAG', 'KKK', 'NAZ', 'SSS', 'JEW', 'KYS', 'TIT',
  'DIK', 'DIC', 'COK', 'COC', 'PUS', 'VAG', 'HOE', 'SLT', 'WHR', 'RAP', 'PIS', 'SUK', 'SUC', 'CNT', 'KUK', 'GAS',
  'HIV', 'POO', 'WTF', 'STFU', 'XXX', 'PNS', 'ANL', 'AIDS', 'KILL', 'FAP', 'JIZ', 'BCH', 'BIT', 'TWT', 'NUT',
]);

export function isAllowedInitials(initials) {
  if (typeof initials !== 'string' || /^[A-Z]{3}$/.test(initials) === false) return false;
  return BLOCKED.has(initials) === false;
}
