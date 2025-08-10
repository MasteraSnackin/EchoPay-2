import { Hono } from 'hono';
import { fetchUsdPrices, convertAmount } from '../integrations/prices';

export const prices = new Hono();

prices.get('/prices', async (c) => {
  const url = new URL(c.req.url);
  const symbols = (url.searchParams.get('symbols') || 'DOT,USDT,GLMR').split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
  const data = await fetchUsdPrices(symbols);
  return c.json({ prices_usd: data });
});

prices.get('/prices/convert', async (c) => {
  const url = new URL(c.req.url);
  const amount = Number(url.searchParams.get('amount') || '0');
  const from = (url.searchParams.get('from') || 'DOT').toUpperCase();
  const to = (url.searchParams.get('to') || 'USDT').toUpperCase();
  const p = await fetchUsdPrices([from, to]);
  const converted = convertAmount(amount, p[from] || 0, p[to] || 0);
  return c.json({ amount, from, to, converted });
});