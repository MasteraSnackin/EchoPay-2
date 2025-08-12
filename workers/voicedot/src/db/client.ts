import { drizzle } from 'drizzle-orm/d1';
import type { users, transactions, voiceSessions } from './schema';

export type DB = ReturnType<typeof drizzle>;

export const getDb = (env: { DB: D1Database }) => drizzle(env.DB);

export type { users, transactions, voiceSessions };