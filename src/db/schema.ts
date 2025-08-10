import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  walletAddress: text('wallet_address').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
  lastActive: integer('last_active', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
});

export const transactions = sqliteTable('transactions', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id),
  voiceCommand: text('voice_command').notNull(),
  parsedIntent: text('parsed_intent').notNull(),
  recipientAddress: text('recipient_address').notNull(),
  amount: text('amount').notNull(),
  tokenSymbol: text('token_symbol').notNull(),
  transactionHash: text('transaction_hash'),
  status: text('status').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
  confirmedAt: integer('confirmed_at', { mode: 'timestamp_ms' }),
});

export const voiceSessions = sqliteTable('voice_sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id),
  audioUrl: text('audio_url'),
  transcription: text('transcription'),
  responseAudioUrl: text('response_audio_url'),
  responseText: text('response_text'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
});