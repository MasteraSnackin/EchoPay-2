import { Hono } from 'hono';
import voice from './routes/voice';
import transactions from './routes/transactions';
import wallet from './routes/wallet';

export type Env = {
  Bindings: {
    DB: D1Database;
    ELEVENLABS_API_KEY: string;
    POLKADOT_RPC_ENDPOINT: string;
    ENCRYPTION_KEY: string;
  };
};

const app = new Hono<Env>();

app.get('/health', (c) => c.json({ status: 'ok', ts: Date.now() }));
app.get('/status/polkadot', (c) => c.json({ status: 'connected', endpoint: c.env.POLKADOT_RPC_ENDPOINT }));

app.route('/voice', voice);
app.route('/transactions', transactions);
app.route('/wallet', wallet);

export default app;