import { Hono } from 'hono';
import { Env } from './db/client';
import { voice } from './routes/voice';
import { tx } from './routes/transactions';
import { wallet } from './routes/wallet';
import { health } from './routes/health';
import { prices } from './routes/prices';

const app = new Hono<{ Bindings: Env }>();

app.route('/voice', voice);
app.route('/transactions', tx);
app.route('/wallet', wallet);
app.route('/', health);
app.route('/', prices);

export default app;