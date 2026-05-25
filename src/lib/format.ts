export function formatMoney(amount: number, forcePlus: boolean = false): string {
  const rounded = Math.round(amount);
  if (rounded === 0) return '¥0';
  const prefix = rounded > 0 ? (forcePlus ? '+¥' : '¥') : '-¥';
  return `${prefix}${Math.abs(rounded)}`;
}
