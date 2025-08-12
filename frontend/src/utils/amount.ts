export function toPlanckFromDecimal(amount: string | number, decimals: number): bigint {
  const text = String(amount).trim();
  if (!/^\d+(?:[.,]\d+)?$/.test(text)) {
    throw new Error(`Invalid decimal amount: ${amount}`);
  }
  const normalized = text.replace(/,/g, '.');
  const [intPart, fracPartRaw = ''] = normalized.split('.');

  const fracPart = fracPartRaw.slice(0, decimals); // cut extra precision
  const paddedFrac = fracPart.padEnd(decimals, '0');

  const base = BigInt(10) ** BigInt(decimals);
  const intValue = BigInt(intPart) * base;
  const fracValue = paddedFrac ? BigInt(paddedFrac) : BigInt(0);

  return intValue + fracValue;
}