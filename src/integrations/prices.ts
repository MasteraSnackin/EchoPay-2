const COINGECKO_IDS: Record<string, string> = {
  DOT: 'polkadot',
  USDT: 'tether',
  GLMR: 'moonbeam',
};

export async function fetchUsdPrices(symbols: string[]): Promise<Record<string, number>> {
  const ids = symbols.map((s) => COINGECKO_IDS[s.toUpperCase()] ).filter(Boolean);
  if (!ids.length) return {};
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(ids.join(','))}&vs_currencies=usd`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Price API error: ${res.status}`);
  const data = await res.json<any>();
  const out: Record<string, number> = {};
  for (const sym of symbols) {
    const id = COINGECKO_IDS[sym.toUpperCase()];
    if (id && data[id]?.usd != null) out[sym.toUpperCase()] = Number(data[id].usd);
  }
  return out;
}

export function convertAmount(amount: number, fromPriceUsd: number, toPriceUsd: number): number {
  if (!fromPriceUsd || !toPriceUsd) return 0;
  const usd = amount * fromPriceUsd;
  return usd / toPriceUsd;
}