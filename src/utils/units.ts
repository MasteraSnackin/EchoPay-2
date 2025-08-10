export function decimalToUnits(amount: string, decimals: number): string {
  const [intPart, fracPartRaw = ''] = amount.trim().split('.');
  const fracPart = fracPartRaw.slice(0, decimals);
  const paddedFrac = fracPart.padEnd(decimals, '0');
  const normalized = (intPart || '0').replace(/^0+/, '') || '0';
  const units = normalized + paddedFrac;
  return units.replace(/^0+/, '') || '0';
}

export function unitsToDecimal(units: string, decimals: number): string {
  const u = units.replace(/^0+/, '') || '0';
  if (decimals === 0) return u;
  const pad = u.padStart(decimals + 1, '0');
  const intPart = pad.slice(0, -decimals);
  const fracPart = pad.slice(-decimals).replace(/0+$/, '');
  return fracPart ? `${intPart}.${fracPart}` : intPart;
}