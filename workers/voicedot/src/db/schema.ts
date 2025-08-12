import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  walletAddress: text('wallet_address').notNull().unique(),
  createdAt: integer('created_at').notNull(),
  lastActive: integer('last_active').notNull()
});

export const transactions = sqliteTable('transactions', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id),
  voiceCommand: text('voice_command').notNull(),
  parsedIntent: text('parsed_intent').notNull(), // JSON string
  recipientAddress: text('recipient_address').notNull(),
  amount: text('amount').notNull(), // string for big numbers
  tokenSymbol: text('token_symbol').notNull(),
  transactionHash: text('transaction_hash'),
  status: text('status').notNull(), // pending | confirmed | failed
  createdAt: integer('created_at').notNull(),
  confirmedAt: integer('confirmed_at')
});

export const voiceSessions = sqliteTable('voice_sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id),
  audioUrl: text('audio_url'),
  transcription: text('transcription'),
  responseAudioUrl: text('response_audio_url'),
  responseText: text('response_text'),
  createdAt: integer('created_at').notNull()
});