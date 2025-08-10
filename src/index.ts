import { Hono } from 'hono';
import { Env } from './db/client';
import { voice } from './routes/voice';
import { tx } from './routes/transactions';
import { wallet } from './routes/wallet';
import { health } from './routes/health';
import { prices } from './routes/prices';
import { cors } from 'hono/cors';

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors({ origin: '*', allowMethods: ['GET', 'POST', 'OPTIONS'], allowHeaders: ['Content-Type', 'Authorization'] }));

app.route('/voice', voice);
app.route('/transactions', tx);
app.route('/wallet', wallet);
app.route('/', health);
app.route('/', prices);

export default app;